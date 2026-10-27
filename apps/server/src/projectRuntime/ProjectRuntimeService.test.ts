import * as DevelopmentProfileService from "../developmentProfiles/DevelopmentProfileService.ts";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import {
  PROJECT_RUNTIME_BOUNDS,
  ProjectId,
  ProjectRuntimeConflictError,
  ProjectRuntimeDisabledError,
  ProjectRuntimeInvalidTransitionError,
  ProjectRuntimeNotFoundError,
  type ProjectRuntimeTaskCreateInput,
  ProviderInstanceId,
  ThreadId,
} from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import * as SqlClient from "effect/sql/SqlClient";
import * as TestClock from "effect/testing/TestClock";

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
  acceptanceCriteria: [{ id: "c1", text: "Tests pass" }],
  base: {
    branch: "descriptive-branch",
    worktreePath: "/uncreated/worktree",
    revision: "descriptive-sha",
  },
};
const recordedAt = "2026-10-23T00:00:00.000Z";
const passEvidence = {
  evidenceId: "e1",
  command: "vp test run ProjectRuntimeService.test.ts",
  result: "pass" as const,
  summary: "Focused suite passed",
  recordedAt,
  criterionIds: ["c1"],
};
const failEvidence = {
  evidenceId: "e2",
  result: "fail" as const,
  summary: "Runtime check failed",
  recordedAt,
};
const inconclusiveEvidence = {
  evidenceId: "e3",
  result: "inconclusive" as const,
  summary: "Not reproduced",
  recordedAt,
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
  Layer.provideMerge(DevelopmentProfileService.layer),
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
        expectedTaskRevision: task.revision,
        checkpoint: "PRT-020",
        summary: "Persisted",
        verification: {
          milestone: "none" as const,
          evidence: [
            {
              evidenceId: "e1",
              result: "inconclusive" as const,
              summary: "test:runtime",
              recordedAt: "2026-10-23T00:00:00.000Z",
            },
          ],
        },
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
    const storedTask = yield* service.readTask(projectA, task.taskId);
    assert.equal(storedTask.revision, 2);
    assert.equal(storedTask.latestHandoffId, handoff.handoffId);
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
    assert.deepEqual(yield* service.readTask(projectA, task.taskId), storedTask);
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
          result: "Implemented and reviewed",
          base: null,
        },
        otherActor,
      );
      assert.equal(updated.revision, 2);
      assert.equal(updated.status, "done");
      assert.equal(updated.result, "Implemented and reviewed");
      assert.deepEqual(updated.verification, { milestone: "none", evidence: [] });
      assert.notProperty(updated, "base");
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

it.effect("creates a fully valid v1 task with explicit defaults and structured state", () =>
  Effect.gen(function* () {
    const service = yield* setup;
    const minimal = yield* service.createTask(projectA, taskInput, actor);
    assert.equal(minimal.owner, actor.actor);
    assert.equal(minimal.status, "planned");
    assert.isNull(minimal.blocker);
    assert.deepEqual(minimal.verification, { milestone: "none", evidence: [] });
    assert.isNull(minimal.latestHandoffId);
    assert.equal(minimal.revision, 1);
    assert.equal(minimal.createdAt, minimal.updatedAt);
    assert.equal(minimal.createdBy, actor.actor);
    assert.equal(minimal.updatedBy, actor.actor);
    assert.deepEqual(minimal.base, taskInput.base);
    assert.deepEqual(minimal.acceptanceCriteria, taskInput.acceptanceCriteria);

    const full = yield* service.createTask(
      projectA,
      {
        title: "Full task",
        objective: "Ship the service",
        scope: "Service and RPC",
        outOfScope: "UI redesign",
        owner: "worker",
        base: {
          repository: "github.com/jermur788/t3code",
          branch: "t2/service",
          revision: "abc123",
          worktreePath: "/work/t2",
          upstreamRevision: "def456",
          notes: "Descriptive context only",
        },
        acceptanceCriteria: [
          { id: "c1", text: "Create persists" },
          { id: "c2", text: "Update compares and sets" },
        ],
        verificationPlan: "Run the focused suites",
        status: "blocked",
        blocker: {
          classification: "review-required",
          summary: "Awaiting review",
          detail: "Needs a second pass",
        },
        result: "Implementation complete",
        verification: { milestone: "static-pass", evidence: [passEvidence] },
        nextAction: "Request review",
      },
      actor,
    );
    assert.equal(full.owner, "worker");
    assert.equal(full.status, "blocked");
    assert.equal(full.objective, "Ship the service");
    assert.equal(full.outOfScope, "UI redesign");
    assert.equal(full.verificationPlan, "Run the focused suites");
    assert.deepEqual(full.base, {
      repository: "github.com/jermur788/t3code",
      branch: "t2/service",
      revision: "abc123",
      worktreePath: "/work/t2",
      upstreamRevision: "def456",
      notes: "Descriptive context only",
    });
    assert.deepEqual(full.acceptanceCriteria, [
      { id: "c1", text: "Create persists" },
      { id: "c2", text: "Update compares and sets" },
    ]);
    assert.equal(full.blocker?.classification, "review-required");
    assert.equal(full.blocker?.summary, "Awaiting review");
    assert.equal(full.blocker?.detail, "Needs a second pass");
    assert.equal(full.blocker?.createdAt, full.createdAt);
    assert.equal(full.result, "Implementation complete");
    assert.deepEqual(full.verification, { milestone: "static-pass", evidence: [passEvidence] });
    assert.equal(full.nextAction, "Request review");
    assert.equal(full.createdBy, actor.actor);
    assert.deepEqual(yield* service.readTask(projectA, full.taskId), full);
  }).pipe(Effect.provide(layerTest)),
);

