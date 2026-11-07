# PASTE INTO T3 CODE — DeepSeek Overall-Task Orchestrator: Evidence V0 P2

**Issued:** 4 November 2026.  
**Type:** executable local orchestration handoff for the currently authorized P2 repair.  
**Owner:** DeepSeek as **mandatory task orchestrator**; user remains final product and merge authority.  
**State on issue:** prepared, not dispatched; no branch or production merge is approved.

## START / ROLE

You are the **DeepSeek orchestrator for the T3 Fork Evidence V0 pruning-completeness P2 repair**. Begin coordination and execute already-authorized work in the **local T3 Code host now**, using available tools and workers. This message is intended to start an actual T3 orchestration session, not to create another planning-only note. If the T3 host cannot launch workers or lacks repository/runtime access, report the precise blocker and preserve a handoff; do not pretend the task started.

**Read before work, in order:**
1. Project Instructions and `01_CURRENT_STATE.md` on `planning/resource-efficient-continuation-20261103`.
2. `02_COORDINATION_HANDOFF_PROTOCOL.md` and `OVERALL_MANAGER_HANDOFF.md` on the same planning branch.
3. Governing P2 task: `docs/orchestration-v2/task-evidence-v0-pruning-completeness-p2-20261104.md`.
4. Draft PR #21, its manager decision comment, candidate source, current Runtime task state, worktrees and routing ledger. Treat older chat/status as context, not proof.

**Main goal:** reproduce and repair the Evidence V0 bug where partial pruning of upstream V2 event history can silently yield a seemingly complete export. Implement only a bounded, read-only, appropriately scoped **pruned/incomplete** indicator based on the existing upstream pruning watermark. Prove in a real fixture that missing history is not fabricated or misrepresented.

## REQUIRED ORCHESTRATION AND MODEL ESCALATION

- **DeepSeek is the orchestrator for the full task lifecycle**, not only an initial reconnaissance worker. Remain responsible for worker dispatch, liveness, ledger, evidence inspection, repair cycles, independent review, manager-ready verdict and durable handoff. Do not silently replace the orchestrator with Codex/Claude.
- Prefer **DeepSeek/OpenCode** workers for reconnaissance, test design, narrow implementation, routine repairs and local check execution. The orchestrator may implement directly if doing so is least costly and preserves independent review.
- For a routine failure, attempt **two materially different, evidence-backed low-cost solutions** before escalating; record why each failed. The two attempts are not a license to bypass an immediate security, integration or product stop. Do not retry unchanged instructions merely to satisfy a count.
- When complexity justifies stronger reasoning, escalate an explicitly bounded **worker or reviewer subtask** to **Codex GPT-6.1 SOL** (typically high reasoning) or **Claude Sonnet 5.5** (normally medium). Choose based on capability fit, available capacity and actual failure evidence; record alternatives and reasons. If those are insufficient for genuinely difficult architecture, concurrency or security analysis, escalate to **Claude Opus 5.5**, low/medium effort initially, with reason recorded.
- Preserve reviewer independence: ideally different provider/model from the implementer; reviewers are read-only. A stronger model does not inherit integration, merge, budget or product authority. If exact provider/model is unavailable, do not invent it or silently substitute; record unavailable/UNKNOWN, choose the next authorized compatible route or stop only the blocked lane.
- Record actual orchestrator provider/model/version, selected and rejected provider/model, attempts, capacity evidence/UNKNOWN, route origin, outcome, reviewer and resource observations when available. Never invent quotas, tokens, cost or reset times.

## BASE / SAFETY

- Repository: `jermur788/t3code`. The **fork-only draft PR #21** branch is `integration/fork-upstream-reconciliation-trial-20261104`. The isolated **repair branch** has already been prepared: `fix/evidence-v0-pruning-completeness-p2-20261104`. It was created from the accepted PR candidate with **no repair source changes**.
- Fetch and **pin actual remote heads** before work; confirm current PR draft/open/unmerged, fork main unchanged, and no drift in the repair branch. Recheck upstream release-preparation parent and its difference from the v0.1.7 tag; do not assume exact tag.
- Inspect `git worktree list`, `git status`, task/worker ownership and disk space before any write. Use a **fresh uniquely owned external-volume worktree** on the prepared repair branch. Preserve every pre-existing worktree/dirty file; **never stash/reset/clean/rebase/force-push/rewrite shared history**.
- One writer on Evidence V0 service/contract/test files. Independent reviewer may read the same branch but must not write.
- **No merge, PR #21 head change, new PR, main update, public upstream action, production feature enablement, paid live app-provider call or destructive operation**. If an architectural/spec or security trade-off is unavoidable, stop that lane and return evidence/options for manager/user decision.

## IMPLEMENTATION / ACCEPTANCE

