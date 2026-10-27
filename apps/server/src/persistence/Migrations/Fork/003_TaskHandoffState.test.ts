import { assert, it } from "@effect/vitest";
import * as NodeSqliteClient from "@t3tools/shared/nodeSqliteClient";
import * as Schema from "effect/Schema";
import * as Effect from "effect/Effect";
import * as SqlClient from "effect/sql/SqlClient";
import { expect } from "vite-plus/test";

import { ProjectRuntimeHandoff, ProjectRuntimeTask } from "@t3tools/contracts";

import { runMigrations } from "../../Migrations.ts";
import DevelopmentProfilesMigration from "./002_DevelopmentProfiles.ts";
import ProjectRuntimeMigration from "./001_ProjectRuntime.ts";
import TaskHandoffStateMigration from "./003_TaskHandoffState.ts";

const decodeTask = Schema.decodeUnknownSync(ProjectRuntimeTask);
const decodeHandoff = Schema.decodeUnknownSync(ProjectRuntimeHandoff);

const t0 = "2026-10-24T00:20:00.000Z";
const t1 = "2026-10-24T00:40:00.000Z";
const t2 = "2026-10-24T01:00:00.000Z";

/** Fork 001/002 schema plus a legacy upstream-ledger history that reconciliation adopts. */
const prepareLegacySchema = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`PRAGMA foreign_keys = ON`;
  yield* runMigrations({ toMigrationInclusive: 67 });
  yield* ProjectRuntimeMigration;
  yield* DevelopmentProfilesMigration;
  yield* sql`
    INSERT INTO effect_sql_migrations (migration_id, name, created_at)
    VALUES
      (68, 'ProjectRuntime', '2026-10-23 10:00:00'),
      (69, 'DevelopmentProfiles', '2026-10-24 11:00:00')
  `;
});

