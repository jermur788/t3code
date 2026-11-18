# Independent cloud-model architecture review — T3 coordinator vs DeepSeek Superagent

Date: 2026-11-03  
Status: REVIEW REQUEST / NO DECISION / NO RUNTIME OR PRODUCTION CHANGE  
Target reviewer: independent cloud model capable of source-level software architecture and systems integration (prefer Claude Sonnet/Codex-class; use stronger model only if required). The current browser-side manager prepared this brief but **did not run the independent reviewer**.

## Request

Investigate, independently and skeptically, which route minimizes **total development, operating, verification and future maintenance cost** while preserving the governing product promise: T3 Fork's provider-neutral Project Runtime owns authoritative project state, and a non-developer can preserve project history and safely continue through substitute frontier or open-weight agents.

Compare fairly:

- **A — Continue native T3 coordination:** evolve existing Runtime/orchestration application services with a small deterministic completion/authorization/continuation policy; DeepSeek low-cost models can be manager/router workers through existing T3 providers. Borrow concepts from the Superagent prototype, but no Superagent runtime dependency.
- **B — DeepSeek Superagent as primary coordinator:** run the existing DeepSeek Superagent orchestration engine, integrated with T3 Project Runtime as canonical tasks/decisions/verification/permissions. Determine what it actually takes to avoid a duplicate ticket ledger, execution engine or authority.
- **C — Bounded hybrid or alternative:** DeepSeek Harness as an ACP worker, Superagent as a narrower event intake or project-specific worker only, or a thin bridge that preserves state ownership. Explain whether C is genuinely cheaper than A and B or just hides complexity.

**Do not infer that the cheapest DeepSeek *model* implies that its Superagent *software* should become T3's coordinator.** Likewise, do not assume sunk cost in T3 makes continuing it optimal. Recommend replacing any unnecessary T3 coordinator code when the external alternative genuinely earns its integration cost.

## Grounded facts to check

1. T3 has durable project tasks, append-only handoffs, source/decision references, routing, execution attempts, restart reconciliation, orchestration V2 command/event lifecycle and MCP. Inspect actual repo code, not just docs, and distinguish implemented from designed behavior.
2. T3 supports generic ACP command providers; its user documentation explicitly gives `dsh --profile acp` as DeepSeek Harness entrypoint. This **does not establish** that the Superagent's ticket/evaluation engine is controllable through ACP: ACP primarily exposes agent/session operations.
3. DeepSeek Harness is official MIT-licensed **developer-preview** software with compatibility-breaking changes and an explicit no-security-audit warning.
4. DeepSeek dsh-superagent-prototype is MIT licensed but explicitly **a research prototype**, not an official production product, with an application Engine, own Trigger/Thread/Eval/Mandate/Ticket/Assignment/Subscription Store and outbox/effect lifecycle. A default Executor executes shell commands without approval as the operator OS user. Its scope is one GitHub repo per deployment, not generic multi-project T3 Runtime.
5. Published Superagent package targets a prerelease DSH dependency range; evaluate exact tested version pair, release strategy and likely T3 maintenance burden instead of inferring compatibility from semver.
6. Our previous DeepSeek model-level routing/orchestration trials are user-supplied evidence that the DeepSeek model was a reliable low-cost orchestrator in that benchmark, but are **not** an end-to-end verification of DeepSeek Superagent in T3.
7. Browser-based ChatGPT remains optional. Do not require a browser↔T3 automation bridge or assumption of a free browser token allowance.

## Direct source references

**T3 Fork**:
- https://github.com/jermur788/t3code/blob/main/docs/internals/project-runtime.md
- https://github.com/jermur788/t3code/blob/main/docs/internals/runtime-routing.md
- https://github.com/jermur788/t3code/blob/main/docs/orchestration-v2/orchestrator-mcp-server.md
- https://github.com/jermur788/t3code/blob/main/docs/orchestration-v2/rte-040-execution-bridge.md
- https://github.com/jermur788/t3code/blob/main/docs/orchestration-v2/rte-050-recovery-cancellation.md
- https://github.com/jermur788/t3code/blob/main/docs/internals/adding-a-provider.md
- https://github.com/jermur788/t3code/blob/main/docs/user/providers-acp.md
- https://github.com/jermur788/t3code/blob/main/apps/server/src/projectRuntime/RuntimeTaskExecutionService.ts
- https://github.com/jermur788/t3code/blob/main/apps/server/src/projectRuntime/ProjectRuntimeService.ts
- https://github.com/jermur788/t3code/blob/main/apps/server/src/projectRuntime/OrchestrationEvidenceService.ts
- https://github.com/jermur788/t3code/blob/main/apps/server/src/projectRuntime/AdaptiveRoutingService.ts
- https://github.com/jermur788/t3code/blob/main/docs/internals/fork-product-direction.md

