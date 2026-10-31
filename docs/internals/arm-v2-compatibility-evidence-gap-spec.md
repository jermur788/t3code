# ARM / Orchestration V2 Compatibility and Evidence Gap Spec

Date: 2026-10-31
Status: GOVERNING SPEC FOR UPSTREAM RECONCILIATION AND NEXT ARM WORK
Base inspected: fork `main @ 945627ca3c929bd8838de6ace5ac8c653acf217d`
Upstream inspected: `pingdotgg/t3code main @ 80a2351fcb909034e65a512dfabeb3cdfd367762`

## 1. Purpose

Reconcile the fork's existing Project Runtime / Runtime Routing / Adaptive Routing foundation with current upstream T3 orchestration before further Adaptive Model Routing implementation.

This spec exists because the fork has materially diverged from upstream while upstream has added Orchestration V2 execution identities, provider capability design/implementation, usage-limit infrastructure, delegated-task analytics, and richer orchestration evals.

The fork must remain upstream-friendly. New ARM work must extend current upstream/fork domain services rather than freeze a competing orchestration engine.

## 2. Product invariants

The following remain authoritative fork product intent:

1. Project truth is provider/model/thread independent.
2. Project Runtime tasks and handoffs represent durable project work and continuation, not provider-native lifecycle.
3. Routing recommendations are evidence/advice, not launch authorization.
4. Provider/model/runtime eligibility is rechecked at launch by the normal T3 orchestration/provider path.
5. Observed evidence, orchestrator claims, retrospective inference, hypotheses, and accepted policy remain distinct.
6. Learned routing is not authorized until repeatable evidence supports it.
7. Upstream infrastructure should be reused when it owns the same operational concern.
8. Fork-owned additions should stay additive and isolated where practical.

## 3. Current implementation truth

### Fork-owned durable project layer

The fork already owns:

- Project Runtime instructions/sources/state;
- Project Runtime tasks and handoffs;
- Development Profiles;
- Runtime routing policy and precedence;
- Runtime execution attempts and restart reconciliation;
- Workspace / Development presentation;
- ARM contracts and persistence foundation.

### Existing ARM foundation

Current fork ARM contracts/persistence already cover:

- predicted difficulty and confidence;
- realized difficulty with evidence refs;
- attempt-linked execution observation references;
- capacity pools/snapshots/reset events;
- accepted outcomes with revision-protected reconciliation history;
- recommendation receipts;
- experiment assignments;
- append-oriented persistence for raw evidence records.

This is not a greenfield evidence-schema project.

### Current upstream surfaces to adopt/reuse

Current upstream now supplies or targets:

- Orchestration V2 `AppThread` / `Run` / `RunAttempt` / `ExecutionNode` identities;
- durable provider sessions and provider threads;
- context-transfer / context-handoff relationships;
- typed provider capability architecture;
- model manifest metadata;
- usage-limit source snapshots and provider-specific usage-limit support;
- Orchestration V2 usage-limit recovery;
- delegated-task analytics lifecycle seams;
- MCP orchestration eval infrastructure.

## 4. Authority boundaries

### Project Runtime Task

A Project Runtime Task remains the canonical identity for durable project work.

It may outlive:

- a T3 thread;
- one or more orchestration runs;
- provider/model changes;
- retries;
- restart/recovery;
- individual delegated workers.

It must not be replaced by an upstream `Run`, `RunAttempt`, or provider-native thread identity.

### Upstream Orchestration V2 graph

When the reconciled fork contains V2 identities, the upstream V2 graph is authoritative for orchestration/execution lifecycle facts:

- app thread;
- run;
- run attempt;
- execution-node parentage;
- provider session/thread;
- context transfer/handoff;
- provider/runtime request lifecycle.

ARM must reference or derive from these identities rather than maintain a second competing orchestration graph.

### Fork Runtime execution attempt

The existing fork Runtime execution attempt remains the project-owned launch/reconciliation receipt until the upstream-sync work proves an explicit replacement/mapping.

During compatibility work, it may act as a bridge from Project Runtime Task to upstream orchestration identities.

Do not delete or reinterpret persisted Runtime attempts without a migration/compatibility decision backed by executable evidence.

## 5. Identity mapping target

The target relationship is:

```text
Project Runtime Task
  -> fork Runtime execution attempt / launch receipt
      -> upstream AppThread (worker thread)
          -> upstream Run
              -> upstream RunAttempt
                  -> ExecutionNode tree
                      -> ProviderSession / ProviderThread
                      -> ContextTransfer / ContextHandoff as applicable
```

Not every upstream entity must be duplicated into ARM.

ARM should persist only the stable references necessary to reconstruct the evidence relationship after restart and after provider/model changes.

## 6. Requested, selected, and executed model provenance

Adaptive evidence must distinguish at least three stages:

1. **Requested configuration** — what task/routing policy requested.
2. **Selected/resolved configuration** — what the routing resolver chose immediately before launch.
3. **Executed configuration** — what provider/runtime evidence proves actually ran.

Where available, also record:

- provider substitution/fallback notice;
- substitution reason/class;
- provenance source;
- confidence/quality when execution identity is inferred rather than provider-reported.

A requested model must never be treated as execution provenance solely because launch requested it.

If current upstream does not yet expose executed-model attribution on main, the compatibility layer must remain able to record `UNKNOWN` and adopt upstream attribution when available.

## 7. Provider capability boundary

Published/declared capabilities and empirical routing performance are separate domains.

### Upstream-owned

Prefer upstream/provider adapters/model manifest for:

- provider/model identity;
- provider feature support;
- model option support;
- runtime/interaction modes;
- provider-thread/turn/item identity quality;
- provider subagent/checkpoint/context-handoff capabilities.

### ARM-owned

ARM may record empirical observations such as:

- verified outcome by task characteristics;
- repair burden;
- verification burden;
- latency/wall time;
- resource proxies;
- provider failures;
- capacity fit;
- orchestration/coordination overhead.

Do not create a second general provider capability catalog.

## 8. Capacity / usage-limit compatibility

Upstream usage-limit/provider state is operational source data when available.

The fork's durable ARM capacity records remain useful as evidence snapshots, but they must not become a second polling or provider-health engine.

Target flow:

```text
upstream provider / usage-limit source
  -> operational snapshot
      -> ARM adapter/capture
          -> immutable AdaptiveCapacitySnapshot
              -> linked to prediction / recommendation / execution observation
```

ARM records:

- capacity-pool identity at the privacy level already defined by ARM;
- source quality;
- observed windows/remaining/reset when available;
- explicit `UNKNOWN` when unavailable;
- pre-dispatch capacity prediction;
- post-attempt observed capacity/provider failure when available.

Do not infer exact account identity when upstream does not provide a safe stable identifier.

## 9. Verification evidence gap

Existing accepted outcome state is necessary but not sufficient to compare routing strategies.

Add the smallest normalized verification representation that can answer:

- what verification was required;
- what verification actually ran;
- whether it was independent;
- whether it exercised runtime behavior or only static checks;
- whether persistence/restart/UI/multi-provider qualification was required;
- strength/completeness of verification;
- evidence references.

Prefer deriving this from existing Runtime handoffs/verification records where reliable.

Do not duplicate large test output or handoff bodies inside ARM.

A compact candidate shape may include:

```text
verificationProfileId
requiredKinds[]
performedKinds[]
independence: none | same-provider | cross-provider | human | external
result: pass | fail | partial | blocked | unknown
strength: weak | moderate | strong
EvidenceRefs[]
```

The exact contract should be finalized only after inspecting the reconciled upstream/fork evidence surfaces.

## 10. Failure taxonomy gap

Adaptive learning needs failure classification without replacing upstream typed errors.

The compatibility layer should map authoritative errors/outcomes into a compact adaptive class such as:

- provider_capacity;
- provider_auth;
- provider_network;
- provider_unavailable;
- provider_substitution;
- tool_or_environment;
- harness_or_verification_fixture;
- implementation_defect;
- verification_failure;
- integration_conflict;
- cancellation;
- operator_or_policy_stop;
- unknown.

The original typed error/evidence reference remains authoritative.

The adaptive class is a learning/aggregation projection, not a replacement error system.

## 11. Decomposition and coordination evidence

Do not persist a duplicate task graph if decomposition can be reconstructed from Project Runtime tasks, delegated tasks, V2 execution nodes, or context transfers.

Add only evidence that cannot be reconstructed reliably, such as:

- manager-predicted strategy/topology before dispatch;
- alternatives considered;
- explicit writer-ownership assumption;
- observed manager/human coordination interventions;
- repair/retry/salvage count where no authoritative derived path exists.

## 12. Recommendation boundary

Existing invariant remains governing:

> A recommendation is evidence, never launch authorization.

An adaptive recommendation may influence candidate ordering or provide an advisory candidate.

It must not:

- bypass normal T3 provider eligibility;
- bypass project/provider settings;
- start a worker itself;
- silently replace an unavailable user-requested provider/model;
- mutate durable routing policy without an explicit accepted-policy mechanism.

## 13. Upstream-sync integration order

Do not forward-sync 636 upstream commits directly into fork `main` without an isolated integration lane.

Use this order:

### Phase U0 — browser-level integration probe

- create an isolated upstream-sync branch from current fork main;
- attempt to merge current upstream main into that branch through GitHub;
- record mergeability/conflict evidence;
- do not merge the sync branch to fork main before executable verification.

### Phase U1 — core contracts/provider/orchestration reconciliation

Prioritize conflicts in:

- `packages/provider-core/src/server/orchestrationInstructions.ts`;
- orchestration/delegation contracts;
- provider capability/model metadata surfaces;
- server orchestration wiring;
- MCP orchestration lifecycle.

Preserve fork Project Runtime additions as additive layers.

### Phase U2 — persistence/runtime reconciliation

Reconcile:

- fork migration ledger;
- Project Runtime persistence;
- Runtime routing/execution bridge;
- ARM migration/service;
- upstream V2 persistence/event/projection changes.

