import {
  AuthAccessWriteScope,
  type OrchestrationV2Command,
  type ProviderInstanceConfig,
  ProviderInstanceId,
  type RunId,
  type ServerSettings,
  type ThreadId,
} from "@t3tools/contracts";
import * as Clock from "effect/Clock";
import * as Config from "effect/Config";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as SecureRandom from "effect/crypto/SecureRandom";
import type { SqlError } from "effect/sql/SqlError";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import * as Semaphore from "effect/Semaphore";
import * as SqlClient from "effect/sql/SqlClient";
import {
  INTERNAL_ADMINISTRATIVE_BOOTSTRAP_SUBJECT,
  type AuthenticatedSession,
} from "../auth/EnvironmentAuth.ts";
import { ServerConfig } from "../config.ts";

export const cardPath = "/api/owner-confirmation";
export const ttlMs = 60 * 60 * 1000;
const maxOpenRequests = 32;
// Matches the synthetic instance seeded by ProviderInstanceRegistryHydration.
export const replayInstanceId = ProviderInstanceId.make("devReplay");

type Delegation = Extract<OrchestrationV2Command, { readonly type: "delegated_task.request" }>;
type Operation = "read" | "write";
type Stage = "pending" | "confirmed" | "consumed" | "revoked" | "expired" | "denied";
type Card = {
  readonly id: string;
  readonly nonce: string;
  readonly parentThreadId: ThreadId;
  readonly root: string;
  readonly operations: ReadonlyArray<Operation>;
  readonly model: string;
  readonly expiresAt: number;
  readonly status: Stage;
  readonly childThreadId: string | null;
};
type Request = Omit<Card, "status" | "childThreadId"> & {
  readonly owner: string;
  readonly rootIdentity: string;
  readonly command: Delegation;
};
type Binding = { readonly taskId: string; readonly threadId: ThreadId; readonly runId: RunId };

export class OwnerConfirmationDenied extends Schema.TaggedError<OwnerConfirmationDenied>()(
  "OwnerConfirmationDenied",
  { message: Schema.String },
) {}

const deny = (message: string) => new OwnerConfirmationDenied({ message });
const authority = Context.Reference<Request | undefined>("t3/owner-confirmation/authority", {
  defaultValue: () => undefined,
});

export function localOwnerPrincipal(session: AuthenticatedSession): string | undefined {
  if (
    session.method !== "browser-session-cookie" ||
    session.subject !== INTERNAL_ADMINISTRATIVE_BOOTSTRAP_SUBJECT ||
    !session.scopes.includes(AuthAccessWriteScope)
  )
    return undefined;
  return session.sessionId;
}

const workspaceIdentity = Effect.fn("OwnerConfirmationGrant.workspaceIdentity")(function* (
  value: string,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  // This prototype runs on Linux only. Refuse aliases instead of approving a different path.
  if (
    !path.isAbsolute(value) ||
    path.normalize(value) !== value ||
    /[\\\u0000-\u001f\u007f]/u.test(value)
  ) {
    return yield* deny("Use one absolute canonical scratch workspace root.");
  }
  const canonical = yield* fileSystem
    .realPath(value)
    .pipe(Effect.mapError(() => deny("The scratch root is unavailable.")));
  if (canonical !== value) return yield* deny("Symlinks and path aliases cannot be confirmed.");
  const info = yield* fileSystem
    .stat(value)
    .pipe(Effect.mapError(() => deny("The scratch root is unavailable.")));
  if (info.type !== "Directory" || Option.isNone(info.ino)) {
    return yield* deny("The confirmed root must be a directory with a stable identity.");
  }
  return `${info.dev}:${info.ino.value}`;
});

function prototypeOperations(operations: ReadonlyArray<string> | undefined) {
  if (
    operations === undefined ||
    operations.length === 0 ||
    new Set(operations).size !== operations.length ||
    !operations.every(
      (operation): operation is Operation => operation === "read" || operation === "write",
    )
  )
    return undefined;
  return operations.toSorted();
}

