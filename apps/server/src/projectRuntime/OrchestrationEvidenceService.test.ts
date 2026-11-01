import { assert, it } from "@effect/vitest";
import {
  AdaptiveCapacityPoolId,
  AdaptiveCapacitySnapshotId,
  AdaptiveDifficultyPredictionId,
  AdaptiveExecutionObservationId,
  AdaptiveExperimentAssignmentId,
  AdaptiveOutcomeId,
  AdaptiveOutcomeReconciliationId,
  AdaptiveRealizedDifficultyId,
  AdaptiveRecommendationReceiptId,
  ContextTransferId,
  NodeId,
  OrchestrationEvidenceEvent,
  ProjectId,
  ProjectRuntimeTaskId,
  ProviderDriverKind,
  ProviderInstanceId,
  ProviderSessionId,
  ProviderThreadId,
  RunAttemptId,
  RunId,
  RuntimeExecutionAttemptId,
  ThreadId,
  type AdaptiveAcceptedOutcome,
  type AdaptiveCapacityPool,
  type AdaptiveCapacitySnapshot,
  type AdaptiveDifficultyPrediction,
  type AdaptiveExecutionObservationReference,
  type AdaptiveExperimentAssignment,
  type AdaptiveOutcomeReconciliation,
  type AdaptiveRealizedDifficulty,
  type AdaptiveRecommendationReceipt,
  ProjectRuntimeTask,
  RuntimeExecutionAttempt,
  type RuntimeRouteResolution,
} from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import * as SqlClient from "effect/sql/SqlClient";
import { type SqlError } from "effect/sql/SqlError";

import * as SqlitePersistence from "../persistence/Sqlite.ts";
import * as AdaptiveRoutingService from "./AdaptiveRoutingService.ts";
import * as OrchestrationEvidenceService from "./OrchestrationEvidenceService.ts";

const projectId = ProjectId.make("ev0-project");
const opencode = ProviderInstanceId.make("opencode");
const claude = ProviderInstanceId.make("claudeAgent");
const opencodeDriver = ProviderDriverKind.make("opencode");
const taskId = ProjectRuntimeTaskId.make("ev0-task");
const attemptId = RuntimeExecutionAttemptId.make("ev0-attempt");
const threadId = ThreadId.make("thread:ev0");
const runId = RunId.make("run:ev0");
const runAttemptId = RunAttemptId.make("run-attempt:ev0");
const nodeId = NodeId.make("node:ev0");
const providerSessionId = ProviderSessionId.make("provider-session:ev0");
const providerThreadId = ProviderThreadId.make("provider-thread:ev0");
const contextTransferId = ContextTransferId.make("context-transfer:ev0");
const predictionId = AdaptiveDifficultyPredictionId.make("ev0-prediction");
const realizedDifficultyId = AdaptiveRealizedDifficultyId.make("ev0-realized");
const observationId = AdaptiveExecutionObservationId.make("ev0-observation");
const outcomeId = AdaptiveOutcomeId.make("ev0-outcome");
const reconciliationId = AdaptiveOutcomeReconciliationId.make("ev0-reconciliation");
const receiptId = AdaptiveRecommendationReceiptId.make("ev0-receipt");
const assignmentId = AdaptiveExperimentAssignmentId.make("ev0-assignment");
const poolId = AdaptiveCapacityPoolId.make("ev0-pool");
const snapshotId = AdaptiveCapacitySnapshotId.make("ev0-snapshot");

const createdTask = "2026-11-01T08:05:00.000Z";
const createdAttempt = "2026-11-01T08:05:00.000Z";
const completedAttempt = "2026-11-01T08:20:00.000Z";
const acceptedAt = "2026-11-01T08:30:00.000Z";

