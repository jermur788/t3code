# Runtime Routing

Runtime routing is durable configuration, not execution. It answers which
provider, model, isolation, and modes a Runtime task would use, and why, without
starting a worker, creating a thread, or calling `delegate_task`. The EventSink
hook and execution-attempt lifecycle belong to later work.

The module is provider-neutral. It reuses the Orchestrator worker-role vocabulary
(`implementation`, `research`, `review`, `design`, `test`, `general`), upstream
provider instance/driver/model option types, and existing provider snapshots and
project settings. It does not keep a second provider catalog, poll provider
health, install anything, or authenticate anything.

## Layers and precedence

Routing resolves in this order:

1. a one-run explicit override;
2. Runtime task routing;
3. project routing;
4. the assigned Development Profile's routing;
5. ordinary T3 inheritance.

A layer participates only when it has an entry for the resolved worker role. A
one-run override role wins, then the task's routing role, then a caller-supplied
role, and the default is `implementation`. Project and profile routes are keyed
by role, so a layer with routes for other roles is skipped without affecting
resolution.

Resolution reads durable routing even when Runtime is disabled; enablement is an
execution concern. RTE-040 must check it again before launching work.

Each role entry is an ordered candidate list plus a fallback:

| Fallback   | When the candidates are exhausted                                           |
| ---------- | --------------------------------------------------------------------------- |
| `continue` | Evaluate the next lower routing layer.                                      |
| `inherit`  | Stop and use ordinary T3 inheritance; do not evaluate lower routing layers. |
| `fail`     | Refuse routing; never silently inherit.                                     |

The profile is the terminal routing layer, so its entries allow only `inherit`
and `fail`. Task and project entries allow all three. An empty candidate list is
meaningful: with `inherit` it deliberately disables routing for that role, and
with `fail` it requires a route that is not available.

A one-run override is a single candidate. It is fail-closed: if it cannot run,
resolution fails instead of falling through to stored policy. RTE-020 exposes
that contract but does not consume it for execution.

Candidate fields map to existing T3 concepts: provider instance or driver kind,
model, provider options, isolation, runtime mode, and interaction mode. A
driver-only candidate resolves to the first eligible instance in provider order,
so replacing an instance id does not require rewriting policy.

## Eligibility is not authorization

The resolver reuses the current provider snapshots, the live provider instance
registry, server settings with project overrides, and the same provider/model
option checks the Orchestrator already uses. It checks:

- provider registration and driver match;
- a live orchestration-capable instance;
- project provider enablement, including project-specific disables;
- snapshot availability, enabled/installed state, status, and authentication;
- advertised model, model option selections, supported runtime modes, and plan
  mode where the snapshot exposes those capabilities.

A selected route is marked `eligible-at-resolution`. That is an observation, not
permission to launch. Settings, provider health, and authorization can change
before the Orchestrator starts work, so the launch path remains authoritative and
must recheck. The resolver deliberately performs no health probe, quota, price,
or account-identity check.

Saved policy is never deleted or rewritten because a provider is temporarily
offline, a model is no longer advertised, or a project disabled an instance.
Resolution reports the rejection; the configuration remains for the next
resolution or for the user to repair.

## Persistence and concurrency

- **Profile routing** is a structured `routing` value in the profile record and
  the profile's existing `revision` guards it. Instructions and routing change in
  one compare-and-set write; omitting `routing` preserves the stored value. A
  stale routing write cannot overwrite newer instructions.
- **Project routing** is one row per project with its own revision. Resetting the
  override writes `null` and increments the revision instead of deleting the row,
  so a stale writer cannot recreate an old override. Project routing is separate
  from Project Instructions and does not depend on Runtime being enabled.
- **Task routing** is optional task state in the task payload. It uses the normal
  task revision and update path, so routing changes are protected by the same
  compare-and-set as every other task edit.

Project and profile routing are settings, not agent context. They are never
injected into provider prompts or `t3_project_context`; the agent-context budget
is unchanged. Agent-facing Runtime task tools also omit the routing field in this
gate, because every field added to those schemas expands the tool prompt. Routing
is user/orchestrator configuration until execution exists. Profiles still apply
independently of Runtime enablement, and one profile still applies per project
with no inheritance chains. Agents cannot edit profiles through MCP.

Fork migration `4_RuntimeRouting` adds the profile routing column and the
project-routing row with its soft-deletion trigger. Existing profiles and
projects read as "no routing"; task routing needs no migration because it is an
optional payload field. Fork history stays in the fork ledger, and upstream
migration ids are untouched.

## Execution bridge

RTE-040 adds one execution action for Runtime tasks. Execution resolves routing
again immediately before launch, then persists a project-owned execution attempt
before it creates the worker thread. The attempt carries the full routing
resolution as its receipt and a deterministic task packet built from the task and
its latest handoff.

The launch seam is attempt-first: the attempt has a preallocated thread id and
derived command/message ids, and the existing `ThreadLaunchService` receipts make
every partial launch replayable. A crash therefore leaves a `pending` attempt, not
an untracked worker.

RTE-050 reconciles active attempts at startup. A pending attempt replays its one
launch with the stored ids; launched/cancelling attempts map the existing run's
terminal state; an unreadable thread becomes `reconcile_required` rather than
failed, so another worker cannot start. Cancellation uses the existing
orchestration thread-stop command and is compare-and-set on the attempt revision.
When a terminal attempt has a handoff from its worker thread, reconciliation links
that handoff id without rewriting the handoff or task.

Routing is still configuration, never authorization. The resolver's selected
route is eligible-at-resolution only; the normal provider/orchestration launch path
rechecks availability and permissions when work starts. Execution does not add a
second provider engine, scheduler, cost/quota routing, or cross-environment
routing.
