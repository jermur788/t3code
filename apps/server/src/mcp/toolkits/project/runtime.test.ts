import * as DocumentText from "../../../provider/DocumentText.ts";
import * as DevelopmentProfileService from "../../../developmentProfiles/DevelopmentProfileService.ts";
import * as NodeCrypto from "@effect/platform-node/NodeCrypto";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import {
  EnvironmentId,
  PROJECT_RUNTIME_BOUNDS,
  ProjectId,
  ProjectRuntimeContext,
  ProjectRuntimeHandoff,
  ProjectRuntimeHandoffListResult,
  ProjectRuntimeSourceListResult,
  ProjectRuntimeSourceReadResult,
  ProjectRuntimeSourceSearchResult,
  ProjectRuntimeTask,
  ProjectRuntimeTaskListResult,
  ProviderInstanceId,
  RuntimeMode,
  ThreadId,
} from "@t3tools/contracts";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";
import * as SqlClient from "effect/sql/SqlClient";
import * as TestClock from "effect/testing/TestClock";
import { McpSchema, McpServer, Tool } from "effect/ai";

import * as ServerConfig from "../../../config.ts";
import * as ProjectStore from "../../../orchestration-v2/ProjectStore.ts";
import * as ThreadLaunch from "../../../orchestration-v2/ThreadLaunchService.ts";
import * as ThreadManagement from "../../../orchestration-v2/ThreadManagementService.ts";
import * as SqlitePersistence from "../../../persistence/Sqlite.ts";
import * as ManagedProjectFolders from "../../../project/ManagedProjectFolders.ts";
import * as ProjectService from "../../../project/ProjectService.ts";
import * as ProjectRuntimeService from "../../../projectRuntime/ProjectRuntimeService.ts";
import * as ProjectRuntimeSourceAccess from "../../../projectRuntime/ProjectRuntimeSourceAccess.ts";
import * as ServerSettings from "../../../serverSettings.ts";
import * as SourceControlRepositoryService from "../../../sourceControl/SourceControlRepositoryService.ts";
import * as GitVcsDriver from "../../../vcs/GitVcsDriver.ts";
import * as KnownWorkspaces from "../../../workspace/KnownWorkspaces.ts";
import * as WorkspaceEntries from "../../../workspace/WorkspaceEntries.ts";
import * as WorkspaceFileSystem from "../../../workspace/WorkspaceFileSystem.ts";
import * as WorkspacePaths from "../../../workspace/WorkspacePaths.ts";
import * as McpHttpServer from "../../McpHttpServer.ts";
import * as McpInvocationContext from "../../McpInvocationContext.ts";
import { liveThreadShell } from "../../McpToolAccess.testkit.ts";
import { provenanceOf } from "./runtimeHandlers.ts";
import { ProjectToolkit } from "./tools.ts";

const projectA = ProjectId.make("mcp-runtime-a");
const projectB = ProjectId.make("mcp-runtime-b");
const projectOff = ProjectId.make("mcp-runtime-off");
const threadA = ThreadId.make("thread-runtime-a");
const threadB = ThreadId.make("thread-runtime-b");
const threadOff = ThreadId.make("thread-runtime-off");
const threadSupervised = ThreadId.make("thread-runtime-supervised");
const maintainer = { actor: "user:maintainer" };
const codex = ProviderInstanceId.make("codex");
const claude = ProviderInstanceId.make("claudeAgent");

const shells = new Map(
  [
    [threadA, projectA, "full-access"],
    [threadB, projectB, "full-access"],
    [threadOff, projectOff, "full-access"],
    [threadSupervised, projectA, "approval-required"],
  ].map(([threadId, projectId, runtimeMode]) => [
    threadId as ThreadId,
    {
      ...liveThreadShell(threadId as ThreadId, { runtimeMode: runtimeMode as RuntimeMode }),
      projectId: projectId as ProjectId,
    },
  ]),
);

// Only the shell lookup exists. Reading a thread's messages or rebinding its workspace would be a
// defect, so every test here also shows Runtime never touches conversation or workspace binding.
const layerThreads = Layer.mock(ThreadManagement.ThreadManagementService)({
  getThreadShell: (threadId) => Effect.succeed(shells.get(threadId) ?? null),
});

const layerWorkspace = WorkspaceFileSystem.layer.pipe(
  Layer.provideMerge(WorkspaceEntries.layer.pipe(Layer.provide(WorkspacePaths.layer))),
  Layer.provideMerge(WorkspacePaths.layer),
  Layer.provide(Layer.mock(KnownWorkspaces.KnownWorkspaces)({ assertContains: () => Effect.void })),
);

const layerRuntime = ProjectRuntimeSourceAccess.layer.pipe(
  Layer.provideMerge(ProjectRuntimeService.layer),
  Layer.provideMerge(DevelopmentProfileService.layer),
  Layer.provideMerge(ProjectStore.layer),
  Layer.provideMerge(layerWorkspace),
  Layer.provideMerge(SqlitePersistence.layerMemory),
  Layer.provide(ServerConfig.ServerConfig.layerTest(process.cwd(), { prefix: "t3-mcp-runtime-" })),
  Layer.provideMerge(NodeServices.layer),
);

// The toolkit declares services for its other tools, which these tests never call.
const layerTest = McpHttpServer.layerProjectToolkit.pipe(
  Layer.provideMerge(McpServer.McpServer.layer),
  Layer.provide(
    Layer.mergeAll(
      NodeCrypto.layer,
      layerThreads,
      ServerSettings.layerTest(),
      Layer.mock(ProjectService.ProjectService)({}),
      Layer.mock(ManagedProjectFolders.ManagedProjectFolders)({ namedProjectsRoot: "/projects" }),
      Layer.mock(SourceControlRepositoryService.SourceControlRepositoryService)({}),
      Layer.mock(ThreadLaunch.ThreadLaunchService)({}),
      Layer.mock(GitVcsDriver.GitVcsDriver)({}),
      DocumentText.layer,
      ServerConfig.ServerConfig.layerTest(process.cwd(), { prefix: "t3-mcp-runtime-tools-" }),
    ).pipe(Layer.provide(NodeServices.layer)),
  ),
  Layer.provideMerge(layerRuntime),
);

