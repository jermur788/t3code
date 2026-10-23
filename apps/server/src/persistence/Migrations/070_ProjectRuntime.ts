import * as Effect from "effect/Effect";
import * as SqlClient from "effect/sql/SqlClient";

export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`CREATE TABLE project_runtime (
    project_id TEXT PRIMARY KEY REFERENCES projection_projects(project_id) ON DELETE CASCADE,
    enabled INTEGER NOT NULL CHECK (enabled IN (0, 1)),
    revision INTEGER NOT NULL CHECK (revision >= 0),
    instructions_json TEXT,
    instructions_revision INTEGER NOT NULL DEFAULT 0 CHECK (instructions_revision >= 0),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`;
  // Projects are soft-deleted. Run cleanup in the event sink's existing commit
  // transaction, before it publishes the deletion; FK cascades handle the children.
  yield* sql`CREATE TRIGGER project_runtime_project_deleted
    AFTER UPDATE OF deleted_at ON projection_projects
    WHEN NEW.deleted_at IS NOT NULL
    BEGIN
      DELETE FROM project_runtime WHERE project_id = NEW.project_id;
    END`;
  yield* sql`CREATE TABLE project_runtime_sources (
    source_id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES project_runtime(project_id) ON DELETE CASCADE,
    revision INTEGER NOT NULL CHECK (revision >= 1),
    created_at TEXT NOT NULL,
    payload_json TEXT NOT NULL
  )`;
  yield* sql`CREATE INDEX project_runtime_sources_project_idx
    ON project_runtime_sources(project_id, created_at, source_id)`;
  yield* sql`CREATE TABLE project_runtime_tasks (
    task_id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES project_runtime(project_id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    revision INTEGER NOT NULL CHECK (revision >= 1),
    created_at TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    UNIQUE (project_id, task_id)
  )`;
  yield* sql`CREATE INDEX project_runtime_tasks_project_idx
    ON project_runtime_tasks(project_id, created_at, task_id)`;
  yield* sql`CREATE INDEX project_runtime_tasks_status_idx
    ON project_runtime_tasks(project_id, status, created_at, task_id)`;
  yield* sql`CREATE TABLE project_runtime_handoffs (
    handoff_id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES project_runtime(project_id) ON DELETE CASCADE,
    task_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    FOREIGN KEY (project_id, task_id)
      REFERENCES project_runtime_tasks(project_id, task_id) ON DELETE CASCADE
  )`;
  yield* sql`CREATE INDEX project_runtime_handoffs_project_idx
    ON project_runtime_handoffs(project_id, created_at, handoff_id)`;
  yield* sql`CREATE INDEX project_runtime_handoffs_task_idx
    ON project_runtime_handoffs(project_id, task_id, created_at, handoff_id)`;
});
