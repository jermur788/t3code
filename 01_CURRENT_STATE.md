# T3 Fork — Current State and Roadmap

**Updated:** 2026-11-04, after the 11:32Z Evidence V0 P2 repair return and independent manager source/promotion review.  
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
| Fork main | `d3bedef12a31f368e5c5a6b279445bea39a6a13a` — unchanged since the manager began this reconciliation |
| Upstream main | `8b44f42b14c8e273156474a924ccf29680dd7857` at last manager fetch; upstream moves quickly |
| Pinned upstream release used by reconciliation | `bb4afa5425c52104a9261fa2d022cb8ba2fcc099` (v0.1.7) |
| Reconciled fork/upstream trial | `integration/fork-upstream-reconciliation-trial-20261104` at `70203ed5a95dbe1762da1ad2a46c4f153f910492` |
| **Fork-only draft PR #21** | **OPEN, DRAFT, UNMERGED**: [Review reconciliation](https://github.com/jermur788/t3code/pull/21). Source trial → fork `main`; GitHub last reported mergeable/clean |
| Resource-efficient continuation planning | [Draft research PR #20](https://github.com/jermur788/t3code/pull/20) — separate, open/draft, unmerged |
| Default-off continuation experiment | `experiment/continuation-default-off-gate-20261104` at `b3b8da54e0b8b184a1cf4e667d53e73e04f85074` — **separate from PR #21 and main** |

**No approval has been given to merge PR #21 or PR #20, fast-forward main, ship, or enable production continuation.** Opening PR #21 was explicitly approved by the user and completed by the browser manager.

The reconciled candidate is a true fork/upstream merge based on fork main plus pinned upstream v0.1.7. Seven actual conflicts were resolved (the historically reported eighth did not recur). This branch **does not include** the synthetic continuation policy or its gate; those files are absent by design.

## Current milestone — P2 repair reviewed; PR #21 promotion awaits user authority

**Manager verdict:** `P2 SOURCE REVIEW PASS / REPAIR ACCEPTED FOR PROMOTION CONSIDERATION / WORKER-REPORTED LOCAL TEST PASS / INDEPENDENT REVIEW RECORDED PASS`. **PR #21 remains OPEN / DRAFT / UNMERGED; fork main unchanged; NOT INTEGRATED; NOT PRODUCTION VERIFIED.** [Full manager source and acceptance review](docs/orchestration-v2/manager-evidence-v0-p2-promotion-review-20261104.md).

### Exact observed GitHub state

- Fork-only [PR #21](https://github.com/jermur788/t3code/pull/21) remains at its existing accepted upstream-reconciliation head. The [isolated P2 repair branch](https://github.com/jermur788/t3code/tree/fix/evidence-v0-pruning-completeness-p2-20261104) is a linear descendant with five commits, three source/test files and two durable evidence documents, **not** promoted to PR #21.
- Reviewed code/test checkpoint: `a03a8bce92ea2de65a92a112bf9771388673094b`; branch has one later documentation-only handoff change and ends at `0e0c7bc2cb1bb805f273123686303a68e1c2807c`. No upstream orchestration engine, database migrations, synthetic continuation or source routes were changed.
- Upstream parent of PR #21 is **25 commits past the v0.1.7 tag**; describe it as the release-preparation baseline, not an exact-tag or newest-main integration.
- [Worker's durable repair handoff](https://github.com/jermur788/t3code/blob/fix/evidence-v0-pruning-completeness-p2-20261104/docs/orchestration-v2/evidence-v0-p2-repair-handoff-20261104.md) and [routing/attempt ledger](https://github.com/jermur788/t3code/blob/fix/evidence-v0-pruning-completeness-p2-20261104/docs/orchestration-v2/evidence-v0-p2-repair-routing-ledger-20261104.md) were inspected through GitHub. Worker-host raw log/fixture bytes were not retrieved and local tests were not independently run by browser manager.

### Verified in source / bounded worker evidence

- Evidence V0 now consults the canonical upstream `EVENT_LOG_PRUNED_THROUGH` boundary and emits a deterministic `orchestration-v2-pruned` derived-view marker with `completeness=unknown` when a referenced thread predates the pruning boundary. Missing references and bounded-read truncation remain separate.
- The manager inspected the actual additive source diff, real-pruning test fixture, file-backed SQLite reopen/isolation coverage, long thread-ID and JSONL/reconstruction decoders, and unchanged upstream engine scope. Review found no new source correctness blocker within the bounded repair.
- Worker records actual-pruning red→green plus two independently found bound defects and repair, focused **39/39 PASS**, `typecheck` **40/40 PASS**, changed checks **81 files / 2,075 tests PASS**, unchanged MCP context budget at **58,519 bytes**, and web build PASS. Last code change was test-only, followed by focused and typecheck rerun. These are **worker-reported**, not hosted CI.
- Separate read-only Codex review recorded `CHANGES REQUIRED` in rounds 1–2, `PASS WITH FINDINGS` in round 3, final `PASS` in round 4 after red/green corrections. No hosted checks or fresh live-provider/production qualification were established.

### Material compatibility limitation for promotion

The `orchestration-evidence/v0` envelope keeps its version identifier but adds a **closed-enum record type** `orchestration-v2-pruned`. Updated consumers can decode it; **old base-commit decoders reject exports containing that marker**. Do **not** claim universal backward decodability. This is an explicit coordinated-upgrade limitation, not an unnoticed regression. Manager considers the repair technically acceptable for a **fork-only** coordinated promotion **if** the user accepts that compatibility constraint; backward support for independent old clients would instead require a separate versioning/negotiation decision.

Other retained risks: conservative `UNKNOWN` incompleteness markers may be emitted without proven per-thread deletions; detection depends on upstream keeping creation events and stream heads. Production provider/streaming, native/remote clients, hosted CI and release verification remain unproven. Prior pre-merge V1/V2 UI/restart results are worker-reported PASS on the original reconciliation candidate; changed branch is server/contract-only.

### Routing policy updated prospectively

**DeepSeek is now reserved for orchestration only** in future tasks; do not use it for implementation, code edits, or development tests. Workers: **Codex GPT-6.1 SOL Medium** or **Claude Sonnet 5.5 Medium**, with **Claude Opus 5.5** escalation only when justified. Track each subscription's observed limits/five-hour reset and resume after provider-confirmed availability where T3 supports it. Durable ledger and paste-ready handoff remain mandatory. See [accepted reusable template](docs/orchestration-v2/DEEPSEEK_ORCHESTRATOR_HANDOFF_TEMPLATE_V1.md) and [Coordination Protocol](02_COORDINATION_HANDOFF_PROTOCOL.md). The completed P2 worker had already been dispatched under the older routing packet, so do not retroactively misclassify its DeepSeek implementation as a new-policy violation.

### NEXT — explicit PR #21 promotion decision

**Do not advance the PR #21 branch or merge yet.** Request the user's authorization to **promote the reviewed P2 repair onto the existing draft PR #21** as a guarded non-history-rewriting fast-forward, **explicitly accepting the old V0-decoder upgrade limitation**. This would update only the PR's source branch, not fork main, and does not constitute merge approval. If authorized, recheck actual live refs/worktree ownership, advance only on expected base, confirm tests/scope and update canonical state. The **merge remains a separate later user decision**.

D2 experimental schema/tool-surface shipping exclusion and D4 strict production revocation remain separate release gates; no production enablement.

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

| Gate | Current state | Next authority/action |
| --- | --- | --- |
| Evidence V0 P2 repair | `SOURCE REVIEW PASS`, local tests/review worker-reported PASS | No further bounded source defect found; preserve branch and compatibility note |
| V0 closed-enum decoder compatibility | **Known coordinated-upgrade limitation** | User accepts old-decoder upgrade requirement for fork-only promotion, or requests separate compatibility design |
| **Advance P2 repair onto draft PR #21** | **PRODUCT/INTEGRATION DECISION — NOT AUTHORIZED** | Request explicit approval for guarded fast-forward of existing PR source branch; **not a merge** |
| Merge PR #21 into fork main | **PRODUCT DECISION — NOT AUTHORIZED** | Separate decision only after accepted PR source/promotion evidence |
| Hosted CI, production use and live provider execution | `NOT RUN / UNVERIFIED` | Do not infer PASS from local fixtures |
| Continuation shipping exclusion (D2) | `DEFERRED` | Separate prerelease implementation/verification |
| Strict production continuation cancellation (D4) | `PRODUCT DECISION / REVIEW REQUIRED` | Separate architecture review, no unilateral engine change |
| Experimental continuation gate | `NOT INTEGRATED` | Keep separate from PR #21 |
| Documentation V1 fresh-user qualification | `DEFERRED` | Resume at an authorized milestone |

## Next manager loop

1. Read Current State, Coordination Protocol, [manager P2 source review](docs/orchestration-v2/manager-evidence-v0-p2-promotion-review-20261104.md) and exact branch/Runtime evidence. Recheck live GitHub refs and any active worktrees before writable work.
2. **Stop for the user's separate PR #21 source-promotion approval** and explicit old-V0-decoder compatibility disposition. Do not present P2 repair acceptance as merge authorization.
3. If source promotion is approved, use a guarded non-rewriting update of the existing draft PR source branch only, preserving expected base and one-writer ownership; reconcile checks, branch history and evidence. No new PR or fork-main update.
4. Publish the updated canonical state and PR review record. Ask separately for the fork-main merge decision when the candidate is accepted.
5. Keep D2/D4 shipping/production continuation decisions separate. Use the accepted DeepSeek orchestration-only template for future actual local-worker tasks, not as a substitute for dispatch.

**Hard stops:** no unauthorized PR head promotion/merge, production continuation, destructive Git operation, paid use, material architecture/security tradeoff or upstream engine redesign.
