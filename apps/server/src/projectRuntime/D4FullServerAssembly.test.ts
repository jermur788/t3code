// @effect-diagnostics processEnvInEffect:off -- the production root reads the continuation gate from the real process environment.
import { ChildProcess, ChildProcessSpawner } from "effect/process";
import { vi } from "vite-plus/test";
import { ProviderInstanceRegistry } from "../provider/ProviderInstanceRegistry.ts";
import * as NodeSqlite from "node:sqlite";
import { ProviderRegistry } from "../provider/ProviderRegistry.ts";
import { RuntimeRoutingProviderView } from "../runtimeRouting/RuntimeRoutingProviderView.ts";
import {
  CommandId,
  ProviderDriverKind,
  ProviderInstanceId,
  RunId,
  ProjectId,
  ProjectRuntimeTaskId,
  ThreadId,
  type ProjectRuntimeTask,
  type RuntimeExecutionAttempt,
} from "@t3tools/contracts";
import * as Runtime from "./ProjectRuntimeService.ts";
import * as Execution from "./RuntimeTaskExecutionService.ts";
import { ContinuationGate, CONTINUATION_GATE_ENV } from "./RuntimeTaskContinuationGate.ts";
import { assert, it } from "@effect/vitest";
import * as NetService from "@t3tools/shared/Net";
import * as NodeCrypto from "@effect/platform-node/NodeCrypto";
import * as NodeServices from "@effect/platform-node/NodeServices";
import * as Context from "effect/Context";
import * as FileSystem from "effect/FileSystem";
import * as SqlClient from "effect/sql/SqlClient";
import * as Effect from "effect/Effect";
import * as Queue from "effect/Queue";
import * as Deferred from "effect/Deferred";
import * as ProjectionStore from "../orchestration-v2/ProjectionStore.ts";
import * as ProjectionReplay from "../orchestration-v2/testkit/ProjectionReplay.ts";
import { OrchestrationEffectWorkerV2 } from "../orchestration-v2/EffectWorker.ts";
import { ProviderRuntimeRecoveryService } from "../orchestration-v2/ProviderRuntimeRecoveryService.ts";
import { ServerSettingsService } from "../serverSettings.ts";
import { ThreadManagementService } from "../orchestration-v2/ThreadManagementService.ts";
import * as Layer from "effect/Layer";
import * as ServerConfig from "../config.ts";
import { WorktreeSetupTracker } from "../project/WorktreeSetupTracker.ts";
import { layerMakeServer } from "../server.ts";
import { GitWorkflowService } from "../git/GitWorkflowService.ts";
import { ProjectSetupScriptRunner } from "../project/ProjectSetupScriptRunner.ts";

const timestamp = "2026-11-05T00:00:00.000Z";
const projectId = ProjectId.make("assembly6-project");
const sourceId = ProjectRuntimeTaskId.make("assembly6-source");
const reviewId = ProjectRuntimeTaskId.make("assembly6-review");
const repairId = ProjectRuntimeTaskId.make("assembly6-repair");

/** Walks `.cause` so the evidence shows every typed layer a denial crossed. */
const causeChain = (error: unknown): ReadonlyArray<string> => {
  const chain: Array<string> = [];
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (typeof current === "object" && current !== null && !seen.has(current)) {
    seen.add(current);
    const tagged = current as { _tag?: string; reason?: string; message?: string; cause?: unknown };
    chain.push(`${tagged._tag ?? "Error"}: ${tagged.reason ?? tagged.message ?? ""}`);
    current = tagged.cause;
  }
  return chain;
};

/**
 * One production root (`layerMakeServer`) over one temp SQLite file. Everything the scenarios
 * drive is the real service instance from that root; the only seams are spies that delegate to
 * the real implementation, and the provider adapters, which are spied but never replaced.
 */
