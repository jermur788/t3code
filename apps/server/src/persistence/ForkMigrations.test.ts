import { assert, describe, it } from "@effect/vitest";
import * as NodeSqliteClient from "@t3tools/shared/nodeSqliteClient";
import * as Effect from "effect/Effect";
import * as SqlClient from "effect/sql/SqlClient";

import DevelopmentProfilesMigration from "./Migrations/Fork/002_DevelopmentProfiles.ts";
import ProjectRuntimeMigration from "./Migrations/Fork/001_ProjectRuntime.ts";
import {
  FORK_MIGRATION_TABLE,
  FORK_RECONCILIATION_TABLE,
  forkMigrationManifest,
  reconcileForkMigrationHistory,
} from "./ForkMigrations.ts";
import { migrationManifest, runMigrations } from "./Migrations.ts";

const upstreamHistory = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const rows = yield* sql<{ readonly migration_id: number; readonly name: string }>`
    SELECT migration_id, name FROM effect_sql_migrations ORDER BY migration_id
  `;
  return rows.map((row) => [Number(row.migration_id), row.name] as const);
});

const forkHistory = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const rows = yield* sql<{ readonly migration_id: number; readonly name: string }>`
    SELECT migration_id, name FROM ${sql(FORK_MIGRATION_TABLE)} ORDER BY migration_id
  `;
  return rows.map((row) => [Number(row.migration_id), row.name] as const);
});

const seedLegacyForkHome = Effect.gen(function* () {
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
  yield* sql`
    INSERT INTO projection_projects
      (project_id, title, workspace_root, scripts_json, created_at, updated_at)
    VALUES
      ('legacy-project', 'Legacy project', '/legacy', '[]', '2026-10-24T00:00:00.000Z', '2026-10-24T00:00:00.000Z')
  `;
  yield* sql`
    INSERT INTO development_profiles
      (profile_id, name, instructions, revision, created_at, updated_at, created_by, updated_by)
    VALUES
      ('legacy-profile', 'Legacy policy', 'Profile instructions', 4,
       '2026-10-24T00:00:00.000Z', '2026-10-24T01:00:00.000Z', 'user:maintainer', 'user:maintainer')
  `;
  yield* sql`
    INSERT INTO project_development_profiles
      (project_id, profile_id, revision, created_at, updated_at)
    VALUES
      ('legacy-project', 'legacy-profile', 2, '2026-10-24T00:00:00.000Z', '2026-10-24T01:00:00.000Z')
  `;
  yield* sql`
    INSERT INTO project_runtime
      (project_id, enabled, revision, instructions_json, instructions_revision, created_at, updated_at)
    VALUES
      ('legacy-project', 1, 9,
       '{"projectId":"legacy-project","instructions":"Legacy project instructions","revision":3,"updatedAt":"2026-10-24T00:30:00.000Z","updatedBy":"user:maintainer"}',
       3, '2026-10-24T00:00:00.000Z', '2026-10-24T00:30:00.000Z')
  `;
  yield* sql`
    INSERT INTO project_runtime_sources
      (source_id, project_id, revision, created_at, payload_json)
    VALUES
      ('legacy-source', 'legacy-project', 2, '2026-10-24T00:10:00.000Z',
       '{"sourceId":"legacy-source","projectId":"legacy-project","title":"Design","role":"authority","authorityRank":1,"relativePath":"docs/design.md","enabled":true,"revision":2,"createdAt":"2026-10-24T00:10:00.000Z","updatedAt":"2026-10-24T00:10:00.000Z","createdBy":"user:maintainer","updatedBy":"user:maintainer"}')
  `;
  yield* sql`
    INSERT INTO project_runtime_tasks
      (task_id, project_id, status, revision, created_at, payload_json)
    VALUES
      ('legacy-task', 'legacy-project', 'active', 5, '2026-10-24T00:20:00.000Z',
       '{"taskId":"legacy-task","projectId":"legacy-project","title":"Ship migration","scope":"Preserve data","owner":"user:maintainer","acceptanceCriteria":[{"id":"c1","text":"Rows survive"}],"status":"active","blocker":null,"verification":{"milestone":"none","evidence":[]},"latestHandoffId":"legacy-handoff","nextAction":"Run tests","revision":5,"createdAt":"2026-10-24T00:20:00.000Z","updatedAt":"2026-10-24T00:20:00.000Z","createdBy":"user:maintainer","updatedBy":"user:maintainer"}')
  `;
  yield* sql`
    INSERT INTO project_runtime_handoffs
      (handoff_id, project_id, task_id, created_at, payload_json)
    VALUES
      ('legacy-handoff', 'legacy-project', 'legacy-task', '2026-10-24T00:40:00.000Z',
       '{"handoffId":"legacy-handoff","projectId":"legacy-project","taskId":"legacy-task","checkpoint":"before-upgrade","summary":"Wrote the migration","filesChanged":[],"verification":{"milestone":"none","evidence":[]},"runtimeRevision":9,"taskRevision":5,"createdAt":"2026-10-24T00:40:00.000Z","createdBy":"user:maintainer"}')
  `;
});

