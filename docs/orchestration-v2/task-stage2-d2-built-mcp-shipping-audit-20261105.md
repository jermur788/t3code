# Stage 2 / D2 — compare actual built agent-facing tool schemas

**Status:** TASK PACKET PREPARED / NOT DISPATCHED. **Authority:** user-accepted D2 public shipping exclusion requirement; read-only local build/test qualification only, no source implementation or release. **Browser plan:** [D2 shipping-surface audit](d2-shipping-exclusion-audit-plan-20261105.md).

## Paste into T3 Code — DeepSeek orchestration-only task

> **DeepSeek — supervise only.** Read Project Instructions → Current State → Coordination Protocol → D2 plan. Choose the least costly authorized worker with verified quota evidence or UNKNOWN. Do not code, run tests, edit, package artifacts or use paid providers yourself.
>
> **Objective:** use the *actual built local server and schema enumeration* to determine whether the current merged fork `main` has any experimental continuation exposure, and exactly what would leak into MCP `tools/list` if the isolated experiment were integrated. D2 requires excluding experimental agent-facing tool-schema overhead before public shipping; a default-off gate is not enough.
>
> **Exact code checkpoints at packet writing:** `main` `fb67545d790c5c001e8f85827f219ab6493c435e`, `experiment/continuation-default-off-gate-20261104` `b3b8da54e0b8b184a1cf4e667d53e73e04f85074`. Re-fetch both. Preserve existing worktrees and any local stale main. Use independent clean/owned **read-only source worktrees** for separate builds with isolated generated artifacts and disposable .t3 state; no product source writes or merges.
>
> **Worker:** Codex GPT-6.1 SOL Medium or Claude Sonnet 5.5 Medium. Independent read-only reviewer from different provider/model.
>
> **A. Source surface:** inspect `packages/contracts/src/projectRuntime.ts` and `apps/server/src/mcp/toolkits/project/runtimeTools.ts` plus generated OpenAPI/JSON Schema/client bindings, `agentContextBudget.json`, and generated tool definitions. Track operator-only `continuation` fields versus server internal data, agent MCP create/update schemas and any desktop/mobile/WebSocket exposure. Do not claim TypeScript types disappear from runtime schemas without proof.
>
> **B. Real schema measurement:** run local builds/stub-mode server/testkit as supported for *both separate checkpoints*. Enumerate the **actual** `tools/list` through supported MCP authorization/test harness. Never forge/bypass session tokens. Capture sanitized diff of tool names/property paths, serialized UTF-8 bytes and exact config/profile. Compare equalized environment and contract versions, not stale snapshots. Recompute source and tool budget; worker-reported historical +646 bytes is only context.
>
> **C. D2 analysis:** record whether current shipping baseline truly advertises no continuation field and what minimal build/source exclusion mechanism would be needed *if* future integration is approved. Propose static source check **and** built-tool-list release gate; ensure normal Runtime tasks and provider-neutral MCP tools remain functional. If actual MCP enumeration cannot run without a live provider, classify `OPERATIONAL BLOCKER` and use testkit only with precise scope, not an invented PASS.
>
> **D. Review/ledger:** distinct-provider read-only review of actual logs/schema comparisons and no-secret provenance; record exact commands, tests, runtime config, model/effort, provider quotas/reset evidence or UNKNOWN, worktree ownership and next safe task in Runtime or restricted local append-only ledger.
>
> **Return:** VERDICT / REFS / BUILT TOOL-LIST ACCESS / NAME+SCHEMA+BYTE DIFF / CONTEXT BUDGET / CLIENT CONTRACT SURFACES / D2 SHIPPING STRATEGY OPTIONS / CI TEST PROPOSAL / REVIEW / CAPACITY LEDGER / NEXT.
>
> **No source changes, paid providers, branch pushes/commits, upstream PRs, fork-main merge, evidence-publication or public release.** `D2 RESEARCH/AUDIT PASS` does not mean `D2 SHIPPING VERIFIED` until a specific built public artifact passes the approved release check.

**Why local:** no trusted built server/MCP environment or provider session is accessible from this browser manager; GitHub source review alone cannot establish tool-list bytes.
