import { expect, it, vi } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";
import {
  EnvironmentId,
  ProjectId,
  ProjectRuntimeTaskId,
  ProjectRuntimeSourceId,
  ProjectRuntimeHandoffId,
  ProviderInstanceId,
  ThreadId,
  type RuntimeRouteResolution,
  type RuntimeExecutionAttempt,
  type RuntimeExecutionAttemptListResult,
  type ProjectRuntimeTask,
  type ProjectRuntimeSource,
  type ProjectRuntimeHandoff,
  type ProjectRuntimeInstructions,
  type ProjectRuntimeSourceHealth,
} from "@t3tools/contracts";
import { Link } from "@tanstack/react-router";
import { act, render } from "../../../test/render";
import type { SidebarProjectGroupMember } from "../../sidebarProjectGrouping";
import type { ProjectRuntimeApi, RuntimeResult } from "./useProjectRuntimeApi";

const mock = vi.hoisted(() => ({ useApi: vi.fn() }));
vi.mock("./useProjectRuntimeApi", () => ({ useProjectRuntimeApi: mock.useApi }));
vi.mock("./SettingsScopeSentence", () => ({ SettingsScopeSentence: () => null }));
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
          checkedAt: "2026-10-23T12:00:00.000Z",
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
import { ProjectRuntimeSettings } from "./ProjectRuntimeSettings";
import { SettingsPageContainer } from "./settingsLayout";

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
    acceptanceCriteria: [{ id: "c1", text: "Criteria" }],
    owner: "user:maintainer",
    status: "active",
    blocker: null,
    verification: { milestone: "none", evidence: [] },
    latestHandoffId: null,
    revision: 1,
    createdAt: time,
    updatedAt: time,
    createdBy: "user:maintainer",
    updatedBy: "user:maintainer",
    base: { worktreePath: "/metadata-only" },
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
        revision: (project.tasks[0]?.revision ?? 1) + 1,
      } as unknown as ProjectRuntimeTask;
      project.tasks = [updated];
      return ok(updated);
    }),
    listHandoffs: vi.fn(async () => ok({ handoffs: [...project.handoffs], nextCursor: null })),
    readHandoff: vi.fn(async () => ok(project.handoffs[0]!)),
    readRouting: vi.fn(async () => ok(null)),
    saveRouting: vi.fn(async (input) =>
      ok({
        projectId: a.id,
        routing: input.routing,
        revision: 1,
        createdAt: time,
        updatedAt: time,
      }),
    ),
    executeTask: vi.fn(async (): Promise<RuntimeResult<RuntimeExecutionAttempt>> => ({
      ok: false as const,
      message: "Execution is not configured in this test.",
      conflict: false,
    })),
    listExecutionAttempts: vi.fn(
      async (): Promise<RuntimeResult<RuntimeExecutionAttemptListResult>> =>
        ok({ attempts: [], nextCursor: null }),
    ),
    readExecutionAttempt: vi.fn(async (): Promise<RuntimeResult<RuntimeExecutionAttempt>> => ({
      ok: false as const,
      message: "Execution is not configured in this test.",
      conflict: false,
    })),
    resolveRoute: vi.fn(async (input?: { taskId?: string }) => {
      const saved = input?.taskId === undefined ? undefined : project.tasks[0];
      const route = saved?.routing ?? undefined;
      if (saved !== undefined && route != null) {
        return ok({
          projectId: a.id,
          taskId: saved.taskId,
          role: route.role,
          status: "resolved" as const,
          source: "task" as const,
          selected: {
            source: "task" as const,
            candidateIndex: 0,
            candidate: { providerInstanceId: "codex", model: "gpt-6-astra" },
            providerInstanceId: "codex",
            driverKind: "codex",
            model: "gpt-6-astra",
            isolation: "shared" as const,
            eligibility: "eligible-at-resolution" as const,
          },
          inheritedFrom: null,
          rejected: [],
          failure: null,
          revisions: {
            task: saved.revision + 10,
            projectRouting: 0,
            profile: null,
            assignment: null,
          },
        } as unknown as RuntimeRouteResolution);
      }
      return ok({
        projectId: a.id,
        taskId: saved?.taskId ?? null,
        role: route?.role ?? ("implementation" as const),
        status: "inherited" as const,
        source: "inherit" as const,
        selected: null,
        inheritedFrom: null,
        rejected: [],
        failure: null,
        revisions: {
          task: saved?.revision ?? null,
          projectRouting: 0,
          profile: null,
          assignment: null,
        },
      } as unknown as RuntimeRouteResolution);
    }),
  };
  mock.useApi.mockImplementation(() => api);
  return { api, project, other, source, task };
}

