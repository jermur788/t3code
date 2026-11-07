# Overnight Orchestration Retrospective — 2026-10-29

This is the DeepSeek retrospective/handoff supplied to the Overall Manager after reconstructing the overnight CCF orchestration run.

Original full CCF evidence artifact (including Appendix A child-thread references):

`jermur788/CCF @ 9a430ce6169b4b08577b0b47227d64ebc7283365`

`Docs/Handoffs/PlayerTestReadiness-Overnight-01/RETROSPECTIVE-ROUTING-20261029.md`

---

## 1. Run identified

- **Orchestration thread:** `3296dda4-268e-4502-bd93-b4cd36d08731` — “Orchestrate Scenario One Player-Test Candidate”.
- **Project:** `b42e83a0-a78c-4420-ba40-18e8eee6709b` (CCF).
- **Orchestrator:** `opencode` / `opencode-go/deepseek-v4.1-flash`, full-access, `variant=max`, `agent=build`.
- **Time range:** created `2026-10-29T01:57:40Z`; delegated worker activity `02:16:27Z`–`11:20:38Z`; main parent run 5 `06:24:53Z`–`10:30:07Z`; retrospective run 8 from `14:37:15Z`.
- **Child workers:** **28 delegated child threads** — 18 completed, 10 failed. Full titles, providers, models and exact thread IDs are in Appendix A of the original CCF artifact.
- **Runtime records:** 28 delegated threads with run start/end timestamps. DeepSeek operator completions were parent-thread actions, not separate Runtime tasks.
- **Repositories/worktrees:** CCF bare store; `CCF-Primary`; `/media/jer/Videos/CCF-Orchestrator-PlayerTest`; `/media/jer/Videos/CCF-PlayerTestIntegration`; worker worktrees for Rack, parity, S1-C, S1-D and MFM.
- **Major integration heads:** `6d3228c` Rack09, `a00ab65` T-06, `a6ad231` Rack11, `1bd9083` Rack10, `dc4f59b` Rack12, `60fd902` Rack13, `238bcaa` Rack14/Rack exit, `8b6c3b0` PARITY-06, `23fe4b8` PARITY-05, `aca74ac` S1-C T-03.

## 2. User-supplied routing policy

Explicit user policy, with timestamps:

1. **`01:57:40Z` initial mandate:** DeepSeek orchestration/integration lead; **first substantive delegate must be Claude A / Opus medium**; later bounded work may use Claude B and OpenAI 6.1 Sol; **cross-provider independent review for high-risk save/reference/determinism**; one writer per subsystem; serialized Unity; no Windows build; continue through Rack/parity/S1-C/S1-D/MFM to a final Tier-3 candidate.
2. **`02:18:03Z`:** “you can use the videos partition instead of the zx20”.
3. **`06:22:39Z`:** “once the claude limits reset, i want you to default to using sonnet medium when using the claude subs unless the subtask is very complicated or sonnet gets stuck, otherwise use opus low”.
4. **`06:24:53Z` clarification:** “no I mean default to sonnet medium, escalate to opus low, if opus low gets stuck, escalate to higher opus setting, use sol 6.1 at medium, or high depending on the task when it is available”.
5. **`06:28:31Z`:** “also if all other subs are out use deepseek to try and continue”.
6. **Product decisions:** S1-D T-03 cap hard only while planned/marked work exists; PARITY-05 new browse anchors accepted with exact-base attribution.

The user did **not** specify a numeric cost budget, mandatory remaining-quota threshold, account/pool distinction, or task-difficulty taxonomy.

## 3. Orchestrator-added policy

- Mandatory Claude A Opus-medium start review before any implementation.
- G2 schema/writer order: Rack v21 → S1-C T-05 v22 → MFM-06 next; single writer for `ForestSaveValidation.cs`, `ScenarioOneManager.cs`, history/UI/guide surfaces.
- One Unity lane (U1) and one machine-wide lock; storage-floor and clean-lane checks.
- Capacity fallback in practice: preserve WIP, reassign provider/model, or complete as DeepSeek operator when all delegated pools were out.
- Model heuristics: Sonnet medium for bounded static/UI; Opus low as escalation; higher Opus for high-risk save review; Sol 6.1 medium/high for implementation/Unity; Claude A Opus for independent reviews.
- User authorization required before changing a protected anchor.

## 4. Worker attempt inventory

Summary; the full 28-row table is in the original CCF artifact.

- **18 completed, 10 failed.**
- **All 10 failures were capacity/limit events**, not model refusals or coding failures.
- **9 of 10 failed attempts were salvaged** by another worker or the operator; 1 remains unresolved at the RackLesson anchor.
- **6 review threads** completed; **1 found blocking defects** (T-05: three history bugs), followed by a fix and PASS.
- **5 completed threads remain static-only or pending Unity/integration:** PARITY-07, MFM-04, MFM-05, S1-C T-05 v22, S1-D T-03. S1-D T-03 Unity completion is additional partial.