it.effect(
  "task updates preserve untouched fields, persist blocker null, and reset verification",
  () =>
    Effect.gen(function* () {
      const service = yield* setup;
      const sql = yield* SqlClient.SqlClient;
      const task = yield* service.createTask(
        projectA,
        {
          ...taskInput,
          objective: "Objective",
          outOfScope: "Other work",
          verificationPlan: "Run tests",
          verification: { milestone: "static-pass", evidence: [passEvidence] },
        },
        actor,
      );
      const clearedBlocker = yield* service.updateTask(
        projectA,
        { taskId: task.taskId, expectedRevision: 1, blocker: null },
        otherActor,
      );
      assert.equal(clearedBlocker.revision, 2);
      assert.property(clearedBlocker, "blocker");
      assert.isNull(clearedBlocker.blocker);
      assert.equal(clearedBlocker.objective, "Objective");
      assert.equal(clearedBlocker.outOfScope, "Other work");
      assert.equal(clearedBlocker.verificationPlan, "Run tests");
      assert.deepEqual(clearedBlocker.base, taskInput.base);
      assert.deepEqual(clearedBlocker.verification, {
        milestone: "static-pass",
        evidence: [passEvidence],
      });
      assert.equal(clearedBlocker.updatedBy, otherActor.actor);
      const raw = yield* sql<{
        readonly payload_json: string;
      }>`SELECT payload_json FROM project_runtime_tasks WHERE task_id = ${task.taskId}`;
      const payload = JSON.parse(raw[0]!.payload_json) as Record<string, unknown>;
      assert.property(payload, "blocker");
      assert.isNull(payload.blocker);

      const resetVerification = yield* service.updateTask(
        projectA,
        { taskId: task.taskId, expectedRevision: 2, verification: null },
        actor,
      );
      assert.equal(resetVerification.revision, 3);
      assert.deepEqual(resetVerification.verification, { milestone: "none", evidence: [] });
      assert.deepEqual(resetVerification.base, taskInput.base);
      assert.equal(resetVerification.objective, "Objective");

      const clearedOptional = yield* service.updateTask(
        projectA,
        {
          taskId: task.taskId,
          expectedRevision: 3,
          objective: null,
          outOfScope: null,
          verificationPlan: null,
          base: null,
        },
        actor,
      );
      assert.notProperty(clearedOptional, "objective");
      assert.notProperty(clearedOptional, "outOfScope");
      assert.notProperty(clearedOptional, "verificationPlan");
      assert.notProperty(clearedOptional, "base");
      assert.equal(clearedOptional.revision, 4);
      assert.deepEqual(yield* service.readTask(projectA, task.taskId), clearedOptional);

      const blocked = yield* service.createTask(
        projectA,
        {
          ...taskInput,
          status: "blocked",
          blocker: { classification: "verification-failure", summary: "Suite failed" },
        },
        actor,
      );
      const clearedBlocked = yield* service.updateTask(
        projectA,
        {
          taskId: blocked.taskId,
          expectedRevision: blocked.revision,
          status: "active",
          blocker: null,
        },
        actor,
      );
      assert.equal(clearedBlocked.status, "active");
      assert.property(clearedBlocked, "blocker");
      assert.isNull(clearedBlocked.blocker);
      assert.equal(clearedBlocked.revision, 2);
    }).pipe(Effect.provide(layerTest)),
);

