import * as NodeServices from "@effect/platform-node/NodeServices";
import {
  DEFAULT_SERVER_SETTINGS,
  ProjectId,
  ProjectRuntimeRoutingConflictError,
  ProviderDriverKind,
  ProviderInstanceId,
  ProjectRuntimeTaskId,
  type RuntimeRoutingPolicy,
  type ServerProvider,
  type ServerProviderModel,
  type ServerSettings,
} from "@t3tools/contracts";
import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";
import * as Layer from "effect/Layer";
import * as SqlClient from "effect/sql/SqlClient";

import * as SqlitePersistence from "../persistence/Sqlite.ts";
import { RuntimeRoutingProviderView } from "./RuntimeRoutingProviderView.ts";
import * as RuntimeRoutingService from "./RuntimeRoutingService.ts";

const projectA = ProjectId.make("routing-a");
const projectB = ProjectId.make("routing-b");
const codex = ProviderInstanceId.make("codex");
const timestamp = "2026-10-27T00:00:00.000Z";

const model = (slug: string): ServerProviderModel => ({
  slug,
  name: slug,
  isCustom: false,
  capabilities: null,
});

const provider = (overrides: Partial<ServerProvider> = {}): ServerProvider => ({
  instanceId: codex,
  driver: ProviderDriverKind.make("codex"),
  enabled: true,
  installed: true,
  version: "1.0.0",
  status: "ready",
  auth: { status: "authenticated" },
  checkedAt: timestamp,
  models: [model("gpt-6")],
  slashCommands: [],
  skills: [],
  ...overrides,
});

const candidate = {
  providerInstanceId: codex,
  model: "gpt-6",
};

const routing = (fallback: "continue" | "inherit" | "fail" = "inherit"): RuntimeRoutingPolicy => ({
  roleRoutes: [{ role: "implementation", candidates: [candidate], fallback }],
});

const seedProjects = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  for (const [projectId, title] of [
    [projectA, "Alpha"],
    [projectB, "Beta"],
  ] as const) {
    yield* sql`INSERT INTO projection_projects (project_id, title, workspace_root, scripts_json, created_at, updated_at)
      VALUES (${projectId}, ${title}, ${`/work/${projectId}`}, '[]', ${timestamp}, ${timestamp})`;
  }
});

interface ViewState {
  readonly providers: ReadonlyArray<ServerProvider>;
  readonly settings: ServerSettings;
  readonly orchestrationCapableInstanceIds: ReadonlySet<ProviderInstanceId>;
}

const layerFor = (state: ViewState) =>
  RuntimeRoutingService.layer.pipe(
    Layer.provide(
      Layer.succeed(RuntimeRoutingProviderView, {
        read: Effect.succeed(state),
      }),
    ),
    Layer.provideMerge(SqlitePersistence.layerMemory),
    Layer.provide(NodeServices.layer),
  );

const defaultState: ViewState = {
  providers: [provider()],
  settings: DEFAULT_SERVER_SETTINGS,
  orchestrationCapableInstanceIds: new Set([codex]),
};

it.effect("saves, resets, and compare-and-sets project routing", () =>
  Effect.gen(function* () {
    yield* seedProjects;
    const service = yield* RuntimeRoutingService.RuntimeRoutingService;

    assert.isNull(yield* service.readProjectRouting(projectA));
    const saved = yield* service.saveProjectRouting(projectA, {
      routing: routing(),
      expectedRevision: 0,
    });
    assert.equal(saved.revision, 1);
    assert.deepEqual(yield* service.readProjectRouting(projectA), saved);

    const stale = yield* service
      .saveProjectRouting(projectA, { routing: routing("fail"), expectedRevision: 0 })
      .pipe(Effect.flip);
    assert.instanceOf(stale, ProjectRuntimeRoutingConflictError);
    if (stale._tag === "ProjectRuntimeRoutingConflictError") {
      assert.equal(stale.currentRevision, 1);
    }
    assert.deepEqual(yield* service.readProjectRouting(projectA), saved);

    const reset = yield* service.saveProjectRouting(projectA, {
      routing: null,
      expectedRevision: 1,
    });
    assert.equal(reset.revision, 2);
    assert.isNull(reset.routing);
    assert.deepEqual(yield* service.readProjectRouting(projectA), reset);

    // The reset row stays, so a writer holding revision 1 cannot recreate the override.
    const staleAfterReset = yield* service
      .saveProjectRouting(projectA, { routing: routing(), expectedRevision: 1 })
      .pipe(Effect.flip);
    assert.instanceOf(staleAfterReset, ProjectRuntimeRoutingConflictError);
    assert.isNull((yield* service.readProjectRouting(projectA))?.routing);
  }).pipe(Effect.provide(layerFor(defaultState))),
);

