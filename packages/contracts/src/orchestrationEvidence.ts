import * as Schema from "effect/Schema";

import { IsoDateTime, PositiveInt, ProjectId, TrimmedNonEmptyString } from "./baseSchemas.ts";
import { ProjectRuntimeTaskId } from "./projectRuntime.ts";
import { RuntimeExecutionAttemptId } from "./runtimeExecution.ts";

/**
 * Evidence V0 is a read-only projection over canonical Runtime/ARM/V2 records.
 * An event may summarize or reference a canonical record; it never replaces it,
 * and a missing value stays UNKNOWN rather than being inferred.
 */
export const ORCHESTRATION_EVIDENCE_SCHEMA_VERSION = "orchestration-evidence/v0" as const;

const ORCHESTRATION_EVIDENCE_BOUNDS = {
  idMaxLength: 256,
  summaryMaxLength: 512,
  fieldNameMaxLength: 128,
  factsMaxCount: 2_000,
  referencesMaxCount: 2_000,
  unknownFieldsMaxCount: 100,
  eventsMaxCount: 10_000,
} as const;

const EvidenceId = TrimmedNonEmptyString.check(
  Schema.isMaxLength(ORCHESTRATION_EVIDENCE_BOUNDS.idMaxLength),
);
const EvidenceSummary = TrimmedNonEmptyString.check(
  Schema.isMaxLength(ORCHESTRATION_EVIDENCE_BOUNDS.summaryMaxLength),
);
const EvidenceFieldName = TrimmedNonEmptyString.check(
  Schema.isMaxLength(ORCHESTRATION_EVIDENCE_BOUNDS.fieldNameMaxLength),
);
const EvidenceFactValue = Schema.Union([Schema.String, Schema.Number, Schema.Boolean, Schema.Null]);

export const OrchestrationEvidenceSchemaVersion = Schema.Literal(
  ORCHESTRATION_EVIDENCE_SCHEMA_VERSION,
);

export const OrchestrationEvidenceRecordType = Schema.Literals([
  "project-runtime-task",
  "project-runtime-verification",
  "project-runtime-handoff",
  "project-runtime-handoff-unresolved",
  "runtime-route-resolution",
  "execution-attempt-decision",
  "execution-attempt-outcome",
  "adaptive-difficulty-prediction",
  "adaptive-realized-difficulty",
  "adaptive-execution-observation",
  "adaptive-accepted-outcome",
  "adaptive-outcome-reconciliation",
  "adaptive-recommendation-receipt",
  "adaptive-experiment-assignment",
  "adaptive-capacity-pool",
  "adaptive-capacity-snapshot",
  "adaptive-recommendation-attempt-link",
  "orchestration-v2-event",
  "orchestration-v2-unresolved",
  "project-staging-reference",
]);
export type OrchestrationEvidenceRecordType = typeof OrchestrationEvidenceRecordType.Type;

/**
 * Lifecycle axis for task-history ordering. This is deliberately not the ledger's
 * `evidence_class` (OBSERVED_FACT / ORCHESTRATOR_CLAIM / ...): that axis classifies
 * how a claim is known, while this one classifies where it sits in a decision.
 */
export const OrchestrationEvidenceLifecycleClass = Schema.Literals([
  "decision",
  "assessment",
  "execution",
  "outcome",
  "correction",
  "observation",
]);
export type OrchestrationEvidenceLifecycleClass = typeof OrchestrationEvidenceLifecycleClass.Type;

/**
 * A canonical insert-only record, a view over mutable/aggregated state, or a
 * weaker project-owned staging reference that is not canonical typed state.
 */
export const OrchestrationEvidenceBasis = Schema.Literals([
  "canonical-record",
  "derived-view",
  "staging-reference",
]);
export type OrchestrationEvidenceBasis = typeof OrchestrationEvidenceBasis.Type;

/**
 * Who owns the represented fact. These mirror the governing source-of-truth map
 * and deliberately keep Project Runtime, Runtime Execution, Runtime Routing, ARM,
 * Orchestration V2, and project-owned staging distinct.
 */
export const OrchestrationEvidenceAuthority = Schema.Literals([
  "project-runtime",
  "runtime-execution",
  "runtime-routing",
  "arm",
  "orchestration-v2",
  "project-staging",
]);
export type OrchestrationEvidenceAuthority = typeof OrchestrationEvidenceAuthority.Type;

export const OrchestrationEvidenceFact = Schema.Struct({
  key: EvidenceFieldName,
  value: EvidenceFactValue,
});
export type OrchestrationEvidenceFact = typeof OrchestrationEvidenceFact.Type;

/** A stable pointer to the authoritative record the event was projected from. */
export const OrchestrationEvidenceReference = Schema.Struct({
  recordType: TrimmedNonEmptyString,
  recordId: EvidenceId,
});
export type OrchestrationEvidenceReference = typeof OrchestrationEvidenceReference.Type;

