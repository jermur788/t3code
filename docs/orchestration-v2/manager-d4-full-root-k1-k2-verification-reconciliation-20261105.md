# Manager reconciliation — D4 A+B full-server K1/K2 qualification

**Received:** 2026-11-05 21:43 UTC user-supplied local worker handoff after the [bounded closure task](task-d4-full-server-assembly-verification-20261105.md).  
**Authority:** [user-accepted D4 A+B](d4-accepted-revocation-contract-20261105.md), [staged safety D1–D5](continuation-staged-safety-governing-spec-20261104.md).  
**Disposition:** **`K1 FULL-SERVER ASSEMBLY RUNTIME PASS (worker-reported; independent reviewer reran)` / `K2 NATURAL ASYNC RELEASE RUNTIME PASS (worker-reported; independent reviewer reran)` / `K3 PARTIAL` / `INDEPENDENT REVIEW PASS WITH FINDINGS` / `NOT INTEGRATED` / `NOT PRODUCTION VERIFIED`**. These are qualification statements **for the isolated local branch only**. Original private worker commands/logs and implementation source remain on local host and were not independently inspected from browser. The manager reviewed consistency with the accepted contract and the upstream/fork GitHub refs.

## Provenance and branch checkpoint

- Worker reports D4 worktree `/home/jer/dev/d4-ab-20261105`, branch `d4/ab-revocation-guard-20261105`, based on original unmerged continuation experiment `b3b8da54e0b8b184a1cf4e667d53e73e04f85074`; latest **local** D4 head `f68db477a053bfe0211c6d92bf116711c1d55371`, 12 commits, 15 files, +2359/−50, worktree clean and owned by original worker. It has **no tracking remote and was not pushed**; browser GitHub branch fetch returned NOT FOUND, consistent with this report. Manager does not claim to have read these new source files.
- GitHub fork `main` remains at merged PR #21 `fb67545d790c5c001e8f85827f219ab6493c435e`; old experimental continuation branch remains at `b3b8da54e0b8b184a1cf4e667d53e73e04f85074`. No fork main or experimental branch was changed by this local result.
- **Upstream drift newly measured by browser manager:** current `pingdotgg/t3code` `main` `25b53299b75d4d8d1d0667ad47e9cfed3749776e` is **41 commits newer** than the previous Stage 2 upstream snapshot `337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17`. GitHub compare reports **225 changed paths**, including `Orchestrator.ts`, `ProviderTurnStartService.ts`, `ThreadLaunchService.test.ts`, MCP and contracts. This is a **read-only drift assessment**, not authorization or completion of upstream catch-up.

## K1 — full real production server-root ordering (PASS within reported scope)

- Worker and independent reviewer separately ran `apps/server/src/projectRuntime/D4FullServerAssembly.test.ts` using **the actual exported `layerMakeServer` production-root composition**, which `runServer` launches, with `ServerConfig.layerTest` isolated temporary home paths; claimed no substitution of service under test. Actual installed/authenticated provider adapter dependencies existed, but adapter open-session calls were trapped and **0 live model turns occurred**.
- The actual server-root SQL identity was recorded: same normalized DB path/inode and shared `SqlClient` for Orchestrator/EventSink/ProjectRuntime; `PRAGMA database_list` consistent; a second real writer connection blocked until production writer rollback under `BEGIN IMMEDIATE`.
- Actual operator `ProjectRuntimeService.updateTask(continuation:null)` with `user:maintainer` durably incremented the source task revision, followed by internal `reconcileAttempt → advanceContinuation → ThreadLaunchService → Orchestrator → EventSink`.
- Revoke-first: **0 new runs, 0 `provider-turn.start` effects, no accepted run-creation receipt**, typed `EventSinkCommitDenied`, attempt cancelled, **0 adapter open-session calls**.
- Launch-first: **1 run / 1 start effect**; same-attempt replay returns byte-identical receipts and effects, including after revocation. Ordinary-user control still executes normally with ordinary authority despite revoked continuation source, preserving isolation.
- Manager classification: **K1 `FULL-SERVER ASSEMBLY RUNTIME PASS` (worker-reported, independently rerun)**, not a production deployed/service-auth result. No independent browser copy of test logs.

## K2 — natural asynchronous prepared-release/stop (PASS within reported scope)

