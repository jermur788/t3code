# Post-Merge Browser Reconciliation Result — 2026-11-02

**Lane:** Browser / GitHub only  
**Verdict:** `REVIEW PASS (BROWSER RECONCILIATION)`  
**Project integration state:** `INTEGRATED / POST-MERGE REPOSITORY PASS / CI EXCEPTION ACCEPTED / POST-MERGE RUNTIME RE-RUN PENDING`  
**Explicit non-verdict:** this result does **not** claim `VERIFIED`.  
**Scope guard:** no new upstream merge was started or prepared for integration.

Governing sources:

- `docs/internals/arm-v2-compatibility-evidence-gap-spec.md`
- `docs/internals/upstream-sync-20261031-handoff.md`
- PR #14
- `docs/internals/post-merge-browser-handoff-20261102.md`

## 1. Base / checkpoint

Fork repository: `jermur788/t3code`

Current fork `main` observed during this lane:

`8f1b8742251446d67bab1c6ae983140db82a23d9`

Commit:

`docs(sync): record upstream reconciliation integration`

Integration anchor:

`19b128fec7be89ffe5689f4d7234121992479710`

Qualified candidate incorporated by PR #14:

`e51c1c5d74aed9824927d391590ddb33026c8d56`

Pinned upstream incorporated by that candidate:

`80a2351fcb909034e65a512dfabeb3cdfd367762`

Browser handoff branch at lane start:

`handoff/post-merge-verification-20261102 @ d9e1254b850cf291208c587262cb09a48a973343`

The handoff branch is documentation/coordination state only. This lane did not mutate fork `main`.

## 2. PR #14 / integration reconciliation

PR #14 is closed and merged. GitHub reports:

- base: `main`
- exact head: `e51c1c5d74aed9824927d391590ddb33026c8d56`
- merge commit: `19b128fec7be89ffe5689f4d7234121992479710`
- merged at: `2026-11-02T00:26:02Z`

Current `main` remains the documentation-only state update immediately after that merge (`8f1b8742...`).

### Review history reconciliation

PR #14 has **no unresolved inline review threads**.

The material review sequence is internally reconciled:

1. earlier static review passed on `5c394a5e...`;
2. a later delta review found one real ARM execution-provenance defect on `f68e6078...`: a concrete adaptive `runId` could be accepted when the linked Runtime attempt had no recorded run;
3. repair `b1e7d24bf442b2dfd072da775fd69aa64e7c5452` tightened the bridge so execution provenance is accepted only when the Runtime attempt exists, thread identity matches, the attempt has a non-null recorded run, and the supplied run matches it;
4. the final combined head `e51c1c5d...` received `REVIEW PASS (DELTA + ASSEMBLY)` with no blocking static finding;
5. the exact candidate later received the accepted Local L2 runtime/UI/restart qualification recorded in PR #14 and the canonical upstream-sync handoff before merge.

No unresolved review finding was discovered in this browser lane.

## 3. GitHub Actions non-dispatch investigation

### Observed facts

The repository contains `.github/workflows/ci.yml` and many other workflow files.

The current `CI` workflow declares:

- `pull_request` with no branch/path filter;
- `push` to `main`;
- repository-aware runner selection that uses ordinary GitHub-hosted Ubuntu runners on `jermur788/t3code` rather than Blacksmith.

The fork CI compatibility documentation explicitly describes normal PR/main qualification on standard GitHub-hosted runners for this personal fork.

GitHub Actions API reads returned **zero workflow runs** for all three relevant SHAs:

- qualified candidate `e51c1c5d...`;
- integration merge `19b128fe...`;
- current fork head `8f1b8742...`.

Commit status reads likewise returned no statuses for the integration/current heads inspected.

The repository does have historical Actions state: the Actions run collection reports 61 historical runs, with the newest visible run in the returned recent set dated `2026-10-27`. Therefore this is not a repository that has never had Actions activity.

### Explanations ruled out or weakened

**High confidence — not a CI path/branch filter issue.** The CI workflow should trigger for every PR and every push to `main`.

**High confidence — not merely a Blacksmith runner-label queue problem.** The fork compatibility layer maps normal CI jobs to GitHub-hosted runners. More importantly, a runner-availability problem would normally create a workflow run/job that then queues; here no workflow run exists for the candidate, merge, or current head.

**High confidence — not a missing-workflow-file explanation.** `ci.yml` is present on current `main` and has the expected trigger block.

### Remaining explanation / confidence

**Root cause remains `UNKNOWN` from the browser connector.** The available GitHub connector does not expose the repository Actions execution-policy/settings endpoint needed to prove the current repository-level toggle or policy.

The leading hypothesis is:

> repository-level Actions execution is disabled or otherwise restricted for this fork.

