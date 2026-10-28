import { expect, it, vi } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";
import type { ReactNode } from "react";

import { render } from "../../../test/render";

const mock = vi.hoisted(() => ({ useApi: vi.fn() }));

vi.mock("./useDevelopmentProfilesApi", () => ({
  useDevelopmentProfilesApi: mock.useApi,
}));
vi.mock("./SettingsScopeContext", () => ({
  useSettingsScope: () => ({
    environment: { environmentId: "env", label: "Build workstation" },
  }),
}));
vi.mock("./settingsLayout", () => ({
  SettingsPageContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SettingsSection: ({ children, title }: { children: ReactNode; title: string }) => (
    <section>
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
    ],
    modelOptionsByInstance: new Map([
      ["codex", [{ slug: "gpt-6-astra", name: "GPT-6 Astra", isCustom: false }]],
    ]),
  }),
}));

import { DevelopmentProfilesSettings } from "./DevelopmentProfilesSettings";

const time = "2026-10-24T12:00:00.000Z";

interface Profile {
  profileId: string;
  name: string;
  instructions: string;
  routing: { roleRoutes: ReadonlyArray<unknown> };
  revision: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

interface Project {
  projectId: string;
  name: string;
}

const ok = <T,>(value: T) => ({ ok: true as const, value });
const conflict = () => ({
  ok: false as const,
  message:
    "This profile changed since you loaded it. Your draft is kept until you choose Discard draft and reload latest.",
  conflict: true,
  inUse: false,
});
const inUse = (projects: readonly Project[] = []) => ({
  ok: false as const,
  message:
    projects.length > 0
      ? `This profile is assigned to ${projects.map((project) => project.name).join(", ")}. Remove those assignments before deleting it.`
      : "This profile is assigned to a project.",
  conflict: false,
  inUse: true,
});

const profile = (overrides: Partial<Profile> = {}): Profile => ({
  profileId: "profile-1",
  name: "Release guidance",
  instructions: "Run focused checks before release.",
  routing: { roleRoutes: [] },
  revision: 1,
  createdAt: time,
  updatedAt: time,
  createdBy: "user:maintainer",
  updatedBy: "user:maintainer",
  ...overrides,
});

const panel = () => <DevelopmentProfilesSettings />;

function setup(seed: { profile: Profile; projects?: Project[] }[] = []) {
  const projects: Record<string, Project[]> = {};
  for (const entry of seed) {
    projects[entry.profile.profileId] = (entry.projects ?? []).map((project) => ({ ...project }));
  }
  const state = {
    profiles: seed.map((entry) => ({ ...entry.profile })),
    projects,
    conflictOnUpdate: false,
    listFailures: 0,
    listProjectsFailures: 0,
    nextId: seed.length + 1,
  };

  const findProfile = (profileId: string) =>
    state.profiles.find((candidate) => candidate.profileId === profileId);

  mock.useApi.mockReset();
  const api = {
    ready: true,
    canEdit: true,
    canAssign: true,
    list: vi.fn(async () => {
      if (state.listFailures > 0) {
        state.listFailures -= 1;
        return {
          ok: false as const,
          message: "Could not load profiles.",
          conflict: false,
          inUse: false,
        };
      }
      return ok(state.profiles.map((candidate) => ({ ...candidate })));
    }),
    read: vi.fn(async (profileId: string) => {
      const found = findProfile(profileId);
      return found
        ? ok({ ...found })
        : { ok: false as const, message: "Missing", conflict: false, inUse: false };
    }),
    create: vi.fn(
      async (input: { name: string; instructions: string; routing: Profile["routing"] }) => {
        const created: Profile = {
          profileId: `profile-${state.nextId++}`,
          name: input.name,
          instructions: input.instructions,
          routing: input.routing,
          revision: 1,
          createdAt: time,
          updatedAt: time,
          createdBy: "user:maintainer",
          updatedBy: "user:maintainer",
        };
        state.profiles.push(created);
        state.projects[created.profileId] = [];
        return ok({ ...created });
      },
    ),
    update: vi.fn(
      async (input: {
        profileId: string;
        name: string;
        instructions: string;
        routing: Profile["routing"];
        expectedRevision: number;
      }) => {
        const current = findProfile(input.profileId);
        if (!current) {
          return { ok: false as const, message: "Missing", conflict: false, inUse: false };
        }
        if (state.conflictOnUpdate) {
          state.conflictOnUpdate = false;
          const newer: Profile = {
            ...current,
            name: "Server renamed profile",
            instructions: "Server instructions",
            routing: current.routing,
            revision: current.revision + 1,
          };
          state.profiles = state.profiles.map((candidate) =>
            candidate.profileId === newer.profileId ? newer : candidate,
          );
          return conflict();
        }
        if (current.revision !== input.expectedRevision) return conflict();
        const updated: Profile = {
          ...current,
          name: input.name,
          instructions: input.instructions,
          routing: input.routing,
          revision: current.revision + 1,
          updatedBy: "user:test",
        };
        state.profiles = state.profiles.map((candidate) =>
          candidate.profileId === updated.profileId ? updated : candidate,
        );
        return ok({ ...updated });
      },
    ),
    remove: vi.fn(async (input: { profileId: string; expectedRevision: number }) => {
      const current = findProfile(input.profileId);
      if (!current) {
        return { ok: false as const, message: "Missing", conflict: false, inUse: false };
      }
      const assigned = state.projects[input.profileId] ?? [];
      if (assigned.length > 0) return inUse(assigned);
      if (current.revision !== input.expectedRevision) return conflict();
      state.profiles = state.profiles.filter(
        (candidate) => candidate.profileId !== input.profileId,
      );
      delete state.projects[input.profileId];
      return ok(undefined);
    }),
    listProjects: vi.fn(async (profileId: string) => {
      if (state.listProjectsFailures > 0) {
        state.listProjectsFailures -= 1;
        return {
          ok: false as const,
          message: "Assignments could not be loaded.",
          conflict: false,
          inUse: false,
        };
      }
      return ok((state.projects[profileId] ?? []).map((project) => ({ ...project })));
    }),
    getAssignment: vi.fn(),
    setAssignment: vi.fn(),
    resolve: vi.fn(),
  };
  mock.useApi.mockImplementation(() => api);
  return { api, state };
}

it("creates and edits a profile, then reloads it after remounting", async () => {
  const { api } = setup();
  {
    await using screen = await render(panel());
    await expect
      .element(screen.getByText("No Development Profiles yet.", { exact: false }))
      .toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "New profile", exact: true }));
    await userEvent.type(
      screen.getByRole("textbox", { name: "Profile name", exact: true }),
      "Release guidance",
    );
    await userEvent.type(
      screen.getByRole("textbox", { name: "Profile instructions", exact: true }),
      "Run focused checks before release.",
    );
    await userEvent.click(screen.getByRole("button", { name: "Create profile", exact: true }));
    await expect
      .element(screen.getByRole("heading", { name: "Release guidance", exact: true }))
      .toBeVisible();
    expect(api.create).toHaveBeenCalledWith({
      name: "Release guidance",
      instructions: "Run focused checks before release.",
      routing: { roleRoutes: [] },
    });

