# Governing spec — staged safety of Project Runtime continuation

**Authority:** Accepted user decision, 2026-11-04 01:09 Europe/Dublin.  
**Status:** **D1–D5 user-accepted decisions unchanged / staged U→R→H isolation COMPLETE (worker-reported) / U G-U FINAL PASS / R G-R FINAL PASS with Codex independent reviewer / H D2 SOURCE-LOADED SCHEMA PASS and K3 BOUNDED RUNTIME PASS / H REVIEW PASS / D2 PACKAGED AUTHENTICATED SHIPPING NOT VERIFIED / LIVE-PROVIDER K3 NOT VERIFIED / NOT INTEGRATED OR PRODUCTION VERIFIED**. See [final manager reconciliation](manager-overnight-urh-final-reconciliation-20261106.md). Older incomplete stage-status paragraphs below are historical, not active blockers.
**Decision source:** User explicitly approved both staged recommendations in Overall Manager chat.  
**Candidate source:** [Overnight reviewed implementation](https://github.com/jermur788/t3code/tree/overnight/deepseek-continuation-20261104).  
**Evidence:** [Overnight manager reconciliation](manager-reconciliation-overnight-20261104.md), [F4 gate memo](https://github.com/jermur788/t3code/blob/overnight/deepseek-continuation-20261104/docs/orchestration-v2/overnight-f4-gate-decision-memo-20261104.md), [routing ledger](https://github.com/jermur788/t3code/blob/overnight/deepseek-continuation-20261104/docs/orchestration-v2/overnight-deepseek-routing-ledger-20261104.md).

## 1. Accepted product decisions (binding)

**D1 — experimental feature gate now.** Implement a **disabled-by-default server-side gate** for the synthetic Project Runtime continuation feature, while keeping the experimental code isolated from fork main. A deployable server must be inert unless explicitly enabled in an authorized experimental environment. An agent or client cannot enable it through task creation, MCP, model output or an arbitrary per-task flag. This is a reversible in-tree experiment, not permission to expose it in production.

**D2 — shipping exclusion before public release.** Before a public shipping build/release, remove or exclude the experimental continuation feature from shipping code and **agent-facing tool schemas**, unless an explicitly new user product decision replaces this requirement. This includes avoiding the experimental +646-byte MCP tool-list overhead in public shipping artifacts. The +646-byte overhead is provisionally tolerated **only on isolated, unmerged experimental branches**, not accepted as a production prompt-budget increase. Recalculate bytes on any merged/rebased source; do not assume the earlier snapshot remains accurate.

**D3 — revocation during experiment.** The currently implemented **best-effort last authorization recheck plus durable receipt cancellation/reconciliation** is accepted for isolated, stub-only experiments. The known gap between the last recheck and the external `ThreadLaunchService.launch` can still permit one turn to start after policy withdrawal. Preserve this explicit limitation; do not claim strict cancellation.

**D4 — strict production requirement, A+B CONTRACT ACCEPTED 2026-11-05.** The user selected **(A)** no new continuation `run.created` event may durably commit when authorization revocation committed first, with a transactionally coherent guard, and **(B)** prepared-but-unstarted continuation runs must be prevented from releasing/starting after revocation where their unstarted state can be established; uncertain/in-flight work must be cancelled where safe and explicitly reconciled without a false guarantee of atomic external-provider cancellation. The [binding D4 accepted contract](d4-accepted-revocation-contract-20261105.md) specifies ordering, provenance, verification and stop conditions. This remains **a release acceptance requirement, not IMPLEMENTED or verified**, and no direct fork-main merge, new authority store or substantial upstream engine rewrite was approved. D3 best-effort experimental behavior remains explicitly nonproduction.

**D5 — integration remains separately gated.** The user approved the **staged direction and bounded nonproduction implementation/research**, not a merge to fork main, a production PR, live-provider spend, public upstream submission, irreversible migration, or an unbounded V2 engine rewrite. Keep only one writer per overlapping code lane.

## 2. Implementation work: default-off nonproduction gate

The proposed implementation must be upstream-friendly and use existing Project Runtime abstractions.

**Gate surfaces that must all honor the same server-controlled state:**

1. Project Runtime `createTask` and `updateTask`: reject new or modified **non-null continuation authorization** when disabled, including requests from server-derived `user:` actors. Ordinary task changes and explicit removal (`continuation: null`) must remain available so the operator can cleanly revoke stale policy. Worker/MCP actor restrictions remain.
2. `RuntimeTaskExecutionService.advanceContinuation` and any other automatic decision entry paths, including startup `reconcileActiveAttempts`: dispatch no new review or repair while the gate is off. Do not log a false successful continuation.
3. `launchAttempt` / replay of a pending continuation receipt: validate the server gate just before the existing authorization check. While off, an unlaunched receipt must become `cancelled` if no thread exists or `reconcile_required` if a thread may exist; preserve receipt IDs and history, do not delete it or launch another turn.
4. Existing non-continuation task execution, handoff, routing and Project Runtime V1 remain unaffected when the gate is off.
5. Explicitly-enabled experiments may execute only under an intentionally enabled server configuration and pre-existing operator-authorized source task. **No default-on fallback** for absent/malformed configuration. Do not allow a serialized task payload or agent-facing RPC to turn the global server gate on.

**Gate implementation guidance:** Prefer a small shared server-side capability/configuration checked by both services with deterministic tests. Avoid process-global mutation in parallel tests and avoid widening the public MCP contract merely to carry a gate. Use already available configuration abstractions or an injectable test-layer; inspect actual repo before deciding exact wiring. If a safe gate requires a material server architecture change, stop with REVEW REQUIRED rather than silently expanding scope.

### Acceptance and verification

- Gate **off by default** with missing and malformed configuration; no new continuation policy can be granted; optional explicit policy removal and ordinary task edits still work.
- Gate-off terminal worker reconcile **does not dispatch** automatic review/repair; gate-off startup scan does not dispatch.
- Gate-off pending review **and repair** restart replay preserve deterministic receipts and never call external launch; ambiguous existing-thread case is handled with `reconcile_required`.
- Gate-on path maintains all 42 existing focused continuation tests (or their refreshed equivalent) and normal independent review/repair, fixed budget, exact task revision and stale-source rejection behavior.
- Agent/MCP actors cannot grant or enable policy and no arbitrary user task payload can bypass the server gate.
- Correct operation under two instances against same SQLite and after restart (per existing fixtures). Context budget measured, any change explained. Never weaken tests to pass.
- `vp test run apps/server/src/projectRuntime`, targeted gate/security/restart suites, `vp run typecheck`, `vp run check:changed`; inspect exact exit codes and tests. No real providers, paid models or UI needed for the bounded gate.
- At least one **independent code/security review** of the gate and its interactions is required; reviewer must not be the code writer.

## 3. Parallel nonwriting task: upstream compatibility and strict revocation design research

**Source:** [Overnight trial merge report](https://github.com/jermur788/t3code/blob/overnight/deepseek-continuation-20261104/docs/orchestration-v2/overnight-upstream-compatibility-20261104.md). Prior trial reported 8 conflicts in preexisting fork divergence, **not** in continuation-owned files, but this is **not a completed integration or verification**. Refresh upstream main immediately before any new trial.

**Research acceptance:**
- Compare current upstream release/main and relevant issues/PRs to fork main and experiment, distinguish existing upstream implementation vs proposed changes vs fork code.
- Map conflicts (including V2 event/launch behavior, migrations, shared contract/budget and generated sources) with exact file/ownership evidence. A safe **disposable trial merge** is permitted in an isolated local worktree only; do not reset, stash, rewrite, merge main or publish upstream.
- Re-measure the MCP tool-budget snapshot **on the actual reconciled tree**, not by copying an old constant.
- Prepare a separate strict-revocation architecture analysis: whether an upstream launch/receipt or run-create guard can atomically test a source authorization epoch or similar transactionally coherent state; behavior for in-flight vs new runs; user cancellation at each boundary; multi-process/restart tests, observability and upstream compatibility. **No engine changes yet**; any new authority store or significant cross-boundary contract is REVIEW REQUIRED / PRODUCT DECISION.

## 4. Ownership, routing and status

- **Manager:** browser/Overall Manager owns this spec, authority, review and integration sequencing.
- **Code lane:** one local T3 Code worker on a new isolated gate branch/worktree, starting at the exact published overnight branch. DeepSeek/OpenCode for recon/test scaffolding; Codex/Claude-class for gate safety/concurrency and independent security review as needed.
- **Research lane:** browser-manager read-only current-upstream inspection can occur immediately, independently of code writes. Local disposable trial merge allowed with exclusive ownership.
- **Status initial:** D1–D4 ACCEPTED; gate implementation TASK READY, NOT IMPLEMENTED; strict revocation contract DESIGN REQUIRED; public shipping exclusion RELEASE GATE; actual fork/upstream merge NOT INTEGRATED.
- **No automatic status upgrades:** implementation != tests != review != integration != VERIFIED. Persist real attempt and routing decisions in Project Runtime where available; otherwise append to branch-local ledger. No fabricated token costs or provider runtime status.

## 5. No-go boundaries and stop conditions

No main merge, unreviewed production setting exposure, direct upstream PR push, new standalone orchestrator/database, force operations, destructive cleanup, material paid provider calls, public release or silent acceptance of best-effort cancellation in production.

Stop for a significant new upstream launch API, cross-process atomicity guarantee or new data authority; raise a design decision with source-backed options and continue independent nonwriting tasks.

## Next canonical action

**2026-11-05 21:43Z superseding action:** The user-accepted D4 A+B contract has now been implemented on an isolated local-only D4 branch. The full real `layerMakeServer` production-root K1 transaction/revocation check and K2 natural async `schedulePreparation` release-denial test **RUNTIME PASS (worker-reported, independently reviewer-rerun)**. K3 broader crash/restart/pruning/provider-portability is **PARTIAL**, not waived for production contexts. The [manager K1/K2 reconciliation](manager-d4-full-root-k1-k2-verification-reconciliation-20261105.md) records exact scope, tests, reviewer, quotas and local provenance. [Original D4 implementation task](task-stage2-d4-isolated-implementation-20261105.md) and [full-root verification task](task-d4-full-server-assembly-verification-20261105.md) are **COMPLETED** and MUST NOT be redispatched.

**Next requires separate product/integration authority:** Evaluate upstream catch-up (current upstream 91 commits beyond the incorporated parent), then consider re-landing isolated continuation+D4 as **fresh bounded changes on a safe integrated-main base**, not merging the divergent experiment branch. No upstream sync, local code work, Git push/PR/main merge, public shipping or production enablement is authorized by K1/K2 PASS. D2 remains an unmet public shipping schema-exclusion gate, including test against a real packaged client/authenticated tool listing. Do not touch private PR #21 evidence or retained verification worktrees.

## 2026-11-06 11:47 — latest qualification record, no product-contract change

The user-accepted D1–D5 semantics are unchanged. The overnight isolated U/R/H sequence completed and stopped after H: U upstream trial **G-U FINAL PASS** with the disclosed 900-second monolithic timeout covered by all 367 affected files in 29 batches; R default-off continuation and D4 A+B **G-R FINAL PASS** after qualifying different-provider Codex read-only review and full-root K1/K2 8/8; H **reviewed tests/fixtures-only qualification** with source-loaded agent-facing D2 tool list identical to frozen U baseline (zero continuation fields/bytes), disposable restart/crash/pruning and two-provider stub tests PASS. **H did not implement new production schema projection code**. [Manager evidence, limitations, exact reported test counts](manager-overnight-urh-final-reconciliation-20261106.md).

**Unresolved release gates remain** D2 **packaged/authenticated paired-client MCP tool enumeration** and real external provider-start crash/reconciliation windows, alongside full CI/build and target UI/native verification. No extra stage was authorized beyond H; no Git push, PR, fork-main merge, public release, production default-on, material paid provider or destructive operations. User must authorize the next bounded task. [Proposed packaged D2 verification task](task-post-h-packaged-d2-shipping-verification-proposed-20261106.md) is **PREPARED / AWAITING USER AUTHORIZATION / NOT DISPATCHED**. The original user-accepted D4 contract still controls any later integration/release.
