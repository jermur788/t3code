import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import {
  AuthAccessWriteScope,
  AuthSessionId,
  CommandId,
  NodeId,
  ProviderDriverKind,
  ProviderInstanceId,
  type ServerSettings,
  RunId,
  ThreadId,
  type OrchestrationV2Command,
} from "@t3tools/contracts";
import * as ConfigProvider from "effect/ConfigProvider";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as SqlClient from "effect/sql/SqlClient";
import * as Schema from "effect/Schema";
import * as TestClock from "effect/testing/TestClock";
import * as Layer from "effect/Layer";
import { INTERNAL_ADMINISTRATIVE_BOOTSTRAP_SUBJECT } from "../auth/EnvironmentAuth.ts";
import { ServerConfig } from "../config.ts";
import * as SqlitePersistence from "../persistence/Sqlite.ts";
import * as OwnerGrant from "./OwnerConfirmationGrant.ts";

const command = {
  type: "delegated_task.request",
  commandId: CommandId.make("synthetic-delegation"),
  parentThreadId: ThreadId.make("synthetic-parent"),
  parentRunId: RunId.make("synthetic-parent-run"),
  parentNodeId: NodeId.make("synthetic-parent-node"),
  modelSelection: { instanceId: ProviderInstanceId.make("devReplay"), model: "replay" },
  runtimeMode: "approval-required",
  interactionMode: "default",
  task: "Synthetic test prompt",
  createdBy: "agent",
  creationSource: "mcp",
} as const satisfies Extract<OrchestrationV2Command, { type: "delegated_task.request" }>;
const binding = {
  taskId: NodeId.make("synthetic-task"),
  threadId: ThreadId.make("synthetic-child"),
  runId: RunId.make("synthetic-child-run"),
};
const owner = "fixture-owner";
const layer = Layer.mergeAll(SqlitePersistence.layerMemory, NodeServices.layer);

const fixture = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const temp = yield* fs.realPath(yield* fs.makeTempDirectoryScoped());
  const root = path.join(temp, "scratch<&>");
  yield* fs.makeDirectory(root);
  const confirmation = yield* OwnerGrant.make(root);
  const submission = { command, cwd: root, roots: [root], operations: ["write", "read"] };
  const request = Effect.gen(function* () {
    yield* confirmation.cards(owner);
    return yield* confirmation.submit(submission);
  });
  const card = Effect.gen(function* () {
    const [card] = yield* confirmation.cards(owner);
    assert.isDefined(card);
    return card;
  });
  const dispatch = (
    candidate: typeof command | Extract<OrchestrationV2Command, { type: "delegated_task.request" }>,
  ) =>
    sql.withTransaction(
      Effect.gen(function* () {
        const claim = yield* OwnerGrant.requestAuthority(candidate);
        yield* confirmation.consume(claim, root, binding);
        yield* sql`INSERT INTO demo_child (thread_id) VALUES (${binding.threadId})`;
      }),
    );
  yield* sql`CREATE TABLE demo_child (thread_id TEXT PRIMARY KEY)`;
  return { sql, fs, path, temp, root, confirmation, submission, card, request, dispatch };
});

it.effect(
  "binds once after the displayed scope is confirmed and consumes in the child transaction",
  () =>
    Effect.gen(function* () {
      const f = yield* fixture;
      yield* f.request;
      const card = yield* f.card;
      assert.deepEqual(card.operations, ["read", "write"]);
      assert.equal(card.root, f.root);
      assert.equal((yield* f.sql`SELECT * FROM demo_child`).length, 0);
      const forged = yield* Effect.flip(f.dispatch({ ...command }));
      assert.equal(forged._tag, "OwnerConfirmationDenied");
      const decide = f.confirmation.decision(owner, card.id, card.nonce, "confirm", f.dispatch);
      const outcomes = yield* Effect.all([Effect.result(decide), Effect.result(decide)], {
        concurrency: 2,
      });
      assert.equal(outcomes.filter((result) => result._tag === "Success").length, 1);
      assert.equal((yield* f.sql`SELECT * FROM demo_child`).length, 1);
      assert.equal((yield* f.card).childThreadId, binding.threadId);
      const start = f.confirmation.withRuntimeAccess(
        {
          threadId: binding.threadId,
          runId: binding.runId,
          runtimeMode: "approval-required",
          providerInstanceId: "devReplay",
          cwd: f.root,
        },
        "deliver",
        Effect.void,
      );
      yield* start;
      assert.equal((yield* Effect.flip(start))._tag, "OwnerConfirmationDenied");
      const rows = yield* f.sql<{
        event: string;
      }>`SELECT event FROM prototype_owner_confirmation_audit ORDER BY sequence`;
      for (const event of [
        "requested",
        "scope_displayed",
        "owner_confirmed",
        "grant_issued",
        "grant_consumed_and_child_bound",
        "provider_start_authorized",
        "denied",
      ]) {
        assert.include(
          rows.map((row) => row.event),
          event,
        );
      }
      const state = yield* f.sql`SELECT * FROM prototype_owner_confirmation`;
      const audit = yield* Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown))({
        state,
        rows,
      });
      assert.notInclude(audit, command.task);
      assert.notInclude(audit, owner);
      assert.notInclude(audit, card.nonce);
    }).pipe(Effect.provide(layer)),
);

