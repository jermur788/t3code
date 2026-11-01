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
  ProjectRuntimeHandoff,
  ProjectRuntimeTask,
  RuntimeExecutionAttempt,
  type OrchestrationEvidenceExport,
  type OrchestrationEvidenceExportOptions,
  type OrchestrationEvidenceFact,
  type OrchestrationEvidenceLifecycleClass,
  type OrchestrationEvidenceReconstruction,
  type OrchestrationEvidenceReference,
  type OrchestrationEvidenceStagingReference,
  type OrchestrationV2StoredEvent,
  type RuntimeExecutionAttemptStatus,
} from "@t3tools/contracts";
import * as Context from "effect/Context";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import * as SqlClient from "effect/sql/SqlClient";
import * as Stream from "effect/Stream";

import * as EventStoreV2 from "../orchestration-v2/EventStore.ts";
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
    options?: OrchestrationEvidenceExportOptions,
  ) => Result<OrchestrationEvidenceExport>;
  readonly exportTaskJsonl: (
    projectId: ProjectRuntimeTask["projectId"],
    taskId: ProjectRuntimeTask["taskId"],
    options?: OrchestrationEvidenceExportOptions,
  ) => Result<string>;
  readonly reconstructTaskHistory: (
    projectId: ProjectRuntimeTask["projectId"],
    taskId: ProjectRuntimeTask["taskId"],
    options?: OrchestrationEvidenceExportOptions,
  ) => Result<OrchestrationEvidenceReconstruction>;
}

export class OrchestrationEvidenceService extends Context.Service<
  OrchestrationEvidenceService,
  OrchestrationEvidenceShape
>()("t3/projectRuntime/OrchestrationEvidenceService") {}

type PayloadRow = { readonly payload_json: string };
type FactValue = string | number | boolean | null;

const TaskJson = Schema.fromJsonString(ProjectRuntimeTask);
const HandoffJson = Schema.fromJsonString(ProjectRuntimeHandoff);
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
const decodeHandoff = Schema.decodeUnknownEffect(HandoffJson);
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

const CLASS_ORDER: Record<OrchestrationEvidenceLifecycleClass, number> = {
  observation: 0,
  execution: 1,
  decision: 2,
  assessment: 3,
  outcome: 4,
  correction: 5,
};
const UNKNOWN_TIME = Number.POSITIVE_INFINITY;
const V2_EVENT_READ_LIMIT_PER_THREAD = 1_000;

type DraftEvent = Omit<OrchestrationEvidenceEvent, "exportedAt">;

const sortTime = (value: string | null): number => {
  if (value === null) return UNKNOWN_TIME;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : UNKNOWN_TIME;
};

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

const event = (input: DraftEvent): DraftEvent => input;

const isTerminalAttemptStatus = (status: RuntimeExecutionAttemptStatus): boolean =>
  status === "completed" ||
  status === "failed" ||
  status === "cancelled" ||
  status === "interrupted";

