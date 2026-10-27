import * as Schema from "effect/Schema";

import { IsoDateTime, NonNegativeInt, ProjectId, TrimmedNonEmptyString } from "./baseSchemas.ts";
import { ProviderOptionSelections } from "./model.ts";
import { OrchestratorMcpTaskRole } from "./orchestratorMcp.ts";
import { ProviderDriverKind, ProviderInstanceId } from "./providerInstance.ts";
import { ProviderInteractionMode, RuntimeMode } from "./providerPolicy.ts";

/**
 * Worker roles reuse the Orchestrator vocabulary so a route and a delegated
 * task cannot drift into two competing role names for the same work.
 */
export const RuntimeWorkerRole = OrchestratorMcpTaskRole;
export type RuntimeWorkerRole = typeof RuntimeWorkerRole.Type;

export const RUNTIME_ROUTING_BOUNDS = {
  modelMaxLength: 200,
  candidatesPerRoleMax: 20,
  roleRoutesMax: 6,
  rejectionsMax: 64,
  rejectionDetailMaxLength: 300,
} as const;

const RouteModel = TrimmedNonEmptyString.check(
  Schema.isMaxLength(RUNTIME_ROUTING_BOUNDS.modelMaxLength),
);

export const RuntimeRouteIsolation = Schema.Literals(["shared", "worktree"]);
export type RuntimeRouteIsolation = typeof RuntimeRouteIsolation.Type;

/**
 * A candidate names an instance or a driver. A driver-only candidate resolves
 * to the first eligible instance in provider order, so saved policy does not
 * have to pin an instance id that may be replaced later.
 */
export const RuntimeRouteCandidate = Schema.Struct({
  providerInstanceId: Schema.optionalKey(ProviderInstanceId),
  driverKind: Schema.optionalKey(ProviderDriverKind),
  model: RouteModel,
  options: Schema.optionalKey(ProviderOptionSelections),
  isolation: Schema.optionalKey(RuntimeRouteIsolation),
  runtimeMode: Schema.optionalKey(RuntimeMode),
  interactionMode: Schema.optionalKey(ProviderInteractionMode),
}).check(
  Schema.makeFilter(
    (candidate) => candidate.providerInstanceId !== undefined || candidate.driverKind !== undefined,
    { expected: "a provider instance id or a driver kind" },
  ),
);
export type RuntimeRouteCandidate = typeof RuntimeRouteCandidate.Type;

export const RuntimeRoutingFallback = Schema.Literals(["continue", "inherit", "fail"]);
export type RuntimeRoutingFallback = typeof RuntimeRoutingFallback.Type;

/**
 * The profile is the last routing layer. There is no lower layer for
 * `continue` to reach, so it may only deliberately inherit or refuse.
 */
export const RuntimeProfileRoutingFallback = Schema.Literals(["inherit", "fail"]);
export type RuntimeProfileRoutingFallback = typeof RuntimeProfileRoutingFallback.Type;

const RuntimeRouteCandidates = Schema.Array(RuntimeRouteCandidate).check(
  Schema.isMaxLength(RUNTIME_ROUTING_BOUNDS.candidatesPerRoleMax),
);

const uniqueRoleRoutes = Schema.makeFilter(
  (routes: ReadonlyArray<{ readonly role: RuntimeWorkerRole }>) =>
    new Set(routes.map((route) => route.role)).size === routes.length,
  { expected: "at most one route per worker role" },
);

export const RuntimeRoleRoute = Schema.Struct({
  role: RuntimeWorkerRole,
  candidates: RuntimeRouteCandidates,
  fallback: RuntimeRoutingFallback,
});
export type RuntimeRoleRoute = typeof RuntimeRoleRoute.Type;

export const RuntimeProfileRoleRoute = Schema.Struct({
  role: RuntimeWorkerRole,
  candidates: RuntimeRouteCandidates,
  fallback: RuntimeProfileRoutingFallback,
});
export type RuntimeProfileRoleRoute = typeof RuntimeProfileRoleRoute.Type;

/** Project and task routing may continue to a lower routing layer. */
export const RuntimeRoutingPolicy = Schema.Struct({
  roleRoutes: Schema.Array(RuntimeRoleRoute).check(
    Schema.isMaxLength(RUNTIME_ROUTING_BOUNDS.roleRoutesMax),
    uniqueRoleRoutes,
  ),
});
export type RuntimeRoutingPolicy = typeof RuntimeRoutingPolicy.Type;

/** Development Profile routing is the terminal routing layer. */
export const RuntimeProfileRoutingPolicy = Schema.Struct({
  roleRoutes: Schema.Array(RuntimeProfileRoleRoute).check(
    Schema.isMaxLength(RUNTIME_ROUTING_BOUNDS.roleRoutesMax),
    uniqueRoleRoutes,
  ),
});
export type RuntimeProfileRoutingPolicy = typeof RuntimeProfileRoutingPolicy.Type;

/**
 * One row per project, kept after a reset so a stale writer cannot recreate an
 * override from an old revision. A null routing value means inherit the profile.
 */
export const ProjectRuntimeRouting = Schema.Struct({
  projectId: ProjectId,
  routing: Schema.NullOr(RuntimeRoutingPolicy),
  revision: NonNegativeInt,
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});
export type ProjectRuntimeRouting = typeof ProjectRuntimeRouting.Type;

export const ProjectRuntimeRoutingSaveInput = Schema.Struct({
  routing: Schema.NullOr(RuntimeRoutingPolicy),
  /** Zero means the project has no routing row yet. */
  expectedRevision: NonNegativeInt,
});
export type ProjectRuntimeRoutingSaveInput = typeof ProjectRuntimeRoutingSaveInput.Type;

export class ProjectRuntimeRoutingConflictError extends Schema.TaggedError<ProjectRuntimeRoutingConflictError>()(
  "ProjectRuntimeRoutingConflictError",
  {
    projectId: ProjectId,
    expectedRevision: NonNegativeInt,
    currentRevision: NonNegativeInt,
  },
) {
  override get message(): string {
    return `Project routing for ${this.projectId} is at revision ${this.currentRevision}, not the expected revision ${this.expectedRevision}.`;
  }
}

export const RuntimeRoutingError = Schema.Union([ProjectRuntimeRoutingConflictError]);
export type RuntimeRoutingError = typeof RuntimeRoutingError.Type;
