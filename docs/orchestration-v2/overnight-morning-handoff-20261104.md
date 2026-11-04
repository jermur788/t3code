# Morning handoff — Overnight DeepSeek serial queue (2026-11-04)

Overall verdict: **O0–O4 COMPLETE, O5 REVIEW PASS after repair, O6 partial (read-only).**
**NOT INTEGRATED. NOT PRODUCTION ENABLED.** No merge, PR, upstream post, or paid external
provider call.

## BASE / CHECKPOINT

- Repository: `jermur788/t3code`
- Candidate base: `fix/continuation-authorization-hardening-20261103` = `33fb8eaaf8`
- Fork main: `d3bedef12a` (unchanged)
- Upstream main at check: `43bf0babd4` (moved from `8657eecb` during the run; re-fetch before use)
- Overnight branch: `overnight/deepseek-continuation-20261104`
- Worktree: `/home/jer/dev/t3code-overnight-deepseek-20261104` (clean at handoff)
- Commits: `91b0ad0691` (tests), `f274612747` (evidence docs), `a9854640d5` (checklist +
  routing), `f930d946cd` (case-variant fix + doc corrections), plus this handoff/ledger commit.
- All pre-existing worktrees/branches preserved. No reset, stash, rebase, force-push or history
  rewrite. The disposable compat worktree/branch was removed.

## VERDICT PER STAGE

| Stage | Verdict             | Notes                                                                                                                                                                                                                        |
| ----- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| O0    | **DONE**            | Preflight clean; isolated worktree; child completion channel proven by a real no-op child round-trip; Project Runtime task store not exposed in this host, so the branch-local ledger is authoritative (recorded limitation) |
| O1    | **PASS**            | Independent rerun on a fresh worktree, not the implementer's: 39/39 focused, 179/179 projectRuntime, typecheck 39/39, `check:changed` exit 0 after the self-inflicted mid-run edit was fixed                                 |
| O2    | **PASS (bounded)**  | Duplicate/idempotent dispatch qualification added; the last-check-to-launch race characterized, not fixed; no production change                                                                                              |
| O3    | **DONE (research)** | Real trial merge onto upstream `43bf0ba`; continuation files conflict-free; 8 conflicts are pre-existing fork divergence; no compatibility claim                                                                             |
| O4    | **DONE (memo)**     | F4 gate options, +646-byte cost, revocation-contract options; no adoption, no prototype                                                                                                                                      |
| O5    | **REVIEW PASS**     | Claude Sonnet 5.5, two rounds; repairs verified; no authorization bypass found                                                                                                                                               |
| O6    | **PARTIAL**         | Operator checklist written; missing-test inventory done; PR #28777 checked read-only, no post; unrelated milestones not started                                                                                              |

## CHANGED PATHS

Candidate code (unchanged by this run except the one guard fix):

- `packages/contracts/src/projectRuntime.ts`
- `apps/server/src/projectRuntime/ProjectRuntimeService.ts`
- `apps/server/src/projectRuntime/RuntimeTaskExecutionService.ts` (**one fix**: case-insensitive
  reserved-prefix guard; case-sensitive `GLOB` repair-budget query; wording)
- `apps/server/src/projectRuntime/RuntimeTaskContinuationPolicy.ts`
- `apps/server/src/projectRuntime/RuntimeTaskPacket.ts`
- `apps/server/src/provider/agentContextBudget.json`
- test files under `apps/server/src/projectRuntime/`

Overnight additions:

- `RuntimeTaskContinuationSecurity.test.ts`: +2 qualification tests, +1 regression test
- `docs/orchestration-v2/overnight-deepseek-routing-ledger-20261104.md`
- `docs/orchestration-v2/overnight-upstream-compatibility-20261104.md`
- `docs/orchestration-v2/overnight-f4-gate-decision-memo-20261104.md`
- `docs/orchestration-v2/overnight-operator-checklist-20261104.md`
- `docs/orchestration-v2/overnight-morning-handoff-20261104.md`
- corrections to `docs/orchestration-v2/browser-continuation-implementation-handoff-20261103.md`

## VERIFICATION (actual commands, actual results)

All run in the overnight worktree with stub providers only; no real model calls.

| Command                                               | Result                                                                    |
| ----------------------------------------------------- | ------------------------------------------------------------------------- |
| `vp test run <3 continuation files>`                  | exit 0 — **42/42** (39 original + 2 O2 + 1 case-variant)                  |
| `vp test run apps/server/src/projectRuntime`          | exit 0 — 12 files, **182/182**                                            |
| `vp run typecheck`                                    | exit 0 — **39/39** projects                                               |
| `vp run check:changed`                                | exit 0 — format, lint, knip 2/2, graphql, typecheck 35 pkgs, test 8 files |
| `vp test run RuntimeTaskContinuationSecurity.test.ts` | exit 0 — 25/25 (reviewer rerun)                                           |
| `vp test run AgentContextBudget.test.ts`              | exit 0 — 1/1 (reviewer rerun)                                             |

