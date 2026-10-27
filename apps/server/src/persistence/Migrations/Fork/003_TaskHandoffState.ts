import * as Effect from "effect/Effect";
import * as Migrator from "effect/sql/Migrator";
import * as SqlClient from "effect/sql/SqlClient";

import { PROJECT_RUNTIME_BOUNDS } from "@t3tools/contracts";

type JsonObject = Record<string, unknown>;

const isObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNonBlankString = (value: unknown): value is string =>
  typeof value === "string" && value.trim() !== "";

const isActor = (value: unknown): value is string =>
  isNonBlankString(value) && value.trim().length <= PROJECT_RUNTIME_BOUNDS.actorMaxLength;

/**
 * Legacy free text becomes bounded entries. Chunks are cut at exactly `max`
 * characters without splitting a surrogate pair, and whitespace-only fragments
 * are dropped; the entry schemas require non-blank text. Remaining entries
 * renumber in order.
 */
const chunkText = (text: string, max: number): string[] => {
  const trimmed = text.trim();
  const chunks: string[] = [];
  let start = 0;
  while (start < trimmed.length) {
    let end = Math.min(start + max, trimmed.length);
    if (end < trimmed.length) {
      const last = trimmed.charCodeAt(end - 1);
      if (last >= 0xd800 && last <= 0xdbff) end -= 1;
    }
    const chunk = trimmed.slice(start, end);
    if (chunk.trim() !== "") chunks.push(chunk);
    start = end;
  }
  return chunks;
};

/**
 * Legacy prose claims are recorded as `inconclusive` evidence: the old text is a
 * claim, not machine-recorded evidence, so it must never surface as `pass`.
 */
const proseToEvidence = (
  prose: unknown,
  recordedAt: string,
  nextId: () => string,
): Array<JsonObject> => {
  if (!isNonBlankString(prose)) return [];
  return chunkText(prose, PROJECT_RUNTIME_BOUNDS.evidenceSummaryMaxLength).map((summary) => ({
    evidenceId: nextId(),
    result: "inconclusive",
    summary,
    recordedAt,
  }));
};

const buildBase = (payload: JsonObject): JsonObject | undefined => {
  const base: JsonObject = {};
  if (isNonBlankString(payload.repository)) base.repository = payload.repository.trim();
  if (isNonBlankString(payload.branch)) base.branch = payload.branch.trim();
  if (isNonBlankString(payload.baseSha)) base.revision = payload.baseSha.trim();
  if (isNonBlankString(payload.worktreePath)) base.worktreePath = payload.worktreePath.trim();
  if (isNonBlankString(payload.upstreamRevision)) {
    base.upstreamRevision = payload.upstreamRevision.trim();
  }
  if (isNonBlankString(payload.notes)) base.notes = payload.notes.trim();
  return Object.keys(base).length > 0 ? base : undefined;
};

/**
 * Rebuild a task payload as the v1 shape. Shape-aware: an already-transformed
 * payload passes through untouched, so a partially applied migration can rerun
 * and already-v1 rows keep their exact bytes.
 */
const migrateTaskPayload = (payload: unknown, latestHandoffId: string | null): unknown => {
  if (!isObject(payload)) {
    return payload;
  }
  if (
    Array.isArray(payload.acceptanceCriteria) &&
    "owner" in payload &&
    "blocker" in payload &&
    isObject(payload.verification) &&
    "milestone" in payload.verification &&
    "latestHandoffId" in payload
  ) {
    return payload;
  }
  const acceptanceCriteria = Array.isArray(payload.acceptanceCriteria)
    ? payload.acceptanceCriteria
    : isNonBlankString(payload.acceptanceCriteria)
      ? chunkText(payload.acceptanceCriteria, PROJECT_RUNTIME_BOUNDS.criterionTextMaxLength).map(
          (text, index) => ({ id: `c${index + 1}`, text }),
        )
      : [];
  const base = isObject(payload.base) ? payload.base : buildBase(payload);
  const owner = isActor(payload.owner)
    ? payload.owner.trim()
    : isActor(payload.createdBy)
      ? payload.createdBy.trim()
      : payload.owner;
  let evidenceOrdinal = 0;
  const verification =
    isObject(payload.verification) && "milestone" in payload.verification
      ? payload.verification
      : {
          milestone: "none",
          evidence: proseToEvidence(payload.verification, String(payload.createdAt ?? ""), () => {
            evidenceOrdinal += 1;
            return `e${evidenceOrdinal}`;
          }),
        };
  const migrated: JsonObject = {
    taskId: payload.taskId,
    projectId: payload.projectId,
    title: payload.title,
    scope: payload.scope,
    owner,
    acceptanceCriteria,
    status: payload.status,
    blocker: isObject(payload.blocker) ? payload.blocker : null,
    verification,
    latestHandoffId,
    revision: payload.revision,
    createdAt: payload.createdAt,
    updatedAt: payload.updatedAt,
    createdBy: payload.createdBy,
    updatedBy: payload.updatedBy,
  };
  if (typeof payload.objective === "string") migrated.objective = payload.objective;
  if (typeof payload.outOfScope === "string") migrated.outOfScope = payload.outOfScope;
  if (base !== undefined) migrated.base = base;
  if (typeof payload.verificationPlan === "string") {
    migrated.verificationPlan = payload.verificationPlan;
  }
  if (typeof payload.result === "string") migrated.result = payload.result;
  if (typeof payload.nextAction === "string") migrated.nextAction = payload.nextAction;
  return migrated;
};

