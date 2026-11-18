# Independent manager source review — default-off continuation gate

**Date:** 2026-11-04, after the local gate handoff (~06:39 Europe/Dublin).  
**Source of truth:** exact pushed [isolated gate branch](https://github.com/jermur788/t3code/tree/experiment/continuation-default-off-gate-20261104), [T3 local routing ledger](https://github.com/jermur788/t3code/blob/experiment/continuation-default-off-gate-20261104/docs/orchestration-v2/staged-continuation-routing-ledger-20261104.md), [T3 trial](https://github.com/jermur788/t3code/blob/experiment/continuation-default-off-gate-20261104/docs/orchestration-v2/staged-continuation-t3-upstream-trial-20261104.md), [T4 design](https://github.com/jermur788/t3code/blob/experiment/continuation-default-off-gate-20261104/docs/orchestration-v2/staged-continuation-t4-strict-revocation-and-shipping-20261104.md).  
**Governing decisions:** [accepted staged safety spec](continuation-staged-safety-governing-spec-20261104.md).  
**Verdict:** **MANAGER SOURCE REVIEW PASS for D1 isolated default-off gate**, **local RUNTIME PASS and independent model REVIEW PASS supported by worker evidence**, **NOT INTEGRATED / NOT PRODUCTION ENABLED / NOT VERIFIED for public shipping**.

## Actual source inspected

GitHub branch head matched the worker handoff. Fork main remains unchanged. The browser manager fetched the gate implementation commit's complete changed-file list and reviewed production changes and new gate test names/portions in published source:

1. New `RuntimeTaskContinuationGate` Effect context service: a single `enabled` capability; `layerFromEnvironment` is lazy at layer build, and **only exact** `T3CODE_EXPERIMENTAL_CONTINUATION=1` enables it. No task/MCP/RPC parameter writes this service. Missing/invalid values fail closed.
2. `ProjectRuntimeService.createTask/updateTask`: non-null continuation creation/mutation is rejected while off with `continuation_disabled`; explicit removal or unrelated edits are permitted. Existing operator-only actor validation remains for on mode. A new contract enum literal is additive; old client error decoder compatibility is not established (documented).
3. `RuntimeTaskExecutionService`: disabled capability prevents `advanceContinuation`, `dispatchContinuation`, internally authorized `runExecute`, and `launchAttempt` of saved continuation receipts. Pending receipt with **definitely absent** thread is cancelled; *present or unreadable* thread is `reconcile_required`, preserving uncertainty and receipt history. Non-continuation execution still runs its normal path.
4. `server.ts`: shared gate capability wired into the Project Runtime/Runtime Task Execution service graph once from server environment.
5. `RuntimeTaskContinuationGate.test.ts`: test cases cover default-off env, task creation/update and removal, inert startup scan, pending review restart and ambiguous thread, pending repair restart, public-execute replay and gate-on revoked unreadable-thread case. Prior continuation tests deliberately inject `ContinuationGate.layer(true)` and unrelated layers explicitly inject `false`.

**Assessment:** D1's concrete acceptance criteria are implemented in the inspected source. The gate is not the D2 public-shipping exclusion and it cannot close the D4 revocation gap by itself. No independent browser test commands or real provider/GUI check were run.

## Verification and external review record

T3 local worker records, not independently reproduced by the browser manager:
- T1 final: `vp test run apps/server/src/projectRuntime` 13 files, 192/192 tests, exit 0; `vp run typecheck` 39/39 packages, exit 0; `vp run check:changed` exit 0 with format, lint, knip, GraphQL, typecheck and 14 test files. Dedicated AgentContextBudget test passes on clean gate tree.
- T2: independent `claudeAgent` / Claude Opus 5.5, high-effort review returned **ACCEPT WITH FIXES**. Writer added 3 scenarios, made the environment layer lazy, renamed helper and resolved documentation concerns. Independent delta re-review **ACCEPT**; same reviewer did not write code.
- T5: Claude review call returned **API RATE LIMIT** and **no review evidence**. Coordinator routed to independent `codex` / GPT-6.1 Sol at high effort; reviewer returned **ACCEPT FOR EXPERIMENTAL PUSH** and ran gate tests 10/10. The routing ledger recorded the failed route, actual model, rejected choices and final outcomes; there was no successful paid external provider evaluation in this test suite.
- All source/test changes and docs were fast-forward pushed to the isolated branch; no PR or merge.

**Status precision:** IMPLEMENTED / worker-local RUNTIME PASS / independent worker-review REVIEW PASS / independent manager source REVIEW PASS for D1 only. This does **not** mean integrated VERIFIED, strict revocation guaranteed, public-shipping budget accepted or UI/provider exercised.

## T3 upstream reconciliation: not yet an integration failure in the gate

Isolated worker trial against its fetched upstream main produced **8 conflicts in pre-existing fork divergence**, no continuation-file textual conflicts. Trial was aborted and unmerged; `usageLimits.ts` conflict markers prevented testing on the combined tree. This is **INTEGRATION CONFLICT / UPSTREAM COMPATIBILITY**, not evidence that the D1 gate failed. The historical report cannot substitute for a fresh trial.

**Fresh browser delta check:** current upstream main advanced **10 additional commits** after the worker's trial base (as of this manager's GitHub fetch), including changes in `Orchestrator.ts`, `ThreadManagementService.ts`, `OpenCode2AdapterV2.test.ts`, `runtimeLayer.test.ts`, and other provider/adapter code. Therefore upstream behavioral requalification is material even if the eight textual conflict filenames remain constant. Refetch before local integration trial. The new isolated reconciliation branch is based on **fork main**, deliberately excludes the gate experiment until the fork/upstream base itself is reconciled.

