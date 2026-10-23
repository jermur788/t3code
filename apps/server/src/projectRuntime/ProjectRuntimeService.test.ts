import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import {
  PROJECT_RUNTIME_BOUNDS,
  ProjectId,
  ProjectRuntimeConflictError,
  ProjectRuntimeDisabledError,
  ProjectRuntimeNotFoundError,
  ProviderInstanceId,
  ThreadId,
} from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import * as SqlClient from "effect/sql/SqlClient";

import * as SqlitePersistence from "../persistence/Sqlite.ts";
import * as ProjectRuntimeService from "./ProjectRuntimeService.ts";

const projectA = ProjectId.make("runtime-a");
const projectB = ProjectId.make("runtime-b");
const actor = { actor: "user:maintainer" };
const otherActor = { actor: "user:editor" };
const sourceInput = {
  title: "Spec",
  role: "authority" as const,
  relativePath: "docs/missing-spec.md",
  authorityRank: 0,
};
const taskInput = {
  title: "Implement",
  scope: "Service core",
  acceptanceCriteria: "Tests pass",
  branch: "descriptive-branch",
  worktreePath: "/uncreated/worktree",
  baseSha: "descriptive-sha",
};
const seedProjects = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  for (const projectId of [projectA, projectB]) {
    yield* sql`INSERT INTO projection_projects (project_id, title, workspace_root, scripts_json, created_at, updated_at)
      VALUES (${projectId}, ${projectId}, ${`/work/${projectId}`}, '[]', '2026-10-23T00:00:00.000Z', '2026-10-23T00:00:00.000Z')`;
  }
});
const setup = Effect.gen(function* () {
  yield* seedProjects;
  const service = yield* ProjectRuntimeService.ProjectRuntimeService;
  yield* service.setEnabled(projectA, { enabled: true });
  yield* service.setEnabled(projectB, { enabled: true });
  return service;
});
const layerTest = ProjectRuntimeService.layer.pipe(
  Layer.provideMerge(SqlitePersistence.layerMemory),
  Layer.provide(NodeServices.layer),
);

it.effect("starts disabled at revision zero and rejects unknown or deleted projects", () =>
  Effect.gen(function* () {
    yield* seedProjects;
    const service = yield* ProjectRuntimeService.ProjectRuntimeService;
    assert.deepEqual(yield* service.getStatus(projectA), {
      enabled: false,
      revision: 0,
      version: 1,
    });
    assert.instanceOf(
      yield* service.createTask(projectA, taskInput, actor).pipe(Effect.flip),
      ProjectRuntimeDisabledError,
    );
    assert.equal(
      (yield* service.setEnabled(ProjectId.make("unknown"), { enabled: true }).pipe(Effect.flip))
        ._tag,
      "ProjectNotFoundError",
    );
    const sql = yield* SqlClient.SqlClient;
    yield* sql`UPDATE projection_projects SET deleted_at = '2026-10-23T01:00:00.000Z' WHERE project_id = ${projectB}`;
    assert.equal(
      (yield* service.setEnabled(projectB, { enabled: true }).pipe(Effect.flip))._tag,
      "ProjectNotFoundError",
    );
  }).pipe(Effect.provide(layerTest)),
);

