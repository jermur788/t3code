# Mandatory Orchestration Evidence Appendix — V2 — T3 Fork Local L2

Run: T3 Fork Local L2 combined-sync qualification
Date: 2026-11-01
Orchestrator: DeepSeek V4.1 Flash (`opencode-go/deepseek-v4.1-flash`, OpenCode harness, variant `max`, agent `build`)
Canonical ruled candidate: `sync/upstream-20261031 @ e51c1c5d74aed9824927d391590ddb33026c8d56`

This appendix is the structured run/result evidence contract. Decision-time routing entries are recorded before outcomes; outcome sections are appended after observed work.

## 1. Policy

- **User objective:** qualify exact combined sync candidate `e51c1c5d...` as one integrated system, return a durable result to Overall Dev, and do not integrate to `main`.
- **Hard constraints:** exact SHA only; no newer/different SHA; stop on branch drift; no force-push/history rewrite; no PR #14 merge; no architecture change to make tests pass; no weakened provenance checks; no second orchestration graph/provider launcher/capacity poller; no real OAuth claim from fixtures; no autonomous ARM routing; one-writer per overlapping lane.
- **Optimization preferences:** correctness and auditability first; cost/time secondary; avoid risky live-credential rotation; no paid infrastructure.
- **Routing policy:** DeepSeek routing-evidence directive, 2026-11-01. No hard-coded easy/hard mapping.
- **Review rule:** DeepSeek retains orchestration; independent review may be delegated to Claude when the recorded assessment warrants it.
- **Protected decisions:** PR #14 integration, CI exception, product/architecture changes, material paid infrastructure.

## 2. Capacity and orchestrator context

| Provider/pool                           | State              | Remaining capacity        | Reset/window | Source                 | Observed at       | Current work     |
| --------------------------------------- | ------------------ | ------------------------- | ------------ | ---------------------- | ----------------- | ---------------- |
| OpenCode / DeepSeek V4.1 Flash          | AVAILABLE          | UNKNOWN (session running) | UNKNOWN      | T3 runtime             | 2026-11-01T08:05Z | L2 orchestration |
| Claude A                                | AVAILABLE (listed) | UNKNOWN                   | UNKNOWN      | T3 catalog             | 2026-11-01T08:05Z | none             |
| Claude B — Pro                          | AVAILABLE (listed) | UNKNOWN                   | UNKNOWN      | T3 catalog             | 2026-11-01T08:05Z | none             |
| Codex / OpenAI B                        | AVAILABLE (listed) | UNKNOWN                   | UNKNOWN      | T3 catalog             | 2026-11-01T08:05Z | none             |
| Cursor / Grok / Antigravity / Muse / Pi | DISABLED           | N/A                       | N/A          | T3 catalog constraints | 2026-11-01T08:05Z | none             |

At dispatch: capacity-to-completion `SUFFICIENT` for DeepSeek orchestration and local deterministic work; `UNKNOWN` for optional Claude review until dispatched.

Orchestrator context: limit/used/compaction values `UNKNOWN` (not exposed as reliable observations in this session).

## 3. Routing and decomposition — decision-time entries

