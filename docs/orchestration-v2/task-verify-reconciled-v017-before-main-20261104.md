> **CURRENT AUTHORITY UPDATE — draft PR already opened, 2026-11-04:** The user approved and the manager created [fork-only draft PR #21](https://github.com/jermur788/t3code/pull/21). It is OPEN / DRAFT / UNMERGED. This task is still authorized **for verification only**. Do **not** open another PR, ask again for draft-PR permission, merge PR #21, or edit fork main. Later **merge approval** remains separate. Follow [current state](../../01_CURRENT_STATE.md) and [manager handoff](../../OVERALL_MANAGER_HANDOFF.md) if any older line below conflicts.

# T3 Code — independent pre-main validation of accepted v0.1.7 reconciliation

**Issued:** 2026-11-04 by Overall Manager, under authorized bounded verification.  
**Verdict required:** independently inspect and run the missing UI, restart, cross-project and Evidence V0 checks **without altering the accepted candidate branch or fork main**. Stop for user decision on any material fix or product behavior change.
**Manager review:** [Manager acceptance with precise evidence limits](manager-fork-upstream-reconciliation-acceptance-20261104.md).
**Candidate:** `jermur788/t3code`, branch `integration/fork-upstream-reconciliation-trial-20261104` at its current *accepted* checkpoint. Freeze and record actual remote head before running.
**Worker:** independent capable local T3 Code verification worker; DeepSeek/OpenCode for test/runbook and low-cost local checks. Stronger model for hard security/integration analysis if a reproducible defect appears. Never let implementing conflict resolver self-certify its own fix.

## Preflight and authority
1. Fetch fork main, candidate branch and pinned upstream v0.1.7, inspect status, active workers, branch/worktree ownership, latest remote heads, no unrelated dirty files. User has NOT approved merge or opening new PR.
2. Confirm space with `df -h` before installs/builds; previous local report: 48 GB free on root, 92 GB external, but live capacity must be rechecked.
3. Use a **fresh, owned, read-only or disposable external-volume worktree** from exact accepted candidate head. Existing reconciliation/gate worktrees and main stay intact. No reset, stash, force-push, destructive cleanup or overwriting another writer.
4. Prove available test and browser harness. Persist actual routing decisions, candidate/rejected models, host liveness, attempts, commands/exits and handoff in T3 Project Runtime if available; otherwise isolated appended ledger file. No fabricated cost/quota.

## Verification queue (serial)

### V1 — UI render inspection
- Start local app/dev server in a safe isolated mode; do not invoke real provider model calls. Inspect **rendered** web routing for both fork `/_chat/home` and upstream `/threads/$environmentId/$threadId` (use known fixture/mock route parameters). Capture screenshots or a reproducible screenshot/console log path, and check initial navigation/back links, error boundaries and console errors.
- Include the rendered layout when route registration or context is relevant. A successful Vite build alone is **STATIC PASS, not UI VERIFIED**.
- If browser runtime unavailable, report operational blocker and preserve evidence; do not fabricate screenshots.

### V2 — restart and project isolation
- Run or add **verification-only** deterministic, non-production SQLite fixture tests of fork Project Runtime across process/layer restart with two projects. Confirm project A receipts/handoffs/routing do not affect B, and pending receipt behavior remains idempotent under upstream V2 recovery changes. Do not turn on synthetic continuation gate—it is not in the reconciliation branch. Use stubbed providers, fresh file-backed SQLite and documented receipts.
- Inspect actual `Orchestrator`, `ThreadManagementService` and recovery path changes from upstream. If tests do not exist, document the exact coverage gap and propose minimal test-only packet rather than changing production code under this task.

### V3 — Evidence V0 after pruning
- Reproduce a supported event-history pruning/recovery scenario in isolated test SQLite; verify fork Evidence V0 reconstruction/export semantics and correct failure when source event history is genuinely absent. A worker claim or unit test unrelated to pruning is insufficient.
- If the new upstream internals changed the contract, classify **UPSTREAM COMPATIBILITY** and return a source-backed failing reproduction. Do not invent a migration or second event store.

### V4 — final bounded static/CI-equivalent checks
- Rerun target suites affected by any benign test-fixture changes, and `vp run typecheck`, `vp run check:changed upstream/main`, context budget test, and UI/web build as needed. Record exact commands, exit codes, counts, measured tool-list bytes and which baseline was used. The accepted branch's initial local record was green, but this independent run establishes any new evidence.
- Inspect GitHub-hosted CI availability. At manager review the branch head had **zero check-runs/status contexts/workflow runs**. Do not label missing CI as passing or failing.
- No paid provider or live API tests. T3 may use existing local model routing for workers; log actual provider/model and separate model execution from app-under-test providers.

### V5 — independent acceptance & durable handoff
- Have a reviewer from a different provider/model assess test evidence and relevant source when results materially change confidence. Do not conflate local verification success with production VERIFIED.
- Return: VERDICT by V1–V4, BASE/WORKTREE/OWNERS, actual route/attempt decisions, tests and UI image/log evidence paths, defects/classification, independent review, repo state, NEXT, and explicit **NOT INTEGRATED**.
- Do not amend/commit/push to accepted integration branch unless separately approved; for any discovered test-only changes use a separate isolated verification branch with one writer and return a diff for manager review.

## Stop conditions
No fork main update, draft PR, public upstream action, production continuation activation, changing provider/session/orchestration event semantics, new migrations/authority state, paid infrastructure, destructive Git commands, or cleanup of existing worktrees. Any substantial code change requires a separate bounded task and independent review.

## Expected manager next step
After evidence returns, manager updates candidate acceptance/risks. User approval is still needed to create the recommended **fork-only draft PR** or to promote branch to main directly; neither is authorized by this handoff. Public D2 shipping exclusion and D4 strict revocation remain separate release gates.
