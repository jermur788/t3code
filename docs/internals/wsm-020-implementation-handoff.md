# WSM-020 — Interface Mode Preference and Presentation Shell Handoff

## VERDICT

`IMPLEMENTED`

Not yet `RUNTIME PASS`, `REVIEW PASS`, `INTEGRATED`, or `VERIFIED`. WSM-030 remains the rendered UI and regression qualification gate.

## BASE / CHECKPOINT

- Repository: `jermur788/t3code`
- Governing spec branch: `wsm/wsm-010-ux-spec @ a5e9e84725074612ca7dbb38d0da8fa744d4f51a`
- Implementation branch: `wsm/wsm-020-interface-shell`
- Pull request: #7, stacked on WSM-010
- Main remained untouched during WSM-020.
- GitHub Actions/status checks were not available for this branch from the manager environment.

## RESULT

Implemented the WSM-010 presentation-only Workspace/Development split without changing Runtime semantics.

### Device-local interface mode

- Added `workspace | development` device-local preference using the existing local-storage hook.
- Unsaved installs render the existing Development interface while presenting a first-choice prompt.
- Added Settings → General → **T3 Fork interface** selector.
- Mode changes take effect immediately and do not write project/server state.

### Workspace Project Home

Workspace mode now leads with:

- project selection and identity;
- Start a thread;
- Project settings;
- persistent Project Instructions;
- registered Sources;
- an **Advanced** disclosure linking to Development Profile, worker preferences, Runtime tasks/handoffs, and Development Profiles management.

Development mode continues to use the existing Fork Project Home component unchanged.

### Workspace Project settings

Workspace mode keeps normal project settings, Runtime instructions, and registered sources visible.

The following existing controls are collapsed until **Advanced** is opened:

- Development Profile assignment;
- project worker preferences;
- Runtime state/revision/enable controls;
- Runtime tasks and handoffs, including execution/review/recovery controls reached through tasks.

Deep links to these advanced section IDs automatically reveal Advanced so links never land on hidden content.

No hidden value is cleared or rewritten.

### Settings navigation/search

- Development Profiles is removed from normal Workspace settings navigation and normal Workspace search results.
- Its direct route remains valid and Workspace Advanced links can still open it.
- Added a searchable **T3 Fork interface** target with Workspace, Development, interface-mode, and advanced-controls terms.

## FILES CHANGED

Fork presentation/persistence only. No server, contract, migration, provider, orchestration, Runtime persistence, or execution-domain files changed.

Primary files:

- `apps/web/src/forkWorkspaceMode.ts`
- `apps/web/src/forkWorkspaceMode.test.ts`
- `apps/web/src/components/forkHome/ForkModeChoice.tsx`
- `apps/web/src/components/forkHome/WorkspaceForkHome.tsx`
- `apps/web/src/components/settings/ForkInterfaceSettings.tsx`
- `apps/web/src/components/settings/ProjectsSettings.tsx`
- `apps/web/src/components/settings/SettingsSidebarNav.tsx`
- `apps/web/src/components/settings/useAvailableSettingsSearchItems.ts`
- `apps/web/src/components/settings/workspaceProjectSettings.css`
- `apps/web/src/routes/_chat.home.tsx`
- `apps/web/src/routes/_chat.settings.general.tsx`

## VERIFICATION

Completed:

- inspected the full stacked PR diff against WSM-010;
- confirmed no server/contracts/migrations/Runtime execution files are in the diff;
- repaired two source-review gaps before handoff: project-settings Advanced disclosure and interface-mode Settings search;
- removed temporary staging files and weak placeholder tests;
- added persistence-unit coverage for unsaved/default, Workspace, and Development values.

Not run in this manager environment:

- `vp check` / typecheck;
- unit/browser test execution;
- production web build;
- rendered Workspace/Development inspection;
- switching-mode browser regression;
- deep-link browser qualification.

GitHub exposed no workflow runs or combined commit statuses for the implementation head.

## FAILURES / RISKS

Classification: `VERIFICATION REQUIRED`, not an implementation blocker.

Primary remaining risks are presentation/regression risks:

- General settings now render the fork interface section alongside the existing General settings container; rendered spacing must be inspected.
- Workspace project-settings disclosure uses narrowly scoped CSS selectors around existing section IDs; rendered behavior and settings-search reveal behavior must be checked.
- The first-choice prompt needs keyboard/focus/mobile-width inspection.
- Development mode must be checked to ensure existing RTE-V1 UI behavior is visually and functionally unchanged.

## REVIEW

Manager source review completed against the WSM-010 governing spec. No independent rendered reviewer has qualified the branch yet.

## INTEGRATION STATE

`NOT INTEGRATED`

PR #7 remains draft and stacked on the WSM-010 spec branch. Do not merge or claim Workspace Modes V1 verified until WSM-030 qualifies the implementation.

## NEXT

WSM-030:

1. run targeted unit/browser tests and web typecheck/build;
2. render first-choice, Workspace Home, Workspace Project settings, and Development mode;
3. switch Workspace ↔ Development and prove no Runtime/routing/task state changes;
4. verify Advanced open/close and direct advanced deep links;
5. verify Development Profiles nav/search hiding in Workspace while direct URL remains valid;
6. repair any findings and rerun affected checks;
7. independently review the final diff/rendered UI;
8. integrate WSM-010 + WSM-020 only after qualification passes.