## Accepted decisions and unresolved release gates

- **D1 — ACCEPTED AND IMPLEMENTED for isolated development:** default-off server gate. **No activation or merge authorized.**
- **D2 — ACCEPTED AS RELEASE REQUIREMENT, NOT IMPLEMENTED:** public shipping build must exclude experimental continuation and agent-facing schema bytes. Current recommendation is to keep the experiment on a separate branch; if shipping source ever includes it, implement a compile/build-schema exclusion and verify built `tools/list`, not merely source configuration.
- **D3 — ACCEPTED FOR STUB EXPERIMENTS:** best-effort recheck/reconciliation only. The characterization test confirms a post-withdrawal turn may still start in the final-check/external-call window.
- **D4 — ACCEPTED RELEASE REQUIREMENT, DESIGN PENDING:** no new continuation run after durably committed withdrawal. The T4 memo proposes atomic `run.created` guard (existing Project Runtime source revision) as a primary linearization point and an optional provider-turn-start check. This would touch upstream-owned command/effect infrastructure and requires an explicit design boundary before code. **No user approval to add a new epoch/authority table or change the upstream engine is presumed.**
- **Additional qualification:** cross-project isolation, simultaneous insert, real-provider and UI/operator notification, old-client error decoding, historical malformed receipts and actual reconciled-tree tool budget remain incomplete.

## Operational blocker / repo safety

Local worker reported root filesystem at 100% with about 231 MB free. Browser manager has no access to confirm current free space. New local trial/build work should use existing large `/media/jer/Files` volume and first inspect `df -h`, actual project/temporary/cache locations and working-tree ownership. **Do not clean caches or old worktrees without an explicit safe inventory and authorization.** If even temporary files or package stores cannot be placed safely, classify `OPERATIONAL BLOCKER`. No reset/stash/force-push/discard, no main rewrite.

## Manager authorization and next tasks

**AUTHORIZED (bounded, isolated):** create/own a new fork-main/upstream reconciliation trial branch and worktree, reproduce and resolve routine conflicts one by one, run tests on reconciled trial tree, perform independent code/security review, and preserve a durable handoff. **No merge to main or public upstream PR**, no production enablement. Stop on unresolved change to provider/V2 semantics or nontrivial policy/architecture tradeoff. Branch [integration/fork-upstream-reconciliation-trial-20261104](https://github.com/jermur788/t3code/tree/integration/fork-upstream-reconciliation-trial-20261104) was created by browser manager from fork main and is initially code-untouched.

**RESEARCH ONLY:** strict D4 launch linearization and new authority-state feasibility. No upstream engine modifications until governing spec/architecture review is accepted. D2 public exclusion is not a gate to this isolated reconciliation task.

**Task packet:** [bounded upstream reconciliation and security verification](task-fork-upstream-reconciliation-20261104.md).  
**Routing:** DeepSeek for initial conflict archaeology/testing, Codex/Claude-class for semantic conflict repair and independent review; record actual route/attempts/wake and failure evidence in Runtime or a branch-local ledger. Two genuinely different attempts per routine defect before stronger escalation; max four unless new evidence.

## Next

Start the bounded local reconciliation task in an isolated **external-volume** worktree; continue read-only D4 design work. Return classified blockers rather than improvising upstream core changes. Reconcile the resulting branch against this review and accepted spec; main integration stays unauthorized pending verified combined tree and separate user approval.