| Decision          | Work unit                         | Band / confidence            | Selected                  | Reviewer                  | Selection                    | Recorded at       |
| ----------------- | --------------------------------- | ---------------------------- | ------------------------- | ------------------------- | ---------------------------- | ----------------- |
| `l2-20261101-d01` | Overall L2 orchestration          | HIGH / 0.80                  | DeepSeek V4.1 Flash       | Claude Sonnet 5.5 planned | exploit + forced policy      | 2026-11-01T08:05Z |
| `l2-20261101-d02` | Repo safety / exact-SHA worktree  | LOW-MEDIUM / 0.92            | DeepSeek V4.1 Flash       | none                      | exploit                      | 2026-11-01T08:05Z |
| `l2-20261101-d03` | Focused tests + typecheck         | MEDIUM-HIGH / 0.88           | DeepSeek V4.1 Flash       | none                      | exploit                      | 2026-11-01T08:05Z |
| `l2-20261101-d04` | Runtime/V2 provenance             | HIGH / 0.78                  | DeepSeek V4.1 Flash       | Claude Sonnet 5.5 planned | exploit + independent review | 2026-11-01T08:05Z |
| `l2-20261101-d05` | Rendered UI + restart/persistence | HIGH / 0.75                  | DeepSeek V4.1 Flash       | none                      | exploit                      | 2026-11-01T08:05Z |
| `l2-20261101-d06` | Real-provider/OAuth availability  | HIGH-RISK / LOW-SCOPE / 0.70 | DeepSeek V4.1 Flash       | none                      | forced safety boundary       | 2026-11-01T08:05Z |
| `l2-20261101-d07` | Independent evidence review       | HIGH / 0.72                  | Claude Sonnet 5.5 planned | N/A                       | explore independent review   | 2026-11-01T08:05Z |
| `l2-20261101-d08` | Final handoff synthesis           | MEDIUM-HIGH / 0.85           | DeepSeek V4.1 Flash       | N/A                       | forced orchestrator role     | 2026-11-01T08:05Z |

Choice set: DeepSeek V4.1 Flash; Claude Sonnet 5.5 / Opus 5.5 (A and B instances); Codex / OpenAI B gpt-6.1-sol. Material rejected alternatives and rationale are in the ledger decision records.

## 4. Outcomes and resources

### Outcome summary

| Decision          | Actual executor                     | State       | Key evidence                                                                    |
| ----------------- | ----------------------------------- | ----------- | ------------------------------------------------------------------------------- |
| `l2-20261101-d01` | DeepSeek V4.1 Flash                 | PASS        | Orchestration + final reconciliation; no substitution                           |
| `l2-20261101-d02` | DeepSeek V4.1 Flash                 | PASS        | Detached clean worktree at exact SHA; origin ref exact; no other writer         |
| `l2-20261101-d03` | DeepSeek V4.1 Flash                 | PASS        | 186/186 focused tests across 10 files; typecheck 3/3                            |
| `l2-20261101-d04` | DeepSeek V4.1 Flash + Claude review | PASS        | 4/4 required provenance cases; 14/14 full suite; service-level only             |
| `l2-20261101-d05` | DeepSeek V4.1 Flash                 | PASS        | Distinct binding, ambiguous unbound, real restart, Workspace/Development render |
| `l2-20261101-d06` | DeepSeek V4.1 Flash                 | BLOCKED     | One real credential; no safe second subscription or live probe                  |
| `l2-20261101-d07` | Claude Sonnet 5.5                   | REVIEW PASS | 71s; no blocking defect; evidence-presentation findings addressed               |
| `l2-20261101-d08` | DeepSeek V4.1 Flash                 | COMPLETED   | Durable result written; no `main` integration                                   |

### Exact verification

- `AdaptiveRoutingService.test.ts` — 14/14; focused `-t "supplied execution"` — 4/4.
- `007_AdaptiveRouting.test.ts` — 9/9.
- `usageLimits.test.ts` — 68/68.
- `RuntimeRoutingProviderView.test.ts` + `RuntimeRoutingService.test.ts` — 10/10.
- `CodexChatGptAuth.test.ts` — 56/56.
- `ProjectRuntimeRpc.test.ts` + `RuntimeTaskExecutionQualification.test.ts` + `RuntimeTaskExecutionService.test.ts` — 27/27.
- `UsageLimitsPooled.browser.test.tsx` — 2/2.
- Affected typecheck (`@t3tools/shared`, `@t3tools/web`, `t3`) — 3/3 successful.

Limits: rejection tests assert `PersistenceSqlError` plus zero rows, not the exact detail. Missing-attempt/wrong-project and NULL-thread are code-present but not separately tested with `execution` supplied. No non-test caller of `appendExecutionObservationReference` exists, so no live Runtime↔V2 bridge is claimed. The SELECT/INSERT is not in one transaction; low residual race.

