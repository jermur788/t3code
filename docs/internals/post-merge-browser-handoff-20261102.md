# T3 Fork — Browser Lane Handoff — Post-Merge Verification Support / Upstream Delta Triage

Date: 2026-11-02
Classification: `BROWSER-CAPABLE`
Status: `READY`
Owner: Browser worker / Overall Manager browser lane
Preferred provider: DeepSeek/OpenCode-class default; use stronger independent review only if a material architecture/security issue is found.

## Governing sources

- Project Instructions / T3 Fork project instructions.
- `docs/internals/arm-v2-compatibility-evidence-gap-spec.md`.
- `docs/internals/upstream-sync-20261031-handoff.md`.
- PR #14 final integration record.

## Exact repository state

Fork: `jermur788/t3code`

Current fork `main` at handoff creation:

`8f1b8742251446d67bab1c6ae983140db82a23d9`

Integration anchor:

`19b128fec7be89ffe5689f4d7234121992479710`

Exact qualified candidate integrated by PR #14:

`e51c1c5d74aed9824927d391590ddb33026c8d56`

Pinned upstream snapshot incorporated by that candidate:

`80a2351fcb909034e65a512dfabeb3cdfd367762`

Current upstream observed during this handoff:

`pingdotgg/t3code main @ 333f7a6f6e6b074ba28aca662ff4052c99280d15`

The upstream compare from `80a2351f...` to `333f7a6f...` reports 448 commits ahead. Treat this as a new forward-sync delta; do not retroactively mix it into the completed PR #14 qualification.

## Context / current truth

PR #14 is merged and records:

`INTEGRATED / POST-MERGE REPOSITORY PASS / CI EXCEPTION ACCEPTED / POST-MERGE RUNTIME RE-RUN PENDING`.

The exact pre-merge candidate had `LOCAL L2 RUNTIME PASS` plus independent review, including 186/186 focused tests, 3/3 affected typechecks, restart persistence, ARM provenance qualification, rendered capacity/Workspace checks, and no blocking independent-review defect.

GitHub Actions did not dispatch for the candidate or the immediate integration check. The user explicitly accepted that operational CI exception. Do not relabel it as a CI pass.

The integrated state is `INTEGRATED`, not yet `VERIFIED`, because executable post-merge verification on current integrated `main` is still pending.

## Objective

Use browser/GitHub-capable work to reduce uncertainty and prepare the next safe steps without consuming the local executable-verification lane.

## Authorized browser work

### B1 — integration-state reconciliation

1. Re-read current fork `main`, PR #14, the governing compatibility spec, and the sync handoff.
2. Confirm the PR remains merged at exact integration anchor `19b128fe...` and that later `main` movement is documentation/state only unless repository evidence proves otherwise.
3. Check PR #14 review threads/comments for any unresolved blocking finding that was not reflected in the final handoff.
4. Recheck workflow-run/status evidence for the integration/current head. Record observed facts only. The accepted exception remains in force unless new evidence changes the technical classification.
5. Do not reopen the completed merge decision merely because CI remains absent.

### B2 — CI non-dispatch archaeology

Browser-only investigation is allowed and useful:

1. Inspect repository Actions/workflow configuration and visible repository settings if the browser session has access that the API connector lacked.
2. Determine, if possible, why pull-request workflows did not dispatch for PR #14/current head.
3. Distinguish:
   - repository Actions disabled/restricted;
   - event/branch/path filter behavior;
   - permission/fork policy;
   - workflow syntax/configuration;
   - GitHub operational issue;
   - `UNKNOWN` if not provable.
4. Do not change repository-wide Actions settings unless explicitly authorized by the user/Manager. Read-only diagnosis is the default.
5. If a code/workflow repair is required, return a bounded task packet; do not edit production/runtime code in this lane.

### B3 — upstream delta triage

Analyze the bounded delta:

`80a2351fcb909034e65a512dfabeb3cdfd367762..333f7a6f6e6b074ba28aca662ff4052c99280d15`

Prioritize files/commits touching:

- Orchestration V2 execution identities/lifecycle;
- delegated-task lifecycle / nested work;
- provider capability/model metadata;
- requested vs executed model provenance;
- usage-limit/capacity sources/recovery;
- provider adapters/core;
- orchestration instructions;
- MCP orchestration services/contracts;
- Runtime/persistence/migrations/event projections;
- web Workspace/Development/Usage surfaces;
- CI workflows relevant to the fork.

For each material delta, classify it as one of:

- `UPSTREAM IMPLEMENTATION`;
- `UPSTREAM TARGET/DESIGN`;
- `UPSTREAM COMMUNITY/PR WORK`;
- `IRRELEVANT TO CURRENT FORK GATE`;
- `NEEDS LOCAL EXECUTABLE CHECK`.

Produce a compact next-sync risk map. Do not create a new sync branch or merge this 448-commit delta while current post-merge verification remains pending unless the Manager explicitly reorders the work.

### B4 — prepare, but do not launch, the next evidence phase

The governing spec allows the paired/shadow pilot only after compatibility/sync is `VERIFIED`.

Browser work may prepare:

- candidate low-risk task types;
- identical brief template;
- verification profile template;
- routing/evidence fields to capture before dispatch;
- comparison exclusions/confounds.

Do not launch the pilot and do not activate learned/autonomous routing.

## Out of scope

- local package installation/build/test execution;
- database migration execution;
- real application stop/start qualification;
- rendered UI interaction requiring a local running app unless a browser-accessible running environment already exists and the evidence can be pinned to current `main`;
- production/runtime code edits;
- merge of a new upstream delta;
- autonomous learned routing;
- changes to provider eligibility/authorization semantics.

## Evidence discipline

Keep separate:

- observed GitHub/repository/provider facts;
- worker/orchestrator claims;
- retrospective inference;
- hypotheses/recommendations.

Unknown remains `UNKNOWN`.

## Acceptance / return condition

Return one durable handoff containing:

1. exact fork `main` observed;
2. PR #14/review-thread reconciliation result;
3. CI non-dispatch finding with evidence class and confidence;
4. exact upstream head observed and delta base/head;
5. material upstream changes grouped by compatibility hotspot;
6. rebase/integration risks for the next sync;
7. any bounded local/code tasks discovered;
8. whether anything changes the current `INTEGRATED / post-merge runtime re-run pending` status;
9. exact next browser action and exact next local dependency.

Do not claim `VERIFIED` from browser evidence alone.

## Stop conditions

Stop for the user only if the browser investigation exposes a real product/architecture trade-off, a destructive/admin setting change is needed, or the accepted CI exception conflicts with new material evidence. Routine archaeology/reconciliation continues without prompting.