const assemble = Effect.fn("D4FullServerAssembly.assemble")(function* (
  label: string,
  options: { readonly reviewIsolation?: "worktree" } = {},
) {
  const previous = process.env[CONTINUATION_GATE_ENV];
  yield* Effect.acquireRelease(
    Effect.sync(() => {
      process.env[CONTINUATION_GATE_ENV] = "1";
    }),
    () =>
      Effect.sync(() => {
        if (previous === undefined) delete process.env[CONTINUATION_GATE_ENV];
        else process.env[CONTINUATION_GATE_ENV] = previous;
      }),
  );
  const context = yield* Layer.build(layerMakeServer);
  assert.isTrue(Context.get(context, ContinuationGate).enabled);
  const runtime = Context.get(context, Runtime.ProjectRuntimeService);
  const execution = Context.get(context, Execution.RuntimeTaskExecutionService);
  const sql = Context.get(context, SqlClient.SqlClient);
  const threads = Context.get(context, ThreadManagementService);
  const tracker = Context.get(context, WorktreeSetupTracker);

  yield* Context.get(context, ProviderRegistry).refresh();
  const providers = (yield* Context.get(context, RuntimeRoutingProviderView).read).providers;
  const codex = providers.find((provider) => provider.instanceId === "codex");
  const claude = providers.find((provider) => provider.instanceId === "claudeAgent");
  for (const provider of [codex, claude]) {
    assert.isTrue(provider?.installed);
    assert.equal(provider?.status, "ready");
    assert.equal(provider?.auth.status, "authenticated");
  }
  const instances = Context.get(context, ProviderInstanceRegistry);
  const spies: Array<{ readonly mock: { readonly calls: ReadonlyArray<unknown> } }> = [];
  for (const provider of [codex!, claude!]) {
    const instance = yield* instances.getInstance(provider.instanceId);
    assert.isDefined(instance);
    // Fail closed: the live effect worker must never reach a real provider in this check.
    spies.push(
      vi
        .spyOn(instance!.orchestrationAdapter, "openSession")
        .mockImplementation(() => Effect.die("provider adapter must not be opened")),
    );
  }
  // The production effect worker daemon is live in this root. Its claim, `preparationGuard` and
  // executor run for real; the only seam is a latch in front of `runOnce` so the test, not
  // scheduler timing, decides when the worker may see a committed effect.
  const workerGate = yield* Deferred.make<void>();
  const effectWorker = Context.get(context, OrchestrationEffectWorkerV2);
  const runOnce = effectWorker.runOnce;
  // The daemon reads `worker.runOnce` on every loop, so replacing the property gates all of it.
  yield* Effect.acquireRelease(
    Effect.sync(() => {
      Object.assign(effectWorker, {
        runOnce: Deferred.await(workerGate).pipe(Effect.andThen(runOnce)),
      });
    }),
    () => Effect.sync(() => Object.assign(effectWorker, { runOnce })),
  );
  // `drain` runs the same claim/guard/executor path under test control; the gated daemon never opens.
  const drainWorker = effectWorker.drain();
  const adapterCalls = () => spies.reduce((total, spy) => total + spy.mock.calls.length, 0);

  const config = yield* ServerConfig.ServerConfig;
  // Guard: a production-root build must never launch a real browser.
  assert.equal(config.noBrowser, true);
  const fs = yield* FileSystem.FileSystem;
  const databases = yield* sql<{ name: string; file: string }>`PRAGMA database_list`;
  const productionFile = databases.find((db) => db.name === "main")?.file;
  assert.equal(productionFile, config.dbPath);
  const stat = yield* fs.stat(config.dbPath);

  // An independent writer on the configured path must reach the very database the production
  // client writes: a marker crosses in both directions and both files share one inode.
  const second = new NodeSqlite.DatabaseSync(config.dbPath);
  let identity: Record<string, unknown> = {};
  try {
    const secondFile = (
      second.prepare("PRAGMA database_list").all() as Array<{
        name: string;
        file: string;
      }>
    ).find((db) => db.name === "main")?.file;
    assert.isString(secondFile);
    const secondStat = yield* fs.stat(secondFile!);
    const productionStat = yield* fs.stat(productionFile!);
    assert.equal(String(secondStat.ino), String(productionStat.ino));
    yield* sql`CREATE TABLE d4_identity_marker (writer TEXT NOT NULL)`;
    yield* sql`INSERT INTO d4_identity_marker (writer) VALUES ('production')`;
    second.exec("INSERT INTO d4_identity_marker (writer) VALUES ('independent')");
    const seenByIndependent = (
      second.prepare("SELECT writer FROM d4_identity_marker ORDER BY writer").all() as Array<{
        writer: string;
      }>
    ).map((row) => row.writer);
    const seenByProduction = (yield* sql<{
      writer: string;
    }>`SELECT writer FROM d4_identity_marker ORDER BY writer`).map((row) => row.writer);
    assert.deepEqual(seenByIndependent, ["independent", "production"]);
    assert.deepEqual(seenByProduction, seenByIndependent);
    yield* sql`DROP TABLE d4_identity_marker`;
    identity = {
      dbPath: config.dbPath,
      realpath: yield* fs.realPath(config.dbPath),
      inode: String(stat.ino),
      writerInodes: [String(productionStat.ino), String(secondStat.ino)],
      sharedMarker: seenByProduction,
    };
    process.stdout.write(`assembly6-identity ${label} ${JSON.stringify(identity)}\n`);

    // The production writer's open transaction must exclude the independent connection.
    second.exec("PRAGMA busy_timeout = 0");
    yield* sql.unsafe("BEGIN IMMEDIATE");
    try {
      assert.throws(() => second.exec("BEGIN IMMEDIATE"), /database is locked/);
    } finally {
      yield* sql.unsafe("ROLLBACK");
    }
    second.exec("BEGIN IMMEDIATE");
    second.exec("ROLLBACK");
  } finally {
    second.close();
  }
  process.stdout.write(`assembly6-serialization ${label}: second writer locked, then acquired\n`);

  const workspaceRoot = yield* fs.makeTempDirectoryScoped({ prefix: "d4-assembly6-workspace-" });
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  assert.equal(
    Number(yield* spawner.exitCode(ChildProcess.make("git", ["init", "--quiet", workspaceRoot]))),
    0,
  );
  const runGit = (args: ReadonlyArray<string>) =>
    spawner.string(
      ChildProcess.make("git", [
        "-C",
        workspaceRoot,
        "-c",
        "user.name=D4",
        "-c",
        "user.email=d4@example.invalid",
        ...args,
      ]),
    );
  // A worktree route needs a base commit; the root route keeps the bare repository.
  if (options.reviewIsolation === "worktree")
    yield* runGit(["commit", "--quiet", "--allow-empty", "-m", "base"]);
  yield* sql`INSERT INTO projection_projects
    (project_id, title, workspace_root, scripts_json, default_model_selection_json, created_at, updated_at)
    VALUES (${projectId}, 'Assembly6', ${workspaceRoot}, '[]',
      ${JSON.stringify({ instanceId: "codex", model: codex!.models[0]!.slug })}, ${timestamp}, ${timestamp})`;
  yield* sql`INSERT INTO project_runtime (project_id, enabled, revision, created_at, updated_at)
    VALUES (${projectId}, 1, 1, ${timestamp}, ${timestamp})`;
  for (const id of [sourceId, reviewId, repairId]) {
    const task: ProjectRuntimeTask = {
      taskId: id,
      projectId,
      title: id,
      scope: "Check ordering",
      owner: id === reviewId ? "user:reviewer" : "user:maintainer",
      acceptanceCriteria: [{ id: "c1", text: "Ordering holds" }],
      status: "ready",
      blocker: null,
      verification: { milestone: "none", evidence: [] },
      latestHandoffId: null,
      revision: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: "user:maintainer",
      updatedBy: "user:maintainer",
      ...(id === sourceId
        ? {
            continuation: {
              version: 1,
              mode: "synthetic",
              reviewTaskId: reviewId,
              repairTaskId: repairId,
              maxRepairCycles: 2,
              // What an operator save stamps: both targets accepted at their seeded revision.
              acceptedTargetRevisions: { review: 1, repair: 1 },
            },
          }
        : {}),
      // Independent review requires a different provider instance than the worker's.
      ...(id === reviewId
        ? {
            routing: {
              role: "implementation",
              candidates: [
                {
                  providerInstanceId: claude!.instanceId,
                  model: claude!.models[0]!.slug,
                  ...(options.reviewIsolation === undefined
                    ? {}
                    : { isolation: options.reviewIsolation }),
                },
              ],
              fallback: "fail",
            },
          }
        : {}),
    };
    yield* sql`INSERT INTO project_runtime_tasks (task_id, project_id, status, revision, created_at, payload_json)
      VALUES (${id}, ${projectId}, 'ready', 1, ${timestamp}, ${JSON.stringify(task)})`;
  }

  const revoke = Effect.gen(function* () {
    const task = yield* runtime.readTask(projectId, sourceId);
    return yield* runtime.updateTask(
      projectId,
      { taskId: sourceId, expectedRevision: task.revision, continuation: null },
      { actor: "user:maintainer" },
    );
  });
  const counts = Effect.gen(function* () {
    const runs =
      yield* sql`SELECT count(*) AS n FROM orchestration_events WHERE event_type = 'run.created'`;
    const effects =
      yield* sql`SELECT count(*) AS n FROM orchestration_v2_effect_outbox WHERE effect_type = 'provider-turn.start'`;
    const receipts =
      yield* sql`SELECT count(*) AS n FROM orchestration_command_receipts WHERE status = 'accepted'`;
    return [Number(runs[0]!.n), Number(effects[0]!.n), Number(receipts[0]!.n)] as const;
  });
  const receipts = sql<{
    command_id: string;
    status: string;
  }>`SELECT * FROM orchestration_command_receipts ORDER BY command_id`;
  const effects = sql`SELECT * FROM orchestration_v2_effect_outbox WHERE effect_type = 'provider-turn.start' ORDER BY effect_id`;
  const acceptedReceiptIds = receipts.pipe(
    Effect.map((rows) =>
      rows.filter((row) => row.status === "accepted").map((row) => row.command_id),
    ),
  );

  /**
   * Observes `prepared-run.release` of a launch (the last guarded command) and optionally runs
   * a hook immediately before a command reaches the real dispatcher.
   */
  const released = yield* Queue.unbounded<string>();
  const denials: Array<ReadonlyArray<string>> = [];
  const beforeDispatch: {
    current: ((command: { type: string; commandId: string }) => Effect.Effect<void>) | null;
  } = {
    current: null,
  };
  // Every command that crossed the peripheral dispatcher, with how it ended.
  const dispatched: Array<{ type: string; commandId: string; exit: "ok" | "failed" }> = [];
  // Offered when a `prepared-run.fail` settles (either way): the last step of a failed preparation.
  const failSettled = yield* Queue.unbounded<string>();
  // `finish` is called by the preparation fiber's `onError` before it dispatches `prepared-run.fail`.
  const trackerFinishes: Array<{
    threadId: string;
    phase: string;
    error: string | null | undefined;
  }> = [];
  const trackerFinish = tracker.finish;
  vi.spyOn(tracker, "finish").mockImplementation((threadId, phase, error) => {
    trackerFinishes.push({ threadId, phase, error });
    return trackerFinish(threadId, phase, error);
  });
  const git = Context.get(context, GitWorkflowService);
  const createWorktree = vi.spyOn(git, "createWorktree");
  const removeWorktree = vi.spyOn(git, "removeWorktree");
  const setupScripts = Context.get(context, ProjectSetupScriptRunner);
  const runSetup = vi.spyOn(setupScripts, "runForThread");
  const dispatch = threads.dispatch;
  const dispatchSpy = vi.spyOn(threads, "dispatch").mockImplementation((command) =>
    (beforeDispatch.current?.(command) ?? Effect.void).pipe(
      Effect.andThen(dispatch(command)),
      Effect.onExit((exit) =>
        Effect.suspend(() => {
          dispatched.push({
            type: command.type,
            commandId: command.commandId,
            exit: exit._tag === "Success" ? "ok" : "failed",
          });
          return command.type === "prepared-run.fail"
            ? Queue.offer(failSettled, command.commandId)
            : Effect.void;
        }),
      ),
      Effect.tapError((error) =>
        Effect.sync(() => {
          denials.push(causeChain(error));
        }),
      ),
      Effect.tap(() =>
        command.type === "prepared-run.release"
          ? Queue.offer(released, command.commandId)
          : Effect.void,
      ),
    ),
  );

  /** Completes the worker run in the projection: no real provider may run in this check. */
  const completeRunOf = Effect.fn("D4FullServerAssembly.completeRunOf")(function* (
    attempt: RuntimeExecutionAttempt,
  ) {
    yield* sql`UPDATE orchestration_v2_projection_runs
      SET status = 'completed', completed_at = ${timestamp},
        payload_json = json_set(payload_json, '$.status', 'completed')
      WHERE thread_id = ${attempt.threadId}`;
  });
  const appendHandoff = Effect.fn("D4FullServerAssembly.appendHandoff")(function* (
    attempt: RuntimeExecutionAttempt,
  ) {
    const task = yield* runtime.readTask(projectId, attempt.taskId);
    return yield* runtime.appendHandoff(
      projectId,
      {
        taskId: attempt.taskId,
        expectedTaskRevision: task.revision,
        checkpoint: `assembly6-${attempt.attemptId}`,
        summary: "Assembly6 worker handoff",
        filesChanged: [],
      },
      {
        actor: `thread:${attempt.threadId}`,
        threadId: ThreadId.make(attempt.threadId),
        providerInstanceId: attempt.modelSelection.instanceId,
        model: attempt.modelSelection.model,
      },
    );
  });

  return {
    replay: yield* ProjectionReplay.ProjectionReplay.pipe(
      Effect.provide(ProjectionReplay.layer.pipe(Layer.provide(ProjectionStore.layer))),
      Effect.provide(context),
    ),
    execution,
    runtime,
    recovery: Context.get(context, ProviderRuntimeRecoveryService),
    settings: Context.get(context, ServerSettingsService),
    sql,
    revoke,
    counts,
    receipts,
    effects,
    acceptedReceiptIds,
    released,
    drainWorker,
    denials,
    beforeDispatch,
    dispatchSpy,
    dispatch,
    dispatched,
    failSettled,
    trackerFinishes,
    tracker,
    adapterCalls,
    instances,
    completeRunOf,
    appendHandoff,
    identity,
    workspaceRoot,
    runGit,
    createWorktree,
    removeWorktree,
    runSetup,
  };
});

