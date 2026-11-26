// Use an IPv4-only listener to exercise the real loopback boundary.
// @effect-diagnostics nodeBuiltinImport:off
import { createServer } from "node:http";
import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import {
  AuthAccessWriteScope,
  AuthSessionId,
  CommandId,
  NodeId,
  ProviderInstanceId,
  RunId,
  ThreadId,
} from "@t3tools/contracts";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";
import * as SqlClient from "effect/sql/SqlClient";
import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
  HttpRouter,
  HttpServer,
} from "effect/http";
import {
  EnvironmentAuth,
  INTERNAL_ADMINISTRATIVE_BOOTSTRAP_SUBJECT,
  ServerAuthMissingCredentialError,
} from "../auth/EnvironmentAuth.ts";
import { ServerConfig } from "../config.ts";
import * as SqlitePersistence from "../persistence/Sqlite.ts";
import * as OwnerGrant from "./OwnerConfirmationGrant.ts";
import * as OwnerHttp from "./OwnerConfirmationHttp.ts";
import { ThreadManagementService } from "./ThreadManagementService.ts";

it("limits the card to a direct loopback browser and refuses cross-origin submissions", () => {
  const port = 3777;
  const host = `127.0.0.1:${port}`;
  const valid = {
    address: "127.0.0.1",
    host,
    origin: `http://${host}`,
    method: "POST",
    authorization: undefined,
  };
  assert.isTrue(OwnerHttp.isLocalOwnerRequest(valid, port));
  for (const invalid of [
    { address: "192.0.2.1" },
    { host: "example.org" },
    { origin: "http://127.0.0.1:3778" },
    { origin: undefined },
    { forwarded: "for=127.0.0.1" },
    { authorization: "Bearer synthetic" },
  ]) {
    assert.isFalse(OwnerHttp.isLocalOwnerRequest({ ...valid, ...invalid }, port));
  }
});

