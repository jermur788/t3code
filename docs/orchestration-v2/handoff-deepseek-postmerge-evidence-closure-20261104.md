# PASTE INTO T3 CODE — DeepSeek-only post-merge evidence portability and two residual checks

**Status:** PREPARED / NOT DISPATCHED. **Scope:** local, read-only qualification and a sanitized evidence package; no implementation, source edits, commit, push or merge authorized. Main is already merged.

> **DeepSeek: orchestrate only.** Read Project Instructions → [Current State](../../01_CURRENT_STATE.md) → [Coordination Protocol](../../02_COORDINATION_HANDOFF_PROTOCOL.md) → [manager reconciliation](manager-postmerge-pr21-verification-reconciliation-20261104.md) → [accepted compact DeepSeek template](DEEPSEEK_ORCHESTRATOR_HANDOFF_TEMPLATE_V1.md). Inspect actual active Runtime task records and worktree/worker ownership. **Do not code, edit source, run development tests or consume implementation tokens.**
>
> **Goal:** (1) preserve the *actual* completed post-merge verification ledger and sanitized evidence/command manifest in a portable, auditable package; (2) optionally close the two still-unproven app-level checks, **without using paid providers or altering fork `main`**.

## Base and safety

- Repository `jermur788/t3code`. Verified integrated fork `main`: `fb67545d790c5c001e8f85827f219ab6493c435e`. PR #21 is **already merged**. Always fetch/verify the actual remote head before work; if it changed, classify drift and stop this lane.
- Local verification worktree reported at `/media/jer/Files/Worktrees/t3-postmerge-pr21-verification-20261104` on local `verify/postmerge-pr21-20261104`; its original ledger was reported at `docs/orchestration-v2/postmerge-pr21-verification-ledger-20261104.md`. Evidence directory reported at `/media/jer/Files/Worktrees/pr21-verify-evidence-20261104/`. These **are local paths and may not exist in other sessions**. Browser manager could not fetch the branch/ledger from GitHub. Inspect actual files and do not invent continuity or proof.
- Before any local action confirm `git status`, worktree ownership, no ongoing writer, and no unrelated changes. Preserve original evidence and all existing worktrees. No stash/reset/clean/rebase, no fork-main writes, no PR operations. **Do not commit or push any branch until separately authorized by the user**. A complete GitHub summary exists, but is not the original raw ledger.

## Worker routing and bounded work

1. DeepSeek routes all actual shell, file-packaging, browser and test execution to **Codex GPT-6.1 SOL Medium** or **Claude Sonnet 5.5 Medium**, based on actual per-subscription capacity. Use a different provider/model read-only reviewer. **Opus 5.5** only if justified by a material unresolved issue; preserve DeepSeek coordination allotment.
2. Worker A: inspect the *actual* ledger and approximately 8.2 MB local evidence tree from the previous run. Verify file paths, hash manifest, command outcomes, timestamps, baseline, and that screenshots/logs/JSONL support the user-submitted claims. Produce a **sanitized portable manifest** and a copy of the append-only ledger, stripping tokens, paths that expose secrets, credentials or personal data. Preserve originals unchanged and label any missing evidence `NOT FOUND`. Prefer a safe export location **outside** the source worktree; do not push/archive binaries to GitHub without separate permission. Return explicit file names and a proposed durable publication destination/size/sensitivity classification for user decision. If T3 Runtime task/receipt update is exposed and authorized, persist there.
3. Worker B (optional; no paid calls): inspect whether a **true local stub-provider** can create an application-level task handoff through supported APIs. If feasible, record handoff creation, project A/B isolation and read/list behavior **after application restart** in the existing isolated disposable state. If append requires a paid/live model and no stub exists, record **NOT RUN / OPERATIONAL BLOCKER**; do not bypass interfaces or claim service-level isolation proves app-level behavior.
4. Worker B (optional): verify **Workspace/Development mode persistence** across a real normal stop/start using a disposable local `.t3` and rendered UI; record before/after state and screenshots or exact URLs. Avoid unrelated UI changes. Crash/SIGKILL and Add-project UI coverage remain outside this bounded task unless already free to observe.
5. Reviewer: independently read-only review the manifest, source evidence and any new local results, identify overclaims, and classify whether the two gaps are actually closed or remain deferred.

## Capacity/ledger requirements

DeepSeek supervises every worker and per-subscription quota/availability at activation, dispatch, completion, auth/quota error and task transition. Record exact model/effort, options considered, capacity UNKNOWN if not exposed, provider-confirmed five-hour reset where known, checkpoint and safe reroute/continuation plan. Do not invent resets, schedule a nonexistent automatic restart or work around subscription quotas. Update Runtime or append-only **local** ledger with UTC, attempt, actor, ownership, commands/exits/evidence, reviewer, failure classification and next action as facts occur. Preserve independent read-only review and one writer per any overlapping evidence package.

## Terminal handoff

Return **VERDICT / ACTUAL BASE / LOCAL EVIDENCE INVENTORY / LEDGER VERIFIED OR NOT / SANITIZED MANIFEST LOCATION / B1-B2 APP-LEVEL TESTS WITH EXITS / INDEPENDENT REVIEW / CAPACITY ROUTING LEDGER / FAILURES / SAFE PUBLICATION PLAN / NEXT**. Never claim the local files were remotely published unless a legitimate read can retrieve them.

**Do not start a new main merge, source implementation, Git push, public release or paid-provider call**. If tools are unavailable, report `NOT DISPATCHED` and exact blocker. If a durable evidence branch push is needed, **present a minimal non-destructive publish plan for separate user approval** first.
