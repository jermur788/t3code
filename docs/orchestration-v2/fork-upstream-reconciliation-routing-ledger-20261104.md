# Fork/upstream reconciliation — routing, attempts and evidence ledger

**Created:** 2026-11-04 by Overall Manager. **STATUS: NOT DISPATCHED.** No local conflict resolution has begun in this task. This file is durable fallback coordination state until actual T3 Project Runtime task/receipt/handoff storage is available. Do not turn planned routes into actual dispatch claims.

**Authority:** [Accepted staged continuation safety specification](https://github.com/jermur788/t3code/blob/planning/resource-efficient-continuation-20261103/docs/orchestration-v2/continuation-staged-safety-governing-spec-20261104.md).  
**Complete task:** [Fork/upstream isolated reconciliation packet](https://github.com/jermur788/t3code/blob/planning/resource-efficient-continuation-20261103/docs/orchestration-v2/task-fork-upstream-reconciliation-20261104.md).  
**Branch:** `integration/fork-upstream-reconciliation-trial-20261104`, created from fork main before any trial.  
**Known root disk limitation:** approximately 231 MB free reported by prior worker; verify live. Prefer a distinct worktree on `/media/jer/Files` and preserve older worktrees.  
**Current live worker:** NONE OBSERVED by browser manager; actual host state must be checked at T3 start.

## Stage registry, to append live completion events

| Stage | Scope                                                   | Intended route                                   | State at seed         | Actual route | Verification                        |
| ----- | ------------------------------------------------------- | ------------------------------------------------ | --------------------- | ------------ | ----------------------------------- |
| R0    | repo/branch/ownership/disk/runtime preflight            | DeepSeek coordinator                             | READY, not dispatched | Unknown      | repo and disk evidence              |
| R1    | current eight-plus conflict reproduction/classification | DeepSeek analyst                                 | WAITING               | Unknown      | current hunk matrix                 |
| R2    | isolated semantic conflict resolution                   | one writer; stronger model if security-sensitive | WAITING               | Unknown      | test-backed resolved diff           |
| R3    | merged-tree gate and budget tests                       | independent local runner                         | WAITING               | Unknown      | exact commands/exits                |
| R4    | separate independent reviewer and handoff               | Codex/Claude-class                               | WAITING               | Unknown      | review acceptance, preserved branch |

## Routing event 0000 — planned by Overall Manager, NOT a dispatch

- **Reasoning:** DeepSeek handles routine source archaeological work and test triage at lower total cost, subject to actual host availability; Codex/Claude-class handles security/routing integration review or hard conflicts. Reviewer must be independent of last writer.
- **Not yet observed:** actual coordinator model, provider instance/driver, task or thread ID, cost/quota, local worktree, child wake channel, test results or time.
- **Scope:** safe trial fork/upstream reconciliation, 8 historically reported conflicts, no application of experimental gate to this trial and no main/public merge.
- **Last manager source observation:** current upstream advanced 10 commits beyond prior T3 trial, including Orchestrator and provider-adapter changes. Must fetch fresh before trial.
- **Next exact action:** R0, inspect real host/repo and disk space; create external-volume owned worktree if safe.

## Every actual route/attempt must append

UTC timestamp; parent/child task and stage; attempted number; objective/acceptance; owner, git base, path; requested provider/model; actual host-resolved provider/instance/model/driver/effort/route source; candidates rejected and grounds; quota/cost only if measured; dispatch/last actual liveness/wake/end status; tests/logs/exit codes; code lane conflicts; first/second distinct hypotheses and outcomes; escalation to stronger worker (up to 2 further attempts); independent reviewer; resulting handoff; next action. Record rejected routes and blocked decisions as well as successful dispatches.

## Conflict resolution matrix — fill from actual latest upstream trial

| File                       | Upstream intent | Fork intent | Actual conflict | Selected resolution | Safety risk      | Test evidence | Reviewer |
| -------------------------- | --------------- | ----------- | --------------- | ------------------- | ---------------- | ------------- | -------- |
| OrchestratorMcpService.ts  | unknown         | unknown     | to reproduce    | none                | SECURITY/ROUTING | none          | pending  |
| linkOrigin.test.ts         | unknown         | unknown     | to reproduce    | none                | TEST             | none          | pending  |
| GrokAdapterV2.test.ts      | unknown         | unknown     | to reproduce    | none                | PROVIDER         | none          | pending  |
| OpenCode2AdapterV2.test.ts | unknown         | unknown     | to reproduce    | none                | PROVIDER         | none          | pending  |
| runtimeLayer.test.ts       | unknown         | unknown     | to reproduce    | none                | EXECUTION        | none          | pending  |
| PeerForwarding.test.ts     | unknown         | unknown     | to reproduce    | none                | TEST             | none          | pending  |
| routeTree.gen.ts           | unknown         | unknown     | to reproduce    | none                | UI/GENERATED     | none          | pending  |
| usageLimits.ts             | unknown         | unknown     | to reproduce    | none                | CAPACITY         | none          | pending  |

## Required final checkpoint

No main/upstream edits. No cleaning, resetting, stashing, force operations or reuse of occupied worktrees. Preserve all file/attempt evidence, actual routing, independent review and final `NOT INTEGRATED` status. If no Runtime store, append terminal handoff here and in T3 return message.
