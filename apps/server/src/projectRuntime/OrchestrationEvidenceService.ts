import {
  AdaptiveAcceptedOutcome,
  AdaptiveCapacityPool,
  AdaptiveCapacitySnapshot,
  AdaptiveDifficultyPrediction,
  AdaptiveExecutionObservationReference,
  AdaptiveExperimentAssignment,
  AdaptiveOutcomeReconciliation,
  AdaptiveRealizedDifficulty,
  AdaptiveRecommendationReceipt,
  ORCHESTRATION_EVIDENCE_SCHEMA_VERSION,
  OrchestrationEvidenceEvent,
  OrchestrationEvidenceTaskNotFoundError,
  ProjectRuntimeTask,
  RuntimeExecutionAttempt,
  type OrchestrationEvidenceClass,
  type OrchestrationEvidenceExport,
  type OrchestrationEvidenceFact,
  type OrchestrationEvidenceReconstruction,
  type OrchestrationEvidenceReference,
  type RuntimeExecutionAttemptStatus,
} from "@t3tools/contracts";
import * as Context from "effect/Context";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import * as SqlClient from "effect/sql/SqlClient";

import { PersistenceDecodeError, PersistenceSqlError } from "../persistence/Errors.ts";

type EvidenceError =
  | OrchestrationEvidenceTaskNotFoundError
  | PersistenceSqlError
  | PersistenceDecodeError;
type Result<A> = Effect.Effect<A, EvidenceError>;

export interface OrchestrationEvidenceShape {
  readonly exportTask: (
    projectId: ProjectRuntimeTask["projectId"],
    taskId: ProjectRuntimeTask["taskId"],
  ) => Result<OrchestrationEvidenceExport>;
  readonly exportTaskJsonl: (
    projectId: ProjectRuntimeTask["projectId"],
    taskId: ProjectRuntimeTask["taskId"],
  ) => Result<string>;
  readonly reconstructTaskHistory: (
    projectId: ProjectRuntimeTask["projectId"],
    taskId: ProjectRuntimeTask["taskId"],
  ) => Result<OrchestrationEvidenceReconstruction>;
}

export class OrchestrationEvidenceService extends Context.Service<
  OrchestrationEvidenceService,
  OrchestrationEvidenceShape
>()("t3/projectRuntime/OrchestrationEvidenceService") {}

type PayloadRow = { readonly payload_json: string };
type FactValue = string | number | boolean | null;

const TaskJson = Schema.fromJsonString(ProjectRuntimeTask);
const AttemptJson = Schema.fromJsonString(RuntimeExecutionAttempt);
const DifficultyPredictionJson = Schema.fromJsonString(AdaptiveDifficultyPrediction);
const RealizedDifficultyJson = Schema.fromJsonString(AdaptiveRealizedDifficulty);
const ExecutionObservationJson = Schema.fromJsonString(AdaptiveExecutionObservationReference);
const AcceptedOutcomeJson = Schema.fromJsonString(AdaptiveAcceptedOutcome);
const OutcomeReconciliationJson = Schema.fromJsonString(AdaptiveOutcomeReconciliation);
const RecommendationReceiptJson = Schema.fromJsonString(AdaptiveRecommendationReceipt);
const ExperimentAssignmentJson = Schema.fromJsonString(AdaptiveExperimentAssignment);
const CapacityPoolJson = Schema.fromJsonString(AdaptiveCapacityPool);
const CapacitySnapshotJson = Schema.fromJsonString(AdaptiveCapacitySnapshot);
const EvidenceEventJson = Schema.fromJsonString(OrchestrationEvidenceEvent);

const decodeTask = Schema.decodeUnknownEffect(TaskJson);
const decodeAttempt = Schema.decodeUnknownEffect(AttemptJson);
const decodeDifficultyPrediction = Schema.decodeUnknownEffect(DifficultyPredictionJson);
const decodeRealizedDifficulty = Schema.decodeUnknownEffect(RealizedDifficultyJson);
const decodeExecutionObservation = Schema.decodeUnknownEffect(ExecutionObservationJson);
const decodeAcceptedOutcome = Schema.decodeUnknownEffect(AcceptedOutcomeJson);
const decodeOutcomeReconciliation = Schema.decodeUnknownEffect(OutcomeReconciliationJson);
const decodeRecommendationReceipt = Schema.decodeUnknownEffect(RecommendationReceiptJson);
const decodeExperimentAssignment = Schema.decodeUnknownEffect(ExperimentAssignmentJson);
const decodeCapacityPool = Schema.decodeUnknownEffect(CapacityPoolJson);
const decodeCapacitySnapshot = Schema.decodeUnknownEffect(CapacitySnapshotJson);
const encodeEvidenceEventJson = Schema.encodeEffect(EvidenceEventJson);

