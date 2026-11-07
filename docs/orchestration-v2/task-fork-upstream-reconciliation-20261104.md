# T3 Code handoff — fork main ↔ upstream T3 reconciliation (isolated)

**Issued:** 2026-11-04. **Authorization:** Overall Manager, under already-approved staged safety/continuation direction. This authorizes only a **separate bounded compatibility and conflict-resolution trial** in an isolated branch and local worktree. It is NOT a merge into main, production integration, or a new upstream PR.

**TASK:** Reconcile preexisting fork/upstream divergence for the eight known conflicts, verify resulting **trial** tree, and return a durable evidence-based recommendation. Continuation gate stays isolated; no new shipping decision required for this task.

**ROUTING:** DeepSeek/OpenCode coordinator for low-cost source archaeology, test triage, and routine conflict resolutions; Codex/Claude-class code solver for any security-sensitive Orchestrator/MCP, routing/capacity or concurrency semantics; separate independent reviewer from the last writer. In T3 host, log proposed and actual provider/model/instance, route origin/eligibility, alternatives rejected, reason, attempt number, completion events and outcomes. Never infer unavailable quota/cost. User-requested two evidence-distinct attempts per ordinary technical blocker before escalating; up to two further attempts with stronger model (max four total). Immediate stop for architecture/security/permission boundaries.

