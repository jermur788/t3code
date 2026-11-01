# Browser Orchestration Evidence V0 — Routing Record

Date: 2026-11-01
Authority: `Overall-Dev/messages/t3-fork/2026-11-01-deepseek-routing-evidence-directive.md`
Parent handoff: `Overall-Dev/messages/t3-fork/2026-11-01-browser-orchestration-evidence-v0-handoff.md`
Frozen integration candidate: `sync/upstream-20261031 @ e51c1c5d74aed9824927d391590ddb33026c8d56`
Evidence branch: `docs/orchestration-evidence-v0-governing-20261101`

This file is append-oriented. Decision-time records below are not rewritten after outcomes are known. Corrections or outcomes are appended later.

## Decision `oev0-browser-d01` — browser deputy orchestration

- Recorded at task start: `2026-11-01T16:28Z`.
- Objective: execute browser-only Orchestration Evidence V0 archaeology/spec work while PR #14 remains frozen.
- Orchestrator authority: DeepSeek per active project directive.
- Actual browser-lane model/provider identity: `UNKNOWN` to project evidence; this file does not infer provider identity from the chat surface.
- Difficulty dimensions (0–4): ambiguity 2; scope breadth 3; reasoning complexity 3; integration/tool complexity 2; risk 2; verification burden 3.
- Overall band/confidence: `hard / 0.82`.
- Candidates considered: browser deputy direct research/spec work; bounded Saul/Claude review if architecture ambiguity or independent review materially improves confidence.
- Availability/capacity known at decision time: browser GitHub connector available; Saul/Claude delegated execution surface not available from this browser lane; provider subscription capacity `UNKNOWN`.
- Selected route: keep orchestration/reconciliation in the browser deputy lane; do read-only source/PR archaeology and isolated documentation writes only.
- Rationale: the task is GitHub/specification work, the candidate is frozen, and no code/runtime implementation is authorized in this lane.
- Protected boundaries: do not move `sync/upstream-20261031`; do not merge PR #14; do not add Evidence V0 commits to PR #14; do not create a second execution/evidence source of truth.

## Decision `oev0-browser-d02` — exact-candidate implementation archaeology

- Recorded before architecture-sensitive spec authoring.
- Difficulty dimensions: ambiguity 2; scope breadth 3; reasoning complexity 3; integration/tool complexity 2; risk 2; verification burden 3.
- Band/confidence: `hard / 0.86`.
- Selected executor: browser deputy direct, read-only inspection of exact `e51c1c5d...`.
- Alternatives: delegate a bounded source review to Claude/Saul; rejected for now because repository truth is directly inspectable and the browser lane has no delegated-model execution surface.
- Required evidence: exact candidate source, existing governing ARM/V2 compatibility spec, current upstream source/PR state.

## Decision `oev0-browser-d03` — upstream/rebase archaeology

- Recorded before current-upstream research.
- Difficulty dimensions: ambiguity 3; scope breadth 3; reasoning complexity 3; integration/tool complexity 1; risk 2; verification burden 2.
- Band/confidence: `hard / 0.78`.
- Selected executor: browser deputy direct, current upstream GitHub source/PR inspection.
- Alternatives: use the 2026-10-31 archaeology unchanged; rejected because the handoff explicitly requires current upstream inspection and upstream is moving quickly.
- Guard: distinguish current upstream implementation from open PR/proposal/community work.

## Decision `oev0-browser-d04` — governing V0 spec

- Recorded before drafting.
- Difficulty dimensions: ambiguity 3; scope breadth 3; reasoning complexity 4; integration/tool complexity 2; risk 3; verification burden 3.
- Band/confidence: `critical / 0.78`.
- Selected executor: browser deputy authors a docs-only governing spec on this isolated branch, derived from inspected implementation truth.
- Planned independent check: reconcile against Local DeepSeek archaeology/decomposition if/when its durable result appears; otherwise mark reconciliation pending rather than inventing it.
- Architecture rule: `existing Runtime/ARM/upstream V2 typed truth -> versioned export/view -> JSONL / later analytics`.

## Outcomes

Pending. Append after archaeology/spec/reconciliation work.
