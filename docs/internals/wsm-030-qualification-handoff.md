# WSM-030 — Workspace Modes V1 Qualification Handoff

## VERDICT

`BLOCKED` — **OPERATIONAL BLOCKER**

Static qualification and one routine implementation repair are complete. Runtime/browser qualification is not complete because the manager execution environment cannot resolve GitHub to materialize a runnable checkout, and the fork exposes no GitHub Actions/status runs for this branch.

Do not claim `RUNTIME PASS`, `REVIEW PASS`, `INTEGRATED`, or `VERIFIED` yet.

## BASE / CHECKPOINT

- Repository: `jermur788/t3code`
- Governing spec: `wsm/wsm-010-ux-spec @ a5e9e84725074612ca7dbb38d0da8fa744d4f51a`
- Implementation branch: `wsm/wsm-020-interface-shell`
- Qualification repair checkpoint: `b914c6bacdf41c06ce8532f65ac92c07d77c4563`
- Pull request: #7, still draft and stacked on WSM-010.
- Current `main` advanced only through documentation work; no intervening Runtime/UI implementation was discovered during this qualification pass.

## RESULT

### Static qualification completed

- Re-read the WSM-010 governing specification and WSM-020 implementation handoff.
- Inspected PR #7 and the changed Workspace/Settings sources.
- Confirmed the mode preference is device-local presentation state using the existing local-storage hook.
- Confirmed mode switching code itself has no server/Runtime/profile/routing/task/execution/provider/migration write path.
- Confirmed Development mode still renders the existing `ForkHome` component rather than a forked Runtime implementation.
- Confirmed Workspace Project Settings hides advanced sections with `display: none`, keeping hidden focusable controls out of the tab order.
- Confirmed deep-link target IDs currently used by the disclosure exist for Development Profile and Worker preferences; Runtime targets remain part of the existing Project Runtime surface.
- Confirmed PR #7 has no review comments and no recorded external qualification evidence.

### Implementation defect found and repaired

WSM-010 requires Workspace Home to retain the **Classic T3 Home** escape hatch and to expose Development Profile / Runtime / Project State / Tasks & Handoffs information under **Advanced**.

The WSM-020 implementation only provided links under Advanced and omitted Classic T3 Home.

Repair at `b914c6bacdf41c06ce8532f65ac92c07d77c4563`:

- restored **Classic T3 Home** on Workspace Home;
- added compact Advanced summaries for Development Profile, Project Runtime, Project State, and Tasks & Handoffs using the existing Runtime/Profile read hooks and summary helpers;
- retained links to Development Profile, worker preferences, Runtime tasks/handoffs, and profile management;
- made no Runtime or routing semantic change.

## VERIFICATION COMPLETED

`STATIC PASS` for the presentation-only architectural invariant and source-level WSM-010 reconciliation after the repair.

Evidence:

- PR #7 remains web/presentation focused;
- no server/contracts/migrations/provider/orchestrator files are part of the implementation lane;
- mode storage is local only;
- Development mode delegates to the pre-existing Fork Home;
- Advanced project-settings disclosure is presentation-only;
- the first static WSM-010 mismatch was repaired.

## VERIFICATION NOT COMPLETED

The following WSM-010-required WSM-030 checks remain mandatory:

1. run preference/default unit tests;
2. run browser tests for first choice, persistence and switching;
3. prove by browser instrumentation that switching modes causes no Runtime/profile/routing/task write RPC;
4. run web typecheck / changed-file lint/checks / production build appropriate to touched files;
5. render and inspect first-choice prompt;
6. render Workspace Home at normal desktop and narrow/mobile widths;
7. render Workspace Project Settings with Advanced closed/open;
8. verify deep links automatically reveal hidden advanced sections;
9. verify Development Profiles is hidden from normal Workspace nav/search while its direct route works;
10. switch Workspace → Development → Workspace and confirm advanced state is unchanged;
11. inspect Development mode to confirm RTE-V1 controls and behavior remain unchanged;
12. perform independent rendered/source review of the final repaired diff.

## OPERATIONAL BLOCKER

The manager container cannot resolve `github.com`, so a clean/runnable branch checkout cannot be cloned or dependencies/tests started there. The connected GitHub integration can inspect and edit repository data but cannot execute the web application. GitHub exposes no workflow/status runs for this branch.

This is not evidence of an implementation failure. It prevents the rendered/runtime verification required by the governing spec.

## INTEGRATION STATE

`NOT INTEGRATED`

Keep PR #7 draft. Do not merge WSM-010/020 solely from static evidence because WSM-010 explicitly requires rendered UI verification and browser regression coverage.

## EXACT NEXT ACTION

Run the WSM-030 checklist above from a runnable checkout of `wsm/wsm-020-interface-shell` at or after `b914c6bacdf41c06ce8532f65ac92c07d77c4563`.

If any check fails, classify and repair routinely, rerun affected checks, and append the evidence here. If all checks pass, obtain an independent final review, then integrate WSM-010 and WSM-020 to `main` and mark Workspace Modes V1 `VERIFIED`.
