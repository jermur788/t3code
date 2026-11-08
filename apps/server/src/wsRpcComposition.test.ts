import { assert, it } from "@effect/vitest";
import {
  AuthOrchestrationOperateScope,
  AuthOrchestrationReadScope,
  EnvironmentAuthorizationError,
  PROJECT_RUNTIME_RPC_METHODS,
  ProjectRuntimeRequestError,
  RpcScopeAuthorization,
} from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Queue from "effect/Queue";
import * as Schema from "effect/Schema";
import { RpcGroup, RpcServer } from "effect/rpc";
import type { FromServerEncoded } from "effect/rpc/RpcMessage";

import * as RpcAuthorization from "./auth/RpcAuthorization.ts";
import { RpcInstrumentation } from "./observability/RpcInstrumentation.ts";
import { makeServerWsRpcGroup, WS_RPC_SERVER_OPTIONS } from "./ws.ts";

const methods = [PROJECT_RUNTIME_RPC_METHODS.createTask, PROJECT_RUNTIME_RPC_METHODS.updateTask];
const encodeAuthorizationError = Schema.encodeSync(
  Schema.toCodecJson(EnvironmentAuthorizationError),
);

it.effect.each(methods)(
  "preserves composed task-write middleware and wire decoding for %s",
  (method) =>
    Effect.gen(function* () {
      const composed = makeServerWsRpcGroup();
      const group = RpcGroup.make(
        ...Array.from(composed.requests.values()).filter(
          (rpc) =>
            rpc._tag === PROJECT_RUNTIME_RPC_METHODS.createTask ||
            rpc._tag === PROJECT_RUNTIME_RPC_METHODS.updateTask,
        ),
      );
      for (const authorized of [false, true]) {
        const calls: Array<string> = [];
        const responses = yield* Queue.unbounded<FromServerEncoded>();
        const disconnects = yield* Queue.unbounded<number>();
        const continuation = { version: 1, mode: "invalid-composition-probe" };
        const protocol = yield* RpcServer.Protocol.make((write) =>
          Effect.gen(function* () {
            yield* write(0, {
              _tag: "Request",
              id: "1",
              tag: method,
              headers: [],
              payload: {
                projectId: "composition-project",
                taskId: "composition-task",
                expectedRevision: 1,
                title: "Composition probe",
                scope: "Composition probe",
                acceptanceCriteria: [],
                continuation,
              },
            });
            return {
              disconnects,
              send: (_id, response) => Queue.offer(responses, response).pipe(Effect.asVoid),
              end: () => Effect.void,
              clientIds: Effect.succeed(new Set([0])),
              initialMessage: Effect.succeedNone,
              supportsAck: false,
              supportsTransferables: false,
              supportsSpanPropagation: false,
              supportsNotifications: false,
              codecFor: Schema.toCodecJson,
            };
          }),
        );
        const handle = (payload: { readonly continuation?: unknown }) =>
          Effect.gen(function* () {
            calls.push("handler");
            assert.deepEqual(payload.continuation, continuation);
            return yield* new ProjectRuntimeRequestError({ reason: "invalid_request" });
          });
        yield* RpcServer.make(group, WS_RPC_SERVER_OPTIONS).pipe(
          Effect.provide(
            Layer.mergeAll(
              group.toLayer({
                [PROJECT_RUNTIME_RPC_METHODS.createTask]: handle,
                [PROJECT_RUNTIME_RPC_METHODS.updateTask]: handle,
              }),
              RpcAuthorization.layer(
                authorized
                  ? [AuthOrchestrationReadScope, AuthOrchestrationOperateScope]
                  : [AuthOrchestrationReadScope],
              ),
              Layer.succeed(RpcInstrumentation)((effect, { rpc }) =>
                Effect.gen(function* () {
                  calls.push(`instrumentation:${rpc._tag}`);
                  return yield* effect;
                }),
              ),
            ),
          ),
          Effect.provideService(RpcServer.Protocol, protocol),
          Effect.forkScoped,
        );
        const response = yield* Queue.take(responses);
        assert.deepEqual(response, {
          _tag: "Exit",
          requestId: "1",
          exit: {
            _tag: "Failure",
            cause: [
              {
                _tag: "Fail",
                error: authorized
                  ? { _tag: "ProjectRuntimeRequestError", reason: "invalid_request" }
                  : encodeAuthorizationError(
                      RpcAuthorization.rpcAuthorizationError(AuthOrchestrationOperateScope),
                    ),
              },
            ],
          },
        });
        assert.deepEqual(
          calls,
          authorized ? [`instrumentation:${method}`, "handler"] : [`instrumentation:${method}`],
        );
      }
      const rpc = composed.requests.get(method);
      assert(rpc !== undefined);
      assert.deepEqual(Array.from(rpc.middlewares), [RpcScopeAuthorization, RpcInstrumentation]);
    }),
);
