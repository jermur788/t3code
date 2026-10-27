import {
  type ProjectId,
  type ProviderInstanceId,
  type RuntimeRouteCandidate,
  type RuntimeRouteRejectionReason,
  type ServerProvider,
  type ServerSettings,
  resolveProjectProviderInstanceEnabled,
} from "@t3tools/contracts";

import {
  providerEligibilityIssues,
  providerOptionSelectionProblems,
} from "../provider/providerEligibility.ts";

export interface RuntimeRouteEligibilityContext {
  readonly projectId: ProjectId;
  readonly providers: ReadonlyArray<ServerProvider>;
  readonly orchestrationCapableInstanceIds: ReadonlySet<ProviderInstanceId>;
  readonly settings: Pick<ServerSettings, "providerInstances" | "projectSettingsOverrides">;
}

export type RuntimeRouteCandidateEvaluation =
  | {
      readonly eligible: true;
      readonly providerInstanceId: ProviderInstanceId;
      readonly driverKind: ServerProvider["driver"];
    }
  | {
      readonly eligible: false;
      readonly reason: RuntimeRouteRejectionReason;
      readonly detail?: string;
    };

const ineligible = (
  reason: RuntimeRouteRejectionReason,
  detail?: string,
): RuntimeRouteCandidateEvaluation => ({
  eligible: false,
  reason,
  ...(detail === undefined ? {} : { detail }),
});

const issueReason = (
  code: ReturnType<typeof providerEligibilityIssues>[number]["code"],
): RuntimeRouteRejectionReason => {
  switch (code) {
    case "orchestration_unsupported":
      return "provider_orchestration_unsupported";
    case "provider_unavailable":
      return "provider_unavailable";
    case "provider_disabled":
      return "provider_disabled";
    case "provider_not_installed":
      return "provider_not_installed";
    case "provider_not_ready":
      return "provider_not_ready";
    case "provider_auth_required":
      return "provider_auth_required";
  }
};

function evaluateProvider(
  candidate: RuntimeRouteCandidate,
  provider: ServerProvider,
  context: RuntimeRouteEligibilityContext,
): RuntimeRouteCandidateEvaluation {
  if (candidate.driverKind !== undefined && provider.driver !== candidate.driverKind) {
    return ineligible(
      "provider_driver_mismatch",
      `Provider instance ${provider.instanceId} uses driver ${provider.driver}, not ${candidate.driverKind}.`,
    );
  }
  const issue = providerEligibilityIssues(provider, true)[0];
  if (issue !== undefined) {
    return ineligible(issueReason(issue.code), issue.detail);
  }
  if (!context.orchestrationCapableInstanceIds.has(provider.instanceId)) {
    return ineligible(
      "provider_orchestration_unsupported",
      `No V2 provider adapter is registered for ${provider.instanceId}.`,
    );
  }
  if (
    !resolveProjectProviderInstanceEnabled(context.settings, context.projectId, provider.instanceId)
  ) {
    return ineligible(
      "provider_instance_disabled_for_project",
      `Provider instance ${provider.instanceId} is disabled for this project.`,
    );
  }
  if (
    provider.models.length > 0 &&
    !provider.models.some((model) => model.slug === candidate.model)
  ) {
    return ineligible(
      "model_unavailable",
      `Model ${candidate.model} is not advertised by provider ${provider.instanceId}.`,
    );
  }
  if (candidate.options !== undefined) {
    const descriptors = provider.models.find((model) => model.slug === candidate.model)
      ?.capabilities?.optionDescriptors;
    const problems = providerOptionSelectionProblems(candidate.options, descriptors);
    if (problems.length > 0) {
      return ineligible("model_options_invalid", problems.join(" "));
    }
  }
  if (
    candidate.runtimeMode !== undefined &&
    provider.supportedRuntimeModes !== undefined &&
    provider.supportedRuntimeModes.length > 0 &&
    !provider.supportedRuntimeModes.includes(candidate.runtimeMode)
  ) {
    return ineligible(
      "runtime_mode_unsupported",
      `Provider instance ${provider.instanceId} does not support runtime mode ${candidate.runtimeMode}.`,
    );
  }
  if (candidate.interactionMode === "plan" && provider.showInteractionModeToggle === false) {
    return ineligible(
      "interaction_mode_unsupported",
      `Provider instance ${provider.instanceId} does not offer plan interaction mode.`,
    );
  }
  return {
    eligible: true,
    providerInstanceId: provider.instanceId,
    driverKind: provider.driver,
  };
}

/**
 * Resolution is a read of existing provider/project state. It never refreshes,
 * installs, authenticates, or otherwise mutates a provider.
 */
export function evaluateRuntimeRouteCandidate(
  candidate: RuntimeRouteCandidate,
  context: RuntimeRouteEligibilityContext,
): RuntimeRouteCandidateEvaluation {
  if (candidate.providerInstanceId !== undefined) {
    const provider = context.providers.find(
      (entry) => entry.instanceId === candidate.providerInstanceId,
    );
    if (provider === undefined) {
      return ineligible(
        "provider_instance_missing",
        `Provider instance ${candidate.providerInstanceId} is not registered.`,
      );
    }
    return evaluateProvider(candidate, provider, context);
  }
  if (candidate.driverKind === undefined) {
    return ineligible(
      "provider_instance_missing",
      "The route names no provider instance or driver.",
    );
  }

  const driverProviders = context.providers.filter(
    (provider) => provider.driver === candidate.driverKind,
  );
  if (driverProviders.length === 0) {
    return ineligible(
      "provider_instance_missing",
      `No provider instance uses driver ${candidate.driverKind}.`,
    );
  }
  const rejected: Array<Extract<RuntimeRouteCandidateEvaluation, { eligible: false }>> = [];
  for (const provider of driverProviders) {
    const evaluation = evaluateProvider(candidate, provider, context);
    if (evaluation.eligible) return evaluation;
    rejected.push(evaluation);
  }
  const reasons = new Set(rejected.map((evaluation) => evaluation.reason));
  const [first] = rejected;
  return reasons.size === 1 && first !== undefined
    ? ineligible(first.reason, first.detail)
    : ineligible(
        "no_eligible_provider_instance",
        `No eligible instance of driver ${candidate.driverKind}. ${first?.detail ?? ""}`.trim(),
      );
}