const environmentId = EnvironmentId.make("mcp-runtime-environment");
const threadScope = (
  threadId: ThreadId,
  providerInstanceId: ProviderInstanceId = codex,
): McpInvocationContext.McpInvocationScope => ({
  environmentId,
  requestNamespace: `thread:${threadId}`,
  thread: { threadId, providerSessionId: `session:${threadId}`, providerInstanceId },
  client: undefined,
  issuedAt: 0,
  capabilities: new Set(["orchestration"]),
});
const clientScope = (
  access: "full-access" | "read-only" = "full-access",
): McpInvocationContext.McpInvocationScope => ({
  environmentId,
  requestNamespace: "client:session-9",
  thread: undefined,
  client: { sessionId: "session-9", label: "Hosted bot", access },
  issuedAt: 0,
  capabilities: new Set(["orchestration"]),
});
const mcpClient = McpSchema.McpServerClient.of({
  clientId: 1,
  protocolVersion: "2025-06-18",
  clientCapabilities: {},
  clientInfo: { name: "mcp-runtime", version: "1" },
  initializePayload: {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "mcp-runtime", version: "1" },
  },
  getClient: Effect.die("unused"),
});

const invoke = Effect.fn("test.invoke")(function* (
  scope: McpInvocationContext.McpInvocationScope,
  name: string,
  args: Record<string, unknown> = {},
) {
  const server = yield* McpServer.McpServer;
  const result = yield* server
    .callTool({ name, arguments: args })
    .pipe(
      Effect.provideService(McpInvocationContext.McpInvocationContext, scope),
      Effect.provideService(McpSchema.McpServerClient, mcpClient),
    );
  const text = result.content[0];
  // A declared failure is JSON text with `isError`, never structuredContent.
  return result.isError === true
    ? ({
        failed: true as const,
        error: (text?.type === "text" ? JSON.parse(text.text) : undefined) as Record<
          string,
          unknown
        >,
      } as const)
    : ({ failed: false as const, value: result.structuredContent as unknown } as const);
});

const succeeded = <S extends Schema.Top>(
  schema: S,
  outcome: Effect.Success<ReturnType<typeof invoke>>,
) => {
  if (outcome.failed) assert.fail(`tool failed: ${JSON.stringify(outcome.error)}`);
  return Schema.decodeUnknownSync(schema as never)(outcome.value) as S["Type"];
};

const failedWith = (outcome: Effect.Success<ReturnType<typeof invoke>>) => {
  if (!outcome.failed) assert.fail(`tool unexpectedly succeeded: ${JSON.stringify(outcome.value)}`);
  return outcome.error;
};

const setup = Effect.gen(function* () {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const sql = yield* SqlClient.SqlClient;
  const runtime = yield* ProjectRuntimeService.ProjectRuntimeService;
  const roots = new Map<ProjectId, string>();
  for (const projectId of [projectA, projectB, projectOff]) {
    const root = yield* fileSystem.makeTempDirectoryScoped({ prefix: `t3-mcp-${projectId}-` });
    roots.set(projectId, yield* fileSystem.realPath(root));
    yield* sql`INSERT INTO projection_projects (project_id, title, workspace_root, scripts_json, created_at, updated_at)
      VALUES (${projectId}, ${projectId}, ${roots.get(projectId)!}, '[]', '2026-10-23T00:00:00.000Z', '2026-10-23T00:00:00.000Z')`;
  }
  yield* runtime.setEnabled(projectA, { enabled: true });
  yield* runtime.setEnabled(projectB, { enabled: true });
  const write = Effect.fn("test.write")(function* (
    projectId: ProjectId,
    relativePath: string,
    contents: string | Uint8Array,
  ) {
    const absolute = path.join(roots.get(projectId)!, relativePath);
    yield* fileSystem.makeDirectory(path.dirname(absolute), { recursive: true });
    yield* typeof contents === "string"
      ? fileSystem.writeFileString(absolute, contents)
      : fileSystem.writeFile(absolute, contents);
  });
  const register = (
    projectId: ProjectId,
    relativePath: string,
    extra?: { readonly enabled?: boolean; readonly title?: string },
  ) =>
    runtime.createSource(
      projectId,
      { title: "Source", role: "reference", relativePath, ...extra },
      maintainer,
    );
  const task = (projectId: ProjectId, title: string, status?: ProjectRuntimeTask["status"]) =>
    runtime.createTask(
      projectId,
      {
        title,
        scope: "Scope",
        acceptanceCriteria: [{ id: "c1", text: "Criteria" }],
        ...(status ? { status } : {}),
        ...(status === "blocked"
          ? {
              blocker: {
                classification: "operational-blocker" as const,
                summary: "Waiting on a dependency",
              },
            }
          : {}),
        ...(status === "done" ? { result: "Completed" } : {}),
      },
      maintainer,
    );
  return { fileSystem, sql, runtime, roots, write, register, task };
});

const runtimeToolNames = [
  "t3_project_context",
  "t3_project_source_list",
  "t3_project_source_search",
  "t3_project_source_read",
  "t3_project_task_list",
  "t3_project_task_read",
  "t3_project_task_create",
  "t3_project_task_update",
  "t3_project_handoff_append",
  "t3_project_handoff_list",
  "t3_project_handoff_read",
];

const BODY_MARKER = "BODY-MARKER-31c9";

