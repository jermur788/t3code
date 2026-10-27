import {
  DEFAULT_SERVER_SETTINGS,
  type DevelopmentProfileId as DevelopmentProfileIdType,
  DevelopmentProfileId,
  type ModelCapabilities,
  type ProjectDevelopmentProfile,
  ProjectId as ProjectIdSchema,
  ProjectRuntimeTaskId,
  ProviderDriverKind,
  type ProviderInstanceId,
  ProviderInstanceId as ProviderInstanceIdSchema,
  type RuntimeProfileRoleRoute,
  type RuntimeProfileRoutingPolicy,
  type RuntimeRoleRoute,
  type RuntimeRouteCandidate,
  type RuntimeRoutingPolicy,
  type ServerProvider,
  type ServerProviderModel,
  type ServerSettings,
} from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import { type ResolveRuntimeRouteInput, resolveRuntimeRoute } from "./RuntimeRoutingResolver.ts";

const projectId = ProjectIdSchema.make("routing-project");
const timestamp = "2026-10-27T00:00:00.000Z";
const codex = ProviderInstanceIdSchema.make("codex");
const claude = ProviderInstanceIdSchema.make("claudeAgent");
const grok = ProviderInstanceIdSchema.make("grok");
const codexAux = ProviderInstanceIdSchema.make("codex-aux");

const model = (
  slug: string,
  capabilities: ModelCapabilities | null = null,
): ServerProviderModel => ({
  slug,
  name: slug,
  isCustom: false,
  capabilities,
});

const provider = (input: {
  readonly instanceId: ProviderInstanceId;
  readonly driver: string;
  readonly models?: ReadonlyArray<ServerProviderModel>;
  readonly overrides?: Partial<ServerProvider>;
}): ServerProvider => ({
  instanceId: input.instanceId,
  driver: ProviderDriverKind.make(input.driver),
  enabled: true,
  installed: true,
  version: "1.0.0",
  status: "ready",
  auth: { status: "authenticated" },
  checkedAt: timestamp,
  models: input.models ?? [model("gpt-6")],
  slashCommands: [],
  skills: [],
  ...input.overrides,
});

const codexProvider = provider({ instanceId: codex, driver: "codex" });
const codexAuxProvider = provider({ instanceId: codexAux, driver: "codex" });
const claudeProvider = provider({
  instanceId: claude,
  driver: "claudeAgent",
  models: [model("claude-fable-5-1")],
});
const grokProvider = provider({
  instanceId: grok,
  driver: "grok",
  models: [model("grok-build")],
});
const providers = [codexProvider, codexAuxProvider, claudeProvider, grokProvider];

const candidate = (input: Partial<RuntimeRouteCandidate> = {}): RuntimeRouteCandidate => ({
  providerInstanceId: codex,
  model: "gpt-6",
  ...input,
});

const route = (input: Partial<RuntimeRoleRoute> = {}): RuntimeRoleRoute => ({
  role: "implementation",
  candidates: [candidate()],
  fallback: "inherit",
  ...input,
});

const profileRoute = (input: Partial<RuntimeProfileRoleRoute> = {}): RuntimeProfileRoleRoute => ({
  role: "implementation",
  candidates: [candidate()],
  fallback: "inherit",
  ...input,
});

const profileRouting = (
  routes: RuntimeProfileRoutingPolicy["roleRoutes"],
): RuntimeProfileRoutingPolicy => ({ roleRoutes: routes });

const projectRouting = (routes: RuntimeRoutingPolicy["roleRoutes"]): RuntimeRoutingPolicy => ({
  roleRoutes: routes,
});

const profileState = (routing: RuntimeProfileRoutingPolicy) => ({
  profileId: DevelopmentProfileId.make("profile") as DevelopmentProfileIdType,
  revision: 1,
  routing,
});

const assignmentState = (): ProjectDevelopmentProfile => ({
  projectId,
  profileId: DevelopmentProfileId.make("profile"),
  revision: 1,
  createdAt: timestamp,
  updatedAt: timestamp,
});

