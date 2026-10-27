import {
  type DevelopmentProfile,
  type ProjectDevelopmentProfile,
  type ProjectId,
  type ProjectRuntimeTask,
  type RuntimeProfileRoleRoute,
  type RuntimeResolvedRoute,
  type RuntimeRoleRoute,
  type RuntimeRouteCandidate,
  type RuntimeRouteFailureReason,
  type RuntimeRouteRejection,
  type RuntimeRouteResolution,
  type RuntimeRouteResolutionInput,
  type RuntimeRouteRevisions,
  type RuntimeRouteSource,
  type RuntimeRoutingFallback,
  type RuntimeRoutingPolicy,
  type RuntimeWorkerRole,
  RUNTIME_ROUTING_BOUNDS,
} from "@t3tools/contracts";

import {
  evaluateRuntimeRouteCandidate,
  type RuntimeRouteEligibilityContext,
} from "./RuntimeRoutingEligibility.ts";

export interface RuntimeRoutingTaskState {
  readonly taskId: ProjectRuntimeTask["taskId"];
  readonly revision: ProjectRuntimeTask["revision"];
  readonly routing?: RuntimeRoleRoute;
}

export interface RuntimeRoutingProfileState {
  readonly profileId: DevelopmentProfile["profileId"];
  readonly revision: DevelopmentProfile["revision"];
  readonly routing: DevelopmentProfile["routing"];
}

export interface RuntimeRoutingLayerState {
  readonly task: RuntimeRoutingTaskState | null;
  readonly projectRouting: {
    readonly routing: RuntimeRoutingPolicy | null;
    readonly revision: number;
  };
  readonly profile: RuntimeRoutingProfileState | null;
  readonly assignment: ProjectDevelopmentProfile | null;
}

export interface ResolveRuntimeRouteInput extends RuntimeRoutingLayerState {
  readonly projectId: ProjectId;
  readonly role?: RuntimeWorkerRole;
  readonly override?: RuntimeRouteResolutionInput["override"];
  readonly eligibility: RuntimeRouteEligibilityContext;
}

type RouteLayer = "explicit" | "task" | "project" | "profile";

const boundedDetail = (detail: string): string =>
  detail.length <= RUNTIME_ROUTING_BOUNDS.rejectionDetailMaxLength
    ? detail
    : detail.slice(0, RUNTIME_ROUTING_BOUNDS.rejectionDetailMaxLength);

const findProjectRoute = (
  policy: RuntimeRoutingPolicy | null,
  role: RuntimeWorkerRole,
): RuntimeRoleRoute | undefined => policy?.roleRoutes.find((route) => route.role === role);

const findProfileRoute = (
  policy: { readonly roleRoutes: ReadonlyArray<RuntimeProfileRoleRoute> } | null,
  role: RuntimeWorkerRole,
): RuntimeProfileRoleRoute | undefined => policy?.roleRoutes.find((route) => route.role === role);

const selectedRoute = (input: {
  readonly source: RouteLayer;
  readonly candidateIndex: number;
  readonly candidate: RuntimeRouteCandidate;
  readonly evaluation: Extract<
    ReturnType<typeof evaluateRuntimeRouteCandidate>,
    { eligible: true }
  >;
}): RuntimeResolvedRoute => ({
  source: input.source,
  candidateIndex: input.candidateIndex,
  candidate: input.candidate,
  providerInstanceId: input.evaluation.providerInstanceId,
  driverKind: input.evaluation.driverKind,
  model: input.candidate.model,
  ...(input.candidate.options === undefined ? {} : { options: input.candidate.options }),
  isolation: input.candidate.isolation ?? "shared",
  ...(input.candidate.runtimeMode === undefined
    ? {}
    : { runtimeMode: input.candidate.runtimeMode }),
  ...(input.candidate.interactionMode === undefined
    ? {}
    : { interactionMode: input.candidate.interactionMode }),
  eligibility: "eligible-at-resolution",
});

type LayerEvaluation =
  | {
      readonly kind: "selected";
      readonly candidateIndex: number;
      readonly candidate: RuntimeRouteCandidate;
      readonly resolved: RuntimeResolvedRoute;
    }
  | { readonly kind: "exhausted" };

