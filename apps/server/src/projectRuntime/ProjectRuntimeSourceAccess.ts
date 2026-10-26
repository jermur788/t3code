import {
  PositiveInt,
  PROJECT_RUNTIME_BOUNDS,
  type ProjectContentMatch,
  type ProjectId,
  ProjectRuntimeInvalidRangeError,
  type ProjectRuntimeSource,
  ProjectRuntimeSourceDisabledError,
  type ProjectRuntimeSourceHealth,
  ProjectRuntimeSourceMissingError,
  ProjectRuntimeSourcePathError,
  ProjectRuntimeSourceReadInput,
  type ProjectRuntimeSourceListInput,
  type ProjectRuntimeSourceListResult,
  ProjectRuntimeSourceMatch,
  type ProjectRuntimeSourceReadResult,
  ProjectRuntimeSourceSearchInput,
  ProjectRuntimeSourceSearchResult,
  ProjectRuntimeSourceUnsupportedError,
} from "@t3tools/contracts";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import * as ProjectStore from "../orchestration-v2/ProjectStore.ts";
import { ProjectNotFoundError } from "../project/ProjectService.ts";
import * as WorkspaceEntries from "../workspace/WorkspaceEntries.ts";
import * as WorkspaceFileSystem from "../workspace/WorkspaceFileSystem.ts";
import * as WorkspacePaths from "../workspace/WorkspacePaths.ts";
import * as ProjectRuntimeService from "./ProjectRuntimeService.ts";

type RuntimeFailure = Effect.Error<
  ReturnType<ProjectRuntimeService.ProjectRuntimeService["Service"]["readSource"]>
>;
type AccessError = RuntimeFailure | ProjectStore.ProjectStoreV2Error;
type SearchError = AccessError | WorkspaceEntries.WorkspaceEntriesError;

export class ProjectRuntimeSourceAccess extends Context.Service<
  ProjectRuntimeSourceAccess,
  {
    /**
     * Registry metadata plus health derived at call time from a bounded prefix
     * probe. Disabled sources are listed with their real health.
     */
    readonly list: (
      projectId: ProjectId,
      input: ProjectRuntimeSourceListInput,
    ) => Effect.Effect<ProjectRuntimeSourceListResult, AccessError>;
    /** Takes a source ID only; the path always comes from the registry record. */
    readonly read: (
      projectId: ProjectId,
      input: ProjectRuntimeSourceReadInput,
    ) => Effect.Effect<ProjectRuntimeSourceReadResult, AccessError>;
    /**
     * Content search over the project workspace through the shared search index, narrowed to
     * enabled, healthy registered sources before anything leaves this service.
     */
    readonly search: (
      projectId: ProjectId,
      input: ProjectRuntimeSourceSearchInput,
    ) => Effect.Effect<ProjectRuntimeSourceSearchResult, SearchError>;
  }
>()("t3/projectRuntime/ProjectRuntimeSourceAccess") {}

// A read decodes this before the contract's bound so an oversized lineCount is a
// structured range error rather than a schema failure.
const ReadInput = Schema.Struct({
  ...ProjectRuntimeSourceReadInput.fields,
  lineCount: Schema.optionalKey(PositiveInt),
});
const decodeReadInput = Schema.decodeUnknownEffect(ReadInput);
const decodeSearchInput = Schema.decodeUnknownEffect(ProjectRuntimeSourceSearchInput);

// A read scans a file in chunks of this size, and WorkspaceFileSystem rejects any chunk with a
// NUL byte as binary.
const READ_CHUNK_BYTES = PROJECT_RUNTIME_BOUNDS.readMaxBytes;
// Health is a current look at the head of the file, not a certificate for all of it: listing must
// not cost a document read per source. It matches the header sniff the filesystem service already
// uses, so a NUL later in the file shows as available until a read reaches it.
const HEALTH_PROBE_BYTES = 512;
const encodeMatchJson = Schema.encodeSync(Schema.fromJsonString(ProjectRuntimeSourceMatch));
// What the empty result serializes to, with the longer boolean so the final result never exceeds
// the cap whichever way `truncated` ends up.
const SEARCH_ENVELOPE_BYTES = Buffer.byteLength(
  Schema.encodeSync(Schema.fromJsonString(ProjectRuntimeSourceSearchResult))({
    matches: [],
    truncated: false,
  }),
  "utf8",
);
// WorkspaceEntries' own cap on content-search results. The index cannot be scoped to
// files, so registered matches are filtered out of this window.
const SEARCH_CANDIDATE_LIMIT = 500;

