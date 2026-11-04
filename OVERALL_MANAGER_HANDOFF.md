# Overall Manager — Authoritative Continuation Handoff

**Updated:** 2026-11-04 after the user-approved 12:33Z PR #21 fork-main merge, independent GitHub ancestry check, and prepared post-merge verification handoff.
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

**PR #21 is fully merged into fork main.** User approved merging at 2026-11-04 12:31Z. Overall Manager reconciled the previously reviewed PR head/base, noted zero hosted checks, updated stale PR description, marked the draft ready, and performed an expected-head **normal merge commit**, preserving ancestry. GitHub reported merged and post-merge inspection independently confirmed: [PR #21](https://github.com/jermur788/t3code/pull/21) CLOSED / MERGED, new fork-main commit `fb67545d790c5c001e8f85827f219ab6493c435e` with previous main and reviewed P2-repaired PR head as its two parents. Source on main contains the Evidence V0 pruning marker. **`INTEGRATED`, not `PRODUCTION VERIFIED`**, and fresh post-merge local runtime/visual smoke verification remains pending. Independent continuation experiment and release gates D2/D4 remain separate. DeepSeek's new role is **orchestration only**, not developer.

## BASE / CHECKPOINT

- Repo: `jermur788/t3code`, fork `main`: `fb67545d790c5c001e8f85827f219ab6493c435e` (verified merge commit). Parents: prior fork main `d3bedef12a31f368e5c5a6b279445bea39a6a13a`, accepted PR #21 head `0e0c7bc2cb1bb805f273123686303a68e1c2807c`.
- [PR #21](https://github.com/jermur788/t3code/pull/21): CLOSED / MERGED. No GitHub hosted CI check-runs; no new production/live-provider verification.
- [P2 review](docs/orchestration-v2/manager-evidence-v0-p2-promotion-review-20261104.md), [P2 repair handoff](https://github.com/jermur788/t3code/blob/main/docs/orchestration-v2/evidence-v0-p2-repair-handoff-20261104.md), [routing ledger](https://github.com/jermur788/t3code/blob/main/docs/orchestration-v2/evidence-v0-p2-repair-routing-ledger-20261104.md) integrated into main. The review's earlier promotion-only statements are historical; current authority comes from this handoff and Current State.
- Incorporated upstream release-preparation commit is 25 commits after `v0.1.7` tag, not an exact-tag claim, and not necessarily newest upstream. Upstream PR #28777 and research PR #20 are separate. Experimental default-off continuation branch stays unmerged.
- Local post-merge task: [complete paste-ready DeepSeek-only handoff](docs/orchestration-v2/handoff-deepseek-postmerge-pr21-verification-20261104.md), **PREPARED / NOT DISPATCHED**.

## VERDICT / RESULT / VERIFICATION

**`INTEGRATED` (fork-main GitHub merge), `MANAGER SOURCE REVIEW PASS`, `WORKER-REPORTED PRE-MERGE LOCAL TEST PASS`, `INDEPENDENT REVIEW PASS` (reported). No `POST-MERGE RUNTIME PASS` or `PRODUCTION VERIFIED`.**

- PR #21 preserves upstream-v0.1.7 release-preparation reconciliation, fork Project Runtime/provider-capacity tooling, home/upstream routes and bounded Evidence V0 P2 partial-pruning completeness repair. The latter reports `incomplete/unknown` for retained referenced history beneath canonical pruning boundary, while preserving unresolved references and read truncation. No upstream execution/pruning rewrite and no experimental continuation feature.
- Pre-merge worker reported 39/39 targeted tests, 40/40 typecheck packages, changed checks covering 81 test files/2,075 tests, web build, unchanged agent-context 58,519 bytes, and independent Codex review rounds 1–4 ending PASS. Original reconciled candidate V1 rendered UI and V2 file-backed restart/cross-project tests passed in local worker report. Browser manager did not rerun these.
- New independently checked evidence: GitHub PR merged flag/timestamp, actual fork main branch, two-parent merge commit ancestry, included pruning marker source, zero hosted check-runs. No post-merge local UI/restart/actual-pruning rerun.
- Accepted fork-only Evidence V0 compatibility limitation: older strict `orchestration-evidence/v0` decoders **reject exports containing the newly added `orchestration-v2-pruned` enum literal** and must upgrade. This is not universal backward-compatibility, and separate public versioning design remains future work.

## NEXT — authorized continuation and local handoff

**GitHub merge action is complete; do not repeat it.** The next useful bounded action is **local post-merge smoke verification of exact fork main**, with rendered UI, persisted restart and project isolation, real pruning and Evidence V0 export, changed checks and clear exclusion of experimental continuation. Browser source/history verification is already done, but the manager has **no verified automatic local T3 Code bridge**.

**Complete paste-ready [DeepSeek post-merge verification handoff](docs/orchestration-v2/handoff-deepseek-postmerge-pr21-verification-20261104.md)** is published. In the user-facing response, provide its full executable task packet (or enough complete copyable content to run without reading previous chat) plus link, rather than only a link. DeepSeek **orchestrates only**, routing worker execution/tests to Codex GPT-6.1 SOL Medium or Claude Sonnet 5.5 Medium, and Opus 5.5 only when warranted. Monitor per-subscription actual limits and provider-confirmed five-hour resets; checkpoint/reroute or preserve restart handoff. Runtime task/attempt/handoff state preferred, append-only isolated verification-ledger fallback. Do not claim it started because this documentation exists.

After actual worker evidence, classify and repair/re-review routine findings in separate owned lanes if authorized; do not push to `main` or authorize production release by implication. D2 public shipping exclusion and D4 strict production revocation remain explicit separate gates.

## USER-ACCEPTED DECISIONS (do not re-ask)

- User approved the fork-only **draft PR** creation — complete.
- User approved default-off server gate now for isolated continuation experimentation — implemented on separate branch.
- User approved excluding experimental agent-facing continuation surface before any public shipping release — **release requirement not yet implemented**.
- User approved best-effort last-check + reconciliation only for isolated stub-only experiments — known TOCTOU risk explicitly accepted *there*.
- User requires strict no-new-continuation-run after durable revocation **before production** — requirement adopted, exact linearization/in-flight semantics still under architecture review, no authority-table or upstream-engine modification approved.

**User has not approved:** merging fork main or PR #21, enabling production continuation, shipping, public upstream PR changes, new authority database, irreversible worktree operations or material paid model usage.

## Open risks and milestone context

- **Integrated but not production-qualified.** Zero hosted check-runs and no new post-merge rendered UI/SQLite restart/provider-live qualification; preserve actual evidence boundaries.
- Closed Evidence V0 V0 decoder enum addition is accepted for coordinated fork reader upgrades, **not** a stable public backward-compatible schema commitment.
- Experimental default-off continuation remains unmerged; D2 exclude agent-facing tool schema before public release and D4 strict no-new-run-after-revocation are not yet fulfilled release gates.
- Post-merge orchestration handoff is prepared but **not dispatched**; prospective DeepSeek orchestration-only routing and per-subscription capacity monitoring apply.
- Documentation V1 independent fresh-user qualification remains separately deferred. Recheck upstream newest main before a *future* sync; the incorporated parent is release-preparation rather than exact v0.1.7 tag.

## STOP / TRANSITION

PR #21 **is already merged into fork main** and must not be remerged. Stop for any new production/public release, experimental continuation activation, fork-main code write, destructive Git, rewriting history, material paid provider use, or architecture/security escalation requiring a new user decision. Before manager transition, reconcile exact fork-main head, Current State, active Runtime tasks/handoffs, this handoff and post-merge verification evidence. Prepared local handoff alone is **NOT DISPATCHED**.