it.effect("exposes exactly the eleven Runtime tools and no authority-changing tool", () =>
  Effect.gen(function* () {
    const server = yield* McpServer.McpServer;
    const advertised = server.tools.map(({ tool }) => tool.name);
    for (const name of runtimeToolNames) assert.include(advertised, name);
    assert.sameMembers(
      Object.keys(ProjectToolkit.tools).filter((name) =>
        /^t3_project_(context|source_|task_|handoff_)/.test(name),
      ),
      runtimeToolNames,
    );
    // The v1 agent surface cannot change instructions, the source registry, Runtime enablement, or
    // delete or edit anything.
    const authority = advertised.filter(
      (name) =>
        name.startsWith("t3_project_") &&
        /instruction|enable|disable|runtime|(source_(create|update|remove|add|register|set|delete|enable|disable))|(task_(delete|remove))|(handoff_(update|edit|delete|remove))/.test(
          name,
        ),
    );
    assert.deepEqual(authority, []);

    const readOnly = runtimeToolNames.filter((name) =>
      Context.get(
        ProjectToolkit.tools[name as keyof typeof ProjectToolkit.tools].annotations,
        Tool.Readonly,
      ),
    );
    assert.sameMembers(
      readOnly,
      runtimeToolNames.filter(
        (name) =>
          ![
            "t3_project_task_create",
            "t3_project_task_update",
            "t3_project_handoff_append",
          ].includes(name),
      ),
    );
    for (const name of runtimeToolNames) {
      const { annotations } = ProjectToolkit.tools[name as keyof typeof ProjectToolkit.tools];
      assert.isFalse(Context.get(annotations, Tool.OpenWorld), name);
      assert.equal(
        Context.get(annotations, Tool.Destructive),
        name === "t3_project_task_update",
        name,
      );
    }
  }).pipe(Effect.provide(layerTest)),
);

it.effect("returns a valid disabled context for a project whose Runtime is not enabled", () =>
  Effect.gen(function* () {
    yield* setup;
    const expected = {
      projectId: projectOff,
      status: { enabled: false, version: 1 as const, revision: 0 },
      instructions: null,
      sources: [],
      tasks: [],
      truncated: { sources: false, tasks: false, handoffs: false },
    };
    assert.deepEqual(
      succeeded(ProjectRuntimeContext, yield* invoke(threadScope(threadOff), "t3_project_context")),
      expected,
    );
    // An outside client names the project instead.
    assert.deepEqual(
      succeeded(
        ProjectRuntimeContext,
        yield* invoke(clientScope(), "t3_project_context", { projectId: projectOff }),
      ),
      expected,
    );
    // Everything else still reports the structured disabled error.
    for (const [name, args] of [
      ["t3_project_source_list", {}],
      ["t3_project_task_list", {}],
      ["t3_project_handoff_list", {}],
    ] as const) {
      assert.deepEqual(failedWith(yield* invoke(threadScope(threadOff), name, args)), {
        _tag: "ProjectRuntimeDisabledError",
        projectId: projectOff,
      });
    }
  }).pipe(Effect.scoped, Effect.provide(layerTest)),
);

it.effect("builds the enabled context from saved state only, without source bodies", () =>
  Effect.gen(function* () {
    const t = yield* setup;
    // 32,000 characters, about 96,000 bytes: well past the dynamic context budget.
    const instructions = "指示".repeat(PROJECT_RUNTIME_BOUNDS.instructionsMaxLength / 2);
    yield* t.runtime.saveInstructions(projectA, { instructions }, maintainer);
    yield* t.write(projectA, "docs/enabled.md", `${BODY_MARKER}\n`);
    yield* t.write(projectA, "docs/off.md", `${BODY_MARKER} disabled\n`);
    const enabled = yield* t.register(projectA, "docs/enabled.md", { title: "Enabled" });
    yield* t.register(projectA, "docs/off.md", { enabled: false, title: "Off" });
    yield* t.register(projectB, "docs/enabled.md", { title: "Foreign" });

    const planned = yield* t.task(projectA, "planned", "planned");
    yield* t.task(projectA, "ready", "ready");
    yield* t.task(projectA, "done", "done");
    yield* t.task(projectA, "cancelled", "cancelled");
    yield* t.task(projectB, "foreign active", "active");
    yield* TestClock.adjust(1000);
    const review = yield* t.task(projectA, "review", "review");
    yield* TestClock.adjust(1000);
    const active = yield* t.task(projectA, "active", "active");
    yield* t.runtime.appendHandoff(
      projectA,
      {
        taskId: active.taskId,
        expectedTaskRevision: active.revision,
        checkpoint: "older",
        summary: "Older handoff",
      },
      maintainer,
    );
    yield* TestClock.adjust(1000);
    const latest = yield* t.runtime.appendHandoff(
      projectA,
      {
        taskId: active.taskId,
        expectedTaskRevision: (yield* t.runtime.readTask(projectA, active.taskId)).revision,
        checkpoint: "latest",
        summary: "Latest handoff",
      },
      maintainer,
    );

    const outcome = yield* invoke(threadScope(threadA), "t3_project_context");
    const context = succeeded(ProjectRuntimeContext, outcome);
    assert.equal(context.instructions?.instructions, instructions);
    assert.lengthOf(context.instructions?.instructions ?? "", 32_000);
    assert.deepEqual(
      context.sources.map((source) => source.sourceId),
      [enabled.sourceId],
    );
    assert.deepEqual(
      context.tasks.map((task) => [task.title, task.status]),
      [
        ["active", "active"],
        ["review", "review"],
      ],
    );
    assert.notInclude(
      context.tasks.map((task) => task.taskId),
      planned.taskId,
    );
    assert.equal(context.tasks[0]?.latestHandoff?.handoffId, latest.handoffId);
    assert.equal(context.tasks[0]?.latestHandoff?.summary, "Latest handoff");
    assert.equal(context.tasks[1]?.taskId, review.taskId);
    assert.isNull(context.tasks[1]?.latestHandoff);
    assert.deepEqual(context.truncated, { sources: false, tasks: false, handoffs: false });
    assert.equal(context.status.enabled, true);
    // No source body and nothing from the other project.
    const serialized = JSON.stringify(outcome);
    assert.notInclude(serialized, BODY_MARKER);
    assert.notInclude(serialized, "Foreign");
    assert.notInclude(serialized, "foreign active");
  }).pipe(Effect.scoped, Effect.provide(layerTest)),
);

