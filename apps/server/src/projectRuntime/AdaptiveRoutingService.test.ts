import { assert, it } from "@effect/vitest";
import {
  AdaptiveOutcomeId,
  AdaptiveOutcomeReconciliationId,
  type AdaptiveAcceptedOutcome,
  ProjectId,
  ProjectRuntimeTaskId,
} from "@t3tools/contracts";
import * as Effect from "effect/Effect";
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
