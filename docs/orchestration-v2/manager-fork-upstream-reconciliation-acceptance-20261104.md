# Manager acceptance — fork/upstream v0.1.7 reconciliation trial

**Date:** 2026-11-04 (Europe/Dublin), review at user handoff ~08:17.
**Overall Manager verdict:** **REVIEW PASS (bounded conflict-resolution review); CANDIDATE ACCEPTED FOR NEXT INTEGRATION GATE; NOT INTEGRATED; NOT PRODUCTION VERIFIED.**
**Authority:** manager accepts the isolated reconciliation result for continuation of authorized validation, NOT permission to update fork main, open a new PR, ship, or enable synthetic continuation. Those remain separate actions.
**Current candidate:** [fork/upstream reconciliation branch](https://github.com/jermur788/t3code/tree/integration/fork-upstream-reconciliation-trial-20261104) at the reported pushed checkpoint.
**Independent worker evidence:** [routing, conflict, verification, and read-only review ledger](https://github.com/jermur788/t3code/blob/integration/fork-upstream-reconciliation-trial-20261104/docs/orchestration-v2/fork-upstream-reconciliation-routing-ledger-20261104.md).
**Prior authority:** [fork/upstream task](task-fork-upstream-reconciliation-20261104.md); [approved staged safety spec](continuation-staged-safety-governing-spec-20261104.md).

## What manager independently checked through GitHub

- Branch exists at user-reported head; last commit is the ledger. The preceding commit is a **true merge commit with two parents**: fork-derived prepared branch (itself descending from fork main) and upstream v0.1.7; no history rewrite. GitHub compare confirms branch **ahead of fork main, zero commits behind**, with fork main exactly unchanged. The compare counts include upstream's history; they are not a count of manually resolved conflict files.
- Source-inspected `apps/server/src/mcp/OrchestratorMcpService.ts` around `capabilities()`: it uses upstream `resolveProjectProviderInstanceEnabled(settings, parent.thread.projectId, provider.instanceId)` and fork `providerEligibilityIssues` + `providerConstraintMessages`, preserving caller-project restrictions in the exposed capability reasons.
- Source-inspected `packages/shared/src/usageLimits.ts`: the fork-owned `resolveProviderInstanceCapacity` still exists, `hubAccountName` is in the code, and the merged bound display name falls back to account/email-derived behavior as described. Full resolver behavior is supported by local 71-test result, not independently executed in browser.
- Inspected `runtimeLayer.test.ts`, `linkOrigin.test.ts` and `PeerForwarding.test.ts` presence of NodeCrypto, retained fork test helpers and upstream in-process MCP layers.
- Confirmed agent-context budget snapshot still reads `7496 / 9224 / 58519`; the worker's locally executed AgentContextBudget test supports a matching measured snapshot on the reconciled tree.
- Queried `RuntimeTaskContinuationGate.ts` and `RuntimeTaskContinuationPolicy.ts` on the reconciliation branch: **absent**. This is expected: the branch does not include the separate experimental gate/synthetic continuation policy. There is no permission to merge the gate.
- Read worker ledger and exact command outputs recorded there. Repo test claim: `vp build` web 7430 modules, `vp run typecheck` 40 packages, `vp run check:changed upstream/main` 81 files / 2072 tests, various focused suites and context budget, all final exit 0. Earlier Playwright/format failure was repaired before final rerun. This is worker-recorded **local RUNTIME PASS / STATIC PASS**, not independently run by this manager.
- Read actual independent Codex reviewer routing and returned verdict from persisted worker ledger: **CLEAN**, no reported findings. Independent reviewer did not run tests and did not review all upstream history. This supports **REVIEW PASS for the seven resolved conflict scopes**, not complete end-to-end sign-off.
- Queried GitHub commit statuses, check-runs and workflow runs at the branch head: **zero hosted checks/runs returned**. Thus **GitHub CI PASS is not claimed**. The commit status API's generic `pending` state was accompanied by an empty status array; it is not a failed or successful CI run.
- Current upstream main was **one additional commit ahead** of the explicitly pinned v0.1.7 merge baseline at inspection, affecting VCS and review/diff/UI code; this does not invalidate the frozen v0.1.7 trial but means it is **not current upstream main**. Do not claim latest-main sync.

## Accepted details of trial

The historically predicted eighth conflict did not reproduce at the pinned upstream source. Seven conflicts were resolved on the isolated branch with source-preserving merge choices:
1. `OrchestratorMcpService.ts`: project-scoped provider enablement plus fork eligibility reasons.
2. `linkOrigin.test.ts`: fork Runtime mocks plus upstream in-process MCP server layer.
3. `PeerForwarding.test.ts`: same two-sided layer union.
4. `GrokAdapterV2.test.ts`: fork and upstream imports both retained.
5. `runtimeLayer.test.ts`: upstream expanded test, crypto and thread uniqueness plus fork test helpers.
6. `routeTree.gen.ts`: regenerated, includes both fork home and upstream thread routes.
7. `usageLimits.ts`: capacity resolver and hub-account display naming preserved.

The Effect 4.1.2 compatibility repairs and Evidence V0 EventStoreV2 import are documented and supported by typecheck/test passes. No fresh main branch write, no production feature enablement, no public upstream contribution.

## What acceptance does NOT cover

1. **UI VERIFICATION REQUIRED:** generated route composition builds but has not been inspected in a rendered app. Under project policy, build PASS is not equivalent to UI runtime VERIFIED.
2. **RUNTIME VERIFICATION REQUIRED:** cross-project isolation, restart recovery under updated upstream Orchestrator/EffectWorker, and Evidence V0 export following event-history pruning are not proven by the reported focused suites.
3. **HOSTED CI NOT RUN:** no branch-level GitHub Actions/status checks were found. Local checks provide bounded confidence only. Pre-commit hook was skipped on a large merge index, with compensating local gate runs; this is documented, not waived.
4. **DIFF BASE CONFIDENCE:** `check:changed upstream/main` tested the fork-specific delta against the pinned upstream merge base, not the entire 327-commit upstream update as if each commit were newly written. High confidence requires targeted regression suite coverage and/or full host CI after PR.
5. **RELEASE GATES UNCHANGED:** D2 experimental agent-facing exclusion and D4 strict production revocation must be satisfied before any production continuation; fork/upstream reconciliation alone does not implement these.
6. **No direct repository disk check:** previously reported root capacity recovered to 48 GB free and external volume 92 GB free, but browser manager cannot verify `df` remotely. A local worker should confirm before heavier tests.

## Decision and recommended sequence

**Decision A — Manager accepted** the isolated reconciled trial as a **candidate baseline** for eventual fork-main integration. Source-level conflict resolution **REVIEW PASS**, local test/verification **RUNTIME PASS**, but **INTEGRATION/PUBLIC RELEASE still NOT VERIFIED**. The candidate branch is frozen at its accepted checkpoint until a fresh change requires delta review.

**Decision B — User approval required:** choose **draft fork-only PR to main** (recommended) rather than direct fast-forward because the change contains extensive upstream history, meaningful provider/orchestration internals, no hosted CI and unverified rendered UI and recovery semantics. The PR provides a durable review surface and makes hosted checks available where configured; it does **not** automatically merge or deploy. Do not create PR until user explicitly authorizes. Direct fast-forward should not be done without explicit authority and final required verification.

**Meanwhile authorized:** read-only manager review and a bounded *local verification-only* task (without code edits or merge) for rendered UI route composition, restart/recovery/cross-project isolation and Evidence V0 export on the candidate branch. If a defect appears, open a separate isolated one-writer repair lane and update the accepted trial only after rerunning affected checks and independent review. No real/paid provider calls.

**Next exact action:** user approves draft PR or direct main update after manager presents tradeoffs; for recommended draft PR, browser manager can open it with connected GitHub when explicitly authorized, keep draft and unmerged, verify branch/CI status and use a local verification handoff for the missing runtime/UI cases. If user declines PR, preserve the accepted branch and run tests in isolation.

## Status

- IMPLEMENTED — seven conflict resolutions + compatibility repairs, on isolated branch.
- STATIC PASS / RUNTIME PASS — local worker tests and build, documented, not independently re-executed in browser.
- REVIEW PASS — independent Codex conflict review and manager source spot check; limited scope.
- INTEGRATED — **NO**; fork main untouched.
- VERIFIED — **NO** as production UI/restart/provider acceptance.
- PRODUCT DECISION — fork-main promotion method (draft PR vs explicitly authorized direct update); D4 detailed launch boundary remains separately unresolved; D2 not yet implemented.