Confidence: **medium-high as a hypothesis, not an observed fact**.

Why: the zero-run pattern affects the exact candidate, merge commit, and current head despite eligible workflow triggers; historical runs exist; and project state previously recorded that Actions were disabled on the fork. A GitHub-side operational/policy condition remains possible.

### Status consequence

No project status changes.

The accepted CI exception remains exactly that: an accepted operational exception. It is **not** a CI pass and supplies no basis for `VERIFIED`.

## 4. Current upstream delta

At `2026-11-02T07:27Z`, current upstream `pingdotgg/t3code main` was observed at:

`d01b92c0613936e5204ea2787a9ed6bf7d1ff547`

Compared with the incorporated pin `80a2351f...`, GitHub reports:

- status: `ahead`
- upstream ahead by: **453 commits**
- upstream behind by: 0

The prior browser handoff's `448` count was therefore already five commits stale by this refresh.

This is a **new forward-sync delta**. It does not retroactively invalidate PR #14's pinned qualification, and this lane did not start a new merge.

## 5. Bounded next-sync risk map

This is targeted triage of ARM/orchestration/provider/capacity/rebase-sensitive changes, not an exhaustive review of all 453 commits.

### A. Orchestration V2 lifecycle and delegated completion — HIGH

`aac4c15522611288362449e26154752dfb888c79`  
`fix(server): delegated tasks finish even when the child leaves a watcher running (#27468)`

**Classification:** `UPSTREAM IMPLEMENTATION`

Material change: delegated completion now distinguishes background work that actually holds completion from non-awaited monitor/watch work. It touches V2 orchestrator and subagent projection semantics.

**Fork relevance:** Runtime execution/reconciliation and ARM outcome/provenance must continue to reflect actual upstream lifecycle state rather than a fork-owned interpretation.

**Required later check:** focused V2 delegated-completion/restart tests plus fork Runtime execution/reconciliation tests.

---

`5731c0222a977656ea96f3bf8082f0a7007d0ed8`  
`fix(server): queued delegated completions keep a newer model choice (#22579)`

**Classification:** `UPSTREAM IMPLEMENTATION`

Material change: a queued delegated-completion continuation follows a newer thread model/provider selection made while it was waiting.

**Fork relevance:** directly relevant to ARM requested/selected/executed provenance and route attribution across continuation.

**Required later check:** prove fork provenance records do not conflate original route, later thread selection, and actually executed continuation.

---

Open PR #21877, `fix(server): keep follow-up tasks pending until nested work finishes`

**Classification:** `UPSTREAM COMMUNITY/PR WORK — NOT CURRENT MAIN`

It remains an active nested-delegation/lifecycle design signal only. Do not code against it as shipped behavior.

### B. Execution identity / Codex thread context — HIGH

`fa31b66bbb2ae5234205a8628a78e038d917202f`  
`fix(server): Codex sessions get T3CODE_THREAD_ID like Claude sessions (#28604)`

**Classification:** `UPSTREAM IMPLEMENTATION`

Material change: Codex thread start/resume/fork paths now carry the T3 app-thread identity through per-thread shell configuration.

**Fork relevance:** directly adjacent to the Runtime-attempt -> V2 identity bridge and future authoritative execution provenance.

**Required later check:** exact-thread identity across launch, resume and fork; ensure ARM continues to reference authoritative V2 identity rather than infer it from requested configuration.

### C. Provider-native subagent/runtime evidence — HIGH/MEDIUM

`ab8e488e10d883fa880b0ddcf01917b51839ab07`  
`feat(antigravity): runtime 1.4.5 with real turn failures and subagent work (#28629)`

**Classification:** `UPSTREAM IMPLEMENTATION`

Material change includes real provider turn-failure handling, native child-work inspection, usage accounting changes, RPC surface additions and provider-native subagent presentation.

**Fork relevance:** evidence/failure classification and provider-native child-work provenance; rendered surfaces may also overlap Workspace/thread presentation.

**Required later check:** adapter/provider failure mapping, native-child evidence projection, affected RPC authorization, and rendered thread/subagent UI where fork layers overlap.

### D. MCP delegation/capability reconciliation — HIGH

`4c9189275aef34290df831b5596aa3c9fff1498c`  
`fix(server): delegate_task accepts the inherited options orchestrator_capabilities reports (#28133)`

**Classification:** `UPSTREAM IMPLEMENTATION`

Material change: inherited model options are reconciled against the current model's advertised option descriptors before delegation.

**Fork relevance:** overlaps a known rebase hotspot (`OrchestratorMcpService`) and reinforces the governing boundary that eligibility/capability is upstream operational truth while ARM recommendations remain advisory.

**Required later check:** MCP provider resolution, inherited options, fork eligibility helpers and recommendation-not-authorization behavior.

