# Stage 2 / D4 — cross-transaction feasibility and run-creation path qualification

**Status:** **COMPLETED — READ-ONLY QUALIFICATION RETURNED**, 2026-11-05 13:50Z. This handoff below is historical: **DO NOT REDISPATCH**. **Authority:** read-only, source-led feasibility/testing and independent review, not implementation of new production authority or upstream engine edits. **Spec:** [browser proposed D4 contract](d4-transactional-revocation-proposed-contract-20261105.md) is PROPOSED, not yet user-accepted. Governing D4 requirement in [staged safety spec](continuation-staged-safety-governing-spec-20261104.md) is accepted.

## Result (supersedes this historical pre-dispatch packet)

LANE A CLOSED — SCOPE-BOUNDED FEASIBILITY PASS (worker-reported), independent PASS WITH FINDINGS (recorded). Not D4 implemented or a full-server pass. Worker returned same-file/inode cross-process barrier tests and corrected defer-start lifecycle: initial run preparing has no start effect; later prepared-run.release controls start. Remaining real operator revoke/typed denial/full-server/restart gaps. [Manager reconciliation](manager-stage2-three-lane-return-reconciliation-20261105.md).

The user supplied the local consolidated result and restricted ledger. Original screenshots/logs/attempt transcripts were not available to the browser manager. All related work was read-only against product source and no commits/merges/releases/paid-provider calls occurred. Any future writable task needs separate accepted spec and authority.

## Paste into T3 Code — DeepSeek orchestration-only task

> **DeepSeek V4.1 Flash — orchestrate only.** Do not edit source, run shell, execute tests or perform code implementation. Read Project Instructions → Current State → Coordination/Handoff Protocol → D4 proposed contract and this packet → Runtime task/handoff truth.
>
> **Objective:** answer the narrowly unresolved D4 engineering questions with code, actual SQL transaction evidence and deterministic stub-only experiments, so the Overall Manager can request the necessary product architecture sign-off and assign the smallest future code writer. **Do not modify existing product source, merge main, enable experimental continuation in production, or consume paid providers.**
>
> **Repo/base:** `jermur788/t3code` fork `main` was `fb67545d790c5c001e8f85827f219ab6493c435e`; isolated continuation experiment `experiment/continuation-default-off-gate-20261104` was `b3b8da54e0b8b184a1cf4e667d53e73e04f85074`. Current `pingdotgg/t3code` upstream head was `337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17`. **Fetch and re-confirm exact live heads, Git status, unrelated changes, worktrees, base/ownership** before proceeding. Separate read-only or owned verification worktrees; preserve local stale `main` and all uncommitted work. No `git reset/clean/stash/rebase`.
>
> **Execution worker:** Codex GPT-6.1 SOL Medium or Claude Sonnet 5.5 Medium, based on current provider availability/cost; independent read-only reviewer from the other provider/model. Use Opus 5.5 only for material unresolved security/concurrency architecture and record why.
>
> **A. Atomicity proof:** inspect actual `SqlClient` and SQLite file/path/connection lifecycle for `ProjectRuntimeService.updateTask`, `RuntimeTaskExecutionService`, `EventSink.commitCommand`, `Orchestrator.message.dispatch` and effect outbox. Confirm source and engine share the **same SQLite DB and writer ordering**. Show real SQLite `BEGIN IMMEDIATE` or equivalent behavior under *two connections*, and restart/process boundaries where practical. Do not infer SQL isolation from a comment alone. If they do not share an atomic DB, return `REVIEW REQUIRED` with specific alternative.
>
> **B. Run paths / idempotency:** enumerate every `run.created` creation path in merged `main`, including regular messages, queued/steered/restarted/delegated work, and which can be reached by experimental continuation through `ThreadLaunchService`. Locate accepted/rejected command receipt, duplicate dispatch and pending Runtime attempt replay semantics. Analyze existing thread-shell-without-run recovery. Verify no direct provider-start bypass for this continuation path.
>
> **C. Revocation window:** prove with reproducible scheduling/barrier tests or a minimal isolated test harness (outside tracked source; no implementation changes) that experimental final check occurs before engine transaction and can be invalidated by a later task revision commit. Identify where a **private generic guard** can be injected with minimum upstream diff and no user/MCP-authored capability.
>
> **D. Proposed test cases:** supply precise runnable red-before test outlines for revoke-before-run vs run-before-revoke, concurrent writers/transactions, retries/replay after restart, task/project isolation, policy gate off, stale task revisions, guarded denial with no outbox, ordinary non-continuation paths unchanged. Do not weaken existing tests to make examples pass; an unimplemented proposed guard is not a `RUNTIME PASS`.
>
> **E. Evidence and independent review:** provide source file/line refs, actual command/test exits if run, observed SQLite identity/transaction logs, any red-before failure, an upstream hotspot list, risks and minimal potential design diff. Independent different-provider review of your conclusions. Record capacity and provider resets as observed or UNKNOWN, exact model/effort, task/attempt and owner; use T3 Runtime when exposed, otherwise local append-only ledger in a new owned evidence location.
>
> **Return:** VERDICT / BASE AND WORKTREES / DB ATOMICITY OBSERVED OR UNKNOWN / ALL RUN PATHS / RACE EVIDENCE / PROPOSED GUARD EXTENSION / TEST PLAN / UPSTREAM REBASE RISK / REVIEW / ROUTING + QUOTA / NEXT. `FEASIBILITY PASS` is not `D4 IMPLEMENTED`. Mark source issues as `REVIEW REQUIRED` or `OPERATIONAL BLOCKER` precisely.
>
> **No source edits, Git commits/pushes/merges, public posting, production enablement or paid provider calls.** Stop for material architecture/security decision or inability to prove atomicity. Do not auto-run a D4 implementation task until the owner accepts the run-created vs provider-start contract and in-flight semantics.

**Why not browser-only:** current GitHub source was inspected and proposed contract published, but an actual multi-connection/multi-process SQLite ordering test and worker-host execution-path instrumentation require local T3 Code runtime.
