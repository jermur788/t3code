# Independent browser review and test-preparation handoff — upstream PR #28777

Date: 2026-11-03. Review provider: OpenAI GPT-6, browser-side GitHub connector. Source classification: inspected upstream code; test patch authored, not executed.

## VERDICT

**TEST GAP / GUIDANCE CORRECTIONS.** Recommendation B: offer a test-only addition to the *existing* upstream PR author once locally verified. The central instruction distinction is reasonable for local app-owned children, but two adjacent prompt defects remain. **IMPLEMENTED / TESTS NOT RUN** applies only to the proposed regression patch, not to the upstream code. No independent runtime PASS or model-behavior claim.

## BASE / STATUS

- Upstream PR: https://github.com/pingdotgg/t3code/pull/28777 — open, unmerged, mergeable when inspected.
- Original upstream issue: https://github.com/pingdotgg/t3code/issues/28734 — open.
- Upstream PR head inspected: 8a8e0fd55cd634a42045cd91142b4cc59f4d6c32 in mohamedhanydawood/t3code, branch fix/resume-interrupted-review, base merge anchor fa31b66bbb2ae5234205a8628a78e038d917202f.
- Current upstream main when checked: a10490937dbd8a9e441b0518a77a60117f3ecf5a. The PR had diverged and was 210 upstream commits behind main (comparison at review time). Do not apply this test on older fork main.
- Research-only branch: research/pr-28777-continuation-regression-20261103 created from planning/resource-efficient-continuation-20261103. **It contains a patch file, not changes to source files.** The fork repository is public; the artifact contains only public upstream source facts, no private project content.
- PR author branch, upstream repository, main and CI were not modified. No public comments/review were posted.

## STATIC SOURCE FINDINGS

1. **Central distinction — correct for local delegated children.** The PR adds a rule in packages/provider-core/src/server/orchestrationInstructions.ts:11 to send explicit unfinished-interrupted continuation to the existing childThreadId, while a *new independent* review uses delegate_task. This is model-facing wording only. See https://github.com/pingdotgg/t3code/pull/28777/files.
2. **Scope and replay.** apps/server/src/mcp/OrchestratorMcpService.ts:3066-3114 checks the caller's live thread/mode ceiling and derives command and message IDs from the clientRequestId. The service passes the existing threadId and only returns taskId if the resulting run is bound to delegated work. See https://github.com/mohamedhanydawood/t3code/blob/fix/resume-interrupted-review/apps/server/src/mcp/OrchestratorMcpService.ts#L3066-L3114.
3. **Task binding and parent wake.** apps/server/src/orchestration-v2/Orchestrator.ts:7830-7979 binds a new delegated task to a new child run if an original app-owned child was found, its result was already settled, and ownership eligibility is satisfied. It does not reopen the terminal original task ID. The new task is associated with the current/latest viable parent run and gets its own completion delivery. See https://github.com/mohamedhanydawood/t3code/blob/fix/resume-interrupted-review/apps/server/src/orchestration-v2/Orchestrator.ts#L7830-L7979.
4. **Existing behavioral coverage.** apps/server/src/orchestration-v2/DelegatedCompletionDelivery.test.ts:1745-2020 exercises follow-up completed/failed/interrupted/restarted/stopped/overlapping and repeated recovery; it seeds the *original* run as completed in its main follow-up matrix. This does not establish the original-interrupted case. See https://github.com/mohamedhanydawood/t3code/blob/fix/resume-interrupted-review/apps/server/src/orchestration-v2/DelegatedCompletionDelivery.test.ts#L1745-L2020.
5. **Approval guidance defect (also raised by CodeRabbit).** The PR says a pendingApproval should be handled by t3_pending_request; that tool's description explicitly says approvals are not listed and it cannot approve permissions. Separate hasPendingQuestion from pendingApproval. With pendingApproval, route to the user in the child thread; do not create another run. See https://github.com/mohamedhanydawood/t3code/blob/fix/resume-interrupted-review/apps/server/src/mcp/toolkits/thread/tools.ts#L127-L143.
6. **Linked-environment child gap (also raised by CodeRabbit).** packages/contracts/src/orchestratorMcp.ts:204-211 makes childThreadId null for remote children; use remoteChild.environmentId and remoteChild.threadId in that case. The PR's instruction only names childThreadId. See https://github.com/mohamedhanydawood/t3code/blob/fix/resume-interrupted-review/packages/contracts/src/orchestratorMcp.ts#L204-L211.
7. **Provider-context qualification.** Continued app thread history is durable; identical provider-native session reuse is capability/adapter-dependent and not proven by the prompt or this test. Parent-wake and completion-delivery are covered by existing tests but must be checked against the original-interrupted scenario.
8. **Model-choice evidence.** The added eval fixture is a dry-run expected-tool-choice case, not a live before/after model run. Existing fresh-review control must remain. The author reports focused prompt/context checks, but no live provider evaluation. CI runs/statuses were not present in the connector snapshots queried; do not infer full CI pass.

## PROPOSED REGRESSION PATCH