### Rendered UI evidence

- Distinct fixture identities: `codex_work` = `work@example.test`, `codex_personal` = `personal@example.test`, no native workspace id; hub `acct-work` / `acct-personal`, same emails, no workspace id. This is the unique-email path, not workspace disambiguation.
- Distinct render: Codex Work 60% session / 90% weekly left; Codex Personal 25% / 70%; `Via: Qualification Hub`; one hub source; both provider instances enabled.
- Ambiguous fixture identities: both native emails `shared@example.test`, no workspace id; hub `shared` with `ws-shared`, 55% / 20% used.
- Ambiguous render: one hub-only `SE` row at 45% / 80% left; no per-instance capacity rows; external ChatGPT fallback names both instances.
- Workspace/Development: `/settings/general` T3 Fork interface modes render; `/settings/development-profiles` renders; `/home` Development Project Runtime home renders its sections with Runtime disabled in the seeded project.
- Screenshot limitation: T3 preview snapshot/screenshot timed out even for `https://example.com`; navigation, DOM, computed styles, layout, and ARIA labels worked. Evidence is live-browser rendered DOM/ARIA, not PNG.
- Unit-only coverage: native limits win (`usageLimits.test.ts:1438`); workspace disambiguation (`:1385`); workspace-less native join (`:570`).

### Restart / persistence

- Real stop by captured process group and restart on the same exact SHA.
- Distinct rows reconstructed unchanged after restart: 25/60 and 70/90.
- Second real stop/start used for the ambiguous fixture; the ambiguous unbound render followed.
- Browser session cookie persisted via the worktree signing key; no re-pair needed.
- Environment noise: a CPU-load freeze toast appeared; host load was elevated. Not a candidate defect.

### External blockers and CI

- `BLOCKED — credentials unavailable`: one real Codex credential (`~/.codex/auth.json`, one `account_id`, refresh token present); no second real subscription or safe account access. No real OAuth/refresh/paid eval was run.
- Exact candidate CI: zero statuses, zero workflow runs, zero check runs. `OPERATIONAL BLOCKER`, not a pass or failure.
- PR #14 remained open/draft/mergeable at the exact candidate; `main` remained `d971327934eeb79bed5b02e4477a5140615eacf0`.
- No `main` integration occurred.

### Resources

- Wall-clock observations: test runs 08:06–08:10Z; first dev server 08:13:52Z; distinct restart 08:22:22Z; ambiguous restart 08:23:37Z; Claude review 08:25:03–08:26:14Z.
- Tokens/cost: `UNKNOWN` (not exposed by the harness). No estimates are recorded as facts.
- No model substitution; no paid infrastructure.

### Correction

Worktree creation at 08:01:11Z preceded the 08:05Z batched decision records; the first focused test started 08:06:03Z. D-L2-02's action therefore predates its record by about four minutes. No outcome was known when the records were written. The original decision text was not rewritten.

## 5. Learning assessment

- **Supported:** DeepSeek self-execution was adequate for deterministic test, fixture, restart, and synthesis work. The independent Claude review found no code defect but caught material evidence gaps: stale local-branch ref, under-specified fixture identity, no live provenance caller, missing no-second-owner/Workspace/OAuth/CI checks, and weak rejection assertions. Cross-provider review added real value at high risk.
- **Weakened:** decision records were batched at 08:05Z after worktree setup at 08:01Z. The outcome record appends the correction; future runs should record the first setup action immediately.
- **Capacity/context:** exact quota/context values `UNKNOWN`. No substitution. Claude review capacity was sufficient.
- **Hypotheses (not policy):** record top-level and repo-safety decisions immediately, then batch deterministic subtask records before their execution; give independent reviewers the evidence draft, not only source. Confidence: medium. These remain hypotheses until evaluated.

## 6. Evidence rule