it.each([
  ["project-runtime-instructions", "Project Instructions"],
  ["project-runtime-sources", "Registered sources"],
  ["project-runtime-state", "Project State"],
  ["project-runtime-tasks", "Runtime tasks"],
])(
  "retains %s until async Runtime status loads, then scrolls and focuses its section",
  async (target, name) => {
    const t = setup();
    let resolveStatus!: (value: Awaited<ReturnType<ProjectRuntimeApi["status"]>>) => void;
    const status = new Promise<Awaited<ReturnType<ProjectRuntimeApi["status"]>>>((resolve) => {
      resolveStatus = resolve;
    });
    vi.mocked(t.api.status).mockReturnValueOnce(status);
    await using screen = await render(
      <SettingsPageContainer>
        <ProjectRuntimeSettings members={[a]} />
      </SettingsPageContainer>,
      { router: `/settings/projects#${target}` },
    );
    using scroll = vi.spyOn(HTMLElement.prototype, "scrollIntoView");
    await expect.element(screen.getByText("Loading Runtime…", { exact: true })).toBeVisible();
    expect(screen.router?.state.location.hash).toBe(target);
    await act(() => resolveStatus(ok({ enabled: true, version: 1, revision: 1 })));
    const section = screen.getByRole("region", { name, exact: true });
    await expect.element(section).toHaveFocus();
    await vi.waitFor(() => {
      expect(scroll.mock.contexts).toContain(section.element().firstElementChild);
      expect(screen.router?.state.location.hash).toBe("");
    });
  },
);

it.each([
  ["project-runtime-instructions", "Project Instructions"],
  ["project-runtime-sources", "Registered sources"],
  ["project-runtime-tasks", "Runtime tasks"],
])("keeps a distinct disabled target for %s", async (target, name) => {
  setup({ enabled: false });
  await using screen = await render(
    <SettingsPageContainer>
      <ProjectRuntimeSettings members={[a]} />
    </SettingsPageContainer>,
    { router: `/settings/projects#${target}` },
  );
  const section = screen.getByRole("region", { name, exact: true });
  await expect.element(section).toHaveFocus();
  expect(section.element().textContent).toContain("Enable Runtime");
  await vi.waitFor(() => expect(screen.router?.state.location.hash).toBe(""));
});

it("re-scrolls after content above the target grows", async () => {
  setup();
  const scroll = vi.spyOn(HTMLElement.prototype, "scrollIntoView");
  const Page = () => (
    <SettingsPageContainer>
      <div data-testid="spacer" style={{ height: 0 }} />
      <ProjectRuntimeSettings members={[a]} />
    </SettingsPageContainer>
  );
  await using screen = await render(<Page />, {
    router: "/settings/projects#project-runtime-sources",
  });
  await expect.element(screen.getByRole("region", { name: "Registered sources" })).toHaveFocus();
  await vi.waitFor(() => expect(scroll).toHaveBeenCalled());
  const before = scroll.mock.calls.length;
  const spacer = screen.container.querySelector<HTMLElement>('[data-testid="spacer"]');
  if (!spacer) throw new Error("spacer missing");
  spacer.style.height = "1200px";
  await vi.waitFor(() => expect(scroll.mock.calls.length).toBeGreaterThan(before));
});

