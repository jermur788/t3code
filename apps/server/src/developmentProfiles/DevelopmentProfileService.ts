import {
  DEVELOPMENT_PROFILE_BOUNDS,
  DEVELOPMENT_PROFILE_PRECEDENCE,
  DevelopmentProfile,
  DevelopmentProfileConflictError,
  DevelopmentProfileCreateInput,
  DevelopmentProfileDeleteInput,
  DevelopmentProfileId,
  DevelopmentProfileInUseError,
  DevelopmentProfileNotFoundError,
  DevelopmentProfileProject,
  DevelopmentProfileProjectNotFoundError,
  DevelopmentProfileUpdateInput,
  type DevelopmentProfileError,
  EffectiveProjectInstructions,
  ProjectDevelopmentProfile,
  ProjectDevelopmentProfileSetInput,
  ProjectId,
  ProjectRuntimeInstructions,
  TrimmedNonEmptyString,
} from "@t3tools/contracts";
import * as Context from "effect/Context";
import * as Crypto from "effect/Crypto";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import * as SqlClient from "effect/sql/SqlClient";
import { type SqlError } from "effect/sql/SqlError";

import { PersistenceSqlError } from "../persistence/Errors.ts";

const WriteContext = Schema.Struct({
  actor: TrimmedNonEmptyString.check(Schema.isMaxLength(DEVELOPMENT_PROFILE_BOUNDS.actorMaxLength)),
});
type WriteContext = typeof WriteContext.Type;

class DevelopmentProfileIdGenerationError extends Schema.TaggedError<DevelopmentProfileIdGenerationError>()(
  "DevelopmentProfileIdGenerationError",
  { cause: Schema.Defect() },
) {
  override get message(): string {
    return "Failed to generate a Development Profile ID.";
  }
}

type ServiceError =
  | DevelopmentProfileError
  | PersistenceSqlError
  | Schema.SchemaError
  | DevelopmentProfileIdGenerationError;
export type DevelopmentProfileServiceError = ServiceError;
type Result<A> = Effect.Effect<A, ServiceError>;

export class DevelopmentProfileService extends Context.Service<
  DevelopmentProfileService,
  {
    readonly list: () => Result<ReadonlyArray<DevelopmentProfile>>;
    readonly read: (profileId: DevelopmentProfileId) => Result<DevelopmentProfile>;
    readonly create: (
      input: DevelopmentProfileCreateInput,
      context: WriteContext,
    ) => Result<DevelopmentProfile>;
    readonly update: (
      input: DevelopmentProfileUpdateInput,
      context: WriteContext,
    ) => Result<DevelopmentProfile>;
    readonly delete: (input: DevelopmentProfileDeleteInput) => Result<void>;
    readonly listProjects: (
      profileId: DevelopmentProfileId,
    ) => Result<ReadonlyArray<DevelopmentProfileProject>>;
    readonly getAssignment: (projectId: ProjectId) => Result<ProjectDevelopmentProfile | null>;
    readonly setAssignment: (
      input: ProjectDevelopmentProfileSetInput,
    ) => Result<ProjectDevelopmentProfile>;
    readonly resolveEffectiveProjectInstructions: (
      projectId: ProjectId,
    ) => Result<EffectiveProjectInstructions>;
  }
>()("t3/developmentProfiles/DevelopmentProfileService") {}

interface ProfileRow {
  readonly profile_id: string;
  readonly name: string;
  readonly instructions: string;
  readonly revision: number;
  readonly created_at: string;
  readonly updated_at: string;
  readonly created_by: string;
  readonly updated_by: string;
}

interface AssignmentRow {
  readonly project_id: string;
  readonly profile_id: string | null;
  readonly revision: number;
  readonly created_at: string;
  readonly updated_at: string;
}

interface ProjectRow {
  readonly project_id: string;
  readonly name: string;
}

