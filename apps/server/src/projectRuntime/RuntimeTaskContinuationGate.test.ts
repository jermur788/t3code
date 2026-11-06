import * as DevelopmentProfileService from "../developmentProfiles/DevelopmentProfileService.ts";
import * as NodeCrypto from "@effect/platform-node/NodeCrypto";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import {
  DEFAULT_SERVER_SETTINGS,
  ProjectId,
  ProviderDriverKind,
  ProviderInstanceId,
  ThreadId,
  type Project,
  type RuntimeExecutionAttempt,
  type RuntimeRouteResolution,
  type ServerProvider,
} from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as SqlClient from "effect/sql/SqlClient";

import * as ThreadLaunchService from "../orchestration-v2/ThreadLaunchService.ts";
import type { ThreadLaunchInput } from "../orchestration-v2/ThreadLaunchService.ts";
import * as ThreadManagementService from "../orchestration-v2/ThreadManagementService.ts";
import * as ProjectService from "../project/ProjectService.ts";
import * as SqlitePersistence from "../persistence/Sqlite.ts";
import * as RuntimeRoutingService from "../runtimeRouting/RuntimeRoutingService.ts";
import { RuntimeRoutingProviderView } from "../runtimeRouting/RuntimeRoutingProviderView.ts";
import * as ServerSettingsService from "../serverSettings.ts";
import * as ContinuationGate from "./RuntimeTaskContinuationGate.ts";
import * as ProjectRuntimeService from "./ProjectRuntimeService.ts";
import * as RuntimeTaskExecutionService from "./RuntimeTaskExecutionService.ts";

/**
 * The synthetic continuation experiment is disabled unless the server operator
 * enables it. These tests prove the default-off gate blocks every automatic
 * dispatch and policy surface while leaving ordinary task operations alone.
 * Stub providers only; no model is ever invoked.
 */

const projectId = ProjectId.make("continuation-gate-project");
const codex = ProviderInstanceId.make("codex");
const claude = ProviderInstanceId.make("claudeAgent");
const timestamp = "2026-11-04T00:00:00.000Z";

const project: Project = {
  id: projectId,
  title: "Continuation gate",
  workspaceRoot: "/tmp/continuation-gate",
  defaultModelSelection: { instanceId: codex, model: "gpt-6" },
  scripts: [],
  createdAt: timestamp,
  updatedAt: timestamp,
  deletedAt: null,
};

const provider = (
  instanceId: ProviderInstanceId,
  driver: string,
  model: string,
): ServerProvider => ({
  instanceId,
  driver: ProviderDriverKind.make(driver),
  enabled: true,
  installed: true,
  status: "ready",
  auth: { status: "authenticated" },
  version: null,
  checkedAt: timestamp,
  models: [{ slug: model, name: model, isCustom: false, capabilities: null }],
  slashCommands: [],
  skills: [],
});

const providers = [provider(codex, "codex", "gpt-6"), provider(claude, "claudeAgent", "fable")];

const resolution = (
  taskId: string,
  instanceId: ProviderInstanceId,
  driver: string,
  model: string,
): RuntimeRouteResolution => ({
  projectId,
  taskId: taskId as never,
  role: "implementation",
  status: "resolved",
  source: "project",
  selected: {
    source: "project",
    candidateIndex: 0,
    candidate: { providerInstanceId: instanceId, model },
    providerInstanceId: instanceId,
    driverKind: ProviderDriverKind.make(driver),
    model,
    isolation: "shared",
    eligibility: "eligible-at-resolution",
  },
  inheritedFrom: null,
  rejected: [],
  failure: null,
  revisions: { task: 1, projectRouting: 1, profile: null, assignment: null },
});

interface State {
  readonly launches: Array<ThreadLaunchInput>;
  readonly runs: Map<string, ReadonlyArray<{ readonly id: string; readonly status: string }>>;
  readonly routes: Map<string, RuntimeRouteResolution>;
  shellReadFails: boolean;
}

const makeState = (): State => ({
  launches: [],
  runs: new Map(),
  routes: new Map(),
  shellReadFails: false,
});

