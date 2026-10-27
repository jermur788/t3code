import * as Schema from "effect/Schema";

import { NonNegativeInt, PositiveInt, ProjectId } from "./baseSchemas.ts";
import { DevelopmentProfileId } from "./developmentProfiles.ts";
import { ProviderOptionSelections } from "./model.ts";
import { ProviderDriverKind, ProviderInstanceId } from "./providerInstance.ts";
import { ProviderInteractionMode, RuntimeMode } from "./providerPolicy.ts";
import { ProjectRuntimeTaskId } from "./projectRuntime.ts";
import {
  RuntimeRouteCandidate,
  RuntimeRouteIsolation,
  RuntimeWorkerRole,
  RUNTIME_ROUTING_BOUNDS,
} from "./runtimeRouting.ts";

/** One-run routing intent. It is never persisted by this gate. */
export const RuntimeRouteOverride = Schema.Struct({
  role: Schema.optionalKey(RuntimeWorkerRole),
  candidate: RuntimeRouteCandidate,
});
export type RuntimeRouteOverride = typeof RuntimeRouteOverride.Type;

export const RuntimeRouteResolutionInput = Schema.Struct({
  projectId: ProjectId,
  taskId: Schema.optionalKey(ProjectRuntimeTaskId),
  /** A one-run role override used to look up project and profile routing. */
  role: Schema.optionalKey(RuntimeWorkerRole),
  override: Schema.optionalKey(RuntimeRouteOverride),
});
export type RuntimeRouteResolutionInput = typeof RuntimeRouteResolutionInput.Type;

export const RuntimeRouteSource = Schema.Literals([
  "explicit",
  "task",
  "project",
  "profile",
  "inherit",
]);
export type RuntimeRouteSource = typeof RuntimeRouteSource.Type;

export const RuntimeRouteResolutionStatus = Schema.Literals(["resolved", "inherited", "failed"]);
export type RuntimeRouteResolutionStatus = typeof RuntimeRouteResolutionStatus.Type;

export const RuntimeRouteRejectionReason = Schema.Literals([
  "provider_instance_missing",
  "provider_driver_mismatch",
  "provider_instance_disabled_for_project",
  "provider_orchestration_unsupported",
  "provider_unavailable",
  "provider_disabled",
  "provider_not_installed",
  "provider_not_ready",
  "provider_auth_required",
  "no_eligible_provider_instance",
  "model_unavailable",
  "model_options_invalid",
  "runtime_mode_unsupported",
  "interaction_mode_unsupported",
]);
export type RuntimeRouteRejectionReason = typeof RuntimeRouteRejectionReason.Type;

export const RuntimeRouteRejection = Schema.Struct({
  source: RuntimeRouteSource,
  candidateIndex: NonNegativeInt,
  candidate: RuntimeRouteCandidate,
  reason: RuntimeRouteRejectionReason,
  detail: Schema.optionalKey(
    Schema.String.check(Schema.isMaxLength(RUNTIME_ROUTING_BOUNDS.rejectionDetailMaxLength)),
  ),
});
export type RuntimeRouteRejection = typeof RuntimeRouteRejection.Type;

export const RuntimeRouteFailureReason = Schema.Literals([
  "candidates_exhausted",
  "explicit_override_unavailable",
]);
export type RuntimeRouteFailureReason = typeof RuntimeRouteFailureReason.Type;

export const RuntimeRouteFailure = Schema.Struct({
  source: RuntimeRouteSource,
  reason: RuntimeRouteFailureReason,
});
export type RuntimeRouteFailure = typeof RuntimeRouteFailure.Type;

/**
 * `eligibility` is a resolution-time observation. It is deliberately not an
 * authorization for a future launch; the Orchestrator rechecks settings and
 * provider state when work actually starts.
 */
export const RuntimeResolvedRoute = Schema.Struct({
  source: RuntimeRouteSource,
  candidateIndex: NonNegativeInt,
  candidate: RuntimeRouteCandidate,
  providerInstanceId: ProviderInstanceId,
  driverKind: ProviderDriverKind,
  model: Schema.String,
  options: Schema.optionalKey(ProviderOptionSelections),
  isolation: RuntimeRouteIsolation,
  runtimeMode: Schema.optionalKey(RuntimeMode),
  interactionMode: Schema.optionalKey(ProviderInteractionMode),
  eligibility: Schema.Literal("eligible-at-resolution"),
});
export type RuntimeResolvedRoute = typeof RuntimeResolvedRoute.Type;

export const RuntimeRouteRevisions = Schema.Struct({
  task: Schema.NullOr(PositiveInt),
  projectRouting: NonNegativeInt,
  profile: Schema.NullOr(
    Schema.Struct({
      profileId: DevelopmentProfileId,
      revision: PositiveInt,
    }),
  ),
  assignment: Schema.NullOr(
    Schema.Struct({
      projectId: ProjectId,
      profileId: Schema.NullOr(DevelopmentProfileId),
      revision: PositiveInt,
    }),
  ),
});
export type RuntimeRouteRevisions = typeof RuntimeRouteRevisions.Type;

export const RuntimeRouteResolution = Schema.Struct({
  projectId: ProjectId,
  taskId: Schema.NullOr(ProjectRuntimeTaskId),
  role: RuntimeWorkerRole,
  status: RuntimeRouteResolutionStatus,
  source: RuntimeRouteSource,
  selected: Schema.NullOr(RuntimeResolvedRoute),
  inheritedFrom: Schema.NullOr(RuntimeRouteSource),
  rejected: Schema.Array(RuntimeRouteRejection).check(
    Schema.isMaxLength(RUNTIME_ROUTING_BOUNDS.rejectionsMax),
  ),
  failure: Schema.NullOr(RuntimeRouteFailure),
  revisions: RuntimeRouteRevisions,
});
export type RuntimeRouteResolution = typeof RuntimeRouteResolution.Type;
