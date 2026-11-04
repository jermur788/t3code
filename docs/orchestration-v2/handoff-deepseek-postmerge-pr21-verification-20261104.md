# PASTE INTO T3 CODE — DeepSeek-only post-merge PR #21 qualification

**Status:** Bounded post-merge verification handoff, prepared by browser Overall Manager, **NOT DISPATCHED**.  
**Authority:** User approved and manager completed fork-main PR #21 merge on 2026-11-04. **No further merge, production release or experimental continuation enablement is authorized.**

## Exact task

You are **DeepSeek, the orchestration-only supervisor** of post-merge baseline verification. Do not write source, implement features, perform development tests, or run shell test commands yourself. Assign all code/test/UI work to **Codex GPT-6.1 SOL Medium** or **Claude Sonnet 5.5 Medium**, selecting by observed provider/subscription availability and task fit. Escalate to **Claude Opus 5.5** only for a truly hard unresolved architecture/security/integration issue. Ensure a different provider/model performs read-only independent assessment when appropriate.

**Repo:** `jermur788/t3code`. Fork `main` at the browser-verified merge checkpoint `fb67545d790c5c001e8f85827f219ab6493c435e`, merging PR #21 head `0e0c7bc2cb1bb805f273123686303a68e1c2807c` and prior fork main `d3bedef12a31f368e5c5a6b279445bea39a6a13a`. **Confirm actual live remote heads again; don't trust stale data.**

**Read first:** Project Instructions, `01_CURRENT_STATE.md`, `02_COORDINATION_HANDOFF_PROTOCOL.md`, `OVERALL_MANAGER_HANDOFF.md` on `planning/resource-efficient-continuation-20261103`, accepted [orchestrator template](DEEPSEEK_ORCHESTRATOR_HANDOFF_TEMPLATE_V1.md), [PR #21](https://github.com/jermur788/t3code/pull/21), its local verification ledgers and [P2 manager source review](manager-evidence-v0-p2-promotion-review-20261104.md). Inspect live Runtime tasks/handoffs, worktrees, branch status, writer ownership and disk capacity.

## Worker task / acceptance

1. **Source/base safety:** establish a fresh **read-only or uniquely owned external-volume verification worktree** at the exact merged `main`; do not change `main`, any existing user worktree, the P2 repair branch, the separate default-off continuation experiment, or upstream. Confirm merge ancestry, presence of Project Runtime/Evidence V0 pruning fix, and **absence of experimental continuation code** from PR #21.
2. **Static/targeted checks:** delegate typecheck, focused Evidence V0 + Projection Maintenance, Project Runtime/restart/isolation, agent-context-budget tests, `vp run check:changed upstream/main` using the correct pinned references, and applicable web build. Record exact executed commands, exits, test counts, changed-file baseline and failures. Avoid claiming a hosted CI pass; hosted checks were zero at merge.
3. **Rendered UI gate:** have a worker **actually launch** the local app with stub/no-cost providers and inspect browser rendering for **fork Project Home, its mode controls, upstream thread/environment route navigation and browser back**. Capture screenshots or a concise rendered inspection record. A successful web build alone is not sufficient.
4. **Durability/isolation gate:** worker uses file-backed SQLite, creates two separate projects with task/handoff/evidence state, restarts/reopens the application/database, and proves no cross-project leakage; record actual SQL/test artifacts and any limitations. No production claim.
5. **Evidence integrity gate:** verify an actual V2 maintenance prune in the **merged main code**, exported `orchestration-v2-pruned` marker and `incomplete/unknown` semantics, preserved unresolved/truncation markers, unaffected post-boundary threads, JSONL decoding, and old-decoder upgrade limitation. Confirm no fabricated missing events.
6. **Provider neutrality:** use stubs and multiple provider configurations where practical; no real paid provider usage without a separate user-approved cost decision. Do not silently expand into D2/D4 automatic continuation or production revocation work.
7. **Independent review:** send a read-only summary of inspected outcomes to a different provider/model than the execution worker. Classify any issues as implementation defect, verification failure, operational blocker, upstream compatibility, review required, or product decision. Ordinary fixes may be **proposed** or undertaken only on a **new isolated owned repair branch** after a bounded task/spec check; no unapproved merges or main writes.

## Subscription watch and durable ledger

At activation, each worker dispatch, completion, provider error and task transition, DeepSeek records **per-subscription** availability (AVAILABLE / BUSY / COOLDOWN / UNAVAILABLE / UNKNOWN), actual allowance/capacity and provider-confirmed five-hour reset if exposed, as well as model, reasoning effort, reason for route/alternatives, owner/worktree, attempt, command outcomes, review, failures and next action. User reported DeepSeek/OpenCode at ~10% remaining 30-day allowance with ~10 days left as of 2026-11-04; this is a **dated report, not live quota measurement**. **DeepSeek does not implement or execute tests**. If a worker hits limits, checkpoint, reroute safely to an authorized available provider/subscription, or resume after confirmed reset **only if the live T3 host supports it**; otherwise produce a restart-ready handoff. No quota bypass, invented resets or unverified automatic scheduling.

Write each transition to **T3 Runtime task/attempt/handoff** if available; otherwise use append-only `docs/orchestration-v2/postmerge-pr21-verification-ledger-20261104.md` in a fresh dedicated verification branch/worktree (not fork `main` or the shared planning branch). Label OBSERVED FACT / WORKER CLAIM / RETROSPECTIVE INFERENCE and preserve sanitized screenshots/test outputs and exact pinned refs. Do not re-label worker reports as manager-independent execution.

## Completion

Return a durable, manager-readable **VERDICT / BASE / OWNERS / IMPLEMENTATION DELTA (none expected) / RENDERED UI / RESTART & ISOLATION / REAL PRUNING EVIDENCE / STATIC TESTS WITH EXITS / PROVIDER CONFIGS / REVIEW / ROUTING + QUOTA LEDGER / LIMITATIONS / NEXT**.

Allowed positive outcome: `INTEGRATED ON FORK MAIN / POST-MERGE LOCAL RUNTIME PASS / REVIEW PASS`, with separate limitations. **Never call it PRODUCTION VERIFIED** without production-level evidence and separate authority. If local execution tools are missing, return `NOT DISPATCHED` and precise blocker. **Start actual worker dispatch now only after confirming tools and ownership; writing this handoff is not dispatch.**
