# Upstream Forward-Sync Handoff — 2026-10-31

Updated: 2026-11-02

Status: `INTEGRATED / POST-MERGE REPOSITORY PASS / CI EXCEPTION ACCEPTED / POST-MERGE RUNTIME RE-RUN PENDING`

Governing spec: `docs/internals/arm-v2-compatibility-evidence-gap-spec.md`

## Authoritative repository state

Fork repository: `jermur788/t3code`

Qualified sync candidate:

`sync/upstream-20261031 @ e51c1c5d74aed9824927d391590ddb33026c8d56`

Pinned upstream incorporated by that candidate:

`80a2351fcb909034e65a512dfabeb3cdfd367762`

PR #14 merged the exact qualified candidate into fork `main` on 2026-11-02.

Integration merge commit:

`19b128fec7be89ffe5689f4d7234121992479710`

Merge parents:

- prior fork `main`: `d971327934eeb79bed5b02e4477a5140615eacf0`
- exact qualified candidate: `e51c1c5d74aed9824927d391590ddb33026c8d56`

GitHub reports the merge commit tree as:

`ce4a3cf31214b52d374a942beb832640f3373dc6`

This is the same tree recorded for the exact qualified sync candidate. No content drift was introduced by the merge commit.

A documentation-only canonical-state update may advance `main` beyond the integration merge; the integration anchor remains `19b128fe` and the qualified content tree remains `ce4a3cf`.

## Qualification carried into integration

PR #14 recorded `LOCAL L2 RUNTIME PASS` plus independent review on exact candidate `e51c1c5d...` before integration.

Accepted evidence included:

- 186/186 focused tests across 10 files;
- 3/3 affected typechecks;
- ARM provenance four-case matrix pass;
- rendered distinct-Codex-capacity and ambiguous same-email safe-unbound behavior;
- real application stop/start persistence;
- rendered Workspace/Development reconciliation checks;
- provider/capacity boundary checks confirming no second poller, launcher, or proxy route owner;
- independent Claude Sonnet 5.5 review with no blocking defect after evidence-gap repairs.

The provenance bridge evidence is service-level executable evidence. It does not establish a broader live Runtime-to-Orchestration-V2 execution claim.

## CI exception and integration authority

GitHub Actions did not dispatch for the qualified candidate. Before integration the exact candidate had:

- pull-request workflow runs: 0;
- commit statuses: 0;
- observed check runs: 0.

This was classified as an `OPERATIONAL BLOCKER`, not a test failure, because no CI job existed.

On 2026-11-02 the user explicitly chose the recorded `accept the operational CI exception and merge` path. Browser Overall then:

1. re-read PR #14 and confirmed it was still open, mergeable, draft, and pinned to exact head `e51c1c5d...`;
2. marked PR #14 ready for review;
3. merged with `expected_head_sha = e51c1c5d74aed9824927d391590ddb33026c8d56`;
4. received GitHub merge success at `19b128fec7be89ffe5689f4d7234121992479710`;
5. re-read fork `main` and confirmed the expected two-parent merge lineage and qualified candidate tree;
6. rechecked Actions for the merge commit and still observed no workflow run.

The absence of CI is therefore an accepted operational exception for this integration, not evidence that CI passed.

## Status precision

The upstream reconciliation is now `INTEGRATED`.

Repository-level post-merge evidence establishes:

- correct merge parents;
- exact qualified candidate as the second parent;
- no merge-time content drift;
- fork `main` advanced to the intended integration commit before this state update.

Do **not** promote the integrated head to a stronger `VERIFIED` runtime verdict solely from the Git merge. No executable post-merge runtime re-run was performed by Browser Overall after the merge.

The exact candidate itself had already reached `RUNTIME PASS` before integration, and the merge tree is content-identical, but project status vocabulary keeps integrated-head execution evidence distinct from candidate qualification.

## Residual evidence limits

The following remain explicit rather than silently promoted:

- real two-subscription Codex/ChatGPT OAuth/refresh qualification was not run because only one safe real credential was available;
- no live non-test caller was demonstrated for the ARM execution-observation bridge during L2;
- workspace-disambiguation and native-limits-win paths were unit-tested rather than rendered;
- PR #14's rendered evidence used live browser DOM/ARIA/layout where screenshot capture was unavailable;
- GitHub-hosted CI did not dispatch for the candidate or integration merge.

None of these was classified as a blocking implementation defect in the accepted L2 result.

## Architectural boundaries preserved

The integrated reconciliation preserves the governing boundaries:

- Project Runtime Task remains durable project-work identity;
- upstream Orchestration V2 owns execution lifecycle semantics/identities where available;
- Project Runtime, Development Profiles, Runtime Routing, ARM, and Workspace/Development remain additive fork layers;
- `recommendation != authorization`;
- `eligibility != authorization`;
- no second provider launcher, orchestration graph, model catalog, or capacity polling engine;
- fork migration history remains separate from upstream migration history.

## Upstream movement after the qualified pin

The integration intentionally incorporated the reproducible pinned upstream snapshot `80a2351f...` rather than silently chasing moving upstream `main` during qualification.

At the final pre-merge refresh, upstream `pingdotgg/t3code main` had advanced to:

`fa31b66bbb2ae5234205a8628a78e038d917202f`

with commit `fix(server): Codex sessions get T3CODE_THREAD_ID like Claude sessions (#28604)`.

Treat changes after `80a2351f...` as a new forward-sync delta. They do not invalidate the completed qualification of the pinned candidate, and they must not be folded retrospectively into this integration record.

## Exact next action

1. In a runnable checkout, fetch current fork `main` and confirm the integration/state-update lineage is clean.
2. Run the focused post-merge verification required to promote the integrated state beyond `INTEGRATED`, prioritizing Runtime/ARM persistence, routing/execution reconciliation, affected provider/capacity paths, and any rendered Workspace/Development surfaces touched by the sync.
3. Record the exact tested integrated SHA and evidence; if it passes, mark the sync gate `VERIFIED` at the strongest supported scope.
4. Refresh the upstream delta from pinned `80a2351f...` to current upstream before starting another forward-sync; treat it as a separate bounded sync task.
5. Only after the compatibility/sync gate has the required verification should the Adaptive Orchestration sequence proceed to bounded paired/shadow evidence pilots under the governing spec.

No learned/autonomous routing is authorized by this integration.

## User action

No further product decision is required for the completed merge. The remaining post-merge runtime verification is technical work. A new user decision is required only if later reconciliation exposes a material product/architecture trade-off or another explicit integration exception.