it.effect(
  "rejects a changed command, a wrong session or nonce, and rolls back a failed child write",
  () =>
    Effect.gen(function* () {
      const f = yield* fixture;
      yield* f.request;
      const card = yield* f.card;
      for (const [principal, nonce] of [
        ["other-browser", card.nonce],
        [owner, "invalid-nonce"],
      ] as const) {
        assert.equal(
          (yield* Effect.flip(
            f.confirmation.decision(principal, card.id, nonce, "confirm", f.dispatch),
          ))._tag,
          "OwnerConfirmationDenied",
        );
      }
      assert.equal((yield* f.card).status, "pending");
      yield* Effect.flip(
        f.confirmation.decision(owner, card.id, card.nonce, "confirm", (candidate) =>
          Effect.gen(function* () {
            assert.equal(
              (yield* Effect.flip(OwnerGrant.requestAuthority({ ...candidate, task: "changed" })))
                ._tag,
              "OwnerConfirmationDenied",
            );
            return yield* f.sql.withTransaction(
              Effect.gen(function* () {
                const claim = yield* OwnerGrant.requestAuthority(candidate);
                yield* f.confirmation.consume(claim, f.root, binding);
                return yield* Effect.fail("synthetic child commit failure");
              }),
            );
          }),
        ),
      );
      assert.isFalse(yield* f.confirmation.isBound(binding.threadId));
      assert.equal((yield* f.sql`SELECT * FROM demo_child`).length, 0);
      const rows = yield* f.sql<{ state: string }>`SELECT state FROM prototype_owner_confirmation`;
      assert.deepEqual(
        rows.map((row) => row.state),
        ["denied"],
      );
    }).pipe(Effect.provide(layer)),
);

it.effect("denies missing, changed, aliased or unsupported declarations", () =>
  Effect.gen(function* () {
    const f = yield* fixture;
    yield* f.confirmation.cards(owner);
    const alias = f.path.join(f.temp, "alias");
    yield* f.fs.symlink(f.root, alias);
    for (const input of [
      { roots: undefined },
      { roots: [f.root, f.root] },
      { roots: [`${f.root}/../scratch<&>`] },
      { roots: [alias], cwd: alias },
      { roots: [`${f.root}2`], cwd: `${f.root}2` },
      { operations: undefined },
      { operations: ["write", "write"] },
      { operations: ["execute"] },
      {
        command: {
          ...command,
          modelSelection: { instanceId: ProviderInstanceId.make("codex"), model: "gpt-6.2-sol" },
        },
      },
      { command: { ...command, runtimeMode: "full-access" } as const },
    ]) {
      assert.equal(
        (yield* Effect.flip(f.confirmation.submit({ ...f.submission, ...input })))._tag,
        "OwnerConfirmationDenied",
      );
    }
    assert.equal((yield* f.confirmation.cards(owner)).length, 0);
  }).pipe(Effect.provide(layer)),
);

it.effect("denies dispatch if the confirmed directory was replaced before consumption", () =>
  Effect.gen(function* () {
    const f = yield* fixture;
    yield* f.request;
    const card = yield* f.card;
    yield* f.fs.rename(f.root, f.path.join(f.temp, "prior-root"));
    yield* f.fs.makeDirectory(f.root);
    assert.equal(
      (yield* Effect.flip(
        f.confirmation.decision(owner, card.id, card.nonce, "confirm", f.dispatch),
      ))._tag,
      "OwnerConfirmationDenied",
    );
    assert.equal((yield* f.sql`SELECT * FROM demo_child`).length, 0);
  }).pipe(Effect.provide(layer)),
);

it.effect("denies an expired request and a concurrently revoked grant before commit", () =>
  Effect.gen(function* () {
    const f = yield* fixture;
    yield* f.request;
    const expired = yield* f.card;
    yield* TestClock.adjust(OwnerGrant.ttlMs);
    assert.equal(
      (yield* Effect.flip(
        f.confirmation.decision(owner, expired.id, expired.nonce, "confirm", f.dispatch),
      ))._tag,
      "OwnerConfirmationDenied",
    );
    yield* f.confirmation.submit({
      ...f.submission,
      command: { ...command, commandId: CommandId.make("second") },
    });
    const card = yield* f.card;
    const entered = yield* Deferred.make<void>();
    const finish = yield* Deferred.make<void>();
    const attempt = yield* f.confirmation
      .decision(owner, card.id, card.nonce, "confirm", (candidate) =>
        Deferred.succeed(entered, undefined).pipe(
          Effect.andThen(Deferred.await(finish)),
          Effect.andThen(f.dispatch(candidate)),
        ),
      )
      .pipe(Effect.result, Effect.forkScoped);
    yield* Deferred.await(entered);
    yield* f.confirmation.decision(owner, card.id, card.nonce, "revoke", f.dispatch);
    yield* Deferred.succeed(finish, undefined);
    assert.equal((yield* Fiber.join(attempt))._tag, "Failure");
    assert.equal((yield* f.sql`SELECT * FROM demo_child`).length, 0);
    const rows = yield* f.sql<{ state: string }>`SELECT state FROM prototype_owner_confirmation`;
    assert.sameMembers(
      rows.map((row) => row.state),
      ["expired", "revoked"],
    );
  }).pipe(Effect.provide(layer)),
);