const CLASS_ORDER: Record<OrchestrationEvidenceClass, number> = {
  observation: 0,
  decision: 1,
  assessment: 2,
  outcome: 3,
  correction: 4,
};
const UNKNOWN_TIME = "9999-12-31T23:59:59.999Z";

const facts = (
  entries: ReadonlyArray<readonly [key: string, value: FactValue | undefined]>,
): ReadonlyArray<OrchestrationEvidenceFact> =>
  entries.flatMap(([key, value]) => (value === undefined ? [] : [{ key, value }]));

const references = (
  entries: ReadonlyArray<readonly [recordType: string, recordId: string | null | undefined]>,
): ReadonlyArray<OrchestrationEvidenceReference> =>
  entries.flatMap(([recordType, recordId]) =>
    recordId === null || recordId === undefined ? [] : [{ recordType, recordId }],
  );

const event = (input: OrchestrationEvidenceEvent): OrchestrationEvidenceEvent => input;

const isTerminalAttemptStatus = (status: RuntimeExecutionAttemptStatus): boolean =>
  status === "completed" ||
  status === "failed" ||
  status === "cancelled" ||
  status === "interrupted";

const taskEvent = (task: ProjectRuntimeTask, generatedAt: string): OrchestrationEvidenceEvent =>
  event({
    schemaVersion: ORCHESTRATION_EVIDENCE_SCHEMA_VERSION,
    eventId: `oev0:project-runtime-task:${task.taskId}`,
    recordType: "project-runtime-task",
    recordId: task.taskId,
    evidenceClass: "observation",
    recordNature: "derived",
    source: "runtime",
    projectId: task.projectId,
    taskId: task.taskId,
    attemptId: null,
    threadId: null,
    runId: null,
    occurredAt: task.updatedAt,
    recordedAt: generatedAt,
    summary: `Runtime task ${task.status} at revision ${task.revision}`,
    unknownFields: [],
    references: references([["project-runtime-handoff", task.latestHandoffId]]),
    facts: facts([
      ["status", task.status],
      ["revision", task.revision],
      ["verification.milestone", task.verification.milestone],
      ["verification.evidenceCount", task.verification.evidence.length],
      ["blocker.classification", task.blocker?.classification ?? null],
      ["acceptanceCriteria.count", task.acceptanceCriteria.length],
      ["routing.role", task.routing?.role],
    ]),
  });

const attemptDecisionEvent = (attempt: RuntimeExecutionAttempt): OrchestrationEvidenceEvent => {
  const selected = attempt.receipt.route.selected;
  const launch = attempt.receipt.launch;
  return event({
    schemaVersion: ORCHESTRATION_EVIDENCE_SCHEMA_VERSION,
    eventId: `oev0:execution-attempt-decision:${attempt.attemptId}`,
    recordType: "execution-attempt-decision",
    recordId: attempt.attemptId,
    evidenceClass: "decision",
    recordNature: "derived",
    source: "runtime",
    projectId: attempt.projectId,
    taskId: attempt.taskId,
    attemptId: attempt.attemptId,
    threadId: attempt.threadId,
    runId: attempt.runId,
    occurredAt: attempt.createdAt,
    recordedAt: attempt.createdAt,
    summary:
      selected === null
        ? `Routing decision ${attempt.receipt.route.status} without a selected route`
        : `Routing decision ${attempt.receipt.route.source}: ${selected.providerInstanceId}/${selected.model}`,
    unknownFields: [],
    references: references([
      ["project-runtime-task", attempt.taskId],
      ["orchestration-v2-thread", attempt.threadId],
      ["orchestration-v2-run", attempt.runId],
    ]),
    facts: facts([
      ["route.status", attempt.receipt.route.status],
      ["route.source", attempt.receipt.route.source],
      ["route.role", attempt.receipt.route.role],
      ["route.selected.present", selected !== null],
      ["route.selected.providerInstanceId", selected?.providerInstanceId],
      ["route.selected.driverKind", selected?.driverKind],
      ["route.selected.model", selected?.model],
      ["route.selected.isolation", selected?.isolation],
      ["route.rejected.count", attempt.receipt.route.rejected.length],
      ["launch.modelSelection.instanceId", launch.modelSelection.instanceId],
      ["launch.modelSelection.model", launch.modelSelection.model],
      ["launch.runtimeMode", launch.runtimeMode],
      ["launch.interactionMode", launch.interactionMode],
      ["launch.workspaceStrategy.type", launch.workspaceStrategy.type],
      ["packet.version", attempt.receipt.packet.version],
      ["packet.taskRevision", attempt.receipt.packet.taskRevision],
      ["packet.handoffId", attempt.receipt.packet.handoffId ?? null],
      ["packet.textLength", attempt.receipt.packet.text.length],
    ]),
  });
};