it.effect("truncates the context by count and sets the flags", () =>
  Effect.gen(function* () {
    const t = yield* setup;
    const { contextMaxSources, contextMaxTasks } = PROJECT_RUNTIME_BOUNDS;
    yield* Effect.forEach(
      Array.from({ length: contextMaxSources + 1 }, (_, index) => index),
      (index) => t.register(projectA, `docs/${index}.md`),
    );
    yield* Effect.forEach(
      Array.from({ length: contextMaxTasks + 1 }, (_, index) => index),
      (index) => t.task(projectA, `task ${index}`, "active"),
    );
    const context = succeeded(
      ProjectRuntimeContext,
      yield* invoke(threadScope(threadA), "t3_project_context"),
    );
    assert.lengthOf(context.sources, contextMaxSources);
    assert.lengthOf(context.tasks, contextMaxTasks);
    assert.deepEqual(context.truncated, { sources: true, tasks: true, handoffs: false });
  }).pipe(Effect.scoped, Effect.provide(layerTest)),
);

it.effect("budgets the dynamic context by UTF-8 bytes, not characters", () =>
  Effect.gen(function* () {
    const t = yield* setup;
    const budget = PROJECT_RUNTIME_BOUNDS.contextMaxBytes;
    const bytes = (value: unknown) => Buffer.byteLength(JSON.stringify(value), "utf8");

    // Characters: twelve 2,000-character next actions are 24,000, far under the budget. Bytes: each
    // is 6,000 plus its JSON, so only some fit.
    yield* Effect.forEach(
      Array.from({ length: 12 }, (_, index) => index),
      (index) =>
        TestClock.adjust(1000).pipe(
          Effect.andThen(
            t.runtime.createTask(
              projectA,
              {
                title: `wide ${index}`,
                status: "active",
                scope: "Scope",
                acceptanceCriteria: [{ id: "c1", text: "Criteria" }],
                nextAction: "日".repeat(2_000),
              },
              maintainer,
            ),
          ),
        ),
    );
    const wide = succeeded(
      ProjectRuntimeContext,
      yield* invoke(threadScope(threadA), "t3_project_context"),
    );
    assert.isBelow(wide.tasks.length, 12);
    assert.isAbove(wide.tasks.length, 0);
    assert.isAtMost(bytes(wide.tasks), budget);
    assert.isAbove(bytes(wide.tasks) + 1 + bytes(wide.tasks[0]), budget);
    assert.deepEqual(wide.truncated, { sources: false, tasks: true, handoffs: false });
    assert.deepEqual(
      wide.tasks.map((task) => task.title),
      Array.from({ length: wide.tasks.length }, (_, index) => `wide ${index}`),
    );

    // A task whose latest handoff would not fit is kept without its reference.
    const other = yield* t.task(projectB, "with big handoffs", "active");
    yield* Effect.forEach([0, 1, 2, 3], (index) =>
      TestClock.adjust(1000).pipe(
        Effect.andThen(
          t.runtime.createTask(
            projectB,
            {
              title: `big ${index}`,
              status: "active",
              scope: "S",
              acceptanceCriteria: [{ id: "c1", text: "C" }],
            },
            maintainer,
          ),
        ),
        Effect.flatMap((task) =>
          t.runtime.appendHandoff(
            projectB,
            {
              taskId: task.taskId,
              expectedTaskRevision: task.revision,
              checkpoint: `c${index}`,
              summary: "日".repeat(8_000),
            },
            maintainer,
          ),
        ),
      ),
    );
    assert.isDefined(other);
    const big = succeeded(
      ProjectRuntimeContext,
      yield* invoke(threadScope(threadB), "t3_project_context"),
    );
    assert.isAtMost(bytes(big.tasks), budget);
    // 5 x 8,000 characters would fit as characters; as bytes only two references do.
    assert.deepEqual(
      big.tasks.map((task) => task.latestHandoff !== null),
      [false, true, true, false, false],
    );
    assert.deepEqual(big.truncated, { sources: false, tasks: false, handoffs: true });
  }).pipe(Effect.scoped, Effect.provide(layerTest)),
);

