# Personal-fork CI compatibility

## Problem and constraint

Upstream T3 CI requests Blacksmith runner labels such as
`blacksmith-8vcpu-ubuntu-2404`. Blacksmith currently requires a GitHub
organization, so the personal fork `jermur788/t3code` cannot install it. Jobs
that request those labels stay queued indefinitely.

This change keeps upstream on Blacksmith and gives the personal fork standard
GitHub-hosted runners for normal pull-request and `main` CI.

- Base: `42f057c843de7434dba15c004f4425bea0cd59c7`
- Upstream reference: `e9236274a3a6e0c731a7df4092db1e686f039068`
- Upstream `main` at implementation: `bc1ea26cc0d7f53a91ac5db94a2d0421cbe1c97b`
- Upstream changed only `deploy-relay.yml` between the reference and `main`;
  `ci.yml`, `mobile-fingerprint-check.yml`, and `setup-apt-mirrors` are unchanged.

## Upstream behavior

- `ci.yml` runs on every pull request and on pushes to `main`.
- Its jobs are `Changes`, `Lint`, `Build and Typecheck`, `Test`, `Test Web`,
  `Test Server 1`–`8`, `Rust`, `Mobile Native Static Analysis`, `Release Smoke`,
  and `Check`.
- `mobile-fingerprint-check.yml` runs `Native fingerprint diff` on every pull
  request.
- Blacksmith labels select the runner for each job. The exact labels are the
  ones already present in those workflows.
- `setup-apt-mirrors` is a Blacksmith-runner optimization: it writes
  `/etc/apt/blacksmith-ubuntu-mirrors.txt` and rewrites Ubuntu sources to the
  `mirror+file:` transport. The fork skips it on GitHub-hosted runners so they
  keep standard Ubuntu sources and the same package-install semantics.

