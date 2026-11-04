# Evidence V0 P2 repair — final handoff

**Task:** [Evidence V0 pruning-completeness P2 repair](task-evidence-v0-pruning-completeness-p2-20261104.md)  
**Repository:** `jermur788/t3code`  
**Repair branch:** `fix/evidence-v0-pruning-completeness-p2-20261104`  
**Reviewed code head:** `a03a8bce92ea2de65a92a112bf9771388673094b`  
**Repair worktree:** `/media/jer/Files/Worktrees/t3-evidence-v0-p2-repair-20261104`  
**Routing ledger:** [evidence-v0-p2-repair-routing-ledger-20261104.md](evidence-v0-p2-repair-routing-ledger-20261104.md)

## VERDICT

**P2 REPAIR — LOCAL TEST PASS / INDEPENDENT REVIEW PASS / READY FOR MANAGER PROMOTION REVIEW. PR #21 NOT INTEGRATED.**

The bounded repair is complete on the isolated repair branch. It is **not** merged, not promoted to PR #21, and not production verified. Hosted CI does not exist for this fork branch; no hosted PASS is claimed. The final independent review (Codex `gpt-6.1-sol`, read-only) returned **PASS** with no findings after three repair rounds.

## BASE / CHECKPOINT

| Item               | Value                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------ |
| Starting base      | `70203ed5a95dbe1762da1ad2a46c4f153f910492` = unchanged PR #21 candidate head               |
| Repair branch      | `fix/evidence-v0-pruning-completeness-p2-20261104`                                         |
| Reviewed code head | `a03a8bce92ea2de65a92a112bf9771388673094b`                                                 |
| Worktree           | `/media/jer/Files/Worktrees/t3-evidence-v0-p2-repair-20261104`                             |
| Worktree state     | Clean; branch tracks `origin` at the same commit before this handoff document              |
| PR #21             | OPEN / DRAFT / UNMERGED / mergeable; head still `70203ed5a95dbe1762da1ad2a46c4f153f910492` |
| Fork `main`        | `d3bedef12a31f368e5c5a6b279445bea39a6a13a`, unchanged                                      |
| Ownership          | DeepSeek was the only writer; reviewers were read-only                                     |

Existing worktrees, unrelated uncommitted work, PR #21, fork `main`, and production configuration were not modified. No stash, reset, rebase, force-push, or history rewrite was performed.

## RESULT

Changed files at the reviewed code head:

- `apps/server/src/projectRuntime/OrchestrationEvidenceService.ts`
- `apps/server/src/projectRuntime/OrchestrationEvidenceService.test.ts`
- `packages/contracts/src/orchestrationEvidence.ts`
- `docs/orchestration-v2/evidence-v0-p2-repair-routing-ledger-20261104.md`

Behavior:

1. Evidence V0 reads the existing persisted pruning boundary (`EVENT_LOG_PRUNED_THROUGH`) inside the export transaction.
2. For each referenced thread with retained V2 events, it emits one deterministic `orchestration-v2-pruned` evidence event when the oldest retained sequence is strictly below the boundary. The marker has:
   - `authority: "orchestration-v2"`, `recordBasis: "derived-view"`, `lifecycleClass: "observation"`;
   - `status: "incomplete"`, `completeness: "unknown"`, `reason: "pruned-history-boundary"`;
   - `prunedThroughSequence` and `oldestRetainedSequence` facts;
   - full thread identity in `recordId`, `threadId`, and the thread reference;
   - a bounded, deterministic SHA-256-derived `eventId` (~93 characters), so the maximum 4,096-character Evidence ID cannot overflow the schema.
3. Existing semantics remain distinct and unchanged:
   - wholly absent references still produce `orchestration-v2-unresolved`;
   - the 1,000-event per-thread read bound still produces `orchestration-v2-truncation`;
   - pruning loss produces the new `orchestration-v2-pruned` marker.
4. Threads created after the boundary keep their oldest retained event above it and are not marked. A thread created exactly at the boundary has no earlier history and is not marked.
5. No V2 events are fabricated, no exact deleted count is claimed, no second event store or migration is added, and no upstream pruning/execution internals are changed.

Exclusions: no synthetic continuation work, no D2/D4 release change, no provider-start change, no PR creation/merge, no production configuration change, no UI change.

## VERIFICATION

### Red-before / green-after