/** Runs the ordinary source launch, finishes its run, and records its handoff. */
const settleSourceWorker = Effect.fn("D4FullServerAssembly.settleSourceWorker")(function* (
  a: Effect.Success<ReturnType<typeof assemble>>,
) {
  const worker = yield* a.execution.execute(projectId, {
    taskId: sourceId,
    expectedTaskRevision: 1,
    clientRequestId: "assembly6-worker",
  });
  assert.equal(worker.status, "launched");
  yield* Queue.take(a.released);
  yield* a.completeRunOf(worker);
  yield* a.appendHandoff(worker);
  return worker;
});

const continuationRows = (a: Effect.Success<ReturnType<typeof assemble>>) =>
  a.sql<{
    attempt_id: string;
    thread_id: string;
    status: string;
    request_key: string;
    failure: string | null;
  }>`SELECT attempt_id, thread_id, status, request_key, json_extract(payload_json, '$.failure') AS failure FROM project_runtime_execution_attempts
    WHERE task_id = ${reviewId}`;

const provide = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(
    Effect.scoped,
    Effect.provide(
      ServerConfig.layerTest(
        import.meta.dirname,
        { prefix: "d4-assembly6-" },
        {
          noBrowser: true,
        },
      ).pipe(
        Layer.provideMerge(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer, NetService.layer)),
      ),
    ),
    Effect.scoped,
  );

it.effect(
  "production root: ordinary public execute of a revoked source is unaffected (control)",
  () =>
    provide(
      Effect.gen(function* () {
        const a = yield* assemble("control");
        yield* a.revoke;
        const result = yield* a.execution.execute(projectId, {
          taskId: sourceId,
          expectedTaskRevision: 2,
          clientRequestId: "assembly6-ordinary",
        });
        assert.equal(result.status, "launched");
        yield* Queue.take(a.released);
        const counts = yield* a.counts;
        process.stdout.write(
          `assembly6-control counts=${JSON.stringify(counts)} adapter=${a.adapterCalls()} accepted=${JSON.stringify(yield* a.acceptedReceiptIds)}\n`,
        );
        // Not continuation evidence: a user run never carries private continuation authority.
        assert.deepEqual(counts, [1, 1, 4]);
        assert.equal(a.adapterCalls(), 0);
      }),
    ),
);

it.effect("production root: continuation revoke-first denies run creation (0 run, 0 effect)", () =>
  provide(
    Effect.gen(function* () {
      const a = yield* assemble("revoke-first");
      const worker = yield* settleSourceWorker(a);
      const workerCounts = yield* a.counts;
      assert.deepEqual(workerCounts, [1, 1, 4]);
      const workerReceipts = yield* a.acceptedReceiptIds;

      // The revoke commits after authorization is persisted but before the dispatcher's decision;
      // the sink's commit recheck denies the run. The decision-to-commit window needs a second
      // process holding the writer lock: ContinuationCommitGuard.test.ts covers it.
      let revoked = false;
      a.beforeDispatch.current = (command) =>
        command.type === "message.dispatch" &&
        command.commandId.endsWith(":launch:initial-message") &&
        !revoked
          ? Effect.suspend(() => {
              revoked = true;
              return a.revoke.pipe(Effect.orDie, Effect.asVoid);
            })
          : Effect.void;
      yield* a.execution.reconcileAttempt(projectId, worker.attemptId);
      assert.isTrue(revoked, "the revoke must have committed inside the continuation dispatch");

      const rows = yield* continuationRows(a);
      assert.equal(rows.length, 1);
      const review = rows[0]!;
      const commandId = `command:runtime-execution:${review.attempt_id}:launch`;
      const counts = yield* a.counts;
      const accepted = yield* a.acceptedReceiptIds;
      const continuationReceipts = accepted.filter((id) => id.includes(review.attempt_id));
      const newRuns = counts[0]! - workerCounts[0]!;
      const newEffects = counts[1]! - workerCounts[1]!;
      process.stdout.write(
        `assembly6-revoke-first review=${review.attempt_id} status=${review.status} requestKey=${review.request_key} newRuns=${newRuns} newEffects=${newEffects} continuationAcceptedReceipts=${JSON.stringify(continuationReceipts)} workerReceiptsUnchanged=${accepted.filter((id) => workerReceipts.includes(id)).length === workerReceipts.length} denial=${JSON.stringify(a.denials)} adapter=${a.adapterCalls()}\n`,
      );
      assert.equal(review.request_key, `cont:v1:r:${worker.attemptId}`);
      assert.equal(newRuns, 0);
      assert.equal(newEffects, 0);
      // `:launch` is the run-less thread.create; the run-creating and release commands never commit.
      assert.notInclude(continuationReceipts, `${commandId}:initial-message`);
      assert.notInclude(continuationReceipts, `${commandId}:release`);
      assert.equal(review.status, "cancelled");
      assert.isTrue(
        a.denials.some((chain) =>
          chain.some((line) => line.includes("Continuation authorization revoked or superseded.")),
        ),
        "a typed EventSinkCommitDenied must surface through the real dispatch chain",
      );
      assert.equal(a.adapterCalls(), 0);
    }),
  ),
);

