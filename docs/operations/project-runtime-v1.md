# Project Runtime release and verification

Maintainer runbook for Project Runtime and Development Profiles. The pinned V1
evidence below is historical. The current tree is the pre-publish integration
candidate, rebased onto upstream and qualified by the pre-publish hardening gates.

## Baseline

- Integration branch: `integration/pre-publish-hardening`
- Original fork checkpoint: `60685b713f1432fd00ef9a72b617e21bb2ffdfba`
- Fork implementation baseline: `9bdcaa6399127908640c2cb53a344584c99743f6` (seven
  commits from `bfbd607a0b` through `9bdcaa6399`)
- Current upstream base: `5b35402623d7d1d88eaa472807272a6c2e78012a` (2026-10-25)
- Previous upstream base: `f9c1d023f1dad68360e19a8db89c9c485e2da410`

The current tree is a rebase onto upstream, not a pinned fork candidate. Do not
describe it as upstream T3 Code: it still carries fork-owned Runtime, Profiles, and
Project Home seams.

## Release checks

Before V1 may be called released:

- PRT-080, PRT-090, and PRT-100 have PASS verdicts for the pinned baseline;
- PRT-110 documentation has been independently reviewed;
- focused Runtime tests pass;
- the relevant Git/worktree/orchestration regressions pass;
- changed-file format, lint, knip, typecheck, and related tests pass;
- the tree is clean or every intentional change is committed;
- the documentation matches implementation truth;
- unresolved risks are recorded rather than omitted.

Do not claim a full repository test suite, build, Rust checks, release smoke, or
platform distribution from the targeted evidence below. Those were not run.

## Verification evidence

| Gate               | Evidence                                                                                                                                                                                                                                                                                                                                                   |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PRT-001 to PRT-060 | The seven commits are the implementation record. The user approved PRT-060; earlier design and gate records were not independently reconstructed, and no gate status beyond that approval is claimed here.                                                                                                                                                 |
| PRT-070            | PASS: 34 qualification steps. Claude Sonnet 5.5 wrote state, DeepSeek V4.1 Flash via OpenCode continued from it, stale writes were rejected, and state survived a server restart. Focused regressions: 87 tests in 9 test files. `check:changed`: 402 tests in 23 files, typecheck of 32 packages.                                                         |
| PRT-080            | PASS: 45 PASS, 0 FAIL, 1 INFO. Git, worktree, orchestration, and delegated-work regressions. Targeted logs: 498 tests across 16 test files (nine commands). `check:changed` as above. Independent DeepSeek and Sonnet reviews passed; the Opus run ended on a usage limit and produced no verdict.                                                         |
| PRT-090            | PASS: 27 PASS, 0 FAIL. The CCF fixture was a pinned documentation snapshot whose working files stayed unchanged. Fresh provider threads ran through instructions, sources, on-demand reads, task CAS, and handoffs. Corrected evidence is the review2 report; the original R1 failure is preserved. Same 498/16 targeted tests and `check:changed` counts. |
| PRT-100            | PASS: 56 changed files, +8,959/−76, seven commits. Runtime remains additive; one textual upstream conflict: the migration collision below. Independent Sonnet review passed.                                                                                                                                                                               |
| PRT-110            | Documentation and implementation reconciliation. Final checks, independent review, and candidate SHA are recorded in the release handoff; this page is not a release verdict.                                                                                                                                                                              |

Recomputed from the logs, the nine regression commands contain 498 tests across 16
test files: 3 + 39 + 104 + 13 + 19 + 38 + 46 + 207 + 29. `check:changed` separately
runs 402 tests in 23 files and typechecks 32 packages. PRT-070 used a smaller
87-test, 9-file subset.

These are targeted qualifications, not exhaustive proof. PRT-070's stale write was
deliberate, and Provider B received A's handoff through `t3_project_context` rather
than calling the handoff read tool. PRT-090 did not run an adversarial bad-handoff
or authority-conflict control, used full-access sessions without an enforced
history-access barrier, and its scoring included lenient keyword checks; cite the
corrected review2 report. PRT-080's agent-behavior probes cover two models with n=2
per scenario.

## Isolated verification

Run a sandbox server with its own home and no seeding:

```sh
vp run dev --home-dir <isolated-home> --no-seed
```

Use a fresh path for each qualification. Do not point a dev server at
`~/.t3/userdata`, do not open the live database read-write, and do not reuse a
database between this fork and an upstream build. Stop the sandbox server by the PID
captured when it started, not by matching a process name. Back up a database before
any migration or destructive check.

