# Overnight conditional-autonomy amendment — upstream trial → continuation/D4 → D2/K3

**Authority:** New user instruction 2026-11-06 00:14 Europe/Dublin: "I want to do as much work as possible while I'm asleep, create an amendment for the orch agent so that it can continue on without your input if the work meets certain targets that you can set in the handoff."  
**Classification:** **ACCEPTED CONDITIONAL LOCAL-ONLY EXECUTION AUTHORIZATION**, a narrow amendment to the [2026-11-05 authorized upstream trial](upstream-catchup-isolated-trial-governing-spec-20261105.md) and [Coordination/Handoff Protocol](../../02_COORDINATION_HANDOFF_PROTOCOL.md). Not a change to stable coordination invariants.  
**Status at authoring:** **AMENDMENT PREPARED / NOT DISPATCHED**; no automatic browser-to-T3 Code connection established; no work launched by writing this document.  
**Why:** permit DeepSeek to advance through a fixed sequence of **reversible isolated local work** without asking ChatGPT/Overall Manager after every successful, independently reviewed gate. The user retains product authority outside the enumerated scope.

## 1. Strict scope of delegated autonomy

The user's new instruction **conditionally authorizes** three stages, sequentially, and only while the currently running T3 Code/OpenCode session can actually invoke, supervise and receive worker outputs:

- **U — current upstream catch-up trial:** already authorized. Create a new owned local worktree from verified fork main; integrate **one frozen upstream checkpoint** there; resolve routine conflicts; independently review/tests. No fork-main merge.
- **R — fresh continuation + D4 re-land candidate:** **NEW conditional permission** only when U earns a complete G-U pass. Create a separate NEW isolated worktree/branch from the **reviewed, immutable U candidate tip**. Reimplement/adapt the minimum isolated continuation and previously accepted D4 A+B as **fresh changes** based on reference source and accepted specs; **do not merge/rebase/cherry-pick the old divergent experimental or private D4 branch wholesale**. Keep feature server default-off. Local-only experimental agent MCP overhead may remain temporarily but must be measured and recorded, NEVER treated as public shipping.
- **H — bounded hardening of that local candidate:** **NEW conditional permission** only when R earns complete G-R pass. On a separate new owned isolated branch/worktree from the **reviewed R candidate tip**, implement a minimal **D2 agent-facing shipping-schema exclusion prototype** using existing fork abstractions (internal operator continuation authority retained; agent-facing task input/output schema omits experimental continuation), and run additional **K3 restart/crash/pruning and provider-neutral stub tests** in disposable, isolated temp homes when technically feasible. This is research-quality local hardening, **not approval of a public shipping build or a final architectural decision**. Do not invent a new authority store, change public product behavior or weaken accepted release checks.

**No fourth stage.** If H passes, compile one complete integration-readiness dossier and **STOP** for user/manager review. No push, PR, merge to fork main, actual public build release, deployment or production enablement. Do not silently start more upstream syncing, run provider-paid live tests or create a different project.

**Explicitly superseded only to this extent:** older docs say that *any* continuation re-land requires separate user approval. The 2026-11-06 instruction **now grants one conditional local-only R re-land prototype** after G-U; it **does not** authorize final re-land into fork `main`, main integration, public Git push, or production.

## 2. Source freeze, repos and worktree isolation

**Latest browser-checked at amendment creation:** fork `jermur788/t3code` `main` `fb67545d790c5c001e8f85827f219ab6493c435e`; upstream `pingdotgg/t3code` `main` `79ee39fdcbb8638e625a05cd26f4f92e5d6a9319` (18 newer commits since previous 2026-11-05 upstream check); old experiment `experiment/continuation-default-off-gate-20261104` `b3b8da54e0b8b184a1cf4e667d53e73e04f85074`. Local unpushed D4 implementation reported at `f68db477a053bfe0211c6d92bf116711c1d55371` and remains local-only. All SHA identifiers are internal checkpoints, not permission to move any existing branch.

**At actual execution:** fetch and verify live remotes and owner/dirty/ownership/disk, select the **exact current upstream tip once for U**, record it and **FREEZE** for this overnight run. If upstream advances afterward, record a drift note; **do not auto-chase further upstream commits** or restart U. If fork `main` changed since the last verified checkpoint, inspect differences and stop for conflicts with user's concurrent code. Never overwrite user work.

One writer per stage; stages run **in order**, with **different new owner-isolated worktrees**, not simultaneous overlapping writes. U/R/H build caches, temp DBs, process IDs and artifacts isolated. Preserve primary checkout, stale local main, experimental D4 branch, four detached Stage 2 worktrees, evidence ledgers and read-only Files mount. No `git reset`, `clean`, `stash`, force, rebase of existing owner worktrees, branch deletion, unmount, shared history rewrite, push or artifact publication. Local commits on new stage branches only. Fetching remote-tracking refs without moving user branches is permitted.

