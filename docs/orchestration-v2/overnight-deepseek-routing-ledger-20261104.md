# Overnight DeepSeek — Routing, attempts, worker roster and evidence ledger

Date: 2026-11-04 (Europe/Dublin). Status: **PREPARED ONLY — no live DeepSeek run has yet been observed in this manager chat**.
Classification: COORDINATION STATE / seed. This file is a template and historical initial checkpoint, not a substitute for canonical T3 Project Runtime routing/attempt receipts.
Parent handoff: https://github.com/jermur788/t3code/blob/planning/resource-efficient-continuation-20261103/docs/orchestration-v2/overnight-deepseek-serial-handoff-20261104.md

## Baseline snapshot (not live task outcomes)
- Target branch: fix/continuation-authorization-hardening-20261103; source review accepted R1/R2/R3 for bounded code paths; fork main separate. All heads must be re-fetched by the actual local coordinator at kickoff.
- Local implementer reports successful tests: 39 focused, 179 projectRuntime and check:changed 111. These are **not** independently rerun by the planning manager.
- F4 production feature gate, +646-byte MCP context change and final external launch TOCTOU remain decisions/risks. No permission to enable or merge.
- Requested coordinator: DeepSeek. **Actual provider instance/model, token/cost, session, start time, capacity and liveness are UNKNOWN / NOT DISPATCHED as of planning.**
- No active local worker, scheduled background job or automatic T3 completion bridge was created by this GitHub documentation write.

## Serialized stage registry
| Stage | Scope | Requested primary route | Status at seed | Actual resolved route | Next |
| --- | --- | --- | --- | --- | --- |
| O0 | Preflight, host supervision and Runtime/ledger bootstrap | DeepSeek coordinator | READY, not dispatched | UNKNOWN | Verify host and ownership |
| O1 | Independent executable qualification | Cheapest eligible independent test runner; DeepSeek coordinates | READY, not dispatched | UNKNOWN | Fresh worktree, 4 commands |
| O2 | Additional failure/concurrency qualification | DeepSeek; stronger review if safety issues | WAITING on O1 | UNKNOWN | Deterministic tests |
| O3 | Upstream compatibility reconnaissance | DeepSeek low-cost read-only | WAITING on O2 or independent blocker | UNKNOWN | Current upstream source |
| O4 | F4 gate/context-cost analysis/prototype only | DeepSeek plus independent capable reviewer | WAITING on O3 | UNKNOWN | Compare options, no adoption |
| O5 | Independent security review and morning handoff | Independent stronger reviewer for security | WAITING on O4 | UNKNOWN | Review evidence and write handoff |
| O6 | Spare capacity: approved read-only checks | DeepSeek | OPTIONAL | UNKNOWN | Only after prior checkpoints |

## Worker roster (append/refresh; do not claim presence)
| Child task | Role | Provider/model (resolved by host) | Thread / worktree | State | Last host event UTC | Owner | Completion channel | Next check/action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| None yet | DeepSeek requested, not started | UNKNOWN | UNKNOWN | NOT DISPATCHED | none | none | not established | O0 |

## Routing decision event template — append one record at decision/dispatch/result
**Event number:** <sequential>  
**UTC timestamp / evidence source:** <observed>  
**Parent stage/task and child task:** <Runtime task IDs or descriptive stable stage>  
**Attempt #:** <1..4>; **type:** initial / retry / fallback / escalation / independent review  
**Goal, acceptance, base, worktree and code owner:** <...>  
**Requested by and coordinating model:** <actor; DeepSeek actual model once resolved>  
**Candidates in order:** <provider instance/model/driver/cost/quota/availability or UNKNOWN>  
**Rejected candidates:** <each one plus exact reason>  
**Chosen planned:** <provider/model, role, reason>  
**Resolved actual:** <provider/model/instance/driver/runtime mode, task/profile/project/default origin, isolation/worktree, receipt ID>  
**Eligibility/capacity:** <host evidence, quota and price only when known>  
**Cost/control objective:** <least total viable cost, risk/quality requirement>  
**Dispatch and completion:** <host call/wake IDs and actual timestamps; pending/running/waiting/review/blocked/done>  
**Hypothesis and attempt delta:** <what changed vs previous attempt>  
**Command/test evidence and result:** <logs/exit count; RUNTIME PASS etc only with proof>  
**Escalation decision:** <trigger, route change, options considered, explicit budget safeguards>  
**Current child liveness:** <last observed event, timestamp, unknown if absent>  
**Outcome/next:** <handoff link, owner released, next stage, user gate if any>

## Routing event 0000 — planning request (not a dispatch)
- **Observed:** user asked for DeepSeek-led overnight serial execution, at least two genuinely different attempts per routine issue, escalation to stronger available models, child supervision and explicit route tracking.
- **Requested coordinator:** DeepSeek; **resolved:** UNKNOWN / NOT STARTED.
- **Candidate selection reasoning:** DeepSeek is preferred for cost-effective coordination, reading and bounded fixes; security/race-sensitive escalation to available Codex/Claude-class when necessary. No particular model/version is assumed installed, available, or paid for.
- **Rejected candidates:** none yet; availability not checked in local T3.
- **Execution evidence:** planning handoff and ledger drafted through connected GitHub. **No local command, live subagent dispatch, paid provider or background monitor executed.**
- **Next:** actual T3 Code operator launches O0; coordinator confirms host routing provider/model, records session and first live event.

## Per-task issue and retry log template
| Stage | Issue | Attempt 1 hypothesis/evidence/result | Attempt 2 *different* hypothesis/evidence/result | Stronger model selection and why | Attempt 3/4 result | Classification | Next |
| --- | --- | --- | --- | --- | --- | --- | --- |
| none | not started | — | — | — | — | — | O0 |

## Liveness / handoff events (append one on every transition)
| UTC | Task | Old state → new state | Host proof or log | Last observed route | Handoff | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| not started | O0 | READY (planning only) | planning document, no host | UNKNOWN | none | Start local coordinator |

## Final reconciliation checklist
- [ ] Every actual child appears in roster with host-backed state and single code owner.
- [ ] Every dispatch/retry/fallback/escalation has planned and resolved model/provider with reasons and rejection codes.
- [ ] Unknown token/cost/quota not converted into invented estimates.
- [ ] Every substantial child produced Runtime handoff or authoritative fallback.
- [ ] Every stage lists precise verification and remaining unexecuted gates.
- [ ] Morning handoff reconciles source/branch against real repo and Runtime, preserves NOT INTEGRATED.
- [ ] No unauthorized merge, real provider call, upstream public action, or production enablement.