it.effect("lists source health, searches only registered enabled sources, and reads by ID", () =>
  Effect.gen(function* () {
    const t = yield* setup;
    yield* t.write(projectA, "docs/registered.md", `intro\n${BODY_MARKER} registered\nlast\n`);
    yield* t.write(projectA, "docs/unregistered.md", `${BODY_MARKER} unregistered\n`);
    yield* t.write(projectA, "docs/disabled.md", `${BODY_MARKER} disabled\n`);
    yield* t.write(projectA, "docs/blob.bin", Uint8Array.from([0x61, 0, 0x62]));
    yield* t.write(projectB, "docs/registered.md", `${BODY_MARKER} other project\n`);
    const registered = yield* t.register(projectA, "docs/registered.md");
    const disabled = yield* t.register(projectA, "docs/disabled.md", { enabled: false });
    const missing = yield* t.register(projectA, "docs/gone.md");
    const binary = yield* t.register(projectA, "docs/blob.bin");
    const foreign = yield* t.register(projectB, "docs/registered.md");
    const scope = threadScope(threadA);

    const listed = succeeded(
      ProjectRuntimeSourceListResult,
      yield* invoke(scope, "t3_project_source_list"),
    );
    const health = new Map(listed.sources.map((entry) => [entry.source.sourceId, entry.health]));
    assert.equal(health.get(registered.sourceId), "available");
    assert.equal(health.get(disabled.sourceId), "available");
    assert.equal(health.get(missing.sourceId), "missing");
    assert.equal(health.get(binary.sourceId), "unsupported");
    assert.isFalse(health.has(foreign.sourceId));
    assert.isFalse(
      listed.sources.find((e) => e.source.sourceId === disabled.sourceId)?.source.enabled,
    );

    const searched = succeeded(
      ProjectRuntimeSourceSearchResult,
      yield* invoke(scope, "t3_project_source_search", { query: BODY_MARKER }),
    );
    assert.deepEqual(
      searched.matches.map((match) => [match.sourceId, match.path, match.lineNumber]),
      [[registered.sourceId, "docs/registered.md", 2]],
    );
    assert.notInclude(JSON.stringify(searched), "unregistered");
    assert.notInclude(JSON.stringify(searched), "other project");

    const read = succeeded(
      ProjectRuntimeSourceReadResult,
      yield* invoke(scope, "t3_project_source_read", {
        sourceId: registered.sourceId,
        fromLine: 2,
        lineCount: 1,
      }),
    );
    assert.equal(read.contents, `${BODY_MARKER} registered\n`);
    // One line was asked for and another follows it, so the read says there is more.
    assert.deepEqual([read.fromLine, read.toLine, read.truncated], [2, 2, true]);
    const rest = succeeded(
      ProjectRuntimeSourceReadResult,
      yield* invoke(scope, "t3_project_source_read", {
        sourceId: registered.sourceId,
        fromLine: 2,
      }),
    );
    assert.equal(rest.contents, `${BODY_MARKER} registered\nlast\n`);
    assert.deepEqual([rest.toLine, rest.truncated], [3, false]);

    assert.deepEqual(
      failedWith(yield* invoke(scope, "t3_project_source_read", { sourceId: disabled.sourceId })),
      {
        _tag: "ProjectRuntimeSourceDisabledError",
        projectId: projectA,
        sourceId: disabled.sourceId,
      },
    );
    assert.deepEqual(
      failedWith(yield* invoke(scope, "t3_project_source_read", { sourceId: missing.sourceId })),
      {
        _tag: "ProjectRuntimeSourceMissingError",
        projectId: projectA,
        sourceId: missing.sourceId,
        relativePath: "docs/gone.md",
      },
    );
    assert.deepEqual(
      failedWith(yield* invoke(scope, "t3_project_source_read", { sourceId: binary.sourceId })),
      {
        _tag: "ProjectRuntimeSourceUnsupportedError",
        projectId: projectA,
        sourceId: binary.sourceId,
        relativePath: "docs/blob.bin",
        reason: "binary",
      },
    );
    // An oversized range is the structured range error, not a schema rejection.
    assert.deepEqual(
      failedWith(
        yield* invoke(scope, "t3_project_source_read", {
          sourceId: registered.sourceId,
          lineCount: PROJECT_RUNTIME_BOUNDS.readMaxLines + 1,
        }),
      ),
      {
        _tag: "ProjectRuntimeInvalidRangeError",
        projectId: projectA,
        sourceId: registered.sourceId,
        fromLine: 1,
        lineCount: PROJECT_RUNTIME_BOUNDS.readMaxLines + 1,
        maxLines: PROJECT_RUNTIME_BOUNDS.readMaxLines,
      },
    );
    // A locator that escapes the workspace is a structured path error, with no path leaked.
    yield* t.sql`UPDATE project_runtime_sources SET payload_json = json_set(payload_json, '$.relativePath', '../outside.md') WHERE source_id = ${registered.sourceId}`;
    const escaped = failedWith(
      yield* invoke(scope, "t3_project_source_read", { sourceId: registered.sourceId }),
    );
    assert.equal(escaped._tag, "ProjectRuntimeSourcePathError");
    assert.equal(escaped.reason, "outside_workspace");
    assert.notInclude(JSON.stringify(escaped), t.roots.get(projectA)!);
  }).pipe(Effect.scoped, Effect.provide(layerTest)),
);

it.effect("creates, reads, lists and updates tasks with server-derived provenance", () =>
  Effect.gen(function* () {
    yield* setup;
    const scope = threadScope(threadA);
    const created = succeeded(
      ProjectRuntimeTask,
      yield* invoke(scope, "t3_project_task_create", {
        title: "Ship tools",
        scope: "MCP",
        acceptanceCriteria: [{ id: "c1", text: "Tests" }],
        base: {
          branch: "descriptive-branch",
          worktreePath: "/never/created",
          revision: "abc123",
        },
        // None of these are parameters; they must not become provenance.
        createdBy: "user:spoofed",
        updatedBy: "user:spoofed",
        revision: 99,
      }),
    );
    assert.equal(created.createdBy, `thread:${threadA}`);
    assert.equal(created.updatedBy, `thread:${threadA}`);
    assert.equal(created.status, "planned");
    assert.equal(created.revision, 1);
    assert.equal(created.base?.branch, "descriptive-branch");
    assert.equal(created.base?.worktreePath, "/never/created");

    const read = succeeded(
      ProjectRuntimeTask,
      yield* invoke(scope, "t3_project_task_read", { taskId: created.taskId }),
    );
    assert.deepEqual(read, created);

    const updated = succeeded(
      ProjectRuntimeTask,
      yield* invoke(scope, "t3_project_task_update", {
        taskId: created.taskId,
        expectedRevision: 1,
        status: "active",
        nextAction: "Write tests",
        base: { branch: "other-branch", revision: "abc123" },
      }),
    );
    assert.equal(updated.revision, 2);
    assert.equal(updated.status, "active");
    assert.equal(updated.base?.branch, "other-branch");
    assert.isUndefined(updated.base?.worktreePath);
    assert.equal(updated.base?.revision, "abc123");

    const active = succeeded(
      ProjectRuntimeTaskListResult,
      yield* invoke(scope, "t3_project_task_list", { status: "active" }),
    );
    assert.deepEqual(
      active.tasks.map((task) => task.taskId),
      [created.taskId],
    );
    assert.lengthOf(
      succeeded(
        ProjectRuntimeTaskListResult,
        yield* invoke(scope, "t3_project_task_list", { status: "done" }),
      ).tasks,
      0,
    );
  }).pipe(Effect.scoped, Effect.provide(layerTest)),
);