Observed facts, orchestrator claims, retrospective inferences, and derived records remain distinct. Capacity values that were not observed remain `UNKNOWN`. No mock/fixture result is promoted to a real-provider pass.

## 7. Final summary

- **Attempts:** one L2 qualification run on exact `e51c1c5d74aed9824927d391590ddb33026c8d56`.
- **Completed:** exact-SHA safety, focused tests, affected typecheck, service-level provenance matrix, rendered distinct capacity, rendered ambiguous unbound behavior, real stop/start persistence, Workspace/Development render, independent review, CI check, OAuth availability classification.
- **Blocked:** real two-subscription OAuth/refresh and real paid-provider evaluation (`BLOCKED — credentials unavailable`); GitHub Actions absent (`OPERATIONAL BLOCKER`).
- **Failures/retries/salvage:** none in product/test execution. One evidence-write correction appended for late decision-record timing. One stray untracked pid file from an L2 fixture command was removed from the main checkout.
- **Material routing:** DeepSeek self-executed all deterministic work; Claude Sonnet 5.5 performed the bounded independent review. No model substitution.
- **Review findings:** no blocking code defect; four evidence-presentation gaps, all addressed in the result.
- **Unresolved work:** Browser Overall must recheck CI/current `main`, decide the CI exception question if CI remains absent, and own PR #14 integration. No local merge occurred.
- **Exact next action:** Browser Overall consumes `messages/t3-fork/2026-11-01-local-l2-combined-sync-qualification-result.md` and does not treat this L2 as a CI pass.

---

# Run 2 — Orchestration Evidence V0 — decision-time appendix

Run: Local DeepSeek Evidence V0 orchestration
Date: 2026-11-01
Orchestrator: DeepSeek V4.1 Flash (`opencode-go/deepseek-v4.1-flash`, OpenCode harness, `variant=max`, agent `build`)
Isolated base: `e51c1c5d74aed9824927d391590ddb33026c8d56`; branch `feat/orchestration-evidence-v0-20261101`

This section is the structured decision-time contract for the Evidence V0 run. Outcomes are appended in a later section; the rows below are not rewritten after results are known.

## R2.1 Policy

- **User objective:** design and implement the smallest useful Orchestration Evidence V0 export/reconstruction over existing Runtime/ARM/upstream-V2 truth, while gathering prospective routing evidence.
- **Hard constraints:** exact base; frozen PR #14 candidate; no merge to `sync/upstream-20261031` or `main`; no second canonical datastore/identity/launcher/catalog/poller/account DB; no autonomous routing; no learned router; no weakened tests; one writer per overlapping lane.
- **Optimization preferences:** correctness/auditability/upstream compatibility; smallest useful surface; no paid infrastructure.
- **Review rule:** DeepSeek retains orchestration; independent review by a different provider.
- **Protected decisions:** architecture divergence, new canonical storage, security/privacy, destructive/shared-history actions, material paid cost, PR #14 changes.

## R2.2 Capacity at decision time

| Provider/pool                               | State                            | Remaining capacity | Source                      | Observed at       |
| ------------------------------------------- | -------------------------------- | ------------------ | --------------------------- | ----------------- |
| OpenCode / DeepSeek V4.1 Flash              | AVAILABLE (running this session) | `UNKNOWN`          | T3 live catalog + session   | 2026-11-01T16:35Z |
| Claude A (`claudeAgent`)                    | AVAILABLE (listed)               | `UNKNOWN`          | T3 live catalog             | 2026-11-01T16:35Z |
| Claude B — Pro (`claudeAgent_claude_b_pro`) | AVAILABLE (listed)               | `UNKNOWN`          | T3 live catalog             | 2026-11-01T16:35Z |
| Codex / OpenAI B                            | AVAILABLE (listed)               | `UNKNOWN`          | T3 live catalog             | 2026-11-01T16:35Z |
| Cursor / Grok / Antigravity / Muse / Pi     | DISABLED                         | N/A                | T3 live catalog constraints | 2026-11-01T16:35Z |

