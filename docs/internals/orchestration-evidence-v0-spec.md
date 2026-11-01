# Orchestration Evidence V0 — Governing Spec

Date: 2026-11-01  
Status: **GOVERNING SPEC — V0 RESEARCH / IMPLEMENTATION**  
Frozen implementation base: `e51c1c5d74aed9824927d391590ddb33026c8d56`  
Current upstream inspected during browser archaeology: `pingdotgg/t3code main @ 1d626d02d95f9a2343553f6498037ee82290d304`  
Parent compatibility spec: `docs/internals/arm-v2-compatibility-evidence-gap-spec.md`

## 1. Purpose

Orchestration Evidence V0 provides the smallest useful, upstream-friendly way to **reconstruct and export evidence that T3 already owns** about a Project Runtime task and its routing/execution history.

V0 is not a new orchestration database and is not a learned router. Its job is to make existing Runtime, ARM, and upstream Orchestration V2 truth inspectable as one versioned evidence view without changing which subsystem owns each fact.

The governing data flow is:

```text
Project Runtime / Runtime Execution / ARM / Orchestration V2 authoritative records
                              |
                              v
               Orchestration Evidence V0 view
                              |
                    +---------+---------+
                    |                   |
                    v                   v
             task reconstruction    JSONL export
                    |                   |
                    +---------+---------+
                              |
                     later analysis only
```

The export is rebuildable. It is not a second source of truth.

## 2. Product invariants

V0 must preserve these existing invariants:

1. **Project Runtime Task is durable project-work identity.** It can outlive threads, runs, providers, models, retries, and conversations.
2. **Upstream Orchestration V2 owns execution-lifecycle truth** where those identities exist: thread, run, run attempt, execution node, provider session/thread, context transfer/handoff, and orchestration events.
3. **Fork Runtime execution attempt is the project-owned launch/reconciliation receipt** connecting a Runtime task to the launched V2 thread/run.
4. **ARM owns adaptive evidence**, including difficulty predictions, recommendation receipts, capacity observations, experiments, execution-observation references, failure/verification projections, accepted outcomes, and reconciliation history.
5. **Recommendation is not authorization. Eligibility is not authorization.** Evidence V0 never launches a worker or mutates routing policy.
6. **Observed fact, orchestrator claim, retrospective inference, candidate hypothesis, and accepted policy remain distinct.** Export must not flatten them into one truth class.
7. **UNKNOWN remains UNKNOWN.** Export or reconstruction must not infer unsupported quota, context, cost, executed model, verification independence, or route rationale.
8. **Corrections append; history is not rewritten.** Existing immutable records remain immutable and accepted-outcome changes retain their reconciliation history.
9. **Upstream underneath, fork above.** V0 consumes upstream identities/events/capacity sources rather than replacing them.
10. V0 is generic T3 infrastructure. It must not encode CCF-specific task classes, Unity semantics, issue numbering, or project-specific evidence formats into core contracts.

## 3. Source-of-truth map

