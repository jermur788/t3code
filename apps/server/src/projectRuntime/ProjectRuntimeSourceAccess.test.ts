import * as DevelopmentProfileService from "../developmentProfiles/DevelopmentProfileService.ts";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import {
  PROJECT_RUNTIME_BOUNDS,
  ProjectId,
  type ProjectRuntimeSource,
  ProjectRuntimeSourceId,
  type ProjectSearchContentsInput,
  type ProjectSearchContentsResult,
} from "@t3tools/contracts";
import * as HostProcess from "@t3tools/shared/HostProcess";
import { symlinksSupported } from "@t3tools/shared/testing/symlinks";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";
import * as SqlClient from "effect/sql/SqlClient";

import * as ServerConfig from "../config.ts";
import * as ProjectStore from "../orchestration-v2/ProjectStore.ts";
import * as SqlitePersistence from "../persistence/Sqlite.ts";
import * as KnownWorkspaces from "../workspace/KnownWorkspaces.ts";
import * as WorkspaceEntries from "../workspace/WorkspaceEntries.ts";
import * as WorkspaceFileSystem from "../workspace/WorkspaceFileSystem.ts";
import * as WorkspacePaths from "../workspace/WorkspacePaths.ts";
import * as ProjectRuntimeService from "./ProjectRuntimeService.ts";
import * as ProjectRuntimeSourceAccess from "./ProjectRuntimeSourceAccess.ts";

const projectA = ProjectId.make("access-a");
const projectB = ProjectId.make("access-b");
const actor = { actor: "user:maintainer" };
const canSymlink = symlinksSupported && HostProcess.Platform.defaultValue() !== "win32";
const canChmod = HostProcess.Platform.defaultValue() !== "win32" && process.getuid?.() !== 0;

const layerSourceAccess = <E, R>(
  entries: Layer.Layer<WorkspaceEntries.WorkspaceEntries, E, R>,
  /** Observes the byte length requested by every raw file read the adapter makes. */
  onRangeRead?: (length: number) => void,
) => {
  const files = WorkspaceFileSystem.layer.pipe(
    Layer.provideMerge(entries),
    Layer.provideMerge(WorkspacePaths.layer),
    Layer.provide(
      Layer.mock(KnownWorkspaces.KnownWorkspaces)({ assertContains: () => Effect.void }),
    ),
  );
  const observed =
    onRangeRead === undefined
      ? files
      : Layer.effect(
          WorkspaceFileSystem.WorkspaceFileSystem,
          Effect.gen(function* () {
            const real = yield* WorkspaceFileSystem.WorkspaceFileSystem;
            return WorkspaceFileSystem.WorkspaceFileSystem.of({
              ...real,
              readFileRange: (input) => {
                onRangeRead(input.length);
                return real.readFileRange(input);
              },
            });
          }),
        ).pipe(Layer.provideMerge(files));
  return ProjectRuntimeSourceAccess.layer.pipe(
    Layer.provideMerge(
      ProjectRuntimeService.layer.pipe(Layer.provide(DevelopmentProfileService.layer)),
    ),
    Layer.provideMerge(ProjectStore.layer),
    Layer.provideMerge(observed),
    Layer.provideMerge(SqlitePersistence.layerMemory),
    Layer.provide(
      ServerConfig.ServerConfig.layerTest(process.cwd(), { prefix: "t3-runtime-access-" }),
    ),
    Layer.provideMerge(NodeServices.layer),
  );
};
const layerRealEntries = WorkspaceEntries.layer.pipe(Layer.provide(WorkspacePaths.layer));
const layerTest = layerSourceAccess(layerRealEntries);

const BODY_MARKER = "SOURCE-BODY-MARKER-7f3a";

const setup = Effect.gen(function* () {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const sql = yield* SqlClient.SqlClient;
  const runtime = yield* ProjectRuntimeService.ProjectRuntimeService;
  const access = yield* ProjectRuntimeSourceAccess.ProjectRuntimeSourceAccess;
  const roots = new Map<ProjectId, string>();
  for (const projectId of [projectA, projectB]) {
    const root = yield* fileSystem.makeTempDirectoryScoped({ prefix: `t3-runtime-${projectId}-` });
    roots.set(projectId, yield* fileSystem.realPath(root));
    yield* sql`INSERT INTO projection_projects (project_id, title, workspace_root, scripts_json, created_at, updated_at)
      VALUES (${projectId}, ${projectId}, ${roots.get(projectId)!}, '[]', '2026-10-23T00:00:00.000Z', '2026-10-23T00:00:00.000Z')`;
    yield* runtime.setEnabled(projectId, { enabled: true });
  }
  const outside = yield* fileSystem.makeTempDirectoryScoped({ prefix: "t3-runtime-outside-" });
  const write = Effect.fn("write")(function* (
    projectId: ProjectId,
    relativePath: string,
    contents: string | Uint8Array,
  ) {
    const absolute = path.join(roots.get(projectId)!, relativePath);
    yield* fileSystem.makeDirectory(path.dirname(absolute), { recursive: true });
    yield* typeof contents === "string"
      ? fileSystem.writeFileString(absolute, contents)
      : fileSystem.writeFile(absolute, contents);
    return absolute;
  });
  const register = (
    projectId: ProjectId,
    relativePath: string,
    extra?: { readonly enabled?: boolean },
  ) =>
    runtime.createSource(
      projectId,
      { title: "Source", role: "reference", relativePath, ...extra },
      actor,
    );
  /** Rewrites a stored locator behind the service, as an older or hand-edited record could be. */
  const forceLocator = (source: ProjectRuntimeSource, relativePath: string) =>
    sql`UPDATE project_runtime_sources SET payload_json = json_set(payload_json, '$.relativePath', ${relativePath}) WHERE source_id = ${source.sourceId}`;
  const read = (
    projectId: ProjectId,
    source: ProjectRuntimeSource,
    range?: { readonly fromLine?: number; readonly lineCount?: number },
  ) => access.read(projectId, { sourceId: source.sourceId, ...range });
  const healthOf = (projectId: ProjectId, source: ProjectRuntimeSource) =>
    access
      .list(projectId, {})
      .pipe(
        Effect.map(
          (result) =>
            result.sources.find((entry) => entry.source.sourceId === source.sourceId)?.health,
        ),
      );
  return {
    fileSystem,
    path,
    sql,
    runtime,
    access,
    roots,
    outside,
    write,
    register,
    forceLocator,
    read,
    healthOf,
  };
});

