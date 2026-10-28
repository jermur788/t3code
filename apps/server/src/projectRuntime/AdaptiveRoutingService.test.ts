import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import {
  AdaptiveDifficultyPredictionId,
  AdaptiveExecutionObservationId,
  AdaptiveOutcomeId,
  AdaptiveOutcomeReconciliationId,
  AdaptiveRecommendationReceiptId,
  type AdaptiveAcceptedOutcome,
  type AdaptiveDifficultyPrediction,
  type AdaptiveExecutionObservationReference,
  type AdaptiveRecommendationReceipt,
  ProjectId,
  ProjectRuntimeTaskId,
  RuntimeExecutionAttemptId,
} from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as SqlClient from "effect/sql/SqlClient";

import * as SqlitePersistence from "../persistence/Sqlite.ts";
import * as AdaptiveRoutingService from "./AdaptiveRoutingService.ts";

const projectId = ProjectId.make("adaptive-project");
const taskId = ProjectRuntimeTaskId.make("adaptive-task");
const outcomeId = AdaptiveOutcomeId.make("adaptive-outcome");
const firstReconciliationId = AdaptiveOutcomeReconciliationId.make("adaptive-reconciliation-1");
const secondReconciliationId = AdaptiveOutcomeReconciliationId.make("adaptive-reconciliation-2");
const createdAt = "2026-10-28T21:00:00.000Z";
const firstReconciledAt = "2026-10-28T21:05:00.000Z";
const secondReconciledAt = "2026-10-28T21:10:00.000Z";

const initialOutcome = (): AdaptiveAcceptedOutcome => ({
  schemaVersion: 1,
  outcomeId,
  projectId,
  taskId,
  state: "unresolved",
  revision: 1,
  provenance: {
    authority: "runtime_task",
    reference: "runtime-task:adaptive-task",
    observedAt: createdAt,
  },
  evidenceRefs: ["handoff:initial"],
  reconciledAt: createdAt,
});

const seedRuntimeTruth = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`INSERT INTO projection_projects
    (project_id, title, workspace_root, scripts_json, created_at, updated_at)
    VALUES (${projectId}, 'Adaptive project', '/adaptive', '[]', ${createdAt}, ${createdAt})`;
  yield* sql`INSERT INTO project_runtime
    (project_id, enabled, revision, created_at, updated_at)
    VALUES (${projectId}, 1, 1, ${createdAt}, ${createdAt})`;
  yield* sql`INSERT INTO project_runtime_tasks
    (task_id, project_id, status, revision, created_at, payload_json)
    VALUES (${taskId}, ${projectId}, 'ready', 1, ${createdAt}, '{}')`;
});

const layerTest = AdaptiveRoutingService.layer.pipe(
  Layer.provideMerge(SqlitePersistence.layerMemory),
);

it.effect("persists and reloads an accepted outcome through the service boundary", () =>
  Effect.gen(function* () {
    yield* seedRuntimeTruth;
    const service = yield* AdaptiveRoutingService.AdaptiveRoutingService;
    const expected = initialOutcome();

    assert.deepStrictEqual(yield* service.createAcceptedOutcome(expected), expected);
    assert.deepStrictEqual(yield* service.readAcceptedOutcome(outcomeId), expected);
  }).pipe(Effect.provide(layerTest)),
);

it.effect("reconciles with revision CAS and rejects a stale writer without changing history", () =>
  Effect.gen(function* () {
    yield* seedRuntimeTruth;
    const service = yield* AdaptiveRoutingService.AdaptiveRoutingService;
    const sql = yield* SqlClient.SqlClient;
    yield* service.createAcceptedOutcome(initialOutcome());

    const result = yield* service.reconcileAcceptedOutcome({
      reconciliationId: firstReconciliationId,
      outcomeId,
      expectedRevision: 1,
      state: "accepted_without_rework",
      provenance: {
        authority: "external_review",
        reference: "review:arm-010",
        observedAt: firstReconciledAt,
      },
      evidenceRefs: ["review:pass"],
      reconciledAt: firstReconciledAt,
    });

    assert.equal(result.outcome.revision, 2);
    assert.equal(result.outcome.state, "accepted_without_rework");
    assert.equal(result.reconciliation.fromRevision, 1);
    assert.equal(result.reconciliation.toRevision, 2);

    const stale = yield* service
      .reconcileAcceptedOutcome({
        reconciliationId: secondReconciliationId,
        outcomeId,
        expectedRevision: 1,
        state: "failed",
        provenance: {
          authority: "overall_manager",
          reference: "manager:stale-write",
          observedAt: secondReconciledAt,
        },
        evidenceRefs: ["stale:attempt"],
        reconciledAt: secondReconciledAt,
      })
      .pipe(Effect.flip);
    assert.equal(stale._tag, "AdaptiveRoutingConflictError");

    const current = yield* service.readAcceptedOutcome(outcomeId);
    assert.equal(current.revision, 2);
    assert.equal(current.state, "accepted_without_rework");
    assert.deepStrictEqual(
      yield* sql`SELECT reconciliation_id, from_revision, to_revision
        FROM adaptive_outcome_reconciliations WHERE outcome_id = ${outcomeId}`,
      [
        {
          reconciliation_id: firstReconciliationId,
          from_revision: 1,
          to_revision: 2,
        },
      ],
    );
  }).pipe(Effect.provide(layerTest)),
);

