# Operator checklist — synthetic continuation (experiment only)

Audience: a maintainer running the experimental branch locally. **Not a production
runbook.** The feature is NOT INTEGRATED and must stay behind a disabled-by-default gate
before any shipping build.

## Before starting

- [ ] Confirm the checkout is the intended experiment worktree, not the live install.
- [ ] `git status --short` is clean; note the branch and head.
- [ ] Confirm providers used by review/repair are **stub or explicitly approved**; do not
      point the experiment at real accounts by accident.
- [ ] Confirm only one writer owns `apps/server/src/projectRuntime` and
      `packages/contracts/src/projectRuntime.ts`.
- [ ] Create the continuation policy only as an operator (`user:` actor). Agents must not be
      able to create or edit it; if they can, stop.

## Normal continuation cycle

1. Source task has `continuation.mode = "synthetic"`, a distinct review task, optional repair
   task, and `maxRepairCycles <= 2`.
2. Worker attempt completes and appends a handoff in the worker's own thread.
3. Reconcile the attempt (explicit reconcile or startup scan). Expect exactly one review
   receipt with key `cont:v1:r:<workerAttemptId>`.
4. If the review passes, expect **no repair and no VERIFIED elevation**.
5. If the review fails, expect one repair per cycle, then a review of each repair, up to the
   configured budget.

## Restart

- [ ] Stop the server, keep the same SQLite file, start again.
- [ ] Expect `reconcileActiveAttempts()` to reuse pending receipts with their original
      attempt/thread/message ids.
- [ ] If the source policy was withdrawn, cancelled, or edited while stopped, expect the
      pending receipt to become `cancelled` (no thread) or `reconcile_required` (thread may
      exist). No new turn should start.
- [ ] Expect no second review/repair receipt for the same logical step.

## Cancel / revoke

- [ ] Remove `continuation` from the source task (operator actor) or cancel the source task.
- [ ] A not-yet-launched receipt must not launch.
- [ ] A receipt whose thread may already exist must stay `reconcile_required` until reconciled;
      do not delete or relabel it as failed.
- [ ] **Known limitation:** a withdrawal committed between the final authorization recheck and
      the external launch can still start one turn. Reconcile and report it; do not claim the
      stop was guaranteed.

## Escalation / blocked outcomes

- [ ] A terminal failing review with no authorized repair, an exhausted budget, a protected
      decision, or contradictory evidence must leave **one** durable `blocked` source task with
      a `nextAction` and evidence references.
- [ ] Restarting must reuse that blocker, not write a second one.
- [ ] `blocked` is a task record, not a notification. The UI/notification surface is unverified.

## Do not

- Do not merge to main, enable production routing, or add the policy to a real project.
- Do not share a review/repair task between policies; the service fails closed, but do not
  rely on that as a design.
- Do not treat test-only stub success as provider/UI acceptance.