Notable failures and salvage:

| Attempt | Failure | Salvage |
|---|---|---|
| RACK-V2-09 / Codex Sol | usage limit, reset 6:38 | Claude B takeover; PASS `8f8316b` |
| PARITY-06 / OpenCode Sol | usage limit, no reset | WIP `4fb0d92`; Claude A review; Sol Unity 14/14 |
| MFM-04 / Claude B | Claude session limit 7am | Claude A exact-area repair 236/236 |
| T-06 / Claude B2 | Claude session limit 7am after Q1/Q2 | Operator Q1–Q5/test fix; Claude A review PASS |
| RACK-V2-10 / Claude B3 | Claude 7am limit | Operator completed static 97/15 |
| RACK-V2-12 / Claude B, then Claude A | Claude 7am/7:10 limits | Operator completed E2E 173/24 + model0/legacy40 |
| RACK-V2-13 / Sonnet | 7:10 limit, failed in 8 s | Operator rendered review PASS |
| MFM-05 / Opus low | 7:10 limit, failed in 7 s | Sol medium 95/95 + 236 |
| S1-D T-03 Unity / Sol | usage limit reset 11:40 | Sonnet completion; lesson anchor still unresolved |

## 5. Routing decision timeline

18 material decisions reconstructed:

1. Claude A Opus medium start review — mandatory.
2. Initial parallel lanes: Rack09 Codex high, MFM-03 Claude B Opus high, P06 OpenCode Sol high.
3. Rack09 Codex limit → Claude B takeover.
4. MFM-03 review → Claude A.
5. P06 OpenCode limit → WIP + Claude A review + Sol Unity.
6. T-06 → Claude B2.
7. Rack10 → Claude B3.
8. Rack11 → Claude A.
9. T-06 review → Claude A.
10. Rack12 → Claude B, retry Claude A, then operator.
11. MFM-04 repair → Claude A.
12. Rack13 → Sonnet before reset (failed).
13. P06 Unity → Sol immediately after Codex 6:38 reset.
14. MFM-05 → Opus low before reset (failed), then Sol after reset.
15. P05 → Sol diagnosis, operator baseline, user anchor decision.
16. S1-C T-03 → Sol rendered.
17. P07/S1-D T-03/T-05 → Sonnet static; T-05 review → Opus.
18. S1-D T-03 Unity → Sol, then Sonnet; unresolved.

**Counts:** 7 decisions were directly informed by provider capacity/reset events; 8 were role/policy selections with unknown or approximate capacity; 3 launches were contrary to a known reset (plus 3 further premature retries in the same window).

## 6. Subscription / capacity timeline

No provider exposed remaining percentage/quota. **`UNKNOWN — PROVIDER SIGNAL NOT OBSERVED`** for remaining capacity on every provider.

| Time | Provider | Signal | Reset | Reaction |
|---|---|---|---|---|
| 03:08:44 | Codex | “You’ve hit your usage limit… try again at 6:38 AM” | 06:38 | Rack09 → Claude B; correct |
| 03:11:11 | OpenCode Sol | “The usage limit has been reached” | unknown | WIP preserved; later review/Unity |
| 03:50–03:51 | Claude B | “session limit · resets 7am (Europe/Dublin)” | 07:00 | T-06/MFM-04 stopped; operator later |
| 04:38 | Claude B | same 7am | 07:00 | Immediate resumes failed in seconds |
| 04:56 | Claude B | same 7am | 07:00 | Rack12 failed in 4 s |
| 05:22 | Claude A | “resets 7:10am (Europe/Dublin)” | 07:10 | Rack12 retry failed; window moved |
| 06:36 | Sonnet | same 7:10am | 07:10 | Rack13 Sonnet failed in 8 s |
| 06:41 | Opus low | same 7:10am | 07:10 | MFM-05 Opus failed in 7 s; Sol succeeded after 07:10 |
| 09:45 | Codex | usage limit; try again 11:40 AM | 11:40 | S1-D T-03 Unity moved to Sonnet |
| 06:38/07:00/07:10/11:40 | all | reset times only | — | no quota/percentage available |

## 7. Worker outcome analysis

- **28 delegated threads: 18 completed / 10 failed.**
- **10/10 failures were capacity/limit**, not code.
- **9/10 salvaged**; no lost branches/commits because WIP checkpoints were preserved.
- **6 reviews / 1 blocking finding**; Opus review materially improved T-05.
- Sonnet static work was reliable: P07 77/77, S1-D T-03 48 checks, T-05 115 checks after repair. It did not independently catch the T-05 history bugs.
- Sol was the strongest sustained Unity lane: P06 14/14, S1-C T-03 279/0, P05 diagnosis.
- Opus low produced no usable work in this run, but only because it was launched before reset; this is not evidence of low-effort quality.
- No clear evidence of strong-model overuse; the opposite occurred — several launches before known reset windows were wasted.