it("navigates between mounted Runtime sections without the parent consuming their targets", async () => {
  setup();
  await using screen = await render(
    <>
      <Link to="/settings/projects" hash="project-runtime-instructions">
        Instructions target
      </Link>
      <Link to="/settings/projects" hash="project-runtime-sources">
        Sources target
      </Link>
      <Link to="/settings/projects" hash="project-runtime-state">
        State target
      </Link>
      <Link to="/settings/projects" hash="project-runtime-tasks">
        Tasks target
      </Link>
      <SettingsPageContainer>
        <ProjectRuntimeSettings members={[a]} />
      </SettingsPageContainer>
    </>,
    { router: "/settings/projects" },
  );
  await expect.element(screen.getByText("Runtime enabled", { exact: true })).toBeVisible();
  for (const [link, name] of [
    ["Instructions target", "Project Instructions"],
    ["Sources target", "Registered sources"],
    ["State target", "Project State"],
    ["Tasks target", "Runtime tasks"],
    ["Instructions target", "Project Instructions"],
  ] as const) {
    await userEvent.click(screen.getByRole("link", { name: link, exact: true }));
    await expect.element(screen.getByRole("region", { name, exact: true })).toHaveFocus();
    await vi.waitFor(() => expect(screen.router?.state.location.hash).toBe(""));
  }
});

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
      result: "Handoff result",
      filesChanged: ["apps/web/src/App.tsx"],
      testsRun: ["vp test run focused"],
      testsNotRun: ["Manual device pass"],
      verification: {
        milestone: "static-pass",
        evidence: [
          {
            evidenceId: "e1",
            result: "pass",
            summary: "Focused tests passed",
            command: "vp test run focused",
            recordedAt: time,
          },
          {
            evidenceId: "e2",
            result: "inconclusive",
            summary: "notes.md:2",
            recordedAt: time,
          },
        ],
      },
      taskRevision: 1,
      runtimeRevision: 1,
      createdAt: time,
      createdBy: "thread:previous",
      failuresRisks: "None",
      unresolvedDecisions: ["Open product decision"],
      repositoryState: "branch t4/ui, clean",
      integrationState: "not merged",
      nextAction: "Continue after review",
      threadId: ThreadId.make("thread-1"),
      providerInstanceId: ProviderInstanceId.make("provider-1"),
      model: "model-1",
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
  await userEvent.click(screen.getByText("Recorded base metadata", { exact: true }));
  await expect
    .element(
      screen.getByText("These fields describe the recorded starting point", { exact: false }),
    )
    .toBeVisible();
  await expect
    .element(screen.getByRole("textbox", { name: "Recorded worktree", exact: true }))
    .toHaveValue("/metadata-only");
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
  await expect.element(screen.getByText("Handoff result", { exact: true })).toBeVisible();
  await expect.element(screen.getByText("pass", { exact: true })).toBeVisible();
  await expect
    .element(screen.getByText("vp test run focused", { exact: true }).first())
    .toBeVisible();
  await expect.element(screen.getByText("Manual device pass", { exact: true })).toBeVisible();
  await expect.element(screen.getByText("Open product decision", { exact: true })).toBeVisible();
  await expect.element(screen.getByText("branch t4/ui, clean", { exact: true })).toBeVisible();
  await expect.element(screen.getByText("not merged", { exact: true })).toBeVisible();
  await expect.element(screen.getByText("thread-1", { exact: true })).toBeVisible();
  await expect.element(screen.getByText("provider-1", { exact: true })).toBeVisible();
  await expect.element(screen.getByText("model-1", { exact: true })).toBeVisible();
  await expect
    .element(screen.getByRole("button", { name: /edit handoff|delete handoff/i }))
    .not.toBeInTheDocument();
});
it("requires a blocker for blocked, saves it, and clears it when the status moves away", async () => {
  const t = setup();
  t.project.tasks = [{ ...t.task }];
  await using screen = await render(<ProjectRuntimeSettings members={[a]} />);
  await expect.element(screen.getByText("Review work", { exact: true })).toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: "Edit task", exact: true }));
  await userEvent.click(screen.getByRole("combobox", { name: "Task status", exact: true }));
  await userEvent.click(screen.getByRole("option", { name: "blocked", exact: true }));
  await userEvent.click(screen.getByRole("button", { name: "Save task", exact: true }));
  await expect
    .element(
      screen.getByText("Blocked tasks need a blocker classification and summary before saving.", {
        exact: true,
      }),
    )
    .toBeVisible();
  expect(t.api.updateTask).not.toHaveBeenCalled();

  await userEvent.type(
    screen.getByRole("textbox", { name: "Blocker summary", exact: true }),
    "Waiting on review",
  );
  await userEvent.click(
    screen.getByRole("combobox", { name: "Blocker classification", exact: true }),
  );
  await userEvent.click(screen.getByRole("option", { name: "review-required", exact: true }));
  await userEvent.click(screen.getByRole("button", { name: "Save task", exact: true }));
  await expect.element(screen.getByText("blocked · Revision 2", { exact: true })).toBeVisible();
  expect(t.api.updateTask).toHaveBeenLastCalledWith(
    expect.objectContaining({
      status: "blocked",
      blocker: { classification: "review-required", summary: "Waiting on review" },
    }),
  );

  await userEvent.click(screen.getByRole("button", { name: "Edit task", exact: true }));
  await userEvent.click(screen.getByRole("combobox", { name: "Task status", exact: true }));
  await userEvent.click(screen.getByRole("option", { name: "active", exact: true }));
  await expect
    .element(screen.getByText("Saving this status clears the recorded blocker.", { exact: true }))
    .toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: "Save task", exact: true }));
  await expect.element(screen.getByText("active · Revision 3", { exact: true })).toBeVisible();
  expect(t.api.updateTask).toHaveBeenLastCalledWith(
    expect.objectContaining({ status: "active", blocker: null }),
  );
});

