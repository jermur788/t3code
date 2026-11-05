# D4 — One bounded isolated implementation, tests and independent review

**State:** **COMPLETED LOCALLY — IMPLEMENTED (worker-reported) / SCOPED RUNTIME PASS / REVIEW PASS WITH FINDINGS / REQUIRED FULL-SERVER ASSEMBLY VERIFICATION OPEN / NOT INTEGRATED**. This original task packet is historical; **DO NOT REDISPATCH**. [Manager reconciliation](manager-d4-isolated-implementation-return-review-20261105.md), [targeted verification follow-up](task-d4-full-server-assembly-verification-20261105.md).  
**User authority:** On 2026-11-05 user accepted **A + B** revocation behavior. This packet scopes the next isolated implementation/test step only; it does not authorize merge into fork `main`, automatic production rollout, upstream catch-up, public release, new authoritative tables, material paid-provider calls, or external evidence transfer.  
**Canonical governing spec:** [D4 ACCEPTED A+B](d4-accepted-revocation-contract-20261105.md), [D1–D5 staged safety spec](continuation-staged-safety-governing-spec-20261104.md). [Stage 2 source/feasibility findings](manager-stage2-three-lane-return-reconciliation-20261105.md). [Current State](../../01_CURRENT_STATE.md). [Coordination/Handoff Protocol](../../02_COORDINATION_HANDOFF_PROTOCOL.md).

## TASK / GOAL

Implement the narrowly accepted D4 guarantee **only in an isolated owned worktree/branch**:

**A — transactional no-new-run:** after the operator's revocation is durably committed, a new continuation `run.created` MUST NOT commit under that revoked authorization.

**B — pre-start stop:** if a run was already created in `preparing`, but execution is definitely not started when revocation is observed, block `prepared-run.release`/start and cancel unsettled effects; if release/provider-start may already be underway, preserve provenance and explicitly `reconcile_required` with safe stop attempts, never falsely claim absolute cancellation of an external call.

**No other product behavior expansion.** Feature remains default-off and outside main. Existing normal user commands and non-continuation Runtime work must be unchanged. D2 public agent schema remains a separate release gate.

## BASE / OWNERSHIP / ROUTING

**Browser-verified at task creation:** fork `jermur788/t3code` `main` `fb67545d790c5c001e8f85827f219ab6493c435e`, isolated default-off continuation `experiment/continuation-default-off-gate-20261104` `b3b8da54e0b8b184a1cf4e667d53e73e04f85074`, upstream `pingdotgg/t3code` `337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17`. **These are checkpoints, not permission to reset local main or merge refs.** Worker must refresh live remote, inspect all local worktrees, branch and dirt, ownership, unrelated changes, permissions, read-only mounts and free disk before writes. The user's primary checkout was reportedly on a development-profiles branch, local main stale, and four Stage 2 detached evidence worktrees exist; **do not reuse, alter, clean or delete those lanes**. Create a **new unique local worktree/branch** with one writer, forked from a *verified exact base*, preserving all uncommitted work. No force operations, stash, reset, cherry-pick/merge main or main write without separate authority. If a clean usable code base would require substantial reconciliation of divergent experiment and merged main, **STOP as INTEGRATION CONFLICT / REVIEW REQUIRED** and propose a minimal strategy; do not silently start large re-land or upstream catch-up.

**Orchestrator:** DeepSeek V4.1 Flash **only coordination, attempt/ledger updates and worker routing**, not code edits, shell/tests, packaging or independent code review.  
**Technical implementer:** Codex GPT-6.1 SOL Medium or Claude Sonnet 5.5 Medium (appropriate task-fit/current available subscription). One writer.  
**Independent reviewer:** the **other provider/model**, read-only, ideally concurrency/security familiar. Opus 5.5 only for demonstrated material unresolved security/concurrency problem and explicit allowed capacity/cost. Actual provider/model/effort, quota state/cooldown/five-hour reset or UNKNOWN per task dispatch, no invented values. No paid provider API calls.

