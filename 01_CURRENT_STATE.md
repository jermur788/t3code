# T3 Fork — Current State and Roadmap

**Updated:** 2026-11-04, after the 11:44Z user approval and successful guarded source-branch promotion to draft PR #21.  
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
| Upstream reconciliation parent | `bb4afa5425c52104a9261fa2d022cb8ba2fcc099` (release-preparation commit, **25 commits past the v0.1.7 tag**) |
| Draft PR #21 promoted candidate | `integration/fork-upstream-reconciliation-trial-20261104` at `0e0c7bc2cb1bb805f273123686303a68e1c2807c` (includes accepted P2 repair) |
| **Fork-only draft PR #21** | **OPEN, DRAFT, UNMERGED**: [Review reconciliation](https://github.com/jermur788/t3code/pull/21). Source trial → fork `main`; GitHub last reported mergeable/clean |
| Resource-efficient continuation planning | [Draft research PR #20](https://github.com/jermur788/t3code/pull/20) — separate, open/draft, unmerged |
| Default-off continuation experiment | `experiment/continuation-default-off-gate-20261104` at `b3b8da54e0b8b184a1cf4e667d53e73e04f85074` — **separate from PR #21 and main** |
| P2 Evidence V0 repair | `fix/evidence-v0-pruning-completeness-p2-20261104`: accepted code/tests **promoted to draft PR #21 source**, not fork main |

**No approval has been given to merge PR #21 or PR #20, fast-forward main, ship, or enable production continuation.** Opening PR #21 was explicitly approved by the user and completed by the browser manager.

The reconciled candidate is a true fork/upstream merge based on fork main plus pinned upstream v0.1.7. Seven actual conflicts were resolved (the historically reported eighth did not recur). This branch **does not include** the synthetic continuation policy or its gate; those files are absent by design.

## Current milestone — P2 repair PROMOTED to draft PR #21; fork merge not authorized

**User decision (2026-11-04 11:44Z): Option A approved.** Accept the coordinated-upgrade limitation for older `orchestration-evidence/v0` decoders and advance the reviewed P2 repair onto draft PR #21's source branch **without merging into fork main**.

**Execution:** Overall Manager used GitHub's **non-force, expected-head guarded update** to advance `integration/fork-upstream-reconciliation-trial-20261104` from the previously accepted reconciliation checkpoint `70203ed5a95dbe1762da1ad2a46c4f153f910492` to the inspected final P2 repair branch checkpoint `0e0c7bc2cb1bb805f273123686303a68e1c2807c`. Exact preconditions verified: repair had five descendant commits and zero behind; exactly three source/test files and two evidence docs changed; PR source and fork main matched the expected base. The update returned success. Post-update REST checks independently verified the PR head and fork-main head. PR #21 is **OPEN / DRAFT / UNMERGED / MERGEABLE / clean** at current GitHub inspection, with no hosted checks.

**Status:** `P2 SOURCE REVIEW PASS / LOCAL TEST PASS (worker-reported) / INDEPENDENT REVIEW PASS (ledger-recorded) / PROMOTED TO PR DRAFT`; **`NOT INTEGRATED` (fork main), `NOT PRODUCTION VERIFIED`**. Promotion is not a fork-main merge or public release.

### What was promoted

- [PR #21](https://github.com/jermur788/t3code/pull/21) now includes `orchestration-v2-pruned` Evidence V0 marker, existing upstream pruning-boundary read, strictly conservative `incomplete / unknown` representation, stable SHA-256 marker ID, read-limit/unresolved separation, affected test coverage and the repair's durable handoff/ledger.
- [Independent manager review](docs/orchestration-v2/manager-evidence-v0-p2-promotion-review-20261104.md), [P2 worker handoff](https://github.com/jermur788/t3code/blob/fix/evidence-v0-pruning-completeness-p2-20261104/docs/orchestration-v2/evidence-v0-p2-repair-handoff-20261104.md) and [routing ledger](https://github.com/jermur788/t3code/blob/fix/evidence-v0-pruning-completeness-p2-20261104/docs/orchestration-v2/evidence-v0-p2-repair-routing-ledger-20261104.md) remain durable. The isolated repair branch is preserved separately.
- Worker-reported red→green and local checks: 39/39 focused, 40/40 typecheck packages, 81 changed test files/2,075 tests, context snapshot 58,519 bytes, web build PASS, Codex independent review rounds ending PASS. Manager reviewed GitHub diff and regression source but **did not run local tests or retrieve raw host logs**. No hosted CI, production, live provider or new UI verification is claimed.
- The actual upstream reconciliation parent remains **25 commits past the v0.1.7 tag**, not the exact tag. This source promotion does not advance to current upstream main.

### Accepted bounded compatibility limitation

The unchanged `orchestration-evidence/v0` schema now recognizes a new **closed-enum** record type. Older clients using the base-commit V0 decoder **reject exports containing `orchestration-v2-pruned`** and must be upgraded; the user accepted that constraint for the fork-only coordinated change. Do not claim universal backward decodability. Record a separate future schema evolution/negotiation design prerequisite **before** a stable public/external Evidence V0 contract. No known external dependent reader was verified, and no live cross-version testing was performed.

### Next authorized transition

The source promotion is **complete**. Do **not** rerun or re-dispatch it. The next **separate user decision** is whether to merge [draft PR #21](https://github.com/jermur788/t3code/pull/21) into the fork's `main` (not authorized by Option A). Before any merge action, refresh PR status/head/base, confirm one-writer and branch safety, review evidence limitations and make the decision explicit. The candidate remains draft by design. No merge is implied by calling it mergeable.

The separate default-off continuation experiment remains unmerged; D2 shipping-tool-surface exclusion and D4 strict production revocation remain **unmet public release gates**, not prerequisites that were silently waived by Option A. Browser manager cannot claim live-provider/production verification.

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
| Evidence V0 P2 repair | `IMPLEMENTED / SOURCE REVIEW PASS / PROMOTED TO DRAFT PR #21` | Preserve accepted fix and tests |
| Old V0 decoder coordinated upgrade | **User accepted Option A** for fork-only PR promotion | Do not claim old decoders accept new marker; future external format versioning separate |
| **PR #21 source promotion** | `COMPLETE` (non-force guarded fast-forward) | No further PR source write currently needed |
| **Merge draft PR #21 to fork main** | **`PRODUCT DECISION — NOT AUTHORIZED`** | Request explicit separate user merge approval after reviewing current evidence |
| Hosted CI, live provider, production | `NOT RUN / UNVERIFIED`; zero hosted checks | No hosted/production PASS claim |
| Continuation public shipping exclusion (D2) | `DEFERRED` | Separate prerelease verification |
| Strict production continuation revocation (D4) | `PRODUCT DECISION / REVIEW REQUIRED` | Separate architecture review |
| Experimental continuation gate | `NOT INTEGRATED` | Remains excluded from PR #21 |
| Documentation V1 fresh-user qualification | `DEFERRED` | Resume in separately authorized milestone |

## Next manager loop

1. Read this Current State, Coordination Protocol, manager P2 review and exact PR #21 candidate/ledger. Verify live GitHub refs and Runtime/worktree ownership before any further writable work.
2. **Do not promote P2 again**; Option A and the guarded draft PR source fast-forward were completed and verified. The fork `main` remains unchanged.
3. Present the user the **separate fork-only PR #21 merge decision** with bounded local verification evidence, no hosted CI, and the accepted old-decoder upgrade caveat. Do not merge without explicit approval.
4. If the user authorizes merging, refresh the exact PR/base, ensure no drift/other writers, prefer a non-destructive merge preserving upstream ancestry, then independently verify fork main and update canonical state. Any new conflict or security issue requires stop/review.
5. Keep default-off continuation experiment and D2/D4 public shipping/revocation gates separate. Use [accepted DeepSeek orchestration-only template](docs/orchestration-v2/DEEPSEEK_ORCHESTRATOR_HANDOFF_TEMPLATE_V1.md) for any **future actual local worker** action; do not invent a worker dispatch.

**Hard stops:** no unauthorized merge, production continuation, destructive Git operation, material paid use, architecture/security tradeoff or upstream engine redesign.
