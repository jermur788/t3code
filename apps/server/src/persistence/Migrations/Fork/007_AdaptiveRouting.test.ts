import { assert, it } from "@effect/vitest";
import * as NodeSqliteClient from "@t3tools/shared/nodeSqliteClient";
import * as Effect from "effect/Effect";
import * as SqlClient from "effect/sql/SqlClient";

import { FORK_MIGRATION_TABLE, forkMigrationManifest } from "../../ForkMigrations.ts";
import { runMigrations } from "../../Migrations.ts";
import ProjectRuntime from "./001_ProjectRuntime.ts";
import DevelopmentProfiles from "./002_DevelopmentProfiles.ts";
import TaskHandoffState from "./003_TaskHandoffState.ts";
import RuntimeRouting from "./004_RuntimeRouting.ts";
import RuntimeExecutionAttempts from "./005_RuntimeExecutionAttempts.ts";
import RuntimeExecutionCancellation from "./006_RuntimeExecutionCancellation.ts";

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

const insertTask = (taskId: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* sql`INSERT INTO project_runtime_tasks
      (task_id, project_id, status, revision, created_at, payload_json)
      VALUES (${taskId}, 'p', 'ready', 1, ${timestamp}, '{}')`;
  });

const insertAttempt = (attemptId: string, taskId: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* sql`INSERT INTO project_runtime_execution_attempts
      (attempt_id, project_id, task_id, status, revision, thread_id, run_id, request_key,
        created_at, updated_at, payload_json)
      VALUES (${attemptId}, 'p', ${taskId}, 'failed', 1, ${`thread-${attemptId}`}, NULL, NULL,
        ${timestamp}, ${timestamp}, '{}')`;
  });

const insertPrediction = (predictionId: string, taskId: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* sql`INSERT INTO adaptive_difficulty_predictions
      (prediction_id, project_id, task_id, created_at, payload_json)
      VALUES (${predictionId}, 'p', ${taskId}, ${timestamp}, '{}')`;
  });

const insertObservation = (input: {
  readonly observationId: string;
  readonly taskId: string;
  readonly attemptId: string;
  readonly predictionId: string;
}) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* sql`INSERT INTO adaptive_execution_observations
      (observation_id, project_id, task_id, attempt_id, prediction_id, created_at, payload_json)
      VALUES (${input.observationId}, 'p', ${input.taskId}, ${input.attemptId},
        ${input.predictionId}, ${timestamp}, '{}')`;
  });

const insertReceipt = (receiptId: string, taskId: string, predictionId: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* sql`INSERT INTO adaptive_recommendation_receipts
      (recommendation_receipt_id, project_id, task_id, prediction_id, created_at, payload_json)
      VALUES (${receiptId}, 'p', ${taskId}, ${predictionId}, ${timestamp}, '{}')`;
  });

// Task "t" is the seeded task; "task-b" and "task-c" are other tasks in the same project.
const seedCrossTaskRuntime = Effect.gen(function* () {
  yield* seedRuntime;
  yield* insertTask("task-b");
  yield* insertTask("task-c");
  yield* insertAttempt("attempt-t", "t");
  yield* insertAttempt("attempt-b", "task-b");
  yield* insertPrediction("prediction-t", "t");
  yield* insertPrediction("prediction-b", "task-b");
  yield* insertPrediction("prediction-c", "task-c");
});

