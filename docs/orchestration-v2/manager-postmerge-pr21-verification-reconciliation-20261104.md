# Manager reconciliation — PR #21 post-merge local qualification

**As of:** 2026-11-04 19:28 UTC (worker handoff received).  
**Authority:** Overall Manager review of user-supplied worker handoff + independent GitHub branch/PR inspection.  
**Verdict:** `INTEGRATED / POST-MERGE LOCAL RUNTIME PASS (worker-reported) / INDEPENDENT REVIEW PASS WITH FINDINGS (worker-recorded)`; **NOT PRODUCTION VERIFIED**.

## Distinguish independent observations from worker claims

**Independently verified through GitHub by browser manager**
- [PR #21](https://github.com/jermur788/t3code/pull/21) is **CLOSED/MERGED**, source head `0e0c7bc2cb1bb805f273123686303a68e1c2807c`, and fork `main` remains at normal two-parent merge `fb67545d790c5c001e8f85827f219ab6493c435e`.
- The two parents were independently confirmed during prior post-merge source review: former fork main `d3bedef12a31f368e5c5a6b279445bea39a6a13a` and reviewed PR head `0e0c7bc2cb1bb805f273123686303a68e1c2807c`.
- Remote branch `verify/postmerge-pr21-20261104` **was not found** via GitHub Branch API, and the reported `docs/orchestration-v2/postmerge-pr21-verification-ledger-20261104.md` could not be fetched from that branch at review time. This is consistent with worker's report of **no commit/push**: the ledger and binary evidence are **host-local only**. This is a **provenance/continuity limitation**, not proof the local results are false.
- No GitHub-hosted check result was established. Previous GitHub inspection found zero hosted check-runs. Manager did not have direct access to the worktree or the 8.2-MB evidence directory.

**Detailed worker-reported post-merge execution (not independently replayed by browser manager)**
- Exact merged `main` checked out in a clean independent external-volume verification worktree. Local `main` preserved; no pushes/commits/merges/reset/main writes.
- Fresh uncached `vp run typecheck`: **40/40 packages**, exit 0 (294.6 s). Evidence service: **36 tests**, exit 0. Eight Project Runtime/Task suites: **103 tests**, exit 0. After correcting untracked artifact/ledger hygiene, `vp run check:changed upstream/main` returned **exit 0**: 221 changed files; format/lint/knip/GraphQL, typecheck, 81 test files/**2,075 tests** and 40 React compiler checks passed. First two attempts exited 1 on artifacts, not product files, according to worker report. Web build exit 0 (52.54 s), chunk-size warning only.
- Real local browser with stub/no-cost providers showed **Runtime-enabled Fork Project Home** and all five development cards, mode dropdown with Workspace/Development and Workspace selection hiding development cards, upstream draft thread composer, and browser-back preserving home. Reported steady-state no browser errors, failed requests, unhandled rejections or non-OK fetches; benign router/pre-pairing warnings noted.
- App-level stop/start on **file-backed SQLite**; two separate projects created via live server WebSocket RPC, instructions/tasks/result markers/evidence persisted identically; cross-project reads rejected before/after restart. This is **app stop/start**, not crash/SIGKILL recovery; projects were created through RPC, not the Add-project UI.
- Real EventSink + ProjectionMaintenance V2 pruning: 4 events deleted, published watermark 6, exactly one deterministic Evidence V0 `orchestration-v2-pruned` marker on earlier referenced thread (`incomplete/unknown`), post-boundary thread unmarked, distinct 1,000-event truncation and three unresolved markers. New decoder reported **1025/1025 JSONL lines** decoded, old decoder rejected only the pruning marker, confirming accepted fork-only coordinated-upgrade limitation. No missing events fabricated.
- Orchestration: DeepSeek V4.1 Flash **orchestrated only**; workers Codex GPT-6.1 SOL Medium and Claude Sonnet 5.5 Medium, independent reviewers Codex GPT-6.1 Terra Medium and Claude Sonnet 5.5 Medium. Eight dispatches, zero capacity failures, two artifact-hygiene retries; no Opus, subscription failover or provider-confirmed reset. Subscription availability and cost not independently measured here.
- Two independent **read-only reviewer PASS WITH FINDINGS** reports in worker handoff; follow-up reportedly closed some narrow gaps. The manager does **not** re-label these as unconditional production review or as independently inspected raw reviewer logs.

## Precise residual limitations

1. **App-level handoff isolation** was **not** exercised through a live app write (RPC offers read/list, append reportedly requires live model). Prior **service-level** test covers it. Do not claim app-level handoff isolation PASS.
2. **Mode persistence across restart** was not verified. The browser verified the mode toggle within a session only.
3. No SIGKILL/crash recovery test; app was stopped and restarted normally. No Add-project UI creation path tested.
4. `check:changed upstream/main` validates the **fork-vs-upstream delta**, not uniquely the PR #21 diff. Worker resolved baseline to the expected upstream merge-base. Final cached typecheck is supplemented by one fresh uncached PASS reported at the same merged main. Web build was separately successful despite overlap.
5. Older Evidence V0 closed-enum decoders **cannot** read the new `orchestration-v2-pruned` line; user accepted coordinated upgrades for fork-only main.
6. Upstream local `main` was one commit newer than the incorporated release-preparation baseline; this newer upstream change was not qualified in this run.
7. **No hosted CI, live paid providers, production deployment or external/native/remote end-to-end qualification.** UI/screenshots/logs/raw worker ledger exist **only on local verification host** and are unavailable to browser manager. Do not claim remote or independently reproducible evidence has been published.

## Manager classification / next actions

- **Milestone state upgraded:** from `post-merge local NOT RUN` to **`POST-MERGE LOCAL RUNTIME PASS (worker-reported), REVIEW PASS WITH FINDINGS (worker-recorded)`**. Fork `main` integration is independently verified by GitHub; not production verified.
- **Evidence portability:** `OPERATIONAL BLOCKER` for external audit until the actual host-local ledger and *sanitized* manifest/test proofs are persisted to a durable retrievable location. The manager's summary here preserves the user-supplied handoff but is not a substitute for the raw task ledger.
- **Two optional bounded follow-ups:** (a) app-level handoff write/read/isolation using a truly stub/no-cost provider, **only if the host exposes a supported path**; (b) mode preference persistence through actual server restart. If unsafe/unavailable, record NOT RUN/OPERATIONAL BLOCKER rather than fabricate. Avoid altering merged fork main or paying for live models.
- **Further priority:** reconcile local evidence and update Runtime task/handoff when available; keep separate D2 tool-schema exclusion, D4 strict continuation revocation and public-release/production decisions distinct. The experimental continuation branch remains unmerged. No main write/merge/production activation authorized by this review.

**Host-local ledger (not remotely fetched):** `docs/orchestration-v2/postmerge-pr21-verification-ledger-20261104.md` in local `verify/postmerge-pr21-20261104` worktree.  
**Host-local evidence (not remotely fetched):** `/media/jer/Files/Worktrees/pr21-verify-evidence-20261104/`, about 8.2 MB, according to handoff.  
**Canonical current state:** [01_CURRENT_STATE.md](../../01_CURRENT_STATE.md).  