const decodeCreateInput = Schema.decodeUnknownEffect(DevelopmentProfileCreateInput);
const decodeUpdateInput = Schema.decodeUnknownEffect(DevelopmentProfileUpdateInput);
const decodeDeleteInput = Schema.decodeUnknownEffect(DevelopmentProfileDeleteInput);
const decodeSetAssignmentInput = Schema.decodeUnknownEffect(ProjectDevelopmentProfileSetInput);
const decodeWriteContext = Schema.decodeUnknownEffect(WriteContext);
const decodeProfileId = Schema.decodeUnknownEffect(DevelopmentProfileId);
const decodeProjectId = Schema.decodeUnknownEffect(ProjectId);
const decodeProfile = Schema.decodeUnknownEffect(DevelopmentProfile);
const decodeAssignment = Schema.decodeUnknownEffect(ProjectDevelopmentProfile);
const decodeProject = Schema.decodeUnknownEffect(DevelopmentProfileProject);
const ProjectInstructionsJson = Schema.fromJsonString(ProjectRuntimeInstructions);
const decodeProjectInstructions = Schema.decodeUnknownEffect(ProjectInstructionsJson);

const toProfile = (row: ProfileRow) => ({
  profileId: DevelopmentProfileId.make(row.profile_id),
  name: row.name,
  instructions: row.instructions,
  revision: row.revision,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
});

