# T3 Fork Reference

Use this file for facts that are needed occasionally during operation. The normal workflow is in [T3 Fork Operator Manual](manual.md).

## Interface modes

T3 Fork has two presentation modes over the same Project Runtime and project state:

- **Workspace** — project context and conversations first; development-heavy controls are progressively disclosed under **Advanced**.
- **Development** — the full operator/development interface with Development Profiles, routing, Runtime tasks, executions, handoffs, review, recovery, and verification controls visible directly.

The selected interface is a **device-local UI preference**, not project or Runtime truth. The stored values are:

```text
workspace | development
```

The local-storage key is:

```text
t3-fork:interface-mode
```

If no value has been saved, T3 Fork uses Development as the visible default while presenting the first-choice prompt. Change the preference at **Settings → General → T3 Fork interface**. The change takes effect immediately and does not require a restart.

Changing interface mode does not change provider/model configuration, Development Profile assignment, routing, Runtime enablement, tasks, handoffs, executions, permissions, or other project state.

## Configuration locations

| Item                                                        | Location / owner                                                                                                                                                 |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T3 Fork interface mode                                      | **Settings → General → T3 Fork interface**. Device-local UI preference.                                                                                          |
| Provider connections and instances                          | **Settings → Providers** on the selected environment. Provider authentication remains provider-owned.                                                            |
| Development Profiles                                        | Normal Settings navigation in **Development** mode; reachable from **Advanced** or direct URL in **Workspace** mode. Profiles persist on the environment server. |
| Project profile assignment and project worker routing       | **Settings → Projects** for the selected project/checkout; under **Advanced** in Workspace mode.                                                                 |
| Project Runtime                                             | **Settings → Projects** for one concrete environment/checkout; development-heavy Runtime controls are under **Advanced** in Workspace mode.                      |
| Runtime tasks, handoffs, source registrations, instructions | Environment database, project-scoped.                                                                                                                            |
| Execution attempts and routing receipts                     | Environment database, project-scoped.                                                                                                                            |
| Registered source bodies                                    | Workspace files themselves; Runtime stores descriptors, not copies.                                                                                              |

The server derives its SQLite database as:

```text
<baseDir>/<dev-or-userdata>/statev2.sqlite
```

For the normal main-checkout development run, the verified default home is `~/.t3/dev`. A linked worktree uses `<worktree>/.t3/userdata` by default. An explicit isolated development home can be selected with:

```sh
vp run dev --home-dir <isolated-home> --no-seed
```

For qualification or migration work, use a fresh isolated home. Never point an experimental/upstream build at the active fork database.

## Worker roles

| Role             | Meaning                              |
| ---------------- | ------------------------------------ |
| `implementation` | Make the requested change.           |
| `research`       | Gather evidence or investigate.      |
| `review`         | Independently inspect existing work. |
| `design`         | Produce design or architecture work. |
| `test`           | Exercise/qualify behavior.           |
| `general`        | Work not covered by a narrower role. |

A role belongs to an execution attempt, not to a permanent agent persona.

## Routing precedence

Highest to lowest:

1. explicit one-run override _(resolver/API callers only; not available in the Runtime task UI)_;
2. task routing;
3. project routing;
4. assigned Development Profile routing;
5. ordinary T3 inheritance.

A layer participates only when it has an entry for the resolved role. The role itself resolves from a one-run override role first, then task role, then caller-supplied role, defaulting to `implementation`.

Routing selects a preference. It does not grant permission or bypass provider registration, authentication, provider enablement, project provider settings, model support, runtime/interaction modes, permissions, or orchestration authorization.

The Runtime task **Execute task** RPC accepts saved task/revision/request identity, not an ad-hoc one-run worker override. The current task UI executes saved task/project/profile policy.

If Runtime routing inherits to ordinary T3 behavior, the launch path uses the project's default model selection. If no project default model exists, execution can fail with `no_default_model` / **Configure a worker preference first**.

Workspace/Development mode does not participate in this precedence and does not change routing behavior.

## Routing fallback semantics

After a layer's ordered candidates are exhausted:

| Fallback   | Result                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------- |
| `continue` | Evaluate the next lower Runtime routing layer.                                              |
| `inherit`  | Stop Runtime routing and use ordinary T3 inheritance; do not evaluate lower Runtime layers. |
| `fail`     | Refuse routing; do not silently inherit.                                                    |

Development Profile routing is the terminal Runtime layer, so profile entries support only `inherit` and `fail`.

A one-run explicit override is fail-closed: if its candidate cannot run, resolution fails instead of falling through.

An empty candidate list is meaningful. With `inherit` it deliberately disables Runtime routing for that role; with `fail` it deliberately requires a Runtime route that is not currently available.

## Task states

Runtime task lifecycle values:

| State       | Meaning                                                      |
| ----------- | ------------------------------------------------------------ |
| `planned`   | Recorded but not yet ready for execution.                    |
| `ready`     | Ready to be worked.                                          |
| `active`    | Work is in progress.                                         |
| `blocked`   | Cannot proceed; requires a blocker classification/summary.   |
| `review`    | Awaiting or undergoing review.                               |
| `done`      | Work result is recorded. This does not itself mean verified. |
| `deferred`  | Intentionally postponed.                                     |
| `cancelled` | Work was cancelled.                                          |

`done` requires a non-empty task result. Leaving `blocked` clears the blocker in the normal editor flow.

Only `planned`, `ready`, and `active` tasks may use **Execute task**. The Execute control appears only after the task has been saved and reopened in **Edit task**.

## Execution workspace and permissions

The default worker workspace is the **shared (live) project checkout**, so the worker edits the live project checkout. The task editor offers no per-execution workspace selector, and **Settings → Projects → New threads → Workspace** (Current checkout / New worktree) did not change where a Runtime worker ran in qualification. Where a new worktree is used, its base resolution uses the configured revision, then branch, then `HEAD`.

Permission mode comes from the task/project route/defaults. A worker waiting on an approval can remain `launched`; open the linked worker thread to approve or deny the request.

## Execution states

Runtime execution-attempt status values:

| Status               | Active? | Meaning / normal operator action                                                                                       |
| -------------------- | ------: | ---------------------------------------------------------------------------------------------------------------------- |
| `pending`            |     yes | Durable attempt exists; launch is not fully classified. Startup may replay the same launch IDs. Use Recheck if needed. |
| `launched`           |     yes | Worker thread/run launched. Recheck after the worker finishes.                                                         |
| `cancelling`         |     yes | Stop requested; active slot remains held. Cancel again or Recheck if needed.                                           |
| `completed`          |      no | Existing run completed.                                                                                                |
| `failed`             |      no | Existing run failed or a non-ambiguous launch failure was recorded.                                                    |
| `cancelled`          |      no | Attempt was cancelled.                                                                                                 |
| `interrupted`        |      no | Existing run terminated as interrupted.                                                                                |
| `reconcile_required` |     yes | T3 cannot safely prove the existing attempt's final state. Recheck; do not launch a second worker.                     |

Only `pending` is automatically replayed at startup. Other active states block another execution until reconciliation makes the attempt terminal.

Normal T3 **Continue threads after restarts** behavior is separate from Runtime attempt state and can resume a provider thread after restart. Inspect the existing worker thread before starting replacement work.

## Handoffs

A successful execution does **not** guarantee a Runtime handoff. The worker must call `t3_project_handoff_append`, and its provider thread must have Runtime MCP tools available.

Put the handoff requirement in Project Instructions or the task's **Next action**. If no handoff appears, open the worker thread and ask it to append one. Recheck only if the attempt is still active; a terminal attempt shows the handoff as the task's Latest handoff / View handoffs.

A terminal attempt may link the newest handoff whose server-recorded provenance matches the worker thread. Linking does not rewrite the handoff or make its claims proof.

## Independent review

The reliable independent-review path is a **separate task** in `ready` status with worker role `review`. Its Objective/Scope should identify the implementation task/handoff and explicitly require inspection of the actual diff, acceptance criteria, and claimed verification.

