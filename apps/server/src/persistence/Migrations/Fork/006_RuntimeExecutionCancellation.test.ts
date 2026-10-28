import { assert, it } from "@effect/vitest";
import * as NodeSqliteClient from "@t3tools/shared/nodeSqliteClient";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as SqlClient from "effect/sql/SqlClient";

import { runMigrations } from "../../Migrations.ts";

const timestamp = "2026-10-28T00:00:00.000Z";

const seed = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`PRAGMA foreign_keys = ON`;
  yield* sql`INSERT INTO projection_projects (project_id, title, workspace_root, scripts_json, created_at, updated_at)
    VALUES ('p', 'P', '/p', '[]', ${timestamp}, ${timestamp})`;
  yield* sql`INSERT INTO project_runtime (project_id, enabled, revision, created_at, updated_at)
    VALUES ('p', 1, 1, ${timestamp}, ${timestamp})`;
  yield* sql`INSERT INTO project_runtime_tasks (task_id, project_id, status, revision, created_at, payload_json)
    VALUES ('t', 'p', 'ready', 1, ${timestamp}, '{}')`;
});

const insert = (id: string, status: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* sql`INSERT INTO project_runtime_execution_attempts
      (attempt_id, project_id, task_id, status, revision, thread_id, created_at, updated_at, payload_json)
      VALUES (${id}, 'p', 't', ${status}, 1, ${`thread-${id}`}, ${timestamp}, ${timestamp}, '{}')`;
  });

it.effect("keeps a cancelling attempt in the active task slot", () =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* runMigrations();
    yield* seed;
    const indexes = yield* sql<{ readonly sql: string }>`
      SELECT sql FROM sqlite_master WHERE type = 'index' AND name = 'project_runtime_execution_attempts_active_task_idx'`;
    assert.include(indexes[0]?.sql ?? "", "cancelling");

    yield* insert("one", "pending");
    yield* sql`UPDATE project_runtime_execution_attempts SET status = 'cancelling' WHERE attempt_id = 'one'`;
    const blocked = yield* insert("two", "launched").pipe(Effect.exit);
    assert.isTrue(Exit.isFailure(blocked));

    yield* sql`UPDATE project_runtime_execution_attempts SET status = 'cancelled' WHERE attempt_id = 'one'`;
    yield* insert("two", "launched");
    assert.equal(
      (yield* sql<{
        count: number;
      }>`SELECT COUNT(*) AS count FROM project_runtime_execution_attempts`)[0]?.count,
      2,
    );
  }).pipe(Effect.provide(NodeSqliteClient.layer({ filename: ":memory:" }))),
);