const makeLayer = (state: State, dbPath: string, gateEnabled: boolean) =>
  RuntimeTaskExecutionService.layer.pipe(
    Layer.provideMerge(
      ProjectRuntimeService.layer.pipe(
        Layer.provideMerge(DevelopmentProfileService.layer),
        Layer.provideMerge(SqlitePersistence.layerFromPath(dbPath)),
        Layer.provideMerge(ContinuationGate.layer(gateEnabled)),
        Layer.provide(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer)),
      ),
    ),
    Layer.provideMerge(
      Layer.mock(RuntimeRoutingService.RuntimeRoutingService)({
        resolveRoute: (input) =>
          Effect.succeed(
            (input.taskId === undefined ? undefined : state.routes.get(input.taskId)) ??
              resolution(input.taskId ?? "unknown", codex, "codex", "gpt-6"),
          ),
      }),
    ),
    Layer.provideMerge(
      Layer.succeed(RuntimeRoutingProviderView, {
        read: Effect.succeed({
          providers,
          orchestrationCapableInstanceIds: new Set([codex, claude]),
          settings: DEFAULT_SERVER_SETTINGS,
          capacityByInstanceId: new Map(),
        }),
      }),
    ),
    Layer.provideMerge(
      Layer.mock(ProjectService.ProjectService)({
        getById: () => Effect.succeedSome(project),
      }),
    ),
    Layer.provideMerge(
      Layer.mock(ServerSettingsService.ServerSettingsService)({
        getSettings: Effect.succeed(DEFAULT_SERVER_SETTINGS),
      }),
    ),
    Layer.provideMerge(
      Layer.mock(ThreadLaunchService.ThreadLaunchService)({
        launch: ((input: ThreadLaunchInput) => {
          state.launches.push(input);
          const runId = `run-${state.launches.length}`;
          state.runs.set(input.threadId ?? "", [{ id: runId, status: "running" }]);
          return Effect.succeed({
            threadId: input.threadId,
            projection: {
              runs: [{ id: runId, userMessageId: input.initialMessage?.messageId }],
            },
            resumed: false,
          });
        }) as never,
        checkWorktreeBase: () => Effect.void,
      }),
    ),
    Layer.provideMerge(
      Layer.mock(ThreadManagementService.ThreadManagementService)({
        getThreadShell: (threadId) =>
          state.shellReadFails
            ? (Effect.fail("thread shell unavailable") as never)
            : Effect.succeed(state.runs.has(threadId) ? ({} as never) : null),
        getThreadProjection: (threadId) =>
          Effect.succeed({ runs: state.runs.get(threadId) ?? [] } as never),
        dispatch: () => Effect.succeed({} as never),
      }),
    ),
    Layer.provide(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer)),
  );

type Services =
  | RuntimeTaskExecutionService.RuntimeTaskExecutionService
  | ProjectRuntimeService.ProjectRuntimeService
  | SqlClient.SqlClient;

const runWith = <A, E>(
  state: State,
  dbPath: string,
  gateEnabled: boolean,
  program: Effect.Effect<A, E, Services>,
) => program.pipe(Effect.provide(makeLayer(state, dbPath, gateEnabled)));

const completeRun = (state: State, threadId: string) => {
  const runs = state.runs.get(threadId) ?? [];
  state.runs.set(
    threadId,
    runs.map((run) => ({ ...run, status: "completed" })),
  );
};

const seedProject = Effect.gen(function* () {
  const runtime = yield* ProjectRuntimeService.ProjectRuntimeService;
  const sql = yield* SqlClient.SqlClient;
  yield* sql`INSERT INTO projection_projects (project_id, title, workspace_root, scripts_json, created_at, updated_at)
    VALUES (${projectId}, 'Continuation gate', '/tmp/continuation-gate', '[]', ${timestamp}, ${timestamp})`;
  yield* runtime.setEnabled(projectId, { enabled: true });
});

const createPolicyTasks = (state: State) =>
  Effect.gen(function* () {
    const runtime = yield* ProjectRuntimeService.ProjectRuntimeService;
    const review = yield* runtime.createTask(
      projectId,
      {
        title: "Independent review",
        scope: "Review the implementation evidence.",
        owner: "user:reviewer",
        acceptanceCriteria: [],
        status: "ready",
      },
      { actor: "user:maintainer" },
    );
    const repair = yield* runtime.createTask(
      projectId,
      {
        title: "Bounded repair",
        scope: "Repair what the review rejected.",
        owner: "user:repairer",
        acceptanceCriteria: [],
        status: "ready",
      },
      { actor: "user:maintainer" },
    );
    const source = yield* runtime.createTask(
      projectId,
      {
        title: "Implementation",
        scope: "Implement the change.",
        owner: "user:maintainer",
        acceptanceCriteria: [],
        status: "ready",
        continuation: {
          version: 1,
          mode: "synthetic",
          reviewTaskId: review.taskId,
          repairTaskId: repair.taskId,
          maxRepairCycles: 2,
        },
      },
      { actor: "user:maintainer" },
    );
    state.routes.set(source.taskId, resolution(source.taskId, codex, "codex", "gpt-6"));
    state.routes.set(review.taskId, resolution(review.taskId, claude, "claudeAgent", "fable"));
    state.routes.set(repair.taskId, resolution(repair.taskId, codex, "codex", "gpt-6"));
    return { source, review, repair };
  });

