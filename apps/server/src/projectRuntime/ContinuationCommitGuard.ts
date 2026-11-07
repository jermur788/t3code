import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import type * as SqlClient from "effect/sql/SqlClient";
import { EventSinkCommitDenied, type CommandCommitGuard } from "../orchestration-v2/EventSink.ts";

const Authorization = Schema.Struct({
  projectId: Schema.String,
  sourceTaskId: Schema.String,
  sourceRevision: Schema.Number,
  targetTaskId: Schema.String,
  targetRevision: Schema.Number,
  attemptId: Schema.String,
  threadId: Schema.String,
  requestKey: Schema.String,
  kind: Schema.Literals(["r", "p"]),
});
export type Authorization = typeof Authorization.Type;
const decodeAuthorization = Schema.decodeUnknownEffect(Schema.fromJsonString(Authorization));
export const encodeAuthorization = Schema.encodeEffect(Schema.fromJsonString(Authorization));

// This reference is supplied by the Runtime service, never decoded from a command.
export const PrivateContinuationAuthorization = Context.Reference<Authorization | undefined>(
  "t3/runtime/PrivateContinuationAuthorization",
  { defaultValue: () => undefined },
);

const checkAuthorization = Effect.fn("ContinuationCommitGuard.check")(function* (
  sql: SqlClient.SqlClient,
  authorization: Authorization,
  enabled: boolean,
) {
  const a = authorization;
  const rows = yield* sql`SELECT 1 FROM project_runtime_tasks AS source
    JOIN project_runtime_tasks AS target ON target.project_id = source.project_id
    JOIN project_runtime_execution_attempts AS attempt ON attempt.project_id = source.project_id
    JOIN project_runtime AS runtime ON runtime.project_id = source.project_id AND runtime.enabled = 1
    WHERE source.project_id = ${a.projectId} AND source.task_id = ${a.sourceTaskId}
      AND source.revision = ${a.sourceRevision}
      AND source.status IN ('planned', 'ready', 'active', 'review')
      AND json_extract(source.payload_json, '$.continuation.mode') = 'synthetic'
      AND json_extract(source.payload_json, ${a.kind === "r" ? "$.continuation.reviewTaskId" : "$.continuation.repairTaskId"}) = ${a.targetTaskId}
      AND target.task_id = ${a.targetTaskId} AND target.revision = ${a.targetRevision}
      AND attempt.attempt_id = ${a.attemptId} AND attempt.task_id = target.task_id
      AND attempt.thread_id = ${a.threadId} AND attempt.request_key = ${a.requestKey}
      AND attempt.status IN ('pending', 'launched')`;
  if (!enabled || rows.length !== 1) {
    return yield* new EventSinkCommitDenied({
      reason: "Continuation authorization revoked or superseded.",
    });
  }
});

export const launchGuard = (
  authorization: Authorization,
  enabled: boolean,
): CommandCommitGuard => ({
  check: (sql) => checkAuthorization(sql, authorization, enabled),
});

// Durable provenance lives outside the public attempt schema. Only a matching server-created
// attempt and its deterministic message can authorize preparation after a process restart.
export const preparationGuard = (
  threadId: string,
  runId: string,
  enabled: boolean,
): CommandCommitGuard => ({
  check: Effect.fn("ContinuationCommitGuard.prepare")(function* (sql) {
    const rows = yield* sql<{
      readonly request_key: string | null;
      readonly attempt_id: string | null;
      readonly user_message_id: string | null;
      readonly authorization: string | null;
    }>`
      SELECT attempt.request_key, attempt.attempt_id,
        json_extract(run.payload_json, '$.userMessageId') AS user_message_id,
        json_extract(attempt.payload_json, '$.continuationAuthorization') AS authorization
      FROM orchestration_v2_projection_runs AS run
      LEFT JOIN project_runtime_execution_attempts AS attempt ON run.thread_id = attempt.thread_id
        AND json_extract(run.payload_json, '$.userMessageId') = 'message:runtime-execution:' || attempt.attempt_id
      WHERE run.run_id = ${runId} AND run.thread_id = ${threadId}`;
    // thread_id is UNIQUE on Runtime attempts; run_id is unique on runs.
    // The deterministic message additionally ties this run to that one attempt.
    // Missing runs are rejected by preparation decisions / ProviderTurnStartService,
    // which owns run existence; this guard only checks continuation authority.
    if (rows.length === 0) return;
    const row = rows[0]!;
    if (row.attempt_id === null && row.user_message_id?.startsWith("message:runtime-execution:")) {
      return yield* new EventSinkCommitDenied({ reason: "Missing Runtime attempt provenance." });
    }
    if (!row.request_key?.startsWith("cont:")) return;
    const authorization = yield* decodeAuthorization(row.authorization).pipe(
      Effect.mapError(
        () =>
          new EventSinkCommitDenied({ reason: "Missing or malformed continuation provenance." }),
      ),
    );
    if (authorization.threadId !== threadId || authorization.requestKey !== row.request_key) {
      return yield* new EventSinkCommitDenied({ reason: "Foreign continuation provenance." });
    }
    yield* checkAuthorization(sql, authorization, enabled);
  }),
});