const taskEvent = (task: ProjectRuntimeTask): DraftEvent =>
  event({
    schemaVersion: ORCHESTRATION_EVIDENCE_SCHEMA_VERSION,
    eventId: `oev0:project-runtime-task:${task.taskId}`,
    recordType: "project-runtime-task",
    recordId: task.taskId,
    lifecycleClass: "observation",
    recordBasis: "derived-view",
    authority: "project-runtime",
    projectId: task.projectId,
    taskId: task.taskId,
    attemptId: null,
    threadId: null,
    runId: null,
    occurredAt: null,
    recordedAt: task.updatedAt,
    summary: `Runtime task ${task.status} at revision ${task.revision}`,
    unknownFields: ["occurredAt"],
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

const attemptDecisionEvent = (attempt: RuntimeExecutionAttempt): DraftEvent => {
  const selected = attempt.receipt.route.selected;
  const launch = attempt.receipt.launch;
  return event({
    schemaVersion: ORCHESTRATION_EVIDENCE_SCHEMA_VERSION,
    eventId: `oev0:execution-attempt-decision:${attempt.attemptId}`,
    recordType: "execution-attempt-decision",
    recordId: attempt.attemptId,
    lifecycleClass: "decision",
    recordBasis: "derived-view",
    authority: "runtime-execution",
    projectId: attempt.projectId,
    taskId: attempt.taskId,
    attemptId: attempt.attemptId,
    threadId: attempt.threadId,
    runId: null,
    occurredAt: null,
    recordedAt: attempt.createdAt,
    summary:
      selected === null
        ? `Routing decision ${attempt.receipt.route.status} without a selected route`
        : `Routing decision ${attempt.receipt.route.source}: ${selected.providerInstanceId}/${selected.model}`,
    unknownFields: [
      "occurredAt",
      "runId",
      "choiceSet.perCandidateState",
      "capacity",
      "context",
      "selectionMechanism",
    ],
    references: references([
      ["project-runtime-task", attempt.taskId],
      ["orchestration-v2-thread", attempt.threadId],
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

const attemptOutcomeEvent = (attempt: RuntimeExecutionAttempt): DraftEvent => {
  const terminal = isTerminalAttemptStatus(attempt.status);
  return event({
    schemaVersion: ORCHESTRATION_EVIDENCE_SCHEMA_VERSION,
    eventId: `oev0:execution-attempt-outcome:${attempt.attemptId}`,
    recordType: "execution-attempt-outcome",
    recordId: attempt.attemptId,
    lifecycleClass: "outcome",
    recordBasis: "derived-view",
    authority: "runtime-execution",
    projectId: attempt.projectId,
    taskId: attempt.taskId,
    attemptId: attempt.attemptId,
    threadId: attempt.threadId,
    runId: attempt.runId,
    occurredAt: null,
    recordedAt: attempt.updatedAt,
    summary: terminal
      ? `Execution attempt ${attempt.status}`
      : `Execution attempt ${attempt.status}; terminal outcome not yet observed`,
    unknownFields: terminal ? ["occurredAt"] : ["occurredAt", "outcome"],
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

const difficultyPredictionEvent = (prediction: AdaptiveDifficultyPrediction): DraftEvent =>
  event({
    schemaVersion: ORCHESTRATION_EVIDENCE_SCHEMA_VERSION,
    eventId: `oev0:adaptive-difficulty-prediction:${prediction.predictionId}`,
    recordType: "adaptive-difficulty-prediction",
    recordId: prediction.predictionId,
    lifecycleClass: "decision",
    recordBasis: "canonical-record",
    authority: "arm",
    projectId: prediction.projectId,
    taskId: prediction.taskId,
    attemptId: null,
    threadId: null,
    runId: null,
    occurredAt: null,
    recordedAt: prediction.createdAt,
    summary: `Difficulty prediction ${prediction.assessment.band}`,
    unknownFields: ["occurredAt"],
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

const realizedDifficultyEvent = (realized: AdaptiveRealizedDifficulty): DraftEvent =>
  event({
    schemaVersion: ORCHESTRATION_EVIDENCE_SCHEMA_VERSION,
    eventId: `oev0:adaptive-realized-difficulty:${realized.realizedDifficultyId}`,
    recordType: "adaptive-realized-difficulty",
    recordId: realized.realizedDifficultyId,
    lifecycleClass: "assessment",
    recordBasis: "canonical-record",
    authority: "arm",
    projectId: realized.projectId,
    taskId: realized.taskId,
    attemptId: null,
    threadId: null,
    runId: null,
    occurredAt: null,
    recordedAt: realized.createdAt,
    summary: `Realized difficulty ${realized.assessment.band}`,
    unknownFields: ["occurredAt"],
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
): DraftEvent => {
  const configuration = observation.configuration;
  const executed = configuration?.executed;
  const verification = observation.verification;
  return event({
    schemaVersion: ORCHESTRATION_EVIDENCE_SCHEMA_VERSION,
    eventId: `oev0:adaptive-execution-observation:${observation.observationId}`,
    recordType: "adaptive-execution-observation",
    recordId: observation.observationId,
    lifecycleClass: "outcome",
    recordBasis: "canonical-record",
    authority: "arm",
    projectId: observation.projectId,
    taskId: observation.taskId,
    attemptId: observation.attemptId,
    threadId: observation.execution?.threadId ?? null,
    runId: observation.execution?.runId ?? null,
    occurredAt: null,
    recordedAt: observation.createdAt,
    summary: `Execution observation failure=${observation.failure?.class ?? "none"} verification=${verification?.result ?? "unknown"}`,
    unknownFields: [
      "occurredAt",
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
      [
        "configuration.executed.evidenceRef",
        executed?.quality === "unknown" ? undefined : executed?.evidenceRef,
      ],
      ["failure.class", observation.failure?.class],
      ["failure.evidenceRef", observation.failure?.evidenceRef],
      ["verification.profileId", verification?.profileId],
      ["verification.result", verification?.result],
      ["verification.independence", verification?.independence],
      ["verification.strength", verification?.strength],
      ["verification.requiredKinds", verification?.requiredKinds.join(",")],
      ["verification.performedKinds", verification?.performedKinds.join(",")],
    ]),
  });
};

const acceptedOutcomeEvent = (outcome: AdaptiveAcceptedOutcome): DraftEvent =>
  event({
    schemaVersion: ORCHESTRATION_EVIDENCE_SCHEMA_VERSION,
    eventId: `oev0:adaptive-accepted-outcome:${outcome.outcomeId}:r${outcome.revision}`,
    recordType: "adaptive-accepted-outcome",
    recordId: outcome.outcomeId,
    lifecycleClass: "outcome",
    recordBasis: "derived-view",
    authority: "arm",
    projectId: outcome.projectId,
    taskId: outcome.taskId,
    attemptId: null,
    threadId: null,
    runId: null,
    occurredAt: outcome.provenance.observedAt,
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

const outcomeReconciliationEvent = (reconciliation: AdaptiveOutcomeReconciliation): DraftEvent =>
  event({
    schemaVersion: ORCHESTRATION_EVIDENCE_SCHEMA_VERSION,
    eventId: `oev0:adaptive-outcome-reconciliation:${reconciliation.reconciliationId}`,
    recordType: "adaptive-outcome-reconciliation",
    recordId: reconciliation.reconciliationId,
    lifecycleClass: "correction",
    recordBasis: "canonical-record",
    authority: "arm",
    projectId: reconciliation.projectId,
    taskId: reconciliation.taskId,
    attemptId: null,
    threadId: null,
    runId: null,
    occurredAt: reconciliation.provenance.observedAt,
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

const recommendationReceiptEvent = (receipt: AdaptiveRecommendationReceipt): DraftEvent =>
  event({
    schemaVersion: ORCHESTRATION_EVIDENCE_SCHEMA_VERSION,
    eventId: `oev0:adaptive-recommendation-receipt:${receipt.recommendationReceiptId}`,
    recordType: "adaptive-recommendation-receipt",
    recordId: receipt.recommendationReceiptId,
    lifecycleClass: "decision",
    recordBasis: "canonical-record",
    authority: "arm",
    projectId: receipt.projectId,
    taskId: receipt.taskId,
    attemptId: null,
    threadId: null,
    runId: null,
    occurredAt: null,
    recordedAt: receipt.createdAt,
    summary:
      receipt.recommendedCandidate === null
        ? "Advisory routing recommendation with no candidate"
        : `Advisory routing recommendation: ${receipt.recommendedCandidate.instanceId}/${receipt.recommendedCandidate.model}`,
    unknownFields: ["occurredAt"],
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

const experimentAssignmentEvent = (assignment: AdaptiveExperimentAssignment): DraftEvent =>
  event({
    schemaVersion: ORCHESTRATION_EVIDENCE_SCHEMA_VERSION,
    eventId: `oev0:adaptive-experiment-assignment:${assignment.assignmentId}`,
    recordType: "adaptive-experiment-assignment",
    recordId: assignment.assignmentId,
    lifecycleClass: "decision",
    recordBasis: "canonical-record",
    authority: "arm",
    projectId: assignment.projectId,
    taskId: assignment.taskId,
    attemptId: null,
    threadId: null,
    runId: null,
    occurredAt: null,
    recordedAt: assignment.createdAt,
    summary: `Experiment assignment ${assignment.method}: ${assignment.assignedCandidate.instanceId}/${assignment.assignedCandidate.model}`,
    unknownFields:
      assignment.propensity === undefined ? ["occurredAt", "propensity"] : ["occurredAt"],
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
): DraftEvent =>
  event({
    schemaVersion: ORCHESTRATION_EVIDENCE_SCHEMA_VERSION,
    eventId: `oev0:adaptive-capacity-pool:${pool.capacityPoolId}`,
    recordType: "adaptive-capacity-pool",
    recordId: pool.capacityPoolId,
    lifecycleClass: "observation",
    recordBasis: "canonical-record",
    authority: "arm",
    projectId,
    taskId: null,
    attemptId: null,
    threadId: null,
    runId: null,
    occurredAt: null,
    recordedAt: pool.createdAt,
    summary: `Capacity pool ${pool.providerDriver} identity=${pool.identityQuality}`,
    unknownFields: ["occurredAt"],
    references: [],
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
): DraftEvent =>
  event({
    schemaVersion: ORCHESTRATION_EVIDENCE_SCHEMA_VERSION,
    eventId: `oev0:adaptive-capacity-snapshot:${snapshot.snapshotId}`,
    recordType: "adaptive-capacity-snapshot",
    recordId: snapshot.snapshotId,
    lifecycleClass: "observation",
    recordBasis: "canonical-record",
    authority: "arm",
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
      ["sourceRef", snapshot.sourceRef],
      ["windows.count", snapshot.windows.length],
      ["subscriptionPlanLabel.present", snapshot.subscriptionPlanLabel !== undefined],
      ...snapshot.windows.flatMap((window, index) => [
        [`window.${index}.id`, window.windowId] as const,
        [`window.${index}.windowType`, window.windowType] as const,
        [`window.${index}.used.quality`, window.used.quality] as const,
        [
          `window.${index}.used.value`,
          window.used.quality === "unknown" ? undefined : window.used.value,
        ] as const,
        [`window.${index}.remaining.quality`, window.remaining.quality] as const,
        [
          `window.${index}.remaining.value`,
          window.remaining.quality === "unknown" ? undefined : window.remaining.value,
        ] as const,
        [`window.${index}.limit.quality`, window.limit.quality] as const,
        [
          `window.${index}.limit.value`,
          window.limit.quality === "unknown" ? undefined : window.limit.value,
        ] as const,
        [`window.${index}.resetAt`, window.resetAt] as const,
      ]),
    ]),
  });

const supersededOutcomeEvent = (reconciliation: AdaptiveOutcomeReconciliation): DraftEvent =>
  event({
    schemaVersion: ORCHESTRATION_EVIDENCE_SCHEMA_VERSION,
    eventId: `oev0:adaptive-accepted-outcome:${reconciliation.outcomeId}:from-r${reconciliation.fromRevision}`,
    recordType: "adaptive-accepted-outcome",
    recordId: reconciliation.outcomeId,
    lifecycleClass: "outcome",
    recordBasis: "derived-view",
    authority: "arm",
    projectId: reconciliation.projectId,
    taskId: reconciliation.taskId,
    attemptId: null,
    threadId: null,
    runId: null,
    occurredAt: null,
    recordedAt: null,
    summary: `Accepted outcome revision ${reconciliation.fromRevision} (superseded): ${reconciliation.fromState}`,
    unknownFields: ["occurredAt", "recordedAt"],
    references: references([
      ["project-runtime-task", reconciliation.taskId],
      ["adaptive-accepted-outcome", reconciliation.outcomeId],
      ["adaptive-outcome-reconciliation", reconciliation.reconciliationId],
    ]),
    facts: facts([
      ["state", reconciliation.fromState],
      ["revision", reconciliation.fromRevision],
      ["superseded", true],
      ["supersededBy", reconciliation.reconciliationId],
    ]),
  });

const runtimeVerificationEvent = (
  task: ProjectRuntimeTask,
  evidence: ProjectRuntimeTask["verification"]["evidence"][number],
): DraftEvent =>
  event({
    schemaVersion: ORCHESTRATION_EVIDENCE_SCHEMA_VERSION,
    eventId: `oev0:project-runtime-verification:${task.taskId}:${evidence.evidenceId}`,
    recordType: "project-runtime-verification",
    recordId: evidence.evidenceId,
    lifecycleClass: "outcome",
    // Nested inside the mutable task snapshot; only the task row is canonical.
    recordBasis: "derived-view",
    authority: "project-runtime",
    projectId: task.projectId,
    taskId: task.taskId,
    attemptId: null,
    threadId: null,
    runId: null,
    occurredAt: null,
    recordedAt: evidence.recordedAt,
    summary: `Runtime verification ${evidence.result} for ${evidence.evidenceId}`,
    unknownFields: ["occurredAt"],
    references: references([["project-runtime-task", task.taskId]]),
    facts: facts([
      ["result", evidence.result],
      ["command", evidence.command],
      ["summary", evidence.summary],
      ["criterionIds", evidence.criterionIds?.join(",")],
      ["taskRevision", task.revision],
    ]),
  });

const runtimeHandoffEvent = (handoff: ProjectRuntimeHandoff): DraftEvent =>
  event({
    schemaVersion: ORCHESTRATION_EVIDENCE_SCHEMA_VERSION,
    eventId: `oev0:project-runtime-handoff:${handoff.handoffId}`,
    recordType: "project-runtime-handoff",
    recordId: handoff.handoffId,
    lifecycleClass: "observation",
    recordBasis: "canonical-record",
    authority: "project-runtime",
    projectId: handoff.projectId,
    taskId: handoff.taskId,
    attemptId: null,
    threadId: handoff.threadId ?? null,
    runId: null,
    occurredAt: null,
    recordedAt: handoff.createdAt,
    summary: `Runtime handoff ${handoff.handoffId} at checkpoint ${handoff.checkpoint}`,
    unknownFields: ["occurredAt"],
    references: references([
      ["project-runtime-task", handoff.taskId],
      ["orchestration-v2-thread", handoff.threadId],
    ]),
    facts: facts([
      ["handoffId", handoff.handoffId],
      ["checkpoint", handoff.checkpoint],
      ["taskRevision", handoff.taskRevision],
      ["runtimeRevision", handoff.runtimeRevision],
      ["verification.milestone", handoff.verification.milestone],
      ["verification.evidenceCount", handoff.verification.evidence.length],
      ["filesChanged.count", handoff.filesChanged.length],
      ["testsRun.count", handoff.testsRun?.length ?? 0],
      ["testsNotRun.count", handoff.testsNotRun?.length ?? 0],
      ["unresolvedDecisions.count", handoff.unresolvedDecisions?.length ?? 0],
      ["providerInstanceId", handoff.providerInstanceId],
      ["model", handoff.model],
      ["createdBy", handoff.createdBy],
    ]),
  });

const runtimeHandoffUnresolvedEvent = (
  task: ProjectRuntimeTask,
  handoffId: NonNullable<ProjectRuntimeTask["latestHandoffId"]>,
): DraftEvent =>
  event({
    schemaVersion: ORCHESTRATION_EVIDENCE_SCHEMA_VERSION,
    eventId: `oev0:project-runtime-handoff-unresolved:${handoffId}`,
    recordType: "project-runtime-handoff-unresolved",
    recordId: handoffId,
    lifecycleClass: "observation",
    recordBasis: "derived-view",
    authority: "project-runtime",
    projectId: task.projectId,
    taskId: task.taskId,
    attemptId: null,
    threadId: null,
    runId: null,
    occurredAt: null,
    recordedAt: null,
    summary: `Runtime task points to handoff ${handoffId}, but no canonical handoff resolved for this task`,
    unknownFields: ["occurredAt", "recordedAt", "canonicalRecord"],
    references: references([["project-runtime-task", task.taskId]]),
    facts: facts([
      ["status", "unresolved"],
      ["handoffId", handoffId],
    ]),
  });

const recommendationAttemptLinkEvent = (
  attempt: RuntimeExecutionAttempt,
  candidateReceiptIds: ReadonlyArray<string>,
): DraftEvent => {
  const status =
    candidateReceiptIds.length === 0
      ? "none"
      : candidateReceiptIds.length === 1
        ? "unique"
        : "ambiguous";
  return event({
    schemaVersion: ORCHESTRATION_EVIDENCE_SCHEMA_VERSION,
    eventId: `oev0:adaptive-recommendation-attempt-link:${attempt.attemptId}`,
    recordType: "adaptive-recommendation-attempt-link",
    recordId: attempt.attemptId,
    lifecycleClass: "assessment",
    recordBasis: "derived-view",
    authority: "arm",
    projectId: attempt.projectId,
    taskId: attempt.taskId,
    attemptId: attempt.attemptId,
    threadId: null,
    runId: null,
    occurredAt: null,
    recordedAt: null,
    summary:
      status === "ambiguous"
        ? `Recommendation-to-attempt relationship AMBIGUOUS across ${candidateReceiptIds.length} receipts`
        : status === "unique"
          ? "Recommendation-to-attempt relationship uniquely derived"
          : "No admissible recommendation receipt for this attempt",
    unknownFields: ["occurredAt", "recordedAt"],
    references: references([
      ["execution-attempt", attempt.attemptId],
      ...candidateReceiptIds.map(
        (receiptId) => ["adaptive-recommendation-receipt", receiptId] as const,
      ),
    ]),
    facts: facts([
      ["status", status],
      ["candidateReceiptIds", candidateReceiptIds.join(",")],
      ["candidateReceiptCount", candidateReceiptIds.length],
      ["recommendationReceiptId", status === "unique" ? candidateReceiptIds[0] : undefined],
      ["derivation", "task-or-prediction-before-attempt"],
      ["authorization", "none"],
    ]),
  });
};

const v2PayloadRunId = (stored: OrchestrationV2StoredEvent): string | undefined => {
  const payload = stored.event.payload as { readonly id?: string; readonly runId?: string };
  if (typeof payload.runId === "string") return payload.runId;
  return stored.event.type === "run.created" || stored.event.type === "run.updated"
    ? payload.id
    : undefined;
};

const v2EffectiveRunId = (stored: OrchestrationV2StoredEvent): string | undefined =>
  stored.event.runId ?? v2PayloadRunId(stored);

const v2Event = (
  projectId: ProjectRuntimeTask["projectId"],
  taskId: ProjectRuntimeTask["taskId"],
  attemptId: RuntimeExecutionAttempt["attemptId"] | null,
  stored: OrchestrationV2StoredEvent,
): DraftEvent => {
  const occurredAt = DateTime.formatIso(stored.event.occurredAt);
  const sequenceKey = String(stored.sequence).padStart(12, "0");
  const payload = stored.event.payload as {
    readonly id?: string;
    readonly runId?: string;
    readonly rootNodeId?: string | null;
    readonly providerThreadId?: string | null;
    readonly providerTurnId?: string | null;
    readonly providerSessionId?: string | null;
    readonly ownerNodeId?: string | null;
    readonly appThreadId?: string | null;
  };
  const executionRunId = v2EffectiveRunId(stored) ?? null;
  const payloadReferences: Array<readonly [string, string]> = [];
  const addPayloadReference = (recordType: string, recordId: string | null | undefined) => {
    if (typeof recordId === "string") payloadReferences.push([recordType, recordId]);
  };
  if (stored.event.type.startsWith("run-attempt.")) {
    addPayloadReference("orchestration-v2-run-attempt", payload.id);
    addPayloadReference("orchestration-v2-run", payload.runId);
    addPayloadReference("orchestration-v2-node", payload.rootNodeId);
    addPayloadReference("orchestration-v2-provider-thread", payload.providerThreadId);
  } else if (stored.event.type === "node.updated") {
    addPayloadReference("orchestration-v2-node", payload.id);
    addPayloadReference("orchestration-v2-node", payload.rootNodeId);
    addPayloadReference("orchestration-v2-provider-thread", payload.providerThreadId);
  } else if (stored.event.type === "provider-session.detached") {
    addPayloadReference("orchestration-v2-provider-session", payload.providerSessionId);
  } else if (stored.event.type.startsWith("provider-session.")) {
    addPayloadReference("orchestration-v2-provider-session", payload.id);
  } else if (stored.event.type === "provider-thread.updated") {
    addPayloadReference("orchestration-v2-provider-thread", payload.id);
    addPayloadReference("orchestration-v2-provider-session", payload.providerSessionId);
    addPayloadReference("orchestration-v2-node", payload.ownerNodeId);
    addPayloadReference("orchestration-v2-thread", payload.appThreadId);
  } else if (stored.event.type.startsWith("context-transfer.")) {
    addPayloadReference("orchestration-v2-context-transfer", payload.id);
  } else if (stored.event.type === "context-handoff.updated") {
    addPayloadReference("orchestration-v2-context-handoff", payload.id);
  } else if (stored.event.type === "run.created" || stored.event.type === "run.updated") {
    addPayloadReference("orchestration-v2-run", payload.id);
    addPayloadReference("orchestration-v2-node", payload.rootNodeId);
    addPayloadReference("orchestration-v2-provider-thread", payload.providerThreadId);
  }
  return event({
    schemaVersion: ORCHESTRATION_EVIDENCE_SCHEMA_VERSION,
    eventId: `oev0:orchestration-v2-event:${sequenceKey}:${stored.event.id}`,
    recordType: "orchestration-v2-event",
    recordId: stored.event.id,
    lifecycleClass: "execution",
    recordBasis: "canonical-record",
    authority: "orchestration-v2",
    projectId,
    taskId,
    attemptId,
    threadId: stored.event.threadId,
    runId: executionRunId,
    occurredAt,
    recordedAt: null,
    summary: `Orchestration V2 ${stored.event.type} at sequence ${stored.sequence}`,
    unknownFields: ["recordedAt"],
    references: references([
      ["orchestration-v2-event", stored.event.id],
      ["orchestration-v2-thread", stored.event.threadId],
      ["orchestration-v2-run", executionRunId],
      ...payloadReferences,
    ]),
    facts: facts([
      ["sequence", stored.sequence],
      ["event.type", stored.event.type],
      ["payload.id", payload.id],
      ["payload.runId", payload.runId],
      ["payload.rootNodeId", payload.rootNodeId],
      ["payload.providerThreadId", payload.providerThreadId],
      ["payload.providerTurnId", payload.providerTurnId],
      ["payload.providerSessionId", payload.providerSessionId],
      ["payload.ownerNodeId", payload.ownerNodeId],
      ["source.occurredAt", occurredAt],
      ["source.recordedAt", null],
    ]),
  });
};

const v2UnresolvedEvent = (
  projectId: ProjectRuntimeTask["projectId"],
  taskId: ProjectRuntimeTask["taskId"],
  referenceType: string,
  referenceId: string,
): DraftEvent =>
  event({
    schemaVersion: ORCHESTRATION_EVIDENCE_SCHEMA_VERSION,
    eventId: `oev0:orchestration-v2-unresolved:${referenceType}:${referenceId}`,
    recordType: "orchestration-v2-unresolved",
    recordId: referenceId,
    lifecycleClass: "observation",
    recordBasis: "derived-view",
    authority: "orchestration-v2",
    projectId,
    taskId,
    attemptId: null,
    threadId: referenceType === "orchestration-v2-thread" ? referenceId : null,
    runId: referenceType === "orchestration-v2-run" ? referenceId : null,
    occurredAt: null,
    recordedAt: null,
    summary: `Referenced ${referenceType} ${referenceId} did not resolve in bounded V2 event reads`,
    unknownFields: ["occurredAt", "recordedAt", "canonicalRecord"],
    references: [],
    facts: facts([
      ["status", "unresolved"],
      ["referenceType", referenceType],
      ["referenceId", referenceId],
    ]),
  });

const stagingEvent = (reference: OrchestrationEvidenceStagingReference): DraftEvent =>
  event({
    schemaVersion: ORCHESTRATION_EVIDENCE_SCHEMA_VERSION,
    eventId: `oev0:project-staging-reference:${reference.stagingId}`,
    recordType: "project-staging-reference",
    recordId: reference.stagingId,
    lifecycleClass: "observation",
    recordBasis: "staging-reference",
    authority: "project-staging",
    projectId: reference.projectId,
    taskId: reference.taskId,
    attemptId: null,
    threadId: null,
    runId: null,
    occurredAt: reference.occurredAt,
    recordedAt: null,
    summary: `Project-owned staging evidence reference (${reference.evidenceClass}); not canonical typed state`,
    unknownFields: reference.occurredAt === null ? ["occurredAt", "recordedAt"] : ["recordedAt"],
    references: references([["project-staging-reference", reference.stagingId]]),
    facts: facts([
      ["stagingId", reference.stagingId],
      ["branch", reference.branch],
      ["commit", reference.commit],
      ["path", reference.path],
      ["evidenceClass", reference.evidenceClass],
      ["provenance", reference.provenance],
      ["decisionIds", reference.decisionIds.join(",")],
      ["decisionCount", reference.decisionIds.length],
      ["canonical", false],
    ]),
  });

type EventBlock = "orchestration-v2" | "outcome-correction" | "outcome-head";

const eventBlock = (event: DraftEvent): EventBlock | null =>
  event.recordType === "orchestration-v2-event"
    ? "orchestration-v2"
    : event.recordType === "adaptive-outcome-reconciliation"
      ? "outcome-correction"
      : event.recordType === "adaptive-accepted-outcome"
        ? "outcome-head"
        : null;

const revisionFact = (event: DraftEvent, key: string): number | null => {
  const value = event.facts.find((fact) => fact.key === key)?.value;
  return typeof value === "number" ? value : null;
};

const makeEventComparator = (blockTimes: Record<EventBlock, number>) => {
  const crossTime = (event: DraftEvent, block: EventBlock | null): number =>
    block === null ? sortTime(event.occurredAt ?? event.recordedAt) : blockTimes[block];
  return (left: DraftEvent, right: DraftEvent) => {
    const leftTask = left.recordType === "project-runtime-task";
    const rightTask = right.recordType === "project-runtime-task";
    if (leftTask !== rightTask) return leftTask ? -1 : 1;

    const leftBlock = eventBlock(left);
    const rightBlock = eventBlock(right);
    if (leftBlock !== null && leftBlock === rightBlock) {
      if (leftBlock === "orchestration-v2") {
        return left.eventId < right.eventId ? -1 : left.eventId > right.eventId ? 1 : 0;
      }
      const revisionKey = leftBlock === "outcome-correction" ? "fromRevision" : "revision";
      const leftRevision = revisionFact(left, revisionKey);
      const rightRevision = revisionFact(right, revisionKey);
      if (leftRevision !== null && rightRevision !== null && leftRevision !== rightRevision) {
        return leftRevision < rightRevision ? -1 : 1;
      }
      return left.eventId < right.eventId ? -1 : left.eventId > right.eventId ? 1 : 0;
    }

    const leftTime = crossTime(left, leftBlock);
    const rightTime = crossTime(right, rightBlock);
    if (leftTime !== rightTime) return leftTime < rightTime ? -1 : 1;

    const classDifference = CLASS_ORDER[left.lifecycleClass] - CLASS_ORDER[right.lifecycleClass];
    if (classDifference !== 0) return classDifference;

    return left.eventId < right.eventId ? -1 : left.eventId > right.eventId ? 1 : 0;
  };
};

const sortEvents = (events: ReadonlyArray<DraftEvent>): ReadonlyArray<DraftEvent> => {
  const blockTimes: Record<EventBlock, number> = {
    "orchestration-v2": UNKNOWN_TIME,
    "outcome-correction": UNKNOWN_TIME,
    "outcome-head": UNKNOWN_TIME,
  };
  for (const event of events) {
    const block = eventBlock(event);
    if (block === null) continue;
    blockTimes[block] = Math.min(blockTimes[block], sortTime(event.occurredAt ?? event.recordedAt));
  }
  return [...events].sort(makeEventComparator(blockTimes));
};

const make = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const eventStore = yield* EventStoreV2.EventStoreV2;
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

  const loadBoundedV2Evidence = Effect.fn("OrchestrationEvidenceService.loadBoundedV2Evidence")(
    function* (
      threadIds: ReadonlyArray<RuntimeExecutionAttempt["threadId"] | null>,
      runIdsByThread: ReadonlyMap<string, ReadonlySet<string>>,
    ) {
      const uniqueThreadIds = [
        ...new Set(threadIds.filter((id): id is NonNullable<typeof id> => id !== null)),
      ].sort();
      const perThread = yield* Effect.forEach(
        uniqueThreadIds,
        (threadId) =>
          eventStore.read({ threadId, limit: V2_EVENT_READ_LIMIT_PER_THREAD }).pipe(
            Stream.runCollect,
            Effect.mapError(
              (cause) =>
                new PersistenceSqlError({
                  operation: "OrchestrationEvidenceService.loadBoundedV2Evidence",
                  cause,
                }),
            ),
          ),
        { concurrency: 1 },
      );
      const referencedRuns = (threadId: string): ReadonlySet<string> =>
        runIdsByThread.get(threadId) ?? new Set<string>();
      return perThread.flat().filter((stored) => {
        const relevantRuns = referencedRuns(stored.event.threadId);
        const runId = v2EffectiveRunId(stored);
        return runId === undefined || relevantRuns.has(runId);
      });
    },
  );

  const resolvedV2References = (
    storedEvents: ReadonlyArray<OrchestrationV2StoredEvent>,
  ): ReadonlyMap<string, ReadonlySet<string>> => {
    const resolved = new Map<string, Set<string>>([
      ["orchestration-v2-thread", new Set()],
      ["orchestration-v2-run", new Set()],
      ["orchestration-v2-run-attempt", new Set()],
      ["orchestration-v2-node", new Set()],
      ["orchestration-v2-provider-session", new Set()],
      ["orchestration-v2-provider-thread", new Set()],
      ["orchestration-v2-context-transfer", new Set()],
      ["orchestration-v2-context-handoff", new Set()],
    ]);
    for (const stored of storedEvents) {
      const event = stored.event;
      resolved.get("orchestration-v2-thread")!.add(event.threadId);
      if (event.runId !== undefined) resolved.get("orchestration-v2-run")!.add(event.runId);
      if (event.nodeId !== undefined) resolved.get("orchestration-v2-node")!.add(event.nodeId);
      const payload = event.payload as {
        readonly id?: string;
        readonly runId?: string;
        readonly rootNodeId?: string | null;
        readonly providerThreadId?: string | null;
        readonly providerSessionId?: string | null;
        readonly ownerNodeId?: string | null;
        readonly appThreadId?: string | null;
      };
      const add = (recordType: string, recordId: string | null | undefined) => {
        if (typeof recordId === "string") resolved.get(recordType)!.add(recordId);
      };
      if (event.type === "provider-session.detached") {
        add("orchestration-v2-provider-session", payload.providerSessionId);
        continue;
      }
      if (typeof payload.id !== "string") continue;
      if (event.type.startsWith("thread.")) {
        add("orchestration-v2-thread", payload.id);
      } else if (event.type === "run.created" || event.type === "run.updated") {
        add("orchestration-v2-run", payload.id);
        add("orchestration-v2-node", payload.rootNodeId);
        add("orchestration-v2-provider-thread", payload.providerThreadId);
      } else if (event.type.startsWith("run-attempt.")) {
        add("orchestration-v2-run-attempt", payload.id);
        add("orchestration-v2-run", payload.runId);
        add("orchestration-v2-node", payload.rootNodeId);
        add("orchestration-v2-provider-thread", payload.providerThreadId);
      } else if (event.type === "node.updated") {
        add("orchestration-v2-node", payload.id);
        add("orchestration-v2-node", payload.rootNodeId);
        add("orchestration-v2-provider-thread", payload.providerThreadId);
      } else if (event.type.startsWith("provider-session.")) {
        add("orchestration-v2-provider-session", payload.id);
      } else if (event.type === "provider-thread.updated") {
        add("orchestration-v2-provider-thread", payload.id);
        add("orchestration-v2-provider-session", payload.providerSessionId);
        add("orchestration-v2-node", payload.ownerNodeId);
        add("orchestration-v2-thread", payload.appThreadId);
      } else if (event.type.startsWith("context-transfer.")) {
        add("orchestration-v2-context-transfer", payload.id);
      } else if (event.type === "context-handoff.updated") {
        add("orchestration-v2-context-handoff", payload.id);
      }
    }
    return resolved;
  };

  const exportTaskImpl = Effect.fn("OrchestrationEvidenceService.exportTask")(function* (
    projectId: ProjectRuntimeTask["projectId"],
    taskId: ProjectRuntimeTask["taskId"],
    options?: OrchestrationEvidenceExportOptions,
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

    const handoffRows =
      task.latestHandoffId === null
        ? []
        : yield* sql<PayloadRow>`SELECT payload_json
            FROM project_runtime_handoffs
            WHERE project_id = ${projectId} AND task_id = ${taskId}
              AND handoff_id = ${task.latestHandoffId}
            LIMIT 1`.pipe(Effect.mapError(sqlError(operation)));
    const handoffRow =
      handoffRows[0] === undefined
        ? null
        : yield* decodeHandoff(handoffRows[0].payload_json).pipe(
            Effect.mapError((cause) => PersistenceDecodeError.fromSchemaError(operation, cause)),
          );
    // The row keys are authoritative; a payload whose identity disagrees is not
    // a safe canonical handoff, so treat it like an unresolved pointer.
    const handoff =
      handoffRow !== null &&
      handoffRow.projectId === projectId &&
      handoffRow.taskId === taskId &&
      handoffRow.handoffId === task.latestHandoffId
        ? handoffRow
        : null;

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

    const runIdsByThread = new Map<string, Set<string>>();
    const attemptIdsByThread = new Map<string, Set<RuntimeExecutionAttempt["attemptId"]>>();
    for (const attempt of attempts) {
      if (attempt.threadId === null) continue;
      const runs = runIdsByThread.get(attempt.threadId) ?? new Set<string>();
      if (attempt.runId !== null) runs.add(attempt.runId);
      runIdsByThread.set(attempt.threadId, runs);
      const attemptIds = attemptIdsByThread.get(attempt.threadId) ?? new Set();
      attemptIds.add(attempt.attemptId);
      attemptIdsByThread.set(attempt.threadId, attemptIds);
    }
    for (const observation of observations) {
      const execution = observation.execution;
      if (execution === undefined) continue;
      const runs = runIdsByThread.get(execution.threadId) ?? new Set<string>();
      runs.add(execution.runId);
      runIdsByThread.set(execution.threadId, runs);
      const attemptIds = attemptIdsByThread.get(execution.threadId) ?? new Set();
      attemptIds.add(observation.attemptId);
      attemptIdsByThread.set(execution.threadId, attemptIds);
    }

    const v2StoredEvents = yield* loadBoundedV2Evidence(
      [
        ...attempts.map((attempt) => attempt.threadId),
        ...observations.map((observation) => observation.execution?.threadId ?? null),
      ],
      runIdsByThread,
    );
    const resolvedV2 = resolvedV2References(v2StoredEvents);

    const v2References = new Map<string, readonly [type: string, id: string]>();
    const addV2Reference = (type: string, id: string | null | undefined) => {
      if (id === null || id === undefined) return;
      v2References.set(`${type}\u0000${id}`, [type, id]);
    };
    for (const attempt of attempts) {
      addV2Reference("orchestration-v2-thread", attempt.threadId);
      addV2Reference("orchestration-v2-run", attempt.runId);
    }
    for (const observation of observations) {
      const execution = observation.execution;
      if (execution === undefined) continue;
      addV2Reference("orchestration-v2-thread", execution.threadId);
      addV2Reference("orchestration-v2-run", execution.runId);
      addV2Reference("orchestration-v2-run-attempt", execution.runAttemptId);
      addV2Reference("orchestration-v2-node", execution.nodeId);
      addV2Reference("orchestration-v2-provider-session", execution.providerSessionId);
      addV2Reference("orchestration-v2-provider-thread", execution.providerThreadId);
      addV2Reference("orchestration-v2-context-transfer", execution.contextTransferId);
    }
    const unresolvedV2 = [...v2References.entries()]
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .flatMap(([, [type, id]]) =>
        resolvedV2.get(type)?.has(id) === true ? [] : [[type, id] as const],
      );

    const predictionIdsByAttempt = new Map<string, Set<string>>();
    for (const observation of observations) {
      const predictionIds = predictionIdsByAttempt.get(observation.attemptId) ?? new Set<string>();
      predictionIds.add(observation.predictionId);
      predictionIdsByAttempt.set(observation.attemptId, predictionIds);
    }
    const recommendationCandidatesFor = (
      attempt: RuntimeExecutionAttempt,
    ): ReadonlyArray<string> => {
      const predictionIds = predictionIdsByAttempt.get(attempt.attemptId);
      const attemptCreatedAt = Date.parse(attempt.createdAt);
      return receipts
        .filter(
          (receipt) =>
            receipt.taskId === attempt.taskId &&
            (predictionIds === undefined ||
              predictionIds.size === 0 ||
              predictionIds.has(receipt.predictionId)) &&
            Date.parse(receipt.createdAt) <= attemptCreatedAt,
        )
        .map((receipt) => receipt.recommendationReceiptId)
        .sort();
    };

    const attemptIdForThread = (threadId: string): RuntimeExecutionAttempt["attemptId"] | null => {
      const attemptIds = attemptIdsByThread.get(threadId);
      return attemptIds?.size === 1 ? ([...attemptIds][0] ?? null) : null;
    };

    const stagingReferences = (options?.stagingReferences ?? []).filter(
      (reference) => reference.projectId === projectId && reference.taskId === taskId,
    );

    const handoffEvent =
      task.latestHandoffId === null
        ? null
        : handoff === null
          ? runtimeHandoffUnresolvedEvent(task, task.latestHandoffId)
          : runtimeHandoffEvent(handoff);
    const generatedAt = yield* now;
    const drafts = sortEvents([
      taskEvent(task),
      ...task.verification.evidence.map((evidence) => runtimeVerificationEvent(task, evidence)),
      ...(handoffEvent === null ? [] : [handoffEvent]),
      ...attempts.flatMap((attempt) => [
        attemptDecisionEvent(attempt),
        attemptOutcomeEvent(attempt),
        recommendationAttemptLinkEvent(attempt, recommendationCandidatesFor(attempt)),
      ]),
      ...predictions.map(difficultyPredictionEvent),
      ...realized.map(realizedDifficultyEvent),
      ...observations.map(executionObservationEvent),
      ...outcomes.map(acceptedOutcomeEvent),
      ...reconciliations.map(outcomeReconciliationEvent),
      ...reconciliations.map(supersededOutcomeEvent),
      ...receipts.map(recommendationReceiptEvent),
      ...assignments.map(experimentAssignmentEvent),
      ...capacity.pools.map((pool) => capacityPoolEvent(projectId, pool)),
      ...capacity.snapshots.map((snapshot) => capacitySnapshotEvent(projectId, snapshot)),
      ...v2StoredEvents.map((stored) =>
        v2Event(projectId, taskId, attemptIdForThread(stored.event.threadId), stored),
      ),
      ...unresolvedV2.map(([type, id]) => v2UnresolvedEvent(projectId, taskId, type, id)),
      ...stagingReferences.map(stagingEvent),
    ]);
    const events = drafts.map((draft) => ({ ...draft, exportedAt: generatedAt }));

    return {
      schemaVersion: ORCHESTRATION_EVIDENCE_SCHEMA_VERSION,
      projectId,
      taskId,
      generatedAt,
      taskRevision: task.revision,
      events,
    };
  }, sql.withTransaction);

  const exportTask: OrchestrationEvidenceShape["exportTask"] = (projectId, taskId, options) =>
    exportTaskImpl(projectId, taskId, options).pipe(
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
  )(function* (projectId, taskId, options) {
    const exported = yield* exportTask(projectId, taskId, options);
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
  )(function* (projectId, taskId, options) {
    const exported = yield* exportTask(projectId, taskId, options);
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