it("requires a result before saving a done task", async () => {
  const t = setup();
  t.project.tasks = [{ ...t.task }];
  await using screen = await render(<ProjectRuntimeSettings members={[a]} />);
  await userEvent.click(screen.getByRole("button", { name: "Edit task", exact: true }));
  await userEvent.click(screen.getByRole("combobox", { name: "Task status", exact: true }));
  await userEvent.click(screen.getByRole("option", { name: "done", exact: true }));
  await userEvent.click(screen.getByRole("button", { name: "Save task", exact: true }));
  await expect
    .element(
      screen.getByText(
        "Done tasks need a result before saving. A handoff summary is not a task result.",
        { exact: true },
      ),
    )
    .toBeVisible();
  expect(t.api.updateTask).not.toHaveBeenCalled();

  await userEvent.type(
    screen.getByRole("textbox", { name: "Result", exact: true }),
    "Shipped the change",
  );
  await userEvent.click(screen.getByRole("button", { name: "Save task", exact: true }));
  await expect.element(screen.getByText("done · Revision 2", { exact: true })).toBeVisible();
  expect(t.api.updateTask).toHaveBeenLastCalledWith(
    expect.objectContaining({ status: "done", result: "Shipped the change" }),
  );
});

it("represents passing, failing, and reset verification evidence", async () => {
  const t = setup();
  t.project.tasks = [{ ...t.task }];
  await using screen = await render(<ProjectRuntimeSettings members={[a]} />);
  await userEvent.click(screen.getByRole("button", { name: "Edit task", exact: true }));
  await userEvent.click(
    screen.getByRole("combobox", { name: "Verification milestone", exact: true }),
  );
  await userEvent.click(screen.getByRole("option", { name: "static-pass", exact: true }));
  await userEvent.click(screen.getByRole("button", { name: "Save task", exact: true }));
  await expect
    .element(
      screen.getByText("static-pass needs at least one passing evidence item.", { exact: false }),
    )
    .toBeVisible();
  expect(t.api.updateTask).not.toHaveBeenCalled();

  await userEvent.click(screen.getByRole("button", { name: "Add evidence", exact: true }));
  await userEvent.type(
    screen.getByRole("textbox", { name: "Evidence summary 1", exact: true }),
    "Focused tests passed",
  );
  await userEvent.click(screen.getByRole("button", { name: "Save task", exact: true }));
  await expect
    .element(
      screen.getByText("static-pass needs at least one passing evidence item.", { exact: false }),
    )
    .toBeVisible();
  expect(t.api.updateTask).not.toHaveBeenCalled();

  await userEvent.click(screen.getByRole("combobox", { name: "Evidence result 1", exact: true }));
  await userEvent.click(screen.getByRole("option", { name: "pass", exact: true }));
  await userEvent.click(screen.getByRole("button", { name: "Save task", exact: true }));
  await expect
    .element(screen.getByText("Owner user:maintainer · Verification static-pass", { exact: true }))
    .toBeVisible();
  expect(t.api.updateTask).toHaveBeenCalledTimes(1);
  expect(t.api.updateTask).toHaveBeenLastCalledWith(
    expect.objectContaining({
      verification: {
        milestone: "static-pass",
        evidence: [
          expect.objectContaining({
            evidenceId: "e1",
            result: "pass",
            summary: "Focused tests passed",
          }),
        ],
      },
    }),
  );

  await userEvent.click(screen.getByRole("button", { name: "Edit task", exact: true }));
  await userEvent.click(screen.getByRole("button", { name: "Add evidence", exact: true }));
  await userEvent.type(
    screen.getByRole("textbox", { name: "Evidence summary 2", exact: true }),
    "Device check failed",
  );
  await userEvent.click(screen.getByRole("combobox", { name: "Evidence result 2", exact: true }));
  await userEvent.click(screen.getByRole("option", { name: "fail", exact: true }));
  await userEvent.click(
    screen.getByRole("combobox", { name: "Verification milestone", exact: true }),
  );
  await userEvent.click(screen.getByRole("option", { name: "verified", exact: true }));
  await userEvent.click(screen.getByRole("button", { name: "Save task", exact: true }));
  await expect
    .element(
      screen.getByText(
        "Verified cannot coexist with failing evidence. Remove or resolve the failing evidence, or choose another milestone.",
        { exact: true },
      ),
    )
    .toBeVisible();
  expect(t.api.updateTask).toHaveBeenCalledTimes(1);

  await userEvent.click(
    screen.getByRole("button", { name: "Reset verification to none", exact: true }),
  );
  await userEvent.click(screen.getByRole("button", { name: "Save task", exact: true }));
  expect(t.api.updateTask).toHaveBeenCalledTimes(2);
  expect(t.api.updateTask).toHaveBeenLastCalledWith(
    expect.objectContaining({ verification: { milestone: "none", evidence: [] } }),
  );
});