export const supportsReplay = (command: Delegation) =>
  command.modelSelection.instanceId === replayInstanceId &&
  command.runtimeMode === "approval-required" &&
  command.workspaceStrategy === undefined &&
  command.createdBy === "agent" &&
  command.creationSource === "mcp" &&
  !command.task.trimStart().startsWith("/");

export const isBundledReplayInstance = (instance: ProviderInstanceConfig | undefined) => {
  if (
    instance?.driver !== "acpRegistry" ||
    (instance.environment?.length ?? 0) !== 0 ||
    typeof instance.config !== "object" ||
    instance.config === null
  )
    return false;
  const config = instance.config as Readonly<Record<string, unknown>>;
  const args = config.commandArgs;
  const script = new URL("../../scripts/dev-replay-agent.ts", import.meta.url);
  return (
    config.source === "local" &&
    config.commandPath === process.execPath &&
    Array.isArray(args) &&
    args.length === 1 &&
    args[0] === decodeURIComponent(script.pathname) &&
    Object.keys(config).every(
      (key) => key === "source" || key === "commandPath" || key === "commandArgs",
    )
  );
};

export const isBundledReplay = (settings: ServerSettings) =>
  isBundledReplayInstance(settings.providerInstances[replayInstanceId]);

export const requestAuthority = (command: Delegation) =>
  authority.pipe(
    Effect.filterOrFail(
      (request): request is Request => request?.command === command,
      () => deny("A current owner confirmation is required for this delegation."),
    ),
  );

