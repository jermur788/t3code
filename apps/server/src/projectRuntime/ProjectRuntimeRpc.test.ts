import * as DevelopmentProfileService from "../developmentProfiles/DevelopmentProfileService.ts";
import { PersistenceSqlError } from "../persistence/Errors.ts";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import {
  AuthOrchestrationOperateScope,
  AuthOrchestrationReadScope,
  PROJECT_RUNTIME_RPCS,
  PROJECT_RUNTIME_RPC_METHODS as M,
  RpcScopeAuthorization,
  ProjectId,
} from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as SqlClient from "effect/sql/SqlClient";
import { RpcGroup, RpcTest } from "effect/rpc";
import * as RpcAuthorization from "../auth/RpcAuthorization.ts";
import * as ServerConfig from "../config.ts";
import * as ProjectStore from "../orchestration-v2/ProjectStore.ts";
import * as Sqlite from "../persistence/Sqlite.ts";
import * as KnownWorkspaces from "../workspace/KnownWorkspaces.ts";
import * as WorkspaceEntries from "../workspace/WorkspaceEntries.ts";
import * as WorkspaceFileSystem from "../workspace/WorkspaceFileSystem.ts";
import * as WorkspacePaths from "../workspace/WorkspacePaths.ts";
import * as Runtime from "./ProjectRuntimeService.ts";
import * as Sources from "./ProjectRuntimeSourceAccess.ts";
import { makeHandlers } from "./ProjectRuntimeRpc.ts";

const group = RpcGroup.make(...PROJECT_RUNTIME_RPCS).middleware(RpcScopeAuthorization);
const workspace = WorkspaceFileSystem.layer.pipe(
  Layer.provideMerge(WorkspaceEntries.layer.pipe(Layer.provide(WorkspacePaths.layer))),
  Layer.provideMerge(WorkspacePaths.layer),
  Layer.provide(Layer.mock(KnownWorkspaces.KnownWorkspaces)({ assertContains: () => Effect.void })),
);
const layer = Sources.layer.pipe(
  Layer.provideMerge(Runtime.layer.pipe(Layer.provide(DevelopmentProfileService.layer))),
  Layer.provideMerge(ProjectStore.layer),
  Layer.provideMerge(workspace),
  Layer.provideMerge(Sqlite.layerMemory),
  Layer.provide(ServerConfig.ServerConfig.layerTest(process.cwd(), { prefix: "runtime-ui-rpc-" })),
  Layer.provideMerge(NodeServices.layer),
);
const a = ProjectId.make("a");
const b = ProjectId.make("b");
const setup = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const sql = yield* SqlClient.SqlClient;
  const root = yield* fs.makeTempDirectoryScoped();
  for (const id of [a, b])
    yield* sql`INSERT INTO projection_projects(project_id,title,workspace_root,scripts_json,created_at,updated_at) VALUES (${id},'Grouped project',${root},'[]','2026-10-23T00:00:00.000Z','2026-10-23T00:00:00.000Z')`;
  const handlers = yield* makeHandlers("maintainer");
  const client = yield* RpcTest.makeClient(group).pipe(
    Effect.provide(
      Layer.mergeAll(
        group.toLayer(handlers),
        RpcAuthorization.layer([AuthOrchestrationReadScope, AuthOrchestrationOperateScope]),
      ),
    ),
  );
  return { fs, root, client, handlers, runtime: yield* Runtime.ProjectRuntimeService };
});