Re-executing the original implementation task after changing only its worker role is weaker: the execution packet still replays that task's implementation objective and latest handoff. If deliberately reusing the same task, return it to `planned`, `ready`, or `active` before Execute; `review` and `done` are not executable.

## Verification terminology

Task lifecycle and verification are separate. A task may be `done` while its verification milestone is still `none`.

Persisted verification milestone values are:

| Stored value   | Operator label | Meaning                                                                                  |
| -------------- | -------------- | ---------------------------------------------------------------------------------------- |
| `none`         | —              | No verification milestone has been established.                                          |
| `implemented`  | `IMPLEMENTED`  | Requested implementation exists, but stronger verification has not yet been established. |
| `static-pass`  | `STATIC PASS`  | Appropriate static checks passed.                                                        |
| `runtime-pass` | `RUNTIME PASS` | Required runtime/behavior checks passed.                                                 |
| `review-pass`  | `REVIEW PASS`  | Required review found no blocking issue after repairs.                                   |
| `integrated`   | `INTEGRATED`   | Accepted work is on the intended integration base/head and evidence supports that state. |
| `verified`     | `VERIFIED`     | All acceptance/verification required for the task or milestone has passed.               |

`blocked` and `deferred` are **task lifecycle statuses**, not verification milestones.

Passing milestones require at least one passing evidence item. `verified` cannot coexist with failing evidence. Inconclusive evidence is not passing evidence.

When finishing a task, update the editor's **Task status**, **Result** (required for `done`), **Verification milestone**, and **Evidence** result/summary/command from the actual evidence.

## Recovery terminology

**Cancellation**  
`Cancel execution` uses T3's existing orchestration thread-stop path. `cancelling` remains active until the existing run is terminal or reconciled. Cancellation does not request stopping delegated child tasks (`stopDelegatedTasks: false`), so child/delegated tasks may continue and must be checked separately.

**Recheck / reconciliation**  
`Recheck attempt` compares the durable attempt with its existing thread/run and updates the attempt when the evidence is clear. Startup performs equivalent reconciliation for active attempts.

**`reconcile_required`**  
The attempt is ambiguous: for example, T3 could not safely read/classify the existing thread after an uncertain launch or stop. The active slot stays occupied.

First restore the environment/provider if necessary and **Recheck attempt**. If Recheck still leaves `reconcile_required` and the worker thread has been deleted or is confirmed absent, **Cancel execution** records the attempt as `cancelled` and frees the slot. Do not use that path while the thread still exists and may be running.

## Adaptive routing persistence foundation

Fork migration 7, `AdaptiveRouting`, provides the ARM-010 contracts and persistence foundation for adaptive-routing telemetry and records. It does **not** mean Adaptive Model Routing V1 is complete or that T3 automatically chooses a provider/model adaptively.

Current ordinary routing precedence remains unchanged. Later adaptive observation, difficulty/outcome learning, recommendation, experiments, UI, and cross-provider qualification stages remain separate work.

## Updating the fork

These instructions are for a source checkout of `jermur788/t3code`.