**GOVERNING SPEC:** [Accepted staged continuation safety](continuation-staged-safety-governing-spec-20261104.md), [independent manager gate review](manager-gate-branch-review-20261104.md), [coordination protocol](https://github.com/jermur788/t3code/blob/planning/resource-efficient-continuation-20261103/docs/orchestration-v2/task-handoff-staged-continuation-safety-20261104.md) and project instructions. **Current source evidence:** [gate-branch trial and eight conflicts](https://github.com/jermur788/t3code/blob/experiment/continuation-default-off-gate-20261104/docs/orchestration-v2/staged-continuation-t3-upstream-trial-20261104.md).

**REPOSITORY:** `jermur788/t3code`; remotes `origin` (fork), `upstream` (`pingdotgg/t3code`).  
**PREPARED REMOTE BRANCH:** `integration/fork-upstream-reconciliation-trial-20261104` — created by browser manager from **fork main**, not from the continuation-gate branch. Confirm its exact remote base before write. **NO writes to fork main or upstream.**

**Known previous trial:** eight conflicts at an older upstream base. Latest browser reconnaissance showed upstream advancing further, with at least 10 more commits beyond the T3 worker's trial source, including Orchestrator, ThreadManagement and adapter/runtime-layer tests. Do **not** assume eight remains exact; fetch latest at execution.

## Stage R0 — preflight, security and operational readiness

1. Inspect actual repo path/remotes/branches, all worktrees (`git worktree list --porcelain`), dirty/untracked files, active workers and one-writer ownership. Do not overwrite or repurpose the existing gate worktree or detached trial worktree. Preserve other users' changes.
2. **Root filesystem was reported 100% full (~231 MB remaining) during prior T3 run.** Run `df -h` and check space on `/media/jer/Files`. Create a **new isolated reconciliation worktree on that external volume** if safe. Keep disposable local temp/cache/dependency installations on sufficient space if supported; do not modify global package caches destructively or clean any old worktrees without explicit authorization. If not enough capacity, classify `OPERATIONAL BLOCKER` and continue read-only source analysis.
3. Fetch fork main, prepared remote trial branch and upstream main. Record exact bases, branch ownership and status in the **branch-local routing ledger**. If worktree/branch ownership conflicts, pause before any write. Verify actual child completion channel before assuming monitoring.
4. Route independent review early for conflict-sensitive design; avoid starting a second overlapping writer.

**Acceptance R0:** confirmed clean/safely owned worktree, sufficient disk resource for chosen commands, prepared worker roster and actual model routing records. Otherwise precise blocker.

## Stage R1 — reproduce and classify the conflicts on fresh upstream

Using the exclusively owned trial branch/worktree, attempt a **non-fast-forward trial merge** of freshly fetched upstream into the fork-derived branch, without touching fork main or upstream remote. Preserve the unmerged conflict state only inside this worktree until each hunk is classified.

Known historical eight files:
1. `apps/server/src/mcp/OrchestratorMcpService.ts` — **security/authority-sensitive**, review RPC/tool exposure and provider-neutral semantics.
2. `apps/server/src/mcp/linkOrigin.test.ts` — preserve fork Project Runtime DI/coverage and upstream test fixtures.
3. `apps/server/src/orchestration-v2/Adapters/GrokAdapterV2.test.ts` — provider adapter fixture compatibility.
4. `apps/server/src/orchestration-v2/Adapters/OpenCode2AdapterV2.test.ts` — provider adapter behavior and fixture changes.
5. `apps/server/src/orchestration-v2/runtimeLayer.test.ts` — upstream V2 runtime-layer behavior and fork service graph.
6. `apps/server/src/peer/PeerForwarding.test.ts` — preserve fork DI and upstream peer tests.
7. `apps/web/src/routeTree.gen.ts` — generated; reconcile authoritative route sources and regenerate, **do not hand-edit generated code** as final solution.
8. `packages/shared/src/usageLimits.ts` — **resource/routing-sensitive**, preserve fork capacity evidence and updated upstream semantics, do not resolve by wholesale selecting one side without tests.

For each hunk, record: upstream behavior, fork behavior, selected intended merged behavior, spec authority, actual source lines, test affected, and a risk classification. **If a conflict materially changes provider/permission/security or quota semantics and no unambiguous source-preserving resolution exists, stop that code change and request architecture review.** Do not guess a side to make the merge green.

**Acceptance R1:** source-backed conflict matrix using **current** upstream, including any new conflicts, no invented resolution claims.

## Stage R2 — bounded conflict resolutions on the owned trial branch

- One writer for overlapping files; route security-sensitive `OrchestratorMcpService` and `usageLimits` to a capable Codex/Claude-class worker where justified, with DeepSeek coordinating.
- Prefer upstream behavior plus isolated fork-owned extension where both can be preserved. Keep provider-neutral Runtime and existing fork abstractions. Avoid rewriting upstream event/driver/session internals.
- Fix fixture integration without weakening tests. For generated route tree, use the actual generator to resolve from canonical sources; inspect unexpected route changes.
- No new database/migration, new provider policies, or acceptance contract. If these prove necessary, classify `PRODUCT DECISION` or `UPSTREAM COMPATIBILITY` and preserve evidence.
- Maintain each conflict's attempts in the ledger: at least two materially different evidence-backed approaches for *routine failures* before escalation; do not retry destructive/unsafe actions.
- A successfully resolved trial may be committed **only to this isolated owned reconciliation branch** after tests, independent review, secrets check and ownership confirmation. Do not push upstream, create a new PR or merge into fork main.

**Acceptance R2:** no conflict markers; exact intended semantics documented; reviewers can inspect the diff. If blocked, keep branch and do not misreport merged-tree PASS.

## Stage R3 — verification on the actual reconciled trial tree

When code is syntactically coherent:
- Run relevant targeted test suites for all eight conflict files, especially V2 orchestration adapters/runtime/peer/MCP, `usageLimits` tests, and web route generation/build smoke. Record exact commands/exits.
- Run `vp run typecheck`, `vp run check:changed` (or clearly explain if worktree baseline or resource limits prevent it), `vp test run apps/server/src/provider/AgentContextBudget.test.ts`, and relevant provider routing/Project Runtime tests. Do not change budget snapshot simply to greenwash an increase.
- Re-measure agent-facing MCP tool list on the **reconciled actual code**, not the old clean upstream or gate branch snapshot. Record changed packages, source and test environment.
- Confirm existing fork Runtime and core upstream behavior were not silently dropped. Cross-project isolation and restart behavior get actual evidence where touched.
- For any user-facing route/visual behavior changed during conflict resolution, render/inspect UI or mark **UI VERIFICATION REQUIRED**. A code-only route generator pass is not equivalent to visually verified UI.

**Acceptance R3:** reproducible relevant static/runtime test results on isolated trial with no unexpected changes. If an upstream breaking change prevents tests, classify and attempt routine repair as authorized; stop for new architecture.

## Stage R4 — independent review, disposition, handoff

Have a different provider/model review the final conflict resolution and test evidence. Pay particular attention to `OrchestratorMcpService`, capacity/routing policy, provider-specific test semantics, migrations, generated route tree and any newly introduced upstream changes. Review must not be performed solely by the code writer; record routing/effort, why chosen, findings and delta re-review.

Return a **durable T3 handoff** with:
- VERDICT per stage and conflict file;
- BASE/CHECKPOINT (latest upstream/fork and isolated worktree/branch/clean status);
- RESULT (diff, tests, any unmerged/blocked areas);
- VERIFICATION (exact commands, exit codes, logs; executed vs not);
- FAILURES/RISKS with precise blocker classifications;
- REVIEW (independent provider/model and findings);
- ROUTING LEDGER (all choices, rejections, attempts, actual completion/liveness);
- INTEGRATION STATE (**NOT INTEGRATED into main**); NEXT exact safe task.

No stronger completion status than evidence. Push to **owned isolated trial branch** via ordinary fast-forward only after acceptance. Preserve existing worktrees; no resets, force-pushes or unrelated cleanup.

## Separate work not in scope

- The default-off continuation gate remains on `experiment/continuation-default-off-gate-20261104` and must not be silently applied in this fork/upstream sync trial.
- D4 strict no-new-continuation-run-after-revocation is an accepted *release requirement* but the linearization authority/engine hook is **not yet a coding decision**. Read-only research may continue separately.
- D2 shipping exclusion and agent-facing budget removal is approved as a release gate, but no public shipping branch or build exclusion is implemented by this task.
- No production release, public PR, real-provider paid evaluation, main merge, upstream push or destructive cleanup.

## Stop conditions

Material permission/routing/usage-limit semantics collision; a new authoritative state owner; upstream Orchestrator/EffectWorker core changes beyond compatibility; irreversible DB operations; security-sensitive ambiguity; insufficient local disk capacity; conflicting ownership; unapproved provider cost; surprise live-provider invocation. Stop the affected write lane and return source-backed options; continue only independently safe research.

**FIRST EXACT LOCAL ACTION:** Fetch and verify latest `origin/main`, `origin/integration/fork-upstream-reconciliation-trial-20261104`, and `upstream/main`; inspect the local worktree list and `df -h`. Pick a new safe external-volume worktree, record resolved coordinator route, then reproduce current conflicts without main edits. No further user question is needed for this isolated trial.
