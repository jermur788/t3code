# T3 Fork — Overnight DeepSeek Orchestration Handoff

Date: 2026-11-04 (Europe/Dublin)
Classification: COORDINATION / AUTHORIZED BOUNDED EXECUTION. NOT a production policy decision.
Coordinator: DeepSeek running inside a live local T3 Code orchestrator session. Overall Manager: ChatGPT for morning reconciliation.
Repo: jermur788/t3code.
Governing protocol: 02_COORDINATION_HANDOFF_PROTOCOL.md and Current State; task-specific source: independent-continuation-hardening-review-20261104.md.
Canonical source review: https://github.com/jermur788/t3code/blob/planning/resource-efficient-continuation-20261103/docs/orchestration-v2/independent-continuation-hardening-review-20261104.md
Candidate branch: fix/continuation-authorization-hardening-20261103.
Ledger seed/template: https://github.com/jermur788/t3code/blob/planning/resource-efficient-continuation-20261103/docs/orchestration-v2/overnight-deepseek-routing-ledger-20261104.md

## Mission and permissions

Run a serial queue of safe, bounded tasks overnight and maximize verified progress without user interaction. DeepSeek is the default coordinator and first solver. Escalate genuinely difficult debugging, concurrency, authorization, integration and architecture analysis to an already-available Codex/Claude-class model after at least TWO **distinct, evidenced** troubleshooting attempts, as defined below. An independent reviewer must not approve its own code changes.

No PR, merge to fork main, production enablement, public upstream communication, real/paid external provider evaluation, destructive Git commands, expansion of authoritative stores, or upstream V2 execution-core rewrite is authorized. The user remains final authority for product choices, revocation contract, public releases, significant architecture and material costs. Do not blindly keep trying at a security/authority stop.

An overnight handoff is **not itself an active background process**. The local operator must launch this in an actual running T3 Code session with working subagent tools. The coordinator should continue only while the host is alive and capable of dispatching and receiving completion. If interrupted, persist a resumable checkpoint and report the operational blocker; don't claim remote supervision.

## Starting truth — verify fresh, never assume

At preparation, candidate head matched last local handoff; fork main was still separate. Upstream pingdotgg/t3code main had newer activity. Fetch and inspect both heads at kickoff. Local worker reports passing: focused 39/39, projectRuntime 179/179, check:changed including 111 tests, typecheck. Independent browser **source review PASS** is scoped to R1/R2/R3; it did not rerun tests. F4 is a hard feature gate; +646 bytes to MCP context on original experiment; final prelaunch-check/external-launch TOCTOU remains unclosed. Worker handoffs are evidence claims, not proof.

## Preflight (mandatory)

- Verify repo path and remotes, current branch, base, status, untracked files, worktree ownership, active local agents, provider configurations, budgets, and pending tasks.
- Fetch candidate/upstream/fork main and ensure recorded base matches inspectable history. Do not reset, stash, force-push, discard or rewrite shared history.
- Create a **new isolated overnight branch/worktree** for any writes, based on the verified candidate; do not write into earlier qualification or security-repair worktrees. Serial one-writer ownership for overlapping files.
- Create/refresh parent and stage tasks in Project Runtime if available; keep separate instruction/source/project/task/attempt/handoff provenance. If Runtime unavailable, maintain a branch-local copy of the ledger and handoff (not only chat) and record the reason.
- Set up completion/wake routing in the actual T3 host; verify one no-op or short read-only child result is returned before unattended progression. If no reliable completion delivery, do not claim unattended child monitoring; work serially in a single active host session or stop with precise blocker.

## Serial overnight work queue

Use numbered stages in order. Move to the next stage automatically only after the prior stage has a durable result, evidence and handoff. A later stage may execute read-only without the previous stage passing only if it is truly independent and code ownership remains safe. Never promote failure claims to PASS.

### Stage O0 — Bootstrap supervision, ledger, routing

