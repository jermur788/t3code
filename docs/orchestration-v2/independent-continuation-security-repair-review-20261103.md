# Independent source/security re-review — continuation security repair

**Date:** 2026-11-03. **Reviewer:** Overall Manager (independent GitHub source inspection).  
**Source:** [Published security-repair branch](https://github.com/jermur788/t3code/tree/fix/continuation-security-repair-20261103); its head was confirmed against the 2026-11-03 worker handoff.  
**Verdict:** **PARTIAL REVIEW PASS ON REPAIRED SCENARIOS / REVIEW REQUIRED FOR NEW STALE-REVISION AND STOP-AUTHORITY CASES / NOT INTEGRATED.**  
**Verification basis:** Worker-reported 78/78 focused tests and final `check:changed` (101 tests); the browser reviewer independently read the implementation and relevant file-backed tests, but **did not independently execute a test suite, CI, provider or UI**.

## Scope and positive evidence

The repair is additive within `RuntimeTaskExecutionService.ts`, plus a new file-backed security regression suite and handoff text. No changes to Project Runtime contract, migrations, upstream execution internals or MCP-budget snapshot were introduced by this repair. Existing experimental contract and its +646-byte budget growth remain from the previous experiment branch.

1. **F1 — earlier externally minted continuation-key bypass is repaired on its tested path.** The public `execute` route passes `continuation=null` to `runExecute`, which rejects keys parsed as `cont:v1:r:<attempt>` or `cont:v1:p:<attempt>`. The internal continuation dispatcher re-derives the current task policy and decision before constructing the attempt; a passing review, exhausted budget and cancelled source cannot be used to mint a repair via a forged key. [Source](https://github.com/jermur788/t3code/blob/fix/continuation-security-repair-20261103/apps/server/src/projectRuntime/RuntimeTaskExecutionService.ts).
2. **F2 — cancellation/policy-removal tests pass in documented windows.** Receipt insertion now checks source revision/status/mode in SQL, and pending launches revalidate policy before attempting `ThreadLaunchService.launch`. The new tests coordinate two service instances against the same file-backed SQLite database and cover cancellation or removal of the `continuation` policy before insertion, plus restart of a pending receipt after withdrawal. These tests do *not* establish full atomicity with the external launch.
3. **F3 — terminal failed-review/contradictory-evidence stop becomes durable.** `advanceContinuation` now persists one blocked source-task record for `blocked` as well as `ask_user` decisions. Tests show no duplicate blocker across restart. `reconcile_required` is kept ambiguous rather than mislabeled as a definitive failure.
4. **F5 and acceptance boundary preserved.** Reviewer evidence does not upgrade the project source task to `VERIFIED`; the independent reviewer and two-cycle cap remain synthetic policy checks. Reviewer identity means a separate owner/provider instance, not independently authenticated acceptance evidence.
5. **F4 — integration blocker preserved.** `mode: synthetic` is not a stub-provider-only runtime gate. If merged into a running fork, existing UI/RPC authorizations could activate real provider work. It must be removed from shipping builds or disabled-by-default before integration. The +646-byte MCP tool-list increase still needs a substantive product/context review.

**Do not call the branch REVIEW PASS or production-safe based on passing tests alone.** Two additional stale-state authorization scenarios remain evident in current source.

## Additional findings from independent inspection

### R1 — HIGH: pending continuation can survive an unrelated accepted-scope or review-task revision

**Source:** `authorizeReviewContinuation` calls `evaluateContinuation` with the *current* `cursorTask`; the evaluator rejects only `cursorTask.revision < cursorAttempt.receipt.packet.taskRevision + 1`, rather than requiring the expected exact post-handoff revision and preventing later operator edits. `advanceContinuation` enforces an exact equality on its initial scan, but `launchAttempt`'s pending-receipt replay does **not** use that scan guard. Pending review launch checks source's current policy/status and that a handoff matches the *old execution packet*, but not the unchanged authoritative accepted-scope revision. A review-target task's current revision is likewise not checked at replay against the stored packet.

**Concrete risk:** After a worker's terminal handoff and a durable review receipt, an operator changes source task scope/acceptance criteria, or the review task scope, without removing the continuation policy. On restart, a `pending` review can be reauthorized from the old worker handoff and launched using a stale packet (and possibly stale review instructions). The operator's accepted modification should not be bypassed by old continuation intent. This is **source-level risk, not a reproduced failure**.

**Required test:** Start file-backed source worker → terminal handoff → one review receipt. Force receipt to pending and remove stub thread as the current restart harness does; change (a) **source scope** after handoff and (b) **review task scope** after receipt in distinct scenarios, leaving policy/status enabled. Recreate service and run startup reconcile; assert **no new external launch**, durable explicit stop or reconciliation state, and no change to VERIFIED. Repeat for pending repair after independent review task acceptance criteria/revision changes.

**Required solution property:** Bind the original task/review policy and target task version to the durable launch authorization, not merely the existence of a policy with the same ID. Use current Project Runtime revision CAS and existing attempt packet fields, no second state owner. Decide how intentional operator-edited scope can explicitly authorize resuming (new task execution/intent) rather than silently inheriting an old pending receipt. Do not weaken the exact-revision checks to make tests pass.

### R2 — HIGH: terminal stop can overwrite a newer user decision

**Source:** `holdForUser` reads the current source task and returns only if it is `blocked` or `cancelled`. It then uses the *current* revision in `runtime.updateTask` to write `status: blocked`. Unlike dispatch, it does not verify the source's revision/policy from the decision that caused escalation.

**Concrete risk:** During continuation, an operator can change the source task to `done` (with required result) or `deferred`; a stale reviewer failure/unresolved-decision callback can later overwrite that newer operator decision to `blocked` even though the old continuation should be superseded. `updateTask`'s CAS is against the freshly read revision, so it will not detect this semantic staleness. Also, a revoked `continuation` policy alone is not checked before the status write. **Not yet reproduced under a deterministic race test.**

**Required test:** Add a controlled barrier after `advanceContinuation` has read the enabled source and before the terminal `holdForUser` write; with a second service instance update source to `done` / `deferred` or remove continuation. Assert the operator's newer status and policy survive, no blocked write occurs, no extra provider launch and no duplicate prompt. Re-run process/reconciliation to confirm persistence.

**Required solution property:** The stop writer must be authorized by the same current source revision/status/policy as the decision and must fail closed if the operator changed task state. Keep a durable operational reason for *current* failures, but do not invent a second source of truth or overwrite explicit newer decisions.

### R3 — LOW / defensive: reserved request-key prefix matching is narrower than the documentation

The public guard invokes `isContinuationRequestKey`, which uses `parseContinuationRequestKey` and matches **only well-formed** `cont:v1:[rp]:<nonempty>` keys, whereas comments say the entire `cont:v1:` namespace is reserved. A malformed `cont:v1:p:` can be accepted as an ordinary request key; the broad SQL `LIKE 'cont:v1:p:%'` in `repairCyclesFor` would still count such a row if used on a repair task, contaminating the budget even though no internal continuation occurred. Ordinary caller access still requires a valid authorized task; this is chiefly denial-of-service/budget integrity, not the original unauthorized repair bypass. Recommended small fix: reserve all keys that **start with** the namespace, and count only genuine host-issued continuation receipts, if feasible without new state.

**Test:** Invoke ordinary public `execute` on a ready repair task with malformed `cont:v1:p:` and verify it is rejected with no attempt/budget consumption. Existing ordinary nonreserved key must remain accepted.

## Known, explicitly unresolved security boundary

**TOCTOU between last authorization check and external `ThreadLaunchService.launch`.** The worker acknowledges this as an execution-service handoff window; the SQL receipt insertion and pre-launch check are not one atomic external operation. This cannot be labeled “fully fixed” for strict *no post-revocation launch* semantics. For a reversible stub experiment, document the limited guarantee and retain a stop/cancel/reconcile path. For production real-agent launch, require a precise revocation contract and an architecture/security decision or cooperative execution-engine guard if zero new launch after withdrawal is mandatory. Do not claim tests cover a gap they did not coordinate.

## Other checks and limits

- Multi-instance simulated concurrency was exercised with distinct service layers and a shared file-backed DB; sustained multi-process/host contention was not qualified.
- `runExecute`'s source CAS in the INSERT queries current source **revision**, status and synthetic mode, but not the entire policy JSON. The revision guard is meaningful **provided every authorized modification advances revision** through the Project Runtime service; raw DB writes are outside the supported trust boundary. However, pre-launch authorization must also enforce staleness as in R1.
- `reconcileActiveAttempts` retries without a new run only when a row is truly pending; cancelled/ambiguous are distinct. The security suite explicitly tests handling of prior launched threads.
- Handoffs remain worker-authored evidence with thread/actor/attempt matching, **not cryptographically attested tests**. F5 is deferred, and no VERIFIED state is automatically written.
- The source-level review did **not** perform an upstream rebase, real-provider test, UI inspection or end-to-end operator notification. The escalation is a `blocked` task record, not an actual user-visible notification action.

## Exact next repair/verification handoff — narrow, test-first

**OWNER:** One T3 Code/Codex-class local worker for authorization/race-sensitive repair, separate from upstream PR #28777 and from fork main. **USER APPROVAL:** Already authorized bounded synthetic correctness; no approval required to add narrowly scoped negative tests and repair the experiment. Product/architecture choice required for changing production revocation semantics or shipping feature flags.

**REPO/BASE:** `jermur788/t3code`, published `fix/continuation-security-repair-20261103` branch at reviewed head; inspect live head again before write. Confirm worktree, dirty state, other writers and file ownership. Create a **new isolated review-hardening worktree/branch** from this repair branch, or arrange exclusive one-writer ownership to continue the existing branch. Do not edit main, overwrite the earlier experiment/qualification worktrees, stash/reset/force-push or merge.

**GOAL:** Reproduce R1 and R2 with deterministic file-backed SQLite/stub-provider tests; preserve all earlier F1/F2/F3 fixes and the passed 78/101 tests. Add R3 malformed-key guard if it is truly a small safe change. Do not broaden into product UI, real model launches or another state store.

**ACCEPTANCE:** R1 scope/review edit stops pending automatic continuation/replay with no new external launches; R2 newer operator decisions and policy withdrawal survive delayed block processing; R3 invalid prefix cannot poison repair budget. Keep allowed same-revision crash replay working. Fail closed under ambiguous thread state; preserve safe idempotent command receipt and original budget/reviewer assertions. No VERIFIED transition from reviewer claims.

**TEST:** First record failing negatives on reviewed branch; then minimum implementation fix, and rerun full continuation files and `vp run check:changed` with recorded output and file-backed startup/restart evidence. Include independent two-service concurrency in at least one case. Document remaining external-launch TOCTOU and F4 as explicit integration blockers, not newly “fixed.”

**STOP CONDITIONS:** Any fix requiring changes to generic upstream V2 launch/effect core, a new authoritative queue/table or material security/product contract: stop for architectural decision. No paid models, no network outreach, no production enablement, no merge.

**RETURN:** Result by R1/R2/R3 and F1–F5; exact failing test outputs before repair and passing after; changes and links, DB/restart/concurrency verification, scope/authority rationale, residual security risk, current integration state; complete continuation handoff for next manager review. Preserve existing worktrees.

## Decision/status

**Current state:** `IMPLEMENTED`; bounded local `RUNTIME PASS` for reported tests; **independent REVIEW REQUIRED (R1/R2 + F4/integration)**; `NOT INTEGRATED`, `NOT PRODUCTION ENABLED`. No new upstream contribution from this fork experiment. Continued synthetic hardening is within existing scope. **The documented remaining TOCTOU is not silently accepted as a production security guarantee.**