const seedLegacyRows = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`PRAGMA foreign_keys = ON`;
  yield* sql`
    INSERT INTO projection_projects
      (project_id, title, workspace_root, scripts_json, created_at, updated_at)
    VALUES
      ('legacy-project', 'Legacy project', '/legacy', '[]', ${t0}, ${t0})
  `;
  yield* sql`
    INSERT INTO project_runtime
      (project_id, enabled, revision, created_at, updated_at)
    VALUES
      ('legacy-project', 1, 9, ${t0}, ${t1})
  `;
  const taskRow = (
    taskId: string,
    status: string,
    revision: number,
    payload: Record<string, unknown>,
  ) =>
    sql`INSERT INTO project_runtime_tasks (task_id, project_id, status, revision, created_at, payload_json)
      VALUES (${taskId}, 'legacy-project', ${status}, ${revision}, ${t0}, ${JSON.stringify(payload)})`;
  const handoffRow = (
    handoffId: string,
    taskId: string,
    createdAt: string,
    payload: Record<string, unknown>,
  ) =>
    sql`INSERT INTO project_runtime_handoffs (handoff_id, project_id, task_id, created_at, payload_json)
      VALUES (${handoffId}, 'legacy-project', ${taskId}, ${createdAt}, ${JSON.stringify(payload)})`;

  // Legacy V1 task shape: string criteria, flat git fields, no owner/verification.
  yield* taskRow("t-plain", "active", 5, {
    taskId: "t-plain",
    projectId: "legacy-project",
    title: "Ship migration",
    status: "active",
    scope: "Preserve data",
    acceptanceCriteria: "Contracts decode and reject invalid bounds.",
    nextAction: "Run tests",
    revision: 5,
    createdAt: t0,
    updatedAt: t1,
    createdBy: "user:maintainer",
    updatedBy: "user:maintainer",
  });
  // Flat git fields plus stray legacy prose in task.verification and an invalid owner.
  yield* taskRow("t-base", "blocked", 2, {
    taskId: "t-base",
    projectId: "legacy-project",
    title: "Base fields",
    status: "blocked",
    scope: "Move git fields",
    acceptanceCriteria: "",
    branch: "feature/x",
    worktreePath: "/tmp/x",
    baseSha: "abc123",
    owner: "",
    verification: "Claimed verified.",
    revision: 2,
    createdAt: t0,
    updatedAt: t1,
    createdBy: "user:maintainer",
    updatedBy: "user:maintainer",
  });
  // Oversized legacy criteria string and three handoffs: h-z sorts last by id but first by time.
  yield* taskRow("t-multi", "active", 7, {
    taskId: "t-multi",
    projectId: "legacy-project",
    title: "Multi handoffs",
    status: "active",
    scope: "Ordering",
    acceptanceCriteria: "x".repeat(2_500),
    revision: 7,
    createdAt: t0,
    updatedAt: t1,
    createdBy: "user:maintainer",
    updatedBy: "user:maintainer",
  });
  yield* taskRow("t-blocked", "blocked", 1, {
    taskId: "t-blocked",
    projectId: "legacy-project",
    title: "Blocked without a record",
    status: "blocked",
    scope: "Legacy blocked row",
    acceptanceCriteria: "One criterion",
    revision: 1,
    createdAt: t0,
    updatedAt: t0,
    createdBy: "user:maintainer",
    updatedBy: "user:maintainer",
  });

  yield* handoffRow("h-old", "t-base", t1, {
    handoffId: "h-old",
    projectId: "legacy-project",
    taskId: "t-base",
    checkpoint: "before-upgrade",
    summary: "Wrote the migration",
    runtimeRevision: 9,
    taskRevision: 5,
    createdAt: t1,
    createdBy: "user:maintainer",
  });
  yield* handoffRow("h-z", "t-multi", t1, {
    handoffId: "h-z",
    projectId: "legacy-project",
    taskId: "t-multi",
    checkpoint: "mid",
    summary: "First continuation",
    changes: "Changed a.ts and b.ts.",
    failuresOrBlockers: "Timeout risk.",
    runtimeRevision: 4,
    taskRevision: 3,
    createdAt: t1,
    createdBy: "user:maintainer",
  });
  yield* handoffRow("h-b", "t-multi", t2, {
    handoffId: "h-b",
    projectId: "legacy-project",
    taskId: "t-multi",
    checkpoint: "late-b",
    summary: "Second continuation",
    verification: "1184/1184 PASS",
    evidenceRefs: ["PRT-010", "vp test run x"],
    runtimeRevision: 5,
    taskRevision: 6,
    createdAt: t2,
    createdBy: "user:maintainer",
  });
  yield* handoffRow("h-c", "t-multi", t2, {
    handoffId: "h-c",
    projectId: "legacy-project",
    taskId: "t-multi",
    checkpoint: "late-c",
    summary: "Third continuation",
    verification: "y".repeat(1_500),
    evidenceRefs: ["ref-a"],
    nextAction: "Continue.",
    threadId: "thread-1",
    providerInstanceId: "codex",
    model: "gpt-5.3-codex",
    runtimeRevision: 6,
    taskRevision: 6,
    createdAt: t2,
    createdBy: "thread:thread-1",
  });
  yield* taskRow("t-emoji", "active", 1, {
    taskId: "t-emoji",
    projectId: "legacy-project",
    title: "Chunk boundary",
    status: "active",
    scope: "Surrogates",
    acceptanceCriteria: "",
    revision: 1,
    createdAt: t0,
    updatedAt: t0,
    createdBy: "user:maintainer",
    updatedBy: "user:maintainer",
  });
  yield* handoffRow("h-emoji", "t-emoji", t1, {
    handoffId: "h-emoji",
    projectId: "legacy-project",
    taskId: "t-emoji",
    checkpoint: "emoji",
    summary: "Chunk boundary",
    changes: "x".repeat(511) + "😀" + "yy",
    runtimeRevision: 1,
    taskRevision: 1,
    createdAt: t1,
    createdBy: "user:maintainer",
  });
});

const readPayloads = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const tasks = yield* sql<{
    readonly task_id: string;
    readonly revision: number;
    readonly created_at: string;
    readonly payload_json: string;
  }>`SELECT task_id, revision, created_at, payload_json FROM project_runtime_tasks ORDER BY task_id`;
  const handoffs = yield* sql<{
    readonly handoff_id: string;
    readonly created_at: string;
    readonly payload_json: string;
  }>`SELECT handoff_id, created_at, payload_json FROM project_runtime_handoffs ORDER BY handoff_id`;
  return { tasks, handoffs };
});

