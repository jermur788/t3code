import * as NodeModule from "node:module";
import * as NodeFS from "node:fs";
const root = new URL("../../../../..", import.meta.url).pathname;
const req = NodeModule.createRequire(root + "/apps/server/package.json");
const imp = (s) => import(req.resolve(s));
const E = await imp("effect/Effect"),
  L = await imp("effect/Layer"),
  S = await imp("effect/sql/SqlClient"),
  D = await imp("effect/DateTime");
const NS = await imp("@effect/platform-node/NodeServices"),
  NC = await imp("@effect/platform-node/NodeCrypto");
const P = await import(root + "/apps/server/src/persistence/Sqlite.ts");
const PR = await import(root + "/apps/server/src/projectRuntime/ProjectRuntimeService.ts");
const DP = await import(root + "/apps/server/src/developmentProfiles/DevelopmentProfileService.ts");
const R = await import(root + "/apps/server/src/orchestration-v2/runtimeLayer.ts");
const Outbox = await import(root + "/apps/server/src/orchestration-v2/EffectOutbox.ts");
const ES = await import(root + "/apps/server/src/orchestration-v2/EventSink.ts");
const file = process.argv[2],
  mode = process.argv[3];
const guarded = process.argv[4] === "guarded";
const G = await import(root + "/apps/server/src/projectRuntime/ContinuationCommitGuard.ts");
const Gate = await import(root + "/apps/server/src/projectRuntime/RuntimeTaskContinuationGate.ts");
const db = P.layerFromPath(file);
const layers = L.mergeAll(
  R.layerEventSink,
  Outbox.layer,
  PR.layer.pipe(L.provide(DP.layer), L.provide(Gate.layer(true))),
).pipe(L.provideMerge(db), L.provide(L.mergeAll(NS.layer, NC.layer)));
const now = D.makeUnsafe("2026-11-05T00:00:00.000Z");
let provenanceOutcomes;
const projectId = "a2-project",
  threadId = "a2-thread",
  commandId = "a2-command",
  runId = "a2-run";
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
const run = {
  id: runId,
  threadId,
  ordinal: 1,
  providerInstanceId: "codex",
  modelSelection: thread.modelSelection,
  providerThreadId: null,
  userMessageId: "message:runtime-execution:runtime-attempt",
  rootNodeId: null,
  activeAttemptId: "a2-attempt",
  status: "starting",
  queuePosition: null,
  requestedAt: now,
  startedAt: null,
  completedAt: null,
  checkpointId: null,
  contextHandoffId: null,
};
const input = {
  commandId,
  threadId,
  commandType: "message.dispatch",
  acceptedAt: now,
  events: [
    {
      id: "a2-run-event",
      type: "run.created",
      threadId,
      runId,
      providerInstanceId: "codex",
      occurredAt: now,
      payload: run,
    },
  ],
  effects: [
    { id: "a2-effect", commandId, threadId, request: { type: "provider-turn.start", runId } },
  ],
};
await E.runPromise(
  E.gen(function* () {
    const sql = yield* S.SqlClient,
      pr = yield* PR.ProjectRuntimeService,
      sink = yield* ES.EventSinkV2;
    if (mode === "seed") {
      yield* sql`INSERT INTO projection_projects (project_id,title,workspace_root,scripts_json,created_at,updated_at) VALUES (${projectId},'Probe','/disposable','[]','2026-11-05','2026-11-05')`;
      yield* pr.setEnabled(projectId, { enabled: true });
      const target = yield* pr.createTask(
        projectId,
        { title: "Review", scope: "probe", acceptanceCriteria: [{ id: "c1", text: "probe" }] },
        { actor: "user:maintainer" },
      );
      const task = yield* pr.createTask(
        projectId,
        {
          title: "Authorized",
          scope: "probe",
          acceptanceCriteria: [{ id: "c1", text: "probe" }],
          continuation: {
            version: 1,
            mode: "synthetic",
            reviewTaskId: target.taskId,
            maxRepairCycles: 1,
          },
        },
        { actor: "user:maintainer" },
      );
      const auth = {
        projectId,
        sourceTaskId: task.taskId,
        sourceRevision: 1,
        targetTaskId: target.taskId,
        targetRevision: 1,
        attemptId: "runtime-attempt",
        threadId,
        requestKey: "cont:v1:r:root",
        kind: "r",
      };
      yield* sql`INSERT INTO project_runtime_execution_attempts (attempt_id,project_id,task_id,status,revision,thread_id,request_key,created_at,updated_at,payload_json) VALUES ('runtime-attempt',${projectId},${target.taskId},'pending',1,${threadId},'cont:v1:r:root','2026-11-05','2026-11-05',${JSON.stringify({ continuationAuthorization: auth })})`;
      yield* sink.write({
        events: [
          {
            id: "a2-thread-event",
            type: "thread.created",
            threadId,
            providerInstanceId: "codex",
            occurredAt: now,
            payload: thread,
          },
        ],
      });
      console.log("TASK", JSON.stringify(task));
    }
    if (process.send && mode !== "barrier") {
      process.send("ready");
      yield* E.promise(() => new Promise((resolve) => process.once("message", resolve)));
    }
    if (mode === "update") {
      const rows =
        yield* sql`SELECT task_id FROM project_runtime_tasks WHERE json_extract(payload_json, '$.title') = 'Authorized'`;
      console.log(
        "UPDATE_RESULT",
        JSON.stringify(
          yield* pr.updateTask(
            projectId,
            { taskId: rows[0].task_id, expectedRevision: 1, continuation: null },
            { actor: "user:maintainer" },
          ),
        ),
      );
    }
    if (mode === "commit" || mode === "replay" || mode === "prepare" || mode === "barrier") {
      const [row] =
        yield* sql`SELECT json_extract(payload_json, '$.continuationAuthorization') AS auth FROM project_runtime_execution_attempts`;
      const auth = JSON.parse(row.auth);
      if (mode === "barrier") {
        yield* E.promise(
          () =>
            new Promise((resolve) => {
              process.once("message", resolve);
              process.send("authorization-read");
            }),
        );
      }
      if (mode === "prepare") {
        input.events[0].payload.status = "preparing";
        input.effects = [];
      }
      console.log(
        "COMMIT_RESULT",
        JSON.stringify(
          yield* E.exit(
            sink.commitCommand({
              ...input,
              ...(guarded ? { commitGuard: G.launchGuard(auth, true) } : {}),
            }),
          ),
        ),
      );
    }
    if (mode === "release") {
      const releaseInput = {
        ...input,
        commandId: "release-command",
        commandType: "prepared-run.release",
        commitGuard: G.preparationGuard(threadId, runId, true),
        events: [{ ...input.events[0], id: "release-event", type: "run.updated" }],
        effects: [{ ...input.effects[0], id: "release-effect", commandId: "release-command" }],
      };
      console.log(
        "RELEASE_RESULT",
        JSON.stringify(
          yield* E.exit(
            sink.commitCommand(releaseInput).pipe(
              E.catchTags({
                EventSinkCommitDenied: () =>
                  sink.commitCommand({
                    ...releaseInput,
                    commitGuard: G.cancellationGuard(threadId, runId),
                    events: [
                      {
                        ...releaseInput.events[0],
                        payload: { ...run, status: "cancelled", completedAt: now },
                      },
                    ],
                    effects: [],
                  }),
              }),
            ),
          ),
        ),
      );
    }
    if (mode === "reconcile-cancel") {
      yield* G.reconcilePreparation(sql, threadId);
      yield* sql.withTransaction(G.cancellationGuard(threadId, runId).check(sql));
    }
    if (mode === "forget") yield* sql`DELETE FROM project_runtime_execution_attempts`;
    if (mode === "claim") {
      const outbox = yield* Outbox.EffectOutboxV2;
      yield* outbox.enqueue(input.effects);
      yield* outbox.claimNext({ workerId: "fixture-worker" });
    }
    if (mode === "uncertain") {
      const result = yield* E.exit(
        sql.withTransaction(G.cancellationGuard(threadId, runId).check(sql)),
      );
      if (result._tag !== "Failure") throw new Error("Claimed start incorrectly certified absent");
      yield* G.reconcilePreparation(sql, threadId);
    }
    if (mode === "identity") {
      const [row] =
        yield* sql`SELECT json_extract(payload_json, '$.continuationAuthorization') AS auth FROM project_runtime_execution_attempts`;
      const auth = JSON.parse(row.auth);
      for (const mutation of [
        { projectId: "foreign" },
        { sourceTaskId: "foreign" },
        { sourceRevision: 2 },
        { targetTaskId: "foreign" },
        { attemptId: "foreign" },
        { requestKey: "foreign" },
      ]) {
        const result = yield* E.exit(
          sink.commitCommand({
            ...input,
            commitGuard: G.launchGuard({ ...auth, ...mutation }, true),
          }),
        );
        if (result._tag !== "Failure") throw new Error("Foreign authorization accepted");
      }
      const disabled = yield* E.exit(
        sink.commitCommand({ ...input, commitGuard: G.launchGuard(auth, false) }),
      );
      if (disabled._tag !== "Failure") throw new Error("Disabled gate accepted");
      yield* sql`UPDATE project_runtime SET enabled = 0 WHERE project_id = ${projectId}`;
      const runtimeDisabled = yield* E.exit(
        sink.commitCommand({ ...input, commitGuard: G.launchGuard(auth, true) }),
      );
      if (runtimeDisabled._tag !== "Failure") throw new Error("Disabled project runtime accepted");
    }
    if (mode === "provenance") {
      // Seed the preparing run row the guard reads; without it the guard's
      // run-existence early return would allow every probe vacuously.
      yield* sink.commitCommand({
        ...input,
        events: [
          { ...input.events[0], payload: { ...input.events[0].payload, status: "preparing" } },
        ],
        effects: [],
      });
      const [row] =
        yield* sql`SELECT task_id, json_extract(payload_json, '$.continuationAuthorization') AS auth FROM project_runtime_execution_attempts`;
      const originalAuth = JSON.parse(row.auth);
      const outcomes = [];
      const setAuthorization = (value) =>
        sql`UPDATE project_runtime_execution_attempts SET payload_json = ${JSON.stringify({
          continuationAuthorization: value,
        })} WHERE attempt_id = 'runtime-attempt'`;
      const probe = (label, expected) =>
        E.gen(function* () {
          const result = yield* E.exit(
            sql.withTransaction(G.preparationGuard(threadId, runId, true).check(sql)),
          );
          if (expected === "allowed") {
            if (result._tag !== "Success") throw new Error(`${label} provenance was denied`);
            outcomes.push([label, "allowed"]);
            return;
          }
          if (result._tag !== "Failure") throw new Error(`${label} provenance was accepted`);
          const error =
            result.cause?.error ??
            result.cause?.failures?.[0] ??
            result.cause?.reasons?.[0]?.error ??
            result.cause?.defect;
          const reason = error?.reason ?? error?._tag ?? "failure";
          if (reason !== expected)
            throw new Error(`${label} denied for ${reason}, not ${expected}`);
          outcomes.push([label, reason]);
        });
      yield* probe("valid-auth", "allowed");
      yield* setAuthorization("not-json");
      yield* probe("malformed-json", "Missing or malformed continuation provenance.");
      yield* setAuthorization({ version: 1, kind: "x" });
      yield* probe("malformed-shape", "Missing or malformed continuation provenance.");
      yield* setAuthorization({ ...originalAuth, threadId: "thread:foreign" });
      yield* probe("foreign-thread", "Foreign continuation provenance.");
      yield* setAuthorization({ ...originalAuth, requestKey: "cont:v1:r:foreign" });
      yield* probe("foreign-request-key", "Foreign continuation provenance.");
      yield* setAuthorization(originalAuth);
      yield* sql`UPDATE project_runtime_tasks SET status = 'done' WHERE task_id = ${originalAuth.sourceTaskId}`;
      yield* probe("revoked-source", "Continuation authorization revoked or superseded.");
      yield* sql`DELETE FROM project_runtime_execution_attempts`;
      yield* probe("missing-attempt", "Missing Runtime attempt provenance.");
      provenanceOutcomes = outcomes;
    }
    console.log(
      "DB_IDENTITY",
      JSON.stringify({
        mode,
        list: yield* sql`PRAGMA database_list`,
        realpath: NodeFS.realpathSync(file),
        inode: NodeFS.statSync(file).ino,
      }),
    );
    console.log(
      "STATE",
      JSON.stringify({
        tasks: yield* sql`SELECT task_id,revision FROM project_runtime_tasks`,
        events:
          yield* sql`SELECT event_type FROM orchestration_events WHERE event_type='run.created'`,
        receipts: yield* sql`SELECT command_id,status FROM orchestration_command_receipts`,
        effects: yield* sql`SELECT * FROM orchestration_v2_effect_outbox`,
        runs: yield* sql`SELECT status FROM orchestration_v2_projection_runs`,
        attempts: yield* sql`SELECT status FROM project_runtime_execution_attempts`,
        provenanceOutcomes,
      }),
    );
    if (process.send) process.send("done");
  }).pipe(E.provide(layers)),
);
if (process.connected) process.disconnect();