const legacyData = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const [runtime] = yield* sql`SELECT project_id, enabled, revision, instructions_json,
    instructions_revision, created_at, updated_at
    FROM project_runtime WHERE project_id = 'legacy-project'`;
  const [source] =
    yield* sql`SELECT * FROM project_runtime_sources WHERE source_id = 'legacy-source'`;
  const [task] = yield* sql`SELECT * FROM project_runtime_tasks WHERE task_id = 'legacy-task'`;
  const [handoff] =
    yield* sql`SELECT * FROM project_runtime_handoffs WHERE handoff_id = 'legacy-handoff'`;
  const [profile] = yield* sql`SELECT profile_id, name, instructions, revision, created_at,
    updated_at, created_by, updated_by
    FROM development_profiles WHERE profile_id = 'legacy-profile'`;
  const [assignment] =
    yield* sql`SELECT * FROM project_development_profiles WHERE project_id = 'legacy-project'`;
  return { runtime, source, task, handoff, profile, assignment };
});

describe("fork migration namespace", () => {
  it.effect("creates the full integrated schema on a fresh home and is a no-op next boot", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const executed = yield* runMigrations();
      assert.strictEqual(executed.length, migrationManifest.length);
      assert.deepStrictEqual(yield* upstreamHistory, migrationManifest);
      assert.deepStrictEqual(yield* forkHistory, forkMigrationManifest);
      assert.deepStrictEqual(yield* runMigrations(), []);
      assert.deepStrictEqual(yield* forkHistory, forkMigrationManifest);
      const tables = yield* sql<{ readonly name: string }>`
        SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (
          'project_runtime', 'project_runtime_sources', 'project_runtime_tasks',
          'project_runtime_handoffs', 'project_runtime_routing',
          'project_runtime_execution_attempts', 'development_profiles',
          'project_development_profiles'
        ) ORDER BY name
      `;
      assert.deepStrictEqual(
        tables.map((row) => row.name),
        [
          "development_profiles",
          "project_development_profiles",
          "project_runtime",
          "project_runtime_execution_attempts",
          "project_runtime_handoffs",
          "project_runtime_routing",
          "project_runtime_sources",
          "project_runtime_tasks",
        ],
      );
    }).pipe(Effect.provide(NodeSqliteClient.layer({ filename: ":memory:" }))),
  );

  it.effect("adds fork schema to a current upstream home without touching upstream history", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* runMigrations({ toMigrationInclusive: 69 });
      assert.deepStrictEqual(yield* upstreamHistory, migrationManifest);
      const before =
        yield* sql`SELECT name FROM sqlite_master WHERE name = ${FORK_MIGRATION_TABLE}`;
      assert.deepStrictEqual(before, []);
      assert.deepStrictEqual(yield* runMigrations(), []);
      assert.deepStrictEqual(yield* upstreamHistory, migrationManifest);
      assert.deepStrictEqual(yield* forkHistory, forkMigrationManifest);
      const searchTable = yield* sql`
        SELECT name FROM sqlite_master WHERE name = 'orchestration_v2_message_search'
      `;
      assert.lengthOf(searchTable, 1);
    }).pipe(Effect.provide(NodeSqliteClient.layer({ filename: ":memory:" }))),
  );

  it.effect("preserves fork data and applies the upstream migrations the fork skipped", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* seedLegacyForkHome;
      const before = yield* legacyData;
      assert.deepStrictEqual(yield* runMigrations(), [
        [68, "ShellStopRequestIndex"],
        [69, "ThreadMessageSearch"],
      ]);
      assert.deepStrictEqual(yield* upstreamHistory, migrationManifest);
      assert.deepStrictEqual(yield* forkHistory, forkMigrationManifest);
      assert.deepStrictEqual(yield* legacyData, before);
      assert.deepStrictEqual(
        yield* sql`SELECT
          legacy_migration_id, legacy_name, legacy_created_at,
          fork_migration_id, fork_name
          FROM ${sql(FORK_RECONCILIATION_TABLE)} ORDER BY legacy_migration_id`,
        [
          {
            legacy_migration_id: 68,
            legacy_name: "ProjectRuntime",
            legacy_created_at: "2026-10-23 10:00:00",
            fork_migration_id: 1,
            fork_name: "ProjectRuntime",
          },
          {
            legacy_migration_id: 69,
            legacy_name: "DevelopmentProfiles",
            legacy_created_at: "2026-10-24 11:00:00",
            fork_migration_id: 2,
            fork_name: "DevelopmentProfiles",
          },
        ],
      );
      assert.deepStrictEqual(
        yield* sql`SELECT migration_id, name FROM ${sql(FORK_MIGRATION_TABLE)}
          ORDER BY migration_id`,
        [
          {
            migration_id: 1,
            name: "ProjectRuntime",
          },
          {
            migration_id: 2,
            name: "DevelopmentProfiles",
          },
          {
            migration_id: 3,
            name: "TaskHandoffState",
          },
          {
            migration_id: 4,
            name: "RuntimeRouting",
          },
          {
            migration_id: 5,
            name: "RuntimeExecutionAttempts",
          },
        ],
      );
      assert.deepStrictEqual(
        yield* sql`SELECT migration_id, created_at FROM ${sql(FORK_MIGRATION_TABLE)}
          WHERE migration_id <= 2 ORDER BY migration_id`,
        [
          {
            migration_id: 1,
            created_at: "2026-10-23 10:00:00",
          },
          {
            migration_id: 2,
            created_at: "2026-10-24 11:00:00",
          },
        ],
      );
      const searchTable = yield* sql`
        SELECT name FROM sqlite_master WHERE name = 'orchestration_v2_message_search'
      `;
      assert.lengthOf(searchTable, 1);
      assert.deepStrictEqual(yield* runMigrations(), []);
      assert.deepStrictEqual(yield* legacyData, before);
      assert.deepStrictEqual(yield* reconcileForkMigrationHistory(), []);
    }).pipe(Effect.provide(NodeSqliteClient.layer({ filename: ":memory:" }))),
  );

  it.effect("recovers a partially applied legacy fork history without losing data", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* sql`PRAGMA foreign_keys = ON`;
      yield* runMigrations({ toMigrationInclusive: 67 });
      yield* ProjectRuntimeMigration;
      yield* sql`
        INSERT INTO effect_sql_migrations (migration_id, name, created_at)
        VALUES (68, 'ProjectRuntime', '2026-10-23 12:00:00')
      `;
      yield* sql`
        INSERT INTO projection_projects
          (project_id, title, workspace_root, scripts_json, created_at, updated_at)
        VALUES
          ('partial', 'Partial', '/partial', '[]', '2026-10-24T00:00:00.000Z', '2026-10-24T00:00:00.000Z')
      `;
      yield* sql`
        INSERT INTO project_runtime
          (project_id, enabled, revision, instructions_json, instructions_revision, created_at, updated_at)
        VALUES
          ('partial', 1, 1, NULL, 0, '2026-10-24T00:00:00.000Z', '2026-10-24T00:00:00.000Z')
      `;
      yield* runMigrations();
      assert.deepStrictEqual(yield* upstreamHistory, migrationManifest);
      assert.deepStrictEqual(yield* forkHistory, forkMigrationManifest);
      assert.deepStrictEqual(
        yield* sql`SELECT project_id, enabled, revision FROM project_runtime`,
        [{ project_id: "partial", enabled: 1, revision: 1 }],
      );
      assert.lengthOf(yield* sql`SELECT 1 FROM development_profiles`, 0);
    }).pipe(Effect.provide(NodeSqliteClient.layer({ filename: ":memory:" }))),
  );
});

