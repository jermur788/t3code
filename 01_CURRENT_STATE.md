# T3 Fork — Current State and Roadmap

**Updated:** 2026-11-04, after the 08:37 Europe/Dublin Overall Manager transfer request.  
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

## Current milestone — pre-merge verification for PR #21

**State:** `IMPLEMENTED` reconciled branch; worker-reported `STATIC PASS / RUNTIME PASS` for bounded suites; independent Codex and manager source-level `REVIEW PASS` for conflict resolutions; `NOT INTEGRATED`; **required verification remains**.

**Local worker evidence, documented in [routing/conflict ledger](https://github.com/jermur788/t3code/blob/integration/fork-upstream-reconciliation-trial-20261104/docs/orchestration-v2/fork-upstream-reconciliation-routing-ledger-20261104.md):**

- Seven conflicts: `OrchestratorMcpService.ts`, `linkOrigin.test.ts`, `PeerForwarding.test.ts`, `GrokAdapterV2.test.ts`, `runtimeLayer.test.ts`, regenerated `routeTree.gen.ts`, `usageLimits.ts`.
- Preserved upstream project-scoped provider enablement, fork eligibility/capacity semantics, both test layer provisions, both routes, upstream effect service changes and fork Evidence V0 wiring.
- Web build passed (7,430 modules), repo typecheck passed (40 packages), `vp run check:changed upstream/main` passed (2,072 tests across 81 files plus other gates), context-budget test passed.
- Reconciled MCP tool-list snapshot **58,519 bytes**, no new increase from this merge.
- Independent Codex reviewer returned `CLEAN`; Overall Manager inspected GitHub source, merge ancestry, branch and PR. **Manager did not rerun local tests.**
- At last manager check PR #21 had **no hosted GitHub checks**. Absence is not CI PASS. The PR's very large changed-file count reflects upstream merge history, not 29,000 independently inspected manual changes.
- Current upstream moved one commit after the pinned v0.1.7 baseline as of last check. Never claim the PR is rebased against *latest upstream main*.

**Exact next authorized task:** [V1–V5 pre-merge verification packet](docs/orchestration-v2/task-verify-reconciled-v017-before-main-20261104.md), performed in a **fresh isolated external-volume worktree** without merging/rewriting the accepted branch:
1. **V1 UI**: inspect rendered `/_chat/home` and `/threads/$environmentId/$threadId` routes and console/navigation using a browser; retain screenshot/test evidence. Build-only is insufficient.
2. **V2 persistence/recovery**: run file-backed SQLite restart/recovery, idempotency and **two-project isolation** scenarios on the reconciled code with stub providers, noting updated upstream V2 internals.
3. **V3 Evidence V0**: qualify export/reconstruction after upstream history pruning; record expected fail-closed cases.
4. **V4 checks**: affected suites/typecheck/`check:changed upstream/main`/context-budget on the actual verified branch; distinguish local from hosted CI evidence.
5. **V5 independent review**: reconcile results with spec and Git truth; return a complete durable manager handoff.

**No new user decision is needed to run this bounded verification.** If real defects require source changes, create an isolated one-writer repair lane and re-review. A **separate user approval is required before merging PR #21**.

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
| PR #21 rendered UI, restart, cross-project and Evidence V0 qualification | `VERIFICATION FAILURE` **not asserted**; `REVIEW REQUIRED` / **NOT RUN** | Run already-authorized V1–V5 packet; repair ordinary issues with evidence |
| PR #21 hosted CI | `OPERATIONAL BLOCKER` / no GitHub checks observed | Inspect checks after new run or rely on documented local evidence without claiming hosted pass |
| Merge PR #21 to fork main | `PRODUCT DECISION` / **not authorized** | Ask user only after required acceptance |
| Continuation shipping exclusion (D2) | `DEFERRED` release gate | Design and verify on future shipping base |
| Strict production continuation cancellation (D4) | `PRODUCT DECISION / REVIEW REQUIRED` | Decide run-creation vs provider-start semantics after architecture review; no upstream engine change yet |
| Experimental gate integration | `NOT INTEGRATED` | Keep separate; later new gate-on-reconciled-base verification and approval |
| Documentation V1 final qualification | `DEFERRED` pending golden path | Restore verification after reconciliation when safe |

## Next manager loop (do not ask user to repeat prior decisions)

1. Read [Overall Manager handoff](OVERALL_MANAGER_HANDOFF.md), this Current State, [Coordination protocol](02_COORDINATION_HANDOFF_PROTOCOL.md), active specs and latest relevant ledger/branch truth.
2. Verify PR #21 source/base, fork main and current upstream heads; check for new hosted checks/PR review, but **do not merge**.
3. Dispatch/explain existing [pre-main verification packet](docs/orchestration-v2/task-verify-reconciled-v017-before-main-20261104.md) to a **real T3 local host**, if one is available; never claim dispatch based solely on a written handoff.
4. Inspect returned evidence; classify failures, repair ordinary defects in isolated branch, rerun/re-review.
5. Update this file, active Runtime/ledger and manager handoff after any transition; ask user for merge authority only when the required gate is met.

**Stop:** no main merge, public release, production continuation, irreversible Git operation, material paid use or material upstream orchestration-engine redesign without distinct authority.