it.effect("blocks a consumed grant from starting after revocation, even after rollback", () =>
  Effect.gen(function* () {
    const f = yield* fixture;
    yield* f.request;
    const card = yield* f.card;
    yield* f.confirmation.decision(owner, card.id, card.nonce, "confirm", f.dispatch);
    const access = {
      threadId: binding.threadId,
      runId: binding.runId,
      cwd: f.root,
      providerInstanceId: "devReplay",
      runtimeMode: "approval-required",
    };
    yield* f.confirmation.withRuntimeAccess(access, "prepare", Effect.void);
    yield* f.confirmation.decision(owner, card.id, card.nonce, "revoke", f.dispatch);
    const start = f.confirmation.withRuntimeAccess(
      {
        threadId: binding.threadId,
        runId: binding.runId,
        cwd: f.root,
        providerInstanceId: "devReplay",
        runtimeMode: "approval-required",
      },
      "deliver",
      Effect.void,
    );
    assert.equal((yield* Effect.flip(start))._tag, "OwnerConfirmationDenied");
    const events = yield* f.sql<{
      event: string;
    }>`SELECT event FROM prototype_owner_confirmation_audit`;
    assert.notInclude(
      events.map((row) => row.event),
      "provider_start_authorized",
    );

    const disabled = yield* OwnerGrant.OwnerConfirmation.pipe(
      Effect.provide(
        OwnerGrant.layer.pipe(
          Layer.provide(
            ServerConfig.layerTest(process.cwd(), { prefix: "t3-owner-confirmation-off-" }),
          ),
        ),
      ),
      Effect.provideService(ConfigProvider.ConfigProvider, ConfigProvider.fromUnknown({})),
    );
    assert.isFalse(disabled.enabled);
    assert.isDefined(disabled.wasBound);
    assert.isTrue(yield* disabled.wasBound(binding.threadId));
  }).pipe(Effect.provide(layer)),
);

it.effect(
  "checks for previous prototype children when disabled and otherwise leaves the database alone",
  () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const disabled = yield* OwnerGrant.OwnerConfirmation;
      assert.equal(disabled.service, undefined);
      assert.equal(disabled.wasBound, undefined);
      assert.equal(
        (yield* sql`SELECT name FROM sqlite_master WHERE name LIKE 'prototype_owner_confirmation%'`)
          .length,
        0,
      );
    }).pipe(
      Effect.provide(
        OwnerGrant.layer.pipe(
          Layer.provide(
            ServerConfig.layerTest(process.cwd(), { prefix: "t3-owner-confirmation-flag-" }),
          ),
        ),
      ),
      Effect.provide(layer),
      Effect.provideService(ConfigProvider.ConfigProvider, ConfigProvider.fromUnknown({})),
    ),
);

it("trusts only the server-authenticated startup browser principal", () => {
  const session = {
    sessionId: AuthSessionId.make("synthetic-owner-session"),
    method: "browser-session-cookie",
    subject: INTERNAL_ADMINISTRATIVE_BOOTSTRAP_SUBJECT,
    scopes: [AuthAccessWriteScope],
  } as const;
  assert.equal(OwnerGrant.localOwnerPrincipal(session), session.sessionId);
  for (const impostor of [
    { subject: "mcp-client" },
    { subject: "cloud-connect" },
    { subject: "desktop-bootstrap" },
    { subject: "reusable-dev-token" },
    { method: "bearer-access-token" } as const,
    { scopes: [] },
  ]) {
    assert.isUndefined(OwnerGrant.localOwnerPrincipal({ ...session, ...impostor }));
  }
});

it("requires the bundled Replay configuration without per-instance process overrides", () => {
  const id = ProviderInstanceId.make("devReplay");
  const instance = {
    driver: ProviderDriverKind.make("acpRegistry"),
    config: {
      source: "local",
      commandPath: process.execPath,
      commandArgs: [
        decodeURIComponent(new URL("../../scripts/dev-replay-agent.ts", import.meta.url).pathname),
      ],
    },
  };
  const settings = { providerInstances: { [id]: instance } } as ServerSettings;
  assert.isTrue(OwnerGrant.isBundledReplay(settings));
  assert.isFalse(
    OwnerGrant.isBundledReplay({
      ...settings,
      providerInstances: {
        [id]: {
          ...instance,
          environment: [{ name: "NODE_OPTIONS", value: "synthetic", sensitive: false }],
        },
      },
    }),
  );
  assert.isFalse(
    OwnerGrant.isBundledReplay({
      ...settings,
      providerInstances: {
        [id]: { ...instance, config: { ...instance.config, commandArgs: ["other.ts"] } },
      },
    }),
  );
});