Owner: DeepSeek coordinator. No code writes aside from isolated ledger.
Acceptance: clean preflight or classified existing changes; host completion channel verified; parent + stages recorded; routing plan entered; all existing branches/worktrees preserved; at least one actual child response or explicit limitation. Ledger row for the initial coordinator provider/model resolved _from host_ (unknown until then).
Handoff: repository base, providers available, task roster, cost/resource envelope, active code writer and next task.

### Stage O1 — Fresh independent executable verification

Owner: an independent low-cost capable local test worker, not the implementer. Coordinator supervises.
Base: frozen published hardening head, fresh isolated worktree; tests use only stub providers. Run with exact exit codes:
vp test run apps/server/src/projectRuntime/RuntimeTaskContinuationPolicy.test.ts apps/server/src/projectRuntime/RuntimeTaskContinuationRestart.test.ts apps/server/src/projectRuntime/RuntimeTaskContinuationSecurity.test.ts
vp test run apps/server/src/projectRuntime
vp run typecheck
vp run check:changed
Verify source-scope and reviewer/repair-scope revision invalidation, latest user done/deferred/withdraw superseding stale blocked outcome, malformed key reservation, normal replay, no third repair/no VERIFIED, restart results. Preserve logs and commands, not just summary. Compare counts to handoff; discrepancies are not automatically defects.
Acceptance: all pass and clean tree, OR a reproducible classified blocker with two valid attempts/escalation; never rewrite tests merely to pass.

### Stage O2 — Targeted safety and failure-path qualification

Owner: DeepSeek for test design/straight implementation; stronger model when concurrency or security-sensitive changes are necessary.
Use same isolated overnight code lane. Inspect and write deterministic tests for the **known** external launch TOCTOU, source-reexecution-mid-chain behavior, historical malformed receipts, task scope/acceptance revision drift, cross-project isolation and two-service SQLite contention. Prioritize new tests that reveal real defects and prevent duplicates/unauthorized dispatch. Do not invent a production revocation contract or change upstream engine. For the final-check/launch race, characterize exactly what occurs and document tradeoffs with a fixture; **do not assert a strict atomic fix without its source evidence**.
Acceptance: reproducible tests/contract and a bounded risk statement. Safe routine fixes on this experiment branch may proceed through two attempts + independent review. If an upstream execution-engine modification, new ledger or different revocation promise is necessary, classify PRODUCT DECISION/REVIEW REQUIRED and move to independent authorized read-only work, not risky implementation.

### Stage O3 — Upstream-first compatibility reconnaissance

Owner: DeepSeek read-only GitHub/repo analyst; optional independent cheaper reviewer.
Fetch current upstream pingdotgg/t3code main and relevant open PRs/issues for execution/continuation overlaps. Compare our fork's touched contracts, ProjectRuntime execution service, orchestration events, provider context budget and migrations. Record real source/merge hotspots and difference between upstream implementation, PR proposal and our fork.
If feasible without destructive history edits, create **separate disposable local compatibility worktree/branch** to test applying our changes onto a fresh updated base; cherry-pick or apply patches only when safe and owned. Never rebase shared/published branches, merge to main or push upstream. After any changed base, rerun relevant tests. If conflicts are architectural, stop that implementation lane and write an exact compatibility report.
Acceptance: source-linked compatibility matrix, precise blockers, option with least upstream churn, and evidence of any executed tests. No "upstream compatible" claim without a real check.

### Stage O4 — F4 production-gate and context-budget design / reversible prototype

Owner: DeepSeek design lead, Codex/Claude-class reviewer for security gating.
Analyze how to make the experimental continuation unavailable by default in a normal shipping build. Candidate options: exclude experimental public contract/UI entry points from shipping; or explicit default-off server enforcement with robust owner/user control, no provider prompt/budget leak. Measure actual MCP tool-list delta and offer a minimal non-production proof of concept **only on isolated experimental branch** if it can be reversed easily and does not change accepted architecture.
Do NOT make a product choice for user, approve the 646-byte context cost, treat "synthetic" as a gate, or integrate. If prototype changes contracts, preserve versioning and tests and mark as proposal requiring user choice.
Acceptance: decision memo with option pros/cons, failure modes, actual budget bytes, minimal patch/test evidence where safe, and explicit recommendation without adoption. Leave unresolved choice in PRODUCT DECISION state.

