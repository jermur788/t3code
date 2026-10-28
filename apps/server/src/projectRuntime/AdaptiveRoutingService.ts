import {
  AdaptiveAcceptedOutcome,
  AdaptiveCapacityPool,
  AdaptiveCapacityResetEvent,
  AdaptiveCapacitySnapshot,
  AdaptiveDifficultyPrediction,
  AdaptiveExecutionObservationReference,
  AdaptiveExperimentAssignment,
  AdaptiveOutcomeReconcileInput,
  AdaptiveOutcomeReconciliation,
  AdaptiveRealizedDifficulty,
  AdaptiveRecommendationReceipt,
  AdaptiveRoutingConflictError,
  AdaptiveRoutingRecordNotFoundError,
  type AdaptiveOutcomeId,
} from "@t3tools/contracts";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import * as SqlClient from "effect/sql/SqlClient";
import { type SqlError } from "effect/sql/SqlError";

import { PersistenceSqlError } from "../persistence/Errors.ts";

type AdaptiveRoutingError =
  | AdaptiveRoutingRecordNotFoundError
  | AdaptiveRoutingConflictError
  | PersistenceSqlError
  | Schema.SchemaError;
type Result<A> = Effect.Effect<A, AdaptiveRoutingError>;

export class AdaptiveRoutingService extends Context.Service<
  AdaptiveRoutingService,
  {
    readonly appendDifficultyPrediction: (
      record: AdaptiveDifficultyPrediction,
    ) => Result<AdaptiveDifficultyPrediction>;
    readonly appendRealizedDifficulty: (
      record: AdaptiveRealizedDifficulty,
    ) => Result<AdaptiveRealizedDifficulty>;
    readonly appendExecutionObservationReference: (
      record: AdaptiveExecutionObservationReference,
    ) => Result<AdaptiveExecutionObservationReference>;
    readonly appendCapacityPool: (record: AdaptiveCapacityPool) => Result<AdaptiveCapacityPool>;
    readonly appendCapacitySnapshot: (
      record: AdaptiveCapacitySnapshot,
    ) => Result<AdaptiveCapacitySnapshot>;
    readonly appendCapacityResetEvent: (
      record: AdaptiveCapacityResetEvent,
    ) => Result<AdaptiveCapacityResetEvent>;
    readonly createAcceptedOutcome: (
      record: AdaptiveAcceptedOutcome,
    ) => Result<AdaptiveAcceptedOutcome>;
    readonly readAcceptedOutcome: (outcomeId: AdaptiveOutcomeId) => Result<AdaptiveAcceptedOutcome>;
    readonly reconcileAcceptedOutcome: (input: AdaptiveOutcomeReconcileInput) => Result<{
      readonly outcome: AdaptiveAcceptedOutcome;
      readonly reconciliation: AdaptiveOutcomeReconciliation;
    }>;
    readonly appendRecommendationReceipt: (
      record: AdaptiveRecommendationReceipt,
    ) => Result<AdaptiveRecommendationReceipt>;
    readonly appendExperimentAssignment: (
      record: AdaptiveExperimentAssignment,
    ) => Result<AdaptiveExperimentAssignment>;
  }
>()("t3/projectRuntime/AdaptiveRoutingService") {}

const DifficultyPredictionJson = Schema.fromJsonString(AdaptiveDifficultyPrediction);
const RealizedDifficultyJson = Schema.fromJsonString(AdaptiveRealizedDifficulty);
const ExecutionObservationJson = Schema.fromJsonString(AdaptiveExecutionObservationReference);
const CapacityPoolJson = Schema.fromJsonString(AdaptiveCapacityPool);
const CapacitySnapshotJson = Schema.fromJsonString(AdaptiveCapacitySnapshot);
const CapacityResetEventJson = Schema.fromJsonString(AdaptiveCapacityResetEvent);
const AcceptedOutcomeJson = Schema.fromJsonString(AdaptiveAcceptedOutcome);
const OutcomeReconciliationJson = Schema.fromJsonString(AdaptiveOutcomeReconciliation);
const RecommendationReceiptJson = Schema.fromJsonString(AdaptiveRecommendationReceipt);
const ExperimentAssignmentJson = Schema.fromJsonString(AdaptiveExperimentAssignment);

