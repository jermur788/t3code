# Research: Provider-independent project continuity and AI development orchestration

Date: 2026-11-03  
Status: RESEARCH / NOT A PRODUCT DECISION / NOT VERIFIED FOR T3 INTEGRATION

## Research question

Which public projects or research programs most closely support a non-developer managing software development across interchangeable frontier or open-weight models **without losing project truth, provenance, tasks, accepted decisions, reviews, or execution evidence** when providers/harnesses change?

Not equivalent: *switching an LLM in a chat*, *switching an agent harness*, and *preserving canonical project state across both*.

## Ranking method

Qualitative research relevance to T3 Fork, not popularity or objective product quality. Consider (1) durable provider-independent project state, (2) model/harness replaceability including local models, (3) automated planning/continuation/review with evidence, (4) non-developer operator UX, (5) ease of reusing ideas without a second orchestration engine. Scores are intentionally omitted: evidence is not uniform, many projects have research claims rather than independent qualification.

## Ranked landscape

| Rank | Project | Distinctive, source-supported capability | Gap / caution for T3 |
| --- | --- | --- | --- |
| 1 | [Microsoft Argus](https://github.com/microsoft/ArgusAgent) | Persistent Manager → Planner → Engineer ↔ read-only Reviewer; role-specific authority, evidence admission, multiple CLI backends, human gates; [paper](https://arxiv.org/abs/2608.05144) | Most relevant architectural comparator, but author-reported autonomy performance is not independent verification; avoid replacing T3 Runtime |
| 2 | [OpenHands Agent Canvas / SDK / Hub](https://github.com/OpenHands/software-agent-sdk) | Open-source browser control surface, local/self-host/cloud runtime options, multiple model and ACP agent backends; persisted events/conversation, state restoration and model changes | Agent/conversation persistence does not on its own establish canonical accepted project decisions or task truth |
| 3 | [Cloudroom](https://github.com/davidondrej/cloudroom) | Self-hostable session history, multiple harnesses, cloud/local isolation and transfer, loops and historical workflow scan | Session portability and loop suggestions are not a verified provider-neutral project-governance ledger; hosted features/plan dependencies |
| 4 | [DeepSeek dsh-superagent prototype](https://github.com/deepseek-ai/dsh-superagent-prototype) + [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) | Event intake and tickets, scoped router/worker, GitHub-triggered work, durable event/authorization structure, extensible plugin harness | Author calls the superagent a research prototype, not production; single repo; permissive OS execution, security boundary requires redesign |
| 5 | [Letta Code](https://github.com/letta-ai/letta-code) | Durable agent identity across conversations, git-backed memory, configurable models, cloud/local/self-host deployments, recall and skills | Remembered agent context is not synonymous with verified decisions; cloud/local state location must be explicit and export tested |
| 6 | [Mastra](https://github.com/mastra-ai/mastra) | TypeScript agents/workflows with persisted checkpoints, suspension, recovery, approvals and usage aggregation | Framework rather than non-developer project manager; review restart/duplicate-resume boundaries before borrowing |
| 7 | [LangGraph](https://github.com/langchain-ai/langgraph) | Checkpointers for execution-thread recovery; stores for cross-thread data; human interrupts/resumption | Framework state alone does not define project/task authority; T3 already has analogous lifecycle storage |
| 8 | [Temporal](https://github.com/temporalio/sdk-typescript) | Deterministic durable workflows, history/replay, retries, recovery and model-call activity isolation | Excellent technical reference but heavy dependency and competing workflow engine likely inappropriate for upstream-friendly T3 |
| 9 | [goose](https://github.com/aaif-goose/goose) | Open local desktop/CLI/API agent; 15+ model providers including Ollama; MCP extensions | Strong fallback worker/harness, less direct evidence of canonical multi-agent project governance |
| 10 | [Cline](https://github.com/cline/cline) and [n8n](https://github.com/n8n-io/n8n) | Cline supplies model-neutral Plan/Act coding and rules; n8n supplies user-accessible deterministic workflow/agent automation | Valuable UX/workflow patterns, but both require a separate durable project truth and reviewed acceptance layer for T3 goal |

## Related empirical research

- [RoadmapBench (May 2026)](https://arxiv.org/abs/2605.15846): long-horizon, multi-file, version-level software development remains difficult; validates a need for outcome-level verification rather than call latency.
- [The Horizon Gap (Aug 2026)](https://arxiv.org/abs/2608.06663): separates long task horizon, context length, and cross-task persistence; maps memory/planning/execution/evaluation shortcomings.
- [AMA-Bench (ICML 2026)](https://proceedings.mlr.press/v306/zhao26bs.html): agent memory evaluation should track trajectories and tool/environment observations, not only chat recall.
- [Argus (Aug 2026)](https://arxiv.org/abs/2608.05144): role-specific trust/admission and externally persisted project state.

## Research conclusions for T3 Fork

1. **Provider failover is a project-level invariant, not a UI model-picker feature.** The user must retain accepted decisions, tasks, ownership, review state, execution history and evidence even if the active model, provider, subscription, agent or conversation becomes unusable.
2. **Open-weight fallback must be qualified**, not promised. A local model needs a compatible harness, tools, sufficient hardware/capacity and task-specific verification. Some difficult work may become slower or blocked; continuity of project data and authority should still work.
3. **Borrow principles, not an orchestration engine.** T3 already has project Runtime, handoffs, execution attempts, recovery, orchestration events/MCP and adaptive evidence. Avoid duplicating these with LangGraph/Temporal/Argus data stores.
4. **Non-developer experience is central:** present a plain-language project cockpit with goal, current milestone, trusted decisions, verification status, blockers, what the system will do next and what needs user authority.
5. **Portable export/restore should be tested offline:** project specs and sources + accepted-state ledger + task/handoff execution history + provenance and evidence refs + provider-neutral routing intent. Separate encrypted credentials, which require re-authentication on new providers.
6. **Failover qualification scenario:** start with a frontier model, persist a complex in-progress task, disable the provider, restore/reopen using a different local/open-weight model through another harness, verify that canonical project state is unchanged and execution resumes only at an authorized boundary. Include schema/version migration, machine restart, read-only independent review, and honest failure classification.
7. **Efficiency:** prioritize deterministic completion/reconciliation, no-model-call routing fast paths, structured short handoffs, selective model escalation, measured cost to verified results.

## Immediate follow-on research priorities

- **Argus deep technical comparison**: inspect role authority model, manager event loop, proof ledger, resumption semantics, provider adapter boundary, and nondeveloper UX. Compare with T3's existing Runtime and note what is novel.
- **OpenHands SDK/Hub capability comparison**: test portable agent/conversation restoration across model and ACP harness, preservation of external task truth, cost measurement and sandbox boundaries.
- **Cloudroom vs Letta**: examine durable session/agent memory, export/self-host and what is lost on changing providers, harnesses or host machine.
- **DeepSeek Superagent**: continue existing T3-specific analysis, distinguish paper architecture from prototype, especially event intake, scope/authorization, retries and security.
- **User-facing fallback readiness**: propose project export/restore and a provider-offline drill as a feature acceptance test; do not change production model routing merely because fallback is visible.

## Evidence and claims

These are source-code/documentation observations and an analytical relevance ranking. No cross-provider T3 failover run or installation of third-party tools was performed. Vendor self-reported autonomy performance and compatibility should not be treated as independently verified. Historical releases and prototype labels are not interchangeable with integration status.

Relevant primary sources:
- https://github.com/microsoft/ArgusAgent
- https://www.microsoft.com/en-us/research/publication/argus-a-general-purpose-agentic-runtime-for-long-horizon-reasoning/
- https://github.com/OpenHands/software-agent-sdk
- https://github.com/OpenHands/docs/blob/main/openhands/usage/agent-canvas/overview.mdx
- https://github.com/davidondrej/cloudroom
- https://www.cloudroom.dev/docs/harnesses
- https://github.com/deepseek-ai/dsh-superagent-prototype
- https://github.com/deepseek-ai/deepseek-harness
- https://github.com/letta-ai/letta-code
- https://docs.letta.com/concepts/stateful-agents
- https://github.com/mastra-ai/mastra
- https://github.com/langchain-ai/langgraph
- https://github.com/temporalio/sdk-typescript
- https://github.com/aaif-goose/goose
- https://github.com/cline/cline
- https://github.com/n8n-io/n8n

Do not promote this research note into a governing specification without an accepted user/product decision.
