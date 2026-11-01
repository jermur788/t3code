# Orchestration Evidence Ledger Standard — V3

**Status:** Proposed T3-aligned project standard  
**Date:** 2026-11-01  
**Purpose:** Capture trustworthy decision-time and outcome evidence from real development work so later analytics, retrieval, graphs, statistics, and routing policies can be derived without hindsight leakage.

This is the T3 project-local copy of the cross-project evidence standard. Actual evidence remains owned by the project/run that produced it; this document defines the capture discipline and T3 integration expectations.

## 1. Core rule

Capture evidence **when it becomes known**. Do not reconstruct missing decision-time values later.

Keep these classes distinct:

1. **OBSERVED_FACT** — supported directly by runtime, provider, repository, test, CI, tool, or explicit user evidence.
2. **ORCHESTRATOR_CLAIM** — what the orchestrator believed, predicted, intended, or used as its reason for acting.
3. **RETROSPECTIVE_INFERENCE** — a conclusion drawn only after later outcomes are known.
4. **DERIVED_RECORD** — a recomputable statistic, prediction, recommendation, graph edge, feature, or other transformation of evidence. It must name its derivation/version and must never be treated as an observed fact.

Never convert a claim, inference, or derived record into an observed fact. `UNKNOWN` is valid when evidence is absent.

## 2. Authority and storage model

The ledger is project-local audit and handoff evidence. It is **not** a competing orchestration database.

For T3-observed work:

- T3 Runtime and actually emitted machine evidence records are authoritative for the operational events they observe.
- The ledger references those machine identities and may add human/orchestrator interpretation.
- Do not manually duplicate machine evidence into a second hand-maintained data stream when it can be referenced.

For work T3 does not yet observe:

- the project ledger may temporarily be the primary audit evidence;
- each material event should contain a schema-versioned machine block with a stable `event_id`;
- deterministic extraction from that block is allowed;
- do not maintain a separate hand-written JSONL copy of the same event.

A frozen learning corpus is a one-way, immutable derivation from operational records and project evidence. It does not become operational authority.

## 3. Time and hindsight control

Every material record should distinguish:

- `occurred_at` — when the event is believed to have happened;
- `recorded_at` — when the evidence system actually recorded it;
- `observed_at` — when a capacity/readiness/provider observation was measured, where applicable.

When T3 records the event, T3 should stamp `recorded_at`. When evidence is entered later, preserve the gap. Do not backdate the record to make it look contemporaneous.

For learning or evaluation, features available to a decision must satisfy:

`record.recorded_at <= decision.recorded_at`

unless explicitly marked as later retrospective evidence.

## 4. Stable identities

Reuse existing project/T3 identities wherever available. Record as applicable:

- `event_id`
- `decision_id`
- project ID
- task/work-unit ID and parent
- Runtime execution attempt ID
- thread ID
- run ID
- provider/pool ID
- model ID/version
- agent/role ID
- routing policy/profile ID and revision
- commit/diff/artifact hash
- assessment/review ID
- handoff/claim/issue reference

If an identity does not exist, record `UNKNOWN` rather than inventing a parallel identity system.

## 5. Starting policy record

At the beginning of a material orchestration run, record:

- user objective;
- hard constraints;
- optimization preferences: quality, cost, tokens, time, resource/compute use, exploration tolerance;
- provider/model ordering and escalation policy;
- concurrency and one-writer rules;
- review/independence requirements;
- protected Manager/user decisions;
- current routing policy/profile/version;
- known project restrictions.

## 6. Capacity, readiness, and context

Maintain observations per provider/pool where material. Record:

- opaque provider/pool identity;
- observed state: `AVAILABLE`, `BUSY`, `COOLDOWN`, `QUOTA_EXHAUSTED`, `LOGIN_UNAVAILABLE`, `UNKNOWN`, or a more precise approved enum;
- remaining-capacity estimate if actually available;
- reset/window information;
- source, `observed_at`, confidence, current/concurrent work, and staleness.

At dispatch also record:

- capacity-to-completion: `SUFFICIENT`, `MARGINAL`, `INSUFFICIENT`, `UNKNOWN`;
- expected interruption/switching cost;
- context limit and used/estimated context where known;
- compaction/history pressure;
- source and confidence.

Prefer runtime/provider evidence over model self-report. Do not infer a precise quota number from an absence of errors.

## 7. Routing/decomposition decisions

Create a material decision record for each significant dispatch, switch, retry, escalation/de-escalation, decomposition, reviewer assignment, recovery/salvage decision, or intentional cancellation.

Record:

- work unit and parent;
- task characteristics/risk;
- decomposition topology;
- requested provider/model/role;
- selected provider/model/role;
- previous route;
- reason/rule;
- routing policy/profile/version;
- prior outcome affecting the choice;
- live capacity/context observations;
- expected switching cost;
- selection mechanism (`exploit`, `explore`, `forced`, `user_override`, etc.);
- deciding actor, including orchestrator model/version where known.

### Choice set

Preserve realistic alternatives, not only the winner. For each configured/relevant candidate record:

- candidate provider/model/pool;
- observed readiness/capacity state;
- source and `observed_at`;
- orchestrator belief;
- `CONSIDERED`, `NOT_CONSIDERED`, or `UNKNOWN`;
- eligibility/rejection reason;
- whether it was actually selectable;
- capacity-to-completion estimate;
- predicted advantage/disadvantage if used.

If exploration is performed and a propensity is available, record it; otherwise `UNKNOWN`.

Do not make rejected and never-evaluated candidates indistinguishable.

## 8. Requested, selected, resolved, and executed routes remain distinct

Do not collapse what the user/manager requested, what the orchestrator selected, what T3 resolved, and what actually executed.

For each attempt record actual provider, model/config/reasoning effort, agent/role, thread/run/attempt IDs, start/end, status, provider failures, token/cost/latency evidence when observable, and queue/serialization wait where observable.

## 9. Outcome and assessment chain

Worker completion is not acceptance.

Store assessments as an append-only sequence. Each assessment should record:

- assessor role and identity;
- assessor provider/model where relevant;
- relation to worker: same model, same provider, different provider, human, automated test/CI, etc.;
- exact commit/diff/artifact hash judged;
- time and verdict;
- evidence references;
- verification scope;
- independence status;
- rework requested;
- unresolved caveats.

Possible lifecycle events include:

`WORKER_COMPLETED → REVIEWED → NEEDS_CHANGES → REWORKED → RE_REVIEWED → ACCEPTED → INTEGRATED → VERIFIED`

Keep cancelled, unresolved, superseded, reverted, and failed outcomes.

## 10. Human interventions and resources

Record material steer, interrupt, approve/reject, route override, restart, scope clarification, and protected-decision enforcement separately when they change the course of work.

Where observable, record input/output tokens, model calls, reasoning effort, wall time, queue wait, parallel workers, provider failures, cost, and capacity-forced reroutes. Resource estimates must state source/confidence.

## 11. Privacy

Do not commit credentials, secrets, raw authentication material, or account-identifying capacity information.

Default Git-friendly/shared evidence should prefer opaque IDs, enums, numbers, hashes, timestamps, and provenance references. Prompts and sensitive bodies stay local unless explicitly permitted and may be referenced by content hash/evidence reference.

Shared multi-user learning requires separate consent, sanitization, provenance, deletion, poisoning-resistance, trust, and governance design.

## 12. Embedded machine block

For project-local events not already represented by an authoritative T3 machine record, include one schema-versioned machine block.

```json
{
  "schema_version": "orchestration-evidence/v3",
  "event_id": "oev-20261101-example-001",
  "event_type": "routing_decision",
  "evidence_class": "ORCHESTRATOR_CLAIM",
  "occurred_at": "2026-11-01T00:00:00Z",
  "recorded_at": "2026-11-01T00:00:05Z",
  "project": "example",
  "work_unit": "task-123",
  "decision_id": "decision-123",
  "requested_route": {"provider": "UNKNOWN", "model": "UNKNOWN"},
  "selected_route": {"provider": "provider-a", "model": "model-x"},
  "choice_set": [],
  "capacity_refs": [],
  "reason": "Recorded orchestrator reason",
  "policy_version": "UNKNOWN",
  "executed_attempt_id": "UNKNOWN",
  "artifact_hash": "UNKNOWN",
  "evidence_refs": []
}
```

Do not hand-copy the same event into a separate staging stream.

## 13. Human-readable event template

### EVENT — `<timestamp>`

- **Event ID:**
- **Decision ID:**
- **Work unit / parent:**
- **Evidence class:**
- **Occurred at:**
- **Recorded at:**
- **Requested provider/model/role:**
- **Selected provider/model/role:**
- **Actually executed provider/model/role:**
- **Choice set / alternatives:**
- **Reason / routing rule:**
- **Selection mechanism:**
- **Capacity/context evidence and references:**
- **Previous failure/outcome influencing decision:**
- **Branch/worktree/thread/run/attempt:**
- **Artifact/commit/diff hash:**
- **Result/evidence:**
- **Assessment/review status:**
- **Accepted / rejected / unresolved:**
- **Failure classification if any:**
- **Human intervention if any:**
- **Next action:**

## 14. Final summary and V0 minimum

At the end of a material run summarize attempts, failures/cancellations/unresolved work, capacity failures, reroutes/salvages, material decisions, resource observations, review/independence, rework, acceptance/integration/verification, missing telemetry, and exact next action.

V0 only needs enough evidence to reconstruct reliably:

1. why a routing decision was made;
2. what information and realistic options were available then;
3. what actually executed;
4. what happened afterwards, including review/rework;
5. whether the work was ultimately accepted.

Minimum V0 records: decision, choice set, capacity/readiness observation, attempt/execution identity, assessment chain, and final outcome.

Defer graph, embeddings, learned routing, difficulty prediction, and experimentation infrastructure until the evidence path is proven.

## 15. Validation

A compliant implementation should eventually support:

- leakage testing for late evidence;
- per-field completeness reporting;
- deterministic/byte-identical re-export from the same frozen source;
- blind reconstruction of a routing decision by someone who did not write the ledger;
- baseline analytics that match hand counts;
- provenance from every derived record back to evidence IDs.
