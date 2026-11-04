# Evidence V0 P2 repair — routing and execution ledger

**Task:** [Evidence V0 pruning-completeness P2 repair](task-evidence-v0-pruning-completeness-p2-20261104.md)  
**Repository:** `jermur788/t3code`  
**Repair branch:** `fix/evidence-v0-pruning-completeness-p2-20261104`  
**Repair worktree:** `/media/jer/Files/Worktrees/t3-evidence-v0-p2-repair-20261104`  
**Orchestrator:** DeepSeek V4.1 Flash via OpenCode (`opencode-go/deepseek-v4.1-flash`)  
**Ledger rule:** append-only during execution. Each entry is classified **OBSERVED FACT**, **ORCHESTRATOR CLAIM**, or **RETROSPECTIVE INFERENCE**. Unmeasured capacity, quota, tokens and cost stay `UNKNOWN`; they are never invented.

## 2026-11-04T09:46Z — activation and preflight

**OBSERVED FACT — repository state.**

| Item                        | Value                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------ |
| Fork remote                 | `https://github.com/jermur788/t3code.git`                                            |
| Upstream remote             | `https://github.com/pingdotgg/t3code.git`                                            |
| `origin/main`               | `d3bedef12a31f368e5c5a6b279445bea39a6a13a` (unchanged)                               |
| Planning branch head        | `7babf4b5817014a5d31790ac099d4dd4b6b7bcea`                                           |
| Repair branch head at start | `70203ed5a95dbe1762da1ad2a46c4f153f910492`                                           |
| PR #21 (fork)               | OPEN / DRAFT / UNMERGED / mergeable; head `70203ed5a95dbe1762da1ad2a46c4f153f910492` |
| Repair branch source        | Identical to PR #21 accepted candidate head; no source edits before this ledger      |

**OBSERVED FACT — worktrees.** Existing worktrees were preserved: main checkout `/home/jer/dev/t3code` (`feature/development-profiles-v1`), `rte-rte-010-architecture`, `sync-upstream-20261031`, `t3-evidence-v0-integration-20261102`, `t3-evidence-v0-post-merge-20261102`, `t3-continuation-upstream-trial-20261104`, `t3-fork-upstream-reconciliation-20261104`, `t3-verify-reconciled-v017-20261104`. No pre-existing worktree owns the repair branch.

**OBSERVED FACT — disk.** Root `/dev/sda2` 52 GB available (77% used); external `/media/jer/Files` 90 GB available (80% used) before dependency install. Repair worktree created only on the external volume.

**OBSERVED FACT — providers exposed by the live T3 environment.** `orchestrator_capabilities` reported:

- `opencode` — OpenCode, including `opencode-go/deepseek-v4.1-flash`; child tasks supported.
- `codex` and `codex_c75d8114-7118-4224-8bf2-b9b62637e1fb` — Codex with `gpt-6.1-sol`; child tasks supported.
- `claudeAgent` and `claudeAgent_claude_b_pro` — Claude Opus 5.5 and Claude Sonnet 5.5; child tasks supported.
- Cursor, Grok, Antigravity, fx, muse, pi are disabled.

**OBSERVED FACT — capacity.** No quota, token balance or cost data is exposed by these tools. Provider capacity is therefore **UNKNOWN** except that the listed providers are currently selectable.

**ORCHESTRATOR CLAIM — one-writer ownership.** DeepSeek orchestrator is the only writer in the repair worktree. Reviewers will be read-only. PR #21 and fork `main` will not be modified.

**ORCHESTRATOR CLAIM — initial route.** DeepSeek implements the bounded repair directly (Tier 1; least-cost path and keeps the implementation lane single-writer). Independent review will be routed to Codex `gpt-6.1-sol` at high reasoning (Tier 2), which is a different provider/model from the implementer. Claude Sonnet 5.5 is the considered alternative for review; Opus 5.5 is reserved for evidence of a materially hard unresolved issue.

## 2026-11-04T09:47Z — isolated worktree and dependency setup

**OBSERVED FACT.** Created `/media/jer/Files/Worktrees/t3-evidence-v0-p2-repair-20261104` via `git worktree add` on the existing branch `fix/evidence-v0-pruning-completeness-p2-20261104`, tracking `origin/fix/...`. The worktree started clean at `70203ed5a95dbe1762da1ad2a46c4f153f910492`. No other worktree owns this branch. PR #21 was re-read through the fork API: open, draft, unmerged, mergeable, head unchanged.

**OBSERVED FACT.** `vp i` completed successfully in 1m9s: 1,665 packages, no download failures. No pre-existing `.t3` seed or setup marker existed in this new worktree.

**ORCHESTRATOR CLAIM — ownership.** DeepSeek is the only writer on this branch. Existing worktrees, PR #21, fork `main`, and production configuration remain untouched.

