import { assert, it } from "@effect/vitest";
import * as NodeSqliteClient from "@t3tools/shared/nodeSqliteClient";
import * as Effect from "effect/Effect";
import * as SqlClient from "effect/sql/SqlClient";

import { runMigrations } from "../../Migrations.ts";
import DevelopmentProfilesMigration from "./002_DevelopmentProfiles.ts";
import ProjectRuntimeMigration from "./001_ProjectRuntime.ts";
import TaskHandoffStateMigration from "./003_TaskHandoffState.ts";

const timestamp = "2026-10-27T00:00:00.000Z";

const seedProject = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`PRAGMA foreign_keys = ON`;
  yield* sql`INSERT INTO projection_projects (project_id, title, workspace_root, scripts_json, created_at, updated_at)
    VALUES ('routing-project', 'Routing', '/routing', '[]', ${timestamp}, ${timestamp})`;
});

const forkSchema = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`PRAGMA foreign_keys = ON`;
  yield* runMigrations({ toMigrationInclusive: 67 });
  yield* ProjectRuntimeMigration;
  yield* DevelopmentProfilesMigration;
  yield* TaskHandoffStateMigration;
  yield* sql`CREATE TABLE t3_fork_migrations (
    migration_id integer PRIMARY KEY NOT NULL,
    created_at datetime NOT NULL DEFAULT current_timestamp,
    name VARCHAR(255) NOT NULL
  )`;
  yield* sql`INSERT INTO t3_fork_migrations (migration_id, name, created_at) VALUES
    (1, 'ProjectRuntime', ${timestamp}),
    (2, 'DevelopmentProfiles', ${timestamp}),
    (3, 'TaskHandoffState', ${timestamp})`;
});

it.effect("adds routing columns and table to a fresh database", () =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* runMigrations();
    const profileColumns = yield* sql<{ readonly name: string }>`
      PRAGMA table_info(development_profiles)`;
    assert.includeMembers(
      profileColumns.map((column) => column.name),
      ["routing_json"],
    );
    const tables = yield* sql<{ readonly name: string }>`
      SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'project_runtime_routing'`;
    assert.deepEqual(tables, [{ name: "project_runtime_routing" }]);
    assert.deepEqual(yield* runMigrations(), []);
  }).pipe(Effect.provide(NodeSqliteClient.layer({ filename: ":memory:" }))),
);

it.effect("preserves existing fork records when migrations 1-3 upgrade", () =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* forkSchema;
    yield* seedProject;
    yield* sql`INSERT INTO development_profiles
      (profile_id, name, instructions, revision, created_at, updated_at, created_by, updated_by)
      VALUES ('profile', 'Policy', 'Instructions', 4, ${timestamp}, ${timestamp}, 'user:test', 'user:test')`;
    yield* sql`INSERT INTO project_development_profiles
      (project_id, profile_id, revision, created_at, updated_at)
      VALUES ('routing-project', 'profile', 2, ${timestamp}, ${timestamp})`;
    yield* sql`INSERT INTO project_runtime
      (project_id, enabled, revision, created_at, updated_at)
      VALUES ('routing-project', 1, 9, ${timestamp}, ${timestamp})`;
    yield* sql`INSERT INTO project_runtime_tasks
      (task_id, project_id, status, revision, created_at, payload_json)
      VALUES ('task', 'routing-project', 'active', 5, ${timestamp}, ${JSON.stringify({
        taskId: "task",
        projectId: "routing-project",
        title: "Ship",
        scope: "Preserve rows",
        owner: "user:test",
        acceptanceCriteria: [],
        status: "active",
        blocker: null,
        verification: { milestone: "none", evidence: [] },
        latestHandoffId: null,
        revision: 5,
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: "user:test",
        updatedBy: "user:test",
      })})`;

    const executed = yield* runMigrations();
    assert.deepEqual(executed, [
      [68, "ShellStopRequestIndex"],
      [69, "ThreadMessageSearch"],
    ]);
    const [profile] = yield* sql`SELECT profile_id, instructions, revision, routing_json
      FROM development_profiles WHERE profile_id = 'profile'`;
    assert.deepEqual(profile, {
      profile_id: "profile",
      instructions: "Instructions",
      revision: 4,
      routing_json: null,
    });
    const [task] = yield* sql`SELECT task_id, revision, payload_json
      FROM project_runtime_tasks WHERE task_id = 'task'`;
    assert.isDefined(task);
    assert.equal(task!.revision, 5);
    assert.isUndefined(JSON.parse(String(task!.payload_json)).routing);
    assert.deepEqual(yield* runMigrations(), []);
  }).pipe(Effect.provide(NodeSqliteClient.layer({ filename: ":memory:" }))),
);

it.effect("adds fork routing schema to a current upstream-origin database", () =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* runMigrations({ toMigrationInclusive: 69 });
    assert.deepEqual(yield* runMigrations(), []);
    const migrations = yield* sql<{ readonly migration_id: number; readonly name: string }>`
      SELECT migration_id, name FROM t3_fork_migrations ORDER BY migration_id`;
    assert.deepEqual(migrations, [
      { migration_id: 1, name: "ProjectRuntime" },
      { migration_id: 2, name: "DevelopmentProfiles" },
      { migration_id: 3, name: "TaskHandoffState" },
      { migration_id: 4, name: "RuntimeRouting" },
      { migration_id: 5, name: "RuntimeExecutionAttempts" },
    ]);
  }).pipe(Effect.provide(NodeSqliteClient.layer({ filename: ":memory:" }))),
);

it.effect("removes project routing with soft-deleted projects", () =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* runMigrations();
    yield* seedProject;
    yield* sql`INSERT INTO project_runtime_routing
      (project_id, routing_json, revision, created_at, updated_at)
      VALUES ('routing-project', NULL, 1, ${timestamp}, ${timestamp})`;
    yield* sql`UPDATE projection_projects SET deleted_at = ${timestamp}
      WHERE project_id = 'routing-project'`;
    assert.deepEqual(yield* sql`SELECT 1 FROM project_runtime_routing`, []);
  }).pipe(Effect.provide(NodeSqliteClient.layer({ filename: ":memory:" }))),
);
