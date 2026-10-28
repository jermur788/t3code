# Project Runtime

Project Runtime keeps durable, project-owned working state for agents. It stores
Project Instructions, a registry of source files, the current work, and continuation
notes with the project instead of in one chat thread. A new thread, or a thread on a
different provider, can then recover the work from saved state rather than from copied
chat history.

## Fork project home

On web and desktop, opening the fork lands on **Project Home** at `/home`. Choose a
project or checkout to see its durable identity, the Development Profile assigned to
it, and summaries of Project Instructions, sources, Project State, and tasks and
handoffs before you enter a thread. Each area links to its authoritative settings
surface. **Start a thread** continues into normal T3 work with that project already
selected.

Project Home does not read the current conversation or provider. A disabled Runtime
still shows project identity and the assigned profile; the Runtime areas say they are
disabled rather than showing remembered chat content. If no project exists, the home
asks you to add one. **Classic T3 Home** in the home actions opens the stock T3
experience; `/?classic=1` does the same.

Runtime is provider-neutral. It belongs to the project on one environment, not to
Claude, Codex, OpenCode, or any other provider. Changing the provider changes who
wrote a handoff; it does not change the project's instructions, sources, tasks, or
handoffs. Runtime does not replace T3 Code's threads, Git, worktrees, orchestration,
or portable thread handoffs.

V1 includes Project Instructions, the source registry and on-demand reads, Runtime
tasks with revision checks, immutable handoffs, agent access through T3 Code's MCP
tools, one-task worker execution, and web/desktop settings. It does not include
mobile Runtime settings, dedicated Runtime CLI commands, source snapshots or
memory, or a replacement for Git, worktrees, orchestration, delegated tasks, or
portable thread handoffs.

## Open Runtime

On web and desktop, select a project in Settings and open **Project → Project
Runtime**. If the project groups several checkouts, choose one environment and
checkout in the settings scope first. Runtime belongs to that checkout and is not
synchronized between environments. Mobile does not have a Runtime settings screen.

Choose **Enable Runtime** to start. **Disable Runtime** hides the editors but keeps
all Runtime records; enabling it again restores them. A read-only connection can
view the state but cannot change it. Runtime state is stored on the environment
server, so reconnecting or restarting T3 Code keeps it.

## Project Instructions

Project Instructions are working guidance owned by the project: conventions,
boundaries, and how work should be done. T3 supplies the current saved instructions
automatically before each agent turn, including the first turn in a fresh thread.
Changes apply to the next turn without restarting the server; they do not change
a turn already running. Clearing instructions affects later turns; an existing
conversation may retain an earlier snapshot in its prompt or provider history, so
start a new thread for a clean slate. Instructions remain subordinate to T3 Code's
own instructions and to your current request.

Edit the text and choose **Save instructions**; a draft is saved only when you
choose Save. The revision, update time, and author appear above the editor. If
another client saves first, your draft stays visible and the save is refused.
Choose **Discard draft and reload instructions** to load the newer record before
editing again.

## Shared development policy

[Development Profiles](development-profiles.md) let several projects inherit the
same development instructions. Assign a profile explicitly in project settings.
Project Instructions override conflicting profile guidance; registered sources
keep their existing role as evidence. Removing a profile assignment does not
change Project Instructions, sources, tasks, or handoffs.

## Registered sources

A source is a workspace-relative text file registered with the project. Choose
**Add source**, then give it a title, path, role (**authority**,
**implementation**, **knowledge**, or **reference**), and optionally a description
and an authority rank. Choose **Save source** to register it. The role and rank are
labels that help agents understand what a file is. Runtime records them but does not
enforce a ranking, and a higher rank is not proof that a file is correct.

The list shows each source's current health: **available**, **missing**,
**unreadable**, or **unsupported**. Health is a bounded accessibility probe of the
start of the file, not a promise that the whole file can be read. Choose
**Refresh sources** to probe again. **Disable source** keeps the registration but
excludes it from agent search and read. **Remove source** removes the registration
only; the workspace file stays in place. Editing uses the same revision check as the
other records: if the source changed first, your draft stays and you must discard and
reload it before saving.

