# T3 — upstream compatibility trial (isolated, not integrated)

**Date:** 2026-11-04
**Branch under trial:** `experiment/continuation-default-off-gate-20261104` at local checkpoint
`544e8bc9821c1907b512f46a40a153bd0242c0ba` (gate + tests).
**Trial worktree:** `/media/jer/Files/Worktrees/t3-continuation-upstream-trial-20261104`
(detached from `upstream/main`; created outside the near-full root filesystem).
**Verdict:** `BLOCKED` on pre-existing fork-main reconciliation. No merge was committed, no fork
main or upstream branch was changed, nothing was pushed.

## Heads actually used

| Ref                                                     | SHA                                        |
| ------------------------------------------------------- | ------------------------------------------ |
| `upstream/main` (`pingdotgg/t3code`) fetched 2026-11-04 | `a185dd924889cd7f925760431a9f29b973a35e2f` |
| `origin/main` (fork)                                    | `d3bedef12a31f368e5c5a6b279445bea39a6a13a` |
| gate branch checkpoint                                  | `544e8bc9821c1907b512f46a40a153bd0242c0ba` |
| upstream commits ahead of fork main                     | 316                                        |
| fork-main commits ahead of upstream                     | 139                                        |
| gate-branch commits ahead of fork main                  | 32                                         |

Upstream advanced 16 commits since the overnight trial base (`43bf0babd4` → `a185dd9248`).
It is 316 commits ahead of the fork/upstream merge base (`47f2c8d29e`). The conflict set did
**not** grow.

## Trial merge result

`git merge --no-commit --no-ff experiment/continuation-default-off-gate-20261104` in the detached
`upstream/main` worktree produced exactly **8 conflicted files**, the same 8 in the overnight
report. None is touched by the gate branch (verified: 0 commits in `origin/main..gate-branch` for
each file).

| File                                                                   | Conflict hunks | Fork/gate commits | Upstream commits ahead | Ownership                                             |
| ---------------------------------------------------------------------- | -------------- | ----------------- | ---------------------- | ----------------------------------------------------- |
| `apps/server/src/mcp/OrchestratorMcpService.ts`                        | 1              | 0                 | 5                      | fork MCP/tooling divergence                           |
| `apps/server/src/mcp/linkOrigin.test.ts`                               | 1              | 0                 | 1                      | fork project-runtime test layer                       |
| `apps/server/src/orchestration-v2/Adapters/GrokAdapterV2.test.ts`      | 1              | 0                 | 1                      | fork adapter test setup                               |
| `apps/server/src/orchestration-v2/Adapters/OpenCode2AdapterV2.test.ts` | 1              | 0                 | 7                      | fork/upstream adapter test divergence                 |
| `apps/server/src/orchestration-v2/runtimeLayer.test.ts`                | 2              | 0                 | 4                      | fork test helper divergence                           |
| `apps/server/src/peer/PeerForwarding.test.ts`                          | 1              | 0                 | 1                      | fork project-runtime test layer                       |
| `apps/web/src/routeTree.gen.ts`                                        | 3              | 0                 | 1                      | generated route tree (fork routes vs upstream routes) |
| `packages/shared/src/usageLimits.ts`                                   | 2              | 0                 | 1                      | fork capacity evidence vs upstream refactor           |

The continuation-owned files merged textually without conflict:
`RuntimeTaskContinuationGate.ts`, `RuntimeTaskExecutionService.ts`, `ProjectRuntimeService.ts`,
`RuntimeTaskPacket.ts`, `packages/contracts/src/projectRuntime.ts`,
`packages/contracts/src/runtimeExecution.ts`, `apps/server/src/server.ts`,
and the fork's `apps/server/src/projectRuntime/**` additions.

Because the 8 conflicts remain, the trial tree is **not executable** and was not typechecked or
tested. Resolving them is a separate fork-main reconciliation decision (MCP semantics, adapter
tests, generated routes, capacity code) and is not authorized here.

Attempted measurement on the conflicted trial tree:
`vp test run apps/server/src/provider/AgentContextBudget.test.ts` → exit 1, 0 tests. The Vite OXC
transform refused `packages/shared/src/usageLimits.ts` because of conflict markers. This is the
expected consequence of the unresolved conflict set, not a gate failure. The merge was then
aborted in the disposable worktree so the clean upstream tree could be measured.

## Behavioural hotspot check (contract level)

Upstream changed the services continuation depends on, even where text merged:

| File                                                       | Upstream delta     | Continuation dependency                             | Finding                                                                                                                                                     |
| ---------------------------------------------------------- | ------------------ | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ThreadLaunchService.ts`                                   | +37/−?             | `launch.launch(input)`                              | `readonly launch(input)` signature identical in upstream, fork base and trial tree; upstream added `retryPreparation`/`prepareRun`, unused by continuation. |
| `ThreadManagementService.ts`                               | +8                 | `getThreadShell`, `getThreadProjection`, `dispatch` | signatures identical; upstream additions are orphan-safe.                                                                                                   |
| `Orchestrator.ts`                                          | +250/−61           | run creation / dispatch events                      | no textual conflict in the trial; behavioural compatibility still unverified.                                                                               |
| `packages/contracts/src/rpc.ts`, `clientRpcPermissions.ts` | upstream changes   | Project Runtime RPC registration                    | auto-merged; not proven at runtime.                                                                                                                         |
| Migrations `078`/`079` + `Migrations.ts`                   | upstream additions | fork `ForkMigrations` hook                          | auto-merged on distinct lines; no migration was applied.                                                                                                    |

No upstream-compatible claim is made. A clean textual merge does not prove runtime compatibility.

## Context budget

Measured with `apps/server/src/provider/AgentContextBudget.test.ts` on the actual trees, not copied
from a report:

| Tree                                 | claude append | codex context | MCP tool list | Command / exit                                                                            |
| ------------------------------------ | ------------- | ------------- | ------------- | ----------------------------------------------------------------------------------------- |
| `upstream/main` `a185dd9248` (clean) | 5153          | 6883          | 47538         | `vp test run apps/server/src/provider/AgentContextBudget.test.ts` → exit 0, 1 test passed |
| gate branch `544e8bc982` (clean)     | 7496          | 9224          | 59165         | same command → exit 0, 1 test passed                                                      |
| trial merge tree (8 conflicts)       | —             | —             | —             | same command → exit 1, transform refused `usageLimits.ts` conflict markers                |

The fork tree carries +11627 bytes of MCP tool-list growth over current upstream; that is fork
Project Runtime surface, not this gate (the gate adds no MCP field). The previously reported +646
continuation delta was not independently isolated in this run, so it remains the release-gate
figure, not a measured merged-tree result.

Reconciliation is blocked before a merged tree exists, so no reconciled-tree budget exists. Do not
treat either snapshot as a merged-tree measurement. The +646-byte continuation delta is still a
release gate, not an accepted budget raise.

## Verdict

`T3 BLOCKED` by fork-main divergence, not by the gate. Evidence is source-backed; no merge or
push occurred. The separate upstream-compatible integration remains a manager decision.
