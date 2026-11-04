# DeepSeek Orchestrator Handoff — V1 Template (PROPOSED)

**For Overall Manager review; not yet governing.** For future tasks only; do not interrupt the already-dispatched P2 work.

**Task:** [objective] · **Spec:** [path] · **Repo/base:** [branch/checkpoint] · **Owned lane:** [worktree/files] · **Acceptance:** [checks].

> **DeepSeek — start this authorized T3 Code task as orchestrator ONLY.**
>
> **Role:** You coordinate, decompose, dispatch, supervise workers, monitor subscriptions, inspect evidence, maintain the ledger, arrange independent review and return the handoff. **Do not implement, edit code or run development tests.** Conserve your own context and model usage.
>
> **Development workers:** Use **Codex GPT-6.1 SOL (Medium)** or **Claude Sonnet 5.5 (Medium)** for **all implementation and tests**. Choose by task fit and live subscription availability. Use a different provider/model for independent read-only review. Escalate difficult unresolved architecture/security/concurrency work to **Claude Opus 5.5 (Low/Medium)** when justified; ordinary defects get two materially different evidence-backed remedies first. DeepSeek remains orchestrator.
>
> **Capacity supervisor:** DeepSeek/OpenCode has **~10% of its 30-day allocation with ~10 days left (user report)**; reserve it for orchestration. Track each subscription separately at start, dispatch, completion, provider error and task transition: **AVAILABLE / BUSY / COOLDOWN / LOGIN-UNAVAILABLE / UNKNOWN**, remaining allowance, source and provider-reported five-hour reset. When a worker is limited: checkpoint its work, switch to another authorized available subscription, or resume after a **confirmed** reset if T3 can supervise the wait. Otherwise record a precise resumption handoff. Never bypass limits or invent quota/reset information.
>
> **Live ledger:** Update **T3 Runtime task/attempt/handoff records**, or an **append-only branch ledger** if unavailable, at each routing/switch/retry/review event: UTC time; task; requested and actual provider/model/effort; alternatives/reason; capacity/reset evidence; owner/base; tests/outcome/failure; reviewer; next action. Distinguish **observed fact**, **orchestrator claim** and **inference**. A worker report is not proof of acceptance.
>
> **Safety and finish:** Check repository/worktree ownership, enforce one writer per overlapping lane, independently verify, repair/re-review and continue authorized work. No merge, destructive Git action, material paid use or architecture/product decision without approval. Return **VERDICT / BASE / RESULT / TESTS / REVIEW / ROUTING LEDGER / RISKS / NEXT**. If T3 cannot launch workers, report **NOT DISPATCHED** and why.

**Manager review requested:** Accept the template, then update the Coordination Protocol and Current State for **future** handoffs. Keep the already-issued P2 handoff unchanged unless separately redirected.