## 8. Routing decisions that appear effective

- Mandatory Claude A Opus-medium start review — exact compliance, usable PASS.
- Rack09 Codex → Claude B takeover at `1985a7b` — preserved field evidence, no production rework.
- MFM-03 Claude B + Claude A review — independent measurement review.
- P06 WIP preservation after OpenCode limit — 14/14 Unity later.
- P06 Unity on Sol immediately after the 06:38 reset — best-timed capacity resume.
- MFM-04 repair by Claude A — exact-area fix, 236/236.
- S1-C T-03 rendered on Sol — 279/0, 246/0, 16 captures, integrated.
- T-05 Sonnet implementation + Opus review — three real save-history bugs found and fixed; re-review PASS.
- P05 anchor escalation — exact-base attribution, user authorization, no silent rebaseline.
- One-writer/worktree discipline and no Windows build.

## 9. Routing decisions that appear questionable

- **Six Claude launches before the known 07:00/07:10 reset** (T-06/MFM-04/Rack10 resumes at 04:37–04:38, Rack12 at 04:55, Rack12 Claude A at 05:04, Rack13 at 06:35, MFM-05 Opus at 06:41); each failed in seconds.
- **Same-provider review for T-05:** Sonnet implemented, Opus reviewed; both Anthropic. The packet preferred cross-provider for high-risk save/reference/determinism.
- **Operator completed R12 and also performed R13 visual review**; R13 is not independent of the operator’s integration work.
- **Operator completions are invisible as Runtime attempts**; 8+ substantive recoveries are only in the parent thread.
- **T3 `status=completed` was unreliable:** the S1-D T-03 Unity thread signalled completed while its chain was still running.
- **Capacity/error wording was not normalized:** “session limit”, “usage limit”, “rate limit”, and parent “Claude API rate limit reached” were different levels of information.
- **No durable routing log during the run**; rationale had to be inferred from prompts and thread metadata.
- **Initial parallel plan assumed all three pools were available**; two hit limits within 40 minutes.

## 10. Missing information that would have improved decisions

- Remaining subscription capacity/percentage — only reset times were available; this would likely have prevented the premature launches.
- Reset timestamp normalized to UTC and included in the parent notification.
- Account/pool distinction: Claude A vs B, Codex vs OpenCode; sharing status unknown.
- Task difficulty/risk class at selection.
- Historical success/rework rate per model/task.
- Accepted outcome separate from worker “completed”.
- Current verification/anchor state.
- Tool capability declarations (image review, Unity, native input, .NET only).
- Permission/runtime mode.
- Context size/thread degradation.
- Cost/reserve priority.

## 11. Patterns useful for future routing

- Sonnet medium for bounded static/UI; Opus/Sol for save/history/determinism logic.
- Sol 6.1 high for Unity-native gates and long qualification chains.
- Opus medium for independent high-risk review.
- Never launch a limited provider before its reported reset; queue or switch.
- Preserve WIP immediately; 9/10 failures were salvaged because state survived.
- Separate implementer and reviewer; cross-provider is stronger for high-risk work.
- Treat operator work as a first-class attempt.
- Do not treat a child `completed` status as acceptance.
- Escalate protected-anchor changes to the user/Manager.

## 12. Recommended standard orchestration record

**Automatically recordable:** parent/child/task/run IDs; requested/started/completed timestamps in UTC; provider/model/effort/options; route source; candidates/rejections; runtime mode; normalized provider error; capacity event/reset/timezone; retry link; branch/worktree/commit; evidence/handoff path; terminal gate marker; tool capability.

**Orchestrator-declared:** difficulty/risk class; override reason; reserve strategy; why an eligible worker was avoided; independence requirement; one-writer/concurrency constraints; expected acceptance gate.

**Outcome-derived:** accepted / minor rework / substantial rework / rejected / superseded / unresolved; review findings; integration commit; realized difficulty/rework; anchor movement and authorization; routing effectiveness.

## 13. Orchestration Decision Appendix assessment

- **Useful:** policy section, decision log, capacity events with reset times, worker outcomes, end-of-session assessment.
- **Redundant:** manual provider/model/timestamp duplication; free-text titles; “completed” without acceptance.
- **Missing:** route source, candidates/rejections, independence requirement, risk class, acceptance/verification state, rework count, anchor update, workspace/branch, context size, account/pool alias, normalized error taxonomy, reset timezone.
- **Cannot reliably fill manually:** exact timestamps, candidate set, error text, reset times, final outcome, integration state.
- **Auto-populate:** IDs/timestamps/provider/model/options/error/reset/retry/terminal status/evidence path.
- **Declared:** risk class, override reason, reserve strategy, independence.
- **Outcome-derived:** acceptance, rework, review findings, integration, realized difficulty.

