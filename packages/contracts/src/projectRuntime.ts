import * as Schema from "effect/Schema";
import { DEVELOPMENT_PROFILE_BOUNDS } from "./developmentProfileBounds.ts";

import {
  IsoDateTime,
  NonNegativeInt,
  PositiveInt,
  ProjectId,
  ThreadId,
  TrimmedNonEmptyString,
  TrimmedString,
} from "./baseSchemas.ts";
import { ProviderInstanceId } from "./providerInstance.ts";
import { ProjectContentMatchRange } from "./project.ts";

export const PROJECT_RUNTIME_VERSION = 1 as const;

/**
 * Public bounds for Runtime records and retrieval. The server enforces the
 * same values at the service boundary; keeping them here lets clients and
 * tests reject oversized input before a round trip.
 */
export const PROJECT_RUNTIME_BOUNDS = {
  idMaxLength: 200,
  instructionsMaxLength: 32_000,
  actorMaxLength: 200,
  sourceTitleMaxLength: 200,
  sourcePathMaxLength: 512,
  sourceDescriptionMaxLength: 2_000,
  taskTitleMaxLength: 200,
  taskTextMaxLength: 20_000,
  taskNextActionMaxLength: 2_000,
  taskBranchMaxLength: 256,
  taskWorktreePathMaxLength: 4_096,
  taskBaseShaMaxLength: 128,
  handoffCheckpointMaxLength: 200,
  handoffSummaryMaxLength: 8_000,
  handoffTextMaxLength: 8_000,
  handoffEvidenceMaxCount: 20,
  handoffEvidenceMaxLength: 1_024,
  modelMaxLength: 200,
  listMaxLimit: 100,
  searchMaxLimit: 100,
  searchQueryMaxLength: 256,
  searchLineMaxLength: 4_000,
  searchMaxBytes: 65_536,
  readMaxLines: 400,
  readMaxBytes: 65_536,
  contextMaxSources: 50,
  contextMaxTasks: 50,
  contextMaxBytes: 65_536,
} as const;

const ProjectRuntimeId = TrimmedNonEmptyString.check(
  Schema.isMaxLength(PROJECT_RUNTIME_BOUNDS.idMaxLength),
);

export const ProjectRuntimeActor = TrimmedNonEmptyString.check(
  Schema.isMaxLength(PROJECT_RUNTIME_BOUNDS.actorMaxLength),
);
export type ProjectRuntimeActor = typeof ProjectRuntimeActor.Type;

export const ProjectRuntimeSourceId = ProjectRuntimeId.pipe(Schema.brand("ProjectRuntimeSourceId"));
export type ProjectRuntimeSourceId = typeof ProjectRuntimeSourceId.Type;

export const ProjectRuntimeTaskId = ProjectRuntimeId.pipe(Schema.brand("ProjectRuntimeTaskId"));
export type ProjectRuntimeTaskId = typeof ProjectRuntimeTaskId.Type;

export const ProjectRuntimeHandoffId = ProjectRuntimeId.pipe(
  Schema.brand("ProjectRuntimeHandoffId"),
);
export type ProjectRuntimeHandoffId = typeof ProjectRuntimeHandoffId.Type;

export const ProjectRuntimeSourceRole = Schema.Literals([
  "authority",
  "implementation",
  "knowledge",
  "reference",
]);
export type ProjectRuntimeSourceRole = typeof ProjectRuntimeSourceRole.Type;

export const ProjectRuntimeTaskStatus = Schema.Literals([
  "planned",
  "ready",
  "active",
  "blocked",
  "review",
  "done",
  "cancelled",
]);
export type ProjectRuntimeTaskStatus = typeof ProjectRuntimeTaskStatus.Type;

export const ProjectRuntimeSourceHealth = Schema.Literals([
  "available",
  "missing",
  "unreadable",
  "unsupported",
]);
export type ProjectRuntimeSourceHealth = typeof ProjectRuntimeSourceHealth.Type;

const ProjectRuntimeVersion = Schema.Literal(PROJECT_RUNTIME_VERSION);

const InstructionsText = Schema.String.check(
  Schema.isMaxLength(PROJECT_RUNTIME_BOUNDS.instructionsMaxLength),
);

