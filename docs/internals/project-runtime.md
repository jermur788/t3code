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
| [Turn context](../../packages/provider-core/src/server/turnContext.ts)                     | Authority, ordering, bounds, and chunking for turn-scoped context that never enters provider session identity.                                              |
| [Transport and UI](../../apps/server/src/projectRuntime/ProjectRuntimeRpc.ts)              | WebSocket handlers; the web client lives under [settings](../../apps/web/src/components/settings/ProjectRuntimeSettings.tsx).                               |
| [Fork migrations](../../apps/server/src/persistence/ForkMigrations.ts)                     | The isolated fork ledger, historical reconciliation, and the four Runtime, Profile, Task/Handoff, and Routing migrations.                                   |

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

## Task and handoff state

Task and handoff payloads use the v1 shape. Fork migration `3_TaskHandoffState`, the
third fork migration, rewrites pre-v1 rows in place, preserving revisions and
timestamps. It is shape-aware, so rerunning it leaves v1 rows byte for
byte unchanged. Legacy data is never upgraded into stronger claims than it made: a
flat `baseSha` becomes `base.revision`, free-text acceptance criteria become numbered
criteria, a missing owner takes the task's `createdBy`, and prose verification becomes
`inconclusive` evidence at milestone `none`, never `pass`. `latestHandoffId` is
backfilled in the service's handoff order (`created_at`, `handoff_id`).

A task carries a lifecycle `status` (`planned`, `ready`, `active`, `blocked`,
`review`, `done`, `deferred`, `cancelled`), an `owner` (the acting actor on create
when omitted), acceptance criteria with stable ids, an optional `result` and
`nextAction`, a `blocker`, a `verification` record, and `latestHandoffId`. The nested
`base` (repository, branch, revision, worktree path, upstream revision, notes)
describes where the work started; like the rest of the task it is data, not a
binding. The service enforces these invariants on every write:

- `blocked` requires a `blocker`, and a `blocker` requires `blocked`.
- `done` requires a non-empty `result`.
- Any passing milestone (`static-pass`, `runtime-pass`, `review-pass`, `integrated`,
  `verified`) needs at least one `pass` evidence entry, and `verified` forbids `fail`
  entries. `inconclusive` evidence supports no milestone.

Violations return `ProjectRuntimeInvalidTransitionError` with the violated rule. On
update, an omitted key leaves a field unchanged and `null` clears an optional field;
`blocker: null` clears the blocker and `verification: null` resets it to `none`.
Verification is separate from lifecycle: moving a task to `done` or `review` neither
raises the milestone nor counts as acceptance, and a later write may lower a
milestone. The rules apply to the task a write would produce, so a migrated task
that is invalid under them (a legacy `blocked` task has no blocker) stays readable,
appears in context without a blocker summary, and is repaired by its first valid
write: supply a blocker or change the status, in an update or in an append's
`taskState`.

`handoff_append` is compare-and-set on `expectedTaskRevision`, with an optional
`taskState` (status, result, blocker, verification) applied in the same transaction:
the handoff row, the task update, and `latestHandoffId` commit together or not at
all. A stale revision appends nothing and changes nothing, and an invalid
`taskState` rejects the whole append. The handoff snapshots the Runtime and task
revisions it was written against, and the server records the thread, provider
instance, model, and actor from the invocation.

A handoff is context, not proof. Its `verification` and `repositoryState` are the
author's claims at that point; they do not raise the task's milestone by
themselves and do not replace checking the repository. A continuing agent
reconciles the handoff against Git and tests before relying on it.

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
blocked, and review tasks (in that order). A task summary is a projection of the task
record: status, verification milestone, a blocker summary clipped to 200 characters,
the next action, and a reference to the handoff named by `latestHandoffId`, which is
the only authority for which handoff is latest. Project instructions and canonical
effective instructions keep their own bounds
outside the variable byte budget and are never truncated by packing; descriptors and
task summaries are packed greedily within 50 sources, 50 tasks, and a 65,536-byte
serialized budget, and a one-past-the-cap read tells the packer to report truncation.
A task whose handoff reference does not fit keeps its milestone and blocker summary
and sets `truncated.handoffs`. Context is built only from persisted Runtime and
Profile records. It never includes source bodies, verification evidence, a handoff
beyond that reference, or any thread's messages. A disabled Runtime returns `enabled: false` with empty
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
`ProjectInstructions`, converted to a privileged `TurnContextEntry`, and passed as
`turnInput.turnContext`. The generic contract records authority, ordering,
provenance, and chunking; adapters choose only the transport. Codex maps privileged
entries to application additional context and untrusted entries to untrusted
context, chunked below its 4,000-byte limit. Claude uses a separate prompt block.
ACP, Cursor, OpenCode, and Pi use the shared prompt/runtime helpers; Muse uses the
shared runtime text per turn. Claude's live-query reuse key excludes the snapshot,
and OpenCode's session instructions stay static, so ordinary instruction edits do
not replace a provider session. The static `Project Runtime` section in
`T3_CODE_ORCHESTRATION_SECTIONS` remains universal guidance; dynamic Profile/Project
values travel only through turn context.

Claude's read-only T3 MCP allowlist remains a provider-specific seam; a future
Runtime read tool must be added there and to its test. Write tools are not
pre-approved.

## Routing

Runtime tasks, projects, and Development Profiles can carry structured worker
routes. Routing is configuration and resolution only: it selects and rejects
candidates but launches no worker. Precedence, fallback, eligibility,
persistence ownership, and concurrency are documented in
[Runtime routing](./runtime-routing.md). Routing is deliberately absent from the
MCP bootstrap and `t3_project_context`, so the agent-context budget is unchanged.

## Extension points

A new Runtime capability normally needs the contract and RPC, a service method, an
MCP tool (and the Claude read allowlist when it is read-only), the settings UI, and
focused tests. Keep provider behavior in the adapter, not in Runtime. Replace the
existing source-access or search seam rather than adding a parallel path when
improving reads or search. New persistence needs a migration and a project-deletion
path so Runtime cleanup stays atomic with the event sink.

## Boundaries and deferred work

Runtime does not own Git branches, worktree creation or binding, orchestration,
delegated execution, or portable T3 thread handoffs. Task `base` fields describe
the recorded starting point; worktree-isolated execution uses the recorded revision
or branch (then `HEAD`) as a new worktree base and checks it, but Runtime has no VCS
imports and never moves or rebinds an existing worktree or thread.

Execution attempts are the exception on the read side: RTE-040 records that a
Runtime task launch was attempted and which worker thread/run it produced, using
the existing orchestration launch service rather than a second engine. RTE-050
reconciles those attempts against their thread/run state at startup, links a
handoff written by the worker thread, and cancels through the existing
orchestration thread-stop command. The attempt and its routing receipt are
project-owned; the thread, run, provider session, and cancellation mechanics stay
with orchestration.

Native mobile Runtime settings and dedicated Runtime CLI commands do not exist. Web
and desktop share the settings UI; mobile and the CLI are not V1 Runtime surfaces.
The other known limits are the writer-transaction reads and the 500-candidate search
window above. Fork schema has its own ledger and migration registry, so it no longer collides with
upstream migration ids. Existing fork histories are reconciled in place; see
[Project Runtime release and verification](../operations/project-runtime-v1.md).
