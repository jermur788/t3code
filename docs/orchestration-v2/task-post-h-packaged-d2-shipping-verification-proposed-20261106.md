# PROPOSED TASK — packaged/authenticated D2 agent MCP release-schema verification

**Status:** **PREPARED / AWAITING USER AUTHORIZATION / NOT DISPATCHED / NO SHIPPING CLAIM**.  
**Parent evidence:** [final overnight U/R/H manager reconciliation](manager-overnight-urh-final-reconciliation-20261106.md), [Current State](../../01_CURRENT_STATE.md), [Coordination/Handoff Protocol](../../02_COORDINATION_HANDOFF_PROTOCOL.md), [staged safety governing spec](continuation-staged-safety-governing-spec-20261104.md).  
**Why next:** H provided **source-loaded tool-list D2 PASS** (82 tools/2269 paths/58799 UTF-8 bytes, zero continuation-attributable fields/bytes) but **NOT a real packaged authenticated agent MCP listing**. Closing that gap is a focused release-readiness gate, separate from any fork-main merge, Opus expansion, or real-provider K3 start/crash work.

## 1. Exact goal and acceptance

Demonstrate through **actual supported build/packaging and an authenticated agent MCP client session** that experimental continuation internals are **not** exposed in shipping agent-facing create/update/result schemas while the server's **operator-only** continuation policy can still create/read/update/revoke under correct authorization. Use the **same frozen U/R/H isolated code candidate** to start; do not merge anything to fork main or import old divergent experiment.

Required proof, with actual test harness and recorded artifacts:

1. **Preflight:** inspect exact local H worktree/head/base/status/owner, current package/client build scripts, supported authentication method and existing non-sensitive credentials. Preserve U/R/H and all other user worktrees and private PR #21 evidence. No live user DB/system service modification, no disabled security checks or credential bypass.
2. **Build and run packaged server/client:** use a **distinct disposable home, database, process and credentials/identity** created by supported test flow. Demonstrate that the actual distributable or production-equivalent package (not only TS/source-loaded toolkit) exposes the exact expected MCP tool list to a real **authorized agent client**, plus a rejected unauthorized control if supported. Capture tool names, parameters, results and actual serialized UTF-8 measurements against the matching frozen U shipping baseline.
3. **D2 schema assertions:** no experimental `continuation` in agent-visible task create/update/input/output and task listing/serialization; **0 continuation-attributable agent tool-schema bytes** relative to equivalent U baseline. Preserve unrelated `t3_worktree_handoff` delivery-status field. Agent must not be able to mint or alter operator continuation authority through tool parameters, conversation content, mutable task JSON or policy transport. Demonstrate operator-only create/read/update/revoke with correct authenticated authority, and a negative agent attempt.
4. **Behavior checks:** default-off; ordinary Runtime tasks unaffected; no unsolicited execution; project/task isolation and revision CAS preserved; outputs don't inadvertently leak continuation through another agent-visible surface. Avoid strengthening contract beyond accepted D1–D5. If schema projection differs in packaged environment from source-loaded results, classify release BLOCKER and repair only after explicit code-scope authorization if needed.
5. **Verification:** clean package/typecheck/changed-file static checks, relevant auth/MCP/Runtime suites and a **different-provider independent READ-ONLY review** of test outputs and any code changes. UI rendered inspection only if this task actually touches UI. Do not call a unit-test/mock fixture an actual packaged-client PASS.
6. **Durable handoff and ledger:** mandatory pre/post-dispatch T3 Runtime if supported, else verified restricted append-only ledger outside source. Record model/provider/effort/subscription/quota or UNKNOWN, source refs, tests/command exits, reviewer, secrets handling, exact `PASS / PARTIAL / BLOCKED`, new findings, no user data exposure.

**Disallowed:** Git push/PR/main merge, real-provider paid turn, production/default-on, new authority table or architecture rewrite, modifying live credentials/user DB, worktree destruction, private evidence copying or writing to public GitHub. A real cost/paid subscription or auth exception requires separate approval.

## 2. Routing (if user accepts this task)

DeepSeek V4.1 Flash **orchestration-only**; assign one bounded test/build worker from **Codex GPT-6.1 SOL Medium** or **Claude Sonnet 5.5 Medium** based on actual capacity, with **the other provider** read-only independent reviewer. User-confirmed prior Stage R Opus approval does not automatically authorize new Opus. Ask user only for credentials/cost/product permission if essential; never guess. Two ordinary repair cycles max if they fit **newly authorized** task budget; the finished overnight 18-dispatch budget was for U/R/H and **must not be treated as ongoing approval**.

If no supported real packaged/authenticated MCP client path can be exercised with safe included-cost credentials, report **`D2 PACKAGED SHIPPING NOT VERIFIED / OPERATIONAL BLOCKER`** with precise setup requirement, do not invent shipping PASS.

## 3. Completion and next decision

Return **`VERDICT / EXACT H SOURCE/BASE / PACKAGING & AUTH PATH / MCP tool-list source-vs-package byte/field diff / OPERATOR/AGENT NEGATIVE ACCESS RESULTS / TYPECHECK+TEST EXITS / INDEPENDENT REVIEW / ROUTING LEDGER / REMAINING D2 OR K3 RISKS / NO INTEGRATION / NEXT OWNER CHOICE`**.

Even a D2 packaged PASS does **not** authorize fork-main merge, live real-provider K3 safety testing, production, public release, or default-on. **The next distinct decision** is whether to run controlled real-provider K3 qualification, begin a separate isolated upstream-aware integration trial, or defer.
