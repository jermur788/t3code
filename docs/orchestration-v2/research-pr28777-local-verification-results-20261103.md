# PR #28777 original-interrupted regression — local verification results

Date: 2026-11-03
Status: LOCAL VERIFICATION PASSED / TEST-ONLY PATCH / NO UPSTREAM SUBMISSION

This note records the local execution results for the `original-interrupted` regression patch
prepared during the [browser review](research-pr28777-browser-review-handoff-20261103.md).
The [uncorrected patch](research-pr28777-original-interrupted-regression.patch) is preserved
unchanged as historical evidence. The corrected patch is
[research-pr28777-original-interrupted-corrected.patch](research-pr28777-original-interrupted-corrected.patch).

## Tested source

| Field | Value |
| --- | --- |
| Upstream PR | [pingdotgg/t3code#28777](https://github.com/pingdotgg/t3code/pull/28777) (open, unmerged) |
| Upstream issue | [pingdotgg/t3code#28734](https://github.com/pingdotgg/t3code/issues/28734) |
| Contributor fork / branch | `mohamedhanydawood/t3code`, `fix/resume-interrupted-review` |
| PR head committed and tested | `8a8e0fd55cd634a42045cd91142b4cc59f4d6c32` |
| PR base anchor | `fa31b66bbb2ae5234205a8628a78e038d917202f` |

The PR head was fetched directly from the contributor's fork immediately before the worktree was
created, and was unchanged from the version cited by the browser review. The test was applied to
that exact commit, not to fork main or current upstream main.

## Patch identity

- File: `research-pr28777-original-interrupted-corrected.patch`
- SHA-256: `8cf4a39f1874c3ceeefa35e1e3074e4dce6fc44e3ee6019c929cbd46d8202fd3`
- Size: 6,725 bytes; 49 insertions, 6 deletions
- Files changed: one
  - `apps/server/src/orchestration-v2/DelegatedCompletionDelivery.test.ts`
- `git apply --check` passed; `git diff --check` was clean.
- The file matches the diff produced by the verification worktree byte for byte.
- No production source, contract, prompt, or tool-description file is changed.

## Local execution evidence

Run in an isolated local worktree at the PR head, after applying the corrected patch and installing
locked dependencies with `vp i`.

### Focused suite

```
$ vp test run apps/server/src/orchestration-v2/DelegatedCompletionDelivery.test.ts --reporter=verbose
...
 ✓ |t3| src/orchestration-v2/DelegatedCompletionDelivery.test.ts > subagent follow-ups > delivers a original-interrupted follow-up independently of the original task
...
 Test Files  1 passed (1)
      Tests  34 passed (34)
   Start at  21:56:56
   Duration  25.11s
exit=0
```

All seven follow-up outcome rows pass (`completed`, `failed`, `interrupted`,
`original-interrupted`, `restarted`, `stopped`, `overlapping`), together with the rest of the
file's delegated-completion coverage.

### Static checks

```
$ cd apps/server && vp run typecheck
~/apps/server$ tsc --noEmit ⊘ cache disabled
exit=0

$ vp fmt --check apps/server/src/orchestration-v2/DelegatedCompletionDelivery.test.ts
All matched files use the correct format.
exit=0

$ vp lint apps/server/src/orchestration-v2/DelegatedCompletionDelivery.test.ts
exit=0
```

These are local runs on the machine that produced this note, not CI results. No full-repository
test, typecheck, or CI status is claimed.

## Original fixture error and correction

As received, the proposed patch failed the new row:

```
TypeError: Cannot read properties of undefined (reading 'includes')
DelegatedCompletionDelivery.test.ts:  wake.delegatedCompletion?.taskIds.includes(...)
```

Classification: **test-fixture error, not an implementation defect.**

- `ProviderContinuationRequest.delegatedCompletion` carries only `parentRunId`, `generation`, and
  `messageId`. It has no `taskIds`, so the original assertion both fails at runtime and would fail
  typecheck.
- The wake message that does carry `taskIds` is materialized only when a provider adapter consumes
  the continuation request. This harness takes requests from the queue directly, so no message
  exists to inspect.

The corrected assertion binds the second wake to the committed parent-run cohort instead:

```ts
const cohort = finished.runs.find((row) => row.id === parentRunId)?.delegatedCompletion;
assert.equal(cohort?.delivery?.generation, wake.delegatedCompletion?.generation);
assert.equal(cohort?.delivery?.messageId, wake.delegatedCompletion?.messageId);
assert.deepEqual(cohort?.delivery?.taskIds, [followup.id]);
```

That keeps, and slightly strengthens, the acceptance criterion "the parent wake identifies the
follow-up": the wake must name a delivery whose task list is exactly the new task. One comment was
also corrected so the replay claim matches what the test does (repeat a command ID), rather than
implying MCP `clientRequestId` coverage.

## What the added row asserts

- The original interrupted task remains terminal (`interrupted`) and is not reopened.
- The follow-up gets a distinct run and a distinct delegated task in the same child thread.
- Dispatching the same command twice creates exactly one follow-up run for that message.
- The second parent wake is a different message and generation from the first, and its delivery
  covers exactly the follow-up task.
- Re-running recovery adds no context transfer and no duplicate task; the parent projection is
  unchanged.

## Limitations

- **No live model-choice evaluation.** No paid provider or model calls were made; the existing
  dry-run expected-tool-choice fixture is not executed here.
- **No end-to-end MCP request-key replay.** The replay check repeats a command ID. It does not
  exercise an MCP `clientRequestId` through the full client/service path.
- **No proof of identical provider-native session retention.** Only app-level task, run, and
  completion-delivery behavior is exercised; provider-native session reuse is
  capability/adapter-dependent and untested here.
- The two instruction defects raised in review remain present at this PR head: `pendingApproval`
  guidance still points at `t3_pending_request`, and linked-environment children with a null local
  `childThreadId` are not addressed. Both are production changes outside this test-only patch.
- No CI status is claimed or inferred.

## How to reproduce

1. Fetch `fix/resume-interrupted-review` from `mohamedhanydawood/t3code` at
   `8a8e0fd55cd634a42045cd91142b4cc59f4d6c32`.
2. Apply `research-pr28777-original-interrupted-corrected.patch`.
3. Run `vp i`, then the focused suite and checks shown above.

## Upstream references

- [PR #28777](https://github.com/pingdotgg/t3code/pull/28777)
- [Issue #28734](https://github.com/pingdotgg/t3code/issues/28734)
- [Original browser review and task packet](research-pr28777-browser-review-handoff-20261103.md)
- [Uncorrected regression patch (preserved)](research-pr28777-original-interrupted-regression.patch)

Nothing was posted upstream, no duplicate PR was opened, and the contributor's branch was not
modified.
