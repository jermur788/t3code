# T3 Fork — T3 Code Handoff — Next Forward-Sync After Browser Triage

Date: 2026-11-02
Classification: `T3 CODE / LOCAL EXECUTION REQUIRED`
Status: `READY AFTER BROWSER TRIAGE`
Owner: one T3 Code writer in an isolated worktree
Default provider/model class: DeepSeek/OpenCode-class for routine sync/reconciliation; escalate to Claude Ultra Code only for a proven hard debugging, concurrency, security, or architecture-sensitive conflict.

## Governing sources

- Project Instructions / T3 Fork project instructions.
- `docs/internals/arm-v2-compatibility-evidence-gap-spec.md`.
- `docs/internals/upstream-sync-20261031-handoff.md`.
- Browser result from `docs/internals/browser-next-sync-triage-handoff-20261102.md`.

## Entry condition

Do not begin this task until the browser lane has returned a durable triage result with:

- exact current upstream head pinned for the new sync;
- material compatibility hotspots;
- recommended sync shape;
- CI archaeology result;
- any newly identified stop condition or product decision.

The previous integrated reconciliation is already `VERIFIED`; do not rerun or reopen that completed gate unless new evidence proves a regression.

## Objective

Create the next isolated upstream-forward-sync lane from current fork `main`, integrate the browser-pinned upstream snapshot using normal merge history, reconcile conflicts by the governing authority model, verify the resulting candidate, and return a durable handoff. Do not merge the candidate to `main` automatically unless the Manager separately authorizes integration under the applicable gate.

## Repo/worktree safety

Before any write:

1. fetch `origin` and upstream;
2. confirm current fork `main` and the browser-pinned upstream target;
3. inspect worktrees, branches, ownership, and unrelated changes;
4. create/use one isolated worktree and one writer for this sync lane;
5. never stash, reset, discard, overwrite, force-push, or rewrite shared history;
6. record base, target, worktree, branch, toolchain, and available provider credentials in the durable handoff.

Suggested branch naming:

`sync/upstream-next-20261102`

Use a new dated/specific name if that branch already exists.

## Integration authority

Resolve by these rules:

- upstream Orchestration V2 lifecycle/identities are authoritative where available;
- upstream provider capability/model metadata and usage-limit facilities are preferred over fork duplicates;
- Project Runtime Task remains durable project-work identity;
- fork Project Runtime / Development Profiles / Runtime Routing / ARM / Workspace layers remain additive;
- fork migration history stays separate from upstream migration history;
- `recommendation != authorization`;
- `eligibility != authorization`;
- do not introduce a second launcher, orchestration graph, model catalog, capacity poller, or proxy routing owner;
- requested, resolved/selected, and actually executed provider/model/configuration must remain distinct;
- `UNKNOWN` is valid when execution provenance is unavailable.

## Execution sequence

Follow the browser-recommended sync shape. Unless it identifies a stronger reason to stage differently:

1. create isolated sync lane from current fork `main`;
2. pin the exact upstream target returned by browser triage;
3. merge that target with a normal merge commit;
4. classify every conflict by domain authority rather than taking either side wholesale;
5. run focused checks after each high-risk conflict lane;
6. preserve and adapt fork-owned layers additively;
7. keep upstream tests/evals that characterize newly adopted lifecycle/capability behavior;
8. avoid unrelated refactors while reconciling.

## High-risk lanes

Prioritize independent scrutiny for conflicts affecting:

- orchestration/delegation lifecycle;
- Runtime-to-V2 execution mapping;
- execution provenance;
- provider account/capacity identity;
- authorization/eligibility;
- persistence/migration semantics;
- concurrency/atomicity in attempt/reconciliation paths;
- security/auth/environment policy;
- server composition and MCP orchestration ownership.

If one of these exposes a non-routine conflict, pause that conflict lane and prepare a Claude Ultra Code escalation packet rather than improvising a broad architectural rewrite.

## Verification

Derive exact verification from changed surfaces and the governing spec. At minimum where applicable:

- changed-package format/lint/typecheck;
- upstream orchestration tests affected by the delta;
- fork Project Runtime tests;
- Runtime Routing tests;
- Runtime execution/reconciliation tests;
- ARM contracts/migration/service/provenance tests;
- fresh database migration;
- restart/reload persistence proof;
- provider routing/eligibility/capacity checks;
- rendered Workspace/Development/Usage inspection if touched;
- provider-neutral/multiple-provider qualification where practical.

Do not weaken tests to pass. Do not promote fixture evidence to a real-provider pass.

## Failure classification

Use only precise project classifications:

- `IMPLEMENTATION DEFECT`;
- `VERIFICATION FAILURE`;
- `OPERATIONAL BLOCKER`;
- `REVIEW REQUIRED`;
- `INTEGRATION CONFLICT`;
- `UPSTREAM COMPATIBILITY`;
- `PRODUCT DECISION`.

Routine technical defects may be repaired automatically if scope and ownership are clear. Preserve failing evidence, make the smallest fix, rerun gates, and request independent review where architecture/security/provenance/capacity/persistence semantics are affected.

## Claude Ultra Code escalation trigger

Prepare a separate handoff to Claude Ultra Code only if the task produces a concrete hard problem such as:

- ambiguous lifecycle ownership between fork Runtime and upstream V2;
- concurrency/atomicity defect in execution or provenance persistence;
- security-sensitive auth/provider identity conflict;
- migration conflict that cannot preserve both histories safely;
- architecture-sensitive conflict where preserving upstream semantics and fork product behavior cannot be achieved by a bounded additive adaptation.

That handoff must include exact failing behavior, minimal reproducer, relevant files/surfaces, attempted fixes, test evidence, governing invariants, and the decision boundary. Do not escalate routine merge conflicts or straightforward test repairs.

## Acceptance / durable return

Return one durable handoff containing:

1. exact fork base and pinned upstream target;
2. worktree/branch ownership;
3. conflict list grouped by authority domain;
4. resolutions and rationale;
5. tests/typechecks/static checks with exact counts;
6. migration and restart evidence;
7. execution/provenance result;
8. provider capacity/identity result;
9. rendered UI result where relevant;
10. multiple-provider result or exact blocker;
11. defects/repairs and independent review;
12. rebase hotspots recorded for future upstream movement;
13. final precise status;
14. whether integration to `main` is ready or blocked;
15. exact next action.

## Stop conditions

Stop for the user only for a material product choice, material architecture trade-off, destructive/irreversible action, unresolved security/integration conflict, material paid-infrastructure cost, or conflict with accepted direction. Routine technical reconciliation continues without prompting.