    const instructions = screen.getByRole("textbox", {
      name: "Profile instructions",
      exact: true,
    });
    await userEvent.clear(instructions);
    await userEvent.type(instructions, "Updated release checks.");
    await userEvent.click(screen.getByRole("button", { name: "Save profile", exact: true }));
    await expect.element(screen.getByText("Revision 2 · Updated", { exact: false })).toBeVisible();
    expect(api.update).toHaveBeenCalledWith(
      expect.objectContaining({ expectedRevision: 1, instructions: "Updated release checks." }),
    );
  }

  await using remounted = await render(panel());
  await expect
    .element(remounted.getByRole("heading", { name: "Release guidance", exact: true }))
    .toBeVisible();
  await expect
    .element(remounted.getByRole("textbox", { name: "Profile instructions", exact: true }))
    .toHaveValue("Updated release checks.");
});

it("keeps a conflicting draft until the user explicitly discards it for the latest saved values", async () => {
  const { api, state } = setup([{ profile: profile() }]);
  await using screen = await render(panel());
  const name = screen.getByRole("textbox", { name: "Profile name", exact: true });
  const instructions = screen.getByRole("textbox", {
    name: "Profile instructions",
    exact: true,
  });
  await expect.element(instructions).toHaveValue("Run focused checks before release.");
  await userEvent.clear(instructions);
  await userEvent.type(instructions, "My local draft");
  state.conflictOnUpdate = true;
  await userEvent.click(screen.getByRole("button", { name: "Save profile", exact: true }));
  await expect
    .element(screen.getByText("This profile changed since you loaded it.", { exact: false }))
    .toBeVisible();
  await expect.element(instructions).toHaveValue("My local draft");
  await expect
    .element(screen.getByRole("button", { name: "Save profile", exact: true }))
    .toBeDisabled();

  await userEvent.type(instructions, " edited");
  await expect.element(instructions).toHaveValue("My local draft edited");
  await expect
    .element(screen.getByRole("button", { name: "Save profile", exact: true }))
    .toBeDisabled();
  await expect
    .element(screen.getByRole("button", { name: "Discard draft and reload latest", exact: true }))
    .toBeVisible();

  await userEvent.click(
    screen.getByRole("button", { name: "Discard draft and reload latest", exact: true }),
  );
  await expect.element(name).toHaveValue("Server renamed profile");
  await expect.element(instructions).toHaveValue("Server instructions");
  await expect
    .element(screen.getByRole("button", { name: "Save profile", exact: true }))
    .toBeDisabled();

  await userEvent.clear(instructions);
  await userEvent.type(instructions, "Server instructions plus my edit");
  await expect
    .element(screen.getByRole("button", { name: "Save profile", exact: true }))
    .toBeEnabled();
  await userEvent.click(screen.getByRole("button", { name: "Save profile", exact: true }));
  await expect.element(screen.getByText("Revision 3 · Updated", { exact: false })).toBeVisible();
  expect(api.update).toHaveBeenLastCalledWith(
    expect.objectContaining({
      expectedRevision: 2,
      name: "Server renamed profile",
      instructions: "Server instructions plus my edit",
    }),
  );
});

