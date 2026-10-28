# T3 Fork Operator Manual

This is the shortest supported path from a fresh source checkout to durable, provider-neutral Runtime work. It assumes you already know Git and terminal basics.

For compact definitions, storage details, state tables, routing fallback semantics, and upgrade notes, see [Reference](reference.md). For upstream T3 features that are not fork-specific, use the existing [user documentation](user/).

## 1. Quickstart

### Requirements

Use a machine supported by the T3 web/server development workflow: macOS, Linux, or Windows. WSL is supported on Windows. The native desktop app is available on macOS and Windows; Linux users should use the web/server workflow.

Install:

- Git.
- Node.js **26.12.1**.
- Vite+ (`vp`).
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
vp dev
```

**Expected:** the development server and web client start and the browser opens T3 Fork **Project Home**. Development ports can vary by checkout/worktree, so use the URL printed by `vp dev` rather than assuming a fixed port.

If startup fails, first confirm `node --version`, `vp --version`, and that `vp install` completed. More development commands are in [docs/operations/development.md](operations/development.md).

### Provider prerequisite

T3 controls provider tools/accounts; Runtime routing does not install or authenticate them. Configure at least one provider before executing a Runtime task.

Supported providers include Codex, Claude Code, Cursor, Grok Build, OpenCode, and Antigravity. The common CLI sign-ins are:

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

For Codex, T3 can connect a ChatGPT account from this screen or use an existing `codex login`. Other CLI providers are discovered from the environment where the T3 server runs; install and authenticate them on that machine. Do not paste provider secrets into Project Instructions, Runtime tasks, or handoffs.

Confirm three separate things:

| Check | Meaning |
| --- | --- |
| Provider availability | T3 can see an installed/authenticated provider and its advertised models. |
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

Then open the selected project's settings and choose that profile under **Development Profile**. A project can have one profile. Project-specific instructions override directly conflicting profile instructions.

### Enable Project Runtime

Open **Settings → Project → Project Runtime** for one concrete environment and checkout, then choose **Enable Runtime**.

Add only project-owned durable truth:

- **Project Instructions:** working rules and constraints for this project.
- **Sources:** registered workspace-relative text files that workers may search/read on demand.
- **Project State / Tasks:** durable work state and acceptance/verification information.
- **Handoffs:** append-only continuation records produced after substantial work.

Runtime state belongs to the selected project on that environment, not to a provider or conversation. Disabling Runtime hides its editors but keeps the records. Development Profile assignment remains active even when Runtime is disabled.

Registered sources are references to workspace files; Runtime does not copy their bodies. Back up the source files as well as Runtime state.

## 4. Configure workers

Worker roles describe an execution attempt, not a permanent agent persona:

- **implementation** — make the requested change;
- **research** — investigate and return evidence;
- **review** — independently inspect existing work;
- **design** — produce design/architecture work;
- **test** — exercise or qualify behavior;
- **general** — work that does not fit a narrower role.

Configure reusable defaults in **Settings → Development Profiles**. Configure project overrides in the selected project's settings. Configure a task-specific role/preference when creating or editing a Runtime task.

Routing precedence is:

1. explicit one-run override;
2. task routing;
3. project routing;
4. Development Profile routing;
5. normal T3 behavior.

The first applicable layer determines the preference. Candidate failures may continue, inherit, or fail according to that layer's fallback policy; see [Routing fallback semantics](reference.md#routing-fallback-semantics).

The Runtime task **Execute task** action currently launches from the saved task/project/profile policy; its RPC does not expose a user-entered one-run override. The one-run layer remains the highest-precedence resolver contract for callers that supply one.

Where routing is shown, use T3's **effective** / winning-layer display rather than trying to infer the result yourself. Routing does not bypass provider availability, project settings, model support, runtime/interaction modes, permissions, or other T3 eligibility checks.

## 5. Run a real task

Use one small task all the way through this manual:

> **Document the project's test command** — add a short `Tests` section to the project README using the command that already exists in the repository. Do not change code or dependencies.

Open **Settings → Project → Project Runtime** and choose **Create task**.

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

Save the task. Reopen it and inspect **Worker preference** and the effective routing result. If necessary, set a task-specific worker or allow the project/profile route to apply.

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

If the implementation satisfies acceptance, move to independent review rather than treating the worker's “done” message as verification.

## 6. Review and verify work

Use this cycle:

```text
Runtime task
→ implementation worker
→ result + handoff
→ fresh independent review
→ repair if necessary
→ verification
→ next task
```

For the example task, use a fresh execution attempt for review rather than continuing the implementation session. Because only `planned`, `ready`, and `active` tasks can execute, do not move the task to lifecycle `review` before launching the reviewer. Either keep the task in an executable status, change its worker role/preference to **review**, and start the next attempt after the implementation attempt is terminal; or create a separate bounded review task in `ready` status. Ask the reviewer to check the actual diff, repository configuration, acceptance criteria, and claimed verification. After reconciliation, update lifecycle and verification from the evidence.

Do not equate lifecycle with evidence:

- a task can be `done` without being verified;
- a worker can say “done” without proof;
- a handoff can claim tests passed without raising the task's verification milestone.

The operator-facing project states used in this fork are:

`IMPLEMENTED` → `STATIC PASS` → `RUNTIME PASS` → `REVIEW PASS` → `INTEGRATED` → `VERIFIED`

with `BLOCKED` and `DEFERRED` used when progress cannot or should not continue. The persisted task verification milestone uses lowercase values such as `static-pass`, `runtime-pass`, `review-pass`, `integrated`, and `verified`; see [Verification terminology](reference.md#verification-terminology).

Record passing evidence before raising a passing milestone. `verified` cannot coexist with failing evidence.

## 7. Restart and continue

This proves the fork's central persistence property.

1. Create and execute the example task.
2. Confirm the task, attempt, and handoff are visible.
3. Stop the development server normally.
4. Start it again:

```sh
vp dev
```

5. Reopen **Project Home**, select the same project/checkout, and return to **Settings → Project → Project Runtime**.
6. Confirm the saved instructions, sources, task, execution attempt, and handoff remain.
7. Continue in the same provider or switch to another eligible provider.

On startup, T3 reconciles active execution attempts against their existing worker threads/runs. A `pending` launch replays with the same stored IDs. An ambiguous attempt remains `reconcile_required` rather than allowing a speculative second worker.

Durable state includes project instructions, source registrations, project/task state, handoffs, routing/profile state, and execution references/state. Important project truth should not depend on the old chat remaining available.

## 8. When something goes wrong

### My worker will not start

Inspect the task's effective routing first, then **Settings → Providers**. Check provider installation/authentication, model availability, project/provider eligibility, and any routing rejection shown by the task.

A stale task revision is also a deliberate launch refusal: reload the task before executing.

### The provider I selected is unavailable

A saved candidate can remain configured while currently unavailable. The resolver follows the route's fallback:

- `continue` tries the next lower routing layer after the candidate list is exhausted;
- `inherit` stops Runtime routing and uses normal T3 behavior;
- `fail` refuses routing.

Choose another eligible worker or repair the provider. Do not assume routing can override project/provider eligibility.

### The task appears to be running but I am unsure what happened

Open the task and choose **Recheck attempt**. This reconciles the saved attempt with the existing worker thread/run. Inspect the worker-thread link and any failure shown on the attempt.

### I restarted T3 during execution

Reopen the project and inspect the existing attempt before doing anything else. Startup reconciliation resumes only a `pending` launch with its stable IDs; other active attempts are reconciled against their existing run. Do not start a replacement worker until the existing attempt becomes terminal.

### I cannot cancel the execution

Choose **Cancel execution**. While stop is in progress, the attempt is `cancelling` and keeps the task's active slot. If it remains active, use **Cancel again** or **Recheck attempt**. A failed/ambiguous stop becomes `reconcile_required` rather than freeing the task for a second launch.

### The task says `reconcile-required`

**Do not launch another worker blindly.**

The stored execution cannot yet be proven terminal. Use **Recheck attempt** after the environment/provider recovers and inspect the existing worker thread. `reconcile_required` intentionally blocks another execution until T3 can reconcile the old attempt.

The implementation status value is `reconcile_required`; the UI presents this as a reconciliation-needed state.

### A different model was used than I expected

Trace the precedence in order:

**one-run → task → project → Development Profile → normal T3 behavior**

Then inspect candidate rejection reasons and the effective/winning layer. A higher layer may have been absent, exhausted with `continue`, deliberately inherited, or rejected. The launch path also rechecks provider/model eligibility immediately before work starts.

---

For compact state tables, storage/backups, fallback definitions, and the source-fork update procedure, continue with [Reference](reference.md).