it.effect("rolls back the outcome head when reconciliation-history insertion fails", () =>
  Effect.gen(function* () {
    yield* seedRuntimeTruth;
    const service = yield* AdaptiveRoutingService.AdaptiveRoutingService;
    const sql = yield* SqlClient.SqlClient;
    yield* service.createAcceptedOutcome(initialOutcome());

    yield* service.reconcileAcceptedOutcome({
      reconciliationId: firstReconciliationId,
      outcomeId,
      expectedRevision: 1,
      state: "accepted_without_rework",
      provenance: {
        authority: "external_review",
        reference: "review:first",
        observedAt: firstReconciledAt,
      },
      evidenceRefs: ["review:first"],
      reconciledAt: firstReconciledAt,
    });

    const failed = yield* service
      .reconcileAcceptedOutcome({
        reconciliationId: firstReconciliationId,
        outcomeId,
        expectedRevision: 2,
        state: "accepted_after_rework",
        provenance: {
          authority: "overall_manager",
          reference: "manager:duplicate-history-id",
          observedAt: secondReconciledAt,
        },
        evidenceRefs: ["manager:second"],
        reconciledAt: secondReconciledAt,
      })
      .pipe(Effect.flip);
    assert.equal(failed._tag, "PersistenceSqlError");

    const current = yield* service.readAcceptedOutcome(outcomeId);
    assert.equal(current.revision, 2);
    assert.equal(current.state, "accepted_without_rework");
    assert.deepStrictEqual(
      yield* sql`SELECT reconciliation_id, from_revision, to_revision
        FROM adaptive_outcome_reconciliations WHERE outcome_id = ${outcomeId}`,
      [
        {
          reconciliation_id: firstReconciliationId,
          from_revision: 1,
          to_revision: 2,
        },
      ],
    );
  }).pipe(Effect.provide(layerTest)),
);

const otherTaskId = ProjectRuntimeTaskId.make("adaptive-other-task");
const attemptOf = (task: ProjectRuntimeTaskId) => RuntimeExecutionAttemptId.make(`attempt-${task}`);
const predictionOf = (task: ProjectRuntimeTaskId) =>
  AdaptiveDifficultyPredictionId.make(`prediction-${task}`);

const seedTwoTasksWithAttempts = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  yield* seedRuntimeTruth;
  yield* sql`INSERT INTO project_runtime_tasks
    (task_id, project_id, status, revision, created_at, payload_json)
    VALUES (${otherTaskId}, ${projectId}, 'ready', 1, ${createdAt}, '{}')`;
  for (const task of [taskId, otherTaskId]) {
    yield* sql`INSERT INTO project_runtime_execution_attempts
      (attempt_id, project_id, task_id, status, revision, thread_id, run_id, request_key,
        created_at, updated_at, payload_json)
      VALUES (${attemptOf(task)}, ${projectId}, ${task}, 'failed', 1, ${`thread-${task}`}, NULL,
        NULL, ${createdAt}, ${createdAt}, '{}')`;
  }
});

const prediction = (task: ProjectRuntimeTaskId): AdaptiveDifficultyPrediction => ({
  schemaVersion: 1,
  predictionId: predictionOf(task),
  projectId,
  taskId: task,
  taskRevision: 1,
  assessment: {
    dimensions: {
      ambiguity: 1,
      scopeBreadth: 1,
      reasoningComplexity: 1,
      integrationToolComplexity: 1,
      risk: 1,
      verificationBurden: 1,
    },
    band: "routine",
    confidence: 0.5,
  },
  predictionVersion: "v1",
  inputFingerprint: `fingerprint-${task}`,
  createdAt,
});