| Evidence concern | Authority in V0 | Classification on frozen base | Notes |
|---|---|---|---|
| Project identity | Project Runtime / Project | `ALREADY CANONICAL` | `ProjectId` |
| Durable work identity | Project Runtime | `ALREADY CANONICAL` | `ProjectRuntimeTaskId` |
| Task objective/scope/acceptance/status | Project Runtime | `ALREADY CANONICAL` | Task record, revisions, handoffs |
| Project verification milestone/evidence | Project Runtime | `ALREADY CANONICAL` | Do not infer independence/strength absent ARM profile |
| Runtime launch attempt | Runtime Execution | `ALREADY CANONICAL` | `RuntimeExecutionAttemptId` + receipt |
| Resolved route / resolver rejections | Runtime Routing | `ALREADY CANONICAL` | Stored in attempt routing receipt |
| Concrete selected launch config | Runtime Execution | `ALREADY CANONICAL` | `receipt.launch.modelSelection` + modes/workspace |
| V2 app thread | Orchestration V2 | `ALREADY CANONICAL` | `ThreadId` |
| V2 run | Orchestration V2 | `ALREADY CANONICAL` | `RunId` |
| V2 run attempt | Orchestration V2 | `ALREADY CANONICAL` | `RunAttemptId` |
| V2 execution-node topology | Orchestration V2 | `ALREADY CANONICAL` | `NodeId`, parent/root links |
| Provider session/thread | Orchestration V2 | `ALREADY CANONICAL` | Provider execution identity |
| Context transfer/handoff | Orchestration V2 | `ALREADY CANONICAL` | Export references; do not duplicate graph |
| V2 event sequence / occurred time | Orchestration V2 event store | `ALREADY CANONICAL` | Preserve event sequence and `occurredAt` |
| Pre-routing difficulty | ARM | `ALREADY CANONICAL` | Immutable prediction + override history semantics |
| Realized difficulty | ARM | `ALREADY CANONICAL` | Post-evidence derivation |
| Adaptive recommendation | ARM | `ALREADY CANONICAL` | Advisory receipt only |
| Candidate set in recommendation | ARM | `ALREADY CANONICAL` when receipt exists | Not necessarily all options a human/model considered |
| Selected route | Runtime attempt receipt | `ALREADY CANONICAL` | Do not substitute recommendation for selected route |
| Recommendation -> exact attempt correlation | ARM + Runtime | `AMBIGUOUS` in some histories | Shared task/prediction links can be insufficient if multiple receipts exist |
| Requested model/config | Runtime/ARM | `ALREADY CANONICAL` when captured | Preserve source and timestamp |
| Selected/resolved model/config | Runtime attempt receipt / ARM | `ALREADY CANONICAL` | Resolver/launch state |
| Actually executed provider/session/thread | Orchestration V2 | `ALREADY CANONICAL` when V2 record exists | Prefer run-attempt/session/thread evidence |
| Actually executed model | Provider/V2/ARM execution observation | `AMBIGUOUS` / `MISSING` when not reported | Never copy requested model into executed field |
| Capacity pool identity | ARM | `ALREADY CANONICAL` | Privacy-preserving opaque pool identity |
| Operational usage-limit source | upstream usage infrastructure | `ALREADY CANONICAL` operational source | ARM captures immutable evidence snapshots; no second poller |
| Capacity prediction / decision-time snapshot | ARM | `ALREADY CANONICAL` when captured | Missing capture remains UNKNOWN |
| Verification profile | ARM execution observation | `ALREADY CANONICAL` when captured | Required/performed kinds, independence, result, strength |
| Failure class | ARM execution observation | `ALREADY CANONICAL` when captured | Projection over authoritative error/evidence |
| Accepted outcome | ARM | `ALREADY CANONICAL` | Revision-protected mutable head |
| Outcome reconciliation history | ARM | `ALREADY CANONICAL` | Immutable append history |
| Experiment assignment | ARM | `ALREADY CANONICAL` | Controlled/observational assignment metadata |
| Anonymous product telemetry | upstream analytics | `DERIVABLE / NON-CANONICAL FOR PROJECT` | Useful lifecycle seam, not project truth |
| Unified task evidence reconstruction | none | `MISSING` | Primary V0 implementation target |
| Versioned JSONL evidence export | none | `MISSING` | Derived transport only |
| External/browser/local evidence not yet in T3 typed state | project-owned staging evidence | `MISSING FROM CANONICAL TYPED STATE` | May be referenced/exported with explicit staging classification |

## 4. Existing canonical relationship

The expected identity path on the frozen base is:

```text
Project Runtime Task
  -> Runtime execution attempt
      -> routing receipt + selected launch configuration
      -> V2 AppThread
          -> V2 Run
              -> V2 RunAttempt
                  -> ExecutionNode tree
                  -> ProviderSession / ProviderThread
                  -> ContextTransfer / ContextHandoff as applicable
```