const errorTag = <A, E extends { readonly _tag: string }>(effect: Effect.Effect<A, E>) =>
  effect.pipe(
    Effect.flip,
    Effect.map((error) =>
      "reason" in error ? `${error._tag}:${String(error.reason)}` : error._tag,
    ),
  );

it.effect("lists derived health for every source, retaining disabled records", () =>
  Effect.gen(function* () {
    const t = yield* setup;
    yield* t.write(projectA, "docs/ok.md", "hello\n");
    yield* t.write(projectA, "assets/blob.bin", Uint8Array.from([0x61, 0, 0x62]));
    yield* t.write(projectA, "docs/disabled.md", "off\n");
    yield* t.fileSystem.makeDirectory(t.path.join(t.roots.get(projectA)!, "folder"));
    const ok = yield* t.register(projectA, "docs/ok.md");
    const missing = yield* t.register(projectA, "docs/gone.md");
    const binary = yield* t.register(projectA, "assets/blob.bin");
    const directory = yield* t.register(projectA, "folder");
    const disabled = yield* t.register(projectA, "docs/disabled.md", { enabled: false });
    const lexical = yield* Effect.forEach(
      ["../outside.md", "/etc/passwd", "C:\\Windows\\win.ini", "\\\\host\\share\\f.md"],
      (relativePath) =>
        Effect.gen(function* () {
          const source = yield* t.register(projectA, "docs/ok.md");
          yield* t.forceLocator(source, relativePath);
          return source;
        }),
    );

    const listed = yield* t.access.list(projectA, {});
    const byId = new Map(listed.sources.map((entry) => [entry.source.sourceId, entry]));
    assert.equal(byId.get(ok.sourceId)?.health, "available");
    assert.equal(byId.get(missing.sourceId)?.health, "missing");
    assert.equal(byId.get(binary.sourceId)?.health, "unsupported");
    assert.equal(byId.get(directory.sourceId)?.health, "unsupported");
    assert.equal(byId.get(disabled.sourceId)?.health, "available");
    assert.isFalse(byId.get(disabled.sourceId)?.source.enabled);
    for (const source of lexical) assert.equal(byId.get(source.sourceId)?.health, "unsupported");
    assert.lengthOf(listed.sources, 9);
    assert.isNull(listed.nextCursor);

    const first = yield* t.access.list(projectA, { limit: 4 });
    const second = yield* t.access.list(projectA, { cursor: first.nextCursor ?? 0, limit: 4 });
    assert.equal(first.nextCursor, 4);
    assert.deepEqual(
      [...first.sources, ...second.sources.slice(0, 4)].map((entry) => entry.source.sourceId),
      (yield* t.runtime.listSources(projectA, { limit: 8 })).sources.map(
        (source) => source.sourceId,
      ),
    );
  }).pipe(Effect.scoped, Effect.provide(layerTest)),
);

it.effect.skipIf(!canChmod)("reports an unreadable file as unreadable", () =>
  Effect.gen(function* () {
    const t = yield* setup;
    const file = yield* t.write(projectA, "docs/locked.md", "secret\n");
    const source = yield* t.register(projectA, "docs/locked.md");
    yield* t.fileSystem.chmod(file, 0o000);
    assert.equal(yield* t.healthOf(projectA, source), "unreadable");
    assert.equal(
      yield* errorTag(t.read(projectA, source)),
      "ProjectRuntimeSourceUnsupportedError:unreadable",
    );
    yield* t.fileSystem.chmod(file, 0o644);
  }).pipe(Effect.scoped, Effect.provide(layerTest)),
);

it.effect("reads line ranges verbatim without fabricating lines at end of file", () =>
  Effect.gen(function* () {
    const t = yield* setup;
    yield* t.write(projectA, "lines.md", "l1\nl2\r\nl3\nl4\n");
    yield* t.write(projectA, "unterminated.md", "a\nb");
    yield* t.write(projectA, "empty.md", "");
    const lines = yield* t.register(projectA, "lines.md");
    const unterminated = yield* t.register(projectA, "unterminated.md");
    const empty = yield* t.register(projectA, "empty.md");

    const page = yield* t.read(projectA, lines, { fromLine: 2, lineCount: 2 });
    assert.deepInclude(page, {
      health: "available",
      fromLine: 2,
      toLine: 3,
      contents: "l2\r\nl3\n",
      byteLength: 7,
      truncated: true,
    });
    assert.deepEqual(page.source, lines);
    assert.deepInclude(yield* t.read(projectA, lines, { fromLine: 4 }), {
      fromLine: 4,
      toLine: 4,
      contents: "l4\n",
      truncated: false,
    });
    // Exactly lineCount lines ending at EOF is not truncated.
    assert.isFalse((yield* t.read(projectA, lines, { fromLine: 2, lineCount: 3 })).truncated);
    assert.deepInclude(yield* t.read(projectA, lines, { fromLine: 5 }), {
      fromLine: 5,
      toLine: 4,
      contents: "",
      byteLength: 0,
      truncated: false,
    });
    assert.deepInclude(yield* t.read(projectA, unterminated, { fromLine: 2 }), {
      toLine: 2,
      contents: "b",
      truncated: false,
    });
    assert.deepInclude(yield* t.read(projectA, empty), {
      fromLine: 1,
      toLine: 0,
      contents: "",
      byteLength: 0,
      truncated: false,
    });
    assert.equal((yield* t.read(projectA, lines)).contents, "l1\nl2\r\nl3\nl4\n");
  }).pipe(Effect.scoped, Effect.provide(layerTest)),
);