const observation = (input: {
  readonly task: ProjectRuntimeTaskId;
  readonly attempt: RuntimeExecutionAttemptId;
  readonly prediction: AdaptiveDifficultyPredictionId;
}): AdaptiveExecutionObservationReference => ({
  schemaVersion: 1,
  observationId: AdaptiveExecutionObservationId.make(`observation-${input.task}-${input.attempt}`),
  projectId,
  taskId: input.task,
  attemptId: input.attempt,
  predictionId: input.prediction,
  createdAt,
});

const receipt = (
  task: ProjectRuntimeTaskId,
  predictionId: AdaptiveDifficultyPredictionId,
): AdaptiveRecommendationReceipt => ({
  schemaVersion: 1,
  recommendationReceiptId: AdaptiveRecommendationReceiptId.make(`receipt-${task}-${predictionId}`),
  projectId,
  taskId: task,
  predictionId,
  staticRouteSource: "inherit",
  eligibleCandidates: [],
  recommendedCandidate: null,
  historicalSampleCount: 0,
  capacitySnapshotIds: [],
  confidence: 0,
  scoringVersion: "v1",
  reasons: [],
  uncertaintyNotes: [],
  createdAt,
});

const seedPredictions = Effect.gen(function* () {
  const service = yield* AdaptiveRoutingService.AdaptiveRoutingService;
  yield* service.appendDifficultyPrediction(prediction(taskId));
  yield* service.appendDifficultyPrediction(prediction(otherTaskId));
});

it.effect("rejects an observation that pairs one task with another task's attempt", () =>
  Effect.gen(function* () {
    yield* seedTwoTasksWithAttempts;
    yield* seedPredictions;
    const service = yield* AdaptiveRoutingService.AdaptiveRoutingService;
    const sql = yield* SqlClient.SqlClient;

    const rejected = yield* service
      .appendExecutionObservationReference(
        observation({
          task: taskId,
          attempt: attemptOf(otherTaskId),
          prediction: predictionOf(taskId),
        }),
      )
      .pipe(Effect.flip);
    assert.equal(rejected._tag, "PersistenceSqlError");
    assert.lengthOf(yield* sql`SELECT 1 FROM adaptive_execution_observations`, 0);
  }).pipe(Effect.provide(layerTest)),
);

it.effect("rejects an observation that pairs one task with another task's prediction", () =>
  Effect.gen(function* () {
    yield* seedTwoTasksWithAttempts;
    yield* seedPredictions;
    const service = yield* AdaptiveRoutingService.AdaptiveRoutingService;
    const sql = yield* SqlClient.SqlClient;

    const rejected = yield* service
      .appendExecutionObservationReference(
        observation({
          task: taskId,
          attempt: attemptOf(taskId),
          prediction: predictionOf(otherTaskId),
        }),
      )
      .pipe(Effect.flip);
    assert.equal(rejected._tag, "PersistenceSqlError");
    assert.lengthOf(yield* sql`SELECT 1 FROM adaptive_execution_observations`, 0);
  }).pipe(Effect.provide(layerTest)),
);

it.effect(
  "rejects a recommendation receipt that pairs one task with another task's prediction",
  () =>
    Effect.gen(function* () {
      yield* seedTwoTasksWithAttempts;
      yield* seedPredictions;
      const service = yield* AdaptiveRoutingService.AdaptiveRoutingService;
      const sql = yield* SqlClient.SqlClient;

      const rejected = yield* service
        .appendRecommendationReceipt(receipt(taskId, predictionOf(otherTaskId)))
        .pipe(Effect.flip);
      assert.equal(rejected._tag, "PersistenceSqlError");
      assert.lengthOf(yield* sql`SELECT 1 FROM adaptive_recommendation_receipts`, 0);
    }).pipe(Effect.provide(layerTest)),
);

it.effect("persists observations and receipts whose identities belong to the same task", () =>
  Effect.gen(function* () {
    yield* seedTwoTasksWithAttempts;
    yield* seedPredictions;
    const service = yield* AdaptiveRoutingService.AdaptiveRoutingService;
    const sql = yield* SqlClient.SqlClient;

    for (const task of [taskId, otherTaskId]) {
      const matched = observation({
        task,
        attempt: attemptOf(task),
        prediction: predictionOf(task),
      });
      assert.deepStrictEqual(yield* service.appendExecutionObservationReference(matched), matched);
      const matchedReceipt = receipt(task, predictionOf(task));
      assert.deepStrictEqual(
        yield* service.appendRecommendationReceipt(matchedReceipt),
        matchedReceipt,
      );
    }
    assert.lengthOf(yield* sql`SELECT 1 FROM adaptive_execution_observations`, 2);
    assert.lengthOf(yield* sql`SELECT 1 FROM adaptive_recommendation_receipts`, 2);
  }).pipe(Effect.provide(layerTest)),
);