const attemptOutcomeEvent = (attempt: RuntimeExecutionAttempt): OrchestrationEvidenceEvent => {
  const terminal = isTerminalAttemptStatus(attempt.status);
  return event({
    schemaVersion: ORCHESTRATION_EVIDENCE_SCHEMA_VERSION,
    eventId: `oev0:execution-attempt-outcome:${attempt.attemptId}`,
    recordType: "execution-attempt-outcome",
    recordId: attempt.attemptId,
    evidenceClass: "outcome",
    recordNature: "derived",
    source: "runtime",
    projectId: attempt.projectId,
    taskId: attempt.taskId,
    attemptId: attempt.attemptId,
    threadId: attempt.threadId,
    runId: attempt.runId,
    occurredAt: terminal ? attempt.updatedAt : null,
    recordedAt: attempt.updatedAt,
    summary: terminal
      ? `Execution attempt ${attempt.status}`
      : `Execution attempt ${attempt.status}; terminal outcome not yet observed`,
    unknownFields: terminal ? [] : ["occurredAt", "outcome"],
    references: references([
      ["execution-attempt-decision", attempt.attemptId],
      ["project-runtime-task", attempt.taskId],
      ["orchestration-v2-thread", attempt.threadId],
      ["orchestration-v2-run", attempt.runId],
    ]),
    facts: facts([
      ["status", attempt.status],
      ["revision", attempt.revision],
      ["failure.present", attempt.failure !== null],
    ]),
  });
};

const difficultyPredictionEvent = (
  prediction: AdaptiveDifficultyPrediction,
): OrchestrationEvidenceEvent =>
  event({
    schemaVersion: ORCHESTRATION_EVIDENCE_SCHEMA_VERSION,
    eventId: `oev0:adaptive-difficulty-prediction:${prediction.predictionId}`,
    recordType: "adaptive-difficulty-prediction",
    recordId: prediction.predictionId,
    evidenceClass: "decision",
    recordNature: "canonical",
    source: "adaptive-routing",
    projectId: prediction.projectId,
    taskId: prediction.taskId,
    attemptId: null,
    threadId: null,
    runId: null,
    occurredAt: prediction.createdAt,
    recordedAt: prediction.createdAt,
    summary: `Difficulty prediction ${prediction.assessment.band}`,
    unknownFields: [],
    references: references([["project-runtime-task", prediction.taskId]]),
    facts: facts([
      ["band", prediction.assessment.band],
      ["confidence", prediction.assessment.confidence],
      ["ambiguity", prediction.assessment.dimensions.ambiguity],
      ["scopeBreadth", prediction.assessment.dimensions.scopeBreadth],
      ["reasoningComplexity", prediction.assessment.dimensions.reasoningComplexity],
      ["integrationToolComplexity", prediction.assessment.dimensions.integrationToolComplexity],
      ["risk", prediction.assessment.dimensions.risk],
      ["verificationBurden", prediction.assessment.dimensions.verificationBurden],
      ["predictionVersion", prediction.predictionVersion],
      ["inputFingerprint", prediction.inputFingerprint],
      ["taskRevision", prediction.taskRevision],
      ["override.present", prediction.override !== undefined],
    ]),
  });

const realizedDifficultyEvent = (
  realized: AdaptiveRealizedDifficulty,
): OrchestrationEvidenceEvent =>
  event({
    schemaVersion: ORCHESTRATION_EVIDENCE_SCHEMA_VERSION,
    eventId: `oev0:adaptive-realized-difficulty:${realized.realizedDifficultyId}`,
    recordType: "adaptive-realized-difficulty",
    recordId: realized.realizedDifficultyId,
    evidenceClass: "assessment",
    recordNature: "canonical",
    source: "adaptive-routing",
    projectId: realized.projectId,
    taskId: realized.taskId,
    attemptId: null,
    threadId: null,
    runId: null,
    occurredAt: realized.createdAt,
    recordedAt: realized.createdAt,
    summary: `Realized difficulty ${realized.assessment.band}`,
    unknownFields: [],
    references: references([["project-runtime-task", realized.taskId]]),
    facts: facts([
      ["band", realized.assessment.band],
      ["confidence", realized.assessment.confidence],
      ["derivationVersion", realized.derivationVersion],
      ["evidenceRef.count", realized.evidenceRefs.length],
    ]),
  });