it.effect(
  "production root: continuation launch-first commits once, replays byte-identically, then fences a post-commit revoke",
  () =>
    provide(
      Effect.gen(function* () {
        const a = yield* assemble("launch-first");
        const worker = yield* settleSourceWorker(a);
        const workerCounts = yield* a.counts;

        yield* a.execution.reconcileAttempt(projectId, worker.attemptId);
        yield* Queue.take(a.released);
        const rows = yield* continuationRows(a);
        assert.equal(rows.length, 1);
        const review = rows[0]!;
        const commandId = `command:runtime-execution:${review.attempt_id}:launch`;
        const counts = yield* a.counts;
        const accepted = yield* a.acceptedReceiptIds;
        assert.equal(counts[0]! - workerCounts[0]!, 1);
        assert.equal(counts[1]! - workerCounts[1]!, 1);
        assert.equal(review.status, "launched");
        for (const id of [commandId, `${commandId}:initial-message`, `${commandId}:release`]) {
          assert.equal(accepted.filter((candidate) => candidate === id).length, 1, id);
        }

        const observe = Effect.gen(function* () {
          return {
            counts: yield* a.counts,
            receipts: yield* a.receipts,
            effects: yield* a.effects,
            rows: yield* continuationRows(a),
          };
        });
        const snapshot = yield* observe;
        // Replaying the source's reconcile re-enters advanceContinuation with the same request key,
        // first while the policy still exists, then after the operator revoked it.
        yield* a.execution.reconcileAttempt(projectId, worker.attemptId);
        yield* a.execution.reconcileActiveAttempts();
        const replayedLive = yield* observe;
        yield* a.revoke;
        yield* a.execution.reconcileAttempt(projectId, worker.attemptId);
        yield* a.execution.reconcileActiveAttempts();
        const replayedRevoked = yield* observe;
        process.stdout.write(
          `assembly6-launch-first review=${review.attempt_id} totalCounts=${JSON.stringify(counts)} newRuns=1 newEffects=1 continuationAcceptedReceipts=${JSON.stringify(accepted.filter((id) => id.includes(review.attempt_id)))} effectRows=${JSON.stringify(snapshot.effects.map((row) => [row.status, row.attempt_count]))} replayIdenticalLive=${JSON.stringify(replayedLive) === JSON.stringify(snapshot)} replayIdenticalAfterRevoke=${JSON.stringify(replayedRevoked) === JSON.stringify(snapshot)} replayAttempt=${replayedRevoked.rows[0]?.attempt_id} adapter=${a.adapterCalls()}\n`,
        );
        assert.deepEqual(replayedLive, snapshot);
        assert.deepEqual(replayedRevoked, snapshot);
        assert.equal(replayedRevoked.rows[0]?.attempt_id, review.attempt_id);
        assert.equal(a.adapterCalls(), 0);

        // The run is committed and its start is still unclaimed. Draining the real worker now must
        // hit the revoked authority at `preparationGuard`, before any provider call.
        const drained = yield* a.drainWorker;
        const fenced = yield* continuationRows(a);
        const fencedEffects = yield* a.effects;
        process.stdout.write(
          `assembly6-post-commit-revoke drained=${drained} review=${JSON.stringify(fenced.map((row) => [row.status, row.failure]))} effects=${JSON.stringify(fencedEffects.map((row) => [row.status, row.attempt_count]))} adapter=${a.adapterCalls()}\n`,
        );
        assert.equal(fenced[0]?.status, "reconcile_required");
        assert.equal(a.adapterCalls(), 0);

        // reconcile_required is terminal for automation: a late fail, a retry and source replays
        // must not downgrade it to cancelled/failed nor start the provider.
        const run = (yield* a.sql<{ run_id: string }>`
          SELECT run_id FROM orchestration_v2_projection_runs WHERE thread_id = ${review.thread_id}`)[0]!;
        const lateOutcomes: Array<string> = [];
        for (const command of [
          {
            type: "prepared-run.fail" as const,
            commandId: `${commandId}:fail-late` as never,
            threadId: ThreadId.make(review.thread_id),
            runId: run.run_id as never,
            failure: { class: "unknown" as const, message: "late", code: null, retryable: false },
          },
          {
            type: "prepared-run.retry" as const,
            commandId: `${commandId}:retry-late` as never,
            threadId: ThreadId.make(review.thread_id),
            runId: run.run_id as never,
          },
        ])
          yield* a.dispatch(command).pipe(
            Effect.matchEffect({
              onFailure: () => Effect.sync(() => lateOutcomes.push(`${command.type}:denied`)),
              onSuccess: () => Effect.sync(() => lateOutcomes.push(`${command.type}:accepted`)),
            }),
          );
        yield* a.execution.reconcileAttempt(projectId, worker.attemptId);
        yield* a.execution.reconcileActiveAttempts();
        const afterLate = yield* continuationRows(a);
        process.stdout.write(
          `assembly7-reconcile-required-stable late=${JSON.stringify(lateOutcomes)} status=${afterLate[0]?.status} adapter=${a.adapterCalls()}\n`,
        );
        assert.equal(afterLate[0]?.status, "reconcile_required");
        assert.equal(afterLate[0]?.failure, fenced[0]?.failure);
        assert.equal(a.adapterCalls(), 0);
      }),
    ),
);

