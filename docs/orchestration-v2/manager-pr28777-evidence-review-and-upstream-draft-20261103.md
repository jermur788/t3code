# Manager evidence review and draft upstream feedback — PR #28777

Date: 2026-11-03
Verdict: **RUNTIME PASS, supported by worker-executed local tests and fetched evidence; independent manager SOURCE REVIEW PASS; LIVE MODEL EVAL NOT RUN; UPSTREAM NOT SUBMITTED**.
Ownership: T3 Fork Overall Manager. Public posting requires user authorization.

## Source and artifacts independently fetched

- [Upstream PR #28777](https://github.com/pingdotgg/t3code/pull/28777) — verified **open, unmerged**, head unchanged from the test run.
- [Tested local verification report](https://github.com/jermur788/t3code/blob/research/pr-28777-continuation-regression-20261103/docs/orchestration-v2/research-pr28777-local-verification-results-20261103.md) — downloaded through connected GitHub file reading; documents the exact contributor-fork source version, test commands, exit status and excerpts.
- [Corrected regression patch](https://github.com/jermur788/t3code/blob/research/pr-28777-continuation-regression-20261103/docs/orchestration-v2/research-pr28777-original-interrupted-corrected.patch) — fetched directly; one test file changed (`apps/server/src/orchestration-v2/DelegatedCompletionDelivery.test.ts`), status and shape match report.
- [Original independent browser review](https://github.com/jermur788/t3code/blob/research/pr-28777-continuation-regression-20261103/docs/orchestration-v2/research-pr28777-browser-review-handoff-20261103.md), including source/contract evidence.
- User/local worker's report says a byte-for-byte patch checksum match. The browser manager **inspected** the published patch and its content but **did not rerun a local cryptographic hash, TypeScript compiler or Vitest**. The recorded summary contains selected test-output excerpts, not the entirety of the local test and typecheck logs.

## What evidence supports

- The original delegated child is seeded as `interrupted`; a follow-up starts in the same child thread with a different run ID and delegated task ID; the original task remains terminal.
- Re-dispatching the same **orchestration command ID** produces a single new follow-up run; this is *not* a full MCP `clientRequestId` replay test.
- A second parent wake refers to a committed cohort with exactly the new follow-up task ID and matching delivery message/generation. A prior browser-authored fixture incorrectly referenced `taskIds` on the `ProviderContinuationRequest`; the local worker repaired the test, not the runtime.
- Repeated recovery does not duplicate the follow-up task or context transfer.
- Report shows `vp test run apps/server/src/orchestration-v2/DelegatedCompletionDelivery.test.ts --reporter=verbose` passing **34/34, exit 0**; `cd apps/server && vp run typecheck` exit 0; focused `vp fmt --check` and `vp lint` exit 0.
- No provider-native session continuity, live model-choice improvement, full CI or end-to-end MCP request-key replay was verified.

## Independent source concerns (already identified in the upstream discussion)

1. [The PR's instruction](https://github.com/mohamedhanydawood/t3code/blob/fix/resume-interrupted-review/packages/provider-core/src/server/orchestrationInstructions.ts) tells the agent to use `t3_pending_request` for both `hasPendingQuestion` and `pendingApproval`. [That tool](https://github.com/mohamedhanydawood/t3code/blob/fix/resume-interrupted-review/apps/server/src/mcp/toolkits/thread/tools.ts) explicitly excludes approvals and cannot approve permissions. Distinguish pending questions (tool-mediated answer) from permission approvals (user action in the child context), without starting an extra run.
2. [The delegation result contract](https://github.com/mohamedhanydawood/t3code/blob/fix/resume-interrupted-review/packages/contracts/src/orchestratorMcp.ts) permits `childThreadId: null` when the child is in a linked environment, with `remoteChild` supplying its environment/thread identity. The proposed instruction mentions only `childThreadId`. Before suggesting a precise remote-routing fix, verify actual `t3_thread_send` cross-environment permissions with the current tool schema.
3. These are **source concerns, not tests failing** in the newly executed original-interrupted regression. Similar warnings were already placed in the upstream PR by CodeRabbit, so feedback should acknowledge prior reports instead of presenting them as new discoveries.

## Recommendation

**Offer the passing, test-only regression to the *existing PR author* in one concise PR comment if the user approves.** Avoid a second upstream PR, unilateral changes to the contributor's branch, broad unsolicited rewrite or purported proof of live model behavior.

The test-only patch is already publicly accessible by GitHub link; sharing the link would give the author an actionable reproducible artifact. The user requested upstream help but has not yet authorized public GitHub posting. Do not post until they expressly approve.

## Proposed public PR comment (NOT POSTED)

> I checked the original-*interrupted* delegated-child scenario against this PR's current head, using a separate local worktree. I added a test-only regression to the existing completion-delivery suite: **34/34 focused tests passed**, as did the server typecheck and focused format/lint checks.
>
> The new case verifies that the original task remains interrupted, `t3_thread_send` continuation creates a distinct follow-up task/run in the **same child thread**, a repeated orchestration command ID does not create another task, the committed parent wake cohort includes exactly that follow-up, and recovery does not duplicate task/transfer records.
>
> Corrected test-only patch: https://github.com/jermur788/t3code/blob/research/pr-28777-continuation-regression-20261103/docs/orchestration-v2/research-pr28777-original-interrupted-corrected.patch
>
> Commands, results and limitations: https://github.com/jermur788/t3code/blob/research/pr-28777-continuation-regression-20261103/docs/orchestration-v2/research-pr28777-local-verification-results-20261103.md
>
> This is **not** an end-to-end MCP request-key replay test or a live model-choice evaluation. I also confirmed the two previously raised guidance points: permission approvals cannot be answered by `t3_pending_request`, and linked-environment children may have no local `childThreadId`. Those are separate from what this test proves.
>
> If useful, you can incorporate the focused test case into this PR rather than opening a separate PR.

## Handback

**Result:** local RUNTIME PASS (test evidence source fetched); manager source review PASS for test-only scope, no independently repeated execution.  
**Changed files in manager lane:** this documentation note only, on the research planning branch.  
**Upstream:** PR still open; no comment, review, push or merge made.  
**Blockers:** live model behavior still unverified and optional; no technical blocker to offering the verified regression patch.  
**Next action:** explicit user approval to post the prepared comment to existing PR #28777; then use the GitHub connector to post once, if authorized and supported, and confirm the public link. Alternatively hand over the exact comment to the user. Keep the original local worktrees until no longer needed; cleanup is separately authorized.  
**Other lane:** fork continuation experiment is independent; do not alter its writer branch or status based on this PR's outcome.