const executionObservationEvent = (
  observation: AdaptiveExecutionObservationReference,
): OrchestrationEvidenceEvent => {
  const configuration = observation.configuration;
  const executed = configuration?.executed;
  const verification = observation.verification;
  return event({
    schemaVersion: ORCHESTRATION_EVIDENCE_SCHEMA_VERSION,
    eventId: `oev0:adaptive-execution-observation:${observation.observationId}`,
    recordType: "adaptive-execution-observation",
    recordId: observation.observationId,
    evidenceClass: "outcome",
    recordNature: "canonical",
    source: "adaptive-routing",
    projectId: observation.projectId,
    taskId: observation.taskId,
    attemptId: observation.attemptId,
    threadId: observation.execution?.threadId ?? null,
    runId: observation.execution?.runId ?? null,
    occurredAt: observation.createdAt,
    recordedAt: observation.createdAt,
    summary: `Execution observation failure=${observation.failure?.class ?? "none"} verification=${verification?.result ?? "unknown"}`,
    unknownFields: [
      ...(configuration === undefined ? ["configuration"] : []),
      ...(executed?.quality === "unknown" ? ["configuration.executed"] : []),
      ...(verification === undefined ? ["verification"] : []),
    ],
    references: references([
      ["project-runtime-task", observation.taskId],
      ["execution-attempt", observation.attemptId],
      ["adaptive-difficulty-prediction", observation.predictionId],
      ["adaptive-realized-difficulty", observation.realizedDifficultyId],
      ["adaptive-accepted-outcome", observation.outcomeId],
      ["adaptive-capacity-snapshot", observation.capacityBeforeSnapshotId],
      ["adaptive-capacity-snapshot", observation.capacityAfterSnapshotId],
      ["orchestration-v2-thread", observation.execution?.threadId],
      ["orchestration-v2-run", observation.execution?.runId],
      ["orchestration-v2-run-attempt", observation.execution?.runAttemptId],
      ["orchestration-v2-node", observation.execution?.nodeId],
      ["orchestration-v2-provider-session", observation.execution?.providerSessionId],
      ["orchestration-v2-provider-thread", observation.execution?.providerThreadId],
      ["orchestration-v2-context-transfer", observation.execution?.contextTransferId],
    ]),
    facts: facts([
      ["configuration.requested.instanceId", configuration?.requested.instanceId],
      ["configuration.requested.model", configuration?.requested.model],
      ["configuration.selected.instanceId", configuration?.selected.instanceId],
      ["configuration.selected.model", configuration?.selected.model],
      ["configuration.executed.quality", executed?.quality],
      [
        "configuration.executed.instanceId",
        executed?.quality === "unknown" ? undefined : executed?.selection.instanceId,
      ],
      [
        "configuration.executed.model",
        executed?.quality === "unknown" ? undefined : executed?.selection.model,
      ],
      ["configuration.substitutionReason", configuration?.substitutionReason],
      ["failure.class", observation.failure?.class],
      ["verification.profileId", verification?.profileId],
      ["verification.result", verification?.result],
      ["verification.independence", verification?.independence],
      ["verification.strength", verification?.strength],
      ["verification.requiredKinds", verification?.requiredKinds.join(",")],
      ["verification.performedKinds", verification?.performedKinds.join(",")],
    ]),
  });
};

const acceptedOutcomeEvent = (outcome: AdaptiveAcceptedOutcome): OrchestrationEvidenceEvent =>
  event({
    schemaVersion: ORCHESTRATION_EVIDENCE_SCHEMA_VERSION,
    eventId: `oev0:adaptive-accepted-outcome:${outcome.outcomeId}`,
    recordType: "adaptive-accepted-outcome",
    recordId: outcome.outcomeId,
    evidenceClass: "outcome",
    recordNature: "canonical",
    source: "adaptive-routing",
    projectId: outcome.projectId,
    taskId: outcome.taskId,
    attemptId: null,
    threadId: null,
    runId: null,
    occurredAt: outcome.reconciledAt,
    recordedAt: outcome.reconciledAt,
    summary: `Accepted outcome revision ${outcome.revision}: ${outcome.state}`,
    unknownFields: [],
    references: references([["project-runtime-task", outcome.taskId]]),
    facts: facts([
      ["state", outcome.state],
      ["revision", outcome.revision],
      ["provenance.authority", outcome.provenance.authority],
      ["provenance.reference", outcome.provenance.reference],
      ["evidenceRef.count", outcome.evidenceRefs.length],
    ]),
  });