const SourceTitle = TrimmedNonEmptyString.check(
  Schema.isMaxLength(PROJECT_RUNTIME_BOUNDS.sourceTitleMaxLength),
);
const SourcePath = TrimmedNonEmptyString.check(
  Schema.isMaxLength(PROJECT_RUNTIME_BOUNDS.sourcePathMaxLength),
);
const SourceDescription = TrimmedNonEmptyString.check(
  Schema.isMaxLength(PROJECT_RUNTIME_BOUNDS.sourceDescriptionMaxLength),
);

const TaskTitle = TrimmedNonEmptyString.check(
  Schema.isMaxLength(PROJECT_RUNTIME_BOUNDS.taskTitleMaxLength),
);
const TaskText = TrimmedString.check(Schema.isMaxLength(PROJECT_RUNTIME_BOUNDS.taskTextMaxLength));
const TaskNextAction = TrimmedNonEmptyString.check(
  Schema.isMaxLength(PROJECT_RUNTIME_BOUNDS.taskNextActionMaxLength),
);
const TaskBranch = TrimmedNonEmptyString.check(
  Schema.isMaxLength(PROJECT_RUNTIME_BOUNDS.taskBranchMaxLength),
);
const TaskWorktreePath = TrimmedNonEmptyString.check(
  Schema.isMaxLength(PROJECT_RUNTIME_BOUNDS.taskWorktreePathMaxLength),
);
const TaskBaseSha = TrimmedNonEmptyString.check(
  Schema.isMaxLength(PROJECT_RUNTIME_BOUNDS.taskBaseShaMaxLength),
);

const HandoffCheckpoint = TrimmedNonEmptyString.check(
  Schema.isMaxLength(PROJECT_RUNTIME_BOUNDS.handoffCheckpointMaxLength),
);
const HandoffSummary = TrimmedNonEmptyString.check(
  Schema.isMaxLength(PROJECT_RUNTIME_BOUNDS.handoffSummaryMaxLength),
);
const HandoffText = TrimmedNonEmptyString.check(
  Schema.isMaxLength(PROJECT_RUNTIME_BOUNDS.handoffTextMaxLength),
);
const HandoffEvidence = TrimmedNonEmptyString.check(
  Schema.isMaxLength(PROJECT_RUNTIME_BOUNDS.handoffEvidenceMaxLength),
);
const HandoffModel = TrimmedNonEmptyString.check(
  Schema.isMaxLength(PROJECT_RUNTIME_BOUNDS.modelMaxLength),
);

const ListLimit = PositiveInt.check(
  Schema.isLessThanOrEqualTo(PROJECT_RUNTIME_BOUNDS.listMaxLimit),
);
const SearchLimit = PositiveInt.check(
  Schema.isLessThanOrEqualTo(PROJECT_RUNTIME_BOUNDS.searchMaxLimit),
);
const ReadLineCount = PositiveInt.check(
  Schema.isLessThanOrEqualTo(PROJECT_RUNTIME_BOUNDS.readMaxLines),
);

export const ProjectRuntimeInstructions = Schema.Struct({
  projectId: ProjectId,
  instructions: InstructionsText,
  revision: PositiveInt,
  updatedAt: IsoDateTime,
  updatedBy: ProjectRuntimeActor,
});
export type ProjectRuntimeInstructions = typeof ProjectRuntimeInstructions.Type;

export const ProjectRuntimeInstructionsSaveInput = Schema.Struct({
  instructions: InstructionsText,
  expectedRevision: Schema.optionalKey(NonNegativeInt),
});
export type ProjectRuntimeInstructionsSaveInput = typeof ProjectRuntimeInstructionsSaveInput.Type;

export const ProjectRuntimeSource = Schema.Struct({
  sourceId: ProjectRuntimeSourceId,
  projectId: ProjectId,
  title: SourceTitle,
  role: ProjectRuntimeSourceRole,
  authorityRank: Schema.optionalKey(NonNegativeInt),
  relativePath: SourcePath,
  description: Schema.optionalKey(SourceDescription),
  enabled: Schema.Boolean,
  revision: PositiveInt,
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
  createdBy: ProjectRuntimeActor,
  updatedBy: ProjectRuntimeActor,
});
export type ProjectRuntimeSource = typeof ProjectRuntimeSource.Type;

