import { describe, expect, it } from "vite-plus/test";
import {
  ProviderDriverKind,
  ProviderInstanceId,
  type RuntimeRouteResolution,
  type ServerProvider,
} from "@t3tools/contracts";

import { deriveProviderInstanceEntries } from "../../providerInstances";
import {
  candidateUnavailableReason,
  defaultWorkerCandidate,
  effectiveSourceLabel,
  fallbackDescription,
  fallbackLabel,
  rejectionReasonLabel,
} from "./workerRouting.logic";

const checkedAt = "2026-10-28T12:00:00.000Z";
const codex = ProviderInstanceId.make("codex");
const claude = ProviderInstanceId.make("claude");

function provider(overrides: Partial<ServerProvider> = {}): ServerProvider {
  return {
    driver: ProviderDriverKind.make("codex"),
    instanceId: codex,
    enabled: true,
    installed: true,
    status: "ready",
    auth: { status: "authenticated" },
    version: null,
    checkedAt,
    models: [{ slug: "gpt-6-astra", name: "GPT-6 Astra", isCustom: false, capabilities: null }],
    slashCommands: [],
    skills: [],
    ...overrides,
  };
}

const entries = (providers: ReadonlyArray<ServerProvider>) =>
  deriveProviderInstanceEntries(providers);

describe("saved worker availability", () => {
  it("accepts a ready instance and model", () => {
    expect(
      candidateUnavailableReason(
        { providerInstanceId: codex, model: "gpt-6-astra" },
        entries([provider()]),
      ),
    ).toBeNull();
  });

  it("keeps a missing provider visible and explains why it cannot be used", () => {
    expect(
      candidateUnavailableReason(
        { providerInstanceId: ProviderInstanceId.make("removed"), model: "gpt-6-astra" },
        entries([provider()]),
      ),
    ).toBe("Provider is no longer available.");
  });

  it("reports disabled, unavailable, uninstalled, signed-out, and missing models", () => {
    expect(
      candidateUnavailableReason(
        { providerInstanceId: codex, model: "gpt-6-astra" },
        entries([provider({ enabled: false })]),
      ),
    ).toBe("Provider is disabled.");
    expect(
      candidateUnavailableReason(
        { providerInstanceId: codex, model: "gpt-6-astra" },
        entries([provider({ availability: "unavailable", unavailableReason: "Offline." })]),
      ),
    ).toBe("Offline.");
    expect(
      candidateUnavailableReason(
        { providerInstanceId: codex, model: "gpt-6-astra" },
        entries([provider({ installed: false })]),
      ),
    ).toBe("Provider is not installed.");
    expect(
      candidateUnavailableReason(
        { providerInstanceId: codex, model: "gpt-6-astra" },
        entries([provider({ auth: { status: "unauthenticated" } })]),
      ),
    ).toBe("Provider needs sign-in.");
    expect(
      candidateUnavailableReason(
        { providerInstanceId: codex, model: "removed-model" },
        entries([provider()]),
      ),
    ).toBe("Model is not currently available.");
  });

  it("reports unsupported runtime and plan modes from the provider snapshot", () => {
    const limited = provider({
      supportedRuntimeModes: ["approval-required"],
      showInteractionModeToggle: false,
    });
    expect(
      candidateUnavailableReason(
        { providerInstanceId: codex, model: "gpt-6-astra", runtimeMode: "full-access" },
        entries([limited]),
      ),
    ).toBe("Provider does not support the saved permission mode.");
    expect(
      candidateUnavailableReason(
        { providerInstanceId: codex, model: "gpt-6-astra", interactionMode: "plan" },
        entries([limited]),
      ),
    ).toBe("Provider does not support plan mode.");
  });

  it("reports provider type mismatch and unsupported saved options", () => {
    expect(
      candidateUnavailableReason(
        {
          providerInstanceId: codex,
          driverKind: ProviderDriverKind.make("claudeAgent"),
          model: "gpt-6-astra",
        },
        entries([provider()]),
      ),
    ).toBe("Provider type does not match.");

    const withOptions = provider({
      models: [
        {
          slug: "gpt-6-astra",
          name: "GPT-6 Astra",
          isCustom: false,
          capabilities: {
            optionDescriptors: [
              {
                id: "reasoning",
                label: "Reasoning",
                type: "select",
                options: [
                  { id: "low", label: "Low" },
                  { id: "high", label: "High" },
                ],
              },
            ],
          },
        },
      ],
    });
    expect(
      candidateUnavailableReason(
        {
          providerInstanceId: codex,
          model: "gpt-6-astra",
          options: [{ id: "reasoning", value: "unsupported" }],
        },
        entries([withOptions]),
      ),
    ).toBe("Saved provider options are not supported.");
    expect(
      candidateUnavailableReason(
        {
          providerInstanceId: codex,
          model: "gpt-6-astra",
          options: [{ id: "reasoning", value: "low" }],
        },
        entries([withOptions]),
      ),
    ).toBeNull();
    expect(
      candidateUnavailableReason(
        {
          providerInstanceId: codex,
          model: "gpt-6-astra",
          options: [
            { id: "reasoning", value: "low" },
            { id: "reasoning", value: "high" },
          ],
        },
        entries([provider()]),
      ),
    ).toBe("Saved provider options are not supported.");
  });

  it("resolves a driver-only route through any eligible instance", () => {
    const driverKind = ProviderDriverKind.make("codex");
    expect(
      candidateUnavailableReason(
        { driverKind, model: "gpt-6-astra" },
        entries([
          provider({ instanceId: ProviderInstanceId.make("offline"), enabled: false }),
          provider(),
        ]),
      ),
    ).toBeNull();
    expect(
      candidateUnavailableReason(
        { driverKind: ProviderDriverKind.make("claudeAgent"), model: "claude-fable-5-1" },
        entries([provider()]),
      ),
    ).toBe("No provider of this type is available.");
  });
});