const appendHandoff = (
  attempt: RuntimeExecutionAttempt,
  verification: {
    readonly milestone: "none" | "review-pass";
    readonly result: "pass" | "fail" | "none";
  },
) =>
  Effect.gen(function* () {
    const runtime = yield* ProjectRuntimeService.ProjectRuntimeService;
    const task = yield* runtime.readTask(projectId, attempt.taskId);
    return yield* runtime.appendHandoff(
      projectId,
      {
        taskId: attempt.taskId,
        expectedTaskRevision: task.revision,
        checkpoint: `synthetic-${attempt.attemptId}`,
        summary: `Synthetic handoff for ${attempt.taskId}`,
        filesChanged: [],
        ...(verification.result === "none"
          ? {}
          : {
              verification: {
                milestone: verification.milestone,
                evidence: [
                  {
                    evidenceId: "synthetic-verdict",
                    result: verification.result,
                    summary: "Synthetic reviewer verdict",
                    recordedAt: timestamp,
                  },
                ],
              },
            }),
      },
      {
        actor: `thread:${attempt.threadId}`,
        threadId: ThreadId.make(attempt.threadId),
        providerInstanceId: attempt.modelSelection.instanceId,
        model: attempt.modelSelection.model,
      },
    );
  });

const setupThroughWorker = (state: State, dbPath: string) =>
  runWith(
    state,
    dbPath,
    true,
    Effect.gen(function* () {
      yield* seedProject;
      const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
      const tasks = yield* createPolicyTasks(state);
      const worker = yield* service.execute(projectId, {
        taskId: tasks.source.taskId,
        expectedTaskRevision: tasks.source.revision,
      });
      yield* appendHandoff(worker, { milestone: "none", result: "none" });
      return { ...tasks, worker };
    }),
  );

const attemptByKey = (taskId: string, requestKey: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
    const rows = yield* sql<{ readonly attempt_id: string }>`SELECT attempt_id
      FROM project_runtime_execution_attempts
      WHERE project_id = ${projectId} AND task_id = ${taskId} AND request_key = ${requestKey}`;
    assert.equal(rows.length, 1);
    return yield* service.readAttempt(projectId, rows[0]!.attempt_id as never);
  });

const markPending = (attemptId: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* sql`UPDATE project_runtime_execution_attempts
      SET status = 'pending', run_id = NULL,
        payload_json = json_set(payload_json, '$.status', 'pending', '$.runId', NULL)
      WHERE attempt_id = ${attemptId}`;
  });

const countAttempts = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const rows = yield* sql<{ readonly count: number }>`SELECT count(*) AS count
    FROM project_runtime_execution_attempts WHERE project_id = ${projectId}`;
  return rows[0]?.count ?? 0;
});

it("defaults to off when the environment is absent, empty or malformed", () => {
  assert.isFalse(ContinuationGate.enabledFromEnvironment({}));
  assert.isFalse(
    ContinuationGate.enabledFromEnvironment({ [ContinuationGate.CONTINUATION_GATE_ENV]: "" }),
  );
  assert.isFalse(
    ContinuationGate.enabledFromEnvironment({ [ContinuationGate.CONTINUATION_GATE_ENV]: "true" }),
  );
  assert.isFalse(
    ContinuationGate.enabledFromEnvironment({ [ContinuationGate.CONTINUATION_GATE_ENV]: "yes" }),
  );
  assert.isTrue(
    ContinuationGate.enabledFromEnvironment({ [ContinuationGate.CONTINUATION_GATE_ENV]: "1" }),
  );
});

