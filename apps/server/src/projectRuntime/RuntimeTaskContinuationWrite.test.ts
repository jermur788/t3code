import * as NodeCrypto from "@effect/platform-node/NodeCrypto";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import { ProjectId } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";
import * as SqlClient from "effect/sql/SqlClient";
import * as Runtime from "./ProjectRuntimeService.ts";
import {
  makeState,
  projectId,
  runPhase,
  seedAndCreateTasks,
  timestamp,
} from "./RuntimeTaskContinuationTest.layer.ts";

const cases = (["create", "update"] as const).flatMap((operation) =>
  (["foreign-review", "foreign-repair", "shape", "self-reference"] as const).map((invalid) => ({
    operation,
    invalid,
  })),
);
it.effect.each(cases)(
  "rejects $invalid continuation at $operation time with a typed error",
  ({ operation, invalid }) =>
    Effect.scoped(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const dir = yield* fs.makeTempDirectoryScoped();
        const state = makeState();
        yield* runPhase(
          state,
          `${dir}/write.sqlite`,
          Effect.gen(function* () {
            const runtime = yield* Runtime.ProjectRuntimeService;
            const sql = yield* SqlClient.SqlClient;
            const { source, review } = yield* seedAndCreateTasks(state);
            const foreignProject = ProjectId.make("foreign-project");
            yield* sql`INSERT INTO projection_projects(project_id,title,workspace_root,scripts_json,created_at,updated_at)
            VALUES (${foreignProject},'Private project','/tmp/private','[]',${timestamp},${timestamp})`;
            yield* runtime.setEnabled(foreignProject, { enabled: true });
            const foreign = yield* runtime.createTask(
              foreignProject,
              {
                title: "Private target",
                scope: "Private scope",
                acceptanceCriteria: [],
              },
              { actor: "user:operator" },
            );
            const before = yield* runtime.listTasks(projectId, {});
            const policy = {
              version: 1 as const,
              mode: "synthetic" as const,
              reviewTaskId: invalid === "foreign-review" ? foreign.taskId : review.taskId,
              ...(invalid === "foreign-repair" ? { repairTaskId: foreign.taskId } : {}),
              ...(invalid === "self-reference"
                ? { repairTaskId: operation === "update" ? source.taskId : review.taskId }
                : {}),
              maxRepairCycles: invalid === "shape" ? 3 : 1,
            };
            const continuation = policy;
            const exit = yield* (
              operation === "create"
                ? runtime.createTask(
                    projectId,
                    {
                      title: "Rejected",
                      scope: "Private policy scope",
                      acceptanceCriteria: [],
                      continuation,
                    },
                    { actor: "user:operator" },
                  )
                : runtime.updateTask(
                    projectId,
                    { taskId: source.taskId, expectedRevision: source.revision, continuation },
                    { actor: "user:operator" },
                  )
            ).pipe(Effect.exit);
            assert.isTrue(
              Exit.isFailure(exit),
              `expected typed rejection; observed ${JSON.stringify(exit)}`,
            );
            if (Exit.isFailure(exit)) {
              const failure = Exit.findError(exit);
              assert.isTrue(
                Result.isSuccess(failure),
                `expected Fail, observed ${JSON.stringify(exit)}`,
              );
              if (Result.isSuccess(failure)) {
                assert.equal(
                  failure.success._tag,
                  invalid.startsWith("foreign-")
                    ? "ProjectRuntimeNotFoundError"
                    : "ProjectRuntimeRequestError",
                );
                if (failure.success._tag === "ProjectRuntimeRequestError")
                  assert.equal(failure.success.reason, "invalid_request");
                assert.notInclude(JSON.stringify(failure.success), "Private");
              }
            }
            assert.deepEqual(yield* runtime.listTasks(projectId, {}), before);
            assert.deepEqual(yield* runtime.readTask(projectId, source.taskId), source);
            assert.equal(state.launches.length, 0);
          }),
        );
      }),
    ).pipe(Effect.provide(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer))),
);
