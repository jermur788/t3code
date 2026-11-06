# D4 — Accepted execution revocation contract (A + B)

**Authority:** User explicitly agreed to Overall Manager's recommended **A + B** on 2026-11-05 at 14:10 UTC, following the plain-English explanation and the three-lane qualification review.  
**Status:** **A+B ACCEPTED / ORIGINAL ISOLATED D4 K1/K2 FULL-ROOT PASS / NEW U-DERIVED R RE-LAND K1/K2 8/8 PASS (worker-reported) AND DIFFERENT-PROVIDER CODEX REVIEW PASS WITH FINDINGS / H BOUNDED K3 RECOVERY PASS (tests/fixtures only) / EXTERNAL PROVIDER START/PRODUCTION PARTIAL / NOT INTEGRATED / NOT PRODUCTION VERIFIED**. Contract unchanged. [Latest U/R/H manager reconciliation](manager-overnight-urh-final-reconciliation-20261106.md).
**Scope:** Project Runtime operator-authorized **synthetic continuation**, currently isolated on the default-off experimental branch. Not a grant of autonomous authority to agents; no main merge, upstream catch-up, provider-production testing, release or material paid spend.  
**Companion:** [staged safety governing spec](continuation-staged-safety-governing-spec-20261104.md) (D1–D5), [Stage 2 verification](manager-stage2-three-lane-return-reconciliation-20261105.md), [historical design alternatives](d4-transactional-revocation-proposed-contract-20261105.md), [Current State](../../01_CURRENT_STATE.md).

## 1. Binding acceptance rules

### A. Strict no-new-run after durable operator revocation

**Linearization point:** durable transaction commit that creates a **new** continuation `run.created` event in T3's authoritative orchestration event store. Revocation means the authorized operator's removal/invalidation of the source continuation policy (`continuation: null` or otherwise invalidating the exact authorized revision) is **durably committed first**.

**Rule:** If revocation commits before the would-be continuation run-creation transaction, that transaction **MUST NOT** commit `run.created`, a start effect, or a falsely successful command receipt under the revoked authorization. This must hold for concurrent writers, retries, delayed launch, replay and server restart. A task/attempt receipt reserved earlier than revocation is *not* permission to create a run afterward.

The guard must be bound to **project ID, exact source task authorization identity/revision**, and an internally trusted continuation launch provenance; include target/attempt/request identity where necessary for idempotency. A worker/agent/MCP request key, a handoff, prompt, route, or a thread's `createdBy` alone **MUST NOT** mint authority. Denial is deterministic and fail-closed without a new run; produce typed, inspectable reason/status without exposing private policy data.

**Implementation preference, not an unreviewed API mandate:** use a narrow upstream-friendly **private transaction-time guard** at the orchestration command/event commit boundary, leaving normal user dispatch unchanged and avoiding a new authority table where existing task revision plus same-DB write ordering is sufficient. Any significant upstream engine contract expansion, added durable authority table/epoch, or failure to prove shared SQLite transaction semantics is **REVIEW REQUIRED** rather than permission to improvise.

### B. Prepared but not started after revocation

**Observed actual path:** `ThreadLaunchService.launch` invokes `message.dispatch` with `dispatchMode: defer_start`. That path creates a durable `preparing` run **without** `provider-turn.start`; a later `prepared-run.release` can enqueue start work. The earlier fixture's initial pending start effect was not the real lifecycle.

**Rule:** If revocation is already committed and the system can reliably establish that the run **has not begun execution**, T3 **MUST block its pending release/start and must not deliberately enqueue a new provider-start effect** under that revoked continuation authorization. Cancel unsettled effects where this can be established safely. For any ambiguous in-progress release/worker/provider start, classify `reconcile_required`, retain durable provenance, and attempt safe best-effort cancellation/stop; do not silently mark it cancelled or successful. The feature remains default-off outside an authorized experiment.

**Scope boundary:** The user **did not require a globally atomic guarantee over an external provider's `startTurn` call**, and did not require an immediate/guaranteed stop of an already-running provider. For work already executing when revoked, request stop/cancellation where supported and record whether it was acknowledged; reconcile uncertain cases. Do **not** claim transactional external-provider cancellation based only on SQLite checks. If later product requirements demand stricter external-start linearization, return for a **new architecture decision**.

### C. Nonnegotiable data/operation constraints

- **Only an operator** may grant, modify, or revoke continuation authorization. Agents/providers cannot re-grant it via task input, MCP, prompt, route or hidden schema.
- Authorization is **project-scoped**; wrong-project/task/source/revision contexts must fail closed. Preserve accepted task CAS revisions, immutable attempt/receipt provenance, and idempotency.
- Distinguish `pending` (Runtime attempt), `preparing` (durable run), `provider-start effect queued/claimed`, and `running` (provider accepted); never collapse them to one launch state.
- A pre-revocation committed run may still exist on replay. Returning its prior durable receipt is not **new run creation**; however, replay after revocation may **not** create a new run, enqueue a fresh start for a provably unstarted run, or resurrect cancelled effects.
- Gate disabled/authorization removed must not affect **normal user-created runs or non-continuation Project Runtime execution**, nor degrade existing service-level project isolation, Evidence V0, handoff or routing contracts.
- Respect D2: **no experimental continuation input/output field or budget increase** in public shipping agent-facing MCP schemas unless separately accepted. The present default-off gate is insufficient to hide it.
- Preserve server-owned Runtime/orchestration state; no chat, hidden worker reasoning or dashboard copy becomes the authoritative revocation ledger.

