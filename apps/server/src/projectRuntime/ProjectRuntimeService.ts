import * as DevelopmentProfileService from "../developmentProfiles/DevelopmentProfileService.ts";
import {
  PROJECT_RUNTIME_BOUNDS,
  ProjectId,
  ProjectRuntimeActor,
  ProjectRuntimeConflictError,
  type ProjectRuntimeContext,
  ProjectRuntimeDisabledError,
  ProjectRuntimeHandoff,
  ProjectRuntimeHandoffAppendInput,
  ProjectRuntimeHandoffId,
  ProjectRuntimeHandoffListInput,
  type ProjectRuntimeHandoffListResult,
  ProjectRuntimeInstructions,
  ProjectRuntimeInstructionsSaveInput,
  ProjectRuntimeInvalidTransitionError,
  ProjectRuntimeNotFoundError,
  ProjectRuntimeSetEnabledInput,
  ProjectRuntimeSource,
  ProjectRuntimeSourceCreateInput,
  ProjectRuntimeSourceId,
  ProjectRuntimeSourceListInput,
  ProjectRuntimeSourcePathError,
  ProjectRuntimeSourceRemoveInput,
  ProjectRuntimeSourceUpdateInput,
  type ProjectRuntimeStatus,
  ProjectRuntimeTask,
  type ProjectRuntimeTaskBlockerInput,
  ProjectRuntimeTaskCreateInput,
  ProjectRuntimeTaskId,
  ProjectRuntimeTaskListInput,
  type ProjectRuntimeTaskListResult,
  type ProjectRuntimeTaskVerification,
  ProjectRuntimeTaskUpdateInput,
  type ProjectRuntimeError,
} from "@t3tools/contracts";
import * as Context from "effect/Context";
import * as DateTime from "effect/DateTime";
import * as Crypto from "effect/Crypto";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import * as SqlClient from "effect/sql/SqlClient";
import { type SqlError } from "effect/sql/SqlError";

import { PersistenceSqlError } from "../persistence/Errors.ts";
import { ProjectNotFoundError } from "../project/ProjectService.ts";
import { disabledContext, packContext } from "./ProjectRuntimeContext.ts";

const WriteContext = Schema.Struct({ actor: ProjectRuntimeActor });
type WriteContext = typeof WriteContext.Type;
const HandoffContext = Schema.Struct({
  ...WriteContext.fields,
  threadId: ProjectRuntimeHandoff.fields.threadId,
  providerInstanceId: ProjectRuntimeHandoff.fields.providerInstanceId,
  model: ProjectRuntimeHandoff.fields.model,
});
type HandoffContext = typeof HandoffContext.Type;
type ContextTaskCandidate = {
  readonly task: ProjectRuntimeTask;
  readonly latestHandoff: ProjectRuntimeHandoff | null;
};
class ProjectRuntimeIdGenerationError extends Schema.TaggedError<ProjectRuntimeIdGenerationError>()(
  "ProjectRuntimeIdGenerationError",
  { cause: Schema.Defect() },
) {
  override get message(): string {
    return "Failed to generate a Project Runtime record ID.";
  }
}
type RuntimeError =
  | ProjectRuntimeError
  | ProjectNotFoundError
  | PersistenceSqlError
  | Schema.SchemaError
  | ProjectRuntimeIdGenerationError;
type Result<A> = Effect.Effect<A, RuntimeError>;