**DeepSeek**:
- https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/README.md
- https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/001-domain.md
- https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/002-authorization.md
- https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/003-execution.md
- https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/007-architecture.md
- https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/package.json
- https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/LICENSE
- https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md
- https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/acp/acp/README.md
- https://github.com/deepseek-ai/deepseek-harness/blob/master/SAFETY.md
- https://github.com/deepseek-ai/deepseek-harness/blob/master/LICENSE

Research supporting branch and separate proposal (not governing spec):
- https://github.com/jermur788/t3code/pull/20

## Required comparison / research method

1. Map existing **T3 task authority**, **orchestration lifecycle**, **provider interface**, **worktree/permissions**, **review evidence**, **restart/replay**, and **source-of-truth APIs** to corresponding DeepSeek Superagent concepts. Mark each as direct reuse, simple adapter, schema translation, duplicated ownership, replacement, or unproven.
2. For option B, identify **minimum real code modifications** or bridge interfaces needed for Superagent to accept T3 tasks, authorize against T3, execute through T3-approved providers/worktrees, and report evidence/accepted outcomes back. Distinguish minimal interoperability from complete authority delegation. Test whether its Store can remain local derived/cache only without bifurcated truth.
3. For option A, identify **minimum missing continuation features** and where they fit within currently existing Runtime/Orchestrator services. Do not overstate unfinished code.
4. For option C, explain exactly what value exists beyond plugging DeepSeek Harness ACP into T3 and using a DeepSeek model through our existing providers. If implementation is equivalent to A plus a second database, reject as duplication.
5. Address non-coder operator experience and when the human must approve; no unreviewed merges or unsafe shell execution.
6. Explain upstream maintenance strategy: track DSH/Harness version pins, exact T3 extension points, wrappers vs code forks, security updates, testing gates; whether our ability to fork mitigates abandonment and at what cost.
7. Compare costs in **effort bands and dependencies**, not invented dollar/token totals: initial integration, end-to-end verification, expected maintenance for first 3/6/12 months, number of trust boundaries, migration/recovery burden, and measured vs unknown model/runtime cost.
8. Identify a cheap **reversible spike** that directly falsifies a key assumption (e.g. Superagent can be orchestrator with T3 Runtime still canonical, without a second task owner). It must run in isolated home/branch with synthetic tasks, no production credentials.
9. Identify what a first attempt should prove in one integration test: terminal worker event → authorized next action → independent review → evidence + task reconciliation → restart → provider swap, no duplicate dispatch.
10. Consider whether maintaining two orchestration engines would violate upstream-friendly T3 principles. Be explicit when a design would require changing upstream internals and create ongoing rebase hotspots.

## Deliverable and acceptance

- Executive verdict: A, B, C or defer, plus reasons and confidence.
- At least one fair steelman for each of A and B and strongest counterargument to the winner.
- Component-by-component overlap/seam table with source pointers.
- **Smallest implementation step** to discriminate alternatives with pass/fail criteria and expected engineering scope.
- Risk register: security, failover/project portability, upstream drift, local/cloud cost, operational failure/recovery, auth, privacy, maintenance.
- States labelled: source-inspected, static hypothesis, tested runtime, unverified.
- Decision thresholds: what evidence would cause reversal, not just a single preferred option.
- Do not claim to have run tests unless real logs and environment evidence support them.

## Boundaries / safety

Read-only research and design only. No production routing/profile/adaptive changes, no benchmark launches, no CCF changes, no merges, no credential manipulation, no external upload of private Runtime data. The ongoing benchmark credential issue is unrelated; do not consume its test resources.

Stop for product choices, meaningful paid infrastructure cost, security-sensitive modifications or incompatible ownership models.

## Handoff to the manager

Return **VERDICT; BASE and inspected revisions; RESULTS with source evidence; VERIFICATION and gaps; BLOCKERS by class; DESIGN OPTIONS; RECOMMENDED REVERSIBLE SPIKE; NEXT ACTION; and anything requiring user authority.** The reviewer opinion is advisory, not an accepted product decision, and the project manager must reconcile it with canonical Current State and actual repo/runtime implementation.
