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
  EventId,
  MessageId,
  NodeId,
  OrchestrationEvidenceEvent,
  ProjectId,
  ProjectRuntimeHandoffId,
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
  type OrchestrationEvidenceExport,
  type OrchestrationEvidenceStagingReference,
  type OrchestrationV2DomainEvent,
  ProjectRuntimeHandoff,
  ProjectRuntimeTask,
  RuntimeExecutionAttempt,
  type RuntimeRouteResolution,
} from "@t3tools/contracts";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import * as TestClock from "effect/testing/TestClock";
import * as SqlClient from "effect/sql/SqlClient";
import { type SqlError } from "effect/sql/SqlError";

import * as SqlitePersistence from "../persistence/Sqlite.ts";
import * as EventStore from "../orchestration-v2/EventStore.ts";
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
const providerThreadId = ProviderThreadId.make("provider-thread:ev0");
const providerSessionId = ProviderSessionId.make("provider-session:ev0");
const nodeId = NodeId.make("node:ev0");
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

const handoffId = ProjectRuntimeHandoffId.make("ev0-handoff");
const handoff: ProjectRuntimeHandoff = {
  handoffId,
  projectId,
  taskId,
  checkpoint: "checkpoint:ev0-handoff",
  summary: "Private handoff summary body that must not be copied into evidence.",
  result: "Private handoff result body.",
  filesChanged: ["apps/server/src/projectRuntime/OrchestrationEvidenceService.ts"],
  testsRun: ["vp test run OrchestrationEvidenceService.test.ts"],
  testsNotRun: ["live-service verification"],
  unresolvedDecisions: ["none"],
  verification: {
    milestone: "review-pass",
    evidence: [
      {
        evidenceId: "h1",
        command: "vp test run OrchestrationEvidenceService.test.ts",
        result: "pass",
        summary: "Handoff verification.",
        recordedAt: completedAttempt,
        criterionIds: ["ac1"],
      },
    ],
  },
  threadId,
  providerInstanceId: opencode,
  model: "opencode-go/deepseek-v4.1-flash",
  runtimeRevision: 4,
  taskRevision: 4,
  createdAt: "2026-11-01T08:22:00.000Z",
  createdBy: "local-overall",
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

const pendingAttemptId = RuntimeExecutionAttemptId.make("ev0-attempt-pending");
const pendingThreadId = ThreadId.make("thread:ev0-pending");
const pendingRunId = RunId.make("run:ev0-pending");

const pendingAttempt: RuntimeExecutionAttempt = {
  ...attempt,
  attemptId: pendingAttemptId,
  threadId: pendingThreadId,
  status: "pending",
  revision: 1,
  runId: null,
  failure: null,
  createdAt: createdAttempt,
  updatedAt: createdAttempt,
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
    observedAt: acceptedAt,
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

const secondReceipt: AdaptiveRecommendationReceipt = {
  ...receipt,
  recommendationReceiptId: AdaptiveRecommendationReceiptId.make("ev0-receipt-2"),
  recommendedCandidate: { instanceId: claude, model: "claude-sonnet-5-5" },
  confidence: 0.3,
  createdAt: createdTask,
};

const l2StagingReference: OrchestrationEvidenceStagingReference = {
  stagingId: "l2-20261101-project-ledger",
  projectId,
  taskId,
  branch: "docs/t3-fork-orchestration-evidence-20261101",
  commit: "6b143992cbc811cbb2deec8b32d9ebd2a1ac87cd",
  path: "docs/orchestration-v2/evidence/ORCHESTRATION-EVIDENCE-APPENDIX-V2.md",
  decisionIds: [
    "l2-20261101-d01",
    "l2-20261101-d02",
    "l2-20261101-d03",
    "l2-20261101-d04",
    "l2-20261101-d05",
    "l2-20261101-d06",
    "l2-20261101-d07",
    "l2-20261101-d08",
  ],
  evidenceClass: "orchestrator-claim",
  provenance: "Local L2 durable result plus project-owned orchestration ledger",
  occurredAt: "2026-11-01T08:05:00.000Z",
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
const encodeHandoff = Schema.encodeSync(Schema.fromJsonString(ProjectRuntimeHandoff));
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
  yield* sql`INSERT INTO project_runtime_execution_attempts
    (attempt_id, project_id, task_id, status, revision, thread_id, run_id, request_key,
      created_at, updated_at, payload_json)
    VALUES (${pendingAttemptId}, ${projectId}, ${taskId}, ${pendingAttempt.status},
      ${pendingAttempt.revision}, ${pendingThreadId}, NULL, NULL, ${pendingAttempt.createdAt},
      ${pendingAttempt.updatedAt}, ${encodeAttempt(pendingAttempt)})`;
});

const v2At = DateTime.makeUnsafe(createdAttempt);
const v2ThreadEventId = EventId.make(`event:${threadId}:created`);
const v2RunEventId = EventId.make("event:ev0-run-created");

const v2ThreadCreated = (id: ThreadId, title: string): OrchestrationV2DomainEvent => ({
  id: EventId.make(`event:${id}:created`),
  type: "thread.created",
  threadId: id,
  occurredAt: v2At,
  payload: {
    createdBy: "user",
    creationSource: "web",
    id,
    projectId,
    title,
    providerInstanceId: opencode,
    modelSelection: {
      instanceId: opencode,
      model: "opencode-go/deepseek-v4.1-flash",
    },
    runtimeMode: "full-access",
    interactionMode: "default",
    branch: null,
    worktreePath: null,
    activeProviderThreadId: null,
    lineage: { parentThreadId: null, relationshipToParent: null, rootThreadId: id },
    forkedFrom: null,
    createdAt: v2At,
    updatedAt: v2At,
    archivedAt: null,
    settledOverride: null,
    settledAt: null,
    lastVisitedAt: null,
    deletedAt: null,
  },
});

const v2RunCreated: OrchestrationV2DomainEvent = {
  id: v2RunEventId,
  type: "run.created",
  threadId,
  runId,
  occurredAt: v2At,
  payload: {
    id: runId,
    threadId,
    ordinal: 1,
    providerInstanceId: opencode,
    modelSelection: {
      instanceId: opencode,
      model: "opencode-go/deepseek-v4.1-flash",
    },
    providerThreadId: null,
    userMessageId: MessageId.make("message:ev0"),
    rootNodeId: null,
    activeAttemptId: null,
    status: "completed",
    requestedAt: v2At,
    startedAt: v2At,
    completedAt: v2At,
    checkpointId: null,
    contextHandoffId: null,
  },
};

const v2RunAttemptCreatedId = EventId.make("event:ev0-run-attempt-created");
const v2RunAttemptCreated: OrchestrationV2DomainEvent = {
  id: v2RunAttemptCreatedId,
  type: "run-attempt.created",
  threadId,
  occurredAt: v2At,
  payload: {
    id: runAttemptId,
    runId,
    attemptOrdinal: 1,
    rootNodeId: nodeId,
    providerInstanceId: opencode,
    providerThreadId,
    providerTurnId: null,
    reason: "initial",
    status: "running",
    startedAt: v2At,
    completedAt: null,
  },
};

const v2NodeUpdated = (id: NodeId, occurredAt: string): OrchestrationV2DomainEvent => ({
  id: EventId.make(`event:${id}:updated`),
  type: "node.updated",
  threadId,
  runId,
  nodeId: id,
  occurredAt: DateTime.makeUnsafe(occurredAt),
  payload: {
    id,
    threadId,
    runId,
    parentNodeId: null,
    rootNodeId: id,
    kind: "root_turn",
    status: "running",
    countsForRun: true,
    providerThreadId: null,
    providerTurnId: null,
    nativeItemRef: null,
    runtimeRequestId: null,
    checkpointScopeId: null,
    startedAt: null,
    completedAt: null,
  },
});

const seedV2 = Effect.gen(function* () {
  const eventStore = yield* EventStore.EventStoreV2;
  yield* eventStore.append({
    events: [v2ThreadCreated(threadId, "Evidence V0 execution"), v2RunCreated],
  });
});

const layerTest = Layer.merge(
  OrchestrationEvidenceService.layer,
  AdaptiveRoutingService.layer,
).pipe(Layer.provideMerge(EventStore.layer), Layer.provideMerge(SqlitePersistence.layerMemory));

const seedAll = Effect.gen(function* () {
  yield* seedRuntime;
  yield* seedAdaptive;
  yield* seedV2;
});

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
    yield* seedAll;
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
    assert.equal(decision?.lifecycleClass, "decision");
    assert.equal(
      decision?.facts.find((fact) => fact.key === "route.selected.model")?.value,
      "opencode-go/deepseek-v4.1-flash",
    );

    const observed = reconstructed.events.find(
      (item) => item.recordType === "adaptive-execution-observation",
    );
    assert.equal(observed?.lifecycleClass, "outcome");
    assert.equal(
      observed?.facts.find((fact) => fact.key === "configuration.executed.quality")?.value,
      "unknown",
    );
    assert.isTrue(observed?.unknownFields.includes("configuration.executed"));

    const outcome = reconstructed.events.find(
      (item) => item.recordType === "adaptive-accepted-outcome",
    );
    assert.equal(outcome?.lifecycleClass, "outcome");

    const decisionIndex = reconstructed.events.indexOf(decision!);
    const observationIndex = reconstructed.events.indexOf(observed!);
    const outcomeIndex = reconstructed.events.indexOf(outcome!);
    assert.isBelow(decisionIndex, observationIndex);
    assert.isBelow(observationIndex, outcomeIndex);
  }).pipe(Effect.provide(layerTest)),
);

