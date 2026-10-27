import {
  DevelopmentProfile,
  ProjectDevelopmentProfile,
  ProjectId,
  ProjectRuntimeNotFoundError,
  ProjectRuntimeRouting,
  ProjectRuntimeRoutingConflictError,
  ProjectRuntimeRoutingSaveInput,
  ProjectRuntimeTask,
  RuntimeProfileRoutingPolicy,
  RuntimeRouteResolution,
  RuntimeRouteResolutionInput,
  RuntimeRoutingPolicy,
} from "@t3tools/contracts";
import * as Context from "effect/Context";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import * as SqlClient from "effect/sql/SqlClient";
import { type SqlError } from "effect/sql/SqlError";

import { PersistenceSqlError } from "../persistence/Errors.ts";
import { ProjectNotFoundError } from "../project/ProjectService.ts";
import { RuntimeRoutingProviderView } from "./RuntimeRoutingProviderView.ts";
import { resolveRuntimeRoute } from "./RuntimeRoutingResolver.ts";

const RoutingJson = Schema.fromJsonString(RuntimeRoutingPolicy);
const ProfileRoutingJson = Schema.fromJsonString(RuntimeProfileRoutingPolicy);
const TaskJson = Schema.fromJsonString(ProjectRuntimeTask);
const decodeTask = Schema.decodeUnknownEffect(TaskJson);
const AssignmentJson = Schema.decodeUnknownEffect(ProjectDevelopmentProfile);
const ProfileJson = Schema.decodeUnknownEffect(DevelopmentProfile);
const decodeProjectId = Schema.decodeUnknownEffect(ProjectId);
const decodeRoutingSaveInput = Schema.decodeUnknownEffect(ProjectRuntimeRoutingSaveInput);
const decodeResolutionInput = Schema.decodeUnknownEffect(RuntimeRouteResolutionInput);
const encodeRouting = Schema.encodeEffect(RoutingJson);
const decodeRouting = Schema.decodeUnknownEffect(RoutingJson);
const decodeProfileRouting = Schema.decodeUnknownEffect(ProfileRoutingJson);
const now = DateTime.now.pipe(Effect.map(DateTime.formatIso));

type ServiceError =
  | ProjectNotFoundError
  | ProjectRuntimeNotFoundError
  | ProjectRuntimeRoutingConflictError
  | PersistenceSqlError
  | Schema.SchemaError;
type Result<A> = Effect.Effect<A, ServiceError>;

type RoutingRow = {
  readonly project_id: string;
  readonly routing_json: string | null;
  readonly revision: number;
  readonly created_at: string;
  readonly updated_at: string;
};

const emptyProfileRouting = (): RuntimeProfileRoutingPolicy => ({ roleRoutes: [] });

export class RuntimeRoutingService extends Context.Service<
  RuntimeRoutingService,
  {
    /** Null means the project has no routing row; a reset row has `routing: null`. */
    readonly readProjectRouting: (projectId: ProjectId) => Result<ProjectRuntimeRouting | null>;
    readonly saveProjectRouting: (
      projectId: ProjectId,
      input: ProjectRuntimeRoutingSaveInput,
    ) => Result<ProjectRuntimeRouting>;
    readonly resolveRoute: (input: RuntimeRouteResolutionInput) => Result<RuntimeRouteResolution>;
  }
>()("t3/runtimeRouting/RuntimeRoutingService") {}

