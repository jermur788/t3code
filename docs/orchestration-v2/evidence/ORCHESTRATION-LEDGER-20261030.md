# T3 Fork — Orchestration Evidence Ledger — 2026-10-30

Append-oriented project-owned audit ledger for T3 Fork orchestration-learning evidence. Historical CCF evidence is not copied here; this file starts with the T3 Fork Local L2 run on 2026-11-01. Record events when they become known. Never rewrite a decision-time record after the outcome is known; append corrections instead.

## Evidence vocabulary

- **OBSERVED FACT:** directly supported by runtime, provider, repository, test, CI, tool, or user evidence.
- **ORCHESTRATOR CLAIM:** what the orchestrator believed, predicted, intended, or used as a reason for acting.
- **RETROSPECTIVE INFERENCE:** a conclusion drawn only after later outcomes are known.
- **DERIVED RECORD:** a recomputable statistic, prediction, recommendation, or other transformation of evidence.

`UNKNOWN` is preferred over an invented value.

## Starting policy record — Local L2 combined sync qualification

- **Timestamp:** 2026-11-01T08:05Z.
- **OBSERVED FACT — authority:** `messages/t3-fork/2026-11-01-local-l2-combined-sync-qualification-handoff.md` (Overall Dev) directs Local Overall / Deputy Officer to qualify exact `sync/upstream-20261031 @ e51c1c5d74aed9824927d391590ddb33026c8d56`, and not a different SHA.
- **OBSERVED FACT — routing directive:** `messages/t3-fork/2026-11-01-deepseek-routing-evidence-directive.md` makes DeepSeek the orchestrator for every T3 Fork task irrespective of difficulty, with prospective decision-time routing records and post-outcome evidence.
- **OBSERVED FACT — user objective:** produce trustworthy Local L2 system qualification evidence for the exact combined candidate, return a durable result to Overall Dev, and do not integrate to `main`.
- **Hard constraints:** exact-SHA testing only; no force-push or history rewrite; no merge of PR #14; no architecture change to make tests pass; no weakened provenance checks; no second orchestration graph/provider launcher/capacity poller; no real OAuth claim from fixtures; no autonomous ARM routing; one writer per overlapping code lane.
- **Optimization preferences:** correctness and auditability first; cost/time secondary; no paid-infrastructure spend without need; avoid risky live credential rotation.
- **Review requirement:** DeepSeek retains orchestration and reconciliation; a bounded independent review may be delegated to Claude when the recorded assessment warrants it.
- **Protected decisions:** PR #14 integration, CI exception, product/architecture changes, and material paid infrastructure remain outside this lane.
- **Current routing policy/profile/version:** DeepSeek routing-evidence directive dated 2026-11-01; no hard-coded easy/hard mapping.

## Starting provider/capacity observations

| Provider instance | State | Capacity evidence | Reset/window | Source | Observed at |
| --- | --- | --- | --- | --- | --- |
| OpenCode / DeepSeek V4.1 Flash (`opencode-go/deepseek-v4.1-flash`) | AVAILABLE | Orchestrator session running | UNKNOWN | T3 runtime | 2026-11-01T08:05Z |
| Claude A (`claudeAgent`) | AVAILABLE (listed) | UNKNOWN | UNKNOWN | T3 catalog | 2026-11-01T08:05Z |
| Claude B — Pro (`claudeAgent_claude_b_pro`) | AVAILABLE (listed) | UNKNOWN | UNKNOWN | T3 catalog | 2026-11-01T08:05Z |
| Codex / OpenAI B (`codex`, `codex_c75d...`) | AVAILABLE (listed) | UNKNOWN | UNKNOWN | T3 catalog | 2026-11-01T08:05Z |
| Cursor / Grok / Antigravity / Muse / Pi | DISABLED | N/A | N/A | T3 catalog constraints | 2026-11-01T08:05Z |

No precise quota number is inferred from the absence of errors.

## Pre-outcome routing decisions

### D-L2-01 — Overall L2 orchestration and final reconciliation