ARM evidence links into this path rather than replacing it:

```text
DifficultyPrediction ----+
RecommendationReceipt ---+--- task/prediction context
CapacitySnapshot --------+
ExperimentAssignment ----+
                         |
                         v
              ExecutionObservationReference
                         |
                         +--> RuntimeExecutionAttempt
                         +--> V2 execution references
                         +--> verification/failure projection
                         +--> AcceptedOutcome
```

V0 must preserve these references. It must not materialize a parallel graph with new task/run/node/provider identities.

## 5. V0 implementation boundary

The preferred V0 implementation is a reusable **derived domain service**. A repository-consistent final name may vary, but its responsibility is equivalent to `OrchestrationEvidenceService`.

It should:

1. read a Project Runtime task and its Runtime execution attempts;
2. read the ARM records relevant to that task;
3. resolve referenced V2 execution/event records through existing V2 services/event store;
4. emit a deterministic versioned evidence view;
5. optionally serialize that view as line-delimited JSON;
6. support one deterministic task-history reconstruction operation.

It must not persist the reconstructed view as canonical state.

### No V0 migration by default

A new evidence table, event store, task graph, or export database is **not part of V0**.

If implementation discovers that one decision-time fact cannot be represented without durable storage, it must first prove that the fact is not already canonical or reliably derivable. Such a discovery is a spec discrepancy, not automatic authorization for a migration.

## 6. Versioned export envelope

V0 export uses one envelope per evidence item. JSONL is the preferred transport for append-friendly analysis, but the same envelope may be returned through a domain API.

A contract equivalent to the following is acceptable:

```ts
interface OrchestrationEvidenceV0Item {
  schema: "t3.orchestration-evidence";
  version: 0;

  // Export identity; neither becomes a new project/execution identity.
  exportId: string;
  itemId: string;

  projectId: ProjectId;
  taskId: ProjectRuntimeTaskId;
  attemptId?: RuntimeExecutionAttemptId;

  evidenceClass:
    | "decision_time"
    | "routing_resolution"
    | "execution"
    | "verification"
    | "outcome"
    | "reconciliation"
    | "staging";

  authority:
    | "project_runtime"
    | "runtime_execution"
    | "runtime_routing"
    | "arm"
    | "orchestration_v2"
    | "project_staging";

  canonicalRef: {
    recordType: string;
    recordId: string;
    revision?: number;
    schemaVersion?: number;
  };

  occurredAt: string | null;
  recordedAt: string | null;
  exportedAt: string;

  executionRefs?: {
    threadId?: ThreadId;
    runId?: RunId;
    runAttemptId?: RunAttemptId;
    nodeId?: NodeId;
    providerSessionId?: ProviderSessionId;
    providerThreadId?: ProviderThreadId;
    contextTransferId?: ContextTransferId;
    contextHandoffId?: ContextHandoffId;
  };

  sourceQuality?: string;
  evidenceRefs: string[];
  unknownFields: string[];

  // Optional canonical encoding or bounded projection for portable export.
  // This is a copy, never the owner of the represented fact.
  snapshot?: unknown;

  correctionOf?: string;
}
```

The exact TypeScript names may change to match repository conventions. The semantics above are governing.

### Export identity rules

- `exportId` identifies one generated export/reconstruction operation.
- `itemId` identifies one item **within the exported evidence view**. Prefer a deterministic derivation from authority + record type + canonical record id/revision rather than minting another durable domain identity.
- A V2 event should retain its canonical `EventId` and sequence in its snapshot/reference; the Evidence item id does not replace it.
- Re-exporting the same canonical record may produce a different `exportId` but should produce a stable `itemId` when practical.

## 7. Time semantics

V0 must distinguish three clocks:

- `occurredAt`: when the source says the domain event/observation occurred;
- `recordedAt`: when the authoritative source proves it was durably recorded, **only if such a distinct timestamp exists**;
- `exportedAt`: when the derived export was generated.

Rules:

1. Never use `exportedAt` as a substitute for missing `recordedAt`.
2. When the source exposes only one timestamp, place it according to that source's documented semantics and leave the other field null/UNKNOWN.
3. Preserve V2 event-store sequence as the strongest ordering signal for V2 events.
4. Preserve ARM outcome revision/reconciliation order and Runtime attempt revision where relevant.

## 8. Decision-time versus outcome evidence

Outcome leakage is a blocking V0 defect.

### Decision-time evidence

Decision-time items may include only facts available at the decision's recorded time, for example:

- immutable ARM difficulty prediction;
- capacity snapshots referenced by the decision/recommendation;
- ARM recommendation receipt and its eligible candidate set/reasons/uncertainty;
- Runtime route resolution and resolver rejection evidence;
- concrete launch selection once resolution occurred.

Later outcome, verification, repair, or executed-model evidence must not be copied backward into an earlier decision item.

### Outcome evidence

Outcome items may reference the original decision identifiers and include:

- actual V2 provider/session/thread/run-attempt evidence;
- ARM execution observation;
- verification profile/result;
- failure projection and authoritative error reference;
- accepted outcome and reconciliation;
- Runtime task/handoff verification milestone.

If the final route differs from an earlier adaptive recommendation and no authoritative reason record exists, export the difference and mark the rationale UNKNOWN. Do not manufacture a post-hoc explanation.

## 9. Routing choice-set semantics

Several distinct concepts must remain separate:

1. **Adaptive candidates considered** — `AdaptiveRecommendationReceipt.eligibleCandidates` when a receipt exists.
2. **Resolver candidates evaluated** — selected/rejected candidates in `RuntimeRouteResolution`.
3. **Concrete launch configuration** — `RuntimeExecutionRoutingReceipt.launch`.
4. **Actual execution** — V2/provider evidence.

These sets may differ.

V0 must never claim that a resolver's candidate list is the complete set a human/model considered, or that an adaptive recommendation was the launched route merely because both belong to the same task.

## 10. Recommendation-to-attempt ambiguity

The frozen schema can correlate recommendation, prediction, task, execution observation, and Runtime attempt, but an exact `recommendationReceiptId -> attemptId` link is not guaranteed in every possible history.

V0 behavior:

- if exactly one admissible recommendation receipt exists for the task/prediction before the attempt, the reconstruction may expose it as a uniquely resolved relationship with derivation provenance;
- if multiple receipts are admissible, the relationship is `AMBIGUOUS` and all candidate receipt ids should be returned;
- V0 must not choose the newest/closest receipt silently;
- implementation should not add a new canonical link merely to make the export convenient without a reviewed ARM contract change.

A future ARM revision may add an explicit receipt/decision reference if real evidence shows ambiguity is common enough to justify it.

## 11. Requested, selected, and executed model provenance

V0 must preserve these as separate stages:

- `requested`: what policy/user/task requested;
- `selected`: what T3 resolved immediately before launch;
- `executed`: what provider/runtime evidence proves actually ran.

The frozen ARM contract already supports `executed.quality = unknown | provider_reported | t3_observed`.

Rules:

1. Requested or selected model is never copied into executed model solely because launch succeeded.
2. Provider instance/session/thread execution identity may be known while executed model remains UNKNOWN.
3. If a provider substitutes a model, preserve the provider/T3 source, substitution flag/reason if authoritative, and evidence reference.
4. Current upstream PR #27753 is relevant but remains unmerged at the time of this spec. V0 must therefore work correctly with executed-model UNKNOWN and adapt upstream attribution if/when it becomes current implementation.

## 12. Capacity evidence

Operational provider/account usage is owned by existing upstream provider/usage-limit infrastructure.

ARM may capture immutable evidence snapshots from that source. The current fork adapter `captureProviderCapacitySnapshot` is the model to preserve.

V0:

- reads/exports ARM snapshots referenced by decisions/observations;
- may reference the upstream source snapshot that produced them;
- preserves exact/approximate/unknown measurement quality;
- preserves source quality;
- does not start another poller;
- does not infer account identity from display labels/email-like values;
- does not reconstruct missing quota/reset values retrospectively.

## 13. Verification and failure evidence

### Verification

When an ARM execution observation has a verification profile, export it as canonical adaptive evidence.

When only Project Runtime verification exists, export that evidence separately. Do **not** infer:

- cross-provider independence;
- required verification kinds;
- performed verification kinds not named by evidence;
- `weak/moderate/strong` strength.

Those fields remain UNKNOWN until captured by an authoritative profile.

### Failures

ARM failure class is an aggregation projection over authoritative source failures. Export both:

- the adaptive class when present; and
- the original Runtime/V2/provider evidence reference.

Free-form Runtime attempt failure text must not be promoted to a precise adaptive class without a deterministic reviewed mapping.

Provider/auth/capacity/network/tool failures remain distinct from implementation and verification defects.

## 14. Outcome and reconciliation semantics

The current `AdaptiveAcceptedOutcome` is a revision-protected reconciliation head; `AdaptiveOutcomeReconciliation` is immutable history.

V0 reconstruction must include both when present.

Project Runtime task verification and ARM accepted outcome are related but not interchangeable. If they appear inconsistent:

- export both authorities;
- expose the mismatch as unresolved evidence;
- do not silently choose whichever status appears stronger.

`completed` execution is not automatically an accepted or verified project outcome.

## 15. Project-owned staging evidence

Some important prospective routing evidence may initially exist outside T3 typed state, for example a browser/local routing ledger or durable handoff written during qualification.

V0 may include such material as **project-owned staging evidence** when all of the following hold:

1. it has a stable project-owned path/SHA/ID;
2. provenance is explicit;
3. its evidence class is explicit, such as observed fact / orchestrator claim / retrospective inference;
4. it is not presented as Runtime/ARM/V2 canonical state;
5. private prompt/source bodies are not copied merely for convenience.

Staging evidence is a bridge for evidence capture, not a competing datastore. Promotion into typed canonical records requires a separately authorized ingestion/capture design.

## 16. JSONL transport

JSONL is permitted as a non-canonical interchange/export format.

Requirements:

- one schema-valid V0 envelope per line;
- UTF-8;
- deterministic serialization for the same decoded item where practical;
- explicit schema/version on every item or a versioned export header followed by versioned items;
- no mutation of canonical state during export;
- no hidden enrichment from model inference;
- private source/prompt/output text omitted unless a governing feature explicitly requires and authorizes it;
- export files may be deleted and rebuilt from canonical state without losing project truth.

An implementation may also expose an in-memory/domain result without writing a file.

## 17. Deterministic task reconstruction

V0 must support an operation equivalent to:

```text
reconstruct-task-history <project-id> <task-id>
```

The repository-consistent interface may be a domain service, RPC, CLI, or MCP/API adapter. The domain service is the required reusable boundary; UI/CLI/MCP are clients.

### Required reconstruction content

For one task, include when present:

1. task identity and relevant revision/base metadata;
2. decision-time difficulty prediction;
3. adaptive recommendation and capacity references;
4. Runtime route resolution and concrete launch receipt;
5. Runtime attempt identity;
6. V2 thread/run/run-attempt/execution references and bounded relevant events;
7. actual execution provenance, preserving UNKNOWN executed model when necessary;
8. verification/failure evidence;
9. accepted outcome and reconciliation history;
10. relevant handoff/project verification references;
11. explicit ambiguity/unknown markers;
12. project staging references supplied by the caller or registered through an existing project source mechanism.

### Ordering

Reconstruction must be deterministic without inventing chronology:

- V2 events retain canonical event-store sequence order;
- ARM reconciliation retains revision order;
- records with trustworthy `occurredAt`/`observedAt`/`createdAt` use that timestamp;
- stable source sequence/revision and canonical id break timestamp ties;
- records lacking a trustworthy time are placed in a deterministic logical phase and marked as time-unknown rather than assigned export time.

