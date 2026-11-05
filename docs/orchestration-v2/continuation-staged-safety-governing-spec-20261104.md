# Governing spec — staged safety of Project Runtime continuation

**Authority:** Accepted user decision, 2026-11-04 01:09 Europe/Dublin.  
**Status:** ACCEPTED staged D1–D5 decisions; **D4 A+B contract adopted 2026-11-05, subsequently IMPLEMENTED on an isolated local branch (worker-reported), review PASS WITH FINDINGS, full-server assembly verification INCOMPLETE; NOT INTEGRATED / NOT PRODUCTION ENABLED**. See [manager implementation return](manager-d4-isolated-implementation-return-review-20261105.md). Some earlier source/ownership instructions below are historical to the D1 isolated gate; latest Current State and D4 accepted spec govern the new task.  
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

**2026-11-05 17:54Z superseding action:** D1 default-off experiment exists, Stage 2 A/B/C read-only lanes closed, and accepted D4 A+B was **implemented on an isolated local-only branch** with worker-reported static/focused runtime passes and independent review PASS WITH FINDINGS. **Required full combined server-root revocation / same SQLite transaction assembly was not tested.** [Manager review](manager-d4-isolated-implementation-return-review-20261105.md) and [bounded full-root verification task](task-d4-full-server-assembly-verification-20261105.md) govern the next routine work. Task **PREPARED / NOT DISPATCHED**. Original implementation task is COMPLETE; do not re-dispatch or weaken the accepted spec. No upstream catch-up, experimental re-land, fork-main merge, D2 packaged shipping check, production release, new authority table or external evidence transfer is authorized by this result.