**Core defect (red).** `vp test run apps/server/src/projectRuntime/OrchestrationEvidenceService.test.ts -t "marks referenced history as incomplete when pruning may have removed events"` → exit `1`: `only the referenced pruned thread is marked: expected +0 to equal 1`. The same fixture had already proved the real maintenance pass deleted events, published the boundary, retained `thread.created`, and kept only the stream-head node.

**Core repair (green).** Same command → exit `0`, `1 passed | 33 skipped`.

**Review finding 1 (summary bound, red).** The long-ID regression with the old summary → exit `1`: `expected 528 to be at most 512`. Fixed by removing the thread ID from the summary; identity remains in structured fields. Green afterward.

**Review finding 2 (marker ID bound, red).** The maximum-ID regression with the old event ID produced a 4,125-character `eventId` (`oev0:orchestration-v2-pruned:thread:xxx…`) instead of the ~93-character digest. Fixed by hashing the canonical full thread ID through Effect `Digest` (SHA-256). Green afterward.

**Review finding 3 (test coverage, low).** Reconstruction checked marker presence without schema-decoding. Fixed by decoding every reconstructed event through the existing `OrchestrationEvidenceEvent` JSON decoder before asserting marker presence.

### Pruning evidence

The regression is not a mocked watermark. It uses the real `EventSinkV2`, `ProjectionStoreV2`, `ProjectionMaintenanceV2`, `EventStoreV2`, and Evidence service over one SQLite database:

- fixture writes 6 V2 events (`thread.created`, `run.created`, four `node.updated`);
- first maintenance pass only marks the head;
- `TestClock` advances one day;
- second maintenance pass publishes `EVENT_LOG_PRUNED_THROUGH` and deletes eligible events;
- 2 events remain (`thread.created` plus the newest node); the maintenance pass deleted the other 4 (independently observed by the reviewer);
- the export emits exactly one marker for the referenced pruned thread and none for a post-boundary thread or a post-boundary project.

### Commands and results

| Command                                                                                                              | Exit | Result                                                                                                                                |
| -------------------------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `vp test run ...OrchestrationEvidenceService.test.ts ...ProjectionMaintenance.test.ts`                               | 0    | 2 files, 39/39 tests passed                                                                                                           |
| `vp test run ...OrchestrationEvidenceService.test.ts ...ProjectionMaintenance.test.ts ...AgentContextBudget.test.ts` | 0    | 3 files, 40/40 tests passed                                                                                                           |
| `vp run typecheck` at `a03a8bce`                                                                                     | 0    | 40/40 packages successful                                                                                                             |
| `vp run check:changed upstream/main` at `17fdc198`                                                                   | 0    | format, lint, knip 1/2, knip 2/2, GraphQL, typecheck 40 packages, **81 test files / 2,075 tests**, React compiler 40 files all passed |
| `vp test run apps/server/src/provider/AgentContextBudget.test.ts`                                                    | 0    | 1/1 passed; snapshot unchanged at **7,496 / 9,224 / 58,519 bytes**                                                                    |
| `vp run --filter @t3tools/web build`                                                                                 | 0    | `✓ built in 38.84s`                                                                                                                   |

The full `check:changed` ran at `17fdc198`. The only later code change was the test-only decoder assertion at `a03a8bce`; the affected 39-test suite and an explicit `vp run typecheck` (40/40) were rerun afterward. No production behavior changed after the broad run.

### Not run / limitations

- Hosted CI: **NOT RUN / DOES NOT EXIST** for this fork branch; 0 hosted checks are claimed.
- Live provider turns, browser/UI qualification, and production deployment: **NOT RUN**.
- The SQLite race analysis was code-inspected and supported by the existing snapshot-isolation test, not independently stress-tested.
- Token usage, quota, and cost: **UNKNOWN**; the harness did not expose them.

## ROUTING

| Role                             | Provider / model                                                     | Reasoning | Notes                                                                       |
| -------------------------------- | -------------------------------------------------------------------- | --------- | --------------------------------------------------------------------------- |
| Orchestrator + implementer       | DeepSeek V4.1 Flash via OpenCode (`opencode-go/deepseek-v4.1-flash`) | default   | Sole writer; task decomposition, implementation, tests, ledger, supervision |
| Independent reviewer, rounds 1–3 | Codex `gpt-6.1-sol`                                                  | high      | Read-only; different provider/model from implementer                        |
| Independent reviewer, round 4    | Codex `gpt-6.1-sol`                                                  | medium    | Narrow test-only closure; cost-appropriate                                  |