it.effect("preserves all domain records and revisions across disable/re-enable", () =>
  Effect.gen(function* () {
    const service = yield* setup;
    const sql = yield* SqlClient.SqlClient;
    const instructions = yield* service.saveInstructions(
      projectA,
      { instructions: "Project rules" },
      actor,
    );
    const source = yield* service.createSource(projectA, sourceInput, actor);
    const task = yield* service.createTask(projectA, taskInput, actor);
    const checkpoint = yield* service.getStatus(projectA);
    const handoff = yield* service.appendHandoff(
      projectA,
      {
        taskId: task.taskId,
        checkpoint: "PRT-020",
        summary: "Persisted",
        evidenceRefs: ["test:runtime"],
      },
      {
        ...actor,
        threadId: ThreadId.make("thread-provenance"),
        providerInstanceId: ProviderInstanceId.make("codex"),
        model: "gpt-6.1-sol",
      },
    );
    assert.equal(handoff.runtimeRevision, checkpoint.revision);
    assert.equal(handoff.taskRevision, 1);
    const disabled = yield* service.setEnabled(projectA, { enabled: false });
    assert.isFalse(disabled.enabled);
    assert.instanceOf(
      yield* service.readInstructions(projectA).pipe(Effect.flip),
      ProjectRuntimeDisabledError,
    );
    assert.instanceOf(
      yield* service.readSource(projectA, source.sourceId).pipe(Effect.flip),
      ProjectRuntimeDisabledError,
    );
    assert.instanceOf(
      yield* service.readTask(projectA, task.taskId).pipe(Effect.flip),
      ProjectRuntimeDisabledError,
    );
    assert.instanceOf(
      yield* service.readHandoff(projectA, handoff.handoffId).pipe(Effect.flip),
      ProjectRuntimeDisabledError,
    );
    const stored = yield* sql<{
      readonly instructions_json: string;
    }>`SELECT instructions_json FROM project_runtime WHERE project_id = ${projectA}`;
    assert.deepEqual(JSON.parse(stored[0]!.instructions_json), instructions);
    for (const table of ["sources", "tasks", "handoffs"]) {
      assert.lengthOf(
        yield* sql`SELECT 1 FROM ${sql(`project_runtime_${table}`)} WHERE project_id = ${projectA}`,
        1,
      );
    }
    const enabled = yield* service.setEnabled(projectA, { enabled: true });
    assert.equal(enabled.revision, disabled.revision + 1);
    assert.deepEqual(yield* service.readInstructions(projectA), instructions);
    assert.deepEqual(yield* service.readSource(projectA, source.sourceId), source);
    assert.deepEqual(yield* service.readTask(projectA, task.taskId), task);
    assert.deepEqual(yield* service.readHandoff(projectA, handoff.handoffId), handoff);
  }).pipe(Effect.provide(layerTest)),
);

it.effect("instructions increment monotonically and optionally compare-and-set", () =>
  Effect.gen(function* () {
    const service = yield* setup;
    assert.isNull(yield* service.readInstructions(projectA));
    assert.instanceOf(
      yield* service
        .saveInstructions(projectA, { instructions: "stale create", expectedRevision: 1 }, actor)
        .pipe(Effect.flip),
      ProjectRuntimeNotFoundError,
    );
    const first = yield* service.saveInstructions(projectA, { instructions: "first" }, actor);
    assert.equal(first.revision, 1);
    const second = yield* service.saveInstructions(
      projectA,
      { instructions: "second", expectedRevision: 1 },
      otherActor,
    );
    assert.equal(second.revision, 2);
    assert.equal(second.updatedBy, otherActor.actor);
    const conflict = yield* service
      .saveInstructions(projectA, { instructions: "stale", expectedRevision: 1 }, actor)
      .pipe(Effect.flip);
    assert.instanceOf(conflict, ProjectRuntimeConflictError);
    assert.deepEqual(yield* service.readInstructions(projectA), second);
    const third = yield* service.saveInstructions(
      projectA,
      { instructions: "unconditional" },
      actor,
    );
    assert.equal(third.revision, 3);
    const attempts = yield* Effect.all(
      [
        service
          .saveInstructions(projectA, { instructions: "one", expectedRevision: 3 }, actor)
          .pipe(Effect.result),
        service
          .saveInstructions(projectA, { instructions: "two", expectedRevision: 3 }, actor)
          .pipe(Effect.result),
      ],
      { concurrency: "unbounded" },
    );
    assert.lengthOf(attempts.filter(Result.isSuccess), 1);
    assert.lengthOf(attempts.filter(Result.isFailure), 1);
    assert.equal((yield* service.readInstructions(projectA))?.revision, 4);
  }).pipe(Effect.provide(layerTest)),
);

