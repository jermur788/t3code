# T3 Fork Reference

Use this file for facts that are needed occasionally during operation. The normal workflow is in [T3 Fork Operator Manual](manual.md).

## Configuration locations

| Item | Location / owner |
| --- | --- |
| Provider connections and instances | **Settings → Providers** on the selected environment. Provider authentication remains provider-owned. |
| Development Profiles | **Settings → Development Profiles**. Profiles persist on the environment server. |
| Project profile assignment and project worker routing | Selected project settings. |
| Project Runtime | **Settings → Project → Project Runtime** for one concrete environment/checkout. |
| Runtime tasks, handoffs, source registrations, instructions | Environment database, project-scoped. |
| Execution attempts and routing receipts | Environment database, project-scoped. |
| Registered source bodies | Workspace files themselves; Runtime stores descriptors, not copies. |

The server derives its SQLite database as:

```text
<baseDir>/<dev-or-userdata>/statev2.sqlite
```

The exact `<baseDir>` depends on how that environment was started. Do not guess a live path when making backups or running migration tests. An explicit isolated development home can be selected with:

```sh
vp run dev --home-dir <isolated-home> --no-seed
```

For qualification or migration work, use a fresh isolated home. Never point an experimental/upstream build at the active fork database.

## Worker roles

| Role | Meaning |
| --- | --- |
| `implementation` | Make the requested change. |
| `research` | Gather evidence or investigate. |
| `review` | Independently inspect existing work. |
| `design` | Produce design or architecture work. |
| `test` | Exercise/qualify behavior. |
| `general` | Work not covered by a narrower role. |

A role belongs to an execution attempt, not to a permanent agent persona.

## Routing precedence

Highest to lowest:

1. explicit one-run override;
2. task routing;
3. project routing;
4. assigned Development Profile routing;
5. ordinary T3 inheritance.

A layer participates only when it has an entry for the resolved role. The role itself resolves from a one-run override role first, then task role, then caller-supplied role, defaulting to `implementation`.

Routing selects a preference. It does not grant permission or bypass provider registration, authentication, project provider settings, model support, runtime/interaction modes, or orchestration authorization.

The Runtime task `Execute task` RPC currently accepts the task/revision/request identity, not an ad-hoc one-run worker override. The one-run layer is therefore a resolver contract for callers that explicitly supply it, while the current task UI executes the saved task/project/profile policy.

## Routing fallback semantics

After a layer's ordered candidates are exhausted:

| Fallback | Result |
| --- | --- |
| `continue` | Evaluate the next lower Runtime routing layer. |
| `inherit` | Stop Runtime routing and use ordinary T3 inheritance; do not evaluate lower Runtime layers. |
| `fail` | Refuse routing; do not silently inherit. |

Development Profile routing is the terminal Runtime layer, so profile entries support only `inherit` and `fail`.

A one-run explicit override is fail-closed: if its candidate cannot run, resolution fails instead of falling through.

An empty candidate list is meaningful. With `inherit` it deliberately disables Runtime routing for that role; with `fail` it deliberately requires a Runtime route that is not currently available.

## Task states

Runtime task lifecycle values:

| State | Meaning |
| --- | --- |
| `planned` | Recorded but not yet ready for execution. |
| `ready` | Ready to be worked. |
| `active` | Work is in progress. |
| `blocked` | Cannot proceed; requires a blocker classification/summary. |
| `review` | Awaiting or undergoing review. |
| `done` | Work result is recorded. This does not itself mean verified. |
| `deferred` | Intentionally postponed. |
| `cancelled` | Work was cancelled. |

`done` requires a non-empty task result. Leaving `blocked` clears the blocker in the normal editor flow.

Only `planned`, `ready`, and `active` tasks may use **Execute task**.

## Execution states

Runtime execution-attempt status values:

| Status | Active? | Meaning / normal operator action |
| --- | ---: | --- |
| `pending` | yes | Durable attempt exists; launch is not fully classified. Startup may replay the same launch IDs. Use Recheck if needed. |
| `launched` | yes | Worker thread/run launched. Recheck after the worker finishes. |
| `cancelling` | yes | Stop requested; active slot remains held. Cancel again or Recheck if needed. |
| `completed` | no | Existing run completed. |
| `failed` | no | Existing run failed or a non-ambiguous launch failure was recorded. |
| `cancelled` | no | Attempt was cancelled. |
| `interrupted` | no | Existing run terminated as interrupted. |
| `reconcile_required` | yes | T3 cannot safely prove the existing attempt's final state. Recheck; do not launch a second worker. |

Only `pending` is automatically resumed at startup. Other active states block another execution until reconciliation makes the attempt terminal.

## Verification terminology

These project-management terms are deliberately stronger than “the worker finished.”

