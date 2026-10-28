# RTE-060 — Cross-Provider Qualification

Status: INTEGRATED / REVIEW PASS (RTE-070 pending)

Implementation commit: `d62e128d3e` (`test(runtime): qualify cross-provider task execution`).

## Task

Qualify the Runtime task execution bridge with routed workers, more than one
provider, restart reconciliation, continuation from a handoff, stale writes,
unavailable providers, and project isolation.

## Base

- Repository: `jermur788/t3code`
- Base: `main @ b558362cef` (RTE-050 integrated)
- Branch: `rte/rte-060-qualification`
- Upstream inspected: `pingdotgg/t3code @ 0894156d9a`
- Related: RTE-040 and RTE-050 packets, `docs/internals/runtime-routing.md`,
  `docs/internals/project-runtime.md`.

## Qualification matrix

| Requirement                      | Evidence                                                                                                                                                                                                                                              |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Routed workers                   | `RuntimeTaskExecutionQualification.test.ts` routes two tasks through two provider instances and asserts each attempt receipt and launch selection.                                                                                                    |
| Multiple providers               | The qualification test uses Codex and Claude instances; the RTE-050 runtime evidence launched a real Claude worktree worker.                                                                                                                          |
| Restart during execution         | RTE-050 evidence: a real launched attempt survived a server restart and reconciled from thread/run state; RTE-050's startup log recorded reconciliation. The qualification test also calls startup reconciliation with a live run and a terminal run. |
| Implementation then fresh review | Each RTE gate was implemented and then reviewed by a fresh Claude B/Codex worker; this gate is reviewed again before integration.                                                                                                                     |
| Stale writes                     | RTE-030/040/050 revision tests; the qualification test asserts a stale task revision is rejected with `ProjectRuntimeConflictError`.                                                                                                                  |
| Unavailable provider             | The qualification test marks a provider unavailable and asserts `RuntimeExecutionRejectedError` with no launch and no attempt.                                                                                                                        |
| Project isolation                | The qualification test creates two projects and asserts each project lists only its own attempt and launch.                                                                                                                                           |
| Fresh-provider continuation      | The qualification test completes a Codex attempt, links its handoff, then executes the same work from Claude with the handoff in the task packet; no manager chat or old provider session is read.                                                    |

## Test file

`apps/server/src/projectRuntime/RuntimeTaskExecutionQualification.test.ts`
covers:

1. two projects and two providers without crossing attempts;
2. restart reconciliation that does not launch a second worker, plus an ambiguous attempt that stays active;
3. handoff linking and same-task continuation through a different provider;
4. unavailable-provider rejection (with reason and no attempt) and stale-revision rejection.

The existing service, packet, migration, RPC, UI, and permission suites provide
the remaining focused coverage.

## Runtime evidence

- RTE-040: a real Runtime task executed on Claude in a new worktree; the attempt
  became `launched`, the worker thread showed the deterministic task packet, and
  the attempt/thread link persisted after a restart.
- RTE-050: a live execution was cancelled from settings (Cancelling + timestamp),
  then after a restart reconciled against its run to `Interrupted` with the same
  attempt and thread link. The startup reconciliation log recorded the pass.
- The isolated development environment had Codex/Claude providers available but did
  not have a configured OpenCode instance, so OpenCode was not used as a second real
  worker, and the only real worker execution was Claude. The two-driver server-level
  test is the provider-neutral coverage; this is an environment limitation, not a
  product defect. RTE-070 should repeat a real second-provider run if a provider is
  available.

## Out of scope

- New execution features.
- RTE-070 final verification and integration.
- Automatic retry lineage, orphan-thread cleanup, execution history paging, and MCP
  execution tools.

## Acceptance

- Every matrix row has evidence above or a documented environment limitation.
- No second worker is started for an ambiguous attempt.
- Existing classic T3, routing, profiles, and Runtime behavior stay intact.
- Changed-package checks and the qualification test pass.

## Completion handoff

- **VERDICT:** RUNTIME PASS / REVIEW PASS for qualification; RTE-V1 is not yet VERIFIED.
- **DELIVERED:** a two-project, two-provider qualification suite for routing, isolation, restart reconciliation, ambiguous attempts, same-task handoff continuation, unavailable providers, and stale revisions; the evidence matrix and environment limits are recorded above.
- **VERIFICATION:** `VITEST_MAX_WORKERS=1 vp run check:changed` passed (format, lint, knip, graphql, typecheck affected packages, 1 qualification file / 5 tests). The RTE-050 changed-code suite passed before integration (81 tests). Real Claude worker execution, restart reconciliation, live cancellation, and post-restart terminal mapping are recorded in the RTE-040/050 packets.
- **REVIEW:** independent Claude B qualification review returned RUNTIME PASS with no blocking gap. It found test-modeling weaknesses in continuation and isolation; the continuation test now runs the same task/project after flipping providers, enforces project-scoped handoff reads, asserts the old thread id is absent, and adds ambiguous-attempt and unavailable-provider assertions.
- **LIMIT:** the isolated environment had no configured OpenCode/second real worker, so the second provider is a server-level two-driver fixture. RTE-070 should retry a real second provider where feasible.
- **NEXT:** RTE-070 Final Review and Integration.