## 2026-11-04T09:48Z — red regression before behavior change

**OBSERVED FACT — source inspection.** `OrchestrationEvidenceService.loadBoundedV2Evidence` read each referenced thread with a 1,000-event bound and marked only the read-limit case (`orchestration-v2-truncation`). It never consulted the published `EVENT_LOG_PRUNED_THROUGH` boundary from `apps/server/src/persistence/OrchestrationEventStore.ts`, while `ProjectionMaintenance.pruneEventStore` publishes that boundary before deleting eligible events. This matches the manager's P2 diagnosis.

**OBSERVED FACT — contract preparation.** Added only the literal `orchestration-v2-pruned` to `OrchestrationEvidenceRecordType` in `packages/contracts/src/orchestrationEvidence.ts`. This is additive schema vocabulary and emits nothing by itself.

**OBSERVED FACT — red fixture.** Added a regression in the existing Evidence V0 suite using a real in-memory SQLite database shared by `EventSinkV2`, `ProjectionStoreV2`, `ProjectionMaintenanceV2`, `EventStoreV2`, and the Evidence service. The fixture writes `thread.created`, `run.created`, and four `node.updated` events, ages the real prune mark by one day with `TestClock`, and runs the real maintenance pass.

**OBSERVED FACT — red result.** Command:
`vp test run apps/server/src/projectRuntime/OrchestrationEvidenceService.test.ts -t "marks referenced history as incomplete when pruning may have removed events"`
Exit: `1`. Failure: `only the referenced pruned thread is marked: expected +0 to equal 1`. The fixture's prior assertions had already passed: the maintenance pass deleted events, the published boundary equaled the pre-prune head, `thread.created` survived, and only the stream-head node remained. This is a genuine red-before, not a mocked watermark.

**ORCHESTRATOR CLAIM — attempt 1.** Repair approach used the existing persisted boundary plus the oldest retained sequence per referenced thread. No duplicate event store, migration, synthetic events, or upstream pruning change.

## 2026-11-04T09:49Z — green repair

**OBSERVED FACT — implementation.** `OrchestrationEvidenceService.ts` now:

1. reads `EVENT_LOG_PRUNED_THROUGH` inside the export transaction;
2. treats a referenced thread as possibly pruned when its oldest retained sequence is strictly below the published boundary;
3. emits one deterministic `orchestration-v2-pruned` event per such thread with `authority: "orchestration-v2"`, `recordBasis: "derived-view"`, `status: "incomplete"`, `completeness: "unknown"`, `reason: "pruned-history-boundary"`, the boundary, and the oldest retained sequence;
4. leaves `orchestration-v2-unresolved` for wholly absent references and `orchestration-v2-truncation` for the per-thread read bound unchanged.

Strict `<` is deliberate: pruning retains `thread.created`, so a thread created after the boundary keeps its oldest event above it and is not marked. A thread created exactly at the boundary has no earlier history and is also not marked.

**OBSERVED FACT — green result.** Same command as red. Exit: `0`; `1 passed | 33 skipped`.

## 2026-11-04T09:50Z — focused suites

**OBSERVED FACT.** `vp test run apps/server/src/projectRuntime/OrchestrationEvidenceService.test.ts` → exit `0`, 34/34 passed. `vp test run apps/server/src/orchestration-v2/ProjectionMaintenance.test.ts` → exit `0`, 3/3 passed. Combined focused run → exit `0`, 38/38 passed.

## 2026-11-04T09:51Z — restart, isolation and unaffected-thread coverage

**OBSERVED FACT.** Added a file-backed SQLite test that:

- creates and prunes referenced history;
- closes the database layer and reopens the same file;
- confirms the marker is recomputed from the persisted boundary and retained events;
- creates a second project/task after the boundary and confirms it exports no pruned marker and keeps its own V2 history;
- confirms the original task export does not leak the other project's thread.

**OBSERVED FACT.** `vp test run ... -t "pruning"` → exit `0`, 2/2 passed.

## 2026-11-04T09:53Z–10:09Z — broad verification

**OBSERVED FACT.**

| Command                                                           | Exit | Result                                                                                                                            |
| ----------------------------------------------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------- |
| `vp run typecheck`                                                | 0    | 40/40 packages successful                                                                                                         |
| `vp run check:changed upstream/main` (first run)                  | 1    | tests passed; `format` and `lint` failed                                                                                          |
| `vp run check:changed upstream/main` (after repair)               | 0    | format, lint, knip 1/2, knip 2/2, graphql, typecheck 40 packages, 81 test files / 2,074 tests, react compiler 40 files all passed |
| `vp test run apps/server/src/provider/AgentContextBudget.test.ts` | 0    | 1/1 passed; committed snapshot unchanged at 7,496 / 9,224 / 58,519 bytes                                                          |
| `vp run --filter @t3tools/web build`                              | 0    | `✓ built in 38.84s`                                                                                                               |