export class ProjectRuntimeService extends Context.Service<
  ProjectRuntimeService,
  {
    readonly getStatus: (projectId: ProjectId) => Result<ProjectRuntimeStatus>;
    readonly setEnabled: (
      projectId: ProjectId,
      input: ProjectRuntimeSetEnabledInput,
    ) => Result<ProjectRuntimeStatus>;
    readonly readInstructions: (projectId: ProjectId) => Result<ProjectRuntimeInstructions | null>;
    /** User/UI mutations; future agent transports must not expose these methods. */
    readonly saveInstructions: (
      projectId: ProjectId,
      input: ProjectRuntimeInstructionsSaveInput,
      context: WriteContext,
    ) => Result<ProjectRuntimeInstructions>;
    readonly createSource: (
      projectId: ProjectId,
      input: ProjectRuntimeSourceCreateInput,
      context: WriteContext,
    ) => Result<ProjectRuntimeSource>;
    readonly readSource: (
      projectId: ProjectId,
      sourceId: ProjectRuntimeSourceId,
    ) => Result<ProjectRuntimeSource>;
    /** Registry metadata only. Filesystem health belongs to the source-access layer. */
    readonly listSources: (
      projectId: ProjectId,
      input: ProjectRuntimeSourceListInput,
    ) => Result<{
      readonly sources: ReadonlyArray<ProjectRuntimeSource>;
      readonly nextCursor: number | null;
    }>;
    readonly updateSource: (
      projectId: ProjectId,
      input: ProjectRuntimeSourceUpdateInput,
      context: WriteContext,
    ) => Result<ProjectRuntimeSource>;
    readonly removeSource: (
      projectId: ProjectId,
      input: ProjectRuntimeSourceRemoveInput,
    ) => Result<void>;
    readonly createTask: (
      projectId: ProjectId,
      input: ProjectRuntimeTaskCreateInput,
      context: WriteContext,
    ) => Result<ProjectRuntimeTask>;
    readonly readTask: (
      projectId: ProjectId,
      taskId: ProjectRuntimeTaskId,
    ) => Result<ProjectRuntimeTask>;
    readonly listTasks: (
      projectId: ProjectId,
      input: ProjectRuntimeTaskListInput,
    ) => Result<ProjectRuntimeTaskListResult>;
    readonly updateTask: (
      projectId: ProjectId,
      input: ProjectRuntimeTaskUpdateInput,
      context: WriteContext,
    ) => Result<ProjectRuntimeTask>;
    readonly appendHandoff: (
      projectId: ProjectId,
      input: ProjectRuntimeHandoffAppendInput,
      context: HandoffContext,
    ) => Result<ProjectRuntimeHandoff>;
    readonly readHandoff: (
      projectId: ProjectId,
      handoffId: ProjectRuntimeHandoffId,
    ) => Result<ProjectRuntimeHandoff>;
    readonly listHandoffs: (
      projectId: ProjectId,
      input: ProjectRuntimeHandoffListInput,
    ) => Result<ProjectRuntimeHandoffListResult>;
    /**
     * Bootstrap context from durable state in one transaction. A disabled Runtime reads as an
     * empty context rather than failing, so an agent can learn it is not enabled.
     */
    readonly readContext: (projectId: ProjectId) => Result<ProjectRuntimeContext>;
  }
>()("t3/projectRuntime/ProjectRuntimeService") {}

const InstructionsJson = Schema.fromJsonString(ProjectRuntimeInstructions);
const SourceJson = Schema.fromJsonString(ProjectRuntimeSource);
const TaskJson = Schema.fromJsonString(ProjectRuntimeTask);
const HandoffJson = Schema.fromJsonString(ProjectRuntimeHandoff);
const decodeProjectId = Schema.decodeUnknownEffect(ProjectId);
const decodeSetEnabledInput = Schema.decodeUnknownEffect(ProjectRuntimeSetEnabledInput);
const decodeInstructions = Schema.decodeUnknownEffect(InstructionsJson);
const decodeInstructionsSaveInput = Schema.decodeUnknownEffect(ProjectRuntimeInstructionsSaveInput);
const decodeWriteContext = Schema.decodeUnknownEffect(WriteContext);
const decodeSourceCreateInput = Schema.decodeUnknownEffect(ProjectRuntimeSourceCreateInput);
const decodeSourceId = Schema.decodeUnknownEffect(ProjectRuntimeSourceId);
const decodeSourceUpdateInput = Schema.decodeUnknownEffect(ProjectRuntimeSourceUpdateInput);
const decodeSourceRemoveInput = Schema.decodeUnknownEffect(ProjectRuntimeSourceRemoveInput);
const decodeSourceListInput = Schema.decodeUnknownEffect(ProjectRuntimeSourceListInput);
const decodeSource = Schema.decodeUnknownEffect(SourceJson);
const decodeTaskCreateInput = Schema.decodeUnknownEffect(ProjectRuntimeTaskCreateInput);
const decodeTaskId = Schema.decodeUnknownEffect(ProjectRuntimeTaskId);
const decodeTaskUpdateInput = Schema.decodeUnknownEffect(ProjectRuntimeTaskUpdateInput);
const decodeTaskListInput = Schema.decodeUnknownEffect(ProjectRuntimeTaskListInput);
const decodeTask = Schema.decodeUnknownEffect(TaskJson);
const decodeHandoffAppendInput = Schema.decodeUnknownEffect(ProjectRuntimeHandoffAppendInput);
const decodeHandoffContext = Schema.decodeUnknownEffect(HandoffContext);
const decodeHandoffId = Schema.decodeUnknownEffect(ProjectRuntimeHandoffId);
const decodeHandoffListInput = Schema.decodeUnknownEffect(ProjectRuntimeHandoffListInput);
const decodeHandoff = Schema.decodeUnknownEffect(HandoffJson);
const encodeInstructions = Schema.encodeEffect(InstructionsJson);
const encodeSource = Schema.encodeEffect(SourceJson);
const encodeTask = Schema.encodeEffect(TaskJson);
const encodeHandoff = Schema.encodeEffect(HandoffJson);
const now = DateTime.now.pipe(Effect.map(DateTime.formatIso));