it.effect("resolves canonical references, bounded V2 events, and explicit unresolved V2", () =>
  Effect.gen(function* () {
    yield* seedAll;
    const evidence = yield* OrchestrationEvidenceService.OrchestrationEvidenceService;
    const sql = yield* SqlClient.SqlClient;
    const exported = yield* evidence.exportTask(projectId, taskId);

    const resolvers: Record<
      string,
      (recordId: string) => Effect.Effect<ReadonlyArray<unknown>, SqlError>
    > = {
      "project-runtime-task": (recordId) =>
        sql`SELECT 1 FROM project_runtime_tasks WHERE project_id = ${projectId} AND task_id = ${recordId}`,
      "project-runtime-verification": (_recordId) =>
        sql`SELECT 1 FROM project_runtime_tasks WHERE project_id = ${projectId} AND task_id = ${taskId}`,
      "execution-attempt": (recordId) =>
        sql`SELECT 1 FROM project_runtime_execution_attempts WHERE attempt_id = ${recordId}`,
      "execution-attempt-decision": (recordId) =>
        sql`SELECT 1 FROM project_runtime_execution_attempts WHERE attempt_id = ${recordId}`,
      "execution-attempt-outcome": (recordId) =>
        sql`SELECT 1 FROM project_runtime_execution_attempts WHERE attempt_id = ${recordId}`,
      "adaptive-recommendation-attempt-link": (recordId) =>
        sql`SELECT 1 FROM project_runtime_execution_attempts WHERE attempt_id = ${recordId}`,
      "adaptive-outcome-reconciliation": (recordId) =>
        sql`SELECT 1 FROM adaptive_outcome_reconciliations WHERE reconciliation_id = ${recordId}`,
      "adaptive-difficulty-prediction": (recordId) =>
        sql`SELECT 1 FROM adaptive_difficulty_predictions WHERE prediction_id = ${recordId}`,
      "adaptive-realized-difficulty": (recordId) =>
        sql`SELECT 1 FROM adaptive_realized_difficulties WHERE realized_difficulty_id = ${recordId}`,
      "adaptive-execution-observation": (recordId) =>
        sql`SELECT 1 FROM adaptive_execution_observations WHERE observation_id = ${recordId}`,
      "adaptive-accepted-outcome": (recordId) =>
        sql`SELECT 1 FROM adaptive_accepted_outcomes WHERE outcome_id = ${recordId}`,
      "adaptive-capacity-pool": (recordId) =>
        sql`SELECT 1 FROM adaptive_capacity_pools WHERE capacity_pool_id = ${recordId}`,
      "adaptive-capacity-snapshot": (recordId) =>
        sql`SELECT 1 FROM adaptive_capacity_snapshots WHERE snapshot_id = ${recordId}`,
      "adaptive-recommendation-receipt": (recordId) =>
        sql`SELECT 1 FROM adaptive_recommendation_receipts WHERE recommendation_receipt_id = ${recordId}`,
      "adaptive-experiment-assignment": (recordId) =>
        sql`SELECT 1 FROM adaptive_experiment_assignments WHERE assignment_id = ${recordId}`,
      "orchestration-v2-event": (recordId) =>
        sql`SELECT 1 FROM orchestration_events WHERE event_id = ${recordId}`,
    };

    const unresolvedIds = new Set(
      exported.events
        .filter((item) => item.recordType === "orchestration-v2-unresolved")
        .map((item) => item.recordId),
    );

    for (const item of exported.events) {
      if (item.recordType === "orchestration-v2-unresolved") {
        assert.equal(item.recordBasis, "derived-view");
        assert.equal(item.authority, "orchestration-v2");
        assert.equal(item.facts.find((fact) => fact.key === "status")?.value, "unresolved");
        assert.isTrue(item.unknownFields.includes("canonicalRecord"));
        continue;
      }
      const resolver = resolvers[item.recordType];
      assert.isDefined(resolver, `missing resolver for ${item.recordType}`);
      assert.isAtLeast((yield* resolver!(item.recordId)).length, 1, `unresolved ${item.recordId}`);
      for (const reference of item.references) {
        const referenceResolver = resolvers[reference.recordType];
        if (referenceResolver !== undefined) {
          assert.isAtLeast(
            (yield* referenceResolver(reference.recordId)).length,
            1,
            `unresolved reference ${reference.recordType}:${reference.recordId}`,
          );
        } else if (reference.recordType.startsWith("orchestration-v2-")) {
          const resolvedByEvent = exported.events.some(
            (event) =>
              event.recordType === "orchestration-v2-event" &&
              (reference.recordType === "orchestration-v2-thread"
                ? event.threadId === reference.recordId
                : reference.recordType === "orchestration-v2-run"
                  ? event.runId === reference.recordId
                  : false),
          );
          assert.isTrue(
            resolvedByEvent || unresolvedIds.has(reference.recordId),
            `V2 reference ${reference.recordType}:${reference.recordId} neither resolves nor is marked unresolved`,
          );
        }
      }
    }

    const v2Events = exported.events.filter((item) => item.recordType === "orchestration-v2-event");
    assert.deepEqual(
      v2Events.map((item) => item.recordId).sort(),
      [v2ThreadEventId, v2RunEventId].sort(),
    );
    assert.deepEqual(
      v2Events.map((item) => item.facts.find((fact) => fact.key === "sequence")?.value),
      [1, 2],
    );
    for (const item of v2Events) {
      assert.equal(item.authority, "orchestration-v2");
      assert.equal(item.occurredAt, createdAttempt);
      assert.isNull(item.recordedAt);
      assert.isTrue(item.unknownFields.includes("recordedAt"));
    }
    assert.isTrue(unresolvedIds.has(pendingThreadId));

    const evidenceTables = yield* sql<{ readonly count: number }>`SELECT COUNT(*) AS count
      FROM sqlite_schema WHERE type = 'table' AND name LIKE '%orchestration_evidence%'`;
    assert.equal(evidenceTables[0]?.count, 0);
  }).pipe(Effect.provide(layerTest)),
);