## IMPLEMENTATION SEQUENCE (bounded)

1. **Preflight and proof before code:** Inspect the exact real full `server.ts` service/layer wiring and durable `ProjectRuntimeService.updateTask` revocation (`continuation:null`) versus `EventSink.commitCommand` transactions/DB identity. Worker Stage 2 only proved a service subset across two processes; if DB/coordinator serialization isn't real in the full root, **STOP** rather than implementing a best-effort promise. Inspect all three `run.created` emitters in `Orchestrator`, run/receipt outbox flows, `ThreadLaunchService` `defer_start`, `prepared-run.release`, effect worker/provider turn-start, restart replay and D2 schema touchpoints.
2. **A — private commit-time authorization:** Use a narrow upstream-friendly private guard/context carried only by the server-owned continuation launch path (never client-, agent-, tool- or prompt-mintable). Enforce the exact source authorization scope/revision **inside the transaction that would commit `run.created`**. Ensure denied attempts do not persist a fresh run, start effect or an accepted-success receipt; distinguish prior successful command receipts from new run creation. Typed refusal and Runtime attempt cancellation/reconciliation consistent with known thread/run state. Avoid altering regular message dispatch/queue/restart semantics.
3. **B — release/start revocation protection:** For the actual two-phase `defer_start` path, ensure `prepared-run.release` does not create a new start effect after a durably committed revocation when its `preparing` run is provably unstarted. Safe cancellation for unsettled effects; when provider-start has possibly been claimed/initiated, mark for explicit reconciliation and attempt supported best-effort stop. Do not assert atomic control of external provider `startTurn` unless a separately accepted architecture can prove it. Guarantee no extra provider-start work resurrected by replay/restart.
4. **Keep separate:** no new authority/epoch tables or schema migration without an explicit review/decision; no large upstream-engine rewrites, new public MCP capability, user-visible continuation enablement, dashboard state ownership, provider-specific custom policy or changes to shipping D2 advertised tool schemas. Never weaken existing acceptance tests just to pass.
5. **Evidence and review:** Stage 2 fixture results are baseline context, not proof. Implement deterministic real root tests and independent read-only review of the actual code and logs, repair any material findings and rerun.

## ACCEPTANCE TEST MATRIX

**Atomic ordering and scope**
- Revocation commit before guarded new run commit: **0 new runs, 0 start effects, no falsely accepted receipt**, typed denial, source/attempt durable state correct.
- Run commit before revocation: exactly one durable run; no duplicate from same-key replay; B applies if it remains unstarted. Distinct unrelated user-created runs unaffected.
- Two SQLite connections and separate server processes where practical: deterministic barriers and CAS ordering. Different project/source/task/revision, malformed/forged context and unauthorized actor all fail closed for continuation, never leak authority across projects.

**Prepared-run and effect lifecycle**
- Revoke after `run.created` while `preparing`, before `prepared-run.release`: **no new provider-start effect** and correct terminal/reconcile status.
- Race with release/event commit/effect claim: if provably unstarted, deny start and cancel safely; otherwise `reconcile_required` + stop attempt, never invent `cancelled`/provider acceptance.
- Crash/restart, pending receipt replay, old attempts/history pruning: no unauthorized new run or release; preserve IDs/provenance, no resurrected effects.
- Server gate disabled, previous policy removed, stale task revision or conflicting edit: fail closed for synthetic continuation. Existing service-level isolation remains.

**Regression and shipping**
- Ordinary user and non-continuation Project Runtime tasks work as before; existing D1 default-off behavior unchanged.
- Agent MCP `tools/list` and operator-only contract semantics: do not unintentionally broaden public tool schema (D2 packaged certification still separate).
- Fresh typecheck, focused and changed-file checks, web build if touched; rendered UI only if modified; actual local no-cost/stub provider restart integration where supported. Test two provider adapters when practical and no paid live calls.