it.effect(
  "targets a concrete project, preserves all data across disable, and rejects stale edits",
  () =>
    Effect.gen(function* () {
      const { client, fs, root, runtime } = yield* setup;
      assert.isFalse((yield* client[M.status]({ projectId: a })).enabled);
      yield* client[M.setEnabled]({ projectId: a, enabled: true });
      yield* client[M.setEnabled]({ projectId: b, enabled: true });
      const instructions = yield* client[M.saveInstructions]({
        projectId: a,
        instructions: "Project A",
        expectedRevision: 0,
      });
      assert.isNull(yield* client[M.readInstructions]({ projectId: b }));
      assert.equal(
        (yield* client[M.saveInstructions]({
          projectId: a,
          instructions: "Concurrent first save",
          expectedRevision: 0,
        }).pipe(Effect.flip))._tag,
        "ProjectRuntimeConflictError",
      );
      assert.equal(
        (yield* client[M.saveInstructions]({
          projectId: a,
          instructions: "Updated",
          expectedRevision: instructions.revision,
        })).revision,
        2,
      );
      assert.equal(
        (yield* client[M.saveInstructions]({
          projectId: a,
          instructions: "Stale",
          expectedRevision: 1,
        }).pipe(Effect.flip))._tag,
        "ProjectRuntimeConflictError",
      );
      yield* fs.writeFileString(`${root}/notes.md`, "Evidence");
      const source = yield* client[M.createSource]({
        projectId: a,
        title: "Notes",
        role: "reference",
        relativePath: "notes.md",
      });
      yield* client[M.createSource]({
        projectId: a,
        title: "Missing",
        role: "knowledge",
        relativePath: "missing.md",
      });
      yield* fs.writeFile(`${root}/binary.txt`, new Uint8Array([0, 1, 2]));
      yield* client[M.createSource]({
        projectId: a,
        title: "Binary",
        role: "reference",
        relativePath: "binary.txt",
      });
      const health = yield* client[M.listSources]({ projectId: a });
      assert.sameMembers(
        health.sources.map((x) => x.health),
        ["available", "missing", "unsupported"],
      );
      const edited = yield* client[M.updateSource]({
        projectId: a,
        sourceId: source.sourceId,
        expectedRevision: 1,
        title: "Edited",
        enabled: false,
      });
      assert.equal(edited.revision, 2);
      assert.equal(
        (yield* client[M.updateSource]({
          projectId: a,
          sourceId: source.sourceId,
          expectedRevision: 1,
          title: "Stale",
        }).pipe(Effect.flip))._tag,
        "ProjectRuntimeConflictError",
      );
      yield* client[M.updateSource]({
        projectId: a,
        sourceId: source.sourceId,
        expectedRevision: 2,
        enabled: true,
      });
      const task = yield* client[M.createTask]({
        projectId: a,
        title: "Task",
        scope: "Scope",
        acceptanceCriteria: [{ id: "c1", text: "Criteria" }],
        base: { branch: "descriptive", worktreePath: "/metadata-only" },
      });
      const updated = yield* client[M.updateTask]({
        projectId: a,
        taskId: task.taskId,
        expectedRevision: 1,
        status: "review",
        nextAction: "Inspect",
      });
      assert.equal(updated.revision, 2);
      assert.equal(
        (yield* client[M.updateTask]({
          projectId: a,
          taskId: task.taskId,
          expectedRevision: 1,
          status: "done",
        }).pipe(Effect.flip))._tag,
        "ProjectRuntimeConflictError",
      );
      assert.equal(
        (yield* client[M.readTask]({ projectId: b, taskId: task.taskId }).pipe(Effect.flip))._tag,
        "ProjectRuntimeNotFoundError",
      );
      const handoff = yield* runtime.appendHandoff(
        a,
        {
          taskId: task.taskId,
          checkpoint: "Checkpoint",
          summary: "Saved",
          verification: { milestone: "implemented", evidence: [] },
        },
        { actor: "user:maintainer" },
      );
      const before = {
        instructions: yield* client[M.readInstructions]({ projectId: a }),
        sources: yield* client[M.listSources]({ projectId: a }),
        tasks: yield* client[M.listTasks]({ projectId: a }),
        handoffs: yield* client[M.listHandoffs]({ projectId: a, taskId: task.taskId }),
      };
      yield* client[M.setEnabled]({ projectId: a, enabled: false });
      assert.equal(
        (yield* client[M.listTasks]({ projectId: a }).pipe(Effect.flip))._tag,
        "ProjectRuntimeDisabledError",
      );
      yield* client[M.setEnabled]({ projectId: a, enabled: true });
      assert.deepEqual(
        {
          instructions: yield* client[M.readInstructions]({ projectId: a }),
          sources: yield* client[M.listSources]({ projectId: a }),
          tasks: yield* client[M.listTasks]({ projectId: a }),
          handoffs: yield* client[M.listHandoffs]({ projectId: a, taskId: task.taskId }),
        },
        before,
      );
      assert.deepEqual(
        (yield* client[M.readHandoff]({ projectId: a, handoffId: handoff.handoffId })).verification,
        { milestone: "implemented", evidence: [] },
      );
      assert.isEmpty((yield* client[M.listTasks]({ projectId: b })).tasks);
      assert.isEmpty((yield* client[M.listSources]({ projectId: b })).sources);
      yield* client[M.removeSource]({
        projectId: a,
        sourceId: source.sourceId,
        expectedRevision: 3,
      });
      assert.equal(yield* fs.readFileString(`${root}/notes.md`), "Evidence");
      assert.equal(
        (yield* client[M.createSource]({
          projectId: a,
          title: "Unsafe",
          role: "authority",
          relativePath: "../outside",
        }).pipe(Effect.flip))._tag,
        "ProjectRuntimeSourcePathError",
      );
      assert.equal(
        (yield* client[M.status]({ projectId: ProjectId.make("absent") }).pipe(Effect.flip))._tag,
        "ProjectRuntimeRequestError",
      );
    }).pipe(Effect.scoped, Effect.provide(layer)),
);

