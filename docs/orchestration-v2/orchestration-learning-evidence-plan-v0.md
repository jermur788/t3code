# Orchestration Learning Evidence System — T3 Implementation Plan V0

**Status:** Proposed T3 project-local implementation plan  
**Date:** 2026-11-01  
**Scope:** Evidence capture and learning-readiness. This document does not authorize a learned router in production.

This plan is aligned with the current cross-project direction coordinated in Overall Dev. T3 owns the Runtime/ARM implementation details and remains authoritative for current T3 operational state.

## 1. Objective

Build trustworthy evidence from real development work so future T3 orchestration can improve routing, decomposition, provider/model selection, review strategy, capacity handling, recovery/salvage, and coordination.

V0 succeeds if an independent reviewer can reconstruct:

1. why a routing decision was made;
2. what information and realistic alternatives were available at that moment;
3. what actually executed;
4. what happened afterwards;
5. whether the work was ultimately accepted.

Decision-time information must remain separate from later outcomes.

## 2. Architecture

Expected progression:

`authoritative evidence → frozen/normalized evidence → analytics + episode retrieval → derived experience graph/statistics → shadow routing → evaluated adaptive routing`

Authority boundaries:

- T3 Runtime is authoritative for current operational state.
- Actually emitted append-only decision/event/assessment records are authoritative evidence for events they observe.
- Project ledgers remain audit/handoff evidence where T3 cannot yet observe the work.
- A frozen learning corpus is an immutable, versioned, one-way analytical artifact, not an operational database.
- Graphs, embeddings, statistics, recommendations, and learned policies are rebuildable derived products.

## 3. Technical-review correction

Do not plan V0 as merely exporting evidence T3 already records.

The current review identified likely gaps that must be verified on the **qualified T3 baseline** before implementation:

- some ARM schemas/services may lack active producer paths;
- decision-time capacity may not be durably recorded;
- requested, selected, resolved, and executed routes may not all be preserved distinctly;
- reviewer identity/independence/artifact version may be insufficiently represented;
- delegated/thread work may not have Runtime execution-attempt join keys;
- manager routing decisions may occur outside the deterministic route resolver.

Therefore V0 is both an evidence-production project and an export/normalization project.

No signal should be called authoritative until its producer and persistence path are verified on the chosen baseline.

## 4. Accepted design revisions

### Decision-time record

Add the smallest durable record for material routing decisions, with:

- stable `decision_id`;
- T3-stamped `recorded_at`;
- separate `occurred_at`;
- requested and selected route;
- realistic choice set;
- contemporaneous capacity/readiness references;
- orchestrator reason/claim;
- routing policy/profile revision;
- actor/model identity where known;
- link to later execution.

A name such as `record_routing_decision` is provisional until design review.

Evaluation features must exclude evidence recorded after the decision.

### Frozen corpus

Maintain four layers:

1. Runtime operational state;
2. append-only occurrence evidence;
3. frozen versioned corpus;
4. derived indexes/models.

The corpus never writes interpretations back as operational fact.

### No duplicate hand-entry stream

Do not require teams to hand-maintain both Markdown and JSONL for the same event.

For non-T3-observed work, use the schema-versioned machine block in the project ledger and extract it deterministically. For T3-observed work, reference the actual T3 IDs.

## 5. V0 evidence contract

V0 only needs:

- decision;
- choice set;
- decision-time capacity/readiness/context observation;
- requested route;
- selected route;
- actually executed route;
- attempt/thread/run identity;
- assessment/review chain;
- artifact/commit/diff judged;
- rework/retry/salvage;
- final outcome.

Preserve `OBSERVED_FACT`, `ORCHESTRATOR_CLAIM`, `RETROSPECTIVE_INFERENCE`, and `DERIVED_RECORD` separately.

Worker completion is not acceptance.

## 6. Choice sets

For each material decision, preserve per candidate:

- observed readiness/capacity state;
- source and observation time;
- orchestrator belief;
- considered/not-considered/unknown;
- eligibility/rejection reason;
- capacity-to-completion estimate.

Also record the selection mechanism and deciding actor. If exploration uses a known propensity, record it; otherwise mark it unknown.

Unavailable, rejected, and never-evaluated candidates must not collapse into one category.

## 7. Assessment chain

Use append-only assessments rather than one mutable verification field.

Each assessment should identify:

- assessor role/identity;
- relation to the worker/provider/model;
- exact artifact/commit/diff;
- verdict;
- time;
- evidence references;
- independence;
- requested rework;
- acceptance/integration/verification state where applicable.

Keep unresolved, cancelled, superseded, reverted, and failed episodes.

## 8. Privacy