const frozenForkSchema: ReadonlyArray<readonly [string, string, string]> = [
  [
    "table",
    "project_runtime",
    "CREATE TABLE project_runtime ( project_id TEXT PRIMARY KEY REFERENCES projection_projects(project_id) ON DELETE CASCADE, enabled INTEGER NOT NULL CHECK (enabled IN (0, 1)), revision INTEGER NOT NULL CHECK (revision >= 0), instructions_json TEXT, instructions_revision INTEGER NOT NULL DEFAULT 0 CHECK (instructions_revision >= 0), created_at TEXT NOT NULL, updated_at TEXT NOT NULL )",
  ],
  [
    "trigger",
    "project_runtime_project_deleted",
    "CREATE TRIGGER project_runtime_project_deleted AFTER UPDATE OF deleted_at ON projection_projects WHEN NEW.deleted_at IS NOT NULL BEGIN DELETE FROM project_runtime WHERE project_id = NEW.project_id; END",
  ],
  [
    "table",
    "project_runtime_sources",
    "CREATE TABLE project_runtime_sources ( source_id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES project_runtime(project_id) ON DELETE CASCADE, revision INTEGER NOT NULL CHECK (revision >= 1), created_at TEXT NOT NULL, payload_json TEXT NOT NULL )",
  ],
  [
    "index",
    "project_runtime_sources_project_idx",
    "CREATE INDEX project_runtime_sources_project_idx ON project_runtime_sources(project_id, created_at, source_id)",
  ],
  [
    "table",
    "project_runtime_tasks",
    "CREATE TABLE project_runtime_tasks ( task_id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES project_runtime(project_id) ON DELETE CASCADE, status TEXT NOT NULL, revision INTEGER NOT NULL CHECK (revision >= 1), created_at TEXT NOT NULL, payload_json TEXT NOT NULL, UNIQUE (project_id, task_id) )",
  ],
  [
    "index",
    "project_runtime_tasks_project_idx",
    "CREATE INDEX project_runtime_tasks_project_idx ON project_runtime_tasks(project_id, created_at, task_id)",
  ],
  [
    "index",
    "project_runtime_tasks_status_idx",
    "CREATE INDEX project_runtime_tasks_status_idx ON project_runtime_tasks(project_id, status, created_at, task_id)",
  ],
  [
    "table",
    "project_runtime_handoffs",
    "CREATE TABLE project_runtime_handoffs ( handoff_id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES project_runtime(project_id) ON DELETE CASCADE, task_id TEXT NOT NULL, created_at TEXT NOT NULL, payload_json TEXT NOT NULL, FOREIGN KEY (project_id, task_id) REFERENCES project_runtime_tasks(project_id, task_id) ON DELETE CASCADE )",
  ],
  [
    "index",
    "project_runtime_handoffs_project_idx",
    "CREATE INDEX project_runtime_handoffs_project_idx ON project_runtime_handoffs(project_id, created_at, handoff_id)",
  ],
  [
    "index",
    "project_runtime_handoffs_task_idx",
    "CREATE INDEX project_runtime_handoffs_task_idx ON project_runtime_handoffs(project_id, task_id, created_at, handoff_id)",
  ],
  [
    "table",
    "project_runtime_routing",
    "CREATE TABLE project_runtime_routing ( project_id TEXT PRIMARY KEY REFERENCES projection_projects(project_id) ON DELETE CASCADE, routing_json TEXT, revision INTEGER NOT NULL CHECK (revision >= 1), created_at TEXT NOT NULL, updated_at TEXT NOT NULL )",
  ],
  [
    "trigger",
    "project_runtime_routing_project_deleted",
    "CREATE TRIGGER project_runtime_routing_project_deleted AFTER UPDATE OF deleted_at ON projection_projects WHEN NEW.deleted_at IS NOT NULL BEGIN DELETE FROM project_runtime_routing WHERE project_id = NEW.project_id; END",
  ],
  [
    "table",
    "development_profiles",
    "CREATE TABLE development_profiles ( profile_id TEXT PRIMARY KEY, name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 200), instructions TEXT NOT NULL CHECK (length(instructions) <= 32000), revision INTEGER NOT NULL CHECK (revision >= 1), created_at TEXT NOT NULL, updated_at TEXT NOT NULL, created_by TEXT NOT NULL CHECK (length(created_by) BETWEEN 1 AND 200), updated_by TEXT NOT NULL CHECK (length(updated_by) BETWEEN 1 AND 200) , routing_json TEXT)",
  ],
  [
    "index",
    "development_profiles_created_idx",
    "CREATE INDEX development_profiles_created_idx ON development_profiles(created_at, profile_id)",
  ],
  [
    "table",
    "project_development_profiles",
    "CREATE TABLE project_development_profiles ( project_id TEXT PRIMARY KEY REFERENCES projection_projects(project_id) ON DELETE CASCADE, profile_id TEXT REFERENCES development_profiles(profile_id) ON DELETE RESTRICT, revision INTEGER NOT NULL CHECK (revision >= 1), created_at TEXT NOT NULL, updated_at TEXT NOT NULL )",
  ],
  [
    "index",
    "project_development_profiles_profile_idx",
    "CREATE INDEX project_development_profiles_profile_idx ON project_development_profiles(profile_id)",
  ],
  [
    "trigger",
    "project_development_profiles_project_deleted",
    "CREATE TRIGGER project_development_profiles_project_deleted AFTER UPDATE OF deleted_at ON projection_projects WHEN NEW.deleted_at IS NOT NULL BEGIN DELETE FROM project_development_profiles WHERE project_id = NEW.project_id; END",
  ],
];