The fork currently publishes no installers or desktop binaries. Upstream install scripts/packages, `t3 update`, and upstream in-app updates track stock T3, not this fork. A desktop build can be produced from source using the repository's desktop build scripts, but the supported Documentation V1 golden path is the source-run web/server workflow.

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
vp run dev
```

Open the `pairingUrl:` printed by the dev runner if the browser needs authentication. Treat that URL as a credential.

A full server boot runs the upstream migration sequence and then the fork migration registry. The current fork registry is:

1. `ProjectRuntime`
2. `DevelopmentProfiles`
3. `TaskHandoffState`
4. `RuntimeRouting`
5. `RuntimeExecutionAttempts`
6. `RuntimeExecutionCancellation`
7. `AdaptiveRouting`

Migration history is fail-closed: malformed, partial, conflicting, or ambiguous fork histories are rejected rather than guessed.

After the update, perform a basic check:

1. Use the normal in-app Home/Project Home navigation after pairing.
2. Confirm the expected project/checkout is selectable.
3. Confirm the saved Workspace/Development preference is appropriate for this device; change it in **Settings → General → T3 Fork interface** if needed.
4. Open Development Profile and Project Runtime controls through Development mode or Workspace **Advanced**.
5. Confirm existing task/handoff/execution state is present.
6. Confirm at least one configured provider is still enabled and available.
7. Recheck any execution that was active around shutdown before starting another worker.

Do not run an upstream T3 build against an adopted fork home as an “upgrade test”. Keep upstream and fork homes separate unless that transition has been explicitly qualified.

## Important data and backups

Runtime does not have a separate database. Project Runtime, Development Profiles, project/task routing, task/handoff state, execution-attempt records, and ARM-010 adaptive persistence records live in the environment database.

The Workspace/Development interface preference is different: it is device-local presentation state and is not stored as project or Runtime truth.

The T3 home can also contain `secrets/`, authentication state, and attachments. A full-home backup therefore contains sensitive material and must be protected accordingly.

Before migrations or destructive verification:

1. stop the server using that home;
2. copy the active T3 home/base directory or, at minimum, its `statev2.sqlite` database and associated SQLite files while offline;
3. separately back up the project workspace/source files that registered Runtime sources point to.

A database-only backup does **not** preserve source bodies because Runtime stores source descriptors, not snapshots. Restoring a backup is the rollback path for fork migrations; migrations are forward-only rather than automatically downgraded.

For a disposable test environment, use a fresh explicit home:

```sh
vp run dev --home-dir <isolated-home> --no-seed
```

Do not reuse one database between this fork and an upstream build during qualification.

## Provider and routing failure quick reference

| Symptom                                                                   | Check                                                                                                                                                                                |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Workspace hides development controls                                      | Open **Advanced**, or switch to **Development** in **Settings → General → T3 Fork interface**.                                                                                       |
| Development Profiles is missing from Workspace Settings navigation/search | Expected in Workspace mode (project-level “Development Profile”/“Worker preferences” entries still appear in search). Use an **Advanced** link/direct URL, or switch to Development. |
| Saved provider/model is unavailable                                       | **Settings → Providers**, provider login/status, provider enablement, project eligibility, route rejection details.                                                                  |
| `provider_disabled`                                                       | Enable the provider/model in **Settings → Providers**.                                                                                                                               |
| `no_default_model` / “Configure a worker preference first”                | Set a task Worker preference with provider/model, or configure the project default model.                                                                                            |
| Different worker wins                                                     | one-run _(API callers only)_ → task → project → profile → ordinary T3; then inspect fallback/rejections.                                                                             |
| Execute is disabled                                                       | Save/reopen the task; check lifecycle status, revision, Runtime enablement, active attempt, provider/model/workspace eligibility.                                                    |
| Worker appears stuck at `launched`                                        | Open the worker thread and check for approval/input requests; Recheck after it finishes.                                                                                             |
| Attempt seems stale                                                       | **Recheck attempt**.                                                                                                                                                                 |
| Cancel does not settle                                                    | **Cancel again** or **Recheck attempt**; inspect the existing thread and any delegated child tasks.                                                                                  |
| `reconcile_required`                                                      | Recheck. If the worker thread is confirmed deleted/absent, **Cancel execution**; otherwise restore access and do not launch another worker.                                          |
| No handoff                                                                | Ask the worker thread to call `t3_project_handoff_append`; Recheck if the attempt is still active, otherwise look at the task's Latest handoff / View handoffs.                      |

## Persistence boundaries

Durable on the environment server:

- Development Profile and assignment;
- Project Instructions;
- source registrations and metadata;
- project/task state;
- task routing and project/profile routing;
- append-only handoffs and latest-handoff reference;
- execution attempts, routing receipts, worker thread/run references, and cancellation/reconciliation state;
- ARM-010 adaptive-routing persistence records.

Device-local presentation state:

- Workspace/Development interface preference (`t3-fork:interface-mode`).

Not copied into Runtime:

- source file bodies;
- provider credentials;
- the full worker conversation;
- Git branches/commits/worktree contents.

Threads, provider sessions, Git/worktrees, and provider-specific execution remain owned by their existing T3 subsystems. Runtime records durable project intent and execution references so a different provider or new conversation can continue without making chat history the project database.
