# Feasibility: DeepSeek Superagent + Letta Code for T3 Fork

Date: 2026-11-03  
Status: RESEARCH FEASIBILITY / PROPOSAL ONLY / NO INTEGRATION OR PRODUCT DECISION

## Question and verdict

Can the proactive event-driven work intake and authorization patterns from DeepSeek's dsh-superagent prototype be combined with Letta Code's persistent memory and stateful agent identity? **Yes architecturally**; there is also an existing Letta ACP adapter suitable for a **bounded compatibility probe**. A working integration with T3 has **not** been demonstrated.

The preferred design is compositional, not two competing orchestration runtimes.

## Boundary and architecture

1. **T3 Project Runtime owns authoritative project truth:** project goals/specs, accepted decisions, tasks, handoffs, source/evidence refs, review decisions, execution attempts, provider provenance and authorization.
2. **DeepSeek-derived continuation policy (adapt patterns, not necessarily code):** subscribed source events/worker outcomes, deterministic admission, scoped immutable authorization/mandates, task ownership, duplicate suppression, retry limits, waiting-for-human classification, outbox/receipt patterns, deliberate silence and human-attention panel. Use existing T3 service/events; no second ticket/execution DB.
3. **Letta-derived experience memory:** opt-in per-agent or shared-project *advisory* context, compact recurring lessons, retrieved prior failures, skills and provenance-backed context files with Git history. Letta's memory changes cannot silently promote claims into accepted T3 project state. Only validated, explicitly admitted lessons can become governed instructions or accepted decisions.
4. **T3 provider-neutral worker boundary:** one frontier provider and one open-weight provider can be swapped; the same project-state records and work permissions still apply. A Letta stateful agent may be one optional T3-managed ACP worker, not a privileged new manager by default.
5. **Efficiency fast path:** deterministic event handling first, memory retrieval only when context needed, only bounded low-cost inference for ambiguous next actions, strong manager only for consequential judgment. Cap memory-reflection frequency and prompt size; measure net cost through verification.

Conceptual flow:

`GitHub/CI/worker result → T3 event and task reconciliation → deterministic authority gate → optional memory retrieval + low-cost recommendation → authorized T3 execution/review → verification/admitted lesson → T3 Runtime`

## Existing integration seam worth testing

Letta publishes [letta-acp](https://github.com/letta-ai/letta-acp), an ACP-over-stdio adapter. Current documentation describes:
- Local mode with state on the user's computer and an optional Ollama model provider.
- Reusing the same Letta agent across sessions via explicit agent identity.
- Implemented ACP session lifecycle, load/replay, model selection, permission callback and MCP tool injection.
- Limitations: no client-side terminal execution or ACP plan updates in the adapter documentation.
- Cloud mode stores agent memory outside T3; local mode is the privacy-preserving first probe.

T3 already supports ACP providers generally, but no evidence currently confirms Letta ACP is usable in this fork with correct session/restart, permissions, auth, routing or worktree isolation. **Do not call integration IMPLEMENTED or RUNTIME PASS.**

## Safety and portability hazards

- Letta agent memory is agent-owned and may contain unreviewed inferences; it is not equivalent to canonical project task truth. Memory poisoning and stale advice are possible.
- Letta's agent-state storage is separate from T3's. Offline project export/restore must succeed without the Letta service or agent identity; memory may improve quality but cannot be essential to continuation.
- Letta's README says full AgentFile import/export has been removed; memory and conversation transcript exports remain. Do not promise arbitrary agent identity migration across runtimes.
- DeepSeek's research prototype explicitly warns it is not production-ready; its Executor sessions run commands as the operator OS user without approval. Do not copy that security boundary.
- Integration may increase latency/cost through memory inference, MCP overhead or duplicate state. Measure before making memory retrieval the default.
- Scoped authorization must never be inferred from external comments, memory records, a worker's report or model judgment.

## Suggested low-cost pilot

1. Browser-side source compatibility review only: compare Letta ACP's published methods to T3's ACP driver and capability registration and map observed gaps.
2. In an isolated local test home, run one synthetic T3 Runtime task with an explicitly configured local Letta ACP agent, no production credentials. Verify ordinary execution, permission denial, handoff recording and restart/reload retention.
3. Repeat with memory disabled vs a small provenance-labeled prior lesson; compare token usage, prompt size, completed-task quality and additional tool latency. A memory benefit needs observable outcomes, not merely recall.
4. Simulate unavailability of Letta and of the frontier provider separately. Verify T3 project state is still recoverable and an alternate worker can resume at an authorized boundary without Letta memory.

Stop for authentication, third-party service cost, unexpected filesystem or outbound network access, worktree isolation mismatch, security conflict or source conflicts.

## Primary references

- https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/001-domain.md
- https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/002-authorization.md
- https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/003-execution.md
- https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/007-architecture.md
- https://github.com/letta-ai/letta-code
- https://www.letta.com/blog/context-repositories/
- https://docs.letta.com/concepts/stateful-agents
- https://github.com/letta-ai/letta-acp

Research only; no production changes, provider registration, new dependency or automatic event launches authorized.