it.effect("enforces readMaxBytes in UTF-8 bytes and pages through oversized content", () =>
  Effect.gen(function* () {
    const t = yield* setup;
    const cap = PROJECT_RUNTIME_BOUNDS.readMaxBytes;
    // 2-byte characters: 40_000 bytes per line is under the cap in characters and bytes, but two
    // lines are 80_000 bytes and would pass a character-count check of 65_536.
    const wide = `${"é".repeat(20_000)}\n`;
    yield* t.write(projectA, "wide.md", wide + wide);
    yield* t.write(projectA, "emoji.md", `${"😀".repeat(20_000)}\nafter\n`);
    yield* t.write(projectA, "euro.md", "€".repeat(30_000));
    const wideSource = yield* t.register(projectA, "wide.md");
    const emoji = yield* t.register(projectA, "emoji.md");
    const euro = yield* t.register(projectA, "euro.md");

    const first = yield* t.read(projectA, wideSource);
    assert.deepInclude(first, { toLine: 1, byteLength: 40_001, truncated: true });
    assert.equal(Buffer.byteLength(first.contents), first.byteLength);
    const second = yield* t.read(projectA, wideSource, { fromLine: first.toLine + 1 });
    assert.deepInclude(second, { fromLine: 2, toLine: 2, byteLength: 40_001, truncated: false });

    // A single line over the cap is cut at a character boundary and flagged truncated.
    const cut = yield* t.read(projectA, emoji);
    assert.deepInclude(cut, { toLine: 1, byteLength: cap, truncated: true });
    assert.equal(Buffer.byteLength(cut.contents), cap);
    assert.notInclude(cut.contents, "\uFFFD");
    const cutEuro = yield* t.read(projectA, euro);
    assert.equal(cutEuro.byteLength, 21_845 * 3);
    assert.equal(Buffer.byteLength(cutEuro.contents), cutEuro.byteLength);
    assert.isTrue(cutEuro.truncated);
    assert.equal((yield* t.read(projectA, emoji, { fromLine: 2 })).contents, "after\n");
  }).pipe(Effect.scoped, Effect.provide(layerTest)),
);

it.effect("reads lines past the first MiB of a large file", () =>
  Effect.gen(function* () {
    const t = yield* setup;
    const body = Array.from(
      { length: 20_000 },
      (_, index) => `line ${index + 1} ${"x".repeat(90)}\n`,
    );
    yield* t.write(projectA, "large.md", body.join(""));
    const source = yield* t.register(projectA, "large.md");
    const page = yield* t.read(projectA, source, { fromLine: 19_990, lineCount: 3 });
    assert.equal(page.contents, body.slice(19_989, 19_992).join(""));
    assert.deepInclude(page, { toLine: 19_992, truncated: true });
    assert.isFalse(
      (yield* t.read(projectA, source, { fromLine: 19_990, lineCount: 11 })).truncated,
    );
  }).pipe(Effect.scoped, Effect.provide(layerTest)),
);

it.effect("rejects bad ranges, disabled records and foreign or unknown source IDs", () =>
  Effect.gen(function* () {
    const t = yield* setup;
    yield* t.write(projectA, "a.md", "a\n");
    yield* t.write(projectB, "a.md", "b\n");
    const source = yield* t.register(projectA, "a.md");
    const disabled = yield* t.register(projectA, "a.md", { enabled: false });
    const foreign = yield* t.register(projectB, "a.md");

    const tooMany = yield* t.access
      .read(projectA, { sourceId: source.sourceId, fromLine: 3, lineCount: 401 })
      .pipe(Effect.flip);
    assert.deepInclude(tooMany, {
      _tag: "ProjectRuntimeInvalidRangeError",
      fromLine: 3,
      lineCount: 401,
      maxLines: 400,
    });
    assert.equal(
      yield* errorTag(t.access.read(projectA, { sourceId: source.sourceId, fromLine: 0 })),
      "SchemaError",
    );
    assert.equal(yield* errorTag(t.read(projectA, disabled)), "ProjectRuntimeSourceDisabledError");
    assert.equal(yield* errorTag(t.read(projectA, foreign)), "ProjectRuntimeNotFoundError");
    assert.equal(
      yield* errorTag(t.access.read(projectA, { sourceId: ProjectRuntimeSourceId.make("nope") })),
      "ProjectRuntimeNotFoundError",
    );
    // The read input is a source ID; a caller-supplied path is not part of it.
    const smuggled = yield* t.access.read(projectA, {
      sourceId: source.sourceId,
      relativePath: "/etc/passwd",
    } as never);
    assert.equal(smuggled.contents, "a\n");

    yield* t.runtime.setEnabled(projectA, { enabled: false });
    assert.equal(yield* errorTag(t.read(projectA, source)), "ProjectRuntimeDisabledError");
    assert.equal(
      yield* errorTag(t.access.search(projectA, { query: "a" })),
      "ProjectRuntimeDisabledError",
    );
    assert.equal(yield* errorTag(t.access.list(projectA, {})), "ProjectRuntimeDisabledError");
  }).pipe(Effect.scoped, Effect.provide(layerTest)),
);

