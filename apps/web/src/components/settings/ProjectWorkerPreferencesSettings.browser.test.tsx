import { expect, it, vi } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";
import { StrictMode, type ReactNode } from "react";
import {
  ProviderInstanceId,
  type ProjectRuntimeRouting,
  type RuntimeRouteResolution,
  type RuntimeWorkerRole,
} from "@t3tools/contracts";

import { render } from "../../../test/render";
import type { SidebarProjectGroupMember } from "../../sidebarProjectGrouping";

const mock = vi.hoisted(() => ({ useApi: vi.fn() }));

vi.mock("./useProjectRuntimeApi", () => ({ useProjectRuntimeApi: mock.useApi }));
vi.mock("./settingsLayout", () => ({
  SettingsSection: ({
    children,
    title,
    id,
  }: {
    children: ReactNode;
    title: string;
    id?: string;
  }) => (
    <section id={id}>
      <h2>{title}</h2>
      {children}
    </section>
  ),
  SETTINGS_PICKER_TRIGGER_CLASSNAME: "",
}));
vi.mock("../chat/ProviderModelPicker", () => ({
  ProviderModelPicker: (props: { triggerAriaLabel?: string; model: string }) => (
    <button type="button" aria-label={props.triggerAriaLabel}>
      {props.model}
    </button>
  ),
}));
vi.mock("./useWorkerRoutingCatalog", () => ({
  useWorkerRoutingCatalog: () => ({
    entries: [
      {
        instanceId: "codex",
        driverKind: "codex",
        displayName: "Codex",
        enabled: true,
        installed: true,
        status: "ready",
        isDefault: true,
        isAvailable: true,
        snapshot: {
          instanceId: "codex",
          driver: "codex",
          enabled: true,
          installed: true,
          status: "ready",
          auth: { status: "authenticated" },
          version: null,
          checkedAt: "2026-10-24T12:00:00.000Z",
          models: [{ slug: "gpt-6-astra", name: "GPT-6 Astra", isCustom: false }],
          slashCommands: [],
          skills: [],
        },
        models: [{ slug: "gpt-6-astra", name: "GPT-6 Astra", isCustom: false }],
      },
      {
        instanceId: "claude",
        driverKind: "claudeAgent",
        displayName: "Claude",
        enabled: true,
        installed: true,
        status: "ready",
        isDefault: true,
        isAvailable: true,
        snapshot: {
          instanceId: "claude",
          driver: "claudeAgent",
          enabled: true,
          installed: true,
          status: "ready",
          auth: { status: "authenticated" },
          version: null,
          checkedAt: "2026-10-24T12:00:00.000Z",
          models: [{ slug: "claude-fable-5-1", name: "Claude Fable", isCustom: false }],
          slashCommands: [],
          skills: [],
        },
        models: [{ slug: "claude-fable-5-1", name: "Claude Fable", isCustom: false }],
      },
    ],
    modelOptionsByInstance: new Map([
      ["codex", [{ slug: "gpt-6-astra", name: "GPT-6 Astra", isCustom: false }]],
      ["claude", [{ slug: "claude-fable-5-1", name: "Claude Fable", isCustom: false }]],
    ]),
  }),
}));

import { ProjectWorkerPreferencesSettings } from "./ProjectWorkerPreferencesSettings";

const time = "2026-10-24T12:00:00.000Z";
const project = {
  environmentId: "local",
  id: "project-1",
  workspaceRoot: "/workspace/project",
  environmentLabel: "Local",
} as SidebarProjectGroupMember;
const otherProject = {
  ...project,
  environmentId: "remote",
  id: "project-2",
  workspaceRoot: "/workspace/other",
} as SidebarProjectGroupMember;

const ok = <T,>(value: T) => ({ ok: true as const, value });

