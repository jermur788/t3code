# Upstream contribution triage — T3 Orchestration V2

Date: 2026-11-03
Status: READ-ONLY SOURCE TRIAGE / NO EXTERNAL UPSTREAM ACTION / NO CODE CHANGE
Owner: Overall Manager in browser
Source of authority: T3 Fork accepted product direction, Current State, source inspection; not a new product decision.

## Aim

Reduce T3 Fork's ongoing divergence and total maintenance by contributing **small, independently useful upstream bug fixes** that are relevant to our project. Do **not** recreate accepted upstream services in the fork, open duplicate PRs, or assume an issue's closed status is verified resolution.

Upstream contribution requirements: [CONTRIBUTING.md](https://github.com/pingdotgg/t3code/blob/main/CONTRIBUTING.md). The project does **not** actively solicit large outside contributions. Focused obvious bug fixes may be submitted without a discussion; larger behavior changes require a triaged issue or explicit maintainer approval. One underlying defect per PR. Provide exact reproduction, narrowed tests, observed before/after evidence, and relevant UI evidence where required. Do not claim maintainer acceptance from an issue or from reviewer tests.

## High-value upstream overlap as of 2026-11-03

| Defect / value | Live proposal status | Best contribution rather than duplication |
|---|---|---|
| Explicitly resume an interrupted delegated review instead of launching a replacement (saves tokens and preserves context) | [Issue #28734](https://github.com/pingdotgg/t3code/issues/28734) OPEN; [PR #28777](https://github.com/pingdotgg/t3code/pull/28777) OPEN, unmerged. Patch clarifies `t3_thread_send` vs `delegate_task`, docs, and prompt-string tests. PR author says live model evals not run. | **Priority 1: independent review of existing PR**. Check the code's actual interrupted-thread outcome, child-task follow-up ownership and `taskId` delivery; propose behavior/replay negative tests. Static string assertions alone don't prove that a model chooses the correct tool or that runtime will deliver the result. Avoid a duplicate patch. |
| Sibling delegated-completion wakeup lost if another wake is interrupted | [Issue #28175](https://github.com/pingdotgg/t3code/issues/28175) OPEN; [PR #28204](https://github.com/pingdotgg/t3code/pull/28204) OPEN, unmerged, 2 files; author includes replay tests and desktop before/after recordings | **Priority 2: independent source/replay review** for sibling delivery, Stop semantics, wake generation idempotence and ordering. Do not add a competing implementation or change T3 fork's event graph. |
| A nested delegated task finishes after its parent child-run, but follow-up reports stale result early | [PR #21877](https://github.com/pingdotgg/t3code/pull/21877) OPEN; reported targeted tests. Distinct original-task race [issue #24297](https://github.com/pingdotgg/t3code/issues/24297) OPEN has [PR #24391](https://github.com/pingdotgg/t3code/pull/24391) OPEN | **Priority 3: independent crash/race review** on existing PR(s); trace `delegatedTaskId`, nested child waits, terminal receipt, and delivery once. Test queued, failed-start and duplicated wake cases. |
| Antigravity parent never resumes after background child completion; paragraph streaming stalls | [Issue #30082](https://github.com/pingdotgg/t3code/issues/30082) OPEN; [PR #30083](https://github.com/pingdotgg/t3code/pull/30083) OPEN, unmerged; narrower [PR #28221](https://github.com/pingdotgg/t3code/pull/28221) OPEN | Follow active work and offer focused verification only with an environment capable of authentic Antigravity tests. Beware overlapping changes across multiple PRs; avoid claiming a single fix covers all symptoms. |
| User steering a waiting `delegate_task` loses the child's completion | [Issue #27362](https://github.com/pingdotgg/t3code/issues/27362) OPEN; [PR #27387](https://github.com/pingdotgg/t3code/pull/27387) OPEN | Lower immediate priority than above; test and review if our actual use reproduces. |
| Cross-project delegated execution in the same local environment | [PR #28859](https://github.com/pingdotgg/t3code/pull/28859) OPEN, unmerged. This is an extension, not an established bug correction. | Monitor upstream for acceptance, consume if merged and verified. Do not pitch as an unsolicited generic upstream feature without maintainer approval. |

Related [issue #17412](https://github.com/pingdotgg/t3code/issues/17412) is CLOSED for missing detail despite later reproduction comments and current PRs; this closure is not proof of fix.

## First review target: interrupted delegated reviews

**Base:** Always refresh upstream main and PR head before review. Current PR #28777 patch modifies injected orchestration instruction, tool description, docs, two instruction-focused tests, one model-eval case and context size budget; no provider/runtime scheduler fix. Its model eval is not claimed to have run.

**Question:** Does the wording accurately distinguish (a) genuinely independent review/re-check that must get a new child, (b) explicit user-requested continuation of an interrupted/paused child preserving its existing thread, and (c) an active pending approval/question that needs direct response, *without* silently changing task ownership or creating duplicate completion delivery?

**Browser review steps:**
1. Read [source instructions](https://github.com/pingdotgg/t3code/blob/main/packages/provider-core/src/server/orchestrationInstructions.ts), the [PR diff](https://github.com/pingdotgg/t3code/pull/28777/files), the [tool's command specification](https://github.com/pingdotgg/t3code/blob/main/apps/server/src/mcp/toolkits/orchestrator/tools.ts), `OrchestratorMcpService` follow-up binding and `Orchestrator` completion/wake semantics.
2. Check that PR documentation does not falsely imply that resuming an interrupted *task* reopens the same task ID: it opens a new run in the same thread with preserved conversation context. Describe if the resulting parent-task identity or completion wake is different.
3. Identify deterministic regression tests that do not require paid tokens or an account: interrupted child with previous history; explicit continuation; current/future `hasPendingQuestion` / `pendingApproval`; a genuine second independent review; duplicate `clientRequestId`; stale/cancelled task state; failed follow-up; provider unavailable.
4. If the patch is correct but lacks behavioral evidence, suggest a **test-only contribution to existing PR author/maintainer** instead of reopening the whole problem. Do not post unsolicited comments or open PRs until the owner explicitly approves public outreach.
5. Only after a clear gap is established, request approval for a focused upstream contribution with the minimal diff and reproduction. No generated changes to `main` or production until separate verified code path.

## Separate, potential new upstream issue

The user's reported DeepSeek run displayed stale `Task 1 of 12` while execution continued. This is **not yet an upstream-reproduced defect** because it may be an agent-authored stale plan, provider behavior, or the presentation layer. Research source and event timeline before filing; distinguish app-owned run progress, agent-authored plans, and independent verified result. No claim of stale plan as a proved upstream T3 bug.

## Contribution decision rule

1. Reproduction and scope first.
2. Existing active PR? **Review/test it**, avoid competing PR.
3. No PR and clearly localized upstream reliability bug? Inspect upstream main and tests. Small fix can be proposed using the focused-bug exception; larger changes need upstream agreement.
4. Is it T3 Fork's authoritative task/decision policy rather than generic execution reliability? **Do not upstream** the opinionated project-manager layer; keep fork additive.
5. Upstream declines to merge? Keep the smallest independent isolated patch in the fork only if needed; record the rebase hotspot and periodically check whether upstream supersedes it.
6. No public PR, issue comment, reviewer submission or disclosure of user/private Runtime data without explicit authorization. Existing accepted project source already establishes generic upstream-first strategy; public outreach remains separate.

## Actions, status, and handoff

- SOURCE-INSPECTED: upstream contributing policy; issue/PR current status; selected patches and public test evidence.
- NOT VERIFIED: no local build, branch checkout, model eval, real provider test or new independent test run.
- No main or production code changes, no upstream comments or PR submissions.
- Next browser-safe work: review PR #28777's behavioral seam and any tests it should gain. If reviewer findings require local replay tests, send a bounded test-only task with exact repo, base, scope, acceptance and code owner, not a generic full architecture handoff.
- Operator approval required for upstream public posting, production integration/merges, paid model tests and new architecture scope.
