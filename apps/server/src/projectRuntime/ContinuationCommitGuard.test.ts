// @effect-diagnostics nodeBuiltinImport:off -- This integration fixture controls independent Node processes and disposable database files.
import * as Effect from "effect/Effect";
import * as NodeChildProcess from "node:child_process";
import * as NodeFSP from "node:fs/promises";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import * as NodeUtil from "node:util";
import { assert, it } from "@effect/vitest";

const execute = NodeUtil.promisify(NodeChildProcess.execFile);
const worker = new URL("./fixtures/continuationCommit.worker.mjs", import.meta.url);

// Each invocation owns a fresh SQL connection in a separate process. Awaiting its exit
// orders the committed operator update and the stale writer without timing assumptions.
async function scenario(order: readonly string[], guarded = true) {
  const directory = await NodeFSP.mkdtemp(
    NodePath.join(NodeOS.tmpdir(), "t3-continuation-commit-"),
  );
  try {
    const file = NodePath.join(directory, "state.sqlite");
    let output = "";
    let inode: number | undefined;
    for (const mode of ["seed", ...order]) {
      const result = await execute(process.execPath, [
        worker.pathname,
        file,
        mode,
        guarded ? "guarded" : "baseline",
      ]);
      output = result.stdout;
      const identityLine = output.split("\n").find((line) => line.startsWith("DB_IDENTITY "));
      assert.isDefined(identityLine);
      const identity = JSON.parse(identityLine!.slice(12)) as { inode: number; realpath: string };
      assert.equal(identity.realpath, file);
      if (inode !== undefined) assert.equal(identity.inode, inode);
      inode = identity.inode;
    }
    const state = output.split("\n").find((line) => line.startsWith("STATE "));
    assert.isDefined(state, output);
    return JSON.parse(state!.slice(6)) as {
      events: unknown[];
      receipts: unknown[];
      effects: unknown[];
      runs: { status: string }[];
      attempts: { status: string }[];
      tasks: { revision: number }[];
    };
  } finally {
    await NodeFSP.rm(directory, { recursive: true, force: true });
  }
}

it.live("operator continuation:null commits first: no run, effect, or accepted receipt", () =>
  Effect.promise(async () => {
    const state = await scenario(
      ["update", "commit", "replay"],
      process.env.D4_RED_BASELINE !== "1",
    );
    assert.equal(state.events.length, 0);
    assert.equal(state.effects.length, 0);
    assert.equal(state.receipts.length, 0);
    assert.include(
      state.tasks.map((task) => task.revision),
      2,
    );
  }),
);

it.live("run commits first: revocation and process restart replay cannot duplicate it", () =>
  Effect.promise(async () => {
    const state = await scenario(["commit", "update", "replay"]);
    assert.equal(state.events.length, 1);
    assert.equal(state.effects.length, 1);
    assert.equal(state.receipts.length, 1);
  }),
);

it.live("unguarded control reproduces the stale authorization race", () =>
  Effect.promise(async () => {
    const state = await scenario(["update", "commit"], false);
    assert.equal(state.events.length, 1);
    assert.equal(state.effects.length, 1);
    assert.equal(state.receipts.length, 1);
  }),
);

it.live(
  "revocation during preparation survives process restart and cancels without a start effect",
  () =>
    Effect.promise(async () => {
      const state = await scenario(["prepare", "update", "release", "release"]);
      assert.equal(state.events.length, 1);
      assert.equal(state.effects.length, 0);
      assert.equal(state.receipts.length, 2);
      assert.equal(state.runs[0]?.status, "cancelled");
      assert.equal(state.attempts[0]?.status, "cancelled");
    }),
);

it.live(
  "foreign project, source, revision, target, attempt, request and gate cannot authorize a run",
  () =>
    Effect.promise(async () => {
      const state = await scenario(["identity"]);
      assert.equal(state.events.length, 0);
      assert.equal(state.effects.length, 0);
      assert.equal(state.receipts.length, 0);
    }),
);

it.live(
  "a claimed start survives process stop and requires reconciliation instead of certified cancellation",
  () =>
    Effect.promise(async () => {
      const state = await scenario(["prepare", "claim", "update", "uncertain"]);
      assert.equal(state.effects.length, 1);
      assert.equal(state.attempts[0]?.status, "reconcile_required");
      assert.equal(state.runs[0]?.status, "preparing");
    }),
);

it.live(
  "missing durable attempt provenance cannot turn a prepared Runtime run into an ordinary run",
  () =>
    Effect.promise(async () => {
      const state = await scenario(["prepare", "forget", "release"]);
      assert.equal(state.effects.length, 0);
      assert.equal(state.runs[0]?.status, "cancelled");
    }),
);

it.live("cancellation cannot downgrade an existing uncertainty marker", () =>
  Effect.promise(async () => {
    const state = await scenario(["prepare", "reconcile-cancel"]);
    assert.equal(state.attempts[0]?.status, "reconcile_required");
  }),
);

it.live("a live stale reader cannot commit after a second connection revokes policy", () =>
  Effect.promise(async () => {
    const directory = await NodeFSP.mkdtemp(
      NodePath.join(NodeOS.tmpdir(), "t3-continuation-barrier-"),
    );
    try {
      const file = NodePath.join(directory, "state.sqlite");
      await execute(process.execPath, [worker.pathname, file, "seed", "guarded"]);
      const child = NodeChildProcess.fork(worker.pathname, [file, "barrier", "guarded"], {
        silent: true,
        execArgv: [],
      });
      let output = "";
      child.stdout!.on("data", (chunk) => {
        output += String(chunk);
      });
      const exited = new Promise<void>((resolve, reject) => {
        child.once("error", reject);
        child.once("exit", (code) =>
          code === 0 ? resolve() : reject(new Error(`worker exit ${code}`)),
        );
      });
      await new Promise<void>((resolve, reject) => {
        child.once("message", () => resolve());
        child.once("error", reject);
        child.once("exit", () => reject(new Error("worker exited before barrier")));
      });
      await execute(process.execPath, [worker.pathname, file, "update", "guarded"]);
      child.send("resume");
      await exited;
      const line = output.split("\n").find((entry) => entry.startsWith("STATE "))!;
      const state = JSON.parse(line.slice(6)) as {
        events: unknown[];
        receipts: unknown[];
        effects: unknown[];
      };
      assert.isEmpty(state.events);
      assert.isEmpty(state.receipts);
      assert.isEmpty(state.effects);
    } finally {
      await NodeFSP.rm(directory, { recursive: true, force: true });
    }
  }),
);