const decodeDifficultyPrediction = Schema.decodeUnknownEffect(AdaptiveDifficultyPrediction);
const decodeRealizedDifficulty = Schema.decodeUnknownEffect(AdaptiveRealizedDifficulty);
const decodeExecutionObservation = Schema.decodeUnknownEffect(
  AdaptiveExecutionObservationReference,
);
const decodeCapacityPool = Schema.decodeUnknownEffect(AdaptiveCapacityPool);
const decodeCapacitySnapshot = Schema.decodeUnknownEffect(AdaptiveCapacitySnapshot);
const decodeCapacityResetEvent = Schema.decodeUnknownEffect(AdaptiveCapacityResetEvent);
const decodeAcceptedOutcome = Schema.decodeUnknownEffect(AdaptiveAcceptedOutcome);
const decodeAcceptedOutcomeJson = Schema.decodeUnknownEffect(AcceptedOutcomeJson);
const decodeOutcomeReconcileInput = Schema.decodeUnknownEffect(AdaptiveOutcomeReconcileInput);
const decodeOutcomeReconciliation = Schema.decodeUnknownEffect(AdaptiveOutcomeReconciliation);
const decodeRecommendationReceipt = Schema.decodeUnknownEffect(AdaptiveRecommendationReceipt);
const decodeExperimentAssignment = Schema.decodeUnknownEffect(AdaptiveExperimentAssignment);

const encodeDifficultyPrediction = Schema.encodeEffect(DifficultyPredictionJson);
const encodeRealizedDifficulty = Schema.encodeEffect(RealizedDifficultyJson);
const encodeExecutionObservation = Schema.encodeEffect(ExecutionObservationJson);
const encodeCapacityPool = Schema.encodeEffect(CapacityPoolJson);
const encodeCapacitySnapshot = Schema.encodeEffect(CapacitySnapshotJson);
const encodeCapacityResetEvent = Schema.encodeEffect(CapacityResetEventJson);
const encodeAcceptedOutcome = Schema.encodeEffect(AcceptedOutcomeJson);
const encodeOutcomeReconciliation = Schema.encodeEffect(OutcomeReconciliationJson);
const encodeRecommendationReceipt = Schema.encodeEffect(RecommendationReceiptJson);
const encodeExperimentAssignment = Schema.encodeEffect(ExperimentAssignmentJson);