- Actual `ThreadLaunchService.schedulePreparation` was barrier-held at `prepared-run.release` while a real run was `preparing` and no start effect existed. Real operator revocation committed through Runtime, then release proceeded.
- After denial: run, orchestration attempt and Runtime attempt all **cancelled**; **0** start effects, **0** adapter calls; preparation tracker `finish(failed)` once and never `done`; no accepted `:launch:release` receipt; no retained worktree.
- Same-ID release/retry and fresh-ID release/retry after revocation denied without duplicating events; late `prepared-run.fail` idempotently no-ops or replays its receipt, with byte-identical durable events/effects/attempts. `reconcile_required` no longer downgraded by late run terminal status after a found defect was corrected.
- Async failure is **observed via durable terminal state**, not direct exception reaching `launch()` caller: `schedulePreparation` uses `Effect.ignoreCause`. The user-accepted contract requires truthful state, not synchronous propagation.
- Manager classification: **K2 `NATURAL ASYNC RELEASE RUNTIME PASS` (worker-reported, independently rerun)** under controlled local server-root conditions; not proof of externally atomic provider cancellation.

## K3 — partial additional checks and remaining conditions

- Correctness testing reported **5/5** full-root tests, independent reviewer **94/94** focused guard/runtime/launch/effect-worker tests, worker Runtime subtree **208** tests, server typecheck exit 0, changed-file **118** tests + lint/format/knip/GraphQL/typecheck exit 0. Reviewer independently reran root **5/5** and focused **94/94**. All claims are from worker handoff; exact raw logs retained privately.
- Review performed by **Codex GPT-6.1 SOL Medium on a second Codex subscription**, different provider from Sonnet implementation worker. Review verdict **PASS WITH FINDINGS**, no blocking defect within K1/K2. Not the same provider/model as the main implementer.
- Reviewer identified **pre-existing D2 MCP schema exposure** in experimental base: task create/update and returned task tool shapes still advertise `continuation` while runtime gate is off. **D2 remains a separate public release blocker**, not a K1/K2 failure. Main shipping fork currently excludes experimental continuation source.
- Nonblocking conservative `reconcile_required` preservation now applies to all reserved `cont:v1:` attempts, not just one revocation subtype; not ordinary attempts, no state downgrade.
- Tests require locally installed/authenticated Codex/Claude adapters although session openings are intercepted (no paid live provider turns), reducing **portable-stub coverage**.
- **Not established:** real process crash/SIGKILL/restart/pruning with full root, live provider external-turn race, multi-adapter real provider execution, wider repo/UI/hosted CI and production app; internal authorization/attempt JSON stripping beyond explicitly tested paths still needs evidence when shipping. D2 output/input schema release exclusion remains unmet. K3 is **PARTIAL** and must not be silently promoted to complete.
- External `startTurn` atomic cancellation was explicitly excluded by user-accepted D4 A+B semantics, so it is not reintroduced as a blocker for K1/K2.

## Reparative work, routing and operational constraints

- Worker reported a corrected late `prepared-run.fail` after cancellation (red-before assertion), real `reconcile_required` preservation under CAS, and test-only `noBrowser:true` option to avoid unintended browser tabs during the production-root test.
- The local D4 branch is now reported as **12 commits/15 files** with exact final head above; previous 3-commit status is HISTORICAL. No source has been pushed to GitHub.
- DeepSeek V4.1 Flash **orchestration only**. Codex A subscription had **5** implementation/test dispatches and is exhausted until **2026-11-08 21:15 UTC** (provider-reported); Claude Sonnet 5.5 had **4** dispatches and both Claude subscriptions rate-limited on review attempts; Fable 5.1 review attempts were denied by quota. Codex B subscription completed independent review (1 dispatch), quota available then but exact remaining allowance/reset **UNKNOWN**. No Opus, paid-provider call or live model turn.
- Preserve primary checkout, four detached Stage 2 worktrees, D4 local branch and restricted evidence ledgers. Worker reports no dirty/unrelated changes, no repo ref movement, no push/merge and private PR #21 evidence untouched. **No cleanup, unmount or evidence transfer is authorized.**

## Manager outcome and next safe action

**Accept K1/K2 scoped qualification**, retain K3 PARTIAL, D2 shipping exclusion OPEN and the D4 implementation as **ISOLATED / NOT INTEGRATED / NOT PRODUCTION VERIFIED**. No further local work is authorized within this completed verification task and no new T3 Code task is dispatched by the browser manager.

**Next material user decision:** whether to authorize upstream catch-up and a *separate, later* fresh re-land of the isolated continuation/D4 code onto an integration branch based on merged fork main; never merge this divergent experimental D4 branch directly. The upstream drift changed again today; refresh refs and security hotspots before writing. The fork's current main excludes experimental continuation and remains the safe integrated baseline. Any future re-land needs a governing spec, one owned isolated writer, fresh tests/review, D2 shipping projection exclusion design and an explicit main merge/production decision.

**No implied authority:** no public Git push/PR, fork main merge, production activation, material paid costs, new epoch/authority database, evidence publication or destructive cleanup. User explicitly chose to keep all PR #21 evidence PRIVATE. The manager may prepare browser-only product/integration decision materials, but the next large code-lane/write remains gated by owner approval.