export const ProjectRuntimeSourceDescriptor = Schema.Struct({
  sourceId: ProjectRuntimeSourceId,
  title: SourceTitle,
  role: ProjectRuntimeSourceRole,
  authorityRank: Schema.optionalKey(NonNegativeInt),
  relativePath: SourcePath,
  description: Schema.optionalKey(SourceDescription),
  enabled: Schema.Boolean,
});
export type ProjectRuntimeSourceDescriptor = typeof ProjectRuntimeSourceDescriptor.Type;

export const ProjectRuntimeSourceListEntry = Schema.Struct({
  source: ProjectRuntimeSource,
  health: ProjectRuntimeSourceHealth,
});
export type ProjectRuntimeSourceListEntry = typeof ProjectRuntimeSourceListEntry.Type;

export const ProjectRuntimeSourceListInput = Schema.Struct({
  cursor: Schema.optionalKey(NonNegativeInt),
  limit: Schema.optionalKey(ListLimit),
});
export type ProjectRuntimeSourceListInput = typeof ProjectRuntimeSourceListInput.Type;

export const ProjectRuntimeSourceListResult = Schema.Struct({
  sources: Schema.Array(ProjectRuntimeSourceListEntry).check(
    Schema.isMaxLength(PROJECT_RUNTIME_BOUNDS.listMaxLimit),
  ),
  nextCursor: Schema.NullOr(NonNegativeInt),
});
export type ProjectRuntimeSourceListResult = typeof ProjectRuntimeSourceListResult.Type;

export const ProjectRuntimeSourceSearchInput = Schema.Struct({
  // Whitespace is significant in content queries, so the query is not trimmed.
  query: Schema.String.check(
    Schema.isNonEmpty(),
    Schema.isMaxLength(PROJECT_RUNTIME_BOUNDS.searchQueryMaxLength),
  ),
  limit: Schema.optionalKey(SearchLimit),
  caseSensitive: Schema.optionalKey(Schema.Boolean),
  wholeWord: Schema.optionalKey(Schema.Boolean),
  useRegex: Schema.optionalKey(Schema.Boolean),
});
export type ProjectRuntimeSourceSearchInput = typeof ProjectRuntimeSourceSearchInput.Type;

export const ProjectRuntimeSourceMatch = Schema.Struct({
  sourceId: ProjectRuntimeSourceId,
  path: SourcePath,
  lineNumber: PositiveInt,
  lineContent: Schema.String.check(Schema.isMaxLength(PROJECT_RUNTIME_BOUNDS.searchLineMaxLength)),
  matchRanges: Schema.Array(ProjectContentMatchRange),
});
export type ProjectRuntimeSourceMatch = typeof ProjectRuntimeSourceMatch.Type;

export const ProjectRuntimeSourceSearchResult = Schema.Struct({
  matches: Schema.Array(ProjectRuntimeSourceMatch).check(
    Schema.isMaxLength(PROJECT_RUNTIME_BOUNDS.searchMaxLimit),
  ),
  truncated: Schema.Boolean,
});
export type ProjectRuntimeSourceSearchResult = typeof ProjectRuntimeSourceSearchResult.Type;

export const ProjectRuntimeSourceReadInput = Schema.Struct({
  sourceId: ProjectRuntimeSourceId,
  fromLine: Schema.optionalKey(PositiveInt),
  lineCount: Schema.optionalKey(ReadLineCount),
});
export type ProjectRuntimeSourceReadInput = typeof ProjectRuntimeSourceReadInput.Type;

export const ProjectRuntimeSourceReadResult = Schema.Struct({
  source: ProjectRuntimeSource,
  health: ProjectRuntimeSourceHealth,
  fromLine: PositiveInt,
  toLine: NonNegativeInt,
  contents: Schema.String.check(Schema.isMaxLength(PROJECT_RUNTIME_BOUNDS.readMaxBytes)),
  byteLength: NonNegativeInt,
  truncated: Schema.Boolean,
});
export type ProjectRuntimeSourceReadResult = typeof ProjectRuntimeSourceReadResult.Type;

