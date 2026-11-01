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

### Outcome for `oev0-browser-d01`

- Result: `STATIC PASS` for browser-only research/spec lane.
- Frozen candidate remained untouched; no PR #14 write, branch move, merge, or CI-status mutation was performed.
- No Saul/Claude escalation was dispatched because the browser lane exposes no delegated-provider execution surface and inspected implementation truth resolved the architecture boundary sufficiently for a governing V0 spec.
- Local DeepSeek remains the implementation orchestrator by project authority; Browser Deputy did not claim replacement orchestration authority.

### Outcome for `oev0-browser-d02`

- Result: implementation archaeology completed on exact `e51c1c5d74aed9824927d391590ddb33026c8d56`.
- Finding: durable project/task identity, Runtime launch receipts, V2 execution identity/events, ARM predictions/recommendations/capacity/outcomes/verification/failure projections already exist as typed canonical state.
- Primary missing layer: one unified bounded read/reconstruction/export seam over those owners.
- Material ambiguity: exact recommendation-receipt-to-attempt linkage can be ambiguous if multiple receipts share the same task/prediction context.
- Material missing/unknown fact: actual executed model cannot be inferred from requested/selected model when provider/V2 evidence does not report it.
- Consequence: no Evidence V0 canonical database or duplicate execution graph is justified.

### Outcome for `oev0-browser-d03`

- Result: current-upstream archaeology refreshed.
- Upstream inspected: `pingdotgg/t3code main @ 1d626d02d95f9a2343553f6498037ee82290d304`.
- Drift from the upstream revision integrated into the frozen candidate (`80a2351fcb909034e65a512dfabeb3cdfd367762`): current upstream is 281 commits ahead.
- Current upstream still has event-sourced Orchestration V2, first-class usage-limit sources, and anonymous delegated-task analytics; these should be reused/kept separate according to ownership.
- Open overlapping work remains proposal/community evidence, not current-main authority: #27753 requested-versus-executed delegated model attribution; #21877 nested delegated follow-up lifecycle; #27138 routing evals; #27123 per-model usage/controlled evals.

### Outcome for `oev0-browser-d04`

- Result: governing spec published.
- Path: `docs/internals/orchestration-evidence-v0-spec.md`.
- Spec commit: `d3a31b7fb89fd75c0d452c3b29a3d2ca9bb98acf`.
- Branch: `docs/orchestration-evidence-v0-governing-20261101`, created directly from frozen `e51c1c5d...`.
- Governing implementation target: derived domain read/reconstruction service + versioned evidence envelope + optional JSONL transport, normally with no new migration.
- First fixture rule: use both a synthetic canonical L2-style sequence and the real `l2-20261101-d01..d08` project-staging records; never fabricate historical typed Runtime/ARM rows.
- Local DeepSeek result path was rechecked after spec publication and was still absent (`404`), so local reconciliation is explicitly pending rather than inferred.
