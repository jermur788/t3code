import * as NodeCrypto from "@effect/platform-node/NodeCrypto";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import type { RuntimeExecutionAttempt } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as SqlClient from "effect/sql/SqlClient";

import * as ProjectRuntimeService from "./ProjectRuntimeService.ts";
import * as RuntimeTaskExecutionService from "./RuntimeTaskExecutionService.ts";
import {
  projectId,
  claude,
  makeState,
  runPhase as process,
  completeRun,
  seedAndCreateTasks,
  appendHandoff,
  attemptByKey,
  requestKeyOf,
  type State,
} from "./RuntimeTaskContinuationTest.layer.ts";

it.effect("dispatches one review from a file-backed restart and never elevates the source", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const dir = yield* fs.makeTempDirectoryScoped();
      const dbPath = `${dir}/continuation.sqlite`;
      const state = makeState();

      const created = yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          const tasks = yield* seedAndCreateTasks(state);
          const worker = yield* service.execute(projectId, {
            taskId: tasks.source.taskId,
            expectedTaskRevision: tasks.source.revision,
          });
          const workerHandoff = yield* appendHandoff(worker, {
            milestone: "none",
            result: "none",
          });
          return { ...tasks, worker, workerHandoff };
        }),
      );
      assert.equal(state.launches.length, 1);
      // The attempt receipt existed, and was still pending, before launch.
      assert.deepEqual(state.receiptsAtLaunch[0], [
        { attemptId: created.worker.attemptId, status: "pending" },
      ]);

      completeRun(state, created.worker.threadId);

      // Restart 1: settle the worker and dispatch exactly one review.
      const reviewAttempt = yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          const reconciled = yield* service.reconcileAttempt(projectId, created.worker.attemptId);
          assert.equal(reconciled.status, "completed");
          yield* service.reconcileAttempt(projectId, created.worker.attemptId);
          yield* service.reconcileActiveAttempts();
          const attempt = yield* attemptByKey(
            created.review.taskId,
            `cont:v1:r:${created.worker.attemptId}`,
          );
          return { attempt, requestKey: yield* requestKeyOf(attempt.attemptId) };
        }),
      );
      assert.equal(state.launches.length, 2);
      const reviewLaunch = state.launches[1]!;
      assert.equal(reviewLaunch.modelSelection.instanceId, claude);
      const reviewPacket = reviewLaunch.initialMessage?.text ?? "";
      assert.include(reviewPacket, created.worker.attemptId);
      assert.include(reviewPacket, created.workerHandoff.handoffId);
      assert.equal(reviewAttempt.attempt.status, "launched");
      const reviewRequestKey = reviewAttempt.requestKey;
      const review = reviewAttempt.attempt;

      // Restart 2: startup scan must not duplicate the launched review.
      yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          yield* service.reconcileActiveAttempts();
        }),
      );
      assert.equal(state.launches.length, 2);

      // Restart 3: a passing review launches no repair and does not verify the source.
      const finalSource = yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const runtime = yield* ProjectRuntimeService.ProjectRuntimeService;
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          completeRun(state, review.threadId);
          yield* appendHandoff(review, { milestone: "review-pass", result: "pass" });
          yield* service.reconcileAttempt(projectId, review.attemptId);
          yield* service.reconcileActiveAttempts();
          return yield* runtime.readTask(projectId, created.source.taskId);
        }),
      );
      assert.equal(state.launches.length, 2);
      const repairAttempts = yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          return yield* service.listAttempts(projectId, { taskId: created.repair.taskId });
        }),
      );
      assert.isEmpty(repairAttempts.attempts);
      assert.equal(finalSource.verification.milestone, "none");
      assert.equal(finalSource.status, "ready");
      assert.equal(reviewRequestKey, `cont:v1:r:${created.worker.attemptId}`);
    }),
  ).pipe(Effect.provide(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer))),
);

