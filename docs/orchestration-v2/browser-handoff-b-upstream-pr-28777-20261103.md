# Browser Handoff B — Review and improve upstream PR #28777

**TASK / ROLE**: You are the **independent upstream source reviewer / test-preparation worker** in a **different ChatGPT browser chat**. Execute the available review and source-level testing preparation using the connected GitHub app. Aim to help the existing upstream contribution without duplicating it. Do not assume the PR is merged, correct or already verified. No public interaction without explicit approval.

**Upstream**: https://github.com/pingdotgg/t3code  
**Existing PR**: https://github.com/pingdotgg/t3code/pull/28777  
**Reported defect**: https://github.com/pingdotgg/t3code/issues/28734  
**Fork/research workspace**: https://github.com/jermur788/t3code/tree/planning/resource-efficient-continuation-20261103  
**Branch base**: refresh live upstream main and the PR head before review; last checked on 2026-11-03, PR was OPEN and unmerged. **Do not use our fork's older main as if it were the current upstream PR base.** Never modify the PR author's branch.  
**Routing**: source inspection, independent review and (where possible) test-file authorship in browser; local runnable regression tests and optional model tool-selection evals only when explicitly permitted and resources exist.

## Read before acting

1. [Full PR-specific test packet](https://github.com/jermur788/t3code/blob/planning/resource-efficient-continuation-20261103/docs/orchestration-v2/upstream-pr-28777-behavioral-verification-task-20261103.md).
2. [Upstream contribution guide](https://github.com/pingdotgg/t3code/blob/main/CONTRIBUTING.md). This permits small focused bug fixes but demands precise reproduction and evidence; maintainers are not required to accept outside PRs. Respect model attribution rules and the one-underlying-defect-per-PR rule.
3. [Upstream defect/PR triage](https://github.com/jermur788/t3code/blob/planning/resource-efficient-continuation-20261103/docs/orchestration-v2/upstream-contribution-triage-20261103.md).
4. Source: `packages/provider-core/src/server/orchestrationInstructions.ts`, `apps/server/src/mcp/toolkits/orchestrator/tools.ts`, `apps/server/src/mcp/OrchestratorMcpService.ts` (`sendToThread`), `apps/server/src/orchestration-v2/Orchestrator.ts` (`recordSubagentFollowup`), and `DelegatedCompletionDelivery.test.ts`.

## Problem and source findings so far

A user asked the parent agent to **continue a previously interrupted, unfinished delegated review**. Current upstream instructions say each new review/re-check uses `delegate_task`; the parent launched a replacement child, losing the easy reuse of prior conversation. PR #28777 changes **model-facing instructions and `t3_thread_send` documentation**, not the execution engine, to distinguish existing-child continuation from a genuinely independent fresh review.

The current engine can create a new **follow-up task/run with a new task ID inside the same child thread**; it does not reopen the original task ID. Existing completion tests include an interrupted *follow-up* among test outcomes, but the particular inspected test seeds an *original completed child*, so it does not conclusively prove the **original interrupted** case. PR author reports focused checks and a dry-run eval fixture, but **no live before/after model tool-choice eval**.

## Execute now in the browser

1. Refresh the PR, related issue, upstream main and overlapping PRs. Read the complete changed-file patch and repository tests. Establish what is actually covered before calling anything a gap.
2. Independently trace the runtime contract for `t3_thread_send` into a **previously interrupted and reconciled child**: lineage, who may send, request-key replay, new task identity, preserved conversation, pending question/approval, parent completion delivery and cancellation. Differentiate a new independent review, same-child continuation and resuming a *currently pending* request.
3. Produce a concise code review with source links and precise findings (correct / unproven / defect), separating instruction quality from runtime guarantees and model selection behavior.
4. Where a real, nonduplicative test gap exists, author the **smallest deterministic regression test(s)** for an original-interrupted child followed by `t3_thread_send`, with a stable request key, one new follow-up task/wake, original task remaining terminal and no duplicate delivery. Add negative tests only where they directly support PR scope. Prefer testing the existing lifecycle over modifying production code.
5. **Branch safety**: if GitHub tools can create a separate test branch from the *actual PR head commit* in a repository to which you have write access, use that. If not, create a self-contained unified test patch/diff or a new Markdown test-spec file in our **research-only** branch for later local application. Do not pretend a patch on our fork's stale main is compatible with the upstream PR. Never force-push, cherry-pick into main, or rewrite the author's head without authorization.
6. Evaluate whether an independent provider model tool-selection check is needed to prove the instruction works. Specify exact test prompts and controls, but **do not spend paid tokens or access private provider credentials** in the browser or locally without user approval.
7. Recommend one of: (A) existing PR is sufficient, (B) add missing focused tests to the author's PR through a proposed diff, (C) report a newly proven separate runtime bug, or (D) hold because evidence is insufficient. Do not open duplicate upstream PRs.

## Exclusions and authority

No upstream issue/PR comments, code review submission, pushes to someone else's branch, new public PR or public disclosure of private project data without explicit user approval. No fork runtime changes, no paid models, no unrelated feature, no production deployment, no integration or merge. Browser file inspection and a privately stored test patch are authorized.

## Verification and handoff

Indicate exact source revisions, files and scenarios inspected. Mark **SOURCE-INSPECTED** if only reviewed, **IMPLEMENTED / TESTS NOT RUN** if a code patch exists but was not executed. Do not claim RUNTIME PASS or verified model behavior from prompt assertions. A local follow-up, if needed, must include the precise upstream PR base, isolated worktree setup, focused commands and expected completion-delivery evidence.

Return: **VERDICT; BASE/PR STATE; REVIEW FINDINGS with line-level evidence; NEW TESTS/DIFF AND LOCATION; VERIFICATION run vs pending; RISKS/BLOCKERS; RECOMMENDED PUBLIC FEEDBACK text (not posted); NEXT ACTION; USER APPROVAL required for posting.** Persist findings in a unique private GitHub research file or branch so the Overall Manager can reconcile them.