export const make = Effect.fn("OwnerConfirmationGrant.make")(function* (scratchRoot: string) {
  const sql = yield* SqlClient.SqlClient;
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const identity = (root: string) =>
    workspaceIdentity(root).pipe(
      Effect.provideService(FileSystem.FileSystem, fileSystem),
      Effect.provideService(Path.Path, path),
    );
  const rootIdentity = yield* identity(scratchRoot);
  const instance = SecureRandom.uuidV4Unsafe();
  const ownerRecord = SecureRandom.uuidV4Unsafe();
  const commands = new Map<string, Request>();
  const runtimeAccess = yield* Semaphore.make(1);
  let owner: string | undefined;
  yield* sql`
    CREATE TABLE IF NOT EXISTS prototype_owner_confirmation (
      id TEXT PRIMARY KEY, instance TEXT NOT NULL, owner TEXT NOT NULL,
      command_id TEXT NOT NULL, parent_thread_id TEXT NOT NULL, root TEXT NOT NULL,
      operations TEXT NOT NULL, model TEXT NOT NULL, expires_at INTEGER NOT NULL,
      state TEXT NOT NULL, task_id TEXT, child_thread_id TEXT UNIQUE, run_id TEXT, started_at INTEGER, displayed_at INTEGER,
      UNIQUE(instance, command_id)
    )
  `;
  yield* sql`
    CREATE TABLE IF NOT EXISTS prototype_owner_confirmation_audit (
      sequence INTEGER PRIMARY KEY, instance TEXT NOT NULL, request_id TEXT,
      event TEXT NOT NULL, timestamp INTEGER NOT NULL
    )
  `;

  const audit = (event: string, id: string | null, now: number) =>
    sql`INSERT INTO prototype_owner_confirmation_audit (instance, request_id, event, timestamp)
        VALUES (${instance}, ${id}, ${event}, ${now})`.pipe(Effect.asVoid);

  const expire = (now: number) =>
    sql
      .withTransaction(
        Effect.gen(function* () {
          const expired = yield* sql<{ id: string }>`
        UPDATE prototype_owner_confirmation SET state = 'expired'
        WHERE state IN ('pending', 'confirmed', 'consumed') AND expires_at <= ${now}
        RETURNING id
      `;
          for (const { id } of expired) yield* audit("expired", id, now);
          return expired;
        }),
      )
      .pipe(
        Effect.tap((rows) =>
          Effect.sync(() => {
            for (const { id } of rows) commands.delete(id);
          }),
        ),
        Effect.asVoid,
      );

  const refuse = (message: string, id: string | null = null) =>
    Clock.currentTimeMillis.pipe(
      Effect.flatMap((now) => audit("denied", id, now)),
      Effect.andThen(deny(message)),
    );
  const validateOwner = (principal: string) => owner === principal;

  const submit = Effect.fn("OwnerConfirmationGrant.submit")(function* (input: {
    readonly command: Delegation;
    readonly cwd: string | undefined;
    readonly roots: ReadonlyArray<string> | undefined;
    readonly operations: ReadonlyArray<string> | undefined;
  }) {
    const now = yield* Clock.currentTimeMillis;
    yield* expire(now);
    const principal = owner;
    if (principal === undefined) {
      return yield* refuse(
        "Open the local owner confirmation page before requesting a delegation.",
      );
    }
    const operations = prototypeOperations(input.operations);
    if (
      !supportsReplay(input.command) ||
      input.cwd !== scratchRoot ||
      input.roots?.length !== 1 ||
      input.roots[0] !== scratchRoot ||
      operations === undefined
    ) {
      return yield* refuse(
        "The prototype requires the local Replay provider, approval-required mode, and explicit read/write scope for the exact scratch root.",
      );
    }
    if ((yield* identity(scratchRoot)) !== rootIdentity) {
      return yield* refuse("The scratch workspace identity changed.");
    }
    const request: Request = {
      id: SecureRandom.uuidV4Unsafe(),
      nonce: SecureRandom.uuidV4Unsafe(),
      owner: principal,
      parentThreadId: input.command.parentThreadId,
      root: scratchRoot,
      rootIdentity,
      operations,
      model: input.command.modelSelection.model,
      expiresAt: now + ttlMs,
      command: input.command,
    };
    const created = yield* sql.withTransaction(
      Effect.gen(function* () {
        const [open] = yield* sql<{ count: number }>`
        SELECT COUNT(*) AS count FROM prototype_owner_confirmation
        WHERE instance = ${instance} AND state IN ('pending', 'confirmed', 'consumed')
      `;
        if ((open?.count ?? maxOpenRequests) >= maxOpenRequests) return false;
        const rows = yield* sql`
        INSERT INTO prototype_owner_confirmation
          (id, instance, owner, command_id, parent_thread_id, root, operations, model, expires_at, state)
        VALUES (${request.id}, ${instance}, ${ownerRecord}, ${input.command.commandId},
          ${request.parentThreadId}, ${request.root}, ${operations.join(",")}, ${request.model},
          ${request.expiresAt}, 'pending')
        ON CONFLICT(instance, command_id) DO NOTHING RETURNING id
      `;
        if (rows.length !== 1) return false;
        yield* audit("requested", request.id, now);
        return true;
      }),
    );
    if (!created)
      return yield* refuse("This delegation identity has been used or the owner queue is full.");
    commands.set(request.id, request);
    return request.id;
  });

  const cards = Effect.fn("OwnerConfirmationGrant.cards")(function* (principal: string) {
    owner ??= principal;
    if (!validateOwner(principal))
      return yield* refuse("This browser session is not the bound owner.");
    const now = yield* Clock.currentTimeMillis;
    yield* expire(now);
    const rows = yield* sql.withTransaction(
      Effect.gen(function* () {
        const current = yield* sql<{
          id: string;
          state: Stage;
          child_thread_id: string | null;
          displayed_at: number | null;
        }>`
        SELECT id, state, child_thread_id, displayed_at FROM prototype_owner_confirmation
        WHERE instance = ${instance} AND owner = ${ownerRecord}
          AND state IN ('pending', 'confirmed', 'consumed')
      `;
        const visible = current.filter(({ id }) => commands.has(id));
        for (const row of visible) {
          if (row.state !== "pending" || row.displayed_at !== null) continue;
          yield* sql`UPDATE prototype_owner_confirmation SET displayed_at = ${now} WHERE id = ${row.id}`;
          yield* audit("scope_displayed", row.id, now);
        }
        return visible;
      }),
    );
    return rows.flatMap((row): ReadonlyArray<Card> => {
      const request = commands.get(row.id);
      if (request === undefined) return [];
      return [
        {
          id: request.id,
          nonce: request.nonce,
          parentThreadId: request.parentThreadId,
          root: request.root,
          operations: request.operations,
          model: request.model,
          expiresAt: request.expiresAt,
          status: row.state,
          childThreadId: row.child_thread_id,
        },
      ];
    });
  });

  const decision = Effect.fn("OwnerConfirmationGrant.decision")(function* <E>(
    principal: string,
    id: string,
    nonce: string,
    action: "confirm" | "revoke",
    dispatch: (command: Delegation) => Effect.Effect<unknown, E>,
  ) {
    const now = yield* Clock.currentTimeMillis;
    yield* expire(now);
    const request = commands.get(id);
    if (!validateOwner(principal) || request?.owner !== principal || request.nonce !== nonce) {
      return yield* refuse("Unknown owner request or invalid confirmation.", request?.id);
    }
    const decideInTransaction = sql.withTransaction(
      Effect.gen(function* () {
        const decidedAt = yield* Clock.currentTimeMillis;
        const changed =
          action === "confirm"
            ? yield* sql`
          UPDATE prototype_owner_confirmation SET state = 'confirmed'
          WHERE id = ${id} AND state = 'pending' AND displayed_at IS NOT NULL AND expires_at > ${decidedAt} RETURNING id
        `
            : yield* sql`
          UPDATE prototype_owner_confirmation SET state = 'revoked'
          WHERE id = ${id} AND state IN ('pending', 'confirmed', 'consumed') AND expires_at > ${decidedAt}
          RETURNING id
        `;
        if (changed.length !== 1) return false;
        yield* audit(action === "confirm" ? "owner_confirmed" : "owner_revoked", id, decidedAt);
        if (action === "confirm") yield* audit("grant_issued", id, decidedAt);
        return true;
      }),
    );
    const accepted = yield* action === "revoke"
      ? runtimeAccess.withPermit(decideInTransaction)
      : decideInTransaction;
    if (!accepted)
      return yield* refuse("The confirmation request was already used, revoked or expired.", id);
    if (action === "revoke") {
      commands.delete(id);
      return;
    }
    yield* dispatch(request.command).pipe(
      Effect.provideService(authority, request),
      Effect.tapError(() =>
        sql
          .withTransaction(
            Effect.gen(function* () {
              const denied = yield* sql`
          UPDATE prototype_owner_confirmation SET state = 'denied'
          WHERE id = ${id} AND state = 'confirmed' RETURNING id
        `;
              if (denied.length === 1)
                yield* audit("dispatch_denied", id, yield* Clock.currentTimeMillis);
              return denied.length === 1;
            }),
          )
          .pipe(
            Effect.tap((denied) =>
              Effect.sync(() => {
                if (denied) commands.delete(id);
              }),
            ),
          ),
      ),
    );
  }, Effect.uninterruptible);

  // Called inside EventSink's transaction, before the child, receipt or outbox become visible.
  const consume = Effect.fn("OwnerConfirmationGrant.consume")(function* (
    request: Request,
    cwd: string | null,
    binding: Binding,
  ) {
    if (cwd !== request.root || (yield* identity(cwd)) !== request.rootIdentity) {
      return yield* deny("The workspace changed after owner confirmation.");
    }
    const now = yield* Clock.currentTimeMillis;
    const changed = yield* sql`
      UPDATE prototype_owner_confirmation
      SET state = 'consumed', task_id = ${binding.taskId}, child_thread_id = ${binding.threadId}, run_id = ${binding.runId}
      WHERE id = ${request.id} AND instance = ${instance} AND owner = ${ownerRecord}
        AND command_id = ${request.command.commandId} AND state = 'confirmed' AND expires_at > ${now}
      RETURNING id
    `;
    if (changed.length !== 1) return yield* deny("The grant is no longer available.");
    yield* audit("grant_consumed_and_child_bound", request.id, now);
  });

  const isBound = (threadId: ThreadId) =>
    sql`SELECT 1 FROM prototype_owner_confirmation WHERE child_thread_id = ${threadId}`.pipe(
      Effect.map((rows) => rows.length > 0),
    );

  type ProviderAccess = {
    readonly threadId: ThreadId;
    readonly runId: RunId;
    readonly cwd: string | null;
    readonly providerInstanceId: string;
    readonly runtimeMode: string;
  };

  const authorizeRuntimeAccess = Effect.fn("OwnerConfirmationGrant.authorizeRuntimeAccess")(
    function* (input: ProviderAccess, phase: "prepare" | "deliver") {
      yield* expire(yield* Clock.currentTimeMillis);
      if (
        input.cwd !== scratchRoot ||
        input.providerInstanceId !== replayInstanceId ||
        input.runtimeMode !== "approval-required" ||
        (yield* identity(input.cwd)) !== rootIdentity
      ) {
        return yield* refuse("Provider access no longer matches the confirmed prototype scope.");
      }
      const allowed = yield* sql.withTransaction(
        Effect.gen(function* () {
          const now = yield* Clock.currentTimeMillis;
          const condition = sql`instance = ${instance} AND child_thread_id = ${input.threadId}
          AND run_id = ${input.runId} AND state = 'consumed' AND expires_at > ${now} AND started_at IS NULL`;
          if (phase === "prepare") {
            const current =
              yield* sql`SELECT 1 FROM prototype_owner_confirmation WHERE ${condition}`;
            return current.length === 1;
          }
          const [started] = yield* sql<{ id: string }>`
          UPDATE prototype_owner_confirmation SET started_at = ${now}
          WHERE ${condition} RETURNING id
        `;
          if (started === undefined) return false;
          yield* audit("provider_start_authorized", started.id, now);
          return true;
        }),
      );
      if (!allowed) return yield* refuse("The grant cannot authorize this provider access.");
    },
  );

  // A successful revocation cannot interleave between the admitted check and invocation.
  // A call that already crossed this lock can finish. The lock does not confine the process.
  const withRuntimeAccess = <A, E, R>(
    input: ProviderAccess,
    phase: "prepare" | "deliver",
    access: Effect.Effect<A, E, R>,
  ) => runtimeAccess.withPermit(authorizeRuntimeAccess(input, phase).pipe(Effect.andThen(access)));

  const recordDenial = (event: "unconfirmed_dispatch" | "linked_dispatch" | "request_rejected") =>
    Clock.currentTimeMillis.pipe(Effect.flatMap((now) => audit(event, null, now)));

  return { submit, cards, decision, consume, withRuntimeAccess, isBound, recordDenial };
});