it.effect(
  "lets read-only connections inspect Runtime but rejects every mutation before execution",
  () =>
    Effect.gen(function* () {
      const { handlers, client } = yield* setup;
      yield* client[M.setEnabled]({ projectId: a, enabled: true });
      const readonly = yield* RpcTest.makeClient(group).pipe(
        Effect.provide(
          Layer.mergeAll(
            group.toLayer(handlers),
            RpcAuthorization.layer([AuthOrchestrationReadScope]),
          ),
        ),
      );
      assert.isTrue((yield* readonly[M.status]({ projectId: a })).enabled);
      const attempts = [
        readonly[M.setEnabled]({ projectId: a, enabled: false }),
        readonly[M.saveInstructions]({ projectId: a, instructions: "Denied" }),
        readonly[M.createSource]({
          projectId: a,
          title: "Denied",
          role: "reference",
          relativePath: "x",
        }),
        readonly[M.updateSource]({ projectId: a, sourceId: "absent" as never, title: "Denied" }),
        readonly[M.removeSource]({ projectId: a, sourceId: "absent" as never }),
        readonly[M.createTask]({
          projectId: a,
          title: "Denied",
          scope: "",
          acceptanceCriteria: [],
        }),
        readonly[M.updateTask]({
          projectId: a,
          taskId: "absent" as never,
          expectedRevision: 1,
          status: "done",
        }),
      ];
      for (const attempt of attempts)
        assert.equal((yield* attempt.pipe(Effect.flip))._tag, "EnvironmentAuthorizationError");
      assert.isTrue((yield* client[M.status]({ projectId: a })).enabled);
      assert.isNull(yield* client[M.readInstructions]({ projectId: a }));
      assert.isEmpty((yield* client[M.listSources]({ projectId: a })).sources);
      assert.isEmpty((yield* client[M.listTasks]({ projectId: a })).tasks);
    }).pipe(Effect.scoped, Effect.provide(layer)),
);

it.effect("redacts persistence details at the user transport boundary", () =>
  Effect.gen(function* () {
    const handlers = yield* makeHandlers("maintainer").pipe(
      Effect.provide(
        Layer.mergeAll(
          Layer.mock(Runtime.ProjectRuntimeService)({
            getStatus: () =>
              Effect.fail(
                new PersistenceSqlError({
                  operation: "readRuntime",
                  detail: "private SQL and /internal/database",
                  cause: new Error("internal stack"),
                }),
              ),
          }),
          Layer.mock(Sources.ProjectRuntimeSourceAccess)({}),
        ),
      ),
    );
    const client = yield* RpcTest.makeClient(group).pipe(
      Effect.provide(
        Layer.mergeAll(
          group.toLayer(handlers),
          RpcAuthorization.layer([AuthOrchestrationReadScope]),
        ),
      ),
    );
    const failure = yield* client[M.status]({ projectId: a }).pipe(Effect.flip);
    assert.equal(failure._tag, "ProjectRuntimeRequestError");
    assert.notInclude(JSON.stringify(failure), "private SQL");
    assert.notInclude(JSON.stringify(failure), "/internal/database");
    assert.notInclude(JSON.stringify(failure), "internal stack");
  }).pipe(Effect.scoped),
);
