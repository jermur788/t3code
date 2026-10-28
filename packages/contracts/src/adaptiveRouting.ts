import * as Schema from "effect/Schema";

import {
  IsoDateTime,
  NonNegativeInt,
  PositiveInt,
  ProjectId,
  TrimmedNonEmptyString,
} from "./baseSchemas.ts";
import { ModelSelection } from "./modelSelection.ts";
import { ProviderDriverKind, ProviderInstanceId } from "./providerInstance.ts";
import { ProjectRuntimeTaskId } from "./projectRuntime.ts";
import { RuntimeExecutionAttemptId } from "./runtimeExecution.ts";
import { RuntimeRouteSource } from "./runtimeRoutingResolution.ts";

export const ADAPTIVE_ROUTING_VERSION = 1 as const;

export const ADAPTIVE_ROUTING_BOUNDS = {
  idMaxLength: 200,
  versionMaxLength: 128,
  fingerprintMaxLength: 256,
  labelMaxLength: 200,
  unitMaxLength: 64,
  referenceMaxLength: 512,
  reasonMaxLength: 2_000,
  evidenceMaxCount: 100,
  reasonsMaxCount: 50,
  candidatesMaxCount: 50,
  windowsMaxCount: 50,
  snapshotsMaxCount: 50,
  exclusionChecksMaxCount: 50,
} as const;

const AdaptiveId = TrimmedNonEmptyString.check(
  Schema.isMaxLength(ADAPTIVE_ROUTING_BOUNDS.idMaxLength),
);
const AdaptiveVersion = TrimmedNonEmptyString.check(
  Schema.isMaxLength(ADAPTIVE_ROUTING_BOUNDS.versionMaxLength),
);
const AdaptiveFingerprint = TrimmedNonEmptyString.check(
  Schema.isMaxLength(ADAPTIVE_ROUTING_BOUNDS.fingerprintMaxLength),
);
const AdaptiveLabel = TrimmedNonEmptyString.check(
  Schema.isMaxLength(ADAPTIVE_ROUTING_BOUNDS.labelMaxLength),
);
const AdaptiveUnit = TrimmedNonEmptyString.check(
  Schema.isMaxLength(ADAPTIVE_ROUTING_BOUNDS.unitMaxLength),
);
const AdaptiveReference = TrimmedNonEmptyString.check(
  Schema.isMaxLength(ADAPTIVE_ROUTING_BOUNDS.referenceMaxLength),
);
const AdaptiveReason = TrimmedNonEmptyString.check(
  Schema.isMaxLength(ADAPTIVE_ROUTING_BOUNDS.reasonMaxLength),
);
const Confidence = Schema.Number.check(Schema.isBetween({ minimum: 0, maximum: 1 }));
const DifficultyScore = Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 4 }));
const AdaptiveSchemaVersion = Schema.Literal(ADAPTIVE_ROUTING_VERSION);

export const AdaptiveDifficultyPredictionId = AdaptiveId.pipe(
  Schema.brand("AdaptiveDifficultyPredictionId"),
);
export type AdaptiveDifficultyPredictionId = typeof AdaptiveDifficultyPredictionId.Type;

export const AdaptiveRealizedDifficultyId = AdaptiveId.pipe(
  Schema.brand("AdaptiveRealizedDifficultyId"),
);
export type AdaptiveRealizedDifficultyId = typeof AdaptiveRealizedDifficultyId.Type;

export const AdaptiveExecutionObservationId = AdaptiveId.pipe(
  Schema.brand("AdaptiveExecutionObservationId"),
);
export type AdaptiveExecutionObservationId = typeof AdaptiveExecutionObservationId.Type;

export const AdaptiveCapacityPoolId = AdaptiveId.pipe(Schema.brand("AdaptiveCapacityPoolId"));
export type AdaptiveCapacityPoolId = typeof AdaptiveCapacityPoolId.Type;

export const AdaptiveCapacitySnapshotId = AdaptiveId.pipe(
  Schema.brand("AdaptiveCapacitySnapshotId"),
);
export type AdaptiveCapacitySnapshotId = typeof AdaptiveCapacitySnapshotId.Type;

