import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import {
  DEFAULT_SERVER_SETTINGS,
  ProjectId,
  ProjectRuntimeHandoffId,
  ProjectRuntimeTaskId,
  ProviderDriverKind,
  ProviderInstanceId,
  type Project,
  type ProjectRuntimeHandoff,
  type ProjectRuntimeTask,
  ProjectRuntimeNotFoundError,
  ThreadId,
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
import * as ThreadManagementService from "../orchestration-v2/ThreadManagementService.ts";
import * as ServerSettingsService from "../serverSettings.ts";
import * as ProjectService from "../project/ProjectService.ts";
import * as RuntimeRoutingService from "../runtimeRouting/RuntimeRoutingService.ts";
import { RuntimeRoutingProviderView } from "../runtimeRouting/RuntimeRoutingProviderView.ts";
import type { ThreadLaunchInput } from "../orchestration-v2/ThreadLaunchService.ts";

const projectA = ProjectId.make("qual-project-a");
const projectB = ProjectId.make("qual-project-b");
const taskAId = ProjectRuntimeTaskId.make("qual-task-a");
const taskBId = ProjectRuntimeTaskId.make("qual-task-b");
const codex = ProviderInstanceId.make("codex");
const claude = ProviderInstanceId.make("claudeAgent");
const timestamp = "2026-10-28T00:00:00.000Z";

const task = (
  taskId: ProjectRuntimeTaskId,
  projectId: ProjectId,
  title: string,
): ProjectRuntimeTask => ({
  taskId,
  projectId,
  title,
  scope: `Qualify ${title}.`,
  owner: "user:qualification",
  acceptanceCriteria: [],
  status: "ready",
  blocker: null,
  verification: { milestone: "none", evidence: [] },
  latestHandoffId: null,
  revision: 1,
  createdAt: timestamp,
  updatedAt: timestamp,
  createdBy: "user:qualification",
  updatedBy: "user:qualification",
});

const project = (id: ProjectId, title: string): Project => ({
  id,
  title,
  workspaceRoot: `/tmp/${id}`,
  defaultModelSelection: {
    instanceId: id === projectA ? codex : claude,
    model: id === projectA ? "gpt-6" : "claude-fable-5-1",
  },
  scripts: [],
  createdAt: timestamp,
  updatedAt: timestamp,
  deletedAt: null,
});

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

const resolution = (
  projectId: ProjectId,
  taskId: ProjectRuntimeTaskId,
  instanceId: ProviderInstanceId,
  driver: string,
  model: string,
): RuntimeRouteResolution => ({
  projectId,
  taskId,
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

const handoff = (
  id: string,
  projectId: ProjectId,
  taskId: ProjectRuntimeTaskId,
  threadId: string,
): ProjectRuntimeHandoff => ({
  handoffId: ProjectRuntimeHandoffId.make(id),
  projectId,
  taskId,
  checkpoint: "qualification",
  summary: "Qualification handoff",
  filesChanged: [],
  verification: { milestone: "none", evidence: [] },
  threadId: ThreadId.make(threadId),
  runtimeRevision: 1,
  taskRevision: 1,
  createdAt: timestamp,
  createdBy: "user:qualification" as never,
});

interface State {
  readonly tasks: Map<string, ProjectRuntimeTask>;
  readonly handoffs: Map<string, ProjectRuntimeHandoff>;
  readonly runs: Map<string, ReadonlyArray<{ readonly id: string; readonly status: string }>>;
  readonly launches: Array<ThreadLaunchInput>;
  readonly resolutions: Map<string, RuntimeRouteResolution>;
  providers: ReadonlyArray<ServerProvider>;
}

const makeState = (): State => ({
  tasks: new Map([
    [taskAId, task(taskAId, projectA, "Codex qualification")],
    [taskBId, task(taskBId, projectB, "Claude qualification")],
  ]),
  handoffs: new Map(),
  runs: new Map(),
  launches: [],
  resolutions: new Map([
    [taskAId, resolution(projectA, taskAId, codex, "codex", "gpt-6")],
    [taskBId, resolution(projectB, taskBId, claude, "claudeAgent", "claude-fable-5-1")],
  ]),
  providers: [
    provider(codex, "codex", "gpt-6"),
    provider(claude, "claudeAgent", "claude-fable-5-1"),
  ],
});

const seedDatabase = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  for (const [id, title] of [
    [projectA, "Qualification A"],
    [projectB, "Qualification B"],
  ] as const) {
    yield* sql`INSERT INTO projection_projects (project_id, title, workspace_root, scripts_json, created_at, updated_at)
      VALUES (${id}, ${title}, ${`/tmp/${id}`}, '[]', ${timestamp}, ${timestamp})`;
    yield* sql`INSERT INTO project_runtime (project_id, enabled, revision, created_at, updated_at)
      VALUES (${id}, 1, 1, ${timestamp}, ${timestamp})`;
  }
  for (const [taskId, projectId] of [
    [taskAId, projectA],
    [taskBId, projectB],
  ] as const) {
    yield* sql`INSERT INTO project_runtime_tasks (task_id, project_id, status, revision, created_at, payload_json)
      VALUES (${taskId}, ${projectId}, 'ready', 1, ${timestamp}, '{}')`;
  }
});

const makeLayer = (state: State) =>
  RuntimeTaskExecutionService.layer.pipe(
    Layer.provideMerge(
      Layer.mock(ProjectRuntimeService.ProjectRuntimeService)({
        getStatus: () => Effect.succeed({ enabled: true, version: 1 as const, revision: 1 }),
        readTask: (projectId, taskId) => {
          const found = state.tasks.get(taskId);
          return found !== undefined && found.projectId === projectId
            ? Effect.succeed(found)
            : Effect.fail(
                new ProjectRuntimeNotFoundError({
                  projectId,
                  entity: "task",
                  entityId: taskId,
                }),
              );
        },
        readHandoff: (projectId, handoffId) => {
          const found = state.handoffs.get(handoffId);
          return found !== undefined && found.projectId === projectId
            ? Effect.succeed(found)
            : Effect.fail(
                new ProjectRuntimeNotFoundError({
                  projectId,
                  entity: "handoff",
                }),
              );
        },
      }),
    ),
    Layer.provideMerge(
      Layer.mock(RuntimeRoutingService.RuntimeRoutingService)({
        resolveRoute: (input) =>
          Effect.succeed(
            state.resolutions.get(input.taskId ?? taskAId) ??
              resolution(input.projectId, taskAId, codex, "codex", "gpt-6"),
          ),
      }),
    ),
    Layer.provideMerge(
      Layer.succeed(RuntimeRoutingProviderView, {
        read: Effect.succeed({
          providers: state.providers,
          orchestrationCapableInstanceIds: new Set([codex, claude]),
          settings: DEFAULT_SERVER_SETTINGS,
        }),
      }),
    ),
    Layer.provideMerge(
      Layer.mock(ProjectService.ProjectService)({
        getById: (projectId) => Effect.succeedSome(project(projectId, `Project ${projectId}`)),
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
          Effect.sync(() => {
            state.launches.push(input);
            const runId = `run-${state.launches.length}`;
            state.runs.set(input.threadId!, [{ id: runId, status: "running" }]);
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
    Layer.provideMerge(SqlitePersistence.layerMemory),
    Layer.provide(NodeServices.layer),
  );

it.effect("routes two projects through different providers without crossing attempts", () => {
  const state = makeState();
  return Effect.gen(function* () {
    yield* seedDatabase;
    const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
    const first = yield* service.execute(projectA, {
      taskId: taskAId,
      expectedTaskRevision: 1,
      clientRequestId: "qual-a",
    });
    const second = yield* service.execute(projectB, {
      taskId: taskBId,
      expectedTaskRevision: 1,
      clientRequestId: "qual-b",
    });
    assert.equal(first.receipt.launch.modelSelection.instanceId, codex);
    assert.equal(second.receipt.launch.modelSelection.instanceId, claude);
    assert.equal((yield* service.listAttempts(projectA, {})).attempts.length, 1);
    assert.equal((yield* service.listAttempts(projectB, {})).attempts.length, 1);
    assert.equal(state.launches.length, 2);
    assert.equal(state.launches[0]?.projectId, projectA);
    assert.equal(state.launches[1]?.projectId, projectB);
    assert.equal(state.launches[0]?.modelSelection.instanceId, codex);
    assert.equal(state.launches[1]?.modelSelection.instanceId, claude);
    assert.notEqual(first.threadId, second.threadId);
  }).pipe(Effect.provide(makeLayer(state)));
});

it.effect("reconciles a launched attempt through restart without launching again", () => {
  const state = makeState();
  return Effect.gen(function* () {
    yield* seedDatabase;
    const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
    const attempt = yield* service.execute(projectA, { taskId: taskAId, expectedTaskRevision: 1 });
    yield* service.reconcileActiveAttempts();
    assert.equal((yield* service.readAttempt(projectA, attempt.attemptId)).status, "launched");
    assert.equal(state.launches.length, 1);
    state.runs.set(attempt.threadId, [{ id: "run-1", status: "completed" }]);
    yield* service.reconcileActiveAttempts();
    const current = yield* service.readAttempt(projectA, attempt.attemptId);
    assert.equal(current.status, "completed");
    assert.equal(state.launches.length, 1);
  }).pipe(Effect.provide(makeLayer(state)));
});

it.effect("links a provider handoff and lets a different provider continue the same task", () => {
  const state = makeState();
  return Effect.gen(function* () {
    yield* seedDatabase;
    const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
    const first = yield* service.execute(projectA, {
      taskId: taskAId,
      expectedTaskRevision: 1,
    });
    const linked = handoff("qual-handoff", projectA, taskAId, first.threadId);
    state.handoffs.set(linked.handoffId, linked);
    const sql = yield* SqlClient.SqlClient;
    yield* sql`INSERT INTO project_runtime_handoffs
      (handoff_id, project_id, task_id, created_at, payload_json)
      VALUES (${linked.handoffId}, ${projectA}, ${taskAId}, ${timestamp}, ${JSON.stringify(linked)})`;
    state.runs.set(first.threadId, [{ id: "run-1", status: "completed" }]);
    const reconciled = yield* service.reconcileAttempt(projectA, first.attemptId);
    assert.equal(reconciled.handoffId, "qual-handoff");

    state.tasks.set(taskAId, { ...state.tasks.get(taskAId)!, latestHandoffId: linked.handoffId });
    state.resolutions.set(
      taskAId,
      resolution(projectA, taskAId, claude, "claudeAgent", "claude-fable-5-1"),
    );
    const second = yield* service.execute(projectA, {
      taskId: taskAId,
      expectedTaskRevision: 1,
      clientRequestId: "qual-continuation",
    });
    assert.equal(second.receipt.launch.modelSelection.instanceId, claude);
    assert.equal(second.receipt.packet.handoffId, "qual-handoff");
    const packet = state.launches.at(-1)?.initialMessage?.text ?? "";
    assert.include(packet, "Qualification handoff");
    assert.notInclude(packet, first.threadId);
  }).pipe(Effect.provide(makeLayer(state)));
});

it.effect("keeps an ambiguous attempt active and does not launch again", () => {
  const state = makeState();
  return Effect.gen(function* () {
    yield* seedDatabase;
    const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
    const attempt = yield* service.execute(projectA, { taskId: taskAId, expectedTaskRevision: 1 });
    state.runs.delete(attempt.threadId);
    const ambiguous = yield* service.reconcileAttempt(projectA, attempt.attemptId);
    assert.equal(ambiguous.status, "reconcile_required");
    yield* service.reconcileActiveAttempts();
    assert.equal(state.launches.length, 1);
  }).pipe(Effect.provide(makeLayer(state)));
});

it.effect("rejects unavailable providers and stale task revisions", () => {
  const state = makeState();
  state.providers = state.providers.map((entry) =>
    entry.instanceId === claude ? { ...entry, availability: "unavailable" as const } : entry,
  );
  return Effect.gen(function* () {
    yield* seedDatabase;
    const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
    const unavailable = yield* service
      .execute(projectB, { taskId: taskBId, expectedTaskRevision: 1 })
      .pipe(Effect.flip);
    assert.equal(unavailable._tag, "RuntimeExecutionRejectedError");
    if (unavailable._tag === "RuntimeExecutionRejectedError") {
      assert.equal(unavailable.reason, "provider_disabled");
    }
    assert.isEmpty((yield* service.listAttempts(projectB, {})).attempts);
    const stale = yield* service
      .execute(projectA, { taskId: taskAId, expectedTaskRevision: 99 })
      .pipe(Effect.flip);
    assert.equal(stale._tag, "ProjectRuntimeConflictError");
    assert.equal(state.launches.length, 0);
  }).pipe(Effect.provide(makeLayer(state)));
});