it.effect("maps path, canonical-escape, directory, binary and missing failures on read", () =>
  Effect.gen(function* () {
    const t = yield* setup;
    yield* t.write(projectA, "ok.md", "ok\n");
    yield* t.write(projectA, "blob.bin", Uint8Array.from([0x61, 0, 0x62]));
    yield* t.fileSystem.makeDirectory(t.path.join(t.roots.get(projectA)!, "folder"));
    const forced = [
      ["../outside.md", "ProjectRuntimeSourcePathError:outside_workspace"],
      ["docs/../../outside.md", "ProjectRuntimeSourcePathError:outside_workspace"],
      ["/etc/passwd", "ProjectRuntimeSourcePathError:absolute"],
      ["C:\\Windows\\win.ini", "ProjectRuntimeSourcePathError:absolute"],
      ["c:relative.md", "ProjectRuntimeSourcePathError:absolute"],
      ["\\\\host\\share\\f.md", "ProjectRuntimeSourcePathError:absolute"],
      [".", "ProjectRuntimeSourcePathError:outside_workspace"],
    ] as const;
    for (const [relativePath, expected] of forced) {
      const source = yield* t.register(projectA, "ok.md");
      yield* t.forceLocator(source, relativePath);
      assert.equal(yield* errorTag(t.read(projectA, source)), expected, relativePath);
    }
    assert.equal(
      yield* errorTag(t.read(projectA, yield* t.register(projectA, "nothing.md"))),
      "ProjectRuntimeSourceMissingError",
    );
    assert.equal(
      yield* errorTag(t.read(projectA, yield* t.register(projectA, "ok.md/below"))),
      "ProjectRuntimeSourceMissingError",
    );
    assert.equal(
      yield* errorTag(t.read(projectA, yield* t.register(projectA, "blob.bin"))),
      "ProjectRuntimeSourceUnsupportedError:binary",
    );
    assert.equal(
      yield* errorTag(t.read(projectA, yield* t.register(projectA, "folder"))),
      "ProjectRuntimeSourceUnsupportedError:not_a_file",
    );
  }).pipe(Effect.scoped, Effect.provide(layerTest)),
);

it.effect("reports binary content found while scanning past the first chunk", () =>
  Effect.gen(function* () {
    const t = yield* setup;
    const head = "line\n".repeat(20_000);
    yield* t.write(projectA, "late.bin", Buffer.concat([Buffer.from(head), Buffer.from([0])]));
    const source = yield* t.register(projectA, "late.bin");
    assert.equal((yield* t.read(projectA, source, { lineCount: 5 })).toLine, 5);
    assert.equal(
      yield* errorTag(t.read(projectA, source, { fromLine: 19_999, lineCount: 400 })),
      "ProjectRuntimeSourceUnsupportedError:binary",
    );
  }).pipe(Effect.scoped, Effect.provide(layerTest)),
);

it.effect.skipIf(!canSymlink)("rejects canonical symlink escapes on read, list and search", () =>
  Effect.gen(function* () {
    const t = yield* setup;
    const root = t.roots.get(projectA)!;
    yield* t.fileSystem.writeFileString(t.path.join(t.outside, "secret.md"), "needle outside\n");
    yield* t.write(projectA, "docs/real.md", "needle inside\n");
    yield* t.fileSystem.symlink(t.path.join(t.outside, "secret.md"), t.path.join(root, "link.md"));
    yield* t.fileSystem.symlink(t.outside, t.path.join(root, "linked-dir"));
    yield* t.fileSystem.symlink(t.path.join(root, "docs/real.md"), t.path.join(root, "inner.md"));
    const file = yield* t.register(projectA, "link.md");
    const viaDir = yield* t.register(projectA, "linked-dir/secret.md");
    const inner = yield* t.register(projectA, "inner.md");

    for (const source of [file, viaDir]) {
      assert.equal(
        yield* errorTag(t.read(projectA, source)),
        "ProjectRuntimeSourceUnsupportedError:outside_workspace",
      );
      assert.equal(yield* t.healthOf(projectA, source), "unsupported");
    }
    // A link that stays inside the workspace is still contained.
    assert.equal((yield* t.read(projectA, inner)).contents, "needle inside\n");
    const found = yield* t.access.search(projectA, { query: "needle" });
    assert.notInclude(
      found.matches.map((match) => match.sourceId),
      file.sourceId,
    );
    assert.notInclude(
      found.matches.map((match) => match.sourceId),
      viaDir.sourceId,
    );
    assert.notInclude(JSON.stringify(found), "outside");
  }).pipe(Effect.scoped, Effect.provide(layerTest)),
);