it.effect("enforces every task transition invariant with a distinguishable violation", () =>
  Effect.gen(function* () {
    const service = yield* setup;
    const create = (patch: Partial<ProjectRuntimeTaskCreateInput>) =>
      service.createTask(projectA, { ...taskInput, ...patch }, actor);
    const expectViolation = (failure: unknown, expected: string) => {
      assert.instanceOf(failure, ProjectRuntimeInvalidTransitionError);
      if (failure._tag === "ProjectRuntimeInvalidTransitionError") {
        assert.equal(failure.violation, expected);
      }
    };

    expectViolation(
      yield* create({ status: "blocked" }).pipe(Effect.flip),
      "blocked_requires_blocker",
    );
    expectViolation(
      yield* create({
        status: "planned",
        blocker: { classification: "review-required", summary: "Review" },
      }).pipe(Effect.flip),
      "blocker_requires_blocked_status",
    );
    expectViolation(yield* create({ status: "done" }).pipe(Effect.flip), "done_requires_result");
    expectViolation(
      yield* create({
        verification: { milestone: "static-pass", evidence: [inconclusiveEvidence] },
      }).pipe(Effect.flip),
      "milestone_requires_passing_evidence",
    );
    expectViolation(
      yield* create({
        verification: { milestone: "verified", evidence: [passEvidence, failEvidence] },
      }).pipe(Effect.flip),
      "verified_forbids_failing_evidence",
    );
    assert.deepEqual((yield* service.listTasks(projectA, {})).tasks, []);

    const valid = yield* service.createTask(projectA, taskInput, actor);
    expectViolation(
      yield* service
        .updateTask(projectA, { taskId: valid.taskId, expectedRevision: 1, status: "done" }, actor)
        .pipe(Effect.flip),
      "done_requires_result",
    );
    const unchanged = yield* service.readTask(projectA, valid.taskId);
    assert.equal(unchanged.revision, 1);
    assert.equal(unchanged.status, "planned");
  }).pipe(Effect.provide(layerTest)),
);

it.effect("reads migrated blocked tasks with no blocker and repairs them under CAS", () =>
  Effect.gen(function* () {
    const service = yield* setup;
    const sql = yield* SqlClient.SqlClient;
    const task = yield* service.createTask(projectA, taskInput, actor);
    const rows = yield* sql<{
      readonly payload_json: string;
    }>`SELECT payload_json FROM project_runtime_tasks WHERE task_id = ${task.taskId}`;
    const payload = JSON.parse(rows[0]!.payload_json) as Record<string, unknown>;
    payload.status = "blocked";
    payload.blocker = null;
    yield* sql`UPDATE project_runtime_tasks SET status = 'blocked', payload_json = ${JSON.stringify(payload)} WHERE task_id = ${task.taskId}`;

    const legacy = yield* service.readTask(projectA, task.taskId);
    assert.equal(legacy.status, "blocked");
    assert.isNull(legacy.blocker);
    assert.deepEqual(
      (yield* service.listTasks(projectA, { status: "blocked" })).tasks.map(
        (entry) => entry.taskId,
      ),
      [task.taskId],
    );
    const invalidEdit = yield* service
      .updateTask(
        projectA,
        { taskId: task.taskId, expectedRevision: legacy.revision, title: "Unrelated edit" },
        actor,
      )
      .pipe(Effect.flip);
    assert.instanceOf(invalidEdit, ProjectRuntimeInvalidTransitionError);
    if (invalidEdit._tag === "ProjectRuntimeInvalidTransitionError") {
      assert.equal(invalidEdit.violation, "blocked_requires_blocker");
    }
    const repaired = yield* service.updateTask(
      projectA,
      { taskId: task.taskId, expectedRevision: legacy.revision, status: "active" },
      actor,
    );
    assert.equal(repaired.status, "active");
    assert.isNull(repaired.blocker);
    assert.equal(repaired.revision, legacy.revision + 1);
    assert.deepEqual(yield* service.readTask(projectA, task.taskId), repaired);
  }).pipe(Effect.provide(layerTest)),
);