const task: ProjectRuntimeTask = {
  taskId,
  projectId,
  title: "Orchestration Evidence V0",
  objective: "Reconstruct the L2-style routing history from canonical records.",
  scope: "Read-only export and reconstruction.",
  owner: "local-overall",
  acceptanceCriteria: [
    { id: "ac1", text: "Export is deterministic and references canonical records." },
  ],
  verificationPlan: "Focused tests and typecheck.",
  status: "done",
  blocker: null,
  result: "Exporter implemented.",
  verification: {
    milestone: "review-pass",
    evidence: [
      {
        evidenceId: "e1",
        command: "vp test run OrchestrationEvidenceService.test.ts",
        result: "pass",
        summary: "Focused exporter tests passed.",
        recordedAt: completedAttempt,
        criterionIds: ["ac1"],
      },
    ],
  },
  latestHandoffId: null,
  nextAction: "Independent review.",
  revision: 3,
  createdAt: createdTask,
  updatedAt: completedAttempt,
  createdBy: "local-overall",
  updatedBy: "local-overall",
};

const routeResolution: RuntimeRouteResolution = {
  projectId,
  taskId,
  role: "implementation",
  status: "resolved",
  source: "task",
  selected: {
    source: "task",
    candidateIndex: 0,
    candidate: {
      providerInstanceId: opencode,
      driverKind: opencodeDriver,
      model: "opencode-go/deepseek-v4.1-flash",
      isolation: "worktree",
    },
    providerInstanceId: opencode,
    driverKind: opencodeDriver,
    model: "opencode-go/deepseek-v4.1-flash",
    isolation: "worktree",
    runtimeMode: "full-access",
    interactionMode: "default",
    eligibility: "eligible-at-resolution",
  },
  inheritedFrom: null,
  rejected: [],
  failure: null,
  revisions: { task: 1, projectRouting: 0, profile: null, assignment: null },
};

const attempt: RuntimeExecutionAttempt = {
  attemptId,
  projectId,
  taskId,
  taskTitle: task.title,
  status: "completed",
  revision: 2,
  threadId,
  runId,
  modelSelection: {
    instanceId: opencode,
    model: "opencode-go/deepseek-v4.1-flash",
  },
  routeSource: "task",
  failure: null,
  handoffId: null,
  createdAt: createdAttempt,
  updatedAt: completedAttempt,
  receipt: {
    route: routeResolution,
    launch: {
      modelSelection: {
        instanceId: opencode,
        model: "opencode-go/deepseek-v4.1-flash",
      },
      runtimeMode: "full-access",
      interactionMode: "default",
      workspaceStrategy: { type: "worktree", baseRef: "main", startFromOrigin: false },
    },
    packet: {
      version: 1,
      taskRevision: 1,
      handoffId: null,
      text: "Implement the smallest evidence exporter.",
    },
  },
};

const pool: AdaptiveCapacityPool = {
  schemaVersion: 1,
  capacityPoolId: poolId,
  providerDriver: opencodeDriver,
  providerInstanceId: opencode,
  identityQuality: "provider_instance",
  createdAt: createdAttempt,
};

const snapshot: AdaptiveCapacitySnapshot = {
  schemaVersion: 1,
  snapshotId,
  capacityPoolId: poolId,
  observedAt: createdAttempt,
  sourceQuality: "provider_reported",
  windows: [
    {
      windowId: "session",
      windowType: "session",
      used: { quality: "unknown" },
      remaining: { quality: "unknown" },
      limit: { quality: "unknown" },
    },
  ],
};

const prediction: AdaptiveDifficultyPrediction = {
  schemaVersion: 1,
  predictionId,
  projectId,
  taskId,
  taskRevision: 1,
  assessment: {
    dimensions: {
      ambiguity: 1,
      scopeBreadth: 2,
      reasoningComplexity: 2,
      integrationToolComplexity: 1,
      risk: 2,
      verificationBurden: 3,
    },
    band: "hard",
    confidence: 0.8,
  },
  predictionVersion: "arm-v1",
  inputFingerprint: "l2-style-fixture",
  createdAt: createdTask,
};

const realized: AdaptiveRealizedDifficulty = {
  schemaVersion: 1,
  realizedDifficultyId,
  projectId,
  taskId,
  assessment: {
    dimensions: {
      ambiguity: 1,
      scopeBreadth: 3,
      reasoningComplexity: 2,
      integrationToolComplexity: 2,
      risk: 2,
      verificationBurden: 3,
    },
    band: "critical",
    confidence: 0.7,
  },
  derivationVersion: "arm-v1",
  evidenceRefs: ["handoff:l2"],
  createdAt: completedAttempt,
};