Default export is refs-first and Git-safe: opaque IDs, enums, timestamps, measurements, hashes, and provenance references.

Do not commit credentials, authentication material, account-identifying capacity data, or raw private prompts by default.

Future multi-user shared learning needs separate consent, sanitization, provenance, deletion, poisoning-resistance, trust, and governance design. It is not V0.

## 9. Work packages

### WP0 — qualified baseline + gap audit

Before implementation:

1. identify the exact qualified T3 branch/commit;
2. verify which Runtime/ARM producers actually execute there;
3. take representative real orchestration episodes from CCF;
4. count how many map to:
   - Runtime execution attempts;
   - T3 threads/runs without Runtime attempts;
   - MCP/delegated tasks;
   - project-local ledger only;
   - no durable evidence.

This decides whether existing join keys are sufficient.

### WP1 — evidence standard adoption

Use `orchestration-evidence-ledger-standard-v3.md` as the project-local evidence discipline. Project repositories keep their actual ledgers; T3 does not centralize raw project evidence by default.

### WP2 — decision producer

Implement the smallest T3 decision-time evidence producer using existing Runtime/ARM identities and contracts wherever possible. Avoid parallel task/run/provider identity systems.

### WP3 — assessment/outcome producer

Add or expose append-only records sufficient to preserve worker completion, independent review, NEEDS CHANGES, rework, re-review, acceptance, integration, verification, and unresolved/cancelled/reverted outcomes.

### WP4 — frozen corpus exporter

Build an offline/read-only export path that:

- consumes authoritative machine evidence and structured project-local ledger events;
- preserves mutable state transitions where necessary;
- is schema-versioned;
- is deterministic;
- is content-addressed or equivalently immutable;
- cannot act as an operational write source.

JSONL is acceptable for interchange/export, but the schema/envelope is the contract.

### WP5 — validation

V0 acceptance requires:

1. leakage test;
2. per-field completeness report on real CCF evidence;
3. deterministic/canonical re-export;
4. blind routing-decision reconstruction by someone who did not write the ledger;
5. simple route/reroute analytics matching hand counts.

## 10. Explicit V0 non-goals

Do not build as part of V0:

- production learned routing;
- graph database;
- graph-specific operational schema;
- embeddings as an architectural commitment;
- difficulty prediction as routing authority;
- active recommendation engine;
- experiments/bandits;
- global/shared multi-user learning;
- fine-tuning.

Existing difficulty/recommendation/experiment structures may remain dormant unless independently required by current Runtime work.

Do not interrupt higher-priority T3 qualification/integration solely to implement evidence infrastructure.

## 11. Post-V0 progression

After trustworthy evidence exists:

1. analytics;
2. episode retrieval for the manager with no automatic routing change;
3. deterministic capacity/context forecasting rules;
4. simple empirical route statistics;
5. shadow routing;
6. evaluated adaptive routing with safe exploration and logged propensities where applicable.

## 12. Experience graph position

A graph is a likely useful **derived** representation, not a V0 dependency.

Potential edges include:

- task class `SUCCEEDS_WITH` strategy;
- strategy `FAILS_UNDER` capacity condition;
- task type `BENEFITS_FROM` review topology;
- episode `SIMILAR_TO` episode;
- route `SALVAGED_BY` alternate route.

Every derived edge must reference supporting evidence/episode IDs, state derivation/version/confidence, remain rebuildable, and never be treated as operational fact.

Introduce a graph store only when concrete multi-hop queries justify it beyond SQL/episode retrieval.

## 13. Sequencing

Recommended order:

1. finish/qualify current T3 integration work already in flight;
2. establish the qualified baseline;
3. run WP0 gap audit;
4. finalize the evidence contract from observed gaps;
5. implement the minimum decision/assessment producers;
6. export the frozen corpus;
7. validate against real CCF episodes;
8. only then begin retrieval/analytics experiments.

Documentation may proceed now without blocking qualification.

## 14. Open questions

Resolve from repository/runtime evidence, not memory:

1. How is representative CCF work actually launched: Runtime execute, MCP delegation, threads, or a mixture?
2. Which exact T3 branch/commit is the qualified V0 baseline?
3. What event-log retention/compaction guarantees exist there?
4. Which ARM records have verified active producers there?
5. Which sensitive project-local fields must never enter a Git-backed export?

## 15. Definition of done

V0 is complete when an independent reviewer can reconstruct a real CCF episode from durable evidence, including decision reason, decision-time information, realistic alternatives, actual route, capacity/context evidence, execution result, review/rework chain, and final acceptance status; and the reconstruction passes leakage, completeness, deterministic export, blind reconstruction, and hand-count analytics checks.

At that point T3 has **learning-ready evidence**, not yet a learned orchestrator.