export const AdaptiveCapacityResetEventId = AdaptiveId.pipe(
  Schema.brand("AdaptiveCapacityResetEventId"),
);
export type AdaptiveCapacityResetEventId = typeof AdaptiveCapacityResetEventId.Type;

export const AdaptiveOutcomeId = AdaptiveId.pipe(Schema.brand("AdaptiveOutcomeId"));
export type AdaptiveOutcomeId = typeof AdaptiveOutcomeId.Type;

export const AdaptiveOutcomeReconciliationId = AdaptiveId.pipe(
  Schema.brand("AdaptiveOutcomeReconciliationId"),
);
export type AdaptiveOutcomeReconciliationId = typeof AdaptiveOutcomeReconciliationId.Type;

export const AdaptiveRecommendationReceiptId = AdaptiveId.pipe(
  Schema.brand("AdaptiveRecommendationReceiptId"),
);
export type AdaptiveRecommendationReceiptId = typeof AdaptiveRecommendationReceiptId.Type;

export const AdaptiveExperimentAssignmentId = AdaptiveId.pipe(
  Schema.brand("AdaptiveExperimentAssignmentId"),
);
export type AdaptiveExperimentAssignmentId = typeof AdaptiveExperimentAssignmentId.Type;

export const AdaptiveDifficultyBand = Schema.Literals(["routine", "moderate", "hard", "critical"]);
export type AdaptiveDifficultyBand = typeof AdaptiveDifficultyBand.Type;

export const AdaptiveDifficultyDimensions = Schema.Struct({
  ambiguity: DifficultyScore,
  scopeBreadth: DifficultyScore,
  reasoningComplexity: DifficultyScore,
  integrationToolComplexity: DifficultyScore,
  risk: DifficultyScore,
  verificationBurden: DifficultyScore,
});
export type AdaptiveDifficultyDimensions = typeof AdaptiveDifficultyDimensions.Type;

export const AdaptiveDifficultyAssessment = Schema.Struct({
  dimensions: AdaptiveDifficultyDimensions,
  band: AdaptiveDifficultyBand,
  confidence: Confidence,
});
export type AdaptiveDifficultyAssessment = typeof AdaptiveDifficultyAssessment.Type;

export const AdaptiveDifficultyOverride = Schema.Struct({
  assessment: AdaptiveDifficultyAssessment,
  actor: AdaptiveLabel,
  reason: AdaptiveReason,
  overriddenAt: IsoDateTime,
});
export type AdaptiveDifficultyOverride = typeof AdaptiveDifficultyOverride.Type;

/** Immutable pre-routing snapshot. Overrides preserve, rather than replace, the original assessment. */
export const AdaptiveDifficultyPrediction = Schema.Struct({
  schemaVersion: AdaptiveSchemaVersion,
  predictionId: AdaptiveDifficultyPredictionId,
  projectId: ProjectId,
  taskId: ProjectRuntimeTaskId,
  taskRevision: PositiveInt,
  assessment: AdaptiveDifficultyAssessment,
  predictionVersion: AdaptiveVersion,
  inputFingerprint: AdaptiveFingerprint,
  override: Schema.optionalKey(AdaptiveDifficultyOverride),
  createdAt: IsoDateTime,
});
export type AdaptiveDifficultyPrediction = typeof AdaptiveDifficultyPrediction.Type;

/** Immutable post-evidence derivation. Evidence references point to authoritative project/runtime records. */
export const AdaptiveRealizedDifficulty = Schema.Struct({
  schemaVersion: AdaptiveSchemaVersion,
  realizedDifficultyId: AdaptiveRealizedDifficultyId,
  projectId: ProjectId,
  taskId: ProjectRuntimeTaskId,
  assessment: AdaptiveDifficultyAssessment,
  derivationVersion: AdaptiveVersion,
  evidenceRefs: Schema.Array(AdaptiveReference).check(
    Schema.isMaxLength(ADAPTIVE_ROUTING_BOUNDS.evidenceMaxCount),
  ),
  createdAt: IsoDateTime,
});
export type AdaptiveRealizedDifficulty = typeof AdaptiveRealizedDifficulty.Type;

/**
 * ARM-010 stores only durable links around an execution attempt. ARM-020 adds the exact
 * launch/context observation without changing the existing execution receipt or launch path.
 */