it.effect(
  "production root: operator revoke while the real prepared-run.release is held denies it and cancels the run",
  () =>
    provide(
      Effect.gen(function* () {
        const a = yield* assemble("async-release");
        const worker = yield* settleSourceWorker(a);
        const baseline = yield* a.counts;
        const baselineAccepted = yield* a.acceptedReceiptIds;

        // Barrier in front of the real dispatcher: the run exists (message.dispatch committed) and
        // is `preparing`, and the release has not committed. Nothing here sleeps or polls.
        const releaseReached = yield* Deferred.make<string>();
        const releaseGate = yield* Deferred.make<void>();
        a.beforeDispatch.current = (command) =>
          command.type === "prepared-run.release"
            ? Deferred.succeed(releaseReached, command.commandId).pipe(
                Effect.andThen(Deferred.await(releaseGate)),
              )
            : Effect.void;

        // `schedulePreparation` forks into `preparationScope` with `Effect.ignoreCause`, so this
        // call returns before the release is attempted and can never carry the release denial.
        yield* a.execution.reconcileAttempt(projectId, worker.attemptId);
        const heldCommandId = yield* Deferred.await(releaseReached);

        const rows = yield* continuationRows(a);
        assert.equal(rows.length, 1);
        const review = rows[0]!;
        const launchId = `command:runtime-execution:${review.attempt_id}:launch`;
        assert.equal(heldCommandId, `${launchId}:release`);
        const runRows = yield* a.sql<{ run_id: string; thread_id: string; status: string }>`
          SELECT run_id, thread_id, status FROM orchestration_v2_projection_runs
          WHERE thread_id = ${review.thread_id}`;
        assert.equal(runRows.length, 1);
        const run = runRows[0]!;
        const held = yield* a.counts;
        const heldAccepted = yield* a.acceptedReceiptIds;
        process.stdout.write(
          `assembly7-held run=${run.run_id} runStatus=${run.status} attempt=${review.status} newRuns=${held[0]! - baseline[0]!} newEffects=${held[1]! - baseline[1]!} releaseReceipt=${heldAccepted.includes(heldCommandId)}\n`,
        );
        assert.equal(run.status, "preparing");
        assert.equal(held[0]! - baseline[0]!, 1);
        assert.equal(held[1]! - baseline[1]!, 0);
        assert.isFalse(heldAccepted.includes(heldCommandId));
        assert.include(heldAccepted, `${launchId}:initial-message`);

        // Real operator revocation, committed strictly between run creation and release.
        const before = yield* a.runtime.readTask(projectId, sourceId);
        const revoked = yield* a.revoke;
        assert.equal(revoked.revision, before.revision + 1);
        const afterRevoke = yield* a.runtime.readTask(projectId, sourceId);
        assert.isUndefined(afterRevoke.continuation);

        yield* Deferred.succeed(releaseGate, undefined);
        // Terminal milestone: the preparation fiber's last step, its `prepared-run.fail`, settled.
        const failCommandId = yield* Queue.take(a.failSettled);
        assert.equal(failCommandId, `${launchId}:fail`);

        const finalRun = yield* a.sql<{ status: string; payload: string }>`
          SELECT status, payload_json AS payload FROM orchestration_v2_projection_runs
          WHERE run_id = ${run.run_id}`;
        const finalAttempt = (yield* continuationRows(a))[0]!;
        const counts = yield* a.counts;
        const accepted = yield* a.acceptedReceiptIds;
        const allReceipts = yield* a.receipts;
        const runEffects = (yield* a.effects).filter((row) =>
          String(row.payload_json).includes(run.run_id),
        );
        const reviewFinishes = a.trackerFinishes.filter(
          (entry) => entry.threadId === review.thread_id,
        );
        const orchestrationAttempts = yield* a.sql<{ status: string }>`
          SELECT json_extract(payload_json, '$.status') AS status
          FROM orchestration_v2_projection_run_attempts WHERE run_id = ${run.run_id}`;
        const events = yield* a.sql<{ event_type: string; n: number }>`
          SELECT event_type, count(*) AS n FROM orchestration_events
          WHERE command_id LIKE ${`${launchId}%`} GROUP BY event_type ORDER BY event_type`;
        const worktrees = yield* a.sql<{ worktree_path: string | null }>`
          SELECT json_extract(payload_json, '$.worktreePath') AS worktree_path
          FROM orchestration_v2_projection_threads WHERE thread_id = ${review.thread_id}`;
        const releaseDispatch = a.dispatched.filter(
          (entry) =>
            entry.type === "prepared-run.release" && entry.commandId.includes(review.attempt_id),
        );
        const releaseDenial = a.denials.filter((chain) =>
          chain.some((line) => line.includes("Continuation authorization revoked")),
        );
        const mine = accepted.filter((id) => id.includes(review.attempt_id));
        process.stdout.write(
          `assembly7-final run=${JSON.stringify(finalRun[0]?.status)} runAttempts=${JSON.stringify(orchestrationAttempts)} runtimeAttempt=${JSON.stringify([finalAttempt.status, finalAttempt.failure])} newRuns=${counts[0]! - baseline[0]!} newProviderTurnStartEffects=${counts[1]! - baseline[1]!} effectRows=${JSON.stringify(runEffects.map((row) => [row.status, row.attempt_count]))} adapter=${a.adapterCalls()} trackerFinishes=${JSON.stringify(reviewFinishes)} acceptedForReview=${JSON.stringify(mine)} allReceiptsForReview=${JSON.stringify(allReceipts.filter((row) => row.command_id.includes(review.attempt_id)).map((row) => [row.command_id.slice(row.command_id.indexOf(":launch")), row.status]))} releaseDispatch=${JSON.stringify(releaseDispatch)} denialChains=${JSON.stringify(releaseDenial)} dispatched=${JSON.stringify(a.dispatched.map((entry) => `${entry.type}:${entry.exit}`))} events=${JSON.stringify(events)} worktreePath=${JSON.stringify(worktrees[0]?.worktree_path)}\n`,
        );

        // Never falsely successful; start never began, so the run is cancelled and not uncertain.
        assert.equal(finalRun[0]?.status, "cancelled");
        assert.notInclude(["running", "completed", "preparing"], finalRun[0]?.status);
        assert.deepEqual(
          orchestrationAttempts.map((row) => row.status),
          ["cancelled"],
        );
        assert.equal(finalAttempt.status, "cancelled");
        assert.include(finalAttempt.failure ?? "", "revoked");
        // No provider-turn.start was ever enqueued or cancelled: the release commit was rolled back.
        assert.equal(runEffects.length, 0);
        assert.equal(counts[1]! - baseline[1]!, 0);
        assert.equal(counts[0]! - baseline[0]!, 1);
        assert.equal(a.adapterCalls(), 0);
        // The preparation tracker (worktree-only) is never begun for a root launch; the failure
        // is still reported to it, as failed with the typed denial text, never as "done".
        assert.deepEqual(
          reviewFinishes.map((entry) => entry.phase),
          ["failed"],
        );
        assert.include(reviewFinishes[0]?.error ?? "", "release run");
        assert.equal(yield* a.tracker.get(ThreadId.make(review.thread_id)), null);
        assert.notInclude(mine, `${launchId}:release`);
        assert.notInclude(mine, `${launchId}:revoked-cancel`);
        assert.deepEqual(
          releaseDispatch.map((entry) => entry.exit),
          ["failed"],
        );
        assert.isAbove(releaseDenial.length, 0, "the typed denial surfaced from the real dispatch");
        // Root workspace: nothing was created, so there is nothing to clean up or mis-report.
        assert.isNull(worktrees[0]?.worktree_path ?? null);
        assert.deepEqual(
          baselineAccepted.filter((id) => !accepted.includes(id)),
          [],
        );

        // Replay safety. Every attempt below must leave events, effects and the run untouched.
        const observe = Effect.gen(function* () {
          return {
            events: yield* a.sql`SELECT count(*) AS n FROM orchestration_events`,
            counts: yield* a.counts,
            effects: yield* a.effects,
            run: yield* a.sql`SELECT status, payload_json FROM orchestration_v2_projection_runs`,
            attempts: yield* continuationRows(a),
          };
        });
        const settled = yield* observe;
        const threadId = ThreadId.make(review.thread_id);
        const runId = run.run_id as never;
        const outcomes: Array<string> = [];
        const attemptDispatch = (command: Parameters<typeof a.dispatch>[0]) =>
          a.dispatch(command).pipe(
            Effect.matchEffect({
              onFailure: () => Effect.sync(() => outcomes.push(`${command.type}:denied`)),
              onSuccess: () => Effect.sync(() => outcomes.push(`${command.type}:accepted`)),
            }),
          );
        const releaseCommandId = heldCommandId as never;
        // Same release command id: refused by the revoked-cancel marker.
        yield* attemptDispatch({
          type: "prepared-run.release",
          commandId: releaseCommandId,
          threadId,
          runId,
        });
        // Retry reusing the release id (hits the marker) and with a fresh id (run is not failed).
        yield* attemptDispatch({
          type: "prepared-run.retry",
          commandId: releaseCommandId,
          threadId,
          runId,
        });
        yield* attemptDispatch({
          type: "prepared-run.retry",
          commandId: `${launchId}:retry-fresh` as never,
          threadId,
          runId,
        });
        // A fresh-id release is still guarded by preparationGuard after the attempt is cancelled.
        yield* attemptDispatch({
          type: "prepared-run.release",
          commandId: `${launchId}:release-fresh` as never,
          threadId,
          runId,
        });
        // Late `prepared-run.fail`: the same id replays its receipt; a fresh id hits the cancelled-run no-op.
        for (const id of [`${launchId}:fail`, `${launchId}:fail-late`]) {
          yield* attemptDispatch({
            type: "prepared-run.fail",
            commandId: id as never,
            threadId,
            runId,
            failure: { class: "unknown", message: "late", code: null, retryable: false },
          });
        }
        // Source reconcile re-enters advanceContinuation: revoked, so it must not relaunch.
        yield* a.execution.reconcileAttempt(projectId, worker.attemptId);
        yield* a.execution.reconcileActiveAttempts();
        const replayed = yield* observe;
        const lateReceipts = (yield* a.receipts)
          .filter((row) => row.command_id.includes(review.attempt_id))
          .map((row) => [row.command_id.slice(row.command_id.indexOf(":launch")), row.status]);
        process.stdout.write(
          `assembly7-replay outcomes=${JSON.stringify(outcomes)} eventsEffectsRunUnchanged=${JSON.stringify([replayed.events, replayed.effects, replayed.run, replayed.attempts]) === JSON.stringify([settled.events, settled.effects, settled.run, settled.attempts])} receiptsForReview=${JSON.stringify(lateReceipts)} adapter=${a.adapterCalls()}\n`,
        );
        assert.deepEqual(outcomes, [
          "prepared-run.release:denied",
          "prepared-run.retry:denied",
          "prepared-run.retry:denied",
          "prepared-run.release:denied",
          "prepared-run.fail:accepted",
          "prepared-run.fail:accepted",
        ]);
        assert.deepEqual(replayed.events, settled.events);
        // Runs and provider-turn.start effects are unchanged. The only new accepted receipt is the
        // zero-event receipt of the fresh-id late `prepared-run.fail`; denied commands are `rejected`.
        assert.deepEqual(replayed.counts.slice(0, 2), settled.counts.slice(0, 2));
        assert.equal(replayed.counts[2]! - settled.counts[2]!, 1);
        assert.deepEqual(
          lateReceipts.filter(([, status]) => status === "accepted").map(([id]) => id),
          [...mine.map((id) => id.slice(id.indexOf(":launch"))), ":launch:fail-late"].sort(),
        );
        assert.deepEqual(
          lateReceipts.filter(([, status]) => status === "rejected").map(([id]) => id),
          [":launch:release-fresh", ":launch:retry-fresh"],
        );
        assert.deepEqual(replayed.effects, settled.effects);
        assert.deepEqual(replayed.run, settled.run);
        assert.deepEqual(replayed.attempts, settled.attempts);
        assert.equal(replayed.attempts[0]?.status, "cancelled");
        const lateFail = {
          type: "prepared-run.fail" as const,
          commandId: CommandId.make(`${launchId}:fail-after-rebuild`),
          threadId,
          runId,
          failure: { class: "unknown" as const, message: "late", code: null, retryable: false },
        };
        assert.isTrue((yield* a.replay.rebuild).valid);
        const afterRebuild = yield* a.dispatch(lateFail);
        assert.isEmpty(afterRebuild.storedEvents);
        assert.deepEqual(yield* a.dispatch(lateFail), { ...afterRebuild, replayed: true });
        assert.isTrue((yield* a.replay.rebuild).valid);
        assert.deepEqual(yield* a.dispatch(lateFail), { ...afterRebuild, replayed: true });
        assert.isEmpty(
          (yield* a.dispatch({
            ...lateFail,
            commandId: CommandId.make(`${launchId}:fail-after-second-rebuild`),
          })).storedEvents,
        );
        assert.deepEqual((yield* observe).events, settled.events);
        assert.equal(a.adapterCalls(), 0);
      }),
    ),
);