const observation: AdaptiveExecutionObservationReference = {
  schemaVersion: 1,
  observationId,
  projectId,
  taskId,
  attemptId,
  predictionId,
  realizedDifficultyId,
  capacityBeforeSnapshotId: snapshotId,
  execution: {
    threadId,
    runId,
    runAttemptId,
    nodeId,
    providerSessionId,
    providerThreadId,
    contextTransferId,
  },
  configuration: {
    requested: { instanceId: opencode, model: "opencode-go/deepseek-v4.1-flash" },
    selected: { instanceId: opencode, model: "opencode-go/deepseek-v4.1-flash" },
    executed: { quality: "unknown" },
  },
  failure: { class: "verification_failure", evidenceRef: "handoff:l2" },
  verification: {
    profileId: "verify-v0",
    requiredKinds: ["test", "typecheck"],
    performedKinds: ["test"],
    independence: "cross-provider",
    result: "partial",
    strength: "moderate",
    evidenceRefs: ["handoff:l2"],
  },
  createdAt: completedAttempt,
};

const initialOutcome: AdaptiveAcceptedOutcome = {
  schemaVersion: 1,
  outcomeId,
  projectId,
  taskId,
  state: "unresolved",
  revision: 1,
  provenance: {
    authority: "runtime_task",
    reference: "runtime-task:ev0-task",
    observedAt: completedAttempt,
  },
  evidenceRefs: ["handoff:l2"],
  reconciledAt: acceptedAt,
};

const reconciliation: Omit<
  AdaptiveOutcomeReconciliation,
  "fromRevision" | "toRevision" | "fromState" | "toState"
> = {
  schemaVersion: 1,
  reconciliationId,
  outcomeId,
  projectId,
  taskId,
  provenance: {
    authority: "external_review",
    reference: "review:opus",
    observedAt: "2026-11-01T08:35:00.000Z",
  },
  evidenceRefs: ["review:pass"],
  reconciledAt: "2026-11-01T08:35:00.000Z",
};

const receipt: AdaptiveRecommendationReceipt = {
  schemaVersion: 1,
  recommendationReceiptId: receiptId,
  projectId,
  taskId,
  predictionId,
  staticRouteSource: "task",
  eligibleCandidates: [
    { instanceId: opencode, model: "opencode-go/deepseek-v4.1-flash" },
    { instanceId: claude, model: "claude-sonnet-5-5" },
  ],
  recommendedCandidate: { instanceId: opencode, model: "opencode-go/deepseek-v4.1-flash" },
  historicalSampleCount: 0,
  capacitySnapshotIds: [snapshotId],
  confidence: 0.4,
  scoringVersion: "arm-v1",
  reasons: ["No comparable executed history."],
  uncertaintyNotes: ["Executed model is UNKNOWN."],
  createdAt: createdTask,
};

const assignment: AdaptiveExperimentAssignment = {
  schemaVersion: 1,
  assignmentId,
  projectId,
  taskId,
  comparabilityKey: "l2-style-fixture",
  comparabilityVersion: "arm-v1",
  candidateSet: [
    { instanceId: opencode, model: "opencode-go/deepseek-v4.1-flash" },
    { instanceId: claude, model: "claude-sonnet-5-5" },
  ],
  assignedCandidate: { instanceId: opencode, model: "opencode-go/deepseek-v4.1-flash" },
  method: "prospective",
  capacitySnapshotIds: [snapshotId],
  exclusionChecks: [],
  createdAt: createdTask,
};

const encodeTask = Schema.encodeSync(Schema.fromJsonString(ProjectRuntimeTask));
const encodeAttempt = Schema.encodeSync(Schema.fromJsonString(RuntimeExecutionAttempt));

