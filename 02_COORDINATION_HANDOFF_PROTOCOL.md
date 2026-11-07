# T3 Fork — Coordination and Automatic Handoff Protocol

**Classification:** STABLE COORDINATION INSTRUCTIONS, mirrored to shared GitHub from the project's governing Coordination/Handoff Protocol. Update this deliberately if the governing protocol changes; do not silently reinterpret it.
**Current state:** [01_CURRENT_STATE.md](01_CURRENT_STATE.md). **Manager continuation:** [OVERALL_MANAGER_HANDOFF.md](OVERALL_MANAGER_HANDOFF.md).

## Purpose

Make multi-worker and multi-manager development continue with minimal manual relay while preserving explicit authority, repo safety, and verifiable state.

## Canonical-state rule

Chat history is not project state.

Canonical continuation should come from:
1. Project Instructions;
2. Current State / Roadmap;
3. governing spec;
4. Runtime task state;
5. latest authoritative handoff;
6. inspected repository/runtime evidence.

Historical handoffs may explain how the project arrived here, but they must not override newer accepted state.

## When a handoff is mandatory

Create a handoff automatically after any substantial:
- implementation task;
- investigation that changes architectural understanding;
- review with material findings or pass verdict;
- verification/qualification gate;
- integration/merge;
- blocker that changes sequencing;
- provider/thread/worktree transition where another worker will continue;
- manager-chat transition;
- long phase whose accumulated state would otherwise require rereading chat history.

Tiny local fixes inside one ongoing worker session do not need separate handoffs unless they materially change accepted state.

## Mandatory paste-ready DeepSeek orchestration handoffs (accepted user policy, 2026-11-04)

Whenever the next authorized action needs a T3 Code worker/session, the Overall Manager must provide **one complete, copy-and-paste-ready handoff in the user-facing reply** and preserve the same authoritative packet in Runtime or the branch ledger. Writing or linking a packet never starts a worker. Use the [compact standard handoff template](docs/orchestration-v2/DEEPSEEK_ORCHESTRATOR_HANDOFF_TEMPLATE_V1.md) with task-specific governing spec, base, scope, verification and stop conditions.

**DeepSeek is an orchestration-only resource** for future dispatches: task decomposition, selecting workers, supervising status and usage limits, inspecting evidence, routing bounded repairs/reviews, maintaining authoritative task/ledger records, and completing handoffs. **Do not route implementation, source edits, development test execution or code review to DeepSeek.** Preserve its limited OpenCode subscription for high-leverage coordination. This does not retroactively invalidate already-dispatched P2 work, which ran under the prior task packet.

**Development worker policy:** Assign **all implementation, debugging and test execution** to **Codex GPT-6.1 SOL — Medium** or **Claude Sonnet 5.5 — Medium**, selecting on task fit, actual provider/subscription availability, ownership, and available capacity evidence. Independent reviewer must be a different provider/model from the implementer and read-only. Escalate materially difficult unresolved security/concurrency/integration to **Claude Opus 5.5** at the least adequate effort (normally Low/Medium initially); Opus is not a default. Two genuinely different evidence-backed routine remediation attempts precede expensive escalation when safe; immediate authority/security stops do not wait for retries. DeepSeek remains orchestrator throughout.

**Subscription watch and recovery:** Each subscription (e.g. separate Claude pools) is tracked independently at start, dispatch, completion, auth/quota error, and logical transition: `AVAILABLE`, `BUSY`, `COOLDOWN/QUOTA`, `LOGIN-UNAVAILABLE`, or `UNKNOWN`; task in flight; source and provider-reported five-hour reset/window; remaining allowance if actually available. The user's **~10% remaining 30-day DeepSeek allocation with ~10 days remaining** is a dated user report, *not* live measurement. If a worker hits an actual limit, checkpoint its owned work and ledger, reroute to an available authorized model/subscription if safe, or resume after a **provider-confirmed reset** using a real supported T3 continuation mechanism. If the host cannot wait/resume unattended, publish an exact restart-ready handoff; do not claim background automatic restart. Never bypass quotas or invent allowance/reset times.

**Ledger:** Update T3 Project Runtime task/attempt/handoff state as events happen; fall back to an append-only owned branch ledger if Runtime is unavailable. Record UTC time, task and attempt, orchestrator, requested and actual worker provider/model/effort, options rejected and reason, capacity and source (or UNKNOWN), branch/worktree writer, tests/outcomes/failure, independent reviewer, next action. Keep observed facts, orchestrator claims, and retrospective inferences distinct; do not promote worker claims to independently proven success.

**Template completeness:** start command for DeepSeek; objective and governing spec; actual repo/base/ownership; worker and quota policy; acceptance tests; independent review; ledger location; escalation, stop and final handoff instructions. Preserve one writer per overlapping lane. No worker may merge, rewrite history, incur material paid cost, bypass security or change accepted architecture without applicable authorization.

**Status:** Accepted prospective orchestration/routing policy. The previously issued P2 handoff and its completed historical provider choices are not reinterpreted as violations.