- `decision_id`: `l2-20261101-d01`
- `recorded_at`: 2026-11-01T08:05Z
- `work_unit`: Local L2 combined-sync qualification; parent = Local Overall / Deputy Officer.
- **Difficulty assessment:** ambiguity 0.30; scope breadth 0.85; reasoning complexity 0.60; integration/tool complexity 0.80; risk 0.85; verification burden 0.90; overall band `HIGH`; confidence 0.80.
- **Candidates considered:** DeepSeek V4.1 Flash (self); Claude Sonnet 5.5; Claude Opus 5.5; Codex gpt-6.1-sol; OpenAI B gpt-6.1-sol.
- **Constraints known at decision time:** exact-SHA discipline; shared worktrees and live state; fixture-backed runtime knowledge is local; no hard-coded model mapping; no need for paid infrastructure.
- **Selected executor:** DeepSeek V4.1 Flash, OpenCode harness, variant `max`, agent `build`.
- **Planned independent reviewer:** Claude Sonnet 5.5 (bounded evidence/interpretation review), contingent on availability and on a non-trivial review unit.
- **Rationale (ORCHESTRATOR CLAIM):** the task is broad but mostly deterministic and stateful. DeepSeek has the current fixture/context knowledge and the directive requires it to retain orchestration. Independent review is better obtained from a different provider than from self-review.
- **Material alternatives rejected:** Claude Opus 5.5 as primary orchestrator (higher capability, but unnecessary for deterministic qualification and would discard the active DeepSeek-orchestrator policy); Codex as orchestrator (would add a second provider lane without a clear capability need).
- **Selection mechanism:** `exploit` (existing knowledge) with `forced` orchestration policy.
- `machine`:

```json
{"schema":"t3-orchestration-evidence-v2","event_id":"l2-20261101-d01","event_type":"routing_decision","occurred_at":"2026-11-01T08:05Z","recorded_at":"2026-11-01T08:05Z","project":"t3-fork","task":"local-l2-combined-sync-qualification","orchestrator":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"selected":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"reviewer_planned":{"provider":"claudeAgent","model":"claude-sonnet-5-5"},"difficulty":{"ambiguity":0.30,"scope_breadth":0.85,"reasoning_complexity":0.60,"integration_tool_complexity":0.80,"risk":0.85,"verification_burden":0.90,"band":"HIGH","confidence":0.80},"selection":"exploit+forced_policy","outcome":"PENDING"}
```

### D-L2-02 — Repository safety and exact-SHA isolation

- `decision_id`: `l2-20261101-d02`
- `recorded_at`: 2026-11-01T08:05Z
- **Difficulty:** ambiguity 0.15; scope 0.25; reasoning 0.20; integration/tool 0.40; risk 0.70; verification 0.40; band `LOW-MEDIUM`; confidence 0.92.
- **Candidates:** DeepSeek self; Claude; Codex.
- **Selected executor:** DeepSeek self.
- **Rationale:** deterministic Git/worktree work with a high safety cost for mistakes. The local lane knows the existing worktree map and must avoid disturbing the browser lane or the developer's live state.
- **Alternatives rejected:** delegating to a child sharing the same checkout (adds a second writer and no capability gain).
- **machine**:

```json
{"schema":"t3-orchestration-evidence-v2","event_id":"l2-20261101-d02","event_type":"routing_decision","occurred_at":"2026-11-01T08:05Z","recorded_at":"2026-11-01T08:05Z","project":"t3-fork","task":"repo-safety-exact-sha-worktree","orchestrator":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"selected":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"difficulty":{"ambiguity":0.15,"scope_breadth":0.25,"reasoning_complexity":0.20,"integration_tool_complexity":0.40,"risk":0.70,"verification_burden":0.40,"band":"LOW-MEDIUM","confidence":0.92},"selection":"exploit","outcome":"PENDING"}
```

### D-L2-03 — Static/focused regression and typecheck execution

- `decision_id`: `l2-20261101-d03`
- `recorded_at`: 2026-11-01T08:05Z
- **Difficulty:** ambiguity 0.20; scope 0.70; reasoning 0.35; integration/tool 0.65; risk 0.55; verification 0.85; band `MEDIUM-HIGH`; confidence 0.88.
- **Candidates:** DeepSeek self; Codex; Claude.
- **Selected executor:** DeepSeek self.
- **Rationale:** deterministic test/typecheck commands with exact expected counts. The work is long but low-ambiguity; local execution avoids coordination overhead and keeps one writer.
- **Alternatives rejected:** Codex or Claude for command execution (no capability gain; would need the same worktree/install context).
- **machine**:

```json
{"schema":"t3-orchestration-evidence-v2","event_id":"l2-20261101-d03","event_type":"routing_decision","occurred_at":"2026-11-01T08:05Z","recorded_at":"2026-11-01T08:05Z","project":"t3-fork","task":"focused-tests-and-typecheck","orchestrator":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"selected":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"difficulty":{"ambiguity":0.20,"scope_breadth":0.70,"reasoning_complexity":0.35,"integration_tool_complexity":0.65,"risk":0.55,"verification_burden":0.85,"band":"MEDIUM-HIGH","confidence":0.88},"selection":"exploit","outcome":"PENDING"}
```

### D-L2-04 — Runtime/V2 execution-provenance verification

- `decision_id`: `l2-20261101-d04`
- `recorded_at`: 2026-11-01T08:05Z
- **Difficulty:** ambiguity 0.40; scope 0.45; reasoning 0.65; integration/tool 0.75; risk 0.85; verification 0.85; band `HIGH`; confidence 0.78.
- **Candidates:** DeepSeek self; Claude Sonnet 5.5; Claude Opus 5.5.
- **Selected executor:** DeepSeek self for executable verification.
- **Planned independent reviewer:** Claude Sonnet 5.5 reads the repaired bridge behavior and the L2 evidence for interpretation gaps.
- **Rationale:** the four-case matrix is executable and deterministic, but the provenance interpretation is architecture-sensitive. Self-execution keeps the DB/runtime context; independent review is the appropriate escalation rather than self-certifying the interpretation.
- **Alternatives rejected:** Claude as primary executor (would need the full local fixture context and write lane for a deterministic test); no reviewer (rejected because the handoff explicitly distinguishes observed linkage from broader V2 claims).
- **machine**:

```json
{"schema":"t3-orchestration-evidence-v2","event_id":"l2-20261101-d04","event_type":"routing_decision","occurred_at":"2026-11-01T08:05Z","recorded_at":"2026-11-01T08:05Z","project":"t3-fork","task":"runtime-v2-execution-provenance","orchestrator":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"selected":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"reviewer_planned":{"provider":"claudeAgent","model":"claude-sonnet-5-5"},"difficulty":{"ambiguity":0.40,"scope_breadth":0.45,"reasoning_complexity":0.65,"integration_tool_complexity":0.75,"risk":0.85,"verification_burden":0.85,"band":"HIGH","confidence":0.78},"selection":"exploit+independent_review","outcome":"PENDING"}
```

### D-L2-05 — Rendered UI and restart/persistence qualification

- `decision_id`: `l2-20261101-d05`
- `recorded_at`: 2026-11-01T08:05Z
- **Difficulty:** ambiguity 0.35; scope 0.75; reasoning 0.55; integration/tool 0.90; risk 0.80; verification 0.90; band `HIGH`; confidence 0.75.
- **Candidates:** DeepSeek self; Claude; Codex.
- **Selected executor:** DeepSeek self.
- **Rationale:** this is the most stateful/tool-heavy unit: fixture CLIProxy, synthetic managed credentials, dev server, browser, restart. The local lane already produced the deterministic fixture and knows the exact state transitions. A delegated child would require the same environment and introduce a second writer.
- **Alternatives rejected:** Claude/Codex execution (no capability gain for tool-state reproduction; coordination and risk cost).
- **machine**:

```json
{"schema":"t3-orchestration-evidence-v2","event_id":"l2-20261101-d05","event_type":"routing_decision","occurred_at":"2026-11-01T08:05Z","recorded_at":"2026-11-01T08:05Z","project":"t3-fork","task":"rendered-ui-restart-persistence","orchestrator":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"selected":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"difficulty":{"ambiguity":0.35,"scope_breadth":0.75,"reasoning_complexity":0.55,"integration_tool_complexity":0.90,"risk":0.80,"verification_burden":0.90,"band":"HIGH","confidence":0.75},"selection":"exploit","outcome":"PENDING"}
```

### D-L2-06 — Real-provider / OAuth / paid-eval availability check