const make = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const sqlErrors = <A, R>(effect: Effect.Effect<A, AdaptiveRoutingError | SqlError, R>) =>
    effect.pipe(
      Effect.catchTags({
        SqlError: (cause) =>
          Effect.fail(new PersistenceSqlError({ operation: "adaptiveRouting", cause })),
      }),
    );

  const appendDifficultyPrediction: AdaptiveRoutingService["Service"]["appendDifficultyPrediction"] =
    Effect.fn("AdaptiveRoutingService.appendDifficultyPrediction")(function* (record) {
      const data = yield* decodeDifficultyPrediction(record);
      const payload = yield* encodeDifficultyPrediction(data);
      yield* sql`INSERT INTO adaptive_difficulty_predictions
          (prediction_id, project_id, task_id, created_at, payload_json)
          VALUES (${data.predictionId}, ${data.projectId}, ${data.taskId}, ${data.createdAt}, ${payload})`;
      return data;
    }, sqlErrors);

  const appendRealizedDifficulty: AdaptiveRoutingService["Service"]["appendRealizedDifficulty"] =
    Effect.fn("AdaptiveRoutingService.appendRealizedDifficulty")(function* (record) {
      const data = yield* decodeRealizedDifficulty(record);
      const payload = yield* encodeRealizedDifficulty(data);
      yield* sql`INSERT INTO adaptive_realized_difficulties
          (realized_difficulty_id, project_id, task_id, created_at, payload_json)
          VALUES (${data.realizedDifficultyId}, ${data.projectId}, ${data.taskId}, ${data.createdAt}, ${payload})`;
      return data;
    }, sqlErrors);

  const appendExecutionObservationReference: AdaptiveRoutingService["Service"]["appendExecutionObservationReference"] =
    Effect.fn("AdaptiveRoutingService.appendExecutionObservationReference")(function* (record) {
      const data = yield* decodeExecutionObservation(record);
      const payload = yield* encodeExecutionObservation(data);
      yield* sql`INSERT INTO adaptive_execution_observations
          (observation_id, project_id, task_id, attempt_id, prediction_id, created_at, payload_json)
          VALUES (${data.observationId}, ${data.projectId}, ${data.taskId}, ${data.attemptId}, ${data.predictionId}, ${data.createdAt}, ${payload})`;
      return data;
    }, sqlErrors);

  const appendCapacityPool: AdaptiveRoutingService["Service"]["appendCapacityPool"] = Effect.fn(
    "AdaptiveRoutingService.appendCapacityPool",
  )(function* (record) {
    const data = yield* decodeCapacityPool(record);
    const payload = yield* encodeCapacityPool(data);
    yield* sql`INSERT INTO adaptive_capacity_pools
        (capacity_pool_id, provider_driver, provider_instance_id, created_at, payload_json)
        VALUES (${data.capacityPoolId}, ${data.providerDriver}, ${data.providerInstanceId ?? null}, ${data.createdAt}, ${payload})`;
    return data;
  }, sqlErrors);

  const appendCapacitySnapshot: AdaptiveRoutingService["Service"]["appendCapacitySnapshot"] =
    Effect.fn("AdaptiveRoutingService.appendCapacitySnapshot")(function* (record) {
      const data = yield* decodeCapacitySnapshot(record);
      const payload = yield* encodeCapacitySnapshot(data);
      yield* sql`INSERT INTO adaptive_capacity_snapshots
          (snapshot_id, capacity_pool_id, observed_at, payload_json)
          VALUES (${data.snapshotId}, ${data.capacityPoolId}, ${data.observedAt}, ${payload})`;
      return data;
    }, sqlErrors);

  const appendCapacityResetEvent: AdaptiveRoutingService["Service"]["appendCapacityResetEvent"] =
    Effect.fn("AdaptiveRoutingService.appendCapacityResetEvent")(function* (record) {
      const data = yield* decodeCapacityResetEvent(record);
      const payload = yield* encodeCapacityResetEvent(data);
      yield* sql`INSERT INTO adaptive_capacity_reset_events
          (reset_event_id, capacity_pool_id, observed_at, payload_json)
          VALUES (${data.resetEventId}, ${data.capacityPoolId}, ${data.observedAt}, ${payload})`;
      return data;
    }, sqlErrors);

  const createAcceptedOutcome: AdaptiveRoutingService["Service"]["createAcceptedOutcome"] =
    Effect.fn("AdaptiveRoutingService.createAcceptedOutcome")(function* (record) {
      const data = yield* decodeAcceptedOutcome(record);
      const payload = yield* encodeAcceptedOutcome(data);
      yield* sql`INSERT INTO adaptive_accepted_outcomes
          (outcome_id, project_id, task_id, state, revision, reconciled_at, payload_json)
          VALUES (${data.outcomeId}, ${data.projectId}, ${data.taskId}, ${data.state}, ${data.revision}, ${data.reconciledAt}, ${payload})`;
      return data;
    }, sqlErrors);

  const readAcceptedOutcome: AdaptiveRoutingService["Service"]["readAcceptedOutcome"] = Effect.fn(
    "AdaptiveRoutingService.readAcceptedOutcome",
  )(function* (outcomeId) {
    const rows = yield* sql<{ readonly payload_json: string }>`
        SELECT payload_json FROM adaptive_accepted_outcomes WHERE outcome_id = ${outcomeId}`;
    const row = rows[0];
    if (row === undefined) {
      return yield* new AdaptiveRoutingRecordNotFoundError({
        entity: "outcome",
        entityId: outcomeId,
      });
    }
    return yield* decodeAcceptedOutcomeJson(row.payload_json);
  }, sqlErrors);

  const reconcileAcceptedOutcome: AdaptiveRoutingService["Service"]["reconcileAcceptedOutcome"] =
    Effect.fn("AdaptiveRoutingService.reconcileAcceptedOutcome")(
      function* (input) {
        const data = yield* decodeOutcomeReconcileInput(input);
        const existing = yield* readAcceptedOutcome(data.outcomeId);
        if (existing.revision !== data.expectedRevision) {
          return yield* new AdaptiveRoutingConflictError({
            entity: "outcome",
            entityId: data.outcomeId,
            expectedRevision: data.expectedRevision,
            currentRevision: existing.revision,
          });
        }

        const outcome = yield* decodeAcceptedOutcome({
          ...existing,
          state: data.state,
          revision: existing.revision + 1,
          provenance: data.provenance,
          evidenceRefs: data.evidenceRefs,
          reconciledAt: data.reconciledAt,
        });
        const reconciliation = yield* decodeOutcomeReconciliation({
          schemaVersion: existing.schemaVersion,
          reconciliationId: data.reconciliationId,
          outcomeId: existing.outcomeId,
          projectId: existing.projectId,
          taskId: existing.taskId,
          fromRevision: existing.revision,
          toRevision: outcome.revision,
          fromState: existing.state,
          toState: outcome.state,
          provenance: data.provenance,
          evidenceRefs: data.evidenceRefs,
          reconciledAt: data.reconciledAt,
        });
        const outcomePayload = yield* encodeAcceptedOutcome(outcome);
        const reconciliationPayload = yield* encodeOutcomeReconciliation(reconciliation);

        const changed = yield* sql`UPDATE adaptive_accepted_outcomes
          SET state = ${outcome.state}, revision = ${outcome.revision},
              reconciled_at = ${outcome.reconciledAt}, payload_json = ${outcomePayload}
          WHERE outcome_id = ${outcome.outcomeId} AND revision = ${data.expectedRevision}
          RETURNING outcome_id`;
        if (changed.length !== 1) {
          const rows = yield* sql<{ readonly revision: number }>`
            SELECT revision FROM adaptive_accepted_outcomes WHERE outcome_id = ${data.outcomeId}`;
          const row = rows[0];
          if (row === undefined) {
            return yield* new AdaptiveRoutingRecordNotFoundError({
              entity: "outcome",
              entityId: data.outcomeId,
            });
          }
          return yield* new AdaptiveRoutingConflictError({
            entity: "outcome",
            entityId: data.outcomeId,
            expectedRevision: data.expectedRevision,
            currentRevision: Number(row.revision),
          });
        }

        yield* sql`INSERT INTO adaptive_outcome_reconciliations
          (reconciliation_id, outcome_id, project_id, task_id, from_revision, to_revision,
           reconciled_at, payload_json)
          VALUES (${reconciliation.reconciliationId}, ${reconciliation.outcomeId},
            ${reconciliation.projectId}, ${reconciliation.taskId}, ${reconciliation.fromRevision},
            ${reconciliation.toRevision}, ${reconciliation.reconciledAt}, ${reconciliationPayload})`;
        return { outcome, reconciliation };
      },
      sql.withTransaction,
      sqlErrors,
    );

  const appendRecommendationReceipt: AdaptiveRoutingService["Service"]["appendRecommendationReceipt"] =
    Effect.fn("AdaptiveRoutingService.appendRecommendationReceipt")(function* (record) {
      const data = yield* decodeRecommendationReceipt(record);
      const payload = yield* encodeRecommendationReceipt(data);
      yield* sql`INSERT INTO adaptive_recommendation_receipts
          (recommendation_receipt_id, project_id, task_id, prediction_id, created_at, payload_json)
          VALUES (${data.recommendationReceiptId}, ${data.projectId}, ${data.taskId}, ${data.predictionId}, ${data.createdAt}, ${payload})`;
      return data;
    }, sqlErrors);

  const appendExperimentAssignment: AdaptiveRoutingService["Service"]["appendExperimentAssignment"] =
    Effect.fn("AdaptiveRoutingService.appendExperimentAssignment")(function* (record) {
      const data = yield* decodeExperimentAssignment(record);
      const payload = yield* encodeExperimentAssignment(data);
      yield* sql`INSERT INTO adaptive_experiment_assignments
          (assignment_id, project_id, task_id, created_at, payload_json)
          VALUES (${data.assignmentId}, ${data.projectId}, ${data.taskId}, ${data.createdAt}, ${payload})`;
      return data;
    }, sqlErrors);

  return AdaptiveRoutingService.of({
    appendDifficultyPrediction,
    appendRealizedDifficulty,
    appendExecutionObservationReference,
    appendCapacityPool,
    appendCapacitySnapshot,
    appendCapacityResetEvent,
    createAcceptedOutcome,
    readAcceptedOutcome,
    reconcileAcceptedOutcome,
    appendRecommendationReceipt,
    appendExperimentAssignment,
  });
});

export const layer = Layer.effect(AdaptiveRoutingService, make);
