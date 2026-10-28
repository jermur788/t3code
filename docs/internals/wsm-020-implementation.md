# WSM-020 — Workspace Modes V1 Implementation Handoff

## VERDICT

**IMPLEMENTED**

WSM-020 implements the device-local Workspace/Development presentation shell defined by `docs/internals/workspace-modes-v1.md`.

This is not yet `STATIC PASS`, `RUNTIME PASS`, or `VERIFIED`. WSM-030 remains the qualification gate because the current manager environment cannot run the web app or browser suite.

## BASE / CHECKPOINT

- Repository: `jermur788/t3code`
- Governing spec: `docs/internals/workspace-modes-v1.md`
- Spec base: `wsm/wsm-010-ux-spec @ a5e9e84725074612ca7dbb38d0da8fa744d4f51a`
- Implementation branch: `wsm/wsm-020-mode-ui`
- Integration state: draft PR #6, stacked on draft PR #5
- `main` remained unchanged during implementation.

## RESULT

Implemented a presentation-only interface mode with two values:

- `workspace`
- `development`

The mode is stored through the existing reactive device-local local-storage helper. An unset preference resolves to Development so an upgrade never silently hides the existing full interface.

Workspace mode now provides:

- a first-home Workspace/Development choice;
- a focused Project Home led by project identity, Start a thread, Instructions, and Sources;
- an Advanced disclosure for Development Profile, Runtime state, tasks, handoffs, worker preferences, and related existing controls;
- a Settings → General `T3 Fork interface` selector;
- a Workspace project-settings shell that keeps instructions and sources visible while hiding Development Profile, worker preferences, Runtime state, and Runtime tasks by default;
- automatic Advanced reveal when a development-only project-settings deep link is opened;
- Development Profiles removed from normal settings navigation/search in Workspace mode while direct URLs remain valid;
- the Classic T3 Home escape hatch remains reachable.

Development mode continues to render the existing `ForkHome` and `ProjectsSettings` components directly.

## ARCHITECTURAL BOUNDARY

No changes were made to:

- server Runtime services;
- Runtime task/routing/execution contracts;
- Development Profile or project routing persistence;
- execution-attempt persistence;
- provider eligibility or provider drivers;
- orchestration/EventSink;
- fork migrations;
- Git/worktree/session internals.

Changing interface mode itself causes only the device-local preference write. It does not intentionally call Runtime/Profile/routing/execution mutation APIs.

## TEST COVERAGE ADDED

Static unit coverage was added for:

- accepted interface-mode values;
- compatibility default resolution (`unset → development`);
- advanced project-settings deep-link classification;
- confirmation that instructions/sources deep links remain on the normal Workspace path.

## VERIFICATION

Manager inspection completed:

- compared the implementation branch against the WSM-010 spec base;
- confirmed the diff is web/presentation documentation only;
- re-read the mode preference helper, settings selector, project-settings disclosure, settings navigation filtering, and Workspace Home implementation from the branch;
- confirmed Development mode delegates to the pre-existing Development components rather than duplicating Runtime behavior;
- confirmed project-settings hiding is presentation-only CSS around existing sections;
- confirmed direct development settings routes are not disabled.

Not run in this manager environment:

- web package typecheck;
- lint/format/knip;
- unit/browser test execution;
- rendered Workspace/Development inspection;
- persistence/reload browser qualification;
- RPC no-write instrumentation;
- full RTE regression suite.

GitHub currently reports no commit status checks for this draft branch.

## FAILURES / RISKS

### OPERATIONAL BLOCKER — runnable web/browser environment unavailable

The manager has repository/API access but no runnable T3 browser environment in this session, so WSM-020 cannot be promoted beyond IMPLEMENTED here.

### Review risk

The new Workspace Home is intentionally additive and larger than the routing wrappers. WSM-030 should pay particular attention to responsive layout, focus order, first-choice overlay placement, and the fixed Classic Home escape control.

### Settings-shell risk

Workspace project settings use narrow ID-based presentation hiding around existing sections. WSM-030 must verify that deep-linked hidden targets reveal before focus/scroll and that upstream section-ID changes are caught by tests/review.

## REVIEW

Manager architecture/static review: **PASS for WSM-020 implementation boundary**.

Independent code review has not yet been completed. It belongs in WSM-030 before integration.

## INTEGRATION STATE

- WSM-010: draft PR #5, spec-only.
- WSM-020: draft PR #6, stacked on WSM-010.
- `main`: untouched by Workspace Modes work.
- Not integrated.

## NEXT

**WSM-030 — Verification and integration qualification**

Required next actions:

1. run targeted unit/browser tests and web typecheck/lint/changed-file checks;
2. render and inspect Project Home in Workspace and Development modes;
3. verify first-choice persistence and immediate switching across reload;
4. prove mode switching causes no Runtime/Profile/routing/execution mutation RPC;
5. verify Workspace project-settings Advanced/deep-link behavior;
6. verify Development mode still exposes routing, tasks, executions, cancellation/recheck/recovery controls unchanged;
7. independently review the final diff;
8. repair and retest routine defects;
9. integrate WSM-010/020 only after qualification passes, then verify the integrated head.

No user product decision is currently required.