export const ProjectRuntimeSourceCreateInput = Schema.Struct({
  title: SourceTitle,
  role: ProjectRuntimeSourceRole,
  authorityRank: Schema.optionalKey(NonNegativeInt),
  relativePath: SourcePath,
  description: Schema.optionalKey(SourceDescription),
  enabled: Schema.optionalKey(Schema.Boolean),
});
export type ProjectRuntimeSourceCreateInput = typeof ProjectRuntimeSourceCreateInput.Type;

export const ProjectRuntimeSourceUpdateInput = Schema.Struct({
  sourceId: ProjectRuntimeSourceId,
  expectedRevision: Schema.optionalKey(PositiveInt),
  title: Schema.optionalKey(SourceTitle),
  role: Schema.optionalKey(ProjectRuntimeSourceRole),
  // Null clears the rank or description; an omitted key leaves it unchanged.
  authorityRank: Schema.optionalKey(Schema.NullOr(NonNegativeInt)),
  relativePath: Schema.optionalKey(SourcePath),
  description: Schema.optionalKey(Schema.NullOr(SourceDescription)),
  enabled: Schema.optionalKey(Schema.Boolean),
});
export type ProjectRuntimeSourceUpdateInput = typeof ProjectRuntimeSourceUpdateInput.Type;

export const ProjectRuntimeSourceRemoveInput = Schema.Struct({
  sourceId: ProjectRuntimeSourceId,
  expectedRevision: Schema.optionalKey(PositiveInt),
});
export type ProjectRuntimeSourceRemoveInput = typeof ProjectRuntimeSourceRemoveInput.Type;

export const ProjectRuntimeTask = Schema.Struct({
  taskId: ProjectRuntimeTaskId,
  projectId: ProjectId,
  title: TaskTitle,
  status: ProjectRuntimeTaskStatus,
  scope: TaskText,
  acceptanceCriteria: TaskText,
  nextAction: Schema.optionalKey(TaskNextAction),
  // Descriptive checkpoint metadata only; they never create, move, or bind a worktree.
  branch: Schema.optionalKey(TaskBranch),
  worktreePath: Schema.optionalKey(TaskWorktreePath),
  baseSha: Schema.optionalKey(TaskBaseSha),
  revision: PositiveInt,
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
  createdBy: ProjectRuntimeActor,
  updatedBy: ProjectRuntimeActor,
});
export type ProjectRuntimeTask = typeof ProjectRuntimeTask.Type;

export const ProjectRuntimeTaskListInput = Schema.Struct({
  status: Schema.optionalKey(ProjectRuntimeTaskStatus),
  cursor: Schema.optionalKey(NonNegativeInt),
  limit: Schema.optionalKey(ListLimit),
});
export type ProjectRuntimeTaskListInput = typeof ProjectRuntimeTaskListInput.Type;

export const ProjectRuntimeTaskListResult = Schema.Struct({
  tasks: Schema.Array(ProjectRuntimeTask).check(
    Schema.isMaxLength(PROJECT_RUNTIME_BOUNDS.listMaxLimit),
  ),
  nextCursor: Schema.NullOr(NonNegativeInt),
});
export type ProjectRuntimeTaskListResult = typeof ProjectRuntimeTaskListResult.Type;

export const ProjectRuntimeTaskReadInput = Schema.Struct({
  taskId: ProjectRuntimeTaskId,
});
export type ProjectRuntimeTaskReadInput = typeof ProjectRuntimeTaskReadInput.Type;

export const ProjectRuntimeTaskCreateInput = Schema.Struct({
  title: TaskTitle,
  status: Schema.optionalKey(ProjectRuntimeTaskStatus),
  scope: TaskText,
  acceptanceCriteria: TaskText,
  nextAction: Schema.optionalKey(TaskNextAction),
  branch: Schema.optionalKey(TaskBranch),
  worktreePath: Schema.optionalKey(TaskWorktreePath),
  baseSha: Schema.optionalKey(TaskBaseSha),
});
export type ProjectRuntimeTaskCreateInput = typeof ProjectRuntimeTaskCreateInput.Type;