const taskState = (routing: RuntimeRoleRoute) => ({
  taskId: ProjectRuntimeTaskId.make("task"),
  revision: 4,
  routing,
});

const settingsWithProjectDisable = (instanceId: ProviderInstanceId): ServerSettings => ({
  ...DEFAULT_SERVER_SETTINGS,
  projectSettingsOverrides: {
    [projectId]: { providerInstances: { [instanceId]: { enabled: false } } },
  },
});

const resolve = (
  input: {
    readonly task?: ResolveRuntimeRouteInput["task"];
    readonly projectRouting?: ResolveRuntimeRouteInput["projectRouting"];
    readonly profile?: ResolveRuntimeRouteInput["profile"];
    readonly assignment?: ResolveRuntimeRouteInput["assignment"];
    readonly role?: ResolveRuntimeRouteInput["role"];
    readonly override?: ResolveRuntimeRouteInput["override"];
    readonly providers?: ReadonlyArray<ServerProvider>;
    readonly settings?: ServerSettings;
    readonly orchestrationCapableInstanceIds?: ReadonlySet<ProviderInstanceId>;
  } = {},
) => {
  const activeProviders = input.providers ?? providers;
  return resolveRuntimeRoute({
    projectId,
    task: input.task ?? null,
    projectRouting: input.projectRouting ?? { routing: null, revision: 0 },
    profile: input.profile ?? null,
    assignment: input.assignment ?? null,
    ...(input.role === undefined ? {} : { role: input.role }),
    ...(input.override === undefined ? {} : { override: input.override }),
    eligibility: {
      projectId,
      providers: activeProviders,
      orchestrationCapableInstanceIds:
        input.orchestrationCapableInstanceIds ??
        new Set(activeProviders.map((entry) => entry.instanceId)),
      settings: input.settings ?? DEFAULT_SERVER_SETTINGS,
    },
  });
};

const reasons = (resolution: ReturnType<typeof resolve>) =>
  resolution.rejected.map((rejection) => rejection.reason);

describe("runtime routing precedence", () => {
  it("uses the profile when project and task have no routing", () => {
    const resolution = resolve({ profile: profileState(profileRouting([profileRoute()])) });
    expect(resolution.status).toBe("resolved");
    expect(resolution.source).toBe("profile");
    expect(resolution.selected?.providerInstanceId).toBe(codex);
    expect(resolution.revisions.profile?.revision).toBe(1);
  });

  it("lets a project override a profile route", () => {
    const resolution = resolve({
      profile: profileState(profileRouting([profileRoute()])),
      projectRouting: {
        routing: projectRouting([
          route({
            candidates: [candidate({ providerInstanceId: claude, model: "claude-fable-5-1" })],
          }),
        ]),
        revision: 2,
      },
      assignment: assignmentState(),
    });
    expect(resolution.source).toBe("project");
    expect(resolution.selected?.providerInstanceId).toBe(claude);
    expect(resolution.revisions.projectRouting).toBe(2);
  });

  it("lets a task override project and profile routes", () => {
    const resolution = resolve({
      task: taskState(
        route({
          candidates: [candidate()],
        }),
      ),
      projectRouting: {
        routing: projectRouting([
          route({
            candidates: [candidate({ providerInstanceId: claude, model: "claude-fable-5-1" })],
          }),
        ]),
        revision: 1,
      },
      profile: profileState(profileRouting([profileRoute()])),
      assignment: assignmentState(),
    });
    expect(resolution.source).toBe("task");
    expect(resolution.selected?.providerInstanceId).toBe(codex);
    expect(resolution.revisions.task).toBe(4);
  });

  it("uses a one-run override before every stored layer", () => {
    const resolution = resolve({
      task: taskState(route()),
      override: {
        candidate: candidate({ providerInstanceId: claude, model: "claude-fable-5-1" }),
      },
    });
    expect(resolution.status).toBe("resolved");
    expect(resolution.source).toBe("explicit");
    expect(resolution.selected?.providerInstanceId).toBe(claude);
  });

  it("returns to the profile after a project reset", () => {
    const resolution = resolve({
      projectRouting: { routing: null, revision: 3 },
      profile: profileState(profileRouting([profileRoute()])),
      assignment: assignmentState(),
    });
    expect(resolution.status).toBe("resolved");
    expect(resolution.source).toBe("profile");
  });

  it("uses the task role over a caller-supplied role", () => {
    const resolution = resolve({
      role: "implementation",
      task: taskState(route({ role: "review" })),
      projectRouting: {
        routing: projectRouting([
          route({
            role: "implementation",
            candidates: [candidate({ providerInstanceId: claude, model: "claude-fable-5-1" })],
          }),
        ]),
        revision: 1,
      },
    });
    expect(resolution.role).toBe("review");
    expect(resolution.source).toBe("task");
    expect(resolution.selected?.providerInstanceId).toBe(codex);
  });

  it("resolves a driver-only candidate to the first eligible instance", () => {
    const resolution = resolve({
      projectRouting: {
        routing: projectRouting([
          route({
            candidates: [{ driverKind: ProviderDriverKind.make("codex"), model: "gpt-6" }],
          }),
        ]),
        revision: 1,
      },
    });
    expect(resolution.status).toBe("resolved");
    expect(resolution.selected?.providerInstanceId).toBe(codex);
  });

  it("fails closed when a one-run override is ineligible", () => {
    const resolution = resolve({
      task: taskState(route()),
      override: {
        candidate: candidate({ providerInstanceId: ProviderInstanceIdSchema.make("missing") }),
      },
    });
    expect(resolution.status).toBe("failed");
    expect(resolution.source).toBe("explicit");
    expect(resolution.selected).toBeNull();
    expect(resolution.rejected[0]?.reason).toBe("provider_instance_missing");
  });

  it("reports ordinary inheritance when no layer has a route", () => {
    const resolution = resolve();
    expect(resolution.status).toBe("inherited");
    expect(resolution.source).toBe("inherit");
    expect(resolution.selected).toBeNull();
    expect(resolution.inheritedFrom).toBeNull();
    expect(resolution.rejected).toEqual([]);
  });
});