- Inspect `apps/server/src/projectRuntime/OrchestrationEvidenceService.ts`, `apps/server/src/projectRuntime/OrchestrationEvidenceService.test.ts`, `packages/contracts/src/orchestrationEvidence.ts`, upstream `apps/server/src/orchestration-v2/ProjectionMaintenance.ts` and `apps/server/src/persistence/OrchestrationEventStore.ts`.
- First add a **red regression**: create referenced V2 history in a disposable SQLite DB, advance the genuine pruning boundary using the supported maintenance path, prove at least one event was actually deleted while some events remain, then export/reconstruct Evidence V0. Capture before/after event counts, boundary, expected and observed completeness.
- Make a **small additive repair** using upstream's published `prunedThroughSequence` (or appropriate existing metadata interface). Emit a deterministic, machine-readable, scoped `incomplete/pruned` evidence marker; when scope is uncertain say UNKNOWN. A global pruning watermark alone is not proof a particular thread lost history. Avoid false positives for unaffected new threads and false claims of exact loss.
- Preserve explicit `orchestration-v2-unresolved` when referenced history is genuinely absent, and distinct existing per-thread read-bound truncation. Preserve deterministic identifiers, ordering, JSONL decode and original no-prune behavior. Do not fabricate events, create a second event store, migrations or change upstream execution/recovery internals.
- Test: unpruned full history; partially pruned referenced history; fully absent referenced thread/run; unrelated newly created thread/project after watermark; bound/truncation; restart/reopen; cross-project isolation; stable JSONL/schema.
- If conservative correct detection cannot be done without changing material contract semantics, stop and return **reproducing red test + scoped alternatives**, not an unreviewed workaround.

## VERIFY AND INDEPENDENT REVIEW

Run and record exact commands/exits for the targeted Evidence V0 and Projection Maintenance tests, changed contract tests, `vp run typecheck`, `vp run check:changed upstream/main`, `AgentContextBudget.test.ts`, and web build if applicable. Use the actual pinned baseline and log test counts, skipped cases, context-budget bytes and changed files. No hosted CI PASS claim unless an actual hosted run exists. Preserve the earlier independent V1/V2 screenshots and original prune fixture by copying **sanitized** evidence from the local host to the durable task record.

After local green, dispatch a **read-only independent review** to a different provider/model: Codex GPT-6.1 SOL high or Claude Sonnet 5.5 medium; use Opus 5.5 only for a materially hard unresolved issue. Reviewer must assess pruning-boundary races, incomplete vs unresolved semantics, no false-new-thread markers, contract compatibility, no upstream-engine changes and test strength. Repair findings in the owned implementation lane; rerun and re-review.

## LEDGER / DURABLE CONTINUATION

**Start a task routing and execution ledger immediately**, either in the available T3 Project Runtime task/handoff interfaces (preferred) or an **append-only file on the dedicated repair branch** (fallback), e.g. `docs/orchestration-v2/evidence-v0-p2-repair-routing-ledger-20261104.md`. Initialize it before the first dispatch, maintain it **at each decision/attempt**, and publish it with the final branch/handoff. Do not reconstruct missing measurements afterward.

Each entry records: UTC time; task/child; action and attempt; orchestrator/worker provider/model/reasoning; alternatives considered; rationale and prior failure; selected branch/worktree/owner; provider capacity and source (or UNKNOWN); commands/exits and actual result; verification/reviewer evidence; defect classification; next action. Label **OBSERVED FACT**, **ORCHESTRATOR CLAIM**, and **RETROSPECTIVE INFERENCE** distinctly. Include worker liveness/completion and whether a handoff was persisted.

**Do not stop because a worker finishes.** Inspect, reconcile, repair/re-review routine findings, update task and ledger, then proceed automatically through safe authorized work. Do not mark stronger states than evidence proves.

## FINAL REQUIRED RETURN TO OVERALL MANAGER

Return **VERDICT; BASE/WORKTREE/OWNERS; RESULT/changed files; RED→GREEN fixture and actual pruning boundary; TESTS with exact exits/counts; independent REVIEW with provider/model and findings; ROUTING/ATTEMPTS/capacity ledger; FAILURES/RISKS; INTEGRATION STATE; NEXT authorized action and user decision needed**. Include durable GitHub links to updated task ledger and exact owned repair branch and verified evidence artifacts. Mark anything unrun `NOT RUN`.

Success return: **`P2 REPAIR — LOCAL TEST PASS / INDEPENDENT REVIEW PASS / READY FOR MANAGER PROMOTION REVIEW; PR #21 NOT INTEGRATED`**. The Overall Manager, not this worker, decides whether/how to promote the candidate fix and later asks the user for separate merge approval.

**Launch the authorized local task now, under DeepSeek orchestration, or state the exact operational blocker.**