const seedRuntime = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`INSERT INTO projection_projects
    (project_id, title, workspace_root, scripts_json, created_at, updated_at)
    VALUES (${projectId}, 'Evidence V0', '/evidence-v0', '[]', ${createdTask}, ${createdTask})`;
  yield* sql`INSERT INTO project_runtime
    (project_id, enabled, revision, created_at, updated_at)
    VALUES (${projectId}, 1, 1, ${createdTask}, ${createdTask})`;
  yield* sql`INSERT INTO project_runtime_tasks
    (task_id, project_id, status, revision, created_at, payload_json)
    VALUES (${taskId}, ${projectId}, ${task.status}, ${task.revision}, ${task.createdAt}, ${encodeTask(task)})`;
  yield* sql`INSERT INTO project_runtime_execution_attempts
    (attempt_id, project_id, task_id, status, revision, thread_id, run_id, request_key,
      created_at, updated_at, payload_json)
    VALUES (${attemptId}, ${projectId}, ${taskId}, ${attempt.status}, ${attempt.revision},
      ${threadId}, ${runId}, NULL, ${attempt.createdAt}, ${attempt.updatedAt}, ${encodeAttempt(attempt)})`;
});

const layerTest = Layer.merge(
  OrchestrationEvidenceService.layer,
  AdaptiveRoutingService.layer,
).pipe(Layer.provideMerge(SqlitePersistence.layerMemory));

const seedAdaptive = Effect.gen(function* () {
  const adaptive = yield* AdaptiveRoutingService.AdaptiveRoutingService;
  yield* adaptive.appendCapacityPool(pool);
  yield* adaptive.appendCapacitySnapshot(snapshot);
  yield* adaptive.appendDifficultyPrediction(prediction);
  yield* adaptive.appendRealizedDifficulty(realized);
  yield* adaptive.createAcceptedOutcome(initialOutcome);
  yield* adaptive.appendExecutionObservationReference(observation);
  yield* adaptive.appendRecommendationReceipt(receipt);
  yield* adaptive.appendExperimentAssignment(assignment);
});

const decodeEvent = Schema.decodeUnknownSync(Schema.fromJsonString(OrchestrationEvidenceEvent));

it.effect("exports a versioned envelope and reconstructs task-first chronological history", () =>
  Effect.gen(function* () {
    yield* seedRuntime;
    yield* seedAdaptive;
    const evidence = yield* OrchestrationEvidenceService.OrchestrationEvidenceService;

    const exported = yield* evidence.exportTask(projectId, taskId);
    assert.equal(exported.schemaVersion, "orchestration-evidence/v0");
    assert.equal(exported.taskRevision, 3);
    assert.isAtLeast(exported.events.length, 9);

    const reconstructed = yield* evidence.reconstructTaskHistory(projectId, taskId);
    assert.equal(reconstructed.ordering, "task-first-then-chronological");
    assert.equal(reconstructed.events[0]?.recordType, "project-runtime-task");

    const decision = reconstructed.events.find(
      (item) => item.recordType === "execution-attempt-decision",
    );
    assert.isDefined(decision);
    assert.equal(decision?.evidenceClass, "decision");
    assert.equal(
      decision?.facts.find((fact) => fact.key === "route.selected.model")?.value,
      "opencode-go/deepseek-v4.1-flash",
    );

    const observed = reconstructed.events.find(
      (item) => item.recordType === "adaptive-execution-observation",
    );
    assert.equal(observed?.evidenceClass, "outcome");
    assert.equal(
      observed?.facts.find((fact) => fact.key === "configuration.executed.quality")?.value,
      "unknown",
    );
    assert.isTrue(observed?.unknownFields.includes("configuration.executed"));

    const outcome = reconstructed.events.find(
      (item) => item.recordType === "adaptive-accepted-outcome",
    );
    assert.equal(outcome?.evidenceClass, "outcome");

    const decisionIndex = reconstructed.events.indexOf(decision!);
    const observationIndex = reconstructed.events.indexOf(observed!);
    const outcomeIndex = reconstructed.events.indexOf(outcome!);
    assert.isBelow(decisionIndex, observationIndex);
    assert.isBelow(observationIndex, outcomeIndex);
  }).pipe(Effect.provide(layerTest)),
);

