import {
  OrchestratorMcpFailure,
  type ProjectId,
  ProjectRuntimeError,
  type ProjectRuntimeActor,
  type ProjectRuntimeHandoff,
} from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Predicate from "effect/Predicate";
import * as Schema from "effect/Schema";

import * as ProjectRuntimeService from "../../../projectRuntime/ProjectRuntimeService.ts";
import * as ProjectRuntimeSourceAccess from "../../../projectRuntime/ProjectRuntimeSourceAccess.ts";
import { type Caller, readCaller, resolveProjectId, unavailable } from "../../threadAccess.ts";

const isRuntimeError = Schema.is(ProjectRuntimeError);
const isMcpFailure = Schema.is(OrchestratorMcpFailure);

/**
 * Domain errors reach the agent as the tagged error itself. A project that is missing or input
 * the contracts reject become ordinary invalid requests; everything else (SQL, search index,
 * filesystem) is reported generically so no internal path, query, or cause leaks.
 */
const runtimeFailure = (error: unknown): ProjectRuntimeError | OrchestratorMcpFailure => {
  if (isRuntimeError(error) || isMcpFailure(error)) return error;
  if (Predicate.isTagged(error, "ProjectNotFoundError"))
    return new OrchestratorMcpFailure({
      code: "invalid_request",
      message: "The project was not found.",
    });
  if (Schema.isSchemaError(error))
    return new OrchestratorMcpFailure({
      code: "invalid_request",
      message: "The input is not valid for Project Runtime.",
    });
  return unavailable();
};

/**
 * Unlike `resolveProjectId`, which lets a thread aim other project tools at any project, a
 * thread's agent acts only on its own project's Runtime. Record IDs are then looked up inside that
 * project by the services, so an ID from another project is simply not found.
 */
const resolveRuntimeProjectId = (context: Caller, requested: ProjectId | undefined) =>
  context.caller !== undefined && requested !== undefined && requested !== context.caller.projectId
    ? Effect.fail(
        new OrchestratorMcpFailure({
          code: "capability_denied",
          message:
            "An agent in a T3 thread can use Project Runtime only for its own project. Omit projectId.",
        }),
      )
    : resolveProjectId(context, requested);

export const runtimeRead = Effect.fn("mcp.projectRuntime.read")(function* <A, E, R>(
  requested: ProjectId | undefined,
  use: (projectId: ProjectId) => Effect.Effect<A, E, R>,
) {
  const context = yield* readCaller();
  const projectId = yield* resolveRuntimeProjectId(context, requested);
  return yield* use(projectId).pipe(Effect.mapError(runtimeFailure));
});

/** `check` is the write access check McpToolAccess hands the handler; it runs again just before the write. */
export const runtimeWrite = Effect.fn("mcp.projectRuntime.write")(function* <A, E, R, CheckR>(
  requested: ProjectId | undefined,
  check: Effect.Effect<Caller, OrchestratorMcpFailure, CheckR>,
  use: (projectId: ProjectId, context: Caller) => Effect.Effect<A, E, R>,
) {
  const context = yield* check;
  const projectId = yield* resolveRuntimeProjectId(context, requested);
  return yield* use(projectId, context).pipe(Effect.mapError(runtimeFailure));
});

export const withRuntime = <A, E, R>(
  use: (runtime: ProjectRuntimeService.ProjectRuntimeService["Service"]) => Effect.Effect<A, E, R>,
) => Effect.flatMap(ProjectRuntimeService.ProjectRuntimeService, use);

export const withSources = <A, E, R>(
  use: (
    sources: ProjectRuntimeSourceAccess.ProjectRuntimeSourceAccess["Service"],
  ) => Effect.Effect<A, E, R>,
) => Effect.flatMap(ProjectRuntimeSourceAccess.ProjectRuntimeSourceAccess, use);

/** Stands in for a caller that is neither a T3 thread nor an identifiable MCP client session. */
const EXTERNAL_MCP_ACTOR = "mcp:external";

type HandoffProvenance = Pick<ProjectRuntimeHandoff, "threadId" | "providerInstanceId" | "model">;

/**
 * Runtime records are attributed from the invocation, never from tool input. A thread's agent
 * carries its thread and provider instance, plus the thread's model while that still belongs to the
 * provider instance holding the credential; a client session carries only its session. Provider
 * and model are provenance, not authority.
 */
export const provenanceOf = (
  context: Caller,
): { readonly actor: ProjectRuntimeActor } & HandoffProvenance => {
  const { thread, client } = context.scope;
  if (thread === undefined) {
    return { actor: client === undefined ? EXTERNAL_MCP_ACTOR : `mcp-client:${client.sessionId}` };
  }
  const selection = context.caller?.modelSelection;
  return {
    actor: `thread:${thread.threadId}`,
    threadId: thread.threadId,
    providerInstanceId: thread.providerInstanceId,
    ...(selection?.instanceId === thread.providerInstanceId ? { model: selection.model } : {}),
  };
};