it.effect.each(["worktree", "setup", "release"] as const)(
  "production root: worktree review revoked before %s never creates, sets up or keeps a worktree",
  (stage) =>
    provide(
      Effect.gen(function* () {
        const a = yield* assemble(`worktree-${stage}`, { reviewIsolation: "worktree" });
        const worker = yield* settleSourceWorker(a);
        const baseline = yield* a.counts;
        const branchesBefore = yield* a.runGit(["branch", "--list", "--format=%(refname:short)"]);
        // The source worker ran on the shared route, so nothing below is the source's worktree.
        assert.equal(a.createWorktree.mock.calls.length, 0);
        const setupCallsBefore = a.runSetup.mock.calls.length;

        // Hold in front of the real dispatcher at the command that precedes the stage.
        const suffix = {
          worktree: ":progress:worktree",
          setup: ":progress:setup",
          release: ":release",
        }[stage];
        const reached = yield* Deferred.make<string>();
        const gate = yield* Deferred.make<void>();
        a.beforeDispatch.current = (command) =>
          command.commandId.endsWith(suffix) && command.commandId.includes(":runtime-execution:")
            ? Deferred.succeed(reached, command.commandId).pipe(
                Effect.andThen(Deferred.await(gate)),
              )
            : Effect.void;
        yield* a.execution.reconcileAttempt(projectId, worker.attemptId);
        const held = yield* Deferred.await(reached);
        const review = (yield* continuationRows(a))[0]!;
        const launchId = `command:runtime-execution:${review.attempt_id}:launch`;
        assert.equal(held, `${launchId}${suffix}`);
        const createdAtHold = a.createWorktree.mock.calls.length;
        assert.equal(createdAtHold, stage === "worktree" ? 0 : 1);

        yield* a.revoke;
        yield* Deferred.succeed(gate, undefined);
        assert.equal(yield* Queue.take(a.failSettled), `${launchId}:fail`);

        const finalRun = yield* a.sql<{ status: string }>`
          SELECT status FROM orchestration_v2_projection_runs WHERE thread_id = ${review.thread_id}`;
        const finalAttempt = (yield* continuationRows(a))[0]!;
        const counts = yield* a.counts;
        const thread = yield* a.sql<{ worktree_path: string | null; branch: string | null }>`
          SELECT json_extract(payload_json, '$.worktreePath') AS worktree_path,
            json_extract(payload_json, '$.branch') AS branch
          FROM orchestration_v2_projection_threads WHERE thread_id = ${review.thread_id}`;
        const branchesAfter = yield* a.runGit(["branch", "--list", "--format=%(refname:short)"]);
        const worktreeList = yield* a.runGit(["worktree", "list", "--porcelain"]);
        const created = a.createWorktree.mock.calls.length;
        const setupCalls = a.runSetup.mock.calls.length - setupCallsBefore;
        process.stdout.write(
          `assembly8-worktree-${stage} run=${finalRun[0]?.status} attempt=${finalAttempt.status} createWorktreeCalls=${created} setupCalls=${setupCalls} removeWorktreeCalls=${a.removeWorktree.mock.calls.length} worktreePath=${JSON.stringify(thread[0]?.worktree_path)} branch=${JSON.stringify(thread[0]?.branch)} branches=${JSON.stringify(branchesAfter.trim().split("\n"))} worktrees=${worktreeList.split("\n").filter((line) => line.startsWith("worktree ")).length} newProviderTurnStartEffects=${counts[1]! - baseline[1]!} adapter=${a.adapterCalls()}\n`,
        );

        assert.equal(finalRun[0]?.status, "cancelled");
        assert.equal(finalAttempt.status, "cancelled");
        assert.equal(counts[1]! - baseline[1]!, 0);
        assert.equal(a.adapterCalls(), 0);
        // Revoked before checkout: no worktree is ever created. After: the one created is removed.
        assert.equal(created, createdAtHold);
        assert.equal(a.removeWorktree.mock.calls.length, created);
        // The setup script runs only when the revocation came after it.
        assert.equal(setupCalls, stage === "release" ? 1 : 0);
        assert.isNull(thread[0]?.worktree_path ?? null);
        assert.isNull(thread[0]?.branch ?? null);
        assert.equal(branchesAfter, branchesBefore);
        // Only the main checkout remains registered.
        assert.equal(
          worktreeList.split("\n").filter((line) => line.startsWith("worktree ")).length,
          1,
        );
        if (created === 1) {
          const path = a.removeWorktree.mock.calls[0]![0].path;
          assert.isFalse(yield* (yield* FileSystem.FileSystem).exists(path));
        }
      }),
    ),
);

it.effect(
  "production root: callers cannot mint continuation authority and read APIs never expose it",
  () =>
    provide(
      Effect.gen(function* () {
        const a = yield* assemble("authority-boundary");
        const worker = yield* settleSourceWorker(a);
        const before = yield* a.counts;

        // Public execute with every reserved-namespace key shape: no run, effect or receipt.
        const outcomes: Array<string> = [];
        for (const key of [
          `cont:v1:r:${worker.attemptId}`,
          `cont:v1:p:${worker.attemptId}`,
          "cont:v1:garbage",
        ]) {
          const exit = yield* Effect.exit(
            a.execution.execute(projectId, {
              taskId: reviewId,
              expectedTaskRevision: 1,
              clientRequestId: key,
            }),
          );
          outcomes.push(
            exit._tag === "Failure"
              ? "failed"
              : `${(exit.value as { status: string }).status}:${(exit.value as { failure: string | null }).failure}`,
          );
        }
        const after = yield* a.counts;
        const attemptsForReview = yield* continuationRows(a);
        process.stdout.write(
          `assembly7-reserved-key outcomes=${JSON.stringify(outcomes)} before=${JSON.stringify(before)} after=${JSON.stringify(after)} reviewAttemptRows=${JSON.stringify(attemptsForReview.map((row) => [row.status, row.request_key]))} adapter=${a.adapterCalls()}\n`,
        );
        assert.deepEqual(after, before);
        assert.isTrue(outcomes.every((outcome) => !outcome.startsWith("launched")));
        assert.isTrue(
          attemptsForReview.every((row) => row.status !== "launched" && row.status !== "pending"),
        );

        // Real continuation, then compare the stored private authorization with every read path.
        yield* a.execution.reconcileAttempt(projectId, worker.attemptId);
        yield* Queue.take(a.released);
        const review = (yield* continuationRows(a))[0]!;
        const stored = yield* a.sql<{ authorization: string | null; payload: string }>`
          SELECT json_extract(payload_json, '$.continuationAuthorization') AS authorization,
            payload_json AS payload
          FROM project_runtime_execution_attempts WHERE attempt_id = ${review.attempt_id}`;
        assert.isString(stored[0]?.authorization);
        const read = yield* a.execution.readAttempt(projectId, review.attempt_id as never);
        const listed = yield* a.execution.listAttempts(projectId, { taskId: reviewId });
        const readJson = JSON.stringify(read);
        const listJson = JSON.stringify(listed);
        const runPayload = (yield* a.sql<{ payload: string }>`
          SELECT payload_json AS payload FROM orchestration_v2_projection_runs
          WHERE thread_id = ${review.thread_id}`)[0]!.payload;
        const projectionHits = yield* a.sql<{ n: number }>`
          SELECT count(*) AS n FROM orchestration_v2_projection_runs
          WHERE payload_json LIKE '%continuationAuthorization%'`;
        process.stdout.write(
          `assembly7-authority-hidden storedPresent=${stored[0]?.authorization !== null} readExposes=${readJson.includes("continuationAuthorization")} listExposes=${listJson.includes("continuationAuthorization")} runPayloadExposes=${runPayload.includes("continuationAuthorization")} projectionRunsWithAuthorization=${projectionHits[0]!.n} listed=${listed.attempts.length}\n`,
        );
        assert.isFalse(readJson.includes("continuationAuthorization"));
        assert.isFalse(listJson.includes("continuationAuthorization"));
        assert.isFalse(readJson.includes(stored[0]!.authorization!));
        assert.isFalse(runPayload.includes("continuationAuthorization"));
        assert.equal(Number(projectionHits[0]!.n), 0);
        assert.isAbove(listed.attempts.length, 0);
        assert.equal(a.adapterCalls(), 0);
      }),
    ),
);

