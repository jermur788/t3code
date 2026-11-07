import * as NodeCrypto from "@effect/platform-node/NodeCrypto";
import * as NodeServices from "@effect/platform-node/NodeServices";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";

import * as ProjectRuntimeService from "../ProjectRuntimeService.ts";
import * as RuntimeTaskExecutionService from "../RuntimeTaskExecutionService.ts";
import {
  appendHandoff,
  attemptByKey,
  completeRun,
  makeState,
  projectId,
  runPhase,
  seedAndCreateTasks,
} from "../RuntimeTaskContinuationTest.layer.ts";

const dbPath = process.argv[2];
if (!dbPath) throw new Error("Disposable DB path required");
process.stdin.resume();
const state = makeState();
const encodeSnapshot = Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown));
await Effect.runPromise(
  runPhase(
    state,
    dbPath,
    Effect.gen(function* () {
      const runtime = yield* ProjectRuntimeService.ProjectRuntimeService;
      const execution = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
      const tasks = yield* seedAndCreateTasks(state);
      const worker = yield* execution.execute(projectId, {
        taskId: tasks.source.taskId,
        expectedTaskRevision: tasks.source.revision,
      });
      const handoff = yield* appendHandoff(worker, { milestone: "none", result: "none" });
      completeRun(state, worker.threadId);
      state.beforeLaunch = Effect.gen(function* () {
        const current = yield* runtime.readTask(projectId, tasks.source.taskId);
        const source = yield* runtime.updateTask(
          projectId,
          {
            taskId: current.taskId,
            expectedRevision: current.revision,
            continuation: null,
          },
          { actor: "user:maintainer" },
        );
        const review = yield* attemptByKey(tasks.review.taskId, `cont:v1:r:${worker.attemptId}`);
        const snapshot = yield* encodeSnapshot({
          source,
          worker,
          review,
          handoff,
          providerStarts: state.launches.length,
        });
        yield* Effect.sync(() => process.stdout.write(`DURABLE ${snapshot}\n`));
        return yield* Effect.never;
      }).pipe(Effect.orDie);
      yield* execution.reconcileAttempt(projectId, worker.attemptId);
    }),
  ).pipe(Effect.provide(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer))),
);
