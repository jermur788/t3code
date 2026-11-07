import * as NodeCrypto from "@effect/platform-node/NodeCrypto";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import { ProjectId } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as SqlClient from "effect/sql/SqlClient";

import * as ProjectRuntimeService from "./ProjectRuntimeService.ts";
import * as RuntimeTaskExecutionService from "./RuntimeTaskExecutionService.ts";
import {
  appendHandoff,
  attemptByKey,
  claude,
  codex,
  completeRun,
  makeLayer,
  makeState,
  projectId,
  resolution,
  runPhase,
  seedAndCreateTasks,
  timestamp,
} from "./RuntimeTaskContinuationTest.layer.ts";

const platform = Layer.mergeAll(NodeServices.layer, NodeCrypto.layer);

it.effect(
  "K3: operator policy, handoff and two-provider receipts survive close/reopen and revocation",
  () =>
    Effect.scoped(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const home = yield* fs.makeTempDirectoryScoped();
        const dbPath = `${home}/userdata/statev2.sqlite`;
        const state = makeState();
        const saved = yield* runPhase(
          state,
          dbPath,
          Effect.gen(function* () {
            const runtime = yield* ProjectRuntimeService.ProjectRuntimeService;
            const execution = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
            const tasks = yield* seedAndCreateTasks(state);
            assert.equal(
              (yield* runtime.readTask(projectId, tasks.source.taskId)).continuation
                ?.maxRepairCycles,
              2,
            );
            const source = yield* runtime.updateTask(
              projectId,
              {
                taskId: tasks.source.taskId,
                expectedRevision: tasks.source.revision,
                continuation: { ...tasks.source.continuation!, maxRepairCycles: 1 },
              },
              { actor: "user:maintainer" },
            );
            const worker = yield* execution.execute(projectId, {
              taskId: source.taskId,
              expectedTaskRevision: source.revision,
            });
            const handoff = yield* appendHandoff(worker, { milestone: "none", result: "none" });
            completeRun(state, worker.threadId);
            yield* execution.reconcileAttempt(projectId, worker.attemptId);
            const review = yield* attemptByKey(
              tasks.review.taskId,
              `cont:v1:r:${worker.attemptId}`,
            );
            return {
              ...tasks,
              source: yield* runtime.readTask(projectId, source.taskId),
              worker: yield* execution.readAttempt(projectId, worker.attemptId),
              review,
              handoff,
            };
          }),
        );
        assert.deepEqual(
          state.launches.map((launch) => launch.modelSelection.instanceId),
          [codex, claude],
        );
        assert.equal(saved.worker.modelSelection.instanceId, codex);
        assert.equal(saved.review.modelSelection.instanceId, claude);
        assert.lengthOf(state.providerStubs.get(codex)!.starts, 1);
        assert.lengthOf(state.providerStubs.get(claude)!.starts, 1);

        yield* runPhase(
          state,
          dbPath,
          Effect.gen(function* () {
            const runtime = yield* ProjectRuntimeService.ProjectRuntimeService;
            const execution = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
            assert.deepEqual(yield* runtime.readTask(projectId, saved.source.taskId), saved.source);
            assert.deepEqual(
              yield* runtime.readHandoff(projectId, saved.handoff.handoffId),
              saved.handoff,
            );
            assert.deepEqual(
              yield* execution.readAttempt(projectId, saved.worker.attemptId),
              saved.worker,
            );
            assert.deepEqual(
              yield* execution.readAttempt(projectId, saved.review.attemptId),
              saved.review,
            );
            yield* runtime.updateTask(
              projectId,
              {
                taskId: saved.source.taskId,
                expectedRevision: saved.source.revision,
                continuation: null,
              },
              { actor: "user:maintainer" },
            );
          }),
        );

        state.runs.set(saved.review.threadId, []);
        const recover = Effect.gen(function* () {
          const runtime = yield* ProjectRuntimeService.ProjectRuntimeService;
          const execution = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          yield* execution.reconcileActiveAttempts();
          yield* execution.reconcileAttempt(projectId, saved.worker.attemptId);
          const review = yield* execution.readAttempt(projectId, saved.review.attemptId);
          assert.equal(review.status, "reconcile_required");
          assert.deepEqual(review.receipt, saved.review.receipt);
          assert.isUndefined(
            (yield* runtime.readTask(projectId, saved.source.taskId)).continuation,
          );
          assert.lengthOf(
            (yield* execution.listAttempts(projectId, { taskId: saved.repair.taskId })).attempts,
            0,
          );
          assert.lengthOf(
            (yield* execution.listAttempts(projectId, { taskId: saved.review.taskId })).attempts,
            1,
          );
          return review;
        });
        const first = yield* runPhase(state, dbPath, recover);
        const replay = yield* runPhase(state, dbPath, recover);
        assert.deepEqual(replay, first);
        assert.lengthOf(state.launches, 2);
      }),
    ).pipe(Effect.provide(platform)),
);

