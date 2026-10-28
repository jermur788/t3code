import * as Effect from "effect/Effect";
import * as SqlClient from "effect/sql/SqlClient";

/**
 * An execution attempt is persisted before its launch commands. The thread and
 * command ids are deterministic, so a retry or a later recovery pass can replay
 * the same launch without creating a second worker.
 */
const runtimeExecutionSchema = [
  `CREATE TABLE project_runtime_execution_attempts (
    attempt_id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    task_id TEXT NOT NULL,
    status TEXT NOT NULL,
    revision INTEGER NOT NULL CHECK (revision >= 1),
    thread_id TEXT NOT NULL UNIQUE,
    run_id TEXT,
    request_key TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    FOREIGN KEY (project_id, task_id)
      REFERENCES project_runtime_tasks(project_id, task_id) ON DELETE CASCADE
  )`,

  `CREATE INDEX project_runtime_execution_attempts_task_idx
    ON project_runtime_execution_attempts(project_id, task_id, created_at, attempt_id)`,

  `CREATE UNIQUE INDEX project_runtime_execution_attempts_active_task_idx
    ON project_runtime_execution_attempts(project_id, task_id)
    WHERE status IN ('pending', 'launched', 'reconcile_required')`,

  `CREATE UNIQUE INDEX project_runtime_execution_attempts_request_key_idx
    ON project_runtime_execution_attempts(project_id, task_id, request_key)
    WHERE request_key IS NOT NULL`,
] as const;

export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  for (const statement of runtimeExecutionSchema) {
    yield* sql.unsafe(statement).unprepared;
  }
});