it.effect(
  "source CRUD stores metadata only, preserves missing locators, and enforces revisions",
  () =>
    Effect.gen(function* () {
      const service = yield* setup;
      const sql = yield* SqlClient.SqlClient;
      const metadataInput = {
        ...sourceInput,
        description: "Metadata",
        contents: "SOURCE BODY MUST NOT PERSIST",
      };
      const source = yield* service.createSource(projectA, metadataInput, actor);
      const other = yield* service.createSource(projectA, sourceInput, actor);
      assert.notEqual(source.sourceId, other.sourceId);
      assert.equal(source.revision, 1);
      const updated = yield* service.updateSource(
        projectA,
        {
          sourceId: source.sourceId,
          expectedRevision: 1,
          enabled: false,
          authorityRank: null,
          description: null,
        },
        otherActor,
      );
      assert.equal(updated.revision, 2);
      assert.isFalse(updated.enabled);
      assert.notProperty(updated, "authorityRank");
      assert.notProperty(updated, "description");
      assert.equal(updated.createdBy, actor.actor);
      assert.equal(updated.updatedBy, otherActor.actor);
      assert.instanceOf(
        yield* service
          .updateSource(
            projectA,
            { sourceId: source.sourceId, expectedRevision: 1, title: "stale" },
            actor,
          )
          .pipe(Effect.flip),
        ProjectRuntimeConflictError,
      );
      assert.instanceOf(
        yield* service
          .removeSource(projectA, { sourceId: source.sourceId, expectedRevision: 1 })
          .pipe(Effect.flip),
        ProjectRuntimeConflictError,
      );
      const enabled = yield* service.updateSource(
        projectA,
        { sourceId: source.sourceId, enabled: true },
        actor,
      );
      assert.equal(enabled.revision, 3);
      assert.lengthOf((yield* service.listSources(projectA, {})).sources, 2);
      const raw = yield* sql<{
        readonly payload_json: string;
      }>`SELECT payload_json FROM project_runtime_sources WHERE source_id = ${source.sourceId}`;
      assert.deepEqual(
        Object.keys(JSON.parse(raw[0]!.payload_json)).sort(),
        Object.keys(enabled).sort(),
      );
      assert.notProperty(JSON.parse(raw[0]!.payload_json), "contents");
      yield* service.removeSource(projectA, { sourceId: source.sourceId, expectedRevision: 3 });
      assert.instanceOf(
        yield* service.readSource(projectA, source.sourceId).pipe(Effect.flip),
        ProjectRuntimeNotFoundError,
      );
      assert.deepEqual(yield* service.readSource(projectA, other.sourceId), other);
    }).pipe(Effect.provide(layerTest)),
);

it.effect(
  "task writes increment exactly once, reject stale revisions, and never fabricate done evidence",
  () =>
    Effect.gen(function* () {
      const service = yield* setup;
      const task = yield* service.createTask(projectA, taskInput, actor);
      assert.equal(task.revision, 1);
      assert.equal(task.status, "planned");
      const updated = yield* service.updateTask(
        projectA,
        {
          taskId: task.taskId,
          expectedRevision: 1,
          status: "done",
          branch: null,
          worktreePath: null,
          baseSha: null,
        },
        otherActor,
      );
      assert.equal(updated.revision, 2);
      assert.equal(updated.status, "done");
      assert.notProperty(updated, "branch");
      assert.notProperty(updated, "worktreePath");
      assert.notProperty(updated, "baseSha");
      assert.equal(updated.createdBy, actor.actor);
      assert.equal(updated.updatedBy, otherActor.actor);
      assert.deepEqual((yield* service.listHandoffs(projectA, {})).handoffs, []);
      const before = yield* service.getStatus(projectA);
      const conflict = yield* service
        .updateTask(projectA, { taskId: task.taskId, expectedRevision: 1, title: "stale" }, actor)
        .pipe(Effect.flip);
      assert.instanceOf(conflict, ProjectRuntimeConflictError);
      if (conflict._tag === "ProjectRuntimeConflictError")
        assert.deepInclude(conflict, {
          expectedRevision: 1,
          currentRevision: 2,
          entityId: task.taskId,
          projectId: projectA,
        });
      assert.deepEqual(yield* service.getStatus(projectA), before);
      assert.deepEqual(yield* service.readTask(projectA, task.taskId), updated);
    }).pipe(Effect.provide(layerTest)),
);

