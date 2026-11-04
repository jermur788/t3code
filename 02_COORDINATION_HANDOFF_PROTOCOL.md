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

## Mandatory paste-ready DeepSeek orchestration handoffs (user direction, 2026-11-04)

Whenever the next authorized action requires another T3 Code session or worker, the Overall Manager must provide **a complete, copy-and-paste-ready handoff in the user-facing reply**, not just a repository link or an internal task packet. Also preserve the same handoff durably with the task/spec/ledger. Do not claim that a published handoff automatically starts a worker.

- **Orchestrator:** DeepSeek must lead the local task end-to-end: routing, dispatch, liveness, evidence reconciliation, bounded repair loops, review orchestration and ledger updates. DeepSeek is not replaced as orchestrator simply because a strong-model specialist is called.
- **Execution routing:** Use DeepSeek/OpenCode for routine work and cost-efficient first attempts. For ordinary defects make two materially different, evidence-backed low-cost attempts before escalation; do not waste identical retries or delay hard security/architecture stops.
- **Escalation:** Assign bounded hard subtasks or independent review to Codex **GPT-6.1 SOL** (high as justified), **Claude Sonnet 5.5** (medium by default), and **Claude Opus 5.5** (low/medium initially for genuinely difficult unresolved work). Select by task, availability and evidence; record actual resolved model and any substitution. Escalation does not grant authority to merge, redesign core execution semantics or incur material costs.
- **Ledger:** The DeepSeek orchestrator must create/maintain the active Runtime task/handoff ledger when available, or an append-only branch-local ledger fallback. Record provider/model, candidate alternatives, actual capacity/UNKNOWN, route reason, attempts, failures, worktree ownership, tests, independent review and exact next action **as events occur**, not from retrospective guesswork.
- **Required paste-ready contents:** start instruction addressed to DeepSeek; goal and governing spec; pinned branch/PR/checkpoint instructions; safety/one-writer boundaries; routing and escalation ladder; acceptance and test plan; independent review; ledger destination and contents; terminal handoff and stop conditions. Supply enough detail to run without rereading the manager chat.
- If T3 Runtime or worker tools are unavailable, provide the executable local paste-ready handoff and mark **NOT DISPATCHED** rather than implying work has started.

This routing/communication policy applies to future authorized handoffs until superseded by a later user instruction. It is **not** authority to merge, publish, bypass limits or modify existing product decisions.

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
