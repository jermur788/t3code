# Overall Manager — Authoritative Continuation Handoff

**Updated:** 2026-11-04 after 11:44Z Option A acceptance and verified guarded PR #21 source promotion.
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

**Option A approved and executed.** User on 2026-11-04 11:44Z accepted the old-Evidence-V0 decoder upgrade limitation and authorized promoting the accepted P2 repair onto draft PR #21's source branch. The Overall Manager completed a **guarded non-force, expected-head fast-forward** to the reviewed repair's final checkpoint. [PR #21](https://github.com/jermur788/t3code/pull/21) is now **OPEN / DRAFT / UNMERGED / MERGEABLE / clean**, with the P2 repair in its source; fork `main` remains unchanged. This is `PROMOTED TO DRAFT PR`, not `INTEGRATED` into main or `PRODUCTION VERIFIED`. Reported local tests/review remain bounded; no hosted CI. The remaining next gate is the user's **separate PR #21 fork-main merge decision**. Default-off continuation experiment and D2/D4 public-release safety gates remain separate and unmet.

## BASE / CHECKPOINT

- Repo `jermur788/t3code`; fork `main` at `d3bedef12a31f368e5c5a6b279445bea39a6a13a` after source promotion.
- Existing draft PR #21 branch `integration/fork-upstream-reconciliation-trial-20261104` **now** at `0e0c7bc2cb1bb805f273123686303a68e1c2807c`. Previously at `70203ed5a95dbe1762da1ad2a46c4f153f910492`; verified five commits ahead, zero behind, all source changes limited to three service/contract/test files plus two repair evidence documents.
- The isolated `fix/evidence-v0-pruning-completeness-p2-20261104` branch remains intact; exact reviewed code/test checkpoint `a03a8bce92ea2de65a92a112bf9771388673094b`, final one docs-only commit later.
- [Manager source review](docs/orchestration-v2/manager-evidence-v0-p2-promotion-review-20261104.md), [repair handoff](https://github.com/jermur788/t3code/blob/fix/evidence-v0-pruning-completeness-p2-20261104/docs/orchestration-v2/evidence-v0-p2-repair-handoff-20261104.md), [routing ledger](https://github.com/jermur788/t3code/blob/fix/evidence-v0-pruning-completeness-p2-20261104/docs/orchestration-v2/evidence-v0-p2-repair-routing-ledger-20261104.md).
- Upstream reconciliation parent is **25 commits after** the `v0.1.7` tag, not exact tag or most recent upstream main. No experimental continuation source in PR #21.

## VERDICT / RESULT / VERIFICATION

**Status:** `P2 IMPLEMENTED / MANAGER SOURCE REVIEW PASS / WORKER-REPORTED LOCAL TEST PASS / CODEX INDEPENDENT REVIEW RECORDED PASS / PROMOTED TO PR DRAFT`. **NOT INTEGRATED** into fork main, **NOT PRODUCTION VERIFIED**.

The manager independently inspected GitHub source and tests and confirmed the bounded repair: read existing pruning watermark, emit conservative `incomplete/unknown` `orchestration-v2-pruned` derived marker for potentially incomplete referenced history; keep unresolved/truncation distinct; bounded hash ID for long threads; no upstream execution/pruning/migration modifications.

Local worker-reported checks: red→green actual-pruning regression, 39/39 focused, 40/40 typecheck packages, 81 changed files/2,075 tests, web build, context snapshot 58,519 bytes, four independent Codex review rounds ending PASS. The browser manager did not independently run local checks or inspect raw host receipts. GitHub shows **zero hosted check-runs**, and no live provider/production validation is claimed.

**Compatibility policy (user accepted for fork-only promotion):** adding `orchestration-v2-pruned` to the closed `orchestration-evidence/v0` enum causes older strict V0 decoders to reject exports containing the new type. Readers must upgrade together. Never claim backward decodability with unchanged old readers; establish version evolution before a public stable cross-version consumer contract.

## NEXT — exact action and authority gate

**No worker task and no additional PR source promotion are pending.** The already-authorized source fast-forward has completed. **The next decision is whether to merge draft PR #21 into fork `main`**. This is **separate user authorization**; Option A did not grant it.

Before any merge, re-fetch PR's head/base, validate mergeability and worktree/branch ownership, preserve unrelated edits, prefer a non-destructive GitHub merge, then verify resulting fork main and project-state ledger. If user declines or defers merge, leave PR draft/open/unmerged and keep working on other independently authorized tasks. Conflicts or material security integration concerns require review and a new decision.

**Future DeepSeek routing:** user-approved [orchestration-only template](docs/orchestration-v2/DEEPSEEK_ORCHESTRATOR_HANDOFF_TEMPLATE_V1.md); Codex GPT-6.1 SOL Medium / Claude Sonnet 5.5 Medium for all implementation/testing, Opus 5.5 only when justified, with per-subscription cooldown/resumption and ledger supervision. Do not rewrite historical P2 DeepSeek implementation as if it followed this future policy.

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

PR #21 **source promotion is complete and user-approved**. No fork-main merge, public upstream action, production continuation enablement, destructive Git operation, material paid use, or substantive V2 engine redesign without distinct authority. At manager change, keep Current State, this handoff, active task/ledger and repo base synchronized. The present gate is the user's **separate fork-main merge decision**, not another source-promotion request.