| Term | Meaning |
| --- | --- |
| `IMPLEMENTED` | Requested implementation exists, but stronger verification has not yet been established. |
| `STATIC PASS` | Appropriate static checks passed. Persisted task milestone: `static-pass`. |
| `RUNTIME PASS` | Required runtime/behavior checks passed. Persisted milestone: `runtime-pass`. |
| `REVIEW PASS` | Required review found no blocking issue after repairs. Persisted milestone: `review-pass`. |
| `INTEGRATED` | Accepted work is on the intended integration base/head and evidence supports that state. Persisted milestone: `integrated`. |
| `VERIFIED` | All acceptance/verification required for the task or milestone has passed. Persisted milestone: `verified`. |
| `BLOCKED` | Progress cannot safely continue until a blocker is resolved. This is not a verification milestone. |
| `DEFERRED` | Work is intentionally postponed. This is not a verification milestone. |

Passing milestones require at least one passing evidence item. `verified` cannot coexist with failing evidence. Inconclusive evidence is not passing evidence.

Task lifecycle and verification are separate. A task may be `done` while its verification milestone is still `none`.

## Recovery terminology

**Cancellation**  
`Cancel execution` uses T3's existing orchestration thread-stop path. `cancelling` remains active until the existing run is terminal or reconciled.

**Recheck / reconciliation**  
`Recheck attempt` compares the durable attempt with its existing thread/run and updates the attempt when the evidence is clear. Startup performs equivalent reconciliation for active attempts.

**`reconcile_required`**  
The attempt is ambiguous: for example, T3 could not safely read/classify the existing thread after an uncertain launch or stop. The active slot stays occupied. Do not create a replacement execution; restore the environment/provider if necessary and Recheck.

A terminal attempt may link the newest handoff whose server-recorded provenance matches the worker thread. Linking does not rewrite the handoff or make its claims proof.

## Updating the fork

These instructions are for a source checkout of `jermur788/t3code`, not the upstream release installer.

Before updating, finish or intentionally stop active work and make an offline backup of the active T3 home/database. Confirm the repository has no uncommitted work you intend to preserve elsewhere:

```sh
git status --short
```

Update the source checkout:

```sh
git switch main
git pull --ff-only origin main
vp install
```

Start the updated fork:

```sh
vp dev
```

A full server boot runs the upstream migration sequence and then the fork migration registry. The current fork registry is:

1. `ProjectRuntime`
2. `DevelopmentProfiles`
3. `TaskHandoffState`
4. `RuntimeRouting`
5. `RuntimeExecutionAttempts`
6. `RuntimeExecutionCancellation`

Migration history is fail-closed: malformed, partial, conflicting, or ambiguous fork histories are rejected rather than guessed.

After the update, perform a basic check:

1. Project Home loads.
2. The expected project/checkout is selectable.
3. Development Profile and Project Runtime open.
4. Existing task/handoff/execution state is present.
5. At least one configured provider is still available.
6. Recheck any execution that was active around shutdown before starting another worker.

Do not run an upstream T3 build against an adopted fork home as an “upgrade test”. Keep upstream and fork homes separate unless that transition has been explicitly qualified.

## Important data and backups

Runtime does not have a separate database. Project Runtime, Development Profiles, project/task routing, task/handoff state, and execution-attempt records live in the environment database.

Before migrations or destructive verification:

1. stop the server using that home;
2. copy the active T3 home/base directory or, at minimum, its `statev2.sqlite` database and associated SQLite files while offline;
3. separately back up the project workspace/source files that registered Runtime sources point to.

A database-only backup does **not** preserve source bodies because Runtime stores source descriptors, not snapshots.

For a disposable test environment, use a fresh explicit home rather than the live one:

```sh
vp run dev --home-dir <isolated-home> --no-seed
```

Do not reuse one database between this fork and an upstream build during qualification.

## Provider and routing failure quick reference

| Symptom | Check |
| --- | --- |
| Saved provider/model is unavailable | **Settings → Providers**, provider login/status, project enablement, route rejection details. |
| Different worker wins | one-run → task → project → profile → ordinary T3; then inspect fallback/rejections. |
| Execute is disabled | task status/revision, Runtime enablement, active attempt, provider/model/workspace eligibility. |
| Attempt seems stale | **Recheck attempt**. |
| Cancel does not settle | **Cancel again** or **Recheck attempt**; inspect existing thread. |
| `reconcile_required` | Restore access if needed, Recheck existing attempt, and do not launch another worker. |

## Persistence boundaries

Durable on the environment server:

- Development Profile and assignment;
- Project Instructions;
- source registrations and metadata;
- project/task state;
- task routing and project/profile routing;
- append-only handoffs and latest-handoff reference;
- execution attempts, routing receipts, worker thread/run references, and cancellation/reconciliation state.

Not copied into Runtime:

- source file bodies;
- provider credentials;
- the full worker conversation;
- Git branches/commits/worktree contents.

Threads, provider sessions, Git/worktrees, and provider-specific execution remain owned by their existing T3 subsystems. Runtime records durable project intent and execution references so a different provider or new conversation can continue without making chat history the project database.