## Worker end-of-task protocol

Before ending substantial work, the worker should:
1. inspect final repo/worktree status;
2. run the acceptance/verification required by the task packet;
3. update the Runtime task if available;
4. append a Runtime handoff if available;
5. return the same essential handoff to the manager;
6. stop without starting an unauthorized milestone.

If Runtime handoff tooling is unavailable, the structured handoff returned to the manager is mandatory and the manager should persist/reconcile it as soon as possible.

## Required handoff fields

### VERDICT
One of the precise project states appropriate to the task, e.g. IMPLEMENTED, STATIC PASS, RUNTIME PASS, REVIEW PASS, VERIFIED, BLOCKED.

### BASE / CHECKPOINT
- starting base;
- branch/worktree;
- final revision/checkpoint;
- relevant upstream revision;
- working-tree cleanliness.

### RESULT
- concise description of what changed or was learned;
- files/components affected;
- intentional exclusions.

### VERIFICATION
- exact tests/checks run;
- important counts/results;
- runtime/UI/restart/provider evidence where required;
- checks not run and why.

### FAILURES / RISKS
- real failures encountered and repairs;
- unresolved risks;
- blocker classification where applicable.

### REVIEW
- reviewer/provider/model for material reviews;
- findings;
- repairs;
- re-review result.

### INTEGRATION STATE
- not integrated / PR open / merged / verified integrated head;
- whether content drift exists;
- whether cleanup remains.

### NEXT
- exact next authorized action;
- whether user action is needed;
- explicit stop condition if no further work is authorized.

## Manager handoff-consumption protocol

When a worker returns a handoff, the manager should automatically:
1. compare it with the governing spec/task packet;
2. inspect repo/runtime evidence proportionate to risk;
3. reject unsupported status claims;
4. classify defects/blockers;
5. route routine repairs or independent review without asking the user;
6. update Current State and Runtime task/handoff state when appropriate;
7. integrate if already authorized and acceptance is satisfied;
8. verify the integrated head where required;
9. issue the next authorized task packet.

The manager should not stop simply to report that a worker finished.

## Automatic continuation state machine

`TASK ISSUED -> IMPLEMENTATION -> REVIEW/VERIFY -> REPAIR IF NEEDED -> RE-REVIEW -> INTEGRATE IF AUTHORIZED -> VERIFY INTEGRATED HEAD -> UPDATE CANONICAL STATE -> NEXT AUTHORIZED TASK`

Only leave this flow for a genuine stop condition.

## Stop conditions requiring the user

Stop for:
- product choice;
- material architecture trade-off;
- meaningful scope expansion;
- irreversible/destructive decision;
- unresolved security or integration conflict;
- paid infrastructure/material cost decision;
- conflict between current user intent and accepted project direction.

Do not stop for routine:
- test failures;
- implementation defects;
- review findings;
- migration fixes;
- lint/typecheck issues;
- CI retries/reconciliation;
- evidence collection;
- already-authorized integration.

## Task-packet requirements

Substantial task packets should be self-contained and include:
- TASK;
- ROUTING;
- BASE/CONTEXT;
- GOVERNING SPEC;
- GOAL;
- IN SCOPE;
- OUT OF SCOPE;
- OWNERSHIP;
- ACCEPTANCE;
- VERIFICATION;
- STOP CONDITIONS;
- HANDOFF.

A packet must work without manager-chat history.

## Parallel work

Use parallel workers only when ownership is non-overlapping or isolated by worktree/component. One writer per overlapping lane. Independent read-only review/research may run in parallel. The manager owns reconciliation and integration order.

## Manager transition protocol

Before creating a fresh manager chat:
1. update Current State / Roadmap;
2. ensure active tasks have current status and latest handoffs;
3. record the authoritative repo base and active milestone/gate;
4. archive or clearly mark stale source files as historical;
5. create a concise Overall Manager handoff only for details not already captured canonically.

The new manager should not need the old chat to continue.

## Source hygiene

Maintain a small canonical source set. Prefer updating current-state files over adding endless chronological handoff documents.

Recommended project sources:
- `PROJECT_INSTRUCTIONS` — stable behavior/authority rules (stored in Project Instructions; this markdown is a copy/reference);
- `01_CURRENT_STATE.md` — volatile current base, milestone, decisions, roadmap, immediate next action;
- `02_COORDINATION_HANDOFF_PROTOCOL.md` — stable task/handoff/continuation process;
- governing milestone specs as separate authoritative sources when active.

When a source becomes historical, mark/archive it rather than leaving contradictory “current” instructions discoverable beside the new state.

## Source authority labels

When practical, classify sources as:
- decision;
- spec;
- implementation truth;
- coordination state;
- research;
- reference;
- historical.

When sources conflict, follow the project authority model and surface the conflict rather than silently blending them.

## User-facing reporting

Keep detailed technical evidence in handoffs. User-facing updates after important transitions should state:
1. what changed;
2. what passed/failed;
3. what it means;
4. what happens next;
5. whether the user must act.

If no user action is needed, say so and continue.
