# Upstream Forward-Sync Handoff — 2026-10-31

Status: `BLOCKED / INTEGRATION CONFLICT`

Governing spec: `docs/internals/arm-v2-compatibility-evidence-gap-spec.md`

## Repository state

Fork repository: `jermur788/t3code`

Current fork `main` after governing-spec integration:

`d971327934eeb79bed5b02e4477a5140615eacf0`

Isolated sync branch:

`sync/upstream-20261031`

Pinned upstream branch in the fork:

`sync/upstream-pin-80a2351f @ 80a2351fcb909034e65a512dfabeb3cdfd367762`

Original upstream source:

`pingdotgg/t3code main @ 80a2351fcb909034e65a512dfabeb3cdfd367762`

Historical merge base:

`e9236274a3a6e0c731a7df4092db1e686f039068`

At archaeology time the fork was 84 commits ahead and 636 commits behind upstream.

## Browser integration probes

### Moving-head probe — superseded

Draft PR #11 was opened from `pingdotgg:main` into `sync/upstream-20261031` to establish whether GitHub could merge the histories directly.

GitHub reported:

- `mergeable: false`
- `rebaseable: false`
- `mergeable_state: dirty`
- 636 upstream commits
- 2,564 changed files
- 140,284 additions
- 43,977 deletions

This proved a real integration conflict. Because PR #11 tracked moving upstream `main`, it was closed without merging after the exact inspected upstream commit was pinned inside the fork.

### Canonical pinned integration PR

Draft PR #13 is the reproducible integration lane:

- base: `sync/upstream-20261031`
- head: `sync/upstream-pin-80a2351f`
- pinned upstream commit: `80a2351fcb909034e65a512dfabeb3cdfd367762`

GitHub also reports PR #13 as not mergeable. This is the canonical PR to use while resolving the pinned upstream snapshot.

The sync branch was fast-forwarded to the post-spec fork main before final conflict classification.

## Confirmed overlapping moving surfaces

The following fork-modified files also changed upstream after the merge base. The SHA pairs below are merge-base -> pinned-upstream blob SHAs and prove concurrent movement.

### Orchestration instructions

`packages/provider-core/src/server/orchestrationInstructions.ts`

- merge base: `d78776eb7843939f000220dcf382c7d4e290b7dd`
- upstream: `70b3fff064f3bcab2202a26feecfeccebb3e6a38`

Fork adds Project Runtime behavior here, while upstream continues evolving orchestration policy. Resolve semantically; do not take either side wholesale.

### MCP orchestration service

`apps/server/src/mcp/OrchestratorMcpService.ts`

- merge base: `54c9717671087321b0244e0e2b5152b89346b452`
- upstream: `403d625d7e9b1db453cb80c7e911d1d3d356566e`

Fork changed this surface and upstream continues changing delegation/completion behavior. This is a high-risk conflict lane.

### Migration wiring

`apps/server/src/persistence/Migrations.ts`

- merge base: `f85cb14e309b13b7f5b3873747839a107feffb80`
- upstream: `1f3fb4bc6b8bca176bffd93ba3346996c780421b`

Preserve upstream migration evolution and the fork's separate migration ledger. Do not renumber or rewrite upstream migration history.

### Server composition

`apps/server/src/server.ts`

- merge base: `f461a99186b3172ea0eae963e61dc1cfadb1e320`
- upstream: `452addfb4a66792d04b30cf4763f0cbf3ca8ed4b`

Fork wires Project Runtime/Development Profiles/Runtime Routing services here. Upstream has changed server wiring since divergence.

### Contract export surface

`packages/contracts/src/index.ts`

- merge base: `38c28ab65a2bafa51945d656aa261b248fc9c934`
- upstream: `f00976d243b37d470fe9399aad6e6f11db858375`

Fork exports Project Runtime/Development Profiles/Runtime Routing/ARM contracts here. Preserve upstream exports and additive fork exports.

### RPC contract surface

`packages/contracts/src/rpc.ts`

- merge base: `1e191ec9ccbf9b9fc0fd5b667220a900aa368986`
- upstream: `37ea5866ae7337dad51ed12375fd59b0d0d253f0`

Fork adds Runtime/Profile RPCs. Reconcile against current upstream RPC composition rather than restoring the old base structure.

### Provider adapter contract

`packages/provider-core/src/server/ProviderAdapter.ts`

