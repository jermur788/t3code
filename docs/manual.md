# T3 Fork Operator Manual

This is the shortest supported path from a fresh source checkout to durable, provider-neutral Runtime work. It assumes you already know Git and terminal basics.

> [!IMPORTANT]
> Use the **source checkout** workflow below for this fork. Upstream installers/packages, `t3 update`, and upstream in-app updates install stock T3 and do not contain fork features such as Project Home, Project Runtime, Development Profiles, or Runtime task routing.

For compact definitions, storage details, state tables, routing fallback semantics, and upgrade notes, see [Reference](reference.md). For upstream T3 features that are not fork-specific, use the [user documentation index](user/README.md).

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

After pairing, T3 opens normally and the authenticated root redirects to fork **Project Home** (`/home`). Development ports vary by checkout/worktree; do not assume a fixed port.

If you lose the pairing URL while the server is running, generate another with:

```sh
node apps/server/src/bin.ts pair
```

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

## 2. Connect an AI provider

Open **Settings → Providers**. If you are connected to a remote environment, select that environment first.

For Codex, T3 can connect a ChatGPT account from this screen or use an existing `codex login`. Other CLI providers are discovered from the environment where the T3 server runs; install and authenticate them on that machine. Enable the provider/model you intend to use. Do not paste provider secrets into Project Instructions, Runtime tasks, or handoffs.

Confirm three separate things:

| Check | Meaning |
| --- | --- |
| Provider availability | T3 can see an installed/authenticated and enabled provider and its advertised models. |
| Worker routing preference | Runtime prefers a provider/model for a role such as implementation or review. |
| Project eligibility | Normal T3 project/provider settings, model constraints, modes, permissions, and current availability still allow that worker to launch. |

A saved routing preference is not authorization. T3 rechecks eligibility immediately before execution.

**Expected:** the provider appears usable in the normal T3 model/provider controls. If a saved worker later becomes unavailable, T3 keeps the preference visible with a warning rather than silently rewriting it.