it.effect.each(["queued-run.start", "queue.resume", "normal"] as const)(
  "production root: revoked recovered continuation cannot enqueue a fresh start through %s",
  (entry) =>
    provide(
      Effect.gen(function* () {
        const a = yield* assemble(`queue-replay-${entry}`);
        const worker = yield* settleSourceWorker(a);
        yield* a.execution.reconcileAttempt(projectId, worker.attemptId);
        yield* Queue.take(a.released);
        const review = (yield* continuationRows(a))[0]!;
        const run = (yield* a.sql<{
          run_id: string;
          status: string;
        }>`SELECT run_id, status FROM orchestration_v2_projection_runs WHERE thread_id = ${review.thread_id}`)[0]!;
        assert.equal(run.status, "starting");
        const oldEffects = yield* a.effects;
        assert.isTrue(oldEffects.every((effect) => effect.attempt_count === 0));
        yield* a.recovery.reconcile("startup");
        const held = (yield* a.sql<{
          status: string;
          held: number;
        }>`SELECT status, json_extract(payload_json, '$.queueHeld') AS held FROM orchestration_v2_projection_runs WHERE run_id = ${run.run_id}`)[0]!;
        assert.deepEqual(held, { status: "queued", held: 1 });
        assert.isTrue((yield* a.effects).every((effect) => effect.status === "cancelled"));
        const settings = yield* a.settings.getSettings;
        const instanceId = ProviderInstanceId.make("claudeAgent");
        const setEnabled = (enabled: boolean) =>
          a.settings.updateSettings({
            providerInstances: {
              [instanceId]: {
                ...settings.providerInstances[instanceId],
                driver: ProviderDriverKind.make("claudeAgent"),
                enabled,
              },
            },
          });
        yield* setEnabled(false);
        const command =
          entry === "queue.resume"
            ? {
                type: "queue.resume" as const,
                threadId: ThreadId.make(review.thread_id),
                commandId: CommandId.make(`queue-before-revoke:${entry}`),
              }
            : {
                type: "queued-run.start" as const,
                threadId: ThreadId.make(review.thread_id),
                runId: RunId.make(run.run_id),
                commandId: CommandId.make(`queue-before-revoke:${entry}`),
              };
        if (entry !== "normal") yield* a.dispatch(command);
        assert.equal(
          (yield* a.counts)[1],
          oldEffects.length,
          "disabled provider must hold promotion before revocation",
        );
        const historical = yield* a.receipts;
        yield* a.revoke;
        yield* setEnabled(true);
        const before = yield* a.counts;
        const result = yield* a.dispatch(command);
        const after = yield* a.counts;
        process.stdout.write(
          `queue-replay-red entry=${entry} startsBefore=${before[1]} startsAfter=${after[1]} replayed=${result.replayed === true}\n`,
        );
        assert.equal(
          after[1],
          before[1],
          "revoked recovered continuation must not enqueue a fresh provider-turn.start before the worker fence",
        );
        assert.equal(after[0], before[0]);
        if (entry !== "normal") {
          assert.deepEqual(yield* a.receipts, historical);
          assert.equal((yield* continuationRows(a))[0]?.status, "launched");
          // Disabled-provider acceptance reholds the queue. Replay preserves that hold;
          // a subsequent operator unhold reaches the common transactional promotion fence.
          yield* a.dispatch({
            ...command,
            commandId: CommandId.make(`unhold-after-replay:${entry}`),
          });
          assert.equal((yield* a.counts)[1], before[1]);
        }
        const reconciled = (yield* continuationRows(a))[0]!;
        assert.equal(reconciled.status, "reconcile_required");
        assert.equal(
          reconciled.failure,
          "Continuation authorization invalid; queued start blocked. Retained start history does not certify cancellation.",
        );
        const fenced = (yield* a.sql<{
          status: string;
          held: number;
        }>`SELECT status, json_extract(payload_json, '$.queueHeld') AS held FROM orchestration_v2_projection_runs WHERE run_id = ${run.run_id}`)[0]!;
        assert.deepEqual(fenced, { status: "queued", held: 1 });
        assert.isTrue((yield* a.effects).every((effect) => effect.status === "cancelled"));
        yield* a.dispatch(command);
        yield* a.dispatch({ ...command, commandId: CommandId.make(`repeat-unhold:${entry}`) });
        assert.deepEqual((yield* continuationRows(a))[0], reconciled);
        yield* a.drainWorker;
        assert.equal((yield* a.counts)[1], before[1]);
        assert.equal(a.adapterCalls(), 0);
      }),
    ),
);

it.effect.each(["continuation", "ordinary-runtime"] as const)(
  "production root: authorized recovered %s queue promotion remains available",
  (kind) =>
    provide(
      Effect.gen(function* () {
        const a = yield* assemble(`queue-control-${kind}`);
        let threadId: ThreadId;
        if (kind === "continuation") {
          const worker = yield* settleSourceWorker(a);
          yield* a.execution.reconcileAttempt(projectId, worker.attemptId);
          yield* Queue.take(a.released);
          threadId = ThreadId.make((yield* continuationRows(a))[0]!.thread_id);
        } else {
          const attempt = yield* a.execution.execute(projectId, {
            taskId: sourceId,
            expectedTaskRevision: 1,
            clientRequestId: "queue-ordinary-control",
          });
          yield* Queue.take(a.released);
          threadId = attempt.threadId!;
        }
        yield* a.recovery.reconcile("startup");
        const run = (yield* a.sql<{
          run_id: string;
          status: string;
          held: number;
        }>`SELECT run_id, status, json_extract(payload_json, '$.queueHeld') AS held FROM orchestration_v2_projection_runs WHERE thread_id = ${threadId}`)[0]!;
        assert.equal(run.status, "queued");
        assert.equal(run.held, 1);
        const before = yield* a.counts;
        const command = {
          type: "queued-run.start" as const,
          threadId,
          runId: RunId.make(run.run_id),
          commandId: CommandId.make(`queue-control:${kind}`),
        };
        yield* a.dispatch(command);
        assert.equal((yield* a.counts)[0], before[0]);
        assert.equal((yield* a.counts)[1], before[1] + 1);
        yield* a.dispatch(command);
        assert.equal((yield* a.counts)[1], before[1] + 1);
        assert.equal(a.adapterCalls(), 0);
      }),
    ),
);

// Deterministic form of the registry-lag race: the claudeAgent instance is not registered when the
// queued start looks up its adapter, so the start fails before any continuation guard runs.
const withMissingAdapter = <A, E, R>(
  a: Effect.Success<ReturnType<typeof assemble>>,
  body: Effect.Effect<A, E, R>,
) =>
  Effect.acquireUseRelease(
    Effect.sync(() =>
      vi.spyOn(a.instances, "getInstance").mockImplementation(() => Effect.undefined),
    ),
    () => body,
    (spy) => Effect.sync(() => spy.mockRestore()),
  );

const heldQueuedRun = Effect.fn("D4FullServerAssembly.heldQueuedRun")(function* (
  a: Effect.Success<ReturnType<typeof assemble>>,
  threadId: string,
) {
  return (yield* a.sql<{
    run_id: string;
    status: string;
    held: number | null;
  }>`SELECT run_id, status, json_extract(payload_json, '$.queueHeld') AS held FROM orchestration_v2_projection_runs WHERE thread_id = ${threadId}`)[0]!;
});