function resolution(role: RuntimeWorkerRole, source: "project" | "profile" | "inherit") {
  const selected =
    source === "project"
      ? {
          source,
          candidateIndex: 0,
          candidate: { providerInstanceId: "codex", model: "gpt-6-astra" },
          providerInstanceId: "codex",
          driverKind: "codex",
          model: "gpt-6-astra",
          isolation: "shared",
          eligibility: "eligible-at-resolution",
        }
      : source === "profile"
        ? {
            source,
            candidateIndex: 0,
            candidate: { providerInstanceId: "claude", model: "claude-fable-5-1" },
            providerInstanceId: "claude",
            driverKind: "claudeAgent",
            model: "claude-fable-5-1",
            isolation: "shared",
            eligibility: "eligible-at-resolution",
          }
        : null;
  return {
    projectId: project.id,
    taskId: null,
    role,
    status: selected === null ? "inherited" : "resolved",
    source: selected === null ? "inherit" : source,
    selected,
    inheritedFrom: null,
    rejected: [],
    failure: null,
    revisions: {
      task: null,
      projectRouting: 0,
      profile: null,
      assignment: null,
    },
  } as unknown as RuntimeRouteResolution;
}

function setup(initial: ProjectRuntimeRouting | null = null) {
  const state = {
    routing: initial === null ? null : { ...initial },
    readFailure: 0,
    saveConflict: false,
    readGate: null as Promise<void> | null,
    resolveGate: null as Promise<void> | null,
    resolutions: {
      implementation: resolution("implementation", "project"),
      review: resolution("review", "profile"),
      research: resolution("research", "inherit"),
      design: resolution("design", "inherit"),
      test: resolution("test", "inherit"),
      general: resolution("general", "inherit"),
    } as Record<RuntimeWorkerRole, RuntimeRouteResolution>,
  };
  mock.useApi.mockReset();
  const api = {
    ready: true,
    canEdit: true,
    readRouting: vi.fn(async () => {
      if (state.readGate !== null) await state.readGate;
      if (state.readFailure > 0) {
        state.readFailure -= 1;
        return { ok: false as const, message: "Could not read worker settings.", conflict: false };
      }
      return ok(state.routing === null ? null : { ...state.routing });
    }),
    saveRouting: vi.fn(async (input: { routing: unknown; expectedRevision: number }) => {
      if (state.saveConflict) {
        state.saveConflict = false;
        return {
          ok: false as const,
          message: "These worker settings changed since you loaded them. Your draft is preserved.",
          conflict: true,
        };
      }
      state.routing = {
        projectId: project.id,
        routing: input.routing as ProjectRuntimeRouting["routing"],
        revision: (state.routing?.revision ?? 0) + 1,
        createdAt: state.routing?.createdAt ?? time,
        updatedAt: time,
      };
      return ok({ ...state.routing });
    }),
    resolveRoute: vi.fn(async (input: { role?: RuntimeWorkerRole }) => {
      if (state.resolveGate !== null) await state.resolveGate;
      return ok(state.resolutions[input.role ?? "implementation"]);
    }),
  };
  mock.useApi.mockImplementation(() => api);
  return { api, state };
}

const panel = () => <ProjectWorkerPreferencesSettings members={[project]} />;