export const AdaptiveExecutionObservationReference = Schema.Struct({
  schemaVersion: AdaptiveSchemaVersion,
  observationId: AdaptiveExecutionObservationId,
  projectId: ProjectId,
  taskId: ProjectRuntimeTaskId,
  attemptId: RuntimeExecutionAttemptId,
  predictionId: AdaptiveDifficultyPredictionId,
  realizedDifficultyId: Schema.optionalKey(AdaptiveRealizedDifficultyId),
  outcomeId: Schema.optionalKey(AdaptiveOutcomeId),
  capacityBeforeSnapshotId: Schema.optionalKey(AdaptiveCapacitySnapshotId),
  capacityAfterSnapshotId: Schema.optionalKey(AdaptiveCapacitySnapshotId),
  experimentAssignmentId: Schema.optionalKey(AdaptiveExperimentAssignmentId),
  createdAt: IsoDateTime,
});
export type AdaptiveExecutionObservationReference =
  typeof AdaptiveExecutionObservationReference.Type;

export const AdaptiveCapacityPoolIdentityQuality = Schema.Literals([
  "provider_instance",
  "provider_stable_alias",
  "user_defined_alias",
  "unknown",
]);
export type AdaptiveCapacityPoolIdentityQuality = typeof AdaptiveCapacityPoolIdentityQuality.Type;

/**
 * Environment-scoped subscription capacity identity. The canonical id is opaque. Human-readable
 * provider/account/billing identity is deliberately absent; displayAlias is user-defined only.
 */
export const AdaptiveCapacityPool = Schema.Struct({
  schemaVersion: AdaptiveSchemaVersion,
  capacityPoolId: AdaptiveCapacityPoolId,
  providerDriver: ProviderDriverKind,
  providerInstanceId: Schema.optionalKey(ProviderInstanceId),
  identityQuality: AdaptiveCapacityPoolIdentityQuality,
  displayAlias: Schema.optionalKey(AdaptiveLabel),
  createdAt: IsoDateTime,
});
export type AdaptiveCapacityPool = typeof AdaptiveCapacityPool.Type;

export const AdaptiveCapacityMeasurement = Schema.Union([
  Schema.Struct({ quality: Schema.Literal("unknown") }),
  Schema.Struct({
    quality: Schema.Literals(["exact", "approximate"]),
    value: Schema.Number,
    unit: AdaptiveUnit,
  }),
]);
export type AdaptiveCapacityMeasurement = typeof AdaptiveCapacityMeasurement.Type;

export const AdaptiveCapacityWindow = Schema.Struct({
  windowId: AdaptiveLabel,
  windowType: AdaptiveLabel,
  used: AdaptiveCapacityMeasurement,
  remaining: AdaptiveCapacityMeasurement,
  limit: AdaptiveCapacityMeasurement,
  resetAt: Schema.optionalKey(IsoDateTime),
});
export type AdaptiveCapacityWindow = typeof AdaptiveCapacityWindow.Type;

export const AdaptiveCapacityObservationQuality = Schema.Literals([
  "provider_reported",
  "t3_observed",
  "user_entered",
  "inferred",
]);
export type AdaptiveCapacityObservationQuality = typeof AdaptiveCapacityObservationQuality.Type;

export const AdaptiveCapacitySnapshot = Schema.Struct({
  schemaVersion: AdaptiveSchemaVersion,
  snapshotId: AdaptiveCapacitySnapshotId,
  capacityPoolId: AdaptiveCapacityPoolId,
  observedAt: IsoDateTime,
  sourceQuality: AdaptiveCapacityObservationQuality,
  windows: Schema.Array(AdaptiveCapacityWindow).check(
    Schema.isMaxLength(ADAPTIVE_ROUTING_BOUNDS.windowsMaxCount),
  ),
  subscriptionPlanLabel: Schema.optionalKey(AdaptiveLabel),
});
export type AdaptiveCapacitySnapshot = typeof AdaptiveCapacitySnapshot.Type;

