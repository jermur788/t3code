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

## Precise existing T3 continuation seam (second read-only inspection)

- [RuntimeTaskExecutionService.ts](https://github.com/jermur788/t3code/blob/main/apps/server/src/projectRuntime/RuntimeTaskExecutionService.ts): `reconcileAttemptRow` maps terminal Orchestration V2 run status into the persisted Runtime attempt and links the matching-thread handoff. `reconcileAttempt` is explicit, and `reconcileActiveAttempts` is called for startup/recovery. This currently does **not** establish a live, continuous next-action dispatcher for every terminal worker event.
- The same service's `execute` already checks task revision, active attempt, routing and a caller request key, and persists a pending attempt before launching. Automatic continuation must call this guarded seam instead of making its own worker-launch path.
- [EventSink.ts](https://github.com/jermur788/t3code/blob/main/apps/server/src/orchestration-v2/EventSink.ts) provides `writeWithEffects`, conditional writes, committed-event publication and command receipts; [EffectOutbox.ts](https://github.com/jermur788/t3code/blob/main/apps/server/src/orchestration-v2/EffectOutbox.ts) already persists idempotent queued effects and recovery receipts, with [EffectWorker.ts](https://github.com/jermur788/t3code/blob/main/apps/server/src/orchestration-v2/EffectWorker.ts) as the effect executor. However, the existing effect request schema is deliberately closed to known orchestration effect types. Reusing this outbox for fork-owned task continuation **requires an explicit compatibility and dependency-boundary review**, not blindly adding a new effect type to upstream internals.
- [Argus stage ops](https://github.com/microsoft/ArgusAgent/blob/main/argus/manager/_stage_ops.py) offers a concrete example of checking a clean independent reviewer verdict plus a current-context fingerprint before an extra Manager model turn, closely matching T3's revision-based safety requirements.
- [Argus MCP plugin](https://github.com/microsoft/ArgusAgent/blob/main/argus/plugin/mcp_server.py) exposes project creation/listing, message, status, diagnostics, stop and artifacts, **not** external ownership injection for T3 task truth. Argus-as-complete-coordinator is therefore not a proved drop-in path, even though its source is MIT-licensed.

**Implementation implication:** First decide whether a small fork-owned after-commit listener/continuation receipt is enough, with no new table, or whether limited durable state is required. Do not modify upstream EventSink or EffectWorker until source-level review proves the extension is safe and cheaper than a fork-owned service.


## 2026-11-03 addendum: attached upstream-first study and real-run progress evidence

**Source status:** attached eight-page *Upstream-First Strategy for T3 Fork* is secondary/advisory architecture research, not a governing decision. A separate supplied Runtime timeline describes the 2026-11-03 DeepSeek/CCF qualification; its reconstruction has not been independently replayed in this browser session. Both are additional evidence, not proof of runtime integration.

### Upstream-first capability ownership

The study argues that T3's current Orchestration V2 is an app-owned, provider-neutral execution and event substrate rather than a thin agent UI. It recommends checking upstream main, issues, discussions, PRs and forks before fork-specific implementation; generic execution semantics, receipts, delegated continuation, wakeups, provider lifecycle, worktree handling and context efficiency belong upstream when possible. Fork-owned capabilities remain authoritative specs, accepted decisions, dependency-aware project tasks, review/verification policy, autonomous next-work selection and non-developer governance.

**This does not close the prior Argus-versus-DeepSeek-versus-T3 build/reuse comparison.** The attached study itself treats the architecture comparison as its next input. In particular, Argus as potential coordinator has not yet received the same independent review as DeepSeek.

Specific source references:
- Upstream Orchestration V2 [overview](https://github.com/pingdotgg/t3code/blob/main/docs/orchestration-v2/README.md), [core graph](https://github.com/pingdotgg/t3code/blob/main/docs/orchestration-v2/core-graph-and-data-model.md), and [orchestrator MCP](https://github.com/pingdotgg/t3code/blob/main/docs/orchestration-v2/orchestrator-mcp-server.md).
- [Persistent initiatives idea](https://github.com/pingdotgg/t3code/discussions/16269) and [project-scoped memory proposal](https://github.com/pingdotgg/t3code/discussions/15858): community proposals, **not accepted upstream implementations**.
- [Orchestration-context efficiency proposal](https://github.com/pingdotgg/t3code/discussions/17253): reports an instruction-text reduction of ~21% in one block; actual provider token savings unverified.
- [Review resumption issue](https://github.com/pingdotgg/t3code/issues/28734): open when checked on 2026-11-03.
- [Antigravity async-child wake issue](https://github.com/pingdotgg/t3code/issues/17412): GitHub API shows closed on 2026-11-02 for lack of information; subsequent reports say it still reproduces. [PR #30083](https://github.com/pingdotgg/t3code/pull/30083) proposes continuation/streaming fixes and is **open, unmerged** on 2026-11-03. Do not equate closed issue with verified resolution. Separate [wake and paragraph streaming PRs](https://github.com/pingdotgg/t3code/pull/28204) and [#28221](https://github.com/pingdotgg/t3code/pull/28221) also remain open on the inspection date.

### Supplied DeepSeek run progress correction (separate, user-supplied evidence)

A separate supplied execution analysis finds that an agent-authored twelve-item todo list stopped receiving updates while T3 Runtime continued storing tool and run events. The user-visible display was stale for ~4h51m of a ~4h54m run, with ~4h24m in serial Unity tests and an ~1h01m invalid Unity method wait. The qualification was still **BLOCKED / NEEDS MORE EVIDENCE**, not VERIFIED. Neither model reasoning time nor tokens are instrumented. Thus:
- Do not treat displayed plan item number as authoritative Runtime progress or as model-performance evidence.
- Separate **agent-authored plan snapshot**, **actual event/step heartbeat**, **Runtime task/attempt state**, and **review/qualification verdict** in both research and eventual UX.
- Treat plan freshness, append-only plan versions, declared revision and explicit current-step evidence as a **candidate generic T3 observability improvement** only after checking upstream discussions/PRs/code. Do not mix it into the continuation spike or CCF production work.
- Use the run to motivate telemetry: measure model turn latency, tools/tests/waits, retries and final verified outcome separately, not elapsed UI-label time.

### Updated research and implementation gate

1. First complete an evidence-backed *current-upstream and community overlap map* for every proposed fork implementation primitive. Where upstream already owns a receipt/outbox/recovery guarantee, remove the duplicate fork item or narrow it to an integration/policy adapter.
2. Finish independent Argus vs T3 upper-layer comparison and precise DeepSeek component reuse/migration economics. Distinguish generic orchestration runtime from project-level task authority.
3. Make explicit owner/adopter decisions for each atomic capability: upstream candidate, existing upstream, thin T3-fork policy, optional worker/memory, or defer.
4. Re-evaluate the isolated stub continuation experiment. Prefer T3's existing execution and effect lifecycle; don't add new tables or fork an upstream runner absent a proved gap. Keep this spike **unstarted** until the comparison and governing spec are reconciled.
5. Track the progress-UI analysis as a separate observability candidate, pending source validation and user-facing rendered testing if implemented.

**Status:** research and source recon completed in browser; no code, deployment, upstream contribution, test or provider change.


## Next browser-capable research handoff — comparative architecture gate

**TASK / ROUTING:** Browser-side Overall Manager, read-only GitHub source/research, no external agent needed. This is an architectural research task, not a local implementation assignment.

**BASE / CONTEXT:** Compare the live upstream `pingdotgg/t3code` main, fork `jermur788/t3code` main, current Argus and DeepSeek source at known inspected revisions; refresh every head before final findings. Use this document and the attached *Upstream-First Strategy* as research; the accepted [fork product direction](https://github.com/jermur788/t3code/blob/main/docs/internals/fork-product-direction.md) and current Project Runtime/coordination sources govern authority.

**GOAL:** Decide, with code-level evidence, which *atomic* continuation/review/authority/observability capabilities are already provided by upstream, should be contributed upstream, should remain fork-specific policy, can be imported from Argus/DeepSeek, or should be deferred.

**IN SCOPE:**
1. Read current T3 orchestration V2 event/receipt/effect/continuation services, Runtime execution/review/evidence contracts and their focused tests. Compare fork vs upstream rather than relying only on docs.
2. Investigate Argus as a possible **upper-layer project coordination policy** replacement: list exact project/mission/stage/reviewer interfaces, external write APIs, durable state owners, package coupling, provider independence, error/replay semantics and minimal adapter boundaries.
3. Investigate DeepSeek Superagent's Event/Policy/Eval/Mandate/Outbox seams only to identify independent reusable concepts or code; do not assume ACP transports its coordination engine.
4. Inspect live upstream PRs/issues/discussions for overlap. Record **proposal vs open PR vs merged main vs tested** separately, and whether upstream wants contributions.
5. Classify real-run 12-item todo staleness as distinct progress-observability source question; look for existing upstream plan revision/heartbeat features and candidate patch scope without building them.
6. Deliver an owner/reuse matrix, maintenance cost bands, strongest counterarguments to winning architecture, and precise pass/fail criteria for any remaining synthetic experiment.

**OUT OF SCOPE:** no code modifications, source migrations, subagent installs, credentials, paid inference, CCF/Unity runs, project-state rewrites, implementation starts, PR merges or outreach to upstream without separate authorization.

**OWNERSHIP:** Read-only source inspection; GitHub draft research branch may be updated by one documentation writer. T3 Runtime, upstream T3 execution graph and user-owned project authority do not change.

**ACCEPTANCE:** All material claims link to exact source file/function or discussion/PR; no second authoritative task/attempt store proposed; actual upstream implementation distinguished from pending proposals; Argus direct-embed constraints explicitly examined; total-effort and token-measurement uncertainties noted; selection criteria remain reversible and user controls product choice.

**VERIFICATION:** Source-level only (`SOURCE-INSPECTED`); no `RUNTIME PASS` claimed. If a code experiment is recommended, define isolated stub task(s), replay/restart/idempotence/security negative tests and acceptance criteria. Reconcile with Current State (Documentation V1 remains separately pending), record updated source base and handoff.

**STOP CONDITIONS:** user decision on replacing accepted Project Runtime authority, upstream contribution identity/public disclosure, paid infrastructure, destructive operations, material scope expansion or unresolved security conflict.

**HANDOFF RETURN:** Verdict/alternatives, source revisions and links, implementation truth vs claims, capability matrix, maintenance/rebase risks, verification gaps, blocker classification, recommended smallest next task, state/PR changes and product decision (if any) requiring user action.


## Evidence limits

This is browser source inspection, not an installation, runtime test, security audit, or independent review. Claims about live multi-day autonomy, speedups, cost or installed compatibility remain external authors' reports. The current user priority is to maximize verified outcomes per token and preserve project truth across providers; no production route, integration or adoption of Argus, OpenHands, DeepSeek Superagent, Cloudroom, Letta or Mastra is authorized by this note.
