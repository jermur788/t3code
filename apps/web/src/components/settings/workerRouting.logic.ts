import {
  type ProviderOptionSelection,
  type RuntimeRouteCandidate,
  type RuntimeRouteRejectionReason,
  type RuntimeRouteResolution,
  type RuntimeRouteSource,
  type RuntimeRoutingFallback,
  type RuntimeWorkerRole,
  isProviderAvailable,
} from "@t3tools/contracts";
import { getProviderClient } from "@t3tools/client-runtime/provider-clients";

import type { ProviderInstanceEntry } from "../../providerInstances";

export const WORKER_ROLE_ORDER = [
  "implementation",
  "research",
  "review",
  "design",
  "test",
  "general",
] as const satisfies ReadonlyArray<RuntimeWorkerRole>;

const WORKER_ROLE_LABELS: Readonly<Record<RuntimeWorkerRole, string>> = {
  implementation: "Implementation",
  research: "Research",
  review: "Review",
  design: "Design",
  test: "Test",
  general: "General",
};

const ROUTE_SOURCE_LABELS: Readonly<Record<RuntimeRouteSource, string>> = {
  explicit: "One-run choice",
  task: "Task setting",
  project: "Project setting",
  profile: "Development Profile",
  inherit: "Normal T3 behaviour",
};

const REJECTION_REASON_LABELS: Readonly<Record<RuntimeRouteRejectionReason, string>> = {
  provider_instance_missing: "Provider is no longer available.",
  provider_driver_mismatch: "Provider type does not match.",
  provider_instance_disabled_for_project: "Provider is disabled for this project.",
  provider_orchestration_unsupported: "Provider cannot run this kind of work.",
  provider_unavailable: "Provider is currently unavailable.",
  provider_disabled: "Provider is disabled.",
  provider_not_installed: "Provider is not installed.",
  provider_not_ready: "Provider is not ready.",
  provider_auth_required: "Provider needs sign-in.",
  no_eligible_provider_instance: "No matching provider is currently available.",
  model_unavailable: "Model is not currently available.",
  model_options_invalid: "Saved provider options are not supported.",
  runtime_mode_unsupported: "Provider does not support the saved permission mode.",
  interaction_mode_unsupported: "Provider does not support the saved interaction mode.",
};

export function workerRoleLabel(role: RuntimeWorkerRole): string {
  return WORKER_ROLE_LABELS[role];
}

export function routeSourceLabel(source: RuntimeRouteSource): string {
  return ROUTE_SOURCE_LABELS[source];
}

export function effectiveSourceLabel(resolution: RuntimeRouteResolution): string {
  if (resolution.status === "failed") {
    return `No eligible worker (${routeSourceLabel(resolution.source)})`;
  }
  if (resolution.status === "inherited") {
    return routeSourceLabel("inherit");
  }
  return routeSourceLabel(resolution.source);
}

export function rejectionReasonLabel(reason: RuntimeRouteRejectionReason): string {
  return REJECTION_REASON_LABELS[reason];
}

export function fallbackLabel(fallback: RuntimeRoutingFallback): string {
  switch (fallback) {
    case "continue":
      return "Try the next setting";
    case "inherit":
      return "Use normal T3 behaviour";
    case "fail":
      return "Fail instead of using another worker";
  }
}

export function fallbackDescription(fallback: RuntimeRoutingFallback): string {
  switch (fallback) {
    case "continue":
      return "If none of these workers can be used, check the next lower setting.";
    case "inherit":
      return "If none of these workers can be used, stop and use normal T3 behaviour.";
    case "fail":
      return "If none of these workers can be used, do not silently use anything else.";
  }
}

export function candidateOptionSelections(
  candidate: RuntimeRouteCandidate,
): ReadonlyArray<ProviderOptionSelection> | undefined {
  if (candidate.options === undefined) return undefined;
  if (Array.isArray(candidate.options)) return candidate.options;
  return Object.entries(candidate.options).flatMap(([id, value]) =>
    typeof value === "string" || typeof value === "boolean" ? [{ id, value }] : [],
  );
}

