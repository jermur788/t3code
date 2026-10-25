# Project Runtime

Project Runtime stores durable, project-owned working state beside T3 Code's
orchestration state. It is an additive module: threads, providers, Git, worktrees,
orchestration, and portable thread handoffs keep their existing owners. Runtime adds
a project-scoped record of instructions, source descriptors, tasks, and append-only
handoffs, plus the MCP and settings surfaces that read them.

The module is deliberately provider-neutral. Provider behavior stays behind the
adapters. Project Runtime V1 itself added only the read tool names to Claude's
existing read-only MCP allowlist. Automatic instruction delivery adds narrow
transport seams in several adapters, but precedence, formatting, and bounds stay in
the shared resolution path. Runtime state belongs to a project row, not to a thread,
provider, or worktree.

## Modules

| Area                                                                                       | Responsibility                                                                                                                                              |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Contracts](../../packages/contracts/src/projectRuntime.ts)                                | Schemas, bounds, tagged errors, and the 14 `projectRuntime.*` RPC definitions in [projectRuntimeRpc.ts](../../packages/contracts/src/projectRuntimeRpc.ts). |
| [Service](../../apps/server/src/projectRuntime/ProjectRuntimeService.ts)                   | Domain operations, revision checks, JSON payload storage, and bootstrap reads.                                                                              |
| [Context packer](../../apps/server/src/projectRuntime/ProjectRuntimeContext.ts)            | Deterministic byte/count packing of the MCP bootstrap.                                                                                                      |
| [Source access](../../apps/server/src/projectRuntime/ProjectRuntimeSourceAccess.ts)        | Registry-only file reads, health probes, and registered-source search.                                                                                      |
| [MCP tools](../../apps/server/src/mcp/toolkits/project/runtimeTools.ts)                    | The 11 agent tools; handlers and provenance live in [runtimeHandlers.ts](../../apps/server/src/mcp/toolkits/project/runtimeHandlers.ts).                    |
| [Provider bootstrap](../../packages/provider-core/src/server/orchestrationInstructions.ts) | The shared, provider-neutral `Project Runtime` instruction section.                                                                                         |
| [Transport and UI](../../apps/server/src/projectRuntime/ProjectRuntimeRpc.ts)              | WebSocket handlers; the web client lives under [settings](../../apps/web/src/components/settings/ProjectRuntimeSettings.tsx).                               |
| [Fork migrations](../../apps/server/src/persistence/ForkMigrations.ts)                     | The isolated fork ledger, historical reconciliation, and the two Runtime/Profile migrations.                                                                |

## Persistence and deletion

`project_runtime` holds one row per project: the enabled flag, an aggregate revision,
and the current instructions with their own revision. Sources and tasks are child
tables with `project_id` foreign keys, a bounded JSON payload, a revision, and a
creation time. Handoffs are append-only child rows with a creation time and the
Runtime and task revisions they were written against. Every successful mutation
bumps the aggregate project revision. Status exposes it, and a handoff snapshots the
Runtime and task revisions current when it was appended.

Projects are soft-deleted, so the migration installs an `AFTER UPDATE OF deleted_at`
trigger that removes the `project_runtime` row in the event sink's existing commit
transaction; foreign keys cascade the children. Tests cover cascade, rollback, and
deleting a provenance thread without removing Runtime state. Runtime owns no
database of its own and does not synchronize between environments. The rows live in
the environment database, so a server restart does not reset them; PRT-070 verified
identical Runtime records and a fresh client after a restart.

Instructions, sources, and tasks use compare-and-set. The task update requires
`expectedRevision`; instructions and sources accept it optionally and the UI always
sends the revision it read. A stale value returns `ProjectRuntimeConflictError` with
the expected and current revisions. Conditional `UPDATE` checks also remain inside
the transaction. Callers must supply `expectedRevision` to detect a stale draft;
omitting the optional check for instructions or sources does not protect that draft.
Handoffs have no update or
delete path: the only operation is append, and their provenance and revision fields
are snapshots.

All service operations, including reads, currently run in a writer transaction
(`BEGIN IMMEDIATE`). This gives a consistent snapshot and makes the CAS atomic, but
it serializes Runtime reads against command and event writes. That is a known
contention and convention gap, not a measured performance result. A later change
should use the shared read-only connection where possible, while preserving writer
visibility for reads made inside write transactions; it is deferred post-V1.

## Authority and trust

The WebSocket boundary requires `orchestration:read` for the seven reads and
`orchestration:operate` for the seven mutations; the client permission map guards
those mutations so unavailable actions are hidden, while the server remains
authoritative. The settings UI only configures Runtime for one concrete environment
and checkout; a grouped project shows the selection message instead.

Agents reach Runtime through MCP. An agent in a T3 thread acts only on its own
project, and naming a different `projectId` is refused. A client outside a thread
must pass a project. Record IDs are resolved inside the selected project, so an ID
from another project is simply not found. Mutations use the existing environment
write check, and SQL, filesystem, and search failures are reported generically so no
internal path or query leaks.