**Review:** distinct provider/model **READ-ONLY** review of transaction atomicity, authorization provenance, error/receipt idempotency, B release vs provider race, upstream compatibility and tests. Rework and re-review until accepted or classify blocker; record exact commands/exits/log custody and test coverage; do not claim `RUNTIME PASS` from fixture-only testing.

## STOP CONDITIONS

Return to Overall Manager as `REVIEW REQUIRED` / `INTEGRATION CONFLICT` / `UPSTREAM COMPATIBILITY` / `PRODUCT DECISION` if:
- full-server transaction ordering doesn't support the accepted A guarantee;
- protected continuation cannot be distinguished from normal launches without adding a public/forgeable input;
- a correct A/B implementation requires a **material upstream engine redesign, new authoritative table/epoch, distributed lock, dangerous migration, changing D2 shipping contract, or stricter external-provider-start semantics**;
- independent security reviewer flags unresolved privilege or cancellation safety bug;
- only way forward would move experimental source into fork main or merge upstream without approval;
- paid services, private evidence export, destructive Git/cleanup or production enablement would be needed.

Do not substitute a final preflight check for a transaction guard. Do not claim an agent-facing default-off feature is shipping-safe.

## REQUIRED HANDOFF

**VERDICT / BASE + WORKTREE OWNERS / GOVERNING CONTRACT / PRECISE DIFF / RUN-COMMIT GUARD AND B RELEASE BOUNDARY / RECEIPT, REPLAY AND RESTART BEHAVIOR / TEST COMMANDS + RESULTS / FAILURES + REPAIRS / INDEPENDENT REVIEW + RE-REVIEW / PROVIDER/MODEL/EFFORT/QUOTAS / INTEGRATION STATE / NEXT AUTHORIZED ACTION**.

If a bounded clean implementation is infeasible because the experimental branch is heavily divergent, **stop after verified preflight and return a specific integration conflict**. Do not carry out upstream catch-up or broad experimental re-land silently.

**Outcome required:** `IMPLEMENTED` or `BLOCKED` on an **isolated branch only**. `INTEGRATED` and `VERIFIED` require future separate evidence and merge authorization. This packet is **prepared, not dispatched** by the browser manager.

## 2026-11-05 17:54Z — returned implementation result, supersedes original task text

The user provided the local worker handoff. The isolated branch reportedly has **3 local commits, 13 files, +1430/-44, clean**, on the original divergent experimental base, not pushed. **A implemented:** private continuation authorization context and SQL transaction-time `EventSink.commitCommand` guard; typed denial and rollback before run/start/accepted receipt. **B implemented:** guarded `prepared-run.release`/`prepared-run.retry` with terminal cancellation compensation, durable provenance, `EffectWorker` start recheck and reconciliation of ambiguous starts. No new schema, MCP tool field, epoch table or migration. Worker-reported static and focused test results: **113 changed-file tests, 153 acceptance tests, server typecheck all PASS**, independent Claude review **45 focused PASS + 4 ThreadLaunch PASS**, reviewer declined to claim other suites personally rerun. Two correction/re-review cycles closed the initial seven review findings; final **PASS WITH FINDINGS**. The browser manager has not inspected the unpushed local source or private logs.

**Acceptance gap remains:** actual combined `server.ts` root with real operator `continuation:null`, shared SQLite transaction wiring and natural async `schedulePreparation` release denial is **not demonstrated**. Contract Check 1 is REQUIRED; the [bounded verification handoff](task-d4-full-server-assembly-verification-20261105.md) is the next routine task **PREPARED / NOT DISPATCHED**, not a repeat of implementation. `IMPLEMENTED` is accepted as worker-reported isolated milestone; overall `VERIFIED / INTEGRATED / PRODUCTION` is withheld. No merge, push, paid provider or release permission. [Manager assessment](manager-d4-isolated-implementation-return-review-20261105.md) preserves details and limitations. **Do not rerun this original packet.**
