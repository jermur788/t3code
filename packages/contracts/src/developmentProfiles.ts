import * as Schema from "effect/Schema";

import {
  IsoDateTime,
  NonNegativeInt,
  PositiveInt,
  ProjectId,
  TrimmedNonEmptyString,
} from "./baseSchemas.ts";
import { ProjectRuntimeInstructions } from "./projectRuntime.ts";
import { RuntimeProfileRoutingPolicy } from "./runtimeRouting.ts";

import { DEVELOPMENT_PROFILE_BOUNDS } from "./developmentProfileBounds.ts";
export { DEVELOPMENT_PROFILE_BOUNDS } from "./developmentProfileBounds.ts";

const DevelopmentProfileName = TrimmedNonEmptyString.check(
  Schema.isMaxLength(DEVELOPMENT_PROFILE_BOUNDS.nameMaxLength),
);
const DevelopmentProfileInstructions = Schema.String.check(
  Schema.isMaxLength(DEVELOPMENT_PROFILE_BOUNDS.instructionsMaxLength),
);
const DevelopmentProfileActor = TrimmedNonEmptyString.check(
  Schema.isMaxLength(DEVELOPMENT_PROFILE_BOUNDS.actorMaxLength),
);
const DevelopmentProfileEntityId = TrimmedNonEmptyString.check(
  Schema.isMaxLength(DEVELOPMENT_PROFILE_BOUNDS.idMaxLength),
);

export const DevelopmentProfileId = DevelopmentProfileEntityId.pipe(
  Schema.brand("DevelopmentProfileId"),
);
export type DevelopmentProfileId = typeof DevelopmentProfileId.Type;

export const DevelopmentProfile = Schema.Struct({
  profileId: DevelopmentProfileId,
  name: DevelopmentProfileName,
  instructions: DevelopmentProfileInstructions,
  /** Structured role routing defaults; instructions never encode routing. */
  routing: RuntimeProfileRoutingPolicy,
  revision: PositiveInt,
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
  createdBy: DevelopmentProfileActor,
  updatedBy: DevelopmentProfileActor,
});
export type DevelopmentProfile = typeof DevelopmentProfile.Type;

export const DevelopmentProfileCreateInput = Schema.Struct({
  name: DevelopmentProfileName,
  instructions: DevelopmentProfileInstructions,
  routing: Schema.optionalKey(RuntimeProfileRoutingPolicy),
});
export type DevelopmentProfileCreateInput = typeof DevelopmentProfileCreateInput.Type;

export const DevelopmentProfileUpdateInput = Schema.Struct({
  profileId: DevelopmentProfileId,
  name: DevelopmentProfileName,
  instructions: DevelopmentProfileInstructions,
  /** Omitted preserves the stored routing; the same revision guards both fields. */
  routing: Schema.optionalKey(RuntimeProfileRoutingPolicy),
  expectedRevision: PositiveInt,
});
export type DevelopmentProfileUpdateInput = typeof DevelopmentProfileUpdateInput.Type;

export const DevelopmentProfileDeleteInput = Schema.Struct({
  profileId: DevelopmentProfileId,
  expectedRevision: PositiveInt,
});
export type DevelopmentProfileDeleteInput = typeof DevelopmentProfileDeleteInput.Type;

/**
 * One row per project. `profileId` is null after an unassignment, but the row
 * and its revision stay so a stale writer cannot assign from an old revision.
 */
export const ProjectDevelopmentProfile = Schema.Struct({
  projectId: ProjectId,
  profileId: Schema.NullOr(DevelopmentProfileId),
  revision: PositiveInt,
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});
export type ProjectDevelopmentProfile = typeof ProjectDevelopmentProfile.Type;

export const ProjectDevelopmentProfileSetInput = Schema.Struct({
  projectId: ProjectId,
  profileId: Schema.NullOr(DevelopmentProfileId),
  /** Zero means the project has no assignment row yet. */
  expectedRevision: NonNegativeInt,
});
export type ProjectDevelopmentProfileSetInput = typeof ProjectDevelopmentProfileSetInput.Type;

export const DevelopmentProfileProject = Schema.Struct({
  projectId: ProjectId,
  name: TrimmedNonEmptyString,
});
export type DevelopmentProfileProject = typeof DevelopmentProfileProject.Type;

/** `host rules/user > project > profile > source data`; labels appear in that order. */
export const DEVELOPMENT_PROFILE_PRECEDENCE =
  "host rules/user > project > profile > source data" as const;

/**
 * The canonical instruction view for a project. Profiles still resolve when
 * Project Runtime is disabled, and formatted instructions are never truncated.
 */
export const EffectiveProjectInstructions = Schema.Struct({
  projectId: ProjectId,
  assignment: Schema.NullOr(ProjectDevelopmentProfile),
  developmentProfile: Schema.NullOr(DevelopmentProfile),
  projectInstructions: Schema.NullOr(ProjectRuntimeInstructions),
  precedence: Schema.String,
  formattedInstructions: Schema.String.check(
    Schema.isMaxLength(DEVELOPMENT_PROFILE_BOUNDS.effectiveInstructionsMaxLength),
  ),
});
export type EffectiveProjectInstructions = typeof EffectiveProjectInstructions.Type;

export class DevelopmentProfileNotFoundError extends Schema.TaggedError<DevelopmentProfileNotFoundError>()(
  "DevelopmentProfileNotFoundError",
  {
    profileId: DevelopmentProfileId,
  },
) {
  override get message(): string {
    return `Development profile ${this.profileId} was not found.`;
  }
}

export class DevelopmentProfileProjectNotFoundError extends Schema.TaggedError<DevelopmentProfileProjectNotFoundError>()(
  "DevelopmentProfileProjectNotFoundError",
  {
    projectId: ProjectId,
  },
) {
  override get message(): string {
    return `Project ${this.projectId} was not found.`;
  }
}

export class DevelopmentProfileConflictError extends Schema.TaggedError<DevelopmentProfileConflictError>()(
  "DevelopmentProfileConflictError",
  {
    entityId: DevelopmentProfileEntityId,
    expectedRevision: NonNegativeInt,
    // Zero when a project assignment row does not exist yet.
    currentRevision: NonNegativeInt,
  },
) {
  override get message(): string {
    return `Development profile state for ${this.entityId} is at revision ${this.currentRevision}, not the expected revision ${this.expectedRevision}.`;
  }
}

export class DevelopmentProfileInUseError extends Schema.TaggedError<DevelopmentProfileInUseError>()(
  "DevelopmentProfileInUseError",
  {
    profileId: DevelopmentProfileId,
    projects: Schema.Array(DevelopmentProfileProject),
  },
) {
  override get message(): string {
    return `Development profile ${this.profileId} is assigned to ${this.projects.length} project${this.projects.length === 1 ? "" : "s"}.`;
  }
}

export const DevelopmentProfileError = Schema.Union([
  DevelopmentProfileNotFoundError,
  DevelopmentProfileProjectNotFoundError,
  DevelopmentProfileConflictError,
  DevelopmentProfileInUseError,
]);
export type DevelopmentProfileError = typeof DevelopmentProfileError.Type;