it.effect("tracks the filesystem after registration without touching the registry", () =>
  Effect.gen(function* () {
    const t = yield* setup;
    const root = t.roots.get(projectA)!;
    const original = yield* t.write(projectA, "docs/spec.md", "needle one\n");
    yield* t.write(projectA, "docs/moved.md", "needle two\n");
    const spec = yield* t.register(projectA, "docs/spec.md");
    const moved = yield* t.register(projectA, "docs/moved.md");
    assert.equal((yield* t.read(projectA, spec)).contents, "needle one\n");
    assert.lengthOf((yield* t.access.search(projectA, { query: "needle" })).matches, 2);
    const before = yield* t.runtime.getStatus(projectA);
    const registry = yield* t.runtime.listSources(projectA, {});

    yield* t.fileSystem.remove(original);
    yield* t.fileSystem.rename(
      t.path.join(root, "docs/moved.md"),
      t.path.join(root, "docs/renamed.md"),
    );
    for (const source of [spec, moved]) {
      assert.equal(yield* t.healthOf(projectA, source), "missing");
      assert.equal(yield* errorTag(t.read(projectA, source)), "ProjectRuntimeSourceMissingError");
    }
    // The index may still know the old paths; a missing source never returns matches.
    assert.deepEqual((yield* t.access.search(projectA, { query: "needle" })).matches, []);
    assert.deepEqual(yield* t.runtime.getStatus(projectA), before);
    assert.deepEqual(yield* t.runtime.listSources(projectA, {}), registry);

    if (canSymlink) {
      yield* t.fileSystem.writeFileString(t.path.join(t.outside, "swap.md"), "needle escaped\n");
      yield* t.fileSystem.symlink(
        t.path.join(t.outside, "swap.md"),
        t.path.join(root, "docs/spec.md"),
      );
      assert.equal(
        yield* errorTag(t.read(projectA, spec)),
        "ProjectRuntimeSourceUnsupportedError:outside_workspace",
      );
      assert.equal(yield* t.healthOf(projectA, spec), "unsupported");
      assert.deepEqual((yield* t.access.search(projectA, { query: "needle" })).matches, []);
    }
    // Restoring the file restores access with no registry change.
    yield* t.fileSystem.remove(original);
    yield* t.fileSystem.writeFileString(original, "needle again\n");
    assert.equal((yield* t.read(projectA, spec)).contents, "needle again\n");
    assert.deepEqual(yield* t.runtime.getStatus(projectA), before);
  }).pipe(Effect.scoped, Effect.provide(layerTest)),
);

it.effect("keeps same-named files in different projects apart", () =>
  Effect.gen(function* () {
    const t = yield* setup;
    yield* t.write(projectA, "docs/notes.md", "needle from A\n");
    yield* t.write(projectB, "docs/notes.md", "needle from B\n");
    const a = yield* t.register(projectA, "docs/notes.md");
    const b = yield* t.register(projectB, "docs/notes.md");
    assert.notEqual(a.sourceId, b.sourceId);

    assert.equal((yield* t.read(projectA, a)).contents, "needle from A\n");
    assert.equal((yield* t.read(projectB, b)).contents, "needle from B\n");
    assert.equal(yield* errorTag(t.read(projectB, a)), "ProjectRuntimeNotFoundError");
    const matchesA = (yield* t.access.search(projectA, { query: "needle" })).matches;
    const matchesB = (yield* t.access.search(projectB, { query: "needle" })).matches;
    assert.deepEqual(
      matchesA.map((match) => [match.sourceId, match.path, match.lineContent]),
      [[a.sourceId, "docs/notes.md", "needle from A"]],
    );
    assert.deepEqual(
      matchesB.map((match) => [match.sourceId, match.path, match.lineContent]),
      [[b.sourceId, "docs/notes.md", "needle from B"]],
    );

    if (canSymlink) {
      yield* t.fileSystem.symlink(
        t.path.join(t.roots.get(projectB)!, "docs/notes.md"),
        t.path.join(t.roots.get(projectA)!, "cross.md"),
      );
      const cross = yield* t.register(projectA, "cross.md");
      assert.equal(
        yield* errorTag(t.read(projectA, cross)),
        "ProjectRuntimeSourceUnsupportedError:outside_workspace",
      );
    }
  }).pipe(Effect.scoped, Effect.provide(layerTest)),
);

it.effect("searches only enabled registered files and reports registered paths and ranges", () =>
  Effect.gen(function* () {
    const t = yield* setup;
    yield* t.write(projectA, "docs/a.md", "intro\nAlpha needle here\nneedle needle\n");
    yield* t.write(projectA, "docs/b.md", "second NEEDLE\n");
    yield* t.write(projectA, "docs/off.md", "disabled needle\n");
    yield* t.write(projectA, "docs/unregistered.md", "unregistered needle\n");
    yield* t.write(
      projectA,
      "assets/blob.bin",
      Buffer.concat([Buffer.from("needle "), Buffer.from([0])]),
    );
    const a = yield* t.register(projectA, "./docs/a.md");
    const b = yield* t.register(projectA, "docs/b.md");
    yield* t.register(projectA, "docs/off.md", { enabled: false });
    const binary = yield* t.register(projectA, "assets/blob.bin");

    const result = yield* t.access.search(projectA, { query: "needle" });
    assert.isFalse(result.truncated);
    assert.deepEqual(
      result.matches.map((match) => [
        match.sourceId,
        match.path,
        match.lineNumber,
        match.lineContent,
      ]),
      [
        [a.sourceId, "./docs/a.md", 2, "Alpha needle here"],
        [a.sourceId, "./docs/a.md", 3, "needle needle"],
        [b.sourceId, "docs/b.md", 1, "second NEEDLE"],
      ],
    );
    assert.deepEqual(result.matches[0]?.matchRanges, [{ start: 6, end: 12 }]);
    assert.deepEqual(result.matches[1]?.matchRanges, [
      { start: 0, end: 6 },
      { start: 7, end: 13 },
    ]);
    assert.notInclude(
      result.matches.map((match) => match.sourceId),
      binary.sourceId,
    );
    assert.notInclude(JSON.stringify(result), "unregistered");
    assert.notInclude(JSON.stringify(result), "disabled");

    // Unregistered files that match the same query never appear, whatever the limit.
    assert.lengthOf((yield* t.access.search(projectA, { query: "needle", limit: 100 })).matches, 3);
    assert.deepEqual((yield* t.access.search(projectA, { query: "unregistered" })).matches, []);
  }).pipe(Effect.scoped, Effect.provide(layerTest)),
);

