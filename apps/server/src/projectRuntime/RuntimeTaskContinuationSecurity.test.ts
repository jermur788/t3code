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
  type ProjectRuntimeTask,
  type RuntimeExecutionAttempt,
  type RuntimeRouteResolution,
  type ServerProvider,
} from "@t3tools/contracts";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
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
import * as ProjectRuntimeService from "./ProjectRuntimeService.ts";
import * as ContinuationGate from "./RuntimeTaskContinuationGate.ts";
import * as RuntimeTaskExecutionService from "./RuntimeTaskExecutionService.ts";

/**
 * Negative and concurrency qualification for the synthetic continuation
 * authorization boundary. Everything below runs against a file-backed SQLite
 * database with stub providers; no model is ever invoked.
 */

const projectId = ProjectId.make("continuation-security-project");
const codex = ProviderInstanceId.make("codex");
const claude = ProviderInstanceId.make("claudeAgent");
const timestamp = "2026-11-03T00:00:00.000Z";

const project: Project = {
  id: projectId,
  title: "Continuation security",
  workspaceRoot: "/tmp/continuation-security",
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

interface Gate {
  readonly taskId: string;
  armed: boolean;
  readonly entered: Deferred.Deferred<void>;
  readonly release: Deferred.Deferred<void>;
}

/**
 * Suspends a read of one task after the durable value is read, so a competing
 * service instance can commit a newer operator decision before the caller acts
 * on its snapshot. This is the only deterministic way to reach the stop-write
 * boundary without adding a production test hook.
 */
interface RuntimeGate {
  readonly taskId: string;
  armed: boolean;
  readonly entered: Deferred.Deferred<void>;
  readonly release: Deferred.Deferred<void>;
}

interface State {
  readonly launches: Array<ThreadLaunchInput>;
  readonly runs: Map<string, ReadonlyArray<{ readonly id: string; readonly status: string }>>;
  readonly routes: Map<string, RuntimeRouteResolution>;
  gate: Gate | null;
  runtimeGate: RuntimeGate | null;
  /**
   * Pauses the external launch call itself. Reaching this point means the final
   * authorization recheck has already passed; a revocation committed here
   * exposes the residual last-check-to-launch window.
   */
  launchGate: {
    armed: boolean;
    readonly entered: Deferred.Deferred<void>;
    readonly release: Deferred.Deferred<void>;
  } | null;
}

const makeState = (): State => ({
  launches: [],
  runs: new Map(),
  routes: new Map(),
  gate: null,
  runtimeGate: null,
  launchGate: null,
});

const makeLayer = (state: State, dbPath: string) => {
  const runtimeBase = ProjectRuntimeService.layer.pipe(
    Layer.provideMerge(DevelopmentProfileService.layer),
    Layer.provideMerge(SqlitePersistence.layerFromPath(dbPath)),
    Layer.provideMerge(ContinuationGate.layer(true)),
    Layer.provide(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer)),
  );
  const runtime = Layer.effect(
    ProjectRuntimeService.ProjectRuntimeService,
    Effect.gen(function* () {
      const base = yield* ProjectRuntimeService.ProjectRuntimeService;
      const gate = state.runtimeGate;
      if (gate === null) return base;
      return ProjectRuntimeService.ProjectRuntimeService.of({
        ...base,
        readTask: (gateProjectId, gateTaskId) =>
          base.readTask(gateProjectId, gateTaskId).pipe(
            Effect.tap(() =>
              gate.armed && gateTaskId === gate.taskId
                ? Effect.gen(function* () {
                    gate.armed = false;
                    yield* Deferred.succeed(gate.entered, undefined);
                    yield* Deferred.await(gate.release);
                  })
                : Effect.void,
            ),
          ),
      });
    }),
  ).pipe(Layer.provideMerge(runtimeBase));

  return RuntimeTaskExecutionService.layer.pipe(
    Layer.provideMerge(runtime),
    Layer.provideMerge(
      Layer.mock(RuntimeRoutingService.RuntimeRoutingService)({
        resolveRoute: (input) =>
          Effect.gen(function* () {
            const gate = state.gate;
            if (gate !== null && gate.armed && input.taskId === gate.taskId) {
              gate.armed = false;
              yield* Deferred.succeed(gate.entered, undefined);
              yield* Deferred.await(gate.release);
            }
            return (
              (input.taskId === undefined ? undefined : state.routes.get(input.taskId)) ??
              resolution(input.taskId ?? "unknown", codex, "codex", "gpt-6")
            );
          }),
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
        launch: ((input: ThreadLaunchInput) =>
          Effect.gen(function* () {
            const gate = state.launchGate;
            if (gate !== null && gate.armed) {
              gate.armed = false;
              yield* Deferred.succeed(gate.entered, undefined);
              yield* Deferred.await(gate.release);
            }
            state.launches.push(input);
            const runId = `run-${state.launches.length}`;
            state.runs.set(input.threadId ?? "", [{ id: runId, status: "running" }]);
            return {
              threadId: input.threadId,
              projection: {
                runs: [{ id: runId, userMessageId: input.initialMessage?.messageId }],
              },
              resumed: false,
            };
          })) as never,
        checkWorktreeBase: () => Effect.void,
      }),
    ),
    Layer.provideMerge(
      Layer.mock(ThreadManagementService.ThreadManagementService)({
        getThreadShell: (threadId) =>
          Effect.succeed(state.runs.has(threadId) ? ({} as never) : null),
        getThreadProjection: (threadId) =>
          Effect.succeed({ runs: state.runs.get(threadId) ?? [] } as never),
        dispatch: () => Effect.succeed({} as never),
      }),
    ),
    Layer.provide(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer)),
  );
};

type Services =
  | RuntimeTaskExecutionService.RuntimeTaskExecutionService
  | ProjectRuntimeService.ProjectRuntimeService
  | SqlClient.SqlClient;

const process = <A, E>(state: State, dbPath: string, program: Effect.Effect<A, E, Services>) =>
  program.pipe(Effect.provide(makeLayer(state, dbPath)));

const completeRun = (state: State, threadId: string) => {
  const runs = state.runs.get(threadId) ?? [];
  state.runs.set(
    threadId,
    runs.map((run) => ({ ...run, status: "completed" })),
  );
};