it.each([false, true])(
  "refreshes a clean editor to the latest saved profile (reverted draft: %s)",
  async (reverted) => {
    const { state } = setup([{ profile: profile() }]);
    await using screen = await render(panel());
    const instructions = screen.getByRole("textbox", {
      name: "Profile instructions",
      exact: true,
    });
    await expect.element(instructions).toHaveValue("Run focused checks before release.");
    if (reverted) {
      await userEvent.type(instructions, " draft");
      await userEvent.clear(instructions);
      await userEvent.type(instructions, "Run focused checks before release.");
    }

    state.profiles = state.profiles.map((candidate) =>
      candidate.profileId === "profile-1"
        ? {
            ...candidate,
            name: "Renamed elsewhere",
            instructions: "Edited elsewhere",
            revision: candidate.revision + 1,
            updatedBy: "user:other",
          }
        : candidate,
    );
    await userEvent.click(screen.getByRole("button", { name: "Refresh profiles", exact: true }));

    await expect
      .element(screen.getByRole("heading", { name: "Renamed elsewhere", exact: true }))
      .toBeVisible();
    await expect.element(screen.getByText("Revision 2 · Updated", { exact: false })).toBeVisible();
    await expect.element(instructions).toHaveValue("Edited elsewhere");
    await expect
      .element(screen.getByRole("button", { name: "Save profile", exact: true }))
      .toBeDisabled();
  },
);

it("deletes only an unused profile, keeps assigned profiles protected, and checks usage lazily", async () => {
  const { api } = setup([
    {
      profile: profile({ profileId: "used", name: "Used guidance" }),
      projects: [{ projectId: "project-1", name: "Storefront" }],
    },
    { profile: profile({ profileId: "unused", name: "Unused guidance" }) },
  ]);
  await using screen = await render(panel());
  await expect
    .element(screen.getByRole("button", { name: "Edit Used guidance", exact: true }))
    .toBeVisible();
  expect(api.listProjects).toHaveBeenCalledTimes(1);
  expect(api.listProjects).toHaveBeenCalledWith("used");

  await userEvent.click(screen.getByRole("button", { name: "Edit Used guidance", exact: true }));
  await expect.element(screen.getByText("Assigned to Storefront", { exact: true })).toBeVisible();
  await expect
    .element(screen.getByRole("button", { name: "Delete profile", exact: true }))
    .toBeDisabled();
  await expect
    .element(
      screen.getByText("Delete is unavailable until this profile is unassigned", {
        exact: false,
      }),
    )
    .toBeVisible();

  await userEvent.click(screen.getByRole("button", { name: "Edit Unused guidance", exact: true }));
  await expect.element(screen.getByText("Unused", { exact: true })).toBeVisible();
  const remove = screen.getByRole("button", { name: "Delete profile", exact: true });
  await expect.element(remove).toBeEnabled();
  await userEvent.click(remove);
  await expect
    .element(screen.getByText("Unused guidance", { exact: true }))
    .not.toBeInTheDocument();
  await expect
    .element(screen.getByRole("heading", { name: "Used guidance", exact: true }))
    .toBeVisible();
});

it("shows the projects reported when a delete loses a race with a new assignment", async () => {
  const { state } = setup([{ profile: profile() }]);
  await using screen = await render(panel());
  await expect.element(screen.getByText("Unused", { exact: true })).toBeVisible();

  state.projects["profile-1"] = [{ projectId: "project-9", name: "Storefront" }];
  const remove = screen.getByRole("button", { name: "Delete profile", exact: true });
  await userEvent.click(remove);
  await expect
    .element(
      screen.getByText("This profile is assigned to Storefront", {
        exact: false,
      }),
    )
    .toBeVisible();
  await expect
    .element(screen.getByRole("heading", { name: "Release guidance", exact: true }))
    .toBeVisible();
  await expect.element(screen.getByText("Assigned to Storefront", { exact: true })).toBeVisible();
  await expect.element(screen.getByText("Unused", { exact: true })).not.toBeInTheDocument();
  await expect.element(remove).toBeDisabled();
});