it("renders a legacy blocked task without a blocker and lets the user repair it", async () => {
  const t = setup();
  t.project.tasks = [{ ...t.task, status: "blocked", blocker: null }];
  await using screen = await render(<ProjectRuntimeSettings members={[a]} />);
  await expect
    .element(screen.getByText("Blocked without a recorded blocker. Edit the task to repair it."))
    .toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: "Edit task", exact: true }));
  await expect
    .element(
      screen.getByText(
        "This task is recorded as blocked without a blocker. Add a blocker, or change the status to repair it.",
        { exact: true },
      ),
    )
    .toBeVisible();
  await userEvent.click(screen.getByRole("combobox", { name: "Task status", exact: true }));
  await userEvent.click(screen.getByRole("option", { name: "active", exact: true }));
  await userEvent.click(screen.getByRole("button", { name: "Save task", exact: true }));
  await expect.element(screen.getByText("active · Revision 2", { exact: true })).toBeVisible();
  expect(t.api.updateTask).toHaveBeenLastCalledWith(
    expect.objectContaining({ status: "active", blocker: null }),
  );
});

it("keeps existing criteria ids when a line is added", async () => {
  const t = setup();
  t.project.tasks = [
    {
      ...t.task,
      acceptanceCriteria: [
        { id: "c1", text: "First criterion" },
        { id: "c2", text: "Second criterion" },
      ],
    },
  ];
  await using screen = await render(<ProjectRuntimeSettings members={[a]} />);
  await userEvent.click(screen.getByRole("button", { name: "Edit task", exact: true }));
  const criteria = screen.getByRole("textbox", { name: "Acceptance criteria", exact: true });
  await userEvent.clear(criteria);
  await userEvent.type(criteria, "First criterion{Enter}Second criterion{Enter}Third criterion");
  await userEvent.click(screen.getByRole("button", { name: "Save task", exact: true }));
  expect(t.api.updateTask).toHaveBeenLastCalledWith(
    expect.objectContaining({
      acceptanceCriteria: [
        { id: "c1", text: "First criterion" },
        { id: "c2", text: "Second criterion" },
        { id: "c3", text: "Third criterion" },
      ],
    }),
  );
});

it("drops evidence links to removed criteria when criteria change", async () => {
  const t = setup();
  t.project.tasks = [
    {
      ...t.task,
      acceptanceCriteria: [
        { id: "c1", text: "First criterion" },
        { id: "c2", text: "Second criterion" },
      ],
      verification: {
        milestone: "runtime-pass",
        evidence: [
          {
            evidenceId: "e1",
            result: "pass",
            summary: "Focused tests passed",
            recordedAt: time,
            criterionIds: ["c1", "c2"],
          },
        ],
      },
    },
  ];
  await using screen = await render(<ProjectRuntimeSettings members={[a]} />);
  await userEvent.click(screen.getByRole("button", { name: "Edit task", exact: true }));
  const criteria = screen.getByRole("textbox", { name: "Acceptance criteria", exact: true });
  await userEvent.clear(criteria);
  await userEvent.type(criteria, "Second criterion");
  await userEvent.click(screen.getByRole("button", { name: "Save task", exact: true }));
  expect(t.api.updateTask).toHaveBeenLastCalledWith(
    expect.objectContaining({
      acceptanceCriteria: [{ id: "c2", text: "Second criterion" }],
      verification: expect.objectContaining({
        evidence: [expect.objectContaining({ evidenceId: "e1", criterionIds: ["c2"] })],
      }),
    }),
  );
});