const seedAndCreateTasks = (state: State) =>
  Effect.gen(function* () {
    const runtime = yield* ProjectRuntimeService.ProjectRuntimeService;
    const sql = yield* SqlClient.SqlClient;
    yield* sql`INSERT INTO projection_projects (project_id, title, workspace_root, scripts_json, created_at, updated_at)
      VALUES (${projectId}, 'Continuation security', '/tmp/continuation-security', '[]', ${timestamp}, ${timestamp})`;
    yield* runtime.setEnabled(projectId, { enabled: true });
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

const forceAttemptStatus = (attemptId: string, status: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* sql`UPDATE project_runtime_execution_attempts
      SET status = ${status}, run_id = NULL,
        payload_json = json_set(payload_json, '$.status', ${status}, '$.runId', NULL)
      WHERE project_id = ${projectId} AND attempt_id = ${attemptId}`;
  });

/** Worker completes, appends a handoff and returns the auto-dispatched review. */
const setupThroughReview = (state: State, dbPath: string) =>
  process(
    state,
    dbPath,
    Effect.gen(function* () {
      const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
      const tasks = yield* seedAndCreateTasks(state);
      const worker = yield* service.execute(projectId, {
        taskId: tasks.source.taskId,
        expectedTaskRevision: tasks.source.revision,
      });
      yield* appendHandoff(worker, { milestone: "none", result: "none" });
      completeRun(state, worker.threadId);
      yield* service.reconcileAttempt(projectId, worker.attemptId);
      const review = yield* attemptByKey(tasks.review.taskId, `cont:v1:r:${worker.attemptId}`);
      return { ...tasks, worker, review };
    }),
  );

it.effect("still accepts an ordinary, non-reserved request key", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const dir = yield* fs.makeTempDirectoryScoped();
      const dbPath = `${dir}/continuation.sqlite`;
      const state = makeState();
      const tasks = yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          return yield* seedAndCreateTasks(state).pipe(
            Effect.flatMap((created) =>
              service.execute(projectId, {
                taskId: created.source.taskId,
                expectedTaskRevision: created.source.revision,
                clientRequestId: "operator-approved-implementation",
              }),
            ),
          );
        }),
      );
      assert.equal(tasks.status, "launched");
      assert.equal(state.launches.length, 1);
      const replay = yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          return yield* service.execute(projectId, {
            taskId: tasks.taskId,
            expectedTaskRevision: tasks.receipt.packet.taskRevision,
            clientRequestId: "operator-approved-implementation",
          });
        }),
      );
      assert.equal(replay.attemptId, tasks.attemptId);
      assert.equal(state.launches.length, 1);
    }),
  ).pipe(Effect.provide(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer))),
);

it.effect("rejects a caller-supplied repair key for a passing review", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const dir = yield* fs.makeTempDirectoryScoped();
      const dbPath = `${dir}/continuation.sqlite`;
      const state = makeState();
      const created = yield* setupThroughReview(state, dbPath);
      assert.equal(state.launches.length, 2);

      const rejected = yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const runtime = yield* ProjectRuntimeService.ProjectRuntimeService;
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          completeRun(state, created.review.threadId);
          yield* appendHandoff(created.review, { milestone: "review-pass", result: "pass" });
          yield* service.reconcileAttempt(projectId, created.review.attemptId);
          const current = yield* runtime.readTask(projectId, created.repair.taskId);
          return yield* service
            .execute(projectId, {
              taskId: created.repair.taskId,
              expectedTaskRevision: current.revision,
              clientRequestId: `cont:v1:p:${created.review.attemptId}`,
            })
            .pipe(Effect.flip);
        }),
      );
      assert.equal(rejected._tag, "RuntimeExecutionRejectedError");
      assert.equal(state.launches.length, 2);
      const repairs = yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          return yield* service.listAttempts(projectId, { taskId: created.repair.taskId });
        }),
      );
      assert.isEmpty(repairs.attempts);
    }),
  ).pipe(Effect.provide(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer))),
);

it.effect("rejects a caller-supplied repair key after the synthetic budget is exhausted", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const dir = yield* fs.makeTempDirectoryScoped();
      const dbPath = `${dir}/continuation.sqlite`;
      const state = makeState();
      const created = yield* setupThroughReview(state, dbPath);
      let review = created.review;

      // Two authorized repairs, each followed by a linked review.
      for (let cycle = 0; cycle < 2; cycle++) {
        yield* process(
          state,
          dbPath,
          Effect.gen(function* () {
            const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
            completeRun(state, review.threadId);
            yield* appendHandoff(review, { milestone: "none", result: "fail" });
            yield* service.reconcileAttempt(projectId, review.attemptId);
          }),
        );
        const repair = yield* process(
          state,
          dbPath,
          attemptByKey(created.repair.taskId, `cont:v1:p:${review.attemptId}`),
        );
        review = yield* process(
          state,
          dbPath,
          Effect.gen(function* () {
            const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
            completeRun(state, repair.threadId);
            yield* appendHandoff(repair, { milestone: "none", result: "none" });
            yield* service.reconcileAttempt(projectId, repair.attemptId);
            return yield* attemptByKey(created.review.taskId, `cont:v1:r:${repair.attemptId}`);
          }),
        );
      }
      assert.equal(state.launches.length, 6);

      // Third failure exhausts the budget and blocks once.
      const source = yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const runtime = yield* ProjectRuntimeService.ProjectRuntimeService;
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          completeRun(state, review.threadId);
          yield* appendHandoff(review, { milestone: "none", result: "fail" });
          yield* service.reconcileAttempt(projectId, review.attemptId);
          return yield* runtime.readTask(projectId, created.source.taskId);
        }),
      );
      assert.equal(state.launches.length, 6);
      assert.equal(source.status, "blocked");

      const rejected = yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const runtime = yield* ProjectRuntimeService.ProjectRuntimeService;
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          const target = yield* runtime.readTask(projectId, created.repair.taskId);
          return yield* service
            .execute(projectId, {
              taskId: created.repair.taskId,
              expectedTaskRevision: target.revision,
              clientRequestId: `cont:v1:p:${review.attemptId}`,
            })
            .pipe(Effect.flip);
        }),
      );
      assert.equal(rejected._tag, "RuntimeExecutionRejectedError");
      assert.equal(state.launches.length, 6);
      const repairs = yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          return yield* service.listAttempts(projectId, { taskId: created.repair.taskId });
        }),
      );
      assert.equal(repairs.attempts.length, 2);
    }),
  ).pipe(Effect.provide(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer))),
);

