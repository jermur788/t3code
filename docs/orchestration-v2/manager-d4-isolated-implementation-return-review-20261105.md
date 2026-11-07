# Overall Manager — D4 isolated A+B implementation return reconciliation

**Report received:** 2026-11-05 17:54Z through user-provided private worker handoff.  
**Source-of-evidence distinction:** worker-reported private local implementation and test/reviewer logs; browser manager independently re-fetched public fork `main`, existing experiment and governing specs, **not** the local-only D4 branch, code, or restricted ledger.  
**Status:** **`IMPLEMENTED (worker-reported) / STATIC PASS (worker-reported) / SCOPED RUNTIME PASS (worker-reported) / INDEPENDENT REVIEW PASS WITH FINDINGS (worker-recorded) / REQUIRED FULL-SERVER ASSEMBLY VERIFICATION NOT DEMONSTRATED / NOT INTEGRATED / NOT PRODUCTION VERIFIED`.** This is **not** overall contract acceptance, a source-code audit by the browser, or a release authorization.

## Provenance / base and ownership

- Fork `main` still at integrated PR #21 `fb67545d790c5c001e8f85827f219ab6493c435e` and experimental branch still at `b3b8da54e0b8b184a1cf4e667d53e73e04f85074`, independently checked through GitHub.
- Worker reports its local-only isolated D4 branch `d4/ab-revocation-guard-20261105` based on the experimental tip, with **three commits**, **13 files**, **+1430 / -44**, clean worktree and no push/remote tracking. Browser manager requested that branch from the public GitHub fork and received **NOT FOUND**, consistent with *not pushed*; it cannot inspect or verify those changes.
- Worker reports primary development-profiles checkout and four Stage 2 read-only worktrees preserved, no changes to fork main, experiment ref or upstream, no production activation. This local source still sits on a branch **34 commits ahead / 336 behind** fork main. It is **not** a safe integration base; future fresh re-land requires separate explicit authorization.

## Worker-reported implementation

**A — new-run commit guard:** narrow internal `Context.Reference` authority issued by `RuntimeTaskExecutionService` only for reserved continuation attempts; binds exact project/source/target revisions, attempt, thread, request key and kind. `EventSink.commitCommand` accepts optional generic `CommandCommitGuard` and evaluates it **inside the existing SQL commit transaction**, after duplicate command receipt resolution and before event append/outbox enqueue. `ContinuationCommitGuard.launchGuard` reads live source/target/attempt SQL rows under the transaction, requires exact revision and `continuation.mode = synthetic`; denial is typed `EventSinkCommitDenied`, transaction rolls back with no run, start effect or accepted-success command receipt.

**B — prepared-run and effect protection:** `preparationGuard` covers `prepared-run.release` and `prepared-run.retry`, using durable attempt JSON provenance from deterministic Runtime message identity. On denial Orchestrator uses `dispatchPreparedRunFail` terminal compensation for run/attempt/node/preparation/error items, a distinct compensation command, and typed caller denial; replay re-denies. `cancellationGuard` marks cancelled only where no start effect is known and does not overwrite `reconcile_required`. `EffectWorker` checks guard before provider call, attempts safe stop/reconciliation on denial and does not call `startTurn` if guard denies. `server.ts` reportedly shares one memoized continuation gate between orchestration and Runtime. No contracts, MCP schema or migration changes and no new authority/epoch table.

**Crucial approved semantics:** The initial continuation launch is `defer_start`: durable `preparing` run, no provider start effect until later `prepared-run.release`. A protects new-run commits and B protects definite pre-start release; neither promises atomic cancellation of an external provider call after an EffectWorker guard has passed. This follows the [user-accepted A+B contract](d4-accepted-revocation-contract-20261105.md) in design, subject to verification.

## Verification and review as reported

- Codex technical implementer: changed-file check **8 files/113 tests EXIT 0**, explicit acceptance suite **10 files/153 tests EXIT 0**, server typecheck **EXIT 0**. Intentional red baseline **EXIT 1** as expected (a run would be created without the new guard); regression mutation fails as expected when Runtime catch logic is removed.
- Independent read-only Claude Sonnet 5.5 reviewer: core implementation suite **45 tests EXIT 0**, targeted ThreadLaunch suite **4 passed, 45 filtered**. Reviewer **did not** replay 153-test or changed-file runs. Exact raw logs/private code not available to browser manager.
- Initial reviewer `REVIEW REQUIRED` with seven findings: incomplete terminal projection; release denial returned success; cancelled classification too broad; worker reconcile/stuck stop; uncertainty downgraded by cancellation guard; preparation guard fail-open; upstream cost concern. Writer repaired in two rounds; final reviewer **PASS WITH FINDINGS**, no blocking defect. All findings are *worker-recorded*, not new independent browser conclusions.
- DeepSeek V4.1 Flash orchestration only, Codex GPT-6.1 SOL Medium four dispatches (including preflight and two repairs), Claude Sonnet 5.5 Medium three review dispatches. No Opus/paid provider/failover; quotas and resets **UNKNOWN**.
- No repo-wide suite, executable HTTP/full-server root, live provider, two real adapters, UI/browser, SIGKILL/crash end-to-end or production verification.

