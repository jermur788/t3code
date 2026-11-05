# Overall Manager — Authoritative Continuation Handoff

**Updated:** 2026-11-05 after browser-first Stage 2 D4/D2 source review, upstream drift triage and three local handoff packets.
**Classification:** MANAGER HANDOFF / CURRENT CONTINUATION ENTRYPOINT.  
**Status:** Documentation published on the shared fork's **planning branch**, not fork main. No code merge, provider execution or production configuration change is effected by this file.

## Mandatory read order for a new Overall Manager

1. **Project Instructions** in the active ChatGPT T3 Fork Project. User is the final product decision maker; assistant is Overall Manager.
2. [**01_CURRENT_STATE.md**](01_CURRENT_STATE.md) — canonical current base, decisions, project milestone, active task, blockers.
3. [**02_COORDINATION_HANDOFF_PROTOCOL.md**](02_COORDINATION_HANDOFF_PROTOCOL.md) — stable lifecycle, handoff, safety, verification and transition rules.
4. [Accepted staged continuation safety spec](docs/orchestration-v2/continuation-staged-safety-governing-spec-20261104.md).
   - **Current Stage 2 entrypoint:** [browser manager assessment](docs/orchestration-v2/manager-stage2-browser-first-assessment-20261105.md), [D4 proposed contract](docs/orchestration-v2/d4-transactional-revocation-proposed-contract-20261105.md), [D2 shipping audit plan](docs/orchestration-v2/d2-shipping-exclusion-audit-plan-20261105.md). These supersede earlier generic research priorities; proposals are not accepted architecture decisions.