it.effect("reads only the referenced V2 thread scope", () =>
  Effect.gen(function* () {
    yield* seedAll;
    const eventStore = yield* EventStore.EventStoreV2;
    const unrelatedThreadId = ThreadId.make("thread:ev0-unrelated");
    yield* eventStore.append({
      events: [v2ThreadCreated(unrelatedThreadId, "Unrelated thread")],
    });
    const evidence = yield* OrchestrationEvidenceService.OrchestrationEvidenceService;
    const exported = yield* evidence.exportTask(projectId, taskId);
    assert.isFalse(
      exported.events.some(
        (item) =>
          item.threadId === unrelatedThreadId ||
          item.recordId === `event:${unrelatedThreadId}:created`,
      ),
    );
    assert.isFalse(
      exported.events.some((item) => item.threadId === null && item.recordId.includes("unrelated")),
    );
  }).pipe(Effect.provide(layerTest)),
);

it.effect(
  "keeps UNKNOWN explicit and never invents executed provenance or capacity recording time",
  () =>
    Effect.gen(function* () {
      yield* seedAll;
      const evidence = yield* OrchestrationEvidenceService.OrchestrationEvidenceService;
      const exported = yield* evidence.exportTask(projectId, taskId);

      const capacity = exported.events.find(
        (item) => item.recordType === "adaptive-capacity-snapshot",
      );
      assert.isNull(capacity?.recordedAt ?? null);
      assert.isTrue(capacity?.unknownFields.includes("recordedAt"));
      assert.equal(
        capacity?.facts.find((fact) => fact.key === "window.0.used.quality")?.value,
        "unknown",
      );
      assert.isUndefined(capacity?.facts.find((fact) => fact.key === "window.0.used.value"));

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
    yield* seedAll;
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
    assert.equal(correction?.lifecycleClass, "correction");
    assert.equal(correction?.facts.find((fact) => fact.key === "fromRevision")?.value, 1);
    assert.equal(correction?.facts.find((fact) => fact.key === "toRevision")?.value, 2);

    const revisionFacts = (event: (typeof afterCorrection.events)[number]) =>
      event.facts.find((fact) => fact.key === "revision")?.value;
    const superseded = afterCorrection.events.find(
      (item) => item.recordType === "adaptive-accepted-outcome" && revisionFacts(item) === 1,
    );
    assert.isDefined(superseded, "the superseded revision must remain recoverable");
    assert.equal(superseded?.facts.find((fact) => fact.key === "state")?.value, "unresolved");
    assert.equal(superseded?.facts.find((fact) => fact.key === "superseded")?.value, true);
    const head = afterCorrection.events.find(
      (item) => item.recordType === "adaptive-accepted-outcome" && revisionFacts(item) === 2,
    );
    assert.isDefined(head);

    const beforeLines = new Set(before.split("\n"));
    for (const line of beforeLines) {
      const event = decodeEvent(line);
      if (event.lifecycleClass === "outcome" || event.lifecycleClass === "correction") continue;
      assert.isTrue(after.split("\n").includes(line), "earlier decision changed");
    }
  }).pipe(Effect.provide(layerTest)),
);