Provider-specific help: [Codex](user/providers-codex.md), [Claude](user/providers-claude.md), [Cursor](user/cursor.md), and [Install and first run](user/install.md#providers).

## 3. Set up a project

Open **Project Home** (`/home`). Add or open a repository with T3's normal project controls, then select the concrete project/checkout on Project Home.

Project Home shows the fork-specific durable layers before you start a thread:

- Development Profile;
- Project Instructions;
- Sources;
- Project State;
- Tasks & Handoffs.

Choose **Start a thread** when you want a normal T3 thread for the selected project. **Classic T3 Home** opens the upstream-style home; `/?classic=1` is the direct route.

### Assign a Development Profile

Open **Settings → Development Profiles**, select the environment, create or select a profile, and save the shared development instructions you want projects to inherit.

Then open **Settings → Projects**, select the concrete project/checkout, and choose that profile under **Development Profile**. A project can have one profile. Project-specific instructions override directly conflicting profile instructions.

### Enable Project Runtime

In **Settings → Projects**, select one concrete environment and checkout, then open **Project Runtime** and choose **Enable Runtime**.

Add only project-owned durable truth:

- **Project Instructions:** working rules and constraints for this project.
- **Sources:** registered workspace-relative text files that workers may search/read on demand.
- **Project State / Tasks:** durable work state and acceptance/verification information.
- **Handoffs:** append-only continuation records produced after substantial work.

Runtime state belongs to the selected project on that environment, not to a provider or conversation. Disabling Runtime hides its editors but keeps the records. Development Profile assignment remains active even when Runtime is disabled.

Registered sources are references to workspace files; Runtime does not copy their bodies. Back up the source files as well as Runtime state.

If you want workers to leave durable continuation records, put this requirement in Project Instructions or the task's **Next action**:

> Before finishing substantial work, append a handoff with `t3_project_handoff_append` that records the result, tests run/not run, risks, repository state, verification/integration state, and exact next action.

The worker's provider thread must have Runtime MCP tools available for that handoff call to work.

## 4. Configure workers

Worker roles describe an execution attempt, not a permanent agent persona:

- **implementation** — make the requested change;
- **research** — investigate and return evidence;
- **review** — independently inspect existing work;
- **design** — produce design/architecture work;
- **test** — exercise or qualify behavior;
- **general** — work that does not fit a narrower role.

Configure reusable defaults in **Settings → Development Profiles**. Configure project overrides in **Settings → Projects → Worker preferences**. Configure a task-specific role/preference when creating or editing a Runtime task.

Routing precedence is:

1. explicit one-run override *(API/resolver callers only; the Runtime task UI has no one-run input)*;
2. task routing;
3. project routing;
4. Development Profile routing;
5. normal T3 behavior.

The first applicable layer determines the preference. Candidate failures may continue, inherit, or fail according to that layer's fallback policy; see [Routing fallback semantics](reference.md#routing-fallback-semantics).

The Runtime task **Execute task** action launches from saved task/project/profile policy. Its RPC does not expose a user-entered one-run override.

Where routing is shown, use T3's **effective** / winning-layer display rather than trying to infer the result yourself. Routing does not bypass provider availability, project settings, model support, runtime/interaction modes, permissions, or other T3 eligibility checks.

## 5. Run a real task

Use one small task all the way through this manual:

> **Document the project's test command** — add a short `Tests` section to the project README using the command that already exists in the repository. Do not change code or dependencies.

Open **Settings → Projects → Project Runtime** and choose **Create task**.

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

- set an explicit task Worker preference with an eligible provider **and model**; or
- confirm the project has a default model selection that normal T3 inheritance can use.

If neither exists, Execute can fail with `no_default_model` / **Configure a worker preference first**.

Also check where work will happen. The default is **Shared checkout**, which edits the live project checkout. **New worktree** creates an isolated worktree from the configured base. Permission mode comes from the route/project defaults; if the worker needs approval, open its worker thread and approve there.

Choose **Execute task**.

T3 checks the loaded task revision, Runtime enablement, routing, provider/model eligibility, and workspace base before launch. A successful launch creates one durable execution attempt and one worker thread. The attempt shows the provider/model, winning routing layer, status, failure information when present, any linked handoff, and a link to the worker thread.

Only `planned`, `ready`, and `active` tasks can execute. One active attempt is allowed per task.

When the worker turn finishes, choose **Recheck attempt**. Outside startup reconciliation, T3 does not continuously poll a finished worker into a new terminal Runtime status.

Then inspect:

1. the repository diff/result;
2. the task result and verification evidence;
3. **View handoffs** for the worker's durable continuation record;
4. the execution attempt and linked worker thread.

A handoff is context, not proof. It records what the worker says changed, tests run/not run, risks, repository/integration state, and next action; the next worker or manager still checks those claims.

If no handoff appears, open the worker thread and ask it to append one with `t3_project_handoff_append`, then **Recheck attempt**.

If the implementation satisfies acceptance, move to independent review rather than treating the worker's “done” message as verification.

## 6. Review and verify work

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

## 7. Restart and continue

This proves the fork's central persistence property.

1. Create and execute the example task.
2. Confirm the task, attempt, and handoff are visible.
3. Stop the development server normally.
4. Start it again:

```sh
vp run dev
```

5. Open the new `pairingUrl:` printed by the dev runner if the browser needs pairing.
6. Reopen **Project Home**, select the same project/checkout, and return to **Settings → Projects → Project Runtime**.
7. Confirm the saved instructions, sources, task, execution attempt, and handoff remain.
8. Continue in the same provider or switch to another eligible provider.

On startup, T3 reconciles active execution attempts against their existing worker threads/runs. A `pending` launch replays with the same stored IDs. An ambiguous attempt remains `reconcile_required` rather than allowing a speculative second worker.

T3's normal **Continue threads after restarts** behavior can resume provider threads independently of the Runtime attempt classification, so inspect the existing worker thread before starting any replacement work.

Durable state includes project instructions, source registrations, project/task state, handoffs, routing/profile state, and execution references/state. Important project truth should not depend on the old chat remaining available.

## 8. When something goes wrong

### My worker will not start

Open **Edit task** and inspect the effective routing first, then **Settings → Providers**. Check provider installation/authentication, whether the provider is enabled, model availability, project/provider eligibility, and any routing rejection shown by the task.

If the UI says **Configure a worker preference first** or the attempt reports `no_default_model`, set an explicit task Worker preference with provider/model or configure the project's default model selection.

A disabled provider can be rejected as `provider_disabled` even when installed/authenticated.

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

### The task says `reconcile-required`

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