it.effect("validates milestones against evidence and round-trips structured evidence", () =>
  Effect.gen(function* () {
    const service = yield* setup;
    const task = yield* service.createTask(
      projectA,
      {
        ...taskInput,
        verification: { milestone: "static-pass", evidence: [passEvidence] },
      },
      actor,
    );
    assert.deepEqual((yield* service.readTask(projectA, task.taskId)).verification, {
      milestone: "static-pass",
      evidence: [passEvidence],
    });
    const verified = yield* service.updateTask(
      projectA,
      {
        taskId: task.taskId,
        expectedRevision: 1,
        verification: { milestone: "verified", evidence: [passEvidence] },
      },
      actor,
    );
    assert.deepEqual(verified.verification, { milestone: "verified", evidence: [passEvidence] });

    const inconclusive = yield* service
      .updateTask(
        projectA,
        {
          taskId: task.taskId,
          expectedRevision: 2,
          verification: { milestone: "static-pass", evidence: [inconclusiveEvidence] },
        },
        actor,
      )
      .pipe(Effect.flip);
    assert.instanceOf(inconclusive, ProjectRuntimeInvalidTransitionError);
    if (inconclusive._tag === "ProjectRuntimeInvalidTransitionError") {
      assert.equal(inconclusive.violation, "milestone_requires_passing_evidence");
    }
    const failing = yield* service
      .updateTask(
        projectA,
        {
          taskId: task.taskId,
          expectedRevision: 2,
          verification: {
            milestone: "verified",
            evidence: [passEvidence, failEvidence],
          },
        },
        actor,
      )
      .pipe(Effect.flip);
    assert.instanceOf(failing, ProjectRuntimeInvalidTransitionError);
    if (failing._tag === "ProjectRuntimeInvalidTransitionError") {
      assert.equal(failing.violation, "verified_forbids_failing_evidence");
    }
    assert.deepEqual((yield* service.readTask(projectA, task.taskId)).verification, {
      milestone: "verified",
      evidence: [passEvidence],
    });

    const invalidAppend = yield* service
      .appendHandoff(
        projectA,
        {
          taskId: task.taskId,
          expectedTaskRevision: 2,
          checkpoint: "invalid-evidence",
          summary: "Claimed runtime pass",
          verification: { milestone: "runtime-pass", evidence: [inconclusiveEvidence] },
        },
        actor,
      )
      .pipe(Effect.flip);
    assert.instanceOf(invalidAppend, ProjectRuntimeInvalidTransitionError);
    if (invalidAppend._tag === "ProjectRuntimeInvalidTransitionError") {
      assert.equal(invalidAppend.violation, "milestone_requires_passing_evidence");
    }
    assert.deepEqual((yield* service.listHandoffs(projectA, {})).handoffs, []);

    const appended = yield* service.appendHandoff(
      projectA,
      {
        taskId: task.taskId,
        expectedTaskRevision: 2,
        checkpoint: "valid-evidence",
        summary: "Runtime pass recorded",
        verification: { milestone: "runtime-pass", evidence: [passEvidence] },
      },
      actor,
    );
    assert.deepEqual(appended.verification, {
      milestone: "runtime-pass",
      evidence: [passEvidence],
    });
    assert.deepEqual(
      (yield* service.readHandoff(projectA, appended.handoffId)).verification.evidence,
      [passEvidence],
    );
  }).pipe(Effect.provide(layerTest)),
);