// These bounds are character/count bounds in the contracts. Retrieval's
// readMaxBytes/searchMaxBytes/contextMaxBytes require UTF-8 byte measurement
// in the later source-access/context layer; maxLength cannot enforce bytes.
export const validatePath = Effect.fn("ProjectRuntimeService.validatePath")(function* (
  projectId: ProjectId,
  relativePath: string,
) {
  const absolute = /^[\\/]|^[a-z]:/i.test(relativePath);
  let depth = 0;
  for (const part of relativePath.split(/[\\/]/)) {
    if (part === "..") depth--;
    else if (part !== "" && part !== ".") depth++;
    if (depth < 0) break;
  }
  if (absolute || depth < 0) {
    return yield* new ProjectRuntimeSourcePathError({
      projectId,
      relativePath,
      reason: absolute ? "absolute" : "outside_workspace",
    });
  }
});

function patchRecord<A extends object>(record: A, patch: object) {
  const result = { ...record };
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) Reflect.deleteProperty(result, key);
    else if (value !== undefined) Reflect.set(result, key, value);
  }
  return result;
}

type TaskPatch = Omit<ProjectRuntimeTaskUpdateInput, "taskId" | "expectedRevision">;

const unverifiedVerification = (): ProjectRuntimeTaskVerification => ({
  milestone: "none",
  evidence: [],
});

const PASSING_MILESTONES: ReadonlySet<ProjectRuntimeTaskVerification["milestone"]> = new Set([
  "static-pass",
  "runtime-pass",
  "review-pass",
  "integrated",
  "verified",
]);

/**
 * Tasks differ from optional-metadata records: `blocker` and `verification` are
 * required fields, so null persists `blocker: null` and resets verification.
 */
function applyTaskPatch(
  existing: ProjectRuntimeTask,
  patch: TaskPatch,
  timestamp: string,
): ProjectRuntimeTask {
  const result = { ...existing };
  if (patch.title !== undefined) result.title = patch.title;
  if (patch.objective !== undefined) {
    if (patch.objective === null) delete result.objective;
    else result.objective = patch.objective;
  }
  if (patch.scope !== undefined) result.scope = patch.scope;
  if (patch.outOfScope !== undefined) {
    if (patch.outOfScope === null) delete result.outOfScope;
    else result.outOfScope = patch.outOfScope;
  }
  if (patch.owner !== undefined) result.owner = patch.owner;
  if (patch.base !== undefined) {
    if (patch.base === null) delete result.base;
    else result.base = patch.base;
  }
  if (patch.acceptanceCriteria !== undefined) {
    result.acceptanceCriteria = patch.acceptanceCriteria;
  }
  if (patch.verificationPlan !== undefined) {
    if (patch.verificationPlan === null) delete result.verificationPlan;
    else result.verificationPlan = patch.verificationPlan;
  }
  if (patch.status !== undefined) result.status = patch.status;
  if (patch.blocker !== undefined) {
    const blocker: ProjectRuntimeTaskBlockerInput | null = patch.blocker;
    result.blocker = blocker === null ? null : { ...blocker, createdAt: timestamp };
  }
  if (patch.result !== undefined) {
    if (patch.result === null) delete result.result;
    else result.result = patch.result;
  }
  if (patch.verification !== undefined) {
    result.verification =
      patch.verification === null ? unverifiedVerification() : patch.verification;
  }
  if (patch.nextAction !== undefined) {
    if (patch.nextAction === null) delete result.nextAction;
    else result.nextAction = patch.nextAction;
  }
  if (patch.routing !== undefined) {
    if (patch.routing === null) delete result.routing;
    else result.routing = patch.routing;
  }
  return result;
}

const validateVerification = Effect.fn("ProjectRuntimeService.validateVerification")(function* (
  projectId: ProjectId,
  taskId: ProjectRuntimeTaskId,
  verification: ProjectRuntimeTaskVerification,
) {
  if (
    PASSING_MILESTONES.has(verification.milestone) &&
    !verification.evidence.some((entry) => entry.result === "pass")
  ) {
    return yield* new ProjectRuntimeInvalidTransitionError({
      projectId,
      taskId,
      violation: "milestone_requires_passing_evidence",
    });
  }
  if (
    verification.milestone === "verified" &&
    verification.evidence.some((entry) => entry.result === "fail")
  ) {
    return yield* new ProjectRuntimeInvalidTransitionError({
      projectId,
      taskId,
      violation: "verified_forbids_failing_evidence",
    });
  }
});