Provenance is derived from the invocation, never from tool input: the thread, provider
instance, model, and actor are recorded by the server. A provider or model change
therefore changes handoff provenance, not project truth. Project Instructions are
project-owned guidance subordinate to system/developer instructions and the user's
current request. They override conflicting inherited Development Profile policy;
source authority remains separate from instruction precedence.

Source bytes are the most restricted resource. A read takes a source ID, never a
path; the registered relative path is revalidated on every call and resolved through
the workspace file service's canonical-root and symlink checks. The root is the
project's workspace, not the calling thread's worktree. Runtime stores descriptors,
not source bodies, and the bootstrap never contains file contents.

Source roles (`authority`, `implementation`, `knowledge`, `reference`) and the
optional authority rank are recorded and shown, but not enforced. Search order is by
registered path and source ID, not rank; a read returns the requested source. This is
intentional: authority is guidance for an agent's judgment, not an access-control
list, and the app does not treat a source as verified because of its label.

Health is a bounded prefix probe (512 bytes), so a file can be `available` at the
start and fail later; listing does not read whole documents. Reads return at most 400
lines and 65,536 UTF-8 bytes, and disabled sources are excluded. Search runs the
shared workspace content index and then filters to enabled, readable registered
paths. The index cannot be scoped to registered files, so Runtime collects at most
500 candidates before filtering. An empty result marked `truncated` is therefore not
proof that a source has no match: narrow the query or read the known source directly.
A source-scoped index is deferred rather than adding a parallel search engine.

## MCP and bootstrap

The toolkit exposes 11 tools: `t3_project_context`, source list/search/read, task
list/read/create/update, and handoff append/list/read. The eight reads carry read-only
annotations. There is deliberately no tool that edits Project Instructions, changes
the source registry, enables or disables Runtime, or deletes anything; those remain
user settings actions. Task update carries the destructive annotation; the revision
check is the guard.

`t3_project_context` is built from saved state in one transaction. The canonical
Development Profile resolver supplies the profile and enabled Runtime instruction
layers; it reads their persisted records without depending on Runtime service
construction. Context includes assigned profile metadata and effective instructions
alongside status, the full project instructions, descriptors for enabled sources, and summaries of active,
blocked, and review tasks with each task's latest handoff reference. Project instructions and canonical effective instructions keep their own bounds
outside the variable byte budget and are never truncated by packing; descriptors and
task summaries are packed greedily within the count and byte caps, and a
one-past-the-cap read tells the packer to report truncation. It never includes source
bodies or chat history. A disabled Runtime returns `enabled: false` with empty
Runtime collections and no project instructions. An assigned Development Profile
still applies and remains in context; disabling Runtime must not become a way to
disable inherited policy. The other Runtime data operations return the disabled
error.

Domain errors are returned as the tagged error (`failureMode: "return"`) so a stale
task write reaches the agent with its revision fields instead of being flattened to a
message. This is the difference between a Runtime task and a T3 delegated task: a
Runtime task is durable project state that can outlive threads and executions, while
a delegated task is one execution unit. Status changes do not establish verification
or acceptance.

The shared provider instructions contain one `Project Runtime` section, delivered
through the existing system, first-run, and ACP paths. It defines profile/project
precedence and directs agents to the canonical context instead of reconstructing
inheritance in provider adapters. A guard test asserts it
appears once and stays provider-neutral.

Instruction delivery is a separate provider seam. `RuntimePolicy` carries only
session-scoped state: modes, cwd, and approval/sandbox overrides. The effective
Project/Profile snapshot is resolved per turn in `ProviderTurnStartService` through
`ProjectInstructions` and passed as `turnInput.projectInstructions`. Codex adds
numbered additional-context entries chunked below its 4,000-byte limit. Claude,
ACP, Cursor, and Pi put the snapshot in the turn prompt; Muse and OpenCode use the
shared system-prompt builder. Claude's live-query reuse key excludes the snapshot, so
ordinary instruction edits do not replace the query. All adapters call the same
shared helpers, so precedence and bounds stay provider-neutral.

Claude's read-only T3 MCP allowlist remains a provider-specific seam; a future
Runtime read tool must be added there and to its test. Write tools are not
pre-approved.

## Extension points

A new Runtime capability normally needs the contract and RPC, a service method, an
MCP tool (and the Claude read allowlist when it is read-only), the settings UI, and
focused tests. Keep provider behavior in the adapter, not in Runtime. Replace the
existing source-access or search seam rather than adding a parallel path when
improving reads or search. New persistence needs a migration and a project-deletion
path so Runtime cleanup stays atomic with the event sink.

## Boundaries and deferred work

Runtime does not own Git branches, worktree creation or binding, orchestration,
delegated execution, or portable T3 thread handoffs. Task `branch`, `worktreePath`,
and `baseSha` are descriptive JSON only; the UI labels them as notes. Runtime has no
VCS imports and never rebinds a thread.

Native mobile Runtime settings and dedicated Runtime CLI commands do not exist. Web
and desktop share the settings UI; mobile and the CLI are not V1 Runtime surfaces.
The other known limits are the writer-transaction reads and the 500-candidate search
window above. Fork schema has its own ledger and migration registry, so it no longer collides with
upstream migration ids. Existing fork histories are reconciled in place; see
[Project Runtime release and verification](../operations/project-runtime-v1.md).