it.effect("rejects a caller-supplied repair key after the source task is cancelled", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const dir = yield* fs.makeTempDirectoryScoped();
      const dbPath = `${dir}/continuation.sqlite`;
      const state = makeState();
      const created = yield* setupThroughReview(state, dbPath);

      const rejected = yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const runtime = yield* ProjectRuntimeService.ProjectRuntimeService;
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          const source = yield* runtime.readTask(projectId, created.source.taskId);
          yield* runtime.updateTask(
            projectId,
            {
              taskId: created.source.taskId,
              expectedRevision: source.revision,
              status: "cancelled",
            },
            { actor: "user:maintainer" },
          );
          completeRun(state, created.review.threadId);
          yield* appendHandoff(created.review, { milestone: "none", result: "fail" });
          yield* service.reconcileAttempt(projectId, created.review.attemptId);
          const target = yield* runtime.readTask(projectId, created.repair.taskId);
          return yield* service
            .execute(projectId, {
              taskId: created.repair.taskId,
              expectedTaskRevision: target.revision,
              clientRequestId: `cont:v1:p:${created.review.attemptId}`,
            })
            .pipe(Effect.flip);
        }),
      );
      assert.equal(rejected._tag, "RuntimeExecutionRejectedError");
      assert.equal(state.launches.length, 2);
    }),
  ).pipe(Effect.provide(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer))),
);

it.effect("does not dispatch a review when the source is cancelled during authorization", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const dir = yield* fs.makeTempDirectoryScoped();
      const dbPath = `${dir}/continuation.sqlite`;
      const state = makeState();
      const tasks = yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          const created = yield* seedAndCreateTasks(state);
          const worker = yield* service.execute(projectId, {
            taskId: created.source.taskId,
            expectedTaskRevision: created.source.revision,
          });
          yield* appendHandoff(worker, { milestone: "none", result: "none" });
          return { ...created, worker };
        }),
      );
      completeRun(state, tasks.worker.threadId);
      state.gate = {
        taskId: tasks.review.taskId,
        armed: true,
        entered: yield* Deferred.make<void>(),
        release: yield* Deferred.make<void>(),
      };

      // Two independent service instances over the same SQLite file. The
      // reconciler is paused between its policy decision and attempt insertion.
      yield* Effect.all(
        [
          process(
            state,
            dbPath,
            Effect.gen(function* () {
              const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
              yield* service.reconcileAttempt(projectId, tasks.worker.attemptId);
            }),
          ),
          process(
            state,
            dbPath,
            Effect.gen(function* () {
              const runtime = yield* ProjectRuntimeService.ProjectRuntimeService;
              yield* Deferred.await(state.gate!.entered);
              const current = yield* runtime.readTask(projectId, tasks.source.taskId);
              yield* runtime.updateTask(
                projectId,
                {
                  taskId: tasks.source.taskId,
                  expectedRevision: current.revision,
                  status: "cancelled",
                },
                { actor: "user:maintainer" },
              );
              yield* Deferred.succeed(state.gate!.release, undefined);
            }),
          ),
        ],
        { concurrency: 2 },
      );

      assert.equal(state.launches.length, 1);
      const result = yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const runtime = yield* ProjectRuntimeService.ProjectRuntimeService;
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          return {
            source: yield* runtime.readTask(projectId, tasks.source.taskId),
            reviews: yield* service.listAttempts(projectId, { taskId: tasks.review.taskId }),
          };
        }),
      );
      assert.equal(result.source.status, "cancelled");
      assert.isEmpty(result.reviews.attempts);
    }),
  ).pipe(Effect.provide(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer))),
);

it.effect("does not dispatch a review when continuation is removed during authorization", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const dir = yield* fs.makeTempDirectoryScoped();
      const dbPath = `${dir}/continuation.sqlite`;
      const state = makeState();
      const tasks = yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          const created = yield* seedAndCreateTasks(state);
          const worker = yield* service.execute(projectId, {
            taskId: created.source.taskId,
            expectedTaskRevision: created.source.revision,
          });
          yield* appendHandoff(worker, { milestone: "none", result: "none" });
          return { ...created, worker };
        }),
      );
      completeRun(state, tasks.worker.threadId);
      state.gate = {
        taskId: tasks.review.taskId,
        armed: true,
        entered: yield* Deferred.make<void>(),
        release: yield* Deferred.make<void>(),
      };

      yield* Effect.all(
        [
          process(
            state,
            dbPath,
            Effect.gen(function* () {
              const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
              yield* service.reconcileAttempt(projectId, tasks.worker.attemptId);
            }),
          ),
          process(
            state,
            dbPath,
            Effect.gen(function* () {
              const runtime = yield* ProjectRuntimeService.ProjectRuntimeService;
              yield* Deferred.await(state.gate!.entered);
              const current = yield* runtime.readTask(projectId, tasks.source.taskId);
              yield* runtime.updateTask(
                projectId,
                {
                  taskId: tasks.source.taskId,
                  expectedRevision: current.revision,
                  continuation: null,
                },
                { actor: "user:maintainer" },
              );
              yield* Deferred.succeed(state.gate!.release, undefined);
            }),
          ),
        ],
        { concurrency: 2 },
      );

      assert.equal(state.launches.length, 1);
      const reviews = yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          return yield* service.listAttempts(projectId, { taskId: tasks.review.taskId });
        }),
      );
      assert.isEmpty(reviews.attempts);
    }),
  ).pipe(Effect.provide(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer))),
);

it.effect("does not replay a pending review after continuation is withdrawn on restart", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const dir = yield* fs.makeTempDirectoryScoped();
      const dbPath = `${dir}/continuation.sqlite`;
      const state = makeState();
      const created = yield* setupThroughReview(state, dbPath);
      assert.equal(state.launches.length, 2);

      // Crash after the receipt insert and before the external launch.
      yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const sql = yield* SqlClient.SqlClient;
          yield* sql`UPDATE project_runtime_execution_attempts
            SET status = 'pending', run_id = NULL,
              payload_json = json_set(payload_json, '$.status', 'pending', '$.runId', NULL)
            WHERE attempt_id = ${created.review.attemptId}`;
        }),
      );
      state.runs.delete(created.review.threadId);

      const replayed = yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const runtime = yield* ProjectRuntimeService.ProjectRuntimeService;
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          const current = yield* runtime.readTask(projectId, created.source.taskId);
          yield* runtime.updateTask(
            projectId,
            {
              taskId: created.source.taskId,
              expectedRevision: current.revision,
              continuation: null,
            },
            { actor: "user:maintainer" },
          );
          yield* service.reconcileActiveAttempts();
          return yield* service.readAttempt(projectId, created.review.attemptId);
        }),
      );
      assert.equal(replayed.status, "cancelled");
      assert.match(replayed.failure ?? "", /authorization/i);
      assert.equal(state.launches.length, 2);
    }),
  ).pipe(Effect.provide(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer))),
);

