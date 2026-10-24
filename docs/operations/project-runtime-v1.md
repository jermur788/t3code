# Project Runtime V1 release and verification

Maintainer runbook for the first Project Runtime release. This release is a pinned
fork candidate, not an integration of current upstream.

## Baseline

- Branch: `feature/project-runtime-v1`
- Implementation baseline: `9bdcaa6399127908640c2cb53a344584c99743f6` (seven
  commits from `bfbd607a0b` through `9bdcaa6399`)
- Documentation candidate: the commit containing this page; the lead records its
  SHA in the release handoff
- Upstream base: `f9c1d023f1dad68360e19a8db89c9c485e2da410`
- Current upstream observed during PRT-100: `aaf4a901c490da4f0943afe1d941f3a8d58dc1c8`

No merge or rebase against current upstream was performed or qualified. Do not
describe this build as current upstream, and do not publish a merged tree as the V1
candidate without repeating the release gates.

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

## Migration 68 collision

This fork adds `068_ProjectRuntime`. Current upstream, observed at
`aaf4a901c490da4f0943afe1d941f3a8d58dc1c8`, also has
`068_ShellStopRequestIndex`. Both declare migration id 68 in
`apps/server/src/persistence/Migrations.ts`, and the migration manifest guard
refuses to start when a recorded id has a different name. The failure is a
`MigrationError(BadState)`, not silent corruption.

Consequences:

- Never share one T3 home or database between this fork and an upstream build.
- Never swap the two binaries against the same database.
- A textual merge that keeps both id-68 entries is not a fix; it creates duplicate
  identifiers and rows.

Integrating upstream later requires a deliberate, separately qualified upgrade path
that understands both existing schema histories. Renumbering Runtime to 69 alone is
not sufficient: a fork database that already recorded 68 as `ProjectRuntime` still
has a 68 row that the merged build calls `ShellStopRequestIndex`, so the guard
fails. A database already migrated through 69 on a renumbered fork would also skip
a newly introduced upstream 68 because the migrator skips ids up to the highest
recorded id; the guard then refuses to start. A fresh merged database has neither history; that does not solve
upgrades for existing installations. Do not discard or silently rewrite
databases to make the guard pass.

## Rebase hotspots

- `apps/server/src/persistence/Migrations.ts` is the only textual conflict found by
  the PRT-100 diagnostic merge.
- Central registries are likely to churn again: `server.ts`, `ws.ts`,
  `RpcAuthorization.ts`, `RpcInstrumentation.ts`, `packages/contracts/src/rpc.ts`,
  and the Claude read-only allowlist.
- The workspace range read and the shared search truncation flag are shared changes,
  not Runtime-private ones. Re-run the workspace tests after any rebase.
- A textual `git merge-tree` result is not a compiled or tested integration.

## Known limits and deferrals

- Runtime reads use writer transactions. This is a contention and convention gap,
  not a measured performance result; moving reads to the read-only connection is an
  explicit post-V1 item.
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