describe("fork migration history safety", () => {
  it.effect("keeps the shipped fork schema stable", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* runMigrations();
      const live = yield* sql<{
        readonly type: string;
        readonly name: string;
        readonly sql: string | null;
      }>`SELECT type, name, sql FROM sqlite_master
        WHERE type IN ('table', 'index', 'trigger') ORDER BY type, name`;
      const byName = new Map(live.map((row) => [row.name, row]));
      const actual = frozenForkSchema.map(([type, name]) => {
        const row = byName.get(name);
        assert.ok(row, `missing ${type} ${name}`);
        return [row.type, row.name, (row.sql ?? "").replace(/\s+/g, " ").trim()] as const;
      });
      assert.deepStrictEqual(actual, frozenForkSchema);
    }).pipe(Effect.provide(NodeSqliteClient.layer({ filename: ":memory:" }))),
  );

  it.effect("refuses an unrecognized history above 68 before writing anything", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* seedLegacyForkHome;
      yield* sql`INSERT INTO effect_sql_migrations (migration_id, name) VALUES (70, 'Mystery')`;
      const before =
        yield* sql`SELECT migration_id, name FROM effect_sql_migrations ORDER BY migration_id`;
      assert.isTrue((yield* Effect.exit(runMigrations()))._tag === "Failure");
      assert.deepStrictEqual(
        yield* sql`SELECT migration_id, name FROM effect_sql_migrations ORDER BY migration_id`,
        before,
      );
      assert.deepStrictEqual(
        yield* sql`SELECT name FROM sqlite_master WHERE name IN (
          't3_fork_migrations', 't3_fork_migration_reconciliations'
        )`,
        [],
      );
    }).pipe(Effect.provide(NodeSqliteClient.layer({ filename: ":memory:" }))),
  );

  it.effect("refuses a 69-only fork history without rewriting it", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* runMigrations({ toMigrationInclusive: 67 });
      yield* DevelopmentProfilesMigration;
      yield* sql`INSERT INTO effect_sql_migrations (migration_id, name) VALUES (69, 'DevelopmentProfiles')`;
      const before =
        yield* sql`SELECT migration_id, name FROM effect_sql_migrations ORDER BY migration_id`;
      assert.isTrue((yield* Effect.exit(runMigrations()))._tag === "Failure");
      assert.deepStrictEqual(
        yield* sql`SELECT migration_id, name FROM effect_sql_migrations ORDER BY migration_id`,
        before,
      );
    }).pipe(Effect.provide(NodeSqliteClient.layer({ filename: ":memory:" }))),
  );

  it.effect("refuses a legacy history when a fork ledger already has rows", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* seedLegacyForkHome;
      yield* sql`CREATE TABLE t3_fork_migrations (
        migration_id integer PRIMARY KEY NOT NULL,
        created_at datetime NOT NULL DEFAULT current_timestamp,
        name VARCHAR(255) NOT NULL
      )`;
      yield* sql`INSERT INTO t3_fork_migrations (migration_id, name) VALUES (1, 'ProjectRuntime')`;
      const before =
        yield* sql`SELECT migration_id, name FROM effect_sql_migrations ORDER BY migration_id`;
      assert.isTrue((yield* Effect.exit(runMigrations()))._tag === "Failure");
      assert.deepStrictEqual(
        yield* sql`SELECT migration_id, name FROM effect_sql_migrations ORDER BY migration_id`,
        before,
      );
      assert.deepStrictEqual(
        yield* sql`SELECT name FROM sqlite_master WHERE name = 't3_fork_migration_reconciliations'`,
        [],
      );
    }).pipe(Effect.provide(NodeSqliteClient.layer({ filename: ":memory:" }))),
  );

  it.effect("refuses a damaged legacy schema without deleting its history", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* seedLegacyForkHome;
      yield* sql`DROP INDEX project_runtime_tasks_status_idx`;
      const before =
        yield* sql`SELECT migration_id, name FROM effect_sql_migrations ORDER BY migration_id`;
      assert.isTrue((yield* Effect.exit(runMigrations()))._tag === "Failure");
      assert.deepStrictEqual(
        yield* sql`SELECT migration_id, name FROM effect_sql_migrations ORDER BY migration_id`,
        before,
      );
      assert.deepStrictEqual(
        yield* sql`SELECT name FROM sqlite_master WHERE name IN (
          't3_fork_migrations', 't3_fork_migration_reconciliations'
        )`,
        [],
      );
    }).pipe(Effect.provide(NodeSqliteClient.layer({ filename: ":memory:" }))),
  );
});