Other post-pin MCP changes worth tracking include:

- `23075af...` — Codex direct-only T3 MCP server renamed `t3-code-direct`;
- `f5fe88bc...` — MCP calls skip the caller's message history;
- `f1e2e5d...` — ACP MCP calls no longer wait behind a long call.

These are `UPSTREAM IMPLEMENTATION`; treat them as medium/high rebase surfaces rather than independent fork features.

### E. Usage-limit recovery / persistence — HIGH

`63b0e3d82ee1c1a3bc1d0bc4950d4dfe03b402c9`  
`fix(server): do not freshly arm days-old usage-limit recoveries (#21735)`

**Classification:** `UPSTREAM IMPLEMENTATION`

Material change: stale usage-limit reset events older than the bounded recovery window are no longer freshly armed.

**Fork relevance:** ARM capacity records consume upstream operational usage-limit state; the fork must not invent a competing recovery policy.

---

`d7d5d7c79b704ea28d1e10f7b9bcc7bd525cd771`  
`fix(server): cleanup keeps worktrees waiting for a usage-limit reset (#24689)`

**Classification:** `UPSTREAM IMPLEMENTATION`

Material change: storage cleanup now preserves worktrees while usage-limit recovery/snooze/auto-resume can still continue the work.

**Fork relevance:** restart/persistence and execution reconciliation; premature cleanup would corrupt continuation evidence.

**Required later check:** usage-limit recovery plus worktree cleanup/restart tests, then fork ARM capacity capture against the same authoritative state.

### F. Account/model presentation and provenance — MEDIUM

Post-pin upstream also includes:

- `2c59bf66...` — subagent cards show which account each subagent runs on;
- `0343c83a...` — lineage/agent rows show the account used;
- `c65f8d55...` — thread UI shows model/effort switches.

**Classification:** `UPSTREAM IMPLEMENTATION`

**Fork relevance:** multi-account capacity presentation and model/provenance visibility. Reconcile rather than duplicate in fork Workspace/Development UI.

**Required later check:** rendered UI if these surfaces overlap fork presentation.

### G. Requested vs executed model attribution — IMPORTANT PROPOSAL, NOT MAIN

Open PR #27753 remains unmerged.

**Classification:** `UPSTREAM COMMUNITY/PR WORK — NOT CURRENT MAIN`

It continues to provide strong evidence that requested model and actual executed model can differ and should be separately represented. The fork governing spec already requires requested/selected/executed distinction, so no product-direction change is needed.

Do not treat PR #27753's fields as current upstream contracts until merged and re-inspected.

### H. Evaluation methodology — RESEARCH/PROPOSAL, NOT MAIN

Open PR #27138 remains an eval-only proposal for distinguishing threads, delegated tasks and native subagents.

Open PR #27123 remains a large proposal for per-model skills, local usage tracking and controlled paired ablations.

**Classification:** `UPSTREAM COMMUNITY/PROPOSAL WORK — NOT CURRENT MAIN`

Both are useful methodological input for future Adaptive Orchestration evidence work. Neither authorizes fork implementation.

### I. Latest five-commit movement since the prior handoff

The five-commit increase from 448 to 453 includes:

- `d01b92c0...` — CLI startup/perf; low relevance to current fork gate;
- `30654b3e...` — thread tagging/hiding while recording; UI/thread-list relevance;
- `ab8e488e...` — Antigravity runtime failures/subagent work; material as above;
- `c65f8d55...` — model/effort switch visibility; provenance/UI relevance;
- `0338e99f...` — desktop image save/copy; low relevance to current fork gate.

## 6. Risks / blockers

### Current blocker to stronger integrated status

`VERIFICATION FAILURE / EVIDENCE GAP` would be too strong because no post-merge test is known to have failed.

The correct current condition remains:

`POST-MERGE RUNTIME RE-RUN PENDING`

The accepted CI non-dispatch remains an `OPERATIONAL BLOCKER / EXCEPTION`, not a code failure.

### Next-sync risk

The 453-commit upstream delta contains real V2 lifecycle, provider adapter, MCP capability, identity and usage-limit recovery changes in the same general surfaces reconciled by PR #14.

That makes a future sync non-trivial, but no current product/architecture conflict has been proven. The existing compatibility spec remains suitable: adopt upstream operational semantics and preserve the fork's Project Runtime/ARM layers additively.

## 7. Exact local verification task packet

### TASK

Post-merge integrated-head verification of the already-merged upstream reconciliation.

### BASE

Start from current fork `main @ 8f1b8742251446d67bab1c6ae983140db82a23d9` unless inspected repository truth has advanced. If it has advanced, stop and reconcile the new fork delta before attributing results to this gate.

### GOVERNING SPEC

