# D4 — Proposed durable-run-creation revocation contract (browser source review)

**Date:** 2026-11-05.  
**Status:** **HISTORICAL RESEARCH / SUPERSEDED BY [ACCEPTED D4 A+B CONTRACT](d4-accepted-revocation-contract-20261105.md) on 2026-11-05.** The options and unchosen alternatives below remain reference material; do not treat old undecided language as current authority. D4 implementation is still NOT RUN / NOT INTEGRATED.  
**Purpose:** advance the already-accepted D4 *requirement*, not silently choose a material orchestration/transaction architecture.  
**Governing:** [accepted staged continuation safety spec](continuation-staged-safety-governing-spec-20261104.md), [prior T4 design research](https://github.com/jermur788/t3code/blob/experiment/continuation-default-off-gate-20261104/docs/orchestration-v2/staged-continuation-t4-strict-revocation-and-shipping-20261104.md), and [Current State](../../01_CURRENT_STATE.md).

## Confirmed repository facts (browser code inspection)

1. Fork `main` and [PR #21](https://github.com/jermur788/t3code/pull/21) were re-fetched; main is `fb67545d790c5c001e8f85827f219ab6493c435e` (merged reconciliation). Experimental continuation is **not** in main. Isolated `experiment/continuation-default-off-gate-20261104` at `b3b8da54e0b8b184a1cf4e667d53e73e04f85074` has diverged: GitHub comparison with current fork main returned **34 ahead / 336 behind** (different histories; **not** an estimate of cherry-pick effort). Isolate integration and do not fast-forward or merge it directly.
2. Current upstream `pingdotgg/t3code` `main` at `337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17` was **50 commits ahead** of incorporated upstream release-preparation parent `bb4afa5425c52104a9261fa2d022cb8ba2fcc099` as fetched 2026-11-05. GitHub compare file list limited to its first 300 paths; these include provider adapters, Orchestrator, projections, MCP and persistence. This is **forward-compatibility review input, not an upstream update**.
3. The current fork and current upstream have **identical blob contents** for `apps/server/src/orchestration-v2/EventSink.ts` and `ThreadLaunchService.ts` at this inspection (GitHub blob SHAs equal across both). ProviderTurnStartService differs between fork/upstream. Recheck on an actual local worktree before implementation.
4. `ThreadLaunchService.launch` creates/claims a thread, then dispatches `message.dispatch` as the initial message (`ThreadLaunchService.ts` near 835–1028), and obtains its run from the returned `run.created` event. A thread shell can therefore exist even if run creation is subsequently rejected; this is an expected reconcile/cleanup state, **not** proof of an executed provider turn.
5. `Orchestrator.ts` dispatches `message.dispatch` and emits `run.created` plus possibly a `provider-turn.start` effect (near 6191 / 6620–6699; other paths may emit runs too). `Orchestrator.ts` around 13685 passes planned events and effects to `EventSink.commitCommand`.
6. `EventSink.commitCommand` around 635–711 reserves a command receipt, appends events, applies projections and enqueues effects via a **single `sql.withTransaction`** through `commitThenPublish` (around 259–283). It **currently has no continuation authorization guard**. A pre-commit orchestration planning check cannot by itself close a revocation race.
7. In the isolated experiment, `RuntimeTaskExecutionService.launchAttempt` around 715–781 re-reads a continuation's operator authorization and checks the default-off gate **before** calling `runLaunch`. It explicitly records a remaining gap between receipt insert/last check and the external launch. The revision-CAS source operator update uses `project_runtime_tasks` and `sql.withTransaction`; `ProjectRuntimeService.ts` near 666–719 notes `BEGIN IMMEDIATE` around a conditional revision update. The SQL services appear to use the same V2 store in the application, but **proving connection/database identity and cross-process transaction serialization in the actual runtime is a mandatory implementation precondition**, not yet an independent runtime PASS.
8. Current experimental shared `packages/contracts/src/projectRuntime.ts` adds `ProjectRuntimeContinuationPolicy` and optional `continuation` on task read/create/update types; MCP project task tools reuse contracts through `runtimeTools.ts`. This can increase **advertised** schemas even when continuation is disabled at runtime. D2 needs built-artifact validation, not source-only grep.

## Proposed precise D4 invariant / linearization

**Proposal B (preferred for product sign-off):** `launch` for the D4 invariant means **durable commit of a new `run.created` orchestration event**, not insertion of a Runtime attempt receipt and not a provider subprocess's `startTurn` callback.

> If revocation of a particular operator-authorized continuation is durably committed before the transaction that would create a new continuation run, **that transaction must not commit a new `run.created` event or associated `provider-turn.start` effect**. This must hold across retries/replay/restart/concurrent writers.

Use **existing task revision and explicit scope** as the initial guard source. Bind to project ID, exact source task ID, expected accepted task revision, continuation mode/authorization marker and any necessary target/attempt/request identity; do not infer authority from a worker, handoff, prompt, request key alone or a role string.

A private server-issued guard context is carried down the host's specific continuation dispatch path, not exposed as an agent-writable MCP/RPC contract. **Guard MUST be evaluated while holding the very transaction/write serialization that commits `run.created` and the outbox effect**. Denial must be typed and fail-closed with no new run/event/effect; any command receipt/retry behavior must stay internally consistent and idempotent. Recovery must mark the Runtime attempt cancelled or `reconcile_required` depending on observed thread/run uncertainty. Do not leak sensitive authorization details in errors or logs.

**Generic upstream-friendly boundary:** Evaluate a narrow internal `runCreateAuthorization` / `commitGuard` abstraction where `Orchestrator` sends events/effects to `EventSink`, rather than teaching upstream command planning about Project Runtime tables. Implement the fork-specific predicate in a separate injected service/adapter if possible. A proposed API/name is **not** an approved extension; review local types, command provenance, and any other run-creation paths before choosing an actual interface. Reject a design that merely adds one more check in `RuntimeTaskExecutionService.launchAttempt` or provider `startTurn`; that remains susceptible to check-to-commit races.

## Ordering and in-flight scope (separate product contract)

| Ordering | Proposed outcome |
| --- | --- |
| Revocation commits before new guarded run transaction | Run creation denied; no `run.created`/start effect. Receipt reconciled. |
| New run commits before revocation commits | Run was already created; it is **in-flight/existing** for D4. Whether to stop it is a separate policy. |
| Receipt created before revocation but run not yet created | Deny run on replay; safely cancel/reconcile receipt. |
| Same key replay after originally accepted run | Return/locate original durable outcome only; **never create a second run** or re-launch after revocation. |
| Different project or normal user-initiated run | Remains unaffected; no implicit cross-project auth or denial. |
| Work already queued in effect outbox | Secondary best-effort check before provider start can narrow exposure, but cannot atomically guarantee external provider calls. |

**Not yet decided:** if a provider has not started when authorization is revoked **after** run creation, should we attempt to cancel that pending outbox effect, or allow it to become in-flight? Preferred defense-in-depth is to cancel where provably unstarted and reconcile uncertain cases, **without claiming atomic provider-start revocation**. The exact user-visible status and in-flight stop contract need separate product sign-off. This is distinct from the narrow no-*new-run* guarantee above.

**Alternate proposal C:** define launch as external `startTurn` invocation. A database transaction cannot atomically bracket an external provider call. This demands a different, stronger distributed/process coordination contract and explicit failure semantics. **Do not claim B solves C.**

**Alternate proposal D:** add an authorization-epoch table. This adds new authoritative state and migrations; **no approval exists**. Use only if the revision-based predicate is shown insufficient after source/runtime review, and request a separate architecture decision.

## Preconditions before any writable implementation

1. Inspect actual fork `main`, experimental branch, origin upstream current head, worktrees, uncommitted changes, and one-writer ownership. **No local main write, no destructive Git, no merge, no paid provider calls.**
2. Prove task revocation updates and event sink commit use the **same transactional database and writer-ordering semantics** in the relevant single/multi-process runtime. If not, **REVIEW REQUIRED**; do not silently assume atomicity.
3. Identify **every** `run.created` path and why it may/may not be used by continuation, including queued/steered messages, recovery and delegated paths. Instrument guard only when a signed/private internal continuation launch context is present, not for regular user traffic.
4. Define denial/receipt replay semantics so no command can appear accepted if its run/event was not committed; test restart from each checkpoint.
5. Upstream compatibility assessment: compare generic extension-point size with alternative existing abstractions; design so a future upstream fast-forward need not fork substantial internals. No upstream PR/post unless authorized.

## Acceptance/verification matrix (proposal; worker must derive exact tests from final accepted spec)

- Revocation-before-run barrier **fails closed**; no run event, no provider-start outbox effect, no provider process start; Runtime attempt terminal `cancelled` or `reconcile_required` as evidenced.
- Run-before-revocation preserves exactly one accepted run; no duplicate/replayed run after restart; in-flight behavior is explicitly recorded without overstating stop semantics.
- Concurrent callers on separate SQLite connections and two server processes where practical; same project and cross-project isolation; stale expected revision, malformed/missing guard, wrong actor, removed policy, gate-off, cancelled/blocked source task.
- Replayed pending receipt after process restart and after history pruning; no invented success; old receipts/idempotency correct.
- Normal user-created threads and non-continuation Runtime task execution unchanged; provider-neutral stubs for two providers when available.
- Typecheck and focused tests, changed-file checks, MCP `tools/list` unchanged for ordinary shipping baseline, web build where touched; rendered UI only if interface changes. **Run raw tests on accepted implementation worktree; browser source inspection alone is not runtime verification.**
- Independent read-only review of concurrency, security boundary, upstream compatibility and tests by a different provider/model. Use precise `IMPLEMENTED / STATIC PASS / RUNTIME PASS / REVIEW PASS / INTEGRATED / VERIFIED` labels only when actual evidence warrants.

## Decisions required from product owner

1. **Choose D4 linearization contract:** `run.created` durable commit (proposal B, recommended) or external provider start (proposal C, materially different).
2. Decide in-flight policy after a run has committed but provider has not started (best-effort cancel/reconcile versus stronger requirement).
3. Only if necessary: authorize a new authority/epoch table or an upstream-engine extension larger than the proposed generic guard.
4. Later: separate fork-main merge, production enablement and public release decisions.

**Historical note:** The owner subsequently **ACCEPTED A+B** in [the governing D4 contract](d4-accepted-revocation-contract-20261105.md). That document governs. This older proposal does not authorize new authority tables, external-start atomicity, production release or main integration.

## 2026-11-05 three-lane qualification return — critical `defer_start` correction

**Status:** `SCOPE-BOUNDED FEASIBILITY PASS (worker-reported) / independent REVIEW PASS WITH FINDINGS (recorded)`; D4 remains **PROPOSED / NOT IMPLEMENTED**. See [manager reconciliation](manager-stage2-three-lane-return-reconciliation-20261105.md).

- Lane A proved a test/fixture transaction guard can prevent a new run when a revocation commits first, on the same SQLite file/inode across separate processes, with **0/0/0** runs/start effects/receipts in guarded scenario versus **1/1/1** unguarded. Red-before test intentionally exited 1 and barrier schedule passed 16/16. **This was not a full server installation of a real operator revocation or a permanent engine guard.**
- The real `ThreadLaunchService` initial message uses `dispatchMode: defer_start`; new run is persisted in `preparing` with **NO initial `provider-turn.start` outbox effect**. The effect is created later through `prepared-run.release`. The prior illustrative assumption of an initial pending start effect was **fixture-only and incorrect for this path**. This distinction is material to D4: guard run creation, then separately define and test **whether release of an already-created but not-started run may occur after revocation**.
- Full `server.ts` root integration, operator `continuation:null` revision CAS, provenance/unforgeability of the private guard, typed denial, crash/pruning behavior and provider-start race remain unproven. Do not classify as `D4 VERIFIED`.
- **Recommended two-part contract for owner approval:** (1) no **new durable `run.created`** commit after revocation commits; (2) for already-created `preparing` runs, attempt to deny or cancel `prepared-run.release` and provider start if no execution has begun, and conservatively mark uncertain cases for reconciliation. Existing already-started runs require separate stop semantics. Part (2) must not be mislabelled as an atomic cross-process provider-call guarantee unless a stronger mechanism is explicitly designed/tested.
- A future guarded implementation must test revocation **between run creation and release**, plus release/replay/stop concurrency and idempotent receipts. Avoid either omitting late-start policy or silently broadening D4 to a stronger external-start linearization without user consent.

**This note refines but does not adopt the product choices below.** No code work, merge or production authorization was given by the three-lane read-only return.