const compareText = (left: string, right: string) => (left < right ? -1 : left > right ? 1 : 0);

const utf8Bytes = (text: string) => Buffer.byteLength(text, "utf8");

const errnoCode = (cause: unknown) =>
  typeof cause === "object" && cause !== null && "code" in cause ? cause.code : undefined;

const healthOf = (
  error:
    | ProjectRuntimeSourcePathError
    | ProjectRuntimeSourceMissingError
    | ProjectRuntimeSourceUnsupportedError,
): ProjectRuntimeSourceHealth =>
  error._tag === "ProjectRuntimeSourceMissingError"
    ? "missing"
    : error._tag === "ProjectRuntimeSourceUnsupportedError" && error.reason === "unreadable"
      ? "unreadable"
      : "unsupported";

// Keeps every U+FEFF; each line is decoded on its own, so the default decoder would take one that
// opens any line for a byte-order mark.
const lineDecoder = new TextDecoder("utf-8", { ignoreBOM: true });

/** A file's own byte-order mark is not content, as with `readFile`; a later U+FEFF is. */
const decodeLine = (bytes: Uint8Array, lineNumber: number) => {
  const text = lineDecoder.decode(bytes);
  return lineNumber === 1 && text.startsWith("\uFEFF") ? text.slice(1) : text;
};

/** Decodes without inventing replacement bytes past `maxBytes`, and never splits a character. */
const fitUtf8 = (raw: Buffer, maxBytes: number, lineNumber: number) => {
  let end = Math.min(raw.length, maxBytes);
  while (end > 0 && end < raw.length && ((raw[end] ?? 0) & 0xc0) === 0x80) end--;
  let text = decodeLine(raw.subarray(0, end), lineNumber);
  // Invalid bytes decode to a 3-byte replacement character, so re-measure.
  while (utf8Bytes(text) > maxBytes) {
    const last = text.charCodeAt(text.length - 1);
    text = text.slice(0, last >= 0xdc00 && last <= 0xdfff ? -2 : -1);
  }
  return text;
};

// Collect a line window without holding more than one line. A line keeps its
// "\n", so content stays verbatim and a final unterminated line gets no extra
// terminator. Decoded UTF-8 is never smaller than raw bytes, so a line over the
// byte budget cannot fit and need not be buffered.
const makeLineWindow = (options: {
  readonly fromLine: number;
  readonly lineCount: number;
  readonly maxBytes: number;
}) => {
  const lines: Array<string> = [];
  let usedBytes = 0;
  let lineNumber = 1;
  let pending: Array<Buffer> = [];
  let pendingBytes = 0;
  let endOffset = 0;
  let partial = false;
  let done = false;

  const cutLine = () => {
    // Only a line that cannot fit even alone is cut; otherwise it waits for the next page.
    if (lines.length === 0) {
      const text = fitUtf8(Buffer.concat(pending), options.maxBytes, lineNumber);
      lines.push(text);
      usedBytes = utf8Bytes(text);
      partial = true;
    }
    pending = [];
    pendingBytes = 0;
    done = true;
  };
  const finishLine = (nextOffset: number) => {
    const text = decodeLine(Buffer.concat(pending), lineNumber);
    const bytes = utf8Bytes(text);
    if (usedBytes + bytes > options.maxBytes) return cutLine();
    pending = [];
    pendingBytes = 0;
    lines.push(text);
    usedBytes += bytes;
    endOffset = nextOffset;
    if (lines.length === options.lineCount) done = true;
  };

  return {
    /** Returns true once the window is complete and no more chunks are needed. */
    push: (chunk: Buffer, chunkOffset: number) => {
      let start = 0;
      for (;;) {
        if (done || start >= chunk.length) break;
        const newline = chunk.indexOf(0x0a, start);
        const segmentEnd = newline === -1 ? chunk.length : newline + 1;
        if (lineNumber >= options.fromLine) {
          pending.push(chunk.subarray(start, segmentEnd));
          pendingBytes += segmentEnd - start;
          if (pendingBytes > options.maxBytes) {
            cutLine();
            break;
          }
        }
        if (newline === -1) break;
        if (lineNumber >= options.fromLine) finishLine(chunkOffset + segmentEnd);
        lineNumber++;
        start = segmentEnd;
      }
      return done;
    },
    finish: (fileEnd: number) => {
      if (done) return;
      if (lineNumber >= options.fromLine && pendingBytes > 0) finishLine(fileEnd);
      if (!done) endOffset = fileEnd;
    },
    result: (fileSize: number) => ({
      contents: lines.join(""),
      // An empty range ends just before it starts.
      toLine: options.fromLine + lines.length - 1,
      byteLength: usedBytes,
      truncated: partial || endOffset < fileSize,
    }),
  };
};

