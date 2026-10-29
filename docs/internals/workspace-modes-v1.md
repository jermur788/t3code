# Workspace Modes V1 — UX and Implementation Boundary

Status: **WSM-010 DESIGN PASS**

Base: `main @ 618c243a79457d141ab5e03a1b5e174ed97aba0e`

Upstream inspected: `pingdotgg/t3code main @ 5211acfe95a0c6d82a60e2524b5e46b47fe67a3e` on 2026-10-28.

## Purpose

Give the T3 fork two first-class presentation modes over the same provider-neutral Project Runtime:

- **Workspace** — a simple project workspace for one provider/subscription or a small set of inexpensive/open-weight models.
- **Development** — the full multi-provider development experience with Development Profiles, worker routing, Runtime tasks, handoffs, execution attempts, review, recovery, and verification.

This is a UI/disclosure feature. It must not create a second Runtime, routing system, provider path, or persistence model.

## Product invariant

Changing interface mode changes **presentation only**.

It must never by itself:

- change provider or model configuration;
- change Development Profile assignment;
- change task/project/profile routing;
- create, update, execute, cancel, or reconcile a Runtime task;
- delete or rewrite handoffs or execution attempts;
- enable or disable Project Runtime;
- change project permissions or provider eligibility.

A mode switch must be safe, reversible, and lossless. Hidden advanced state remains stored exactly as before.

## V1 persistence decision

The interface mode is a **device-local UI preference**, not project truth.

V1 stores one preference:

```text
workspace | development
```

Use the existing web/desktop client-preference/local-storage pattern rather than adding a server contract, Runtime field, fork migration, or project-level record.

Reasoning:

- mode affects disclosure, not project semantics;
- it must not disturb current RTE qualification;
- upstream already treats appearance and other interface choices as device preferences;
- avoiding server persistence keeps the fork seam narrow and rebases cheaper.

A per-project mode override is **deferred**, not rejected. Add it only if real use shows a clear need. It must not be smuggled into WSM V1 by reusing Development Profile or Runtime fields.

## First-choice behavior

If no mode preference has been saved, the Fork Project Home presents a compact choice:

### Workspace

> A focused project workspace. Use one provider or a straightforward model setup; advanced development controls stay available when needed.

### Development

> Coordinate implementation, review, routing, handoffs, execution and recovery across multiple workers/providers.

Until the user chooses, render the existing Development experience so an upgrade never silently hides controls.

The choice is available later in **Settings → General → T3 Fork interface**.

Changing it takes effect immediately and does not require a restart.

## Disclosure model

There are only two modes. Do not create a third “advanced mode”.

Workspace uses progressive disclosure:

```text
Workspace
  └─ Advanced ▸
       └─ existing development controls
```

Development shows those controls directly.

“Advanced” is presentation only. Opening it must not change the saved interface mode.

## Current UI map

### Fork Project Home

Current surface: `apps/web/src/components/forkHome/ForkHome.tsx`

Today it exposes:

- project/checkout picker;
- Start a thread;
- Project settings;
- Development Profile summary/effective-layer links;
- Project Instructions;
- Sources;
- Project State;
- Tasks & Handoffs;
- Runtime revision/version/enabled state;
- Classic T3 Home link.

#### Workspace default

Show:

- project picker;
- project title/path/environment;
- Start a thread;
- Project settings;
- Project Instructions;
- Sources;
- a compact **Advanced** disclosure.

Do not lead with Development Profile, Runtime revision/version, Project State, Tasks & Handoffs, routing, execution, or verification language.

Inside **Advanced**, expose the existing Development Profile, Runtime state, Project State, and Tasks & Handoffs content without changing the underlying data or actions.

The Classic T3 Home escape hatch remains available.

#### Development

Keep the current Project Runtime Home information architecture, adding only a visible mode control/status where appropriate.

### Project settings

Current composition: `apps/web/src/components/settings/ProjectSettingsPanel.tsx`

Fork-specific sections currently include:

- Development Profile assignment;
- Worker preferences;
- Project Runtime;
- normal project defaults/actions around them.

#### Workspace default

Keep normal upstream project settings visible.

For fork-specific settings:

- keep Project Runtime instructions and registered sources reachable because they are core Workspace features;
- place Development Profile assignment, worker preferences, Runtime state/revision controls, Runtime tasks/handoffs/executions, verification, cancellation and reconciliation under **Advanced** disclosure;
- never remove or reset a hidden project/profile/routing value.

Deep links to an advanced section must reveal the corresponding disclosure automatically rather than land on invisible content.

#### Development

Show all current fork-specific settings directly.

### Development Profiles settings page

Current route: `/settings/development-profiles`.

Current fork settings navigation places Development Profiles in the Code group.

#### Workspace default

Hide this route from the normal settings sidebar/search results used for primary navigation. Provide a link to it from the Workspace **Advanced** area.

A direct URL remains valid. Opening the direct route must not mutate the saved interface mode.

#### Development

Keep the route in its current settings navigation position.

### Worker preferences

Current surface: `ProjectWorkerPreferencesSettings.tsx`.

It currently shows effective worker choices and project-level routing overrides for every worker role.

Workspace default: advanced-only.

Development: unchanged.

### Runtime tasks and execution controls

Current surfaces include `ProjectRuntimeSettings.tsx` and `ProjectRuntimeTasks.tsx`.

Workspace default: advanced-only.

Development: unchanged.

This is specifically a disclosure change. Do not simplify the task schema, remove handoff fields, change executable lifecycle states, or alter execution/recovery behavior as part of WSM V1.

