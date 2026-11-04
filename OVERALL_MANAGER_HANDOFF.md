# Overall Manager — Authoritative Continuation Handoff

**Updated:** 2026-11-04 after 09:26Z independent local V1–V5 verification handoff and manager reconciliation.  
**Classification:** MANAGER HANDOFF / CURRENT CONTINUATION ENTRYPOINT.  
**Status:** Documentation published on the shared fork's **planning branch**, not fork main. No code merge, provider execution or production configuration change is effected by this file.

## Mandatory read order for a new Overall Manager

1. **Project Instructions** in the active ChatGPT T3 Fork Project. User is the final product decision maker; assistant is Overall Manager.
2. [**01_CURRENT_STATE.md**](01_CURRENT_STATE.md) — canonical current base, decisions, project milestone, active task, blockers.
3. [**02_COORDINATION_HANDOFF_PROTOCOL.md**](02_COORDINATION_HANDOFF_PROTOCOL.md) — stable lifecycle, handoff, safety, verification and transition rules.
4. [Accepted staged continuation safety spec](docs/orchestration-v2/continuation-staged-safety-governing-spec-20261104.md).
5. [Current bounded Evidence V0 pruning repair task](docs/orchestration-v2/task-evidence-v0-pruning-completeness-p2-20261104.md), then [completed V1–V5 qualification packet](docs/orchestration-v2/task-verify-reconciled-v017-before-main-20261104.md) and [PR #21 source/conflict ledger](https://github.com/jermur788/t3code/blob/integration/fork-upstream-reconciliation-trial-20261104/docs/orchestration-v2/fork-upstream-reconciliation-routing-ledger-20261104.md).
6. Inspect current GitHub PRs and repo heads / any live T3 Runtime tasks and handoffs. Latest reported Git history is *not* enough to establish current clean state.

Historical chats are supporting evidence; do not treat them as authoritative if a newer canonical document or repo contradicts them.

## Situation in one paragraph

Fork-only [draft PR #21](https://github.com/jermur788/t3code/pull/21) remains open/mergeable/unmerged at the accepted upstream reconciliation checkpoint; fork main is unchanged. Independent local pre-merge verification handoff on 2026-11-04 09:26Z reports **V1 rendered UI PASS, V2 file-backed restart/two-project isolation PASS, V3 Evidence V0 PASS WITH P2 FINDING, V4 checks PASS**, with a read-only Codex **CLEAN WITH FINDINGS** review. The P2 reproduction found that **partially pruned V2 event history can be exported without a completeness warning**; manager source inspection supports the mechanism. **Manager quality decision: bounded P2 repair and independent re-review before recommending a fork-main merge**, not an automatic merge or acceptance of the limitation. The user may explicitly choose to accept the limitation and decide otherwise. The reconciled upstream parent is **25 commits beyond the v0.1.7 tag**, not exactly the tag, and one commit behind then-current upstream main. The separate default-off continuation experiment remains excluded; D2/D4 release requirements remain unresolved.
## BASE / CHECKPOINT

- Repository `jermur788/t3code`. Fork `main`: `d3bedef12a31f368e5c5a6b279445bea39a6a13a`, unchanged at manager check.
- PR #21 accepted trial `integration/fork-upstream-reconciliation-trial-20261104` at `70203ed5a95dbe1762da1ad2a46c4f153f910492`: OPEN / DRAFT / MERGEABLE / UNMERGED; 330 ahead / 0 behind fork main.
- Upstream actual reconciliation parent `bb4afa5425c52104a9261fa2d022cb8ba2fcc099`, **25 commits after v0.1.7 tag `322f6544`**. Upstream main at latest manager read: `8b44f42b14c8e273156474a924ccf29680dd7857`.
- Original local verification worktree (worker-reported): `/media/jer/Files/Worktrees/t3-verify-reconciled-v017-20261104`, detached and clean, unrelated worktrees preserved; not accessible to browser manager.
- Planning docs and task packet on `planning/resource-efficient-continuation-20261103`, not fork main. PR #20 open/draft/unmerged.
- Default-off gate experiment remains on `experiment/continuation-default-off-gate-20261104`, absent from PR #21 and fork main.
- **No local T3 worker auto-started** by the GitHub docs/PR update. Recheck live Runtime, branch/worktree owner, disk and provider availability on next dispatch.
## VERDICT / RESULT / VERIFICATION

**Current manager verdict: `REPAIR REQUIRED / REVIEW REQUIRED`; `NOT INTEGRATED`, `NOT PRODUCTION VERIFIED`.** Previous seven-conflict reconciliation remains `IMPLEMENTED / local STATIC PASS / bounded REVIEW PASS`. New pre-merge V1–V4 results are **worker-reported**; browser manager read live GitHub and source but did not run the local suites or retrieve screenshot/fixture bytes.

- **V1 — worker-reported UI PASS:** headless Chromium rendered fork home, mode chooser, Development/Workspace, copied-thread redirect, upstream thread, navigation, console; transient pairing WebSocket auth error; corrected UI locator, not app defect.
- **V2 — worker-reported runtime PASS:** file-backed SQLite two-project reopen/isolated task/routing/handoff/source/instructions; 27 existing Project Runtime + maintenance checks; one focused pending-effect/receipt-recovery test with 44 skipped.
- **V3 — worker-reported PASS WITH P2:** before 3 events, after pruning 2, removed 1; truly missing history correctly marked unresolved, but partial pruning has no incompleteness marker. Source confirms Evidence V0 checks per-thread read-bound but does not consult `prunedThroughSequence`. Classify `IMPLEMENTATION DEFECT / UPSTREAM COMPATIBILITY`, evidence-integrity P2. **Do not call V3 fully verified.**
- **V4 — worker-reported STATIC/RUNTIME PASS:** 40 packages typecheck, 81 changed test files/2,072 passing tests, web build 7,430 modules, unchanged agent-context snapshot `7496 / 9224 / 58519` bytes.
- **V5 — worker-reported independent Codex `gpt-6.1-sol` high, read-only: CLEAN WITH FINDINGS.** It confirmed P2 and the actual merge-parent vs exact-tag provenance issue; conflict resolution review remains sound in stated scope.
- **GitHub verification independently repeated:** PR open/draft/unmerged/mergeable; fork main unchanged; 0 check-runs/status contexts; current upstream baseline one commit ahead of incorporated release-prep parent.
- **Local evidence still on worker host (not copied to repo by browser manager):** `/tmp/opencode/v017-verification-ledger-20261104.md`, `/tmp/opencode/evidence/`, `/tmp/opencode/evidence/test-packet/`. Require sanitized preservation before stronger evidence claims.
- **Browser source preflight:** [PR discussion](https://github.com/jermur788/t3code/pull/21#issuecomment-6626843132). Independent local handoff supplied to manager at 09:26Z; no paid app-under-test provider calls or CI success claimed.
## NEXT — exact already-authorized action

Run [**Evidence V0 pruning-completeness P2 bounded repair**](docs/orchestration-v2/task-evidence-v0-pruning-completeness-p2-20261104.md) under a single local writer on a **fresh isolated external-volume worktree** from the prepared remote branch [`fix/evidence-v0-pruning-completeness-p2-20261104`](https://github.com/jermur788/t3code/tree/fix/evidence-v0-pruning-completeness-p2-20261104), derived from the unchanged PR #21 head. The repair branch has **no source changes** at this handoff. DeepSeek/OpenCode is the first-choice routine implementer when actually available; capacity and model-cost details are currently UNKNOWN. No worker has been launched by this written handoff.

1. Reproduce red-before tests using **actual** upstream V2 pruning watermark and deleted event rows; prove incomplete markers for referenced partially pruned history, honest unresolved events for fully absent references, and no false marker for newly created unaffected threads.
2. Prefer an additive read-only evidence marker without second event store, migration or upstream V2 execution change. If material schema/architecture tradeoffs appear, stop that affected lane for manager/user decision, not an unreviewed semantics change.
3. Rerun focused Evidence V0 + pruning + restart/isolation fixtures, typecheck, affected/changed checks and agent-context budget; preserve exact commands/exits and sanitized screenshots/logs. Never weaken existing tests.
4. Obtain truly independent read-only Codex/Claude-class review and return a full structured handoff. Manager will inspect the precise repair candidate and decide whether PR #21 can be updated through a separate authorized promotion step.
5. **Only after acceptance** update Current State/PR/Runtime and request the user's **separate merge decision**. The user can alternatively accept the P2 risk explicitly; absence of a reply does not authorize merging.

**No main merge, new PR, production continuation, provider-native paid run, upstream public contribution, destructive Git operation or engine redesign.**
## USER-ACCEPTED DECISIONS (do not re-ask)

- User approved the fork-only **draft PR** creation — complete.
- User approved default-off server gate now for isolated continuation experimentation — implemented on separate branch.
- User approved excluding experimental agent-facing continuation surface before any public shipping release — **release requirement not yet implemented**.
- User approved best-effort last-check + reconciliation only for isolated stub-only experiments — known TOCTOU risk explicitly accepted *there*.
- User requires strict no-new-continuation-run after durable revocation **before production** — requirement adopted, exact linearization/in-flight semantics still under architecture review, no authority-table or upstream-engine modification approved.

**User has not approved:** merging fork main or PR #21, enabling production continuation, shipping, public upstream PR changes, new authority database, irreversible worktree operations or material paid model usage.

## Open risks and milestone context

- **Primary P2:** Evidence V0 can silently omit some previously pruned V2 history while retaining enough records for references to appear resolved. Exact impact beyond tested fixture and actual loss rates are UNKNOWN; never claim complete evidence from that case.
- Baseline provenance: upstream merge parent was 25 commits beyond tag `v0.1.7`; fork was not synchronized to newest upstream main.
- Hosted CI was absent; local passing results are bounded. Provider streaming/real worker execution, enabled synthetic continuation, native/remote/tunnel clients, and end-to-end production deployment remain unverified.
- Large vendored `.repos/` diff limits human review; PR commits count reflects merge ancestry, not a hand-inspected patch per file.
- D1 experimental gate separately implemented/reviewed on unmerged branch; D2 shipping exclusion and D4 strict revocation remain separate unmet release gates. No model or provider owns canonical project truth.
- Documentation V1 fresh-user golden-path qualification remains unproven and should not be upgraded silently.
- T3 Runtime tools/local worker bridge are not available in the browser manager environment; future local worker dispatch needs real T3 host action and a durable handoff. Provider capacity/cost remains UNKNOWN until observed.

## STOP / TRANSITION

Do not merge any main branch or rewrite shared history without explicit authority. Do not unilaterally accept material architecture/security tradeoffs. Before changing managers/chats again, update **01_CURRENT_STATE.md** and this concise handoff, reconcile all active task/ledger states with repo truth, preserve base/worktree evidence and mark outdated notes historical.

**No further user decision is required to run V1–V5.** Merge approval is a later decision after verification. This handoff is informational and durable; no worker has been dispatched by writing it.
