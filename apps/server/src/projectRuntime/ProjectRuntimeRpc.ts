import {
  PROJECT_RUNTIME_RPC_METHODS,
  ProjectRuntimeError,
  ProjectRuntimeRequestError,
  RuntimeRoutingError,
  RuntimeExecutionError,
} from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as Predicate from "effect/Predicate";
import type { RpcGroup } from "effect/rpc";
import { WsRpcGroup } from "@t3tools/contracts";
import * as ProjectRuntimeService from "./ProjectRuntimeService.ts";
import * as ProjectRuntimeSourceAccess from "./ProjectRuntimeSourceAccess.ts";
import * as RuntimeRoutingService from "../runtimeRouting/RuntimeRoutingService.ts";
import * as RuntimeTaskExecutionService from "./RuntimeTaskExecutionService.ts";

const isRuntimeError = Schema.is(ProjectRuntimeError);
const isRuntimeRoutingError = Schema.is(RuntimeRoutingError);
const isRuntimeExecutionError = Schema.is(RuntimeExecutionError);
const toRpcError = (error: unknown) =>
  isRuntimeError(error) || isRuntimeRoutingError(error) || isRuntimeExecutionError(error)
    ? error
    : new ProjectRuntimeRequestError({
        reason: Predicate.isTagged(error, "ProjectNotFoundError")
          ? "not_found"
          : Schema.isSchemaError(error)
            ? "invalid_request"
            : "server_error",
      });

export const makeHandlers = Effect.fn("ProjectRuntimeRpc.makeHandlers")(function* (
  sessionId: string,
) {
  const runtime = yield* ProjectRuntimeService.ProjectRuntimeService;
  const sources = yield* ProjectRuntimeSourceAccess.ProjectRuntimeSourceAccess;
  const routing = yield* RuntimeRoutingService.RuntimeRoutingService;
  const execution = yield* RuntimeTaskExecutionService.RuntimeTaskExecutionService;
  const actor = { actor: `user:${sessionId}` };
  return {
    [PROJECT_RUNTIME_RPC_METHODS.status]: ({ projectId }) =>
      runtime.getStatus(projectId).pipe(Effect.mapError(toRpcError)),
    [PROJECT_RUNTIME_RPC_METHODS.setEnabled]: ({ projectId, ...input }) =>
      runtime.setEnabled(projectId, input).pipe(Effect.mapError(toRpcError)),
    [PROJECT_RUNTIME_RPC_METHODS.readInstructions]: ({ projectId }) =>
      runtime.readInstructions(projectId).pipe(Effect.mapError(toRpcError)),
    [PROJECT_RUNTIME_RPC_METHODS.saveInstructions]: ({ projectId, ...input }) =>
      runtime.saveInstructions(projectId, input, actor).pipe(Effect.mapError(toRpcError)),
    [PROJECT_RUNTIME_RPC_METHODS.listSources]: ({ projectId, ...input }) =>
      sources.list(projectId, input).pipe(Effect.mapError(toRpcError)),
    [PROJECT_RUNTIME_RPC_METHODS.createSource]: ({ projectId, ...input }) =>
      runtime.createSource(projectId, input, actor).pipe(Effect.mapError(toRpcError)),
    [PROJECT_RUNTIME_RPC_METHODS.updateSource]: ({ projectId, ...input }) =>
      runtime.updateSource(projectId, input, actor).pipe(Effect.mapError(toRpcError)),
    [PROJECT_RUNTIME_RPC_METHODS.removeSource]: ({ projectId, ...input }) =>
      runtime.removeSource(projectId, input).pipe(Effect.mapError(toRpcError)),
    [PROJECT_RUNTIME_RPC_METHODS.listTasks]: ({ projectId, ...input }) =>
      runtime.listTasks(projectId, input).pipe(Effect.mapError(toRpcError)),
    [PROJECT_RUNTIME_RPC_METHODS.readTask]: ({ projectId, ...input }) =>
      runtime.readTask(projectId, input.taskId).pipe(Effect.mapError(toRpcError)),
    [PROJECT_RUNTIME_RPC_METHODS.createTask]: ({ projectId, ...input }) =>
      runtime.createTask(projectId, input, actor).pipe(Effect.mapError(toRpcError)),
    [PROJECT_RUNTIME_RPC_METHODS.updateTask]: ({ projectId, ...input }) =>
      runtime.updateTask(projectId, input, actor).pipe(Effect.mapError(toRpcError)),
    [PROJECT_RUNTIME_RPC_METHODS.listHandoffs]: ({ projectId, ...input }) =>
      runtime.listHandoffs(projectId, input).pipe(Effect.mapError(toRpcError)),
    [PROJECT_RUNTIME_RPC_METHODS.readHandoff]: ({ projectId, ...input }) =>
      runtime.readHandoff(projectId, input.handoffId).pipe(Effect.mapError(toRpcError)),
    [PROJECT_RUNTIME_RPC_METHODS.readRouting]: ({ projectId }) =>
      routing.readProjectRouting(projectId).pipe(Effect.mapError(toRpcError)),
    [PROJECT_RUNTIME_RPC_METHODS.saveRouting]: ({ projectId, ...input }) =>
      routing.saveProjectRouting(projectId, input).pipe(Effect.mapError(toRpcError)),
    [PROJECT_RUNTIME_RPC_METHODS.resolveRoute]: (input) =>
      routing.resolveRoute(input).pipe(Effect.mapError(toRpcError)),
    [PROJECT_RUNTIME_RPC_METHODS.executeTask]: ({ projectId, ...input }) =>
      execution.execute(projectId, input).pipe(Effect.mapError(toRpcError)),
    [PROJECT_RUNTIME_RPC_METHODS.listExecutionAttempts]: ({ projectId, ...input }) =>
      execution.listAttempts(projectId, input).pipe(Effect.mapError(toRpcError)),
    [PROJECT_RUNTIME_RPC_METHODS.readExecutionAttempt]: ({ projectId, ...input }) =>
      execution.readAttempt(projectId, input.attemptId).pipe(Effect.mapError(toRpcError)),
  } satisfies Partial<RpcGroup.HandlersFrom<RpcGroup.Rpcs<typeof WsRpcGroup>>>;
});