it.effect("exactly one simultaneous task writer succeeds for the same expected revision", () =>
  Effect.gen(function* () {
    const service = yield* setup;
    const task = yield* service.createTask(projectA, taskInput, actor);
    const before = yield* service.getStatus(projectA);
    const attempts = yield* Effect.all(
      [
        service
          .updateTask(projectA, { taskId: task.taskId, expectedRevision: 1, title: "one" }, actor)
          .pipe(Effect.result),
        service
          .updateTask(
            projectA,
            { taskId: task.taskId, expectedRevision: 1, title: "two" },
            otherActor,
          )
          .pipe(Effect.result),
      ],
      { concurrency: "unbounded" },
    );
    const successes = attempts.filter(Result.isSuccess);
    const failures = attempts.filter(Result.isFailure);
    assert.lengthOf(successes, 1);
    assert.lengthOf(failures, 1);
    assert.instanceOf(failures[0]!.failure, ProjectRuntimeConflictError);
    assert.deepEqual(yield* service.readTask(projectA, task.taskId), successes[0]!.success);
    assert.equal(successes[0]!.success.revision, 2);
    assert.equal((yield* service.getStatus(projectA)).revision, before.revision + 1);
  }).pipe(Effect.provide(layerTest)),
);

it.effect(
  "handoffs are append-only with deterministic ordering and immutable revision checkpoints",
  () =>
    Effect.gen(function* () {
      const service = yield* setup;
      const task = yield* service.createTask(projectA, taskInput, actor);
      const first = yield* service.appendHandoff(
        projectA,
        {
          taskId: task.taskId,
          checkpoint: "one",
          summary: "First",
          evidenceRefs: ["test:one", "file:report"],
        },
        actor,
      );
      const updated = yield* service.updateTask(
        projectA,
        { taskId: task.taskId, expectedRevision: 1, title: "Updated" },
        actor,
      );
      const runtime = yield* service.getStatus(projectA);
      const second = yield* service.appendHandoff(
        projectA,
        { taskId: task.taskId, checkpoint: "two", summary: "Second" },
        actor,
      );
      assert.equal(second.taskRevision, updated.revision);
      assert.equal(second.runtimeRevision, runtime.revision);
      assert.deepEqual(yield* service.readHandoff(projectA, first.handoffId), first);
      const expected = [first, second].sort(
        (a, b) => a.createdAt.localeCompare(b.createdAt) || a.handoffId.localeCompare(b.handoffId),
      );
      assert.deepEqual(
        (yield* service.listHandoffs(projectA, { taskId: task.taskId })).handoffs,
        expected,
      );
      const page = yield* service.listHandoffs(projectA, { limit: 1 });
      assert.deepEqual(page.handoffs, expected.slice(0, 1));
      assert.equal(page.nextCursor, 1);
      assert.deepEqual(
        (yield* service.listHandoffs(projectA, { cursor: page.nextCursor!, limit: 1 })).handoffs,
        expected.slice(1),
      );
      assert.notProperty(service, "updateHandoff");
      assert.notProperty(service, "removeHandoff");
      assert.notProperty(service, "deleteHandoff");
    }).pipe(Effect.provide(layerTest)),
);

it.effect("two projects cannot read, list, update, remove, or link each other's records", () =>
  Effect.gen(function* () {
    const service = yield* setup;
    const source = yield* service.createSource(projectA, sourceInput, actor);
    const task = yield* service.createTask(projectA, taskInput, actor);
    const handoff = yield* service.appendHandoff(
      projectA,
      { taskId: task.taskId, checkpoint: "isolation", summary: "A only" },
      actor,
    );
    const failures = yield* Effect.all([
      service.readSource(projectB, source.sourceId).pipe(Effect.flip),
      service
        .updateSource(projectB, { sourceId: source.sourceId, title: "cross-project" }, actor)
        .pipe(Effect.flip),
      service.removeSource(projectB, { sourceId: source.sourceId }).pipe(Effect.flip),
      service.readTask(projectB, task.taskId).pipe(Effect.flip),
      service
        .updateTask(
          projectB,
          { taskId: task.taskId, expectedRevision: 1, title: "cross-project" },
          actor,
        )
        .pipe(Effect.flip),
      service.readHandoff(projectB, handoff.handoffId).pipe(Effect.flip),
      service
        .appendHandoff(
          projectB,
          { taskId: task.taskId, checkpoint: "wrong", summary: "Wrong project" },
          actor,
        )
        .pipe(Effect.flip),
      service.listHandoffs(projectB, { taskId: task.taskId }).pipe(Effect.flip),
    ]);
    for (const failure of failures) assert.instanceOf(failure, ProjectRuntimeNotFoundError);
    assert.deepEqual((yield* service.listSources(projectB, {})).sources, []);
    assert.deepEqual((yield* service.listTasks(projectB, {})).tasks, []);
    assert.deepEqual((yield* service.listHandoffs(projectB, {})).handoffs, []);
    assert.deepEqual(yield* service.readSource(projectA, source.sourceId), source);
    assert.deepEqual(yield* service.readTask(projectA, task.taskId), task);
    assert.deepEqual(yield* service.readHandoff(projectA, handoff.handoffId), handoff);
  }).pipe(Effect.provide(layerTest)),
);

