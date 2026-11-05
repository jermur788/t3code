# Governing spec — isolated upstream T3 catch-up trial after D4 A+B

**Authority:** Explicit user reply **"auth"**, 2026-11-05 22:14 UTC, accepting [option 1: upstream-first bounded isolated trial](manager-post-d4-integration-options-20261105.md).  
**Status:** **AUTHORIZED FOR ONE REVERSIBLE ISOLATED LOCAL TRIAL / NOT DISPATCHED / NOT IMPLEMENTED / NOT INTEGRATED**.  
**Classification:** user-accepted governing scope and acceptance criteria, NOT authority to push, PR, merge fork `main`, re-land continuation, release or deploy.  
**Companions:** [Current State](../../01_CURRENT_STATE.md), [Coordination/Handoff Protocol](../../02_COORDINATION_HANDOFF_PROTOCOL.md), [D4 K1/K2 review](manager-d4-full-root-k1-k2-verification-reconciliation-20261105.md), [post-D4 integration options](manager-post-d4-integration-options-20261105.md).

## 1. Authorized outcome and boundaries

Bring **current upstream T3 main** into a **new owned local trial branch/worktree based on the *integrated fork main***; resolve routine local conflicts **without changing fork main**, then run scoped verification and independent read-only review. Local commits on **only this new trial branch** may be made if needed to preserve a reproducible candidate. A local upstream merge into the trial branch is allowed; an upstream merge **into fork main** is not. Do not force/rewrite shared history.

This task **does not include** importing/rebasing the old divergent continuation experiment, the unpushed D4 A+B implementation, new Project Runtime behavior, D2 schema projection implementation, production deployment, upstream submission or a public/source push. The trial is an **upstream baseline qualification** only; D4 remains preserved in its private isolated worktree and K3 remains PARTIAL.

**Acceptance result:** a candidate isolated branch/worktree that preserves accepted fork-specific Project Runtime and P2 Evidence V0 behavior while incorporating the selected exact upstream tip, with reproducible tests and independent review. **PREVIEW, STATIC PASS, RUNTIME PASS and REVIEW PASS are separate evidence statuses.** No `INTEGRATED` status until a future separately approved fork-main merge and integrated-head verification.

## 2. Source checkpoint and change risk (dated, refresh at execution)

