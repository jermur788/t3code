# Stage 2 — read-only upstream/experimental continuation reconciliation preview

**Status:** **COMPLETED — READ-ONLY QUALIFICATION RETURNED**, 2026-11-05 13:50Z. This handoff below is historical: **DO NOT REDISPATCH**. **Authority:** inspect/review and plan only. No merge, commit, rebase or source integration authorized. **Current milestone:** fork-main PR #21 merged and locally qualified; continuation remains isolated; D4 implementation contract pending user choice.

## Result (supersedes this historical pre-dispatch packet)

LANE C CLOSED — READ-ONLY PREVIEW COMPLETE (worker-reported), independent PASS WITH FINDINGS (recorded). 50 upstream commits/610 changed paths, 30 experiment paths; simulated conflicts 1 experiment→main, 2 main→upstream, 9 experiment→upstream. Upstream catch-up then fresh continuation re-land is proposed only; no ref changes. Browser manager screened selected OPEN upstream PR hotspots; not merged or exhaustive. [Manager reconciliation](manager-stage2-three-lane-return-reconciliation-20261105.md).

The user supplied the local consolidated result and restricted ledger. Original screenshots/logs/attempt transcripts were not available to the browser manager. All related work was read-only against product source and no commits/merges/releases/paid-provider calls occurred. Any future writable task needs separate accepted spec and authority.

## Paste into T3 Code — DeepSeek orchestration-only task

> **DeepSeek — orchestration only.** Read Project Instructions, Current State, Coordination/Handoff Protocol, [D4 proposed contract](d4-transactional-revocation-proposed-contract-20261105.md) and [D2 plan](d2-shipping-exclusion-audit-plan-20261105.md). Route all code/reconciliation analysis and optional isolated test commands to Codex GPT-6.1 SOL Medium or Claude Sonnet 5.5 Medium; independent different-provider/model review. Do not perform source edits/tests yourself.
>
> **Goal:** produce an evidence-based forward-compatibility and integration **preview**, not a merge. The experiment branch is **34 ahead / 336 behind** current fork main at previous GitHub comparison. Current upstream `pingdotgg/t3code` had **50 commits beyond** the incorporated release-preparation parent; the compare endpoint returned only the first 300 changed filenames and must not be treated as exhaustive.
>
> **Preflight:** verify repo, exact fork-main/upstream/experimental remote heads, all local dirty worktrees, owners, current task lanes, available external-volume space. Previous main `fb67545d790c5c001e8f85827f219ab6493c435e`; experiment `b3b8da54e0b8b184a1cf4e667d53e73e04f85074`; upstream `337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17`. Stop and reconcile if any changed. No reset, force, stash, cherry-pick, rebase, commit or push.
>
> **A. Source map:** compare experimental fork-only files against current main. Identify changed schema, RuntimeTaskExecutionService, ProjectRuntimeService, authorization gate, task packet, tests, agent context budget, server layers and docs; classify each as preserve, obsolete, adapt, or separate research. Identify conflicts and upstream touched/rebase hotspots in `Orchestrator`, provider adapters, MCP, projections, runtime DB, build and generated route/tools schemas.
>
> **B. Upstream 50-commit scan:** retrieve **complete** commit list and relevant changed paths with pagination if needed, distinguish merged upstream implementation from open proposals, classify material security/concurrency and provider changes. GitHub browser review already found latest fork/upstream `EventSink.ts` and `ThreadLaunchService.ts` contents **identical**, while `ProviderTurnStartService.ts` differs; revalidate on exact current refs. Do not try to sync all 50 commits by default.
>
> **C. Dry-run conflict/verification plan:** using git read-only comparisons/merge-tree (without updating refs) estimate expected conflicts and associated test lanes for *two independent future operations*: experimentally adapting continuation to the **currently merged fork main**, and a future upstream catch-up. Sequence to minimize rebase cost while preserving upstream-friendly abstractions. Provide a concrete one-writer future implementation packet, not code changes; list acceptance tied to D4/D2 specs.
>
> **D. Risk review:** independent reviewer checks upstream provenance, no old experimental code accidentally brought into shipping agent-facing schemas, and that no unapproved conflict resolution overwrites user work. Record exact model/effort, available quota or UNKNOWN, test commands, read-only outputs and user-decision gates in Runtime or local append-only ledger.
>
> **Return:** VERDICT / CURRENT REFS AND OWNERS / COMPLETE UPSTREAM CHANGE INVENTORY / EXPERIMENT DELTA / ANTICIPATED CONFLICTS / TEST + REBASE HOTSPOTS / PROPOSED SAFE SEQUENCE / REVIEW / COST + ROUTING EVIDENCE / NEXT.
>
> **No source writes, merges, branch pushes/commits, experimental enablement, paid-provider calls or production changes.** Do not interpret a clean hypothetical merge as integration authorization. Stop on material architecture or upstream incompatibility findings.

**Why local:** a dry-run merge-tree, accurate complete upstream delta, locally tracked worktrees and targeted execution tests require the repo/host; browser GitHub review has covered initial source-level triage.
