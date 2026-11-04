# O4 — F4 production safety gate, context cost and cancellation guarantee

Status: **DECISION MEMO — NOT ADOPTED**. No production policy chosen, no gate merged, no
contract or budget change. This is analysis for the user/manager.

## 1. What is actually true today

- `mode: "synthetic"` is an operator-selectable **label** on a Project Runtime task. It is not
  an environment check, not a stub-only constraint, and not a disabled-by-default switch.
- With the gate absent, a server built from this branch will let an operator add
  `continuation` to a task through the existing Runtime RPC, and reconciliation will dispatch
  real provider launches when the routing/eligibility checks pass.
- The only thing keeping the experiment out of production today is that the branch is not
  merged. That is process safety, not technical safety.
- Tests use stub providers, but nothing in the runtime enforces stubs outside tests.

Therefore F4 remains a **hard pre-integration blocker**.

## 2. Measured context cost

The MCP tool-list snapshot is the model-visible budget
(`apps/server/src/provider/AgentContextBudget.test.ts` measures
`name + description + inputSchema` for every registered tool).

| Snapshot                                  | MCP tool-list bytes |
| ----------------------------------------- | ------------------- |
| Fork main before continuation (`d3bedef`) | 58,519              |
| Candidate with `continuation`             | 59,165              |
| **Delta caused by this work**             | **+646 bytes**      |

The delta is the arithmetic between the two committed snapshots, not a fresh schema-diff run.
It is genuinely model-visible: `continuation` is part of the task input schema surfaced to
agents. Upstream main has meanwhile reduced its own snapshot to 47,538 bytes, so any later
merge must re-measure rather than copy either value.

## 3. Gate options

### Option A — server-side, default-off enforcement (minimum safe gate)

- Add one server setting/env flag, e.g. `T3CODE_PROJECT_RUNTIME_CONTINUATION`, default `false`.
- Enforce in three places, not one:
  1. `ProjectRuntimeService.createTask/updateTask` rejects any `continuation` payload while off
     (including operator actors).
  2. `RuntimeTaskExecutionService.advanceContinuation` returns before evaluating while off.
  3. Pending `cont:v1:` receipts are cancelled/`reconcile_required` on startup while off, never
     launched.
- Tests: off-by-default rejection at create, update, reconciliation and restart replay; on-flag
  path still passes the existing suites.
- Cost: **+646 bytes remain**, because the schema still ships.
- Reversible: yes, single flag and three early returns; no schema/migration change.
- Failure mode: an operator who can edit server settings can enable it. That is acceptable for
  an experimental feature but is not a substitute for removing it from shipping builds.

### Option B — exclude from shipping builds (only way to remove the context cost)

- Keep the contract field and tools in an experimental module that the shipping entry point does
  not import, or strip them at build time.
- Removes most/all of the +646 bytes and removes the operator surface entirely.
- Cost: contract versioning and build plumbing; existing experimental rows need a read path.
- Bigger change, but it is the only option that satisfies "no provider prompt/budget leak".

### Option C — keep the mechanism, remove the agent-visible surface

- Drop `continuation` from MCP tool schemas and from agent-facing documentation; keep an
  operator-only RPC path.
- Likely recovers part of the +646 bytes, but the RPC contract still ships and the gate is still
  required. Partial measure, not a clean answer.

## 4. Recommendation (not adopted)

If the user wants to keep experimenting in-tree, **Option A now + Option B before any public
release**. Option A is a small, reversible, testable safety gate. It does not remove the budget
cost, so it does not discharge the `agent-context-increase` review. Option B is the only option
that removes the cost and the agent-visible authority surface.

No option should be merged without an explicit user decision.

## 5. Cancellation guarantee

Two possible contracts:

- **(a) Best-effort last check + reconciliation.** Current behaviour. `launchAttempt` re-derives
  authorization immediately before `ThreadLaunchService.launch`, but the recheck and the
  external launch are not atomic. A withdrawal committed inside that window can still start one
  turn. Reconciliation keeps the outcome observable (`reconcile_required` / `cancelled`) but
  cannot guarantee "no new turn after revocation". The new characterization test in
  `RuntimeTaskContinuationSecurity.test.ts` demonstrates exactly this.
- **(b) Strict no-new-launch-after-revocation.** Requires an atomic revocation-aware launch
  boundary: the launch must observe the source revision/policy in the same durable step that
  creates the run, or the upstream launch service must accept a revocation token/epoch and
  refuse to create a run for a stale epoch. This likely needs cooperation with the upstream
  execution engine and a migration of the receipt model. It is an architecture change, not a
  local patch.

No choice is made here. Option (b) cannot be promised from the current receipt model, and
claiming it without that evidence would be false.

## 6. Explicit non-actions

- No production enablement, merge or release.
- No contract or `agentContextBudget.json` edit in this stage.
- No gate prototype was written: the mechanism choice is itself a product decision and the
  remaining time was better spent on independent review and evidence. The minimal patch shape is
  described above so the manager can authorize it directly.