it.effect("requires expectedRevision and reports a stale write as a structured conflict", () =>
  Effect.gen(function* () {
    const t = yield* setup;
    const scope = threadScope(threadA);
    const task = yield* t.task(projectA, "Contended");
    const first = succeeded(
      ProjectRuntimeTask,
      yield* invoke(scope, "t3_project_task_update", {
        taskId: task.taskId,
        expectedRevision: 1,
        title: "First writer",
      }),
    );
    assert.equal(first.revision, 2);

    assert.deepEqual(
      failedWith(
        yield* invoke(scope, "t3_project_task_update", {
          taskId: task.taskId,
          expectedRevision: 1,
          title: "Stale writer",
        }),
      ),
      {
        _tag: "ProjectRuntimeConflictError",
        projectId: projectA,
        entity: "task",
        entityId: task.taskId,
        expectedRevision: 1,
        currentRevision: 2,
      },
    );
    assert.equal((yield* t.runtime.readTask(projectA, task.taskId)).title, "First writer");
    assert.deepEqual(
      failedWith(
        yield* invoke(scope, "t3_project_task_update", {
          taskId: task.taskId,
          expectedRevision: 2,
          status: "done",
        }),
      ),
      {
        _tag: "ProjectRuntimeInvalidTransitionError",
        projectId: projectA,
        taskId: task.taskId,
        violation: "done_requires_result",
      },
    );

    const withoutRevision = yield* invoke(scope, "t3_project_task_update", {
      taskId: task.taskId,
      title: "No revision",
    }).pipe(Effect.flip);
    assert.equal((withoutRevision as { readonly _tag: string })._tag, "InvalidParams");
    assert.equal((yield* t.runtime.readTask(projectA, task.taskId)).title, "First writer");
  }).pipe(Effect.scoped, Effect.provide(layerTest)),
);

it.effect("appends immutable handoffs with provenance derived from the invocation", () =>
  Effect.gen(function* () {
    const t = yield* setup;
    const task = yield* t.task(projectA, "Handed off", "active");
    const scope = threadScope(threadA);
    yield* TestClock.adjust(1000);
    const appended = succeeded(
      ProjectRuntimeHandoff,
      yield* invoke(scope, "t3_project_handoff_append", {
        taskId: task.taskId,
        expectedTaskRevision: task.revision,
        taskState: { status: "review" },
        checkpoint: "PRT-040",
        summary: "Done",
        filesChanged: ["commit abc"],
        // Provenance is never accepted from the caller.
        threadId: "thread-spoofed",
        providerInstanceId: "claudeAgent",
        model: "spoofed-model",
        createdBy: "user:spoofed",
        runtimeRevision: 99,
        taskRevision: 99,
      }),
    );
    assert.equal(appended.threadId, threadA);
    assert.equal(appended.providerInstanceId, codex);
    assert.equal(appended.model, "gpt-5");
    assert.equal(appended.createdBy, `thread:${threadA}`);
    assert.equal(appended.taskRevision, task.revision);
    assert.deepEqual(appended.filesChanged, ["commit abc"]);
    const afterAppend = yield* t.runtime.readTask(projectA, task.taskId);
    assert.equal(afterAppend.status, "review");
    assert.equal(afterAppend.revision, 2);
    assert.equal(afterAppend.latestHandoffId, appended.handoffId);
    assert.deepInclude(
      failedWith(
        yield* invoke(scope, "t3_project_handoff_append", {
          taskId: task.taskId,
          expectedTaskRevision: task.revision,
          checkpoint: "stale",
          summary: "Stale append",
        }),
      ),
      {
        _tag: "ProjectRuntimeConflictError",
        expectedRevision: task.revision,
        currentRevision: 2,
      },
    );
    assert.lengthOf(
      succeeded(
        ProjectRuntimeHandoffListResult,
        yield* invoke(scope, "t3_project_handoff_list", { taskId: task.taskId }),
      ).handoffs,
      1,
    );

    // A client with no thread carries no thread, provider or model, and a stable session actor.
    yield* TestClock.adjust(1000);
    const external = succeeded(
      ProjectRuntimeHandoff,
      yield* invoke(clientScope(), "t3_project_handoff_append", {
        projectId: projectA,
        taskId: task.taskId,
        expectedTaskRevision: afterAppend.revision,
        checkpoint: "external",
        summary: "From outside",
      }),
    );
    assert.equal(external.createdBy, "mcp-client:session-9");
    assert.isUndefined(external.threadId);
    assert.isUndefined(external.providerInstanceId);
    assert.isUndefined(external.model);
    assert.equal(
      (yield* t.runtime.readTask(projectA, task.taskId)).latestHandoffId,
      external.handoffId,
    );

    const listed = succeeded(
      ProjectRuntimeHandoffListResult,
      yield* invoke(scope, "t3_project_handoff_list", { taskId: task.taskId }),
    );
    assert.deepEqual(
      listed.handoffs.map((handoff) => handoff.checkpoint),
      ["PRT-040", "external"],
    );
    assert.deepEqual(
      succeeded(
        ProjectRuntimeHandoff,
        yield* invoke(scope, "t3_project_handoff_read", { handoffId: appended.handoffId }),
      ),
      appended,
    );

    // Appending moved the task's revision only through the Runtime, and the stored handoff is intact.
    assert.deepEqual(yield* t.runtime.readHandoff(projectA, appended.handoffId), appended);
  }).pipe(Effect.scoped, Effect.provide(layerTest)),
);