const outcomeReconciliationEvent = (
  reconciliation: AdaptiveOutcomeReconciliation,
): OrchestrationEvidenceEvent =>
  event({
    schemaVersion: ORCHESTRATION_EVIDENCE_SCHEMA_VERSION,
    eventId: `oev0:adaptive-outcome-reconciliation:${reconciliation.reconciliationId}`,
    recordType: "adaptive-outcome-reconciliation",
    recordId: reconciliation.reconciliationId,
    evidenceClass: "correction",
    recordNature: "canonical",
    source: "adaptive-routing",
    projectId: reconciliation.projectId,
    taskId: reconciliation.taskId,
    attemptId: null,
    threadId: null,
    runId: null,
    occurredAt: reconciliation.reconciledAt,
    recordedAt: reconciliation.reconciledAt,
    summary: `Outcome corrected ${reconciliation.fromRevision}->${reconciliation.toRevision}: ${reconciliation.fromState} -> ${reconciliation.toState}`,
    unknownFields: [],
    references: references([
      ["project-runtime-task", reconciliation.taskId],
      ["adaptive-accepted-outcome", reconciliation.outcomeId],
    ]),
    facts: facts([
      ["outcomeId", reconciliation.outcomeId],
      ["fromRevision", reconciliation.fromRevision],
      ["toRevision", reconciliation.toRevision],
      ["fromState", reconciliation.fromState],
      ["toState", reconciliation.toState],
      ["provenance.authority", reconciliation.provenance.authority],
      ["provenance.reference", reconciliation.provenance.reference],
      ["evidenceRef.count", reconciliation.evidenceRefs.length],
    ]),
  });

const recommendationReceiptEvent = (
  receipt: AdaptiveRecommendationReceipt,
): OrchestrationEvidenceEvent =>
  event({
    schemaVersion: ORCHESTRATION_EVIDENCE_SCHEMA_VERSION,
    eventId: `oev0:adaptive-recommendation-receipt:${receipt.recommendationReceiptId}`,
    recordType: "adaptive-recommendation-receipt",
    recordId: receipt.recommendationReceiptId,
    evidenceClass: "decision",
    recordNature: "canonical",
    source: "adaptive-routing",
    projectId: receipt.projectId,
    taskId: receipt.taskId,
    attemptId: null,
    threadId: null,
    runId: null,
    occurredAt: receipt.createdAt,
    recordedAt: receipt.createdAt,
    summary:
      receipt.recommendedCandidate === null
        ? "Advisory routing recommendation with no candidate"
        : `Advisory routing recommendation: ${receipt.recommendedCandidate.instanceId}/${receipt.recommendedCandidate.model}`,
    unknownFields: [],
    references: references([
      ["project-runtime-task", receipt.taskId],
      ["adaptive-difficulty-prediction", receipt.predictionId],
      ...receipt.capacitySnapshotIds.map(
        (snapshotId) => ["adaptive-capacity-snapshot", snapshotId] as const,
      ),
    ]),
    facts: facts([
      ["staticRouteSource", receipt.staticRouteSource],
      ["recommendedCandidate.instanceId", receipt.recommendedCandidate?.instanceId],
      ["recommendedCandidate.model", receipt.recommendedCandidate?.model],
      ["eligibleCandidates.count", receipt.eligibleCandidates.length],
      ["historicalSampleCount", receipt.historicalSampleCount],
      ["confidence", receipt.confidence],
      ["scoringVersion", receipt.scoringVersion],
      ["reasons.count", receipt.reasons.length],
      ["uncertaintyNotes.count", receipt.uncertaintyNotes.length],
    ]),
  });

const experimentAssignmentEvent = (
  assignment: AdaptiveExperimentAssignment,
): OrchestrationEvidenceEvent =>
  event({
    schemaVersion: ORCHESTRATION_EVIDENCE_SCHEMA_VERSION,
    eventId: `oev0:adaptive-experiment-assignment:${assignment.assignmentId}`,
    recordType: "adaptive-experiment-assignment",
    recordId: assignment.assignmentId,
    evidenceClass: "decision",
    recordNature: "canonical",
    source: "adaptive-routing",
    projectId: assignment.projectId,
    taskId: assignment.taskId,
    attemptId: null,
    threadId: null,
    runId: null,
    occurredAt: assignment.createdAt,
    recordedAt: assignment.createdAt,
    summary: `Experiment assignment ${assignment.method}: ${assignment.assignedCandidate.instanceId}/${assignment.assignedCandidate.model}`,
    unknownFields: assignment.propensity === undefined ? ["propensity"] : [],
    references: references([
      ["project-runtime-task", assignment.taskId],
      ...assignment.capacitySnapshotIds.map(
        (snapshotId) => ["adaptive-capacity-snapshot", snapshotId] as const,
      ),
    ]),
    facts: facts([
      ["method", assignment.method],
      ["assignedCandidate.instanceId", assignment.assignedCandidate.instanceId],
      ["assignedCandidate.model", assignment.assignedCandidate.model],
      ["candidateSet.count", assignment.candidateSet.length],
      ["propensity", assignment.propensity],
      ["comparabilityKey", assignment.comparabilityKey],
      ["comparabilityVersion", assignment.comparabilityVersion],
    ]),
  });