## Unclosed acceptance requirements and classification

**1. Required full-server assembly — `VERIFICATION INCOMPLETE / REVIEW REQUIRED` (not shown to fail):** The [accepted D4 contract](d4-accepted-revocation-contract-20261105.md) explicitly requires the *actual* server root's `ProjectRuntimeService.updateTask(continuation:null)` operator revocation, `EventSink` transaction, `Orchestrator` receipt and shared SQLite path/connection ordering to be proven. Worker inspected `server.ts` and ran separate real-layer/process tests, **not a combined executable root assembly test**. It may be correct, but no general pass can be claimed from the separate results.

**2. Natural async release-denial propagation — `VERIFICATION INCOMPLETE`:** `ThreadLaunchService.schedulePreparation` forks and ignores cause; compensating writes terminal `cancelled` attempt and tracker failure. Worker did **not** observe the full natural scheduled-preparation lifecycle from real revocation to typed error/terminal projections. Need one bounded deterministic integration test where feasible.

**3. Real operator policy removal at launch/release layer — `VERIFICATION INCOMPLETE`:** Real `continuation:null` tested at guard level but launch/retry used missing source-row fixture, not a complete operator-revoke sequence. Add accepted-revoke-late-start path in combined test.

**4. Cancelled `prepared-run.fail` no-op and recovery — `VERIFICATION INCOMPLETE`:** traced in code but not asserted in a test. Consider as narrowly scoped assertion in same task. SIGKILL and full provider live calls remain separately scoped and not necessary to falsely label release verified.

**5. Internal stored authority data — `REVIEW RISK`:** hidden `$.continuationAuthorization` in attempt JSON; public read/list stripping was asserted. Need confirm no other JSON/DB/RPC/telemetry/MCP surface leaks authorization, and that a client cannot forge it. Lack of browser access to local source prevents independent confirmation.

**6. Empty thread on denied initial launch — `KNOWN RESIDUAL`:** permitted only if no durable run/start effect and recovery remains truthful; decide cleanup separately, not a reason for destructive changes.

Do not weaken accepted A/B semantics or quietly remove the full-assembly check to gain a pass. These are **verification gaps**, not evidence of a demonstrated implementation defect. Do not demand a second entire full review unless new test findings materially change code.

## Decision / next safe work

**Overall Manager disposition:** accept the worker-reported `IMPLEMENTED` milestone on its **isolated local branch** and the narrowly reported `STATIC PASS / SCOPED RUNTIME PASS / REVIEW PASS WITH FINDINGS`; **withhold overall D4 acceptance and any integration authorization** pending the real combined assembly/revocation evidence. This is routine closure of an already-accepted task acceptance requirement, **not** a new product choice and not permission to alter main.

[Bounded full-assembly verification and minimal corrective tests](task-d4-full-server-assembly-verification-20261105.md) is the **one next authorized local task**, prepared for DeepSeek orchestration-only, Codex or Sonnet implementation/test execution, independent different-provider read-only review if touched. Must use existing isolated branch/worktree with verified ownership and preserve three existing implementation commits; no Git push/merge/upstream catch-up, no D2 schema changes, no paid providers, no PR #21 evidence access and no destructive worktree cleanup. If full server root cannot be instantiated without paid credentials, classify precise `OPERATIONAL BLOCKER` and propose faithful safe harness; do not invent a PASS.

After it returns, manager re-evaluates with source/test/reviewer evidence. If accepted, **separate owner authorization** is required for the much larger re-land of continuation onto merged fork main, which is still divergent from this experimental base. No production or release approval is implied.

## Superseding result 2026-11-05 21:43Z

**This document's earlier full-server verification gap has since been CLOSED within K1/K2 isolated scope.** [New manager K1/K2 reconciliation](manager-d4-full-root-k1-k2-verification-reconciliation-20261105.md) records real exported `layerMakeServer` production-root, same SQLite transaction, true operator `continuation:null` and natural async `schedulePreparation` verification. K1 and K2 **RUNTIME PASS (worker-reported, independently re-run)**; K3 additional crash/restart/pruning and provider-portability **PARTIAL**. Local branch NOT INTEGRATED, production NOT VERIFIED. The recommended verification task is now **COMPLETED**, not pending. Preserve earlier report as historical context only; do not redispatch.