## 2. Ordering/acceptance examples

| Scenario | Accepted behavior |
| --- | --- |
| Revocation durable before new run commit | Deny new continuation `run.created`, deny start effect, no accepted-success receipt; preserve attempt as cancelled or reconcile-required by known shell/run state |
| New run commit wins before revocation | Run exists exactly once; separate B gate applies if still `preparing`; no duplicate via replay |
| Revocation between `run.created` and `prepared-run.release` | If definitely not executing, prevent release/start; record cancellation and retain provenance |
| `prepared-run.release` raced against revocation or external provider start | Inspect durable effect/provider evidence; stop if safe, otherwise mark `reconcile_required`, no invented cancellation guarantee |
| Pre-revoke attempt receipt replay after restart | Re-check operator authority before **any new run**, fail closed if revoked; do not reissue new start work; preserve historical receipt |
| Independent project / ordinary user run | No D4 restriction accidentally inherited |
| Concurrent policy edits or stale revision | CAS conflict or fail-closed authorization result, never an automatic re-grant |
| Crash, lost client, incomplete/pruned history | Conservatively reconcile; never fabricate a past run or successful stop |

## 3. Implementation/verification contract (not yet executed)

The implementation must operate on an **isolated owned worktree** after exact-base/status review and should be designed as a small generic T3 extension. The experimental continuation remains outside fork `main`. The Stage 2 subset demonstrated same-file/inode SQLite writer ordering and a fixture guard, **not** full server-root `continuation:null` handling or a finished D4 code path.

**Required checks before any D4 PASS:**

1. Inspect full server dependency graph, real operator revoke update and exact `BEGIN IMMEDIATE` transaction/DB identity. Show that authorization check and event/effect/receipt commit share required serialization **in actual server assembly**, not merely an isolated subset.
2. Inventory every continuation-reachable `run.created` path (three currently direct emitters), `prepared-run.release` paths and provider-start effect/recovery path; prove internal provenance cannot be forged from public/MCP commands.
3. Deterministically test both transaction orderings across separate SQL connections/processes; revocation between run creation and release; effect claimed/start uncertainty; same-key replay and startup reconciliation, crash/pruning, concurrent operator task revisions and cross-project/task isolation.
4. Verify fail-closed guard denial returns a typed outcome and **no false accepted receipt**; normal user launches, default-off gate, D2 schema exclusion, and other Project Runtime V1 behavior remain unchanged.
5. Run fresh focused tests, full relevant typecheck/changed checks and real local stub/no-cost server integration where possible. Independent read-only concurrency/security and upstream compatibility review by a **different provider/model**, then repair and re-review.
6. Preserve accepted statuses: `IMPLEMENTED`, `STATIC PASS`, `RUNTIME PASS`, `REVIEW PASS`, `INTEGRATED`, `VERIFIED` only where evidenced. No production/published/release PASS from mock/fixture tests.

**Stop/decision gate:** Stop for inability to establish transaction atomicity, unavoidable public/protocol expansion, significant upstream engine rewrite, new authority/epoch database, cross-process distributed locks, an externally atomic provider-start promise, or conflict with D2/upstream main. Report options; do not silently weaken A/B. A future merge/main integration, upstream sync, production enablement, material spend, public PR/release or destructive Git operation all require their own authorization.

## 4. Current accepted acceptance position after 2026-11-05 21:43Z return

**A+B product contract remains ACCEPTED without revision.** The isolated local D4 implementation's **K1 real production-root transaction ordering and K2 natural async preparation/release denial are now RUNTIME PASS (worker-reported; independently re-run)** per [manager reconciliation](manager-d4-full-root-k1-k2-verification-reconciliation-20261105.md). Worker reported 5/5 full assembly tests and reviewer reran 5/5 plus 94/94 focused; K3 extra tests are **PARTIAL** for process crash/restart/pruning and provider-portable stub/adapter coverage. No externally atomic provider-start guarantee is asserted or required by A+B. The local implementation branch remains unpushed/unobservable to this browser. **Not integrated, not production verified** and D2 experimental agent MCP schema exposure remains a separate public shipping blocker.

**Original [isolated implementation packet](task-stage2-d4-isolated-implementation-20261105.md) and [full-server assembly verification packet](task-d4-full-server-assembly-verification-20261105.md) are COMPLETED, not pending.** No more local work is authorized from them. Future upstream catch-up, safe continuation re-land, D2 shipping schema exclusion, fork-main merge and release each require their own scoped authority and verification. The original acceptance checklist remains binding for those later integration/release contexts; K3 partial must not be silently promoted to VERIFIED.

## 2026-11-06 11:47 — post-reland evidence / contract remains unchanged

The overnight isolated R implementation re-applied minimum default-off continuation+D4 A+B on accepted U candidate. Per returned worker/reviewer evidence, **K1/K2 8/8 real-root**; a genuinely different-provider **Codex SOL Medium READ-ONLY review** reran 8/8 plus 199 focused/7 budget checks and returned **PASS WITH FINDINGS, no blocker/major**. H's later **tests-only** qualification covers disposable process restart/SIGKILL/reopen, genuine pruning/truncation, idempotent replay, default-off and two adapter-independent provider stubs, with independent review PASS. This does **not** establish externally atomic provider `startTurn` or production/live-provider crash behavior; that is explicitly outside A+B and remains a separate release qualification decision. [Final manager result](manager-overnight-urh-final-reconciliation-20261106.md). No fork-main merge, public push/PR, default-on enablement or deployment. **The user-accepted A+B product contract is not amended.**