describe("runtime routing fallback", () => {
  it("selects a later candidate and keeps the earlier rejection", () => {
    const resolution = resolve({
      task: taskState(
        route({
          candidates: [
            candidate({ providerInstanceId: ProviderInstanceIdSchema.make("missing") }),
            candidate(),
          ],
          fallback: "inherit",
        }),
      ),
    });
    expect(resolution.status).toBe("resolved");
    expect(resolution.source).toBe("task");
    expect(resolution.selected?.candidateIndex).toBe(1);
    expect(resolution.rejected).toHaveLength(1);
    expect(resolution.rejected[0]?.reason).toBe("provider_instance_missing");
    expect(resolution.rejected[0]?.candidateIndex).toBe(0);
  });

  it("refuses with fail instead of silently inheriting", () => {
    const resolution = resolve({
      task: taskState(
        route({
          candidates: [candidate({ providerInstanceId: ProviderInstanceIdSchema.make("missing") })],
          fallback: "fail",
        }),
      ),
      profile: profileState(profileRouting([profileRoute()])),
      assignment: assignmentState(),
    });
    expect(resolution.status).toBe("failed");
    expect(resolution.source).toBe("task");
    expect(resolution.failure).toEqual({ source: "task", reason: "candidates_exhausted" });
    expect(resolution.selected).toBeNull();
    expect(resolution.inheritedFrom).toBeNull();
  });

  it("continues to the next layer after the current layer is exhausted", () => {
    const resolution = resolve({
      task: taskState(
        route({
          candidates: [candidate({ providerInstanceId: ProviderInstanceIdSchema.make("missing") })],
          fallback: "continue",
        }),
      ),
      projectRouting: {
        routing: projectRouting([route()]),
        revision: 1,
      },
    });
    expect(resolution.status).toBe("resolved");
    expect(resolution.source).toBe("project");
    expect(resolution.rejected[0]?.reason).toBe("provider_instance_missing");
  });

  it("deliberately inherits without evaluating the profile", () => {
    const resolution = resolve({
      projectRouting: {
        routing: projectRouting([
          route({
            candidates: [
              candidate({ providerInstanceId: ProviderInstanceIdSchema.make("missing") }),
            ],
            fallback: "inherit",
          }),
        ]),
        revision: 1,
      },
      profile: profileState(profileRouting([profileRoute()])),
      assignment: assignmentState(),
    });
    expect(resolution.status).toBe("inherited");
    expect(resolution.source).toBe("inherit");
    expect(resolution.inheritedFrom).toBe("project");
    expect(resolution.rejected).toHaveLength(1);
    expect(resolution.rejected[0]?.source).toBe("project");
  });
});