it("shows every effective layer, saves a project override, and resets to the Development Profile", async () => {
  const { api } = setup();
  await using screen = await render(panel());
  await expect
    .element(screen.getByText("Effective worker choice: Project setting", { exact: true }))
    .toBeVisible();
  await expect
    .element(screen.getByText("Effective worker choice: Development Profile", { exact: true }))
    .toBeVisible();
  await expect
    .element(
      screen.getByText("Effective worker choice: Normal T3 behaviour", { exact: true }).first(),
    )
    .toBeVisible();
  await expect.element(screen.getByText("Never saved · Revision 0", { exact: true })).toBeVisible();

  await userEvent.click(
    screen.getByRole("combobox", {
      name: "Add a worker role to project-worker:project-1",
      exact: true,
    }),
  );
  await userEvent.click(screen.getByRole("option", { name: "Review", exact: true }));
  await userEvent.click(screen.getByRole("button", { name: "Save worker settings", exact: true }));

  expect(api.saveRouting).toHaveBeenCalledWith({
    routing: {
      roleRoutes: [
        {
          role: "review",
          candidates: [
            { providerInstanceId: ProviderInstanceId.make("codex"), model: "gpt-6-astra" },
          ],
          fallback: "continue",
        },
      ],
    },
    expectedRevision: 0,
  });
  await expect
    .element(screen.getByText("Project override · Revision 1", { exact: true }))
    .toBeVisible();

  await userEvent.click(
    screen.getByRole("button", { name: "Reset to Development Profile", exact: true }),
  );
  expect(api.saveRouting).toHaveBeenLastCalledWith({
    routing: null,
    expectedRevision: 1,
  });
  await expect
    .element(screen.getByText("Inherits the Development Profile · Revision 2", { exact: true }))
    .toBeVisible();
});

it("keeps an unavailable saved worker visible and preserves it when saving", async () => {
  const { api } = setup({
    projectId: project.id,
    routing: {
      roleRoutes: [
        {
          role: "review",
          candidates: [
            { providerInstanceId: ProviderInstanceId.make("removed"), model: "old-model" },
          ],
          fallback: "fail",
        },
      ],
    },
    revision: 2,
    createdAt: time,
    updatedAt: time,
  });
  await using screen = await render(panel());
  await expect.element(screen.getByText("Currently unavailable", { exact: true })).toBeVisible();
  await expect
    .element(screen.getByText("Provider is no longer available.", { exact: false }))
    .toBeVisible();

  await userEvent.click(screen.getByRole("combobox", { name: "Fallback for Review", exact: true }));
  await userEvent.click(
    screen.getByRole("option", { name: "Use normal T3 behaviour", exact: true }),
  );
  await userEvent.click(screen.getByRole("button", { name: "Save worker settings", exact: true }));

  expect(api.saveRouting).toHaveBeenLastCalledWith({
    routing: {
      roleRoutes: [
        {
          role: "review",
          candidates: [
            { providerInstanceId: ProviderInstanceId.make("removed"), model: "old-model" },
          ],
          fallback: "inherit",
        },
      ],
    },
    expectedRevision: 2,
  });
  await expect.element(screen.getByText("Currently unavailable", { exact: true })).toBeVisible();
});

it("preserves a conflicting draft until the user reloads the latest worker settings", async () => {
  const { api, state } = setup({
    projectId: project.id,
    routing: {
      roleRoutes: [
        {
          role: "review",
          candidates: [
            { providerInstanceId: ProviderInstanceId.make("codex"), model: "gpt-6-astra" },
          ],
          fallback: "continue",
        },
      ],
    },
    revision: 1,
    createdAt: time,
    updatedAt: time,
  });
  await using screen = await render(panel());
  await userEvent.click(screen.getByRole("combobox", { name: "Fallback for Review", exact: true }));
  await userEvent.click(
    screen.getByRole("option", { name: "Fail instead of using another worker", exact: true }),
  );
  state.saveConflict = true;
  await userEvent.click(screen.getByRole("button", { name: "Save worker settings", exact: true }));

  await expect
    .element(
      screen.getByText("These worker settings changed since you loaded them.", { exact: false }),
    )
    .toBeVisible();
  await expect
    .element(screen.getByRole("button", { name: "Save worker settings", exact: true }))
    .toBeDisabled();
  expect(api.saveRouting).toHaveBeenCalledTimes(1);

  state.routing = {
    ...state.routing!,
    routing: {
      roleRoutes: [
        {
          role: "test",
          candidates: [
            { providerInstanceId: ProviderInstanceId.make("claude"), model: "claude-fable-5-1" },
          ],
          fallback: "inherit",
        },
      ],
    },
    revision: 2,
  };
  await userEvent.click(
    screen.getByRole("button", { name: "Reload latest worker settings", exact: true }),
  );
  await expect
    .element(screen.getByText("Project override · Revision 2", { exact: true }))
    .toBeVisible();
  await expect
    .element(screen.getByRole("combobox", { name: "Fallback for Test", exact: true }))
    .toBeVisible();
  await expect
    .element(screen.getByRole("combobox", { name: "Fallback for Review", exact: true }))
    .not.toBeInTheDocument();
});

