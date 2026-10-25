import * as Effect from "effect/Effect";
import * as SqlClient from "effect/sql/SqlClient";

export const developmentProfilesSchema = [
  `CREATE TABLE development_profiles (
    profile_id TEXT PRIMARY KEY,
    name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
    instructions TEXT NOT NULL CHECK (length(instructions) <= 32000),
    revision INTEGER NOT NULL CHECK (revision >= 1),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    created_by TEXT NOT NULL CHECK (length(created_by) BETWEEN 1 AND 200),
    updated_by TEXT NOT NULL CHECK (length(updated_by) BETWEEN 1 AND 200)
  )`,

  `CREATE INDEX development_profiles_created_idx
    ON development_profiles(created_at, profile_id)`,

  `CREATE TABLE project_development_profiles (
    project_id TEXT PRIMARY KEY REFERENCES projection_projects(project_id) ON DELETE CASCADE,
    profile_id TEXT REFERENCES development_profiles(profile_id) ON DELETE RESTRICT,
    revision INTEGER NOT NULL CHECK (revision >= 1),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  `CREATE INDEX project_development_profiles_profile_idx
    ON project_development_profiles(profile_id)`,

  `CREATE TRIGGER project_development_profiles_project_deleted
    AFTER UPDATE OF deleted_at ON projection_projects
    WHEN NEW.deleted_at IS NOT NULL
    BEGIN
      DELETE FROM project_development_profiles WHERE project_id = NEW.project_id;
    END`,
] as const;

export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  for (const statement of developmentProfilesSchema) {
    yield* sql.unsafe(statement).unprepared;
  }
});