/** `expectedRevision` makes task writes compare-and-set; a stale value is a conflict. */
export const ProjectRuntimeTaskUpdateInput = Schema.Struct({
  taskId: ProjectRuntimeTaskId,
  expectedRevision: PositiveInt,
  title: Schema.optionalKey(TaskTitle),
  status: Schema.optionalKey(ProjectRuntimeTaskStatus),
  scope: Schema.optionalKey(TaskText),
  acceptanceCriteria: Schema.optionalKey(TaskText),
  // Null clears the optional metadata; an omitted key leaves it unchanged.
  nextAction: Schema.optionalKey(Schema.NullOr(TaskNextAction)),
  branch: Schema.optionalKey(Schema.NullOr(TaskBranch)),
  worktreePath: Schema.optionalKey(Schema.NullOr(TaskWorktreePath)),
  baseSha: Schema.optionalKey(Schema.NullOr(TaskBaseSha)),
});
export type ProjectRuntimeTaskUpdateInput = typeof ProjectRuntimeTaskUpdateInput.Type;

export const ProjectRuntimeHandoff = Schema.Struct({
  handoffId: ProjectRuntimeHandoffId,
  projectId: ProjectId,
  taskId: ProjectRuntimeTaskId,
  checkpoint: HandoffCheckpoint,
  summary: HandoffSummary,
  changes: Schema.optionalKey(HandoffText),
  verification: Schema.optionalKey(HandoffText),
  failuresOrBlockers: Schema.optionalKey(HandoffText),
  nextAction: Schema.optionalKey(HandoffText),
  evidenceRefs: Schema.optionalKey(
    Schema.Array(HandoffEvidence).check(
      Schema.isMaxLength(PROJECT_RUNTIME_BOUNDS.handoffEvidenceMaxCount),
    ),
  ),
  threadId: Schema.optionalKey(ThreadId),
  providerInstanceId: Schema.optionalKey(ProviderInstanceId),
  model: Schema.optionalKey(HandoffModel),
  runtimeRevision: NonNegativeInt,
  taskRevision: PositiveInt,
  createdAt: IsoDateTime,
  createdBy: ProjectRuntimeActor,
});
export type ProjectRuntimeHandoff = typeof ProjectRuntimeHandoff.Type;

export const ProjectRuntimeHandoffAppendInput = Schema.Struct({
  taskId: ProjectRuntimeTaskId,
  checkpoint: HandoffCheckpoint,
  summary: HandoffSummary,
  changes: Schema.optionalKey(HandoffText),
  verification: Schema.optionalKey(HandoffText),
  failuresOrBlockers: Schema.optionalKey(HandoffText),
  nextAction: Schema.optionalKey(HandoffText),
  evidenceRefs: Schema.optionalKey(
    Schema.Array(HandoffEvidence).check(
      Schema.isMaxLength(PROJECT_RUNTIME_BOUNDS.handoffEvidenceMaxCount),
    ),
  ),
});
export type ProjectRuntimeHandoffAppendInput = typeof ProjectRuntimeHandoffAppendInput.Type;

export const ProjectRuntimeHandoffListInput = Schema.Struct({
  taskId: Schema.optionalKey(ProjectRuntimeTaskId),
  cursor: Schema.optionalKey(NonNegativeInt),
  limit: Schema.optionalKey(ListLimit),
});
export type ProjectRuntimeHandoffListInput = typeof ProjectRuntimeHandoffListInput.Type;

export const ProjectRuntimeHandoffListResult = Schema.Struct({
  handoffs: Schema.Array(ProjectRuntimeHandoff).check(
    Schema.isMaxLength(PROJECT_RUNTIME_BOUNDS.listMaxLimit),
  ),
  nextCursor: Schema.NullOr(NonNegativeInt),
});
export type ProjectRuntimeHandoffListResult = typeof ProjectRuntimeHandoffListResult.Type;

export const ProjectRuntimeHandoffReadInput = Schema.Struct({
  handoffId: ProjectRuntimeHandoffId,
});
export type ProjectRuntimeHandoffReadInput = typeof ProjectRuntimeHandoffReadInput.Type;