describe("worker preference wording", () => {
  it("names the layer that supplied the effective choice", () => {
    const base = {
      projectId: "project",
      taskId: null,
      role: "implementation" as const,
      revisions: { task: null, projectRouting: 0, profile: null, assignment: null },
      rejected: [],
    };
    expect(
      effectiveSourceLabel({
        ...base,
        status: "resolved",
        source: "project",
        selected: null,
        inheritedFrom: null,
        failure: null,
      } as unknown as RuntimeRouteResolution),
    ).toBe("Project setting");
    expect(
      effectiveSourceLabel({
        ...base,
        status: "resolved",
        source: "profile",
        selected: null,
        inheritedFrom: null,
        failure: null,
      } as unknown as RuntimeRouteResolution),
    ).toBe("Development Profile");
    expect(
      effectiveSourceLabel({
        ...base,
        status: "inherited",
        source: "inherit",
        selected: null,
        inheritedFrom: null,
        failure: null,
      } as unknown as RuntimeRouteResolution),
    ).toBe("Normal T3 behaviour");
    expect(
      effectiveSourceLabel({
        ...base,
        status: "failed",
        source: "task",
        selected: null,
        inheritedFrom: null,
        failure: { source: "task", reason: "candidates_exhausted" },
      } as unknown as RuntimeRouteResolution),
    ).toBe("No eligible worker (Task setting)");
  });

  it("explains fallbacks and rejection reasons without internal codes", () => {
    expect(fallbackLabel("continue")).toBe("Try the next setting");
    expect(fallbackLabel("inherit")).toBe("Use normal T3 behaviour");
    expect(fallbackLabel("fail")).toBe("Fail instead of using another worker");
    expect(fallbackDescription("fail")).toContain("do not silently use anything else");
    expect(rejectionReasonLabel("provider_auth_required")).toBe("Provider needs sign-in.");
    expect(rejectionReasonLabel("model_unavailable")).toBe("Model is not currently available.");
  });

  it("chooses a default candidate from the first available provider", () => {
    const candidate = defaultWorkerCandidate(
      entries([
        provider({ enabled: false }),
        provider({
          instanceId: claude,
          driver: ProviderDriverKind.make("claudeAgent"),
          models: [
            { slug: "claude-haiku", name: "Claude Haiku", isCustom: false, capabilities: null },
            {
              slug: "claude-fable-5-1",
              name: "Claude Fable",
              isCustom: false,
              isDefault: true,
              capabilities: null,
            },
          ],
        }),
      ]),
    );
    expect(candidate).toEqual({ providerInstanceId: claude, model: "claude-fable-5-1" });
  });
});