it.effect(
  "K3: a disabled restarted server does not continue persisted policy; ordinary projects still run",
  () =>
    Effect.scoped(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const home = yield* fs.makeTempDirectoryScoped();
        const dbPath = `${home}/userdata/statev2.sqlite`;
        const state = makeState();
        const saved = yield* runPhase(
          state,
          dbPath,
          Effect.gen(function* () {
            const execution = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
            const tasks = yield* seedAndCreateTasks(state);
            const worker = yield* execution.execute(projectId, {
              taskId: tasks.source.taskId,
              expectedTaskRevision: tasks.source.revision,
            });
            yield* appendHandoff(worker, { milestone: "none", result: "none" });
            completeRun(state, worker.threadId);
            return { ...tasks, worker };
          }),
        );
        const otherProject = ProjectId.make("k3-independent-project");
        yield* Effect.gen(function* () {
          const runtime = yield* ProjectRuntimeService.ProjectRuntimeService;
          const execution = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          const sql = yield* SqlClient.SqlClient;
          yield* execution.reconcileActiveAttempts();
          assert.lengthOf(state.launches, 1);
          assert.lengthOf(
            (yield* execution.listAttempts(projectId, { taskId: saved.review.taskId })).attempts,
            0,
          );
          assert.isDefined((yield* runtime.readTask(projectId, saved.source.taskId)).continuation);
          yield* sql`INSERT INTO projection_projects (project_id, title, workspace_root, scripts_json, created_at, updated_at)
          VALUES (${otherProject}, 'Independent', '/tmp/k3-independent', '[]', ${timestamp}, ${timestamp})`;
          yield* runtime.setEnabled(otherProject, { enabled: true });
          for (const destination of [projectId, otherProject]) {
            const ordinary = yield* runtime.createTask(
              destination,
              {
                title: "Ordinary task",
                scope: "No continuation authority",
                owner: "user:maintainer",
                acceptanceCriteria: [],
                status: "ready",
              },
              { actor: "user:maintainer" },
            );
            const updated = yield* runtime.updateTask(
              destination,
              {
                taskId: ordinary.taskId,
                expectedRevision: ordinary.revision,
                title: "Updated ordinary task",
              },
              { actor: "user:maintainer" },
            );
            state.routes.set(
              ordinary.taskId,
              resolution(ordinary.taskId, codex, "codex", "gpt-6", destination),
            );
            const attempt = yield* execution.execute(destination, {
              taskId: ordinary.taskId,
              expectedTaskRevision: updated.revision,
              clientRequestId: `ordinary-${destination}`,
            });
            assert.equal(attempt.status, "launched");
            assert.isUndefined(
              (yield* runtime.readTask(destination, ordinary.taskId)).continuation,
            );
            const wrongProject = destination === projectId ? otherProject : projectId;
            const denied = yield* execution
              .readAttempt(wrongProject, attempt.attemptId)
              .pipe(Effect.flip);
            assert.equal(denied._tag, "RuntimeExecutionAttemptNotFoundError");
          }
          assert.lengthOf(state.launches, 3);
        }).pipe(Effect.provide(makeLayer(state, dbPath, false)));
        yield* Effect.gen(function* () {
          const execution = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          yield* execution.reconcileActiveAttempts();
          assert.lengthOf((yield* execution.listAttempts(otherProject, {})).attempts, 1);
          assert.lengthOf((yield* execution.listAttempts(projectId, {})).attempts, 2);
          assert.lengthOf(state.launches, 3);
        }).pipe(Effect.provide(makeLayer(state, dbPath, false)));
      }),
    ).pipe(Effect.provide(platform)),
);