const capacityPoolEvent = (
  projectId: ProjectRuntimeTask["projectId"],
  pool: AdaptiveCapacityPool,
): OrchestrationEvidenceEvent =>
  event({
    schemaVersion: ORCHESTRATION_EVIDENCE_SCHEMA_VERSION,
    eventId: `oev0:adaptive-capacity-pool:${pool.capacityPoolId}`,
    recordType: "adaptive-capacity-pool",
    recordId: pool.capacityPoolId,
    evidenceClass: "observation",
    recordNature: "canonical",
    source: "adaptive-routing",
    projectId,
    taskId: null,
    attemptId: null,
    threadId: null,
    runId: null,
    occurredAt: pool.createdAt,
    recordedAt: pool.createdAt,
    summary: `Capacity pool ${pool.providerDriver} identity=${pool.identityQuality}`,
    unknownFields: [],
    references: references([["provider-instance", pool.providerInstanceId]]),
    facts: facts([
      ["scope", "environment"],
      ["providerDriver", pool.providerDriver],
      ["identityQuality", pool.identityQuality],
      ["displayAlias.present", pool.displayAlias !== undefined],
    ]),
  });

const capacitySnapshotEvent = (
  projectId: ProjectRuntimeTask["projectId"],
  snapshot: AdaptiveCapacitySnapshot,
): OrchestrationEvidenceEvent =>
  event({
    schemaVersion: ORCHESTRATION_EVIDENCE_SCHEMA_VERSION,
    eventId: `oev0:adaptive-capacity-snapshot:${snapshot.snapshotId}`,
    recordType: "adaptive-capacity-snapshot",
    recordId: snapshot.snapshotId,
    evidenceClass: "observation",
    recordNature: "canonical",
    source: "adaptive-routing",
    projectId,
    taskId: null,
    attemptId: null,
    threadId: null,
    runId: null,
    occurredAt: snapshot.observedAt,
    recordedAt: null,
    summary: `Capacity snapshot with ${snapshot.windows.length} window(s)`,
    unknownFields: ["recordedAt"],
    references: references([["adaptive-capacity-pool", snapshot.capacityPoolId]]),
    facts: facts([
      ["scope", "environment"],
      ["sourceQuality", snapshot.sourceQuality],
      ["windows.count", snapshot.windows.length],
      ["subscriptionPlanLabel.present", snapshot.subscriptionPlanLabel !== undefined],
      ...snapshot.windows.flatMap((window) => [
        [`window.${window.windowId}.windowType`, window.windowType] as const,
        [`window.${window.windowId}.used.quality`, window.used.quality] as const,
        [
          `window.${window.windowId}.used.value`,
          window.used.quality === "unknown" ? undefined : window.used.value,
        ] as const,
        [`window.${window.windowId}.remaining.quality`, window.remaining.quality] as const,
        [
          `window.${window.windowId}.remaining.value`,
          window.remaining.quality === "unknown" ? undefined : window.remaining.value,
        ] as const,
        [`window.${window.windowId}.limit.quality`, window.limit.quality] as const,
        [
          `window.${window.windowId}.limit.value`,
          window.limit.quality === "unknown" ? undefined : window.limit.value,
        ] as const,
        [`window.${window.windowId}.resetAt`, window.resetAt] as const,
      ]),
    ]),
  });

const compareEvents = (left: OrchestrationEvidenceEvent, right: OrchestrationEvidenceEvent) => {
  const leftTask = left.recordType === "project-runtime-task";
  const rightTask = right.recordType === "project-runtime-task";
  if (leftTask !== rightTask) return leftTask ? -1 : 1;

  const leftTime = left.occurredAt ?? left.recordedAt ?? UNKNOWN_TIME;
  const rightTime = right.occurredAt ?? right.recordedAt ?? UNKNOWN_TIME;
  if (leftTime !== rightTime) return leftTime < rightTime ? -1 : 1;

  const classDifference = CLASS_ORDER[left.evidenceClass] - CLASS_ORDER[right.evidenceClass];
  if (classDifference !== 0) return classDifference;

  return left.eventId < right.eventId ? -1 : left.eventId > right.eventId ? 1 : 0;
};

const sortEvents = (
  events: ReadonlyArray<OrchestrationEvidenceEvent>,
): ReadonlyArray<OrchestrationEvidenceEvent> => [...events].sort(compareEvents);