it.effect("does not replay a pending review after the source is cancelled on restart", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const dir = yield* fs.makeTempDirectoryScoped();
      const dbPath = `${dir}/continuation.sqlite`;
      const state = makeState();
      const created = yield* setupThroughReview(state, dbPath);
      yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const sql = yield* SqlClient.SqlClient;
          yield* sql`UPDATE project_runtime_execution_attempts
            SET status = 'pending', run_id = NULL,
              payload_json = json_set(payload_json, '$.status', 'pending', '$.runId', NULL)
            WHERE attempt_id = ${created.review.attemptId}`;
        }),
      );
      state.runs.delete(created.review.threadId);

      const replayed = yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const runtime = yield* ProjectRuntimeService.ProjectRuntimeService;
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          const current = yield* runtime.readTask(projectId, created.source.taskId);
          yield* runtime.updateTask(
            projectId,
            {
              taskId: created.source.taskId,
              expectedRevision: current.revision,
              status: "cancelled",
            },
            { actor: "user:maintainer" },
          );
          yield* service.reconcileActiveAttempts();
          return yield* service.readAttempt(projectId, created.review.attemptId);
        }),
      );
      assert.equal(replayed.status, "cancelled");
      assert.equal(state.launches.length, 2);
    }),
  ).pipe(Effect.provide(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer))),
);

it.effect("keeps a pending replay ambiguous when a launched thread may already exist", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const dir = yield* fs.makeTempDirectoryScoped();
      const dbPath = `${dir}/continuation.sqlite`;
      const state = makeState();
      const created = yield* setupThroughReview(state, dbPath);
      assert.equal(state.launches.length, 2);

      yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const sql = yield* SqlClient.SqlClient;
          yield* sql`UPDATE project_runtime_execution_attempts
            SET status = 'pending', run_id = NULL,
              payload_json = json_set(payload_json, '$.status', 'pending', '$.runId', NULL)
            WHERE attempt_id = ${created.review.attemptId}`;
        }),
      );

      const replayed = yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const runtime = yield* ProjectRuntimeService.ProjectRuntimeService;
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          const current = yield* runtime.readTask(projectId, created.source.taskId);
          yield* runtime.updateTask(
            projectId,
            {
              taskId: created.source.taskId,
              expectedRevision: current.revision,
              continuation: null,
            },
            { actor: "user:maintainer" },
          );
          yield* service.reconcileActiveAttempts();
          return yield* service.readAttempt(projectId, created.review.attemptId);
        }),
      );
      assert.equal(replayed.status, "reconcile_required");
      assert.match(replayed.failure ?? "", /authorization/i);
      assert.equal(state.launches.length, 2);
    }),
  ).pipe(Effect.provide(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer))),
);

it.effect("records one durable blocked outcome for a terminal failed review", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const dir = yield* fs.makeTempDirectoryScoped();
      const dbPath = `${dir}/continuation.sqlite`;
      const state = makeState();
      const created = yield* setupThroughReview(state, dbPath);

      const stopped = yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const runtime = yield* ProjectRuntimeService.ProjectRuntimeService;
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          yield* forceAttemptStatus(created.review.attemptId, "failed");
          state.runs.delete(created.review.threadId);
          yield* service.reconcileActiveAttempts();
          return yield* runtime.readTask(projectId, created.source.taskId);
        }),
      );
      assert.equal(stopped.status, "blocked");
      assert.equal(stopped.blocker?.classification, "review-required");
      assert.match(stopped.blocker?.detail ?? "", /review_not_completed/);
      assert.notInclude(stopped.verification.milestone, "verified");

      // Repeated event replay and a restart keep the one recorded escalation.
      const repeated = yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const runtime = yield* ProjectRuntimeService.ProjectRuntimeService;
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          yield* service.reconcileActiveAttempts();
          yield* service.reconcileAttempt(projectId, created.review.attemptId);
          return yield* runtime.readTask(projectId, created.source.taskId);
        }),
      );
      assert.equal(repeated.revision, stopped.revision);
      assert.equal(repeated.blocker?.detail, stopped.blocker?.detail);
      assert.equal(repeated.blocker?.createdAt, stopped.blocker?.createdAt);
      assert.equal(state.launches.length, 2);
    }),
  ).pipe(Effect.provide(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer))),
);

it.effect("records one blocked outcome for contradictory review evidence without repair", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const dir = yield* fs.makeTempDirectoryScoped();
      const dbPath = `${dir}/continuation.sqlite`;
      const state = makeState();
      const created = yield* setupThroughReview(state, dbPath);

      const stopped = yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const runtime = yield* ProjectRuntimeService.ProjectRuntimeService;
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          const task = yield* runtime.readTask(projectId, created.review.taskId);
          completeRun(state, created.review.threadId);
          yield* runtime.appendHandoff(
            projectId,
            {
              taskId: created.review.taskId,
              expectedTaskRevision: task.revision,
              checkpoint: `synthetic-${created.review.attemptId}`,
              summary: "Contradictory synthetic review",
              filesChanged: [],
              verification: {
                milestone: "review-pass",
                evidence: [
                  {
                    evidenceId: "synthetic-pass",
                    result: "pass",
                    summary: "Synthetic pass",
                    recordedAt: timestamp,
                  },
                  {
                    evidenceId: "synthetic-fail",
                    result: "fail",
                    summary: "Synthetic fail",
                    recordedAt: timestamp,
                  },
                ],
              },
            },
            {
              actor: `thread:${created.review.threadId}`,
              threadId: ThreadId.make(created.review.threadId),
              providerInstanceId: created.review.modelSelection.instanceId,
              model: created.review.modelSelection.model,
            },
          );
          yield* service.reconcileAttempt(projectId, created.review.attemptId);
          return yield* runtime.readTask(projectId, created.source.taskId);
        }),
      );
      assert.equal(stopped.status, "blocked");
      assert.match(stopped.blocker?.detail ?? "", /contradictory_review_evidence/);
      assert.equal(state.launches.length, 2);
      const repairs = yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          return yield* service.listAttempts(projectId, { taskId: created.repair.taskId });
        }),
      );
      assert.isEmpty(repairs.attempts);
    }),
  ).pipe(Effect.provide(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer))),
);

