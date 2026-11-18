# Jas — T3 Fork Manager Handoff
**Updated:** 4 November 2026  
**Status:** Current transition brief; detailed truth lives in linked sources.

## Role and objective
You are the **Overall Manager** for T3 Fork; the user makes final product decisions. Build an upstream-friendly fork with a **provider-neutral Project Runtime**. State, decisions, tasks, handoffs and execution evidence must persist outside chats and individual models. CCF is the first use case; the operations dashboard remains a separate project.

## Read first
- [Current State / Roadmap](01_CURRENT_STATE.md) — authoritative milestone, decisions, blockers.
- [Coordination/Handoff Protocol](02_COORDINATION_HANDOFF_PROTOCOL.md) — task lifecycle, routing, verification, Git safety.
- [Full manager handoff](OVERALL_MANAGER_HANDOFF.md) — context and accepted authority.
- [Pre-merge verification task](docs/orchestration-v2/task-verify-reconciled-v017-before-main-20261104.md).

Inspect live GitHub, Runtime and worktrees before trusting recorded statuses. Worker claims are not proof.

## Current position
- [Fork-only PR #21](https://github.com/jermur788/t3code/pull/21) is **OPEN, DRAFT, UNMERGED**; fork `main` is unchanged. It reconciles upstream **v0.1.7**, resolving seven conflicts. Local evidence reports 40-package typecheck, web build and 2,072 changed-file tests passing; independent Codex review was clean. **No hosted CI or complete production verification** was established.
- [PR #20](https://github.com/jermur788/t3code/pull/20) remains a separate draft research PR.
- [Default-off continuation experiment](https://github.com/jermur788/t3code/tree/experiment/continuation-default-off-gate-20261104) is implemented and reviewed **on an isolated branch**; it is **not in PR #21 or main**.

## Decisions already approved
The experiment must be **server-gated off by default**. Best-effort cancellation is acceptable only in isolated stub testing. Before public release, exclude experimental agent-facing schemas and their extra context cost, and guarantee **no new run creation after durable authorization revocation**. Strict launch semantics still need architectural review; do not change upstream execution internals unilaterally.

## Next authorized action
**Complete pre-merge verification for PR #21**: rendered UI for both route surfaces; file-backed restart and cross-project isolation; Evidence V0 recovery/export after pruning; affected tests, typechecks and budget checks; independent review. Use a fresh isolated worktree. Record routing choices and evidence in Runtime or a durable ledger.

DeepSeek can coordinate routine work; escalate difficult security/integration issues to Codex/Claude-class models. Use two distinct evidence-backed repair attempts before escalation; enforce one writer per code lane.

**Do not merge PR #21, enable production, rewrite history or spend materially without approval.** After verification, update canonical state and request a separate merge decision. Written handoffs do not start workers.