export const ProjectRuntimeStatus = Schema.Struct({
  enabled: Schema.Boolean,
  version: ProjectRuntimeVersion,
  revision: NonNegativeInt,
});
export type ProjectRuntimeStatus = typeof ProjectRuntimeStatus.Type;

export const ProjectRuntimeSetEnabledInput = Schema.Struct({
  enabled: Schema.Boolean,
});
export type ProjectRuntimeSetEnabledInput = typeof ProjectRuntimeSetEnabledInput.Type;

export const ProjectRuntimeHandoffReference = Schema.Struct({
  handoffId: ProjectRuntimeHandoffId,
  taskId: ProjectRuntimeTaskId,
  checkpoint: HandoffCheckpoint,
  summary: HandoffSummary,
  taskRevision: PositiveInt,
  createdAt: IsoDateTime,
});
export type ProjectRuntimeHandoffReference = typeof ProjectRuntimeHandoffReference.Type;

export const ProjectRuntimeTaskSummary = Schema.Struct({
  taskId: ProjectRuntimeTaskId,
  title: TaskTitle,
  status: ProjectRuntimeTaskStatus,
  nextAction: Schema.optionalKey(TaskNextAction),
  updatedAt: IsoDateTime,
  latestHandoff: Schema.NullOr(ProjectRuntimeHandoffReference),
});
export type ProjectRuntimeTaskSummary = typeof ProjectRuntimeTaskSummary.Type;

export const ProjectRuntimeContextTruncation = Schema.Struct({
  sources: Schema.Boolean,
  tasks: Schema.Boolean,
  handoffs: Schema.Boolean,
});
export type ProjectRuntimeContextTruncation = typeof ProjectRuntimeContextTruncation.Type;

/**
 * Bootstrap payload derived only from persisted Runtime/project state: source
 * descriptors only, never source bodies or conversation history.
 */
export const ProjectRuntimeContext = Schema.Struct({
  developmentProfile: Schema.optionalKey(
    Schema.Struct({
      profileId: TrimmedNonEmptyString,
      name: TrimmedNonEmptyString,
      revision: PositiveInt,
    }),
  ),
  effectiveInstructions: Schema.optionalKey(
    Schema.String.check(
      Schema.isMaxLength(DEVELOPMENT_PROFILE_BOUNDS.effectiveInstructionsMaxLength),
    ),
  ),
  projectId: ProjectId,
  status: ProjectRuntimeStatus,
  instructions: Schema.NullOr(ProjectRuntimeInstructions),
  sources: Schema.Array(ProjectRuntimeSourceDescriptor).check(
    Schema.isMaxLength(PROJECT_RUNTIME_BOUNDS.contextMaxSources),
  ),
  tasks: Schema.Array(ProjectRuntimeTaskSummary).check(
    Schema.isMaxLength(PROJECT_RUNTIME_BOUNDS.contextMaxTasks),
  ),
  truncated: ProjectRuntimeContextTruncation,
});
export type ProjectRuntimeContext = typeof ProjectRuntimeContext.Type;

export const ProjectRuntimeEntity = Schema.Literals(["instructions", "source", "task", "handoff"]);
export type ProjectRuntimeEntity = typeof ProjectRuntimeEntity.Type;

export class ProjectRuntimeDisabledError extends Schema.TaggedError<ProjectRuntimeDisabledError>()(
  "ProjectRuntimeDisabledError",
  {
    projectId: ProjectId,
  },
) {
  override get message(): string {
    return `Project Runtime is not enabled for project ${this.projectId}.`;
  }
}

export class ProjectRuntimeNotFoundError extends Schema.TaggedError<ProjectRuntimeNotFoundError>()(
  "ProjectRuntimeNotFoundError",
  {
    projectId: ProjectId,
    entity: ProjectRuntimeEntity,
    entityId: Schema.optionalKey(ProjectRuntimeId),
  },
) {
  override get message(): string {
    const subject = this.entityId === undefined ? this.entity : `${this.entity} ${this.entityId}`;
    return `Project Runtime record '${subject}' was not found for project ${this.projectId}.`;
  }
}