**Browser independently inspected on 2026-11-05:**
- Fork `jermur788/t3code` main: `fb67545d790c5c001e8f85827f219ab6493c435e` (PR #21 integrated).
- Upstream `pingdotgg/t3code` main: `25b53299b75d4d8d1d0667ad47e9cfed3749776e`.
- Incorporated upstream release-preparation parent: `bb4afa5425c52104a9261fa2d022cb8ba2fcc099`.
- Upstream comparison reports **91 commits ahead**, including **41 new since prior Stage 2 snapshot**; GitHub compare returned the **first 300 changed paths** only. Obtain **complete** exact diff with local Git before implementation. The previous Stage 2 dry-run merge conflict counts reflect an *older* upstream head and are **not usable for acceptance**.
- Latest source hotspots: `apps/server/src/orchestration-v2/Orchestrator.ts`, `ProviderTurnStartService.ts`, provider adapters (especially Claude/Codex), `ProjectionStore.ts`, `ThreadLaunchService` tests, `apps/server/src/mcp/OrchestratorMcpService.ts`, `packages/contracts`, `packages/shared/src/nodeSqliteClient.ts`/persistence. `EventSink.ts` and `ThreadLaunchService.ts` matched upstream in earlier checkpoint, but revalidate on actual new upstream tip.

**Fork-specific protected areas:** provider-neutral Project Runtime schema/services and persistence, task/attempt/handoff and routing, development modes/profiles, private/internal operator auth, Evidence V0 old-decoder coordinated upgrade limitation accepted for fork only, upstream-compatible thread/worktree/session lifecycles. Use accepted specs and current repo tests as authority; do not silently drop/replace fork-only migrations or alter Evidence V0 completion semantics.

## 3. Preflight and worktree safety — before first write

1. Read Project Instructions → [Current State](../../01_CURRENT_STATE.md) → [Coordination Protocol](../../02_COORDINATION_HANDOFF_PROTOCOL.md) → this governing spec → latest Runtime active tasks/handoffs and local host ledger. Confirm exact repo/remotes, all worktrees, branches, upstream/fork bases, task owners, dirty/untracked files, available disk and permissions.
2. Do **not** update existing stale local `main`, primary development-profiles checkout, four detached Stage 2 verification worktrees, or local unpushed D4 branch/evidence. PR #21 original/sanitized evidence remains **KEEP PRIVATE**; do not copy, read, upload or delete. Do not remount/unmount the read-only Files volume.
3. Fetch upstream/fork remote tracking refs only (non-destructive). If upstream has advanced, report both requested and selected exact tips; use current upstream unless changed source introduces a material security/architecture conflict. **Create a NEW uniquely named local branch/worktree from verified fork-main commit**, not by merging/rebasing any existing dirty worktree. One writer; isolated caches/state/test DB.
4. Check disk capacity and provider subscription availability before expensive builds. If local worktree cannot safely be isolated, report `OPERATIONAL BLOCKER`; no stash/reset/clean, force-push, branch deletion or history rewrite.

## 4. Bounded implementation method

1. **Provenance/rebase screen:** produce complete paginated/locally generated upstream commit and changed-path inventories. Distinguish merged upstream code from open PR proposals and fork-only state. Recompute conflict set with `git merge-tree`/equivalent on exact refreshed refs. Record material source/rebase hotspots and which old research counts are obsolete.
2. **Upstream trial on new owned branch only:** attempt upstream integration locally with reproducible non-destructive Git steps; resolve routine conflicts using upstream-compatible interfaces and preserve fork-specific Project Runtime, Evidence V0 and development profile/mode semantics. No direct checkout/reset of primary/stale `main` and no force operations. Local trial commits permissible; no push/PR.
3. **Architecture safety:** prefer existing upstream abstractions and isolated fork extensions. **STOP / REVIEW REQUIRED** if upstream has changed provider/orchestrator/session Git/worktree or DB authority such that accepted Runtime or Evidence semantics cannot be preserved without new architecture, significant core rewrite, new durable authority/migration, credential/security bypass or scope expansion.
4. **No continuation re-land:** Do not copy files/commits from `experiment/continuation-default-off-gate-20261104` or `d4/ab-revocation-guard-20261105` into the new trial. D4 K1/K2 remain qualified only on their original local branch. D2 shipping schema exclusion remains outstanding if any experimental feature is later reintroduced.
5. **Record exactly what was merged:** upstream provenance, any resolved conflicts, temporary changes, local commits on trial branch, all remaining divergences, and discarded or deferred changes. No silent acceptance of upstream breaking an accepted behavior.

## 5. Acceptance and verification matrix

**Static:** complete typecheck/format/lint/check:changed as applicable; focused server/web/contract/database tests and provider adapter tests for touched paths. Re-run failed tests after legitimate fixes; never weaken them simply to pass. Record all commands/exits and any unsupported test mode.

**Runtime:** verify Project Runtime task CAS/revision/provenance, project isolation, task attempts and handoffs across normal restart/reload; Evidence V0 old-decoder fork limitation and misleading completeness prevention; ordinary thread/run/command receipt/idempotency and provider-neutral two-provider stub paths where practical. If upstream touches UI, inspect actual rendered UI after building. Verify default-off experiment isn't accidentally in new trial and D2 agent-facing continuation schema doesn't leak.

**Compatibility:** compare relevant source/behavior with latest upstream, verify no fork-only regressions, record upstream issues/PRs that are **open proposals** separately from merged source. If full end-to-end provider or app-level MCP cannot run due to existing no-cost credential constraints, mark `OPERATIONAL BLOCKER` with exact reason; no fake PASS.

**Independent review:** other authorized provider/model from implementer, **READ-ONLY**; specifically audit preservation of Runtime, Evidence V0, client modes, DB changes, receipt semantics, upstream rebase hotspots, accidental continuation import and test adequacy. Repair/re-review routine defects within bounded scope. Stop for material unresolved conflicts and ask owner rather than inventing decisions.

**Completion states:** `IMPLEMENTED` local trial branch only; `STATIC PASS` on actually executed checks; `RUNTIME PASS` on demonstrated behavior; `REVIEW PASS` after independent review; **NOT INTEGRATED / NOT VERIFIED PRODUCTION** until future independent fork-main merge/release steps.

## 6. Routing / custody / stop conditions

**DeepSeek V4.1 Flash** orchestration-only: routing, task/ledger state, capacity watch, verification triage. No direct source writes, shell execution, code review or technical tests by DeepSeek. **Codex GPT-6.1 SOL Medium OR Claude Sonnet 5.5 Medium**: single technical writer/tester using actual available subscription; independent different-provider/model read-only review. **Opus** only for truly difficult unresolved security/concurrency architecture with explicit approval; no paid API calls. Record actual model/effort/quotas/reset or `UNKNOWN` and provider error/failover per attempt. At last report Codex A exhausted until 2026-11-08 21:15 UTC; Claude accounts rate-limited; Codex B had demonstrated review capacity but remaining allowance UNKNOWN—**re-measure, do not presume**.

**Hard stops:** Git push, PR, merge into fork `main`, upstream publication, experimental continuation/D4 re-land, production enablement, public shipping, major provider/orchestration redesign, new authority DB, destructive worktree cleanup, paid-resource cost, credential bypass, changes to PR #21 evidence or user-owned branches. The user's "auth" applied **only to this bounded trial**.

**Handoff:** update Runtime task and complete durable record when available, else restricted append-only local ledger, then return **VERDICT / BASE & OWNERSHIP / EXACT UPSTREAM TIP / CHANGED PATHS & CONFLICTS / LOCAL TRIAL COMMITS/FILES / TEST COMMANDS & RESULTS / RUNTIME PERSISTENCE & EVIDENCE CHECKS / INDEPENDENT REVIEW/REPAIRS / MODEL/QUOTAS / RISKS/BLOCKERS / INTEGRATION STATE / NEXT DECISION**. Continue routine repair/review within scope; **do not proceed automatically into continuation re-land or fork main merge**.

**Initial:** `AUTHORIZED / SPEC ACCEPTED / TASK TO BE DISPATCHED VIA LOCAL T3 CODE / NO VERIFIED AUTOMATIC BROWSER-TO-LOCAL WORKER BRIDGE`.