it.effect("preserves adaptive records and reconciliation history across a file-backed reopen", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const dir = yield* fs.makeTempDirectoryScoped();
      const serviceLayer = AdaptiveRoutingService.layer.pipe(
        Layer.provideMerge(SqlitePersistence.layerFromPath(`${dir}/adaptive.sqlite`)),
      );

      const reconciled = yield* Effect.scoped(
        Effect.gen(function* () {
          yield* seedTwoTasksWithAttempts;
          yield* seedPredictions;
          const service = yield* AdaptiveRoutingService.AdaptiveRoutingService;
          yield* service.appendExecutionObservationReference(
            observation({
              task: taskId,
              attempt: attemptOf(taskId),
              prediction: predictionOf(taskId),
            }),
          );
          yield* service.appendRecommendationReceipt(receipt(taskId, predictionOf(taskId)));
          yield* service.createAcceptedOutcome(initialOutcome());
          return yield* service.reconcileAcceptedOutcome({
            reconciliationId: firstReconciliationId,
            outcomeId,
            expectedRevision: 1,
            state: "accepted_without_rework",
            provenance: {
              authority: "external_review",
              reference: "review:reopen",
              observedAt: firstReconciledAt,
            },
            evidenceRefs: ["review:reopen"],
            reconciledAt: firstReconciledAt,
          });
        }).pipe(Effect.provide(serviceLayer)),
      );

      yield* Effect.scoped(
        Effect.gen(function* () {
          const service = yield* AdaptiveRoutingService.AdaptiveRoutingService;
          const sql = yield* SqlClient.SqlClient;
          assert.deepStrictEqual(yield* service.readAcceptedOutcome(outcomeId), reconciled.outcome);
          assert.deepStrictEqual(
            yield* sql`SELECT reconciliation_id, from_revision, to_revision
              FROM adaptive_outcome_reconciliations WHERE outcome_id = ${outcomeId}`,
            [{ reconciliation_id: firstReconciliationId, from_revision: 1, to_revision: 2 }],
          );
          assert.lengthOf(yield* sql`SELECT 1 FROM adaptive_execution_observations`, 1);
          assert.lengthOf(yield* sql`SELECT 1 FROM adaptive_recommendation_receipts`, 1);
          assert.lengthOf(yield* sql`SELECT 1 FROM adaptive_difficulty_predictions`, 2);

          // The reopened database still enforces the same-task rule.
          const rejected = yield* service
            .appendExecutionObservationReference(
              observation({
                task: otherTaskId,
                attempt: attemptOf(otherTaskId),
                prediction: predictionOf(taskId),
              }),
            )
            .pipe(Effect.flip);
          assert.equal(rejected._tag, "PersistenceSqlError");
        }).pipe(Effect.provide(serviceLayer)),
      );
    }),
  ).pipe(Effect.provide(NodeServices.layer)),
);

it.effect("fails closed on a malformed stored accepted-outcome payload", () =>
  Effect.gen(function* () {
    yield* seedRuntimeTruth;
    const service = yield* AdaptiveRoutingService.AdaptiveRoutingService;
    const sql = yield* SqlClient.SqlClient;
    yield* service.createAcceptedOutcome(initialOutcome());
    yield* sql`UPDATE adaptive_accepted_outcomes
      SET payload_json = ${JSON.stringify({ ...initialOutcome(), state: "approved-by-vibes" })}
      WHERE outcome_id = ${outcomeId}`;

    const read = yield* service.readAcceptedOutcome(outcomeId).pipe(Effect.flip);
    assert.equal(read._tag, "SchemaError");

    const reconcile = yield* service
      .reconcileAcceptedOutcome({
        reconciliationId: firstReconciliationId,
        outcomeId,
        expectedRevision: 1,
        state: "failed",
        provenance: {
          authority: "overall_manager",
          reference: "manager:malformed",
          observedAt: firstReconciledAt,
        },
        evidenceRefs: [],
        reconciledAt: firstReconciledAt,
      })
      .pipe(Effect.flip);
    assert.equal(reconcile._tag, "SchemaError");
    assert.lengthOf(yield* sql`SELECT 1 FROM adaptive_outcome_reconciliations`, 0);
    assert.deepStrictEqual(
      yield* sql`SELECT state, revision FROM adaptive_accepted_outcomes WHERE outcome_id = ${outcomeId}`,
      [{ state: "unresolved", revision: 1 }],
    );
  }).pipe(Effect.provide(layerTest)),
);