`docs/internals/arm-v2-compatibility-evidence-gap-spec.md`

### GOAL

Generate executable evidence on the actual integrated head sufficient either to promote the already-integrated reconciliation to the strongest justified status or to identify a concrete defect/blocker.

### REQUIRED CHECKS

1. Confirm clean checkout, exact fork head and integration ancestry (`19b128fe...` plus docs-only state update).
2. Re-run the focused Runtime/ARM test set at least equivalent to the accepted L2 scope; preserve exact counts/results.
3. Run affected server/contracts/web typechecks.
4. Re-prove ARM execution-provenance identity rejection/acceptance cases on the integrated head.
5. Re-prove migration/open/reopen/restart persistence for Runtime/ARM state.
6. Exercise Runtime Task launch/reconciliation through the normal provider/orchestration path where the environment permits it.
7. Recheck provider eligibility/routing boundaries and provider/capacity capture; no second launcher/poller/proxy route owner.
8. Recheck the rendered Workspace/Development and provider/capacity surfaces touched by the reconciliation.
9. Use multiple providers where practical; retain the existing real-two-Codex-subscription credential limitation explicitly if it still cannot be closed safely.
10. Record every unavailable check and why; do not convert missing evidence into a pass.

### ACCEPTANCE

Only promote the integrated reconciliation beyond `INTEGRATED` if the required integrated-head evidence passes at the scope claimed.

Do not claim CI pass. The accepted GitHub Actions exception remains separately recorded.

### HANDOFF

Return exact tested SHA, commands/checks, counts, rendered/runtime/restart evidence, failures/repairs, residual limits, working-tree state, and strongest supportable verdict.

## 8. Paired/shadow evidence phase — prepared, not launched

Do **not** launch this phase until the compatibility/sync gate has the required post-merge verification.

### Candidate low-risk task classes

Prefer tasks with cheap, strong, deterministic verification:

- read-only repository reconnaissance;
- static review against a fixed diff/spec;
- focused test/fixture work;
- bounded implementation with isolated ownership and deterministic tests.

Exclude high-consequence security, persistence, migration, concurrency/atomicity, destructive operations and weakly verifiable product behavior from initial exploration.

### Identical comparison brief

Each comparison arm receives the same:

- objective and governing spec;
- base SHA/input fingerprint;
- in-scope/out-of-scope boundaries;
- available context/source references;
- ownership and tool permissions;
- acceptance criteria;
- verification commands/standard;
- stop conditions.

Persist a brief/input fingerprint before dispatch.

### Pre-dispatch evidence

Record before either arm runs:

- task class/characteristics/risk;
- manager-predicted difficulty and uncertainty;
- normal selected route;
- shadow/paired alternative;
- requested and selected provider/model/options;
- capacity/context evidence and source quality;
- alternatives considered and reason selected;
- assignment method (`prospective`, `randomized`, `manual`, or `read-only duplicate` where applicable);
- policy/hints/scoring version;
- exact verification profile required.

### Post-run evidence

Record:

- actual executed provider/model/configuration or `UNKNOWN`;
- accepted/rejected/unresolved outcome;
- verification performed/result/strength/independence;
- defects found;
- repair/retry/salvage cycles;
- wall time and available resource proxies;
- provider/auth/capacity/network failures;
- manager/human coordination overhead;
- evidence references/provenance.

### Confounds / exclusion rules

Do not treat arms as capability-comparable when any material mismatch remains in:

- brief or context;
- tool/harness access;
- verification profile;
- hidden retries/repairs;
- model/configuration version;
- manager intervention;
- project/base state;
- provider availability/auth/capacity;
- actual executed model attribution;
- reviewer independence.

Provider operational failures remain real reliability evidence but should not silently become model-capability failures.

Observational results remain labeled confounded. Recommendations/hypotheses remain evidence, not active policy.

## 9. Integration state

No integration occurred in this lane.

- PR #14 remains merged.
- fork `main` remained `8f1b8742...` throughout the browser investigation.
- no upstream-forward-sync branch was created from current upstream.
- no new merge was started.
- no `VERIFIED` claim was made.

## 10. Next

### Immediate local action

Run the post-merge integrated-head verification packet above in a runnable checkout and return its durable handoff.

### Immediate browser action after local return

Browser Overall should consume the local handoff, inspect evidence proportionate to risk, reconcile the strongest supported status, and update canonical state. If the gate passes, the paired/shadow pilot may then be instantiated as a separate bounded evidence task.

### Upstream action

Keep the `80a2351f... -> d01b92c0...` 453-commit delta read-only until a separate forward-sync task is explicitly started after the present post-merge gate. Refresh upstream again at that time; do not reuse the 453 count as a future fixed pin.

### User action

None required now. No product/architecture decision is exposed by this browser reconciliation.