it("records a thread's model only while it belongs to the provider holding the credential", () => {
  const scope = threadScope(threadA, claude);
  const shell = shells.get(threadA)!;
  const caller = (modelInstance: ProviderInstanceId | undefined) =>
    ({
      scope,
      caller:
        modelInstance === undefined
          ? undefined
          : {
              ...shell,
              modelSelection: { instanceId: modelInstance, model: "claude-opus" },
            },
    }) as never;
  assert.deepEqual(provenanceOf(caller(claude)), {
    actor: `thread:${threadA}`,
    threadId: threadA,
    providerInstanceId: claude,
    model: "claude-opus",
  });
  // The thread was pointed at another provider: its model says nothing about this caller.
  assert.deepEqual(provenanceOf(caller(codex)), {
    actor: `thread:${threadA}`,
    threadId: threadA,
    providerInstanceId: claude,
  });
  assert.deepEqual(
    provenanceOf({
      scope: { ...scope, thread: undefined, client: undefined },
      caller: undefined,
    } as never),
    {
      actor: "mcp:external",
    },
  );
});

it.effect("keeps a thread's agent inside its own project", () =>
  Effect.gen(function* () {
    const t = yield* setup;
    yield* t.runtime.saveInstructions(projectB, { instructions: "B only" }, maintainer);
    yield* t.write(projectB, "docs/b.md", `${BODY_MARKER} b\n`);
    const foreignSource = yield* t.register(projectB, "docs/b.md");
    const foreignTask = yield* t.task(projectB, "B task", "active");
    const foreignHandoff = yield* t.runtime.appendHandoff(
      projectB,
      {
        taskId: foreignTask.taskId,
        expectedTaskRevision: foreignTask.revision,
        checkpoint: "b",
        summary: "B handoff",
      },
      maintainer,
    );
    const ownTask = yield* t.task(projectA, "A task", "active");
    const scope = threadScope(threadA);

    // Naming another project is refused for every tool, without reading it.
    const refused = {
      _tag: "OrchestratorMcpFailure",
      code: "capability_denied",
      message:
        "An agent in a T3 thread can use Project Runtime only for its own project. Omit projectId.",
    };
    for (const [name, args] of [
      ["t3_project_context", {}],
      ["t3_project_source_list", {}],
      ["t3_project_source_search", { query: "b" }],
      ["t3_project_source_read", { sourceId: foreignSource.sourceId }],
      ["t3_project_task_list", {}],
      ["t3_project_task_read", { taskId: foreignTask.taskId }],
      ["t3_project_handoff_list", {}],
      ["t3_project_handoff_read", { handoffId: foreignHandoff.handoffId }],
      [
        "t3_project_task_create",
        { title: "x", scope: "s", acceptanceCriteria: [{ id: "c1", text: "c" }] },
      ],
      ["t3_project_task_update", { taskId: foreignTask.taskId, expectedRevision: 1 }],
      [
        "t3_project_handoff_append",
        {
          taskId: foreignTask.taskId,
          expectedTaskRevision: foreignTask.revision,
          checkpoint: "c",
          summary: "s",
        },
      ],
    ] as const) {
      assert.deepEqual(
        failedWith(yield* invoke(scope, name, { ...args, projectId: projectB })),
        refused,
        name,
      );
    }
    // Naming its own project is the same as omitting it.
    assert.equal(
      succeeded(
        ProjectRuntimeContext,
        yield* invoke(scope, "t3_project_context", { projectId: projectA }),
      ).projectId,
      projectA,
    );

    // A record ID from another project is not found in this one, and says nothing about it.
    const notFound = (entity: string, entityId: string) => ({
      _tag: "ProjectRuntimeNotFoundError",
      projectId: projectA,
      entity,
      entityId,
    });
    assert.deepEqual(
      failedWith(
        yield* invoke(scope, "t3_project_source_read", { sourceId: foreignSource.sourceId }),
      ),
      notFound("source", foreignSource.sourceId),
    );
    assert.deepEqual(
      failedWith(yield* invoke(scope, "t3_project_task_read", { taskId: foreignTask.taskId })),
      notFound("task", foreignTask.taskId),
    );
    assert.deepEqual(
      failedWith(
        yield* invoke(scope, "t3_project_task_update", {
          taskId: foreignTask.taskId,
          expectedRevision: 1,
          title: "Hijacked",
        }),
      ),
      notFound("task", foreignTask.taskId),
    );
    assert.deepEqual(
      failedWith(
        yield* invoke(scope, "t3_project_handoff_read", { handoffId: foreignHandoff.handoffId }),
      ),
      notFound("handoff", foreignHandoff.handoffId),
    );
    assert.deepEqual(
      failedWith(
        yield* invoke(scope, "t3_project_handoff_append", {
          taskId: foreignTask.taskId,
          expectedTaskRevision: foreignTask.revision,
          checkpoint: "x",
          summary: "Cross-project",
        }),
      ),
      notFound("task", foreignTask.taskId),
    );
    assert.deepEqual(
      failedWith(yield* invoke(scope, "t3_project_handoff_list", { taskId: foreignTask.taskId })),
      notFound("task", foreignTask.taskId),
    );

    // Nothing of project B was changed or surfaced.
    assert.equal((yield* t.runtime.readTask(projectB, foreignTask.taskId)).title, "B task");
    assert.lengthOf((yield* t.runtime.listHandoffs(projectB, {})).handoffs, 1);
    const own = succeeded(ProjectRuntimeContext, yield* invoke(scope, "t3_project_context"));
    assert.deepEqual(
      own.tasks.map((task) => task.taskId),
      [ownTask.taskId],
    );
    assert.isNull(own.instructions);
    assert.notInclude(JSON.stringify(own), "B only");
    assert.deepEqual(own.sources, []);
  }).pipe(Effect.scoped, Effect.provide(layerTest)),
);

