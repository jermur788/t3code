# D2 — Shipping-surface exclusion: browser source audit and local build test plan

**Date:** 2026-11-05.  
**Status:** ANALYSIS COMPLETE (browser source inspection); **BUILT-ARTIFACT VERIFICATION NOT RUN**. D2 requirement is user ACCEPTED, but any implementation technique for eventual integration remains a separate design choice.  
**Sources:** [accepted staged safety spec](continuation-staged-safety-governing-spec-20261104.md), [T4 research](https://github.com/jermur788/t3code/blob/experiment/continuation-default-off-gate-20261104/docs/orchestration-v2/staged-continuation-t4-strict-revocation-and-shipping-20261104.md), [Current State](../../01_CURRENT_STATE.md).

## What browser inspection establishes

- The current fork `main` is the merged upstream reconciliation + P2 fix, while continuation code resides on isolated `experiment/continuation-default-off-gate-20261104`. The experimental branch is **34 commits ahead and 336 commits behind current main** in GitHub's comparison, so rebase/merge assumptions are invalid.
- The experiment modifies shared `packages/contracts/src/projectRuntime.ts` with optional `continuation` fields on Project Runtime task read/create/update schemas and a new continuation enum/type. `apps/server/src/mcp/toolkits/project/runtimeTools.ts` imports the task create/update schemas and assembles agent tool definitions, so the advertised input schema can change **even if the feature is server-gated off**. Other shared surfaces (WebSocket, mobile, desktop) may depend on these types and must be inventoried before a merged implementation.
- Worker history measured an experimental **+646-byte** agent-facing MCP `tools/list` delta. This is earlier reported evidence, not remeasured on current reconciled main. A default-off runtime gate does not itself remove advertised schema fields or prompt overhead. D2 requires **no exposed experimental continuation schema/tool fields in public shipping artifacts**, and no unapproved prompt-budget increase.
- The chosen D2 implementation does not have to be active for current fork `main` while continuation stays isolated. **The fork main baseline still requires an actual built-tool-list check before any public release**; do not claim it already passed merely because branch-specific source is absent.

## Viable shipping strategies and trade-offs

**A. Branch/source exclusion (preferred until D4 is accepted and integration is authorized):** continue keeping all experimental continuation code/contracts off fork main and out of release builds. Lowest current risk and no upstream tool-schema edits; however, the feature is unavailable to main and eventually integration must be revisited. Test built shipping artifact to confirm.

**B. Build-selected contracts/tool schemas:** if the user later approves integrating a default-off feature, construct separate internal continuation-capable contracts and a shipping-safe, explicit MCP advertised task schema that omits `continuation` regardless of runtime flag. Avoid trusting static TypeScript erasure or a runtime feature gate to remove JSON Schema. Requires testing all output surfaces and code generation; may introduce maintenance/rebase cost.

**C. Release-time source code stripping:** run build tooling to omit experimental continuation paths before packaging; can avoid schema deltas but has divergent build trees and difficult assurance. Do not approve or implement without a defined reproducible build/CI guard.

**Not acceptable:** leaving continuation fields in the agent-facing MCP tool list while returning `continuation_disabled` at runtime; a static string search as the only test; silently counting prior experimental +646 bytes as approved public overhead.

## Local worker verification needed (read-only / stub)

1. On exact fork main and exact isolated experiment in two **separate, owned, clean worktrees**, inspect generated/schema-emission code, built MCP tool list, contract types, context budget and provider adapter advertising. Confirm origin refs and no overlap with other workers.
2. Build and launch **local stub/no-cost** server instances in each worktree; capture complete `tools/list` JSON (sanitized) from genuine tool enumeration, with exactly the same provider configuration and auth context. Exclude tokens/credentials from captured artifacts.
3. Validate tool names, optional properties, nested continuation fields, response/runtime task schema exposure, and actual serialized bytes (not only code size). Compare matched source baselines while accounting for legitimate upstream changes; source and build snapshots separately. Identify all client surfaces reusing these contracts.
4. Check `agentContextBudget.json` and the test that guards prompt/tool-schema budget. Identify whether current shipping main has any accidental experimental schema leak; if found, classify as `IMPLEMENTATION DEFECT` and report to manager, **do not modify main**.
5. Run targeted tests/compile to check that removal of agent-facing continuation fields does not prevent operator-only internal authority or mutate normal Runtime task creation. This can be a **test proposal**; do not implement an architecture-dependent schema split without accepted design.
6. Return the actual built-tool-list diff/hash, measured bytes, provider/configuration conditions, verification commands/exits, risks and a recommended minimal shipping strategy. Use different-provider independent read-only review.

## Release gate

To mark **D2 shipping exclusion VERIFIED** on a particular public build, capture:
- exact shipping source/ref/build profile and **built** server's `tools/list`;
- no experimental continuation authority/tool fields anywhere in agent advertised surface;
- measured prompt/tool-schema budget compared against the accepted shipping ceiling (no default-on or +646-byte accidental promotion);
- non-continuation Project Runtime task creation/read/update and MCP tools still functional;
- independent review and reproducible automated build test.

D2 is a **future public release requirement**. **No public release is authorized**. No change to fork main, branch inclusion, upstream APIs or production settings is authorized by this audit plan.

## 2026-11-05 source-loaded MCP audit return — scoped PASS, no packaged release verification

[Manager's three-lane reconciliation](manager-stage2-three-lane-return-reconciliation-20261105.md) records worker-reported independent review **PASS WITH FINDINGS**, corrected. Actual `tools/list` from production-transport source loaded against **mocked services** reported **79 tools** on both main and experiment, with **+646 UTF-8 bytes in the agent-context budget** (56,753 vs 57,399), **+323 bytes** per task-create/update input schema for optional continuation, four task output schemas **+351 bytes** each outside the budget formula and other unrelated byte drift. Committed budget 58,519 vs 59,165; raw JSON size 187,026 vs 189,796. The source-loaded main tree advertised no experimental continuation field; the isolated experiment's field was exposed **even with the server gate disabled**.

**Qualification:** This is **`D2 SCOPED AUDIT PASS (worker-reported)`**, **not `D2 SHIPPING VERIFIED`**. The handler registry/services were mocked, and neither packaged public-release server nor real paired-client authenticated tool enumeration was tested. Actual shipping release acceptance therefore **requires a built/packaged artifact with supported, genuinely authorized paired-client enumeration (or an equivalently faithful production-auth integration harness), plus a reproducible schema-budget gate**. Manager will not waive that requirement based solely on mocked registry enumeration.

If experimental continuation is later approved for integration, **strategy B** (explicit shipping-safe agent MCP projections that omit operator-only `continuation` in the relevant create/update/success schemas while preserving internal authority) is a recommended approach, not an approved source change. Keep experimental code isolated for now, or public shipping must exclude it entirely.