it.effect("list limits and cursors bound metadata pages and support task status filters", () =>
  Effect.gen(function* () {
    const service = yield* setup;
    for (const title of ["one", "two", "three"]) {
      yield* service.createSource(projectA, { ...sourceInput, title }, actor);
      yield* service.createTask(
        projectA,
        { ...taskInput, title, status: title === "one" ? "active" : "planned" },
        actor,
      );
    }
    const sources = yield* service.listSources(projectA, {});
    const firstSources = yield* service.listSources(projectA, { limit: 2 });
    assert.deepEqual(firstSources.sources, sources.sources.slice(0, 2));
    assert.equal(firstSources.nextCursor, 2);
    assert.deepEqual(
      (yield* service.listSources(projectA, { limit: 2, cursor: 2 })).sources,
      sources.sources.slice(2),
    );
    const tasks = yield* service.listTasks(projectA, {});
    assert.deepEqual(
      (yield* service.listTasks(projectA, { limit: 2 })).tasks,
      tasks.tasks.slice(0, 2),
    );
    assert.deepEqual(
      (yield* service.listTasks(projectA, { limit: 2, cursor: 2 })).tasks,
      tasks.tasks.slice(2),
    );
    const active = yield* service.listTasks(projectA, { status: "active", limit: 1 });
    assert.equal(active.tasks[0]?.title, "one");
    assert.isNull(active.nextCursor);
  }).pipe(Effect.provide(layerTest)),
);

it.effect("rejects invalid and oversized contract data before changing persistence", () =>
  Effect.gen(function* () {
    const service = yield* setup;
    const task = yield* service.createTask(projectA, taskInput, actor);
    const before = yield* service.getStatus(projectA);
    const invalidInputs: ReadonlyArray<
      Effect.Effect<unknown, Effect.Error<ReturnType<typeof service.getStatus>>>
    > = [
      service.saveInstructions(
        projectA,
        { instructions: "x".repeat(PROJECT_RUNTIME_BOUNDS.instructionsMaxLength + 1) },
        actor,
      ),
      service.createSource(projectA, { ...sourceInput, title: "" }, actor),
      service.createSource(projectA, { ...sourceInput, authorityRank: -1 }, actor),
      service.createTask(
        projectA,
        { ...taskInput, title: "x".repeat(PROJECT_RUNTIME_BOUNDS.taskTitleMaxLength + 1) },
        actor,
      ),
      service.createTask(
        projectA,
        { ...taskInput, scope: "x".repeat(PROJECT_RUNTIME_BOUNDS.taskTextMaxLength + 1) },
        actor,
      ),
      service.updateTask(projectA, { taskId: task.taskId, expectedRevision: 0 }, actor),
      service.createTask(projectA, taskInput, {
        actor: "x".repeat(PROJECT_RUNTIME_BOUNDS.actorMaxLength + 1),
      }),
      service.appendHandoff(
        projectA,
        {
          taskId: task.taskId,
          checkpoint: "bounds",
          summary: "x".repeat(PROJECT_RUNTIME_BOUNDS.handoffSummaryMaxLength + 1),
        },
        actor,
      ),
      service.appendHandoff(
        projectA,
        {
          taskId: task.taskId,
          checkpoint: "bounds",
          summary: "Rejected",
          evidenceRefs: Array.from({ length: 21 }, () => "evidence"),
        },
        actor,
      ),
      service.appendHandoff(
        projectA,
        {
          taskId: task.taskId,
          checkpoint: "bounds",
          summary: "Rejected",
          evidenceRefs: ["x".repeat(1025)],
        },
        actor,
      ),
      service.listSources(projectA, { limit: 101 }),
      service.listTasks(projectA, { cursor: -1 }),
      service.listHandoffs(projectA, { limit: 101 }),
    ];
    for (const operation of invalidInputs) {
      const result = yield* Effect.result(operation);
      assert.isTrue(Result.isFailure(result));
      if (Result.isFailure(result)) assert.isTrue(Schema.isSchemaError(result.failure));
    }
    // Runtime validation must reject missing CAS even when JavaScript bypasses types.
    const missingRevision = service.updateTask(
      projectA,
      // @ts-expect-error -- Verify runtime validation for untyped JavaScript callers.
      { taskId: task.taskId, title: "No CAS" },
      actor,
    );
    assert.isTrue(Schema.isSchemaError(yield* missingRevision.pipe(Effect.flip)));
    assert.deepEqual(yield* service.getStatus(projectA), before);
    assert.deepEqual((yield* service.listHandoffs(projectA, {})).handoffs, []);
    assert.deepEqual((yield* service.listSources(projectA, {})).sources, []);
    // Instructions have a character bound, not a retrieval byte bound.
    const unicode = "界".repeat(PROJECT_RUNTIME_BOUNDS.instructionsMaxLength);
    assert.isAbove(
      new TextEncoder().encode(unicode).byteLength,
      PROJECT_RUNTIME_BOUNDS.contextMaxBytes,
    );
    assert.equal(
      (yield* service.saveInstructions(projectA, { instructions: unicode }, actor)).instructions,
      unicode,
    );
  }).pipe(Effect.provide(layerTest)),
);