- `decision_id`: `l2-20261101-d06`
- `recorded_at`: 2026-11-01T08:05Z
- **Difficulty:** ambiguity 0.55; scope 0.20; reasoning 0.45; integration/tool 0.40; risk 0.95; verification 0.70; band `HIGH-RISK / LOW-SCOPE`; confidence 0.70.
- **Candidates:** DeepSeek self; Claude; Codex.
- **Selected executor:** DeepSeek self, restricted to read-only availability classification.
- **Rationale:** the safety boundary is the important part. A second subscription OAuth refresh could rotate live credentials. No delegation is warranted because the decision is a stop/classify check, not open-ended work.
- **Alternatives rejected:** inducing a refresh to satisfy the gate (prohibited by the handoff); claiming fixture evidence as real OAuth (prohibited).
- **machine**:

```json
{"schema":"t3-orchestration-evidence-v2","event_id":"l2-20261101-d06","event_type":"routing_decision","occurred_at":"2026-11-01T08:05Z","recorded_at":"2026-11-01T08:05Z","project":"t3-fork","task":"real-provider-oauth-availability","orchestrator":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"selected":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"difficulty":{"ambiguity":0.55,"scope_breadth":0.20,"reasoning_complexity":0.45,"integration_tool_complexity":0.40,"risk":0.95,"verification_burden":0.70,"band":"HIGH-RISK/LOW-SCOPE","confidence":0.70},"selection":"forced_safety_boundary","outcome":"PENDING"}
```

### D-L2-07 — Independent review of L2 evidence and provenance interpretation

- `decision_id`: `l2-20261101-d07`
- `recorded_at`: 2026-11-01T08:05Z (planned; execution after observed verification)
- **Difficulty:** ambiguity 0.45; scope 0.50; reasoning 0.75; integration/tool 0.45; risk 0.65; verification 0.70; band `HIGH`; confidence 0.72.
- **Candidates:** Claude Sonnet 5.5; Claude Opus 5.5; Codex gpt-6.1-sol; DeepSeek self-review.
- **Selected reviewer:** Claude Sonnet 5.5, escalating to Opus 5.5 only if the review exposes an architecture-sensitive ambiguity.
- **Rationale:** independent provider/model review is the main benefit; Sonnet is sufficient for bounded evidence consistency and provenance interpretation. DeepSeek self-review is rejected as the only check because the directive exists to gather routing consequence evidence, including independent review value.
- **Constraints:** if Claude capacity/context is unavailable at dispatch, record `BLOCKED` or substitute Codex with the reason; do not silently drop the review.
- **machine**:

```json
{"schema":"t3-orchestration-evidence-v2","event_id":"l2-20261101-d07","event_type":"routing_decision","occurred_at":"2026-11-01T08:05Z","recorded_at":"2026-11-01T08:05Z","project":"t3-fork","task":"independent-evidence-review","orchestrator":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"selected":{"provider":"claudeAgent","model":"claude-sonnet-5-5"},"difficulty":{"ambiguity":0.45,"scope_breadth":0.50,"reasoning_complexity":0.75,"integration_tool_complexity":0.45,"risk":0.65,"verification_burden":0.70,"band":"HIGH","confidence":0.72},"selection":"explore_independent_review","outcome":"PENDING"}
```

### D-L2-08 — Final durable handoff synthesis

- `decision_id`: `l2-20261101-d08`
- `recorded_at`: 2026-11-01T08:05Z
- **Difficulty:** ambiguity 0.25; scope 0.65; reasoning 0.60; integration/tool 0.35; risk 0.75; verification 0.60; band `MEDIUM-HIGH`; confidence 0.85.
- **Selected executor:** DeepSeek self.
- **Rationale:** reconciliation and final verdict remain with the orchestrator under the directive; the handoff must distinguish observed facts, claims, and blockers.
- **machine**:

```json
{"schema":"t3-orchestration-evidence-v2","event_id":"l2-20261101-d08","event_type":"routing_decision","occurred_at":"2026-11-01T08:05Z","recorded_at":"2026-11-01T08:05Z","project":"t3-fork","task":"final-handoff-synthesis","orchestrator":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"selected":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"difficulty":{"ambiguity":0.25,"scope_breadth":0.65,"reasoning_complexity":0.60,"integration_tool_complexity":0.35,"risk":0.75,"verification_burden":0.60,"band":"MEDIUM-HIGH","confidence":0.85},"selection":"forced_orchestrator_role","outcome":"PENDING"}
```

## Event log

Outcome events are appended below after execution. Decision records above are not edited retroactively.
