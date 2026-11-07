# Independent source re-review — continuation authorization hardening

Date: 2026-11-04 (Europe/Dublin)
Reviewer: Overall Manager / ChatGPT GPT-6, connected GitHub source inspection, independent from the local worker.

## VERDICT

**REVIEW PASS (bounded source/security review for R1, R2, R3)** on the published [authorization-hardening branch](https://github.com/jermur788/t3code/tree/fix/continuation-authorization-hardening-20261103). **Local RUNTIME PASS is worker reported**, with test-first failures and success evidence in the user handoff; the browser reviewer did **not** run tests/CI. **NOT INTEGRATED, NOT PRODUCTION ENABLED.** Broader deployment is still BLOCKED by the explicit F4 experimental-feature gate, budget-review decision, the external launch-time revocation race and real-provider/UI qualification. This is a narrow review pass, **not** a release approval or claim that all execution races are resolved.

### Base and inspection

- GitHub branch head was confirmed to match the worker report; parent is the prior security-repair branch and fork main remains separate.
- Commit inspection found four changed files: `RuntimeTaskExecutionService.ts`, `RuntimeTaskContinuationPolicy.ts`, `RuntimeTaskContinuationSecurity.test.ts` and the handoff document. No additional new table, migration, contract or context-budget snapshot change.
- Reviewed the full relevant production diff, continuation authorization/replay and stop-writer functions, test names and the file-backed test scenarios including source/review/repair scope edits, two-service stop-write race, malformed keys, restart and opposite control cases.
- Previous research review: [original security findings](independent-continuation-security-review-20261103.md) and [first repair review with R1/R2/R3](independent-continuation-security-repair-review-20261103.md).
- Local reports: prior 78 focused tests on repair branch; **after hardening 39/39 focused three-file tests, 179 projectRuntime tests, clean typecheck and `check:changed` including 111 tests**. Not independently executed; no original raw logs mounted.

## Findings and evidence

### R1 — stale source, reviewer, repair task revisions: SOURCE REVIEW PASS

`authorizeReviewContinuation` now requires the source task to have the exact root packet revision + 1, and the reviewed cursor task to have its exact own post-handoff revision. `authorizeContinuationDispatch` also requires exact reviewed cursor and review lane post-handoff revisions. `launchAttempt` additionally checks the continuation target task's *current revision* against the persisted launch packet before an external launch. These checks preserve the pure evaluator's historical `>=` rule for rewalking older shared-lane links without allowing that loose check to authorize a new launch.

The file-backed restart tests cover source scope edit, reviewer scope edit, reviewer acceptance edit before repair, repair target scope edit, and source scope edit before repair. In all five reported scenarios, an altered source or lane invalidates the old pending receipt without a second launch. Normal unchanged pending-receipt replay remains covered in the prior suite.

Limit: execution still has the acknowledged last-authorization-check-to-external-launch race. The source-review result does not prove a zero-launch guarantee under concurrent revocation.

### R2 — newer operator decisions vs delayed blocked escalation: SOURCE REVIEW PASS

`holdForUser` accepts the decision's source-task revision and checks it against the current source revision and presence of synthetic continuation policy. It writes with `expectedRevision` from the original decision, and treats a CAS conflict as a superseded decision rather than retrying. Existing cancelled/blocked safeguards remain.

File-backed tests use two independent service instances and a controlled read barrier to race a newer operator `done`, `deferred`, or continuation-withdrawn decision against the delayed stop. They confirm no overwrite, durable revision preservation and no duplicate launch after restart. This addresses prior R2 for the tested interleaving.

Limit: no sustained multi-host contention qualification.

### R3 — reserved continuation request-key namespace: SOURCE REVIEW PASS

Public `execute` now checks `key.startsWith("cont:v1:")`; even malformed keys cannot be used as ordinary receipt keys. The internal dispatcher still requires parseable, rederived authorization. Tests reject malformed variants and preserve a normal caller-provided request key on the same repair lane.

Limit: this prevents **new** forged/malformed requests. Historical malformed rows, if present in a migrated/experimental database, are not retroactively removed. Existing budget SQL counts rows by prefix; legacy rows can conservatively consume budget. This is fail-closed for unauthorized work, but comment language saying all counted rows are host-issued only holds for new post-fix writes. No migration/scrubbing was attempted; full production data migration is out of scope.

### F1–F3, F5: prior regressions preserved within the observed test evidence

The previous public-key authorization bypass, source cancellation/policy removal, durable blocked decision and reviewer-evidence-not-VERIFIED invariants remain implemented. No second queue/state owner or new provider engine was introduced. The local worker reports all existing tests passing.

## Explicit non-acceptance / unresolved gates

1. **F4 — hard integration blocker.** The schema's `mode: "synthetic"` is an operator-selectable *label*, not an enforced stub-only environment/disabled-by-default feature gate. A merged normal server could route real model launches. Do not merge to main until a disabled-by-default gate or removal from shipping builds is designed and tested. The previous experimental `+646`-byte MCP tool-list budget increase remains a separate review gate. No contract/budget change was added by hardening.
2. **External-launch TOCTOU remains.** The final recheck and external `ThreadLaunchService.launch` are not atomic with revocation, so a concurrent withdrawal in that narrow window could still start one turn. Reconciliation/cancellation handles ambiguous or already-created work after the fact; they cannot guarantee *no* post-revocation start. This risk must receive an explicit revocation-contract/architecture decision for real providers.
3. **No real-provider/model or UI qualification.** Provider native session/prompt behavior, operator `ask_user` notification, and rendered user experience remain unverified. Durable `blocked` records are not notifications.
4. **No upstream rebase qualification.** The branch is based on fork main, not current upstream. Existing upstream Orchestration V2 should be inspected again before integration.
5. **No fresh independent executable run.** A second local runner should repeat focused tests, `projectRuntime` suite, typecheck and `check:changed` on the exact published branch, preserving the user worker's worktrees.

## NEXT — bounded independent runtime qualification handoff

**Role:** Independent read-only local verification worker; no code writer needed unless a verified defect appears. **Location:** fresh isolated worktree, newly checked out at latest published `fix/continuation-authorization-hardening-20261103` head. Do not reuse the implementing worker's mutable worktree as evidence of independent rerun. **Preflight:** inspect repo, branch, status, ownership, dirty files and fetch remote; do not stash/reset/discard/force-push. No real providers/model calls.

**Run:**

```bash
vp test run apps/server/src/projectRuntime/RuntimeTaskContinuationPolicy.test.ts apps/server/src/projectRuntime/RuntimeTaskContinuationRestart.test.ts apps/server/src/projectRuntime/RuntimeTaskContinuationSecurity.test.ts
vp test run apps/server/src/projectRuntime
vp run typecheck
vp run check:changed
```

**Verify:** all commands exit 0 and no unexpected changes; source/review/repair post-handoff version binding; worker `done`/`deferred`/policy withdrawal cannot be overwritten by delayed stop; malformed `cont:v1:` keys rejected; successful original receipt replay still works; no `VERIFIED` elevation, no third repair. If failures, classify as fixture vs implementation defect; stop before substantial modifications, return exact failing output. Confirm test result counts against the published artifact, without inventing source statistics.

**Return fields:** VERDICT / BASE and status / exact commands and evidence / defects / REVIEW / INTEGRATION / NEXT. Keep `NOT INTEGRATED`, no PR/merge/production activation or cleanup.

### Product/architecture decision boundary — separate from this bounded re-run

Before production integration, Overall Manager must ask the user to choose revocation semantics: (a) narrow best-effort last-check with already-receipted launch reconciled/cancelled, or (b) strict no-new-launch-after-revocation, which may require cooperation with upstream launch engine and careful atomicity design. No choice has been adopted. A shipping gate and agent-context budget approval are independently required. Do not infer permission for either from this review or clean tests.

## Governance/status summary

- **IMPLEMENTED** on isolated branch.
- **RUNTIME PASS (local worker evidence)**: yes for the reported suites.
- **REVIEW PASS (independent source scope R1–R3)**: yes, limited to the inspected code and scenarios.
- **INTEGRATED / VERIFIED for production**: no.
- **Release blockers:** F4 shipping gate; unresolved final-check/launch revocation semantics; context budget, upstream compatibility, real-provider/UI qualification.
- **Coordination:** upstream PR #28777 continuation-comment task is distinct, already publicly submitted, and does not prove this experimental policy safe for production.
