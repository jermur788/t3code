import * as Schema from "effect/Schema";
import * as Rpc from "effect/rpc/Rpc";
import { ProjectId } from "./baseSchemas.ts";
import { EnvironmentAuthorizationError } from "./auth.ts";
import {
  ProjectRuntimeError,
  ProjectRuntimeHandoff,
  ProjectRuntimeHandoffListInput,
  ProjectRuntimeHandoffListResult,
  ProjectRuntimeHandoffReadInput,
  ProjectRuntimeInstructions,
  ProjectRuntimeInstructionsSaveInput,
  ProjectRuntimeSetEnabledInput,
  ProjectRuntimeSource,
  ProjectRuntimeSourceCreateInput,
  ProjectRuntimeSourceListInput,
  ProjectRuntimeSourceListResult,
  ProjectRuntimeSourceRemoveInput,
  ProjectRuntimeSourceUpdateInput,
  ProjectRuntimeStatus,
  ProjectRuntimeTask,
  ProjectRuntimeTaskCreateInput,
  ProjectRuntimeTaskListInput,
  ProjectRuntimeTaskListResult,
  ProjectRuntimeTaskReadInput,
  ProjectRuntimeTaskUpdateInput,
} from "./projectRuntime.ts";
import {
  ProjectRuntimeRouting,
  ProjectRuntimeRoutingSaveInput,
  RuntimeRoutingError,
} from "./runtimeRouting.ts";
import { RuntimeRouteResolution, RuntimeRouteResolutionInput } from "./runtimeRoutingResolution.ts";
import {
  ExecuteProjectRuntimeTaskInput,
  ListRuntimeExecutionAttemptsInput,
  ReadRuntimeExecutionAttemptInput,
  RuntimeExecutionAttempt,
  RuntimeExecutionAttemptListResult,
  RuntimeExecutionError,
} from "./runtimeExecution.ts";

export const PROJECT_RUNTIME_RPC_METHODS = {
  status: "projectRuntime.status",
  setEnabled: "projectRuntime.setEnabled",
  readInstructions: "projectRuntime.readInstructions",
  saveInstructions: "projectRuntime.saveInstructions",
  listSources: "projectRuntime.listSources",
  createSource: "projectRuntime.createSource",
  updateSource: "projectRuntime.updateSource",
  removeSource: "projectRuntime.removeSource",
  listTasks: "projectRuntime.listTasks",
  readTask: "projectRuntime.readTask",
  createTask: "projectRuntime.createTask",
  updateTask: "projectRuntime.updateTask",
  listHandoffs: "projectRuntime.listHandoffs",
  readHandoff: "projectRuntime.readHandoff",
  readRouting: "projectRuntime.readRouting",
  saveRouting: "projectRuntime.saveRouting",
  resolveRoute: "projectRuntime.resolveRoute",
  executeTask: "projectRuntime.executeTask",
  listExecutionAttempts: "projectRuntime.listExecutionAttempts",
  readExecutionAttempt: "projectRuntime.readExecutionAttempt",
} as const;