it("keeps delete disabled and offers a retry when the usage reload after an in-use delete fails", async () => {
  const { state } = setup([{ profile: profile() }]);
  await using screen = await render(panel());
  await expect.element(screen.getByText("Unused", { exact: true })).toBeVisible();

  state.projects["profile-1"] = [{ projectId: "project-9", name: "Storefront" }];
  state.listProjectsFailures = 1;
  const remove = screen.getByRole("button", { name: "Delete profile", exact: true });
  await userEvent.click(remove);
  await expect
    .element(screen.getByText("Assignments could not be loaded.", { exact: true }))
    .toBeVisible();
  await expect.element(screen.getByText("Assignments unavailable", { exact: true })).toBeVisible();
  await expect.element(screen.getByText("Unused", { exact: true })).not.toBeInTheDocument();
  await expect.element(remove).toBeDisabled();

  await userEvent.click(screen.getByRole("button", { name: "Retry assignments", exact: true }));
  await expect.element(screen.getByText("Assigned to Storefront", { exact: true })).toBeVisible();
  await expect
    .element(screen.getByText("Assignments could not be loaded.", { exact: true }))
    .not.toBeInTheDocument();
  await expect.element(remove).toBeDisabled();
});

it("recovers from a load failure and refreshes usage without discarding a dirty draft", async () => {
  const { api, state } = setup([
    {
      profile: profile(),
      projects: [{ projectId: "project-1", name: "Storefront" }],
    },
  ]);
  state.listFailures = 1;
  await using screen = await render(panel());
  await expect
    .element(screen.getByText("Could not load profiles.", { exact: false }))
    .toBeVisible();
  expect(api.listProjects).not.toHaveBeenCalled();

  await userEvent.click(screen.getByRole("button", { name: "Refresh profiles", exact: true }));
  await expect
    .element(screen.getByRole("heading", { name: "Release guidance", exact: true }))
    .toBeVisible();
  const instructions = screen.getByRole("textbox", {
    name: "Profile instructions",
    exact: true,
  });
  await expect.element(instructions).toHaveValue("Run focused checks before release.");
  await userEvent.clear(instructions);
  await userEvent.type(instructions, "Run focused checks before release. drafted");

  state.profiles = state.profiles.map((candidate) =>
    candidate.profileId === "profile-1"
      ? { ...candidate, name: "Renamed guidance", revision: candidate.revision + 1 }
      : candidate,
  );
  state.projects["profile-1"] = [
    { projectId: "project-1", name: "Storefront" },
    { projectId: "project-2", name: "Admin" },
  ];
  await userEvent.click(screen.getByRole("button", { name: "Refresh profiles", exact: true }));
  await expect.element(screen.getByText("Renamed guidance", { exact: true })).toBeVisible();
  await expect
    .element(screen.getByText("Assigned to Storefront, Admin", { exact: true }))
    .toBeVisible();
  await expect.element(instructions).toHaveValue("Run focused checks before release. drafted");
});

it("saves role worker preferences and keeps an unavailable saved worker visible", async () => {
  const { api } = setup([
    {
      profile: profile({
        routing: {
          roleRoutes: [
            {
              role: "review",
              candidates: [{ providerInstanceId: "removed", model: "old-model" }],
              fallback: "inherit",
            },
          ],
        },
      }),
    },
  ]);
  await using screen = await render(panel());
  await expect.element(screen.getByText("Currently unavailable", { exact: true })).toBeVisible();
  await expect
    .element(screen.getByText("Provider is no longer available.", { exact: false }))
    .toBeVisible();

  await userEvent.click(
    screen.getByRole("combobox", {
      name: "Add a worker role to profile-worker:profile-1",
      exact: true,
    }),
  );
  await userEvent.click(screen.getByRole("option", { name: "Implementation", exact: true }));
  await userEvent.click(screen.getByRole("button", { name: "Save profile", exact: true }));

  const update = api.update.mock.calls.at(-1)?.[0];
  if (update === undefined) throw new Error("Expected the profile update call.");
  expect(update).toMatchObject({ expectedRevision: 1 });
  expect(update.routing.roleRoutes).toHaveLength(2);
  expect(update.routing.roleRoutes[0]).toEqual({
    role: "review",
    candidates: [{ providerInstanceId: "removed", model: "old-model" }],
    fallback: "inherit",
  });
  expect(update.routing.roleRoutes[1]).toEqual({
    role: "implementation",
    candidates: [{ providerInstanceId: "codex", model: "gpt-6-astra" }],
    fallback: "inherit",
  });
});
