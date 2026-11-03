import * as DevelopmentProfileService from "../developmentProfiles/DevelopmentProfileService.ts";
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
import * as ProjectRuntimeService from "./ProjectRuntimeService.ts";
import * as RuntimeTaskExecutionService from "./RuntimeTaskExecutionService.ts";

/**
 * File-backed restart/replay qualification for the synthetic continuation
 * spike. Every phase below builds a fresh layer graph over the same SQLite
 * file, so a "restart" means the services and their connections are gone and
 * only durable rows remain. Providers are stubs; no model is ever invoked.
 */

const projectId = ProjectId.make("continuation-restart-project");
const codex = ProviderInstanceId.make("codex");
const claude = ProviderInstanceId.make("claudeAgent");
const timestamp = "2026-11-03T00:00:00.000Z";

const project: Project = {
  id: projectId,
  title: "Continuation restart",
  workspaceRoot: "/tmp/continuation-restart",
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
  /** Attempt rows visible in SQLite at the instant the launch stub is called. */
  readonly receiptsAtLaunch: Array<
    ReadonlyArray<{ readonly attemptId: string; readonly status: string }>
  >;
  readonly runs: Map<string, ReadonlyArray<{ readonly id: string; readonly status: string }>>;
  readonly routes: Map<string, RuntimeRouteResolution>;
  launchError: Error | null;
}

const makeState = (): State => ({
  launches: [],
  receiptsAtLaunch: [],
  runs: new Map(),
  routes: new Map(),
  launchError: null,
});