it.effect("rejects a new policy while off but keeps ordinary task operations", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const dir = yield* fs.makeTempDirectoryScoped();
      const dbPath = `${dir}/continuation.sqlite`;
      const state = makeState();

      yield* runWith(
        state,
        dbPath,
        false,
        Effect.gen(function* () {
          const runtime = yield* ProjectRuntimeService.ProjectRuntimeService;
          yield* seedProject;
          const ordinary = yield* runtime.createTask(
            projectId,
            {
              title: "Ordinary task",
              scope: "Keep working without the experiment.",
              acceptanceCriteria: [],
            },
            { actor: "user:maintainer" },
          );
          const review = yield* runtime.createTask(
            projectId,
            {
              title: "Review",
              scope: "Review.",
              owner: "user:reviewer",
              acceptanceCriteria: [],
            },
            { actor: "user:maintainer" },
          );
          const granted = yield* runtime
            .createTask(
              projectId,
              {
                title: "Source",
                scope: "Implement.",
                owner: "user:maintainer",
                acceptanceCriteria: [],
                continuation: {
                  version: 1,
                  mode: "synthetic",
                  reviewTaskId: review.taskId,
                  maxRepairCycles: 1,
                },
              },
              { actor: "user:maintainer" },
            )
            .pipe(Effect.flip);
          assert.match(granted.message, /continuation disabled/i);
          const agentGrant = yield* runtime
            .createTask(
              projectId,
              {
                title: "Agent source",
                scope: "Implement.",
                acceptanceCriteria: [],
                continuation: {
                  version: 1,
                  mode: "synthetic",
                  reviewTaskId: review.taskId,
                  maxRepairCycles: 1,
                },
              },
              { actor: "mcp:worker" },
            )
            .pipe(Effect.flip);
          assert.match(agentGrant.message, /continuation disabled/i);

          const edited = yield* runtime.updateTask(
            projectId,
            {
              taskId: ordinary.taskId,
              expectedRevision: ordinary.revision,
              title: "Ordinary task edited",
            },
            { actor: "user:maintainer" },
          );
          assert.equal(edited.title, "Ordinary task edited");

          // The gate does not relax the existing actor restriction: a worker
          // cannot remove policy either, even though null removal is allowed
          // for an operator.
          const agentRemoval = yield* runtime
            .updateTask(
              projectId,
              {
                taskId: edited.taskId,
                expectedRevision: edited.revision,
                continuation: null,
              },
              { actor: "mcp:worker" },
            )
            .pipe(Effect.flip);
          assert.match(agentRemoval.message, /continuation requires operator/i);
        }),
      );
    }),
  ).pipe(Effect.provide(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer))),
);

it.effect("allows removing stale policy and unrelated edits while off", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const dir = yield* fs.makeTempDirectoryScoped();
      const dbPath = `${dir}/continuation.sqlite`;
      const state = makeState();
      const created = yield* runWith(
        state,
        dbPath,
        true,
        Effect.gen(function* () {
          yield* seedProject;
          return yield* createPolicyTasks(state);
        }),
      );

      yield* runWith(
        state,
        dbPath,
        false,
        Effect.gen(function* () {
          const runtime = yield* ProjectRuntimeService.ProjectRuntimeService;
          const current = yield* runtime.readTask(projectId, created.source.taskId);
          const edited = yield* runtime.updateTask(
            projectId,
            {
              taskId: current.taskId,
              expectedRevision: current.revision,
              title: "Implementation, edited",
            },
            { actor: "user:maintainer" },
          );
          assert.equal(edited.continuation?.mode, "synthetic");

          const added = yield* runtime
            .updateTask(
              projectId,
              {
                taskId: created.review.taskId,
                expectedRevision: created.review.revision,
                continuation: {
                  version: 1,
                  mode: "synthetic",
                  reviewTaskId: created.repair.taskId,
                  maxRepairCycles: 1,
                },
              },
              { actor: "user:maintainer" },
            )
            .pipe(Effect.flip);
          assert.match(added.message, /continuation disabled/i);

          const removed = yield* runtime.updateTask(
            projectId,
            {
              taskId: edited.taskId,
              expectedRevision: edited.revision,
              continuation: null,
            },
            { actor: "user:maintainer" },
          );
          assert.isUndefined(removed.continuation);
        }),
      );
    }),
  ).pipe(Effect.provide(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer))),
);

it.effect("startup recovery dispatches no automatic review or repair while off", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const dir = yield* fs.makeTempDirectoryScoped();
      const dbPath = `${dir}/continuation.sqlite`;
      const state = makeState();
      const created = yield* setupThroughWorker(state, dbPath);
      assert.equal(state.launches.length, 1);
      completeRun(state, created.worker.threadId);

      yield* runWith(
        state,
        dbPath,
        false,
        Effect.gen(function* () {
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          yield* service.reconcileAttempt(projectId, created.worker.attemptId);
          yield* service.reconcileActiveAttempts();
          yield* service.reconcileActiveAttempts();
        }),
      );
      assert.equal(state.launches.length, 1);
    }),
  ).pipe(Effect.provide(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer))),
);