No upstream migration id may be rewritten by fork migration history.

### Phase U3 — web/mobile/operator surface

Reconcile UI after domain/server behavior is stable.

Preserve the fork's Workspace/Development presentation while adopting compatible upstream UI/runtime improvements.

### Phase U4 — verification

At minimum:

- format/lint/typecheck for changed packages;
- focused fork Runtime/ARM tests;
- upstream orchestration tests affected by conflict resolutions;
- fresh database migration test;
- restart/reload persistence proof;
- Runtime execution/reconciliation test;
- provider routing/eligibility checks;
- rendered UI inspection for Workspace/Development affected surfaces;
- provider-neutral qualification with multiple providers where practical.

Only after this may the sync branch be marked `VERIFIED` and integrated to `main`.

## 14. ARM work allowed before upstream sync completes

Allowed:

- documentation/specification;
- read-only archaeology;
- compatibility adapters that are clearly additive and do not assume stale upstream internals;
- tests/fixtures that characterize current behavior;
- evidence-schema gap analysis.

Deferred until sync/reconciliation:

- ARM-020-style deep launch-path instrumentation tied to stale orchestration internals;
- autonomous learned routing;
- a second provider/capacity polling engine;
- a fork-specific replacement orchestration graph;
- hard recursive delegation governance.

## 15. Acceptance criteria for compatibility layer

The compatibility work is accepted only when all applicable criteria are evidenced:

1. Project Runtime Task remains durable project-work identity.
2. Reconciled upstream V2 execution identities are used rather than duplicated where available.
3. Existing persisted Runtime/ARM data survives migration/restart or has a reviewed migration path.
4. Requested/selected/executed model provenance cannot be conflated.
5. Capacity evidence consumes upstream provider/usage-limit data where available.
6. Adaptive recommendations remain non-authoritative.
7. Failure taxonomy is a projection over authoritative errors, not a replacement.
8. Verification strength/profile is available for learning without copying large test bodies.
9. No second provider launcher/catalog/orchestration graph/capacity poller is introduced.
10. Relevant fork and upstream tests pass at the level required by affected code.
11. Persistence changes have restart/reload evidence.
12. UI changes have rendered inspection.
13. Integration is proven on the integrated head, not only component branches.

## 16. Evidence pilot after reconciliation

After sync/compatibility is `VERIFIED`, run bounded paired/shadow comparisons on low-risk real work.

For each sampled comparison record before dispatch:

- task characteristics;
- predicted difficulty/uncertainty;
- selected route and alternatives;
- capacity/context prediction;
- verification profile;
- comparison assignment.

After work record:

- actual executed provider/model/config;
- accepted outcome;
- verification result/strength;
- repairs/retries/salvage;
- wall time/resource proxies;
- provider failures;
- orchestration overhead;
- evidence provenance.

Use the same brief and verification standard across comparison arms.

Observational data remains labeled confounded.

## 17. Out of scope

This spec does not authorize:

- autonomous learned routing;
- global model rankings;
- automatic policy mutation from observations;
- hard recursive delegation budgets;
- a development-operations dashboard implementation;
- provider-account identity expansion;
- energy/carbon claims from resource proxies;
- replacing upstream Orchestration V2 with fork-owned equivalents.

## 18. Rebase hotspots to monitor

Treat these as expected high-conflict surfaces:

1. `packages/provider-core/src/server/orchestrationInstructions.ts`
2. `apps/server/src/mcp/*`
3. orchestration/thread-launch/execution lifecycle code
4. contract aggregation / RPC schemas
5. provider adapters/core
6. persistence/event/projection wiring around Orchestration V2

Preserve the fork's lower-conflict isolation choices:

- separate fork migration ledger;
- additive Project Runtime services;
- additive ARM service/contracts;
- advisory routing boundary.

## 19. Status vocabulary for this effort

Use only the strongest evidenced state:

- `IMPLEMENTED`
- `STATIC PASS`
- `RUNTIME PASS`
- `REVIEW PASS`
- `INTEGRATED`
- `VERIFIED`
- `BLOCKED`
- `DEFERRED`

A GitHub mergeable result is not runtime verification.

## 20. Stop conditions

Stop for product decision only if reconciliation proves a material conflict between:

- adopting upstream orchestration identities/semantics; and
- preserving an accepted fork product invariant.

Routine merge conflicts, compile/test failures, migration repairs, and additive compatibility changes are technical work and should continue through the normal manager loop.

## 21. Immediate next action

1. Persist this spec.
2. Create isolated upstream-sync branch from fork main.
3. Attempt current upstream main integration there.
4. Record exact conflict/merge result.
5. If conflict-free, keep the result isolated and run all executable verification available before proposing integration to fork main.
6. If conflicts occur, classify them by hotspot and resolve only when the correct upstream/fork authority is clear.
7. Update Current State with the sync branch, pinned upstream SHA, blockers, and next action.

No learned routing work starts until this compatibility/sync gate is resolved.