### Stage O5 — Independent review, integration readiness, and morning handoff

Owner: independent reviewer (prefer a stronger model for security-sensitive review) not the latest implementer. Coordinator reconciles review vs repo/tests. Check authorization, actor provenance, revision CAS, task/handoff trust, restart isolation, shared target collision, repair budget, project boundaries, final external launch limitation, global feature gate and context cost. Re-review any routine defect after corrections. Do not self-certify or elevate reviewer evidence to VERIFIED.
Acceptance: line-specific findings, status RUNTIME PASS/REVIEW PASS only where proven, precise unresolved categories, clean worktree, committed checkpoint(s) on a new isolated experimental branch (normal fast-forward push permitted only after sanity/secret check and no conflicting owner), and durable final handoff. **NOT INTEGRATED** remains mandatory.

### Stage O6 — Spare capacity only (safe, independent)

After O1–O5 complete or become blocked, continue with strictly read-only tasks already within the accepted continuation direction: inspect outstanding upstream PR response on #28777 without posting; prepare a documentation-only operator checklist for restart/cancel/escalation; inventory existing missing tests in projectRuntime. Record as research, NOT adopted decisions. Do not silently switch to unrelated product milestones or paid verification.

## Routing policy and ROUTING LEDGER — mandatory for every child

Canonical routing evidence lives in Project Runtime execution receipts/attempts if available; otherwise append the following immutable records to the **branch-local** overnight ledger. A "summary" is not enough. Log one row BEFORE dispatch, one event AT routing resolution and one AFTER result. Include rejections and fallbacks, not just chosen provider.

Required per-attempt fields:

- UTC timestamp, parent task ID, stage, child task ID, attempt number, scope/acceptance, source/base/worktree.
- Requesting actor and orchestrator (DeepSeek); **proposed** provider/model and **actually resolved** provider instance, model, driver, runtime mode; route source (task/profile/project/default), candidate order, isolation/worktree policy, eligible/disabled status, rejected candidate + reason, fallback used; exact host IDs only in durable ledger, not user-facing message.
- Why chosen: difficulty/risk, comparative cost and already-available quota/capacity, expected value, capability match, independent-review constraint. Unknown price/quota is "unknown," not fabricated.
- Dispatch time, last receipt/wake/liveness event, current state (READY/RUNNING/WAITING/REVIEW/BLOCKED/DONE), tool/command ID/request key if supplied, child thread, completion/handoff ID, last verified progress.
- Result: elapsed time if measured, token/cost only if measured, commands/tests/log file evidence, PASS/FAIL/review/retry, root cause, code owner, errors.
- Retry/escalation: first and second hypotheses, what actually changed, trigger, old/new model/provider, why stronger model was necessary, budget impact, accepted/denied outcome.
- Next action, provenance source and whether User/Manager approval is needed. Never silently change providers or reuse an unverified model identity.

Make routing a **decision event** even when no worker is launched (candidate rejected due to unavailable provider/quota, incomplete scope, overlapping writer, security boundary). At each stage boundary reconcile ledger entries against actual T3 receipt, resolved route and Git/worktree truth; do not accept a worker self-reported route without host evidence when available.

Template and initial facts: docs/orchestration-v2/overnight-deepseek-routing-ledger-20261104.md on the planning branch. Copy/update the ledger into the new owned overnight branch and/or Runtime as the live authoritative record. Do not overwrite append-only history on other branches.

## Retry, escalation and no-infinite-loop rules

For each routine defect/blocker (test, typecheck, formatting, missing fixture, broken host command):

