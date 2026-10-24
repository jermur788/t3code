import { expect, it, vi } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";
import type { ReactNode } from "react";

import { render } from "../../../test/render";
import type { SidebarProjectGroupMember } from "../../sidebarProjectGrouping";

const mock = vi.hoisted(() => ({ useApi: vi.fn() }));

vi.mock("./useDevelopmentProfilesApi", () => ({
  useDevelopmentProfilesApi: mock.useApi,
}));
vi.mock("./settingsLayout", () => ({
  SettingsSection: ({ children, title }: { children: ReactNode; title: string }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
}));

import { DevelopmentProfilesProjectSettings } from "./DevelopmentProfilesProjectSettings";

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

const releaseProfile = {
  profileId: "profile-1",
  name: "Release guidance",
  instructions: "Release profile instructions",
  revision: 2,
  createdAt: time,
  updatedAt: time,
  createdBy: "user:maintainer",
  updatedBy: "user:maintainer",
};
const reviewProfile = {
  profileId: "profile-2",
  name: "Review guidance",
  instructions: "Review profile instructions",
  revision: 4,
  createdAt: time,
  updatedAt: time,
  createdBy: "user:maintainer",
  updatedBy: "user:maintainer",
};

interface Assignment {
  projectId: string;
  profileId: string | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

const ok = <T,>(value: T) => ({ ok: true as const, value });

function setup(initialAssignment: Assignment | null = null) {
  const state = {
    assignment: initialAssignment === null ? null : { ...initialAssignment },
    projectInstructions: {
      projectId: project.id,
      instructions: "Project-owned instructions",
      revision: 1,
      updatedAt: time,
      updatedBy: "user:maintainer",
    },
    resolveFailures: 0,
    listGate: null as Promise<void> | null,
  };

  const effective = () => {
    const assignedProfile =
      state.assignment?.profileId === releaseProfile.profileId
        ? releaseProfile
        : state.assignment?.profileId === reviewProfile.profileId
          ? reviewProfile
          : null;
    return {
      projectId: project.id,
      assignment: state.assignment,
      developmentProfile: assignedProfile,
      projectInstructions: state.projectInstructions,
      precedence: "development_profile_then_project",
      formattedInstructions: assignedProfile
        ? `${assignedProfile.instructions}\n\n${state.projectInstructions.instructions}`
        : state.projectInstructions.instructions,
    };
  };

  mock.useApi.mockReset();
  const api = {
    ready: true,
    canEdit: true,
    canAssign: true,
    list: vi.fn(async () => {
      if (state.listGate !== null) await state.listGate;
      return ok([releaseProfile, reviewProfile]);
    }),
    read: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    listProjects: vi.fn(),
    getAssignment: vi.fn(async () => ok(state.assignment)),
    setAssignment: vi.fn(
      async (input: { projectId: string; profileId: string | null; expectedRevision: number }) => {
        if (input.expectedRevision !== (state.assignment?.revision ?? 0)) {
          return {
            ok: false as const,
            message: "This assignment changed. Reload the latest assignment before saving again.",
            conflict: true,
            inUse: false,
          };
        }
        state.assignment = {
          projectId: input.projectId,
          profileId: input.profileId,
          revision: (state.assignment?.revision ?? 0) + 1,
          createdAt: state.assignment?.createdAt ?? time,
          updatedAt: time,
        };
        return ok({ ...state.assignment });
      },
    ),
    resolve: vi.fn(async () => {
      if (state.resolveFailures > 0) {
        state.resolveFailures -= 1;
        return {
          ok: false as const,
          message: "Effective instructions could not be loaded.",
          conflict: false,
          inUse: false,
        };
      }
      return ok(effective());
    }),
  };
  mock.useApi.mockImplementation(() => api);
  return { api, state };
}

const panel = () => <DevelopmentProfilesProjectSettings members={[project]} />;

it("assigns and unassigns one concrete project while inspecting separate instruction layers", async () => {
  const { api } = setup();
  await using screen = await render(panel());
  await expect
    .element(screen.getByRole("combobox", { name: "Assigned Development Profile", exact: true }))
    .toBeVisible();
  await expect
    .element(screen.getByText("Never assigned · Revision 0", { exact: true }))
    .toBeVisible();
  await expect
    .element(screen.getByText("Project-owned instructions", { exact: true }).first())
    .toBeVisible();
  await expect
    .element(screen.getByText("Precedence: development_profile_then_project", { exact: true }))
    .toBeVisible();

  await userEvent.click(
    screen.getByRole("combobox", { name: "Assigned Development Profile", exact: true }),
  );
  await userEvent.click(screen.getByRole("option", { name: "Release guidance", exact: true }));
  await userEvent.click(screen.getByRole("button", { name: "Save assignment", exact: true }));
  expect(api.setAssignment).toHaveBeenLastCalledWith({
    projectId: project.id,
    profileId: releaseProfile.profileId,
    expectedRevision: 0,
  });
  await expect
    .element(screen.getByText("Revision 1 · Release guidance", { exact: true }))
    .toBeVisible();
  await expect
    .element(screen.getByText("Release profile instructions", { exact: true }).first())
    .toBeVisible();
  await expect
    .element(screen.getByText("Project-owned instructions", { exact: true }).first())
    .toBeVisible();
  await userEvent.click(
    screen.getByText("Combined effective instructions preview", { exact: true }),
  );
  await expect
    .element(
      screen.getByText("Read-only composition. T3 Code does not save a merged copy.", {
        exact: true,
      }),
    )
    .toBeVisible();

  await userEvent.click(
    screen.getByRole("combobox", { name: "Assigned Development Profile", exact: true }),
  );
  await userEvent.click(screen.getByRole("option", { name: "None", exact: true }));
  await userEvent.click(screen.getByRole("button", { name: "Save assignment", exact: true }));
  expect(api.setAssignment).toHaveBeenLastCalledWith({
    projectId: project.id,
    profileId: null,
    expectedRevision: 1,
  });
  await expect.element(screen.getByText("Revision 2 · None", { exact: true })).toBeVisible();
  await expect
    .element(screen.getByText("No profile instructions are inherited.", { exact: true }))
    .toBeVisible();
  await expect
    .element(screen.getByText("Project-owned instructions", { exact: true }).first())
    .toBeVisible();
});

it("shows loading instead of unavailable while the initial assignment load is pending", async () => {
  const { state } = setup();
  let releaseList!: () => void;
  state.listGate = new Promise<void>((resolve) => {
    releaseList = resolve;
  });
  await using screen = await render(panel());
  await expect
    .element(screen.getByText("Loading Development Profiles…", { exact: true }))
    .toBeVisible();
  await expect
    .element(screen.getByText("Loading effective instructions…", { exact: true }))
    .toBeVisible();
  await expect
    .element(screen.getByText("Effective instructions are unavailable.", { exact: false }))
    .not.toBeInTheDocument();

  releaseList();
  await expect
    .element(screen.getByText("Project-owned instructions", { exact: true }).first())
    .toBeVisible();
  await expect
    .element(screen.getByText("Effective instructions are unavailable.", { exact: false }))
    .not.toBeInTheDocument();
});

it("does not read or assign profiles for grouped projects", async () => {
  setup();
  await using screen = await render(
    <DevelopmentProfilesProjectSettings members={[project, otherProject]} />,
  );
  await expect
    .element(screen.getByText("Select one environment and checkout", { exact: false }))
    .toBeVisible();
  expect(mock.useApi).not.toHaveBeenCalled();
});

it("rejects a stale assignment revision, keeps the selection, and recovers only through reload", async () => {
  const { api, state } = setup({
    projectId: project.id,
    profileId: releaseProfile.profileId,
    revision: 1,
    createdAt: time,
    updatedAt: time,
  });
  await using screen = await render(panel());
  const select = screen.getByRole("combobox", {
    name: "Assigned Development Profile",
    exact: true,
  });
  const save = screen.getByRole("button", { name: "Save assignment", exact: true });
  await expect
    .element(screen.getByText("Revision 1 · Release guidance", { exact: true }))
    .toBeVisible();

  state.assignment = {
    projectId: project.id,
    profileId: reviewProfile.profileId,
    revision: 2,
    createdAt: time,
    updatedAt: time,
  };

  await userEvent.click(select);
  await userEvent.click(screen.getByRole("option", { name: "None", exact: true }));
  await userEvent.click(save);

  await expect
    .element(screen.getByText("This assignment changed.", { exact: false }))
    .toBeVisible();
  expect(api.setAssignment).toHaveBeenCalledTimes(1);
  expect(api.setAssignment).toHaveBeenLastCalledWith({
    projectId: project.id,
    profileId: null,
    expectedRevision: 1,
  });
  await expect.element(save).toBeDisabled();
  expect(select.element().textContent).toContain("None");

  await userEvent.click(select);
  await userEvent.click(screen.getByRole("option", { name: "Review guidance", exact: true }));
  await expect
    .element(screen.getByText("This assignment changed.", { exact: false }))
    .toBeVisible();
  await expect.element(save).toBeDisabled();
  expect(api.setAssignment).toHaveBeenCalledTimes(1);

  await userEvent.click(screen.getByRole("button", { name: "Reload latest", exact: true }));
  await expect
    .element(screen.getByText("Revision 2 · Review guidance", { exact: true }))
    .toBeVisible();
  expect(select.element().textContent).toContain("Review guidance");
  await expect.element(save).toBeDisabled();

  await userEvent.click(select);
  await userEvent.click(screen.getByRole("option", { name: "None", exact: true }));
  await expect.element(save).toBeEnabled();
  await userEvent.click(save);
  expect(api.setAssignment).toHaveBeenLastCalledWith({
    projectId: project.id,
    profileId: null,
    expectedRevision: 2,
  });
  await expect.element(screen.getByText("Revision 3 · None", { exact: true })).toBeVisible();
  expect(api.setAssignment).toHaveBeenCalledTimes(2);
});

it("refreshes effective instructions when the Runtime layer changes below", async () => {
  const { api, state } = setup();
  await using screen = await render(panel());
  await expect
    .element(screen.getByText("Project-owned instructions", { exact: true }).first())
    .toBeVisible();

  state.projectInstructions = {
    ...state.projectInstructions,
    instructions: "Updated project instructions",
    revision: 2,
  };
  await userEvent.click(
    screen.getByRole("button", { name: "Refresh effective instructions", exact: true }),
  );
  await expect
    .element(screen.getByText("Updated project instructions", { exact: true }).first())
    .toBeVisible();
  expect(api.setAssignment).not.toHaveBeenCalled();
});

it("recovers from an effective instructions failure with the refresh action", async () => {
  const { state } = setup();
  state.resolveFailures = 1;
  await using screen = await render(panel());
  await expect
    .element(screen.getByText("Effective instructions could not be loaded.", { exact: false }))
    .toBeVisible();

  await userEvent.click(
    screen.getByRole("button", { name: "Refresh effective instructions", exact: true }),
  );
  await expect
    .element(screen.getByText("Project-owned instructions", { exact: true }).first())
    .toBeVisible();
  await expect
    .element(screen.getByText("Effective instructions could not be loaded.", { exact: false }))
    .not.toBeInTheDocument();
});