Location: docs/orchestration-v2/research-pr28777-original-interrupted-regression.patch in this research branch.
Target file: apps/server/src/orchestration-v2/DelegatedCompletionDelivery.test.ts in *exact upstream PR head*, not in fork main.
Adds a single 'original-interrupted' row to the existing table; it tests original task interruption, original task stays terminal, a distinct follow-up task on the same child, command receipt replay (one follow-up run), correct second wake, and no duplicate transfer/task after recovery.
**Limit:** this checks repeat dispatch with an identical command ID. It is not a full end-to-end MCP clientRequestId replay test or proof that provider-native context is retained; those are optional additional focused tests if local results warrant them.

## VERIFICATION

- Executed: GitHub metadata and full seven-file PR patch inspection, contributor guide and issue inspection, exact source/service/contract/tests inspection, source-snapshot-aligned patch generation and replacement-anchor validation, GitHub branch/file creation and independent fetch of the patch (5,440-byte text file).
- Not executed: git apply --check, TypeScript compilation, Vitest regression, runtime/provider replay, desktop/UI qualification, paid model eval. This environment has no T3 local checkout or resolvable github.com network for git clone. Treat the patch as an unrun candidate.
- Upstream author-reported, not independently rerun: 13 provider prompt/Codex tests, 2 tool tests, context-budget test, focused format/lint/typechecks and an eval dry-run. Full affected-dependents and paid model eval unavailable in author report.

## LOCAL FOLLOW-UP — COMPLETE BOUNDED PACKET

Task: test the proposed regression without touching upstream author branch, then return pass/fail evidence and a minimal corrected patch.
Routing: local T3 Code/Code worker; no model-provider API calls. One writer; independent worktree. Source base must be the PR head cited above. Do not take old fork main as base.
Preflight: inspect local repo, existing worktrees, git status and ownership. Do not stash/reset/overwrite unrelated state.
Checkout: fetch the PR author's fix/resume-interrupted-review ref to FETCH_HEAD, then create a distinct worktree/branch at that exact ref; inspect the head before applying patch.
Apply: copy the raw .patch file from the research branch. Run git apply --check and git apply, then inspect git diff --check and changed file list (one test file only).
Focused run: vp test run apps/server/src/orchestration-v2/DelegatedCompletionDelivery.test.ts; relevant server typecheck; targeted formatting/lint. Follow the upstream docs/operations/development.md tooling. On Windows invoke focused commands directly if vp child subprocess spawning fails.
Acceptance: all current follow-up outcome rows still pass; new original-interrupted row yields original terminal status, one distinct new task/run, replay does not duplicate task, parent wake identifies follow-up, repeated recovery no extra transfer. Confirm latest upstream PR head before packaging final proposed patch.
Failure handling: classify a failing assertion as implementation defect or test fixture/harness issue, inspect event records and repair test without weakening requirements. Do not alter production runtime as part of this test-only lane without a separate approved scope.

## OPTIONAL MODEL TOOL-SELECTION EVALS (NOT RUN; PAID APPROVAL REQUIRED)

- Continuation case: existing local child task is interrupted, original review unfinished, user explicitly asks 'Tell the reviewer to continue because I interrupted it last night'; expect t3_thread_send with original childThreadId and continuation message, not delegate_task.
- Independent review control: first review completed, user requests a *fresh independent second review* of corrected changes; expect delegate_task on a new child, not t3_thread_send.
- Pending question: hasPendingQuestion=true; expect t3_pending_request read/respond, not new run. Pending approval: expect user approval in child thread, not t3_pending_request response.
- Linked-environment case: childThreadId=null, remoteChild populated; expect t3_thread_send with remoteChild.environmentId and remoteChild.threadId, not local null ID.
Use same provider/model/options, prompt history and tool set before/after; record decisions, errors, samples and usage. No inference from assertions or request-only dry-runs.

## RECOMMENDED UPSTREAM FEEDBACK — DRAFT ONLY, NOT POSTED

Independent source review confirms the intended distinction between fresh review and existing-child continuation. The runtime represents continuation as a new delegated follow-up task/run in the same child thread, not reactivation of the original terminal task. I prepared a test-only patch for the currently untested *original-interrupted* case, including command replay, task identity, completion wake and repeated recovery; it still needs a local test run. Two small instruction issues remain: pendingApproval cannot be satisfied through t3_pending_request (questions only), and linked-environment children have null childThreadId, requiring remoteChild.environmentId/threadId. Both were also raised by CodeRabbit. I recommend addressing those and adding a passing behavioral regression before considering the PR verified; a live before/after model-choice eval would provide stronger evidence but is not yet available.

## NEXT / AUTHORITY

Next authorized action: isolated local worker applies this test-only patch to the exact PR head and runs focused test/typecheck/format; manager reviews results, then asks for approval before posting suggestions or the verified patch to the existing upstream PR author. No duplicate PR, no upstream review, no paid evaluation and no fork production change.
User approval required only for public upstream outreach and any paid provider/model eval. The work is not blocked on a new product decision; local test execution is an OPERATIONAL BLOCKER in this browser environment.