it("does not resend criteria when another field changes", async () => {
  const t = setup();
  t.project.tasks = [
    {
      ...t.task,
      acceptanceCriteria: [
        { id: "c1", text: "Line A\nLine B" },
        { id: "c2", text: "Second criterion" },
      ],
    },
  ];
  await using screen = await render(<ProjectRuntimeSettings members={[a]} />);
  await userEvent.click(screen.getByRole("button", { name: "Edit task", exact: true }));
  const title = screen.getByRole("textbox", { name: "Task title", exact: true });
  await userEvent.clear(title);
  await userEvent.type(title, "Updated title");
  await userEvent.click(screen.getByRole("button", { name: "Save task", exact: true }));
  const call = vi.mocked(t.api.updateTask).mock.calls.at(-1)?.[0];
  expect(call).toBeDefined();
  expect(call).not.toHaveProperty("acceptanceCriteria");
  expect(call).toMatchObject({ title: "Updated title" });
});

it("edits recorded base metadata without implying live Git control", async () => {
  const t = setup();
  t.project.tasks = [{ ...t.task }];
  await using screen = await render(<ProjectRuntimeSettings members={[a]} />);
  await userEvent.click(screen.getByRole("button", { name: "Edit task", exact: true }));
  await userEvent.click(screen.getByText("Recorded base metadata", { exact: true }));
  await expect
    .element(screen.getByRole("textbox", { name: "Recorded repository", exact: true }))
    .toBeVisible();
  await expect
    .element(screen.getByRole("textbox", { name: "Recorded upstream revision", exact: true }))
    .toBeVisible();
  await expect
    .element(screen.getByRole("textbox", { name: "Recorded notes", exact: true }))
    .toBeVisible();
  const branch = screen.getByRole("textbox", { name: "Recorded branch", exact: true });
  await userEvent.type(branch, "t4/ui");
  const revision = screen.getByRole("textbox", { name: "Recorded revision", exact: true });
  await userEvent.type(revision, "abcdef0");
  await userEvent.click(screen.getByRole("button", { name: "Save task", exact: true }));
  expect(t.api.updateTask).toHaveBeenLastCalledWith(
    expect.objectContaining({
      base: { worktreePath: "/metadata-only", branch: "t4/ui", revision: "abcdef0" },
    }),
  );
});

it("marks the task's authoritative latest handoff without adding write controls", async () => {
  const t = setup();
  t.project.tasks = [{ ...t.task, latestHandoffId: ProjectRuntimeHandoffId.make("handoff") }];
  t.project.handoffs = [
    {
      handoffId: ProjectRuntimeHandoffId.make("handoff"),
      projectId: a.id,
      taskId: t.task.taskId,
      checkpoint: "Latest checkpoint",
      summary: "Latest continuation",
      filesChanged: [],
      verification: { milestone: "none", evidence: [] },
      taskRevision: 1,
      runtimeRevision: 1,
      createdAt: time,
      createdBy: "thread:previous",
    },
  ];
  await using screen = await render(<ProjectRuntimeSettings members={[a]} />);
  await userEvent.click(screen.getByRole("button", { name: "View handoffs", exact: true }));
  await expect.element(screen.getByText("Latest", { exact: true })).toBeVisible();
  await userEvent.click(screen.getByText("Latest checkpoint", { exact: true }));
  await expect.element(screen.getByText("Latest continuation", { exact: true })).toBeVisible();
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

it("sets a task worker role, saves an ordered candidate, shows the task layer, then clears it", async () => {
  const t = setup();
  t.project.tasks = [t.task];
  await using screen = await render(<ProjectRuntimeSettings members={[a]} />);
  await expect.element(screen.getByText("Review work", { exact: true })).toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: "Edit task", exact: true }));

  await userEvent.click(screen.getByRole("combobox", { name: "Task worker role", exact: true }));
  await userEvent.click(screen.getByRole("option", { name: "Review", exact: true }));
  await userEvent.click(
    screen.getByRole("button", { name: "Add alternative worker for Review", exact: true }),
  );
  await userEvent.click(screen.getByRole("combobox", { name: "Fallback for Review", exact: true }));
  await userEvent.click(
    screen.getByRole("option", { name: "Fail instead of using another worker", exact: true }),
  );
  await userEvent.click(screen.getByRole("button", { name: "Save task", exact: true }));

  expect(t.api.updateTask).toHaveBeenLastCalledWith(
    expect.objectContaining({
      taskId: t.task.taskId,
      expectedRevision: 1,
      routing: {
        role: "review",
        candidates: [{ providerInstanceId: "codex", model: "gpt-6-astra" }],
        fallback: "fail",
      },
    }),
  );
  await expect
    .element(screen.getByText("Worker preference: Review · 1 preferred worker", { exact: true }))
    .toBeVisible();

  await userEvent.click(screen.getByRole("button", { name: "Edit task", exact: true }));
  await expect
    .element(screen.getByText("Effective worker choice: Task setting", { exact: true }))
    .toBeVisible();
  await expect
    .element(screen.getByText("Resolved from task revision 12", { exact: false }))
    .toBeVisible();
  await userEvent.click(
    screen.getByRole("button", { name: "Clear task worker preference", exact: true }),
  );
  await expect
    .element(
      screen.getByText("Unsaved worker changes are not reflected here until you save the task.", {
        exact: true,
      }),
    )
    .toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: "Save task", exact: true }));

  expect(t.api.updateTask).toHaveBeenLastCalledWith(
    expect.objectContaining({ taskId: t.task.taskId, routing: null }),
  );
  await expect
    .element(screen.getByText("Worker preference: Project or Development Profile", { exact: true }))
    .toBeVisible();
});