it.effect("replays a persisted pending review receipt with its original ids after restart", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const dir = yield* fs.makeTempDirectoryScoped();
      const dbPath = `${dir}/continuation.sqlite`;
      const state = makeState();

      const created = yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          const tasks = yield* seedAndCreateTasks(state);
          const worker = yield* service.execute(projectId, {
            taskId: tasks.source.taskId,
            expectedTaskRevision: tasks.source.revision,
          });
          yield* appendHandoff(worker, { milestone: "none", result: "none" });
          return { ...tasks, worker };
        }),
      );
      completeRun(state, created.worker.threadId);
      const reviewAttempt = yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          yield* service.reconcileAttempt(projectId, created.worker.attemptId);
          return yield* attemptByKey(
            created.review.taskId,
            `cont:v1:r:${created.worker.attemptId}`,
          );
        }),
      );
      assert.equal(state.launches.length, 2);
      const original = state.launches[1]!;

      // Crash between receipt insert and launch: the row is still pending.
      yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const sql = yield* SqlClient.SqlClient;
          yield* sql`UPDATE project_runtime_execution_attempts
            SET status = 'pending', run_id = NULL,
              payload_json = json_set(payload_json, '$.status', 'pending', '$.runId', NULL)
            WHERE attempt_id = ${reviewAttempt.attemptId}`;
        }),
      );

      const replayed = yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          state.runs.delete(reviewAttempt.threadId);
          yield* service.reconcileActiveAttempts();
          return yield* service.readAttempt(projectId, reviewAttempt.attemptId);
        }),
      );
      assert.equal(replayed.status, "launched");
      assert.equal(state.launches.length, 3);
      assert.equal(state.launches[2]?.threadId, original.threadId);
      assert.equal(
        state.launches[2]?.initialMessage?.messageId,
        original.initialMessage?.messageId,
      );
      // The replay reuses the stored receipt; it does not create a second one.
      assert.deepEqual(state.receiptsAtLaunch[2], [
        { attemptId: reviewAttempt.attemptId, status: "pending" },
      ]);
    }),
  ).pipe(Effect.provide(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer))),
);

it.effect("bounds two repairs across restarts and leaves one durable operator blocker", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const dir = yield* fs.makeTempDirectoryScoped();
      const dbPath = `${dir}/continuation.sqlite`;
      const state = makeState();

      const created = yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          const tasks = yield* seedAndCreateTasks(state);
          const worker = yield* service.execute(projectId, {
            taskId: tasks.source.taskId,
            expectedTaskRevision: tasks.source.revision,
          });
          yield* appendHandoff(worker, { milestone: "none", result: "none" });
          return { ...tasks, worker };
        }),
      );
      completeRun(state, created.worker.threadId);

      let review: RuntimeExecutionAttempt;
      let repair: RuntimeExecutionAttempt;
      review = yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          yield* service.reconcileAttempt(projectId, created.worker.attemptId);
          return yield* attemptByKey(
            created.review.taskId,
            `cont:v1:r:${created.worker.attemptId}`,
          );
        }),
      );
      assert.equal(state.launches.length, 2);

      const firstRepair = yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          completeRun(state, review.threadId);
          yield* appendHandoff(review, { milestone: "none", result: "fail" });
          yield* service.reconcileAttempt(projectId, review.attemptId);
          const attempt = yield* attemptByKey(
            created.repair.taskId,
            `cont:v1:p:${review.attemptId}`,
          );
          return { attempt, requestKey: yield* requestKeyOf(attempt.attemptId) };
        }),
      );
      assert.equal(state.launches.length, 3);
      assert.equal(firstRepair.requestKey, `cont:v1:p:${review.attemptId}`);
      repair = firstRepair.attempt;

      // Repair 1 completes, and the next review is linked to that repair.
      const secondReview = yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          completeRun(state, repair.threadId);
          yield* appendHandoff(repair, { milestone: "none", result: "none" });
          yield* service.reconcileAttempt(projectId, repair.attemptId);
          const attempt = yield* attemptByKey(
            created.review.taskId,
            `cont:v1:r:${repair.attemptId}`,
          );
          return { attempt, requestKey: yield* requestKeyOf(attempt.attemptId) };
        }),
      );
      assert.equal(state.launches.length, 4);
      assert.equal(secondReview.requestKey, `cont:v1:r:${repair.attemptId}`);
      assert.include(state.launches[3]?.initialMessage?.text ?? "", repair.attemptId);
      review = secondReview.attempt;

      // Second failure, second repair.
      repair = yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          completeRun(state, review.threadId);
          yield* appendHandoff(review, { milestone: "none", result: "fail" });
          yield* service.reconcileAttempt(projectId, review.attemptId);
          return yield* attemptByKey(created.repair.taskId, `cont:v1:p:${review.attemptId}`);
        }),
      );
      assert.equal(state.launches.length, 5);

      review = yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          completeRun(state, repair.threadId);
          yield* appendHandoff(repair, { milestone: "none", result: "none" });
          yield* service.reconcileAttempt(projectId, repair.attemptId);
          return yield* attemptByKey(created.review.taskId, `cont:v1:r:${repair.attemptId}`);
        }),
      );
      assert.equal(state.launches.length, 6);

      // Third failure exceeds the two-cycle budget: block once, dispatch nothing.
      const source = yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const runtime = yield* ProjectRuntimeService.ProjectRuntimeService;
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          completeRun(state, review.threadId);
          yield* appendHandoff(review, { milestone: "none", result: "fail" });
          yield* service.reconcileAttempt(projectId, review.attemptId);
          yield* service.reconcileActiveAttempts();
          return yield* runtime.readTask(projectId, created.source.taskId);
        }),
      );
      assert.equal(state.launches.length, 6);
      assert.equal(source.status, "blocked");
      assert.equal(source.blocker?.classification, "review-required");
      assert.match(source.nextAction ?? "", /authorize/i);

      // Restart: the same durable blocker is reused; no third repair appears.
      const restarted = yield* process(
        state,
        dbPath,
        Effect.gen(function* () {
          const runtime = yield* ProjectRuntimeService.ProjectRuntimeService;
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          yield* service.reconcileActiveAttempts();
          yield* service.reconcileAttempt(projectId, review.attemptId);
          return {
            source: yield* runtime.readTask(projectId, created.source.taskId),
            repairs: yield* service.listAttempts(projectId, { taskId: created.repair.taskId }),
            reviews: yield* service.listAttempts(projectId, { taskId: created.review.taskId }),
          };
        }),
      );
      assert.equal(state.launches.length, 6);
      assert.equal(restarted.repairs.attempts.length, 2);
      assert.equal(restarted.reviews.attempts.length, 3);
      assert.equal(restarted.source.status, "blocked");
      assert.equal(restarted.source.revision, source.revision);
    }),
  ).pipe(Effect.provide(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer))),
);

