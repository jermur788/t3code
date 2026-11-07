import * as NodeCrypto from "@effect/platform-node/NodeCrypto";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import {
  ProjectRuntimeTask,
  ProjectRuntimeHandoff,
  RuntimeExecutionAttempt,
} from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Option from "effect/Option";
import * as Stream from "effect/Stream";
import { ChildProcess, ChildProcessSpawner } from "effect/process";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";

import * as ProjectRuntimeService from "./ProjectRuntimeService.ts";
import * as RuntimeTaskExecutionService from "./RuntimeTaskExecutionService.ts";
import { makeState, projectId, runPhase } from "./RuntimeTaskContinuationTest.layer.ts";

const snapshotSchema = Schema.Struct({
  source: ProjectRuntimeTask,
  worker: RuntimeExecutionAttempt,
  review: RuntimeExecutionAttempt,
  handoff: ProjectRuntimeHandoff,
  providerStarts: Schema.Number,
});

it.live(
  "K3: SIGKILL after committed revoke preserves pending receipts without provider resurrection",
  () =>
    Effect.scoped(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const home = yield* fs.makeTempDirectoryScoped({ prefix: "t3-stage-h-crash-" });
        const dbPath = `${home}/userdata/statev2.sqlite`;
        const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
        const child = yield* spawner.spawn(
          ChildProcess.make(
            process.execPath,
            [
              new URL("./fixtures/continuationRecovery.worker.ts", import.meta.url).pathname,
              dbPath,
            ],
            { stderr: "inherit" },
          ),
        );
        const line = yield* child.stdout.pipe(
          Stream.decodeText(),
          Stream.splitLines,
          Stream.filter((entry) => entry.startsWith("DURABLE ")),
          Stream.runHead,
        );
        assert.isTrue(Option.isSome(line), "child must reach the committed revoke barrier");
        const saved = yield* Schema.decodeEffect(Schema.fromJsonString(snapshotSchema))(
          Option.getOrThrow(line).slice(8),
        );
        assert.equal(saved.providerStarts, 1);
        assert.equal(saved.review.status, "pending");
        assert.isNull(saved.review.runId);
        assert.isUndefined(saved.source.continuation);
        yield* child.kill({ killSignal: "SIGKILL" });
        const interrupted = yield* child.exitCode.pipe(Effect.flip);
        assert.match(String(interrupted.reason.cause), /signal: 'SIGKILL'/);
        assert.isFalse(yield* child.isRunning);

        const state = makeState();
        const recover = Effect.gen(function* () {
          const runtime = yield* ProjectRuntimeService.ProjectRuntimeService;
          const execution = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
          assert.deepEqual(yield* runtime.readTask(projectId, saved.source.taskId), saved.source);
          assert.deepEqual(
            yield* runtime.readHandoff(projectId, saved.handoff.handoffId),
            saved.handoff,
          );
          const before = yield* execution.readAttempt(projectId, saved.review.attemptId);
          assert.deepEqual(before.receipt, saved.review.receipt);
          yield* execution.reconcileActiveAttempts();
          yield* execution.reconcileAttempt(projectId, saved.worker.attemptId);
          const review = yield* execution.readAttempt(projectId, saved.review.attemptId);
          assert.equal(review.status, "cancelled");
          assert.match(review.failure ?? "", /authorization.*withdrawn|superseded/i);
          assert.deepEqual(review.receipt, saved.review.receipt);
          const attempts = yield* execution.listAttempts(projectId, {});
          assert.lengthOf(attempts.attempts, 2);
          return review;
        });
        const first = yield* runPhase(state, dbPath, recover);
        const replay = yield* runPhase(state, dbPath, recover);
        assert.deepEqual(replay, first);
        assert.lengthOf(state.launches, 0);
        yield* Effect.sync(() =>
          process.stdout.write(
            `K3 SIGKILL recovery: pending -> ${first.status}; durable receipts=2; recovery provider starts=0; replay identical\n`,
          ),
        );
      }),
    ).pipe(Effect.provide(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer))),
);