describe("runtime routing provider eligibility", () => {
  it("rejects a provider disabled for the project", () => {
    const resolution = resolve({
      projectRouting: {
        routing: projectRouting([route({ fallback: "fail" })]),
        revision: 1,
      },
      settings: settingsWithProjectDisable(codex),
    });
    expect(resolution.status).toBe("failed");
    expect(reasons(resolution)).toContain("provider_instance_disabled_for_project");
  });

  it("reports a temporarily unavailable provider without changing the route", () => {
    const unavailable = provider({
      instanceId: codex,
      driver: "codex",
      overrides: { availability: "unavailable", unavailableReason: "Provider is offline." },
    });
    const savedRouting = projectRouting([route({ fallback: "fail" })]);
    const resolution = resolve({
      projectRouting: { routing: savedRouting, revision: 4 },
      providers: [unavailable],
      orchestrationCapableInstanceIds: new Set(),
    });
    expect(resolution.status).toBe("failed");
    expect(reasons(resolution)).toContain("provider_unavailable");
    expect(resolution.rejected[0]?.detail).toBe("Provider is offline.");
    expect(resolution.revisions.projectRouting).toBe(4);
  });

  it("reports a model that is no longer advertised", () => {
    const resolution = resolve({
      projectRouting: {
        routing: projectRouting([
          route({ candidates: [candidate({ model: "removed-model" })], fallback: "fail" }),
        ]),
        revision: 1,
      },
    });
    expect(resolution.status).toBe("failed");
    expect(reasons(resolution)).toContain("model_unavailable");
    expect(resolution.selected).toBeNull();
  });

  it("resolves an ordinary eligible provider without provider-specific branches", () => {
    const resolution = resolve({
      projectRouting: {
        routing: projectRouting([route({ fallback: "fail" })]),
        revision: 1,
      },
    });
    expect(resolution.status).toBe("resolved");
    expect(resolution.selected?.driverKind).toBe("codex");
    expect(resolution.selected?.eligibility).toBe("eligible-at-resolution");
  });

  it("rejects an unsupported runtime mode and plan mode", () => {
    const limited = provider({
      instanceId: codex,
      driver: "codex",
      overrides: {
        supportedRuntimeModes: ["approval-required"],
        showInteractionModeToggle: false,
      },
    });
    const runtime = resolve({
      projectRouting: {
        routing: projectRouting([
          route({ candidates: [candidate({ runtimeMode: "full-access" })], fallback: "fail" }),
        ]),
        revision: 1,
      },
      providers: [limited],
    });
    expect(reasons(runtime)).toContain("runtime_mode_unsupported");

    const plan = resolve({
      projectRouting: {
        routing: projectRouting([
          route({ candidates: [candidate({ interactionMode: "plan" })], fallback: "fail" }),
        ]),
        revision: 1,
      },
      providers: [limited],
    });
    expect(reasons(plan)).toContain("interaction_mode_unsupported");
  });

  it("rejects model options the advertised model does not support", () => {
    const capabilities: ModelCapabilities = {
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
    };
    const structured = provider({
      instanceId: codex,
      driver: "codex",
      models: [model("gpt-6", capabilities)],
    });
    const resolution = resolve({
      projectRouting: {
        routing: projectRouting([
          route({
            candidates: [candidate({ options: [{ id: "reasoning", value: "max" }] })],
            fallback: "fail",
          }),
        ]),
        revision: 1,
      },
      providers: [structured],
    });
    expect(resolution.status).toBe("failed");
    expect(reasons(resolution)).toContain("model_options_invalid");
  });
});