it.effect("honors case, whole-word and regex options and the result limit", () =>
  Effect.gen(function* () {
    const t = yield* setup;
    yield* t.write(projectA, "docs/words.md", "Needle\nneedles\nneedle\nneeeedle\n");
    yield* t.register(projectA, "docs/words.md");
    const lines = (input: Parameters<typeof t.access.search>[1]) =>
      t.access
        .search(projectA, input)
        .pipe(Effect.map((result) => result.matches.map((match) => match.lineNumber)));

    assert.deepEqual(yield* lines({ query: "needle", caseSensitive: true }), [2, 3]);
    assert.deepEqual(yield* lines({ query: "needle", wholeWord: true }), [1, 3]);
    assert.deepEqual(
      yield* lines({ query: "ne+dle", useRegex: true, caseSensitive: true }),
      [2, 3, 4],
    );
    assert.deepEqual(yield* lines({ query: "^needle$", useRegex: true }), [1, 3]);

    const limited = yield* t.access.search(projectA, { query: "needle", limit: 2 });
    assert.deepEqual(
      limited.matches.map((match) => match.lineNumber),
      [1, 2],
    );
    assert.isTrue(limited.truncated);
    assert.isFalse((yield* t.access.search(projectA, { query: "needle", limit: 4 })).truncated);
  }).pipe(Effect.scoped, Effect.provide(layerTest)),
);

it.effect("bounds the serialized search result in UTF-8 bytes through the real index", () =>
  Effect.gen(function* () {
    const t = yield* setup;
    const cap = PROJECT_RUNTIME_BOUNDS.searchMaxBytes;
    const wire = (value: unknown) => Buffer.byteLength(JSON.stringify(value), "utf8");
    // Long folder name and two-byte characters: 100 matches are under the cap counted in
    // characters, but over it as serialized UTF-8 with source ID, keys and ranges.
    const relativePath = `${"p".repeat(200)}/wide.md`;
    yield* t.write(projectA, relativePath, `needle${"é".repeat(300)}\n`.repeat(100));
    const wide = yield* t.register(projectA, relativePath);

    const result = yield* t.access.search(projectA, { query: "needle" });
    const first = result.matches[0]!;
    assert.isBelow((first.path.length + first.lineContent.length) * 100, cap);
    assert.isTrue(result.truncated);
    assert.isAtMost(wire(result), cap);
    assert.isAbove(result.matches.length, 0);
    // Maximal: the next hit in line order would not have fit.
    const next = { ...first, lineNumber: result.matches.length + 1 };
    assert.isAbove(wire({ matches: [...result.matches, next], truncated: false }), cap);
    assert.deepEqual(
      result.matches.map((match) => match.lineNumber),
      Array.from({ length: result.matches.length }, (_, index) => index + 1),
    );
    assert.isTrue(result.matches.every((match) => match.sourceId === wide.sourceId));
  }).pipe(Effect.scoped, Effect.provide(layerTest)),
);

it.effect("filters and bounds whatever the index returns before it leaves Runtime", () => {
  const calls: Array<ProjectSearchContentsInput> = [];
  let raw: ProjectSearchContentsResult = { matches: [], truncated: false };
  const layerMocked = layerSourceAccess(
    Layer.mock(WorkspaceEntries.WorkspaceEntries)({
      searchContents: (input) =>
        Effect.sync(() => {
          calls.push(input);
          return raw;
        }),
    }),
  );
  return Effect.gen(function* () {
    const t = yield* setup;
    const hit = (path: string, lineNumber: number, lineContent: string, start = 0) => ({
      path,
      lineNumber,
      lineContent,
      matchRanges: [{ start, end: start + 6 }],
    });
    const longLine = `needle${"x".repeat(5_000)}needle`;
    raw = {
      truncated: false,
      matches: [
        hit("docs/other.md", 1, "unregistered needle"),
        hit("docs/b.md", 7, "needle b"),
        hit("../outside.md", 1, "needle escape"),
        hit("docs/gone.md", 1, "needle gone"),
        hit("docs/link.md", 1, "needle linked"),
        hit("docs/a.md", 9, "needle a"),
        {
          path: "docs/a.md",
          lineNumber: 3,
          lineContent: longLine,
          matchRanges: [
            { start: 0, end: 6 },
            { start: 5_006, end: 5_012 },
          ],
        },
        hit("docs/a.md", 4, longLine.slice(0, 5_020), 5_006),
      ],
    };
    yield* t.write(projectA, "docs/a.md", "x\n");
    yield* t.write(projectA, "docs/b.md", "x\n");
    yield* t.write(projectA, "docs/other.md", "x\n");
    const a = yield* t.register(projectA, "docs/a.md");
    const b = yield* t.register(projectA, "docs/b.md");
    // Registered, but unhealthy now: the index reporting them must not make them visible.
    yield* t.register(projectA, "docs/gone.md");
    yield* t.fileSystem.writeFileString(t.path.join(t.outside, "linked.md"), "needle linked\n");
    if (canSymlink) {
      yield* t.fileSystem.symlink(
        t.path.join(t.outside, "linked.md"),
        t.path.join(t.roots.get(projectA)!, "docs/link.md"),
      );
    }
    yield* t.register(projectA, "docs/link.md");

    const result = yield* t.access.search(projectA, {
      query: "needle",
      caseSensitive: true,
      wholeWord: true,
      useRegex: true,
    });
    assert.deepEqual(
      result.matches.map((match) => [match.sourceId, match.path, match.lineNumber]),
      [
        [a.sourceId, "docs/a.md", 3],
        [a.sourceId, "docs/a.md", 9],
        [b.sourceId, "docs/b.md", 7],
      ],
    );
    assert.lengthOf(result.matches[0]!.lineContent, PROJECT_RUNTIME_BOUNDS.searchLineMaxLength);
    assert.deepEqual(result.matches[0]!.matchRanges, [{ start: 0, end: 6 }]);
    // The second long line's only hit is past the clip, so it is dropped and flagged.
    assert.isTrue(result.truncated);
    assert.deepEqual(calls, [
      {
        cwd: t.roots.get(projectA)!,
        query: "needle",
        limit: 500,
        caseSensitive: true,
        wholeWord: true,
        useRegex: true,
      },
    ]);
    raw = { truncated: true, matches: [hit("docs/a.md", 1, "needle a")] };
    const capped = yield* t.access.search(projectA, { query: "needle" });
    assert.lengthOf(capped.matches, 1);
    assert.isTrue(capped.truncated);
  }).pipe(Effect.scoped, Effect.provide(layerMocked));
});

