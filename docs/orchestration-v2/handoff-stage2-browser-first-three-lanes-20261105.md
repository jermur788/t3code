# PASTE INTO T3 CODE — Stage 2 three-lane read-only qualification

**Status:** PREPARED / NOT DISPATCHED. **Overall Manager browser work completed 2026-11-05.** This is not approval for source implementation, branch merge, production enabling, Git commit/push or paid infrastructure.

## Exact T3 Code DeepSeek orchestration instruction

> **DeepSeek V4.1 Flash / OpenCode: ACT AS ORCHESTRATOR ONLY.** Do not implement source, edit files, execute tests, perform Git commands, generate artifacts or review code yourself. Read the T3 Fork Project Instructions, the current [Current State](../../01_CURRENT_STATE.md), [Coordination/Handoff Protocol](../../02_COORDINATION_HANDOFF_PROTOCOL.md), [Manager Stage 2 browser assessment](manager-stage2-browser-first-assessment-20261105.md), [D4 proposed contract](d4-transactional-revocation-proposed-contract-20261105.md), [D2 audit plan](d2-shipping-exclusion-audit-plan-20261105.md), and this handoff. Read active Runtime tasks/handoffs before dispatch to avoid duplicate work. If exact canonical GitHub planning docs are missing locally, fetch the planning branch and check the exact remote ref; do not invent replacement instructions.

**Objective:** use worker-host capabilities ONLY for what the browser manager could not verify: D4 DB/event-commit atomicity, actual D2 built MCP tool-list measurement, and read-only upstream/experiment merge preview. The Overall Manager has ALREADY inspected public GitHub main/upstream, documented proposed D4/D2 design and updated canonical state. Avoid repeating that context work.

**Known refs, refresh from live remote first:**
- Fork `jermur788/t3code` `main`: `fb67545d790c5c001e8f85827f219ab6493c435e`.
- Isolated experimental continuation: `experiment/continuation-default-off-gate-20261104` at `b3b8da54e0b8b184a1cf4e667d53e73e04f85074`.
- Upstream `pingdotgg/t3code` `main`: `337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17`.
- Incorporated upstream release-preparation parent: `bb4afa5425c52104a9261fa2d022cb8ba2fcc099`.
- GitHub reports experiment **34 ahead / 336 behind** fork main; upstream **50 commits ahead** of incorporated parent. These are dated checkpoints, not guaranteed live metrics.

**Safety preflight:** require exact repo path, remotes, worktree/branch status, owned lanes and independent mount/free-space checks. The user has private PR #21 evidence and a read-only Files mount; **do not touch, remount, unmount, delete, clean, stash, reset or upload** it. User's local `main` was stale and must not be moved for these tasks. Preserve unrelated uncommitted work and one writer per code/evidence lane. Prefer two or three distinct read-only worktrees with isolated disposable build caches/output outside all user worktrees, when host disk capacity permits.

### Lane A — D4 transaction and run creation safety (priority 1)

**Spec:** [full local D4 atomicity handoff](task-stage2-d4-atomicity-feasibility-20261105.md). Dispatch Codex GPT-6.1 SOL Medium or Claude Sonnet 5.5 Medium for actual source/database/command-path testing. Prove whether Project Runtime revocation writes and `EventSink.commitCommand` share the same SQLite file/transaction ordering across two connections and processes. Enumerate `run.created` paths, receipt idempotency and replay/restart behavior, and demonstrate the race between experimental preflight and engine commit. Produce exact guard placement and red-before tests. **Read-only investigation; no engine-hook implementation**. Independent different-provider/model read-only review.

**Result required:** DB identity and write serialization proof, all relevant run paths, ambiguity/replay behavior, suggested generic guard and tests, risks, reviewer verdict, precise architecture decision needed.

### Lane B — D2 genuine built agent-tool schema audit (priority 2)

**Spec:** [full built MCP schema handoff](task-stage2-d2-built-mcp-shipping-audit-20261105.md). Dispatch separate worker to compare actual built `tools/list` schema and UTF-8 byte counts on fork main versus isolated experiment using genuine permitted stub/testkit MCP auth. Inspect shared task contracts and MCP tool properties. Historic +646 bytes is contextual only; measure afresh. No model calls with material cost. Propose a release CI gate and shipping-safe schema strategy; **no source modifications**. Independent different-provider/model read-only review.

**Result required:** exact built artifacts/config, tool-list JSON/schema/property diff, bytes and budget, missing auth/test limitations, no secret capture, review verdict.

### Lane C — upstream/reconciliation source preview (priority 3)

**Spec:** [full read-only preview handoff](task-stage2-upstream-experiment-reconciliation-preview-20261105.md). Using complete paginated upstream inventory and local read-only merge-tree, map conflicts and tests for future adaptation of experimental continuation to current fork main. Inspect new upstream changes since incorporated parent, provenance of merged versus merely open PRs, rebase hotspots, provider adapter/Orchestrator/MCP/SQLite changes. **No merge, cherry-pick, rebase, source edits, direct upstream PR or Git ref updates**. Independent different-provider/model read-only review.

**Result required:** current refs, complete upstream delta, experiment branch delta, dry-run conflicts, test/rebase hotspots and recommended future sequence.

### Routing/capacity and evidence

- DeepSeek is coordination-only. Actual engineering/test workers: **Codex GPT-6.1 SOL Medium** or **Claude Sonnet 5.5 Medium**, based on actual per-subscription availability and task fit. Independent read-only review from the **other model/provider**. Claude Opus 5.5 only for truly difficult unresolved security/concurrency architecture, with recorded justification and no unapproved paid use.
- Separate safe read-only lanes may run concurrently only if T3 supports isolated worktrees, memory/resource budgets and reviewer independence. Otherwise run A then B then C. Each task records exact owned worktree, source/base, SHA in internal ledger (not user-facing reply), command exits, provider/model/effort, alternative reasons, quota/cooldown state and provider-confirmed five-hour reset or UNKNOWN, errors, reviewer, next action.
- Use authoritative T3 Runtime task/attempt/handoff records if accessible. Otherwise a **new restricted local append-only Stage 2 ledger** owned by the worker orchestrator, kept outside source worktrees. Do not commit or upload raw logs/screenshots or private PR #21 evidence. No invented cost, provider availability or schedule.

### Stop/return

Return one consolidated durable handoff:
**VERDICT / LIVE BASES / ACTIVE OWNERS / LANE A ATOMICITY + RUN PATHS / LANE B BUILT TOOL SCHEMA / LANE C RECONCILIATION PREVIEW / COMMAND EXITS + EVIDENCE / INDEPENDENT REVIEWS / SUBSCRIPTION ROUTING LEDGER / BLOCKERS CLASSIFIED / SAFE NEXT TASK / PRODUCT DECISIONS REQUIRED**.

All three lanes are *research and qualification*. Do not call them `D4 IMPLEMENTED`, `D2 SHIPPING VERIFIED`, `INTEGRATED` or `PRODUCTION VERIFIED`. D4 `run.created` versus provider-start linearization and in-flight contract remain **product decisions**, and any engine/source implementation requires explicit accepted spec/owned lane. Nothing here authorizes a fork-main merge, external evidence transfer, public release, provider production spend or history rewrite.

**If no T3 Code worker is accessible:** return `NOT DISPATCHED` with a precise tool/capacity blocker; do not claim a GitHub handoff itself launched a worker.