export class ProjectRuntimeRequestError extends Schema.TaggedError<ProjectRuntimeRequestError>()(
  "ProjectRuntimeRequestError",
  { reason: Schema.Literals(["not_found", "invalid_request", "server_error"]) },
) {
  override get message(): string {
    return this.reason === "not_found"
      ? "This project is no longer available."
      : this.reason === "invalid_request"
        ? "The Runtime request is not valid."
        : "Project Runtime could not complete the request.";
  }
}
const error = Schema.Union([
  ProjectRuntimeError,
  RuntimeRoutingError,
  RuntimeExecutionError,
  ProjectRuntimeRequestError,
  EnvironmentAuthorizationError,
]);
export const PROJECT_RUNTIME_RPCS = [
  Rpc.make(PROJECT_RUNTIME_RPC_METHODS.status, {
    payload: Schema.Struct({ projectId: ProjectId }),
    success: ProjectRuntimeStatus,
    error,
  }),
  Rpc.make(PROJECT_RUNTIME_RPC_METHODS.setEnabled, {
    payload: Schema.Struct({ projectId: ProjectId, ...ProjectRuntimeSetEnabledInput.fields }),
    success: ProjectRuntimeStatus,
    error,
  }),
  Rpc.make(PROJECT_RUNTIME_RPC_METHODS.readInstructions, {
    payload: Schema.Struct({ projectId: ProjectId }),
    success: Schema.NullOr(ProjectRuntimeInstructions),
    error,
  }),
  Rpc.make(PROJECT_RUNTIME_RPC_METHODS.saveInstructions, {
    payload: Schema.Struct({ projectId: ProjectId, ...ProjectRuntimeInstructionsSaveInput.fields }),
    success: ProjectRuntimeInstructions,
    error,
  }),
  Rpc.make(PROJECT_RUNTIME_RPC_METHODS.listSources, {
    payload: Schema.Struct({ projectId: ProjectId, ...ProjectRuntimeSourceListInput.fields }),
    success: ProjectRuntimeSourceListResult,
    error,
  }),
  Rpc.make(PROJECT_RUNTIME_RPC_METHODS.createSource, {
    payload: Schema.Struct({ projectId: ProjectId, ...ProjectRuntimeSourceCreateInput.fields }),
    success: ProjectRuntimeSource,
    error,
  }),
  Rpc.make(PROJECT_RUNTIME_RPC_METHODS.updateSource, {
    payload: Schema.Struct({ projectId: ProjectId, ...ProjectRuntimeSourceUpdateInput.fields }),
    success: ProjectRuntimeSource,
    error,
  }),
  Rpc.make(PROJECT_RUNTIME_RPC_METHODS.removeSource, {
    payload: Schema.Struct({ projectId: ProjectId, ...ProjectRuntimeSourceRemoveInput.fields }),
    success: Schema.Void,
    error,
  }),
  Rpc.make(PROJECT_RUNTIME_RPC_METHODS.listTasks, {
    payload: Schema.Struct({ projectId: ProjectId, ...ProjectRuntimeTaskListInput.fields }),
    success: ProjectRuntimeTaskListResult,
    error,
  }),
  Rpc.make(PROJECT_RUNTIME_RPC_METHODS.readTask, {
    payload: Schema.Struct({ projectId: ProjectId, ...ProjectRuntimeTaskReadInput.fields }),
    success: ProjectRuntimeTask,
    error,
  }),
  Rpc.make(PROJECT_RUNTIME_RPC_METHODS.createTask, {
    payload: Schema.Struct({ projectId: ProjectId, ...ProjectRuntimeTaskCreateInput.fields }),
    success: ProjectRuntimeTask,
    error,
  }),
  Rpc.make(PROJECT_RUNTIME_RPC_METHODS.updateTask, {
    payload: Schema.Struct({ projectId: ProjectId, ...ProjectRuntimeTaskUpdateInput.fields }),
    success: ProjectRuntimeTask,
    error,
  }),
  Rpc.make(PROJECT_RUNTIME_RPC_METHODS.listHandoffs, {
    payload: Schema.Struct({ projectId: ProjectId, ...ProjectRuntimeHandoffListInput.fields }),
    success: ProjectRuntimeHandoffListResult,
    error,
  }),
  Rpc.make(PROJECT_RUNTIME_RPC_METHODS.readHandoff, {
    payload: Schema.Struct({ projectId: ProjectId, ...ProjectRuntimeHandoffReadInput.fields }),
    success: ProjectRuntimeHandoff,
    error,
  }),
  Rpc.make(PROJECT_RUNTIME_RPC_METHODS.readRouting, {
    payload: Schema.Struct({ projectId: ProjectId }),
    success: Schema.NullOr(ProjectRuntimeRouting),
    error,
  }),
  Rpc.make(PROJECT_RUNTIME_RPC_METHODS.saveRouting, {
    payload: Schema.Struct({ projectId: ProjectId, ...ProjectRuntimeRoutingSaveInput.fields }),
    success: ProjectRuntimeRouting,
    error,
  }),
  Rpc.make(PROJECT_RUNTIME_RPC_METHODS.resolveRoute, {
    payload: RuntimeRouteResolutionInput,
    success: RuntimeRouteResolution,
    error,
  }),
  Rpc.make(PROJECT_RUNTIME_RPC_METHODS.executeTask, {
    payload: Schema.Struct({ projectId: ProjectId, ...ExecuteProjectRuntimeTaskInput.fields }),
    success: RuntimeExecutionAttempt,
    error,
  }),
  Rpc.make(PROJECT_RUNTIME_RPC_METHODS.listExecutionAttempts, {
    payload: Schema.Struct({
      projectId: ProjectId,
      ...ListRuntimeExecutionAttemptsInput.fields,
    }),
    success: RuntimeExecutionAttemptListResult,
    error,
  }),
  Rpc.make(PROJECT_RUNTIME_RPC_METHODS.readExecutionAttempt, {
    payload: Schema.Struct({ projectId: ProjectId, ...ReadRuntimeExecutionAttemptInput.fields }),
    success: RuntimeExecutionAttempt,
    error,
  }),
] as const;