const assertForeignKeyRejection = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.gen(function* () {
    const failure = yield* Effect.flip(effect);
    const detail = JSON.stringify(failure, Object.getOwnPropertyNames(failure));
    assert.include(
      detail,
      "FOREIGN KEY constraint failed",
      `expected a foreign key rejection, got ${detail}`,
    );
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
    yield* sql`INSERT INTO project_runtime_handoffs
      (handoff_id, project_id, task_id, created_at, payload_json)
      VALUES ('handoff', 'p', 't', ${timestamp}, '{"summary":"authoritative"}')`;
    yield* insertAttempt("attempt", "t");

    yield* insertPrediction("prediction", "t");
    yield* insertReceipt("receipt", "t", "prediction");
    yield* insertObservation({
      observationId: "observation",
      taskId: "t",
      attemptId: "attempt",
      predictionId: "prediction",
    });
    yield* sql`INSERT INTO adaptive_realized_difficulties
      (realized_difficulty_id, project_id, task_id, created_at, payload_json)
      VALUES ('realized', 'p', 't', ${timestamp}, '{}')`;
    yield* sql`INSERT INTO adaptive_experiment_assignments
      (assignment_id, project_id, task_id, created_at, payload_json)
      VALUES ('assignment', 'p', 't', ${timestamp}, '{}')`;
    yield* sql`INSERT INTO adaptive_accepted_outcomes
      (outcome_id, project_id, task_id, state, revision, reconciled_at, payload_json)
      VALUES ('outcome', 'p', 't', 'unresolved', 1, ${timestamp}, '{}')`;
    yield* sql`INSERT INTO adaptive_capacity_pools
      (capacity_pool_id, provider_driver, provider_instance_id, created_at, payload_json)
      VALUES ('pool', 'codex', NULL, ${timestamp}, '{}')`;
    yield* sql`INSERT INTO adaptive_capacity_snapshots
      (snapshot_id, capacity_pool_id, observed_at, payload_json)
      VALUES ('snapshot', 'pool', ${timestamp}, '{}')`;

    const runtimeBefore = {
      project: yield* sql`SELECT * FROM project_runtime`,
      task: yield* sql`SELECT * FROM project_runtime_tasks`,
      handoff: yield* sql`SELECT * FROM project_runtime_handoffs`,
      attempt: yield* sql`SELECT * FROM project_runtime_execution_attempts`,
    };

    yield* sql`DELETE FROM adaptive_execution_observations`;
    yield* sql`DELETE FROM adaptive_recommendation_receipts`;
    yield* sql`DELETE FROM adaptive_difficulty_predictions`;
    yield* sql`DELETE FROM adaptive_realized_difficulties`;
    yield* sql`DELETE FROM adaptive_experiment_assignments`;
    yield* sql`DELETE FROM adaptive_accepted_outcomes`;
    yield* sql`DELETE FROM adaptive_capacity_pools`;

    assert.deepStrictEqual(yield* sql`SELECT * FROM project_runtime`, runtimeBefore.project);
    assert.deepStrictEqual(yield* sql`SELECT * FROM project_runtime_tasks`, runtimeBefore.task);
    assert.deepStrictEqual(
      yield* sql`SELECT * FROM project_runtime_handoffs`,
      runtimeBefore.handoff,
    );
    assert.deepStrictEqual(
      yield* sql`SELECT * FROM project_runtime_execution_attempts`,
      runtimeBefore.attempt,
    );
    assert.lengthOf(runtimeBefore.project, 1);
    assert.lengthOf(runtimeBefore.task, 1);
    assert.lengthOf(runtimeBefore.handoff, 1);
    assert.lengthOf(runtimeBefore.attempt, 1);
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

it.effect("rejects an observation whose attempt belongs to a different task", () =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* runMigrations();
    yield* seedCrossTaskRuntime;

    yield* assertForeignKeyRejection(
      insertObservation({
        observationId: "observation-mismatch",
        taskId: "t",
        attemptId: "attempt-b",
        predictionId: "prediction-t",
      }),
    );
    assert.lengthOf(yield* sql`SELECT 1 FROM adaptive_execution_observations`, 0);
  }).pipe(Effect.provide(NodeSqliteClient.layer({ filename: ":memory:" }))),
);

it.effect("rejects an observation whose prediction belongs to a different task", () =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* runMigrations();
    yield* seedCrossTaskRuntime;

    yield* assertForeignKeyRejection(
      insertObservation({
        observationId: "observation-mismatch",
        taskId: "t",
        attemptId: "attempt-t",
        predictionId: "prediction-b",
      }),
    );
    assert.lengthOf(yield* sql`SELECT 1 FROM adaptive_execution_observations`, 0);
  }).pipe(Effect.provide(NodeSqliteClient.layer({ filename: ":memory:" }))),
);

it.effect("rejects an observation whose attempt and prediction belong to two other tasks", () =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* runMigrations();
    yield* seedCrossTaskRuntime;

    yield* assertForeignKeyRejection(
      insertObservation({
        observationId: "observation-mismatch",
        taskId: "t",
        attemptId: "attempt-b",
        predictionId: "prediction-c",
      }),
    );
    assert.lengthOf(yield* sql`SELECT 1 FROM adaptive_execution_observations`, 0);
  }).pipe(Effect.provide(NodeSqliteClient.layer({ filename: ":memory:" }))),
);

it.effect("rejects a recommendation receipt whose prediction belongs to a different task", () =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* runMigrations();
    yield* seedCrossTaskRuntime;

    yield* assertForeignKeyRejection(insertReceipt("receipt-mismatch", "t", "prediction-b"));
    assert.lengthOf(yield* sql`SELECT 1 FROM adaptive_recommendation_receipts`, 0);
  }).pipe(Effect.provide(NodeSqliteClient.layer({ filename: ":memory:" }))),
);

