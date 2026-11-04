# T3 Fork — Current State and Roadmap

**Updated:** 2026-11-04 after 19:28Z post-merge worker verification handoff and manager GitHub/source-evidence reconciliation.
**Classification:** CURRENT PROJECT STATE — authoritative snapshot for manager continuation, not a code change.  
**Repository:** [jermur788/t3code](https://github.com/jermur788/t3code)  
**Maintained on:** `planning/resource-efficient-continuation-20261103` — **not fork main**.  
**Companion:** [OVERALL_MANAGER_HANDOFF.md](OVERALL_MANAGER_HANDOFF.md), [Coordination/Handoff Protocol](02_COORDINATION_HANDOFF_PROTOCOL.md).

**Read this before historical chat and handoffs.** Inspect live GitHub and T3 Runtime/worktree truth before relying on recorded branch heads. Older dated Current State and manager reconciliation notes are historical where they conflict with this snapshot.

## Mission / authority

Build an **upstream-friendly T3 fork with a provider-neutral Project Runtime**. Instructions, specs and accepted decisions, project/task/handoff state, and execution evidence must survive changes in model/provider/worker/conversation. Providers are replaceable workers, never owners of project truth. CCF/game development is an initial use case; extensions should remain generic. The dashboard is a separate project that consumes T3's authoritative Runtime APIs.

The **user decides product policy, significant architecture trade-offs, merges/releases, irreversible operations and material paid costs**. Implementation truth: inspected repo/runtime > reproducible tests > implementation docs > worker claims. Product intent: latest user instruction > accepted decisions > current milestone > governing spec. Research and suggestions are not decisions unless adopted.

## Current repository and integration checkpoint

| Surface | Recorded checkpoint / status |
| --- | --- |
| **Fork main — INTEGRATED** | `fb67545d790c5c001e8f85827f219ab6493c435e` — new normal two-parent PR #21 merge commit |
| **PR #21** | [Upstream reconciliation + Evidence V0 P2 repair](https://github.com/jermur788/t3code/pull/21) **CLOSED / MERGED** on 2026-11-04 12:33Z. Existing reviewed source head was `0e0c7bc2cb1bb805f273123686303a68e1c2807c`. |
| Upstream main | `8b44f42b14c8e273156474a924ccf29680dd7857` at prior manager fetch; **not refreshed for this merge** |
| Incorporated upstream parent | `bb4afa5425c52104a9261fa2d022cb8ba2fcc099`: upstream release-preparation baseline **25 commits after** actual `v0.1.7` tag, not exact tag or necessarily newest upstream |
| P2 repair branch | `fix/evidence-v0-pruning-completeness-p2-20261104` remains separate, but its reviewed code/test/evidence is incorporated via PR #21 |
| Resource-efficient continuation planning | [Research-only draft PR #20](https://github.com/jermur788/t3code/pull/20): separate and unmerged |
| Default-off continuation experiment | `experiment/continuation-default-off-gate-20261104` at `b3b8da54e0b8b184a1cf4e667d53e73e04f85074`: **excluded from fork main** |
| Post-merge qualification | **Worker-reported LOCAL RUNTIME PASS / independent REVIEW PASS WITH FINDINGS** on exact integrated main. [Manager reconciliation](docs/orchestration-v2/manager-postmerge-pr21-verification-reconciliation-20261104.md). Raw ledger/evidence still host-local and not retrievable through GitHub. |

**Merge method and authority:** On 2026-11-04 at 12:31Z user explicitly authorized the fork-main merge after a discussion of benefits and risks. The Overall Manager checked PR #21 open/draft/mergeable, the exact unchanged source and target heads, the zero-hosted-check state, and a comparison showing the PR ahead with no commits behind. It updated the PR's outdated description to the current acceptance and limitations, marked it ready for review, and used GitHub's `merge_pull_request` with `merge_method=merge` and an **expected PR head** guard. GitHub reported **merged=true**.

**Independent post-merge GitHub checks:** PR #21 is CLOSED / MERGED, fork `main` points at `fb67545d790c5c001e8f85827f219ab6493c435e`, and that commit has **two exact parents**: previous fork-main head `d3bedef12a31f368e5c5a6b279445bea39a6a13a` and reviewed PR head `0e0c7bc2cb1bb805f273123686303a68e1c2807c`. Source on `main` contains both the pruning metadata read and `orchestration-v2-pruned` marker. No Git history rewrite or squash. The repository reports **zero hosted checks** for this merge.

## Current milestone — fork main INTEGRATED; post-merge LOCAL RUNTIME PASS (reported)

**Source integration (independently checked via GitHub):** user-authorized PR #21 [merged and closed](https://github.com/jermur788/t3code/pull/21) on 2026-11-04 at 12:33Z. Fork `main` remains at normal merge commit `fb67545d790c5c001e8f85827f219ab6493c435e`. It has exact parents previous fork main `d3bedef12a31f368e5c5a6b279445bea39a6a13a` and reviewed PR/P2 head `0e0c7bc2cb1bb805f273123686303a68e1c2807c`. No history rewriting, no default-off experimental continuation integration. **`INTEGRATED`**, not production released or verified.

**Post-merge return (user-supplied worker handoff, 2026-11-04 19:28Z):** `POST-MERGE LOCAL RUNTIME PASS (WORKER-REPORTED) / INDEPENDENT REVIEW PASS WITH FINDINGS (RECORDED)`. Dispatch was reported successful. Browser manager separately verified live GitHub PR and main still match that merge, but **did not run host tests, inspect the rendered UI, fetch the worker-host ledger or inspect screenshot/log bytes**. [Detailed manager verification reconciliation](docs/orchestration-v2/manager-postmerge-pr21-verification-reconciliation-20261104.md) distinguishes observed repo truth from worker claims.

### Worker-reported verification scope

- Clean isolated verification worktree at the merged main checkpoint; local `main` untouched. `vp run typecheck` fresh/uncached exit 0 (**40/40 packages**); Evidence V0 suite **36 tests** PASS; eight Project Runtime/Task suites **103 tests** PASS; `vp run check:changed upstream/main` final exit 0, **221 changed files** in the fork-vs-upstream baseline, format/lint/knip/GraphQL/React compiler, **81 test files / 2,075 tests** PASS; web build exit 0 (**52.54 s**). Two earlier changed-check failures involved untracked local verification artifacts/ledger, not product files, according to worker. Last typecheck cache replay is supported by a separately reported uncached run at same merged head.
- Actual browser: Runtime-enabled Fork Project Home and five project cards, Workspace/Development mode controls (Workspace selection hides development cards), upstream draft composer, browser-back; stable console/network except benign warnings. UI tests used stub/no-cost providers, not live paid models.
- Actual application stop/start with persisted file-backed SQLite: two projects and their Runtime instructions/task/result/evidence state preserved identically, cross-project reads rejected before/after restart. Projects created via live WebSocket RPC, not the Add-project UI; this is graceful stop/start, not SIGKILL/crash recovery.
- Real pruning fixture: four V2 events deleted and watermark 6, one deterministic `orchestration-v2-pruned` marker with `incomplete/unknown`, distinct 1,000-event truncation and three unresolved markers, post-boundary thread unmarked; current decoder accepts all **1,025** JSONL events while old decoder rejects pruning marker as expected. No missing events invented.
- New routing policy followed: **DeepSeek V4.1 Flash orchestrated only**, Codex GPT-6.1 SOL Medium and Claude Sonnet 5.5 Medium executed worker tasks; read-only reviewers Codex GPT-6.1 Terra Medium and Claude Sonnet 5.5 Medium returned **PASS WITH FINDINGS**. Eight dispatches, zero reported capacity failures, two artifact-hygiene retries, no Opus and no subscription failover. Review findings were scope limitations, not reported contradictions.

### Residual limitations and provenance

- **App-level handoff write/isolation remains NOT VERIFIED.** Only earlier service-level handoff isolation was proven; the app RPC exposes list/read, and append reportedly requires a live model. **Mode persistence across server restart remains NOT VERIFIED.** In-session mode switching did pass. Separate follow-up narrowed other reviewer findings, but does not close these specific gaps.
- No crash/SIGKILL recovery, Add-project UI creation, hosted CI, real paid-provider turns, native/remote client end-to-end or production qualification. `check:changed` covers the full fork-upstream baseline, not PR #21's delta alone. The incorporated upstream release-preparation parent is 25 commits after the actual v0.1.7 tag and the worker's local upstream was one commit newer; that newer commit was not qualified.
- **Evidence durability gap:** worker reported `docs/orchestration-v2/postmerge-pr21-verification-ledger-20261104.md` on local `verify/postmerge-pr21-20261104` and about 8.2 MB of screenshot/log/JSONL files under `/media/jer/Files/Worktrees/pr21-verify-evidence-20261104/`. GitHub **did not expose that branch or ledger** when manager attempted to read it, consistent with a no-push/no-commit local verification run. Mark **`OPERATIONAL BLOCKER` for remotely auditable raw ledger/evidence**, not a failed local runtime verification. Manager's [reconciliation](docs/orchestration-v2/manager-postmerge-pr21-verification-reconciliation-20261104.md) preserves the supplied report, not a falsely verified remote archive.
- **Accepted Evidence V0 compatibility condition remains:** old strict `orchestration-evidence/v0` decoders reject `orchestration-v2-pruned` lines. User accepted fork-only coordinated reader upgrade; separate external stable schema evolution/versioning policy required before public consumption.

**Next safe action:** publish a sanitized *actual* host verification ledger/evidence manifest to a durable retrievable lane without touching fork `main`; optionally close the two narrow app-level gaps with stub-provider checks if supported. Use the accepted DeepSeek **orchestration-only** template; Codex SOL Medium/Sonnet 5.5 Medium execute. No new merge, fork-main source edits, production release or paid-provider calls. See [prepared bounded follow-up](docs/orchestration-v2/handoff-deepseek-postmerge-evidence-closure-20261104.md). Keep default-off continuation experiment, D2 tool-schema shipping exclusion and D4 strict revocation separate public-release gates.

## Accepted continuation safety decisions (binding; separate workstream)

**D1 — experimental default-off gate:** user approved and it is **IMPLEMENTED / local RUNTIME PASS / independent REVIEW PASS** on [isolated gate branch](https://github.com/jermur788/t3code/tree/experiment/continuation-default-off-gate-20261104). Enabled only when the server environment exactly sets `T3CODE_EXPERIMENTAL_CONTINUATION=1`. Missing/invalid stays off; non-null policy writes and automatic review/repair/replay are blocked while off; safely unambiguous unlaunched receipts cancel, uncertain ones require reconciliation. 192 Project Runtime tests and full changed-file checks passed locally. **Not merged into main or PR #21.**

**D2 — public shipping exclusion:** user approved requiring **experimental continuation and its agent-facing tool-schema overhead to be excluded before any public release**. This is a **release acceptance requirement, not implemented**. The experimental continuation's earlier +646-byte MCP tool-list delta is tolerated **only in isolated/unmerged research**, not approved for shipping.

**D3 — experimental cancellation:** best-effort final authorization check + receipt cancellation/reconciliation is acceptable **only for isolated stub-provider experimentation**. Known final-check-to-external-launch race can start one turn after revocation; do not claim it closed.

**D4 — production strict revocation:** public release/production enablement **requires no new continuation run created after authorization withdrawal durably commits**. A separate architecture decision is needed on exact linearization and in-flight/queued-turn contract. [T4 design research](https://github.com/jermur788/t3code/blob/experiment/continuation-default-off-gate-20261104/docs/orchestration-v2/staged-continuation-t4-strict-revocation-and-shipping-20261104.md) favors atomic guard at durable `run.created` using existing task revision plus a provider-start defense. **This is a recommendation, not yet approval to modify upstream engine, introduce a new authority/epoch table or claim a strict guarantee.**

Governing spec: [Continuation staged safety](docs/orchestration-v2/continuation-staged-safety-governing-spec-20261104.md).

## Other project tracks / historical continuity

- **Project Runtime V1, Development Profiles V1, Task/Handoff State V1, Fork Project Home and Runtime Task Routing & Execution V1** were integrated/verified in the earlier project-state record. Their implementation must remain intact under upstream sync.
- **Documentation V1**: integrated, but the independent fresh-user golden-path and troubleshooting/restart qualification in the 2026-10-31 Current State was still **PENDING / OPERATIONAL BLOCKER** at last supported evidence. Do not silently mark Documentation V1 `VERIFIED`; reconcile separately after current PR #21 verification.
- **Adaptive Orchestration direction**: evidence-driven, provider-neutral and cost-aware, with retained CCF overnight evidence and provider/model/attempt routing records. A learned router is *not* authorized merely because the direction is accepted; avoid premature autonomous routing-policy claims.
- **Upstream PR #28777**: earlier posted a test-only review comment; author acknowledged it and updated their branch. At manager's latest fetch PR remained open/unmerged; no evidence our test patch landed. Upstream PR must not be conflated with fork PRs #20/#21. No further public posting requested.

## Routing / execution state

**Accepted user routing directive, 2026-11-04:** DeepSeek only orchestrates future T3 Code tasks; it does **not** implement, edit source or execute development tests. It coordinates worker selection, subscription supervision, attempts, review, state/ledger updates and handoff. All implementation/tests use Codex **GPT-6.1 SOL Medium** or Claude **Sonnet 5.5 Medium**. Escalate genuinely difficult unresolved work to **Claude Opus 5.5** as justified. Use distinct model/provider for independent read-only review. Preserve one writer per overlapping lane; normal two evidence-backed remediation attempts apply before expensive escalation when safe.

The user reported DeepSeek/OpenCode at **~10% of its 30-day allocation with ~10 days remaining** (user observation at 09:46Z, not telemetry). Reserve that subscription for coordination. Track separately each provider/subscription availability, actual capacity evidence/UNKNOWN, quota and provider-confirmed five-hour reset; checkpoint, safely switch to an available authorized pool, or resume after reset using a real supported T3 host mechanism. If background resumption is unavailable, write a precise continuation handoff; never claim a nonexistent automatic scheduler.

Every future local task handoff must include a **copy/paste-ready DeepSeek instruction** plus a durable source link, using the [accepted compact template](docs/orchestration-v2/DEEPSEEK_ORCHESTRATOR_HANDOFF_TEMPLATE_V1.md). Runtime task/attempt/handoff records are preferred; append-only branch ledger fallback. Record route/attempt/alternatives, exact model/effort, capacity evidence, reason, tests and review, outcomes and next action as events occur. No fabricated costs or reset times.

The completed P2 repair used DeepSeek V4.1 Flash for orchestration + implementation and Codex review under the prior already-issued packet. The new directive applies **prospectively**; do not retroactively alter its evidence or routing history. Browser manager has GitHub/source access, not a live local T3 worker bridge.

## Pending gates and required user decisions

| Gate | Current state | Next action / authority |
| --- | --- | --- |
| PR #21 upstream reconciliation + P2 Evidence V0 | **`INTEGRATED`** (GitHub merged main verified) | Maintain accepted upstream-friendly development baseline |
| Post-merge rendered UI + persistence + pruning | **`LOCAL RUNTIME PASS (worker-reported) / REVIEW PASS WITH FINDINGS (recorded)`** | No production claim; preserve exact worker evidence, inspect as available |
| Actual remote ledger/evidence portability | **`OPERATIONAL BLOCKER` for direct audit** — local verification branch not published | Publish sanitized worker ledger and evidence manifest to an isolated durable source; never infer branch link exists |
| App-level handoff isolation and mode persistence across restart | **`NOT VERIFIED`** at app-level | Optional bounded no-cost follow-up if supported; preserve service-level results |
| Evidence V0 old-decoder compatibility | **User-accepted fork-only coordinated upgrade** | External stable API needs separate schema evolution design |
| Hosted CI + live-provider production evidence | **`NOT RUN / NOT VERIFIED`** | No hosted or production PASS claim |
| Experimental continuation branch | **`NOT INTEGRATED`** | Keep separate from fork-main milestone |
| D2 public tool-schema exclusion | **`DEFERRED`** | Separate production prerelease requirement |
| D4 strict revocation | **`PRODUCT DECISION / REVIEW REQUIRED`** | Separate architecture decision before engine changes |
| Documentation V1 fresh-user qualification | **`DEFERRED`** | Separate milestone |
| Research PR #20 | **Open/draft, not integrated** | No automatic merge |

## Next manager loop

1. Read Project Instructions → this Current State → Coordination Protocol → manager handoff → exact fork-main and relevant Runtime tasks/handoffs. PR #21 **already merged**; do not repeat.
2. The post-merge worker-reported local runtime qualification is sufficient to upgrade the milestone from NOT RUN to **LOCAL RUNTIME PASS (reported), REVIEW PASS WITH FINDINGS (recorded)**. Do not overstate as manager-executed tests or production verification.
3. Address the **host-local evidence portability** gap through the [complete DeepSeek-only evidence-closure handoff](docs/orchestration-v2/handoff-deepseek-postmerge-evidence-closure-20261104.md) if local T3 Code execution is available. Browser can preserve this summary but cannot fetch host-only screenshot/log files. No worker has been launched by writing this packet.
4. Optionally verify app-level handoff isolation using stub/no-cost model support and preference-mode persistence across actual app restart. If unsupported, log an operational blocker; no workarounds involving paid provider calls. Keep verification lanes read-only against merged main.
5. Only after audited evidence is available reconcile exact commands/results, classify any discrepancies and update Runtime/Current State. Keep D2/D4 future-release requirements and separate default-off continuation experiment isolated. Do not alter fork main or claim production release without distinct user authority.

**Hard stops:** no unapproved main source write, merge, production/paying external provider test, destructive Git, material architecture/security scope change or history rewrite.
