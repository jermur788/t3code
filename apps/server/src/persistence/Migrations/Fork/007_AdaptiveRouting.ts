import * as Effect from "effect/Effect";
import * as SqlClient from "effect/sql/SqlClient";

/**
 * Adaptive Model Routing is an observation layer beside Project Runtime. Raw
 * observations are append-only by service contract. Only the accepted-outcome
 * head is mutable, with revision/CAS and append-only reconciliation history.
 *
 * Project-scoped adaptive rows reference Runtime truth and cascade only when
 * that Runtime truth itself is deleted. Deleting adaptive rows never reaches
 * Runtime tables. Capacity pools are environment-scoped and intentionally have
 * no project foreign key.
 */
export const adaptiveRoutingSchema = [
  `CREATE TABLE adaptive_difficulty_predictions (
    prediction_id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    task_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    FOREIGN KEY (project_id, task_id)
      REFERENCES project_runtime_tasks(project_id, task_id) ON DELETE CASCADE
  )`,

  `CREATE INDEX adaptive_difficulty_predictions_task_idx
    ON adaptive_difficulty_predictions(project_id, task_id, created_at, prediction_id)`,

  `CREATE TABLE adaptive_realized_difficulties (
    realized_difficulty_id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    task_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    FOREIGN KEY (project_id, task_id)
      REFERENCES project_runtime_tasks(project_id, task_id) ON DELETE CASCADE
  )`,

  `CREATE INDEX adaptive_realized_difficulties_task_idx
    ON adaptive_realized_difficulties(project_id, task_id, created_at, realized_difficulty_id)`,

  `CREATE TABLE adaptive_capacity_pools (
    capacity_pool_id TEXT PRIMARY KEY,
    provider_driver TEXT NOT NULL,
    provider_instance_id TEXT,
    created_at TEXT NOT NULL,
    payload_json TEXT NOT NULL
  )`,

  `CREATE INDEX adaptive_capacity_pools_provider_idx
    ON adaptive_capacity_pools(provider_driver, provider_instance_id, capacity_pool_id)`,

  `CREATE TABLE adaptive_capacity_snapshots (
    snapshot_id TEXT PRIMARY KEY,
    capacity_pool_id TEXT NOT NULL,
    observed_at TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    FOREIGN KEY (capacity_pool_id)
      REFERENCES adaptive_capacity_pools(capacity_pool_id) ON DELETE CASCADE
  )`,

  `CREATE INDEX adaptive_capacity_snapshots_pool_idx
    ON adaptive_capacity_snapshots(capacity_pool_id, observed_at, snapshot_id)`,

  `CREATE TABLE adaptive_capacity_reset_events (
    reset_event_id TEXT PRIMARY KEY,
    capacity_pool_id TEXT NOT NULL,
    observed_at TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    FOREIGN KEY (capacity_pool_id)
      REFERENCES adaptive_capacity_pools(capacity_pool_id) ON DELETE CASCADE
  )`,

  `CREATE INDEX adaptive_capacity_reset_events_pool_idx
    ON adaptive_capacity_reset_events(capacity_pool_id, observed_at, reset_event_id)`,

  `CREATE TABLE adaptive_accepted_outcomes (
    outcome_id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    task_id TEXT NOT NULL,
    state TEXT NOT NULL,
    revision INTEGER NOT NULL CHECK (revision >= 1),
    reconciled_at TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    UNIQUE(project_id, task_id),
    FOREIGN KEY (project_id, task_id)
      REFERENCES project_runtime_tasks(project_id, task_id) ON DELETE CASCADE
  )`,

  `CREATE INDEX adaptive_accepted_outcomes_task_idx
    ON adaptive_accepted_outcomes(project_id, task_id, outcome_id)`,

  `CREATE TABLE adaptive_outcome_reconciliations (
    reconciliation_id TEXT PRIMARY KEY,
    outcome_id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    task_id TEXT NOT NULL,
    from_revision INTEGER NOT NULL CHECK (from_revision >= 1),
    to_revision INTEGER NOT NULL CHECK (to_revision > from_revision),
    reconciled_at TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    UNIQUE(outcome_id, to_revision),
    FOREIGN KEY (outcome_id)
      REFERENCES adaptive_accepted_outcomes(outcome_id) ON DELETE CASCADE,
    FOREIGN KEY (project_id, task_id)
      REFERENCES project_runtime_tasks(project_id, task_id) ON DELETE CASCADE
  )`,

  `CREATE INDEX adaptive_outcome_reconciliations_task_idx
    ON adaptive_outcome_reconciliations(project_id, task_id, reconciled_at, reconciliation_id)`,

  `CREATE TABLE adaptive_recommendation_receipts (
    recommendation_receipt_id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    task_id TEXT NOT NULL,
    prediction_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    FOREIGN KEY (project_id, task_id)
      REFERENCES project_runtime_tasks(project_id, task_id) ON DELETE CASCADE,
    FOREIGN KEY (prediction_id)
      REFERENCES adaptive_difficulty_predictions(prediction_id) ON DELETE CASCADE
  )`,

  `CREATE INDEX adaptive_recommendation_receipts_task_idx
    ON adaptive_recommendation_receipts(project_id, task_id, created_at, recommendation_receipt_id)`,

  `CREATE TABLE adaptive_experiment_assignments (
    assignment_id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    task_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    FOREIGN KEY (project_id, task_id)
      REFERENCES project_runtime_tasks(project_id, task_id) ON DELETE CASCADE
  )`,

  `CREATE INDEX adaptive_experiment_assignments_task_idx
    ON adaptive_experiment_assignments(project_id, task_id, created_at, assignment_id)`,

  `CREATE TABLE adaptive_execution_observations (
    observation_id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    task_id TEXT NOT NULL,
    attempt_id TEXT NOT NULL UNIQUE,
    prediction_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    FOREIGN KEY (project_id, task_id)
      REFERENCES project_runtime_tasks(project_id, task_id) ON DELETE CASCADE,
    FOREIGN KEY (attempt_id)
      REFERENCES project_runtime_execution_attempts(attempt_id) ON DELETE CASCADE,
    FOREIGN KEY (prediction_id)
      REFERENCES adaptive_difficulty_predictions(prediction_id) ON DELETE CASCADE
  )`,

  `CREATE INDEX adaptive_execution_observations_task_idx
    ON adaptive_execution_observations(project_id, task_id, created_at, observation_id)`,
] as const;

export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  for (const statement of adaptiveRoutingSchema) {
    yield* sql.unsafe(statement).unprepared;
  }
});