it.effect("keeps ambiguous review execution observable instead of blocked", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const dir = yield* fs.makeTempDirectoryScoped();
      const dbPath = `${dir}/continuation.sqlite`;
      const state = makeState();
      const created = yield* setupThroughReview(state, dbPath);

      const result = yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const runtime = yield* ProjectRuntimeService.ProjectRuntimeService;
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          state.runs.set(created.review.threadId, []);
          const first = yield* service.reconcileAttempt(projectId, created.review.attemptId);
          yield* service.reconcileActiveAttempts();
          return {
            first: first.status,
            source: yield* runtime.readTask(projectId, created.source.taskId),
          };
        }),
      );
      assert.equal(result.first, "reconcile_required");
      assert.equal(result.source.status, "ready");
      assert.equal(result.source.blocker, null);
      assert.equal(state.launches.length, 2);
    }),
  ).pipe(Effect.provide(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer))),
);

const forcePending = (attemptId: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* sql`UPDATE project_runtime_execution_attempts
      SET status = 'pending', run_id = NULL,
        payload_json = json_set(payload_json, '$.status', 'pending', '$.runId', NULL)
      WHERE project_id = ${projectId} AND attempt_id = ${attemptId}`;
  });

const restartState = (
  state: State,
  dbPath: string,
  sourceTaskId: ProjectRuntimeTask["taskId"],
  attemptId: RuntimeExecutionAttempt["attemptId"],
) =>
  process(
    state,
    dbPath,
    Effect.gen(function* () {
      const runtime = yield* ProjectRuntimeService.ProjectRuntimeService;
      const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
      yield* service.reconcileActiveAttempts();
      return {
        source: yield* runtime.readTask(projectId, sourceTaskId),
        attempt: yield* service.readAttempt(projectId, attemptId),
      };
    }),
  );

it.effect("does not replay a pending review after the accepted source scope changes", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const dir = yield* fs.makeTempDirectoryScoped();
      const dbPath = `${dir}/continuation.sqlite`;
      const state = makeState();
      const created = yield* setupThroughReview(state, dbPath);
      assert.equal(state.launches.length, 2);

      const editedScope = "Operator-edited scope after the worker handoff.";
      yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const runtime = yield* ProjectRuntimeService.ProjectRuntimeService;
          yield* forcePending(created.review.attemptId);
          const source = yield* runtime.readTask(projectId, created.source.taskId);
          yield* runtime.updateTask(
            projectId,
            {
              taskId: created.source.taskId,
              expectedRevision: source.revision,
              scope: editedScope,
            },
            { actor: "user:maintainer" },
          );
        }),
      );
      state.runs.delete(created.review.threadId);

      const replayed = yield* restartState(
        state,
        dbPath,
        created.source.taskId,
        created.review.attemptId,
      );
      assert.equal(state.launches.length, 2);
      assert.equal(replayed.attempt.status, "cancelled");
      assert.match(replayed.attempt.failure ?? "", /authorization/i);
      assert.equal(replayed.source.scope, editedScope);
      assert.equal(replayed.source.status, "ready");
      assert.equal(replayed.source.blocker, null);
      assert.equal(replayed.source.verification.milestone, "none");

      // Idempotent on a further restart: no launch, no duplicate escalation.
      const restarted = yield* restartState(
        state,
        dbPath,
        created.source.taskId,
        created.review.attemptId,
      );
      assert.equal(state.launches.length, 2);
      assert.equal(restarted.attempt.status, "cancelled");
      assert.equal(restarted.source.revision, replayed.source.revision);
      assert.equal(restarted.source.scope, editedScope);
    }),
  ).pipe(Effect.provide(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer))),
);

it.effect("does not replay a pending review after the reviewer task scope changes", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const dir = yield* fs.makeTempDirectoryScoped();
      const dbPath = `${dir}/continuation.sqlite`;
      const state = makeState();
      const created = yield* setupThroughReview(state, dbPath);
      assert.equal(state.launches.length, 2);

      const editedScope = "Operator-edited review instructions after dispatch.";
      yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const runtime = yield* ProjectRuntimeService.ProjectRuntimeService;
          yield* forcePending(created.review.attemptId);
          const review = yield* runtime.readTask(projectId, created.review.taskId);
          yield* runtime.updateTask(
            projectId,
            {
              taskId: created.review.taskId,
              expectedRevision: review.revision,
              scope: editedScope,
            },
            { actor: "user:maintainer" },
          );
        }),
      );
      state.runs.delete(created.review.threadId);

      const replayed = yield* restartState(
        state,
        dbPath,
        created.source.taskId,
        created.review.attemptId,
      );
      assert.equal(state.launches.length, 2);
      assert.equal(replayed.attempt.status, "cancelled");
      assert.match(replayed.attempt.failure ?? "", /authorization/i);
      // The review was invalidated, so the source gets one durable stop instead
      // of silently inheriting the stale reviewer instructions.
      assert.equal(replayed.source.status, "blocked");
      assert.match(replayed.source.blocker?.detail ?? "", /review_not_completed/);
      assert.equal(replayed.source.verification.milestone, "none");

      const restarted = yield* restartState(
        state,
        dbPath,
        created.source.taskId,
        created.review.attemptId,
      );
      assert.equal(state.launches.length, 2);
      assert.equal(restarted.source.revision, replayed.source.revision);
      assert.equal(restarted.source.status, "blocked");
    }),
  ).pipe(Effect.provide(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer))),
);

