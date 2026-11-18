# Staged continuation safety — routing, attempts and verification ledger

**Date:** 2026-11-04 (Europe/Dublin).  
**Status:** PREPARED / NOT DISPATCHED. This is not evidence of a running worker.  
**Source:** [Approved staged spec](continuation-staged-safety-governing-spec-20261104.md), [T3 Code task packet](task-handoff-staged-continuation-safety-20261104.md), and [overnight route evidence](https://github.com/jermur788/t3code/blob/overnight/deepseek-continuation-20261104/docs/orchestration-v2/overnight-deepseek-routing-ledger-20261104.md).  
**Code base:** [Isolated gate branch](https://github.com/jermur788/t3code/tree/experiment/continuation-default-off-gate-20261104), fork main unchanged.

## Prepared stage registry (all unstarted)
| Stage | Task | Intended coordinator/worker | Status | Resolved provider/model | Exit criterion |
| --- | --- | --- | --- | --- | --- |
| T0 | Host/repo preflight, ownership, Runtime availability | DeepSeek coordinator | READY | Unknown: not dispatched | Branch, status, worker/wake verification |
| T1 | Default-off gate, negative tests and local qualification | Single capable code writer, coordinator routes | WAITING | Unknown | Off/on/restart tests + typecheck/check:changed |
| T2 | Independent security review and repair | Different provider/model reviewer | WAITING | Unknown | Reviewer findings fixed/re-reviewed |
| T3 | Upstream trial reconciliation on current bases | DeepSeek recon, owned disposable merge worktree | WAITING | Unknown | Matrix, tests on actual trial tree, budget remeasure |
| T4 | Strict revocation design and shipping exclusion memo only | Read-only architect, reviewed if material | WAITING | Unknown | Options, modelled races, no engine changes |
| T5 | Final evidence, security gate, handoff | Coordinator + independent reviewer | WAITING | Unknown | Durable evidence and precise NOT INTEGRATED |

## Routing/worker event schema — append for each actual decision

Record a first **decision** entry before dispatch; second **resolved** entry when host returns the model; third **outcome** when evidence is inspected; include rejected candidates/fallbacks and repairs. Do not turn planned names into reported executed route.

- UTC timestamp; task stage/ID, subagent/thread/attempt ID if host returns it; parent/owner/worktree/repo base.
- Desired model/provider/driver/effort and **actual resolved** provider instance/model/driver/route source/isolation; available alternatives, rejected ones and reasons; cost/quota only when measured.
- Scope/acceptance, risk class, expected independent review, approximate relative resource strategy without invented estimates.
- Dispatch/start/wake/progress/finish event and source, last true liveness, code lane ownership, status and next action.
- Error/hypothesis, first/second distinct attempts and evidence, escalation rationale and actual stronger route (max four total meaningful repair attempts; no unsafe reattempt).
- Verification commands/logs/exit codes; branch changes; reviewer and acceptance; handoff reference; approval gating.
- Reconcile with Project Runtime receipts when available; if not exposed, mark this document the fallback state and persist append-only events.

## Event 0000 — Manager planning (NOT a dispatched worker)

- **Authority:** user fully approved stage direction in chat 2026-11-04 01:09 Europe/Dublin.
- **Planned coordinator:** DeepSeek; no T3 live host/worker available in browser manager. Actual model instance/availability/cost UNKNOWN.
- **Planned route:** DeepSeek for routine reconnaissance and bounded first attempts; Codex/Claude-class for gate concurrency/authorization-sensitive debugging and independent reviewer, based on actual available models. No paid external model run authorized.
- **Browser-executed tasks:** inspected live GitHub source and upstream delta; wrote governing spec/task; created isolated gate branch. No TypeScript/tests run, no production writes/merges.
- **State:** T0 READY. Actual dispatch **NOT STARTED**. Next T3 Code operator starts coordinator and records its real route and worktree.
- **Approvals pending:** none for isolated default-off implementation/research. Actual merge/public release and material upstream engine architecture remain separately gated.

## Final reconciliation requirements

Before terminal PASS, verify every task's actual route, logs and independent review, preserve all worktrees, and label `NOT INTEGRATED` until separately authorized merge. Do not claim O0–O6 past records are current live worker statuses; keep this task's own events.
