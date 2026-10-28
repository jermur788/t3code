import { assert, it } from "@effect/vitest";
import * as NodeSqliteClient from "@t3tools/shared/nodeSqliteClient";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as SqlClient from "effect/sql/SqlClient";

import { runMigrations } from "../../Migrations.ts";

const timestamp = "2026-10-28T00:00:00.000Z";

const seedRuntimeTask = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`PRAGMA foreign_keys = ON`;
  yield* sql`INSERT INTO projection_projects (project_id, title, workspace_root, scripts_json, created_at, updated_at)
    VALUES ('execution-project', 'Execution', '/execution', '[]', ${timestamp}, ${timestamp})`;
  yield* sql`INSERT INTO project_runtime (project_id, enabled, revision, created_at, updated_at)
    VALUES ('execution-project', 1, 1, ${timestamp}, ${timestamp})`;
  yield* sql`INSERT INTO project_runtime_tasks (task_id, project_id, status, revision, created_at, payload_json)
    VALUES ('task', 'execution-project', 'ready', 1, ${timestamp}, '{}')`;
});

const insertAttempt = (input: {
  readonly attemptId: string;
  readonly status: string;
  readonly threadId: string;
  readonly requestKey?: string;
}) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* sql`INSERT INTO project_runtime_execution_attempts
      (attempt_id, project_id, task_id, status, revision, thread_id, run_id, request_key,
        created_at, updated_at, payload_json)
      VALUES (${input.attemptId}, 'execution-project', 'task', ${input.status}, 1,
        ${input.threadId}, NULL, ${input.requestKey ?? null}, ${timestamp}, ${timestamp}, '{}')`;
  });

it.effect("adds execution attempts with active-task and request-key uniqueness", () =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* runMigrations();
    yield* seedRuntimeTask;

    const tables = yield* sql<{ readonly name: string }>`
      SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'project_runtime_execution_attempts'`;
    assert.deepEqual(tables, [{ name: "project_runtime_execution_attempts" }]);

    yield* insertAttempt({ attemptId: "attempt-1", status: "pending", threadId: "thread-1" });
    const secondActive = yield* insertAttempt({
      attemptId: "attempt-2",
      status: "launched",
      threadId: "thread-2",
    }).pipe(Effect.exit);
    assert.isTrue(Exit.isFailure(secondActive));

    yield* sql`UPDATE project_runtime_execution_attempts SET status = 'failed' WHERE attempt_id = 'attempt-1'`;
    yield* insertAttempt({ attemptId: "attempt-2", status: "launched", threadId: "thread-2" });

    yield* sql`UPDATE project_runtime_execution_attempts SET status = 'failed'`;
    yield* insertAttempt({
      attemptId: "attempt-3",
      status: "failed",
      threadId: "thread-3",
      requestKey: "request-1",
    });
    const duplicateRequest = yield* insertAttempt({
      attemptId: "attempt-4",
      status: "failed",
      threadId: "thread-4",
      requestKey: "request-1",
    }).pipe(Effect.exit);
    assert.isTrue(Exit.isFailure(duplicateRequest));

    yield* sql`DELETE FROM project_runtime_tasks WHERE task_id = 'task'`;
    assert.deepEqual(yield* sql`SELECT 1 FROM project_runtime_execution_attempts`, []);
  }).pipe(Effect.provide(NodeSqliteClient.layer({ filename: ":memory:" }))),
);

it.effect("cascades execution attempts when a project is soft-deleted", () =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* runMigrations();
    yield* seedRuntimeTask;
    yield* insertAttempt({ attemptId: "attempt", status: "pending", threadId: "thread" });
    yield* sql`UPDATE projection_projects SET deleted_at = ${timestamp}
      WHERE project_id = 'execution-project'`;
    assert.deepEqual(yield* sql`SELECT 1 FROM project_runtime_execution_attempts`, []);
  }).pipe(Effect.provide(NodeSqliteClient.layer({ filename: ":memory:" }))),
);
