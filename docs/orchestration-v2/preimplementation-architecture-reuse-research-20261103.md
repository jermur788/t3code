# Pre-implementation comparative research: automatic continuation and project governance

Date: 2026-11-03
Status: READ-ONLY SOURCE RESEARCH / ADVISORY / NO IMPLEMENTATION
Scope: reduce needless T3 orchestration code before the planned stub-provider continuation spike.
Owner: browser-side Overall Manager; not an independent runtime review.

## Question

Should T3 first inspect the most comparable open-source project-management and agent-orchestration systems before implementing its own continuation logic?

**Yes.** The focus is not picking a replacement framework; it is identifying small, validated design patterns T3 lacks and avoiding duplicated execution/state ownership. This report records the initial code/documentation archaeology performed in the browser. No tests, installations or external agent calls were run.

## Immediate-relevance ranking

| Rank | Source | What the inspected implementation actually has | Ideas worth testing in T3 | Do not import blindly |
| --- | --- | --- | --- | --- |
| 1 | [Microsoft Argus](https://github.com/microsoft/ArgusAgent) | Official public MIT-licensed repository; persistent Projects → Missions → Roles → provider sessions; role-owned review and stage transitions; durable event log/mission history, learned skills and evidence admission; multiple backend CLIs including DSH. [Core concepts](https://github.com/microsoft/ArgusAgent/blob/main/docs/CORE_CONCEPTS.md), [layout](https://github.com/microsoft/ArgusAgent/blob/main/docs/LAYOUT.md), [stage decision code](https://github.com/microsoft/ArgusAgent/blob/main/argus/manager/_stage_ops.py) | (a) Fast direct path for short engineering tasks; (b) no redundant Manager semantic vote after a clean independent reviewer verdict; (c) explicit role authority and evidence admission; (d) bounded context packet and per-role cost accounting | Its own Python project database, mission runner, role sessions, backlog and daemon would replace/compete with T3; author-reported autonomy benchmarks are not T3 evidence |
| 2 | [DeepSeek Superagent prototype](https://github.com/deepseek-ai/dsh-superagent-prototype) | MIT research prototype; [single transactional Engine](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/src/core/engine.ts), [domain](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/001-domain.md) and [authorization](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/002-authorization.md); [outbox](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/src/app/outbox.ts) atomically records receipts/effects; event source Trigger and authorized Mandate are distinct | Deterministic intake/idempotence, explicit scope, queued after-commit effects, context-only subscriptions not gaining authority, human-question state, failed-ticket hold; edge-case tests | Its own Ticket/Assignment/Store lifecycle, DSH alpha plugin host, default unsafe command execution; not a drop-in ACP coordinator |
| 3 | [OpenHands Automation + SDK](https://github.com/OpenHands/automation) | Beta automation service owns webhooks/cron/runs and dispatch; [dispatcher](https://github.com/OpenHands/automation/blob/main/openhands/automation/dispatcher.py) has multi-worker locking, async terminal callbacks, retryable vs permanent errors; [models](https://github.com/OpenHands/automation/blob/main/openhands/automation/models.py) persist integration-event IDs and run linkage; SDK's conversation owns agent execution and persist-before-publish events | Separate event admission from execution; coalescing repeat external events; narrow event-to-run boundary; explicit idempotency and classification of provider errors | Its extra service, database and Python backend would duplicate T3's event/attempt lifecycle |
| 4 | [Cloudroom](https://github.com/davidondrej/cloudroom) | [Harness adapters](https://github.com/davidondrej/cloudroom/blob/main/core/docs/harnesses.md) separate process ownership from agent inference; [session lifecycle](https://github.com/davidondrej/cloudroom/blob/main/core/docs/session-lifecycle.md) preserves accepted requests, stable request IDs, uncertainty states, saved session history, sleep/recovery | Do not replay uncertain side effects; durability barriers before acknowledgement; recover after outage without turning missing history into false success | Native session owner/runtime and local/cloud replication machinery overlap with T3; more useful for later provider-failover qualification |
| 5 | [Letta Code / Letta ACP](https://github.com/letta-ai/letta-code) | Agent experience memory with Git-versioned context and local ACP interface. [Letta ACP](https://github.com/letta-ai/letta-acp) offers optional stateful worker integration | Retain provenance-labelled lessons, permit optional experience memory, measure saved context | Treating memory as accepted project truth, or requiring Letta for restart portability |
| 6 | [Mastra](https://github.com/mastra-ai/mastra) | TypeScript agent workflows/checkpoints and [memory module](https://github.com/mastra-ai/mastra/tree/main/packages/memory) | Potential later study of observational memory/compaction | Full workflow engine over existing T3 lifecycle without evidence of lower net cost |

**Correction:** Argus is not closed source. Its [MIT licence](https://github.com/microsoft/ArgusAgent/blob/main/LICENSE) permits modification and forking, subject to copyright/notice retention. Microsoft Research publishes [the technical report](https://www.microsoft.com/en-us/research/publication/argus-a-general-purpose-agentic-reasoning-runtime-for-long-horizon-tasks/).

## Most significant discovery: Argus's own token-overhead problem

Argus's [architecture simplification plan](https://github.com/microsoft/ArgusAgent/blob/main/docs/architecture-simplification-plan.md) documents a short coding task that initially incurred excessive Planner/Manager/Reviewer calls, even after a reviewer had clean evidence. The documented remedy is a direct execution path: skip Planner for simple tasks and avoid a second semantic decision after a clean independent review if deterministic completion checks suffice. Their historical single-task numbers are *author-reported*, not comparative proof for T3.

Their [stage-transition code](https://github.com/microsoft/ArgusAgent/blob/main/argus/manager/_stage_ops.py) implements a clean-review fast path guarded by context fingerprints and a shared-lock commit to reject stale decisions. T3 should test equivalent semantics using its existing revision/attempt guards, not introduce a second ledger.

**Architectural warning:** Argus itself is a sizeable Python system with backlog/event/mission stores and ongoing architecture simplification. Reusing its *tested mechanisms* is lower-risk than embedding its full runtime in T3.

## Implications for the T3 continuation spike

Keep one T3 authoritative project task and execution graph. Revise detailed implementation planning to account for these checks:

1. **Fast-path rule:** Automatically dispatch only a next action previously authorized by T3; do not use a model simply to acknowledge a terminal event. Explicitly measure routing/manager/reviewer token overhead per accepted result when real providers are introduced later.
2. **Review provenance rule:** A worker terminal `completed` is not verification. Syntactically passing evidence is not itself independently authenticated. Tie admitted evidence to the correct task, attempt, review identity and expected state; block stale or contradictory verdicts.
3. **No second verdict rule:** If review passes and all deterministic acceptance gates hold, do not make an additional Manager semantic call. For disputed/ambiguous reviews, escalate.
4. **Event intake rule:** External GitHub/CI or model data is context, not authority. Deduplicate event and action receipts, handle failed after-commit dispatch and preserve uncertainty across restart.
5. **Error rule:** Differentiate missing evidence, permanent authorization failure, transient provider outage and ambiguous execution. Never automatically retry a completed side effect or treat missing history as success.
6. **Safety:** Real shell actions must use existing T3 permission/worktree controls; external prototypes' defaults are not T3 security guarantees.

Before writable implementation, inspect concrete existing T3 service/event hooks and tests to avoid duplicating a code path already present. The current [stub-provider spike](https://github.com/jermur788/t3code/blob/planning/resource-efficient-continuation-20261103/docs/orchestration-v2/continuation-stub-provider-spike-task-20261103.md) remains a separate, draft implementation task, not a passed test.

## Research sequencing

- **Browser completed:** public licence and architecture checks; T3 Runtime and Superagent code review; Argus role, event log, stage authority and short-path analysis; OpenHands dispatcher/event source separation; Cloudroom request/receipt persistence; Letta/Mastra integration-shape inspection.
- **Next, before implementation:** a narrow code-to-code mapping for Argus clean-review admission vs T3 task verification, and DeepSeek outbox/eval receipts vs T3 execution service; check exact test seam. This should produce a small accepted governing spec and only one code lane. Existing independent Sonnet comparative review favors native T3 coordination; this research adds failure-mode details rather than overturning that conclusion.
- **Then:** isolated synthetic continuation experiment with existing T3 Runtime, no keys or models. Require replay, restart, stale-evidence and idempotency negative tests, independent code review. This work is local-tool-dependent and should be routed to T3 Code only after source/spec comparison.

## Evidence limits

This is browser source inspection, not an installation, runtime test, security audit, or independent review. Claims about live multi-day autonomy, speedups, cost or installed compatibility remain external authors' reports. The current user priority is to maximize verified outcomes per token and preserve project truth across providers; no production route, integration or adoption of Argus, OpenHands, DeepSeek Superagent, Cloudroom, Letta or Mastra is authorized by this note.