- merge base: `7c77b7bb0ac6fc17618eb1f068cee7966f160443`
- upstream: `cadf4173a60b17714ebdc0b1bc66006195a3326a`

Fork changed provider-context behavior while upstream continues evolving provider/orchestration capability surfaces.

## Other expected overlap lanes

Fork compare data also shows changes in:

- Orchestration V2 Claude/Codex/OpenCode adapters and tests;
- ProviderTurnStartService / RunExecutionService / runtime layer;
- workspace filesystem/search;
- provider eligibility/context budget/developer instructions;
- web Project settings/navigation/route tree;
- CI/release workflows;
- package/client-runtime contract and state wiring.

These must be classified during the real three-way merge rather than assumed safe.

## Fork-owned additive areas to preserve

The following architecture remains fork-owned unless a direct upstream replacement is proven:

- Project Runtime domain services and contracts;
- Development Profiles;
- Runtime Routing policy/resolver;
- Runtime task execution bridge and project-owned execution receipts;
- fork migration ledger and migrations 001–007;
- Adaptive Routing contracts/service;
- Workspace/Development presentation;
- fork operator documentation.

Their implementation may need adaptation to current upstream APIs, but the product behavior should not be discarded merely to resolve a merge.

## Upstream-owned facilities to adopt/reuse

During resolution prefer the pinned current upstream implementation for:

- Orchestration V2 execution lifecycle and identities;
- provider sessions/threads/context transfer infrastructure;
- provider capability/model metadata facilities;
- usage-limit sources and recovery;
- current delegation lifecycle semantics;
- current upstream tests/evals for those surfaces.

ARM should adapt to these rather than create competing infrastructure.

## Browser/environment limitation

The available GitHub API can:

- create branches/files/PRs;
- inspect commits/trees/files;
- report mergeability;
- merge conflict-free PRs.

It does not expose a safe multi-file conflict-resolution operation or the exact conflict-file set.

The execution container also cannot resolve `github.com`, so a local clone/`git merge` cannot be performed in this manager environment.

This is an `OPERATIONAL BLOCKER` to completing the three-way merge here, layered on top of the repository's real `INTEGRATION CONFLICT`.

No destructive/force update was performed.

## Exact next action in a runnable checkout

Use one writer on `sync/upstream-20261031`.

1. Confirm clean checkout/worktree and current branch ownership.
2. Fetch `origin`; fetch `upstream` if configured.
3. Verify:
   - fork `main` / sync base is at or descended from `d971327934eeb79bed5b02e4477a5140615eacf0`;
   - `sync/upstream-pin-80a2351f` still points to `80a2351fcb909034e65a512dfabeb3cdfd367762`.
4. Merge `sync/upstream-pin-80a2351f` (or the exact SHA `80a2351fcb909034e65a512dfabeb3cdfd367762`) into `sync/upstream-20261031` with a normal merge commit; do not rebase or rewrite shared fork history.
5. Resolve conflicts by authority:
   - upstream lifecycle/contracts/provider capabilities are the starting point;
   - reapply/adapt fork Project Runtime behavior additively;
   - preserve fork migration ledger;
   - preserve Runtime Task identity as project work identity;
   - map execution to current V2 rather than restoring stale V2 internals;
   - keep adaptive recommendation non-authoritative.
6. Run focused checks after each conflict lane rather than waiting for one giant final test.
7. Then run the full verification required by the governing compatibility spec.
8. Push only the resolved sync branch.
9. Re-evaluate pinned PR #13 after the merge result is pushed. Once the sync branch contains and verifies the upstream merge, close/supersede #13 as appropriate and open a separate sync-branch-to-`main` integration PR.
10. Do not merge to `main` until the integrated sync head reaches the required verification state.

## Verification required after merge resolution

At minimum:

- changed-package format/lint/typecheck;
- upstream orchestration tests affected by conflict resolutions;
- fork Project Runtime tests;
- Runtime Routing tests;
- Runtime Task execution/reconciliation tests;
- fork migration tests including 001–007;
- ARM contracts/migration/service tests;
- fresh database migration;
- restart/reload persistence proof;
- provider routing/eligibility checks;
- rendered Workspace/Development UI inspection where affected;
- multiple-provider qualification where practical.

## User decision

None currently required.

The conflict is technical and the accepted strategy already says to reconcile toward current upstream infrastructure while preserving the fork's product-owned layers. Stop for the user only if a concrete conflict proves those two goals cannot both be satisfied without a material product/architecture trade-off.