Qualification evidence lives outside the repository: hashed evidence manifests,
frozen review packages, probe output, and database snapshots. Keep them out of
commits. A manifest records the candidate SHA and hashes its inputs; verify the
hashes before trusting a verdict, and treat a summary as a pointer to the raw
records rather than a replacement for them.

## Migration model and supported upgrades

Fork-owned schema has its own ledger, `t3_fork_migrations`, and its own registry in
`apps/server/src/persistence/ForkMigrations.ts`. Upstream's `effect_sql_migrations`
stays upstream-pure. The fork migrations are `1_ProjectRuntime` and
`2_DevelopmentProfiles` under `Migrations/Fork/`. They add objects and may reference
upstream tables; they never alter or drop upstream objects.

On a full boot, the server reconciles only the exact historical fork ledger at
`(68, ProjectRuntime)` and `(69, DevelopmentProfiles)`. It validates the existing
objects against the shipped definitions, moves the recorded timestamps into the fork
ledger, writes an audit row to `t3_fork_migration_reconciliations`, and removes only
those two upstream rows. Then upstream's real 68/69 run, and the fork ledger is
verified. A malformed, partial, or ambiguous history fails closed without writing.

Supported transitions:

| Origin               | Result                                                                        |
| -------------------- | ----------------------------------------------------------------------------- |
| Fresh home           | Full upstream schema, then fork Runtime and Profiles                          |
| Upstream-origin home | Adds fork schema; upstream history is unchanged                               |
| Old fork home        | Preserves Runtime/Profile rows, applies upstream 68/69, moves ledger identity |
| Integrated fork home | No-op, then normal future migrations                                          |

`migrate-dev-db` uses the same path and verifies both ledgers, including audit rows.
Do not run an upstream build against an adopted home as part of a round trip; that
transition is not qualified here. For active use, keep upstream and fork homes
separate unless the pre-publish qualification explicitly covers the shared-home
case. Take an offline backup before upgrading any home.

## Rebase hotspots

- `apps/server/src/persistence/Migrations.ts` still changes the run sequence and
  imports `ForkMigrations`; upstream edits to the manifest or guard can conflict.
  Fork migration ids no longer do. The post-integration probe also found conflicts
  in `WorkspaceFileSystem.ts`, `orchestrationInstructions.ts`, `ws.ts`,
  `packages/contracts/src/rpc.ts`, `routeTree.gen.ts`, `ClaudeAdapterV2.ts`,
  `CodexAdapterV2.ts`, `runtimeLayer.ts`, and `provider-pi/src/server/adapter.ts`.
- Central registries are likely to churn again: `server.ts`, `ws.ts`,
  `RpcAuthorization.ts`, `RpcInstrumentation.ts`, `packages/contracts/src/rpc.ts`,
  and the Claude read-only allowlist.
- The workspace range read and the shared search truncation flag are shared changes,
  not Runtime-private ones. Re-run the workspace tests after any rebase.
- A textual `git merge-tree` result is not a compiled or tested integration.

## Known limits and deferrals

- Runtime reads use writer transactions. The post-integration review measured about
  0.24 ms mean and 0.34 ms p95 per effective-instruction resolution on a migrated
  file database, so this is a convention gap rather than a demonstrated latency
  problem. Moving reads to the read-only connection is still an explicit post-V1
  item.
- Dynamic instructions are turn-scoped. Claude delivers the current snapshot in the
  turn prompt, not the query identity, so ordinary instruction edits no longer force
  a live-query replacement. Clearing guidance applies to later turns, but
  prompt-carrying providers keep earlier snapshots in an existing conversation's
  history; start a new thread for a clean slate.
- One parametrized conformance suite covers Claude, Codex, OpenCode, ACP, Cursor,
  Muse, and Pi delivery, including update, removal, precedence, isolation, and
  transport formatting. Claude, Codex, and OpenCode2 also have adapter-level tests.
- Registered-source search collects at most 500 workspace index candidates before
  filtering to registered paths. A truncated empty result is not proof of no match;
  narrow the query or read a known source directly. A source-scoped index is
  deferred.
- Source health is a 512-byte prefix probe. It does not certify the rest of a file.
- Source roles and authority ranks are descriptive, not enforced.
- Native mobile Runtime settings and dedicated Runtime CLI commands are absent. Web
  and desktop use the web settings UI.
- Cosmetic placement items from PRT-100 were retained rather than churning qualified
  files.

## Evidence handling

Do not commit qualification plans, raw scratch output, or evidence databases. The
release handoff should name the external evidence directories and their hashes, the
exact commands run, and any deviation from this runbook. A PASS in a gate file is
not by itself a V1 release verdict.
