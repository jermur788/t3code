import * as Effect from "effect/Effect";
import * as SqlClient from "effect/sql/SqlClient";

/**
 * Profile and project routing are structured JSON. Task routing needs no column
 * because it already lives in `project_runtime_tasks.payload_json`; a null
 * routing value on existing rows means "no routing policy".
 */
const runtimeRoutingSchema = [
  `ALTER TABLE development_profiles ADD COLUMN routing_json TEXT`,

  `CREATE TABLE project_runtime_routing (
    project_id TEXT PRIMARY KEY REFERENCES projection_projects(project_id) ON DELETE CASCADE,
    routing_json TEXT,
    revision INTEGER NOT NULL CHECK (revision >= 1),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  `CREATE TRIGGER project_runtime_routing_project_deleted
    AFTER UPDATE OF deleted_at ON projection_projects
    WHEN NEW.deleted_at IS NOT NULL
    BEGIN
      DELETE FROM project_runtime_routing WHERE project_id = NEW.project_id;
    END`,
] as const;

export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  for (const statement of runtimeRoutingSchema) {
    yield* sql.unsafe(statement).unprepared;
  }
});
