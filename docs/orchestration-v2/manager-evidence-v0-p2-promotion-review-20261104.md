# Manager promotion review — Evidence V0 P2 pruning repair

**Date:** 2026-11-04  
**Classification:** Overall Manager independent GitHub/source review, not a local test execution or merge.  
**Verdict:** **BOUNDED SOURCE REVIEW PASS / WORKER-REPORTED LOCAL TEST PASS / INDEPENDENT REVIEW RECORDED PASS — READY FOR SEPARATE PROMOTION DECISION WITH EXPLICIT V0 DECODER COMPATIBILITY LIMITATION**.  
**PR #21:** draft, open, unmerged, base and head unchanged at manager inspection. **NOT INTEGRATED / NOT PRODUCTION VERIFIED**.

## Evidence and exact scope

- Fork repo: `jermur788/t3code`.
- Existing PR #21 source branch: `integration/fork-upstream-reconciliation-trial-20261104`, head `70203ed5a95dbe1762da1ad2a46c4f153f910492`.
- Isolated repair branch: `fix/evidence-v0-pruning-completeness-p2-20261104`. Reviewed production/test checkpoint `a03a8bce92ea2de65a92a112bf9771388673094b`; final docs-only handoff checkpoint `0e0c7bc2cb1bb805f273123686303a68e1c2807c`.
- GitHub comparison: repair is a linear five-commit descendant, **zero commits behind** the PR source; **exactly three source/test files** and two task evidence documents changed. No fork-main or PR #21 source changes were present.
- [Worker final handoff](https://github.com/jermur788/t3code/blob/fix/evidence-v0-pruning-completeness-p2-20261104/docs/orchestration-v2/evidence-v0-p2-repair-handoff-20261104.md) and [append-only routing ledger](https://github.com/jermur788/t3code/blob/fix/evidence-v0-pruning-completeness-p2-20261104/docs/orchestration-v2/evidence-v0-p2-repair-routing-ledger-20261104.md) inspected. The manager did **not** access worker-host raw logs or rerun local tests; provider/capacity and command results below are evidenced by committed worker ledger and test source, not independent host execution.

## Independent source inspection

1. `OrchestrationEvidenceService.ts`: existing `EVENT_LOG_PRUNED_THROUGH` watermark is read from canonical projection metadata inside the existing read-only export path; referenced thread event reads remain bounded. A thread with an oldest retained event **strictly below** the watermark gains one `orchestration-v2-pruned` derived-view event with `status=incomplete`, `completeness=unknown`, `reason=pruned-history-boundary`, watermark and oldest-retained-sequence facts. Marker summary remains bounded; stable ID uses SHA-256 digest of full thread ID; identity remains in `recordId`, `threadId` and reference. There is no claim of exact loss or fabricated V2 events.
2. Existing `orchestration-v2-unresolved` and per-thread `orchestration-v2-truncation` markers are preserved. New marker is conservative because the watermark is global and cannot prove deletion of a particular thread's events.
3. `OrchestrationEvidenceService.test.ts`: real `ProjectionMaintenanceV2` and SQLite fixture writes six V2 events, advances actual prune boundary, verifies deletion/retention, observes exactly one referenced incomplete marker, and excludes a newer thread. File-backed SQLite test reopens the database and checks post-boundary second-project isolation. Long 4,096-character identifier scenario checks bounded marker ID/summary, JSONL schema decode, reconstruction event schema decode and stable repeated output. No existing tests were weakened in reviewed diff.
4. `packages/contracts/src/orchestrationEvidence.ts`: only a new closed-enum literal and an explicit decoder-upgrade warning were added. No migration, upstream V2 engine/pruning change, source-route change or synthetic continuation policy landed.
5. Server wiring: production `server.ts` already provides NodeCrypto platform services to its runtime dependency tree, and `ProjectRuntimeRpc.test.ts` builds the evidence layer with NodeCrypto. The newly required Digest service is also supplied explicitly in focused test layers. This supports wiring confidence **at source/typecheck level**, not a fresh live server startup claim.

## Reported local verification / review

- Red→green actual-pruning regression: missing marker reproduced then corrected; additional red→green guards for overlong summaries and overlong marker IDs.
- Focused Evidence V0 + Projection Maintenance: **39/39 PASS**; with context budget: **40/40 PASS**.
- Typecheck: **40/40 packages PASS** after final test-only change.
- `check:changed upstream/main`: **81 test files / 2,075 tests PASS**, format/lint/knip/GraphQL/typecheck/React compiler passed; broad run preceded last *test-only* schema-decode assertion, followed by focused 39-test and typecheck rerun.
- Agent context budget: **7,496 / 9,224 / 58,519 bytes**, unchanged. Web build PASS (reported).
- Four independent read-only Codex review rounds are recorded: `CHANGES REQUIRED` for summary bound, `CHANGES REQUIRED` for marker-ID bound, `PASS WITH FINDINGS` for reconstruction-schema assertion coverage, then **PASS** after correction. Separate reviewer provider/model from implementer.
- No hosted CI/checks, live-provider execution, rendered UI or production test of the repaired branch. Prior pre-repair PR #21 UI/restart qualification remains valid in its measured scope; it is **not** a fresh production qualification of the changed branch.
- Historical routing: DeepSeek V4.1 Flash both orchestrated and implemented this already-dispatched task, and Codex reviewed. The user's later **prospective** DeepSeek orchestration-only directive has been adopted into the [Coordination/Handoff Protocol](../../02_COORDINATION_HANDOFF_PROTOCOL.md) and the [standard handoff template](DEEPSEEK_ORCHESTRATOR_HANDOFF_TEMPLATE_V1.md) for future tasks; do not misrepresent the historical route as following that newer policy.

## Compatibility decision required for promotion

**Known limitation:** the `orchestration-evidence/v0` envelope retains its version string but its **closed record-type enum** gains `orchestration-v2-pruned`. Clients using the old base-commit decoder **reject exports containing that record**. This is **not universally backward-decodable**.

The repaired code and its tests are accepted for bounded source correctness **with that limitation explicitly recorded**. Under a fork-only coordinated application/decoder upgrade, promoting the repair as-is is a reasonable technical choice; it is **not** permission to claim compatibility with unchanged external consumers, nor a user-approved public compatibility contract. If independent old V0 decoders must continue to work, commission a separate versioning/negotiation design before promotion.

Other bounded risks: conservative false-positive incompleteness for threads older than the global watermark; reliance on upstream keeping creation events and stream heads; absence of hosted CI/live provider production evidence.

## Manager decision and next action

1. **Manager disposition:** `SOURCE REVIEW PASS / P2 REPAIR ACCEPTED FOR PROMOTION CONSIDERATION`. Correctness and regression scope are acceptable for a fork-only candidate. No new implementation task is needed unless backward-decoder compatibility is required.
2. **Authority boundary:** the local worker did **not** have permission to update PR #21; the Overall Manager likewise will **not** advance the PR head or merge without the user's separate authorization. The repair branch is preserved intact.
3. **Next product/coordination choice:** request **one explicit authorization to advance PR #21's draft source branch to the reviewed repair branch** with the documented old-decoder upgrade requirement. This is **not merge approval**. On approval, re-fetch exact heads/ownership, perform a guarded non-rewriting fast-forward from source to accepted repair checkpoint, confirm no drift/unrelated changes and update PR status/ledger. If the user does not accept the decoder compatibility limitation, defer promotion and prepare a separate versioned-contract design for decision.
4. **Later, separate gate:** only after PR #21 contains accepted repair and current checks/provenance are reconciled should the manager request user approval for a fork-only merge. Production release gates D2/D4 remain separate and unmet.

**No main update, PR #21 source update, merge, release, or production continuation activation was performed by this review.**
