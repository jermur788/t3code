import { assert, it } from "@effect/vitest";
import * as NodeSqliteClient from "@t3tools/shared/nodeSqliteClient";
import * as Effect from "effect/Effect";
import * as SqlClient from "effect/sql/SqlClient";

import { FORK_MIGRATION_TABLE } from "../../ForkMigrations.ts";
import { runMigrations } from "../../Migrations.ts";

const timestamp = "2026-10-28T00:00:00.000Z";

const seedRuntime = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`PRAGMA foreign_keys = ON`;
  yield* sql`INSERT INTO projection_projects
    (project_id, title, workspace_root, scripts_json, created_at, updated_at)
    VALUES ('p', 'P', '/p', '[]', ${timestamp}, ${timestamp})`;
  yield* sql`INSERT INTO project_runtime
    (project_id, enabled, revision, created_at, updated_at)
    VALUES ('p', 1, 7, ${timestamp}, ${timestamp})`;
  yield* sql`INSERT INTO project_runtime_tasks
    (task_id, project_id, status, revision, created_at, payload_json)
    VALUES ('t', 'p', 'ready', 3, ${timestamp}, '{}')`;
});

it.effect("registers adaptive routing as fork migration 7 on a fresh database", () =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* runMigrations();
    assert.deepStrictEqual(
      yield* sql`SELECT migration_id, name FROM ${sql(FORK_MIGRATION_TABLE)}
        WHERE migration_id = 7`,
      [{ migration_id: 7, name: "AdaptiveRouting" }],
    );
    const tables = yield* sql<{ readonly name: string }>`
      SELECT name FROM sqlite_master
      WHERE type = 'table' AND name LIKE 'adaptive_%'
      ORDER BY name`;
    assert.deepStrictEqual(
      tables.map((row) => row.name),
      [
        "adaptive_accepted_outcomes",
        "adaptive_capacity_pools",
        "adaptive_capacity_reset_events",
        "adaptive_capacity_snapshots",
        "adaptive_difficulty_predictions",
        "adaptive_execution_observations",
        "adaptive_experiment_assignments",
        "adaptive_outcome_reconciliations",
        "adaptive_realized_difficulties",
        "adaptive_recommendation_receipts",
      ],
    );
  }).pipe(Effect.provide(NodeSqliteClient.layer({ filename: ":memory:" }))),
);

it.effect("adaptive deletion never deletes Runtime truth", () =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* runMigrations();
    yield* seedRuntime;

    yield* sql`INSERT INTO adaptive_difficulty_predictions
      (prediction_id, project_id, task_id, created_at, payload_json)
      VALUES ('prediction', 'p', 't', ${timestamp}, '{}')`;
    yield* sql`INSERT INTO adaptive_accepted_outcomes
      (outcome_id, project_id, task_id, state, revision, reconciled_at, payload_json)
      VALUES ('outcome', 'p', 't', 'unresolved', 1, ${timestamp}, '{}')`;
    yield* sql`INSERT INTO adaptive_capacity_pools
      (capacity_pool_id, provider_driver, provider_instance_id, created_at, payload_json)
      VALUES ('pool', 'codex', NULL, ${timestamp}, '{}')`;
    yield* sql`INSERT INTO adaptive_capacity_snapshots
      (snapshot_id, capacity_pool_id, observed_at, payload_json)
      VALUES ('snapshot', 'pool', ${timestamp}, '{}')`;

    yield* sql`DELETE FROM adaptive_difficulty_predictions WHERE prediction_id = 'prediction'`;
    yield* sql`DELETE FROM adaptive_accepted_outcomes WHERE outcome_id = 'outcome'`;
    yield* sql`DELETE FROM adaptive_capacity_pools WHERE capacity_pool_id = 'pool'`;

    assert.deepStrictEqual(
      yield* sql`SELECT project_id, enabled, revision FROM project_runtime WHERE project_id = 'p'`,
      [{ project_id: "p", enabled: 1, revision: 7 }],
    );
    assert.deepStrictEqual(
      yield* sql`SELECT task_id, project_id, status, revision FROM project_runtime_tasks WHERE task_id = 't'`,
      [{ task_id: "t", project_id: "p", status: "ready", revision: 3 }],
    );
    assert.lengthOf(
      yield* sql`SELECT 1 FROM adaptive_capacity_snapshots WHERE snapshot_id = 'snapshot'`,
      0,
    );
  }).pipe(Effect.provide(NodeSqliteClient.layer({ filename: ":memory:" }))),
);

it.effect("deleting Runtime task truth cascades only its dependent adaptive rows", () =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* runMigrations();
    yield* seedRuntime;

    yield* sql`INSERT INTO adaptive_difficulty_predictions
      (prediction_id, project_id, task_id, created_at, payload_json)
      VALUES ('prediction', 'p', 't', ${timestamp}, '{}')`;
    yield* sql`INSERT INTO adaptive_realized_difficulties
      (realized_difficulty_id, project_id, task_id, created_at, payload_json)
      VALUES ('realized', 'p', 't', ${timestamp}, '{}')`;
    yield* sql`INSERT INTO adaptive_capacity_pools
      (capacity_pool_id, provider_driver, provider_instance_id, created_at, payload_json)
      VALUES ('pool', 'codex', NULL, ${timestamp}, '{}')`;

    yield* sql`DELETE FROM project_runtime_tasks WHERE task_id = 't'`;

    assert.lengthOf(
      yield* sql`SELECT 1 FROM adaptive_difficulty_predictions WHERE prediction_id = 'prediction'`,
      0,
    );
    assert.lengthOf(
      yield* sql`SELECT 1 FROM adaptive_realized_difficulties WHERE realized_difficulty_id = 'realized'`,
      0,
    );
    assert.lengthOf(
      yield* sql`SELECT 1 FROM adaptive_capacity_pools WHERE capacity_pool_id = 'pool'`,
      1,
    );
    assert.deepStrictEqual(
      yield* sql`SELECT project_id, enabled, revision FROM project_runtime WHERE project_id = 'p'`,
      [{ project_id: "p", enabled: 1, revision: 7 }],
    );
  }).pipe(Effect.provide(NodeSqliteClient.layer({ filename: ":memory:" }))),
);
