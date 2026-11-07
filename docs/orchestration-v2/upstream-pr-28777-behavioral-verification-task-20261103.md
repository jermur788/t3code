# Upstream contribution task — verify PR #28777, avoid a competing fix

Date: 2026-11-03
Status: SOURCE REVIEW COMPLETE / BEHAVIORAL TESTS PENDING / UPSTREAM OUTREACH NOT AUTHORIZED
Owner: browser Overall Manager for source review; separate isolated local T3 Code test worker only for tests if invoked
Upstream repository: https://github.com/pingdotgg/t3code
Existing upstream PR: https://github.com/pingdotgg/t3code/pull/28777
Issue: https://github.com/pingdotgg/t3code/issues/28734
Ownership: do not amend someone else's open PR head or create a duplicate submission.

## Objective

Determine whether the existing PR successfully teaches parent agents to resume *interrupted unfinished delegated review work* in an existing child thread with `t3_thread_send`, while retaining `delegate_task` for a genuinely fresh independent review. Provide practical missing **test evidence** or a precise code-review finding to the existing author/maintainers only after authorized public outreach.

## Source-inspected findings (2026-11-03)

- Upstream [CONTRIBUTING.md](https://github.com/pingdotgg/t3code/blob/main/CONTRIBUTING.md) permits focused obvious bug fixes with evidence. It does not guarantee review or merge; changes to product behavior and substantial scope may require prior maintainer approval. One problem per PR.
- PR #28777 is **OPEN and unmerged** at the source review. It changes [orchestrationInstructions.ts](https://github.com/pingdotgg/t3code/blob/main/packages/provider-core/src/server/orchestrationInstructions.ts), `t3_thread_send` tool description, docs, context budget, prompt assertions and an eval fixture. The PR explicitly says **no runtime lifecycle code was changed**; the author reports focused tests but not a live before/after model eval.
- [OrchestratorMcpService.sendToThread](https://github.com/pingdotgg/t3code/blob/main/apps/server/src/mcp/OrchestratorMcpService.ts) uses stable request-key-based command/message IDs and sends into the existing thread; the returned `taskId` is conditional on a new run being bound to delegated work.
- [Orchestrator.recordSubagentFollowup](https://github.com/pingdotgg/t3code/blob/main/apps/server/src/orchestration-v2/Orchestrator.ts) attaches a **new delegated task ID** to a new run in the old child thread, after finding the original app-owned child and requiring an already-settled original result. It is *not* an in-place reopening of the interrupted original task. The new task's completion should wake the parent independently.
- Existing [DelegatedCompletionDelivery.test.ts](https://github.com/pingdotgg/t3code/blob/main/apps/server/src/orchestration-v2/DelegatedCompletionDelivery.test.ts) has an important table of interrupted/failed/stopped/restarted follow-up results, overlap, repeated recovery and notifications. In the inspected table, the **original child** is seeded as *completed* and the later **follow-up** is marked interrupted/failed/stopped. This does not, by itself, verify the user-reported path where the original review was interrupted **before** the follow-up. Do not claim the scenario is absent from the entire upstream test suite without a full test search.
- PR's model-eval case (and new string tests) demonstrates intended guidance, not measured model tool choice. The author explicitly records an unavailable live model eval. No browser test was run here.

## Main verification question

Can `t3_thread_send` from a scoped parent to an **original app-owned child whose review was interrupted and has already settled** create exactly one follow-up task in the same child thread, preserve the previous history and provider session where supported, deliver the terminal result to the parent, and leave the original task terminal/non-reopened?

If the parent task or child is not truly settled, or a pending request still holds, what exact command does the policy prescribe and what does the runtime accept? Test both rather than assuming the new instruction is always correct.

## Recommended test matrix

1. **Original interrupted:** seed original delegated child run as interrupted, reconcile its parent task, send explicit continuation with a fixed `clientRequestId`; assert same `childThreadId`, **new** task ID only if ownership is bound, original task never reopens and exactly one eventual parent completion notification. If no new task is created, record that as a targeted bug/contract gap *not fixed by prompt wording*.
2. **Original completed / new independent review:** establish that the instruction still routes a genuinely independent review through `delegate_task` into a fresh child, and a same-conversation follow-up through `t3_thread_send`. Ensure both remain distinguishable in task lineage.
3. **Pending approval/question:** do not send a new child message that bypasses the pending request; use the documented `t3_pending_request` mechanism, and assert no duplicate dispatch.
4. **Request replay:** retry `t3_thread_send` with the same request key; exactly one new follow-up. Different explicit new user instructions are allowed separate tasks only when authorized.
5. **Runtime negatives:** old child removed/archived, parent permissions changed, task stopped/cancelled, provider unavailable, stale thread lineage. Fail closed; no surprise broad permission or replacement worker.
6. **Agent behavior:** if model test resources become available, run small before/after tool-selection evals using the exact original user prompt and a fresh-review control, label model/provider/context. Do not spend paid tokens or use credentials without approval.

## Minimal contribution strategy

1. **Browser source review is done.** Do not create another PR that merely repeats the wording.
2. The local test writer should first check whether the existing suite covers the original-interrupted scenario; add only necessary test cases in a **separate isolated branch** based on upstream main plus PR head/patch, with synthetic orchestration events and no model calls.
3. If tests pass, prepare a concise evidence-backed suggestion for the PR author; offer a minimal *test-only patch* without altering their branch. If tests reveal a runtime gap beyond #28777's scope, record it separately and ask the author/maintainer whether they prefer an issue or new small PR.
4. No public review comment, issue response, PR submission, or push to someone else's branch without explicit user authority and appropriate GitHub identity.
5. Update our fork's source research with findings, but do not cherry-pick this PR into fork main unless its behavior is independently needed and verified.

## Repo/worktree safety and independent lane

This work belongs to the **upstream contribution lane**, not the fork continuation spike. Before any local write, inspect actual upstream repo branch/base, dirty status, related uncommitted changes, workers and file ownership. Use a new isolated upstream worktree and a unique T3 home. One writer in this lane. Do not stash/reset, rewrite, force-push or modify the PR author's remote branch. Pin both upstream main and the PR head locally for reproducibility. Respect the upstream [contribution instructions](https://github.com/pingdotgg/t3code/blob/main/CONTRIBUTING.md) including model attribution policy.

## Acceptance / handoff

- Existing PR behavior classified as `PASS`, `TEST GAP`, or `IMPLEMENTATION DEFECT` for each case, with exact commands/logs.
- Existing test coverage identified, additions minimal and focused, tests and relevant typechecks pass.
- No unproved claim that model behavior improved; independent prompt/tool-use evals require separately authorized provider access.
- Handoff: reviewed bases, changed files and isolated branch, test commands/outcomes, reproductions, risk, exact proposed feedback, blocker classification, whether a public contribution is worth making, and next action for Overall Manager.
- If upstream merges or supersedes #28777 while reviewing, stop/refresh and retarget evidence rather than pursuing obsolete changes.