Release, deploy, desktop-preview, mobile-preview, Windows, and other manual
workflows are not part of normal fork PR/main qualification. They keep their
existing runner definitions; see [Deferred workflows](#deferred-workflows).

## Fork behavior

Runner selection is a repository-aware expression on each `runs-on` line in the
two normal CI workflows:

```yaml
runs-on: ${{ github.repository == 'pingdotgg/t3code' && 'blacksmith-8vcpu-ubuntu-2404' || 'ubuntu-24.04' }}
```

- On `pingdotgg/t3code`, the expression resolves to the original Blacksmith
  label. Upstream behavior is unchanged.
- On any other repository, including `jermur788/t3code`, it resolves to the
  standard GitHub-hosted label.
- No runner-selection job, repository variable, secret, or extra `needs` edge
  is introduced. Job order, gating, commands, timeouts, permissions, artifacts,
  and sharding remain upstream's.

`setup-apt-mirrors` runs only on self-hosted runners. On GitHub-hosted runners
the Blacksmith mirror step is skipped, so ordinary Ubuntu sources are used. The
inline `sed` calls that touch the Blacksmith mirror file are guarded by a file
existence check, so the GitHub-hosted path never depends on Blacksmith image
state.

## Supported runner mappings

| Blacksmith class                          | Fork runner    | Notes                                                                            |
| ----------------------------------------- | -------------- | -------------------------------------------------------------------------------- |
| `blacksmith-2vcpu-ubuntu-2404`            | `ubuntu-24.04` | Standard public-repo runner is 4 vCPU / 16 GB; the job is over-provisioned.      |
| `blacksmith-4vcpu-ubuntu-2404`            | `ubuntu-24.04` | Matches the standard 4 vCPU / 16 GB runner.                                      |
| `blacksmith-8vcpu-ubuntu-2404`            | `ubuntu-24.04` | Fewer cores than Blacksmith, same commands and coverage.                         |
| `blacksmith-6vcpu-macos-26`               | `macos-26`     | Standard arm64 macOS 26 runner. The job only runs SwiftLint, ktlint, and detekt. |
| `blacksmith-8vcpu-windows-2025`           | Deferred       | `windows-tests.yml` is manual-only.                                              |
| 12/16/32-vCPU and preview/release classes | Deferred       | Not required for normal PR/main qualification.                                   |

Standard GitHub-hosted runners on this public repository are free. No larger or
paid runners are enabled.

## CI equivalence

The compatibility layer changes only where a job runs, not what it checks:

- change detection and every existing `if:` gate are unchanged;
- lint, formatting, knip, typecheck, tests, server sharding, browser tests,
  Rust checks, mobile native static analysis, fingerprint checking, release
  smoke, and the `Check` summary remain;
- job names, permissions, commands, artifact names, and timeouts are unchanged;
- no `continue-on-error`, blanket skip, or test removal is added.

A smaller GitHub-hosted runner may take longer than its Blacksmith
counterpart. If a job reaches its existing timeout because of runner size, raise
that job's timeout rather than reducing coverage; that is a reviewed change.

## Blacksmith-specific setup

`setup-apt-mirrors` keeps its current behavior on self-hosted runners. Its step
is guarded with:

```yaml
if: runner.environment == 'self-hosted'
```

This intentionally gives up the mirror-failover optimization on GitHub-hosted
runners; it does not change which packages are installed.

The inline mirror-file `sed` in `ci.yml` and `release.yml` is guarded with a
`-f /etc/apt/blacksmith-ubuntu-mirrors.txt` check. Package installation
semantics stay the same: `libsecret-1-dev`, `pkg-config`, and `build-essential`
are installed on both runner types.

## Upstream rebase strategy

Conflict hotspots, in order of likelihood:

1. every `runs-on` line in `ci.yml` (10 jobs);
2. the `runs-on` line in `mobile-fingerprint-check.yml`;
3. the guard in `.github/actions/setup-apt-mirrors/action.yml`;
4. the inline mirror `sed` blocks in `ci.yml` and `release.yml`.

To reconcile an upstream change, take upstream's new runner label or command as
the source of truth, then reapply the same fork expression with upstream's
Blacksmith label and the matching GitHub-hosted fallback from the table above.
Do not copy the fork expression over an upstream job that changed shape without
checking the new job's requirements. If upstream changes its repository slug,
update the `pingdotgg/t3code` literal in every expression and in this document;
otherwise the upstream path will silently fall back to GitHub-hosted.

The compatibility layer can be deleted when either of these becomes true:

- upstream supports personal repositories on Blacksmith; or
- this repository moves under an organization that can install Blacksmith.

At that point, restore the direct `runs-on` labels and remove the APT guards.
This document and the `# Fork CI compatibility` comments are the discovery
points; delete them together with the patch.

## Acceptance criteria

1. The personal repository remains `jermur788/t3code`; no Blacksmith install is
   required.
2. The jobs listed under [Upstream behavior](#upstream-behavior) start on
   standard GitHub-hosted runners.
3. Existing verification coverage is not intentionally reduced.
4. The Blacksmith APT path is skipped on GitHub-hosted runners and still works
   on Blacksmith.
5. No paid runner, secret, or permission expansion is introduced.
6. Local checks and the verification PR's CI pass.
7. An independent review confirms the expressions, permissions, and APT path.
8. Rebasing the patch remains limited to the hotspots above.

## Verification repairs

GitHub-hosted Ubuntu 24.04 ships Git 2.56, whose corrupt-worktree diagnostic is
`gitfile does not point to a valid repository`. `storageCleanup` now treats that
diagnostic like `not a git repository`, so a corrupt worktree is kept as
"Repository or branch changed" instead of reported as a cleanup failure. This is
the behavior the existing test already specified; no coverage changed.

## Verification plan

Local:

- parse every changed workflow as YAML;
- confirm each normal-CI `runs-on` has an upstream branch and a GitHub-hosted
  fallback;
- run `vp run check:changed`.

Remote:

- open the implementation PR and confirm `Changes`, `Lint`,
  `Build and Typecheck`, `Test`, `Test Web`, `Test Server 1`–`8`, `Rust`,
  `Mobile Native Static Analysis`, `Release Smoke`, `Check`, and
  `Native fingerprint diff` leave `queued`;
- record run and job IDs, `runner_name`, labels, and conclusions;
- confirm downstream jobs materialize after `Changes`;
- confirm the `setup-apt-mirrors` step is skipped and package installation
  succeeds on the GitHub-hosted path;
- confirm every job completes within its existing timeout on the smaller
  runners; a timeout increase is preferred to reducing coverage;
- record expected skips, including release/deploy workflows and optional
  preview workflows.

## Deferred workflows

These keep their Blacksmith labels and are not required for normal fork PR/main
qualification:

- `windows-tests.yml` — manual only;
- `release.yml`, `release-desktop.yml` — release only; upstream-guarded jobs do
  not run on the fork;
- `deploy-relay.yml`, `mobile-android-apk.yml`, `mobile-eas-production.yml`,
  `publish-aur.yml` — upstream-guarded or manual;
- `mobile-eas-preview.yml`, `web-preview.yml`, `desktop-macos-preview.yml`,
  `desktop-macos-preview-publish.yml`, `relay-preview.yml`,
  `relay-preview-cleanup.yml`, `mobile-showcase-screenshots.yml` — label-,
  secret-, environment-, or manual-triggered preview/release paths.

`agent-context-budget.yml`, `issue-labels.yml`, `pr-size.yml`, `pr-vouch.yml`,
and `thread-transfer-report.yml` already use GitHub-hosted runners.
`stale-needs-more-info.yml` uses `ubuntu-latest` and is schedule/manual. None
need a change.
