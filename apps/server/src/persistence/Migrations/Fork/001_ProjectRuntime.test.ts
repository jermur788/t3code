import { assert, it } from "@effect/vitest";
import * as NodeSqliteClient from "@t3tools/shared/nodeSqliteClient";
import * as Effect from "effect/Effect";
import * as SqlClient from "effect/sql/SqlClient";

import { runMigrations } from "../../Migrations.ts";

it.effect(
  "upgrades existing projects, cascades hard deletion, and leaves no source-body column",
  () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* sql`PRAGMA foreign_keys = ON`;
      yield* runMigrations({ toMigrationInclusive: 69 });
      yield* sql`INSERT INTO projection_projects (project_id, title, workspace_root, scripts_json, created_at, updated_at)
      VALUES ('existing', 'Existing project', '/existing', '[]', '2026-10-23T00:00:00.000Z', '2026-10-23T00:00:00.000Z')`;
      assert.deepEqual(yield* runMigrations(), []);
      assert.deepEqual(yield* runMigrations(), []);
      assert.deepEqual(
        yield* sql`SELECT migration_id, name FROM t3_fork_migrations ORDER BY migration_id`,
        [
          { migration_id: 1, name: "ProjectRuntime" },
          { migration_id: 2, name: "DevelopmentProfiles" },
          { migration_id: 3, name: "TaskHandoffState" },
          { migration_id: 4, name: "RuntimeRouting" },
          { migration_id: 5, name: "RuntimeExecutionAttempts" },
          { migration_id: 6, name: "RuntimeExecutionCancellation" },
          { migration_id: 7, name: "AdaptiveRouting" },
        ],
      );
      const projects = yield* sql<{
        readonly title: string;
      }>`SELECT title FROM projection_projects WHERE project_id = 'existing'`;
      assert.equal(projects[0]?.title, "Existing project");
      assert.deepEqual(yield* sql`SELECT 1 FROM project_runtime`, []);
      yield* sql`INSERT INTO project_runtime (project_id, enabled, revision, created_at, updated_at) VALUES ('existing', 1, 1, '2026-10-23T00:00:00.000Z', '2026-10-23T00:00:00.000Z')`;
      yield* sql`INSERT INTO project_runtime_sources (source_id, project_id, revision, created_at, payload_json) VALUES ('source', 'existing', 1, '2026-10-23T00:00:00.000Z', '{}')`;
      yield* sql`INSERT INTO project_runtime_tasks (task_id, project_id, status, revision, created_at, payload_json) VALUES ('task', 'existing', 'planned', 1, '2026-10-23T00:00:00.000Z', '{}')`;
      yield* sql`INSERT INTO project_runtime_handoffs (handoff_id, project_id, task_id, created_at, payload_json) VALUES ('handoff', 'existing', 'task', '2026-10-23T00:00:00.000Z', '{}')`;
      const columns = yield* sql<{
        readonly name: string;
      }>`PRAGMA table_info(project_runtime_sources)`;
      assert.deepEqual(
        columns.map((column) => column.name),
        ["source_id", "project_id", "revision", "created_at", "payload_json"],
      );
      yield* sql`DELETE FROM projection_projects WHERE project_id = 'existing'`;
      for (const table of [
        "project_runtime",
        "project_runtime_sources",
        "project_runtime_tasks",
        "project_runtime_handoffs",
      ]) {
        assert.deepEqual(yield* sql`SELECT 1 FROM ${sql(table)}`, []);
      }
      assert.deepEqual(yield* sql`PRAGMA foreign_key_check`, []);
    }).pipe(Effect.provide(NodeSqliteClient.layer({ filename: ":memory:" }))),
);
