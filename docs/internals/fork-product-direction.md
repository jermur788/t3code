# T3 Fork Product Direction

Date: 2026-10-31
Status: ACCEPTED PRODUCT DIRECTION

This document records product intent. It is not a claim that every capability described below is implemented today, and it does not replace feature-specific governing specs.

## Purpose

T3 Fork is a standalone open-source project, not an internal tool whose purpose is limited to developing CCF.

Its direction is to become a provider-neutral environment where a user can manage projects and orchestrate work across multiple coding agents, models, providers, subscriptions, and machines while durable project truth remains independent of any one worker or conversation.

CCF is the first major proving use case. It should expose real requirements and stress the system, but features should normally be designed generically so unrelated users and projects can benefit from them.

## Product pillars

### 1. One orchestration environment across agents

T3 should let users work through one project/runtime layer while treating Claude, Codex, OpenCode, DeepSeek, and future providers as replaceable workers.

Provider identity and capability still matter: T3 should know which concrete provider/model/account was requested, selected, and actually executed. Provider neutrality must not mean hiding execution provenance.

### 2. An open project system

T3 should provide an open-source project system comparable in purpose to proprietary project/workspace systems, but not owned by a single model provider.

Important project truth should persist outside chat and model memory. This includes project instructions, sources, accepted decisions, milestones, task state, handoffs, execution evidence, verification, blockers, and relevant provenance.

A project should remain intelligible and continuable when the active model, provider, worker, device, or conversation changes.

### 3. Durable Project Runtime

Project Runtime is the authoritative project-work layer. It should expose reusable domain services and APIs rather than tying project state to one UI.

Upstream T3 execution/session lifecycle should be reused where it owns execution truth. Fork-owned Runtime should add durable project identity, coordination, routing, evidence, and verification without creating a competing execution graph.

### 4. Adaptive orchestration

T3 should learn how to use different agents efficiently from evidence rather than static preference alone.

Relevant evidence can include capability, task type, provider/account capacity, latency, cost where applicable, failure modes, verification outcomes, review outcomes, and historical performance.

Adaptive recommendations remain separate from authorization. The system should be able to explain why a worker was selected and prove what actually executed.

### 5. Opt-in collective learning

Long term, willing users should be able to contribute to a shared body of orchestration knowledge so T3 can improve routing and coordination beyond what one installation can learn alone.

This is a product direction, not a current implementation claim. The privacy model, governance, aggregation format, abuse resistance, incentives, and learning mechanism require explicit design before implementation.

Participation must be opt-in. No design should assume that private source code, prompts, project content, credentials, or other sensitive project material is shared. Prefer derived, minimized, auditable evidence when collective learning is introduced.

### 6. Multiple clients over the same truth

T3's authoritative state should be usable by its own UI and by external clients through documented interfaces.

The separate development Dashboard may visualize and monitor Runtime state and later expose controlled operator actions. Future conversational, voice, mobile, watch, or other interfaces may also act as clients. These clients do not become owners of project or execution truth.

## Relationship to CCF

CCF is strategically important because it supplies a demanding real development workload and can validate whether T3's project/runtime/orchestration abstractions work outside toy examples.

The relationship is:

```text
T3 Fork: standalone generic orchestration + project platform
                         |
                         +---- CCF: first major proving use case
                         |
                         +---- other projects/users: intended future use
```

Therefore:

- CCF requirements may motivate T3 capabilities;
- CCF-specific behavior should not enter generic T3 layers without a broader abstraction;
- T3's roadmap is not subordinate to the CCF roadmap;
- CCF must not become the canonical owner of T3 project/runtime truth.

## Relationship to upstream T3

The fork direction remains "upstream underneath, fork above."

Prefer upstream identities, lifecycle, provider adapters, session/thread infrastructure, capabilities, usage infrastructure, and other suitable primitives. Keep fork differentiation additive and isolated where practical: Project Runtime, durable project truth, development profiles/routing, adaptive evidence and learning, and project/development UX.

## Non-goals

T3 Fork should not become:

- a CCF-specific development tool;
- a wrapper around one preferred model provider;
- a second execution graph that duplicates upstream lifecycle truth;
- a system where important project state exists only in model memory or chat history;
- a dashboard-owned orchestration database;
- a proxy that silently chooses execution accounts without T3 provenance;
- a collective-learning service that shares user data by default.

## Current versus future capability

Current implementation and verification status belongs in Current State, Runtime tasks/handoffs, and governing feature specs.

This document establishes the destination and architectural constraints. In particular, the open project system, adaptive orchestration, multi-account evidence, external operator clients, and opt-in collective learning may mature at different times. Their presence here must not be interpreted as `IMPLEMENTED` or `VERIFIED` status.