## 3. Measurable G-U (upstream trial → re-land) gate

**DeepSeek may automatically authorize R only if ALL are evidenced:**

1. U worktree owned/clean (other than known isolated evidence), exact upstream tip frozen and incorporated in **new local candidate**, fork baseline preserved; **zero unresolved Git conflicts**, and a complete upstream commit/file inventory recorded (not truncated GitHub compare). All touched fork Runtime, Evidence V0, profiles/modes, persisted task/handoff/revision and orchestration ownership invariants preserved.
2. Required typecheck, formatter/linter/changed-file checks and relevant server/provider/DB/MCP tests run **exit 0**. Existing baseline failures may be classified separately **only** with reproducible same-base proof and independent reviewer agreement; no acceptance of new failures. No tests weakened/disabled simply to pass.
3. Persistence/restart and project isolation verified at scope required by trial spec; command-receipt/idempotency and provider-neutral stub coverage where practical; **no experimental continuation code/MCP field accidentally imported**. If upstream touched web UI, a **rendered UI inspection** is required; if unavailable, gate does NOT pass.
4. Different provider/model independent **read-only REVIEW PASS with zero unresolved critical/high or material medium findings**. Upstream conflicts and their resolutions explicitly reviewed; no unreviewed new migration/security/provider authority change.
5. D2 shipping main baseline has no experimental `continuation` field in tested agent-facing input/output schemas. Distinguish source-level and packaged/authenticated evidence; **do not invent shipping VERIFIED**.

**If G-U fails:** allow bounded routine repair/re-review on U (Section 6); do not create R code worktree. Stop on architecture/authority conflict, unverified critical check, or review blocker.

## 4. Measurable G-R (fresh continuation + D4 → hardening) gate

**DeepSeek may automatically authorize H only if ALL are evidenced:**

1. R is a **new clean isolated branch derived from reviewed frozen U candidate**. Differences from U are **fresh bounded changes**, not a raw divergent branch merge. Preserve Project Runtime provider-neutral semantics and D1 default-off gate. No new authority DB/epoch/migration, public MCP capability enablement or material upstream engine redesign; if needed, stop for user product decision.
2. **D4 A+B K1 and K2 re-demonstrated on R's actual server-root assembly**, with true operator `continuation:null` revocation, transactional no-new-`run.created` (0 new runs/effects/accepted receipts) and natural `schedulePreparation → prepared-run.release` prevention, including typed denial, idempotent replay and `reconcile_required` preservation. Required focused/concurrency/cross-project/ordinary-user regression tests exit 0; no automatic external provider-start atomicity promise.
3. Default-off disabled server performs **no continuation automatically** in normal test config. Internal operator-only authority cannot be minted through agent/MCP/task content. Confirm no D1/D3/D4 regression and no tests weakened.
4. Source-level and built/source-loaded `tools/list` measurement explicitly records any **experimental D2 agent schema exposure**; on local unmerged R it is a known release blocker, **not authority to ship**. H must address it. If tooling cannot even measure or enumerate tool schema with supported auth/testkit, stop for blocker rather than assuming pass.
5. Relevant repo/source server/typecheck/changed-file tests exit 0, rendered UI if modified, and independent **different-provider read-only REVIEW PASS** with no unresolved material findings. Review the **actual adapted R diff**, not only the old isolated D4 handoff.

**If G-R fails:** bounded repairs/review within R permitted; do not start H. Material upstream execution/authorization redesign or change in accepted A+B contract is a hard stop.

## 5. Measurable G-H (bounded D2/K3 hardening → stop) gate

Within a new H worktree, **limited authorized work**:

- D2: explicitly separate internal operator-only `continuation` state from agent-facing task create/update/result MCP JSON schemas, preserving Runtime authority and normal tasks. Prefer minimal upstream-friendly task schema projections where present, not a new public API. Obtain **actual built server/tool-list output**, no `continuation` in agent advertised input **or output** paths, and measure tool count, field paths, UTF-8 bytes/context budget compared with the exact matching U shipping baseline. **Added continuation-schema byte overhead in the agent-visible shipping baseline must be zero**. If a true packaged paired-client/authenticated MCP check is unavailable, classify **`D2 PACKAGED SHIPPING NOT VERIFIED`**, even if source/mock tests pass. This does **not** authorize actual public shipping.
- K3: run safe process restart/crash recovery and history-pruning/idempotent replay tests **only against disposable temp processes and DBs**; never kill a user service, change persistent real T3 Runtime state, or write/read PR #21 evidence. Use adapter-independent stubs for two providers where possible. Preserve honest `incomplete/unknown` Evidence V0 and no resurrected execution after revoke. If credentials/test harness unavailable, mark **OPERATIONAL BLOCKER / PARTIAL**, do not bypass authentication.
- Static, focused runtime, cross-project, default-off, ordinary-user regression tests and distinct-provider read-only review required for any claim of H `RUNTIME PASS`. No destructive test against user's live DB, no production claim.