const make = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const providerView = yield* RuntimeRoutingProviderView;
  const sqlErrors = <A, R>(effect: Effect.Effect<A, ServiceError | SqlError, R>) =>
    effect.pipe(
      Effect.catchTags({
        SqlError: (cause) =>
          Effect.fail(new PersistenceSqlError({ operation: "runtimeRouting", cause })),
      }),
    );

  const requireProject = Effect.fn("RuntimeRoutingService.requireProject")(function* (
    projectId: ProjectId,
  ) {
    const rows =
      yield* sql`SELECT project_id FROM projection_projects WHERE project_id = ${projectId} AND deleted_at IS NULL`;
    if (rows.length === 0) {
      return yield* new ProjectNotFoundError({ projectId });
    }
  });

  const readRoutingRow = Effect.fn("RuntimeRoutingService.readRoutingRow")(function* (
    projectId: ProjectId,
  ) {
    const rows = yield* sql<RoutingRow>`SELECT
      project_id, routing_json, revision, created_at, updated_at
      FROM project_runtime_routing WHERE project_id = ${projectId}`;
    return rows[0] ?? null;
  });

  const toRouting = Effect.fn("RuntimeRoutingService.toRouting")(function* (row: RoutingRow) {
    return {
      projectId: ProjectId.make(row.project_id),
      routing: row.routing_json === null ? null : yield* decodeRouting(row.routing_json),
      revision: row.revision,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });

  const readProjectRouting: RuntimeRoutingService["Service"]["readProjectRouting"] = Effect.fn(
    "RuntimeRoutingService.readProjectRouting",
  )(
    function* (projectId) {
      const id = yield* decodeProjectId(projectId);
      yield* requireProject(id);
      const row = yield* readRoutingRow(id);
      return row === null ? null : yield* toRouting(row);
    },
    sql.withTransaction,
    sqlErrors,
  );

  const saveProjectRouting: RuntimeRoutingService["Service"]["saveProjectRouting"] = Effect.fn(
    "RuntimeRoutingService.saveProjectRouting",
  )(
    function* (projectId, input) {
      const id = yield* decodeProjectId(projectId);
      const data = yield* decodeRoutingSaveInput(input);
      yield* requireProject(id);
      const existing = yield* readRoutingRow(id);
      const currentRevision = existing?.revision ?? 0;
      if (data.expectedRevision !== currentRevision) {
        return yield* new ProjectRuntimeRoutingConflictError({
          projectId: id,
          expectedRevision: data.expectedRevision,
          currentRevision,
        });
      }
      const timestamp = yield* now;
      const routingJson = data.routing === null ? null : yield* encodeRouting(data.routing);
      if (existing === null) {
        const inserted = yield* sql`INSERT INTO project_runtime_routing
          (project_id, routing_json, revision, created_at, updated_at)
          VALUES (${id}, ${routingJson}, 1, ${timestamp}, ${timestamp})
          ON CONFLICT (project_id) DO NOTHING
          RETURNING project_id`;
        if (inserted.length !== 1) {
          const current = yield* readRoutingRow(id);
          return yield* new ProjectRuntimeRoutingConflictError({
            projectId: id,
            expectedRevision: data.expectedRevision,
            currentRevision: current?.revision ?? 0,
          });
        }
        return {
          projectId: id,
          routing: data.routing,
          revision: 1,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
      }
      const changed = yield* sql`UPDATE project_runtime_routing
        SET routing_json = ${routingJson}, revision = revision + 1, updated_at = ${timestamp}
        WHERE project_id = ${id} AND revision = ${data.expectedRevision}
        RETURNING project_id`;
      if (changed.length !== 1) {
        const current = yield* readRoutingRow(id);
        return yield* new ProjectRuntimeRoutingConflictError({
          projectId: id,
          expectedRevision: data.expectedRevision,
          currentRevision: current?.revision ?? 0,
        });
      }
      return {
        projectId: id,
        routing: data.routing,
        revision: existing.revision + 1,
        createdAt: existing.created_at,
        updatedAt: timestamp,
      };
    },
    sql.withTransaction,
    sqlErrors,
  );

  const readTask = Effect.fn("RuntimeRoutingService.readTask")(function* (
    projectId: ProjectId,
    taskId: NonNullable<RuntimeRouteResolutionInput["taskId"]>,
  ) {
    const rows = yield* sql<{ readonly payload_json: string }>`SELECT payload_json
      FROM project_runtime_tasks WHERE project_id = ${projectId} AND task_id = ${taskId}`;
    if (rows[0] === undefined) {
      return yield* new ProjectRuntimeNotFoundError({
        projectId,
        entity: "task",
        entityId: taskId,
      });
    }
    return yield* decodeTask(rows[0].payload_json);
  });

  const readAssignment = Effect.fn("RuntimeRoutingService.readAssignment")(function* (
    projectId: ProjectId,
  ) {
    const rows = yield* sql<{
      readonly project_id: string;
      readonly profile_id: string | null;
      readonly revision: number;
      readonly created_at: string;
      readonly updated_at: string;
    }>`SELECT project_id, profile_id, revision, created_at, updated_at
      FROM project_development_profiles WHERE project_id = ${projectId}`;
    const row = rows[0];
    return row === undefined
      ? null
      : yield* AssignmentJson({
          projectId: row.project_id,
          profileId: row.profile_id,
          revision: row.revision,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        });
  });

  const readProfile = Effect.fn("RuntimeRoutingService.readProfile")(function* (profileId: string) {
    const rows = yield* sql<{
      readonly profile_id: string;
      readonly name: string;
      readonly instructions: string;
      readonly routing_json: string | null;
      readonly revision: number;
      readonly created_at: string;
      readonly updated_at: string;
      readonly created_by: string;
      readonly updated_by: string;
    }>`SELECT profile_id, name, instructions, routing_json, revision, created_at, updated_at,
        created_by, updated_by
      FROM development_profiles WHERE profile_id = ${profileId}`;
    if (rows[0] === undefined) return null;
    const row = rows[0];
    const routing =
      row.routing_json === null
        ? emptyProfileRouting()
        : yield* decodeProfileRouting(row.routing_json);
    return yield* ProfileJson({
      profileId: row.profile_id,
      name: row.name,
      instructions: row.instructions,
      routing,
      revision: row.revision,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
    });
  });

  const resolveRoute: RuntimeRoutingService["Service"]["resolveRoute"] = Effect.fn(
    "RuntimeRoutingService.resolveRoute",
  )(
    function* (input) {
      const data = yield* decodeResolutionInput(input);
      const projectId = data.projectId;
      yield* requireProject(projectId);
      const routingRow = yield* readRoutingRow(projectId);
      const projectRouting =
        routingRow === null
          ? { routing: null, revision: 0 }
          : {
              routing:
                routingRow.routing_json === null
                  ? null
                  : yield* decodeRouting(routingRow.routing_json),
              revision: routingRow.revision,
            };
      const task = data.taskId === undefined ? null : yield* readTask(projectId, data.taskId);
      const assignment = yield* readAssignment(projectId);
      const profile =
        assignment === null || assignment.profileId === null
          ? null
          : yield* readProfile(assignment.profileId);
      const providerState = yield* providerView.read;
      return resolveRuntimeRoute({
        projectId,
        task,
        projectRouting,
        profile,
        assignment,
        ...(data.role === undefined ? {} : { role: data.role }),
        ...(data.override === undefined ? {} : { override: data.override }),
        eligibility: {
          projectId,
          providers: providerState.providers,
          orchestrationCapableInstanceIds: providerState.orchestrationCapableInstanceIds,
          settings: providerState.settings,
        },
      });
    },
    sql.withTransaction,
    sqlErrors,
  );

  return RuntimeRoutingService.of({
    readProjectRouting,
    saveProjectRouting,
    resolveRoute,
  });
});

export const layer = Layer.effect(RuntimeRoutingService, make);
