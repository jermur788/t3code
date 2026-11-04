# T3 Fork — Current State and Roadmap

**Updated:** 2026-11-04 after 12:33Z user-authorized PR #21 fork-main merge, GitHub ancestry/source verification, and post-merge local qualification handoff.
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
| Post-merge qualification | [Paste-ready T3 Code handoff](docs/orchestration-v2/handoff-deepseek-postmerge-pr21-verification-20261104.md), **PREPARED / NOT DISPATCHED** |

**Merge method and authority:** On 2026-11-04 at 12:31Z user explicitly authorized the fork-main merge after a discussion of benefits and risks. The Overall Manager checked PR #21 open/draft/mergeable, the exact unchanged source and target heads, the zero-hosted-check state, and a comparison showing the PR ahead with no commits behind. It updated the PR's outdated description to the current acceptance and limitations, marked it ready for review, and used GitHub's `merge_pull_request` with `merge_method=merge` and an **expected PR head** guard. GitHub reported **merged=true**.

**Independent post-merge GitHub checks:** PR #21 is CLOSED / MERGED, fork `main` points at `fb67545d790c5c001e8f85827f219ab6493c435e`, and that commit has **two exact parents**: previous fork-main head `d3bedef12a31f368e5c5a6b279445bea39a6a13a` and reviewed PR head `0e0c7bc2cb1bb805f273123686303a68e1c2807c`. Source on `main` contains both the pruning metadata read and `orchestration-v2-pruned` marker. No Git history rewrite or squash. The repository reports **zero hosted checks** for this merge.

## Current milestone — upstream reconciliation and P2 Evidence V0 repair integrated into fork main

**State:** `INTEGRATED / MANAGER SOURCE REVIEW PASS / PRE-MERGE WORKER LOCAL TEST PASS / INDEPENDENT REVIEW PASS (recorded)`. **Do not claim `POST-MERGE RUNTIME PASS` or `PRODUCTION VERIFIED`** until fresh local execution supports it.

The upstream reconciliation brings fork Project Runtime/provider-neutral routing and capability tooling together with the upstream v0.1.7 release-preparation Orchestration V2 foundation. Seven actual conflicts were previously resolved and independently reviewed. Rendered fork home/upstream thread navigation (V1) and file-backed SQLite restart/cross-project isolation (V2) were worker-reported PASS on the reconciliation candidate. The subsequent P2 integrity repair resolved **silent partial-pruning loss of completeness**: Evidence V0 now emits a deterministic `incomplete/unknown` `orchestration-v2-pruned` derived marker when a referenced thread predates the upstream prune watermark, preserving distinct unresolved and 1,000-event truncation markers. No upstream execution/pruning internals or experimental continuation policy were added by that repair.

**Pre-merge verification record:** worker-reported 39/39 targeted P2 tests, 40/40 typecheck packages, changed checks with 81 test files / 2,075 tests, a web build, unchanged 58,519-byte agent-tool context snapshot, and four read-only Codex review rounds ending PASS. Manager independently inspected source diff and code/tests but **did not run local tests, inspect host raw logs, perform fresh rendered UI inspection or execute live providers**. GitHub hosted CI did not run. [Manager P2 source review](docs/orchestration-v2/manager-evidence-v0-p2-promotion-review-20261104.md) and [P2 durable task ledger](https://github.com/jermur788/t3code/blob/main/docs/orchestration-v2/evidence-v0-p2-repair-routing-ledger-20261104.md) remain source evidence.

**Accepted compatible-upgrade limitation:** the `orchestration-evidence/v0` envelope gained the closed-enum `orchestration-v2-pruned` record type. **Older base-commit decoders reject exports containing the new marker**. The user accepted coordinated reader upgrades for the fork-only milestone on 2026-11-04 at 11:44Z. No universal backward decodability, stable external format compatibility or old-decoder support is claimed. Public Evidence V0 format versioning remains a separate future design choice.

**Next bounded verification action:** the browser manager already completed GitHub merge/ancestry/source checks. A fresh local, worker-executed **post-merge rendered UI + file-backed restart/isolation + actual pruning fixture + static checks** is appropriate before promoting any stronger runtime claim. The [complete DeepSeek orchestration-only local handoff](docs/orchestration-v2/handoff-deepseek-postmerge-pr21-verification-20261104.md) is prepared, **not launched**. DeepSeek is supervisor only; Codex GPT-6.1 SOL Medium or Sonnet 5.5 Medium workers execute checks. No production/live-paid provider use, no main writes or new merges. Failure evidence returns for normal manager classification and bounded isolated repair. This does not block acknowledgement of the **completed fork-main integration**.

**Explicit exclusions:** research PR #20 and isolated default-off experimental continuation remain separate. D2 shipping tool-surface exclusion and D4 strict revocation are **unmet public-release/production continuation requirements**; they are not accidentally integrated or waived by PR #21.

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
| PR #21 upstream reconciliation + Evidence V0 P2 | **`INTEGRATED` into fork main**, normal two-parent merge verified | Preserve baseline; post-merge verification still pending |
| Evidence V0 old V0 readers | **Coordinated-upgrade compatibility accepted** for fork-only baseline | Add public/external schema evolution design before stable API promise |
| Post-merge rendered UI, restart/isolation and pruning smoke | `NOT RUN` after merge, handoff prepared | DeepSeek orchestrator → Codex/Sonnet Medium execute local checks; user must paste because no verified automatic bridge |
| Hosted CI | **zero check-runs**, no hosted PASS | Do not claim a hosted CI result |
| Production/live-provider end-to-end | `NOT VERIFIED` | Separate release qualification, no unapproved paid calls |
| Continuation public tool-schema exclusion (D2) | `DEFERRED`, excluded experiment remains separate | Separate prerelease verification/implementation |
| Strict production continuation revocation (D4) | `PRODUCT DECISION / REVIEW REQUIRED` | Separate architecture decision; do not touch upstream engine without approval |
| Research PR #20 | Open draft, separate, not integrated | Research-only, no automatic merger |
| Documentation V1 independent fresh-user qualification | `DEFERRED` | Separate milestone |

## Next manager loop

1. Start from Project Instructions → this Current State → Coordination Protocol → manager handoff → active Runtime tasks and exact fork-main GitHub state. PR #21 **has already merged**; do not remerge, promote, or rebase it.
2. Complete any browser-capable post-merge evidence checks first. The GitHub merge result/ancestry and source presence are already verified; no additional branch action is needed there.
3. For **local rendered UI, restart, cross-project persistence, and actual-pruning post-merge qualification**, supply the [complete copy/paste DeepSeek-only handoff](docs/orchestration-v2/handoff-deepseek-postmerge-pr21-verification-20261104.md). Do not claim execution until a real T3 Code session accepts it.
4. On a worker return, inspect logs/artifacts, reconcile with governing specs and current main, classify failures, request evidence-backed correction/re-review in isolated lanes as authorized, update canonical state and continue safe work. Do not modify merged main without distinct authorization.
5. Keep the default-off experimental continuation, D2 shipping exclusion, D4 strict production revocation and separate dashboard project outside this integration unless explicitly adopted through the governing specs.

**Hard stops:** no unauthorized production release, experimental continuation enablement, destructive Git, history rewrite, material paid use, integration conflict or architecture/security expansion.
