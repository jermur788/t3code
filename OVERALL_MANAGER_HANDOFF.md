# Overall Manager — Authoritative Continuation Handoff

**Updated:** 2026-11-05 after 12:25Z reported private candidate preparation, governing-doc reconciliation and bounded checksum coverage review.
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

**PR #21 remains merged, post-merge LOCAL RUNTIME PASS and locally closed original evidence remain worker-reported; the newly approved sanitized text-only candidate has now been prepared privately.** User supplied a DeepSeek-orchestrated 2026-11-05 12:25Z local return: Codex SOL Medium staged 78 sanitized text files plus three metadata files (81 total, 629,098 bytes), while Sonnet 5.5 Medium gave independent review PASS after corrections. The v2 source package was mounted read-only and reportedly unchanged; no uploads, pushes or publication occurred. Manager independently rechecked the GitHub PR/main and **found the allegedly missing governing task document on the planning branch**. A **routine checksum coverage requirement remains**: reported `SHA256SUMS.txt` has 78 entries (sanitized files only), but the task requires all publishable artifacts except the checksum file, i.e. **80 entries including `MANIFEST.md` and `SANITIZED-MAP.json`**. Record `LOCAL STAGING COMPLETE (worker-reported) / REVIEW PASS (recorded) / INTEGRITY ACCEPTANCE CORRECTION REQUIRED / NOT PUBLISHED`. Browser manager did not inspect the private candidate; production still unverified.

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

## NEXT — bounded metadata integrity fix, then separate publication decision

1. **Do not repeat** PR #21 merge, original evidence closure, redaction/staging or local-mode verification. The worker has now completed the original sanitized candidate preparation; final metadata checksum coverage is its only known bounded acceptance defect.
2. [Governing original task](docs/orchestration-v2/task-pr21-sanitized-evidence-subset-local-preparation-20261105.md) is **confirmed on live GitHub**. Worker-host claim that it was missing from every local/remote ref is a **ref/fetch discrepancy**, not a missing authoritative spec. [Manager review](docs/orchestration-v2/manager-pr21-sanitized-subset-preparation-review-20261105.md) records the diff from task acceptance.
3. **Prepared, not dispatched:** [complete DeepSeek-only 80-entry checksum correction handoff](docs/orchestration-v2/task-pr21-sanitized-subset-metadata-hashes-correction-20261105.md). DeepSeek coordinates only. A single Codex GPT-6.1 SOL Medium or Claude Sonnet 5.5 Medium writer adds `MANIFEST.md` and `SANITIZED-MAP.json` hashes to the existing 78 sanitized entries, giving **80/80** relative hashes (SHA256SUMS self-file excluded), then an independent reviewer from the other provider rechecks exact final 81-file bytes. Original sanitized text and v2 source package remain unmodified; no network transfer. This is routine completion within prior local-only user authorization, no new product decision needed.
4. The candidate is on a **private local path**, which the browser cannot fetch or independently verify. Worker reported v2 read-only mount; local `main` stale but unmodified; those host lifecycle details must not be silently changed by correction. Actual provider quota/5-hour reset observations remain UNKNOWN.
5. **After 80/80 pass:** reconcile worker-returned local audit and review, then ask the user the **separate publication choice**: keep private, publish to a maintainer-controlled private destination, or publish publicly. **The actual GitHub fork is PUBLIC, including any dedicated evidence branch.** The user must separately approve exact reviewed files, destination, visibility and whether model/provider routing names remain readable. No raw packages, screenshots, private ledgers or binaries ever included without distinct authority.
6. Keep app-level MCP handoff isolation `NOT RUN / OPERATIONAL BLOCKER`, client-mode persistence PASS within same-profile server-restart scope, zero hosted CI, no production claims, experimental continuation branch unmerged, D2/D4 public-release gates unmet. No fork-main code changes.

## USER-ACCEPTED DECISIONS (do not re-ask)