/** Clips to the contract's line length at a character boundary, keeping only visible ranges. */
const clipMatch = (match: ProjectContentMatch) => {
  const max = PROJECT_RUNTIME_BOUNDS.searchLineMaxLength;
  if (match.lineContent.length <= max) return { match, clipped: false };
  const last = match.lineContent.charCodeAt(max - 1);
  const end = last >= 0xd800 && last <= 0xdbff ? max - 1 : max;
  return {
    match: {
      ...match,
      lineContent: match.lineContent.slice(0, end),
      matchRanges: match.matchRanges
        .filter((range) => range.start < end)
        .map((range) => ({ start: range.start, end: Math.min(range.end, end) })),
    },
    clipped: true,
  };
};

const make = Effect.gen(function* () {
  const runtime = yield* ProjectRuntimeService.ProjectRuntimeService;
  const projects = yield* ProjectStore.ProjectStoreV2;
  const workspacePaths = yield* WorkspacePaths.WorkspacePaths;
  const workspaceFileSystem = yield* WorkspaceFileSystem.WorkspaceFileSystem;
  const workspaceEntries = yield* WorkspaceEntries.WorkspaceEntries;

  /** The project's workspace, never a thread's worktree. */
  const workspaceRoot = Effect.fn("ProjectRuntimeSourceAccess.workspaceRoot")(function* (
    projectId: ProjectId,
  ) {
    const row = yield* projects.get(projectId);
    if (Option.isNone(row)) return yield* new ProjectNotFoundError({ projectId });
    return row.value.workspaceRoot;
  });

  /**
   * The only door to a source's bytes. The registered path is revalidated on every call, since
   * the registry check at create time says nothing about the filesystem now, and resolution is
   * the workspace-relative one that checks the canonical path against the canonical root.
   */
  const readRange = Effect.fn("ProjectRuntimeSourceAccess.readRange")(function* (
    root: string,
    source: ProjectRuntimeSource,
    offset: number,
    length: number,
  ) {
    const { projectId, sourceId, relativePath } = source;
    yield* ProjectRuntimeService.validatePath(projectId, relativePath);
    const unsupported = (reason: ProjectRuntimeSourceUnsupportedError["reason"]) =>
      Effect.fail(
        new ProjectRuntimeSourceUnsupportedError({ projectId, sourceId, relativePath, reason }),
      );
    const chunk = yield* workspaceFileSystem
      .readFileRange({ cwd: root, relativePath, offset, length })
      .pipe(
        Effect.catchTags({
          WorkspacePathOutsideRootError: () =>
            Effect.fail(
              new ProjectRuntimeSourcePathError({
                projectId,
                relativePath,
                reason: "outside_workspace",
              }),
            ),
          WorkspaceFilePathEscapeError: () => unsupported("outside_workspace"),
          WorkspacePathNotFileError: () => unsupported("not_a_file"),
          WorkspaceBinaryFileError: () => unsupported("binary"),
          WorkspaceFileSystemOperationError: (error) => {
            const code = errnoCode(error.cause);
            return code === "ENOENT" || code === "ENOTDIR"
              ? Effect.fail(
                  new ProjectRuntimeSourceMissingError({ projectId, sourceId, relativePath }),
                )
              : unsupported("unreadable");
          },
        }),
      );
    return chunk;
  });

  const health = Effect.fn("ProjectRuntimeSourceAccess.health")(function* (
    root: string,
    source: ProjectRuntimeSource,
  ) {
    return yield* readRange(root, source, 0, HEALTH_PROBE_BYTES).pipe(
      Effect.as("available" as const satisfies ProjectRuntimeSourceHealth),
      Effect.catchTags({
        ProjectRuntimeSourcePathError: (error) => Effect.succeed(healthOf(error)),
        ProjectRuntimeSourceMissingError: (error) => Effect.succeed(healthOf(error)),
        ProjectRuntimeSourceUnsupportedError: (error) => Effect.succeed(healthOf(error)),
      }),
    );
  });

  const list: ProjectRuntimeSourceAccess["Service"]["list"] = Effect.fn(
    "ProjectRuntimeSourceAccess.list",
  )(function* (projectId, input) {
    const page = yield* runtime.listSources(projectId, input);
    const root = yield* workspaceRoot(projectId);
    const sources = yield* Effect.forEach(
      page.sources,
      (source) =>
        health(root, source).pipe(Effect.map((sourceHealth) => ({ source, health: sourceHealth }))),
      { concurrency: 8 },
    );
    return { sources, nextCursor: page.nextCursor };
  });

  const read: ProjectRuntimeSourceAccess["Service"]["read"] = Effect.fn(
    "ProjectRuntimeSourceAccess.read",
  )(function* (projectId, input) {
    const {
      sourceId,
      fromLine = 1,
      lineCount = PROJECT_RUNTIME_BOUNDS.readMaxLines,
    } = yield* decodeReadInput(input);
    if (lineCount > PROJECT_RUNTIME_BOUNDS.readMaxLines) {
      return yield* new ProjectRuntimeInvalidRangeError({
        projectId,
        sourceId,
        fromLine,
        lineCount,
        maxLines: PROJECT_RUNTIME_BOUNDS.readMaxLines,
      });
    }
    const source = yield* runtime.readSource(projectId, sourceId);
    if (!source.enabled)
      return yield* new ProjectRuntimeSourceDisabledError({ projectId, sourceId });
    const root = yield* workspaceRoot(projectId);

    const window = makeLineWindow({
      fromLine,
      lineCount,
      maxBytes: PROJECT_RUNTIME_BOUNDS.readMaxBytes,
    });
    let offset = 0;
    for (;;) {
      const chunk = yield* readRange(root, source, offset, READ_CHUNK_BYTES);
      if (window.push(chunk.bytes, offset))
        return finishRead(source, fromLine, window.result(chunk.size));
      offset += chunk.bytes.length;
      if (chunk.bytes.length === 0 || offset >= chunk.size) {
        window.finish(offset);
        return finishRead(source, fromLine, window.result(chunk.size));
      }
    }
  });

  /** Every page of registry metadata; the registry is small and has no filesystem cost. */
  const allSources = Effect.fn("ProjectRuntimeSourceAccess.allSources")(function* (
    projectId: ProjectId,
  ) {
    const sources: Array<ProjectRuntimeSource> = [];
    let cursor: number | null = 0;
    while (cursor !== null) {
      const page: Effect.Success<ReturnType<typeof runtime.listSources>> =
        yield* runtime.listSources(projectId, {
          cursor,
          limit: PROJECT_RUNTIME_BOUNDS.listMaxLimit,
        });
      sources.push(...page.sources);
      cursor = page.nextCursor;
    }
    return sources;
  });

  const search: ProjectRuntimeSourceAccess["Service"]["search"] = Effect.fn(
    "ProjectRuntimeSourceAccess.search",
  )(function* (projectId, input) {
    const data = yield* decodeSearchInput(input);
    const limit = data.limit ?? PROJECT_RUNTIME_BOUNDS.searchMaxLimit;
    const registered = yield* allSources(projectId);
    const root = yield* workspaceRoot(projectId);
    const none = { matches: [], truncated: false };

    // Lexically valid, enabled sources keyed by the workspace-relative path the index reports.
    const byPath = new Map<string, Array<ProjectRuntimeSource>>();
    for (const source of registered) {
      if (!source.enabled) continue;
      const target = yield* workspacePaths
        .resolveRelativePathWithinRoot({ workspaceRoot: root, relativePath: source.relativePath })
        .pipe(Effect.option);
      if (Option.isNone(target)) continue;
      byPath.set(target.value.relativePath, [
        ...(byPath.get(target.value.relativePath) ?? []),
        source,
      ]);
    }
    if (byPath.size === 0) return none;

    const found = yield* workspaceEntries
      .searchContents({
        cwd: root,
        query: data.query,
        limit: SEARCH_CANDIDATE_LIMIT,
        caseSensitive: data.caseSensitive ?? false,
        wholeWord: data.wholeWord ?? false,
        useRegex: data.useRegex ?? false,
      })
      .pipe(
        // Without a usable workspace root no source can be available.
        Effect.catchTags({
          WorkspaceRootNotExistsError: () => Effect.void,
          WorkspaceRootNotDirectoryError: () => Effect.void,
          WorkspaceRootStatFailedError: () => Effect.void,
        }),
      );
    if (found === undefined) return none;

    // Raw matches grouped once by the path they were found at, in line order. Unregistered paths
    // never enter the map.
    const hitsByPath = new Map<string, Array<ProjectContentMatch>>();
    for (const match of found.matches) {
      if (!byPath.has(match.path)) continue;
      const hits = hitsByPath.get(match.path);
      if (hits === undefined) hitsByPath.set(match.path, [match]);
      else hits.push(match);
    }
    for (const hits of hitsByPath.values()) {
      hits.sort((left, right) => left.lineNumber - right.lineNumber);
    }
    // Registered path, then source: stable whatever order the index reports. Only sources whose
    // path matched appear, and each is probed once, when its turn comes.
    const ordered = [...hitsByPath.entries()]
      .flatMap(([path, hits]) => (byPath.get(path) ?? []).map((source) => ({ source, hits })))
      .toSorted(
        (left, right) =>
          compareText(left.source.relativePath, right.source.relativePath) ||
          compareText(left.source.sourceId, right.source.sourceId),
      );

    const matches: Array<ProjectRuntimeSourceMatch> = [];
    let truncated = found.truncated;
    let usedBytes = SEARCH_ENVELOPE_BYTES;
    let full = false;
    for (const { source, hits } of ordered) {
      if (full) break;
      if ((yield* health(root, source)) !== "available") continue;
      for (const hit of hits) {
        if (matches.length >= limit) {
          truncated = true;
          full = true;
          break;
        }
        const { match, clipped } = clipMatch(hit);
        if (clipped) truncated = true;
        // A hit that lies wholly past the clip would show a line with nothing highlighted.
        if (match.matchRanges.length === 0) continue;
        const entry: ProjectRuntimeSourceMatch = {
          sourceId: source.sourceId,
          path: source.relativePath,
          lineNumber: match.lineNumber,
          lineContent: match.lineContent,
          matchRanges: match.matchRanges,
        };
        // The cap is on the serialized result, so each entry costs what JSON writes for all of
        // its fields (escapes, ranges, keys) plus the comma that joins it to the previous one.
        const bytes = utf8Bytes(encodeMatchJson(entry)) + (matches.length === 0 ? 0 : 1);
        if (usedBytes + bytes > PROJECT_RUNTIME_BOUNDS.searchMaxBytes) {
          truncated = true;
          full = true;
          break;
        }
        usedBytes += bytes;
        matches.push(entry);
      }
    }
    return { matches, truncated };
  });

  return ProjectRuntimeSourceAccess.of({ list, read, search });
});

const finishRead = (
  source: ProjectRuntimeSource,
  fromLine: number,
  result: ReturnType<ReturnType<typeof makeLineWindow>["result"]>,
): ProjectRuntimeSourceReadResult => ({ source, health: "available", fromLine, ...result });

export const layer = Layer.effect(ProjectRuntimeSourceAccess, make);