it.effect("preserves a U+FEFF at the start of any line after the first", () =>
  Effect.gen(function* () {
    const t = yield* setup;
    yield* t.write(projectA, "interior.md", "a\n\uFEFFb\n\uFEFFc\n");
    yield* t.write(projectA, "leading.md", "\uFEFFfirst\n\uFEFFsecond\n");
    const interior = yield* t.register(projectA, "interior.md");
    const leading = yield* t.register(projectA, "leading.md");

    assert.equal((yield* t.read(projectA, interior)).contents, "a\n\uFEFFb\n\uFEFFc\n");
    const fromSecond = yield* t.read(projectA, interior, { fromLine: 2, lineCount: 1 });
    assert.deepInclude(fromSecond, { contents: "\uFEFFb\n", byteLength: 5 });
    assert.equal((yield* t.read(projectA, interior, { fromLine: 3 })).contents, "\uFEFFc\n");
    // A file's own byte-order mark is not content, as with readFile; later lines are untouched.
    assert.equal((yield* t.read(projectA, leading)).contents, "first\n\uFEFFsecond\n");
    assert.equal((yield* t.read(projectA, leading, { fromLine: 2 })).contents, "\uFEFFsecond\n");
  }).pipe(Effect.scoped, Effect.provide(layerTest)),
);

it.effect("keeps a U+FEFF that opens a line cut by the byte cap", () =>
  Effect.gen(function* () {
    const t = yield* setup;
    yield* t.write(
      projectA,
      "cut.md",
      `top\n\uFEFF${"x".repeat(PROJECT_RUNTIME_BOUNDS.readMaxBytes)}\n`,
    );
    const source = yield* t.register(projectA, "cut.md");
    const cut = yield* t.read(projectA, source, { fromLine: 2 });
    assert.isTrue(cut.truncated);
    assert.isTrue(cut.contents.startsWith("\uFEFFx"));
    assert.equal(cut.byteLength, PROJECT_RUNTIME_BOUNDS.readMaxBytes);
  }).pipe(Effect.scoped, Effect.provide(layerTest)),
);

it.effect("probes health with a small bound instead of reading documents", () => {
  const lengths: Array<number> = [];
  return Effect.gen(function* () {
    const t = yield* setup;
    const body = "x".repeat(300_000);
    yield* t.write(projectA, "docs/big.md", body);
    yield* t.write(projectA, "docs/small.md", "tiny\n");
    const big = yield* t.register(projectA, "docs/big.md");
    const small = yield* t.register(projectA, "docs/small.md");

    const listed = yield* t.access.list(projectA, {});
    assert.deepEqual(
      listed.sources.map((entry) => [entry.source.sourceId, entry.health]).toSorted(),
      [
        [big.sourceId, "available"],
        [small.sourceId, "available"],
      ].toSorted(),
    );
    assert.lengthOf(lengths, 2);
    assert.isAtMost(Math.max(...lengths), 4_096);

    // A read still scans in larger chunks than the health probe.
    lengths.length = 0;
    yield* t.read(projectA, big);
    assert.isAbove(Math.max(...lengths), 4_096);
  }).pipe(
    Effect.scoped,
    Effect.provide(layerSourceAccess(layerRealEntries, (length) => lengths.push(length))),
  );
});