- User authorized creation of **fork draft PR #21**, then at 2026-11-04 11:44Z selected **Option A**, explicitly accepting the **fork-only coordinated old-Evidence-V0 decoder upgrade limitation** and PR-source promotion. Promotion was completed.
- User separately approved **merging PR #21 into fork `main`** at 2026-11-04 12:31Z. Normal two-parent merge completed and independently verified. **Never re-ask merge permission for the already merged PR #21 or repeat the merge**.
- User approved DeepSeek **orchestration-only** for all future worker tasks, with Codex GPT-6.1 SOL Medium or Claude Sonnet 5.5 Medium doing implementation/tests, Claude Opus 5.5 for justified escalations, per-subscription capacity/watch/reset tracking, and real-time ledger updates. User reported a low DeepSeek monthly allowance on 2026-11-04; exact current balance/reset UNKNOWN.
- On 2026-11-05, user approved **local-only preparation/review of the 78-file sanitized text evidence publication candidate**. No upload, commit, push or publication; any actual external transfer requires a new, destination-specific user decision.
- User approved the **separate default-off server gate** for isolated continuation experimentation — implemented on unmerged experimental branch.
- User requires **exclusion of experimental agent-facing continuation tool-schema overhead before public release** (D2); this release requirement remains unmet and unmerged.
- User permits **best-effort last-check/reconciliation only for isolated stub-only continuation experiments** (D3), with known provider-start race explicitly bounded.
- User requires strict no-new-continuation-run after durably committed revocation **before production** (D4); no accepted exact linearization or authority-table/engine rewrite exists yet.

**Not approved:** publishing/sanitized evidence upload, any Git commit/push, further repo merges, public release, production continuation, material paid-provider work, unsafe credential bypass, new authority DB or destructive Git changes. Local evidence closure occurred **without publication**; local candidate preparation is approved but not dispatched.

## Open risks and milestone context

- **EVIDENCE CLOSED LOCALLY, not remotely published or independently byte-inspected by browser manager.** Worker-reported package hashes, file counts and redaction need exact final-subset inspection before any transfer. Missing raw restart RPC frames, earlier frozen ledger content and standalone reviewer transcripts remain missing.
- **Sanitized local staging completed (worker-reported)**: 81 files and reported disclosure review PASS, but two metadata files are absent from the 78-entry checksum manifest. **80-entry metadata checksum correction remains PREPARED / NOT DISPATCHED**; no public/private transfer authorized. Original candidate is not directly viewable by browser manager.
- Worker-host missing-governing-document claim contradicted by live GitHub fetch; location/ref synchronization cause remains UNKNOWN. GitHub repo is PUBLIC, making any dedicated evidence branch public too.
- **App-level handoff isolation NOT RUN / OPERATIONAL BLOCKER.** MCP-based append authorization was source-inspected; external no-cost local-provider feasibility not exhaustively proven. Service-level tests are not app-level pass.
- **Mode persistence client-local PASS** over normal server stop/start and same-profile reload, not browser-process restart/server-side/other device. No crash/SIGKILL, Add-project UI, native/remote/relay/tunnel or production provider verification.
- No hosted CI. Old strict Evidence V0 decoders reject the new pruning event; fork-only coordinated upgrade accepted, but a stable external evidence contract needs schema evolution design.
- Separate default-off continuation remains outside fork main. D2 tool-schema shipping exclusion and D4 strict production revocation remain unmet public-release requirements; Documentation V1 fresh-user qualification is separate.

## STOP / TRANSITION

PR #21 and evidence closure already completed; new local sanitized staging also completed under the user's 2026-11-05 approval. **Do not repeat these tasks.** One routine acceptance correction is authorized: 80-entry non-self checksum coverage (two metadata files missing) plus independent local re-review. Its handoff is PREPARED / NOT DISPATCHED; browser has no T3 Code bridge. **No Git commit, push, public/private upload, attachment, publication, release, production provider call or fork-main write is authorized.** Separately request a user decision about exact files, public/private destination and provider/model name disclosure before any transfer. Stop for evidence disclosure risk, source ownership drift, destructive Git, credential bypass, paid usage or architecture expansion; reconcile Current State and active Runtime tasks at manager change.