it.effect("a pending review replay is cancelled, never launched, while off", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const dir = yield* fs.makeTempDirectoryScoped();
      const dbPath = `${dir}/continuation.sqlite`;
      const state = makeState();
      const created = yield* setupThroughWorker(state, dbPath);
      completeRun(state, created.worker.threadId);
      const review = yield* runWith(
        state,
        dbPath,
        true,
        Effect.gen(function* () {
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          yield* service.reconcileAttempt(projectId, created.worker.attemptId);
          return yield* attemptByKey(
            created.review.taskId,
            `cont:v1:r:${created.worker.attemptId}`,
          );
        }),
      );
      assert.equal(state.launches.length, 2);

      yield* runWith(
        state,
        dbPath,
        false,
        Effect.gen(function* () {
          yield* markPending(review.attemptId);
          state.runs.delete(review.threadId);
        }),
      );

      const replayed = yield* runWith(
        state,
        dbPath,
        false,
        Effect.gen(function* () {
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          const attemptsBefore = yield* countAttempts;
          yield* service.reconcileActiveAttempts();
          yield* service.reconcileActiveAttempts();
          const after = yield* service.readAttempt(projectId, review.attemptId);
          return { after, attemptsBefore, attemptsAfter: yield* countAttempts };
        }),
      );
      assert.equal(replayed.after.status, "cancelled");
      assert.match(replayed.after.failure ?? "", /disabled/i);
      assert.equal(replayed.attemptsAfter, replayed.attemptsBefore);
      assert.equal(state.launches.length, 2);
    }),
  ).pipe(Effect.provide(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer))),
);

it.effect("a pending review with a possible thread records reconcile_required while off", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const dir = yield* fs.makeTempDirectoryScoped();
      const dbPath = `${dir}/continuation.sqlite`;
      const state = makeState();
      const created = yield* setupThroughWorker(state, dbPath);
      completeRun(state, created.worker.threadId);
      const review = yield* runWith(
        state,
        dbPath,
        true,
        Effect.gen(function* () {
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          yield* service.reconcileAttempt(projectId, created.worker.attemptId);
          return yield* attemptByKey(
            created.review.taskId,
            `cont:v1:r:${created.worker.attemptId}`,
          );
        }),
      );

      yield* runWith(state, dbPath, false, markPending(review.attemptId));

      const replayed = yield* runWith(
        state,
        dbPath,
        false,
        Effect.gen(function* () {
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          yield* service.reconcileActiveAttempts();
          return yield* service.readAttempt(projectId, review.attemptId);
        }),
      );
      assert.equal(replayed.status, "reconcile_required");
      assert.match(replayed.failure ?? "", /disabled/i);
      assert.equal(state.launches.length, 2);
    }),
  ).pipe(Effect.provide(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer))),
);

it.effect("treats an unreadable thread as ambiguous while off, never as absent", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const dir = yield* fs.makeTempDirectoryScoped();
      const dbPath = `${dir}/continuation.sqlite`;
      const state = makeState();
      const created = yield* setupThroughWorker(state, dbPath);
      completeRun(state, created.worker.threadId);
      const review = yield* runWith(
        state,
        dbPath,
        true,
        Effect.gen(function* () {
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          yield* service.reconcileAttempt(projectId, created.worker.attemptId);
          return yield* attemptByKey(
            created.review.taskId,
            `cont:v1:r:${created.worker.attemptId}`,
          );
        }),
      );

      state.shellReadFails = true;
      const replayed = yield* runWith(
        state,
        dbPath,
        false,
        Effect.gen(function* () {
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          yield* markPending(review.attemptId);
          yield* service.reconcileActiveAttempts();
          return yield* service.readAttempt(projectId, review.attemptId);
        }),
      );
      assert.equal(replayed.status, "reconcile_required");
      assert.match(replayed.failure ?? "", /disabled/i);
      assert.equal(state.launches.length, 2);
    }),
  ).pipe(Effect.provide(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer))),
);

