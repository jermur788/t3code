# T3 Fork Operator Manual

This is the shortest supported path from a fresh source checkout to durable, provider-neutral Runtime work. It assumes you already know Git and terminal basics.

> [!IMPORTANT]
> Use the **source checkout** workflow below for this fork. Upstream installers/packages, `t3 update`, and upstream in-app updates install stock T3 and do not contain fork features such as Project Home, Project Runtime, Development Profiles, or Runtime task routing.

For compact definitions, storage details, state tables, routing fallback semantics, and upgrade notes, see [Reference](reference.md). For upstream T3 features that are not fork-specific, use the [documentation index](README.md).

## 1. Quickstart

### Requirements

The supported golden path for this fork is the source-run web/server workflow. The fork publishes no desktop installers. Source-built desktop packages are outside this manual's golden path.

Install:

- Git.
- Vite+ (`vp`). Vite+ supplies the repository's pinned Node.js version.
- At least one supported AI provider or provider account.

Install Vite+ on macOS/Linux:

```sh
curl -fsSL https://vite.plus | bash
```

On Windows PowerShell:

```powershell
irm https://vite.plus/ps1 | iex
```

Clone this fork and install dependencies:

```sh
git clone https://github.com/jermur788/t3code.git
cd t3code
vp install
```

Start the fork:

```sh
vp run dev
```

The dev runner does **not** open an authenticated browser by default. Wait for the `pairingUrl:` line, then open that exact URL in the browser you want to use. The pairing URL is a credential: do not paste, post, or share it.

After pairing, T3 opens normally and the authenticated root redirects to fork **Project Home** (`/home`). If this device has no saved interface preference, Project Home presents the first-choice prompt described in Section 2. Development ports vary by checkout/worktree; do not assume a fixed port.

If you lose the pairing URL while the server is running, generate another with:

```sh
node apps/server/src/bin.ts pair
```

If you started the server with `--home-dir <isolated-home>` (or from a linked worktree whose server runs under a different home), add `--base-dir <that-home>`; without it `pair` reports that no running server was found.

If startup fails, first confirm `vp --version`, `vp exec node --version`, and that `vp install` completed. More development commands are in [docs/operations/development.md](operations/development.md).

### Provider prerequisite

T3 controls provider tools/accounts; Runtime routing does not install or authenticate them. Configure and **enable** at least one provider before executing a Runtime task.

Supported providers include Codex, Claude Code, Cursor, Grok Build, OpenCode, and Antigravity. Common CLI sign-ins are:

```sh
codex login
claude auth login
agent login
grok login
opencode auth login
```

Use only the command for the provider you installed. Antigravity is installed and signed in from T3 **Settings → Providers**.

## 2. Choose the T3 Fork interface

T3 Fork has two presentations over the same project and Project Runtime truth:

- **Workspace** — project identity, conversations, **Start a thread**, Instructions, Sources, and normal project settings. Development machinery is progressively disclosed under **Advanced**.
- **Development** — Development Profiles, worker routing, Project Runtime, Runtime tasks, execution attempts/executions, handoffs, and review/recovery/verification controls shown directly.

These are two views over the same Runtime and project records, not two databases or two modes of execution.

When this device has no saved interface preference, Project Home shows **Choose your T3 Fork interface**. Development remains the visible default behind that prompt. This manual's golden path chooses **Workspace**.

The choice is a device-local interface preference, not project or Runtime state. Change it later at **Settings → General → T3 Fork interface**. The change takes effect immediately; no restart is required. Changing it does not change provider/model configuration, Development Profile assignment, routing, Runtime enablement, tasks, handoffs, executions, permissions, or other project state.

For the rest of the manual, Workspace is home base. Where a step needs development controls, it says whether to open Workspace **Advanced** or switch to Development.

## 3. Connect an AI provider

Open **Settings → Providers**. If you are connected to a remote environment, select that environment first. Provider configuration is the same in both interface modes.

For Codex, T3 can connect a ChatGPT account from this screen or use an existing `codex login`. Other CLI providers are discovered from the environment where the T3 server runs; install and authenticate them on that machine. Enable the provider/model you intend to use. Do not paste provider secrets into Project Instructions, Runtime tasks, or handoffs.

Confirm three separate things:

| Check                     | Meaning                                                                                                                                 |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Provider availability     | T3 can see an installed/authenticated and enabled provider and its advertised models.                                                   |
| Worker routing preference | Runtime prefers a provider/model for a role such as implementation or review.                                                           |
| Project eligibility       | Normal T3 project/provider settings, model constraints, modes, permissions, and current availability still allow that worker to launch. |