it.effect("types the loser of two simultaneous initial writers as a conflict", () =>
  Effect.gen(function* () {
    yield* seedProjects;
    const service = yield* RuntimeRoutingService.RuntimeRoutingService;
    const attempts = yield* Effect.forEach(
      [
        service.saveProjectRouting(projectA, { routing: routing(), expectedRevision: 0 }),
        service.saveProjectRouting(projectA, { routing: routing("fail"), expectedRevision: 0 }),
      ],
      (effect) => Effect.result(effect),
      { concurrency: 2 },
    );
    assert.equal(attempts.filter(Result.isSuccess).length, 1);
    const failure = attempts.find(Result.isFailure);
    assert.isDefined(failure);
    assert.instanceOf(failure!.failure, ProjectRuntimeRoutingConflictError);
    assert.equal((yield* service.readProjectRouting(projectA))?.revision, 1);
  }).pipe(Effect.provide(layerFor(defaultState))),
);

it.effect("isolates project routing rows and lets only one stale writer win", () =>
  Effect.gen(function* () {
    yield* seedProjects;
    const service = yield* RuntimeRoutingService.RuntimeRoutingService;
    yield* service.saveProjectRouting(projectA, {
      routing: routing(),
      expectedRevision: 0,
    });
    yield* service.saveProjectRouting(projectB, {
      routing: routing("fail"),
      expectedRevision: 0,
    });

    const attempts = yield* Effect.forEach(
      [
        service.saveProjectRouting(projectA, { routing: routing("fail"), expectedRevision: 1 }),
        service.saveProjectRouting(projectA, { routing: routing("continue"), expectedRevision: 1 }),
      ],
      (effect) => Effect.result(effect),
      { concurrency: 2 },
    );
    const successes = attempts.filter(Result.isSuccess);
    assert.equal(successes.length, 1);
    const current = yield* service.readProjectRouting(projectA);
    assert.equal(current?.revision, 2);
    assert.equal((yield* service.readProjectRouting(projectB))?.revision, 1);
  }).pipe(Effect.provide(layerFor(defaultState))),
);

it.effect("resolves profile routing read from durable state", () =>
  Effect.gen(function* () {
    yield* seedProjects;
    const sql = yield* SqlClient.SqlClient;
    const profileId = "routing-profile";
    yield* sql`INSERT INTO development_profiles
      (profile_id, name, instructions, routing_json, revision, created_at, updated_at, created_by, updated_by)
      VALUES (${profileId}, 'Policy', 'Instructions', ${JSON.stringify(routing())}, 1, ${timestamp}, ${timestamp}, 'user:test', 'user:test')`;
    yield* sql`INSERT INTO project_development_profiles
      (project_id, profile_id, revision, created_at, updated_at)
      VALUES (${projectA}, ${profileId}, 3, ${timestamp}, ${timestamp})`;

    const resolution = yield* (yield* RuntimeRoutingService.RuntimeRoutingService).resolveRoute({
      projectId: projectA,
    });
    assert.equal(resolution.status, "resolved");
    assert.equal(resolution.source, "profile");
    assert.equal(resolution.selected?.providerInstanceId, codex);
    assert.equal(resolution.revisions.profile?.revision, 1);
    assert.equal(resolution.revisions.assignment?.revision, 3);
  }).pipe(Effect.provide(layerFor(defaultState))),
);