it.effect("does not replay a pending repair after the reviewer acceptance criteria change", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const dir = yield* fs.makeTempDirectoryScoped();
      const dbPath = `${dir}/continuation.sqlite`;
      const state = makeState();
      const created = yield* setupThroughReview(state, dbPath);

      const repair = yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          completeRun(state, created.review.threadId);
          yield* appendHandoff(created.review, { milestone: "none", result: "fail" });
          yield* service.reconcileAttempt(projectId, created.review.attemptId);
          return yield* attemptByKey(
            created.repair.taskId,
            `cont:v1:p:${created.review.attemptId}`,
          );
        }),
      );
      assert.equal(state.launches.length, 3);

      yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const runtime = yield* ProjectRuntimeService.ProjectRuntimeService;
          yield* forcePending(repair.attemptId);
          const review = yield* runtime.readTask(projectId, created.review.taskId);
          yield* runtime.updateTask(
            projectId,
            {
              taskId: created.review.taskId,
              expectedRevision: review.revision,
              acceptanceCriteria: [{ id: "revised", text: "Review a different acceptance set." }],
            },
            { actor: "user:maintainer" },
          );
        }),
      );
      state.runs.delete(repair.threadId);

      const replayed = yield* restartState(state, dbPath, created.source.taskId, repair.attemptId);
      assert.equal(state.launches.length, 3);
      assert.equal(replayed.attempt.status, "cancelled");
      assert.match(replayed.attempt.failure ?? "", /authorization/i);
      assert.equal(replayed.source.status, "blocked");
      assert.match(replayed.source.blocker?.detail ?? "", /worker_not_completed/);
      assert.equal(replayed.source.verification.milestone, "none");
      const repairs = yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          return yield* service.listAttempts(projectId, { taskId: created.repair.taskId });
        }),
      );
      assert.equal(repairs.attempts.length, 1);
      assert.equal(repairs.attempts[0]?.status, "cancelled");
    }),
  ).pipe(Effect.provide(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer))),
);

it.effect("does not replay a pending repair after the repair target scope changes", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const dir = yield* fs.makeTempDirectoryScoped();
      const dbPath = `${dir}/continuation.sqlite`;
      const state = makeState();
      const created = yield* setupThroughReview(state, dbPath);

      const repair = yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          completeRun(state, created.review.threadId);
          yield* appendHandoff(created.review, { milestone: "none", result: "fail" });
          yield* service.reconcileAttempt(projectId, created.review.attemptId);
          return yield* attemptByKey(
            created.repair.taskId,
            `cont:v1:p:${created.review.attemptId}`,
          );
        }),
      );
      assert.equal(state.launches.length, 3);

      const editedScope = "Operator-edited repair scope after dispatch.";
      yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const runtime = yield* ProjectRuntimeService.ProjectRuntimeService;
          yield* forcePending(repair.attemptId);
          const target = yield* runtime.readTask(projectId, created.repair.taskId);
          yield* runtime.updateTask(
            projectId,
            {
              taskId: created.repair.taskId,
              expectedRevision: target.revision,
              scope: editedScope,
            },
            { actor: "user:maintainer" },
          );
        }),
      );
      state.runs.delete(repair.threadId);

      const replayed = yield* restartState(state, dbPath, created.source.taskId, repair.attemptId);
      assert.equal(state.launches.length, 3);
      assert.equal(replayed.attempt.status, "cancelled");
      assert.match(replayed.attempt.failure ?? "", /authorization/i);
      assert.equal(replayed.source.status, "blocked");
      assert.match(replayed.source.blocker?.detail ?? "", /worker_not_completed/);
      const target = yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const runtime = yield* ProjectRuntimeService.ProjectRuntimeService;
          return yield* runtime.readTask(projectId, created.repair.taskId);
        }),
      );
      assert.equal(target.scope, editedScope);
    }),
  ).pipe(Effect.provide(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer))),
);

it.effect("does not replay a pending repair after the accepted source scope changes", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const dir = yield* fs.makeTempDirectoryScoped();
      const dbPath = `${dir}/continuation.sqlite`;
      const state = makeState();
      const created = yield* setupThroughReview(state, dbPath);

      const repair = yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          completeRun(state, created.review.threadId);
          yield* appendHandoff(created.review, { milestone: "none", result: "fail" });
          yield* service.reconcileAttempt(projectId, created.review.attemptId);
          return yield* attemptByKey(
            created.repair.taskId,
            `cont:v1:p:${created.review.attemptId}`,
          );
        }),
      );
      assert.equal(state.launches.length, 3);

      const editedScope = "Operator-edited source scope after the review handoff.";
      yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const runtime = yield* ProjectRuntimeService.ProjectRuntimeService;
          yield* forcePending(repair.attemptId);
          const source = yield* runtime.readTask(projectId, created.source.taskId);
          yield* runtime.updateTask(
            projectId,
            {
              taskId: created.source.taskId,
              expectedRevision: source.revision,
              scope: editedScope,
            },
            { actor: "user:maintainer" },
          );
        }),
      );
      state.runs.delete(repair.threadId);

      const replayed = yield* restartState(state, dbPath, created.source.taskId, repair.attemptId);
      assert.equal(state.launches.length, 3);
      assert.equal(replayed.attempt.status, "cancelled");
      assert.match(replayed.attempt.failure ?? "", /authorization/i);
      assert.equal(replayed.source.scope, editedScope);
      assert.equal(replayed.source.status, "ready");
      assert.equal(replayed.source.blocker, null);
      assert.equal(replayed.source.verification.milestone, "none");
    }),
  ).pipe(Effect.provide(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer))),
);

type OperatorDecision = "done" | "deferred" | "withdraw";

/**
 * Reproduces the stop-write race: the reconciler reads an enabled source, the
 * operator commits a newer decision on a second service instance, then the
 * delayed reviewer failure tries to write a blocked task.
 */
