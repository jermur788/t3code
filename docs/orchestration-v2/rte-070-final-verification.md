# RTE-070 — Final Review and Integration

Status: VERIFIED

## Task

Finish the Runtime Task Routing & Execution V1 sequence by reviewing the
integrated RTE-030 through RTE-060 result, comparing it with upstream, checking
migrations and security, exercising the rendered settings flow, and running the
available CI-equivalent checks on the integrated head.

## Integrated sequence

| Gate    | Integrated commit                               |
| ------- | ----------------------------------------------- |
| RTE-030 | `b492d54f2c` settings UI for routing            |
| RTE-040 | `2cbc1fa1c7` durable execution bridge           |
| RTE-050 | `b558362cef` recovery and cancellation          |
| RTE-060 | `a4ae386290` cross-provider qualification       |
| RTE-070 | `f97193cedc` final verification and integration |

Base for this gate: `main @ a4ae386290`. Branch:
`rte/rte-070-final-verification`.

## Independent review

A fresh Claude B reviewer examined the complete RTE-030..RTE-060 diff, the
contracts, execution service, RPC permissions, migrations, settings UI, tests,
and docs packets.

The first round returned **NOT VERIFIED** for one real blocker: three older
fork-migration tests still expected the ledger to end at migration 4 after
migrations 5 and 6 were added. `check:changed` had missed them because it only
runs tests beside changed files. The blocker was repaired:

- `001_ProjectRuntime.test.ts` and `003_TaskHandoffState.test.ts` now expect
  migrations 5 and 6.
- Both `scripts/migrate-dev-db.test.ts` ledger assertions now derive their
  expected rows from `forkMigrationManifest`, so future migrations cannot make
  them stale silently.
- The full migration-focused run passed: 8 files / 29 tests.

The same review found documentation and small UI gaps, which were also closed:

- The user and internals docs now describe worktree-isolated execution using the
  recorded revision/branch as a new worktree base, rather than claiming all base
  metadata is descriptive-only.
- The RTE-050 packet now records that a cancelling attempt maps its terminal run
  to that run's status (`cancelled`, `interrupted`, `completed`, or `failed`),
  not always `cancelled`.
- The task execution control reloads the attempt list after a failed Cancel or
  Recheck, and offers Recheck for a pending attempt.
- A pending-attempt test asserts restart replay reuses the stored thread and
  initial-message ids.

The follow-up review returned **RUNTIME TASK ROUTING & EXECUTION V1 VERIFIED**
with no blocking findings.

## Security and migration review

- Execute, cancel, and reconcile are Operate-scoped guarded RPCs; list and read
  are Read-scoped. The UI gates mutations on the command permission atom, and the
  server checks the destination environment.
- SQL is parameterised. Input bounds cover request keys, reasons, packets, and
  pagination.
- Migration 005 creates the attempt table with task/project foreign keys,
  cascade deletion, a unique thread id, and a partial unique active-attempt
  index. Migration 006 only replaces that index to include `cancelling`.
- Terminal attempts cannot revive, cancellation is compare-and-set on the
  attempt revision, and an ambiguous launch remains `reconcile_required` rather
  than freeing the active slot.
- No credentials, prompt secrets, or raw provider payloads are added to attempt
  rows or logs.

## Upstream comparison

Upstream `pingdotgg/t3code` is at `49a9e80e0b`, 96 commits ahead of the fork's
merge base. `git merge-tree --write-tree origin/main upstream/main` reports six
textual conflicts:

- `apps/server/src/mcp/McpHttpServer.ts`
- `apps/server/src/orchestration-v2/runtimeLayer.test.ts`
- `apps/server/src/provider/agentContextBudget.json`
- `apps/server/src/ws.ts`
- `apps/web/src/components/onboarding/FirstRunGate.tsx`
- `packages/client-runtime/src/state/commandPermissions.test.ts`

The reviewer assessed the launch/stop paths RTE calls and found no semantic
conflict: upstream adds optional launch fields and an agent-only mode limit, but
Runtime launches with `createdBy: "user"`; `getThreadShell`, thread projection,
dispatch, worktree-base checking, and delegated-task stop are otherwise
unchanged. The `ws.ts` and permission-test conflicts are import/handler-list
adjacency and should keep both sides. No upstream merge was performed in this
gate.

## Rendered UI review

On the integrated head, the settings flow was exercised in the real dev client:

- Selected the concrete `t3code` checkout, enabled Project Runtime, and confirmed
  the settings page rendered the enabled state.
- Created a planned task and confirmed the task list, revision, owner, worker
  preference, and latest-handoff state rendered correctly.
- Opened Edit task and confirmed the Execution section rendered, resolved the
  worker preference from task revision 1, enabled Execute, and showed no
  attempts yet.
- The prior RTE-040/050 runtime evidence covers a real Claude worktree launch,
  the linked worker thread, Cancelling state, restart reconciliation, and
  terminal status display.

## Verification

Run on the integrated head with the final fixes:

- `vp check`: 6,306 files formatted; lint 0 errors, 1 pre-existing warning in a
  test fixture.
- `vp run typecheck`: 36/36 packages passed.
- `vp run knip:check`: 2/2 checks passed.
- `vp run --filter @t3tools/web build`: passed; built-client boot verification
  mounted React.
- `vp run --filter t3 build:bundle`: passed.
- `VITEST_MAX_WORKERS=1 vp run check:changed`: format, lint, knip, GraphQL,
  affected typecheck, and changed tests passed.
- Focused server suites: 85 files / 553 tests passed across persistence, auth,
  MCP, project Runtime, routing, profiles, contracts, and permissions.
- Project Runtime/UI/migration suites: 16 files / 145 tests passed, including the
  Runtime browser test.
- Migration-focused suites: 8 files / 29 tests passed.

GitHub Actions is disabled for the `jermur788/t3code` fork (the API returns
"Actions has been disabled for this repository"), so the fork cannot run its CI
workflow. The local commands above are the CI-equivalent checks available on this
environment; no repo-wide test claim is made beyond the suites listed.

## Accepted follow-ups

- Execute a real second-provider worker when a second provider is configured;
  RTE-060 used a server-level two-driver fixture and real Claude execution.
- A finished worker is refreshed by Recheck or restart, not by live polling. The
  UI and user docs now say so.
- Cancel and Recheck serialize behind an in-flight launch; a slow worktree
  creation delays them rather than running concurrently.
- A real upstream merge is a separate task; this gate recorded the conflict map
  and semantic review only.

## Completion handoff

- **VERDICT:** RUNTIME TASK ROUTING & EXECUTION V1 VERIFIED.
- **DELIVERED:** RTE-030 settings UI, RTE-040 durable execution bridge, RTE-050
  recovery/cancellation, RTE-060 cross-provider qualification, and the final
  migration, docs, UI, and test repairs from this gate.
- **VERIFICATION:** CI-equivalent local checks, focused server and UI suites,
  builds, rendered settings flow, and independent final review all passed.
- **REVIEW:** independent Claude B review found one migration-test blocker and
  non-blocking docs/UI gaps; all were repaired and the follow-up round returned
  VERIFIED.
- **LIMIT:** actual fork CI could not run because Actions is disabled; the
  environment limitation and the local checks are recorded above.