it.effect("makes a client outside a thread name the project and keeps its access controls", () =>
  Effect.gen(function* () {
    const t = yield* setup;
    const task = yield* t.task(projectB, "B task", "active");

    assert.deepEqual(failedWith(yield* invoke(clientScope(), "t3_project_context")), {
      _tag: "OrchestratorMcpFailure",
      code: "target_required",
      message: "Pass projectId: this MCP client is not running inside a T3 thread.",
    });
    const read = succeeded(
      ProjectRuntimeTask,
      yield* invoke(clientScope(), "t3_project_task_read", {
        projectId: projectB,
        taskId: task.taskId,
      }),
    );
    assert.equal(read.title, "B task");
    // The task is not visible under another project.
    assert.equal(
      failedWith(
        yield* invoke(clientScope(), "t3_project_task_read", {
          projectId: projectA,
          taskId: task.taskId,
        }),
      )._tag,
      "ProjectRuntimeNotFoundError",
    );

    // Writes keep the environment-write rules: read-only clients, supervised threads, and
    // credentials without orchestration are refused, while reads stay available to the first two.
    const create = { title: "x", scope: "s", acceptanceCriteria: [{ id: "c1", text: "c" }] };
    assert.equal(
      failedWith(
        yield* invoke(clientScope("read-only"), "t3_project_task_create", {
          ...create,
          projectId: projectB,
        }),
      ).code,
      "capability_denied",
    );
    assert.equal(
      succeeded(
        ProjectRuntimeContext,
        yield* invoke(clientScope("read-only"), "t3_project_context", { projectId: projectB }),
      ).projectId,
      projectB,
    );
    assert.equal(
      failedWith(yield* invoke(threadScope(threadSupervised), "t3_project_task_create", create))
        .code,
      "capability_denied",
    );
    assert.equal(
      succeeded(
        ProjectRuntimeContext,
        yield* invoke(threadScope(threadSupervised), "t3_project_context"),
      ).projectId,
      projectA,
    );
    assert.equal(
      failedWith(
        yield* invoke({ ...clientScope(), capabilities: new Set<never>() }, "t3_project_context", {
          projectId: projectB,
        }),
      ).code,
      "capability_denied",
    );
    assert.lengthOf((yield* t.runtime.listTasks(projectA, {})).tasks, 0);
  }).pipe(Effect.scoped, Effect.provide(layerTest)),
);

it.effect("reports internal failures generically", () =>
  Effect.gen(function* () {
    const t = yield* setup;
    yield* t.sql`DROP TABLE project_runtime_handoffs`;
    const failure = failedWith(yield* invoke(threadScope(threadA), "t3_project_handoff_list"));
    assert.deepEqual(failure, {
      _tag: "OrchestratorMcpFailure",
      code: "orchestration_error",
      message: "The operation could not be completed.",
    });
  }).pipe(Effect.scoped, Effect.provide(layerTest)),
);

it.effect(
  "exposes the same inherited policy to different provider scopes without mutation tools",
  () =>
    Effect.gen(function* () {
      const { runtime } = yield* setup;
      const profiles = yield* DevelopmentProfileService.DevelopmentProfileService;
      const profile = yield* profiles.create(
        {
          name: "Shared development standard",
          instructions: "Use workflow A. Shared policy marker.",
        },
        maintainer,
      );
      yield* profiles.setAssignment({
        projectId: projectA,
        profileId: profile.profileId,
        expectedRevision: 0,
      });
      yield* profiles.setAssignment({
        projectId: projectOff,
        profileId: profile.profileId,
        expectedRevision: 0,
      });
      yield* runtime.saveInstructions(
        projectA,
        { instructions: "Use workflow B for this repository.", expectedRevision: 0 },
        maintainer,
      );
      const first = succeeded(
        ProjectRuntimeContext,
        yield* invoke(threadScope(threadA, codex), "t3_project_context"),
      );
      const second = succeeded(
        ProjectRuntimeContext,
        yield* invoke(threadScope(threadA, claude), "t3_project_context"),
      );
      assert.deepEqual(first, second);
      assert.deepEqual(first.developmentProfile, {
        profileId: profile.profileId,
        name: profile.name,
        revision: profile.revision,
      });
      assert.include(first.effectiveInstructions!, "Shared policy marker");
      assert.include(first.effectiveInstructions!, "workflow B");
      const disabled = succeeded(
        ProjectRuntimeContext,
        yield* invoke(threadScope(threadOff), "t3_project_context"),
      );
      assert.isFalse(disabled.status.enabled);
      assert.include(disabled.effectiveInstructions!, "Shared policy marker");
      assert.isNull(disabled.instructions);
      const isolated = succeeded(
        ProjectRuntimeContext,
        yield* invoke(threadScope(threadB), "t3_project_context"),
      );
      assert.equal(isolated.developmentProfile, undefined);
      const server = yield* McpServer.McpServer;
      assert.deepEqual(
        server.tools
          .filter(({ tool }) => /development_?profile/i.test(tool.name))
          .map(({ tool }) => tool.name),
        [],
      );
    }).pipe(Effect.provide(layerTest)),
);
