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
  factsMaxCount: 100,
  referencesMaxCount: 100,
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
]);
export type OrchestrationEvidenceRecordType = typeof OrchestrationEvidenceRecordType.Type;

/** Decision-time and post-outcome records must remain distinguishable after export. */
export const OrchestrationEvidenceClass = Schema.Literals([
  "decision",
  "assessment",
  "outcome",
  "correction",
  "observation",
]);
export type OrchestrationEvidenceClass = typeof OrchestrationEvidenceClass.Type;

export const OrchestrationEvidenceNature = Schema.Literals(["canonical", "derived"]);
export type OrchestrationEvidenceNature = typeof OrchestrationEvidenceNature.Type;

export const OrchestrationEvidenceSource = Schema.Literals(["runtime", "adaptive-routing"]);
export type OrchestrationEvidenceSource = typeof OrchestrationEvidenceSource.Type;

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
  evidenceClass: OrchestrationEvidenceClass,
  recordNature: OrchestrationEvidenceNature,
  source: OrchestrationEvidenceSource,
  projectId: ProjectId,
  taskId: Schema.NullOr(ProjectRuntimeTaskId),
  attemptId: Schema.NullOr(RuntimeExecutionAttemptId),
  threadId: Schema.NullOr(EvidenceId),
  runId: Schema.NullOr(EvidenceId),
  occurredAt: Schema.NullOr(IsoDateTime),
  recordedAt: Schema.NullOr(IsoDateTime),
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
