import * as Effect from "effect/Effect";
import * as SqlClient from "effect/sql/SqlClient";

export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  yield* sql`ALTER TABLE scheduled_tasks ADD COLUMN thread_mode TEXT NOT NULL DEFAULT 'new_thread'`;
  // An empty thread_id references no thread; keep it new_thread like NULL.
  yield* sql`UPDATE scheduled_tasks SET thread_mode = 'continue' WHERE thread_id IS NOT NULL AND thread_id <> ''`;
});
