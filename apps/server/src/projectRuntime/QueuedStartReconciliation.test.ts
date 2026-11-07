import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as DateTime from "effect/DateTime";
import * as Layer from "effect/Layer";
import * as SqlClient from "effect/sql/SqlClient";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";

import { layerMemory } from "../persistence/Sqlite.ts";
import { layerEventSink } from "../orchestration-v2/runtimeLayer.ts";
import { EventSinkV2 } from "../orchestration-v2/EventSink.ts";
import { queuedStartReconciliationGuard } from "./ContinuationCommitGuard.ts";

const layer = layerEventSink.pipe(
  Layer.provideMerge(layerMemory),
  Layer.provide(NodeServices.layer),
);

const now = DateTime.makeUnsafe("2026-11-07T00:00:00.000Z");
const projectId = "zr-project";
const threadId = "zr-thread";
const runId = "zr-run";
const attemptId = "zr-attempt";

const thread = {
  createdBy: "user",
  creationSource: "web",
  id: threadId,
  projectId,
  title: "Probe",
  providerInstanceId: "codex",
  modelSelection: { instanceId: "codex", model: "stub" },
  runtimeMode: "full-access",
  interactionMode: "default",
  branch: null,
  worktreePath: null,
  activeProviderThreadId: null,
  lineage: { parentThreadId: null, relationshipToParent: null, rootThreadId: threadId },
  forkedFrom: null,
  createdAt: now,
  updatedAt: now,
  archivedAt: null,
  settledOverride: null,
  settledAt: null,
  lastVisitedAt: null,
  deletedAt: null,
};
const queuedRun = (userMessageId: string, status = "queued") => ({
  id: runId,
  threadId,
  ordinal: 1,
  providerInstanceId: "codex",
  modelSelection: thread.modelSelection,
  providerThreadId: null,
  userMessageId,
  rootNodeId: null,
  activeAttemptId: null,
  status,
  queuePosition: 1,
  queueHeld: false,
  requestedAt: now,
  startedAt: null,
  completedAt: null,
  checkpointId: null,
  contextHandoffId: null,
});

const seed = Effect.fn("seed")(function* (options: {
  readonly runMessageId: string;
  readonly runStatus?: string;
  readonly attemptStatus: string;
  readonly requestKey?: string | null;
}) {
  const sql = yield* SqlClient.SqlClient;
  const sink = yield* EventSinkV2;
  // The attempt's task FK is irrelevant to the predicate under test.
  yield* sql`PRAGMA foreign_keys = OFF`;
  const payload = JSON.stringify({ status: options.attemptStatus, revision: 1 });
  yield* sql`INSERT INTO project_runtime_execution_attempts
    (attempt_id,project_id,task_id,status,revision,thread_id,request_key,created_at,updated_at,payload_json)
    VALUES (${attemptId},${projectId},'zr-task',${options.attemptStatus},1,${threadId},
      ${options.requestKey === undefined ? "cont:v1:r:root" : options.requestKey},'2026-11-07','2026-11-07',${payload})`;
  yield* sink.write({
    events: [
      {
        id: "zr-thread-event",
        type: "thread.created",
        threadId,
        providerInstanceId: "codex",
        occurredAt: now,
        payload: thread,
      },
    ],
  } as never);
  yield* sink.write({
    events: [
      {
        id: "zr-run-event",
        type: "run.created",
        threadId,
        runId,
        providerInstanceId: "codex",
        occurredAt: now,
        payload: queuedRun(options.runMessageId, options.runStatus),
      },
    ],
  } as never);
});

// Mirrors Orchestrator.holdRevokedQueuedStart: re-hold the run under the reconcile guard and
// swallow a denial. Returns whether the commit succeeded.
const holdUnderReconcileGuard = Effect.fn("holdUnderReconcileGuard")(function* (
  userMessageId: string,
) {
  const sink = yield* EventSinkV2;
  return yield* sink
    .writeWithEffects({
      effects: [],
      events: [
        {
          id: "zr-hold-event",
          type: "run.updated",
          threadId,
          runId,
          providerInstanceId: "codex",
          occurredAt: now,
          payload: queuedRun(userMessageId),
        },
      ],
      commitGuard: queuedStartReconciliationGuard(threadId, runId),
    } as never)
    .pipe(Effect.exit);
});

const attemptRow = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const rows = yield* sql<{ status: string; revision: number }>`
    SELECT status, revision FROM project_runtime_execution_attempts WHERE attempt_id = ${attemptId}`;
  return rows[0]!;
});

const matchingMessage = `message:runtime-execution:${attemptId}`;

it.effect("matching launched continuation attempt becomes reconcile_required", () =>
  Effect.gen(function* () {
    yield* seed({ runMessageId: matchingMessage, attemptStatus: "launched" });
    const exit = yield* holdUnderReconcileGuard(matchingMessage);
    assert.isTrue(Exit.isSuccess(exit));
    assert.deepEqual(yield* attemptRow, { status: "reconcile_required", revision: 2 });
  }).pipe(Effect.provide(layer)),
);

it.effect("benign zero-row: an already reconcile_required or cancelled attempt is left alone", () =>
  Effect.gen(function* () {
    yield* seed({ runMessageId: matchingMessage, attemptStatus: "reconcile_required" });
    const exit = yield* holdUnderReconcileGuard(matchingMessage);
    assert.isTrue(Exit.isSuccess(exit));
    assert.deepEqual(yield* attemptRow, { status: "reconcile_required", revision: 1 });
  }).pipe(Effect.provide(layer)),
);

it.effect(
  "dangerous zero-row: a launched attempt that the message join misses is not reported as reconciled",
  () =>
    Effect.gen(function* () {
      yield* seed({
        runMessageId: "message:runtime-execution:some-other-attempt",
        attemptStatus: "launched",
      });
      const exit = yield* holdUnderReconcileGuard("message:runtime-execution:some-other-attempt");
      const attempt = yield* attemptRow;
      // Fail closed: either the commit is denied (typed) or the attempt is marked reconcile_required.
      assert.isTrue(
        Exit.isFailure(exit) || attempt.status === "reconcile_required",
        `commit ${Exit.isSuccess(exit) ? "SUCCEEDED" : "failed"} but attempt stayed ${attempt.status}`,
      );
    }).pipe(Effect.provide(layer)),
);

it.effect(
  "dangerous zero-row: a pending attempt with a null message link is not reported as reconciled",
  () =>
    Effect.gen(function* () {
      yield* seed({ runMessageId: "message:ordinary", attemptStatus: "pending" });
      const exit = yield* holdUnderReconcileGuard("message:ordinary");
      const attempt = yield* attemptRow;
      assert.isTrue(
        Exit.isFailure(exit) || attempt.status === "reconcile_required",
        `commit ${Exit.isSuccess(exit) ? "SUCCEEDED" : "failed"} but attempt stayed ${attempt.status}`,
      );
    }).pipe(Effect.provide(layer)),
);

it.effect("ordinary (non-continuation) attempt is untouched", () =>
  Effect.gen(function* () {
    yield* seed({
      runMessageId: matchingMessage,
      attemptStatus: "launched",
      requestKey: "ordinary",
    });
    yield* holdUnderReconcileGuard(matchingMessage);
    assert.deepEqual(yield* attemptRow, { status: "launched", revision: 1 });
  }).pipe(Effect.provide(layer)),
);
