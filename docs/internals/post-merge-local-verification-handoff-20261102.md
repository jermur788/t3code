# T3 Fork — Local Lane Handoff — Post-Merge Integrated-Head Verification

Date: 2026-11-02
Classification: `LOCAL/CODE REQUIRED`
Status: `READY`
Owner: one local writer / verifier
Preferred provider: DeepSeek/OpenCode-class for routine qualification; escalate only for a proven hard debugging, concurrency, security, or architecture-sensitive defect. Independent review should be cross-provider where it materially improves confidence.

## Governing sources

- Project Instructions / T3 Fork project instructions.
- `docs/internals/arm-v2-compatibility-evidence-gap-spec.md`.
- `docs/internals/upstream-sync-20261031-handoff.md`.
- PR #14 final integration record.

## Exact base and integration lineage

Fork: `jermur788/t3code`

Required starting base:

`main @ 8f1b8742251446d67bab1c6ae983140db82a23d9`

This is a documentation-only state update whose parent is the integration merge:

`19b128fec7be89ffe5689f4d7234121992479710`

PR #14 integrated exact qualified candidate:

`e51c1c5d74aed9824927d391590ddb33026c8d56`

Qualified/integrated content tree at merge:

`ce4a3cf31214b52d374a942beb832640f3373dc6`

Pinned upstream incorporated by the candidate:

`80a2351fcb909034e65a512dfabeb3cdfd367762`

Do not pull a newer upstream snapshot into this verification task. New upstream movement is a separate future sync.

## Current status

Current project state is:

`INTEGRATED / POST-MERGE REPOSITORY PASS / CI EXCEPTION ACCEPTED / POST-MERGE RUNTIME RE-RUN PENDING`.

The exact candidate already passed local L2 before merge, including:

- 186/186 focused tests across 10 files;
- 3/3 affected typechecks;
- ARM provenance four-case matrix;
- real application stop/start persistence;
- rendered distinct Codex capacity and ambiguous same-email safe-unbound behavior;
- rendered Workspace/Development reconciliation checks;
- provider/capacity boundary checks;
- independent Claude Sonnet 5.5 review with no blocking defect after evidence-gap repairs.

The merge tree matched the qualified candidate tree, but the governing status discipline requires integrated-head executable evidence before promotion to `VERIFIED`.

GitHub CI did not dispatch. The user accepted that operational exception. Do not treat absent CI as either a pass or a test failure.

## Objective

Run focused executable verification on the exact current integrated fork lineage and determine the strongest supportable status. Repair routine technical defects if discovered, then rerun affected gates. Do not weaken tests to make them pass.

## Repo/worktree safety preflight

Before any write:

1. fetch `origin` and confirm `origin/main == 8f1b8742251446d67bab1c6ae983140db82a23d9` unless a newer Manager-approved state has been published;
2. inspect all relevant worktrees/branches and ownership;
3. confirm a clean verification worktree or create an isolated one from the exact base;
4. preserve unrelated uncommitted work; do not stash/reset/discard/overwrite another worker's state;
5. record branch, worktree, base SHA, toolchain versions, database path/fixture strategy, and provider credentials actually available;
6. use one writer for any repair lane.

Suggested verification branch if a branch is needed:

`verify/post-merge-runtime-20261102`

No production edit is authorized unless a failing gate proves a defect and the ownership/scope is clear. If repair is needed, commit it separately and record why.

## Required verification sequence

### L1 — exact-head static/focused regression

On exact starting `main`:

1. rerun the focused Runtime/ARM/provider-capacity test set corresponding to the accepted L2 candidate evidence;
2. rerun affected package typechecks;
3. run changed-package format/lint/static checks where the reconciled upstream/fork surfaces require them;
4. confirm no test expectation was weakened relative to the qualified candidate.

If the original exact command list is available in the local L2 durable result (`Overall-Dev/messages/t3-fork/2026-11-01-local-l2-combined-sync-qualification-result.md`), reuse it rather than inventing a different suite. Record exact commands and results.

### L2 — persistence / migration / restart

Prove on integrated `main`:

1. fresh database migration/start succeeds with both upstream and fork migration histories intact;
2. existing persisted Project Runtime / Runtime Routing / ARM state can reopen or has the already-reviewed migration behavior;
3. stop the real application and restart it;
4. confirm durable project/task/execution/handoff/routing/ARM state survives as applicable;
5. verify no upstream migration id was rewritten or collided with the fork migration ledger.

This is required by the governing compatibility acceptance criteria; repository inspection alone is insufficient.

### L3 — Runtime routing and execution reconciliation

Exercise the real Runtime path on integrated `main` as far as available credentials/environment permit:

1. create or use a bounded Runtime task/fixture;
2. resolve routing through the normal routing precedence;
3. confirm `eligibility != authorization` and `recommendation != authorization` remain true in behavior;
4. launch/reconcile an execution through the normal provider/orchestration path where safe;
5. verify attempt-first persistence and restart/reconciliation behavior;
6. verify ARM execution-observation/provenance linkage does not conflate requested, selected/resolved, and actually executed provider/model/configuration;
7. if executed-model attribution is unavailable from provider/runtime evidence, record `UNKNOWN` rather than inferring it.