Focused before/after: 39 → 42; projectRuntime 179 → 182. The original worker's 39/179 report was
reproduced exactly on the pristine head before any addition.

## REVIEW

- Reviewer: **Claude Sonnet 5.5** via provider instance `claudeAgent`, effort high, read-only,
  independent of the implementer and of the coordinator.
- Round 1: **REVIEW REQUIRED (scoped)** — no authorization bypass, no self-grant; one low-severity
  real defect (case-variant keys consuming repair budget) and two doc errors.
- Round 2 (delta `a9854640d5..f930d946cd`): **REPAIRS PASS**, no new defect.
- The reviewer wrote no code, so the no-self-approval rule holds.

## ROUTING SUMMARY

| Task                                   | Selected                          | Alternatives rejected                                                                      | Attempts                                                 | Escalation | Outcome                    |
| -------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------- | ---------- | -------------------------- |
| O0/O1/O2/O3/O4/O6 coordination + tests | `opencode` / DeepSeek V4.1 Flash  | minimax-flash, haiku (local CPU-bound work, no quality gain); Codex/Claude held for review | 1 each; 1 retry on the self-inflicted check:changed edit | none       | PASS                       |
| O5 review round 1                      | `claudeAgent` / Claude Sonnet 5.5 | Opus (overkill/cost); Codex (unknown quota); DeepSeek (not independent)                    | 1                                                        | not needed | REVIEW REQUIRED → repaired |
| O5 re-review                           | `claudeAgent` / Claude Sonnet 5.5 | Haiku (cheaper but weaker for the SQLite check); DeepSeek (self-review)                    | 1                                                        | not needed | REPAIRS PASS               |

Full decision/dispatch/result records, including rejected candidates and liveness events, are in
`docs/orchestration-v2/overnight-deepseek-routing-ledger-20261104.md`.

## FAILURES / RISKS (classified)

- **IMPLEMENTATION DEFECT (fixed):** case-sensitive reservation vs case-insensitive SQLite `LIKE`
  allowed `CONT:V1:P:x` to consume a repair cycle without authority. Fixed; regression added.
- **PRODUCT DECISION (open):** F4 — `synthetic` is a label, not a shipping gate. Options A/B/C in
  the F4 memo; no choice made.
- **PRODUCT DECISION (open):** revocation contract — best-effort last check + reconciliation vs
  atomic revocation-aware launch. The current code is the former; the characterization test proves
  one turn can start after withdrawal inside the window.
- **INTEGRATION CONFLICT (open):** 8 fork-main ↔ upstream conflicts, none in continuation code.
- **REVIEW REQUIRED (open):** no real-provider/model or UI/notification qualification; no
  cross-project isolation test; no true simultaneous-insert test (needs a production hook or a
  flaky SQLite race); historical malformed `cont:v1:` rows are not retroactively scrubbed.
- **OPERATIONAL LIMITATION:** the host exposes T3 delegation tools but no Project Runtime task
  store for this handoff, so Runtime receipts are absent and the branch-local ledger is the
  authoritative record. Host completion wake worked for all three children.

## INTEGRATION STATE

**NOT INTEGRATED.** Pre-integration blockers, in order:

1. User decision on the F4 gate and the +646-byte agent-context cost.
2. User decision on the revocation guarantee.
3. Fork-main ↔ upstream reconciliation (8 conflicts), then re-measure the budget on the merged
   tree and re-run the gates.
4. Behavioural re-verification against upstream changes to `ThreadLaunchService`/`Orchestrator`.
5. Only then: independent integration review and the normal PR path.

## NEXT EXACT ACTION

Ask the user to choose (a) F4 gate: Option A default-off server gate now + Option B before public
release, or B immediately; and (b) revocation contract: best-effort + reconcile, or atomic
revocation-aware launch requiring upstream cooperation. After that, schedule the separate
fork-main ↔ upstream reconciliation.

## USER DECISIONS PENDING

1. **F4 shipping gate** — default-off server flag vs exclude from shipping builds vs remove the
   agent-facing surface.
2. **Agent-context budget** — accept +646 bytes, or require the gate that removes it.
3. **Revocation contract** — best-effort or strict/atomic.
4. Whether to push this experimental branch and open a draft PR later (none opened here).

## OUTSTANDING SUBAGENTS

- All children completed. Last verifiable events: no-op probe 00:24Z; review #1 00:33Z; re-review
  00:40Z. No active child, no scheduled task, no monitor left running.