## 14. ARM-020/030/040/045/050/070 mapping

- **ARM-020:** capture thread context, workspace, tools, permissions, context size and operator/manual attempts.
- **ARM-030:** standardize capacity events, exact provider message, reset timezone, account/pool alias, remaining quota if exposed, and `UNKNOWN` otherwise.
- **ARM-040:** pre-run difficulty/risk and post-run realized difficulty/rework.
- **ARM-045:** authoritative accepted/rejected/needs-changes/integrated outcomes, not worker self-report.
- **ARM-050:** advisory recommendations using capacity/outcomes, with candidates, reasons, confidence and override logging.
- **ARM-070:** operator read surface for “why this worker, why not that one” and capacity/outcome timeline.

## 15. Spec questions

- **SPEC QUESTION — cross-provider independence:** Should high-risk save/reference/determinism work require a different provider family, not merely a different model/thread? T-05 was Sonnet→Opus.
- **SPEC QUESTION — known-reset launch rule:** Should T3 block or warn on provider launches before a reported reset when no remaining quota is available?
- **SPEC QUESTION — operator-as-worker telemetry:** Should DeepSeek operator completions be first-class Runtime attempts with model/effort and independence state?
- **SPEC QUESTION — acceptance gate:** Should T3 require an explicit accepted/rejected/integrated outcome before scheduling dependent work?

## 16. Evidence limitations

- Retrospective runs inside the same parent thread after the main run; parent run 5 ended `10:30:07Z`.
- Some thread `updatedAt` values are a bulk `10:44:58Z`; run `completedAt` and per-run receipts were used instead.
- Some failed threads have no error message item; error text came from parent notifications/transcript.
- No remaining quota/percentage was exposed; all capacity statements are reset/limit observations.
- Account/pool aliases unknown.
- Operator work is not a child Runtime task.
- Separate top-level threads after 13:00Z were excluded as adjacent sessions.
- Worker “completed” is not treated as acceptance; Git/handoffs/gates are the acceptance evidence.

## 17. Exact next action

Manager review of this retrospective; adopt the automatic/declared/outcome-derived split; add a capacity reset preflight and normalized error taxonomy; require cross-provider independence for high-risk reviews; make operator attempts first-class; do **not** implement ARM changes from this retrospective.

---

## Mandatory handoff

- **Provider/model used:** `opencode` / `opencode-go/deepseek-v4.1-flash`, `variant=max`, `agent=build`.
- **Environment inspected:** T3 thread list/read/configuration/search; parent transcript; Git; handoffs; evidence directories; Unity lock records.
- **Orchestration thread:** `3296dda4-268e-4502-bd93-b4cd36d08731`.
- **Date/time range:** worker activity `2026-10-29T01:57:40Z`–`11:20:38Z`; main parent run 5 `06:24:53Z`–`10:30:07Z`; retrospective run 8 from `14:37:15Z`.
- **Child/worker threads:** 28 delegated threads — 18 completed, 10 failed; full IDs in Appendix A of the original CCF artifact.
- **Runtime tasks/attempts:** 28 delegated task threads; operator completions are parent-thread actions, not separate Runtime tasks.
- **Repositories/worktrees:** CCF bare store, CCF-Primary, orchestration/integration and worker worktrees.
- **Material routing decisions reconstructed:** 18.
- **Backed by direct capacity evidence:** 7.
- **Reliance on inference/unknown capacity:** 8; 3 launches were contrary to a known reset, plus 3 further premature retries.
- **Worker outcome counts:** 18 completed / 10 failed; 9/10 failures salvaged; 6 reviews, 1 blocking; 5 completed threads static-only/pending Unity.
- **Retrospective artifact:** `Docs/Handoffs/PlayerTestReadiness-Overnight-01/RETROSPECTIVE-ROUTING-20261029.md` at commit `9a430ce`.
- **Evidence not recovered:** exact remaining quota, OpenCode reset, some failed-thread error items, operator task IDs, exact question-answer timestamps, account/pool distinction.
- **Privacy/redaction:** no credentials, tokens, pairing URLs, secrets or unnecessary account identifiers; provider/account aliases only.
- **Repo cleanliness:** clean; only the docs retrospective file added.
- **Project/runtime state changed:** no product/runtime state changed; original threads untouched; no Windows build.
- **Proposed next action:** Manager review; adopt record split; capacity reset preflight; cross-provider rule for high-risk reviews; operator attempts first-class; no ARM implementation.

`ORCHESTRATION RETROSPECTIVE COMPLETE — EVIDENCE READY FOR MANAGER REVIEW`