it.effect("rejects escaping locator paths without accessing the filesystem", () =>
  Effect.gen(function* () {
    const service = yield* setup;
    for (const relativePath of [
      "/etc/passwd",
      "C:\\private",
      "\\\\host\\share",
      "../outside",
      "docs/../../outside",
      "docs\\..\\..\\outside",
    ]) {
      assert.equal(
        (yield* service
          .createSource(projectA, { ...sourceInput, relativePath }, actor)
          .pipe(Effect.flip))._tag,
        "ProjectRuntimeSourcePathError",
      );
    }
    const source = yield* service.createSource(projectA, sourceInput, actor);
    assert.equal(
      (yield* service
        .updateSource(projectA, { sourceId: source.sourceId, relativePath: "../outside" }, actor)
        .pipe(Effect.flip))._tag,
      "ProjectRuntimeSourcePathError",
    );
    assert.deepEqual(yield* service.readSource(projectA, source.sourceId), source);
  }).pipe(Effect.provide(layerTest)),
);

it.effect("reopens the database with the same Runtime state and domain records", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const dir = yield* fs.makeTempDirectoryScoped();
      const database = SqlitePersistence.layerFromPath(`${dir}/runtime.sqlite`);
      const serviceLayer = ProjectRuntimeService.layer.pipe(Layer.provideMerge(database));
      const records = yield* Effect.scoped(
        Effect.gen(function* () {
          const service = yield* setup;
          const instructions = yield* service.saveInstructions(
            projectA,
            { instructions: "Durable" },
            actor,
          );
          const source = yield* service.createSource(projectA, sourceInput, actor);
          const task = yield* service.createTask(projectA, taskInput, actor);
          const handoff = yield* service.appendHandoff(
            projectA,
            { taskId: task.taskId, checkpoint: "reopen", summary: "Durable" },
            actor,
          );
          return {
            instructions,
            source,
            task,
            handoff,
            status: yield* service.getStatus(projectA),
          };
        }).pipe(Effect.provide(serviceLayer)),
      );
      yield* Effect.scoped(
        Effect.gen(function* () {
          const service = yield* ProjectRuntimeService.ProjectRuntimeService;
          assert.deepEqual(yield* service.getStatus(projectA), records.status);
          assert.deepEqual(yield* service.readInstructions(projectA), records.instructions);
          assert.deepEqual(
            yield* service.readSource(projectA, records.source.sourceId),
            records.source,
          );
          assert.deepEqual(yield* service.readTask(projectA, records.task.taskId), records.task);
          assert.deepEqual(
            yield* service.readHandoff(projectA, records.handoff.handoffId),
            records.handoff,
          );
        }).pipe(Effect.provide(serviceLayer)),
      );
    }),
  ).pipe(Effect.provide(NodeServices.layer)),
);
