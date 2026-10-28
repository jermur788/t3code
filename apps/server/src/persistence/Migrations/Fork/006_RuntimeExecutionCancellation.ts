import * as Effect from "effect/Effect";
import * as SqlClient from "effect/sql/SqlClient";

/**
 * A cancellation in flight still owns the task's active execution slot. SQLite
 * cannot alter a partial index in place, so replace the active index once.
 */
const runtimeExecutionCancellationSchema = [
  `DROP INDEX project_runtime_execution_attempts_active_task_idx`,
  `CREATE UNIQUE INDEX project_runtime_execution_attempts_active_task_idx
    ON project_runtime_execution_attempts(project_id, task_id)
    WHERE status IN ('pending', 'launched', 'cancelling', 'reconcile_required')`,
] as const;

export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  for (const statement of runtimeExecutionCancellationSchema) {
    yield* sql.unsafe(statement).unprepared;
  }
});