const validateTask = Effect.fn("ProjectRuntimeService.validateTask")(function* (
  projectId: ProjectId,
  task: ProjectRuntimeTask,
) {
  if (task.status === "blocked" && task.blocker === null) {
    return yield* new ProjectRuntimeInvalidTransitionError({
      projectId,
      taskId: task.taskId,
      violation: "blocked_requires_blocker",
    });
  }
  if (task.status !== "blocked" && task.blocker !== null) {
    return yield* new ProjectRuntimeInvalidTransitionError({
      projectId,
      taskId: task.taskId,
      violation: "blocker_requires_blocked_status",
    });
  }
  if (task.status === "done" && (task.result === undefined || task.result.trim() === "")) {
    return yield* new ProjectRuntimeInvalidTransitionError({
      projectId,
      taskId: task.taskId,
      violation: "done_requires_result",
    });
  }
  yield* validateVerification(projectId, task.taskId, task.verification);
});

const make = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const developmentProfiles = yield* DevelopmentProfileService.DevelopmentProfileService;
  const crypto = yield* Crypto.Crypto;
  const newId = crypto
    .randomUUIDv4()
    .pipe(Effect.mapError((cause) => new ProjectRuntimeIdGenerationError({ cause })));
  const sqlErrors = <A, R>(effect: Effect.Effect<A, RuntimeError | SqlError, R>) =>
    effect.pipe(
      Effect.catchTags({
        SqlError: (cause) =>
          Effect.fail(new PersistenceSqlError({ operation: "projectRuntime", cause })),
      }),
    );

  const status = Effect.fn("ProjectRuntimeService.status")(function* (projectId: ProjectId) {
    yield* decodeProjectId(projectId);
    const projects =
      yield* sql`SELECT project_id FROM projection_projects WHERE project_id = ${projectId} AND deleted_at IS NULL`;
    if (projects.length === 0) return yield* new ProjectNotFoundError({ projectId });
    const rows = yield* sql<{
      readonly enabled: number;
      readonly revision: number;
    }>`SELECT enabled, revision FROM project_runtime WHERE project_id = ${projectId}`;
    return {
      enabled: rows[0]?.enabled === 1,
      revision: rows[0]?.revision ?? 0,
      version: 1 as const,
    };
  });
  const requireEnabled = Effect.fn("ProjectRuntimeService.requireEnabled")(function* (
    projectId: ProjectId,
  ) {
    const current = yield* status(projectId);
    if (!current.enabled) return yield* new ProjectRuntimeDisabledError({ projectId });
    return current;
  });
  const bump = Effect.fn("ProjectRuntimeService.bump")(function* (projectId: ProjectId) {
    yield* sql`UPDATE project_runtime SET revision = revision + 1, updated_at = ${yield* now} WHERE project_id = ${projectId}`;
  });

  // The selected schema is also the storage representation: structured fields,
  // including bounded evidenceRefs, use the repository's JSON codec convention.
  const find = Effect.fn("ProjectRuntimeService.find")(function* <A>(
    projectId: ProjectId,
    entity: "source" | "task" | "handoff",
    entityId: string,
    decode: (json: string) => Effect.Effect<A, Schema.SchemaError>,
  ) {
    const rows = yield* sql<{
      readonly payload_json: string;
    }>`SELECT payload_json FROM ${sql(`project_runtime_${entity === "source" ? "sources" : entity === "task" ? "tasks" : "handoffs"}`)} WHERE project_id = ${projectId} AND ${sql(`${entity}_id`)} = ${entityId}`;
    if (rows[0] === undefined)
      return yield* new ProjectRuntimeNotFoundError({ projectId, entity, entityId });
    return yield* decode(rows[0].payload_json);
  });
  const checkRevision = Effect.fn("ProjectRuntimeService.checkRevision")(function* (
    projectId: ProjectId,
    entity: "instructions" | "source" | "task",
    currentRevision: number,
    expectedRevision: number | undefined,
    entityId?: string,
  ) {
    if (expectedRevision !== undefined && expectedRevision !== currentRevision) {
      return yield* new ProjectRuntimeConflictError({
        projectId,
        entity,
        ...(entityId === undefined ? {} : { entityId }),
        expectedRevision,
        currentRevision,
      });
    }
  });

  const getStatus: ProjectRuntimeService["Service"]["getStatus"] = Effect.fn(
    "ProjectRuntimeService.getStatus",
  )(status, sql.withTransaction, sqlErrors);
  const setEnabled: ProjectRuntimeService["Service"]["setEnabled"] = Effect.fn(
    "ProjectRuntimeService.setEnabled",
  )(
    function* (projectId, input) {
      const { enabled } = yield* decodeSetEnabledInput(input);
      yield* status(projectId);
      const timestamp = yield* now;
      yield* sql`INSERT INTO project_runtime (project_id, enabled, revision, created_at, updated_at)
      VALUES (${projectId}, ${enabled ? 1 : 0}, 1, ${timestamp}, ${timestamp})
      ON CONFLICT (project_id) DO UPDATE SET enabled = excluded.enabled, revision = project_runtime.revision + 1, updated_at = excluded.updated_at`;
      return yield* status(projectId);
    },
    sql.withTransaction,
    sqlErrors,
  );

  const readInstructions: ProjectRuntimeService["Service"]["readInstructions"] = Effect.fn(
    "ProjectRuntimeService.readInstructions",
  )(
    function* (projectId) {
      yield* requireEnabled(projectId);
      const rows = yield* sql<{
        readonly instructions_json: string | null;
      }>`SELECT instructions_json FROM project_runtime WHERE project_id = ${projectId}`;
      return rows[0]?.instructions_json == null
        ? null
        : yield* decodeInstructions(rows[0].instructions_json);
    },
    sql.withTransaction,
    sqlErrors,
  );
  const saveInstructions: ProjectRuntimeService["Service"]["saveInstructions"] = Effect.fn(
    "ProjectRuntimeService.saveInstructions",
  )(
    function* (projectId, input, context) {
      const data = yield* decodeInstructionsSaveInput(input);
      const { actor } = yield* decodeWriteContext(context);
      const existing = yield* readInstructions(projectId);
      if (data.expectedRevision !== undefined && data.expectedRevision !== 0 && existing === null)
        return yield* new ProjectRuntimeNotFoundError({ projectId, entity: "instructions" });
      yield* checkRevision(
        projectId,
        "instructions",
        existing?.revision ?? 0,
        data.expectedRevision,
      );
      const record = {
        projectId,
        instructions: data.instructions,
        revision: (existing?.revision ?? 0) + 1,
        updatedAt: yield* now,
        updatedBy: actor,
      };
      const payload = yield* encodeInstructions(record);
      const changed =
        yield* sql`UPDATE project_runtime SET instructions_json = ${payload}, instructions_revision = instructions_revision + 1,
      revision = revision + 1, updated_at = ${record.updatedAt}
      WHERE project_id = ${projectId} AND instructions_revision = ${existing?.revision ?? 0} RETURNING project_id`;
      if (changed.length !== 1)
        return yield* new PersistenceSqlError({ operation: "saveProjectRuntimeInstructions" });
      return record;
    },
    sql.withTransaction,
    sqlErrors,
  );

  const createSource: ProjectRuntimeService["Service"]["createSource"] = Effect.fn(
    "ProjectRuntimeService.createSource",
  )(
    function* (projectId, input, context) {
      const data = yield* decodeSourceCreateInput(input);
      const { actor } = yield* decodeWriteContext(context);
      yield* requireEnabled(projectId);
      yield* validatePath(projectId, data.relativePath);
      const timestamp = yield* now;
      const record = {
        ...data,
        projectId,
        sourceId: ProjectRuntimeSourceId.make(yield* newId),
        enabled: data.enabled ?? true,
        revision: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: actor,
        updatedBy: actor,
      };
      const payload = yield* encodeSource(record);
      yield* sql`INSERT INTO project_runtime_sources (source_id, project_id, revision, created_at, payload_json) VALUES (${record.sourceId}, ${projectId}, 1, ${timestamp}, ${payload})`;
      yield* bump(projectId);
      return record;
    },
    sql.withTransaction,
    sqlErrors,
  );
  const readSource: ProjectRuntimeService["Service"]["readSource"] = Effect.fn(
    "ProjectRuntimeService.readSource",
  )(
    function* (projectId, sourceId) {
      yield* decodeSourceId(sourceId);
      yield* requireEnabled(projectId);
      return yield* find(projectId, "source", sourceId, decodeSource);
    },
    sql.withTransaction,
    sqlErrors,
  );
  const updateSource: ProjectRuntimeService["Service"]["updateSource"] = Effect.fn(
    "ProjectRuntimeService.updateSource",
  )(
    function* (projectId, input, context) {
      const { sourceId, expectedRevision, ...patch } = yield* decodeSourceUpdateInput(input);
      const { actor } = yield* decodeWriteContext(context);
      const existing = yield* readSource(projectId, sourceId);
      yield* checkRevision(projectId, "source", existing.revision, expectedRevision, sourceId);
      if (patch.relativePath !== undefined) yield* validatePath(projectId, patch.relativePath);
      const record = {
        ...patchRecord(existing, patch),
        revision: existing.revision + 1,
        updatedAt: yield* now,
        updatedBy: actor,
      };
      const payload = yield* encodeSource(record);
      const changed =
        yield* sql`UPDATE project_runtime_sources SET revision = revision + 1, payload_json = ${payload} WHERE project_id = ${projectId} AND source_id = ${sourceId} AND revision = ${existing.revision} RETURNING source_id`;
      if (changed.length !== 1)
        return yield* new PersistenceSqlError({ operation: "updateProjectRuntimeSource" });
      yield* bump(projectId);
      return record;
    },
    sql.withTransaction,
    sqlErrors,
  );
  const removeSource: ProjectRuntimeService["Service"]["removeSource"] = Effect.fn(
    "ProjectRuntimeService.removeSource",
  )(
    function* (projectId, input) {
      const { sourceId, expectedRevision } = yield* decodeSourceRemoveInput(input);
      const existing = yield* readSource(projectId, sourceId);
      yield* checkRevision(projectId, "source", existing.revision, expectedRevision, sourceId);
      yield* sql`DELETE FROM project_runtime_sources WHERE project_id = ${projectId} AND source_id = ${sourceId} AND revision = ${existing.revision}`;
      yield* bump(projectId);
    },
    sql.withTransaction,
    sqlErrors,
  );
  const listSources: ProjectRuntimeService["Service"]["listSources"] = Effect.fn(
    "ProjectRuntimeService.listSources",
  )(
    function* (projectId, input) {
      const { cursor = 0, limit = 100 } = yield* decodeSourceListInput(input);
      yield* requireEnabled(projectId);
      const rows = yield* sql<{
        readonly payload_json: string;
      }>`SELECT payload_json FROM project_runtime_sources WHERE project_id = ${projectId} ORDER BY created_at, source_id LIMIT ${limit + 1} OFFSET ${cursor}`;
      const sources = yield* Effect.forEach(rows.slice(0, limit), (row) =>
        decodeSource(row.payload_json),
      );
      return { sources, nextCursor: rows.length > limit ? cursor + limit : null };
    },
    sql.withTransaction,
    sqlErrors,
  );

  const createTask: ProjectRuntimeService["Service"]["createTask"] = Effect.fn(
    "ProjectRuntimeService.createTask",
  )(
    function* (projectId, input, context) {
      const data = yield* decodeTaskCreateInput(input);
      const { actor } = yield* decodeWriteContext(context);
      yield* requireEnabled(projectId);
      const timestamp = yield* now;
      const record: ProjectRuntimeTask = {
        ...data,
        projectId,
        taskId: ProjectRuntimeTaskId.make(yield* newId),
        owner: data.owner ?? actor,
        status: data.status ?? "planned",
        blocker: data.blocker === undefined ? null : { ...data.blocker, createdAt: timestamp },
        verification: data.verification ?? unverifiedVerification(),
        latestHandoffId: null,
        revision: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: actor,
        updatedBy: actor,
      };
      yield* validateTask(projectId, record);
      const payload = yield* encodeTask(record);
      yield* sql`INSERT INTO project_runtime_tasks (task_id, project_id, status, revision, created_at, payload_json) VALUES (${record.taskId}, ${projectId}, ${record.status}, 1, ${timestamp}, ${payload})`;
      yield* bump(projectId);
      return record;
    },
    sql.withTransaction,
    sqlErrors,
  );
  const readTask: ProjectRuntimeService["Service"]["readTask"] = Effect.fn(
    "ProjectRuntimeService.readTask",
  )(
    function* (projectId, taskId) {
      yield* decodeTaskId(taskId);
      yield* requireEnabled(projectId);
      return yield* find(projectId, "task", taskId, decodeTask);
    },
    sql.withTransaction,
    sqlErrors,
  );
  const updateTask: ProjectRuntimeService["Service"]["updateTask"] = Effect.fn(
    "ProjectRuntimeService.updateTask",
  )(
    function* (projectId, input, context) {
      const { taskId, expectedRevision, ...patch } = yield* decodeTaskUpdateInput(input);
      const { actor } = yield* decodeWriteContext(context);
      const existing = yield* readTask(projectId, taskId);
      yield* checkRevision(projectId, "task", existing.revision, expectedRevision, taskId);
      const timestamp = yield* now;
      const record: ProjectRuntimeTask = {
        ...applyTaskPatch(existing, patch, timestamp),
        revision: existing.revision + 1,
        updatedAt: timestamp,
        updatedBy: actor,
      };
      yield* validateTask(projectId, record);
      const payload = yield* encodeTask(record);
      // BEGIN IMMEDIATE holds the writer lock across read, CAS and aggregate bump.
      // Keep the conditional write as well: no caller can silently overwrite a revision.
      const changed =
        yield* sql`UPDATE project_runtime_tasks SET revision = revision + 1, status = ${record.status}, payload_json = ${payload}
      WHERE project_id = ${projectId} AND task_id = ${taskId} AND revision = ${expectedRevision} RETURNING task_id`;
      if (changed.length !== 1) {
        const current = yield* find(projectId, "task", taskId, decodeTask);
        return yield* new ProjectRuntimeConflictError({
          projectId,
          entity: "task",
          entityId: taskId,
          expectedRevision,
          currentRevision: current.revision,
        });
      }
      yield* bump(projectId);
      return record;
    },
    sql.withTransaction,
    sqlErrors,
  );
  const listTasks: ProjectRuntimeService["Service"]["listTasks"] = Effect.fn(
    "ProjectRuntimeService.listTasks",
  )(
    function* (projectId, input) {
      const { cursor = 0, limit = 100, status: taskStatus } = yield* decodeTaskListInput(input);
      yield* requireEnabled(projectId);
      const rows = yield* sql<{
        readonly payload_json: string;
      }>`SELECT payload_json FROM project_runtime_tasks WHERE project_id = ${projectId}
      ${taskStatus === undefined ? sql`` : sql`AND status = ${taskStatus}`} ORDER BY created_at, task_id LIMIT ${limit + 1} OFFSET ${cursor}`;
      const tasks = yield* Effect.forEach(rows.slice(0, limit), (row) =>
        decodeTask(row.payload_json),
      );
      return { tasks, nextCursor: rows.length > limit ? cursor + limit : null };
    },
    sql.withTransaction,
    sqlErrors,
  );

  const appendHandoff: ProjectRuntimeService["Service"]["appendHandoff"] = Effect.fn(
    "ProjectRuntimeService.appendHandoff",
  )(
    function* (projectId, input, context) {
      const data = yield* decodeHandoffAppendInput(input);
      const { actor, ...provenance } = yield* decodeHandoffContext(context);
      const runtime = yield* requireEnabled(projectId);
      const task = yield* readTask(projectId, data.taskId);
      if (task.revision !== data.expectedTaskRevision) {
        return yield* new ProjectRuntimeConflictError({
          projectId,
          entity: "task",
          entityId: data.taskId,
          expectedRevision: data.expectedTaskRevision,
          currentRevision: task.revision,
        });
      }
      const {
        taskId,
        expectedTaskRevision,
        taskState,
        verification: verificationInput,
        filesChanged,
        ...handoffFields
      } = data;
      const timestamp = yield* now;
      const verification = verificationInput ?? unverifiedVerification();
      yield* validateVerification(projectId, task.taskId, verification);
      const nextTask = taskState === undefined ? task : applyTaskPatch(task, taskState, timestamp);
      const handoffId = ProjectRuntimeHandoffId.make(yield* newId);
      const updatedTask: ProjectRuntimeTask = {
        ...nextTask,
        latestHandoffId: handoffId,
        revision: task.revision + 1,
        updatedAt: timestamp,
        updatedBy: actor,
      };
      yield* validateTask(projectId, updatedTask);
      const record: ProjectRuntimeHandoff = {
        ...handoffFields,
        ...provenance,
        projectId,
        handoffId,
        taskId,
        filesChanged: filesChanged ?? [],
        verification,
        runtimeRevision: runtime.revision,
        taskRevision: expectedTaskRevision,
        createdAt: timestamp,
        createdBy: actor,
      };
      const payload = yield* encodeHandoff(record);
      const taskPayload = yield* encodeTask(updatedTask);
      yield* sql`INSERT INTO project_runtime_handoffs (handoff_id, project_id, task_id, created_at, payload_json) VALUES (${record.handoffId}, ${projectId}, ${record.taskId}, ${record.createdAt}, ${payload})`;
      const changed =
        yield* sql`UPDATE project_runtime_tasks SET revision = revision + 1, status = ${updatedTask.status}, payload_json = ${taskPayload}
        WHERE project_id = ${projectId} AND task_id = ${taskId} AND revision = ${expectedTaskRevision} RETURNING task_id`;
      if (changed.length !== 1) {
        const current = yield* find(projectId, "task", taskId, decodeTask);
        return yield* new ProjectRuntimeConflictError({
          projectId,
          entity: "task",
          entityId: taskId,
          expectedRevision: expectedTaskRevision,
          currentRevision: current.revision,
        });
      }
      yield* bump(projectId);
      return record;
    },
    sql.withTransaction,
    sqlErrors,
  );
  const readHandoff: ProjectRuntimeService["Service"]["readHandoff"] = Effect.fn(
    "ProjectRuntimeService.readHandoff",
  )(
    function* (projectId, handoffId) {
      yield* decodeHandoffId(handoffId);
      yield* requireEnabled(projectId);
      return yield* find(projectId, "handoff", handoffId, decodeHandoff);
    },
    sql.withTransaction,
    sqlErrors,
  );
  const listHandoffs: ProjectRuntimeService["Service"]["listHandoffs"] = Effect.fn(
    "ProjectRuntimeService.listHandoffs",
  )(
    function* (projectId, input) {
      const { cursor = 0, limit = 100, taskId } = yield* decodeHandoffListInput(input);
      yield* requireEnabled(projectId);
      if (taskId !== undefined) yield* readTask(projectId, taskId);
      const rows = yield* sql<{
        readonly payload_json: string;
      }>`SELECT payload_json FROM project_runtime_handoffs WHERE project_id = ${projectId}
      ${taskId === undefined ? sql`` : sql`AND task_id = ${taskId}`} ORDER BY created_at, handoff_id LIMIT ${limit + 1} OFFSET ${cursor}`;
      const handoffs = yield* Effect.forEach(rows.slice(0, limit), (row) =>
        decodeHandoff(row.payload_json),
      );
      return { handoffs, nextCursor: rows.length > limit ? cursor + limit : null };
    },
    sql.withTransaction,
    sqlErrors,
  );

  const readContext: ProjectRuntimeService["Service"]["readContext"] = Effect.fn(
    "ProjectRuntimeService.readContext",
  )(
    function* (projectId) {
      const current = yield* status(projectId);
      const effective = yield* developmentProfiles
        .resolveEffectiveProjectInstructions(projectId)
        .pipe(
          Effect.mapError(
            (cause) =>
              new PersistenceSqlError({ operation: "resolveEffectiveProjectInstructions", cause }),
          ),
        );
      const inherited = effective.developmentProfile;
      const profileContext =
        inherited === null
          ? {}
          : {
              developmentProfile: {
                profileId: inherited.profileId,
                name: inherited.name,
                revision: inherited.revision,
              },
              effectiveInstructions: effective.formattedInstructions,
            };
      if (!current.enabled) return { ...disabledContext(projectId, current), ...profileContext };
      const instructions = effective.projectInstructions;
      // One row past each cap tells the packer that more exist.
      const sourceRows = yield* sql<{
        readonly payload_json: string;
      }>`SELECT payload_json FROM project_runtime_sources WHERE project_id = ${projectId}
      AND json_extract(payload_json, '$.enabled') = 1
      ORDER BY created_at, source_id LIMIT ${PROJECT_RUNTIME_BOUNDS.contextMaxSources + 1}`;
      const taskRows = yield* sql<{
        readonly payload_json: string;
      }>`SELECT payload_json FROM project_runtime_tasks WHERE project_id = ${projectId}
      AND status IN ('active', 'blocked', 'review')
      ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'blocked' THEN 1 ELSE 2 END, created_at, task_id
      LIMIT ${PROJECT_RUNTIME_BOUNDS.contextMaxTasks + 1}`;
      const sources = yield* Effect.forEach(sourceRows, (row) => decodeSource(row.payload_json));
      const tasks = yield* Effect.forEach(taskRows, (row) => decodeTask(row.payload_json));
      // The task's latestHandoffId is the authoritative pointer. A pointer that does not
      // resolve to a handoff of this task fails closed instead of falling back to order.
      const withHandoffs = yield* Effect.forEach(
        tasks.slice(0, PROJECT_RUNTIME_BOUNDS.contextMaxTasks),
        (
          task,
        ): Effect.Effect<
          ContextTaskCandidate,
          ProjectRuntimeNotFoundError | Schema.SchemaError | SqlError
        > => {
          const latestHandoffId = task.latestHandoffId;
          if (latestHandoffId === null) {
            return Effect.succeed({ task, latestHandoff: null });
          }
          return find(projectId, "handoff", latestHandoffId, decodeHandoff).pipe(
            Effect.flatMap((latestHandoff) =>
              latestHandoff.taskId === task.taskId
                ? Effect.succeed({ task, latestHandoff })
                : Effect.fail(
                    new ProjectRuntimeNotFoundError({
                      projectId,
                      entity: "handoff",
                      entityId: latestHandoffId,
                    }),
                  ),
            ),
          );
        },
      );
      return {
        ...packContext({
          projectId,
          status: current,
          instructions,
          sources,
          tasks: [
            ...withHandoffs,
            ...tasks
              .slice(PROJECT_RUNTIME_BOUNDS.contextMaxTasks)
              .map((task) => ({ task, latestHandoff: null })),
          ],
        }),
        ...profileContext,
      };
    },
    sql.withTransaction,
    sqlErrors,
  );

  return ProjectRuntimeService.of({
    getStatus,
    setEnabled,
    readInstructions,
    saveInstructions,
    createSource,
    readSource,
    listSources,
    updateSource,
    removeSource,
    createTask,
    readTask,
    listTasks,
    updateTask,
    appendHandoff,
    readHandoff,
    listHandoffs,
    readContext,
  });
});

export const layer = Layer.effect(ProjectRuntimeService, make);
