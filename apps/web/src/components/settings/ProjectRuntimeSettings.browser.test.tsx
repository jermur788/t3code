import { expect, it, vi } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";
import {
  EnvironmentId,
  ProjectId,
  ProjectRuntimeTaskId,
  ProjectRuntimeSourceId,
  ProjectRuntimeHandoffId,
  type ProjectRuntimeTask,
  type ProjectRuntimeSource,
  type ProjectRuntimeHandoff,
  type ProjectRuntimeInstructions,
  type ProjectRuntimeSourceHealth,
} from "@t3tools/contracts";
import type { ReactNode } from "react";
import { render } from "../../../test/render";
import type { SidebarProjectGroupMember } from "../../sidebarProjectGrouping";
import type { ProjectRuntimeApi, RuntimeResult } from "./useProjectRuntimeApi";

const mock = vi.hoisted(() => ({ useApi: vi.fn() }));
vi.mock("./useProjectRuntimeApi", () => ({ useProjectRuntimeApi: mock.useApi }));
vi.mock("./settingsLayout", () => ({
  SettingsSection: ({ children, title }: { children: ReactNode; title: string }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
}));
import { ProjectRuntimeSettings } from "./ProjectRuntimeSettings";

const time = "2026-10-23T12:00:00.000Z";
const a = {
  environmentId: EnvironmentId.make("local"),
  id: ProjectId.make("a"),
  workspaceRoot: "/workspace/a",
  environmentLabel: "Local",
} as SidebarProjectGroupMember;
const b = {
  ...a,
  environmentId: EnvironmentId.make("remote"),
  id: ProjectId.make("b"),
  workspaceRoot: "/workspace/b",
};
const ok = <T,>(value: T): RuntimeResult<T> => ({ ok: true, value });
function setup({ enabled = true, canEdit = true }: { enabled?: boolean; canEdit?: boolean } = {}) {
  mock.useApi.mockReset();
  const project = {
    enabled,
    instructions: {
      projectId: a.id,
      instructions: "Saved instructions",
      revision: 1,
      updatedAt: time,
      updatedBy: "user:maintainer",
    } as ProjectRuntimeInstructions | null,
    sources: [] as { source: ProjectRuntimeSource; health: ProjectRuntimeSourceHealth }[],
    tasks: [] as ProjectRuntimeTask[],
    handoffs: [] as ProjectRuntimeHandoff[],
    conflictInstructions: false,
    conflictTask: false,
  };
  const other = { instructions: "Project B remains unchanged" };
  const source: ProjectRuntimeSource = {
    sourceId: ProjectRuntimeSourceId.make("source"),
    projectId: a.id,
    title: "Reference",
    role: "reference",
    relativePath: "notes.md",
    enabled: true,
    revision: 1,
    createdAt: time,
    updatedAt: time,
    createdBy: "user:maintainer",
    updatedBy: "user:maintainer",
  };
  const task: ProjectRuntimeTask = {
    taskId: ProjectRuntimeTaskId.make("task"),
    projectId: a.id,
    title: "Review work",
    scope: "Scope",
    acceptanceCriteria: "Criteria",
    status: "active",
    revision: 1,
    createdAt: time,
    updatedAt: time,
    createdBy: "user:maintainer",
    updatedBy: "user:maintainer",
    worktreePath: "/metadata-only",
  };
  const conflict = () => ({
    ok: false as const,
    message: "This record changed. Your draft is preserved.",
    conflict: true,
  });
  const api: ProjectRuntimeApi = {
    ready: true,
    canEdit,
    status: vi.fn(async () => ok({ enabled: project.enabled, version: 1 as const, revision: 1 })),
    setEnabled: vi.fn(async (input) => {
      project.enabled = input.enabled;
      return ok({ enabled: input.enabled, version: 1 as const, revision: 2 });
    }),
    readInstructions: vi.fn(async () => ok(project.instructions)),
    saveInstructions: vi.fn(async (input) => {
      if (project.conflictInstructions) return conflict();
      project.instructions = {
        projectId: a.id,
        instructions: input.instructions,
        revision: (project.instructions?.revision ?? 0) + 1,
        updatedAt: time,
        updatedBy: "user:test",
      };
      return ok(project.instructions);
    }),
    listSources: vi.fn(async () => ok({ sources: [...project.sources], nextCursor: null })),
    createSource: vi.fn(async (input) => {
      const created = {
        ...source,
        ...input,
        sourceId: ProjectRuntimeSourceId.make("created-source"),
      };
      project.sources.push({ source: created, health: "missing" });
      return ok(created);
    }),
    updateSource: vi.fn(async (input) => {
      const entry = project.sources.find((x) => x.source.sourceId === input.sourceId)!;
      entry.source = {
        ...entry.source,
        ...input,
        authorityRank: input.authorityRank ?? undefined,
        description: input.description ?? undefined,
        revision: entry.source.revision + 1,
      };
      return ok(entry.source);
    }),
    removeSource: vi.fn(async (input) => {
      project.sources = project.sources.filter((x) => x.source.sourceId !== input.sourceId);
      return ok(undefined);
    }),
    listTasks: vi.fn(async () => ok({ tasks: [...project.tasks], nextCursor: null })),
    readTask: vi.fn(async () => ok({ ...task, title: "Newer server title", revision: 2 })),
    createTask: vi.fn(async (input) => {
      const created = { ...task, ...input };
      project.tasks.push(created);
      return ok(created);
    }),
    updateTask: vi.fn(async (input) => {
      if (project.conflictTask) return conflict();
      const updated = {
        ...task,
        ...input,
        nextAction: input.nextAction ?? undefined,
        branch: input.branch ?? undefined,
        worktreePath: input.worktreePath ?? undefined,
        baseSha: input.baseSha ?? undefined,
        revision: 2,
      };
      project.tasks = [updated];
      return ok(updated);
    }),
    listHandoffs: vi.fn(async () => ok({ handoffs: [...project.handoffs], nextCursor: null })),
    readHandoff: vi.fn(async () => ok(project.handoffs[0]!)),
  };
  mock.useApi.mockImplementation(() => api);
  return { api, project, other, source, task };
}

it("requires a concrete checkout without reading or mutating grouped projects", async () => {
  setup();
  await using screen = await render(<ProjectRuntimeSettings members={[a, b]} />);
  await expect
    .element(screen.getByText("Select one environment and checkout", { exact: false }))
    .toBeVisible();
  expect(mock.useApi).not.toHaveBeenCalled();
});
it("explicitly saves instructions only for the selected concrete project and preserves records across disable", async () => {
  const t = setup();
  await using screen = await render(<ProjectRuntimeSettings members={[a]} />);
  const editor = screen.getByRole("textbox", { name: "Instructions", exact: true });
  await expect.element(editor).toHaveValue("Saved instructions");
  await userEvent.clear(editor);
  await userEvent.type(editor, "New guidance");
  expect(t.api.saveInstructions).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", { name: "Save instructions", exact: true }));
  await expect.element(screen.getByText("Revision 2", { exact: false })).toBeVisible();
  expect(t.api.saveInstructions).toHaveBeenCalledWith({
    instructions: "New guidance",
    expectedRevision: 1,
  });
  expect(
    mock.useApi.mock.calls.every(
      ([target]) => target.environmentId === a.environmentId && target.projectId === a.id,
    ),
  ).toBe(true);
  expect(t.other.instructions).toBe("Project B remains unchanged");
  await userEvent.click(screen.getByRole("button", { name: "Disable Runtime", exact: true }));
  await expect.element(screen.getByText("Runtime disabled", { exact: true })).toBeVisible();
  await expect
    .element(screen.getByText("Runtime data is preserved", { exact: false }))
    .toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: "Enable Runtime", exact: true }));
  await expect
    .element(screen.getByRole("textbox", { name: "Instructions", exact: true }))
    .toHaveValue("New guidance");
});
it("preserves an instructions draft after a stale conflict and requires explicit reload", async () => {
  const t = setup();
  t.project.conflictInstructions = true;
  await using screen = await render(<ProjectRuntimeSettings members={[a]} />);
  const editor = screen.getByRole("textbox", { name: "Instructions", exact: true });
  await expect.element(editor).toBeVisible();
  await userEvent.clear(editor);
  await userEvent.type(editor, "My local draft");
  await userEvent.click(screen.getByRole("button", { name: "Save instructions", exact: true }));
  await expect
    .element(screen.getByText("This record changed. Your draft is preserved."))
    .toBeVisible();
  await expect.element(editor).toHaveValue("My local draft");
  await expect
    .element(screen.getByRole("button", { name: "Save instructions", exact: true }))
    .toBeDisabled();
  t.project.instructions = {
    ...t.project.instructions!,
    instructions: "New server instructions",
    revision: 2,
  };
  await userEvent.click(
    screen.getByRole("button", { name: "Discard draft and reload instructions" }),
  );
  await expect.element(editor).toHaveValue("New server instructions");
});
it("lists mixed source health, creates, edits, toggles and explicitly removes a registry record", async () => {
  const t = setup();
  t.project.sources = [
    { source: t.source, health: "available" },
    {
      source: {
        ...t.source,
        sourceId: ProjectRuntimeSourceId.make("binary"),
        title: "Binary",
        relativePath: "binary.txt",
        enabled: false,
      },
      health: "unsupported",
    },
  ];
  await using screen = await render(<ProjectRuntimeSettings members={[a]} />);
  await expect.element(screen.getByText("unsupported · disabled")).toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: "Add source", exact: true }));
  await userEvent.type(
    screen.getByRole("textbox", { name: "Source title", exact: true }),
    "Missing notes",
  );
  await userEvent.type(
    screen.getByRole("textbox", { name: "Workspace-relative path", exact: true }),
    "missing.md",
  );
  await userEvent.click(screen.getByRole("button", { name: "Save source", exact: true }));
  await expect.element(screen.getByText("Missing notes", { exact: true })).toBeVisible();
  await expect.element(screen.getByText("missing · enabled", { exact: true })).toBeVisible();
  // The first registered record retains its own revision through each explicit edit.
  await userEvent.click(screen.getByRole("button", { name: "Edit source", exact: true }).first());
  const title = screen.getByRole("textbox", { name: "Source title", exact: true });
  await userEvent.clear(title);
  await userEvent.type(title, "Updated reference");
  await userEvent.click(screen.getByRole("button", { name: "Save source", exact: true }));
  await expect.element(screen.getByText("Updated reference", { exact: true })).toBeVisible();
  expect(t.api.updateSource).toHaveBeenCalledWith(
    expect.objectContaining({ expectedRevision: 1, title: "Updated reference" }),
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Disable source", exact: true }).first(),
  );
  await expect.element(screen.getByText("available · disabled", { exact: true })).toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: "Remove source", exact: true }).first());
  await expect
    .element(screen.getByText("This does not delete the workspace file.", { exact: false }))
    .toBeVisible();
  expect(t.api.removeSource).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", { name: "Confirm removal", exact: true }));
  await expect
    .element(screen.getByText("Updated reference", { exact: true }))
    .not.toBeInTheDocument();
});
it("creates tasks, saves a status change with its revision, and exposes immutable handoff detail", async () => {
  const t = setup();
  t.project.handoffs = [
    {
      handoffId: ProjectRuntimeHandoffId.make("handoff"),
      projectId: a.id,
      taskId: t.task.taskId,
      checkpoint: "PRT fixture",
      summary: "Work continued",
      taskRevision: 1,
      runtimeRevision: 1,
      createdAt: time,
      createdBy: "thread:previous",
      verification: "Focused tests passed",
      failuresOrBlockers: "None",
      evidenceRefs: ["notes.md:2"],
    },
  ];
  await using screen = await render(<ProjectRuntimeSettings members={[a]} />);
  await expect.element(screen.getByText("No Runtime tasks.")).toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: "Create task", exact: true }));
  await userEvent.type(
    screen.getByRole("textbox", { name: "Task title", exact: true }),
    "New task",
  );
  await userEvent.click(screen.getByRole("button", { name: "Save task", exact: true }));
  await expect.element(screen.getByText("New task", { exact: true })).toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: "Edit task", exact: true }));
  await userEvent.click(screen.getByText("Git/worktree metadata only", { exact: true }));
  await expect
    .element(screen.getByText("These descriptive fields do not create a branch", { exact: false }))
    .toBeVisible();
  await userEvent.click(screen.getByRole("combobox", { name: "Task status", exact: true }));
  await userEvent.click(screen.getByRole("option", { name: "review", exact: true }));
  await userEvent.click(screen.getByRole("button", { name: "Save task", exact: true }));
  await expect.element(screen.getByText("review · Revision 2", { exact: true })).toBeVisible();
  expect(t.api.updateTask).toHaveBeenCalledWith(
    expect.objectContaining({ expectedRevision: 1, status: "review" }),
  );
  await userEvent.click(screen.getByRole("button", { name: "View handoffs", exact: true }));
  await userEvent.click(screen.getByText("PRT fixture", { exact: true }));
  await expect.element(screen.getByText("Focused tests passed", { exact: true })).toBeVisible();
  await expect.element(screen.getByText("notes.md:2", { exact: true })).toBeVisible();
  await expect
    .element(screen.getByRole("button", { name: /edit handoff|delete handoff/i }))
    .not.toBeInTheDocument();
});
it("retains a stale task draft until explicit reload and disables writes on read-only connections", async () => {
  const t = setup();
  t.project.tasks = [t.task];
  t.project.conflictTask = true;
  await using screen = await render(<ProjectRuntimeSettings members={[a]} />);
  await expect.element(screen.getByText("Review work", { exact: true })).toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: "Edit task", exact: true }));
  const title = screen.getByRole("textbox", { name: "Task title", exact: true });
  await userEvent.clear(title);
  await userEvent.type(title, "Local work");
  await userEvent.click(screen.getByRole("button", { name: "Save task", exact: true }));
  await expect.element(title).toHaveValue("Local work");
  await expect
    .element(screen.getByRole("button", { name: "Save task", exact: true }))
    .toBeDisabled();
  await userEvent.click(
    screen.getByRole("button", { name: "Discard draft and reload task", exact: true }),
  );
  await expect.element(title).toHaveValue("Newer server title");
});
it("keeps read-only Runtime controls unavailable while permitting inspection", async () => {
  const t = setup({ canEdit: false });
  t.project.tasks = [t.task];
  await using screen = await render(<ProjectRuntimeSettings members={[a]} />);
  await expect
    .element(screen.getByRole("button", { name: "Disable Runtime", exact: true }))
    .toBeDisabled();
  await expect
    .element(screen.getByRole("button", { name: "Add source", exact: true }))
    .toBeDisabled();
  await expect
    .element(screen.getByRole("button", { name: "Create task", exact: true }))
    .toBeDisabled();
  await expect
    .element(screen.getByRole("textbox", { name: "Instructions", exact: true }))
    .toBeDisabled();
  await userEvent.click(screen.getByRole("button", { name: "View task", exact: true }));
  await expect
    .element(screen.getByRole("textbox", { name: "Scope", exact: true }))
    .toHaveValue("Scope");
  await expect
    .element(screen.getByRole("button", { name: "Save task", exact: true }))
    .toBeDisabled();
  expect(t.api.updateTask).not.toHaveBeenCalled();
});

it("waits for the concrete environment connection before loading Runtime", async () => {
  const t = setup();
  Object.assign(t.api, { ready: false });
  await using screen = await render(<ProjectRuntimeSettings members={[a]} />);
  await expect.element(screen.getByText("Loading Runtime…", { exact: true })).toBeVisible();
  expect(t.api.status).not.toHaveBeenCalled();
  mock.useApi.mockImplementation(() => ({ ...t.api, ready: true }));
  await screen.rerender(<ProjectRuntimeSettings members={[{ ...a }]} />);
  await expect.element(screen.getByText("Runtime enabled", { exact: true })).toBeVisible();
});