it.effect("bounds the whole serialized search result, not just paths and line text", () => {
  let raw: ProjectSearchContentsResult = { matches: [], truncated: false };
  const layerMocked = layerSourceAccess(
    Layer.mock(WorkspaceEntries.WorkspaceEntries)({ searchContents: () => Effect.sync(() => raw) }),
  );
  const cap = PROJECT_RUNTIME_BOUNDS.searchMaxBytes;
  const wire = (value: unknown) => Buffer.byteLength(JSON.stringify(value), "utf8");
  return Effect.gen(function* () {
    const t = yield* setup;
    yield* t.write(projectA, "docs/a.md", "x\n");
    const a = yield* t.register(projectA, "docs/a.md");
    const entryFor = (match: ProjectSearchContentsResult["matches"][number]) => ({
      sourceId: a.sourceId,
      path: "docs/a.md",
      lineNumber: match.lineNumber,
      lineContent: match.lineContent,
      matchRanges: match.matchRanges,
    });
    // The longest prefix of the raw matches whose serialized result still fits.
    const fittingPrefix = (matches: ProjectSearchContentsResult["matches"]) => {
      let count = 0;
      while (
        count < matches.length &&
        wire({ matches: matches.slice(0, count + 1).map(entryFor), truncated: false }) <= cap
      ) {
        count++;
      }
      return count;
    };
    const search = t.access.search(projectA, { query: "needle" });

    // Quotes, backslashes and control characters double or sextuple under JSON escaping, and
    // multibyte text doubles in UTF-8; the raw path plus line text stays far below the cap.
    const escaped = `"\\\u0001é`.repeat(80);
    raw = {
      truncated: false,
      matches: Array.from({ length: 100 }, (_, index) => ({
        path: "docs/a.md",
        lineNumber: index + 1,
        lineContent: escaped,
        matchRanges: [{ start: 0, end: 1 }],
      })),
    };
    assert.isBelow(100 * (wire("docs/a.md") + Buffer.byteLength(escaped)), cap);
    const escapedResult = yield* search;
    assert.isAtMost(wire(escapedResult), cap);
    assert.isTrue(escapedResult.truncated);
    assert.equal(escapedResult.matches.length, fittingPrefix(raw.matches));
    assert.isBelow(escapedResult.matches.length, 100);
    assert.deepEqual(
      escapedResult.matches,
      raw.matches.slice(0, escapedResult.matches.length).map(entryFor),
    );

    // Dense ranges dominate: 3 short lines with 1500 one-character hits each.
    const dense = {
      path: "docs/a.md",
      lineContent: "a".repeat(3_000),
      matchRanges: Array.from({ length: 1_500 }, (_, index) => ({
        start: index * 2,
        end: index * 2 + 1,
      })),
    };
    raw = { truncated: false, matches: [1, 2, 3].map((lineNumber) => ({ ...dense, lineNumber })) };
    const denseResult = yield* search;
    assert.isAtMost(wire(denseResult), cap);
    assert.isTrue(denseResult.truncated);
    assert.equal(denseResult.matches.length, fittingPrefix(raw.matches));
    assert.isBelow(denseResult.matches.length, 3);

    // One match that cannot fit alone is withheld and reported, never sent over the cap.
    raw = {
      truncated: false,
      matches: [
        {
          path: "docs/a.md",
          lineNumber: 1,
          lineContent: "a".repeat(4_000),
          matchRanges: Array.from({ length: 4_000 }, (_, index) => ({
            start: index,
            end: index + 1,
          })),
        },
      ],
    };
    assert.isAbove(wire(entryFor(raw.matches[0]!)), cap);
    const oversized = yield* search;
    assert.deepEqual(oversized, { matches: [], truncated: true });
  }).pipe(Effect.scoped, Effect.provide(layerMocked));
});

it.effect("reports truncation when the index stops at its per-file match ceiling", () =>
  Effect.gen(function* () {
    const t = yield* setup;
    const lines = (count: number, text: (index: number) => string) =>
      Array.from({ length: count }, (_, index) => `${text(index)}\n`).join("");
    yield* t.write(
      projectA,
      "many.md",
      lines(150, (index) => `needle ${index + 1}`),
    );
    yield* t.write(
      projectA,
      "few.md",
      lines(20, (index) => `other ${index + 1}`),
    );
    // Every raw hit in the first 100 lines fails the whole-word check; the real one is line 101.
    yield* t.write(projectA, "suffixed.md", `${lines(100, () => "needleSuffix")}needle\n`);
    yield* t.register(projectA, "many.md");
    yield* t.register(projectA, "few.md");
    yield* t.register(projectA, "suffixed.md");

    const many = yield* t.access.search(projectA, { query: "needle", limit: 100 });
    assert.lengthOf(
      many.matches.filter((match) => match.path === "many.md"),
      100,
    );
    assert.isTrue(many.truncated);

    const few = yield* t.access.search(projectA, { query: "other" });
    assert.lengthOf(few.matches, 20);
    assert.isFalse(few.truncated);

    const word = yield* t.access.search(projectA, { query: "needle", wholeWord: true, limit: 100 });
    assert.deepEqual(
      word.matches.filter((match) => match.path === "suffixed.md"),
      [],
    );
    assert.isTrue(word.truncated);
  }).pipe(Effect.scoped, Effect.provide(layerTest)),
);

it.effect("never persists source bodies in Runtime storage", () =>
  Effect.gen(function* () {
    const t = yield* setup;
    yield* t.write(projectA, "docs/body.md", `${BODY_MARKER} one\ntwo\n`);
    const source = yield* t.register(projectA, "docs/body.md");
    assert.include((yield* t.read(projectA, source)).contents, BODY_MARKER);
    assert.lengthOf((yield* t.access.search(projectA, { query: BODY_MARKER })).matches, 1);
    yield* t.access.list(projectA, {});

    const tables = yield* t.sql<{
      readonly name: string;
    }>`SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'project_runtime%'`;
    assert.isAbove(tables.length, 0);
    for (const { name } of tables) {
      const rows = yield* t.sql`SELECT * FROM ${t.sql(name)}`;
      assert.notInclude(JSON.stringify(rows), BODY_MARKER, name);
    }
  }).pipe(Effect.scoped, Effect.provide(layerTest)),
);