**Alternatives considered:** Claude Sonnet 5.5 at medium was the alternative reviewer; Codex at high was preferred for the subtle completeness invariant and pruning race. Claude Opus 5.5 was reserved for a materially hard unresolved architecture/concurrency issue; no such issue remained, so it was not invoked. Cursor, Grok, Antigravity, fx, muse, and pi were disabled.

**Capacity:** `UNKNOWN` except that the selected providers were selectable. No quota, balance, reset time, token count, or cost is claimed.

**Attempts:** one implementation approach for the core repair, followed by three evidence-backed corrections from independent review (summary bound, marker-ID bound, reconstruction decode coverage). No identical failed approach was repeated. No escalation beyond Codex was justified.

**Observed resources:** dependency install 1m9s; focused suites 13–68s; `check:changed` about 5–6 minutes; web build 38.84s. These are wall-clock observations, not provider usage metrics.

## REVIEW

Reviewer: **Codex `gpt-6.1-sol`**, read-only, distinct from the DeepSeek implementer.

| Round | Verdict              | Findings                                                                                                                                   | Resolution                                                                                                 |
| ----- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| 1     | `CHANGES REQUIRED`   | Summary could exceed 512 characters for long thread IDs; additive closed-enum compatibility concern                                        | Bounded summary; compatibility limitation documented, additive literal retained under the task's allowance |
| 2     | `CHANGES REQUIRED`   | Marker `eventId` could exceed 4,096 characters for maximum thread IDs; summary finding confirmed fixed; compatibility disposition accepted | Deterministic SHA-256 marker ID; maximum-ID regression added                                               |
| 3     | `PASS WITH FINDINGS` | Low: reconstruction presence checked without schema decode                                                                                 | Decode every reconstructed event through the Evidence schema                                               |
| 4     | `PASS`               | None                                                                                                                                       | Accepted for manager promotion review                                                                      |

The reviewer independently confirmed the strict `<` boundary invariant, publish-before-delete transaction behavior (no false-complete snapshot), unresolved/truncation separation, post-boundary and cross-project isolation, deterministic ordering, no test weakening, and no upstream engine edits.

**Compatibility limitation the manager must carry forward:** the unchanged `orchestration-evidence/v0` envelope gains a new closed-enum literal. Decoders built from the base commit reject exports containing `orchestration-v2-pruned` and require an upgrade. Do **not** claim universal backward decodability, compatibility with unchanged base decoders, or that retaining the V0 version string guarantees compatibility.

## FAILURES / RISKS

- **Compatibility (material, accepted):** old V0 decoders cannot decode the new record type. No version negotiation or schema-version bump was added; this is a coordinated-upgrade constraint, not silently breaking within the reviewed repair branch.
- **Conservative false positives:** a thread whose oldest retained event is below the global boundary can be marked `incomplete` even if this particular pass deleted nothing. This is intentional: the global watermark cannot prove per-thread loss, so the export says `UNKNOWN` rather than claiming completeness.
- **Detection assumption:** pruning retains `thread.created` and each stream's newest row. If upstream changes those retention rules, the boundary test must be revisited.
- **No exact loss accounting:** the marker reports the boundary and oldest retained sequence, never a deleted count.
- **No hosted CI, live provider, browser, or production evidence:** the verdict is local static/runtime evidence only.
- **No UI or adapter impact** was introduced or qualified; none was required by this server/contract-only change.

## INTEGRATION STATE

- Repair exists **only** on `fix/evidence-v0-pruning-completeness-p2-20261104`.
- PR #21 was **not** updated, merged, or force-pushed; its head remains `70203ed5a95dbe1762da1ad2a46c4f153f910492`.
- Fork `main` was **not** modified.
- No new PR was opened.
- The repair branch is a linear fast-forward from the PR #21 candidate head, so promotion is mechanically simple, but promotion is a separate manager decision.
- The final handoff document is a documentation-only commit after the reviewed code head `a03a8bce`; the reviewed source/tests are unchanged from that commit.

## NEXT

1. Overall Manager performs promotion review of this handoff, the ledger, the code diff, and the focused evidence.
2. If accepted, run a **separate authorized promotion step** to update PR #21 with this repair (or otherwise integrate it). Do not merge PR #21 as part of this task.
3. The user retains the separate merge decision. No automatic merge, release, production enablement, or continuation change is authorized by this handoff.

**Stop condition:** do not merge PR #21, update fork `main`, or claim production verification without explicit authority.