export function resolveRuntimeRoute(input: ResolveRuntimeRouteInput): RuntimeRouteResolution {
  const role: RuntimeWorkerRole =
    input.override?.role ?? input.task?.routing?.role ?? input.role ?? "implementation";
  const rejected: Array<RuntimeRouteRejection> = [];
  const revisions: RuntimeRouteRevisions = {
    task: input.task?.revision ?? null,
    projectRouting: input.projectRouting.revision,
    profile:
      input.profile === null
        ? null
        : { profileId: input.profile.profileId, revision: input.profile.revision },
    assignment:
      input.assignment === null
        ? null
        : {
            projectId: input.assignment.projectId,
            profileId: input.assignment.profileId,
            revision: input.assignment.revision,
          },
  };
  const base = {
    projectId: input.projectId,
    taskId: input.task?.taskId ?? null,
    role,
    revisions,
    rejected,
  };

  const evaluateLayer = (
    source: RouteLayer,
    route: Pick<RuntimeRoleRoute, "candidates"> | Pick<RuntimeProfileRoleRoute, "candidates">,
  ): LayerEvaluation => {
    for (const [candidateIndex, candidate] of route.candidates.entries()) {
      const evaluation = evaluateRuntimeRouteCandidate(candidate, input.eligibility);
      if (evaluation.eligible) {
        return {
          kind: "selected",
          candidateIndex,
          candidate,
          resolved: selectedRoute({ source, candidateIndex, candidate, evaluation }),
        };
      }
      rejected.push({
        source,
        candidateIndex,
        candidate,
        reason: evaluation.reason,
        ...(evaluation.detail === undefined ? {} : { detail: boundedDetail(evaluation.detail) }),
      });
    }
    return { kind: "exhausted" };
  };

  const inherited = (inheritedFrom: RuntimeRouteSource | null): RuntimeRouteResolution => ({
    ...base,
    status: "inherited",
    source: "inherit",
    selected: null,
    inheritedFrom,
    failure: null,
  });

  const failed = (
    source: RuntimeRouteSource,
    reason: RuntimeRouteFailureReason,
  ): RuntimeRouteResolution => ({
    ...base,
    status: "failed",
    source,
    selected: null,
    inheritedFrom: null,
    failure: { source, reason },
  });

  const resolved = (evaluation: Extract<LayerEvaluation, { kind: "selected" }>) => ({
    ...base,
    status: "resolved" as const,
    source: evaluation.resolved.source,
    selected: evaluation.resolved,
    inheritedFrom: null,
    failure: null,
  });

  const continuation = (
    evaluation: LayerEvaluation,
    source: RouteLayer,
    fallback: RuntimeRoutingFallback,
  ): RuntimeRouteResolution | null => {
    if (evaluation.kind === "selected") return resolved(evaluation);
    switch (fallback) {
      case "continue":
        return null;
      case "inherit":
        return inherited(source);
      case "fail":
        return failed(source, "candidates_exhausted");
    }
  };

  if (input.override !== undefined) {
    const { candidate } = input.override;
    const evaluation = evaluateRuntimeRouteCandidate(candidate, input.eligibility);
    if (evaluation.eligible) {
      return resolved({
        kind: "selected",
        candidateIndex: 0,
        candidate,
        resolved: selectedRoute({
          source: "explicit",
          candidateIndex: 0,
          candidate,
          evaluation,
        }),
      });
    }
    rejected.push({
      source: "explicit",
      candidateIndex: 0,
      candidate,
      reason: evaluation.reason,
      ...(evaluation.detail === undefined ? {} : { detail: boundedDetail(evaluation.detail) }),
    });
    return failed("explicit", "explicit_override_unavailable");
  }

  let lastMatched: RouteLayer | null = null;

  const taskRouting = input.task?.routing;
  if (taskRouting !== undefined && taskRouting.role === role) {
    lastMatched = "task";
    const outcome = continuation(evaluateLayer("task", taskRouting), "task", taskRouting.fallback);
    if (outcome !== null) return outcome;
  }

  const projectRoute = findProjectRoute(input.projectRouting.routing, role);
  if (projectRoute !== undefined) {
    lastMatched = "project";
    const outcome = continuation(
      evaluateLayer("project", projectRoute),
      "project",
      projectRoute.fallback,
    );
    if (outcome !== null) return outcome;
  }

  const profileRoute = findProfileRoute(input.profile?.routing ?? null, role);
  if (profileRoute !== undefined) {
    lastMatched = "profile";
    const evaluation = evaluateLayer("profile", profileRoute);
    if (evaluation.kind === "selected") return resolved(evaluation);
    return profileRoute.fallback === "fail"
      ? failed("profile", "candidates_exhausted")
      : inherited("profile");
  }

  return inherited(lastMatched);
}
