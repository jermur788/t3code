import {
  DEVELOPMENT_PROFILE_RPC_METHODS as M,
  DevelopmentProfileError,
  DevelopmentProfileRequestError,
  WsRpcGroup,
} from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import type * as RpcGroup from "effect/rpc/RpcGroup";
import * as DevelopmentProfileService from "./DevelopmentProfileService.ts";

const isDomainError = Schema.is(DevelopmentProfileError);
const toRpcError = (error: unknown) =>
  isDomainError(error)
    ? error
    : new DevelopmentProfileRequestError({
        reason: Schema.isSchemaError(error) ? "invalid_request" : "server_error",
      });

export const makeHandlers = Effect.fn("DevelopmentProfileRpc.makeHandlers")(function* (
  sessionId: string,
) {
  const profiles = yield* DevelopmentProfileService.DevelopmentProfileService;
  const actor = { actor: `user:${sessionId}` };
  return {
    [M.list]: () => profiles.list().pipe(Effect.mapError(toRpcError)),
    [M.read]: ({ profileId }) => profiles.read(profileId).pipe(Effect.mapError(toRpcError)),
    [M.create]: (input) => profiles.create(input, actor).pipe(Effect.mapError(toRpcError)),
    [M.update]: (input) => profiles.update(input, actor).pipe(Effect.mapError(toRpcError)),
    [M.delete]: (input) => profiles.delete(input).pipe(Effect.mapError(toRpcError)),
    [M.listProjects]: ({ profileId }) =>
      profiles.listProjects(profileId).pipe(Effect.mapError(toRpcError)),
    [M.getAssignment]: ({ projectId }) =>
      profiles.getAssignment(projectId).pipe(Effect.mapError(toRpcError)),
    [M.setAssignment]: (input) => profiles.setAssignment(input).pipe(Effect.mapError(toRpcError)),
    [M.resolve]: ({ projectId }) =>
      profiles.resolveEffectiveProjectInstructions(projectId).pipe(Effect.mapError(toRpcError)),
  } satisfies Partial<RpcGroup.HandlersFrom<RpcGroup.Rpcs<typeof WsRpcGroup>>>;
});
