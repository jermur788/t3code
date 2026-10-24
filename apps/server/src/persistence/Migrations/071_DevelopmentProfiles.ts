import * as Effect from "effect/Effect";
import * as SqlClient from "effect/sql/SqlClient";

export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`CREATE TABLE development_profiles (
    profile_id TEXT PRIMARY KEY,
    name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
    instructions TEXT NOT NULL CHECK (length(instructions) <= 32000),
    revision INTEGER NOT NULL CHECK (revision >= 1),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    created_by TEXT NOT NULL CHECK (length(created_by) BETWEEN 1 AND 200),
    updated_by TEXT NOT NULL CHECK (length(updated_by) BETWEEN 1 AND 200)
  )`;
  yield* sql`CREATE INDEX development_profiles_created_idx
    ON development_profiles(created_at, profile_id)`;
  // An unassignment keeps the row with a null profile_id so its revision still
  // rejects stale compare-and-set writes. RESTRICT backs the service's in-use
  // check so a bypassed delete cannot silently strip an assigned profile.
  yield* sql`CREATE TABLE project_development_profiles (
    project_id TEXT PRIMARY KEY REFERENCES projection_projects(project_id) ON DELETE CASCADE,
    profile_id TEXT REFERENCES development_profiles(profile_id) ON DELETE RESTRICT,
    revision INTEGER NOT NULL CHECK (revision >= 1),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`;
  yield* sql`CREATE INDEX project_development_profiles_profile_idx
    ON project_development_profiles(profile_id)`;
  // Projects are soft-deleted. Remove only the assignment so the profile stays
  // available; FK cascades handle a later hard delete of the project.
  yield* sql`CREATE TRIGGER project_development_profiles_project_deleted
    AFTER UPDATE OF deleted_at ON projection_projects
    WHEN NEW.deleted_at IS NOT NULL
    BEGIN
      DELETE FROM project_development_profiles WHERE project_id = NEW.project_id;
    END`;
});
