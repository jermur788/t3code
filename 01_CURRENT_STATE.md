# T3 Fork — Current State and Roadmap

**Updated:** 2026-11-04, after the 09:26Z independent local verification handoff and manager source/GitHub reconciliation.  
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

## Current milestone — PR #21 verification reconciled; Evidence V0 P2 repair required

**Updated from 2026-11-04 09:26Z independent local verification handoff.** This section supersedes the earlier V1–V5 *not-run* status and the preflight comment; the rest of this file retains its prior scope unless amended below.

**Manager verdict: `REPAIR REQUIRED / REVIEW REQUIRED`; PR #21 `NOT INTEGRATED`, production `NOT VERIFIED`.** Candidate source accepted for bounded repair/continued review; **fork-only merge is not yet manager-recommended** while the demonstrated Evidence V0 completeness issue remains. The user retains final authority to explicitly accept the limitation and authorize merging notwithstanding this recommendation.

### Live GitHub reconciliation

- [Fork-only draft PR #21](https://github.com/jermur788/t3code/pull/21) remains **OPEN / DRAFT / UNMERGED / MERGEABLE** at the unchanged accepted reconciliation checkpoint, still zero commits behind and 330 ahead of fork main. Fork main remains unchanged; no new branch PR or source integration is implied by this update.
- At manager check, **0 hosted check-runs and status contexts**, with no hosted CI PASS claim. The prior PR thread has a [browser preflight comment](https://github.com/jermur788/t3code/pull/21#issuecomment-6626843132).
- The actual upstream parent of the reconciliation is **25 commits after the `v0.1.7` tag**, not that exact tag. Current upstream main remains one commit after the incorporated release-preparation parent at manager inspection. Descriptions should say **upstream v0.1.7 release-preparation baseline** rather than exact tag.
- Continuation default-off experiment remains separate and absent from PR #21. D2 shipping exclusion and D4 production revocation requirements remain unmet and do not ride on this PR.

### Independent local host handoff, 09:26Z

**Evidence class:** user-provided authoritative worker/manager handoff describing local execution. The browser manager independently inspected relevant source and live GitHub, but **has not independently accessed the local screenshots, SQL fixture files, raw receipts or run logs**. Never conflate worker-reported `PASS` with browser-reexecuted tests.

| Gate | Reported result | Manager disposition |
| --- | --- | --- |
| V1 rendered UI | PASS: Chromium fork home/Development/Workspace and copied-thread redirect; clean console except transient pairing WebSocket error | **Worker-reported UI PASS**, screenshots still on local host |
| V2 file-backed restart/isolation | PASS: two projects, reopen SQLite, cross-project rejection; targeted tests | **Worker-reported RUNTIME PASS**, independent browser rerun not available |
| V3 Evidence V0 after pruning | PASS WITH **P2**: fully absent V2 history marked unresolved; partially pruned history omitted incompleteness marker | **IMPLEMENTATION DEFECT / UPSTREAM COMPATIBILITY**; needs narrow repair |
| V4 local verification | PASS: 40-package typecheck, 81 files/2,072 tests, web build 7,430 modules, context-budget snapshot unchanged at 58,519 bytes | **Worker-reported STATIC/RUNTIME PASS**, no hosted CI |
| V5 independent review | Codex gpt-6.1-sol high, read-only: `CLEAN WITH FINDINGS` | **Review-with-findings**, not sign-off of P2 |

The local worker reported detached verification worktree on external volume, tracked clean, existing worktrees preserved; reported 52 GB root and 91 GB external remaining at end. The browser manager cannot inspect that local worktree directly.

**Pruning reproduction:** reported `before=3, remaining=2, after=2, deleted=1, unresolved=2`. Entirely unavailable referenced history fails closed, but a partially pruned referenced history with retained V2 events can appear complete. Browser source inspection confirms Evidence V0 bounded thread reading checks only per-thread read limits, while upstream event maintenance has a published pruning watermark. Source cannot independently prove the local SQL reproduction, but supports the diagnosed omission.

**Local evidence locations** (not hosted/persisted in GitHub at this checkpoint): `/tmp/opencode/v017-verification-ledger-20261104.md`, `/tmp/opencode/evidence/`, `/tmp/opencode/evidence/test-packet/`. Publish sanitized exact logs/screenshots/fixture into the task's durable lane record before promoting a stronger independent verification claim.

### Next authorized action — bounded P2 repair, no merge

[Governing Evidence V0 pruning-completeness P2 repair packet](docs/orchestration-v2/task-evidence-v0-pruning-completeness-p2-20261104.md) now supersedes the previous V1–V5 execution task for immediate implementation priority. It requires:

1. a fresh independently owned worktree from the unchanged candidate head; no edits to accepted PR branch or fork main;
2. an additive read-only Evidence V0 incomplete/pruned indicator tied to existing pruning metadata, no synthetic event fabrication and no duplicate event store;
3. red/green real-pruning regression, no-prune/unrelated-thread cases, restart/isolation/JSONL schema checks; targeted and broad local verification;
4. distinct-provider read-only review and manager review of exact evidence before possible candidate promotion.

**Routing:** browser manager source reconciliation and task preparation completed here (GPT-6); the isolated remote repair branch [`fix/evidence-v0-pruning-completeness-p2-20261104`](https://github.com/jermur788/t3code/tree/fix/evidence-v0-pruning-completeness-p2-20261104) has been created from PR #21's unchanged candidate head, with **no source edits yet**. Local execution recommended DeepSeek/OpenCode, capacity **UNKNOWN**, with independent Codex/Claude-class review. No local worker has been dispatched by the GitHub task write. Preserve one writer per code lane and record all routed attempts and verification facts in Runtime or an append-only ledger.

**Stop:** Do not merge PR #21, mark production verified, enable synthetic continuation, rewrite history or modify upstream engine without distinct authority. After repair acceptance, request a **separate user merge decision**. If the user instead expressly accepts P2 as a known limitation, record that decision and the exact risk before any merge action.

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

Prefer **DeepSeek/OpenCode** for coordination, reconnaissance, routine bounded implementation and tests; route difficult security, concurrency, integration and independent review to available **Codex/Claude-class** models. Preserve actual provider/model, rejected options, route origin, attempt, cost (when measured), child completion/wake and verification in Project Runtime if exposed; otherwise the task's **append-only GitHub routing ledger**.

Routine blocker policy: two distinct evidence-backed low-cost attempts before escalation; stronger model up to two additional attempts, max four real solution attempts, unless new evidence/new authorization. **Hard authority/security stops remain immediate.** One writer per overlapping code lane; separate isolated worktrees. Worker and reviewer claims alone are not verification.

The previous T3 local hosts reported that Project Runtime task/receipt tools were **not exposed** for overnight coordination, so branch-local ledgers are the authoritative *fallback* for those lanes. Browser manager has GitHub repository access, **not a live local T3 worktree or a verified automatic worker bridge**. No worker is presently known to be running as a result of this manager update.

**Local resource note:** Previous worker reported 48 GB free on root and 92 GB free on `/media/jer/Files` at its last check; other older reports showed a full root volume. Confirm with fresh `df -h` before heavy operations; avoid destructive worktree/cache cleanup.

## Pending gates and required user decisions

| Gate | Current category | Next authority/action |
| --- | --- | --- |
| PR #21 V1, V2 and V4 | `WORKER-REPORTED PASS`; browser manager has not retrieved local evidence files | Preserve/publish sanitized receipts; avoid claiming hosted CI |
| PR #21 Evidence V0 partial-pruning completeness | **`IMPLEMENTATION DEFECT / UPSTREAM COMPATIBILITY` (P2)** | Run narrow repair in isolated branch, red/green fixture, independent review |
| PR #21 upstream baseline | `REVIEW FINDING`: release-prep parent 25 commits past tag | Correct provenance wording; test on exact candidate, not assumed exact-tag head |
| Hosted CI | `OPERATIONAL LIMITATION`: zero hosted checks | Rely on explicitly labeled local evidence, not a fictional hosted CI pass |
| Merge PR #21 to fork main | **`PRODUCT DECISION` / not authorized** | Ask user after P2 repair acceptance, or explicitly accept known limitation |
| Continuation shipping exclusion (D2) | `DEFERRED` release gate | Design/verify before public shipping |
| Strict production continuation cancellation (D4) | `PRODUCT DECISION / REVIEW REQUIRED` | Separate architecture review; no upstream engine change yet |
| Experimental gate integration | `NOT INTEGRATED` | Keep separate; later new gate-on-reconciled-base verification and approval |
| Documentation V1 final qualification | `DEFERRED` pending golden path | Restore qualification separately after reconciliation |

## Next manager loop

1. Read the updated [Overall Manager handoff](OVERALL_MANAGER_HANDOFF.md), this Current State, Coordination protocol and the bounded P2 repair packet.
2. Refresh PR #21/fork-main/upstream heads and any live Runtime tasks/worktree ownership; no user-approved merge exists.
3. Use the prepared P2 repair task on a **real local T3 host** with a fresh worktree and one writer; writing a GitHub packet does not start a worker.
4. Review exact red/green pruning fixtures, no-prune and unrelated-thread cases, local gate receipts and independent reviewer findings. Preserve the repair branch and fix normal issues without weakening tests.
5. Update canonical state and the GitHub/Runtime ledger after acceptance. **Only then request an explicit separate merge decision**, unless the user first chooses to accept the P2 limitation knowingly.

**Hard stops:** no merge, release, production continuation, destructive Git operation, material paid use, or substantive upstream engine redesign without distinct authority.