export const AdaptiveCapacityResetKind = Schema.Literals([
  "scheduled_reset",
  "observed_bonus_reset",
  "manual_correction",
  "inferred_reset",
]);
export type AdaptiveCapacityResetKind = typeof AdaptiveCapacityResetKind.Type;

export const AdaptiveCapacityResetEvent = Schema.Struct({
  schemaVersion: AdaptiveSchemaVersion,
  resetEventId: AdaptiveCapacityResetEventId,
  capacityPoolId: AdaptiveCapacityPoolId,
  windowId: Schema.optionalKey(AdaptiveLabel),
  kind: AdaptiveCapacityResetKind,
  observedAt: IsoDateTime,
  sourceQuality: AdaptiveCapacityObservationQuality,
  evidenceRef: Schema.optionalKey(AdaptiveReference),
  note: Schema.optionalKey(AdaptiveReason),
});
export type AdaptiveCapacityResetEvent = typeof AdaptiveCapacityResetEvent.Type;

export const AdaptiveAcceptedOutcomeState = Schema.Literals([
  "unresolved",
  "accepted_without_rework",
  "accepted_after_rework",
  "rejected_or_superseded",
  "failed",
  "cancelled",
]);
export type AdaptiveAcceptedOutcomeState = typeof AdaptiveAcceptedOutcomeState.Type;

export const AdaptiveOutcomeAuthority = Schema.Literals([
  "runtime_task",
  "ccf_canonical",
  "overall_manager",
  "external_review",
  "operator",
]);
export type AdaptiveOutcomeAuthority = typeof AdaptiveOutcomeAuthority.Type;

export const AdaptiveOutcomeProvenance = Schema.Struct({
  authority: AdaptiveOutcomeAuthority,
  reference: AdaptiveReference,
  observedAt: IsoDateTime,
});
export type AdaptiveOutcomeProvenance = typeof AdaptiveOutcomeProvenance.Type;

/** Mutable reconciliation head. All changes require expectedRevision and append immutable history. */
export const AdaptiveAcceptedOutcome = Schema.Struct({
  schemaVersion: AdaptiveSchemaVersion,
  outcomeId: AdaptiveOutcomeId,
  projectId: ProjectId,
  taskId: ProjectRuntimeTaskId,
  state: AdaptiveAcceptedOutcomeState,
  revision: PositiveInt,
  provenance: AdaptiveOutcomeProvenance,
  evidenceRefs: Schema.Array(AdaptiveReference).check(
    Schema.isMaxLength(ADAPTIVE_ROUTING_BOUNDS.evidenceMaxCount),
  ),
  reconciledAt: IsoDateTime,
});
export type AdaptiveAcceptedOutcome = typeof AdaptiveAcceptedOutcome.Type;

export const AdaptiveOutcomeReconciliation = Schema.Struct({
  schemaVersion: AdaptiveSchemaVersion,
  reconciliationId: AdaptiveOutcomeReconciliationId,
  outcomeId: AdaptiveOutcomeId,
  projectId: ProjectId,
  taskId: ProjectRuntimeTaskId,
  fromRevision: PositiveInt,
  toRevision: PositiveInt,
  fromState: AdaptiveAcceptedOutcomeState,
  toState: AdaptiveAcceptedOutcomeState,
  provenance: AdaptiveOutcomeProvenance,
  evidenceRefs: Schema.Array(AdaptiveReference).check(
    Schema.isMaxLength(ADAPTIVE_ROUTING_BOUNDS.evidenceMaxCount),
  ),
  reconciledAt: IsoDateTime,
});
export type AdaptiveOutcomeReconciliation = typeof AdaptiveOutcomeReconciliation.Type;

export const AdaptiveOutcomeReconcileInput = Schema.Struct({
  reconciliationId: AdaptiveOutcomeReconciliationId,
  outcomeId: AdaptiveOutcomeId,
  expectedRevision: PositiveInt,
  state: AdaptiveAcceptedOutcomeState,
  provenance: AdaptiveOutcomeProvenance,
  evidenceRefs: Schema.Array(AdaptiveReference).check(
    Schema.isMaxLength(ADAPTIVE_ROUTING_BOUNDS.evidenceMaxCount),
  ),
  reconciledAt: IsoDateTime,
});
export type AdaptiveOutcomeReconcileInput = typeof AdaptiveOutcomeReconcileInput.Type;

