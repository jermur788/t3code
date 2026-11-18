# Overall Manager reconciliation — Stage 2 three read-only qualification lanes

**Received:** 2026-11-05 13:50Z, user-supplied completed DeepSeek/T3 Code handoff.  
**Manager review:** browser source and live GitHub comparison performed on 2026-11-05. **Raw host-local evidence not available to browser manager**. Worker consolidated handoff reportedly at a restricted local `/home/jer/dev/stage2/ledger/HANDOFF-STAGE2-THREE-LANES-20261105.md`. No remote copy was inspected or published.  
**Verdict:** `STAGE 2 READ-ONLY QUALIFICATION RETURNED`. Lane A `SCOPE-BOUNDED FEASIBILITY PASS (worker-reported)`; Lane B `SCOPED BUILT/TRANSPORT SCHEMA AUDIT PASS (worker-reported; NOT PACKAGED SHIPPING VERIFIED)`; Lane C `READ-ONLY RECONCILIATION PREVIEW COMPLETE (worker-reported)`. Each lane's independent review: **PASS WITH FINDINGS (worker-recorded)**, follow-up corrections applied. **Not D4 implemented; not D2 shipping verified; no source integration or production claim.**

## Live base / provenance

- [PR #21](https://github.com/jermur788/t3code/pull/21) remains integrated in fork `main` at `fb67545d790c5c001e8f85827f219ab6493c435e`, independently re-fetched by browser manager.
- Isolated `experiment/continuation-default-off-gate-20261104` remains at `b3b8da54e0b8b184a1cf4e667d53e73e04f85074`, 34 ahead/336 behind fork main, merge-base reported by local worker to be pre-merge fork main. No continuation integration.
- Upstream `pingdotgg/t3code` `main` remains `337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17`, 50 commits ahead of incorporated upstream parent, independently checked through GitHub. The worker refreshed a stale remote-tracking upstream ref **without moving local main**.
- Worker reports clean primary checkout on feature/development-profiles branch; separate owned worktrees/lane artifacts left available for inspection. No commit, source edit, main ref movement, Git branch push, merge, public release, feature enablement, paid provider call, cleanup or evidence publication.
- Source references inspected in browser: `apps/server/src/orchestration-v2/Orchestrator.ts` has three direct `run.created` emitters around lines 6191, 6620, 7587; `ThreadLaunchService.ts` near 998 uses `dispatchMode: defer_start`, with initial run event near 1018; `EventSink.ts` near 635–711 commits events and effect outbox in a SQL transaction. This **corroborates the source paths**, but not the local process-level test output.

## Lane A — D4 DB/launch feasibility

**Worker-reported scope-bounded pass:**
- `packages/shared/src/nodeSqliteClient.ts` around 1251 uses `BEGIN IMMEDIATE`; `EventSink.ts` around 635 is the event-command transaction. Tested service subset on a **same file path and inode across separate processes**.
- A **test guard/fixture** with revocation committed first returned **0 new runs, 0 start effects, 0 receipts**; unguarded baseline produced **1/1/1**; replay did not duplicate. `red-before.mjs` intentionally exited 1 when the race reproduced; 16/16 barrier cases exited 0. This is evidence of feasibility, **not proof of an integrated run-create authorization hook** or the final denial behavior.
- **Crucial correction to browser proposal:** real initial `ThreadLaunchService` uses `defer_start`: commits a `preparing` run **with no `provider-turn.start` effect at initial creation**. A later `prepared-run.release` enqueues the start effect. The earlier pending start effect example was a fixture, **not a faithful full start lifecycle**. Therefore even strict guard on initial `run.created` does not automatically control a later prepared-run release after revocation.
- **Not proven:** full `server.ts` dependency/layer/root path, real `continuation:null` operator revoke transaction, typed auth-denial/receipt propagation, internal guard provenance and unforgeability, SIGKILL/crash/pruning/restart end-to-end, and packaged production provider-start behavior.

**Manager disposition:** `D4 TRANSACTION FEASIBILITY PASS (worker-reported; subset only)`. Primary no-*new-run* boundary remains **PROPOSED**. Need a user-accepted contract for both (a) durable new-run commit and (b) pre-provider-start behavior of already-created `preparing` runs; do not silently infer strict stop from run commit alone. If no external `startTurn` guarantee is desired, still define a fail-closed best-effort cancellation/reconciliation policy before release. See [D4 proposal](d4-transactional-revocation-proposed-contract-20261105.md).

## Lane B — D2 MCP schema and byte budget

**Worker-reported audited source-loaded production transport with mocked services**, **not packaged release binary or paired-client full-server acceptance**:
- 79 tools enumerated in both trees; only **input schema** difference relevant to continuation is optional `continuation` on task create/update, reported +323 bytes / 18 property paths each. Four task tools gain +351 bytes of `outputSchema` apiece, **outside** the reported context-budget formula. Additional unrelated tool drift +12/+36/+84 bytes; avoid attributing all raw size change to continuation.
- Agent-context budget formula baseline **56,753 → 57,399 = +646 bytes**; committed budget **58,519 → 59,165**; raw transport JSON size **187,026 → 189,796**. Independent reviewer reportedly reproduced these numbers. The +646 finding is now a current **scoped measurement**, not only a stale historical snapshot.
- Current merged fork `main` advertises **no continuation field** in tested mocked/source-loaded transport; experiment advertises it **even while server continuation gate is off**. Browser manager independently re-inspected experimental shared task contracts with `continuation` and MCP project task tool inputs.
- **Not proven:** actual packaged public-release server, paired-client authenticated MCP enumeration, native/mobile schema, production provider handshake, final build budget or complete output-schema packaging.

**Manager disposition:** `D2 SCOPED SOURCE-LOADED MCP AUDIT PASS (worker-reported)`; **`D2 SHIPPING VERIFIED = FALSE`**. For a future public release require an actual shipping/packaged artifact's built `tools/list` and authorized paired-client or equivalent production-authenticated enumeration, plus schema/byte budget release test. The mock-backed source transport audit is sufficient for architectural risk identification, **not** for final release certification. **Strategy B** (omit operator-only continuation fields from relevant MCP projection schemas, preserving internal authority) is the preferred design **if integration is later approved**, but requires exact source/contract verification and acceptance; no implementation authorized.

## Lane C — merge/rebase preview

- Worker reports **50 upstream commits / 610 changed paths / additions 23,931, deletions 26,742**, and **30 experimental paths** (10 documentation, 12 tests, 8 source).
- Local read-only merge-tree dry runs: experiment → merged fork main **1 conflict**; fork main → newest upstream **2 conflicts**; experiment → current upstream **9 conflicts**. These are **dry-run path counts**, not a promise that an actual integration is trivial.
- Browser independently compared refs and source: current fork/upstream `EventSink.ts` and `ThreadLaunchService.ts` match; Orchestrator, ProviderTurnStart, MCP/SQLite/provider adapters have drift.
- Worker's recommendation: future **upstream catch-up first, then re-land continuation as fresh bounded changes**, rather than merging divergent experiment into main. This is a **proposed sequence**, not authority to merge or change refs.
- Gaps: full per-commit replay not simulated; open upstream PRs were not inventoried in original worker return.

**Manager supplementary browser search for OPEN upstream PR hotspots (non-exhaustive, and none are merged as of query):**
- [#30067 — asynchronous SQLite writer](https://github.com/pingdotgg/t3code/pull/30067): touches `nodeSqliteClient.ts`, persistence and foundational tests. **High relevance** to D4 transaction ordering; don't design on a future worker mechanism as though already integrated.
- [#18385 — cross-thread command receipt ID race](https://github.com/pingdotgg/t3code/pull/18385): touches `Orchestrator.ts` and receipt-race tests. **High relevance** to D4 replay/typed rejection.
- [#31466 — delegated child provider session release](https://github.com/pingdotgg/t3code/pull/31466): touches `Orchestrator`, EffectWorker/EffectOutbox and provider lifecycle. **Relevant** to in-flight provider-start/reconciliation.
- [#30864 — reader transaction round trips](https://github.com/pingdotgg/t3code/pull/30864): touches `nodeSqliteClient.ts`. **Medium** database concurrency relevance.
- [#31129 — scheduled task steer/restart modes](https://github.com/pingdotgg/t3code/pull/31129): changes ThreadManagement, scheduled task/MCP/contract and delivery modes. **Medium** path/provenance overlap, not same D4 operator continuation capability.
- [#31366 — scheduled task run failure outcome](https://github.com/pingdotgg/t3code/pull/31366): touches scheduled task, MCP tools/handlers and server. **Medium** task result provenance relevance.

These **OPEN PRs are upstream proposals**, not incorporated upstream code. Search is a **risk-oriented shortlist**, not complete inventory of every open PR.

**Manager disposition:** `PREVIEW COMPLETE (worker-reported) + OPEN PR HOTSPOT SCREEN (browser)`. No upstream catch-up or experimental re-land authorized. Exact latest refs/merge conflicts must be refreshed on any future writable worktree.

## Review / ledger / operational conditions

- Three local lanes reviewed **PASS WITH FINDINGS** with corrections reportedly applied; no browser access to original reviewer transcripts or host files. Worker reported all fetch/worktree/install commands exit 0, intentional red-before exit 1, barrier 16/16 PASS, wrong bearer 401, other probes exit 0. Do **not** misrepresent expected red-test failures as an implementation defect or elevate them to production PASS.
- **10 dispatches** across Codex and Sonnet workers/reviewers, no Opus, no quota error/failover, all remaining subscription allowance **UNKNOWN**. Some **Sonnet actual effort LOW despite MEDIUM requested**; persist actual instead of requested. DeepSeek remained orchestration-only.
- Worker reports `/media/jer/Files` mounted **read-only**, local root approximately **46 GB free** at report time and **four detached read-only lane worktrees still present**. This is a local operational state, not an instruction to remount, delete, prune or clean. No cleanup authorized; preserve until evidence/ownership confirmed and explicit non-destructive disposal scope is approved.

## Manager decisions vs product decisions

**Decisions the manager can make now without product architecture authority:**
- Accept **scope-limited research qualification** and close A/B/C read-only task packets as **completed** with detailed findings.
- Keep production/public shipping statuses `NOT VERIFIED`, keep continuation isolated, keep PR #21 evidence **PRIVATE**.
- Require packaged, real authorized MCP tool-list verification for release (mocked registry is sufficient for development risk finding only).
- Treat Strategy B as preferred *future* MCP schema projection approach, not an instruction to edit source now.
- Do **not** clean up worker worktrees or unmount read-only volume in this turn; they are retained as audit/debug assets. Do not repeat closed work.

**Owner product/architecture decisions still required before writable Stage 2 code:**
1. Is D4's primary ordering guarantee defined at **durable new `run.created` commit** (recommended) or at external provider turn start (stronger non-transactional semantics)?
2. For already-created `preparing` runs awaiting `prepared-run.release`, should revocation **deny release/start where provably unstarted and reconcile uncertain attempts** (recommended) or accept that an already-created run may still start? Define observable in-flight states and operator stop policy.
3. Separately authorize **upstream catch-up** and (later) **re-landing isolated continuation**, each with own exact source, owner, tests, review and merge decision. Browser manager recommends proposing upstream reconciliation first, but has not begun it.
4. User chooses whether shipping build uses excluded experiment-only branch or explicit build-selected agent projection if future integration occurs. Existing D2 excludes experimental schema from public shipping regardless.
5. Cleanup of detached local worktrees or remount/unmount operations requires verified ownership/evidence and explicit safe scope; no destructive action assumed.

**Next:** manager presents the two D4 contract choices for user acceptance. After accepted spec, prepare an isolated **one-writer D4 implementation packet**, independent review and targeted tests. No source edits or main merge until authorized. Upstream catch-up/re-land remain separately gated. See [Current State](../../01_CURRENT_STATE.md) and [Manager Handoff](../../OVERALL_MANAGER_HANDOFF.md).