const toAssignment = (row: AssignmentRow) => ({
  projectId: row.project_id,
  profileId: row.profile_id === null ? null : DevelopmentProfileId.make(row.profile_id),
  revision: row.revision,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toProject = (row: ProjectRow) => ({
  projectId: row.project_id,
  name: row.name,
});

const PROFILE_PRECEDENCE_NOTE =
  "Precedence: host rules and the current user rank above Project Runtime; Project Runtime overrides conflicting Development Profile instructions; source data ranks below the profile.";

export const formatEffectiveInstructions = (
  developmentProfile: DevelopmentProfile | null,
  projectInstructions: ProjectRuntimeInstructions | null,
) => {
  const sections: Array<string> = [];
  if (developmentProfile !== null) {
    sections.push(`### Development Profile\n\n${developmentProfile.instructions}`);
    sections.push(PROFILE_PRECEDENCE_NOTE);
  }
  if (projectInstructions !== null) {
    sections.push(`### Project Runtime\n\n${projectInstructions.instructions}`);
  }
  return sections.join("\n\n");
};

const make = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const crypto = yield* Crypto.Crypto;
  const newId = crypto
    .randomUUIDv4()
    .pipe(Effect.mapError((cause) => new DevelopmentProfileIdGenerationError({ cause })));
  const now = DateTime.now.pipe(Effect.map(DateTime.formatIso));
  const sqlErrors = <A, R>(effect: Effect.Effect<A, ServiceError | SqlError, R>) =>
    effect.pipe(
      Effect.catchTags({
        SqlError: (cause) =>
          Effect.fail(new PersistenceSqlError({ operation: "developmentProfiles", cause })),
      }),
    );

  const requireProject = Effect.fn("DevelopmentProfileService.requireProject")(function* (
    projectId: ProjectId,
  ) {
    const rows =
      yield* sql`SELECT project_id FROM projection_projects WHERE project_id = ${projectId} AND deleted_at IS NULL`;
    if (rows.length === 0) return yield* new DevelopmentProfileProjectNotFoundError({ projectId });
  });

  const findProfile = Effect.fn("DevelopmentProfileService.findProfile")(function* (
    profileId: DevelopmentProfileId,
  ) {
    const rows = yield* sql<ProfileRow>`SELECT
      profile_id, name, instructions, revision, created_at, updated_at, created_by, updated_by
      FROM development_profiles WHERE profile_id = ${profileId}`;
    if (rows[0] === undefined) return yield* new DevelopmentProfileNotFoundError({ profileId });
    return yield* decodeProfile(toProfile(rows[0]));
  });

  const findAssignment = Effect.fn("DevelopmentProfileService.findAssignment")(function* (
    projectId: ProjectId,
  ) {
    const rows = yield* sql<AssignmentRow>`SELECT
      project_id, profile_id, revision, created_at, updated_at
      FROM project_development_profiles WHERE project_id = ${projectId}`;
    if (rows[0] === undefined) return null;
    return yield* decodeAssignment(toAssignment(rows[0]));
  });

  const checkRevision = Effect.fn("DevelopmentProfileService.checkRevision")(function* (
    entityId: string,
    expectedRevision: number,
    currentRevision: number,
  ) {
    if (expectedRevision !== currentRevision) {
      return yield* new DevelopmentProfileConflictError({
        entityId,
        expectedRevision,
        currentRevision,
      });
    }
  });

  const list: DevelopmentProfileService["Service"]["list"] = Effect.fn(
    "DevelopmentProfileService.list",
  )(
    function* () {
      const rows = yield* sql<ProfileRow>`SELECT
        profile_id, name, instructions, revision, created_at, updated_at, created_by, updated_by
        FROM development_profiles ORDER BY created_at, profile_id`;
      return yield* Effect.forEach(rows, (row) => decodeProfile(toProfile(row)));
    },
    sql.withTransaction,
    sqlErrors,
  );

  const read: DevelopmentProfileService["Service"]["read"] = Effect.fn(
    "DevelopmentProfileService.read",
  )(
    function* (profileId) {
      const id = yield* decodeProfileId(profileId);
      return yield* findProfile(id);
    },
    sql.withTransaction,
    sqlErrors,
  );

  const create: DevelopmentProfileService["Service"]["create"] = Effect.fn(
    "DevelopmentProfileService.create",
  )(
    function* (input, context) {
      const data = yield* decodeCreateInput(input);
      const { actor } = yield* decodeWriteContext(context);
      const timestamp = yield* now;
      const record = yield* decodeProfile({
        profileId: DevelopmentProfileId.make(yield* newId),
        name: data.name,
        instructions: data.instructions,
        revision: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: actor,
        updatedBy: actor,
      });
      yield* sql`INSERT INTO development_profiles
        (profile_id, name, instructions, revision, created_at, updated_at, created_by, updated_by)
        VALUES (${record.profileId}, ${record.name}, ${record.instructions}, ${record.revision}, ${record.createdAt}, ${record.updatedAt}, ${record.createdBy}, ${record.updatedBy})`;
      return record;
    },
    sql.withTransaction,
    sqlErrors,
  );

  const update: DevelopmentProfileService["Service"]["update"] = Effect.fn(
    "DevelopmentProfileService.update",
  )(
    function* (input, context) {
      const data = yield* decodeUpdateInput(input);
      const { actor } = yield* decodeWriteContext(context);
      const existing = yield* findProfile(data.profileId);
      yield* checkRevision(data.profileId, data.expectedRevision, existing.revision);
      const updatedAt = yield* now;
      const record = yield* decodeProfile({
        ...existing,
        name: data.name,
        instructions: data.instructions,
        revision: existing.revision + 1,
        updatedAt,
        updatedBy: actor,
      });
      const changed = yield* sql`UPDATE development_profiles
        SET name = ${record.name}, instructions = ${record.instructions}, revision = ${record.revision},
          updated_at = ${record.updatedAt}, updated_by = ${record.updatedBy}
        WHERE profile_id = ${record.profileId} AND revision = ${existing.revision}
        RETURNING profile_id`;
      if (changed.length !== 1) {
        const current = yield* findProfile(data.profileId);
        return yield* new DevelopmentProfileConflictError({
          entityId: data.profileId,
          expectedRevision: data.expectedRevision,
          currentRevision: current.revision,
        });
      }
      return record;
    },
    sql.withTransaction,
    sqlErrors,
  );

  const remove: DevelopmentProfileService["Service"]["delete"] = Effect.fn(
    "DevelopmentProfileService.delete",
  )(
    function* (input) {
      const data = yield* decodeDeleteInput(input);
      const existing = yield* findProfile(data.profileId);
      yield* checkRevision(data.profileId, data.expectedRevision, existing.revision);
      const projectRows = yield* sql<ProjectRow>`SELECT p.project_id, p.title AS name
        FROM project_development_profiles a
        JOIN projection_projects p ON p.project_id = a.project_id
        WHERE a.profile_id = ${data.profileId} AND p.deleted_at IS NULL
        ORDER BY p.created_at, p.project_id`;
      if (projectRows.length > 0) {
        const projects = yield* Effect.forEach(projectRows, (row) => decodeProject(toProject(row)));
        return yield* new DevelopmentProfileInUseError({
          profileId: data.profileId,
          projects,
        });
      }
      const deleted = yield* sql`DELETE FROM development_profiles
        WHERE profile_id = ${data.profileId} AND revision = ${existing.revision}
        RETURNING profile_id`;
      if (deleted.length !== 1) {
        return yield* new PersistenceSqlError({ operation: "deleteDevelopmentProfile" });
      }
    },
    sql.withTransaction,
    sqlErrors,
  );

  const listProjects: DevelopmentProfileService["Service"]["listProjects"] = Effect.fn(
    "DevelopmentProfileService.listProjects",
  )(
    function* (profileId) {
      const id = yield* decodeProfileId(profileId);
      yield* findProfile(id);
      const rows = yield* sql<ProjectRow>`SELECT p.project_id, p.title AS name
        FROM project_development_profiles a
        JOIN projection_projects p ON p.project_id = a.project_id
        WHERE a.profile_id = ${id} AND p.deleted_at IS NULL
        ORDER BY p.created_at, p.project_id`;
      return yield* Effect.forEach(rows, (row) => decodeProject(toProject(row)));
    },
    sql.withTransaction,
    sqlErrors,
  );

  const getAssignment: DevelopmentProfileService["Service"]["getAssignment"] = Effect.fn(
    "DevelopmentProfileService.getAssignment",
  )(
    function* (projectId) {
      const id = yield* decodeProjectId(projectId);
      yield* requireProject(id);
      return yield* findAssignment(id);
    },
    sql.withTransaction,
    sqlErrors,
  );

  const setAssignment: DevelopmentProfileService["Service"]["setAssignment"] = Effect.fn(
    "DevelopmentProfileService.setAssignment",
  )(
    function* (input) {
      const data = yield* decodeSetAssignmentInput(input);
      yield* requireProject(data.projectId);
      if (data.profileId !== null) yield* findProfile(data.profileId);
      const existing = yield* findAssignment(data.projectId);
      yield* checkRevision(data.projectId, data.expectedRevision, existing?.revision ?? 0);
      const updatedAt = yield* now;
      if (existing === null) {
        const record = yield* decodeAssignment({
          projectId: data.projectId,
          profileId: data.profileId,
          revision: 1,
          createdAt: updatedAt,
          updatedAt,
        });
        yield* sql`INSERT INTO project_development_profiles
          (project_id, profile_id, revision, created_at, updated_at)
          VALUES (${record.projectId}, ${record.profileId}, ${record.revision}, ${record.createdAt}, ${record.updatedAt})`;
        return record;
      }
      const record = yield* decodeAssignment({
        ...existing,
        profileId: data.profileId,
        revision: existing.revision + 1,
        updatedAt,
      });
      const changed = yield* sql`UPDATE project_development_profiles
        SET profile_id = ${record.profileId}, revision = ${record.revision}, updated_at = ${record.updatedAt}
        WHERE project_id = ${record.projectId} AND revision = ${existing.revision}
        RETURNING project_id`;
      if (changed.length !== 1) {
        return yield* new PersistenceSqlError({ operation: "setDevelopmentProfileAssignment" });
      }
      return record;
    },
    sql.withTransaction,
    sqlErrors,
  );

  const resolveEffectiveProjectInstructions: DevelopmentProfileService["Service"]["resolveEffectiveProjectInstructions"] =
    Effect.fn("DevelopmentProfileService.resolveEffectiveProjectInstructions")(
      function* (projectId) {
        const id = yield* decodeProjectId(projectId);
        yield* requireProject(id);
        const assignment = yield* findAssignment(id);
        const developmentProfile =
          assignment === null || assignment.profileId === null
            ? null
            : yield* findProfile(assignment.profileId);
        const runtimeRows = yield* sql<{
          readonly enabled: number;
          readonly instructions_json: string | null;
        }>`SELECT enabled, instructions_json FROM project_runtime WHERE project_id = ${id}`;
        const runtime = runtimeRows[0];
        const projectInstructions =
          runtime !== undefined && runtime.enabled === 1 && runtime.instructions_json !== null
            ? yield* decodeProjectInstructions(runtime.instructions_json)
            : null;
        return {
          projectId: id,
          assignment,
          developmentProfile,
          projectInstructions,
          precedence: DEVELOPMENT_PROFILE_PRECEDENCE,
          formattedInstructions: formatEffectiveInstructions(
            developmentProfile,
            projectInstructions,
          ),
        };
      },
      sql.withTransaction,
      sqlErrors,
    );

  return DevelopmentProfileService.of({
    list,
    read,
    create,
    update,
    delete: remove,
    listProjects,
    getAssignment,
    setAssignment,
    resolveEffectiveProjectInstructions,
  });
});

export const layer = Layer.effect(DevelopmentProfileService, make);
