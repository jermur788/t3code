# Bounded agent decision, review and escalation

Date: 2026-11-03
Status: USER-DIRECTED DESIGN REQUIREMENT / NUMERIC PRODUCTION POLICY PROPOSED, NOT ACCEPTED / NO IMPLEMENTATION
Owner: T3 Fork Project Runtime policy (not upstream V2 provider-session loop)
Source: user instruction on 2026-11-03 to prevent unlimited agent back-and-forth and force autonomous decision or human escalation
Inputs: [source-level Argus comparison](preimplementation-architecture-reuse-research-20261103.md), [continuation stub experiment](continuation-stub-provider-spike-task-20261103.md), accepted [fork product direction](../internals/fork-product-direction.md)

## Required behavior

For a single project task, an Engineer, Reviewer, Manager or other agents may exchange evidence or proposed fixes only under a **finite authorized decision budget**. They must not spend indefinite turns debating without producing a new accepted artifact, a passing test, a distinct falsifiable hypothesis or a clear blocker.

At a decision boundary:
1. **Accept** when an independent review and deterministic acceptance checks agree, the evidence belongs to the current task and attempt, and no separate user authorization is required.
2. **Bounded technical repair / change approach** when evidence identifies a specific, authorized defect and the remaining budget permits it. Agents may make implementation-level choices within the accepted spec and permissions.
3. **Escalate to the user** when the remaining issue is a product trade-off, security/integration authorization, material scope change, irreversible action, or unresolved technical disagreement at the decision budget limit.
4. **Blocked / defer** if the bottleneck is external or an operational dependency, not something another reasoning turn can resolve. Do not convert a known provider error into endless retry.

The **user owns final product decisions**. An agent may select among technically valid already-authorized options, but may not settle a contested product choice by silently expanding its authority.

## Use existing upstream T3 execution state; don't add another engine

- Upstream T3 owns provider turn mechanics and run/receipt/outbox execution.
- Fork Project Runtime owns the **project-task decision budget** and durable outcome, linked to attempt, independent review, evidence and task revision.
- A completion event is not authorization for another turn. A worker claim is not verification.
- Keep one clear responsibility: no Planner→Manager→Reviewer model loop unless a real open question requires it. After a clean independent review, deterministic acceptance is preferable to another Manager model call.

## Lessons from Argus (source inspected; not run here)

Argus already has several safeguards, but **not one universal hard stop by default**:
- [Engineer round config](https://github.com/microsoft/ArgusAgent/blob/main/argus/engineer/round_config.py) defaults `max_rounds = 0` (unlimited), `soft_round_limit = 12`, `hard_escalate_rounds = 24`, `no_progress_threshold = 2`, `stall_threshold = 4`, with a separate elapsed-time decision-progress guard. The soft limit stops two successive non-progress review judgments; the hard escalation calls for an explicit forward-progress signal and may allow productive longer tasks.
- [Engineer settlement](https://github.com/microsoft/ArgusAgent/blob/main/argus/engineer/round_settlement.py) uses Reviewer `forward_progress` and operator questions as structured decisions. Unknown progress does not count as a verified stall. It explicitly treats healthy running external work as not stalled.
- [Supervisor constants](https://github.com/microsoft/ArgusAgent/blob/main/argus/life/supervisor/_constants.py) default to three consecutive replans and three repeated completion rejections before stopping the loop; [mission settlement](https://github.com/microsoft/ArgusAgent/blob/main/argus/life/supervisor/_mission_execution_settlement.py) persists per-item replan streak so a restart does not reset the limit.
- [Supervisor config](https://github.com/microsoft/ArgusAgent/blob/main/argus/life/supervisor/_config.py) defaults to circuit-breaking a repeated subagent failure family after three failures in a 72-hour window, even if each attempt has a different task description.
These are examples for test cases and rule design, not evidence that default Argus meets the requested finite decision-budget invariant.

## Proposed policy dimensions (defaults not yet product-approved)

- **Repair/review exchanges:** propose one independent review and at most **two** automatically authorized repair-and-review cycles on the same issue. After that, stop and present options; no agent can reset the counter by rephrasing its complaint, switching models, or launching another child thread. This number is a **synthetic-test parameter**, not a deployed production setting.
- **No-progress detection:** fingerprints group equivalent objections and failed hypotheses; mere text changes, elapsed time, generated code churn or additional model turns do not demonstrate forward progress. Evidence of a previously failing test now passing or a newly falsified hypothesis does.
- **Time/cost budget:** guard total manager/reviewer/model calls and elapsed *decision-wait* time in addition to round count; design the configurable production ceiling after measuring realistic cases. Healthy long-running tests/builds are excluded from no-progress timers, but still subject to ordinary approved compute/resource budgets and heartbeat reporting.
- **Global guard:** nested delegation cannot reset the parent's finite task budget. Count all child reviewer/repair rounds against the same project task, with bounded per-task and per-project spend if measurement permits.
- **Repeated same-cause failures:** transient provider failures have their own bounded retry policy; identical technical failures after a provider swap are not a new issue. Preserve the failure/attempt count across restarts.
- **Stop semantics:** `needs_user_decision`, `blocked` or an equivalent existing Runtime-supported state (avoid inventing new states without reviewing contracts). Show concise description, evidence, paths tried, remaining options and the specific user question. Do not spin in background.
- **Escalation quality:** user should see what succeeded, what failed, what attempts were made, remaining budget, whether any choice is within scope, and the cost/risk of the options, not raw back-and-forth transcripts.

## Bounded automatic example

1. Worker implements a previously accepted task.
2. Independent reviewer identifies one reproducible issue.
3. First repair fixes it; reviewer checks the same current task/revision.
4. If the reviewer still rejects for the same reason, one more authorized repair may try a materially different technical approach.
5. If still unresolved, stop and ask the user a specific question, or mark blocked on a technical dependency. Do not ask another model to keep voting on the same evidence.

Where a clean review passes at any step, accept after deterministic checks; no extra manager vote. A reviewer disagreement without new evidence is not permission for another model call.

## Acceptance tests for the stub-provider spike (synthetic, no model/credentials)

- Passing clean review -> accept exactly once; `0` redundant manager calls.
- Same underlying review objection recurs despite changed wording -> after configured finite exchange budget, one user escalation, zero further review or worker launches.
- Material new evidence within authorized scope -> permit next bounded attempt if budget available.
- A worker or reviewer asks for a product decision, new credentials, merge or extra scope -> immediate user gate; cannot consume another autonomous decision round to bypass it.
- Restart/replay/child delegation/provider switch cannot reset budget or duplicate escalation/dispatch.
- Healthy asynchronous test wait with heartbeat does not incorrectly spend review rounds or trigger no-progress escalation.
- Repeated transient provider outage -> bounded operational retry policy, then blocked; not presented as technical-review disagreement.
- Missing review provenance, wrong task version or ambiguous execution -> fail closed.
- Result carries a bounded decision receipt with source attempt, task version, reviewer evidence, budget used and next action; use existing storage/receipts when possible.

## Status and decision boundaries

This file records the **accepted qualitative user requirement** of finite agent debate and forced decision/escalation. The exact production policy (default exchange count, time/cost ceilings, overrides and whether the user can opt into more autonomy) remains a **product choice** and should be recommended from a small synthetic and later live, controlled benchmark. The immediately authorized synthetic spike may use a fixed two-repair test budget; that test must not silently turn the numeric value into a production default.

No implementation, provider run, cost, production policy, upstream outreach or merge was performed by this design note.