5. [Current bounded Evidence V0 pruning repair task](docs/orchestration-v2/task-evidence-v0-pruning-completeness-p2-20261104.md), then [completed V1–V5 qualification packet](docs/orchestration-v2/task-verify-reconciled-v017-before-main-20261104.md) and [PR #21 source/conflict ledger](https://github.com/jermur788/t3code/blob/integration/fork-upstream-reconciliation-trial-20261104/docs/orchestration-v2/fork-upstream-reconciliation-routing-ledger-20261104.md).
6. Inspect current GitHub PRs and repo heads / any live T3 Runtime tasks and handoffs. Latest reported Git history is *not* enough to establish current clean state.

Historical chats are supporting evidence; do not treat them as authoritative if a newer canonical document or repo contradicts them.

## Situation in one paragraph

**Fork main PR #21 is integrated and locally qualified; PR #21 evidence has been prepared, verified locally and explicitly retained PRIVATE. Stage 2 is now the active planning focus.** The Overall Manager used connected GitHub directly to inspect latest fork/upstream/experiment code, confirm the experimental branch is divergent and unmerged, and analyze the D4 revocation race and D2 agent-facing schema exposure. Browser-produced [Stage 2 review](docs/orchestration-v2/manager-stage2-browser-first-assessment-20261105.md), [proposed D4 run-commit contract](docs/orchestration-v2/d4-transactional-revocation-proposed-contract-20261105.md) and [D2 shipping plan](docs/orchestration-v2/d2-shipping-exclusion-audit-plan-20261105.md) are now canonical planning sources. **Three fully scoped, read-only local verification handoffs are PREPARED / NOT DISPATCHED**: D4 SQLite atomicity/run-path feasibility, D2 built MCP-schema audit, and upstream/experiment reconciliation preview. **D4 architecture is not yet product-approved**; no production code, main merge, provider call or implementation claim. All future local workers follow DeepSeek orchestration-only / Codex or Sonnet execution / independent different-provider review.

## BASE / CHECKPOINT

- Repo `jermur788/t3code` fork `main`: `fb67545d790c5c001e8f85827f219ab6493c435e`, unchanged at last manager GitHub check. Two parents: prior main `d3bedef12a31f368e5c5a6b279445bea39a6a13a`, reviewed PR #21 head `0e0c7bc2cb1bb805f273123686303a68e1c2807c`. PR #21 **CLOSED / MERGED**. Upstream parent is release-preparation code 25 commits after v0.1.7 tag, not necessarily latest upstream.
- Authoritative [Current State](01_CURRENT_STATE.md), [post-merge qualification manager review](docs/orchestration-v2/manager-postmerge-pr21-verification-reconciliation-20261104.md), and [new post-merge evidence-closure manager review](docs/orchestration-v2/manager-postmerge-pr21-evidence-closure-reconciliation-20261104.md). Older local-package checklist is historical, not a future task to redo.
- Local-only verification/evidence on worker host: `/media/jer/Files/Worktrees/t3-postmerge-pr21-verification-20261104`; originals `/media/jer/Files/Worktrees/pr21-verify-evidence-20261104/` (164 files / 9,803,931 bytes, worker-checksums OK); v2 package `/media/jer/Files/Worktrees/pr21-evidence-package-20261104-v2/` (89 files / 754,717 bytes, worker-checksums OK); final restricted ledger delta `/media/jer/Files/Worktrees/pr21-evidence-final-ledger-20261104/`. The worker-reported local verification branch **was not found in GitHub** at manager query; **no link to original raw evidence is established**.
- [Accepted DeepSeek-only template](docs/orchestration-v2/DEEPSEEK_ORCHESTRATOR_HANDOFF_TEMPLATE_V1.md) applies to future worker dispatches. The **previous evidence-closure handoff was actually executed** and returned; do not dispatch that same task again.

## VERDICT / RESULT / VERIFICATION

**`INTEGRATED` (independently checked GitHub) / `POST-MERGE LOCAL RUNTIME PASS (worker-reported)` / `EVIDENCE CLOSED LOCALLY (worker-reported)` / `REVIEW PASS WITH FINDINGS (worker-recorded)`; `NOT PRODUCTION VERIFIED`.**

- Preceding post-merge local qualification reported fresh typecheck 40 packages, Evidence V0 suite 36 tests, eight Project Runtime/Task suites 103 tests, broad 81 test files/2,075 tests, successful web build, rendered fork Project Home/upstream navigation, live-app SQLite stop/start and cross-project read isolation, and genuine V2 pruning marker with old-decoder incompatibility correctly identified.
- Closure workers checked 164/164 original file checksums and 87/87 v2-package checksums (self-checksum and SIZE excluded). Package v2 reportedly contains 78 sanitized files; revised after prior UUID leakage and stale-inventory reviewer findings. Three traceIds and a redacted `Bearer <SECRET>` label remain. All sanitization claims are **worker-reported pattern checks**, not manager-certified safe for public upload. Ledger changed after package snapshot by three disclosed append-only entries while package v2 stayed unchanged.
- **Mode check now CLIENT-LOCAL PASS:** `localStorage["t3-fork:interface-mode"]` held `workspace` through application stop/start and same-profile page reload; source confirms this key and development default. No browser-process restart or cross-device claim.
- **Handoff write/isolation still NOT RUN:** MCP `t3_project_handoff_append` is session-scoped and project RPC offers list/read only; worker host lacked a supported no-cost append path. Manager inspected those source boundaries. Do not infer external local provider possibilities are impossible or that service-level tests prove app-level operation.
- Two independent read-only reviewer roles recorded **PASS WITH FINDINGS** after two legitimate rework loops on mode evidence and package-v2 redaction. DeepSeek V4.1 Flash orchestrated only, not implementation/test; Codex SOL Medium and Sonnet 5.5 Medium executed; Opus not used; quotas/reset data UNKNOWN.
- **Not independently reviewed raw bytes:** manager cannot see worker-local 9.8-MB originals/755-KB package, screenshots or full ledger; no hosted CI, paid live-provider, production/native/remote qualification. Do not claim a remote audit trail was published.

## NEXT — launch only bounded local Stage 2 verification after browser source review

**One complete paste-ready local session starter:** [Stage 2 three-lane DeepSeek handoff](docs/orchestration-v2/handoff-stage2-browser-first-three-lanes-20261105.md), fully bounded to read-only local verification, **PREPARED / NOT DISPATCHED**.

1. **Already completed in browser:** [manager Stage 2 assessment](docs/orchestration-v2/manager-stage2-browser-first-assessment-20261105.md), [D4 proposed transaction contract](docs/orchestration-v2/d4-transactional-revocation-proposed-contract-20261105.md), [D2 shipping tool-schema audit plan](docs/orchestration-v2/d2-shipping-exclusion-audit-plan-20261105.md), GitHub source/branch/upstream and existing release-gate checks. Do not needlessly delegate/repeat these tasks.
2. **D4 read-only local feasibility:** [complete packet](docs/orchestration-v2/task-stage2-d4-atomicity-feasibility-20261105.md) — same-database writer serialization, EventSink `run.created` commit path, all retry/restart/run paths and exact guard/test plan. **PREPARED / NOT DISPATCHED**.
3. **D2 local built-MCP audit:** [complete packet](docs/orchestration-v2/task-stage2-d2-built-mcp-shipping-audit-20261105.md) — actual local stub server's `tools/list` and byte comparison on merged main vs isolated experiment; **no published artifact**. **PREPARED / NOT DISPATCHED**.
4. **Upstream/experiment reconciliation preview:** [complete packet](docs/orchestration-v2/task-stage2-upstream-experiment-reconciliation-preview-20261105.md) — full current upstream commits, source hotspots, read-only merge-tree and future integration order. **PREPARED / NOT DISPATCHED**. GitHub current upstream was 50 commits beyond incorporated parent; experiment 34 ahead / 336 behind fork main at last fetch.
5. DeepSeek V4.1 Flash **orchestrates only**, route code/test work to Codex GPT-6.1 SOL Medium or Claude Sonnet 5.5 Medium, with independent different-provider/model review; per-subscription actual quota/cooldown/reset or UNKNOWN. Keep one writer for any overlapping lane and do not imply a GitHub handoff document launches a local session. Browser-to-local host bridge **NOT VERIFIED**.
6. Reconcile returns to Current State/Runtime, then obtain product owner choice about D4 `run.created` commit vs provider `startTurn` boundary and existing-run/in-flight semantics. The proposed **run-created commit guard** is preferred but not yet an adopted architecture. Only after explicit acceptance may a separate **isolated writable implementation task** be released. D2 and public production release still have independent acceptance gates.
7. Keep PR #21 local evidence PRIVATE as user explicitly decided; do not reopen evidence publishing. App-level handoff write/isolation `NOT RUN` and Documentation V1 fresh-user qualification remain separate from D4/D2 test work. No direct main write, upstream PR, merge, paid provider tests or production enablement is authorized.

## USER-ACCEPTED DECISIONS (do not re-ask)

- User authorized creation of **fork draft PR #21**, then at 2026-11-04 11:44Z selected **Option A**, explicitly accepting the **fork-only coordinated old-Evidence-V0 decoder upgrade limitation** and PR-source promotion. Promotion was completed.
- User separately approved **merging PR #21 into fork `main`** at 2026-11-04 12:31Z. Normal two-parent merge completed and independently verified. **Never re-ask merge permission for the already merged PR #21 or repeat the merge**.
- User approved DeepSeek **orchestration-only** for all future worker tasks, with Codex GPT-6.1 SOL Medium or Claude Sonnet 5.5 Medium doing implementation/tests, Claude Opus 5.5 for justified escalations, per-subscription capacity/watch/reset tracking, and real-time ledger updates. User reported a low DeepSeek monthly allowance on 2026-11-04; exact current balance/reset UNKNOWN.
- On 2026-11-05, user approved **local-only preparation/review of the 78-file sanitized text evidence publication candidate**. No upload, commit, push or publication; any actual external transfer requires a new, destination-specific user decision.
- **Later on 2026-11-05, user explicitly decided KEEP PRIVATE.** This supersedes consideration of publication as the immediate next milestone: do not publish, upload or transfer candidate/original evidence or ask again about a destination unless the user explicitly changes direction.
- User approved the **separate default-off server gate** for isolated continuation experimentation — implemented on unmerged experimental branch.
- User requires **exclusion of experimental agent-facing continuation tool-schema overhead before public release** (D2); this release requirement remains unmet and unmerged.
- User permits **best-effort last-check/reconciliation only for isolated stub-only continuation experiments** (D3), with known provider-start race explicitly bounded.
- User requires strict no-new-continuation-run after durably committed revocation **before production** (D4); no accepted exact linearization or authority-table/engine rewrite exists yet.

**Not approved:** publishing/sanitized evidence upload, any Git commit/push, further repo merges, public release, production continuation, material paid-provider work, unsafe credential bypass, new authority DB or destructive Git changes. Local evidence closure, candidate preparation and integrity correction are completed; evidence retention is **PRIVATE by user decision**.

## Open risks and milestone context

- **Browser D4 analysis is PROPOSED design, not a product decision or local runtime PASS**: current continuation preflight occurs before engine SQL `run.created` transaction; no existing transaction-level guard. Same-SQLite-DB atomicity, all run paths and receipt semantics require local proof; do not implement a security-sensitive upstream hook on an assumption.
- **Upstream/experiment drift:** current upstream `main` was 50 commits after incorporated parent; experiment had divergent 34 ahead / 336 behind against merged fork main, as of 2026-11-05. No merge or forward sync occurred. EventSink/ThreadLaunch source matched latest upstream at browser inspection but ProviderTurnStart and others evolved.
- **D2 schema budget:** experiment `continuation` type flows into shared contract and MCP tools; server default-off is insufficient for public tool-schema exclusion. The built `tools/list` is NOT YET VERIFIED. Historic +646-byte delta is not fresh measurement. D4 strict production revocation and D2 exclusion are unmet public-release gates.
- **PR #21 evidence explicitly KEEP PRIVATE**, no publishing. Post-merge local Runtime PASS (worker-reported), 81-file private candidate local integrity PASS (worker-reported), independent review PASS (recorded). Browser did not inspect private bytes, hosted CI is zero, no production/live-provider qualification.
- **App-level handoff write/isolation NOT RUN / OPERATIONAL BLOCKER.** MCP path is session-scoped; service-level tests not app-level pass. Client-local Workspace/Development mode persisted through normal server restart/same-profile reload; no cross-device or browser-process-restart claim.
- Documentation V1 independent fresh-user golden-path and troubleshooting remain deferred.

## STOP / TRANSITION

PR #21 and its evidence work are complete; KEEP PRIVATE is binding. **Stage 2 browser source/design work is done**, with three local read-only handoffs PREPARED / NOT DISPATCHED. No verified automatic local worker bridge exists. D4 transaction guard and in-flight semantics remain PROPOSED, requiring user approval before significant code implementation. No Git main write/merge, experimental continuation activation, new authority table, upstream engine rewrite, hosted release, paid provider call, evidence upload or destructive Git is authorized. For local continuation use accepted DeepSeek orchestration-only task packet, exact GitHub refs/Runtime task state and one owned lane per worker. Reconcile State/specs before any manager handoff.