1. **Attempt 1:** DeepSeek identifies failure with exact log and a hypothesis; makes smallest authorized fix and reruns affected checks.
2. **Attempt 2:** DeepSeek tests a _materially different_ explanation or isolation strategy, compares upstream/runtime truth, modifies plan, reruns. Simply executing the same failed command twice without new evidence is not two attempts.
3. **If both fail:** escalate a precise, bounded handoff to an **already available** stronger Codex/Claude-class model for security/concurrency/integration. Record _before_ and _after_ routing evidence. Stronger solver gets at most two bounded attempts before marking BLOCKED or requesting explicit new scope.
4. Cap the chain at **four total actual solution attempts per issue** (2 DeepSeek + up to 2 stronger) absent genuinely new evidence or a separate approved task. Hard stops remain immediate for product/architecture decision, destructive action, unauthorized paid cost, or security conflict. Never retry an unsafe action just to meet a quota.
5. If no stronger model is available or quota can't be used safely, record operational blocker, skip only to independent authorized tasks and keep the original code lane safely paused. No surprise provider spend.
6. A completed child is not accepted until the coordinator inspects logs and changed files, reconciles with spec/state, obtains required independent review and writes the handoff. Failed children do not automatically reopen ownership or authorize parallel writers.

This retry policy is about **overnight engineering worker attempts**. It is **not** the experimental source-task policy's two-repair-cycle limit.

## Monitor all children and keep progress moving

Before each child dispatch, record exact owner, task, attempt and expected completion channel. While a child is active use T3's native completion-wake/event and supported liveness or status mechanisms; verify actual host signals, not self-authored promises. When a child completes, inspect, accept/reject, release its code lane and launch the next authorized stage immediately. A missing completion is WAITING/OPERATIONAL BLOCKER, never silently DONE. If the child could have partially changed files, inspect repo/status before retry or model escalation. No overlap with previous writer. Persist roster/checkpoint after _every_ change of state or provider/model.

Use bounded health checks only as supported by local T3 runtime. If the host doesn't support timed background checks or true scheduled agents, report that limitation, avoid claiming all subagents are monitored during a disconnected session and rely on durable recovery at restart. Don't burn tokens polling idle workers with no new evidence.

## Morning handoff contract

At finish or interruption provide:
VERDICT per stage; BASE/CHECKPOINT (branch/worktree/cleanliness, upstream); RESULT and changed paths; VERIFICATION commands/exit codes/stub-or-live; FAILURES/RISKS with classifications; REVIEW with reviewer provider/model; INTEGRATION STATE; NEXT exact action; USER DECISIONS pending; **routing ledger link** and a small routing table (task, selected model/provider, alternatives rejected, attempt count, escalation reason, verified outcome); all outstanding subagent status and last verifiable liveness event. Provide full durable task/handoff entries in Runtime when supported and commit a ledger snapshot. Do not fabricate timestamps, cost metrics, or child completion.

## Stop conditions

Product-choice/security gate, material architecture tradeoff, new authoritative queue/store, production revocation semantics, upstream V2 core rewrite, irreversible Git operations, real or material paid provider calls, unresolved merge conflict, or violated worktree ownership require user action on the affected task. The DeepSeek coordinator may continue with other non-overlapping read-only stages while preserving blocked state. For any defect, classification must be IMPLEMENTATION DEFECT, VERIFICATION FAILURE, OPERATIONAL BLOCKER, REVIEW REQUIRED, INTEGRATION CONFLICT, UPSTREAM COMPATIBILITY or PRODUCT DECISION.

## Host launch instruction

In T3 Code, start an active DeepSeek parent/orchestrator session with:
"Read the entire overnight DeepSeek serial handoff and routing ledger at the GitHub links above; verify the source and repository base; execute O0–O6 serially using T3's existing subagent dispatch/completion features. You own coordination and ledger updates, not product decisions. Attempt each routine blocker twice with distinct evidence-led approaches before escalating to a stronger available model, maximum four attempts total. Keep all child routing choices, provider/model changes, readiness, status and result in canonical Runtime and the append-only ledger. Follow all stop rules. End with an authoritative morning handoff. Do not merge or enable production."