it.effect(
  "appends atomically with expected task revision, task state, latest pointer, and snapshots",
  () =>
    Effect.gen(function* () {
      const service = yield* setup;
      const task = yield* service.createTask(projectA, taskInput, actor);
      const before = yield* service.getStatus(projectA);
      const handoff = yield* service.appendHandoff(
        projectA,
        {
          taskId: task.taskId,
          expectedTaskRevision: task.revision,
          taskState: {
            status: "done",
            result: "Shipped",
            verification: { milestone: "static-pass", evidence: [passEvidence] },
          },
          checkpoint: "t2-atomic",
          summary: "Handoff summary",
          result: "Outcome claim",
          filesChanged: ["apps/server/src/projectRuntime/ProjectRuntimeService.ts"],
          testsRun: ["vp test run ProjectRuntimeService.test.ts"],
          testsNotRun: ["Live multi-provider smoke"],
          failuresRisks: "None known",
          unresolvedDecisions: ["Task summaries belong to T3"],
          repositoryState: "Branch clean at abc123",
          integrationState: "Not yet merged",
          verification: { milestone: "static-pass", evidence: [passEvidence] },
          nextAction: "Integrate T3",
        },
        {
          ...actor,
          threadId: ThreadId.make("thread-t2-append"),
          providerInstanceId: ProviderInstanceId.make("codex"),
          model: "gpt-6.1-sol",
        },
      );
      assert.equal(handoff.taskRevision, task.revision);
      assert.equal(handoff.runtimeRevision, before.revision);
      assert.equal(handoff.createdBy, actor.actor);
      assert.equal(handoff.threadId, ThreadId.make("thread-t2-append"));
      assert.equal(handoff.providerInstanceId, ProviderInstanceId.make("codex"));
      assert.equal(handoff.model, "gpt-6.1-sol");
      assert.deepEqual(handoff.filesChanged, [
        "apps/server/src/projectRuntime/ProjectRuntimeService.ts",
      ]);
      assert.deepEqual(handoff.testsRun, ["vp test run ProjectRuntimeService.test.ts"]);
      assert.deepEqual(handoff.testsNotRun, ["Live multi-provider smoke"]);
      assert.equal(handoff.failuresRisks, "None known");
      assert.deepEqual(handoff.unresolvedDecisions, ["Task summaries belong to T3"]);
      assert.equal(handoff.repositoryState, "Branch clean at abc123");
      assert.equal(handoff.integrationState, "Not yet merged");
      assert.equal(handoff.result, "Outcome claim");
      assert.equal(handoff.nextAction, "Integrate T3");
      assert.deepEqual(handoff.verification, {
        milestone: "static-pass",
        evidence: [passEvidence],
      });

      const stored = yield* service.readTask(projectA, task.taskId);
      assert.equal(stored.status, "done");
      assert.equal(stored.result, "Shipped");
      assert.deepEqual(stored.verification, {
        milestone: "static-pass",
        evidence: [passEvidence],
      });
      assert.equal(stored.latestHandoffId, handoff.handoffId);
      assert.equal(stored.revision, task.revision + 1);
      assert.equal(stored.updatedBy, actor.actor);
      assert.equal((yield* service.getStatus(projectA)).revision, before.revision + 1);
      assert.deepEqual(yield* service.readHandoff(projectA, handoff.handoffId), handoff);
      assert.deepEqual((yield* service.listHandoffs(projectA, {})).handoffs, [handoff]);

      const second = yield* service.appendHandoff(
        projectA,
        {
          taskId: task.taskId,
          expectedTaskRevision: stored.revision,
          checkpoint: "t2-follow-up",
          summary: "Second handoff",
        },
        actor,
      );
      assert.equal(second.taskRevision, stored.revision);
      const final = yield* service.readTask(projectA, task.taskId);
      assert.equal(final.revision, stored.revision + 1);
      assert.equal(final.latestHandoffId, second.handoffId);
      assert.equal(final.status, "done");
      assert.equal(final.result, "Shipped");
    }).pipe(Effect.provide(layerTest)),
);