it("shows loading before worker settings arrive", async () => {
  const { state } = setup();
  let release!: () => void;
  state.readGate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await using screen = await render(panel());
  await expect.element(screen.getByText("Loading worker settings…", { exact: true })).toBeVisible();
  release();
  await expect.element(screen.getByText("Never saved · Revision 0", { exact: true })).toBeVisible();
});

it("recovers a failed worker settings read through the reload action", async () => {
  const { state } = setup();
  state.readFailure = 1;
  await using screen = await render(panel());
  await expect
    .element(screen.getByText("Could not read worker settings.", { exact: true }))
    .toBeVisible();
  await expect
    .element(screen.getByRole("button", { name: "Reload worker settings", exact: true }))
    .toBeVisible();
  await userEvent.click(
    screen.getByRole("button", { name: "Reload worker settings", exact: true }),
  );
  await expect.element(screen.getByText("Never saved · Revision 0", { exact: true })).toBeVisible();
});

it("keeps an unsaved draft across a reconnect instead of reloading over it", async () => {
  const { api } = setup();
  await using screen = await render(panel());
  await userEvent.click(
    screen.getByRole("combobox", {
      name: "Add a worker role to project-worker:project-1",
      exact: true,
    }),
  );
  await userEvent.click(screen.getByRole("option", { name: "Review", exact: true }));
  await expect
    .element(screen.getByText("Project override · Revision 1", { exact: true }))
    .not.toBeInTheDocument();
  await expect.element(screen.getByText("Unsaved changes", { exact: false })).toBeVisible();

  api.ready = false;
  await screen.rerender(panel());
  api.ready = true;
  await screen.rerender(panel());

  await expect
    .element(screen.getByRole("combobox", { name: "Fallback for Review", exact: true }))
    .toBeVisible();
  await expect.element(screen.getByText("Unsaved changes", { exact: false })).toBeVisible();
  expect(api.readRouting).toHaveBeenCalledTimes(1);
});

it("retries initialization after a StrictMode effect replay", async () => {
  const { api } = setup();
  await using screen = await render(
    <StrictMode>
      <ProjectWorkerPreferencesSettings members={[project]} />
    </StrictMode>,
  );
  await expect.element(screen.getByText("Never saved · Revision 0", { exact: true })).toBeVisible();
  expect(api.readRouting.mock.calls.length).toBeGreaterThanOrEqual(1);
});

it("finishes effective choices when resolution outlives the routing read render", async () => {
  const { state } = setup();
  let release!: () => void;
  state.resolveGate = new Promise<void>((resolve) => {
    release = () => {
      state.resolveGate = null;
      resolve();
    };
  });
  await using screen = await render(panel());
  await expect.element(screen.getByText("Never saved · Revision 0", { exact: true })).toBeVisible();
  await expect
    .element(screen.getByText("Checking effective worker choices…", { exact: true }))
    .toBeVisible();
  release();
  await expect
    .element(screen.getByText("Effective worker choice: Project setting", { exact: true }))
    .toBeVisible();
  await expect
    .element(screen.getByText("Checking effective worker choices…", { exact: true }))
    .not.toBeInTheDocument();
});

it("does not read or save worker settings for grouped projects", async () => {
  setup();
  await using screen = await render(
    <ProjectWorkerPreferencesSettings members={[project, otherProject]} />,
  );
  await expect
    .element(screen.getByText("Select one environment and checkout", { exact: false }))
    .toBeVisible();
  expect(mock.useApi).not.toHaveBeenCalled();
});