it.effect("persists observations and receipts whose identities all belong to one task", () =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* runMigrations();
    yield* seedCrossTaskRuntime;

    yield* insertObservation({
      observationId: "observation-t",
      taskId: "t",
      attemptId: "attempt-t",
      predictionId: "prediction-t",
    });
    yield* insertObservation({
      observationId: "observation-b",
      taskId: "task-b",
      attemptId: "attempt-b",
      predictionId: "prediction-b",
    });
    yield* insertReceipt("receipt-t", "t", "prediction-t");
    yield* insertReceipt("receipt-b", "task-b", "prediction-b");

    assert.deepStrictEqual(
      yield* sql`SELECT observation_id, task_id, attempt_id, prediction_id
        FROM adaptive_execution_observations ORDER BY observation_id`,
      [
        {
          observation_id: "observation-b",
          task_id: "task-b",
          attempt_id: "attempt-b",
          prediction_id: "prediction-b",
        },
        {
          observation_id: "observation-t",
          task_id: "t",
          attempt_id: "attempt-t",
          prediction_id: "prediction-t",
        },
      ],
    );
    assert.deepStrictEqual(
      yield* sql`SELECT recommendation_receipt_id, task_id, prediction_id
        FROM adaptive_recommendation_receipts ORDER BY recommendation_receipt_id`,
      [
        {
          recommendation_receipt_id: "receipt-b",
          task_id: "task-b",
          prediction_id: "prediction-b",
        },
        { recommendation_receipt_id: "receipt-t", task_id: "t", prediction_id: "prediction-t" },
      ],
    );
  }).pipe(Effect.provide(NodeSqliteClient.layer({ filename: ":memory:" }))),
);

it.effect("keeps a historical execution attempt valid across migration 007 with no telemetry", () =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* sql`PRAGMA foreign_keys = ON`;

    // A home that already shipped fork migrations 1-6 and holds a real attempt.
    yield* runMigrations({ toMigrationInclusive: 69 });
    yield* ProjectRuntime;
    yield* DevelopmentProfiles;
    yield* TaskHandoffState;
    yield* RuntimeRouting;
    yield* RuntimeExecutionAttempts;
    yield* RuntimeExecutionCancellation;
    yield* sql`CREATE TABLE ${sql(FORK_MIGRATION_TABLE)} (
      migration_id integer PRIMARY KEY NOT NULL,
      created_at datetime NOT NULL DEFAULT current_timestamp,
      name VARCHAR(255) NOT NULL
    )`;
    for (const [id, name] of forkMigrationManifest.filter(([id]) => id <= 6)) {
      yield* sql`INSERT INTO ${sql(FORK_MIGRATION_TABLE)} (migration_id, name)
        VALUES (${id}, ${name})`;
    }
    yield* seedRuntime;
    yield* insertAttempt("historical-attempt", "t");
    const attemptBefore = yield* sql`SELECT * FROM project_runtime_execution_attempts`;
    const taskBefore = yield* sql`SELECT * FROM project_runtime_tasks`;
    assert.lengthOf(attemptBefore, 1);

    assert.lengthOf(
      yield* sql`SELECT 1 FROM ${sql(FORK_MIGRATION_TABLE)} WHERE migration_id = 7`,
      0,
    );
    yield* runMigrations();
    assert.deepStrictEqual(
      yield* sql`SELECT migration_id, name FROM ${sql(FORK_MIGRATION_TABLE)}
        WHERE migration_id = 7`,
      [{ migration_id: 7, name: "AdaptiveRouting" }],
    );

    assert.deepStrictEqual(
      yield* sql`SELECT * FROM project_runtime_execution_attempts`,
      attemptBefore,
    );
    assert.deepStrictEqual(yield* sql`SELECT * FROM project_runtime_tasks`, taskBefore);
    assert.lengthOf(yield* sql`SELECT 1 FROM adaptive_execution_observations`, 0);

    // Later telemetry can still be attached to the historical attempt.
    yield* insertPrediction("prediction-t", "t");
    yield* insertObservation({
      observationId: "late-observation",
      taskId: "t",
      attemptId: "historical-attempt",
      predictionId: "prediction-t",
    });
    assert.lengthOf(yield* sql`SELECT 1 FROM adaptive_execution_observations`, 1);
  }).pipe(Effect.provide(NodeSqliteClient.layer({ filename: ":memory:" }))),
);