const makeLayer = (state: State, dbPath: string) =>
  RuntimeTaskExecutionService.layer.pipe(
    Layer.provideMerge(
      ProjectRuntimeService.layer.pipe(
        Layer.provideMerge(DevelopmentProfileService.layer),
        Layer.provideMerge(SqlitePersistence.layerFromPath(dbPath)),
        Layer.provide(NodeServices.layer),
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
        launch: ((input: ThreadLaunchInput) =>
          Effect.gen(function* () {
            const sql = yield* SqlClient.SqlClient;
            const rows = yield* sql<{
              readonly attempt_id: string;
              readonly status: string;
            }>`SELECT attempt_id, status
              FROM project_runtime_execution_attempts
              WHERE project_id = ${projectId} AND thread_id = ${input.threadId ?? ""}`;
            state.receiptsAtLaunch.push(
              rows.map((row) => ({ attemptId: row.attempt_id, status: row.status })),
            );
            state.launches.push(input);
            if (state.launchError !== null) {
              return yield* Effect.fail(state.launchError);
            }
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
    Layer.provide(NodeServices.layer),
  );

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
      VALUES (${projectId}, 'Continuation restart', '/tmp/continuation-restart', '[]', ${timestamp}, ${timestamp})`;
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

/**
 * Attempt timestamps can tie inside one fast test, so the deterministic
 * request key - not list order - identifies each attempt.
 */
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

/** The request key is a durable column, not part of the decoded attempt record. */
const requestKeyOf = (attemptId: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const rows = yield* sql<{ readonly request_key: string | null }>`SELECT request_key
      FROM project_runtime_execution_attempts WHERE attempt_id = ${attemptId}`;
    return rows[0]?.request_key ?? null;
  });

it.effect("dispatches one review from a file-backed restart and never elevates the source", () =>
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
          const tasks = yield* seedAndCreateTasks(state);
          const worker = yield* service.execute(projectId, {
            taskId: tasks.source.taskId,
            expectedTaskRevision: tasks.source.revision,
          });
          const workerHandoff = yield* appendHandoff(worker, {
            milestone: "none",
            result: "none",
          });
          return { ...tasks, worker, workerHandoff };
        }),
      );
      assert.equal(state.launches.length, 1);
      // The attempt receipt existed, and was still pending, before launch.
      assert.deepEqual(state.receiptsAtLaunch[0], [
        { attemptId: created.worker.attemptId, status: "pending" },
      ]);

      completeRun(state, created.worker.threadId);

      // Restart 1: settle the worker and dispatch exactly one review.
      const reviewAttempt = yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          const reconciled = yield* service.reconcileAttempt(projectId, created.worker.attemptId);
          assert.equal(reconciled.status, "completed");
          yield* service.reconcileAttempt(projectId, created.worker.attemptId);
          yield* service.reconcileActiveAttempts();
          const attempt = yield* attemptByKey(
            created.review.taskId,
            `cont:v1:r:${created.worker.attemptId}`,
          );
          return { attempt, requestKey: yield* requestKeyOf(attempt.attemptId) };
        }),
      );
      assert.equal(state.launches.length, 2);
      const reviewLaunch = state.launches[1]!;
      assert.equal(reviewLaunch.modelSelection.instanceId, claude);
      const reviewPacket = reviewLaunch.initialMessage?.text ?? "";
      assert.include(reviewPacket, created.worker.attemptId);
      assert.include(reviewPacket, created.workerHandoff.handoffId);
      assert.equal(reviewAttempt.attempt.status, "launched");
      const reviewRequestKey = reviewAttempt.requestKey;
      const review = reviewAttempt.attempt;

      // Restart 2: startup scan must not duplicate the launched review.
      yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          yield* service.reconcileActiveAttempts();
        }),
      );
      assert.equal(state.launches.length, 2);

      // Restart 3: a passing review launches no repair and does not verify the source.
      const finalSource = yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const runtime = yield* ProjectRuntimeService.ProjectRuntimeService;
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          completeRun(state, review.threadId);
          yield* appendHandoff(review, { milestone: "review-pass", result: "pass" });
          yield* service.reconcileAttempt(projectId, review.attemptId);
          yield* service.reconcileActiveAttempts();
          return yield* runtime.readTask(projectId, created.source.taskId);
        }),
      );
      assert.equal(state.launches.length, 2);
      const repairAttempts = yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          return yield* service.listAttempts(projectId, { taskId: created.repair.taskId });
        }),
      );
      assert.isEmpty(repairAttempts.attempts);
      assert.equal(finalSource.verification.milestone, "none");
      assert.equal(finalSource.status, "ready");
      assert.equal(reviewRequestKey, `cont:v1:r:${created.worker.attemptId}`);
    }),
  ).pipe(Effect.provide(NodeServices.layer)),
);

it.effect("replays a persisted pending review receipt with its original ids after restart", () =>
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
          const tasks = yield* seedAndCreateTasks(state);
          const worker = yield* service.execute(projectId, {
            taskId: tasks.source.taskId,
            expectedTaskRevision: tasks.source.revision,
          });
          yield* appendHandoff(worker, { milestone: "none", result: "none" });
          return { ...tasks, worker };
        }),
      );
      completeRun(state, created.worker.threadId);
      const reviewAttempt = yield* process(
        state,
        dbPath,
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
      const original = state.launches[1]!;

      // Crash between receipt insert and launch: the row is still pending.
      yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const sql = yield* SqlClient.SqlClient;
          yield* sql`UPDATE project_runtime_execution_attempts
            SET status = 'pending', run_id = NULL,
              payload_json = json_set(payload_json, '$.status', 'pending', '$.runId', NULL)
            WHERE attempt_id = ${reviewAttempt.attemptId}`;
        }),
      );

      const replayed = yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          state.runs.delete(reviewAttempt.threadId);
          yield* service.reconcileActiveAttempts();
          return yield* service.readAttempt(projectId, reviewAttempt.attemptId);
        }),
      );
      assert.equal(replayed.status, "launched");
      assert.equal(state.launches.length, 3);
      assert.equal(state.launches[2]?.threadId, original.threadId);
      assert.equal(
        state.launches[2]?.initialMessage?.messageId,
        original.initialMessage?.messageId,
      );
      // The replay reuses the stored receipt; it does not create a second one.
      assert.deepEqual(state.receiptsAtLaunch[2], [
        { attemptId: reviewAttempt.attemptId, status: "pending" },
      ]);
    }),
  ).pipe(Effect.provide(NodeServices.layer)),
);

it.effect("bounds two repairs across restarts and leaves one durable operator blocker", () =>
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
          const tasks = yield* seedAndCreateTasks(state);
          const worker = yield* service.execute(projectId, {
            taskId: tasks.source.taskId,
            expectedTaskRevision: tasks.source.revision,
          });
          yield* appendHandoff(worker, { milestone: "none", result: "none" });
          return { ...tasks, worker };
        }),
      );
      completeRun(state, created.worker.threadId);

      let review: RuntimeExecutionAttempt;
      let repair: RuntimeExecutionAttempt;
      review = yield* process(
        state,
        dbPath,
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

      const firstRepair = yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          completeRun(state, review.threadId);
          yield* appendHandoff(review, { milestone: "none", result: "fail" });
          yield* service.reconcileAttempt(projectId, review.attemptId);
          const attempt = yield* attemptByKey(
            created.repair.taskId,
            `cont:v1:p:${review.attemptId}`,
          );
          return { attempt, requestKey: yield* requestKeyOf(attempt.attemptId) };
        }),
      );
      assert.equal(state.launches.length, 3);
      assert.equal(firstRepair.requestKey, `cont:v1:p:${review.attemptId}`);
      repair = firstRepair.attempt;

      // Repair 1 completes, and the next review is linked to that repair.
      const secondReview = yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          completeRun(state, repair.threadId);
          yield* appendHandoff(repair, { milestone: "none", result: "none" });
          yield* service.reconcileAttempt(projectId, repair.attemptId);
          const attempt = yield* attemptByKey(
            created.review.taskId,
            `cont:v1:r:${repair.attemptId}`,
          );
          return { attempt, requestKey: yield* requestKeyOf(attempt.attemptId) };
        }),
      );
      assert.equal(state.launches.length, 4);
      assert.equal(secondReview.requestKey, `cont:v1:r:${repair.attemptId}`);
      assert.include(state.launches[3]?.initialMessage?.text ?? "", repair.attemptId);
      review = secondReview.attempt;

      // Second failure, second repair.
      repair = yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          completeRun(state, review.threadId);
          yield* appendHandoff(review, { milestone: "none", result: "fail" });
          yield* service.reconcileAttempt(projectId, review.attemptId);
          return yield* attemptByKey(created.repair.taskId, `cont:v1:p:${review.attemptId}`);
        }),
      );
      assert.equal(state.launches.length, 5);

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
      assert.equal(state.launches.length, 6);

      // Third failure exceeds the two-cycle budget: block once, dispatch nothing.
      const source = yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const runtime = yield* ProjectRuntimeService.ProjectRuntimeService;
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          completeRun(state, review.threadId);
          yield* appendHandoff(review, { milestone: "none", result: "fail" });
          yield* service.reconcileAttempt(projectId, review.attemptId);
          yield* service.reconcileActiveAttempts();
          return yield* runtime.readTask(projectId, created.source.taskId);
        }),
      );
      assert.equal(state.launches.length, 6);
      assert.equal(source.status, "blocked");
      assert.equal(source.blocker?.classification, "review-required");
      assert.match(source.nextAction ?? "", /authorize/i);

      // Restart: the same durable blocker is reused; no third repair appears.
      const restarted = yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const runtime = yield* ProjectRuntimeService.ProjectRuntimeService;
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          yield* service.reconcileActiveAttempts();
          yield* service.reconcileAttempt(projectId, review.attemptId);
          return {
            source: yield* runtime.readTask(projectId, created.source.taskId),
            repairs: yield* service.listAttempts(projectId, { taskId: created.repair.taskId }),
            reviews: yield* service.listAttempts(projectId, { taskId: created.review.taskId }),
          };
        }),
      );
      assert.equal(state.launches.length, 6);
      assert.equal(restarted.repairs.attempts.length, 2);
      assert.equal(restarted.reviews.attempts.length, 3);
      assert.equal(restarted.source.status, "blocked");
      assert.equal(restarted.source.revision, source.revision);
    }),
  ).pipe(Effect.provide(NodeServices.layer)),
);

it.effect("keeps a failed or ambiguous review launch from authorizing more work", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const dir = yield* fs.makeTempDirectoryScoped();

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
            const review = yield* attemptByKey(
              tasks.review.taskId,
              `cont:v1:r:${worker.attemptId}`,
            );
            return { ...tasks, worker, review };
          }),
        );

      // Failed launch: the review row is terminal, so nothing is re-authorized.
      const failedState = makeState();
      const failed = yield* setupThroughReview(failedState, `${dir}/failed.sqlite`);
      assert.equal(failedState.launches.length, 2);
      const failedResult = yield* process(
        failedState,
        `${dir}/failed.sqlite`,
        Effect.gen(function* () {
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          const sql = yield* SqlClient.SqlClient;
          yield* sql`UPDATE project_runtime_execution_attempts
            SET status = 'failed', run_id = NULL,
              payload_json = json_set(payload_json, '$.status', 'failed', '$.runId', NULL)
            WHERE attempt_id = ${failed.review.attemptId}`;
          failedState.runs.delete(failed.review.threadId);
          yield* service.reconcileActiveAttempts();
          return {
            attempt: yield* service.readAttempt(projectId, failed.review.attemptId),
            repairs: yield* service.listAttempts(projectId, { taskId: failed.repair.taskId }),
          };
        }),
      );
      assert.equal(failedResult.attempt.status, "failed");
      assert.isEmpty(failedResult.repairs.attempts);
      assert.equal(failedState.launches.length, 2);

      // Ambiguous launch: the attempt stays active for an operator, unlaunched.
      const ambiguousState = makeState();
      const ambiguous = yield* setupThroughReview(ambiguousState, `${dir}/ambiguous.sqlite`);
      const ambiguousResult = yield* process(
        ambiguousState,
        `${dir}/ambiguous.sqlite`,
        Effect.gen(function* () {
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          // The thread still exists but reports no run for this attempt.
          ambiguousState.runs.set(ambiguous.review.threadId, []);
          const first = yield* service.reconcileAttempt(projectId, ambiguous.review.attemptId);
          yield* service.reconcileActiveAttempts();
          return {
            first: first.status,
            attempt: yield* service.readAttempt(projectId, ambiguous.review.attemptId),
            repairs: yield* service.listAttempts(projectId, { taskId: ambiguous.repair.taskId }),
          };
        }),
      );
      assert.equal(ambiguousResult.first, "reconcile_required");
      assert.equal(ambiguousResult.attempt.status, "reconcile_required");
      assert.isEmpty(ambiguousResult.repairs.attempts);
      assert.equal(ambiguousState.launches.length, 2);
    }),
  ).pipe(Effect.provide(NodeServices.layer)),
);
