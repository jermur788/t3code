import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import {
  DEFAULT_SERVER_SETTINGS,
  ProjectId,
  ProjectRuntimeTaskId,
  ProviderDriverKind,
  ProviderInstanceId,
  type Project,
  type ProjectRuntimeTask,
  type RuntimeRouteResolution,
  type ServerProvider,
} from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as SqlClient from "effect/sql/SqlClient";

import * as SqlitePersistence from "../persistence/Sqlite.ts";
import * as ProjectRuntimeService from "./ProjectRuntimeService.ts";
import * as RuntimeTaskExecutionService from "./RuntimeTaskExecutionService.ts";
import * as ThreadLaunchService from "../orchestration-v2/ThreadLaunchService.ts";
import type { ThreadLaunchInput } from "../orchestration-v2/ThreadLaunchService.ts";
import * as ThreadManagementService from "../orchestration-v2/ThreadManagementService.ts";
import * as ServerSettingsService from "../serverSettings.ts";
import * as ProjectService from "../project/ProjectService.ts";
import * as RuntimeRoutingService from "../runtimeRouting/RuntimeRoutingService.ts";
import { RuntimeRoutingProviderView } from "../runtimeRouting/RuntimeRoutingProviderView.ts";

const projectId = ProjectId.make("execution-project");
const taskId = ProjectRuntimeTaskId.make("execution-task");
const codex = ProviderInstanceId.make("codex");
const timestamp = "2026-10-28T00:00:00.000Z";

const task: ProjectRuntimeTask = {
  taskId,
  projectId,
  title: "Execute the task",
  scope: "Implement it.",
  owner: "user:maintainer",
  acceptanceCriteria: [{ id: "c1", text: "Tests pass." }],
  status: "ready",
  blocker: null,
  verification: { milestone: "none", evidence: [] },
  latestHandoffId: null,
  revision: 1,
  createdAt: timestamp,
  updatedAt: timestamp,
  createdBy: "user:maintainer",
  updatedBy: "user:maintainer",
};

const project: Project = {
  id: projectId,
  title: "Execution project",
  workspaceRoot: "/tmp/execution-project",
  defaultModelSelection: { instanceId: codex, model: "gpt-6" },
  scripts: [],
  createdAt: timestamp,
  updatedAt: timestamp,
  deletedAt: null,
};

const provider: ServerProvider = {
  instanceId: codex,
  driver: ProviderDriverKind.make("codex"),
  enabled: true,
  installed: true,
  status: "ready",
  auth: { status: "authenticated" },
  version: null,
  checkedAt: timestamp,
  models: [{ slug: "gpt-6", name: "GPT-6", isCustom: false, capabilities: null }],
  slashCommands: [],
  skills: [],
};

const resolvedRoute = (): RuntimeRouteResolution => ({
  projectId,
  taskId,
  role: "implementation",
  status: "resolved",
  source: "project",
  selected: {
    source: "project",
    candidateIndex: 0,
    candidate: { providerInstanceId: codex, model: "gpt-6" },
    providerInstanceId: codex,
    driverKind: ProviderDriverKind.make("codex"),
    model: "gpt-6",
    isolation: "shared",
    eligibility: "eligible-at-resolution",
  },
  inheritedFrom: null,
  rejected: [],
  failure: null,
  revisions: { task: 1, projectRouting: 1, profile: null, assignment: null },
});

const inheritedRoute = (): RuntimeRouteResolution => ({
  projectId,
  taskId,
  role: "implementation",
  status: "inherited",
  source: "inherit",
  selected: null,
  inheritedFrom: null,
  rejected: [],
  failure: null,
  revisions: { task: 1, projectRouting: 0, profile: null, assignment: null },
});

interface State {
  readonly resolution: RuntimeRouteResolution;
  readonly launchCalls: Array<
    Parameters<ThreadLaunchService.ThreadLaunchService["Service"]["launch"]>[0]
  >;
  launchError: Error | null;
  threadExists: boolean;
  threadShellError: Error | null;
  runs: ReadonlyArray<{ readonly id: string; readonly status: string }>;
  projectionError: Error | null;
  stopCalls: Array<{ readonly threadId: string }>;
  dispatchError: Error | null;
}

const makeState = (overrides: Partial<State> = {}): State => ({
  resolution: resolvedRoute(),
  launchCalls: [],
  launchError: null,
  threadExists: false,
  threadShellError: null,
  runs: [],
  projectionError: null,
  stopCalls: [],
  dispatchError: null,
  ...overrides,
});

