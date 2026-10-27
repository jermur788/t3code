import {
  isProviderAvailable,
  type ProviderOptionDescriptor,
  type ProviderOptionSelection,
  type ServerProvider,
} from "@t3tools/contracts";

/**
 * The shared provider checks behind both child-task dispatch and Runtime route
 * resolution. Codes are stable for routing receipts; messages stay the human
 * strings the Orchestrator already reports.
 */
export type ProviderEligibilityIssueCode =
  | "orchestration_unsupported"
  | "provider_unavailable"
  | "provider_disabled"
  | "provider_not_installed"
  | "provider_not_ready"
  | "provider_auth_required";

export interface ProviderEligibilityIssue {
  readonly code: ProviderEligibilityIssueCode;
  readonly detail: string;
}

export function providerEligibilityIssues(
  provider: ServerProvider | undefined,
  supportsOrchestrationV2: boolean,
): ReadonlyArray<ProviderEligibilityIssue> {
  const issues: Array<ProviderEligibilityIssue> = [];
  if (!supportsOrchestrationV2) {
    issues.push({
      code: "orchestration_unsupported",
      detail: "No V2 provider adapter is registered.",
    });
  }
  if (provider === undefined) return issues;
  if (!isProviderAvailable(provider)) {
    issues.push({
      code: "provider_unavailable",
      detail: provider.unavailableReason ?? "Provider driver is unavailable.",
    });
  }
  if (!provider.enabled) {
    issues.push({
      code: "provider_disabled",
      detail: "Provider instance is disabled.",
    });
    // Disabled snapshots contain placeholders for installation, health, and auth.
    return issues;
  }
  if (!provider.installed) {
    issues.push({
      code: "provider_not_installed",
      detail: "Provider executable is not installed.",
    });
  }
  if (provider.status === "error" || provider.status === "disabled") {
    issues.push({
      code: "provider_not_ready",
      detail: provider.message ?? `Provider status is ${provider.status}.`,
    });
  }
  if (provider.auth.status === "unauthenticated") {
    issues.push({
      code: "provider_auth_required",
      detail: "Provider is not authenticated.",
    });
  }
  return issues;
}

export const providerConstraintMessages = (
  issues: ReadonlyArray<ProviderEligibilityIssue>,
): ReadonlyArray<string> => issues.map((issue) => issue.detail);

/** Skip checks without descriptors; reject duplicate IDs because consumers disagree on precedence. */
export function providerOptionSelectionProblems(
  selections: ReadonlyArray<ProviderOptionSelection>,
  descriptors: ReadonlyArray<ProviderOptionDescriptor> | undefined,
): ReadonlyArray<string> {
  const problems: Array<string> = [];
  const seen = new Set<string>();
  for (const selection of selections) {
    if (seen.has(selection.id)) {
      problems.push(`Option ${selection.id} was specified more than once.`);
      continue;
    }
    seen.add(selection.id);
    if (descriptors === undefined) continue;
    const descriptor = descriptors.find((candidate) => candidate.id === selection.id);
    if (descriptor === undefined) {
      const known = descriptors.map((candidate) => candidate.id).join(", ");
      problems.push(`Unknown option ${selection.id}; supported options: ${known || "none"}.`);
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
      const choices = descriptor.options.map((choice) => choice.id).join(", ");
      problems.push(`Option ${selection.id} must be one of: ${choices}.`);
    }
  }
  return problems;
}
