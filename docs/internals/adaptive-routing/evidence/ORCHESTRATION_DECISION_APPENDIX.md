# Orchestration Decision Appendix

Manager-created template for substantial multi-worker or long-running orchestration sessions.

Complete this before a major context reset, manager transition, or end of a long orchestrator session.

## Orchestration policy

- Objective:
- Orchestrator provider/model:
- Routing priorities supplied by the user:
- Quality/cost/capacity priorities:
- Providers/models considered:
- Subscription pools available:
- Known capacity/reset constraints at start:
- Unknown or unobservable capacity information:
- Safety or billing constraints:
- One-writer / concurrency constraints:

## Decision log

For every material worker/model change, record:

### Decision <n>

- Time / sequence:
- Task or work unit:
- Previous provider/model:
- Candidate providers/models considered:
- Selected provider/model:
- Selection reason:
- Routing/priority rule applied:
- Capacity evidence:
- Capacity source:
  - provider-reported
  - T3-observed
  - user-reported
  - inferred
  - unknown
- Capacity/reset observation timestamp:
- Difficulty estimate:
- Relevant previous outcome/failure:
- Rejection reasons for other candidates:
- Confidence / uncertainty:
- Expected result:
- Actual result:
- Rework/retry required:
- Would choose the same worker again?:
- Notes:

## Capacity events

For each meaningful subscription event:

- Provider/pool alias:
- Observation time:
- Reported remaining capacity:
- Exact / approximate / unknown:
- Reset/window information:
- Source quality:
- Triggered a routing change?:
- Resulting routing decision:

Do not invent quota values when the provider does not expose them.

## Worker outcome summary

For each worker attempt:

- Task/work unit:
- Provider/model:
- Started:
- Ended:
- Outcome:
- Tests/evidence:
- Handoff/reference:
- Rework required:
- Failure classification:
- Accepted/rejected/unresolved:
- Notes relevant to future routing:

## End-of-session assessment

- Which routing decisions worked well:
- Which routing decisions worked poorly:
- Capacity assumptions that proved correct:
- Capacity assumptions that proved wrong:
- Models that were overqualified/underqualified for assigned work:
- Tasks where a cheaper/faster worker likely would have sufficed:
- Tasks where a stronger worker was necessary:
- Repeated failure patterns:
- Suggested routing-policy changes:
- Evidence still missing:
- Exact next action:
