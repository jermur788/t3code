import { expect, it, vi } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";
import {
  DevelopmentProfileId,
  ProjectId,
  ProjectRuntimeHandoffId,
  ProjectRuntimeSourceId,
  ProjectRuntimeTaskId,
  type EffectiveProjectInstructions,
  type ProjectRuntimeHandoff,
  type ProjectRuntimeInstructions,
  type ProjectRuntimeSource,
  type ProjectRuntimeStatus,
  type ProjectRuntimeTask,
} from "@t3tools/contracts";

import { render } from "../../../test/render";
import type {
  SidebarProjectGroupMember,
  SidebarProjectSnapshot,
} from "../../sidebarProjectGrouping";
import type { ForkSection } from "./forkHome.logic";
import type { ForkRuntimeData } from "./useForkHomeData";

const mock = vi.hoisted(() => ({
  groups: vi.fn(),
  environments: vi.fn(),
  runtime: vi.fn(),
  profile: vi.fn(),
  handleNewThread: vi.fn(),
  openPalette: vi.fn(),
  projectSnapshotsReady: vi.fn(),
}));

vi.mock("../settings/useSettingsProjectGroups", () => ({
  useSettingsProjectGroups: mock.groups,
}));
vi.mock("../../state/environments", () => ({ useEnvironments: mock.environments }));
vi.mock("../../state/entities", () => ({
  useAllEnvironmentProjectSnapshotsReady: mock.projectSnapshotsReady,
}));
vi.mock("../../hooks/useHandleNewThread", () => ({
  useNewThreadHandler: () => mock.handleNewThread,
}));
vi.mock("../../commandPaletteBus", () => ({ openCommandPalette: mock.openPalette }));
vi.mock("./useForkHomeData", () => ({
  useForkHomeRuntime: mock.runtime,
  useForkHomeProfile: mock.profile,
}));

import { ForkHome } from "./ForkHome";

const time = "2026-10-24T12:00:00.000Z";

const member: SidebarProjectGroupMember = {
  id: ProjectId.make("project"),
  environmentId: "local",
  title: "T3 Code",
  workspaceRoot: "/workspace/t3code",
  scripts: [],
  createdAt: time,
  updatedAt: time,
  physicalProjectKey: "local:project",
  environmentLabel: "This machine",
} as unknown as SidebarProjectGroupMember;

const group: SidebarProjectSnapshot = {
  projectKey: "t3code",
  displayName: "T3 Code",
  updatedAt: time,
  memberProjects: [member],
  memberProjectRefs: [{ environmentId: "local", projectId: member.id }],
} as unknown as SidebarProjectSnapshot;

const instructions: ProjectRuntimeInstructions = {
  projectId: member.id,
  instructions: "Saved project guidance for every provider.",
  revision: 3,
  updatedAt: time,
  updatedBy: "user:maintainer",
};

const source: ProjectRuntimeSource = {
  sourceId: ProjectRuntimeSourceId.make("source"),
  projectId: member.id,
  title: "Architecture notes",
  role: "authority",
  relativePath: "docs/architecture.md",
  enabled: true,
  revision: 1,
  createdAt: time,
  updatedAt: time,
  createdBy: "user:maintainer",
  updatedBy: "user:maintainer",
};

const task: ProjectRuntimeTask = {
  taskId: ProjectRuntimeTaskId.make("task"),
  projectId: member.id,
  title: "Finish the fork home",
  owner: "user:maintainer",
  status: "active",
  scope: "Project Runtime entry surface",
  acceptanceCriteria: [
    { id: "c1", text: "A reviewer can inspect the project before entering a thread." },
  ],
  blocker: null,
  verification: { milestone: "none", evidence: [] },
  latestHandoffId: null,
  nextAction: "Run the focused checks",
  revision: 2,
  createdAt: time,
  updatedAt: time,
  createdBy: "user:maintainer",
  updatedBy: "user:maintainer",
};

const handoff: ProjectRuntimeHandoff = {
  handoffId: ProjectRuntimeHandoffId.make("handoff"),
  projectId: member.id,
  taskId: task.taskId,
  checkpoint: "cp-0042",
  summary: "Home route and project summaries are in place.",
  filesChanged: [],
  verification: { milestone: "none", evidence: [] },
  runtimeRevision: 4,
  taskRevision: 2,
  createdAt: time,
  createdBy: "user:maintainer",
};

const effective: EffectiveProjectInstructions = {
  projectId: member.id,
  assignment: null,
  developmentProfile: {
    profileId: DevelopmentProfileId.make("profile"),
    name: "Shared engineering policy",
    instructions: "Use the shared policy.",
    revision: 1,
    createdAt: time,
    updatedAt: time,
    createdBy: "user:maintainer",
    updatedBy: "user:maintainer",
  },
  projectInstructions: instructions,
  precedence: "host rules/user > project > profile > source data",
  formattedInstructions: "Shared policy and project guidance.",
};

const ready = <T,>(value: T): ForkSection<T> => ({ status: "ready", value });
const unavailable = (message: string): ForkSection<never> => ({
  status: "unavailable",
  message,
});

function runtimeData(overrides: Partial<ForkRuntimeData> = {}): ForkRuntimeData {
  return {
    status: ready({ enabled: true, version: 1, revision: 4 }),
    instructions: ready(instructions),
    sources: ready({ sources: [{ source, health: "available" }], nextCursor: null }),
    tasks: ready({ tasks: [task], nextCursor: null }),
    handoffs: ready({ handoffs: [handoff], nextCursor: null }),
    ...overrides,
  };
}

function setup(data: ForkRuntimeData = runtimeData()) {
  mock.groups.mockReturnValue([group]);
  mock.projectSnapshotsReady.mockReturnValue(true);
  mock.environments.mockReturnValue({
    environments: [{ environmentId: "local", label: "This machine" }],
  });
  mock.runtime.mockReturnValue({ data, reload: vi.fn() });
  mock.profile.mockReturnValue({ data: ready(effective), reload: vi.fn() });
  mock.handleNewThread.mockResolvedValue({ draftId: "draft", threadId: "thread" });
}

it("shows fork identity, project identity, profile, and durable runtime summaries", async () => {
  setup();
  await using screen = await render(<ForkHome search={{}} onSearchChange={vi.fn()} />, {
    router: "/home",
  });

  await expect.element(screen.getByText("Fork", { exact: true }).first()).toBeVisible();
  await expect.element(screen.getByText("Project Runtime home").first()).toBeVisible();
  await expect.element(screen.getByRole("heading", { name: "T3 Code" })).toBeVisible();
  const projectSelect = screen.getByRole("combobox", { name: "Project", exact: true });
  await expect.element(projectSelect).toBeVisible();
  expect(projectSelect.element().textContent).toContain("T3 Code · This machine");
  await expect.element(screen.getByText("/workspace/t3code", { exact: false })).toBeVisible();
  await expect.element(screen.getByText("Shared engineering policy")).toBeVisible();
  await expect.element(screen.getByText("Active").first()).toBeVisible();
  await expect.element(screen.getByText("Saved project guidance", { exact: false })).toBeVisible();
  await expect.element(screen.getByText("1 enabled of 1 registered")).toBeVisible();
  await expect
    .element(screen.getByText("Finish the fork home", { exact: false }).first())
    .toBeVisible();
  await expect
    .element(screen.getByText("Home route and project summaries are in place."))
    .toBeVisible();
  await expect.element(screen.getByRole("button", { name: "Start a thread" })).toBeVisible();
});

it.each([
  ["Open instructions", "project-runtime-instructions"],
  ["Open sources", "project-runtime-sources"],
  ["Open Runtime state", "project-runtime-state"],
  ["Open tasks and handoffs", "project-runtime-tasks"],
])("navigates %s to its own scoped settings target", async (name, target) => {
  setup();
  await using screen = await render(<ForkHome search={{}} onSearchChange={vi.fn()} />, {
    router: "/home",
  });

  await userEvent.click(screen.getByRole("link", { name, exact: true }));
  await vi.waitFor(() => {
    expect(screen.router?.state.location.pathname).toBe("/settings/projects");
    expect(screen.router?.state.location.hash).toBe(target);
    expect(screen.router?.state.location.search).toEqual({
      project: group.projectKey,
      machine: member.environmentId,
      checkout: member.physicalProjectKey,
    });
  });
});

it("offers the classic upstream home without making it primary", async () => {
  setup();
  await using screen = await render(<ForkHome search={{}} onSearchChange={vi.fn()} />, {
    router: "/home",
  });

  const classic = screen.getByRole("link", { name: "Classic T3 Home" });
  await expect.element(classic).toBeVisible();
  expect(classic.element().getAttribute("href")).toBe("/?classic=1");
});

it("starts a thread through the existing project-scoped workflow", async () => {
  setup();
  await using screen = await render(<ForkHome search={{}} onSearchChange={vi.fn()} />, {
    router: "/home",
  });

  await userEvent.click(screen.getByRole("button", { name: "Start a thread" }));
  expect(mock.handleNewThread).toHaveBeenCalledWith({
    environmentId: "local",
    projectId: member.id,
  });
});

it("shows an explicit empty state when no durable project exists", async () => {
  setup();
  mock.groups.mockReturnValue([]);
  await using screen = await render(<ForkHome search={{}} onSearchChange={vi.fn()} />, {
    router: "/home",
  });

  await expect.element(screen.getByText("No project configured")).toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: "Add project" }));
  expect(mock.openPalette).toHaveBeenCalledWith({ open: "add-project" });
});

it("shows blocker, owner, verification, next action, and the pointed handoff on a task card", async () => {
  const blocked: ProjectRuntimeTask = {
    ...task,
    status: "blocked",
    owner: "user:owner",
    blocker: {
      classification: "integration-conflict",
      summary: "Waiting on an upstream tag",
      createdAt: time,
    },
    verification: { milestone: "static-pass", evidence: [] },
    latestHandoffId: handoff.handoffId,
    nextAction: "Retry after the upstream release",
  };
  setup(
    runtimeData({
      tasks: ready({ tasks: [blocked], nextCursor: null }),
    }),
  );
  await using screen = await render(<ForkHome search={{}} onSearchChange={vi.fn()} />, {
    router: "/home",
  });

  await expect.element(screen.getByText("Finish the fork home", { exact: true })).toBeVisible();
  await expect
    .element(screen.getByText("Owner user:owner · Verification static-pass", { exact: true }))
    .toBeVisible();
  await expect
    .element(screen.getByText("Blocker: Waiting on an upstream tag", { exact: true }))
    .toBeVisible();
  await expect
    .element(screen.getByText("Next: Retry after the upstream release", { exact: true }))
    .toBeVisible();
  await expect
    .element(
      screen.getByText("Latest handoff: Home route and project summaries are in place.", {
        exact: true,
      }),
    )
    .toBeVisible();
});

it("omits a blocker line when the task has no blocker", async () => {
  setup();
  await using screen = await render(<ForkHome search={{}} onSearchChange={vi.fn()} />, {
    router: "/home",
  });

  await expect
    .element(screen.getByText("Owner user:maintainer · Verification none", { exact: true }))
    .toBeVisible();
  await expect.element(screen.getByText("Blocker:", { exact: false })).not.toBeInTheDocument();
});

it("keeps available sections visible when one Runtime section fails", async () => {
  setup(
    runtimeData({
      sources: unavailable("Sources are temporarily unavailable."),
      tasks: unavailable("Project State is temporarily unavailable."),
    }),
  );
  await using screen = await render(<ForkHome search={{}} onSearchChange={vi.fn()} />, {
    router: "/home",
  });

  await expect.element(screen.getByText("Sources are temporarily unavailable.")).toBeVisible();
  await expect
    .element(screen.getByText("Project State is temporarily unavailable.").first())
    .toBeVisible();
  await expect.element(screen.getByText("Saved project guidance", { exact: false })).toBeVisible();
  await expect
    .element(screen.getByText("Home route and project summaries are in place."))
    .toBeVisible();
  await expect.element(screen.getByRole("button", { name: "Retry" }).first()).toBeVisible();
});

it("keeps the Development Profile visible and marks Runtime areas disabled", async () => {
  const status: ForkSection<ProjectRuntimeStatus> = ready({
    enabled: false,
    version: 1,
    revision: 4,
  });
  setup(
    runtimeData({
      status,
      instructions: unavailable("Runtime is disabled."),
      sources: unavailable("Runtime is disabled."),
      tasks: unavailable("Runtime is disabled."),
      handoffs: unavailable("Runtime is disabled."),
    }),
  );
  await using screen = await render(<ForkHome search={{}} onSearchChange={vi.fn()} />, {
    router: "/home",
  });

  await expect.element(screen.getByText("Project Runtime is disabled")).toBeVisible();
  await expect.element(screen.getByText("Shared engineering policy")).toBeVisible();
  await expect
    .element(screen.getByText("Project Runtime is disabled. Enable it", { exact: false }).first())
    .toBeVisible();
  for (const name of [
    "Open instructions",
    "Open sources",
    "Open Runtime state",
    "Open tasks and handoffs",
  ]) {
    await expect.element(screen.getByRole("link", { name, exact: true })).not.toBeInTheDocument();
  }
  await userEvent.click(screen.getByRole("link", { name: "Enable Runtime", exact: true }));
  await vi.waitFor(() => expect(screen.router?.state.location.hash).toBe("project-runtime"));
});

it("does not silently replace an unavailable project selection", async () => {
  setup();
  await using screen = await render(
    <ForkHome search={{ project: "missing" }} onSearchChange={vi.fn()} />,
    { router: "/home" },
  );

  await expect.element(screen.getByText("Project unavailable")).toBeVisible();
  await expect.element(screen.getByText("This project is no longer available.")).toBeVisible();
});
