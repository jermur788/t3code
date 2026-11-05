# Overall Manager — browser-first Stage 2 orchestration assessment

**As of:** 2026-11-05. **Status:** `BROWSER SOURCE REVIEW COMPLETE / PROPOSED D4 CONTRACT / D2 RESEARCH PLAN / THREE LOCAL HANDOFFS PREPARED, NOT DISPATCHED`.  
**Scope:** read-only GitHub source/upstream/PR inspection and canonical docs on the existing planning branch. No product source change, fork-main merge, build, test execution, experiment enablement or paid provider call.

## Live observed source/repo checkpoints

- [Fork PR #21](https://github.com/jermur788/t3code/pull/21): CLOSED/MERGED, fork `main` remains `fb67545d790c5c001e8f85827f219ab6493c435e`.
- [Research PR #20](https://github.com/jermur788/t3code/pull/20): OPEN/DRAFT, **not integrated**; description has older checkpoint statements and must not override current State.
- Isolated default-off continuation experiment `experiment/continuation-default-off-gate-20261104`: `b3b8da54e0b8b184a1cf4e667d53e73e04f85074`, not contained in fork main; comparison vs current fork main reports `ahead 34, behind 336`, not a clean fast-forward.
- Current upstream `pingdotgg/t3code` main `337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17`; incorporated upstream release-preparation parent `bb4afa5425c52104a9261fa2d022cb8ba2fcc099`; GitHub comparison reports **50 commits ahead**. Only 300 changed filenames were exposed by one compare response, so complete changed-path inventory remains a local follow-up.
- Current fork/upstream `apps/server/src/orchestration-v2/EventSink.ts` and `ThreadLaunchService.ts` blob contents matched exactly; `ProviderTurnStartService.ts` differs. Upstream changes include provider adapters, orchestrator, projections, MCP, SQLite initialization, provider context and tests. A clean updater is **not presumed**.
- The existing user-accepted D1 default-off experimental gate remains implemented/tested on its separate branch, while D2 is an unmet shipping acceptance gate and D4's exact stronger contract still requires product acceptance. No source writes to implement either.

## Technical findings

**D4 race source confirmed:** experimental `RuntimeTaskExecutionService.launchAttempt` rechecks permission before `runLaunch` but can lose authorization before new engine run creation. `ThreadLaunchService.launch` dispatches `message.dispatch` after creating/claiming a thread, and Orchestrator's event plan includes `run.created` plus provider-turn effects. `EventSink.commitCommand` commits command receipt, events, projections and outbox inside one SQL transaction; there is no continuation guard there today. Both fork/upstream EventSink sources currently match. Thus a **transaction-level predicate on the new run commit** is the preferred concept, not an additional preflight check, but same-DB/cross-connection atomicity must be proved locally.

**D4 exact acceptance remains a product choice:** `run.created` durable commit as the no-new-run linearization (preferred) versus external provider start; separate handling for already-created/in-flight work. A new authority table, upstream engine contract, provider revocation guarantees, and production release were **not approved**.

**D2 exposure source confirmed:** isolated experiment adds optional `continuation` to shared task contracts; MCP task tooling imports those contracts, so the schema can be advertised even when runtime gate is off. Existing historical +646-byte tool-schema delta is a worker report, **not remeasured on current build**. Current fork main excludes the experimental code but has not had an independently verified built `tools/list` shipping artifact check.

**Reconciliation risk:** experimental continuation branch diverged after fork/upstream integration; upstream has moved again. Need bounded read-only merge preview and test map before any future implementation/integration authorization.

## Browser-generated durable outputs

1. [D4 proposed transaction contract](d4-transactional-revocation-proposed-contract-20261105.md): precise no-new-`run.created` invariant, guard placement, receipt replay, cross-process/checkpoint tests, product decision list. **PROPOSED, not implementation authorized**.
2. [D2 shipping source audit and build test plan](d2-shipping-exclusion-audit-plan-20261105.md): source schema exposure, options, genuine built MCP `tools/list` acceptance tests. **BROWSER ANALYSIS, built artifact NOT RUN**.
3. [D4 read-only feasibility packet](task-stage2-d4-atomicity-feasibility-20261105.md): one local technical worker + different-provider reviewer to prove SQLite transaction semantics, enumerate all run paths and generate precise red-before test plan. **PREPARED / NOT DISPATCHED**.
4. [D2 built-MCP schema audit packet](task-stage2-d2-built-mcp-shipping-audit-20261105.md): local stub/server build and actual `tools/list` measurement on main vs experiment, independently reviewed. **PREPARED / NOT DISPATCHED**.
5. [Upstream/experiment reconciliation preview packet](task-stage2-upstream-experiment-reconciliation-preview-20261105.md): read-only full 50-commit inventory and merge-tree conflict/test hotspot map; **no merge**. **PREPARED / NOT DISPATCHED**.

## Browser vs local execution and task sequence

**Completed in browser:** source inspection, current branch/PR/upstream comparison, D4/D2 proposal and review-ready specifications, fully bounded local test/handoff instructions, project-state reconciliation. Browser manager can continue inspecting public GitHub and writing canonical planning docs without T3 Code. No verified automatic T3 Code bridge exists.

**Remaining local:** actual SQLite transaction concurrency proof, built MCP `tools/list`, provider stub run/restart/exit evidence, worktree ownership checks and full multi-commit Git conflict preview. These require workers using T3 Code and local worktrees.

**Recommended safe execution sequence:** (a) dispatch read-only D4 feasibility and D2 built schema audit in **separate owned lanes**, (b) read-only reconciliation preview after head verification (can run parallel if ownership/capacity permits), (c) manager reconciles primary evidence/review and takes explicit D4 product contract decision, (d) only then issue or release a writable D4 implementation packet on isolated worktree, independently review, test and decide a *separate* integration step. D2 public-release build verification and production release always remain separate. DeepSeek **orchestrator only**, Codex GPT-6.1 SOL Medium / Claude Sonnet 5.5 Medium execution and different-provider/model review, with no invented capacity data or reset schedule.

**No automatic dispatch from browser:** these are GitHub task packets, not live T3 Runtime launches. User or connected local T3 host must actually start a session; never call `PREPARED` an implemented or dispatched task.

## Existing milestone integrity

PR #21 evidence originals and sanitized 81-file candidate remain **PRIVATE by explicit user decision**; locally reported integrity 80/80 PASS with independent review, no public upload. Do not re-open evidence publication as a Stage 2 task. Fork main **INTEGRATED / POST-MERGE LOCAL RUNTIME PASS (worker-reported)**, **NOT PRODUCTION VERIFIED**. The browser did not copy private evidence.

D2/D4 are release gates, not permission to bring isolated continuation onto main. No history rewrite, force push, main source write, branch merge, provider spending, public release or product intent reinterpretation occurred.
