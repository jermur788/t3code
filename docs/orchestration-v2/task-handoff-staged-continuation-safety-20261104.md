# T3 Code handoff — staged continuation safety and upstream reconciliation

**Issued:** 2026-11-04 (Europe/Dublin)  
**Owner:** DeepSeek/OpenCode as orchestration coordinator; single code writer for the gate; separate independent reviewer. Use Codex/Claude-class when security-sensitive gate and concurrency reasoning justifies it. Record actual routed provider/model, eligibility, reasons, alternatives, retries and outcomes.  
**Repository:** `jermur788/t3code`.  
**Governing spec:** [Accepted continuation staged safety spec](continuation-staged-safety-governing-spec-20261104.md).  
**Evidence:** [Reviewed overnight checkpoint](https://github.com/jermur788/t3code/blob/overnight/deepseek-continuation-20261104/docs/orchestration-v2/overnight-morning-handoff-20261104.md), [overnight routing ledger](https://github.com/jermur788/t3code/blob/overnight/deepseek-continuation-20261104/docs/orchestration-v2/overnight-deepseek-routing-ledger-20261104.md), [F4 options](https://github.com/jermur788/t3code/blob/overnight/deepseek-continuation-20261104/docs/orchestration-v2/overnight-f4-gate-decision-memo-20261104.md).

## USER DECISION — already accepted, do not request again

1. Implement a **default-off server-side switch now** so the synthetic continuation is safe to keep **isolated for experimentation**.
2. **Exclude experimental continuation and agent-facing tool-schema overhead before any public shipping release.** The known +646 bytes is provisionally tolerated in the *unmerged experiment only*, not approved as a public-release increase.
3. Current **best-effort** last-check + cancellation/reconciliation is allowed **only** for isolated stub-provider experiments. Production requires strict no-new-run-after-committed-revocation behavior. Strict design may need upstream execution-engine changes and must be specified/reviewed separately. No such change is authorized by this handoff.
4. No merge to fork main, no production enablement, no new draft PR, no upstream comment/push and no real or paid providers without separate authority.

## BASE / OWNERSHIP

- Start at existing remotely created, **untouched** branch: `experiment/continuation-default-off-gate-20261104`. It was created by the browser manager from the published and independently reviewed `overnight/deepseek-continuation-20261104` head. Confirm live remote history before writing.
- User's earlier overnight worktree `/home/jer/dev/t3code-overnight-deepseek-20261104` and older security/qualification worktrees must stay intact. Create a **fresh isolated gate worktree**. Inspect `git status`, all worktree owners, branch and remotes, unrelated changes, collaborators and active writers first.
- One writer for `apps/server/src/projectRuntime`, contract-adjacent code and tests. The separate upstream-recon lane is read-only or uses an independently isolated disposable worktree; no parallel overlapping writes.
- Fork main is NOT the implementation base and remains untouched. Current upstream main **changes rapidly**: at manager reconnaissance 2026-11-04 01:10 UTC it had advanced another 14 commits beyond the overnight trial base, principally mobile/UI plus Claude provider changes. Refetch before trial; do not assume the overnight eight-conflict list is final.

## SERIAL TASK QUEUE

### T0 — Confirm runtime and routing authority

DeepSeek coordinator inspects available providers/models, exact code base, project/source state, tests and host capabilities. Prove real worker completion channel before relying on unattended continuation. Maintain routing-choice ledger with proposed and actually resolved provider/model/driver, origin, reasons, rejected candidates, cost/quota only if observed, attempt count, completion event, result and next action. If Project Runtime task store is not exposed, use a new append-only branch-local ledger and return durable handoff. Record any background-monitor limitation. No invented liveness.

### T1 — Implement default-off gate, test-first

**Goal:** a shared server-controlled continuation capability, default false, that cannot be enabled from task/MCP/agent data. Prefer existing server config/DI conventions with deterministic test injection instead of a mutable global process flag across concurrent test suites. No new database, queue, migration or orchestration engine.

Required behavior and negative tests, with failures recorded **before** minimal repair:

- `ProjectRuntimeService.createTask`: when off, reject a **non-null** `continuation` policy even for `user:` actor; ordinary task creation still succeeds. Preserve existing agent actor self-grant denial when on.
- `ProjectRuntimeService.updateTask`: when off, reject adding/modifying non-null policy; explicit `continuation: null` removal must still work, as must unrelated edits of a legacy task that already contains policy. Do not allow task owner/client to flip global gate.
- `RuntimeTaskExecutionService.advanceContinuation`, terminal attempt reconciliation and startup recovery: off means no new automatic review/repair, no synthetic blocked-state side effect solely from disabled feature. Ordinary execution and handoff read unaffected.
- `launchAttempt`: on startup when a historical pending continuation review or repair receipt is present while off, perform no external launch. Preserve receipts; cancel if thread is definitely absent, or retain `reconcile_required` if thread may exist. The disabled gate must not be bypassed via a replay of a saved request key.
- Gate-on explicitly configured **isolated test** paths must still pass all prior continuation tests, including duplicate/replay limits, exact post-handoff revision binding, malformed and case-variant key reservation, two-repair synthetic budget, source cancellation, stop-writer CAS, reviewer independence and no automatic VERIFIED.
- Default is off under missing/invalid settings. Prove server-derived, not agent-selected. Avoid expanding agent-visible MCP fields or further increasing tool context without a separate explicit review.

**Verification:** full `apps/server/src/projectRuntime` tests, targeted off/on and SQLite restart suites, `vp run typecheck`, `vp run check:changed`, any existing budget test. Record executed commands/counts/exit codes. Stub providers only, no real model calls. Claim no stronger verdict than evidence.

### T2 — Independent security review and bounded repairs

Different provider/model reviewer from T1 writer. Inspect every gate surface, attempted bypasses, source of configuration, cancellation/replay semantics, read/write actor provenance, and that off mode doesn't accidentally block ordinary task operations. Verify no hidden agent-facing default-on path and no prod exposure. If routine issue found, writer corrects and reruns tests, reviewer re-reviews. Use up to two *different, evidence-backed* low-cost troubleshooting attempts before escalating a genuine difficult bug to available Codex/Claude-class, with at most four bounded total attempts per issue. Security/architecture/paid-cost stop conditions are immediate, not retry targets.

### T3 — Separate upstream compatibility reconciliation (safe trial only)

After T1/T2 gate branch has a clean proven checkpoint, fetch current `pingdotgg/t3code` main and fork main, inspect exact current heads and change lists. Fork and upstream have substantial divergence. Run a **disposable, isolated** trial merge/replay, never a rewrite of published or shared history. Reconcile the overnight report's eight preexisting conflicts against latest upstream; show actual file conflicts, upstream-owned/fork-owned behavior changes, and V2 launch/provider effects. If an upstream compatibility conflict entails architectural policy, record it and stop that write lane. Never accept auto-merged code as proof of runtime compatibility.

For any executable trial base, rerun the stage T1 test suite and typechecks on **that actual resulting tree**, with exact exit codes, re-measure MCP tool-list bytes and document any new agent-context increase. If trial cannot be completed safely, return source-backed matrix and blockers instead of claiming compatibility. Do not merge fork main or push upstream.

### T4 — Strict production revocation design and shipping exclusion research

Read-only architecture/spec task; assess strict no-new-launch after durable withdrawal using existing upstream ThreadLaunchService/EffectWorker/receipts; define linearization point, transactional authority provenance, cross-process/restart behavior, cancellation of existing runs, and verification scenarios. Identify whether an upstream API change is necessary, how to remain upstream-friendly, and rebase hotspots. No implementation of engine changes or new authority state.

Document a **separate public-release exclusion strategy** (feature absent from shipping agent-visible schemas; effect on context budget measured). If it requires a material architecture change, classify PRODUCT DECISION, record options but do not expand implementation.

### T5 — Final independent readiness review and durable handoff

Verify all T1/T2 changes, test/log provenance, routing/attempt ledger, branch base, active workers and worktree cleanliness; check T3 research/conflicts and T4 proposals. Publish normal fast-forward commit/push **only to the owned experimental gate branch** after verification and secret review. No PR/main integration. Mark precise states `IMPLEMENTED`, `RUNTIME PASS`, `REVIEW PASS`, `NOT INTEGRATED`, and residual `BLOCKED` gates. Preserve all original worktrees. Return full manager handoff, actual provider/model routing table, and exact follow-up action for browser review.

## MONITOR / RETRY RULES

- Only one active writer per shared code lane. Record every child dispatch, last verified host wake/liveness event, end result and handoff.
- Do not start T2 until T1's changes and tests are settled; do not begin T3 trial in same worktree with pending code changes.
- For routine implementation defects: first evidence-based attempt; second materially different diagnosis; stronger model may take up to two additional tries if both failed. Do not spend the entire quota if solved. No repeated unchanged command counts as a new attempt.
- If T3 is blocked by architecture, continue T4 read-only and complete final checkpoint; don't claim the blocked task passed.
- If completion or Runtime is unavailable, preserve a clear resumable handoff rather than claiming continuous monitoring.

## SECURITY / STOP CONDITIONS

Do not introduce a second runtime database/queue, intrusive upstream engine changes, policy enablement in a shipping server, paid external usage, source history rewrite, destructive worktree operations, merge/main changes or public upstream writes. Stop for material changes in cancellation contract, build-exclusion mechanism that touches upstream ownership, true atomic launch guarantee, irreversible migration, conflict with other writers or material cost.

## RETURN HANDOFF FIELDS

**VERDICT** by T0–T5; **BASE/CHECKPOINT** (exact branch, worktree, status, current upstream); **RESULT** and file changes; **VERIFICATION** commands, counts/exits and test environment; **FAILURES/RISKS** and classification; **REVIEW** provider/model and independence; **ROUTING LEDGER** with candidates, rejected options, actual resolved model, attempts, cost only when measured; **INTEGRATION STATE**; **NEXT** and any specific user decisions (do not re-ask accepted D1–D4).