it.effect("resolves every canonical reference and creates no evidence table", () =>
  Effect.gen(function* () {
    yield* seedRuntime;
    yield* seedAdaptive;
    const evidence = yield* OrchestrationEvidenceService.OrchestrationEvidenceService;
    const sql = yield* SqlClient.SqlClient;
    const exported = yield* evidence.exportTask(projectId, taskId);

    const resolvers: Record<string, () => Effect.Effect<ReadonlyArray<unknown>, SqlError>> = {
      "project-runtime-task": () =>
        sql`SELECT 1 FROM project_runtime_tasks WHERE project_id = ${projectId} AND task_id = ${taskId}`,
      "execution-attempt": () =>
        sql`SELECT 1 FROM project_runtime_execution_attempts WHERE attempt_id = ${attemptId}`,
      "execution-attempt-decision": () =>
        sql`SELECT 1 FROM project_runtime_execution_attempts WHERE attempt_id = ${attemptId}`,
      "execution-attempt-outcome": () =>
        sql`SELECT 1 FROM project_runtime_execution_attempts WHERE attempt_id = ${attemptId}`,
      "adaptive-outcome-reconciliation": () =>
        sql`SELECT 1 FROM adaptive_outcome_reconciliations WHERE reconciliation_id = ${reconciliationId}`,
      "adaptive-difficulty-prediction": () =>
        sql`SELECT 1 FROM adaptive_difficulty_predictions WHERE prediction_id = ${predictionId}`,
      "adaptive-realized-difficulty": () =>
        sql`SELECT 1 FROM adaptive_realized_difficulties WHERE realized_difficulty_id = ${realizedDifficultyId}`,
      "adaptive-execution-observation": () =>
        sql`SELECT 1 FROM adaptive_execution_observations WHERE observation_id = ${observationId}`,
      "adaptive-accepted-outcome": () =>
        sql`SELECT 1 FROM adaptive_accepted_outcomes WHERE outcome_id = ${outcomeId}`,
      "adaptive-capacity-pool": () =>
        sql`SELECT 1 FROM adaptive_capacity_pools WHERE capacity_pool_id = ${poolId}`,
      "adaptive-capacity-snapshot": () =>
        sql`SELECT 1 FROM adaptive_capacity_snapshots WHERE snapshot_id = ${snapshotId}`,
      "adaptive-recommendation-receipt": () =>
        sql`SELECT 1 FROM adaptive_recommendation_receipts WHERE recommendation_receipt_id = ${receiptId}`,
      "adaptive-experiment-assignment": () =>
        sql`SELECT 1 FROM adaptive_experiment_assignments WHERE assignment_id = ${assignmentId}`,
    };

    for (const item of exported.events) {
      const resolver = resolvers[item.recordType];
      assert.isDefined(resolver, `missing resolver for ${item.recordType}`);
      assert.isAtLeast((yield* resolver!()).length, 1, `unresolved ${item.recordId}`);
    }

    const v2Ids: ReadonlySet<string> = new Set([
      threadId,
      runId,
      runAttemptId,
      nodeId,
      providerSessionId,
      providerThreadId,
      contextTransferId,
    ]);
    for (const item of exported.events) {
      for (const reference of item.references) {
        if (reference.recordType.startsWith("orchestration-v2-")) {
          assert.isTrue(v2Ids.has(reference.recordId));
        }
      }
    }

    const evidenceTables = yield* sql<{ readonly count: number }>`SELECT COUNT(*) AS count
      FROM sqlite_schema WHERE type = 'table' AND name LIKE '%orchestration_evidence%'`;
    assert.equal(evidenceTables[0]?.count, 0);
  }).pipe(Effect.provide(layerTest)),
);

it.effect(
  "keeps UNKNOWN explicit and never invents executed provenance or capacity recording time",
  () =>
    Effect.gen(function* () {
      yield* seedRuntime;
      yield* seedAdaptive;
      const evidence = yield* OrchestrationEvidenceService.OrchestrationEvidenceService;
      const exported = yield* evidence.exportTask(projectId, taskId);

      const capacity = exported.events.find(
        (item) => item.recordType === "adaptive-capacity-snapshot",
      );
      assert.isNull(capacity?.recordedAt ?? null);
      assert.isTrue(capacity?.unknownFields.includes("recordedAt"));
      assert.equal(
        capacity?.facts.find((fact) => fact.key === "window.session.used.quality")?.value,
        "unknown",
      );
      assert.isUndefined(capacity?.facts.find((fact) => fact.key === "window.session.used.value"));

      const assignmentEvent = exported.events.find(
        (item) => item.recordType === "adaptive-experiment-assignment",
      );
      assert.isTrue(assignmentEvent?.unknownFields.includes("propensity"));

      const observationEvent = exported.events.find(
        (item) => item.recordType === "adaptive-execution-observation",
      );
      assert.isUndefined(
        observationEvent?.facts.find((fact) =>
          fact.key.startsWith("configuration.executed.instanceId"),
        ),
      );
    }).pipe(Effect.provide(layerTest)),
);