A saved routing preference is not authorization. T3 rechecks eligibility immediately before execution.

**Expected:** the provider appears usable in the normal T3 model/provider controls. If a saved worker later becomes unavailable, T3 keeps the preference visible with a warning rather than silently rewriting it.

Provider-specific help: [Codex](user/providers-codex.md), [Claude](user/providers-claude.md), [Cursor](user/cursor.md), and [Install and first run](user/install.md#providers).

## 4. Set up a project in Workspace

Use **Project Home** in the sidebar (the in-app Home navigation: the house icon at the bottom of the sidebar) rather than hard-loading a URL.

A source-checkout dev run can already list a project for the checkout it was started from (for example `server`). To add your own repository, choose the sidebar's add-project (folder-plus) button, then **Local folder**, enter the repository path (the path field starts with `~/`), and press Enter. T3 opens a new-thread draft for the added project; use **Project Home** to return, then select the concrete project/checkout in the Project Home picker.

Workspace Project Home leads with, in order:

1. project identity and selection;
2. **Start a thread**;
3. **Instructions**;
4. **Sources**;
5. **Advanced**.

**Project settings** beside **Start a thread** opens Settings → Projects for the selected project.

If no project exists, Project Home asks you to add one (see above). If a project or checkout is unavailable, Project Home says so instead of silently switching to another checkout.

### Enable Runtime, Instructions, and Sources

If Project Home reports **Project Runtime is disabled**, open **Project settings → Advanced → Project Runtime**, choose the concrete environment and checkout, and select **Enable Runtime**. Runtime belongs to one project on one environment, not to a provider or conversation.

Add only project-owned durable truth:

- **Project Instructions:** working rules and constraints for this project.
- **Sources:** registered workspace-relative text files that workers may search/read on demand.
- **Project State / Tasks:** durable work state and acceptance/verification information.
- **Handoffs:** append-only continuation records produced after substantial work.

Project Home shows a preview of **Instructions** and the number of registered **Sources**. Use **Edit instructions** and **Manage sources** to change them. Registered sources are references to workspace files; Runtime does not copy their bodies. Back up the source files as well as Runtime state.

Disabling Runtime hides its editors but keeps the records. Development Profile assignment remains active even when Runtime is disabled.

### Start a thread

After the project is selected and its instructions/sources are configured, choose **Start a thread**. That opens normal T3 conversation work with the project already selected. **Classic T3 Home** opens the upstream-style home; `/?classic=1` is the direct route.

Starting a thread is ordinary T3 conversation work. Runtime task execution in Section 6 is a separate, durable execution path.

### Project settings and Advanced

In Workspace mode, **Project settings** keeps normal project settings and Runtime **Project Instructions** / **Registered sources** accessible. The following existing development controls are collapsed under **Advanced**:

- Development Profile assignment;
- project **Worker preferences**;
- Project Runtime state/revision/enable controls;
- Runtime tasks, handoffs, and executions, including review, verification, cancellation, and reconciliation controls reached through those tasks.

On Project Home, **Advanced** summarizes Development Profile, Project Runtime, Project State, and Tasks & Handoffs, and links to their controls. In Project settings it reveals the sections above. Opening **Advanced** changes neither the saved interface mode nor any project/Runtime value, and closing it also changes nothing. Direct links to an advanced section automatically reveal the relevant Advanced content, so a deep link never lands on hidden controls.

Development Profiles is hidden from normal Workspace Settings navigation and search. It remains available through Project Home **Advanced → Manage profiles** or its direct URL. Settings search does not list that page, but searching for “Development Profile” or “Worker preferences” still finds the project-level assignment and routing controls under **Settings → Projects**.

### Optional shared Development Profile

For shared policy across projects, open **Advanced → Manage profiles** on Project Home, or switch to Development and open **Settings → Development Profiles**. Select the environment, create or select a profile, and save the shared development instructions you want projects to inherit.

Then return to the project's settings and choose that profile under **Advanced → Development Profile**. A project can have one profile. Project-specific instructions override directly conflicting profile instructions.

If you want workers to leave durable continuation records, put this requirement in Project Instructions or the task's **Next action**:

> Before finishing substantial work, append a handoff with `t3_project_handoff_append` that records the result, tests run/not run, risks, repository state, verification/integration state, and exact next action.

The worker's provider thread must have Runtime MCP tools available for that handoff call to work.

## 5. Configure workers

Worker roles describe an execution attempt, not a permanent agent persona:

- **implementation** — make the requested change;
- **research** — investigate and return evidence;
- **review** — independently inspect existing work;
- **design** — produce design/architecture work;
- **test** — exercise or qualify behavior;
- **general** — work that does not fit a narrower role.

These are development controls. In Workspace, open **Project settings → Advanced → Worker preferences** for project overrides, and use Project Home **Advanced → Manage profiles** for profile defaults. In Development, use **Settings → Development Profiles** and **Settings → Projects → Worker preferences** directly. Configure a task-specific role/preference when creating or editing a Runtime task.

Routing precedence is:

1. explicit one-run override _(API/resolver callers only; the Runtime task UI has no one-run input)_;
2. task routing;
3. project routing;
4. Development Profile routing;
5. normal T3 behavior.

The first applicable layer determines the preference. Candidate failures may continue, inherit, or fail according to that layer's fallback policy; see [Routing fallback semantics](reference.md#routing-fallback-semantics).

The Runtime task **Execute task** action launches from saved task/project/profile policy. Its RPC does not expose a user-entered one-run override.

Where routing is shown, use T3's **effective** / winning-layer display rather than trying to infer the result yourself. Routing does not bypass provider availability, project settings, model support, runtime/interaction modes, permissions, or other T3 eligibility checks.

## 6. Run a real task

Runtime task and execution controls are development machinery. Begin in Workspace, then either open **Project settings → Advanced → Project Runtime** (or Project Home **Advanced → Tasks & handoffs**) or switch to **Development** at **Settings → General → T3 Fork interface**. Switching modes changes presentation only; it does not change Runtime state. With Advanced open, Workspace Project settings exposes the same Runtime task controls as Development.

Use one small task all the way through this manual:

> **Document the project's test command** — add a short `Tests` section to the project README using the command that already exists in the repository. Do not change code or dependencies.

Open **Settings → Projects → Project Runtime** (Development) or **Settings → Projects → Advanced → Project Runtime** (Workspace) and choose **Create task**.

Record:

- **Title:** `Document the project's test command`
- **Status:** `ready`
- **Objective:** add a short Tests section to the README using the repository's existing test command.
- **Out of scope:** code, dependency, or CI changes.
- **Acceptance criteria:**
  - README contains a Tests section.
  - The documented command matches the repository configuration.
- **Verification plan:** inspect the diff and run or otherwise verify the documented command.
- **Worker role:** `implementation`.
- **Next action:** require the worker to append a Runtime handoff before finishing.

Save the task, then reopen **Edit task**. The Execute control exists only for a saved task.

Inside **Edit task**, inspect **Worker preference** and the effective routing result. For the golden path, either:

- set an explicit task Worker preference with an eligible provider **and model**: in the task form's **Worker preference** box (not the project-level one above it on the same page), choose **Add alternative worker** to add the first preferred worker, then pick the provider (icon rail) and model; or
- confirm the project has a default model selection that normal T3 inheritance can use.

If neither exists, Execute can fail with `no_default_model` / **Configure a worker preference first**.

Also check where work will happen. Runtime task execution in this interface runs the worker in the **live project checkout** (shared checkout). The task editor has no per-execution workspace selector, and **Settings → Projects → New threads → Workspace** (Current checkout / New worktree) applies to ordinary new threads: in qualification, a Runtime worker still ran in the live checkout with that setting on New worktree. Plan for the worker to edit the live checkout, and use a disposable or clean repository. Permission mode comes from the route/project defaults; if the worker needs approval, open its worker thread and approve there.

Choose **Execute task**.

T3 checks the loaded task revision, Runtime enablement, routing, provider/model eligibility, and workspace base before launch. A successful launch creates one durable execution attempt and one worker thread. The attempt shows the provider/model, winning routing layer, status, failure information when present, any linked handoff, and a link to the worker thread.

Only `planned`, `ready`, and `active` tasks can execute. One active attempt is allowed per task.

When the worker turn finishes, choose **Recheck attempt**. Outside startup reconciliation, T3 does not continuously poll a finished worker into a new terminal Runtime status. **Recheck attempt** is shown only while the attempt is active; after it becomes `completed`/`failed` the control disappears. **Edit task** lists the task's latest attempt only; earlier attempts (for example a failed one you retried) remain recorded but are not listed there.

Then inspect:

1. the repository diff/result;
2. the task result and verification evidence;
3. **View handoffs** for the worker's durable continuation record;
4. the execution attempt and linked worker thread.

A handoff is context, not proof. It records what the worker says changed, tests run/not run, risks, repository/integration state, and next action; the next worker or manager still checks those claims.

If no handoff appears, open the worker thread and ask it to append one with `t3_project_handoff_append`. If the attempt is still active, then **Recheck attempt**. If it is already terminal there is nothing to recheck: the handoff appears as the task's **Latest handoff** and under **View handoffs** (reopen the task area if it is not yet shown), though it is not necessarily linked on the attempt.

If the implementation satisfies acceptance, move to independent review rather than treating the worker's “done” message as verification.

## 7. Review and verify work

Continue in Development, or use Workspace **Advanced**; review and verification operate on the same Runtime records in either presentation.

Use this cycle:

```text
Runtime implementation task
→ implementation worker
→ result + handoff
→ separate review task
→ fresh review worker
→ repair if necessary
→ verification
→ next task
```

For the example, create a **separate** review task in `ready` status. Give it worker role `review` and an objective such as:

> Independently review the implementation task “Document the project's test command”. Inspect the actual diff, repository configuration, acceptance criteria, claimed verification, and latest handoff. Report any blocking issue and append a review handoff.

Reference the implementation task/handoff in the review task's Objective or Scope. Then save, reopen **Edit task**, inspect the effective route, and execute the review task with a fresh eligible worker.

Do not use “change the original implementation task to review and execute it again” as the normal independent-review path: that replays the implementation task's objective and latest handoff. If you deliberately reuse the original task, first return it to `planned`, `ready`, or `active`, because `review` and `done` are not executable.

A worker with Runtime tools can also update the task it ran (in qualification the review worker marked its own review task `done` with verification `review-pass`). Treat such changes as the worker's claim and check them like a handoff.

After review/reconciliation, update the implementation task from evidence:

1. set **Task status** appropriately;
2. if setting `done`, record a non-empty **Result**;
3. set the **Verification milestone** only as high as the evidence supports;
4. add/update **Evidence** with result, summary, and command/check used.

Task lifecycle and evidence are separate. A task can be `done` without being verified, and a handoff can claim tests passed without raising the stored verification milestone.

Persisted verification milestones are:

`none` → `implemented` → `static-pass` → `runtime-pass` → `review-pass` → `integrated` → `verified`

The corresponding operator labels are:

`IMPLEMENTED` → `STATIC PASS` → `RUNTIME PASS` → `REVIEW PASS` → `INTEGRATED` → `VERIFIED`

`blocked` and `deferred` are **task lifecycle statuses**, not verification milestones.

Record passing evidence before raising a passing milestone. `verified` cannot coexist with failing evidence.

## 8. Restart and confirm durable state

This proves the fork's central persistence property and keeps the two persistence scopes separate:

| Scope                             | What it includes                                                                                                                           | Restart behavior                                                                                       |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Durable server/project truth      | Project Instructions, registered sources, project/task state, handoffs, routing/profile state, execution attempts and reconciliation state | Stored on the environment server; survives server restart, reconnects, and client changes.             |
| Device-local interface preference | Workspace or Development presentation choice (`t3-fork:interface-mode`)                                                                    | Belongs to this browser/device; it does not travel with the project and does not change Runtime truth. |

1. Create and execute the example task if it is not already complete.
2. Confirm the task, attempt, and handoff are visible.
3. Stop the development server normally.
4. Start it again with the same command and options you used before (for an isolated home, include the same `--home-dir`; a different home is a different database):

```sh
vp run dev
```

5. Open the new `pairingUrl:` printed by the dev runner if the browser needs pairing.
6. Use **Project Home** in the sidebar, select the same project/checkout, and open the Runtime task area through Development or Workspace **Advanced**.
7. Confirm the saved instructions, sources, task, execution attempt, handoff, and routing/profile state remain.
8. Confirm the chosen interface preference still behaves as chosen on this device. If it is not the presentation you want, change it at **Settings → General → T3 Fork interface**; no restart is required.
9. Continue in the same provider or switch to another eligible provider.

On startup, T3 reconciles active execution attempts against their existing worker threads/runs. A `pending` launch replays with the same stored IDs. An ambiguous attempt remains `reconcile_required` rather than allowing a speculative second worker.

T3's normal **Continue threads after restarts** behavior can resume provider threads independently of the Runtime attempt classification, so inspect the existing worker thread before starting any replacement work.

Durable state includes project instructions, source registrations, project/task state, handoffs, routing/profile state, and execution references/state. Important project truth should not depend on the old chat remaining available.

> [!NOTE]
> Use the in-app **Project Home** navigation for this restart check. A hard browser load of `/home` can land on a thread instead of Project Home when an interface preference has been saved. That is a pre-existing routing limitation; Workspace Modes did not fix it and does not change it.

## 9. When something goes wrong

### I chose Workspace and cannot find development controls

Open **Advanced** on Project Home or in Project settings. Development Profile assignment, worker preferences, Runtime state, tasks, handoffs, executions, verification, and recovery are still available there. Alternatively, switch to **Development** at **Settings → General → T3 Fork interface**. Neither action changes Runtime or project state. Development Profiles is intentionally hidden from normal Workspace Settings navigation/search; use Project Home **Advanced → Manage profiles** or its direct URL.

### My worker will not start

Open **Edit task** and inspect the effective routing first, then **Settings → Providers**. Check provider installation/authentication, whether the provider is enabled, model availability, project/provider eligibility, and any routing rejection shown by the task.

If the UI says **Configure a worker preference first** or the attempt reports `no_default_model`, set an explicit task Worker preference with provider/model or configure the project's default model selection.

A disabled provider can be rejected as `provider_disabled` even when installed/authenticated.

If the attempt launched but later shows `failed` with only “The worker turn failed”, open the worker thread: provider-side errors (for example “Usage limit reached” on a subscription) appear there, and the provider can then list no models in the worker picker until it recovers. Choose a different eligible provider/model for the task and execute again.

A stale task revision is also a deliberate launch refusal: reload the task before executing.

### The provider I selected is unavailable

A saved candidate can remain configured while currently unavailable. The resolver follows the route's fallback:

- `continue` tries the next lower routing layer after the candidate list is exhausted;
- `inherit` stops Runtime routing and uses normal T3 behavior, including the project default model;
- `fail` refuses routing.

Choose another eligible worker or repair the provider. Do not assume routing can override project/provider eligibility.

### The worker is waiting but the attempt still says launched

Open the worker thread. Permission/approval prompts are handled there. A worker waiting for approval can remain `launched` until you respond and later Recheck.

### The task appears to be running but I am unsure what happened

Open the task and choose **Recheck attempt**. This reconciles the saved attempt with the existing worker thread/run. Inspect the worker-thread link and any failure shown on the attempt.

### No handoff appeared

A handoff is not automatically guaranteed by the execution bridge. Open the worker thread and explicitly ask it to append one with `t3_project_handoff_append`, then **Recheck attempt**. The provider thread must have Runtime MCP tools available.

### I restarted T3 during execution

Reopen the project and inspect the existing attempt and worker thread before doing anything else. Startup reconciliation resumes only a `pending` launch with its stable IDs; other active attempts are reconciled against their existing run. Do not start a replacement worker until the existing attempt becomes terminal.

### I cannot cancel the execution

Choose **Cancel execution**. While stop is in progress, the attempt is `cancelling` and keeps the task's active slot. If it remains active, use **Cancel again** or **Recheck attempt**. A failed/ambiguous stop becomes `reconcile_required` rather than freeing the task for a second launch.

Cancellation stops the selected worker thread with delegated-task stopping disabled; child/delegated tasks that worker spawned may continue and must be checked separately.

### The task says `reconcile_required`

**Do not launch another worker blindly.**

First choose **Recheck attempt** and inspect/open the existing worker thread.

If Recheck leaves the attempt `reconcile_required` **and the worker thread was deleted or can no longer be opened because it no longer exists**, choose **Cancel execution**. This records the attempt as `cancelled` and frees the task's active slot.

Do **not** use that recovery while the worker thread still exists and may be running; restore access and continue Recheck/recovery instead.

The implementation status value is `reconcile_required`; the UI presents this as a reconciliation-needed state.

### A different model was used than I expected

Trace the precedence in order:

**one-run (API callers only) → task → project → Development Profile → normal T3 behavior**

Then inspect candidate rejection reasons and the effective/winning layer. A higher layer may have been absent, exhausted with `continue`, deliberately inherited, or rejected. The launch path also rechecks provider/model eligibility immediately before work starts.

---

For compact state tables, storage/backups, fallback definitions, and the source-fork update procedure, continue with [Reference](reference.md).