const make = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const now = DateTime.now.pipe(Effect.map(DateTime.formatIso));

  const sqlError = (operation: string) => (cause: unknown) =>
    new PersistenceSqlError({ operation, cause });

  const decodeRows = <A>(
    operation: string,
    rows: ReadonlyArray<PayloadRow>,
    decode: (input: string) => Effect.Effect<A, Schema.SchemaError>,
  ): Effect.Effect<ReadonlyArray<A>, PersistenceDecodeError> =>
    Effect.forEach(
      rows,
      (row) =>
        decode(row.payload_json).pipe(
          Effect.mapError((cause) => PersistenceDecodeError.fromSchemaError(operation, cause)),
        ),
      { concurrency: 1 },
    );

  const loadCapacityEvidence = Effect.fn("OrchestrationEvidenceService.loadCapacityEvidence")(
    function* (snapshotIds: ReadonlyArray<string>) {
      if (snapshotIds.length === 0) return { snapshots: [], pools: [] };

      const snapshotRows = yield* sql<PayloadRow>`SELECT payload_json
        FROM adaptive_capacity_snapshots
        WHERE snapshot_id IN ${sql.in(snapshotIds)}
        ORDER BY observed_at ASC, snapshot_id ASC`.pipe(
        Effect.mapError(sqlError("OrchestrationEvidenceService.loadCapacitySnapshots")),
      );
      const snapshots = yield* decodeRows(
        "OrchestrationEvidenceService.loadCapacitySnapshots",
        snapshotRows,
        decodeCapacitySnapshot,
      );
      if (snapshots.length === 0) return { snapshots, pools: [] };

      const poolIds = [...new Set(snapshots.map((snapshot) => snapshot.capacityPoolId))];
      const poolRows = yield* sql<PayloadRow>`SELECT payload_json
        FROM adaptive_capacity_pools
        WHERE capacity_pool_id IN ${sql.in(poolIds)}
        ORDER BY created_at ASC, capacity_pool_id ASC`.pipe(
        Effect.mapError(sqlError("OrchestrationEvidenceService.loadCapacityPools")),
      );
      const pools = yield* decodeRows(
        "OrchestrationEvidenceService.loadCapacityPools",
        poolRows,
        decodeCapacityPool,
      );
      return { snapshots, pools };
    },
  );

  const exportTaskImpl = Effect.fn("OrchestrationEvidenceService.exportTask")(function* (
    projectId: ProjectRuntimeTask["projectId"],
    taskId: ProjectRuntimeTask["taskId"],
  ) {
    const operation = "OrchestrationEvidenceService.exportTask";
    const taskRows = yield* sql<PayloadRow>`SELECT payload_json
        FROM project_runtime_tasks
        WHERE project_id = ${projectId} AND task_id = ${taskId}`.pipe(
      Effect.mapError(sqlError(operation)),
    );
    if (taskRows[0] === undefined) {
      return yield* new OrchestrationEvidenceTaskNotFoundError({ projectId, taskId });
    }
    const task = yield* decodeTask(taskRows[0].payload_json).pipe(
      Effect.mapError((cause) => PersistenceDecodeError.fromSchemaError(operation, cause)),
    );

    const [
      attemptRows,
      predictionRows,
      realizedRows,
      observationRows,
      outcomeRows,
      reconciliationRows,
      receiptRows,
      assignmentRows,
    ] = yield* Effect.all(
      [
        sql<PayloadRow>`SELECT payload_json
            FROM project_runtime_execution_attempts
            WHERE project_id = ${projectId} AND task_id = ${taskId}
            ORDER BY created_at ASC, attempt_id ASC`.pipe(Effect.mapError(sqlError(operation))),
        sql<PayloadRow>`SELECT payload_json
            FROM adaptive_difficulty_predictions
            WHERE project_id = ${projectId} AND task_id = ${taskId}
            ORDER BY created_at ASC, prediction_id ASC`.pipe(Effect.mapError(sqlError(operation))),
        sql<PayloadRow>`SELECT payload_json
            FROM adaptive_realized_difficulties
            WHERE project_id = ${projectId} AND task_id = ${taskId}
            ORDER BY created_at ASC, realized_difficulty_id ASC`.pipe(
          Effect.mapError(sqlError(operation)),
        ),
        sql<PayloadRow>`SELECT payload_json
            FROM adaptive_execution_observations
            WHERE project_id = ${projectId} AND task_id = ${taskId}
            ORDER BY created_at ASC, observation_id ASC`.pipe(Effect.mapError(sqlError(operation))),
        sql<PayloadRow>`SELECT payload_json
            FROM adaptive_accepted_outcomes
            WHERE project_id = ${projectId} AND task_id = ${taskId}
            ORDER BY reconciled_at ASC, outcome_id ASC`.pipe(Effect.mapError(sqlError(operation))),
        sql<PayloadRow>`SELECT payload_json
            FROM adaptive_outcome_reconciliations
            WHERE project_id = ${projectId} AND task_id = ${taskId}
            ORDER BY reconciled_at ASC, reconciliation_id ASC`.pipe(
          Effect.mapError(sqlError(operation)),
        ),
        sql<PayloadRow>`SELECT payload_json
            FROM adaptive_recommendation_receipts
            WHERE project_id = ${projectId} AND task_id = ${taskId}
            ORDER BY created_at ASC, recommendation_receipt_id ASC`.pipe(
          Effect.mapError(sqlError(operation)),
        ),
        sql<PayloadRow>`SELECT payload_json
            FROM adaptive_experiment_assignments
            WHERE project_id = ${projectId} AND task_id = ${taskId}
            ORDER BY created_at ASC, assignment_id ASC`.pipe(Effect.mapError(sqlError(operation))),
      ],
      { concurrency: 1 },
    );

    const [
      attempts,
      predictions,
      realized,
      observations,
      outcomes,
      reconciliations,
      receipts,
      assignments,
    ] = yield* Effect.all(
      [
        decodeRows(operation, attemptRows, decodeAttempt),
        decodeRows(operation, predictionRows, decodeDifficultyPrediction),
        decodeRows(operation, realizedRows, decodeRealizedDifficulty),
        decodeRows(operation, observationRows, decodeExecutionObservation),
        decodeRows(operation, outcomeRows, decodeAcceptedOutcome),
        decodeRows(operation, reconciliationRows, decodeOutcomeReconciliation),
        decodeRows(operation, receiptRows, decodeRecommendationReceipt),
        decodeRows(operation, assignmentRows, decodeExperimentAssignment),
      ],
      { concurrency: 1 },
    );

    const referencedSnapshotIds = [
      ...new Set([
        ...observations.flatMap((observation) => [
          ...(observation.capacityBeforeSnapshotId === undefined
            ? []
            : [observation.capacityBeforeSnapshotId]),
          ...(observation.capacityAfterSnapshotId === undefined
            ? []
            : [observation.capacityAfterSnapshotId]),
        ]),
        ...receipts.flatMap((receipt) => receipt.capacitySnapshotIds),
        ...assignments.flatMap((assignment) => assignment.capacitySnapshotIds),
      ]),
    ];
    const capacity = yield* loadCapacityEvidence(referencedSnapshotIds);

    const generatedAt = yield* now;
    const events = sortEvents([
      taskEvent(task, generatedAt),
      ...attempts.flatMap((attempt) => [
        attemptDecisionEvent(attempt),
        attemptOutcomeEvent(attempt),
      ]),
      ...predictions.map(difficultyPredictionEvent),
      ...realized.map(realizedDifficultyEvent),
      ...observations.map(executionObservationEvent),
      ...outcomes.map(acceptedOutcomeEvent),
      ...reconciliations.map(outcomeReconciliationEvent),
      ...receipts.map(recommendationReceiptEvent),
      ...assignments.map(experimentAssignmentEvent),
      ...capacity.pools.map((pool) => capacityPoolEvent(projectId, pool)),
      ...capacity.snapshots.map((snapshot) => capacitySnapshotEvent(projectId, snapshot)),
    ]);

    return {
      schemaVersion: ORCHESTRATION_EVIDENCE_SCHEMA_VERSION,
      projectId,
      taskId,
      generatedAt,
      taskRevision: task.revision,
      events,
    };
  }, sql.withTransaction);

  const exportTask: OrchestrationEvidenceShape["exportTask"] = (projectId, taskId) =>
    exportTaskImpl(projectId, taskId).pipe(
      Effect.catchTags({
        SqlError: (cause) =>
          Effect.fail(
            new PersistenceSqlError({
              operation: "OrchestrationEvidenceService.exportTask",
              cause,
            }),
          ),
      }),
    );

  const exportTaskJsonl: OrchestrationEvidenceShape["exportTaskJsonl"] = Effect.fn(
    "OrchestrationEvidenceService.exportTaskJsonl",
  )(function* (projectId, taskId) {
    const exported = yield* exportTask(projectId, taskId);
    const lines = yield* Effect.forEach(
      exported.events,
      (item) =>
        encodeEvidenceEventJson(item).pipe(
          Effect.mapError((cause) =>
            PersistenceDecodeError.fromSchemaError(
              "OrchestrationEvidenceService.exportTaskJsonl",
              cause,
            ),
          ),
        ),
      { concurrency: 1 },
    );
    return lines.join("\n");
  });

  const reconstructTaskHistory: OrchestrationEvidenceShape["reconstructTaskHistory"] = Effect.fn(
    "OrchestrationEvidenceService.reconstructTaskHistory",
  )(function* (projectId, taskId) {
    const exported = yield* exportTask(projectId, taskId);
    return {
      schemaVersion: ORCHESTRATION_EVIDENCE_SCHEMA_VERSION,
      projectId,
      taskId,
      generatedAt: exported.generatedAt,
      taskRevision: exported.taskRevision,
      ordering: "task-first-then-chronological" as const,
      events: exported.events,
    };
  });

  return OrchestrationEvidenceService.of({
    exportTask,
    exportTaskJsonl,
    reconstructTaskHistory,
  });
});

export const layer = Layer.effect(OrchestrationEvidenceService, make);
