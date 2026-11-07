import * as DevelopmentProfileService from "../developmentProfiles/DevelopmentProfileService.ts";
import * as NodeCrypto from "@effect/platform-node/NodeCrypto";
import * as NodeServices from "@effect/platform-node/NodeServices";
import * as NodeAssert from "node:assert/strict";
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
 * File-backed restart/replay qualification for the synthetic continuation
 * spike. Every phase below builds a fresh layer graph over the same SQLite
 * file, so a "restart" means the services and their connections are gone and
 * only durable rows remain. Providers are stubs; no model is ever invoked.
 */

export const projectId = ProjectId.make("continuation-restart-project");
export const codex = ProviderInstanceId.make("codex");
export const claude = ProviderInstanceId.make("claudeAgent");
export const timestamp = "2026-11-03T00:00:00.000Z";

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

export const resolution = (
  taskId: string,
  instanceId: ProviderInstanceId,
  driver: string,
  model: string,
  routeProjectId = projectId,
): RuntimeRouteResolution => ({
  projectId: routeProjectId,
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

const makeProviderStub = (instanceId: ProviderInstanceId) => {
  const starts: Array<ThreadLaunchInput> = [];
  return {
    starts,
    launch: (input: ThreadLaunchInput) => {
      NodeAssert.equal(input.modelSelection.instanceId, instanceId);
      starts.push(input);
      return `${instanceId}-run-${starts.length}`;
    },
  };
};

export interface State {
  readonly launches: Array<ThreadLaunchInput>;
  /** Attempt rows visible in SQLite at the instant the launch stub is called. */
  readonly receiptsAtLaunch: Array<
    ReadonlyArray<{ readonly attemptId: string; readonly status: string }>
  >;
  readonly runs: Map<string, ReadonlyArray<{ readonly id: string; readonly status: string }>>;
  readonly routes: Map<string, RuntimeRouteResolution>;
  readonly providerStubs: Map<ProviderInstanceId, ReturnType<typeof makeProviderStub>>;
  launchError: Error | null;
  beforeLaunch: Effect.Effect<void, never, Services>;
}

export const makeState = (): State => ({
  launches: [],
  receiptsAtLaunch: [],
  runs: new Map(),
  routes: new Map(),
  providerStubs: new Map([
    [codex, makeProviderStub(codex)],
    [claude, makeProviderStub(claude)],
  ]),
  launchError: null,
  beforeLaunch: Effect.void,
});

export const makeLayer = (
  state: State,
  dbPath: string,
  gateEnabled = true,
  database = SqlitePersistence.layerFromPath(dbPath),
) =>
  RuntimeTaskExecutionService.layer.pipe(
    Layer.provideMerge(
      ProjectRuntimeService.layer.pipe(
        Layer.provideMerge(DevelopmentProfileService.layer),
        Layer.provideMerge(database),
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
        getById: (id) => Effect.succeedSome({ ...project, id }),
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
            yield* state.beforeLaunch;
            state.launches.push(input);
            if (state.launchError !== null) {
              return yield* Effect.fail(state.launchError);
            }
            const stub = state.providerStubs.get(input.modelSelection.instanceId);
            NodeAssert.ok(stub, "No adapter-independent stub registered for this provider");
            const runId = stub.launch(input);
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

type Services =
  | RuntimeTaskExecutionService.RuntimeTaskExecutionService
  | ProjectRuntimeService.ProjectRuntimeService
  | SqlClient.SqlClient;

export const runPhase = <A, E>(
  state: State,
  dbPath: string,
  program: Effect.Effect<A, E, Services>,
) => program.pipe(Effect.provide(makeLayer(state, dbPath)));

export const completeRun = (state: State, threadId: string) => {
  const runs = state.runs.get(threadId) ?? [];
  state.runs.set(
    threadId,
    runs.map((run) => ({ ...run, status: "completed" })),
  );
};

export const seedAndCreateTasks = Effect.fn("ContinuationTest.seedAndCreateTasks")(function* (
  state: State,
) {
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

export const appendHandoff = Effect.fn("ContinuationTest.appendHandoff")(function* (
  attempt: RuntimeExecutionAttempt,
  verification: {
    readonly milestone: "none" | "review-pass";
    readonly result: "pass" | "fail" | "none";
  },
) {
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
export const attemptByKey = Effect.fn("ContinuationTest.attemptByKey")(function* (
  taskId: string,
  requestKey: string,
) {
  const sql = yield* SqlClient.SqlClient;
  const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
  const rows = yield* sql<{ readonly attempt_id: string }>`SELECT attempt_id
      FROM project_runtime_execution_attempts
      WHERE project_id = ${projectId} AND task_id = ${taskId} AND request_key = ${requestKey}`;
  NodeAssert.equal(rows.length, 1);
  return yield* service.readAttempt(projectId, rows[0]!.attempt_id as never);
});

/** The request key is a durable column, not part of the decoded attempt record. */
export const requestKeyOf = Effect.fn("ContinuationTest.requestKeyOf")(function* (
  attemptId: string,
) {
  const sql = yield* SqlClient.SqlClient;
  const rows = yield* sql<{ readonly request_key: string | null }>`SELECT request_key
      FROM project_runtime_execution_attempts WHERE attempt_id = ${attemptId}`;
  return rows[0]?.request_key ?? null;
});