The API may expose both the ordered list and the source ordering key used.

## 18. L2 routing sequence as the first fixture

The first prospective routing-evidence sequence is `l2-20261101-d01` through `l2-20261101-d08` on branch `docs/t3-fork-orchestration-evidence-20261101 @ 6b143992cbc811cbb2deec8b32d9ebd2a1ac87cd`.

Important limitation: those decision IDs currently exist in project-owned Markdown evidence. They must **not** be backfilled into fabricated Runtime/ARM rows and then described as historical typed state.

V0 acceptance should use two complementary fixtures:

1. **Canonical synthetic fixture** — construct a Runtime task/attempt + ARM + V2 record sequence with L2-like routing transitions and prove reconstruction from typed state.
2. **Real L2 staging fixture** — parse or supply stable references to the real `d01..d08` evidence and prove it can coexist in the export as `project_staging` without being promoted to canonical typed state.

The fixture should cover at least:

- pre-decision difficulty/candidate rationale;
- direct DeepSeek execution route;
- bounded independent-review route;
- one blocked external-provider/OAuth path;
- verification outcome;
- append-only correction/reconciliation;
- UNKNOWN capacity/execution data where not observed.

The fixture must not claim that all historical L2 details can already be reconstructed from canonical Runtime/ARM state.

## 19. Current upstream findings and compatibility rules

At browser archaeology time, upstream `main` was `1d626d02d95f9a2343553f6498037ee82290d304`, **281 commits ahead** of the upstream revision integrated into the frozen candidate (`80a2351fcb909034e65a512dfabeb3cdfd367762`). This is a material rebase hotspot.

Current upstream confirms:

- Orchestration V2 remains event-sourced and owns command/event/projection execution truth;
- provider usage-limit sources remain a first-class operational service;
- anonymous `DelegatedTaskAnalytics` records coarse lifecycle/provider/model dimensions but is not a project evidence corpus;
- PR #27753 (requested vs executed delegated model attribution) is open;
- PR #21877 (nested delegated follow-up lifecycle) is open;
- PR #27138 (thread/task/subagent routing evals) is open;
- PR #27123 (per-model variants/usage tracking/controlled evals) is open.

Therefore:

1. Evidence V0 must not fork V2 event/lifecycle semantics.
2. Executed-model attribution must remain forward-compatible with upstream and permit UNKNOWN.
3. V0 should reuse existing V2 event-store read seams, not copy the V2 event log into an ARM table.
4. Product analytics must not become canonical project truth.
5. Controlled-eval methodology from open upstream work may inform later pilots, but open PR behavior is not current implementation authority.

## 20. Non-goals / prohibited architecture

V0 does **not** authorize:

- a second canonical evidence database;
- a second execution or task graph;
- a second provider launcher;
- a second provider/model capability catalog;
- a second usage-limit/capacity poller;
- automatic account identity inference;
- autonomous routing authorization;
- a learned router;
- automatic routing-policy mutation;
- global model rankings;
- central cross-project raw prompt/source/output collection;
- opt-out shared telemetry;
- recursive delegation enforcement;
- dashboard-owned orchestration truth;
- rewriting PR #14 or its candidate.

## 21. Minimal implementation target

The smallest accepted implementation should normally require only:

1. V0 evidence contract/envelope;
2. read/query additions for existing ARM records if the current service cannot reconstruct them;
3. one derived reconstruction service joining Project Runtime, Runtime attempts, ARM, and V2 references/events;
4. JSONL serialization over the derived result;
5. deterministic tests/fixtures;
6. an optional thin RPC/CLI/MCP adapter only if useful for proving the domain service.

It should **not** require a persistence migration merely to make export possible.

If the existing `AdaptiveRoutingService` lacks list/read functions for append-only records, adding bounded read methods over the existing canonical tables is within scope. Those reads do not create new truth.

