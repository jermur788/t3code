# Overall Manager — Authoritative Continuation Handoff

**Updated:** 2026-11-04 after 08:37 Europe/Dublin.  
**Classification:** MANAGER HANDOFF / CURRENT CONTINUATION ENTRYPOINT.  
**Status:** Documentation published on the shared fork's **planning branch**, not fork main. No code merge, provider execution or production configuration change is effected by this file.

## Mandatory read order for a new Overall Manager

1. **Project Instructions** in the active ChatGPT T3 Fork Project. User is the final product decision maker; assistant is Overall Manager.
2. [**01_CURRENT_STATE.md**](01_CURRENT_STATE.md) — canonical current base, decisions, project milestone, active task, blockers.
3. [**02_COORDINATION_HANDOFF_PROTOCOL.md**](02_COORDINATION_HANDOFF_PROTOCOL.md) — stable lifecycle, handoff, safety, verification and transition rules.
4. [Accepted staged continuation safety spec](docs/orchestration-v2/continuation-staged-safety-governing-spec-20261104.md).
5. [Pre-merge independent verification task packet](docs/orchestration-v2/task-verify-reconciled-v017-before-main-20261104.md), then [PR #21 routing/conflict/test ledger](https://github.com/jermur788/t3code/blob/integration/fork-upstream-reconciliation-trial-20261104/docs/orchestration-v2/fork-upstream-reconciliation-routing-ledger-20261104.md).
6. Inspect current GitHub PRs and repo heads / any live T3 Runtime tasks and handoffs. Latest reported Git history is *not* enough to establish current clean state.

Historical chats are supporting evidence; do not treat them as authoritative if a newer canonical document or repo contradicts them.

## Situation in one paragraph

The fork's upstream-v0.1.7 reconciliation has been implemented, passed broad local testing and independent review, and is now [**fork-only draft PR #21**](https://github.com/jermur788/t3code/pull/21) against fork main. The user **approved opening this draft**, but **did not approve merging it**. Fork main is still unchanged. PR #21 contains no experimental continuation code. The separate [default-off continuation experiment](https://github.com/jermur788/t3code/tree/experiment/continuation-default-off-gate-20261104) passed bounded local/stub tests and reviews, but is unintegrated. User approved staged D1–D4 policy, including eventual shipping exclusion and strict revocation before public release. The **immediate work** is independent PR #21 UI, restart/cross-project and Evidence V0 verification — not another redesign or a merge.

## BASE / CHECKPOINT

- Repo: `jermur788/t3code`; main at `d3bedef12a31f368e5c5a6b279445bea39a6a13a` when last inspected.
- Upstream `pingdotgg/t3code`: last fetched main `8b44f42b14c8e273156474a924ccf29680dd7857`. PR #21 reconciliation pinned to upstream **v0.1.7** `bb4afa5425c52104a9261fa2d022cb8ba2fcc099`, so it is not exactly latest upstream main.
- Reconciled trial: `integration/fork-upstream-reconciliation-trial-20261104` at `70203ed5a95dbe1762da1ad2a46c4f153f910492`, [PR #21](https://github.com/jermur788/t3code/pull/21) OPEN / DRAFT / UNMERGED / last mergeable-clean.
- Overall Manager planning branch: `planning/resource-efficient-continuation-20261103`; [research PR #20](https://github.com/jermur788/t3code/pull/20) remains separate OPEN / DRAFT / UNMERGED.
- Reviewed continuation gate: `experiment/continuation-default-off-gate-20261104` at `b3b8da54e0b8b184a1cf4e667d53e73e04f85074`; not part of PR #21/main.
- Older worktrees must be preserved. Local T3 paths, cleanliness, provider availability and disk space require live recheck. Browser manager has not verified a current live T3 host.

## VERDICT / RESULT / VERIFICATION

**Fork/upstream reconciliation — `IMPLEMENTED / STATIC PASS / RUNTIME PASS / REVIEW PASS` (bounded), `NOT INTEGRATED`.** Seven actual conflicts resolved and upstream Effect 4.1 compatibility adapted; eighth historical conflict auto-merged. Worker reports web build, 40-package typecheck, `check:changed upstream/main` (2,072 tests / 81 files), targeted MCP/adapters/routing tests and AgentContextBudget PASS. Budget snapshot 58,519 MCP tool-list bytes. Independent Codex returned CLEAN; Overall Manager inspected conflict-sensitive source and ancestry. **No browser-side test rerun or GitHub-hosted CI checks at last inspection**. [Full manager review](docs/orchestration-v2/manager-fork-upstream-reconciliation-acceptance-20261104.md).

**Default-off continuation experiment — `IMPLEMENTED / local RUNTIME PASS / independent REVIEW PASS / manager SOURCE REVIEW PASS`, `NOT INTEGRATED`.** Worker reports 192 Project Runtime tests and changed-file/typecheck pass, with independent Claude Opus review/re-review and Codex acceptance. Disabled unless server env exactly `T3CODE_EXPERIMENTAL_CONTINUATION=1`. Off mode rejects new authority and new automatic review/repair/replay; uncertain receipts reconcile. [Full manager gate review](docs/orchestration-v2/manager-gate-branch-review-20261104.md).

**Upstream PR #28777** is a separate contribution; our test-only review comment was acknowledged, but patch adoption remains unproven. Do not make an unsolicited public comment or confuse it with fork PR #21.

## NEXT — exact already-authorized action

Use the existing [pre-merge verification task packet](docs/orchestration-v2/task-verify-reconciled-v017-before-main-20261104.md) **as written**, on a fresh isolated T3 local test worktree:

- **V1 rendered UI:** verify both fork home and upstream thread routes in a browser with screenshots/console evidence, not build-only.
- **V2 file-backed restart & isolation:** two projects; receipts, handoffs, routing, updated upstream recovery/idempotency; stub providers only.
- **V3 Evidence V0:** recover/export after pruning and expected fail-closed behavior.
- **V4 gates:** rerun relevant code/test/check/budget gates on actual candidate base and record exit codes; inspect hosted CI if any.
- **V5 independent review:** different provider/model where possible, reconcile with accepted spec, return a durable handoff.

**Routing:** DeepSeek/OpenCode orchestrates routine tasks; Codex/Claude-class for hard/security-sensitive diagnostics or independent review. Log intended and actual models, alternative rejections, attempts, outcomes and child wake in Project Runtime where available; otherwise an append-only branch-local ledger. Two genuinely different troubleshooting attempts before stronger escalation on routine defects, up to four bounded attempts, unless unsafe/hard stop. One writer per overlapping lane. Preserve existing worktrees, no stash/reset/force-push/discard.

**Operational:** T3 Code local execution is not directly available to the browser manager in this chat. A written GitHub task packet **does not start** the worker or create background monitoring. When T3 local host is available, use its actual delegation/completion tools and observe results. Previously reported root filesystem recovered after older full-disk report, but always re-run `df -h`; prefer ample external volume for new worktree.

**Acceptance:** If V1–V5 pass, update current state and PR #21 review checklist, then ask user **separately** for merge approval. If defects appear, classify them, open isolated one-writer repair lane, retest/re-review; don't weaken tests merely to pass. Do not mark integrated or verified prematurely.

## USER-ACCEPTED DECISIONS (do not re-ask)

- User approved the fork-only **draft PR** creation — complete.
- User approved default-off server gate now for isolated continuation experimentation — implemented on separate branch.
- User approved excluding experimental agent-facing continuation surface before any public shipping release — **release requirement not yet implemented**.
- User approved best-effort last-check + reconciliation only for isolated stub-only experiments — known TOCTOU risk explicitly accepted *there*.
- User requires strict no-new-continuation-run after durable revocation **before production** — requirement adopted, exact linearization/in-flight semantics still under architecture review, no authority-table or upstream-engine modification approved.

**User has not approved:** merging fork main or PR #21, enabling production continuation, shipping, public upstream PR changes, new authority database, irreversible worktree operations or material paid model usage.

## Open risks and milestone context

- Rendered UI and Evidence V0 pruning/recovery: `REVIEW REQUIRED` / missing acceptance evidence; also cross-project/restart tests under merged upstream V2.
- Hosted GitHub CI: none observed for draft PR's head. Local tests do not equal CI.
- Latest upstream delta: one commit beyond pinned v0.1.7 at prior read, affecting review/diff and VCS; refetch before future synchronization.
- Documentation V1's independent fresh-user golden path remains **not proven complete** in the most recent older state. Do not silently upgrade it to VERIFIED.
- Project direction after the upstream step: maintain provider-neutral Runtime source/task/handoff/execution truth, then advance evidence-driven adaptive orchestration incrementally; CCF first use case, generic features. No autonomous learned router authorized solely from direction.
- The dev-operations dashboard remains a **separate** repository/product; T3 owns authoritative Runtime/orchestration domain services, dashboard consumes documented APIs.

## STOP / TRANSITION

Do not merge any main branch or rewrite shared history without explicit authority. Do not unilaterally accept material architecture/security tradeoffs. Before changing managers/chats again, update **01_CURRENT_STATE.md** and this concise handoff, reconcile all active task/ledger states with repo truth, preserve base/worktree evidence and mark outdated notes historical.

**No further user decision is required to run V1–V5.** Merge approval is a later decision after verification. This handoff is informational and durable; no worker has been dispatched by writing it.