**G-H completion target:** `ISOLATED INTEGRATION-READINESS CANDIDATE / REVIEW PASS` with precisely scoped D2/K3 test verdicts. **If D2 packaged check or K3 crash/restart remains partial, call it PARTIAL, not RELEASE VERIFIED**. Either way, **STOP after H** and return a single combined handoff; do not auto-merge, push or deploy.

## 6. Repair/resource budgets and unattended routing

- Orchestrator: **DeepSeek V4.1 Flash COORDINATION ONLY**. It cannot execute shell tests, author source edits, implement, or review; route technical changes/test execution to **Codex GPT-6.1 SOL Medium** or **Claude Sonnet 5.5 Medium** only. Independent **different provider/model** for read-only review. If only same-provider reviewers are available, **stop advancement at the gate** (still record findings), not substitute an independence claim. No Opus or material paid calls without user approval.
- **At most two bounded repair → retest → independent re-review cycles PER STAGE** after the first implementation/test pass. Track each distinct failure; routine defects may be fixed, but never weaken tests to pass or hide findings. If unresolved by cap, stop with classified blocker and exact continuation packet. 
- **At most 18 technical worker/reviewer dispatches TOTAL** across U/R/H in this overnight run (including first tests, reviews and repairs); DeepSeek calls minimized given previously reported limited allowance. On limit, stop, save task/evidence and report. Never invent token allowance/reset times or bypass provider limits.
- Check each provider subscription's actual **AVAILABLE/BUSY/COOLDOWN/LOGIN-UNAVAILABLE/UNKNOWN**, requested and actual model/effort, real five-hour reset reported or `UNKNOWN`. When quota hits, checkpoint and use *another permitted, available* provider; if no independent reviewer capacity exists, stop at gate. No pretending to schedule unattended resumption; continue only if the actual T3 Code host supports supervised in-session dispatch and result collection.
- Every stage/attempt: write authoritative **T3 Project Runtime task/attempt/handoff** if available. Otherwise append to a **new, restricted local evidence ledger** outside source worktrees, with UTC, owner, exact branch/base, command exits, failure/review results, quotas and next gate. The GitHub planning branch contains specifications only; **no private logs/evidence/sensitive paths/tokens** should be pushed. DeepSeek may move to next stage only after reading actual worker + reviewer evidence, not worker self-assertion.
- **No fabricated async promise:** a Markdown amendment is not an active agent or automation. It cannot start local workers by itself. Continue autonomously only while an existing supported T3 Code process/session genuinely runs; otherwise return a restart-ready handoff.

### 6.1 Mandatory decision-by-decision routing ledger (user clarification, 2026-11-06 00:21)

**The DeepSeek orchestration chat MUST persist its OWN routing decisions, not merely worker final results.** For **every proposed, selected, rejected, deferred, retried, re-routed or escalated** technical-worker/reviewer assignment, append a durable entry **before dispatch if possible**, then append the observed outcome immediately on return. Include:

1. UTC timestamp; U/R/H stage; task and attempt identifiers; exact local base/worktree owner; current gate and remaining total/cycle budget.
2. **Routing decision** (dispatch, retry, swap provider/subscription, postpone, stop, independent review), selected provider/model/subscription **non-sensitive alias**, requested and actually observed reasoning effort; any considered alternative that materially affected choice.
3. **Reason:** task difficulty/risk and model fit, estimated/observed resource cost or UNKNOWN, subscription remaining quota/reset/cooldown from actual provider telemetry or UNKNOWN, independence from implementation author, worktree ownership/conflict constraints.
4. Dispatch status, actual provider result/error/timeout/rate-limit, test/review evidence refs and exits (as applicable), acceptance verdict, corrective action, next authorized task or reason for stopping.
5. All gate promotions: reference the exact U/R/H checklist, test outputs and **independent reviewer** result; record who/what authorized promotion. A self-reported worker DONE is never sufficient.

**Durability target:** authoritative T3 Runtime task/attempt/routing/handoff records if supported; otherwise a **restricted local append-only routing ledger** under the existing overnight evidence owner, not a source worktree. Never claim a Runtime write succeeded without checking the result. If a real durable ledger write is unavailable, **stop before the next worker dispatch**, report `OPERATIONAL BLOCKER: ROUTING LEDGER UNAVAILABLE`, and return a restart-ready handoff. Chat text alone is **not** an acceptable ledger. Do not copy private routing logs or account details to the public GitHub repository.