it.live(
  "demonstrates a one-use owner form and harmless scratch IO through the isolated approval boundary",
  () =>
    Effect.gen(function* () {
      const config = yield* ServerConfig;
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const sql = yield* SqlClient.SqlClient;
      const root = path.join(yield* fs.realPath(yield* fs.makeTempDirectoryScoped()), "scratch<&>");
      yield* fs.makeDirectory(root);
      const inputPath = path.join(root, "input.txt");
      const outputPath = path.join(root, "output.txt");
      yield* fs.writeFileString(inputPath, "synthetic scratch\n");
      const confirmation = yield* OwnerGrant.make(root);
      const parentThreadId = ThreadId.make("fixture-parent");
      const childThreadId = ThreadId.make("fixture-child");
      const childRunId = RunId.make("fixture-child-run");
      const layerAuth = Layer.mock(EnvironmentAuth)({
        authenticateHttpRequest: (request) => {
          if (request.cookies.fixture === undefined)
            return Effect.fail(new ServerAuthMissingCredentialError({}));
          return Effect.succeed({
            sessionId: AuthSessionId.make(request.cookies.fixture),
            subject:
              request.cookies.fixture === "mcp"
                ? "mcp-client"
                : INTERNAL_ADMINISTRATIVE_BOOTSTRAP_SUBJECT,
            scopes: [AuthAccessWriteScope],
            method: "browser-session-cookie",
          });
        },
      });
      const layerDispatch = Layer.mock(ThreadManagementService)({
        dispatch: (command) =>
          Effect.gen(function* () {
            if (command.type !== "delegated_task.request")
              return yield* Effect.die("unexpected command");
            assert.equal(command.createdBy, "agent");
            assert.equal(command.creationSource, "mcp");
            const claim = yield* OwnerGrant.requestAuthority(command);
            yield* sql.withTransaction(
              confirmation.consume(claim, root, {
                taskId: NodeId.make("fixture-task"),
                threadId: childThreadId,
                runId: childRunId,
              }),
            );
            yield* confirmation.permitStart({
              threadId: childThreadId,
              runId: childRunId,
              cwd: root,
              providerInstanceId: "devReplay",
              runtimeMode: "approval-required",
            });
            // Deliberately synthetic, with no provider, shell, or external files.
            yield* fs.writeFileString(outputPath, yield* fs.readFileString(inputPath));
            return { sequence: 1, storedEvents: [] };
          }).pipe(Effect.orDie),
      });
      const layerServer = OwnerHttp.layer.pipe(
        Layer.provide(layerAuth),
        Layer.provide(layerDispatch),
        Layer.provide(
          Layer.succeed(OwnerGrant.OwnerConfirmation, { enabled: true, service: confirmation }),
        ),
        Layer.provide(
          Layer.effect(
            ServerConfig,
            Effect.gen(function* () {
              const { address } = yield* HttpServer.HttpServer;
              if (address._tag !== "InetAddressV4")
                return yield* Effect.die("expected a loopback listener");
              return { ...config, port: address.port };
            }),
          ),
        ),
      );
      const server = yield* Layer.build(
        HttpRouter.serve(layerServer, { disableListenLog: true, disableLogger: true }).pipe(
          Layer.provideMerge(NodeHttpServer.layer(createServer, { host: "127.0.0.1", port: 0 })),
        ),
      );
      const { address } = Context.get(server, HttpServer.HttpServer);
      if (address._tag !== "InetAddressV4")
        return yield* Effect.die("expected a loopback listener");
      const origin = `http://127.0.0.1:${address.port}`;
      const endpoint = origin + OwnerGrant.cardPath;
      const request = (input: HttpClientRequest.HttpClientRequest) =>
        HttpClient.execute(input).pipe(
          Effect.provideService(FetchHttpClient.RequestInit, { redirect: "manual" }),
        );
      const status = (input: HttpClientRequest.HttpClientRequest) =>
        request(input).pipe(Effect.map((response) => response.status));
      const session = { cookie: "fixture=owner" };
      const ownerGet = HttpClientRequest.get(endpoint, { headers: session });
      assert.equal(yield* status(HttpClientRequest.get(endpoint)), 403);
      assert.equal(
        yield* status(HttpClientRequest.get(endpoint, { headers: { cookie: "fixture=mcp" } })),
        403,
      );
      assert.equal(yield* status(ownerGet), 200);
      const id = yield* confirmation.submit({
        cwd: root,
        roots: [root],
        operations: ["read", "write"],
        command: {
          type: "delegated_task.request",
          commandId: CommandId.make("fixture-command"),
          parentThreadId,
          parentRunId: RunId.make("fixture-parent-run"),
          parentNodeId: NodeId.make("fixture-parent-node"),
          task: "Copy a synthetic scratch file.",
          modelSelection: { instanceId: ProviderInstanceId.make("devReplay"), model: "replay" },
          runtimeMode: "approval-required",
          interactionMode: "default",
          createdBy: "agent",
          creationSource: "mcp",
        },
      });
      assert.isFalse(yield* fs.exists(outputPath));
      const response = yield* request(ownerGet);
      const html = yield* response.text;
      assert.include(html, id);
      assert.include(html, "scratch&lt;&amp;&gt;");
      assert.include(html, "read, write");
      assert.equal(response.headers["cache-control"], "no-store");
      const nonce = html.match(/name="nonce" value="([^"]+)"/u)?.[1];
      assert.isDefined(nonce);
      const submit = (action: "confirm" | "revoke", site: string, cookie: string) =>
        status(
          HttpClientRequest.post(endpoint, { headers: { origin: site, cookie } }).pipe(
            HttpClientRequest.bodyUrlParams({ id, nonce, action }),
          ),
        );
      assert.equal(yield* submit("confirm", "http://127.0.0.1:1", session.cookie), 404);
      assert.equal(yield* submit("confirm", origin, "fixture=other"), 409);
      assert.isFalse(yield* fs.exists(outputPath));
      assert.equal(yield* submit("confirm", origin, session.cookie), 303);
      assert.equal(yield* fs.readFileString(outputPath), "synthetic scratch\n");
      assert.equal(yield* submit("confirm", origin, session.cookie), 409);
      assert.equal(yield* submit("revoke", origin, session.cookie), 303);
      assert.equal(
        (yield* Effect.flip(
          confirmation.permitStart({
            threadId: childThreadId,
            runId: childRunId,
            cwd: root,
            providerInstanceId: "devReplay",
            runtimeMode: "approval-required",
          }),
        ))._tag,
        "OwnerConfirmationDenied",
      );
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          NodeServices.layer,
          FetchHttpClient.layer,
          SqlitePersistence.layerMemory,
          ServerConfig.layerTest(process.cwd(), { prefix: "t3-owner-http-" }).pipe(
            Layer.provide(NodeServices.layer),
          ),
        ),
      ),
    ),
);
