# T3 Fork — Browser Handoff — Post-Verified Upstream / CI Triage

Date: 2026-11-02
Classification: `BROWSER-CAPABLE`
Status: `READY`
Owner: Browser worker / Overall Manager browser lane
Preferred provider: DeepSeek/OpenCode-class. Escalate only for a material architecture/security issue.

## Governing sources

- Project Instructions / T3 Fork project instructions.
- `docs/internals/arm-v2-compatibility-evidence-gap-spec.md`.
- `docs/internals/upstream-sync-20261031-handoff.md`.
- PR #14 final integration record.
- Local verification evidence: `/home/jer/dev/qual-evidence/post-merge-local-verification-result-20261102.md`.

## Current truth

The previously integrated reconciliation is now `VERIFIED` on the integrated fork lineage.

Accepted local verification evidence reports:

- 186/186 focused tests passed;
- 4/4 provenance cases passed;
- 3/3 affected typechecks passed;
- fresh migration succeeded with 75 upstream and 7 fork migrations, integrity good and no id collision;
- two real Runtime executions, one Codex and one OpenCode, were attempt-first, reconciled, handoff-linked, and survived two restarts;
- Workspace, Development, and Usage rendered checks passed;
- no defects, repairs, or code commits were required.

Residuals remain explicit:

- executed-model attribution is `UNKNOWN`;
- only one real Codex credential was available, so no two-subscription OAuth/refresh claim exists;
- GitHub-hosted CI did not dispatch and remains an accepted operational exception, not a pass.

No learned/autonomous routing is authorized.

## Upstream state to triage

The completed reconciliation incorporated upstream snapshot:

`80a2351fcb909034e65a512dfabeb3cdfd367762`

At handoff creation, upstream `pingdotgg/t3code main` was:

`ec3ebdbb67680845bbc596ec475649bcc3ae1fc5`

The compare reports 455 upstream commits after the incorporated snapshot.

This is a new forward-sync delta. Do not mix it retrospectively into the completed verification record.

## Objective

Produce the browser-side evidence needed to bound the next forward-sync task and, independently, determine the most likely cause of the historic GitHub Actions non-dispatch without changing repository-wide settings.

## B1 — reconcile completed gate

1. Re-read current fork `main`, PR #14, the governing compatibility spec, and the canonical sync handoff.
2. Confirm no later repository evidence contradicts the `VERIFIED` local result.
3. Inspect PR #14 comments/review threads for any unresolved blocking finding omitted from the final handoff.
4. Check current visible workflow/status evidence. Do not reopen the completed gate solely because CI remains absent.

Return: `RECONCILED` or a precise blocker classification.

## B2 — CI non-dispatch archaeology

Read-only by default.

Inspect visible repository Actions/workflow configuration and, if browser permissions allow, repository Actions settings.

Classify the root cause as one of:

- repository Actions disabled/restricted;
- event/branch/path filter behavior;
- pull-request draft/event semantics;
- permission/fork policy;
- workflow syntax/configuration;
- GitHub operational issue;
- `UNKNOWN`.

Record concrete evidence and confidence. Do not change repository-wide Actions settings without explicit Manager/user authorization.

If a workflow-code defect is proven, return a bounded T3 Code repair task. Do not edit production/runtime code in this browser lane.

## B3 — upstream delta risk map

Analyze the bounded upstream delta from the incorporated snapshot to the current upstream head observed at task start. If upstream has moved again, pin the new exact head in the handoff and use that as the browser triage target.

Prioritize:

- Orchestration V2 execution lifecycle and identities;
- delegated/nested task lifecycle and context transfer;
- provider capability/model metadata;
- requested vs selected vs executed provenance;
- usage-limit/capacity sources and recovery;
- provider adapters/core;
- orchestration instructions;
- MCP orchestration lifecycle/contracts;
- server composition;
- persistence/migrations/event projections;
- Workspace/Development/Usage surfaces;
- CI/release workflows relevant to the fork.

For every material item classify:

- `UPSTREAM IMPLEMENTATION`;
- `UPSTREAM TARGET/DESIGN`;
- `UPSTREAM COMMUNITY/PR WORK`;
- `IRRELEVANT TO CURRENT FORK GATE`;
- `NEEDS LOCAL EXECUTABLE CHECK`.

Identify likely rebase/conflict hotspots against the fork-owned layers and distinguish additive adoption from semantic conflict.

## B4 — choose next sync shape

Recommend one of:

1. one bounded pinned forward-sync lane;
2. staged sync by core/runtime/UI surfaces;
3. defer selected upstream areas while adopting critical compatibility fixes first.

Recommendation is evidence, not authorization. Do not create or merge a new sync branch in this browser task.

## B5 — paired/shadow pilot preparation

Because compatibility/sync is now `VERIFIED`, prepare—but do not launch—the first bounded paired/shadow evidence pilot under the governing spec.

Return:

- 2–4 low-risk candidate task types;
- identical brief template;
- verification profile template;
- fields captured before dispatch and after outcome;
- exclusions/confounds;
- stop conditions.

Do not activate learned/autonomous routing.

## Acceptance / durable return

Return one durable handoff containing:

1. current fork `main` observed;
2. completed-gate reconciliation result;
3. CI non-dispatch classification, evidence, and confidence;
4. exact upstream head pinned for triage;
5. count/scale of the delta;
6. material changes grouped by compatibility hotspot;
7. next-sync risk map;
8. recommended sync shape;
9. bounded T3 Code task packet(s) discovered;
10. paired/shadow pilot preparation;
11. exact next browser action and local dependency;
12. whether any user decision is required.

## Stop conditions

Stop for the user only for a material product/architecture trade-off, destructive/admin setting change, unresolved security/integration conflict, material paid-infrastructure cost, or conflict with accepted direction. Routine archaeology and task preparation continue automatically.