it.effect("appends corrections without rewriting the earlier decision export", () =>
  Effect.gen(function* () {
    yield* seedRuntime;
    yield* seedAdaptive;
    const adaptive = yield* AdaptiveRoutingService.AdaptiveRoutingService;
    const evidence = yield* OrchestrationEvidenceService.OrchestrationEvidenceService;

    const before = yield* evidence.exportTaskJsonl(projectId, taskId);
    const beforeCorrection = yield* evidence.exportTask(projectId, taskId);
    assert.isFalse(
      beforeCorrection.events.some((item) => item.recordType === "adaptive-outcome-reconciliation"),
    );

    yield* adaptive.reconcileAcceptedOutcome({
      reconciliationId,
      outcomeId,
      expectedRevision: 1,
      state: "accepted_after_rework",
      provenance: reconciliation.provenance,
      evidenceRefs: reconciliation.evidenceRefs,
      reconciledAt: reconciliation.reconciledAt,
    });

    const after = yield* evidence.exportTaskJsonl(projectId, taskId);
    const afterCorrection = yield* evidence.exportTask(projectId, taskId);
    const correction = afterCorrection.events.find(
      (item) => item.recordType === "adaptive-outcome-reconciliation",
    );
    assert.isDefined(correction);
    assert.equal(correction?.evidenceClass, "correction");
    assert.equal(correction?.facts.find((fact) => fact.key === "fromRevision")?.value, 1);
    assert.equal(correction?.facts.find((fact) => fact.key === "toRevision")?.value, 2);

    const beforeLines = new Set(before.split("\n"));
    for (const line of beforeLines) {
      const event = decodeEvent(line);
      if (event.evidenceClass === "outcome" || event.evidenceClass === "correction") continue;
      assert.isTrue(after.split("\n").includes(line), "earlier decision changed");
    }
  }).pipe(Effect.provide(layerTest)),
);

it.effect("emits deterministic JSONL that decodes as the exported schema", () =>
  Effect.gen(function* () {
    yield* seedRuntime;
    yield* seedAdaptive;
    const evidence = yield* OrchestrationEvidenceService.OrchestrationEvidenceService;

    const first = yield* evidence.exportTaskJsonl(projectId, taskId);
    const second = yield* evidence.exportTaskJsonl(projectId, taskId);
    assert.strictEqual(first, second);

    const lines = first.split("\n").filter((line) => line.length > 0);
    assert.isAtLeast(lines.length, 1);
    for (const line of lines) {
      const decoded = decodeEvent(line);
      assert.equal(decoded.schemaVersion, "orchestration-evidence/v0");
    }
  }).pipe(Effect.provide(layerTest)),
);

it.effect("represents the L2-style sequence without fabricating ledger-only decisions", () =>
  Effect.gen(function* () {
    yield* seedRuntime;
    yield* seedAdaptive;
    const evidence = yield* OrchestrationEvidenceService.OrchestrationEvidenceService;
    const reconstructed = yield* evidence.reconstructTaskHistory(projectId, taskId);

    assert.isFalse(
      reconstructed.events.some(
        (item) => item.recordId.includes("l2-20261101") || item.eventId.includes("l2-20261101"),
      ),
    );

    const classes = new Set(reconstructed.events.map((item) => item.evidenceClass));
    assert.isTrue(classes.has("decision"));
    assert.isTrue(classes.has("outcome"));

    const observation = reconstructed.events.find(
      (item) => item.recordType === "adaptive-execution-observation",
    );
    assert.equal(
      observation?.facts.find((fact) => fact.key === "verification.independence")?.value,
      "cross-provider",
    );
    assert.equal(
      observation?.facts.find((fact) => fact.key === "failure.class")?.value,
      "verification_failure",
    );
    assert.equal(
      observation?.facts.find((fact) => fact.key === "verification.result")?.value,
      "partial",
    );
  }).pipe(Effect.provide(layerTest)),
);