it.effect("rewrites legacy task and handoff payloads into the v1 shape", () =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* prepareLegacySchema;
    yield* seedLegacyRows;
    yield* runMigrations();
    assert.deepEqual(
      yield* sql`SELECT migration_id, name FROM t3_fork_migrations ORDER BY migration_id`,
      [
        { migration_id: 1, name: "ProjectRuntime" },
        { migration_id: 2, name: "DevelopmentProfiles" },
        { migration_id: 3, name: "TaskHandoffState" },
        { migration_id: 4, name: "RuntimeRouting" },
      ],
    );

    const { tasks, handoffs } = yield* readPayloads;
    const byTask = new Map(tasks.map((row) => [row.task_id, row]));
    const byHandoff = new Map(handoffs.map((row) => [row.handoff_id, row]));

    const plain = decodeTask(JSON.parse(byTask.get("t-plain")!.payload_json));
    expect(plain).toEqual({
      taskId: "t-plain",
      projectId: "legacy-project",
      title: "Ship migration",
      scope: "Preserve data",
      owner: "user:maintainer",
      acceptanceCriteria: [{ id: "c1", text: "Contracts decode and reject invalid bounds." }],
      status: "active",
      blocker: null,
      verification: { milestone: "none", evidence: [] },
      latestHandoffId: null,
      nextAction: "Run tests",
      revision: 5,
      createdAt: t0,
      updatedAt: t1,
      createdBy: "user:maintainer",
      updatedBy: "user:maintainer",
    });

    const base = decodeTask(JSON.parse(byTask.get("t-base")!.payload_json));
    expect(base).toEqual({
      taskId: "t-base",
      projectId: "legacy-project",
      title: "Base fields",
      scope: "Move git fields",
      owner: "user:maintainer",
      base: { branch: "feature/x", revision: "abc123", worktreePath: "/tmp/x" },
      acceptanceCriteria: [],
      status: "blocked",
      blocker: null,
      verification: {
        milestone: "none",
        evidence: [
          {
            evidenceId: "e1",
            result: "inconclusive",
            summary: "Claimed verified.",
            recordedAt: t0,
          },
        ],
      },
      latestHandoffId: "h-old",
      revision: 2,
      createdAt: t0,
      updatedAt: t1,
      createdBy: "user:maintainer",
      updatedBy: "user:maintainer",
    });

    const multi = decodeTask(JSON.parse(byTask.get("t-multi")!.payload_json));
    expect(multi).toEqual({
      taskId: "t-multi",
      projectId: "legacy-project",
      title: "Multi handoffs",
      scope: "Ordering",
      owner: "user:maintainer",
      acceptanceCriteria: [
        { id: "c1", text: "x".repeat(2_000) },
        { id: "c2", text: "x".repeat(500) },
      ],
      status: "active",
      blocker: null,
      verification: { milestone: "none", evidence: [] },
      latestHandoffId: "h-c",
      revision: 7,
      createdAt: t0,
      updatedAt: t1,
      createdBy: "user:maintainer",
      updatedBy: "user:maintainer",
    });

    // A legacy blocked row migrates with `blocker: null`; the blocked⇔blocker
    // invariant is write-time (T2) and must not rewrite history here.
    const blocked = decodeTask(JSON.parse(byTask.get("t-blocked")!.payload_json));
    assert.equal(blocked.status, "blocked");
    assert.equal(blocked.blocker, null);
    expect(blocked.acceptanceCriteria).toEqual([{ id: "c1", text: "One criterion" }]);

    const old = decodeHandoff(JSON.parse(byHandoff.get("h-old")!.payload_json));
    expect(old).toEqual({
      handoffId: "h-old",
      projectId: "legacy-project",
      taskId: "t-base",
      checkpoint: "before-upgrade",
      summary: "Wrote the migration",
      filesChanged: [],
      verification: { milestone: "none", evidence: [] },
      runtimeRevision: 9,
      taskRevision: 5,
      createdAt: t1,
      createdBy: "user:maintainer",
    });

    const z = decodeHandoff(JSON.parse(byHandoff.get("h-z")!.payload_json));
    expect(z).toEqual({
      handoffId: "h-z",
      projectId: "legacy-project",
      taskId: "t-multi",
      checkpoint: "mid",
      summary: "First continuation",
      filesChanged: ["Changed a.ts and b.ts."],
      failuresRisks: "Timeout risk.",
      verification: { milestone: "none", evidence: [] },
      runtimeRevision: 4,
      taskRevision: 3,
      createdAt: t1,
      createdBy: "user:maintainer",
    });

    const b = decodeHandoff(JSON.parse(byHandoff.get("h-b")!.payload_json));
    expect(b).toEqual({
      handoffId: "h-b",
      projectId: "legacy-project",
      taskId: "t-multi",
      checkpoint: "late-b",
      summary: "Second continuation",
      filesChanged: [],
      verification: {
        milestone: "none",
        evidence: [
          { evidenceId: "e1", result: "inconclusive", summary: "1184/1184 PASS", recordedAt: t2 },
          { evidenceId: "e2", result: "inconclusive", summary: "PRT-010", recordedAt: t2 },
          { evidenceId: "e3", result: "inconclusive", summary: "vp test run x", recordedAt: t2 },
        ],
      },
      runtimeRevision: 5,
      taskRevision: 6,
      createdAt: t2,
      createdBy: "user:maintainer",
    });

    const c = decodeHandoff(JSON.parse(byHandoff.get("h-c")!.payload_json));
    expect(c).toEqual({
      handoffId: "h-c",
      projectId: "legacy-project",
      taskId: "t-multi",
      checkpoint: "late-c",
      summary: "Third continuation",
      filesChanged: [],
      verification: {
        milestone: "none",
        evidence: [
          { evidenceId: "e1", result: "inconclusive", summary: "y".repeat(1_024), recordedAt: t2 },
          { evidenceId: "e2", result: "inconclusive", summary: "y".repeat(476), recordedAt: t2 },
          { evidenceId: "e3", result: "inconclusive", summary: "ref-a", recordedAt: t2 },
        ],
      },
      nextAction: "Continue.",
      threadId: "thread-1",
      providerInstanceId: "codex",
      model: "gpt-5.3-codex",
      runtimeRevision: 6,
      taskRevision: 6,
      createdAt: t2,
      createdBy: "thread:thread-1",
    });

    for (const handoff of [old, z, b, c]) {
      for (const entry of handoff.verification.evidence) {
        assert.equal(entry.result, "inconclusive");
      }
    }

    const emoji = decodeHandoff(JSON.parse(byHandoff.get("h-emoji")!.payload_json));
    expect(emoji.filesChanged).toEqual(["x".repeat(511), "😀yy"]);

    for (const row of tasks) {
      assert.equal(row.created_at, t0);
    }
    assert.equal(byTask.get("t-plain")!.revision, 5);
    assert.equal(byTask.get("t-multi")!.revision, 7);
    assert.equal(byHandoff.get("h-old")!.created_at, t1);
    assert.equal(byHandoff.get("h-b")!.created_at, t2);
  }).pipe(Effect.provide(NodeSqliteClient.layer({ filename: ":memory:" }))),
);

it.effect("is a no-op when rerun and cascades on project deletion", () =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* prepareLegacySchema;
    yield* seedLegacyRows;
    yield* TaskHandoffStateMigration;
    const first = yield* readPayloads;
    yield* TaskHandoffStateMigration;
    const second = yield* readPayloads;
    assert.deepEqual(second, first);

    yield* sql`UPDATE projection_projects SET deleted_at = ${t2} WHERE project_id = 'legacy-project'`;
    assert.deepEqual(yield* sql`SELECT 1 FROM project_runtime`, []);
    assert.deepEqual(yield* sql`SELECT 1 FROM project_runtime_tasks`, []);
    assert.deepEqual(yield* sql`SELECT 1 FROM project_runtime_handoffs`, []);
    assert.deepEqual(yield* sql`PRAGMA foreign_key_check`, []);
  }).pipe(Effect.provide(NodeSqliteClient.layer({ filename: ":memory:" }))),
);