**Audit rule:** stage completion must include ledger continuity (every dispatch and review accounted for), actual-versus-requested effort, subscription selection/re-routing reasons, and accurate quotas or UNKNOWN. The Overall Manager may publish sanitized high-level **state summaries** on the planning branch; the local T3 Code orchestrator is responsible for writing the actual host-local ledger. This ChatGPT browser session does **not** have direct access to that local ledger.

### 6.2 Post-U reconciliation, 2026-11-06 00:27 — timeout-equivalent coverage and routing gate

**Latest stage evidence:** the upstream U local trial returned a clean candidate with all **367 affected test files executed and passing in 29 independently manifest-checked batches**, 39/39 fresh workspace typechecks, relevant static phases, bounded real-server restart/persistence/RPC, bounded rendered web smoke and different-provider `REVIEW PASS`. The monolithic `check:changed` wrapper exited 1 **only because the 367-file test phase exceeded its 900-second ceiling**. This **must never** be called a green wrapper. The manager accepts **the exact complete affected-file set plus the separately passing static phases** as **equivalent bounded trial coverage** without weakening or skipping a test; label `G-U TECHNICAL PASS WITH TIMEOUT CAVEAT`. If any part of the manifest was not actually run, later test failures were hidden, or reviewer cannot establish equivalence, `G-U` is **FAIL/HOLD** and R cannot start.

**Mandatory routing audit remains:** User's later §6.1 requires a durable record of DeepSeek's actual routing decisions. The U return identifies a private ledger and reports 3 Codex dispatches + 2 Claude reviews, **but the browser manager cannot inspect the ledger contents**. Consequently **`G-U FINAL PASS` is ON HOLD**, despite accepted technical evidence. Before the FIRST R worker dispatch, DeepSeek must examine that ledger and connected Runtime task history, account for all 5 decisions, append accurate contemporaneous/retrospective classifications and an evidenced gate signoff. If the durable ledger cannot be accessed/written, **STOP** as operational blocker; do not promote a chat narrative to project state.

**Frozen source:** U was deliberately built against upstream `25b53299b75d4d8d1d0667ad47e9cfed3749776e`. Browser-checked current upstream is **22 commits newer**. Under the overnight freeze, **do not auto-sync those extra commits**, reset U or restart its already passed tests. R, if authorized after routing audit, starts from the **reviewed local U candidate**, not moving upstream main.

**Next exact coordinator handoff:** [U→R mandatory routing audit](handoff-upstream-to-r-routing-gate-20261106.md). This check is **coordination-only** and must not be mistaken for permission to push, merge, rebase original D4 branches or run paid calls. If the last U handoff says separate owner approval for re-land, note that the later user overnight amendment **already conditionally authorized a local-only R prototype**, but **not** fork-main integration; the routing gate must still pass.

## 7. Non-negotiable hard stops

Immediately stop and return to user/manager for **PRODUCT DECISION / INTEGRATION CONFLICT / UPSTREAM COMPATIBILITY / SECURITY REVIEW REQUIRED / OPERATIONAL BLOCKER** on any of:

- Main branch writes or merges, Git push/public PR/upstream publication; release or production enablement; autonomous operation of a real external provider under new feature.
- New authority table/epoch or migration, material orchestration/provider/session internals redesign, major public contract change, disabling/muting security authorization, or an unresolvable concurrency race.
- Destructive Git, deleting/remounting worktrees/Files, killing live services or writing real user DB, exporting private PR #21 evidence, external credential access/bypass or paid API spend.
- Fork main/uncommitted work ownership changes under task; source conflicts that cannot be resolved without discarding others' modifications; failed/missing critical tests; unresolved material independent review finding.
- Provider quota exhausted with no compliant worker/reviewer, timeouts/host no longer supports in-session continuation, or technical dispatch/repair cap reached.

Do **not** advance because a worker says `DONE`; advance only if the exact **G-U or G-R gate evidence** was checked and recorded. No gate can be waived by a worker without a new user product decision.

## 8. Final morning handoff / stop

Produce one durable handoff **`OVERNIGHT U/R/H VERDICT / EXACT FROZEN BASES / WORKTREES & OWNERSHIP / STAGE RESULTS & TEST COMMANDS/EXITS / INDEPENDENT REVIEWS & REPAIRS / D4 K1 K2 / D2 TOOL SCHEMA BYTE DIFF / K3 RECOVERY / QUOTA & COST LEDGER / UNRESOLVED FAILURES / INTEGRATION STATE / RECOMMENDED NEXT PRODUCT DECISION`**. User-facing summary should not include opaque SHA IDs; keep internal IDs in restricted ledger and canonical docs as needed.

**Final state remains `NOT INTEGRATED / NOT PRODUCTION VERIFIED`**, regardless of isolated candidate quality. The user can then review a fully prepared and independently checked candidate before any future main merge or public shipping approval.