it.effect("resolves task routing without changing saved project policy", () =>
  Effect.gen(function* () {
    yield* seedProjects;
    const sql = yield* SqlClient.SqlClient;
    const service = yield* RuntimeRoutingService.RuntimeRoutingService;
    yield* sql`INSERT INTO project_runtime (project_id, enabled, revision, created_at, updated_at)
      VALUES (${projectA}, 0, 1, ${timestamp}, ${timestamp})`;
    yield* sql`INSERT INTO project_runtime_tasks
      (task_id, project_id, status, revision, created_at, payload_json)
      VALUES ('task-1', ${projectA}, 'ready', 3, ${timestamp}, ${JSON.stringify({
        taskId: "task-1",
        projectId: projectA,
        title: "Route the task",
        scope: "Routing",
        owner: "user:test",
        acceptanceCriteria: [],
        status: "ready",
        blocker: null,
        verification: { milestone: "none", evidence: [] },
        latestHandoffId: null,
        routing: routing("fail").roleRoutes[0],
        revision: 3,
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: "user:test",
        updatedBy: "user:test",
      })})`;
    yield* service.saveProjectRouting(projectA, {
      routing: routing("inherit"),
      expectedRevision: 0,
    });

    const resolution = yield* service.resolveRoute({
      projectId: projectA,
      taskId: ProjectRuntimeTaskId.make("task-1"),
    });
    assert.equal(resolution.status, "resolved");
    assert.equal(resolution.source, "task");
    assert.equal(resolution.revisions.task, 3);
    assert.equal((yield* service.readProjectRouting(projectA))?.revision, 1);
  }).pipe(Effect.provide(layerFor(defaultState))),
);

it.effect("keeps a saved route when its provider is temporarily unavailable", () =>
  Effect.gen(function* () {
    yield* seedProjects;
    const service = yield* RuntimeRoutingService.RuntimeRoutingService;
    const saved = yield* service.saveProjectRouting(projectA, {
      routing: routing("fail"),
      expectedRevision: 0,
    });

    const resolution = yield* service.resolveRoute({ projectId: projectA });
    assert.equal(resolution.status, "failed");
    assert.equal(resolution.rejected[0]?.reason, "provider_unavailable");
    assert.deepEqual(yield* service.readProjectRouting(projectA), saved);
  }).pipe(
    Effect.provide(
      layerFor({
        ...defaultState,
        providers: [
          provider({ availability: "unavailable", unavailableReason: "Provider is offline." }),
        ],
      }),
    ),
  ),
);

it.effect("reports a project-disabled provider without changing policy", () =>
  Effect.gen(function* () {
    yield* seedProjects;
    const service = yield* RuntimeRoutingService.RuntimeRoutingService;
    const saved = yield* service.saveProjectRouting(projectA, {
      routing: routing("fail"),
      expectedRevision: 0,
    });
    const resolution = yield* service.resolveRoute({ projectId: projectA });
    assert.equal(resolution.status, "failed");
    assert.equal(resolution.rejected[0]?.reason, "provider_instance_disabled_for_project");
    assert.deepEqual(yield* service.readProjectRouting(projectA), saved);
  }).pipe(
    Effect.provide(
      layerFor({
        ...defaultState,
        settings: {
          ...DEFAULT_SERVER_SETTINGS,
          projectSettingsOverrides: {
            [projectA]: { providerInstances: { [codex]: { enabled: false } } },
          },
        },
      }),
    ),
  ),
);

it.effect("reports a missing configured model without deleting the route", () =>
  Effect.gen(function* () {
    yield* seedProjects;
    const service = yield* RuntimeRoutingService.RuntimeRoutingService;
    const saved = yield* service.saveProjectRouting(projectA, {
      routing: {
        roleRoutes: [
          {
            role: "implementation",
            candidates: [{ providerInstanceId: codex, model: "removed-model" }],
            fallback: "fail",
          },
        ],
      },
      expectedRevision: 0,
    });
    const resolution = yield* service.resolveRoute({ projectId: projectA });
    assert.equal(resolution.status, "failed");
    assert.equal(resolution.rejected[0]?.reason, "model_unavailable");
    assert.deepEqual(yield* service.readProjectRouting(projectA), saved);
  }).pipe(Effect.provide(layerFor(defaultState))),
);