it.effect("stale or invalid appends leave no handoff and no partial task write", () =>
  Effect.gen(function* () {
    const service = yield* setup;
    const task = yield* service.createTask(projectA, taskInput, actor);
    const first = yield* service.appendHandoff(
      projectA,
      {
        taskId: task.taskId,
        expectedTaskRevision: task.revision,
        checkpoint: "first",
        summary: "First handoff",
      },
      actor,
    );
    const afterFirst = yield* service.readTask(projectA, task.taskId);
    const statusAfterFirst = yield* service.getStatus(projectA);

    const stale = yield* service
      .appendHandoff(
        projectA,
        {
          taskId: task.taskId,
          expectedTaskRevision: task.revision,
          taskState: { status: "review" },
          checkpoint: "stale",
          summary: "Stale append",
        },
        actor,
      )
      .pipe(Effect.flip);
    assert.instanceOf(stale, ProjectRuntimeConflictError);
    if (stale._tag === "ProjectRuntimeConflictError") {
      assert.deepInclude(stale, {
        expectedRevision: task.revision,
        currentRevision: afterFirst.revision,
      });
    }
    assert.deepEqual(yield* service.readTask(projectA, task.taskId), afterFirst);
    assert.deepEqual(yield* service.getStatus(projectA), statusAfterFirst);
    assert.deepEqual((yield* service.listHandoffs(projectA, {})).handoffs, [first]);

    const invalid = yield* service
      .appendHandoff(
        projectA,
        {
          taskId: task.taskId,
          expectedTaskRevision: afterFirst.revision,
          taskState: { status: "done" },
          checkpoint: "invalid",
          summary: "Invalid task state",
        },
        actor,
      )
      .pipe(Effect.flip);
    assert.instanceOf(invalid, ProjectRuntimeInvalidTransitionError);
    if (invalid._tag === "ProjectRuntimeInvalidTransitionError") {
      assert.equal(invalid.violation, "done_requires_result");
    }
    assert.deepEqual(yield* service.readTask(projectA, task.taskId), afterFirst);
    assert.deepEqual(yield* service.getStatus(projectA), statusAfterFirst);
    assert.deepEqual((yield* service.listHandoffs(projectA, {})).handoffs, [first]);
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
          expectedTaskRevision: task.revision,
          checkpoint: "one",
          summary: "First",
          verification: {
            milestone: "none" as const,
            evidence: [
              {
                evidenceId: "e1",
                result: "inconclusive" as const,
                summary: "test:one",
                recordedAt: "2026-10-23T00:00:00.000Z",
              },
              {
                evidenceId: "e2",
                result: "inconclusive" as const,
                summary: "file:report",
                recordedAt: "2026-10-23T00:00:00.000Z",
              },
            ],
          },
        },
        actor,
      );
      const afterFirst = yield* service.readTask(projectA, task.taskId);
      assert.equal(afterFirst.latestHandoffId, first.handoffId);
      const updated = yield* service.updateTask(
        projectA,
        { taskId: task.taskId, expectedRevision: afterFirst.revision, title: "Updated" },
        actor,
      );
      const runtime = yield* service.getStatus(projectA);
      const second = yield* service.appendHandoff(
        projectA,
        {
          taskId: task.taskId,
          expectedTaskRevision: updated.revision,
          checkpoint: "two",
          summary: "Second",
        },
        actor,
      );
      assert.equal(second.taskRevision, updated.revision);
      assert.equal(second.runtimeRevision, runtime.revision);
      const afterSecond = yield* service.readTask(projectA, task.taskId);
      assert.equal(afterSecond.latestHandoffId, second.handoffId);
      assert.equal(afterSecond.revision, updated.revision + 1);
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
      {
        taskId: task.taskId,
        expectedTaskRevision: task.revision,
        checkpoint: "isolation",
        summary: "A only",
      },
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
          {
            taskId: task.taskId,
            expectedTaskRevision: task.revision,
            checkpoint: "wrong",
            summary: "Wrong project",
          },
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
    const storedTask = yield* service.readTask(projectA, task.taskId);
    assert.equal(storedTask.latestHandoffId, handoff.handoffId);
    assert.equal(storedTask.revision, task.revision + 1);
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
          expectedTaskRevision: task.revision,
          checkpoint: "bounds",
          summary: "x".repeat(PROJECT_RUNTIME_BOUNDS.handoffSummaryMaxLength + 1),
        },
        actor,
      ),
      service.appendHandoff(
        projectA,
        {
          taskId: task.taskId,
          expectedTaskRevision: task.revision,
          checkpoint: "bounds",
          summary: "Rejected",
          verification: {
            milestone: "none" as const,
            evidence: Array.from({ length: 51 }, (_, index) => ({
              evidenceId: `e${index + 1}`,
              result: "inconclusive" as const,
              summary: "evidence",
              recordedAt: "2026-10-23T00:00:00.000Z",
            })),
          },
        },
        actor,
      ),
      service.appendHandoff(
        projectA,
        {
          taskId: task.taskId,
          expectedTaskRevision: task.revision,
          checkpoint: "bounds",
          summary: "Rejected",
          verification: {
            milestone: "none" as const,
            evidence: [
              {
                evidenceId: "e1",
                result: "inconclusive" as const,
                summary: "x".repeat(1_025),
                recordedAt: "2026-10-23T00:00:00.000Z",
              },
            ],
          },
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
      const serviceLayer = ProjectRuntimeService.layer.pipe(
        Layer.provide(DevelopmentProfileService.layer),
        Layer.provideMerge(database),
      );
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
            {
              taskId: task.taskId,
              expectedTaskRevision: task.revision,
              checkpoint: "reopen",
              summary: "Durable",
            },
            actor,
          );
          return {
            instructions,
            source,
            task: yield* service.readTask(projectA, task.taskId),
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

it.effect("reads an empty disabled context that keeps the revision", () =>
  Effect.gen(function* () {
    const service = yield* setup;
    yield* service.saveInstructions(projectA, { instructions: "Hidden while disabled" }, actor);
    yield* service.createTask(projectA, { ...taskInput, status: "active" }, actor);
    const disabled = yield* service.setEnabled(projectA, { enabled: false });
    assert.deepEqual(yield* service.readContext(projectA), {
      projectId: projectA,
      status: disabled,
      instructions: null,
      sources: [],
      tasks: [],
      truncated: { sources: false, tasks: false, handoffs: false },
    });
    assert.isAbove(disabled.revision, 1);
    assert.equal(
      (yield* service.readContext(ProjectId.make("unknown")).pipe(Effect.flip))._tag,
      "ProjectNotFoundError",
    );
  }).pipe(Effect.provide(layerTest)),
);

it.effect("reads context from enabled sources and open tasks with each latest handoff", () =>
  Effect.gen(function* () {
    const service = yield* setup;
    const instructions = yield* service.saveInstructions(
      projectA,
      { instructions: "Follow the spec" },
      actor,
    );
    const enabled = yield* service.createSource(projectA, sourceInput, actor);
    yield* service.createSource(projectA, { ...sourceInput, enabled: false }, actor);
    yield* service.createSource(projectB, sourceInput, actor);
    const create = (title: string, status: "planned" | "active" | "blocked" | "review" | "done") =>
      service.createTask(
        projectA,
        {
          ...taskInput,
          title,
          status,
          ...(status === "blocked"
            ? {
                blocker: {
                  classification: "operational-blocker" as const,
                  summary: "Waiting on a dependency",
                },
              }
            : {}),
          ...(status === "done" ? { result: "Completed" } : {}),
        },
        actor,
      );
    // Registered in the reverse of the packing order, one second apart.
    const review = yield* create("review", "review");
    yield* TestClock.adjust(1000);
    yield* create("planned", "planned");
    yield* create("done", "done");
    const blocked = yield* create("blocked", "blocked");
    yield* TestClock.adjust(1000);
    const active = yield* create("active", "active");
    yield* TestClock.adjust(1000);
    const first = yield* service.appendHandoff(
      projectA,
      {
        taskId: active.taskId,
        expectedTaskRevision: active.revision,
        checkpoint: "one",
        summary: "First",
      },
      actor,
    );
    yield* TestClock.adjust(1000);
    const latest = yield* service.appendHandoff(
      projectA,
      {
        taskId: active.taskId,
        expectedTaskRevision: (yield* service.readTask(projectA, active.taskId)).revision,
        checkpoint: "two",
        summary: "Second",
      },
      actor,
    );
    const other = yield* service.createTask(projectB, taskInput, actor);
    yield* service.appendHandoff(
      projectB,
      {
        taskId: other.taskId,
        expectedTaskRevision: other.revision,
        checkpoint: "other",
        summary: "Other project",
      },
      actor,
    );

    const context = yield* service.readContext(projectA);
    assert.deepEqual(context.instructions, instructions);
    assert.deepEqual(
      context.sources.map((source) => source.sourceId),
      [enabled.sourceId],
    );
    assert.deepEqual(
      context.tasks.map((task) => task.taskId),
      [active.taskId, blocked.taskId, review.taskId],
    );
    assert.equal(context.tasks[0]?.latestHandoff?.handoffId, latest.handoffId);
    assert.notEqual(context.tasks[0]?.latestHandoff?.handoffId, first.handoffId);
    assert.deepEqual(context.tasks[0]?.latestHandoff, {
      handoffId: latest.handoffId,
      taskId: active.taskId,
      checkpoint: "two",
      summary: "Second",
      taskRevision: latest.taskRevision,
      createdAt: latest.createdAt,
    });
    assert.equal(context.tasks[0]?.verificationMilestone, "none");
    assert.notProperty(context.tasks[0]!, "blockerSummary");
    assert.equal(context.tasks[1]?.verificationMilestone, "none");
    assert.equal(context.tasks[1]?.blockerSummary, "Waiting on a dependency");
    assert.isNull(context.tasks[1]?.latestHandoff);
    assert.deepEqual(context.truncated, { sources: false, tasks: false, handoffs: false });
    assert.notInclude(JSON.stringify(context), "Other project");
  }).pipe(Effect.provide(layerTest)),
);

it.effect("resolves context handoffs through the task pointer and fails closed", () =>
  Effect.gen(function* () {
    const service = yield* setup;
    const sql = yield* SqlClient.SqlClient;
    const task = yield* service.createTask(projectA, { ...taskInput, status: "active" }, actor);
    const first = yield* service.appendHandoff(
      projectA,
      {
        taskId: task.taskId,
        expectedTaskRevision: task.revision,
        checkpoint: "first",
        summary: "First",
      },
      actor,
    );
    yield* TestClock.adjust(1000);
    const second = yield* service.appendHandoff(
      projectA,
      {
        taskId: task.taskId,
        expectedTaskRevision: (yield* service.readTask(projectA, task.taskId)).revision,
        checkpoint: "second",
        summary: "Second",
      },
      actor,
    );
    assert.equal(
      (yield* service.readContext(projectA)).tasks[0]?.latestHandoff?.handoffId,
      second.handoffId,
    );

    // The pointer, not creation order, decides which handoff the context exposes.
    yield* sql`UPDATE project_runtime_tasks SET payload_json = json_set(payload_json, '$.latestHandoffId', ${first.handoffId})
      WHERE project_id = ${projectA} AND task_id = ${task.taskId}`;
    assert.equal(
      (yield* service.readContext(projectA)).tasks[0]?.latestHandoff?.handoffId,
      first.handoffId,
    );

    // A pointer to missing state is an error, not a reason to fall back to the newest row.
    yield* sql`DELETE FROM project_runtime_handoffs WHERE project_id = ${projectA} AND handoff_id = ${first.handoffId}`;
    assert.deepInclude(yield* service.readContext(projectA).pipe(Effect.flip), {
      _tag: "ProjectRuntimeNotFoundError",
      projectId: projectA,
      entity: "handoff",
      entityId: first.handoffId,
    });
  }).pipe(Effect.provide(layerTest)),
);

it.effect(
  "delivers canonical inherited policy with project overrides, including when Runtime is disabled",
  () =>
    Effect.gen(function* () {
      const runtime = yield* setup;
      const profiles = yield* DevelopmentProfileService.DevelopmentProfileService;
      const profile = yield* profiles.create(
        { name: "Shared standard", instructions: "Use workflow A. Profile-only marker." },
        actor,
      );
      yield* profiles.setAssignment({
        projectId: projectA,
        profileId: profile.profileId,
        expectedRevision: 0,
      });
      yield* runtime.saveInstructions(
        projectA,
        {
          instructions: "For this project use workflow B instead of workflow A.",
          expectedRevision: 0,
        },
        actor,
      );
      const context = yield* runtime.readContext(projectA);
      const effective = yield* profiles.resolveEffectiveProjectInstructions(projectA);
      assert.deepEqual(context.developmentProfile, {
        profileId: profile.profileId,
        name: profile.name,
        revision: profile.revision,
      });
      assert.equal(context.effectiveInstructions, effective.formattedInstructions);
      assert.include(context.effectiveInstructions!, "Profile-only marker");
      assert.include(context.effectiveInstructions!, "workflow B");
      assert.equal((yield* runtime.readContext(projectB)).developmentProfile, undefined);
      yield* runtime.setEnabled(projectA, { enabled: false });
      const disabled = yield* runtime.readContext(projectA);
      assert.isFalse(disabled.status.enabled);
      assert.isNull(disabled.instructions);
      assert.include(disabled.effectiveInstructions!, "Profile-only marker");
      assert.notInclude(disabled.effectiveInstructions!, "workflow B");
      const updated = yield* profiles.update(
        {
          profileId: profile.profileId,
          name: profile.name,
          instructions: "Updated shared policy",
          expectedRevision: profile.revision,
        },
        actor,
      );
      const refreshed = yield* runtime.readContext(projectA);
      assert.equal(refreshed.developmentProfile?.revision, updated.revision);
      assert.include(refreshed.effectiveInstructions!, "Updated shared policy");
      const assignment = yield* profiles.getAssignment(projectA);
      yield* profiles.setAssignment({
        projectId: projectA,
        profileId: null,
        expectedRevision: assignment!.revision,
      });
      assert.equal((yield* runtime.readContext(projectA)).effectiveInstructions, undefined);
      yield* runtime.setEnabled(projectA, { enabled: true });
      assert.equal(
        (yield* runtime.readInstructions(projectA))?.instructions,
        "For this project use workflow B instead of workflow A.",
      );
    }).pipe(Effect.provide(layerTest)),
);

it.effect("keeps task routing under the normal task revision CAS", () =>
  Effect.gen(function* () {
    const service = yield* setup;
    const routing = (model: string, fallback: "continue" | "inherit" | "fail" = "inherit") => ({
      role: "implementation" as const,
      candidates: [{ providerInstanceId: ProviderInstanceId.make("codex"), model }],
      fallback,
    });
    const created = yield* service.createTask(
      projectA,
      { ...taskInput, routing: routing("gpt-6") },
      actor,
    );
    assert.deepEqual(created.routing, routing("gpt-6"));

    const routed = yield* service.updateTask(
      projectA,
      { taskId: created.taskId, expectedRevision: 1, routing: routing("gpt-7", "fail") },
      otherActor,
    );
    assert.equal(routed.revision, 2);
    assert.deepEqual(routed.routing, routing("gpt-7", "fail"));

    const stale = yield* service
      .updateTask(
        projectA,
        { taskId: created.taskId, expectedRevision: 1, routing: routing("gpt-8") },
        actor,
      )
      .pipe(Effect.flip);
    assert.instanceOf(stale, ProjectRuntimeConflictError);
    const afterStale = yield* service.readTask(projectA, created.taskId);
    assert.equal(afterStale.revision, 2);
    assert.equal(afterStale.scope, created.scope);
    assert.deepEqual(afterStale.routing, routing("gpt-7", "fail"));

    const cleared = yield* service.updateTask(
      projectA,
      { taskId: created.taskId, expectedRevision: 2, routing: null },
      actor,
    );
    assert.equal(cleared.routing, undefined);
  }).pipe(Effect.provide(layerTest)),
);
