# Documentation V1 review repair handoff

Status: **STATIC PASS / GOLDEN-PATH QUALIFICATION PENDING**

## Base

- Repository: `jermur788/t3code`
- Base: `main` at `618c243a79457d141ab5e03a1b5e174ed97aba0e`
- Repair branch: `docs/documentation-v1-review-repairs`
- Governing evidence: independent static review supplied 2026-10-28 (`REVIEW REQUIRED`, 2 BLOCKER / 6 MAJOR / 9 MINOR / 3 EDITORIAL).

## Result

Repaired Documentation V1 without changing Runtime/server behavior.

### Blockers repaired

- Replaced fork startup/restart/update `vp dev` instructions with `vp run dev`.
- Replaced the false auto-browser expectation with the actual `pairingUrl:` workflow, credential warning, and pairing-URL recovery command.

### Major findings repaired

- Removed the false Linux-desktop distinction and made source-run web/server the documented fork golden path; documented that the fork publishes no installers/binaries.
- Added explicit warnings and entry-point links so upstream installers/packages/`t3 update` are not mistaken for fork installation.
- Made a separate `ready` review task the primary independent-review workflow; documented why same-task review is weaker.
- Added explicit task/provider-model configuration and `no_default_model` recovery.
- Added the `reconcile_required` → Recheck → Cancel execution recovery when the worker thread is confirmed deleted/absent.
- Made handoff creation explicit (`t3_project_handoff_append`) and added missing-handoff recovery.

### Minor/editorial repairs

- Removed the separate Node-install requirement; uses `vp exec node --version` for diagnostics.
- Added provider enablement.
- Corrected Settings navigation to `Settings → Projects` and clarified that Execute is inside saved/reopened Edit task.
- Documented Shared checkout / New worktree and approval behavior.
- Completed verification milestone mapping including `none` and `implemented`; clarified blocked/deferred as lifecycle statuses.
- Added finishing-loop fields: Task status, Result, Verification milestone, Evidence.
- Added backup sensitivity, forward-only migration rollback, and verified default home paths.
- Added cancel-child-task and restart-continuation cautions.
- Marked one-run routing as API/resolver-only in current task UI.
- Removed the duplicate isolated-home command from the update section.
- Linked the fork manual/reference from root `README.md` and `docs/README.md`.

## Files changed

- `README.md`
- `docs/README.md`
- `docs/manual.md`
- `docs/reference.md`
- `docs/internals/documentation-v1-review-repair-handoff.md`

## Verification

- Re-read the repaired canonical manual/reference from the repair branch.
- Confirmed no `vp dev` occurrence remains in either canonical document.
- Confirmed the manual no longer points to nonexistent `user/README.md`.
- Compared branch to base: documentation-only changes.
- No repository tests/typechecks were run because this is a documentation-only repair and this manager environment does not have the repository runtime/dependencies.
- Fresh-user/runtime qualification is **not** claimed.

## Remaining qualification

Run the independent fresh-user golden path from a clean clone. It should include:

1. source startup through `vp run dev` and the printed pairing URL;
2. a configured/enabled provider and an explicit task Worker preference or project default model;
3. the implementation task plus required handoff;
4. a separate review task/worker;
5. restart/persistence continuation;
6. a project with no default model to confirm the documented `no_default_model` path;
7. deliberate worker-thread deletion to confirm Recheck then Cancel execution resolves `reconcile_required`;
8. an approval-required worker path if practical.

## Integration state

Documentation repairs are suitable for integration before runtime qualification. Do not claim Documentation V1 VERIFIED until the fresh-user golden path passes.
