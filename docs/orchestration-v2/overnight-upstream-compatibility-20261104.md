# O3 — Upstream compatibility reconnaissance (2026-11-04)

Status: **RESEARCH / NOT INTEGRATED**. No merge, rebase, push or upstream write.

## Bases actually inspected

| Ref                           | Head                                                               |
| ----------------------------- | ------------------------------------------------------------------ |
| Candidate                     | `fix/continuation-authorization-hardening-20261103` = `33fb8eaaf8` |
| Fork main                     | `origin/main` = `d3bedef12a`                                       |
| Upstream main (fetched fresh) | `upstream/main` = `43bf0babd4`                                     |
| Fork/upstream merge base      | `47f2c8d29e`                                                       |

Upstream moved **300 commits** past the fork's last sync. It also moved during this run
(`8657eecb` at the first fetch, `43bf0bab` at the compatibility check), so any integration
must re-fetch immediately before merging.

## File-level result

The candidate changes 13 files. **None of them is also changed by upstream.** The
`projectRuntime` service, `RuntimeTaskContinuationPolicy`, `RuntimeTaskPacket` and
`packages/contracts/src/projectRuntime.ts` do not exist upstream at all; they are fork-owned
additions. `Migrations.ts` and `agentContextBudget.json` are the only shared files touched by
the fork lineage around this work, and both are outside the candidate diff.

A real trial merge of `overnight/deepseek-continuation-20261104` into `upstream/main@43bf0bab`
was executed in a disposable worktree (`/home/jer/dev/t3code-compat-20261104`, branch
`compat/upstream-43bf0ba-20261104`) and then aborted. The continuation files merged cleanly:
`ProjectRuntimeService.ts`, `RuntimeTaskExecutionService.ts`, `RuntimeTaskContinuationPolicy.ts`
and `packages/contracts/src/projectRuntime.ts` were added without conflict; `Migrations.ts`
auto-merged (upstream adds 078/079, the fork adds its own `ForkMigrations` hook on distinct
lines); `agentContextBudget.json` auto-merged textually.

## Actual merge conflicts (8 files, all pre-existing fork divergence)

- `apps/server/src/mcp/OrchestratorMcpService.ts`
- `apps/server/src/mcp/linkOrigin.test.ts`
- `apps/server/src/orchestration-v2/Adapters/GrokAdapterV2.test.ts`
- `apps/server/src/orchestration-v2/Adapters/OpenCode2AdapterV2.test.ts`
- `apps/server/src/orchestration-v2/runtimeLayer.test.ts` (2 hunks)
- `apps/server/src/peer/PeerForwarding.test.ts`
- `apps/web/src/routeTree.gen.ts` (generated, 3 hunks)
- `packages/shared/src/usageLimits.ts` (2 hunks; fork capacity evidence vs upstream refactor)

None of these conflicts is caused by the continuation diff. They belong to the fork's
Evidence V0 / routing / usage-capacity lineage. Resolving them is a **separate fork-main
reconciliation task**, not part of this overnight authorization.

## Behavioural hotspots (even where text merges cleanly)

Upstream changed services the continuation path depends on:

- `ThreadLaunchService.ts` (+37/−? lines) — the continuation chain calls `launch.launch`.
- `Orchestrator.ts` (+250/−61) — event/command handling around launch.
- `ThreadManagementService.ts` (+8) — thread/shell reads used for ambiguity detection.
- Provider adapters (`ClaudeAdapterV2`, `CodexAdapterV2`, OpenCode v2, ACP, Cursor, Muse, Pi).
- `packages/contracts/src/rpc.ts`, `clientRpcPermissions.ts`, `ProviderAdapter`.
- Migrations `078`/`079` and `Migrations.ts`.

A clean textual merge therefore does **not** prove behavioural compatibility. The four
verification gates must be rerun after the conflict set is resolved on the merged base.

## Context-budget finding

| Snapshot                      | claude append | codex context | MCP tool list    |
| ----------------------------- | ------------- | ------------- | ---------------- |
| Upstream main                 | 5153          | 6883          | **47538**        |
| Fork main before continuation | 7496          | 9224          | 58519            |
| Candidate with continuation   | 7496          | 9224          | **59165** (+646) |

Upstream has since _reduced_ the tool-list budget substantially. Merging the fork's snapshot
would restore the fork's larger numbers and lose upstream's reduction. Correct sequence:
resolve conflicts → re-measure with `AgentContextBudget.test.ts` on the merged tree → only then
update the snapshot. The +646-byte continuation delta remains an `agent-context-increase` gate
for whichever base is chosen; it must not be absorbed into an upstream reconciliation silently.

## Least-churn option

1. Land a separate fork-main ↔ upstream reconciliation (resolve the 8 conflicts, re-measure
   budget, rerun full server/web checks). Keep continuation out of that merge.
2. Rebase/replay the isolated continuation branch on the reconciled base (the four continuation
   files are additive and conflict-free in the trial merge).
3. Rerun the three continuation suites, the `projectRuntime` suite, typecheck and
   `check:changed` on that base, then hand to independent review.

## Verdict

**No upstream-compatible claim is made.** The continuation diff is textually independent of
upstream's current changes; integration is gated by the fork's own reconciliation conflicts and
by behavioural re-verification of `ThreadLaunchService`/`Orchestrator`, not by the continuation
code. Nothing was merged, rebased or pushed.