export const OrchestrationEvidenceEvent = Schema.Struct({
  schemaVersion: OrchestrationEvidenceSchemaVersion,
  eventId: EvidenceId,
  recordType: OrchestrationEvidenceRecordType,
  recordId: EvidenceId,
  lifecycleClass: OrchestrationEvidenceLifecycleClass,
  recordBasis: OrchestrationEvidenceBasis,
  authority: OrchestrationEvidenceAuthority,
  projectId: ProjectId,
  taskId: Schema.NullOr(ProjectRuntimeTaskId),
  attemptId: Schema.NullOr(RuntimeExecutionAttemptId),
  threadId: Schema.NullOr(EvidenceId),
  runId: Schema.NullOr(EvidenceId),
  occurredAt: Schema.NullOr(IsoDateTime),
  recordedAt: Schema.NullOr(IsoDateTime),
  exportedAt: IsoDateTime,
  summary: EvidenceSummary,
  unknownFields: Schema.Array(EvidenceFieldName).check(
    Schema.isMaxLength(ORCHESTRATION_EVIDENCE_BOUNDS.unknownFieldsMaxCount),
  ),
  references: Schema.Array(OrchestrationEvidenceReference).check(
    Schema.isMaxLength(ORCHESTRATION_EVIDENCE_BOUNDS.referencesMaxCount),
  ),
  facts: Schema.Array(OrchestrationEvidenceFact).check(
    Schema.isMaxLength(ORCHESTRATION_EVIDENCE_BOUNDS.factsMaxCount),
  ),
});
export type OrchestrationEvidenceEvent = typeof OrchestrationEvidenceEvent.Type;

/**
 * How a project-owned staging reference was known at capture time. These mirror
 * the ledger's evidence classes; they are not canonical Runtime/ARM/V2 state.
 */
export const OrchestrationEvidenceStagingEvidenceClass = Schema.Literals([
  "observed-fact",
  "orchestrator-claim",
  "retrospective-inference",
]);
export type OrchestrationEvidenceStagingEvidenceClass =
  typeof OrchestrationEvidenceStagingEvidenceClass.Type;

/**
 * Caller-supplied stable reference to project-owned evidence that has not been
 * promoted into typed canonical state. The service never persists this reference
 * and never fabricates Runtime/ARM/V2 rows from it.
 */
export const OrchestrationEvidenceStagingReference = Schema.Struct({
  stagingId: EvidenceId,
  projectId: ProjectId,
  taskId: ProjectRuntimeTaskId,
  branch: EvidenceId,
  commit: EvidenceId,
  path: Schema.optionalKey(EvidenceId),
  decisionIds: Schema.Array(EvidenceId).check(
    Schema.isMaxLength(ORCHESTRATION_EVIDENCE_BOUNDS.referencesMaxCount),
  ),
  evidenceClass: OrchestrationEvidenceStagingEvidenceClass,
  provenance: EvidenceSummary,
  occurredAt: Schema.NullOr(IsoDateTime),
});
export type OrchestrationEvidenceStagingReference =
  typeof OrchestrationEvidenceStagingReference.Type;

export const OrchestrationEvidenceExportOptions = Schema.Struct({
  stagingReferences: Schema.optionalKey(
    Schema.Array(OrchestrationEvidenceStagingReference).check(
      Schema.isMaxLength(ORCHESTRATION_EVIDENCE_BOUNDS.referencesMaxCount),
    ),
  ),
});
export type OrchestrationEvidenceExportOptions = typeof OrchestrationEvidenceExportOptions.Type;

export const OrchestrationEvidenceExport = Schema.Struct({
  schemaVersion: OrchestrationEvidenceSchemaVersion,
  projectId: ProjectId,
  taskId: ProjectRuntimeTaskId,
  generatedAt: IsoDateTime,
  taskRevision: PositiveInt,
  events: Schema.Array(OrchestrationEvidenceEvent).check(
    Schema.isMaxLength(ORCHESTRATION_EVIDENCE_BOUNDS.eventsMaxCount),
  ),
});
export type OrchestrationEvidenceExport = typeof OrchestrationEvidenceExport.Type;

export const OrchestrationEvidenceReconstruction = Schema.Struct({
  schemaVersion: OrchestrationEvidenceSchemaVersion,
  projectId: ProjectId,
  taskId: ProjectRuntimeTaskId,
  generatedAt: IsoDateTime,
  taskRevision: PositiveInt,
  ordering: Schema.Literal("task-first-then-chronological"),
  events: Schema.Array(OrchestrationEvidenceEvent).check(
    Schema.isMaxLength(ORCHESTRATION_EVIDENCE_BOUNDS.eventsMaxCount),
  ),
});
export type OrchestrationEvidenceReconstruction = typeof OrchestrationEvidenceReconstruction.Type;

export class OrchestrationEvidenceTaskNotFoundError extends Schema.TaggedError<OrchestrationEvidenceTaskNotFoundError>()(
  "OrchestrationEvidenceTaskNotFoundError",
  {
    projectId: ProjectId,
    taskId: ProjectRuntimeTaskId,
  },
) {
  override get message(): string {
    return `No Runtime task ${this.taskId} exists in project ${this.projectId}.`;
  }
}