At dispatch: capacity-to-completion `SUFFICIENT` for DeepSeek local work; `UNKNOWN` for optional Claude review until dispatched. No distinct "Saul" instance is listed.

## R2.3 Routing and decomposition — decision-time entries

| Decision           | Work unit                         | Band / confidence  | Selected            | Reviewer                      | Selection                  | Recorded at       |
| ------------------ | --------------------------------- | ------------------ | ------------------- | ----------------------------- | -------------------------- | ----------------- |
| `ev0-20261101-d01` | Overall Evidence V0 orchestration | HIGH / 0.75        | DeepSeek V4.1 Flash | Claude Opus 5.5 planned       | exploit + forced policy    | 2026-11-01T16:35Z |
| `ev0-20261101-d02` | Repo safety / exact-base worktree | LOW-MEDIUM / 0.95  | DeepSeek V4.1 Flash | none                          | exploit                    | 2026-11-01T16:33Z |
| `ev0-20261101-d03` | Domain-record archaeology         | MEDIUM-HIGH / 0.82 | DeepSeek V4.1 Flash | Claude Sonnet 5.5 cross-check | exploit + explore          | 2026-11-01T16:35Z |
| `ev0-20261101-d04` | Field mapping / classification    | MEDIUM-HIGH / 0.78 | DeepSeek V4.1 Flash | none                          | exploit                    | 2026-11-01T16:35Z |
| `ev0-20261101-d05` | L2 sequence mapping + gap list    | MEDIUM / 0.82      | DeepSeek V4.1 Flash | none                          | exploit                    | 2026-11-01T16:35Z |
| `ev0-20261101-d06` | Browser-spec reconciliation       | MEDIUM-HIGH / 0.72 | DeepSeek V4.1 Flash | none                          | forced orchestrator        | 2026-11-01T16:35Z |
| `ev0-20261101-d07` | Export envelope / seam design     | MEDIUM-HIGH / 0.75 | DeepSeek V4.1 Flash | Claude Opus 5.5 planned       | exploit + planned review   | 2026-11-01T16:35Z |
| `ev0-20261101-d08` | Reconstruction command design     | MEDIUM / 0.78      | DeepSeek V4.1 Flash | none                          | exploit                    | 2026-11-01T16:35Z |
| `ev0-20261101-d09` | Tests/fixtures (L2 sequence)      | MEDIUM-HIGH / 0.80 | DeepSeek V4.1 Flash | none                          | exploit                    | 2026-11-01T16:35Z |
| `ev0-20261101-d10` | Smallest exporter/reconstructor   | MEDIUM-HIGH / 0.75 | DeepSeek V4.1 Flash | Claude Opus 5.5 planned       | exploit + planned review   | 2026-11-01T16:35Z |
| `ev0-20261101-d11` | Independent architecture review   | HIGH / 0.70        | Claude Opus 5.5     | N/A                           | explore independent review | 2026-11-01T16:35Z |
| `ev0-20261101-d12` | Final verification + handoff      | MEDIUM / 0.85      | DeepSeek V4.1 Flash | N/A                           | forced orchestrator        | 2026-11-01T16:35Z |

Choice set: DeepSeek V4.1 Flash; Claude Sonnet 5.5 / Opus 5.5 (A and B instances); Codex / OpenAI B gpt-6.1-sol. Rejected alternatives and rationale are in the ledger decision records. Outcomes are `PENDING`.

# Run 2 — Orchestration Evidence V0 — outcomes

Run: Local DeepSeek Evidence V0 orchestration
Date: 2026-11-01
Orchestrator: DeepSeek V4.1 Flash (`opencode-go/deepseek-v4.1-flash`, OpenCode harness, `variant=max`, agent `build`)
Base: `e51c1c5d74aed9824927d391590ddb33026c8d56`
Working branch: `feat/orchestration-evidence-v0-20261101`

## R2.4 Outcome summary