function candidateOptionProblems(
  candidate: RuntimeRouteCandidate,
  entry: ProviderInstanceEntry,
): ReadonlyArray<string> {
  const selections = candidateOptionSelections(candidate);
  if (selections === undefined) return [];
  const descriptors = entry.models.find((model) => model.slug === candidate.model)?.capabilities
    ?.optionDescriptors;
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const selection of selections) {
    if (seen.has(selection.id)) {
      problems.push(`Option ${selection.id} was specified more than once.`);
      continue;
    }
    seen.add(selection.id);
    if (descriptors === undefined) continue;
    const descriptor = descriptors.find(
      (candidateDescriptor) => candidateDescriptor.id === selection.id,
    );
    if (descriptor === undefined) {
      problems.push(`Unknown option ${selection.id}.`);
      continue;
    }
    if (descriptor.type === "boolean" && typeof selection.value !== "boolean") {
      problems.push(`Option ${selection.id} expects a boolean value.`);
      continue;
    }
    if (
      descriptor.type === "select" &&
      !descriptor.options.some((choice) => choice.id === selection.value)
    ) {
      problems.push(`Option ${selection.id} has an unsupported value.`);
    }
  }
  return problems;
}

export function candidateProviderLabel(
  candidate: RuntimeRouteCandidate,
  entries: ReadonlyArray<ProviderInstanceEntry>,
): string {
  if (candidate.providerInstanceId !== undefined) {
    const entry = entries.find(
      (candidateEntry) => candidateEntry.instanceId === candidate.providerInstanceId,
    );
    return entry?.displayName ?? candidate.providerInstanceId;
  }
  if (candidate.driverKind !== undefined) {
    const label = getProviderClient(candidate.driverKind)?.label ?? candidate.driverKind;
    return `${label} (any instance)`;
  }
  return "Unspecified provider";
}

function entryUnavailableReason(
  entry: ProviderInstanceEntry,
  candidate: RuntimeRouteCandidate,
): string | null {
  if (
    candidate.driverKind !== undefined &&
    candidate.providerInstanceId !== undefined &&
    entry.driverKind !== candidate.driverKind
  ) {
    return "Provider type does not match.";
  }
  if (!isProviderAvailable(entry.snapshot)) {
    return entry.snapshot.unavailableReason ?? "Provider is currently unavailable.";
  }
  if (!entry.enabled) return "Provider is disabled.";
  if (!entry.installed) return "Provider is not installed.";
  if (entry.status === "error" || entry.status === "disabled") {
    return entry.snapshot.message ?? "Provider is not ready.";
  }
  if (entry.snapshot.auth.status === "unauthenticated") return "Provider needs sign-in.";
  if (entry.models.length > 0 && !entry.models.some((model) => model.slug === candidate.model)) {
    return "Model is not currently available.";
  }
  if (candidateOptionProblems(candidate, entry).length > 0) {
    return "Saved provider options are not supported.";
  }
  const supportedRuntimeModes = entry.snapshot.supportedRuntimeModes;
  if (
    candidate.runtimeMode !== undefined &&
    supportedRuntimeModes !== undefined &&
    supportedRuntimeModes.length > 0 &&
    !supportedRuntimeModes.includes(candidate.runtimeMode)
  ) {
    return "Provider does not support the saved permission mode.";
  }
  if (candidate.interactionMode === "plan" && entry.snapshot.showInteractionModeToggle === false) {
    return "Provider does not support plan mode.";
  }
  return null;
}

/**
 * This mirrors the user-visible parts of resolution eligibility for the editor.
 * The server remains authoritative; this only warns that a saved worker cannot
 * currently be used and never rewrites the saved preference.
 */
export function candidateUnavailableReason(
  candidate: RuntimeRouteCandidate,
  entries: ReadonlyArray<ProviderInstanceEntry>,
): string | null {
  if (candidate.providerInstanceId !== undefined) {
    const entry = entries.find(
      (candidateEntry) => candidateEntry.instanceId === candidate.providerInstanceId,
    );
    return entry === undefined
      ? "Provider is no longer available."
      : entryUnavailableReason(entry, candidate);
  }
  if (candidate.driverKind === undefined) return "No provider is specified.";
  const matches = entries.filter((entry) => entry.driverKind === candidate.driverKind);
  if (matches.length === 0) return "No provider of this type is available.";
  return matches.some((entry) => entryUnavailableReason(entry, candidate) === null)
    ? null
    : "No matching provider is currently available.";
}

export function defaultWorkerCandidate(
  entries: ReadonlyArray<ProviderInstanceEntry>,
): RuntimeRouteCandidate | null {
  for (const entry of entries) {
    if (!entry.enabled || !entry.isAvailable) continue;
    const model =
      entry.models.find((candidate) => candidate.isDefault)?.slug ?? entry.models[0]?.slug;
    if (model !== undefined) {
      return { providerInstanceId: entry.instanceId, model };
    }
  }
  return null;
}