Runtime does not copy, snapshot, or index source bodies into its own storage. Only
registered sources are returned to agents; unregistered workspace files are outside
Runtime's authority set. Agents search enabled registered sources and read the ranges
they need on demand. That search uses a bounded candidate window, so a truncated
result can be incomplete; narrow the query or read a known source directly when it
matters.

Sources are local workspace paths. Runtime does not add cloud sync, snapshots,
memory inference or automatic execution to them.

## Runtime tasks

A Runtime task is durable project work, independent of any one thread or delegated
execution. Record its title, status, owner, scope, objective, out-of-scope work,
acceptance criteria, verification plan, result, and next action. Statuses are
**planned**, **ready**, **active**, **blocked**, **review**, **done**, **deferred**,
and **cancelled**. A status change records workflow state, not verification,
review, or user acceptance.

A **blocked** task needs a blocker classification and summary. Moving it to another
status clears the blocker, and the editor says so before you save. A **done** task
needs a result; a handoff summary is not a task result. One line of acceptance
criteria becomes one criterion, and each new line receives a valid identifier
without exposing identifiers in the editor.

Verification is separate from lifecycle status. Passing milestones
(**static-pass**, **runtime-pass**, **review-pass**, **integrated**, **verified**)
need at least one passing evidence item, and **verified** cannot coexist with
failing evidence. Inconclusive evidence never counts as passing. Use **Reset
verification to none** when a claim no longer holds.

Choose **Create task** to add one and **Edit task** to change it. Every save checks
the revision you started from. If someone else saved first, your draft stays and
the save is refused; choose **Discard draft and reload task**, then reapply your
change. This stops one worker from silently overwriting another's work.

The recorded base metadata (repository, branch, revision, worktree, upstream
revision, and notes) describes the work's starting point. It does not create, move,
or verify a Git branch or worktree, rebind a thread, grant ownership, or authorize
writes. Use T3 Code's normal thread and worktree controls for that.

## Execute a task

A saved task can start one worker thread from its current state. Open **Edit
task**, review the task and its **Worker preference**, then choose **Execute
task**. T3 resolves the task, project, Development Profile, and normal T3 routing
layers again immediately before launch. The new thread receives a deterministic
packet containing the task and its latest handoff; routing is recorded as an
execution receipt, not written into the prompt as instructions.

Only **planned**, **ready**, and **active** tasks can execute. Execution uses the
task revision you loaded, so a concurrent edit is refused rather than launching a
stale task. One active attempt is allowed per task. The latest attempt shows its
status, provider and model, routing layer, failure if any, and a link to the
worker thread. A launched or pending attempt disables Execute; a failed attempt
lets you start a new one. Execution attempts persist across reconnects and server
restarts.

RTE-040 does not add cancellation, restart recovery, retries, or execution history
paging. Use the worker thread's normal T3 controls until those gates land.

## Handoffs

Choose **View handoffs** on a task to see its continuation records. A handoff
captures a checkpoint, a summary, a result, files changed, tests run and not run,
failures or risks, unresolved decisions, repository and integration state,
verification evidence, a next action, and optional provenance. The record the task
points to is marked **Latest**. Handoffs are written once and cannot be edited or
deleted. Each also records the task and Runtime revisions it was written against.

When an agent appends a handoff, T3 Code records the author, thread, provider, and
model from the invocation. That provenance shows who produced the note; it is not
project authority and does not make the note correct. A handoff is context for the
next worker, not proof: its test results and repository state are claims to check, and
it does not change the task's verification unless the same save records evidence for it.

## Agents and providers

When Runtime is enabled, an agent working in the project can read the bootstrap
context, discover sources, search and read them, list and update tasks, and append
or read handoffs. Agents cannot edit Project Instructions, change the source
registry, enable or disable Runtime, or delete records; those remain user actions
in Settings.

A fresh provider thread can retrieve the saved state through Runtime tools. This
is why changing providers keeps the project's instructions, sources, tasks, and
handoffs. Runtime itself starts one worker thread only through **Execute task** and
the existing orchestration launch path; it does not run provider commands directly.