## 22. Acceptance criteria

Evidence V0 reaches `STATIC PASS` only when all applicable source/type/serialization tests pass. It reaches `RUNTIME PASS` only when the reconstruction/export path is actually exercised against a running service/database.

At minimum prove:

1. **Schema/version validation** — every exported item decodes under the V0 contract and rejects malformed required identity/version fields.
2. **Canonical reference resolution** — task/attempt/V2/ARM references either resolve or produce explicit missing/ambiguous evidence; no silent reassignment.
3. **Decision/outcome separation** — an outcome recorded later cannot mutate or enrich an earlier decision-time item in place.
4. **Append correction semantics** — outcome reconciliation/correction produces an additional history item and retains the prior item.
5. **UNKNOWN preservation** — missing executed model, capacity, rationale, recorded time, or verification independence remains explicit rather than inferred.
6. **Requested/selected/executed separation** — tests prove a requested model can differ from selected/executed and UNKNOWN execution remains valid.
7. **Recommendation ambiguity** — multiple admissible recommendation receipts yield explicit ambiguity rather than arbitrary selection.
8. **Chronological/logical determinism** — repeated reconstruction over unchanged canonical state produces the same ordered item identities and source ordering.
9. **L2-style representability** — a canonical synthetic L2-style sequence reconstructs without unsupported facts, while the real `d01..d08` sequence remains correctly classified as project staging unless typed records actually exist.
10. **No duplicate canonical store** — implementation diff adds no Evidence V0 task/run/event/provider/capacity database and no new provider poller/launcher.
11. **Bounded V2 reads** — reconstruction reads only relevant task/thread/run/event scope and does not load the complete global event corpus by default.
12. **Focused typecheck/tests** — affected contract/server packages pass repository-standard checks.
13. **Independent review** — architecture/evidence review checks duplicate-source risk, outcome leakage, provenance/identity, upstream compatibility, and genericity.
14. **Runtime claim discipline** — no `RUNTIME PASS` unless a real database/service reconstruction/export call has executed successfully.

## 23. Review checklist

An independent reviewer should answer:

- Does any V0 field silently create a second owner for a fact already owned by Runtime/ARM/V2?
- Can outcome information leak into a pre-decision record?
- Can requested model be mistaken for executed model?
- Can two recommendation receipts be joined to one attempt without evidence?
- Are V2 event sequence and source timestamps preserved?
- Are external staging claims clearly weaker than typed canonical state?
- Is JSONL rebuildable/disposable?
- Does any code poll providers, launch workers, or infer account identity?
- Is the implementation generic and upstream-friendly?
- Would current upstream changes, especially executed-model attribution and nested delegation lifecycle, plug into V0 rather than force a parallel fork abstraction?

## 24. Integration boundary

All Evidence V0 implementation remains isolated from PR #14 while the frozen candidate is waiting on its CI decision.

Do not:

- move `sync/upstream-20261031`;
- commit Evidence V0 changes to that branch;
- merge Evidence V0 into `main` as part of PR #14;
- use an Evidence V0 result to strengthen PR #14's CI status.

Evidence V0 should start from exact `e51c1c5d74aed9824927d391590ddb33026c8d56` so later integration can be reviewed as an independent delta.

## 25. Exact next action

Local DeepSeek should:

1. consume this spec at its exact published SHA;
2. reconcile its local implementation archaeology against the source-of-truth map above;
3. record any material discrepancy before architecture-sensitive code;
4. implement the narrowest derived read/reconstruction/export path, preferring no migration;
5. use a canonical synthetic L2-style fixture plus real L2 project-staging references;
6. run focused contract/server tests and typecheck;
7. perform bounded independent architecture/evidence review with a different provider/model when materially useful and available;
8. return the exact isolated implementation SHA, test evidence, review result, and any unresolved ambiguity to Browser Overall.

Browser Overall should then inspect the exact implementation diff against this spec before any Evidence V0 integration proposal.