export class ProjectRuntimeProjectMismatchError extends Schema.TaggedError<ProjectRuntimeProjectMismatchError>()(
  "ProjectRuntimeProjectMismatchError",
  {
    projectId: ProjectId,
    entity: ProjectRuntimeEntity,
    entityId: ProjectRuntimeId,
  },
) {
  override get message(): string {
    return `Project Runtime record '${this.entity} ${this.entityId}' does not belong to project ${this.projectId}.`;
  }
}

export class ProjectRuntimeConflictError extends Schema.TaggedError<ProjectRuntimeConflictError>()(
  "ProjectRuntimeConflictError",
  {
    projectId: ProjectId,
    entity: ProjectRuntimeEntity,
    entityId: Schema.optionalKey(ProjectRuntimeId),
    expectedRevision: NonNegativeInt,
    currentRevision: PositiveInt,
  },
) {
  override get message(): string {
    const subject = this.entityId === undefined ? this.entity : `${this.entity} ${this.entityId}`;
    return `Project Runtime record '${subject}' is at revision ${this.currentRevision}, not the expected revision ${this.expectedRevision}.`;
  }
}

export class ProjectRuntimeSourceDisabledError extends Schema.TaggedError<ProjectRuntimeSourceDisabledError>()(
  "ProjectRuntimeSourceDisabledError",
  {
    projectId: ProjectId,
    sourceId: ProjectRuntimeSourceId,
  },
) {
  override get message(): string {
    return `Project Runtime source ${this.sourceId} is disabled for project ${this.projectId}.`;
  }
}

export class ProjectRuntimeSourceMissingError extends Schema.TaggedError<ProjectRuntimeSourceMissingError>()(
  "ProjectRuntimeSourceMissingError",
  {
    projectId: ProjectId,
    sourceId: ProjectRuntimeSourceId,
    relativePath: SourcePath,
  },
) {
  override get message(): string {
    return `Project Runtime source ${this.sourceId} is missing from the project workspace at ${this.relativePath}.`;
  }
}

export class ProjectRuntimeSourceUnsupportedError extends Schema.TaggedError<ProjectRuntimeSourceUnsupportedError>()(
  "ProjectRuntimeSourceUnsupportedError",
  {
    projectId: ProjectId,
    sourceId: ProjectRuntimeSourceId,
    relativePath: SourcePath,
    reason: Schema.Literals(["binary", "outside_workspace", "not_a_file", "unreadable"]),
  },
) {
  override get message(): string {
    return `Project Runtime source ${this.sourceId} at ${this.relativePath} cannot be read: ${this.reason}.`;
  }
}

export class ProjectRuntimeSourcePathError extends Schema.TaggedError<ProjectRuntimeSourcePathError>()(
  "ProjectRuntimeSourcePathError",
  {
    projectId: ProjectId,
    relativePath: Schema.String.check(
      Schema.isMaxLength(PROJECT_RUNTIME_BOUNDS.sourcePathMaxLength),
    ),
    reason: Schema.Literals(["absolute", "outside_workspace"]),
  },
) {
  override get message(): string {
    return `Project Runtime source path '${this.relativePath}' is not a valid workspace-relative path: ${this.reason}.`;
  }
}

export class ProjectRuntimeInvalidRangeError extends Schema.TaggedError<ProjectRuntimeInvalidRangeError>()(
  "ProjectRuntimeInvalidRangeError",
  {
    projectId: ProjectId,
    sourceId: ProjectRuntimeSourceId,
    fromLine: PositiveInt,
    lineCount: PositiveInt,
    maxLines: PositiveInt,
  },
) {
  override get message(): string {
    return `Project Runtime source ${this.sourceId} cannot return ${this.lineCount} lines from line ${this.fromLine}; the limit is ${this.maxLines}.`;
  }
}

export const ProjectRuntimeError = Schema.Union([
  ProjectRuntimeDisabledError,
  ProjectRuntimeNotFoundError,
  ProjectRuntimeProjectMismatchError,
  ProjectRuntimeConflictError,
  ProjectRuntimeSourceDisabledError,
  ProjectRuntimeSourceMissingError,
  ProjectRuntimeSourceUnsupportedError,
  ProjectRuntimeSourcePathError,
  ProjectRuntimeInvalidRangeError,
]);
export type ProjectRuntimeError = typeof ProjectRuntimeError.Type;