it.effect("keeps a failed or ambiguous review launch from authorizing more work", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const dir = yield* fs.makeTempDirectoryScoped();

      const setupThroughReview = (state: State, dbPath: string) =>
        process(
          state,
          dbPath,
          Effect.gen(function* () {
            const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
            const tasks = yield* seedAndCreateTasks(state);
            const worker = yield* service.execute(projectId, {
              taskId: tasks.source.taskId,
              expectedTaskRevision: tasks.source.revision,
            });
            yield* appendHandoff(worker, { milestone: "none", result: "none" });
            completeRun(state, worker.threadId);
            yield* service.reconcileAttempt(projectId, worker.attemptId);
            const review = yield* attemptByKey(
              tasks.review.taskId,
              `cont:v1:r:${worker.attemptId}`,
            );
            return { ...tasks, worker, review };
          }),
        );

      // Failed launch: the review row is terminal, so nothing is re-authorized.
      const failedState = makeState();
      const failed = yield* setupThroughReview(failedState, `${dir}/failed.sqlite`);
      assert.equal(failedState.launches.length, 2);
      const failedResult = yield* process(
        failedState,
        `${dir}/failed.sqlite`,
        Effect.gen(function* () {
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          const sql = yield* SqlClient.SqlClient;
          yield* sql`UPDATE project_runtime_execution_attempts
            SET status = 'failed', run_id = NULL,
              payload_json = json_set(payload_json, '$.status', 'failed', '$.runId', NULL)
            WHERE attempt_id = ${failed.review.attemptId}`;
          failedState.runs.delete(failed.review.threadId);
          yield* service.reconcileActiveAttempts();
          return {
            attempt: yield* service.readAttempt(projectId, failed.review.attemptId),
            repairs: yield* service.listAttempts(projectId, { taskId: failed.repair.taskId }),
          };
        }),
      );
      assert.equal(failedResult.attempt.status, "failed");
      assert.isEmpty(failedResult.repairs.attempts);
      assert.equal(failedState.launches.length, 2);

      // Ambiguous launch: the attempt stays active for an operator, unlaunched.
      const ambiguousState = makeState();
      const ambiguous = yield* setupThroughReview(ambiguousState, `${dir}/ambiguous.sqlite`);
      const ambiguousResult = yield* process(
        ambiguousState,
        `${dir}/ambiguous.sqlite`,
        Effect.gen(function* () {
          const service = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          // The thread still exists but reports no run for this attempt.
          ambiguousState.runs.set(ambiguous.review.threadId, []);
          const first = yield* service.reconcileAttempt(projectId, ambiguous.review.attemptId);
          yield* service.reconcileActiveAttempts();
          return {
            first: first.status,
            attempt: yield* service.readAttempt(projectId, ambiguous.review.attemptId),
            repairs: yield* service.listAttempts(projectId, { taskId: ambiguous.repair.taskId }),
          };
        }),
      );
      assert.equal(ambiguousResult.first, "reconcile_required");
      assert.equal(ambiguousResult.attempt.status, "reconcile_required");
      assert.isEmpty(ambiguousResult.repairs.attempts);
      assert.equal(ambiguousState.launches.length, 2);
    }),
  ).pipe(Effect.provide(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer))),
);