const reviewFailureStopRace = (decision: OperatorDecision) =>
  Effect.scoped(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const dir = yield* fs.makeTempDirectoryScoped();
      const dbPath = `${dir}/continuation.sqlite`;
      const state = makeState();
      const created = yield* setupThroughReview(state, dbPath);
      yield* process(state, dbPath, forceAttemptStatus(created.review.attemptId, "failed"));
      state.runs.delete(created.review.threadId);
      assert.equal(state.launches.length, 2);

      const runtimeGate: RuntimeGate = {
        taskId: created.source.taskId,
        armed: true,
        entered: yield* Deferred.make<void>(),
        release: yield* Deferred.make<void>(),
      };
      const operatorReady = yield* Deferred.make<void>();
      state.runtimeGate = runtimeGate;
      let operatorDecision: ProjectRuntimeTask | null = null;

      // Build the operator's layer first so migrations never race, then let it
      // wait for the reconciler's snapshot read before committing.
      const operator = yield* Effect.forkChild(
        process(
          state,
          dbPath,
          Effect.gen(function* () {
            const runtime = yield* ProjectRuntimeService.ProjectRuntimeService;
            yield* Deferred.succeed(operatorReady, undefined);
            yield* Deferred.await(runtimeGate.entered);
            const current = yield* runtime.readTask(projectId, created.source.taskId);
            operatorDecision = yield* runtime.updateTask(
              projectId,
              decision === "done"
                ? {
                    taskId: created.source.taskId,
                    expectedRevision: current.revision,
                    status: "done",
                    result: "Operator completed the work after the reviewer failed.",
                  }
                : decision === "deferred"
                  ? {
                      taskId: created.source.taskId,
                      expectedRevision: current.revision,
                      status: "deferred",
                    }
                  : {
                      taskId: created.source.taskId,
                      expectedRevision: current.revision,
                      continuation: null,
                    },
              { actor: "user:maintainer" },
            );
            yield* Deferred.succeed(runtimeGate.release, undefined);
          }),
        ),
      );
      yield* Deferred.await(operatorReady);

      const reconciler = yield* Effect.forkChild(
        process(
          state,
          dbPath,
          Effect.gen(function* () {
            const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
            yield* service.reconcileAttempt(projectId, created.review.attemptId);
          }),
        ),
      );
      yield* Fiber.join(reconciler);
      yield* Fiber.join(operator);

      assert.notEqual(operatorDecision, null);
      const expected = operatorDecision!;
      assert.equal(state.launches.length, 2);

      const stopped = yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const runtime = yield* ProjectRuntimeService.ProjectRuntimeService;
          return yield* runtime.readTask(projectId, created.source.taskId);
        }),
      );
      // The newer operator decision is never overwritten by the delayed stop.
      assert.equal(stopped.revision, expected.revision);
      assert.equal(stopped.blocker, null);
      if (decision === "withdraw") {
        assert.equal(stopped.continuation, undefined);
        assert.equal(stopped.status, "ready");
      } else {
        assert.equal(stopped.status, decision);
        assert.isDefined(stopped.continuation);
        if (decision === "done") assert.match(stopped.result ?? "", /completed the work/);
      }

      // Restart: the decision and its revision are durable, with no prompt replay.
      const restarted = yield* restartState(
        state,
        dbPath,
        created.source.taskId,
        created.review.attemptId,
      );
      assert.equal(state.launches.length, 2);
      assert.equal(restarted.source.revision, expected.revision);
      assert.equal(restarted.source.blocker, null);
      assert.equal(restarted.attempt.status, "failed");
      if (decision === "withdraw") assert.equal(restarted.source.continuation, undefined);
      else assert.equal(restarted.source.status, decision);
    }),
  ).pipe(Effect.provide(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer)));

it.effect("a delayed reviewer failure does not overwrite a newer done decision", () =>
  reviewFailureStopRace("done"),
);

it.effect("a delayed reviewer failure does not overwrite a newer deferred decision", () =>
  reviewFailureStopRace("deferred"),
);

it.effect("a delayed reviewer failure does not overwrite continuation withdrawal", () =>
  reviewFailureStopRace("withdraw"),
);

it.effect("rejects every malformed continuation-style key without spending budget", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const dir = yield* fs.makeTempDirectoryScoped();
      const state = makeState();
      const malformed = [
        "cont:v1:p:",
        "cont:v1:r:",
        "cont:v1:p",
        "cont:v1:",
        "cont:v1:x:attempt",
        "cont:v1:p:x\ny",
      ];

      for (const [index, key] of malformed.entries()) {
        const dbPath = `${dir}/malformed-${index}.sqlite`;
        let repairTaskId: ProjectRuntimeTask["taskId"] | null = null;
        const rejected = yield* process(
          state,
          dbPath,
          Effect.gen(function* () {
            const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
            const created = yield* seedAndCreateTasks(state);
            repairTaskId = created.repair.taskId;
            return yield* service
              .execute(projectId, {
                taskId: created.repair.taskId,
                expectedTaskRevision: created.repair.revision,
                clientRequestId: key,
              })
              .pipe(Effect.flip);
          }),
        );
        assert.equal(rejected._tag, "RuntimeExecutionRejectedError");
        assert.equal(state.launches.length, 0);
        const repairAttempts = yield* process(
          state,
          dbPath,
          Effect.gen(function* () {
            const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
            return yield* service.listAttempts(projectId, { taskId: repairTaskId! });
          }),
        );
        assert.isEmpty(repairAttempts.attempts);
      }
    }),
  ).pipe(Effect.provide(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer))),
);

it.effect("still accepts an ordinary key on the same repair task", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const dir = yield* fs.makeTempDirectoryScoped();
      const dbPath = `${dir}/continuation.sqlite`;
      const state = makeState();
      const launched = yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          const created = yield* seedAndCreateTasks(state);
          return yield* service.execute(projectId, {
            taskId: created.repair.taskId,
            expectedTaskRevision: created.repair.revision,
            clientRequestId: "operator-approved-repair",
          });
        }),
      );
      assert.equal(launched.status, "launched");
      assert.equal(state.launches.length, 1);
    }),
  ).pipe(Effect.provide(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer))),
);

/**
 * A delayed reconciliation that re-enters after its peer committed the review
 * receipt must reuse that receipt instead of launching a second reviewer.
 */