it("executes an eligible task, disables re-entry, and links the worker thread", async () => {
  const t = setup();
  t.project.tasks = [t.task];
  const workerThreadId = ThreadId.make("runtime-worker-thread");
  const attempt = {
    attemptId: "runtime-attempt-1",
    projectId: a.id,
    taskId: t.task.taskId,
    taskTitle: t.task.title,
    status: "launched",
    revision: 2,
    threadId: workerThreadId,
    runId: "runtime-run-1",
    modelSelection: { instanceId: ProviderInstanceId.make("codex"), model: "gpt-6-astra" },
    routeSource: "inherit",
    failure: null,
    createdAt: time,
    updatedAt: time,
    receipt: {
      route: {
        projectId: a.id,
        taskId: t.task.taskId,
        role: "implementation",
        status: "inherited",
        source: "inherit",
        selected: null,
        inheritedFrom: null,
        rejected: [],
        failure: null,
        revisions: { task: 1, projectRouting: 0, profile: null, assignment: null },
      },
      launch: {
        modelSelection: { instanceId: ProviderInstanceId.make("codex"), model: "gpt-6-astra" },
        runtimeMode: "full-access",
        interactionMode: "default",
        workspaceStrategy: { type: "root" },
      },
      packet: {
        version: 1,
        taskRevision: 1,
        handoffId: null,
        text: "Runtime task packet",
      },
    },
  } as unknown as RuntimeExecutionAttempt;
  let attempts: ReadonlyArray<RuntimeExecutionAttempt> = [];
  vi.mocked(t.api.listExecutionAttempts).mockImplementation(async () =>
    ok({
      attempts: attempts.map(({ receipt: _receipt, ...summary }) => summary),
      nextCursor: null,
    }),
  );
  vi.mocked(t.api.executeTask).mockImplementation(async () => {
    attempts = [attempt];
    return ok(attempt);
  });

  await using screen = await render(<ProjectRuntimeSettings members={[a]} />);
  await expect.element(screen.getByText("Review work", { exact: true })).toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: "Edit task", exact: true }));
  await expect
    .element(screen.getByText("No execution attempts yet.", { exact: true }))
    .toBeVisible();

  await userEvent.click(screen.getByRole("button", { name: "Execute task", exact: true }));
  expect(t.api.executeTask).toHaveBeenCalledWith({
    taskId: t.task.taskId,
    expectedTaskRevision: 1,
    clientRequestId: expect.any(String),
  });
  await expect.element(screen.getByText("Launched", { exact: true })).toBeVisible();
  await expect
    .element(screen.getByRole("link", { name: "Open worker thread", exact: true }))
    .toBeVisible();
  await expect
    .element(screen.getByRole("button", { name: "Execute task", exact: true }))
    .toBeDisabled();
});
