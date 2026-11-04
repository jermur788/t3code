# Overall Manager — Authoritative Continuation Handoff

**Updated:** 2026-11-04 after 11:32Z P2 repair return and independent manager promotion/source review.
**Classification:** MANAGER HANDOFF / CURRENT CONTINUATION ENTRYPOINT.  
**Status:** Documentation published on the shared fork's **planning branch**, not fork main. No code merge, provider execution or production configuration change is effected by this file.

## Mandatory read order for a new Overall Manager

1. **Project Instructions** in the active ChatGPT T3 Fork Project. User is the final product decision maker; assistant is Overall Manager.
2. [**01_CURRENT_STATE.md**](01_CURRENT_STATE.md) — canonical current base, decisions, project milestone, active task, blockers.
3. [**02_COORDINATION_HANDOFF_PROTOCOL.md**](02_COORDINATION_HANDOFF_PROTOCOL.md) — stable lifecycle, handoff, safety, verification and transition rules.
4. [Accepted staged continuation safety spec](docs/orchestration-v2/continuation-staged-safety-governing-spec-20261104.md).
5. [Current bounded Evidence V0 pruning repair task](docs/orchestration-v2/task-evidence-v0-pruning-completeness-p2-20261104.md), then [completed V1–V5 qualification packet](docs/orchestration-v2/task-verify-reconciled-v017-before-main-20261104.md) and [PR #21 source/conflict ledger](https://github.com/jermur788/t3code/blob/integration/fork-upstream-reconciliation-trial-20261104/docs/orchestration-v2/fork-upstream-reconciliation-routing-ledger-20261104.md).
6. Inspect current GitHub PRs and repo heads / any live T3 Runtime tasks and handoffs. Latest reported Git history is *not* enough to establish current clean state.

Historical chats are supporting evidence; do not treat them as authoritative if a newer canonical document or repo contradicts them.

## Situation in one paragraph

The bounded P2 Evidence V0 pruning repair has returned on its **isolated** branch and passed an independent GitHub/source review by the Overall Manager. The worker reports local focused/broad tests PASS and four independent Codex reviews ending PASS. The code adds a read-only `orchestration-v2-pruned` incompleteness marker without modifying upstream event pruning or production execution. The **known compatibility caveat** is that the unchanged V0 envelope has a new closed-enum literal: old decoders reject exports containing the new marker, so a coordinated decoder upgrade is required. Manager decision: **SOURCE REVIEW PASS / READY FOR SEPARATE PR #21 SOURCE-PROMOTION DECISION WITH EXPLICIT COMPATIBILITY ACCEPTANCE**; **PR #21 remains OPEN/DRAFT/UNMERGED**, fork main unchanged. The previous user-approved default-off continuation experiment remains separate, and D2/D4 release requirements are still unmet. New prospective routing policy reserves DeepSeek for orchestration only, with Codex GPT-6.1 SOL Medium or Claude Sonnet 5.5 Medium performing all implementation and tests.

## BASE / CHECKPOINT

- Fork repo: `jermur788/t3code`. Existing draft PR #21 source head remains `70203ed5a95dbe1762da1ad2a46c4f153f910492`; fork `main` at `d3bedef12a31f368e5c5a6b279445bea39a6a13a`.
- Repair branch `fix/evidence-v0-pruning-completeness-p2-20261104`: reviewed code/test checkpoint `a03a8bce92ea2de65a92a112bf9771388673094b`; final documentation-only branch head `0e0c7bc2cb1bb805f273123686303a68e1c2807c`. GitHub comparison confirms a linear five-commit successor with only three source/test files plus two durable evidence documents changed.
- [Independent manager source review](docs/orchestration-v2/manager-evidence-v0-p2-promotion-review-20261104.md), [repair handoff](https://github.com/jermur788/t3code/blob/fix/evidence-v0-pruning-completeness-p2-20261104/docs/orchestration-v2/evidence-v0-p2-repair-handoff-20261104.md), [repair routing ledger](https://github.com/jermur788/t3code/blob/fix/evidence-v0-pruning-completeness-p2-20261104/docs/orchestration-v2/evidence-v0-p2-repair-routing-ledger-20261104.md).
- PR #21 upstream merge parent is 25 commits past the `v0.1.7` tag, one commit behind then-current upstream main. No experimental continuation code is present in PR #21.
- Local worker reports repair worktree clean; no browser-manager ability to inspect its disk directly. No provider limits/cost were directly reported.

## VERDICT / RESULT / VERIFICATION

**P2 repair: `IMPLEMENTED / MANAGER SOURCE REVIEW PASS / WORKER-REPORTED LOCAL TEST PASS / INDEPENDENT REVIEW RECORDED PASS`, `NOT INTEGRATED / NOT PRODUCTION VERIFIED`.**

Manager inspected actual GitHub comparison, all three changed source/test files, runtime dependency/wiring evidence, all fixture tests and four-round independent-review ledger. The source diff uses existing pruning metadata, conservative `incomplete/unknown` semantics, hashed stable marker IDs and bounded output. It preserves unresolved/truncation and cross-project read boundaries. No upstream engine, schema migration, experimental continuation policy or app UI code changed.

Reported local tests: 39/39 focused, 40/40 including AgentContextBudget, 40/40 packages typecheck, changed-file broad 81 files/2,075 tests, web build PASS, MCP context snapshot 58,519 bytes. Reviewer Codex `gpt-6.1-sol` read-only rounds 1–4: CHANGES REQUIRED → CHANGES REQUIRED → PASS WITH FINDINGS → PASS after red/green summary-bound, marker-ID and reconstruction-decode coverage fixes. **Browser manager did not execute local commands or inspect raw logs**; hosted CI, real provider execution and production qualification were not performed.

**Compatibility:** the unchanged `orchestration-evidence/v0` schema adds the closed-enum `orchestration-v2-pruned` literal. Updated decoders work; older decoders reject exports containing it. No universal backward compatibility may be claimed. The manager accepts the repair's bounded source correctness for **fork-only coordinated upgrade** if the user expressly accepts that compatibility constraint; version negotiation for standalone old decoders requires a separate design.

## NEXT — exact action and authority gate

**No local code task is now required for the bounded P2 repair** unless the user requires old-decoder compatibility. The immediate next decision is **approval to promote the accepted isolated repair onto the existing draft PR #21's source branch**, using a guarded fast-forward of the current PR head if still unchanged. This promotion is **not a merge**, and has not been approved or performed. Do **not** push to PR #21 or fork main without authorization.

If the user approves PR-source promotion with the documented V0-decoder upgrade limitation, the Overall Manager should re-fetch exact refs, inspect ownership and unrelated changes, advance the PR source branch non-destructively and verify the resulting source/ledger. Update Current State and PR discussion. **Only then ask a separate user question for merging PR #21 to fork main.** If the user does not accept old-decoder breakage, keep PR unchanged and prepare a version-compatibility design for their decision.

**New prospective routing policy (accepted):** [paste-ready DeepSeek orchestration-only template](docs/orchestration-v2/DEEPSEEK_ORCHESTRATOR_HANDOFF_TEMPLATE_V1.md). DeepSeek supervises but does **not** implement or run tests. Codex GPT-6.1 SOL Medium or Claude Sonnet 5.5 Medium implement/test; Opus 5.5 only for justified escalation. Monitor each subscription's actual usage-limit/window, checkpoint/switch safely and resume after provider-confirmed reset only when supported by T3. All events go into Runtime or an append-only ledger. The just-completed DeepSeek implementation used the older already-dispatched packet and must not be falsely described as a future-policy violation.

## USER-ACCEPTED DECISIONS (do not re-ask)

- User approved the fork-only **draft PR** creation — complete.
- User approved default-off server gate now for isolated continuation experimentation — implemented on separate branch.
- User approved excluding experimental agent-facing continuation surface before any public shipping release — **release requirement not yet implemented**.
- User approved best-effort last-check + reconciliation only for isolated stub-only experiments — known TOCTOU risk explicitly accepted *there*.
- User requires strict no-new-continuation-run after durable revocation **before production** — requirement adopted, exact linearization/in-flight semantics still under architecture review, no authority-table or upstream-engine modification approved.

**User has not approved:** merging fork main or PR #21, enabling production continuation, shipping, public upstream PR changes, new authority database, irreversible worktree operations or material paid model usage.

## Open risks and milestone context

- Material fork-only coordination issue: old Evidence V0 decoders cannot decode the new pruning-marker literal under the unchanged envelope version. Require explicit acceptance of coordinated upgrades before promotion.
- Pruning detection is conservative and relies on upstream retaining thread creation and stream-head events; no claim of per-thread deleted-event counts. No hosted CI or production live-provider verification.
- Prior original-candidate PR #21 V1 rendered UI and V2 file-backed restart/isolation checks remain worker-reported PASS; the P2 branch changes only server/contracts/tests, and no new rendered UI claim is made.
- Separate default-off continuation experiment remains unmerged. D2 public shipping exclusion and D4 production revocation strictness remain **unmet release gates**, not solved by P2.
- Documentation V1's independent fresh-user golden path remains unverified; separate future work.
- DeepSeek allocation scarcity is user-reported; provider subscription capacities/reset times remain UNKNOWN until actually observed. Use dedicated per-subscription monitoring for future orchestration.

## STOP / TRANSITION

No PR #21 source update, fork-main merge, public upstream action, production continuation enablement, destructive Git operation, material paid use, or substantive V2 engine redesign without distinct authority. At manager change, keep **Current State**, this handoff, active task/ledger and repo base synchronized. The present gate is the user's **separate PR-source promotion and V0 decoder compatibility acceptance decision**, not a request to rerun an already-accepted bounded repair.