it.effect.each(["queued-run.start", "queue.resume"] as const)(
  "production root: revoked continuation whose queued start fails (adapter missing) reconciles through %s",
  (entry) =>
    provide(
      Effect.gen(function* () {
        const a = yield* assemble(`queue-failed-start-${entry}`);
        const worker = yield* settleSourceWorker(a);
        yield* a.execution.reconcileAttempt(projectId, worker.attemptId);
        yield* Queue.take(a.released);
        const review = (yield* continuationRows(a))[0]!;
        yield* a.recovery.reconcile("startup");
        const run = yield* heldQueuedRun(a, review.thread_id);
        assert.deepEqual([run.status, run.held], ["queued", 1]);
        const settings = yield* a.settings.getSettings;
        const instanceId = ProviderInstanceId.make("claudeAgent");
        yield* a.settings.updateSettings({
          providerInstances: {
            [instanceId]: {
              ...settings.providerInstances[instanceId],
              driver: ProviderDriverKind.make("claudeAgent"),
              enabled: true,
            },
          },
        });
        yield* a.revoke;
        const threadId = ThreadId.make(review.thread_id);
        const command = (id: string) =>
          entry === "queue.resume"
            ? { type: "queue.resume" as const, threadId, commandId: CommandId.make(id) }
            : {
                type: "queued-run.start" as const,
                threadId,
                runId: RunId.make(run.run_id),
                commandId: CommandId.make(id),
              };
        const before = (yield* a.counts).slice(0, 2);
        yield* withMissingAdapter(a, a.dispatch(command(`failed-start:${entry}`)));
        const reconciled = (yield* continuationRows(a))[0]!;
        assert.equal(reconciled.status, "reconcile_required");
        assert.equal(
          reconciled.failure,
          "Continuation authorization invalid; queued start blocked. Retained start history does not certify cancellation.",
        );
        const fenced = yield* heldQueuedRun(a, review.thread_id);
        assert.deepEqual([fenced.status, fenced.held], ["queued", 1]);
        assert.isTrue((yield* a.effects).every((effect) => effect.status === "cancelled"));
        assert.deepEqual((yield* a.counts).slice(0, 2), before);
        // Replay and a fresh unhold, with and without the missing adapter, are idempotent.
        yield* withMissingAdapter(a, a.dispatch(command(`failed-start:${entry}`)));
        yield* withMissingAdapter(a, a.dispatch(command(`failed-start-again:${entry}`)));
        yield* a.dispatch(command(`failed-start-after:${entry}`));
        assert.deepEqual((yield* continuationRows(a))[0], reconciled);
        assert.deepEqual(yield* heldQueuedRun(a, review.thread_id), fenced);
        yield* a.drainWorker;
        assert.deepEqual((yield* a.counts).slice(0, 2), before);
        assert.equal(a.adapterCalls(), 0);
      }),
    ),
);

// Barrier: revocation commits right after a failure-path transaction rolled back because the
// continuation was still authorized. A revocation seen before the outcome is recorded must never be
// overwritten by an ordinary failure. Ordered by the transaction call itself, so no timers.
const failedStartAfterDecisionBarrier = Effect.fn("D4FullServerAssembly.failedStartBarrier")(
  function* (a: Effect.Success<ReturnType<typeof assemble>>) {
    const worker = yield* settleSourceWorker(a);
    yield* a.execution.reconcileAttempt(projectId, worker.attemptId);
    yield* Queue.take(a.released);
    const review = (yield* continuationRows(a))[0]!;
    yield* a.recovery.reconcile("startup");
    const run = yield* heldQueuedRun(a, review.thread_id);
    assert.deepEqual([run.status, run.held], ["queued", 1]);
    const settings = yield* a.settings.getSettings;
    const instanceId = ProviderInstanceId.make("claudeAgent");
    yield* a.settings.updateSettings({
      providerInstances: {
        [instanceId]: {
          ...settings.providerInstances[instanceId],
          driver: ProviderDriverKind.make("claudeAgent"),
          enabled: true,
        },
      },
    });
    // Authorization is still valid when the start is attempted.
    assert.isDefined((yield* a.runtime.readTask(projectId, sourceId)).continuation);
    const revokedOnce = yield* Deferred.make<void>();
    const state = { armed: false };
    const withTransaction = a.sql.withTransaction;
    const spies = [
      vi.spyOn(a.instances, "getInstance").mockImplementation(() => {
        state.armed = true;
        return Effect.undefined;
      }),
      vi
        .spyOn(a.sql, "withTransaction")
        .mockImplementation(((body: Effect.Effect<void>) =>
          state.armed
            ? withTransaction(body as Effect.Effect<void>).pipe(
                Effect.tapError((error) =>
                  (error as { _tag?: string })._tag === "EventSinkCommitDenied"
                    ? Deferred.succeed(revokedOnce, undefined).pipe(
                        Effect.flatMap((first) => (first ? a.revoke : Effect.void)),
                      )
                    : Effect.void,
                ),
              )
            : withTransaction(body as Effect.Effect<void>)) as never),
    ];
    const before = (yield* a.counts).slice(0, 2);
    yield* a.dispatch({
      type: "queue.resume" as const,
      threadId: ThreadId.make(review.thread_id),
      commandId: CommandId.make("failed-start:barrier"),
    });
    for (const spy of spies) spy.mockRestore();
    return { review, before, revoked: yield* Deferred.isDone(revokedOnce) };
  },
);

it.effect(
  "production root: revocation between an authorized decision and the failure record is never overwritten",
  () =>
    provide(
      Effect.gen(function* () {
        const a = yield* assemble("queue-failed-start-barrier");
        const { review, before, revoked } = yield* failedStartAfterDecisionBarrier(a);
        const attempt = (yield* continuationRows(a))[0]!;
        const fenced = yield* heldQueuedRun(a, review.thread_id);
        process.stdout.write(
          `barrier revoked=${revoked} attempt=${attempt.status} run=${fenced.status}/${fenced.held}\n`,
        );
        if (revoked) {
          assert.equal(attempt.status, "reconcile_required");
          assert.equal(
            attempt.failure,
            "Continuation authorization invalid; queued start blocked. Retained start history does not certify cancellation.",
          );
          assert.deepEqual([fenced.status, fenced.held], ["queued", 1]);
        } else {
          // No window opened: the decision and its record were one transaction, so the outcome is
          // the ordinary failure under a continuation that was still authorized at commit.
          assert.isDefined((yield* a.runtime.readTask(projectId, sourceId)).continuation);
          assert.equal(fenced.status, "failed");
        }
        assert.deepEqual((yield* a.counts).slice(0, 2), before);
        yield* a.drainWorker;
        assert.deepEqual((yield* a.counts).slice(0, 2), before);
        assert.equal(a.adapterCalls(), 0);
      }),
    ),
);

it.effect(
  "production root: an ordinary Runtime run whose queued start fails keeps the ordinary failure",
  () =>
    provide(
      Effect.gen(function* () {
        const a = yield* assemble("queue-failed-start-ordinary");
        const attempt = yield* a.execution.execute(projectId, {
          taskId: sourceId,
          expectedTaskRevision: 1,
          clientRequestId: "queue-failed-start-ordinary",
        });
        yield* Queue.take(a.released);
        yield* a.recovery.reconcile("startup");
        const threadId = attempt.threadId!;
        const run = yield* heldQueuedRun(a, threadId);
        assert.deepEqual([run.status, run.held], ["queued", 1]);
        const before = yield* a.counts;
        const attemptBefore = yield* a.sql<{ status: string }>`
          SELECT status FROM project_runtime_execution_attempts WHERE thread_id = ${threadId}`;
        yield* withMissingAdapter(
          a,
          a.dispatch({
            type: "queued-run.start" as const,
            threadId,
            runId: RunId.make(run.run_id),
            commandId: CommandId.make("failed-start:ordinary"),
          }),
        );
        const after = yield* heldQueuedRun(a, threadId);
        assert.equal(after.status, "failed");
        // Ordinary behavior is unchanged: the run fails and the non-continuation attempt is not reconciled.
        assert.deepEqual(
          yield* a.sql<{
            status: string;
          }>`SELECT status FROM project_runtime_execution_attempts WHERE thread_id = ${threadId}`,
          attemptBefore,
        );
        assert.deepEqual((yield* a.counts).slice(0, 2), before.slice(0, 2));
        assert.equal(a.adapterCalls(), 0);
      }),
    ),
);