## Workspace mode information hierarchy

The default Project Home should answer, in order:

1. **Which project am I in?**
2. **How do I continue working?** — Start a thread.
3. **What persistent context does the AI get?** — Instructions and Sources.
4. **Where are the less common controls?** — Advanced.

It should not require a first-time user to understand routing precedence, execution attempts, handoffs, CAS revisions, verification milestones, or `reconcile-required` before starting useful work.

## Development mode information hierarchy

The Development experience should continue to make durable development state first-class:

1. project identity and Development Profile;
2. instructions/sources;
3. project/task state;
4. routing/effective worker choices;
5. execution attempts and handoffs;
6. review/verification/recovery controls.

Do not regress the existing RTE-V1 workflow to make Workspace mode simpler.

## Settings and navigation behavior

Add the saved mode choice to **Settings → General** rather than creating another top-level settings page.

Label:

**T3 Fork interface**

Options:

- **Workspace** — Focus on project context and conversations. Development controls are available under Advanced.
- **Development** — Show worker routing, Runtime tasks, executions, handoffs and verification controls directly.

Settings search should include “Workspace”, “Development”, “interface mode”, and “advanced controls”.

When Workspace mode filters the Development Profiles navigation item, direct links and Advanced links remain supported.

## Existing upstream patterns to preserve

Upstream settings currently distinguish device preferences from server/project overrides, use explicit settings navigation groups, and keep project selection/scope independent from local presentation preferences.

WSM V1 should follow those patterns:

- device-local mode preference;
- existing `SettingsSection`/settings-search patterns;
- existing disclosure primitives (`details`/summary or equivalent accessible component);
- no new provider/orchestrator abstraction;
- no changes to project-settings scope semantics.

## Expected implementation seam

Prefer a small fork-specific presentation helper/hook, for example:

```text
apps/web/src/forkWorkspaceMode.ts
```

or an equivalently isolated location that owns:

- mode type;
- storage key/default resolution;
- read/write hook;
- optional helpers such as `isDevelopmentMode`.

Likely UI touch points:

- `apps/web/src/components/forkHome/ForkHome.tsx`;
- Settings → General component/search registration;
- `apps/web/src/components/settings/ProjectSettingsPanel.tsx`;
- `apps/web/src/components/settings/settingsSearch.ts` / settings sidebar filtering;
- narrow wrapper/disclosure components around existing fork-specific sections;
- browser/unit tests for mode behavior.

Avoid touching:

- server Runtime services;
- contracts for Runtime tasks/routing/execution;
- migrations;
- provider drivers;
- orchestration/EventSink;
- Git/worktree/session internals.

## Rebase hotspots

The highest upstream-overlap surfaces are:

- settings navigation/search;
- Project settings composition;
- Fork root/home routing/chrome.

Keep changes additive and narrow. Prefer filtering/wrapping existing arrays/components over copying upstream settings structures.

The current upstream main inspected for WSM-010 is `5211acfe95a0c6d82a60e2524b5e46b47fe67a3e`; it continues to use explicit `SETTINGS_NAV_GROUPS` and device-local presentation settings. Re-check upstream before WSM implementation is integrated.

## Accessibility requirements

- mode controls must be keyboard and screen-reader operable;
- Advanced disclosure must expose expanded/collapsed state correctly;
- hidden sections must not leave focusable controls in the tab order;
- deep-linked advanced content must become visible and focusable;
- switching modes must not unexpectedly move focus away from the active settings control.

## WSM-020 acceptance

Implementation of the mode preference/UI shell is acceptable only when:

1. mode preference persists across reload on the same device;
2. Workspace and Development both use the same underlying project/Runtime records;
3. switching modes produces no Runtime/profile/routing/execution write;
4. switching Workspace → Development reveals all previously configured advanced state unchanged;
5. switching Development → Workspace hides advanced controls without deleting or resetting them;
6. Workspace Project Home leads with project identity, Start thread, Instructions and Sources;
7. Development retains the current full RTE-V1 controls;
8. direct links to advanced settings still work in Workspace mode;
9. existing provider/model eligibility behavior is unchanged;
10. existing RTE-V1 tests remain green.

## WSM-030 verification

Require:

- unit tests for preference/default resolution;
- browser tests for first choice, persistence and switching;
- browser tests proving no write RPC is caused by a mode switch;
- Project Home rendered inspection in both modes;
- Project settings rendered inspection in both modes;
- deep-link/Advanced disclosure coverage;
- regression coverage that Development mode still exposes routing/tasks/execution/recovery controls;
- changed-file checks/typecheck/lint appropriate to the touched packages.

UI verification must inspect rendered output; static tests alone are insufficient.

## Explicitly deferred

Not part of Workspace Modes V1:

- per-project interface-mode persistence;
- a third interface mode;
- automatic mode selection from provider count;
- changing routing based on the selected mode;
- different Runtime schemas for Workspace and Development;
- redesigning task/handoff/execution contracts;
- mobile-specific mode UI unless separately scoped;
- dashboard integration.

## WSM-010 verdict

**DESIGN PASS**

The current fork can support Workspace/Development presentation modes through a narrow web UI seam. No Runtime, routing, execution, provider, migration, or orchestration redesign is required.

## Next authorized task

**WSM-020 — Implement the device-local mode preference and presentation shell.**

Start from current approved `main`, re-check upstream/settings overlap, use an isolated worktree/branch, and preserve Development mode as the behavioral baseline. Do not begin Runtime semantic changes under this task.