it.effect("public execute cannot replay a pending continuation receipt while off", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const dir = yield* fs.makeTempDirectoryScoped();
      const dbPath = `${dir}/continuation.sqlite`;
      const state = makeState();
      const created = yield* setupThroughWorker(state, dbPath);
      completeRun(state, created.worker.threadId);
      const review = yield* runWith(
        state,
        dbPath,
        true,
        Effect.gen(function* () {
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          yield* service.reconcileAttempt(projectId, created.worker.attemptId);
          return yield* attemptByKey(
            created.review.taskId,
            `cont:v1:r:${created.worker.attemptId}`,
          );
        }),
      );

      const executed = yield* runWith(
        state,
        dbPath,
        false,
        Effect.gen(function* () {
          const runtime = yield* ProjectRuntimeService.ProjectRuntimeService;
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          yield* markPending(review.attemptId);
          state.runs.delete(review.threadId);
          const task = yield* runtime.readTask(projectId, created.review.taskId);
          return yield* service.execute(projectId, {
            taskId: task.taskId,
            expectedTaskRevision: task.revision,
          });
        }),
      );
      assert.equal(executed.status, "cancelled");
      assert.match(executed.failure ?? "", /disabled/i);
      assert.equal(state.launches.length, 2);
    }),
  ).pipe(Effect.provide(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer))),
);

it.effect("gate-on withdrawal still treats an unreadable thread as ambiguous", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const dir = yield* fs.makeTempDirectoryScoped();
      const dbPath = `${dir}/continuation.sqlite`;
      const state = makeState();
      const created = yield* setupThroughWorker(state, dbPath);
      completeRun(state, created.worker.threadId);
      const review = yield* runWith(
        state,
        dbPath,
        true,
        Effect.gen(function* () {
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          yield* service.reconcileAttempt(projectId, created.worker.attemptId);
          return yield* attemptByKey(
            created.review.taskId,
            `cont:v1:r:${created.worker.attemptId}`,
          );
        }),
      );

      const replayed = yield* runWith(
        state,
        dbPath,
        true,
        Effect.gen(function* () {
          const runtime = yield* ProjectRuntimeService.ProjectRuntimeService;
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          const current = yield* runtime.readTask(projectId, created.source.taskId);
          yield* runtime.updateTask(
            projectId,
            {
              taskId: current.taskId,
              expectedRevision: current.revision,
              continuation: null,
            },
            { actor: "user:maintainer" },
          );
          yield* markPending(review.attemptId);
          state.runs.delete(review.threadId);
          state.shellReadFails = true;
          yield* service.reconcileActiveAttempts();
          return yield* service.readAttempt(projectId, review.attemptId);
        }),
      );
      assert.equal(replayed.status, "reconcile_required");
      assert.match(replayed.failure ?? "", /authorization/i);
      assert.equal(state.launches.length, 2);
    }),
  ).pipe(Effect.provide(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer))),
);

it.effect("a pending repair replay is cancelled, never launched, while off", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const dir = yield* fs.makeTempDirectoryScoped();
      const dbPath = `${dir}/continuation.sqlite`;
      const state = makeState();
      const created = yield* setupThroughWorker(state, dbPath);
      completeRun(state, created.worker.threadId);
      const review = yield* runWith(
        state,
        dbPath,
        true,
        Effect.gen(function* () {
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          yield* service.reconcileAttempt(projectId, created.worker.attemptId);
          return yield* attemptByKey(
            created.review.taskId,
            `cont:v1:r:${created.worker.attemptId}`,
          );
        }),
      );
      completeRun(state, review.threadId);
      const repair = yield* runWith(
        state,
        dbPath,
        true,
        Effect.gen(function* () {
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          yield* appendHandoff(review, { milestone: "none", result: "fail" });
          yield* service.reconcileAttempt(projectId, review.attemptId);
          return yield* attemptByKey(created.repair.taskId, `cont:v1:p:${review.attemptId}`);
        }),
      );
      assert.equal(state.launches.length, 3);

      yield* runWith(
        state,
        dbPath,
        false,
        Effect.gen(function* () {
          yield* markPending(repair.attemptId);
          state.runs.delete(repair.threadId);
        }),
      );

      const replayed = yield* runWith(
        state,
        dbPath,
        false,
        Effect.gen(function* () {
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          yield* service.reconcileActiveAttempts();
          return yield* service.readAttempt(projectId, repair.attemptId);
        }),
      );
      assert.equal(replayed.status, "cancelled");
      assert.match(replayed.failure ?? "", /disabled/i);
      assert.equal(state.launches.length, 3);
    }),
  ).pipe(Effect.provide(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer))),
);