/** Durable advisory receipt. A recommendation is evidence, never launch authorization. */
export const AdaptiveRecommendationReceipt = Schema.Struct({
  schemaVersion: AdaptiveSchemaVersion,
  recommendationReceiptId: AdaptiveRecommendationReceiptId,
  projectId: ProjectId,
  taskId: ProjectRuntimeTaskId,
  predictionId: AdaptiveDifficultyPredictionId,
  staticRouteSource: RuntimeRouteSource,
  eligibleCandidates: Schema.Array(ModelSelection).check(
    Schema.isMaxLength(ADAPTIVE_ROUTING_BOUNDS.candidatesMaxCount),
  ),
  recommendedCandidate: Schema.NullOr(ModelSelection),
  historicalSampleCount: NonNegativeInt,
  capacitySnapshotIds: Schema.Array(AdaptiveCapacitySnapshotId).check(
    Schema.isMaxLength(ADAPTIVE_ROUTING_BOUNDS.snapshotsMaxCount),
  ),
  confidence: Confidence,
  scoringVersion: AdaptiveVersion,
  reasons: Schema.Array(AdaptiveReason).check(
    Schema.isMaxLength(ADAPTIVE_ROUTING_BOUNDS.reasonsMaxCount),
  ),
  uncertaintyNotes: Schema.Array(AdaptiveReason).check(
    Schema.isMaxLength(ADAPTIVE_ROUTING_BOUNDS.reasonsMaxCount),
  ),
  createdAt: IsoDateTime,
});
export type AdaptiveRecommendationReceipt = typeof AdaptiveRecommendationReceipt.Type;

export const AdaptiveExperimentAssignmentMethod = Schema.Literals([
  "prospective",
  "randomized",
  "manual",
  "read_only_duplicate",
]);
export type AdaptiveExperimentAssignmentMethod = typeof AdaptiveExperimentAssignmentMethod.Type;

export const AdaptiveExperimentAssignment = Schema.Struct({
  schemaVersion: AdaptiveSchemaVersion,
  assignmentId: AdaptiveExperimentAssignmentId,
  projectId: ProjectId,
  taskId: ProjectRuntimeTaskId,
  comparabilityKey: AdaptiveFingerprint,
  comparabilityVersion: AdaptiveVersion,
  candidateSet: Schema.Array(ModelSelection).check(
    Schema.isMaxLength(ADAPTIVE_ROUTING_BOUNDS.candidatesMaxCount),
  ),
  assignedCandidate: ModelSelection,
  method: AdaptiveExperimentAssignmentMethod,
  propensity: Schema.optionalKey(Confidence),
  capacitySnapshotIds: Schema.Array(AdaptiveCapacitySnapshotId).check(
    Schema.isMaxLength(ADAPTIVE_ROUTING_BOUNDS.snapshotsMaxCount),
  ),
  exclusionChecks: Schema.Array(AdaptiveReference).check(
    Schema.isMaxLength(ADAPTIVE_ROUTING_BOUNDS.exclusionChecksMaxCount),
  ),
  createdAt: IsoDateTime,
});
export type AdaptiveExperimentAssignment = typeof AdaptiveExperimentAssignment.Type;

export class AdaptiveRoutingRecordNotFoundError extends Schema.TaggedError<AdaptiveRoutingRecordNotFoundError>()(
  "AdaptiveRoutingRecordNotFoundError",
  {
    entity: Schema.Literals(["outcome"]),
    entityId: AdaptiveId,
  },
) {
  override get message(): string {
    return `Adaptive routing ${this.entity} ${this.entityId} was not found.`;
  }
}

export class AdaptiveRoutingConflictError extends Schema.TaggedError<AdaptiveRoutingConflictError>()(
  "AdaptiveRoutingConflictError",
  {
    entity: Schema.Literals(["outcome"]),
    entityId: AdaptiveId,
    expectedRevision: PositiveInt,
    currentRevision: PositiveInt,
  },
) {
  override get message(): string {
    return `Adaptive routing ${this.entity} ${this.entityId} is at revision ${this.currentRevision}, not the expected revision ${this.expectedRevision}.`;
  }
}