| Decision            | Actual executor          | State       | Key evidence                                                                         |
| ------------------- | ------------------------ | ----------- | ------------------------------------------------------------------------------------ |
| `ev0-20261101-d01`  | DeepSeek V4.1 Flash      | PASS        | Orchestration and reconciliation; no substitution                                    |
| `ev0-20261101-d02`  | DeepSeek V4.1 Flash      | PASS        | New worktree at exact base; clean status; frozen candidate untouched                 |
| `ev0-20261101-d03`  | none (Claude Sonnet 5.5) | BLOCKED     | `provider_capacity`: Claude API rate limit                                           |
| `ev0-20261101-d03a` | Codex gpt-6.1-sol        | COMPLETED   | Independent read-only archaeology cross-check                                        |
| `ev0-20261101-d04`  | DeepSeek V4.1 Flash      | COMPLETED   | Field classification table; no material conflict with cross-check                    |
| `ev0-20261101-d05`  | DeepSeek V4.1 Flash      | COMPLETED   | L2 d01–d08 mapping and eight-item gap list                                           |
| `ev0-20261101-d06`  | DeepSeek V4.1 Flash      | COMPLETED   | Expected spec path absent; proposed plan + standard consumed; no material divergence |
| `ev0-20261101-d07`  | DeepSeek V4.1 Flash      | COMPLETED   | Versioned refs-first envelope; no second store                                       |
| `ev0-20261101-d08`  | DeepSeek V4.1 Flash      | COMPLETED   | Deterministic task-first chronological reconstruction                                |
| `ev0-20261101-d09`  | DeepSeek V4.1 Flash      | STATIC PASS | 7/7 focused tests; determinism, refs, UNKNOWN, corrections, no new table             |
| `ev0-20261101-d10`  | DeepSeek V4.1 Flash      | IMPLEMENTED | Commit `30b20c12cc` (+ test-only `8fef8e56a1`)                                       |
| `ev0-20261101-d11`  | none (Claude Opus 5.5 A) | BLOCKED     | `provider_capacity`: Claude API rate limit                                           |
| `ev0-20261101-d11a` | Claude B — Pro Opus 5.5  | See R2.6    | Independent read-only review                                                         |
| `ev0-20261101-d12`  | DeepSeek V4.1 Flash      | COMPLETED   | Durable result; no merge to `sync/upstream-20261031` or `main`                       |

## R2.5 Exact verification

- `OrchestrationEvidenceService.test.ts` — 7/7 pass.
- Affected typecheck: `@t3tools/contracts` pass; `t3` (server) pass; `vp run check:changed` typecheck step passed for all 39 packages.
- `vp run check:changed`: format pass; lint pass; knip 1/2 pass; knip 2/2 failed once on one unused export (`ORCHESTRATION_EVIDENCE_BOUNDS`), fixed, rechecked clean; graphql checks pass; react compiler pass (371/371, 949 skipped); repo-wide 699-file test step `TIMEOUT` at 900 s (explicitly not a failure).
- No RUNTIME PASS is claimed. The service is not wired to RPC/MCP/CLI/UI and was not exercised against a live server or real database.

## R2.6 Routing outcomes and lessons

- **Capacity substitution worked twice, once badly.** Claude A failed at 16:42Z with a vendor rate limit. The first substitute (Codex) completed the archaeology cross-check and found two material gaps DeepSeek had not recorded: ARM has no active production producer path, and event compaction removes superseded V2 events. The second substitute (Claude B) is recorded separately in R2.7.
- **Self-execution was adequate for design and implementation.** DeepSeek held the archaeology context and the one-writer constraint. The independent cross-check added specific value; it did not find a different architecture.
- **The gap audit changed the meaning of V0.** The exporter is correct but will often produce sparse evidence because the producers are unwired. This validates the browser plan's warning that V0 is both an evidence-production and an export project.
- **No autonomy claim.** Routing records are evidence, not authorization. No learned router, no automatic route, no second model catalog.