export const OwnerConfirmation = Context.Reference<{
  readonly enabled: boolean;
  readonly service?: Effect.Success<ReturnType<typeof make>>;
  readonly wasBound?: (threadId: ThreadId) => Effect.Effect<boolean, SqlError>;
}>("t3/owner-confirmation", { defaultValue: () => ({ enabled: false }) });

export const layer = Layer.effect(
  OwnerConfirmation,
  Effect.gen(function* () {
    const enabled = yield* Config.Boolean("T3_OWNER_CONFIRMATION_GRANT").pipe(
      Config.withDefault(false),
    );
    if (!enabled) {
      const sql = yield* SqlClient.SqlClient;
      const tables =
        yield* sql`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'prototype_owner_confirmation'`;
      if (tables.length === 0) return { enabled };
      return {
        enabled,
        wasBound: (threadId: ThreadId) =>
          sql`
        SELECT 1 FROM prototype_owner_confirmation WHERE child_thread_id = ${threadId}
      `.pipe(Effect.map((rows) => rows.length > 0)),
      };
    }
    const config = yield* ServerConfig;
    const root = yield* Config.String("T3_OWNER_CONFIRMATION_SCRATCH_ROOT");
    if (
      process.platform !== "linux" ||
      config.host !== "127.0.0.1" ||
      config.devUrl === undefined ||
      config.devUrl.hostname !== "127.0.0.1" ||
      config.devAuthToken !== undefined ||
      config.tailscaleServeEnabled ||
      config.cwd !== root ||
      root === "/" ||
      config.mode === "desktop"
    )
      return yield* deny(
        "Owner confirmation requires a fresh loopback-only Linux development instance.",
      );
    const service = yield* make(root);
    return { enabled, service, wasBound: service.isBound };
  }),
);