it.effect("emits deterministic JSONL that decodes as the exported schema", () =>
  Effect.gen(function* () {
    yield* seedAll;
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
    yield* seedAll;
    const evidence = yield* OrchestrationEvidenceService.OrchestrationEvidenceService;
    const reconstructed = yield* evidence.reconstructTaskHistory(projectId, taskId);

    assert.isFalse(
      reconstructed.events.some(
        (item) => item.recordId.includes("l2-20261101") || item.eventId.includes("l2-20261101"),
      ),
    );

    const classes = new Set(reconstructed.events.map((item) => item.lifecycleClass));
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

it.effect("fails cleanly when the task does not exist", () =>
  Effect.gen(function* () {
    yield* seedRuntime;
    const evidence = yield* OrchestrationEvidenceService.OrchestrationEvidenceService;
    const error = yield* Effect.flip(
      evidence.exportTask(projectId, ProjectRuntimeTaskId.make("missing-task")),
    );
    assert.equal(error._tag, "OrchestrationEvidenceTaskNotFoundError");
  }).pipe(Effect.provide(layerTest)),
);

it.effect("records exportedAt without changing stable item identity or source clocks", () =>
  Effect.gen(function* () {
    yield* seedAll;
    const evidence = yield* OrchestrationEvidenceService.OrchestrationEvidenceService;

    const first = yield* evidence.exportTask(projectId, taskId);
    yield* TestClock.adjust("1 hour");
    const second = yield* evidence.exportTask(projectId, taskId);

    assert.notEqual(first.generatedAt, second.generatedAt);
    assert.deepEqual(
      first.events.map((item) => item.eventId),
      second.events.map((item) => item.eventId),
    );
    assert.deepEqual(
      first.events.map((item) => item.exportedAt),
      first.events.map(() => first.generatedAt),
    );
    assert.deepEqual(
      second.events.map((item) => item.exportedAt),
      second.events.map(() => second.generatedAt),
    );

    const withoutExportClock = (item: (typeof first.events)[number]) => {
      const { exportedAt: _exportedAt, ...rest } = item;
      return rest;
    };
    assert.deepEqual(first.events.map(withoutExportClock), second.events.map(withoutExportClock));

    const firstJsonl = yield* evidence.exportTaskJsonl(projectId, taskId);
    yield* TestClock.adjust("1 hour");
    const secondJsonl = yield* evidence.exportTaskJsonl(projectId, taskId);
    assert.notEqual(firstJsonl, secondJsonl);
    const decodeAll = (jsonl: string) =>
      jsonl
        .split("\n")
        .filter(Boolean)
        .map((line) => decodeEvent(line));
    assert.deepEqual(
      decodeAll(firstJsonl).map(withoutExportClock),
      decodeAll(secondJsonl).map(withoutExportClock),
    );

    const capacity = second.events.find((item) => item.recordType === "adaptive-capacity-snapshot");
    assert.isNull(capacity?.recordedAt);
    assert.isTrue(capacity?.unknownFields.includes("recordedAt"));
  }).pipe(Effect.provide(layerTest)),
);

it.effect("does not put post-launch run identity on the decision event", () =>
  Effect.gen(function* () {
    yield* seedAll;
    const evidence = yield* OrchestrationEvidenceService.OrchestrationEvidenceService;
    const sql = yield* SqlClient.SqlClient;

    const eventId = `oev0:execution-attempt-decision:${pendingAttemptId}`;
    const lineFor = (jsonl: string) => {
      const line = jsonl
        .split("\n")
        .find((candidate) => decodeEvent(candidate).eventId === eventId);
      assert.isDefined(line);
      return line!;
    };

    const beforeLine = lineFor(yield* evidence.exportTaskJsonl(projectId, taskId));
    const before = decodeEvent(beforeLine);
    assert.isNull(before.runId);
    assert.isFalse(
      before.references.some((reference) => reference.recordType === "orchestration-v2-run"),
    );

    const completedPending: RuntimeExecutionAttempt = {
      ...pendingAttempt,
      status: "completed",
      revision: 2,
      runId: pendingRunId,
      updatedAt: "2026-11-01T08:25:00.000Z",
    };
    yield* sql`UPDATE project_runtime_execution_attempts
      SET status = ${completedPending.status}, revision = ${completedPending.revision},
        run_id = ${pendingRunId}, updated_at = ${completedPending.updatedAt},
        payload_json = ${encodeAttempt(completedPending)}
      WHERE attempt_id = ${pendingAttemptId}`;

    const afterLine = lineFor(yield* evidence.exportTaskJsonl(projectId, taskId));
    assert.strictEqual(afterLine, beforeLine);
  }).pipe(Effect.provide(layerTest)),
);

it.effect("derives a unique recommendation link and marks multiple receipts AMBIGUOUS", () =>
  Effect.gen(function* () {
    yield* seedAll;
    const adaptive = yield* AdaptiveRoutingService.AdaptiveRoutingService;
    const evidence = yield* OrchestrationEvidenceService.OrchestrationEvidenceService;
    const linkFor = (
      events: OrchestrationEvidenceExport["events"],
      attempt: RuntimeExecutionAttempt["attemptId"],
    ) =>
      events.find(
        (item) =>
          item.recordType === "adaptive-recommendation-attempt-link" && item.recordId === attempt,
      );

    const unique = linkFor((yield* evidence.exportTask(projectId, taskId)).events, attemptId);
    assert.equal(unique?.facts.find((fact) => fact.key === "status")?.value, "unique");
    assert.equal(
      unique?.facts.find((fact) => fact.key === "recommendationReceiptId")?.value,
      receiptId,
    );
    assert.equal(unique?.facts.find((fact) => fact.key === "candidateReceiptCount")?.value, 1);
    assert.equal(unique?.facts.find((fact) => fact.key === "authorization")?.value, "none");

    yield* adaptive.appendRecommendationReceipt(secondReceipt);

    const ambiguous = linkFor((yield* evidence.exportTask(projectId, taskId)).events, attemptId);
    assert.equal(ambiguous?.facts.find((fact) => fact.key === "status")?.value, "ambiguous");
    assert.isUndefined(ambiguous?.facts.find((fact) => fact.key === "recommendationReceiptId"));
    assert.equal(ambiguous?.facts.find((fact) => fact.key === "candidateReceiptCount")?.value, 2);
    const candidateIds = ambiguous?.facts.find((fact) => fact.key === "candidateReceiptIds")?.value;
    assert.isString(candidateIds);
    assert.deepEqual(
      (candidateIds as string).split(",").sort(),
      [receiptId, secondReceipt.recommendationReceiptId].sort(),
    );
  }).pipe(Effect.provide(layerTest)),
);

it.effect("represents real L2 staging references beside canonical synthetic evidence", () =>
  Effect.gen(function* () {
    yield* seedAll;
    const evidence = yield* OrchestrationEvidenceService.OrchestrationEvidenceService;
    const sql = yield* SqlClient.SqlClient;
    const reconstructed = yield* evidence.reconstructTaskHistory(projectId, taskId, {
      stagingReferences: [l2StagingReference],
    });

    const staging = reconstructed.events.filter(
      (item) => item.recordType === "project-staging-reference",
    );
    assert.equal(staging.length, 1);
    const item = staging[0]!;
    assert.equal(item.authority, "project-staging");
    assert.equal(item.recordBasis, "staging-reference");
    assert.equal(
      item.facts.find((fact) => fact.key === "branch")?.value,
      l2StagingReference.branch,
    );
    assert.equal(
      item.facts.find((fact) => fact.key === "commit")?.value,
      l2StagingReference.commit,
    );
    assert.equal(item.facts.find((fact) => fact.key === "decisionCount")?.value, 8);
    assert.equal(
      item.facts.find((fact) => fact.key === "evidenceClass")?.value,
      "orchestrator-claim",
    );
    assert.equal(item.facts.find((fact) => fact.key === "canonical")?.value, false);

    assert.isFalse(
      reconstructed.events.some(
        (event) =>
          event.authority !== "project-staging" &&
          l2StagingReference.decisionIds.some(
            (id) => event.recordId.includes(id) || event.eventId.includes(id),
          ),
      ),
      "L2 staging decision ids must not appear as canonical typed evidence",
    );
    assert.isTrue(
      reconstructed.events.some((event) => event.recordType === "project-runtime-task"),
    );
    assert.isTrue(
      reconstructed.events.some((event) => event.recordType === "orchestration-v2-event"),
    );

    const jsonl = yield* evidence.exportTaskJsonl(projectId, taskId, {
      stagingReferences: [l2StagingReference],
    });
    const decoded = jsonl
      .split("\n")
      .filter(Boolean)
      .map((line) => decodeEvent(line));
    assert.equal(
      decoded.filter((event) => event.recordType === "project-staging-reference").length,
      1,
    );
    for (const event of decoded) {
      assert.equal(event.schemaVersion, "orchestration-evidence/v0");
      assert.isString(event.exportedAt);
    }

    const evidenceTables = yield* sql<{ readonly count: number }>`SELECT COUNT(*) AS count
      FROM sqlite_schema WHERE type = 'table' AND name LIKE '%orchestration_evidence%'`;
    assert.equal(evidenceTables[0]?.count, 0);
  }).pipe(Effect.provide(layerTest)),
);

it.effect("keeps requested, selected, and executed model provenance separate", () =>
  Effect.gen(function* () {
    yield* seedAll;
    const adaptive = yield* AdaptiveRoutingService.AdaptiveRoutingService;
    const evidence = yield* OrchestrationEvidenceService.OrchestrationEvidenceService;
    const divergedId = AdaptiveExecutionObservationId.make("ev0-observation-diverged");
    const longEvidenceRef = `provider:${"y".repeat(300)}`;
    const { execution: _execution, ...observationBase } = observation;
    const diverged: AdaptiveExecutionObservationReference = {
      ...observationBase,
      observationId: divergedId,
      attemptId: pendingAttemptId,
      configuration: {
        requested: { instanceId: opencode, model: "requested-model" },
        selected: { instanceId: claude, model: "selected-model" },
        executed: {
          quality: "provider_reported",
          selection: { instanceId: opencode, model: "executed-model" },
          evidenceRef: longEvidenceRef,
        },
        substitutionReason: "provider substituted the requested model",
      },
    };
    yield* adaptive.appendExecutionObservationReference(diverged);

    const exported = yield* evidence.exportTask(projectId, taskId);
    const fact = (key: string) =>
      exported.events
        .find(
          (item) =>
            item.recordType === "adaptive-execution-observation" && item.recordId === divergedId,
        )
        ?.facts.find((entry) => entry.key === key)?.value;

    assert.equal(fact("configuration.requested.model"), "requested-model");
    assert.equal(fact("configuration.selected.model"), "selected-model");
    assert.equal(fact("configuration.executed.model"), "executed-model");
    assert.equal(fact("configuration.executed.quality"), "provider_reported");
    assert.equal(
      fact("configuration.substitutionReason"),
      "provider substituted the requested model",
    );

    const unknownObservation = exported.events.find(
      (item) =>
        item.recordType === "adaptive-execution-observation" && item.recordId === observationId,
    );
    assert.equal(
      unknownObservation?.facts.find((entry) => entry.key === "configuration.executed.quality")
        ?.value,
      "unknown",
    );
    assert.isUndefined(
      unknownObservation?.facts.find((entry) =>
        entry.key.startsWith("configuration.executed.instanceId"),
      ),
    );

    const jsonl = yield* evidence.exportTaskJsonl(projectId, taskId);
    const decoded = jsonl
      .split("\n")
      .filter(Boolean)
      .map((line) => decodeEvent(line));
    const decodedDiverged = decoded.find((event) => event.recordId === divergedId);
    assert.equal(
      decodedDiverged?.facts.find((entry) => entry.key === "configuration.executed.evidenceRef")
        ?.value,
      longEvidenceRef,
    );
  }).pipe(Effect.provide(layerTest)),
);

it.effect(
  "reconstructs Runtime verification references without inferring ARM verification facts",
  () =>
    Effect.gen(function* () {
      yield* seedAll;
      const evidence = yield* OrchestrationEvidenceService.OrchestrationEvidenceService;
      const reconstructed = yield* evidence.reconstructTaskHistory(projectId, taskId);

      const runtimeVerification = reconstructed.events.filter(
        (item) => item.recordType === "project-runtime-verification",
      );
      assert.equal(runtimeVerification.length, task.verification.evidence.length);
      const item = runtimeVerification[0]!;
      assert.equal(item.authority, "project-runtime");
      assert.equal(item.recordBasis, "derived-view");
      assert.equal(item.recordedAt, completedAttempt);
      assert.equal(item.facts.find((fact) => fact.key === "result")?.value, "pass");
      assert.equal(item.facts.find((fact) => fact.key === "taskRevision")?.value, task.revision);
      assert.equal(
        item.facts.find((fact) => fact.key === "command")?.value,
        "vp test run OrchestrationEvidenceService.test.ts",
      );
      assert.isUndefined(item.facts.find((fact) => fact.key === "verification.independence"));
      assert.isUndefined(item.facts.find((fact) => fact.key === "verification.strength"));
      assert.isUndefined(item.facts.find((fact) => fact.key === "verification.requiredKinds"));

      const adaptiveObservation = reconstructed.events.find(
        (event) => event.recordType === "adaptive-execution-observation",
      );
      assert.equal(adaptiveObservation?.authority, "arm");
      assert.equal(
        adaptiveObservation?.facts.find((fact) => fact.key === "verification.independence")?.value,
        "cross-provider",
      );
    }).pipe(Effect.provide(layerTest)),
);

it.effect("loads the canonical handoff row when the latest handoff pointer resolves", () =>
  Effect.gen(function* () {
    yield* seedAll;
    const sql = yield* SqlClient.SqlClient;
    const evidence = yield* OrchestrationEvidenceService.OrchestrationEvidenceService;
    const taskWithHandoff: ProjectRuntimeTask = {
      ...task,
      latestHandoffId: handoffId,
      revision: 4,
      updatedAt: handoff.createdAt,
    };
    yield* sql`UPDATE project_runtime_tasks
      SET status = ${taskWithHandoff.status}, revision = ${taskWithHandoff.revision},
        payload_json = ${encodeTask(taskWithHandoff)}
      WHERE task_id = ${taskId} AND project_id = ${projectId}`;
    yield* sql`INSERT INTO project_runtime_handoffs
      (handoff_id, project_id, task_id, created_at, payload_json)
      VALUES (${handoff.handoffId}, ${projectId}, ${taskId}, ${handoff.createdAt},
        ${encodeHandoff(handoff)})`;

    const exported = yield* evidence.exportTask(projectId, taskId);
    const handoffItems = exported.events.filter(
      (item) => item.recordType === "project-runtime-handoff",
    );
    assert.equal(handoffItems.length, 1);
    const item = handoffItems[0]!;
    assert.equal(item.recordId, handoffId);
    assert.equal(item.authority, "project-runtime");
    assert.equal(item.recordBasis, "canonical-record");
    assert.equal(item.recordedAt, handoff.createdAt);
    assert.isNull(item.occurredAt);
    assert.equal(item.facts.find((fact) => fact.key === "checkpoint")?.value, handoff.checkpoint);
    assert.equal(
      item.facts.find((fact) => fact.key === "taskRevision")?.value,
      handoff.taskRevision,
    );
    assert.equal(
      item.facts.find((fact) => fact.key === "runtimeRevision")?.value,
      handoff.runtimeRevision,
    );
    assert.isTrue(
      item.references.some(
        (reference) =>
          reference.recordType === "project-runtime-task" && reference.recordId === taskId,
      ),
    );

    const taskEvent = exported.events.find((event) => event.recordType === "project-runtime-task");
    assert.isTrue(
      taskEvent?.references.some(
        (reference) =>
          reference.recordType === "project-runtime-handoff" && reference.recordId === handoffId,
      ),
    );

    const serializedFacts = JSON.stringify(item.facts);
    assert.isFalse(serializedFacts.includes(handoff.summary));
    assert.isFalse(serializedFacts.includes(handoff.result!));

    const jsonl = yield* evidence.exportTaskJsonl(projectId, taskId);
    const decoded = jsonl
      .split("\n")
      .filter(Boolean)
      .map((line) => decodeEvent(line));
    assert.equal(
      decoded.filter((event) => event.recordType === "project-runtime-handoff").length,
      1,
    );
  }).pipe(Effect.provide(layerTest)),
);

it.effect("does not claim a canonical handoff when the pointer cannot resolve", () =>
  Effect.gen(function* () {
    yield* seedAll;
    const sql = yield* SqlClient.SqlClient;
    const evidence = yield* OrchestrationEvidenceService.OrchestrationEvidenceService;
    const danglingId = ProjectRuntimeHandoffId.make("ev0-handoff-missing");
    const taskWithDanglingPointer: ProjectRuntimeTask = {
      ...task,
      latestHandoffId: danglingId,
      revision: 4,
    };
    yield* sql`UPDATE project_runtime_tasks
      SET status = ${taskWithDanglingPointer.status},
        revision = ${taskWithDanglingPointer.revision},
        payload_json = ${encodeTask(taskWithDanglingPointer)}
      WHERE task_id = ${taskId} AND project_id = ${projectId}`;

    const exported = yield* evidence.exportTask(projectId, taskId);
    assert.isFalse(exported.events.some((item) => item.recordType === "project-runtime-handoff"));
    const unresolved = exported.events.find(
      (item) => item.recordType === "project-runtime-handoff-unresolved",
    );
    assert.isDefined(unresolved);
    assert.equal(unresolved?.recordId, danglingId);
    assert.equal(unresolved?.authority, "project-runtime");
    assert.equal(unresolved?.recordBasis, "derived-view");
    assert.isNull(unresolved?.occurredAt ?? null);
    assert.isNull(unresolved?.recordedAt ?? null);
    assert.isTrue(unresolved?.unknownFields.includes("canonicalRecord"));
    assert.equal(unresolved?.facts.find((fact) => fact.key === "status")?.value, "unresolved");
    assert.isUndefined(unresolved?.facts.find((fact) => fact.key === "canonicalRecord"));

    const jsonl = yield* evidence.exportTaskJsonl(projectId, taskId);
    const decoded = jsonl
      .split("\n")
      .filter(Boolean)
      .map((line) => decodeEvent(line));
    assert.isFalse(decoded.some((event) => event.recordType === "project-runtime-handoff"));
    assert.isTrue(
      decoded.some((event) => event.recordType === "project-runtime-handoff-unresolved"),
    );
  }).pipe(Effect.provide(layerTest)),
);

it.effect("does not claim a canonical handoff when payload identity disagrees with the row", () =>
  Effect.gen(function* () {
    yield* seedAll;
    const sql = yield* SqlClient.SqlClient;
    const evidence = yield* OrchestrationEvidenceService.OrchestrationEvidenceService;
    const taskWithHandoff: ProjectRuntimeTask = {
      ...task,
      latestHandoffId: handoffId,
      revision: 4,
      updatedAt: handoff.createdAt,
    };
    yield* sql`UPDATE project_runtime_tasks
      SET status = ${taskWithHandoff.status}, revision = ${taskWithHandoff.revision},
        payload_json = ${encodeTask(taskWithHandoff)}
      WHERE task_id = ${taskId} AND project_id = ${projectId}`;
    const mismatched: ProjectRuntimeHandoff = {
      ...handoff,
      handoffId: ProjectRuntimeHandoffId.make("ev0-handoff-payload-only"),
    };
    yield* sql`INSERT INTO project_runtime_handoffs
      (handoff_id, project_id, task_id, created_at, payload_json)
      VALUES (${handoffId}, ${projectId}, ${taskId}, ${handoff.createdAt},
        ${encodeHandoff(mismatched)})`;

    const exported = yield* evidence.exportTask(projectId, taskId);
    assert.isFalse(exported.events.some((item) => item.recordType === "project-runtime-handoff"));
    const unresolved = exported.events.find(
      (item) => item.recordType === "project-runtime-handoff-unresolved",
    );
    assert.isDefined(unresolved);
    assert.equal(unresolved?.recordId, handoffId);
    assert.equal(unresolved?.facts.find((fact) => fact.key === "status")?.value, "unresolved");
  }).pipe(Effect.provide(layerTest)),
);

it.effect("uses explicit authorities for Runtime, ARM, V2, and staging evidence", () =>
  Effect.gen(function* () {
    yield* seedAll;
    const evidence = yield* OrchestrationEvidenceService.OrchestrationEvidenceService;
    const reconstructed = yield* evidence.reconstructTaskHistory(projectId, taskId, {
      stagingReferences: [l2StagingReference],
    });
    const authorities = new Set(reconstructed.events.map((item) => item.authority));
    assert.isTrue(authorities.has("project-runtime"));
    assert.isTrue(authorities.has("runtime-execution"));
    assert.isTrue(authorities.has("arm"));
    assert.isTrue(authorities.has("orchestration-v2"));
    assert.isTrue(authorities.has("project-staging"));
  }).pipe(Effect.provide(layerTest)),
);

it.effect("preserves run-attempt execution identities in V2 evidence", () =>
  Effect.gen(function* () {
    yield* seedAll;
    const eventStore = yield* EventStore.EventStoreV2;
    yield* eventStore.append({ events: [v2RunAttemptCreated] });
    const evidence = yield* OrchestrationEvidenceService.OrchestrationEvidenceService;
    const exported = yield* evidence.exportTask(projectId, taskId);

    const item = exported.events.find((event) => event.recordId === v2RunAttemptCreatedId);
    assert.isDefined(item);
    assert.equal(item?.runId, runId);
    assert.equal(item?.facts.find((fact) => fact.key === "payload.runId")?.value, runId);
    assert.isTrue(
      item?.references.some(
        (reference) =>
          reference.recordType === "orchestration-v2-run-attempt" &&
          reference.recordId === runAttemptId,
      ),
    );
    assert.isTrue(
      item?.references.some(
        (reference) =>
          reference.recordType === "orchestration-v2-node" && reference.recordId === nodeId,
      ),
    );
    assert.isTrue(
      item?.references.some(
        (reference) =>
          reference.recordType === "orchestration-v2-provider-thread" &&
          reference.recordId === providerThreadId,
      ),
    );
    assert.isFalse(
      exported.events.some(
        (event) =>
          event.recordType === "orchestration-v2-unresolved" && event.recordId === runAttemptId,
      ),
    );
  }).pipe(Effect.provide(layerTest)),
);

it.effect("orders V2 evidence by canonical sequence even when source times disagree", () =>
  Effect.gen(function* () {
    yield* seedAll;
    const eventStore = yield* EventStore.EventStoreV2;
    const firstNodeId = NodeId.make("node:ev0-sequence-three");
    const secondNodeId = NodeId.make("node:ev0-sequence-four");
    yield* eventStore.append({
      events: [
        v2NodeUpdated(firstNodeId, "2026-11-01T09:00:00.000Z"),
        v2NodeUpdated(secondNodeId, "2026-11-01T07:00:00.000Z"),
      ],
    });
    const evidence = yield* OrchestrationEvidenceService.OrchestrationEvidenceService;
    const exported = yield* evidence.exportTask(projectId, taskId);
    const sequences = exported.events
      .filter((event) => event.recordType === "orchestration-v2-event")
      .map((event) => event.facts.find((fact) => fact.key === "sequence")?.value);
    assert.deepEqual(sequences, [1, 2, 3, 4]);
  }).pipe(Effect.provide(layerTest)),
);

it.effect("keeps long Runtime verification summaries decodable in JSONL", () =>
  Effect.gen(function* () {
    yield* seedAll;
    const sql = yield* SqlClient.SqlClient;
    const evidence = yield* OrchestrationEvidenceService.OrchestrationEvidenceService;
    const longSummary = `verification ${"x".repeat(800)}`;
    const modifiedTask: ProjectRuntimeTask = {
      ...task,
      verification: {
        ...task.verification,
        evidence: task.verification.evidence.map((item, index) =>
          index === 0 ? { ...item, summary: longSummary } : item,
        ),
      },
    };
    yield* sql`UPDATE project_runtime_tasks
      SET payload_json = ${encodeTask(modifiedTask)}
      WHERE task_id = ${taskId} AND project_id = ${projectId}`;

    const jsonl = yield* evidence.exportTaskJsonl(projectId, taskId);
    const decoded = jsonl
      .split("\n")
      .filter(Boolean)
      .map((line) => decodeEvent(line));
    const verification = decoded.find(
      (event) => event.recordType === "project-runtime-verification",
    );
    assert.isDefined(verification);
    assert.isAtMost(verification!.summary.length, 512);
    assert.equal(verification!.facts.find((fact) => fact.key === "summary")?.value, longSummary);
  }).pipe(Effect.provide(layerTest)),
);

it.effect(
  "leaves unsupported occurrence clocks UNKNOWN when ARM records expose only createdAt",
  () =>
    Effect.gen(function* () {
      yield* seedAll;
      const evidence = yield* OrchestrationEvidenceService.OrchestrationEvidenceService;
      const exported = yield* evidence.exportTask(projectId, taskId);
      const byType = (recordType: string) =>
        exported.events.find((event) => event.recordType === recordType);

      const taskEvent = byType("project-runtime-task");
      assert.isNull(taskEvent?.occurredAt ?? null);
      assert.equal(taskEvent?.recordedAt, completedAttempt);
      assert.isTrue(taskEvent?.unknownFields.includes("occurredAt"));

      const decisionEvent = byType("execution-attempt-decision");
      assert.isNull(decisionEvent?.occurredAt ?? null);
      assert.equal(decisionEvent?.recordedAt, createdAttempt);
      assert.isTrue(decisionEvent?.unknownFields.includes("occurredAt"));

      const prediction = byType("adaptive-difficulty-prediction");
      assert.isNull(prediction?.occurredAt ?? null);
      assert.equal(prediction?.recordedAt, createdTask);
      assert.isTrue(prediction?.unknownFields.includes("occurredAt"));

      const receiptEvent = byType("adaptive-recommendation-receipt");
      assert.isNull(receiptEvent?.occurredAt ?? null);
      assert.equal(receiptEvent?.recordedAt, createdTask);
      assert.isTrue(receiptEvent?.unknownFields.includes("occurredAt"));

      const observationEvent = byType("adaptive-execution-observation");
      assert.isNull(observationEvent?.occurredAt ?? null);
      assert.equal(observationEvent?.recordedAt, completedAttempt);
      assert.isTrue(observationEvent?.unknownFields.includes("occurredAt"));

      const capacityPoolEvent = byType("adaptive-capacity-pool");
      assert.isNull(capacityPoolEvent?.occurredAt ?? null);
      assert.equal(capacityPoolEvent?.recordedAt, createdAttempt);

      const capacitySnapshotEvent = byType("adaptive-capacity-snapshot");
      assert.equal(capacitySnapshotEvent?.occurredAt, createdAttempt);
      assert.isNull(capacitySnapshotEvent?.recordedAt ?? null);
    }).pipe(Effect.provide(layerTest)),
);

it.effect("does not attach a payload-only run event from an unrelated run", () =>
  Effect.gen(function* () {
    yield* seedAll;
    const eventStore = yield* EventStore.EventStoreV2;
    const otherRunId = RunId.make("run:ev0-unrelated");
    const otherAttemptEventId = EventId.make("event:ev0-other-run-attempt");
    yield* eventStore.append({
      events: [
        {
          id: otherAttemptEventId,
          type: "run-attempt.created",
          threadId,
          occurredAt: v2At,
          payload: {
            id: RunAttemptId.make("run-attempt:ev0-unrelated"),
            runId: otherRunId,
            attemptOrdinal: 1,
            rootNodeId: NodeId.make("node:ev0-unrelated"),
            providerInstanceId: opencode,
            providerThreadId: ProviderThreadId.make("provider-thread:ev0-unrelated"),
            providerTurnId: null,
            reason: "initial",
            status: "running",
            startedAt: v2At,
            completedAt: null,
          },
        },
      ],
    });
    const evidence = yield* OrchestrationEvidenceService.OrchestrationEvidenceService;
    const exported = yield* evidence.exportTask(projectId, taskId);
    assert.isFalse(exported.events.some((event) => event.recordId === otherAttemptEventId));
    assert.isFalse(exported.events.some((event) => event.runId === otherRunId));
  }).pipe(Effect.provide(layerTest)),
);

it.effect("orders ARM outcome reconciliations by revision when clocks tie", () =>
  Effect.gen(function* () {
    yield* seedAll;
    const adaptive = yield* AdaptiveRoutingService.AdaptiveRoutingService;
    const evidence = yield* OrchestrationEvidenceService.OrchestrationEvidenceService;
    const tiedAt = "2026-11-01T08:40:00.000Z";
    yield* adaptive.reconcileAcceptedOutcome({
      reconciliationId: AdaptiveOutcomeReconciliationId.make("z-first-reconciliation"),
      outcomeId,
      expectedRevision: 1,
      state: "accepted_after_rework",
      provenance: {
        authority: "external_review",
        reference: "review:first",
        observedAt: tiedAt,
      },
      evidenceRefs: ["review:first"],
      reconciledAt: tiedAt,
    });
    yield* adaptive.reconcileAcceptedOutcome({
      reconciliationId: AdaptiveOutcomeReconciliationId.make("a-second-reconciliation"),
      outcomeId,
      expectedRevision: 2,
      state: "accepted_without_rework",
      provenance: {
        authority: "external_review",
        reference: "review:second",
        observedAt: tiedAt,
      },
      evidenceRefs: ["review:second"],
      reconciledAt: tiedAt,
    });

    const exported = yield* evidence.exportTask(projectId, taskId);
    const corrections = exported.events.filter(
      (event) => event.recordType === "adaptive-outcome-reconciliation",
    );
    assert.deepEqual(
      corrections.map((event) => event.facts.find((fact) => fact.key === "fromRevision")?.value),
      [1, 2],
    );
    assert.deepEqual(
      corrections.map((event) => event.recordId),
      ["z-first-reconciliation", "a-second-reconciliation"],
    );
    const outcomeHeads = exported.events.filter(
      (event) => event.recordType === "adaptive-accepted-outcome",
    );
    assert.deepEqual(
      outcomeHeads.map((event) => event.facts.find((fact) => fact.key === "revision")?.value),
      [1, 2, 3],
    );
  }).pipe(Effect.provide(layerTest)),
);

it.effect("keeps wide capacity snapshots decodable within bounds", () =>
  Effect.gen(function* () {
    yield* seedAll;
    const adaptive = yield* AdaptiveRoutingService.AdaptiveRoutingService;
    const evidence = yield* OrchestrationEvidenceService.OrchestrationEvidenceService;
    const wideSnapshotId = AdaptiveCapacitySnapshotId.make("ev0-snapshot-wide");
    const wideSnapshot: AdaptiveCapacitySnapshot = {
      ...snapshot,
      snapshotId: wideSnapshotId,
      windows: Array.from({ length: 50 }, (_, index) => ({
        windowId: `window-${index}`,
        windowType: "session" as const,
        used: { quality: "unknown" as const },
        remaining: { quality: "unknown" as const },
        limit: { quality: "unknown" as const },
      })),
    };
    yield* adaptive.appendCapacitySnapshot(wideSnapshot);
    yield* adaptive.appendRecommendationReceipt({
      ...receipt,
      recommendationReceiptId: AdaptiveRecommendationReceiptId.make("ev0-receipt-wide"),
      capacitySnapshotIds: [wideSnapshotId],
    });

    const jsonl = yield* evidence.exportTaskJsonl(projectId, taskId);
    const decoded = jsonl
      .split("\n")
      .filter(Boolean)
      .map((line) => decodeEvent(line));
    const wide = decoded.find(
      (event) =>
        event.recordType === "adaptive-capacity-snapshot" && event.recordId === wideSnapshotId,
    );
    assert.isDefined(wide);
    assert.isAtLeast(wide!.facts.length, 100);
    assert.equal(wide!.facts.find((fact) => fact.key === "windows.count")?.value, 50);
  }).pipe(Effect.provide(layerTest)),
);

it.effect("resolves provider-session.detached without a false unresolved marker", () =>
  Effect.gen(function* () {
    yield* seedAll;
    const eventStore = yield* EventStore.EventStoreV2;
    const detachedEventId = EventId.make("event:ev0-provider-session-detached");
    yield* eventStore.append({
      events: [
        {
          id: detachedEventId,
          type: "provider-session.detached",
          threadId,
          occurredAt: v2At,
          payload: {
            providerSessionId,
            detachedAt: v2At,
            reason: "test",
          },
        },
      ],
    });
    const evidence = yield* OrchestrationEvidenceService.OrchestrationEvidenceService;
    const exported = yield* evidence.exportTask(projectId, taskId);
    const item = exported.events.find((event) => event.recordId === detachedEventId);
    assert.isDefined(item);
    assert.isTrue(
      item?.references.some(
        (reference) =>
          reference.recordType === "orchestration-v2-provider-session" &&
          reference.recordId === providerSessionId,
      ),
    );
    assert.isFalse(
      exported.events.some(
        (event) =>
          event.recordType === "orchestration-v2-unresolved" &&
          event.recordId === providerSessionId,
      ),
    );
  }).pipe(Effect.provide(layerTest)),
);

it.effect("keeps large recommendation candidate sets decodable within reference bounds", () =>
  Effect.gen(function* () {
    yield* seedAll;
    const adaptive = yield* AdaptiveRoutingService.AdaptiveRoutingService;
    const evidence = yield* OrchestrationEvidenceService.OrchestrationEvidenceService;
    for (let index = 0; index < 101; index += 1) {
      yield* adaptive.appendRecommendationReceipt({
        ...receipt,
        recommendationReceiptId: AdaptiveRecommendationReceiptId.make(`ev0-receipt-bulk-${index}`),
      });
    }
    const jsonl = yield* evidence.exportTaskJsonl(projectId, taskId);
    const decoded = jsonl
      .split("\n")
      .filter(Boolean)
      .map((line) => decodeEvent(line));
    const link = decoded.find(
      (event) =>
        event.recordType === "adaptive-recommendation-attempt-link" && event.recordId === attemptId,
    );
    assert.equal(link?.facts.find((fact) => fact.key === "candidateReceiptCount")?.value, 102);
    assert.equal(link?.facts.find((fact) => fact.key === "status")?.value, "ambiguous");
    assert.isAtLeast(link?.references.length ?? 0, 103);
  }).pipe(Effect.provide(layerTest)),
);