it.effect(
  "re-enters one review receipt when a delayed reconciliation overlaps a completed one",
  () =>
    Effect.scoped(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const dir = yield* fs.makeTempDirectoryScoped();
        const dbPath = `${dir}/continuation.sqlite`;
        const state = makeState();
        const created = yield* process(
          state,
          dbPath,
          Effect.gen(function* () {
            const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
            const sql = yield* SqlClient.SqlClient;
            const tasks = yield* seedAndCreateTasks(state);
            const worker = yield* service.execute(projectId, {
              taskId: tasks.source.taskId,
              expectedTaskRevision: tasks.source.revision,
            });
            yield* appendHandoff(worker, { milestone: "none", result: "none" });
            completeRun(state, worker.threadId);
            // Settle the attempt directly so no reconciliation has advanced the
            // chain yet; both racing callers start from the same durable state.
            yield* sql`UPDATE project_runtime_execution_attempts
            SET status = 'completed', payload_json = json_set(payload_json, '$.status', 'completed')
            WHERE project_id = ${projectId} AND attempt_id = ${worker.attemptId}`;
            return { ...tasks, worker };
          }),
        );
        assert.equal(state.launches.length, 1);

        const gate: RuntimeGate = {
          taskId: created.source.taskId,
          armed: true,
          entered: yield* Deferred.make<void>(),
          release: yield* Deferred.make<void>(),
        };
        state.runtimeGate = gate;
        const delayed = yield* Effect.forkChild(
          process(
            state,
            dbPath,
            Effect.gen(function* () {
              const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
              return yield* service.reconcileAttempt(projectId, created.worker.attemptId);
            }),
          ),
        );
        yield* Deferred.await(gate.entered);
        // The peer layer must build without the gate so it can complete the
        // dispatch while the delayed caller is suspended.
        state.runtimeGate = null;
        const first = yield* process(
          state,
          dbPath,
          Effect.gen(function* () {
            const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
            return yield* service.reconcileAttempt(projectId, created.worker.attemptId);
          }),
        );
        yield* Deferred.succeed(gate.release, undefined);
        const delayedResult = yield* Fiber.join(delayed);

        assert.equal(first.status, "completed");
        assert.equal(delayedResult.status, "completed");
        // Exactly one review receipt and one review launch survived the overlap.
        const reviews = yield* process(
          state,
          dbPath,
          Effect.gen(function* () {
            const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
            return yield* service.listAttempts(projectId, { taskId: created.review.taskId });
          }),
        );
        assert.equal(reviews.attempts.length, 1);
        assert.equal(state.launches.length, 2);
      }),
    ).pipe(Effect.provide(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer))),
);

/**
 * CHARACTERIZATION ONLY, not a pass claim: authorization recheck and external
 * launch are not atomic, so a turn can still start after withdrawal. The
 * revocation contract and F4 shipping gate remain open PRODUCT DECISIONS.
 */
it.effect(
  "characterizes a turn that starts when continuation is withdrawn during the launch call",
  () =>
    Effect.scoped(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const dir = yield* fs.makeTempDirectoryScoped();
        const dbPath = `${dir}/continuation.sqlite`;
        const state = makeState();
        const created = yield* process(
          state,
          dbPath,
          Effect.gen(function* () {
            const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
            const sql = yield* SqlClient.SqlClient;
            const tasks = yield* seedAndCreateTasks(state);
            const worker = yield* service.execute(projectId, {
              taskId: tasks.source.taskId,
              expectedTaskRevision: tasks.source.revision,
            });
            yield* appendHandoff(worker, { milestone: "none", result: "none" });
            completeRun(state, worker.threadId);
            yield* sql`UPDATE project_runtime_execution_attempts
            SET status = 'completed', payload_json = json_set(payload_json, '$.status', 'completed')
            WHERE project_id = ${projectId} AND attempt_id = ${worker.attemptId}`;
            return { ...tasks, worker };
          }),
        );

        state.launchGate = {
          armed: true,
          entered: yield* Deferred.make<void>(),
          release: yield* Deferred.make<void>(),
        };
        const reconciler = yield* Effect.forkChild(
          process(
            state,
            dbPath,
            Effect.gen(function* () {
              const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
              return yield* service.reconcileAttempt(projectId, created.worker.attemptId);
            }),
          ),
        );
        yield* Deferred.await(state.launchGate.entered);

        // Revocation commits after the final authorization recheck has passed.
        const withdrawn = yield* process(
          state,
          dbPath,
          Effect.gen(function* () {
            const runtime = yield* ProjectRuntimeService.ProjectRuntimeService;
            const current = yield* runtime.readTask(projectId, created.source.taskId);
            return yield* runtime.updateTask(
              projectId,
              {
                taskId: created.source.taskId,
                expectedRevision: current.revision,
                continuation: null,
              },
              { actor: "user:maintainer" },
            );
          }),
        );
        assert.isUndefined(withdrawn.continuation);
        yield* Deferred.succeed(state.launchGate.release, undefined);
        yield* Fiber.join(reconciler);

        const review = yield* process(
          state,
          dbPath,
          Effect.gen(function* () {
            const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
            const attempts = yield* service.listAttempts(projectId, {
              taskId: created.review.taskId,
            });
            return attempts.attempts[0] ?? null;
          }),
        );
        assert.equal(state.launches.length, 2);
        assert.equal(review?.status, "launched");
        const source = yield* process(
          state,
          dbPath,
          Effect.gen(function* () {
            const runtime = yield* ProjectRuntimeService.ProjectRuntimeService;
            return yield* runtime.readTask(projectId, created.source.taskId);
          }),
        );
        assert.isUndefined(source.continuation);
        assert.equal(source.status, "ready");
      }),
    ).pipe(Effect.provide(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer))),
);

it.effect("rejects case-variant continuation keys without spending repair budget", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const dir = yield* fs.makeTempDirectoryScoped();
      const state = makeState();
      // SQLite LIKE is case-insensitive, so these variants used to pass the
      // case-sensitive public guard and still count as spent repair cycles.
      const keys = ["CONT:V1:P:attempt", "Cont:v1:r:attempt", "cOnT:v1:p:x"];

      for (const [index, key] of keys.entries()) {
        const dbPath = `${dir}/case-${index}.sqlite`;
        let repairTaskId: ProjectRuntimeTask["taskId"] | null = null;
        const rejected = yield* process(
          state,
          dbPath,
          Effect.gen(function* () {
            const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
            const created = yield* seedAndCreateTasks(state);
            repairTaskId = created.repair.taskId;
            return yield* service
              .execute(projectId, {
                taskId: created.repair.taskId,
                expectedTaskRevision: created.repair.revision,
                clientRequestId: key,
              })
              .pipe(Effect.flip);
          }),
        );
        assert.equal(rejected._tag, "RuntimeExecutionRejectedError");
        assert.equal(state.launches.length, 0);
        const attempts = yield* process(
          state,
          dbPath,
          Effect.gen(function* () {
            const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
            return yield* service.listAttempts(projectId, { taskId: repairTaskId! });
          }),
        );
        assert.isEmpty(attempts.attempts);
      }
    }),
  ).pipe(Effect.provide(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer))),
);