const seedDatabase = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`INSERT INTO projection_projects (project_id, title, workspace_root, scripts_json, created_at, updated_at)
    VALUES (${projectId}, 'Execution', '/tmp/execution-project', '[]', ${timestamp}, ${timestamp})`;
  yield* sql`INSERT INTO project_runtime (project_id, enabled, revision, created_at, updated_at)
    VALUES (${projectId}, 1, 1, ${timestamp}, ${timestamp})`;
  yield* sql`INSERT INTO project_runtime_tasks (task_id, project_id, status, revision, created_at, payload_json)
    VALUES (${taskId}, ${projectId}, 'ready', 1, ${timestamp}, '{}')`;
});

const makeLayer = (state: State) =>
  RuntimeTaskExecutionService.layer.pipe(
    Layer.provideMerge(
      Layer.mock(ProjectRuntimeService.ProjectRuntimeService)({
        getStatus: () => Effect.succeed({ enabled: true, version: 1 as const, revision: 1 }),
        readTask: () => Effect.succeed(task),
        readHandoff: () => Effect.die("unexpected handoff read"),
      }),
    ),
    Layer.provideMerge(
      Layer.mock(RuntimeRoutingService.RuntimeRoutingService)({
        resolveRoute: () => Effect.succeed(state.resolution),
      }),
    ),
    Layer.provideMerge(
      Layer.succeed(RuntimeRoutingProviderView, {
        read: Effect.succeed({
          providers: [provider],
          orchestrationCapableInstanceIds: new Set([codex]),
          settings: DEFAULT_SERVER_SETTINGS,
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
          Effect.suspend(() => {
            state.launchCalls.push(input);
            if (state.launchError !== null) return Effect.fail(state.launchError as never);
            const messageId = input.initialMessage?.messageId;
            return Effect.succeed({
              threadId: input.threadId,
              projection: {
                runs: messageId === undefined ? [] : [{ id: "run-1", userMessageId: messageId }],
              },
              resumed: false,
            });
          })) as never,
        checkWorktreeBase: () => Effect.void,
      }),
    ),
    Layer.provideMerge(
      Layer.mock(ThreadManagementService.ThreadManagementService)({
        getThreadShell: () =>
          state.threadShellError !== null
            ? Effect.fail(state.threadShellError as never)
            : Effect.succeed(state.threadExists ? ({} as never) : null),
        getThreadProjection: () =>
          state.projectionError !== null
            ? Effect.fail(state.projectionError as never)
            : Effect.succeed({ runs: state.runs } as never),
        dispatch: (command) =>
          state.dispatchError !== null
            ? Effect.fail(state.dispatchError as never)
            : Effect.sync(() => {
                if ("threadId" in command) state.stopCalls.push({ threadId: command.threadId });
                return {} as never;
              }),
      }),
    ),
    Layer.provideMerge(SqlitePersistence.layerMemory),
    Layer.provide(NodeServices.layer),
  );

it.effect("persists one attempt before launching and reuses it for retries", () => {
  const state = makeState({
    threadExists: true,
    runs: [{ id: "run-1", status: "running" }],
  });
  return Effect.gen(function* () {
    const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
    yield* seedDatabase;
    const attempt = yield* service.execute(projectId, {
      taskId,
      expectedTaskRevision: 1,
      clientRequestId: "request-1",
    });
    assert.equal(attempt.status, "launched");
    assert.equal(attempt.runId, "run-1");
    assert.equal(attempt.taskTitle, task.title);
    assert.equal(attempt.routeSource, "project");
    assert.equal(attempt.receipt.launch.modelSelection.instanceId, codex);
    assert.equal(state.launchCalls.length, 1);
    assert.equal(state.launchCalls[0]?.createdBy, "user");
    assert.deepEqual(state.launchCalls[0]?.workspaceStrategy, { type: "root" });

    const retry = yield* service.execute(projectId, {
      taskId,
      expectedTaskRevision: 1,
      clientRequestId: "request-1",
    });
    assert.equal(retry.attemptId, attempt.attemptId);
    const active = yield* service.execute(projectId, {
      taskId,
      expectedTaskRevision: 1,
      clientRequestId: "request-2",
    });
    assert.equal(active.attemptId, attempt.attemptId);
    assert.equal(state.launchCalls.length, 1);

    const listed = yield* service.listAttempts(projectId, { taskId });
    assert.equal(listed.attempts.length, 1);
    assert.equal(listed.attempts[0]?.status, "launched");
    assert.equal(
      (yield* service.readAttempt(projectId, attempt.attemptId)).attemptId,
      attempt.attemptId,
    );
  }).pipe(Effect.provide(makeLayer(state)));
});

it.effect("replays a pending attempt with the stored launch ids", () => {
  const state = makeState();
  return Effect.gen(function* () {
    const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
    const sql = yield* SqlClient.SqlClient;
    yield* seedDatabase;
    const attempt = yield* service.execute(projectId, { taskId, expectedTaskRevision: 1 });
    yield* sql`UPDATE project_runtime_execution_attempts
      SET status = 'pending', run_id = NULL,
        payload_json = json_set(payload_json, '$.status', 'pending', '$.runId', NULL)
      WHERE attempt_id = ${attempt.attemptId}`;
    assert.equal(yield* service.reconcileActiveAttempts(), 1);
    assert.equal(state.launchCalls.length, 2);
    assert.equal(state.launchCalls[1]?.threadId, attempt.threadId);
    assert.equal(
      state.launchCalls[1]?.initialMessage?.messageId,
      state.launchCalls[0]?.initialMessage?.messageId,
    );
    assert.equal((yield* service.readAttempt(projectId, attempt.attemptId)).status, "launched");
  }).pipe(Effect.provide(makeLayer(state)));
});

it.effect("does not launch when routing is unavailable", () => {
  const state = makeState({
    resolution: {
      ...resolvedRoute(),
      status: "failed",
      source: "project",
      selected: null,
      failure: { source: "project", reason: "candidates_exhausted" },
    },
  });
  return Effect.gen(function* () {
    const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
    yield* seedDatabase;
    const failure = yield* service
      .execute(projectId, { taskId, expectedTaskRevision: 1 })
      .pipe(Effect.flip);
    assert.equal(failure._tag, "RuntimeExecutionRejectedError");
    assert.equal(state.launchCalls.length, 0);
    assert.isEmpty((yield* service.listAttempts(projectId, {})).attempts);
  }).pipe(Effect.provide(makeLayer(state)));
});

it.effect("records a failed launch and allows a later attempt", () => {
  const state = makeState({ launchError: new Error("launch failed") });
  return Effect.gen(function* () {
    const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
    yield* seedDatabase;
    const failed = yield* service.execute(projectId, {
      taskId,
      expectedTaskRevision: 1,
      clientRequestId: "request-1",
    });
    assert.equal(failed.status, "failed");
    assert.isNotNull(failed.failure);

    state.launchError = null;
    const retried = yield* service.execute(projectId, {
      taskId,
      expectedTaskRevision: 1,
      clientRequestId: "request-2",
    });
    assert.equal(retried.status, "launched");
    assert.notEqual(retried.attemptId, failed.attemptId);
    assert.equal(state.launchCalls.length, 2);
  }).pipe(Effect.provide(makeLayer(state)));
});

it.effect("uses and records the project default for an inherited route", () => {
  const state = makeState({ resolution: inheritedRoute() });
  return Effect.gen(function* () {
    const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
    yield* seedDatabase;
    const attempt = yield* service.execute(projectId, { taskId, expectedTaskRevision: 1 });
    assert.equal(attempt.routeSource, "inherit");
    assert.equal(attempt.receipt.launch.modelSelection.instanceId, codex);
    assert.equal(attempt.receipt.launch.modelSelection.model, "gpt-6");
    assert.equal(state.launchCalls[0]?.modelSelection.model, "gpt-6");
  }).pipe(Effect.provide(makeLayer(state)));
});

it.effect("serializes concurrent executes into one launch", () => {
  const state = makeState();
  return Effect.gen(function* () {
    const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
    yield* seedDatabase;
    const [first, second] = yield* Effect.all(
      [
        service.execute(projectId, { taskId, expectedTaskRevision: 1 }),
        service.execute(projectId, { taskId, expectedTaskRevision: 1 }),
      ],
      { concurrency: 2 },
    );
    assert.equal(first.attemptId, second.attemptId);
    assert.equal(state.launchCalls.length, 1);
  }).pipe(Effect.provide(makeLayer(state)));
});

it.effect("treats a failed shell read after launch failure as ambiguous", () => {
  const state = makeState({
    launchError: new Error("launch failed"),
    threadShellError: new Error("shell read failed"),
  });
  return Effect.gen(function* () {
    const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
    yield* seedDatabase;
    const ambiguous = yield* service.execute(projectId, {
      taskId,
      expectedTaskRevision: 1,
      clientRequestId: "request-1",
    });
    assert.equal(ambiguous.status, "reconcile_required");
    const retried = yield* service.execute(projectId, {
      taskId,
      expectedTaskRevision: 1,
      clientRequestId: "request-2",
    });
    assert.equal(retried.attemptId, ambiguous.attemptId);
    assert.equal(state.launchCalls.length, 1);
  }).pipe(Effect.provide(makeLayer(state)));
});

it.effect("cancels a launched attempt and reconciles its terminal run", () => {
  const state = makeState({
    threadExists: true,
    runs: [{ id: "run-1", status: "running" }],
  });
  return Effect.gen(function* () {
    const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
    yield* seedDatabase;
    const attempt = yield* service.execute(projectId, { taskId, expectedTaskRevision: 1 });
    const cancelling = yield* service.cancelAttempt(
      projectId,
      attempt.attemptId,
      attempt.revision,
      "test cancel",
    );
    assert.equal(cancelling.status, "cancelling");
    assert.isNotNull(cancelling.cancelRequestedAt);
    assert.equal(state.stopCalls.length, 1);

    state.runs = [{ id: "run-1", status: "cancelled" }];
    const reconciled = yield* service.reconcileAttempt(projectId, attempt.attemptId);
    assert.equal(reconciled.status, "cancelled");
  }).pipe(Effect.provide(makeLayer(state)));
});

it.effect("reconciles a launched attempt to completed", () => {
  const state = makeState({
    threadExists: true,
    runs: [{ id: "run-1", status: "completed" }],
  });
  return Effect.gen(function* () {
    const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
    yield* seedDatabase;
    const attempt = yield* service.execute(projectId, { taskId, expectedTaskRevision: 1 });
    const reconciled = yield* service.reconcileAttempt(projectId, attempt.attemptId);
    assert.equal(reconciled.status, "completed");
    assert.isNull(reconciled.failure);
  }).pipe(Effect.provide(makeLayer(state)));
});

it.effect("keeps an attempt ambiguous when reconciliation cannot read its thread", () => {
  const state = makeState({
    threadExists: true,
    threadShellError: new Error("shell read failed"),
  });
  return Effect.gen(function* () {
    const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
    yield* seedDatabase;
    const attempt = yield* service.execute(projectId, { taskId, expectedTaskRevision: 1 });
    const reconciled = yield* service.reconcileAttempt(projectId, attempt.attemptId);
    assert.equal(reconciled.status, "reconcile_required");
  }).pipe(Effect.provide(makeLayer(state)));
});

it.effect("cancels an attempt whose thread is already gone", () => {
  const state = makeState({ threadExists: false });
  return Effect.gen(function* () {
    const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
    yield* seedDatabase;
    const attempt = yield* service.execute(projectId, { taskId, expectedTaskRevision: 1 });
    const cancelled = yield* service.cancelAttempt(projectId, attempt.attemptId, attempt.revision);
    assert.equal(cancelled.status, "cancelled");
    assert.equal(state.stopCalls.length, 0);
  }).pipe(Effect.provide(makeLayer(state)));
});

it.effect("links the handoff written by the worker thread", () => {
  const state = makeState({
    threadExists: true,
    runs: [{ id: "run-1", status: "completed" }],
  });
  return Effect.gen(function* () {
    const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
    const sql = yield* SqlClient.SqlClient;
    yield* seedDatabase;
    const attempt = yield* service.execute(projectId, { taskId, expectedTaskRevision: 1 });
    yield* sql`INSERT INTO project_runtime_handoffs
      (handoff_id, project_id, task_id, created_at, payload_json)
      VALUES ('handoff-1', ${projectId}, ${taskId}, ${timestamp},
        ${JSON.stringify({ threadId: attempt.threadId })})`;
    const reconciled = yield* service.reconcileAttempt(projectId, attempt.attemptId);
    assert.equal(reconciled.handoffId, "handoff-1");
  }).pipe(Effect.provide(makeLayer(state)));
});

it.effect("never revives a terminal attempt through reconciliation", () => {
  const state = makeState({
    threadExists: true,
    runs: [{ id: "run-1", status: "completed" }],
  });
  return Effect.gen(function* () {
    const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
    yield* seedDatabase;
    const attempt = yield* service.execute(projectId, { taskId, expectedTaskRevision: 1 });
    const completed = yield* service.reconcileAttempt(projectId, attempt.attemptId);
    assert.equal(completed.status, "completed");
    state.threadExists = false;
    const reconciledAgain = yield* service.reconcileAttempt(projectId, attempt.attemptId);
    assert.equal(reconciledAgain.status, "completed");
  }).pipe(Effect.provide(makeLayer(state)));
});

it.effect("a terminal attempt releases the active slot for a new execute", () => {
  const state = makeState({
    threadExists: true,
    runs: [{ id: "run-1", status: "completed" }],
  });
  return Effect.gen(function* () {
    const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
    yield* seedDatabase;
    const first = yield* service.execute(projectId, {
      taskId,
      expectedTaskRevision: 1,
      clientRequestId: "request-1",
    });
    const second = yield* service.execute(projectId, {
      taskId,
      expectedTaskRevision: 1,
      clientRequestId: "request-2",
    });
    assert.notEqual(second.attemptId, first.attemptId);
    assert.equal(second.status, "launched");
    assert.equal(state.launchCalls.length, 2);
  }).pipe(Effect.provide(makeLayer(state)));
});

it.effect("does not stop or rewrite an already terminal attempt", () => {
  const state = makeState({
    threadExists: true,
    runs: [{ id: "run-1", status: "completed" }],
  });
  return Effect.gen(function* () {
    const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
    yield* seedDatabase;
    const attempt = yield* service.execute(projectId, { taskId, expectedTaskRevision: 1 });
    const completed = yield* service.reconcileAttempt(projectId, attempt.attemptId);
    const cancelled = yield* service.cancelAttempt(
      projectId,
      completed.attemptId,
      completed.revision,
    );
    assert.equal(cancelled.status, "completed");
    assert.equal(state.stopCalls.length, 0);
  }).pipe(Effect.provide(makeLayer(state)));
});

it.effect("marks a failed cancellation dispatch as reconcile-required", () => {
  const state = makeState({
    threadExists: true,
    runs: [{ id: "run-1", status: "running" }],
    dispatchError: new Error("dispatch failed"),
  });
  return Effect.gen(function* () {
    const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
    yield* seedDatabase;
    const attempt = yield* service.execute(projectId, { taskId, expectedTaskRevision: 1 });
    const cancelled = yield* service.cancelAttempt(projectId, attempt.attemptId, attempt.revision);
    assert.equal(cancelled.status, "reconcile_required");
    assert.equal(state.stopCalls.length, 0);
  }).pipe(Effect.provide(makeLayer(state)));
});

it.effect("rejects a stale cancellation revision", () => {
  const state = makeState({
    threadExists: true,
    runs: [{ id: "run-1", status: "running" }],
  });
  return Effect.gen(function* () {
    const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
    yield* seedDatabase;
    const attempt = yield* service.execute(projectId, { taskId, expectedTaskRevision: 1 });
    const failure = yield* service
      .cancelAttempt(projectId, attempt.attemptId, attempt.revision - 1)
      .pipe(Effect.flip);
    assert.equal(failure._tag, "RuntimeExecutionAttemptConflictError");
    assert.equal(state.stopCalls.length, 0);
  }).pipe(Effect.provide(makeLayer(state)));
});

it.effect("ignores a handoff from another thread", () => {
  const state = makeState({
    threadExists: true,
    runs: [{ id: "run-1", status: "completed" }],
  });
  return Effect.gen(function* () {
    const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
    const sql = yield* SqlClient.SqlClient;
    yield* seedDatabase;
    const attempt = yield* service.execute(projectId, { taskId, expectedTaskRevision: 1 });
    yield* sql`INSERT INTO project_runtime_handoffs
      (handoff_id, project_id, task_id, created_at, payload_json)
      VALUES ('wrong-thread', ${projectId}, ${taskId}, ${timestamp},
        ${JSON.stringify({ threadId: "someone-else" })})`;
    const reconciled = yield* service.reconcileAttempt(projectId, attempt.attemptId);
    assert.isNull(reconciled.handoffId ?? null);
  }).pipe(Effect.provide(makeLayer(state)));
});