The earlier L2 result established service-level provenance bridge evidence but explicitly did not claim a broader live Runtime↔Orchestration-V2 execution pass. If feasible, this run should close that evidence gap. If credentials or provider behavior block it, classify the blocker precisely rather than fabricating a pass.

### L4 — provider capacity / identity paths

Recheck the reconciled capacity behavior:

1. upstream/provider usage-limit state remains the operational source where available;
2. ARM capacity remains durable evidence, not a second poller/provider-health engine;
3. distinct Codex/provider subscription identities bind only when identity evidence is sufficient;
4. ambiguous same-email/multi-target cases remain safely unbound rather than assigned to the wrong route;
5. native limits remain authoritative where required;
6. no proxy round-robin/fill-first routing or second launcher was introduced.

Use real provider credentials only when safely available. If only one real Codex/ChatGPT credential is available, do not promote fixture/two-account evidence to a real two-subscription OAuth pass.

### L5 — rendered UI qualification

Render and inspect the affected integrated surfaces, at minimum where available:

- Workspace mode;
- Development mode;
- Project/Runtime routing/execution state relevant to the reconciliation;
- Usage/capacity/provider identity presentation.

Check for:

- correct data binding;
- no duplicate or misleading provider/capacity rows;
- no hidden reconciliation regression;
- persistence after reload/restart;
- no mode switch mutating Runtime/provider/routing truth.

Rendered inspection is required for UI claims. DOM/unit-only evidence is not sufficient for a rendered verdict.

### L6 — provider-neutral qualification

Use more than one provider where practical and safe. Do not block the entire gate solely because a second paid credential is unavailable if all other required integrated-head evidence passes; instead return the exact residual credential blocker and the strongest narrower verdict supported.

## Failure classification

Use the project classifications precisely. Relevant examples:

- `IMPLEMENTATION DEFECT`;
- `VERIFICATION FAILURE`;
- `OPERATIONAL BLOCKER`;
- `REVIEW REQUIRED`;
- `INTEGRATION CONFLICT`;
- `UPSTREAM COMPATIBILITY`;
- `PRODUCT DECISION`.

For adaptive evidence, preserve the underlying typed error/evidence and map only secondarily to compact classes such as provider capacity/auth/network, tool/environment, harness/fixture, implementation defect, verification failure, integration conflict, cancellation, policy stop, or unknown.

## Repair policy

Routine technical defects are authorized for repair without asking the user, provided scope/ownership is clear.

For every repair:

1. preserve the failing evidence;
2. identify root cause;
3. make the smallest compatible fix;
4. do not weaken/rebaseline accepted gates merely to pass;
5. rerun the failed gate and relevant regression suite;
6. request independent review when the repair affects persistence, execution provenance, provider identity/capacity, authorization, security, or architecture-sensitive orchestration behavior;
7. do not merge a repair to `main` until acceptance and review requirements are satisfied.

Stop for the user only if a material product/architecture choice, destructive action, unresolved security/integration conflict, material paid-infrastructure cost, or conflict with accepted direction is exposed.

## Acceptance criteria

Promote the integrated sync gate to `VERIFIED` only if the applicable governing criteria are evidenced on the integrated/repaired head, including:

- Project Runtime Task remains durable project-work identity;
- upstream V2 execution identities are reused rather than duplicated where available;
- persisted Runtime/ARM data survives migration/restart or follows a reviewed migration path;
- requested/selected/executed provenance is not conflated;
- upstream usage-limit/provider state feeds capacity evidence where available;
- adaptive recommendations remain non-authoritative;
- no second provider launcher/catalog/orchestration graph/capacity poller exists;
- relevant fork/upstream tests pass;
- persistence has restart/reload evidence;
- UI claims have rendered evidence;
- the exact integrated head, not only the old candidate, has executable proof.

If some optional/credential-dependent evidence remains unavailable, state the strongest narrower verdict and explicit blocker. Do not overclaim.

## Required durable result

Return a handoff containing:

1. exact tested SHA and branch/worktree;
2. toolchain/environment/provider availability;
3. exact commands/tests and pass/fail counts;
4. fresh migration result;
5. restart/reload persistence result;
6. Runtime execution/reconciliation result;
7. ARM provenance result, including requested/resolved/executed attribution status;
8. provider capacity/identity result;
9. rendered UI result;
10. multiple-provider result or exact credential blocker;
11. defects found, repairs made, commits, and independent-review result where required;
12. residual risks;
13. final precise status (`RUNTIME PASS`, `REVIEW PASS`, `VERIFIED`, `BLOCKED`, etc.);
14. exact next action.

If verification passes without a repair, do not create unnecessary production changes. Publish evidence/handoff separately and return control to the Manager for canonical-state reconciliation.

## Next dependency

Do not start the next 448-commit upstream forward-sync or the Adaptive Orchestration paired/shadow pilot as part of this local task. Return the current integrated-head verification result first. The Manager will reconcile browser delta-triage evidence and decide the next bounded task from governing state.