**OBSERVED FACT — lint repair.** The first broad run failed `t3code/no-low-value-comments` on the new explanation comment (5 lines). The comment was cut to 4 lines; targeted lint and the second broad run passed. No test was weakened and no assertion was removed.

**OBSERVED FACT — unrun/limited checks.** Hosted CI does not exist for this fork branch: 0 check-runs are claimed. No live provider turn was used as test evidence. No React/mobile UI change was made, so no UI qualification is claimed. Token usage, quota, and cost were not exposed by the harness and remain **UNKNOWN**.

## 2026-11-04T10:10Z — independent review routing

**ORCHESTRATOR CLAIM — selection.** Selected Codex `gpt-6.1-sol` at `high` reasoning for the independent read-only review. Reasons: the review must test evidence-integrity semantics, a boundary race, false-positive behavior, and upstream compatibility; Codex at high reasoning is a different provider/model from the DeepSeek implementer and is the strongest available bounded reviewer for this task.
**Alternatives considered:** Claude Sonnet 5.5 at medium (capable, but the task specifically stresses correctness of a subtle completeness invariant and a pruning race, where the higher-reasoning Codex route is preferable); Claude Opus 5.5 (not justified yet — no evidence of a materially hard unresolved issue). Opus remains the escalation route if review finds a genuine architectural/concurrency defect that Codex cannot resolve.
**Capacity:** still **UNKNOWN**; only selectability was observed. Reviewer is instructed to be read-only and to report findings without editing the branch.

## 2026-11-04T10:16Z — independent review (round 1)

**OBSERVED FACT — dispatch.** `delegate_task` started Codex `gpt-6.1-sol` with `reasoningEffort: high`, role `review`, read-only instructions, in the shared checkout. Child task id:
`node:delegated-task:command%3Amcp%3Ace0a1aa7-523d-4c66-b220-ef52e71e379d%3Adelegate-task%3A1e00b520-7f10-4fcd-b8b7-f22f3e29a3b8`. Terminal status: `completed`.

**OBSERVED FACT — verdict.** `CHANGES REQUIRED`. The reviewer independently ran the focused Evidence + Projection Maintenance suites (38 passed) and a SQLite snapshot-isolation test (1 passed, 18 skipped), inspected the full diff, and reproduced both findings below. It confirmed the core pruning invariant and transaction analysis: publish-before-delete cannot produce a false-complete snapshot; conservative markers are possible but not false-complete; no upstream engine change; no test weakening.

**OBSERVED FACT — finding 1 (material, repaired).** The marker summary interpolated the full thread ID. A valid 400-character thread ID produced a 528-character summary, above the 512-character schema bound, so JSONL export after pruning failed to decode. Reproduced red in this lane: `expected 528 to be at most 512`.
**Repair:** the summary no longer embeds the thread ID; identity remains in `eventId`, `recordId`, and `threadId`. Added `keeps pruned markers decodable for long thread identifiers`, which exercises real pruning, JSONL decode, and reconstruction for a 400-character thread/run ID. Red before the summary change (`528 > 512`), green after (`1 passed`).

**OBSERVED FACT — finding 2 (material compatibility concern, accepted and documented).** `OrchestrationEvidenceRecordType` is a closed enum on the unchanged `orchestration-evidence/v0` envelope. Older decoders built from the base commit reject an export containing `orchestration-v2-pruned`.
**Disposition:** the governing task explicitly permits a strictly additive evidence record type and requires version compatibility with the existing V0 envelope; it forbids unreviewed breaking schema changes. The additive literal is therefore kept. No universal backward-decodability claim will be made. A short source comment now records that older decoders need an upgrade before consuming an export with the new literal. This remains a **compatibility risk for the manager**, not a reason to add version negotiation or a second schema in this bounded repair. Re-review will check that the disposition is stated accurately.

## 2026-11-04T10:20Z — post-review verification

**OBSERVED FACT.**

| Command                                                                          | Exit | Result                                                                           |
| -------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------------------------- |
| `vp test run OrchestrationEvidenceService.test.ts ProjectionMaintenance.test.ts` | 0    | 39/39 passed                                                                     |
| `vp run typecheck`                                                               | 0    | 40/40 packages successful                                                        |
| `vp test run apps/server/src/provider/AgentContextBudget.test.ts`                | 0    | 1/1 passed; snapshot unchanged                                                   |
| `vp run check:changed upstream/main`                                             | 0    | format, lint, knip, graphql, typecheck, 81 test files, react compiler all passed |

**ORCHESTRATOR CLAIM — no test weakening.** The long-identifier regression was added after review; it failed on the old summary and passes on the bounded summary. No existing assertion was removed or relaxed.