/** Rebuild a handoff payload as the v1 shape. Shape-aware like `migrateTaskPayload`. */
const migrateHandoffPayload = (payload: unknown): unknown => {
  if (!isObject(payload)) {
    return payload;
  }
  if (
    Array.isArray(payload.filesChanged) &&
    isObject(payload.verification) &&
    "milestone" in payload.verification
  ) {
    return payload;
  }
  const filesChanged = Array.isArray(payload.filesChanged)
    ? payload.filesChanged
    : isNonBlankString(payload.changes)
      ? chunkText(payload.changes, PROJECT_RUNTIME_BOUNDS.handoffFileMaxLength)
      : [];
  let evidenceOrdinal = 0;
  const nextEvidenceId = () => {
    evidenceOrdinal += 1;
    return `e${evidenceOrdinal}`;
  };
  const proseEvidence = proseToEvidence(
    payload.verification,
    String(payload.createdAt ?? ""),
    nextEvidenceId,
  );
  const referenceEvidence = Array.isArray(payload.evidenceRefs)
    ? payload.evidenceRefs.flatMap((reference) =>
        isNonBlankString(reference)
          ? chunkText(reference, PROJECT_RUNTIME_BOUNDS.evidenceSummaryMaxLength).map(
              (summary) => ({
                evidenceId: nextEvidenceId(),
                result: "inconclusive",
                summary,
                recordedAt: String(payload.createdAt ?? ""),
              }),
            )
          : [],
      )
    : [];
  const verification =
    isObject(payload.verification) && "milestone" in payload.verification
      ? payload.verification
      : { milestone: "none", evidence: [...proseEvidence, ...referenceEvidence] };
  const migrated: JsonObject = {
    handoffId: payload.handoffId,
    projectId: payload.projectId,
    taskId: payload.taskId,
    checkpoint: payload.checkpoint,
    summary: payload.summary,
    filesChanged,
    verification,
    runtimeRevision: payload.runtimeRevision,
    taskRevision: payload.taskRevision,
    createdAt: payload.createdAt,
    createdBy: payload.createdBy,
  };
  if (typeof payload.result === "string") migrated.result = payload.result;
  if (Array.isArray(payload.testsRun)) migrated.testsRun = payload.testsRun;
  if (Array.isArray(payload.testsNotRun)) migrated.testsNotRun = payload.testsNotRun;
  const failuresRisks =
    isObject(payload) && "failuresRisks" in payload
      ? payload.failuresRisks
      : payload.failuresOrBlockers;
  if (typeof failuresRisks === "string") migrated.failuresRisks = failuresRisks;
  if (Array.isArray(payload.unresolvedDecisions)) {
    migrated.unresolvedDecisions = payload.unresolvedDecisions;
  }
  if (typeof payload.repositoryState === "string") {
    migrated.repositoryState = payload.repositoryState;
  }
  if (typeof payload.integrationState === "string") {
    migrated.integrationState = payload.integrationState;
  }
  if (typeof payload.nextAction === "string") migrated.nextAction = payload.nextAction;
  if (typeof payload.threadId === "string") migrated.threadId = payload.threadId;
  if (typeof payload.providerInstanceId === "string") {
    migrated.providerInstanceId = payload.providerInstanceId;
  }
  if (typeof payload.model === "string") migrated.model = payload.model;
  return migrated;
};

const parsePayload = (rowId: string, payloadJson: string) =>
  Effect.try({
    // @effect-diagnostics-next-line preferSchemaOverJson:off - rewrites legacy payload_json; no schema describes the pre-v1 shape.
    try: () => JSON.parse(payloadJson) as unknown,
    catch: (): Migrator.MigrationError =>
      new Migrator.MigrationError({
        kind: "BadState",
        message: `Fork migration 003 cannot parse payload_json for ${rowId}; refusing to rewrite it.`,
      }),
  });

const stringifyPayload = (payload: unknown) => JSON.stringify(payload);

/**
 * Rewrites `payload_json` to the v1 Task/Handoff shape and backfills
 * `latestHandoffId` using the service's handoff order (`created_at, handoff_id`).
 * Revisions and timestamps are preserved; the shape-aware transform is safe to
 * rerun. Tables keep their DDL; deletion behavior is unchanged.
 */
export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  const handoffRows = yield* sql<{
    readonly handoff_id: string;
    readonly task_id: string;
    readonly created_at: string;
  }>`SELECT handoff_id, task_id, created_at FROM project_runtime_handoffs
    ORDER BY created_at, handoff_id`;
  const latestHandoffByTask = new Map<string, string>();
  for (const row of handoffRows) {
    latestHandoffByTask.set(row.task_id, row.handoff_id);
  }

  const taskRows = yield* sql<{
    readonly task_id: string;
    readonly payload_json: string;
  }>`SELECT task_id, payload_json FROM project_runtime_tasks ORDER BY task_id`;
  for (const row of taskRows) {
    const payload = yield* parsePayload(`task ${row.task_id}`, row.payload_json);
    const migrated = migrateTaskPayload(payload, latestHandoffByTask.get(row.task_id) ?? null);
    yield* sql`UPDATE project_runtime_tasks SET payload_json = ${stringifyPayload(migrated)}
      WHERE task_id = ${row.task_id}`;
  }

  const handoffPayloadRows = yield* sql<{
    readonly handoff_id: string;
    readonly payload_json: string;
  }>`SELECT handoff_id, payload_json FROM project_runtime_handoffs ORDER BY handoff_id`;
  for (const row of handoffPayloadRows) {
    const payload = yield* parsePayload(`handoff ${row.handoff_id}`, row.payload_json);
    const migrated = migrateHandoffPayload(payload);
    yield* sql`UPDATE project_runtime_handoffs SET payload_json = ${stringifyPayload(migrated)}
      WHERE handoff_id = ${row.handoff_id}`;
  }
});
