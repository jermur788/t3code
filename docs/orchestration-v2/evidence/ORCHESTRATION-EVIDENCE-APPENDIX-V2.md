# Mandatory Orchestration Evidence Appendix — V2 — T3 Fork Local L2

Run: T3 Fork Local L2 combined-sync qualification
Date: 2026-11-01
Orchestrator: DeepSeek V4.1 Flash (`opencode-go/deepseek-v4.1-flash`, OpenCode harness, variant `max`, agent `build`)
Canonical ruled candidate: `sync/upstream-20261031 @ e51c1c5d74aed9824927d391590ddb33026c8d56`

This appendix is the structured run/result evidence contract. Decision-time routing entries are recorded before outcomes; outcome sections are appended after observed work.

## 1. Policy

- **User objective:** qualify exact combined sync candidate `e51c1c5d...` as one integrated system, return a durable result to Overall Dev, and do not integrate to `main`.
- **Hard constraints:** exact SHA only; no newer/different SHA; stop on branch drift; no force-push/history rewrite; no PR #14 merge; no architecture change to make tests pass; no weakened provenance checks; no second orchestration graph/provider launcher/capacity poller; no real OAuth claim from fixtures; no autonomous ARM routing; one-writer per overlapping lane.
- **Optimization preferences:** correctness and auditability first; cost/time secondary; avoid risky live-credential rotation; no paid infrastructure.
- **Routing policy:** DeepSeek routing-evidence directive, 2026-11-01. No hard-coded easy/hard mapping.
- **Review rule:** DeepSeek retains orchestration; independent review may be delegated to Claude when the recorded assessment warrants it.
- **Protected decisions:** PR #14 integration, CI exception, product/architecture changes, material paid infrastructure.

## 2. Capacity and orchestrator context

| Provider/pool | State | Remaining capacity | Reset/window | Source | Observed at | Current work |
| --- | --- | --- | --- | --- | --- | --- |
| OpenCode / DeepSeek V4.1 Flash | AVAILABLE | UNKNOWN (session running) | UNKNOWN | T3 runtime | 2026-11-01T08:05Z | L2 orchestration |
| Claude A | AVAILABLE (listed) | UNKNOWN | UNKNOWN | T3 catalog | 2026-11-01T08:05Z | none |
| Claude B — Pro | AVAILABLE (listed) | UNKNOWN | UNKNOWN | T3 catalog | 2026-11-01T08:05Z | none |
| Codex / OpenAI B | AVAILABLE (listed) | UNKNOWN | UNKNOWN | T3 catalog | 2026-11-01T08:05Z | none |
| Cursor / Grok / Antigravity / Muse / Pi | DISABLED | N/A | N/A | T3 catalog constraints | 2026-11-01T08:05Z | none |

At dispatch: capacity-to-completion `SUFFICIENT` for DeepSeek orchestration and local deterministic work; `UNKNOWN` for optional Claude review until dispatched.

Orchestrator context: limit/used/compaction values `UNKNOWN` (not exposed as reliable observations in this session).

## 3. Routing and decomposition — decision-time entries

| Decision | Work unit | Band / confidence | Selected | Reviewer | Selection | Recorded at |
| --- | --- | --- | --- | --- | --- | --- |
| `l2-20261101-d01` | Overall L2 orchestration | HIGH / 0.80 | DeepSeek V4.1 Flash | Claude Sonnet 5.5 planned | exploit + forced policy | 2026-11-01T08:05Z |
| `l2-20261101-d02` | Repo safety / exact-SHA worktree | LOW-MEDIUM / 0.92 | DeepSeek V4.1 Flash | none | exploit | 2026-11-01T08:05Z |
| `l2-20261101-d03` | Focused tests + typecheck | MEDIUM-HIGH / 0.88 | DeepSeek V4.1 Flash | none | exploit | 2026-11-01T08:05Z |
| `l2-20261101-d04` | Runtime/V2 provenance | HIGH / 0.78 | DeepSeek V4.1 Flash | Claude Sonnet 5.5 planned | exploit + independent review | 2026-11-01T08:05Z |
| `l2-20261101-d05` | Rendered UI + restart/persistence | HIGH / 0.75 | DeepSeek V4.1 Flash | none | exploit | 2026-11-01T08:05Z |
| `l2-20261101-d06` | Real-provider/OAuth availability | HIGH-RISK / LOW-SCOPE / 0.70 | DeepSeek V4.1 Flash | none | forced safety boundary | 2026-11-01T08:05Z |
| `l2-20261101-d07` | Independent evidence review | HIGH / 0.72 | Claude Sonnet 5.5 planned | N/A | explore independent review | 2026-11-01T08:05Z |
| `l2-20261101-d08` | Final handoff synthesis | MEDIUM-HIGH / 0.85 | DeepSeek V4.1 Flash | N/A | forced orchestrator role | 2026-11-01T08:05Z |

Choice set: DeepSeek V4.1 Flash; Claude Sonnet 5.5 / Opus 5.5 (A and B instances); Codex / OpenAI B gpt-6.1-sol. Material rejected alternatives and rationale are in the ledger decision records.

## 4. Outcomes and resources

Appended after execution. Each outcome is joined to its decision ID. "Completed" is not acceptance.

## 5. Learning assessment

Appended after execution. Hypotheses and confidence are not facts or active policy.

## 6. Evidence rule

Observed facts, orchestrator claims, retrospective inferences, and derived records remain distinct. Capacity values that were not observed remain `UNKNOWN`. No mock/fixture result is promoted to a real-provider pass.

## 7. Final summary

Appended after execution.