export const cancellationGuard = (threadId: string, runId: string): CommandCommitGuard => ({
  check: Effect.fn("ContinuationCommitGuard.cancel")(function* (sql) {
    const rows = yield* sql`SELECT 1 FROM orchestration_v2_projection_runs AS run
      WHERE run.run_id = ${runId} AND run.thread_id = ${threadId}
        AND run.status IN ('preparing', 'failed')
        AND NOT EXISTS (SELECT 1 FROM orchestration_v2_effect_outbox AS effect
          WHERE effect.thread_id = ${threadId}
            AND json_extract(effect.payload_json, '$.runId') = ${runId}
            AND json_extract(effect.payload_json, '$.type') = 'provider-turn.start')`;
    if (rows.length !== 1)
      return yield* new EventSinkCommitDenied({
        reason: "Provider start is uncertain; reconcile required.",
      });
    yield* sql`UPDATE project_runtime_execution_attempts
      SET status = 'cancelled', revision = revision + 1,
        payload_json = json_set(payload_json, '$.status', 'cancelled', '$.revision', revision + 1,
          '$.failure', 'Continuation authorization revoked before provider start.')
      WHERE thread_id = ${threadId} AND request_key GLOB 'cont:*'
        AND 'message:runtime-execution:' || attempt_id = (
          SELECT json_extract(payload_json, '$.userMessageId')
          FROM orchestration_v2_projection_runs WHERE run_id = ${runId})
        AND status IN ('pending', 'launched')`;
  }),
});

export const reconcilePreparation = Effect.fn("ContinuationCommitGuard.reconcile")(function* (
  sql: SqlClient.SqlClient,
  threadId: string,
) {
  yield* sql`UPDATE project_runtime_execution_attempts
    SET status = 'reconcile_required', revision = revision + 1,
      payload_json = json_set(payload_json, '$.status', 'reconcile_required', '$.revision', revision + 1,
        '$.failure', 'Continuation revoked; provider start may already have begun.')
    WHERE thread_id = ${threadId} AND request_key GLOB 'cont:*'
      AND status IN ('pending', 'launched', 'reconcile_required')`;
});

// Retained start history cannot certify cancellation of a recovered queued run.
// Keep its identity and history, and fence subsequent promotion even after a regrant.
export const queuedStartReconciliationGuard = (
  threadId: string,
  runId: string,
): CommandCommitGuard => ({
  check: Effect.fn("ContinuationCommitGuard.reconcileQueuedStart")(function* (sql) {
    const rows = yield* sql`SELECT 1 FROM orchestration_v2_projection_runs
      WHERE run_id = ${runId} AND thread_id = ${threadId} AND status = 'queued'`;
    if (rows.length !== 1)
      return yield* new EventSinkCommitDenied({
        reason: "Queued run changed before reconciliation.",
      });
    yield* sql`UPDATE project_runtime_execution_attempts
      SET status = 'reconcile_required', revision = revision + 1,
        payload_json = json_set(payload_json, '$.status', 'reconcile_required', '$.revision', revision + 1,
          '$.failure', 'Continuation authorization invalid; queued start blocked. Retained start history does not certify cancellation.')
      WHERE thread_id = ${threadId} AND request_key GLOB 'cont:*'
        AND status IN ('pending', 'launched')`;
  }),
});

// A queued start can fail before the preparation guard runs (for example, no registered adapter).
// Recording that failure must not outrun a revocation: this guard revalidates authorization in the
// transaction that writes the failure, and signals a revoked continuation with this reason so the
// caller reconciles the attempt instead of failing the run.
export const CONTINUATION_REVOKED_BEFORE_FAILURE =
  "Continuation authorization revoked before the queued start failure was recorded.";

export const queuedStartFailureGuard = (
  threadId: string,
  runId: string,
  enabled: boolean,
): CommandCommitGuard => ({
  check: Effect.fn("ContinuationCommitGuard.queuedStartFailure")(function* (sql) {
    yield* preparationGuard(threadId, runId, enabled)
      .check(sql)
      .pipe(
        Effect.catchTags({
          EventSinkCommitDenied: () =>
            Effect.fail(new EventSinkCommitDenied({ reason: CONTINUATION_REVOKED_BEFORE_FAILURE })),
        }),
      );
  }),
});
