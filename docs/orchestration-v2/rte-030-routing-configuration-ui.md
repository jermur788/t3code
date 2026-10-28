# RTE-030 — Routing Configuration UI

Status: AUTHORIZED / ACTIVE

## Task
Add the settings screens for choosing AI workers without introducing worker execution.

## Routing
Preferred primary worker: OpenCode / DeepSeek-class implementation worker. Use a fresh independent Claude/Codex-class review if material architecture or integration concerns arise.

Use one writer for the UI lane and a fresh isolated worktree.

## Base / context

- Repository: `jermur788/t3code`
- Implementation base before this task packet: `main @ bbefeb3beae595fe4994958aed84fc1c2e911766` (post-PR #3 durable AI-worker routing merge)
- Task branch: `task/rte-030-routing-ui`
- Upstream inspected: `pingdotgg/t3code @ 68495b641b3e5834421b6549751eb65ed66fc6f4`
- RTE-020 is VERIFIED and merged. Reuse its contracts, persistence, resolver, provider eligibility, and RPCs; do not invent a second routing model in the frontend.
- Existing relevant UI seams include `DevelopmentProfilesSettings`, `ProjectsSettings` / `ProjectSettingsPanel`, and the existing Project Runtime task UI.
- Keep fork additions narrow and additive. `ProjectSettingsPanel` is an upstream rebase hotspot; prefer isolated child components/hooks over embedding large routing implementations directly into upstream-heavy files.

## Governing behavior

Routing precedence is already implemented server-side and remains authoritative:

1. explicit one-run override;
2. task routing;
3. project routing;
4. Development Profile routing;
5. ordinary T3 inheritance.

Worker roles describe an execution attempt, not a permanent persona:

- `implementation`
- `research`
- `review`
- `design`
- `test`
- `general`

Routing fallback semantics are already defined by RTE-020:

- `continue`
- `inherit`
- `fail`

Routing is preference/configuration, not authorization. Existing provider availability, project permissions, model constraints, runtime/interaction modes, and other T3 authorization remain authoritative.

## Goal

Make the verified RTE-020 routing configuration understandable and editable through the T3 interface while preserving server-authoritative resolution and validation.

## In scope

### Development Profile routing

- Extend the existing Development Profiles editor to edit role-routing defaults stored on the profile.
- Preserve the existing profile revision/CAS conflict model: instructions and routing share one profile revision.
- Show supported worker roles and configured route candidates/fallback behavior compactly and clearly.

### Project routing overrides

- Add project-level routing override configuration to the existing project settings surface.
- Prefer an isolated fork-specific child component mounted by the project settings panel rather than large logic additions to the upstream-heavy panel.
- Clearly distinguish project overrides from inherited Development Profile routing.

### Task routing

- Add task worker-role/routing configuration to the existing Runtime task UI using the RTE-020 task routing contracts/APIs.
- Make task-specific routing visibly higher precedence than project/profile routing.

### Effective routing / winning layer

- Display which routing layer currently wins for the selected task/role where useful.
- Use the existing server-side resolver/read APIs for effective routing. Do not duplicate precedence logic in React.
- Show inherited/effective routing in a way that makes `continue`, `inherit`, and `fail` understandable without exposing unnecessary implementation detail.

### Candidate selection and validation

- Populate candidate/provider/model choices from existing server/RPC/provider-candidate data where available.
- Preserve server-authoritative provider/project eligibility and validation.
- Surface read-only/permission, disconnected, invalid-candidate, stale-revision/conflict, empty/loading, and RPC error states.

### Tests and docs

- Add focused UI/component/logic tests for editing, inheritance/effective display, precedence presentation, error/conflict states, and permission/read-only behavior.
- Update user-facing Project Runtime / Development Profile docs where configuration behavior changes.

## Out of scope

RTE-030 is UI/configuration only. Do not:

- launch an AI worker;
- create execution attempts;
- add an Execute action for Runtime tasks;
- add cancellation;
- add restart/recovery behavior;
- add execution history;
- add the EventSink execution hook;
- add a second provider/orchestration engine;
- change routing precedence or RTE-020 contracts unless a real defect is proven and reported to the manager;
- add quota/cost scheduling or dashboard functionality.

## Ownership / repo safety

Before writable implementation work:

1. fetch current `origin/main` and confirm the required base has not been superseded by manager-approved integration;
2. create a fresh isolated worktree from `task/rte-030-routing-ui` (or an explicitly manager-approved successor base);
3. inspect status and preserve unrelated work;
4. do not stash, reset, discard, or overwrite unrelated changes.

Keep new routing UI logic in isolated fork-specific components/hooks where practical. Minimize edits to upstream-heavy route/settings files.

## Acceptance

RTE-030 may reach `RUNTIME PASS` / `REVIEW PASS` only when all of the following are true:

- Development Profile role routing can be viewed and edited through the UI.
- Project routing overrides can be viewed, edited, and cleared/inherited correctly.
- Runtime task role/routing can be viewed and edited.
- Effective/winning routing layer is shown using server-authoritative resolution rather than duplicated client precedence logic.
- `continue`, `inherit`, and `fail` behavior is represented correctly.
- Candidate choices respect existing provider/project eligibility/availability rules.
- stale revisions/conflicts, permissions/read-only, invalid data, loading, and RPC errors have usable states.
- no worker launch/execution bridge behavior is introduced.
- TypeScript/lint/tests pass for the changed packages.
- rendered UI inspection is performed for profile, project, and task routing states at desktop width and at least one narrow/responsive width.
- rendered inspection checks normal, inherited/effective, validation/error, and read-only states where reproducible.
- upstream overlap is reviewed and rebase hotspots are recorded.

## Verification

At minimum:

- focused unit/component tests for new routing UI logic;
- package typecheck;
- relevant lint/test commands;
- broader web/client test suite if changed seams warrant it;
- rendered UI inspection with screenshots/captures or equivalent durable evidence;
- verify no execution-attempt records or worker launches are created by RTE-030 interactions;
- compare final upstream-heavy diffs against current upstream before handoff.

Do not weaken existing tests merely to make the suite green.

## Stop conditions

Stop and return `BLOCKED` only for a genuine product choice, material architecture trade-off, security/integration conflict, unavailable required API that would force a contract change, or scope expansion into RTE-040+.

Routine implementation defects, test failures, lint/typecheck failures, UI defects, and review findings should be repaired within this task.

## Mandatory handoff

Before ending substantial work, return a structured handoff containing:

### VERDICT

One of: `IMPLEMENTED`, `STATIC PASS`, `RUNTIME PASS`, `REVIEW PASS`, `VERIFIED`, `BLOCKED`.

### BASE / CHECKPOINT

- starting base;
- branch/worktree;
- final revision/checkpoint;
- upstream revision inspected;
- working-tree cleanliness.

### RESULT

- files/components changed;
- concise behavior delivered;
- intentional exclusions.

### VERIFICATION

- exact tests/checks run and results;
- rendered UI evidence and states inspected;
- checks not run and why.

### FAILURES / RISKS

- failures encountered and repairs;
- unresolved risks;
- blocker classification if applicable;
- rebase hotspots.

### REVIEW

- reviewer/provider/model if reviewed;
- findings and repairs;
- re-review result.

### INTEGRATION STATE

- not integrated / PR open / merged / verified integrated head;
- content drift/cleanup status.

### NEXT

Exact next authorized manager action. Do not start RTE-040 without manager acceptance of RTE-030.
