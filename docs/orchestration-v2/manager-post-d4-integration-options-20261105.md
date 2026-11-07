# Manager integration decision brief — after D4 K1/K2 local qualification

**As of:** 2026-11-05 21:43Z D4 worker handoff and subsequent browser GitHub source/ref checks.  
**Authority:** **OPTION 1 (reversible isolated local upstream-first trial) AUTHORIZED by user's explicit 'auth' on 2026-11-05 22:14Z.** Scope is governed by [upstream trial spec](upstream-catchup-isolated-trial-governing-spec-20261105.md) and [complete T3 Code packet](task-upstream-catchup-isolated-trial-20261105.md), status **PREPARED / NOT DISPATCHED**. Options 2/3 remain unselected; **no fork-main merge, continuation/D4 re-land, Git push/PR, public release or production approved**.  
**Evidence:** [D4 full-root K1/K2 manager reconciliation](manager-d4-full-root-k1-k2-verification-reconciliation-20261105.md), [Stage 2 upstream experiment preview](manager-stage2-three-lane-return-reconciliation-20261105.md), [Current State](../../01_CURRENT_STATE.md).

## Established checkpoints and remaining risk

- Fork `main` at merged PR #21 `fb67545d790c5c001e8f85827f219ab6493c435e`: integrated and previously locally qualified, not production verified.
- Default-off experimental continuation branch `b3b8da54e0b8b184a1cf4e667d53e73e04f85074` remains separate/divergent. It was previously measured 34 ahead/336 behind fork main. Local unpushed D4 branch `d4/ab-revocation-guard-20261105` based on experiment has 12 worker-reported local commits/15 files. **Do not directly merge/rebase the divergent experiment or D4 branch onto main**.
- Current upstream `pingdotgg/t3code` main `25b53299b75d4d8d1d0667ad47e9cfed3749776e`, **91 commits** after incorporated upstream release-preparation parent. This includes **41 newer commits since the Stage 2 preview**, 225 changed paths, notably `Orchestrator.ts`, `ProviderTurnStartService.ts`, `ThreadLaunchService.test.ts`, MCP and shared contracts. Prior dry-run conflict counts **1/2/9 are historical to an older upstream snapshot** and do not predict this updated merge.
- D4 K1/K2 isolated full-server runtime evidence is accepted within its test scope; K3 crash/restart/pruning/portability PARTIAL. D2 agent MCP continuation schema exposure remains a **public shipping exclusion requirement** and existing experiment fails it when gate off. D4 success does not authorize D2 unsafe shipping.

## Options for owner decision

**1. Upstream-first isolated trial (AUTHORIZED, not yet dispatched).** One **bounded, isolated, reversible** new worktree derived from currently integrated fork main to apply the latest upstream delta, preserving fork Runtime extensions and P2 Evidence V0 semantics. One technical writer + different-provider review, tests/visual verification required for touched surfaces. **No push, no main merge, no public release, and no continuation re-land in this first task.** Stop for material architecture/security/rebase conflict; preserve all uncommitted work. After acceptance, separately decide whether to re-land the isolated continuation/D4 implementation as fresh changes onto this updated safe base.

**2. Re-land continuation/D4 before upstream catch-up.** Authorize a separate bounded fresh application of the experimental changes onto the existing integrated fork-main base. This may temporarily lower short-term merge complexity but creates additional rebase exposure, because upstream is now 91 commits forward and includes orchestration and provider-start changes. D2 must be split/omitted from shipping MCP schemas before any release and K1/K2 rerun on the new base. **Not recommended as default**.

**3. Defer integration.** Keep fork main unchanged and D4 evidence isolated; later reconsider after upstream settles or a higher-priority project task needs the Runtime feature. Safest immediate option, with no automated continuation available on main.

**Only option 1 is now an accepted scope authorization**, not permission to merge to main, push, activate continuation or publish evidence. The [governing spec](upstream-catchup-isolated-trial-governing-spec-20261105.md) controls execution. Private D4/PR #21 evidence remains untouched.

## If option 1 is adopted — future bounded T3 Code packet requirements

Before local technical writing, Overall Manager must issue/update a governing upstream reconciliation spec with exact upstream/fork sources, conflict policy, P2 Evidence V0 compatibility, Runtime persistence/isolation, D2 omission, test/review gates and stop conditions. Confirm live refs, existing branch/worktrees, ownership, uncommitted files, disk/free space; use a **new uniquely owned isolated worktree** based on fork main. DeepSeek orchestration-only, Codex SOL Medium or Sonnet Medium code/tests, a distinct provider/model independent read-only reviewer; actual quotas/reset or UNKNOWN. No Opus or paid-resource spending unless separately authorized.

**Required verification** includes relevant repo-wide typechecks and tests, database restart persistence, provider-neutral Runtime tests, event/command receipt correctness, app-level MCP compatibility when provider setup is available, and rendered UI inspection if upstream touches UI. Do not weaken tests merely to pass. If conflict demands a new architecture or changing authorization, stop with proposals and user decision. Produce an authoritative Runtime/local restricted handoff and manager acceptance review. Do **not** automatically chain into continuation re-land or push.

## Later re-land — separately approved

On an accepted, verified integration base, reintroduce the **minimum** continuation plus D4 A+B changes as fresh bounded commits in an isolated writer-owned branch, never by merging the old diverged experiment. Retain default-off, a valid private transactional run guard, prepared-run release behavior and D2 public-shipping agent-schema exclusion. Re-run **real-root K1/K2**, K3 recovery qualification as required by release target, MCP paired-client/packaged release schema budget, provider-neutral tests and independent review. A separate explicit decision is required before any fork-main merge, Git push/PR, production enablement or public release.

**2026-11-05 22:14Z transition:** User authorized option 1; the dedicated [trial implementation packet](task-upstream-catchup-isolated-trial-20261105.md) is PREPARED / NOT DISPATCHED. No local code work or main merge performed by this authorization. Future continuation re-land, public push/PR and fork-main merge still require separate decisions.
