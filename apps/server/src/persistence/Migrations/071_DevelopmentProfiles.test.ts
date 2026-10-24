import { assert, it } from "@effect/vitest";
import * as NodeSqliteClient from "@t3tools/shared/nodeSqliteClient";
import * as Effect from "effect/Effect";
import * as SqlClient from "effect/sql/SqlClient";

import { runMigrations } from "../Migrations.ts";

it.effect(
  "restricts assigned profile deletion, drops assignments on soft deletion, and cascades hard deletion",
  () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* sql`PRAGMA foreign_keys = ON`;
      yield* runMigrations({ toMigrationInclusive: 68 });
      yield* sql`INSERT INTO projection_projects (project_id, title, workspace_root, scripts_json, created_at, updated_at)
        VALUES ('soft', 'Soft project', '/soft', '[]', '2026-10-24T00:00:00.000Z', '2026-10-24T00:00:00.000Z')`;
      yield* sql`INSERT INTO projection_projects (project_id, title, workspace_root, scripts_json, created_at, updated_at)
        VALUES ('hard', 'Hard project', '/hard', '[]', '2026-10-24T00:00:00.000Z', '2026-10-24T00:00:00.000Z')`;
      assert.deepEqual(yield* runMigrations(), [[69, "DevelopmentProfiles"]]);
      assert.deepEqual(yield* runMigrations(), []);

      yield* sql`INSERT INTO development_profiles
        (profile_id, name, instructions, revision, created_at, updated_at, created_by, updated_by)
        VALUES ('profile', 'Policy', 'Instructions', 1, '2026-10-24T00:00:00.000Z', '2026-10-24T00:00:00.000Z', 'user:maintainer', 'user:maintainer')`;
      yield* sql`INSERT INTO project_development_profiles (project_id, profile_id, revision, created_at, updated_at)
        VALUES ('soft', 'profile', 1, '2026-10-24T00:00:00.000Z', '2026-10-24T00:00:00.000Z')`;
      yield* sql`INSERT INTO project_development_profiles (project_id, profile_id, revision, created_at, updated_at)
        VALUES ('hard', 'profile', 1, '2026-10-24T00:00:00.000Z', '2026-10-24T00:00:00.000Z')`;

      // A raw deletion bypasses the service's in-use check and must still be
      // rejected by the foreign key while any project is assigned.
      const restricted =
        yield* sql`DELETE FROM development_profiles WHERE profile_id = 'profile'`.pipe(Effect.flip);
      assert.isDefined(restricted);
      assert.lengthOf(yield* sql`SELECT 1 FROM development_profiles`, 1);
      assert.deepEqual(
        yield* sql`SELECT project_id FROM project_development_profiles ORDER BY project_id`,
        [{ project_id: "hard" }, { project_id: "soft" }],
      );

      yield* sql`UPDATE projection_projects SET deleted_at = '2026-10-24T01:00:00.000Z' WHERE project_id = 'soft'`;
      assert.deepEqual(
        yield* sql`SELECT project_id FROM project_development_profiles ORDER BY project_id`,
        [{ project_id: "hard" }],
      );
      assert.lengthOf(yield* sql`SELECT 1 FROM development_profiles`, 1);

      yield* sql`DELETE FROM projection_projects WHERE project_id = 'hard'`;
      assert.deepEqual(yield* sql`SELECT 1 FROM project_development_profiles`, []);
      assert.lengthOf(yield* sql`SELECT 1 FROM development_profiles`, 1);

      // With no assignments left, deleting the unused profile succeeds.
      yield* sql`DELETE FROM development_profiles WHERE profile_id = 'profile'`;
      assert.deepEqual(yield* sql`SELECT 1 FROM development_profiles`, []);

      yield* sql`INSERT INTO projection_projects (project_id, title, workspace_root, scripts_json, created_at, updated_at)
        VALUES ('unassigned', 'Unassigned project', '/unassigned', '[]', '2026-10-24T00:00:00.000Z', '2026-10-24T00:00:00.000Z')`;
      yield* sql`INSERT INTO project_development_profiles (project_id, profile_id, revision, created_at, updated_at)
        VALUES ('unassigned', NULL, 3, '2026-10-24T00:00:00.000Z', '2026-10-24T02:00:00.000Z')`;
      assert.deepEqual(
        yield* sql`SELECT profile_id, revision FROM project_development_profiles WHERE project_id = 'unassigned'`,
        [{ profile_id: null, revision: 3 }],
      );
      assert.deepEqual(yield* sql`PRAGMA foreign_key_check`, []);
    }).pipe(Effect.provide(NodeSqliteClient.layer({ filename: ":memory:" }))),
);
