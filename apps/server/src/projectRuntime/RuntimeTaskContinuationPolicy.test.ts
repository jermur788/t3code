import { assert, it } from "@effect/vitest";
import {
  ProjectId,
  ProjectRuntimeHandoffId,
  ProjectRuntimeTaskId,
  ProviderInstanceId,
  ThreadId,
  type ProjectRuntimeContinuationPolicy,
  type ProjectRuntimeHandoff,
  type ProjectRuntimeTask,
  type RuntimeExecutionAttempt,
} from "@t3tools/contracts";
import { continuationRequestKey, evaluateContinuation } from "./RuntimeTaskContinuationPolicy.ts";

const projectId = ProjectId.make("synthetic-continuation");
const at = "2026-11-03T00:00:00.000Z";
const sourceId = ProjectRuntimeTaskId.make("source");
const reviewerId = ProjectRuntimeTaskId.make("independent-review");
const repairId = ProjectRuntimeTaskId.make("bounded-repair");

const authorization: ProjectRuntimeContinuationPolicy = {
  version: 1,
  mode: "synthetic",
  reviewTaskId: reviewerId,
  repairTaskId: repairId,
  maxRepairCycles: 2,
};

function task(
  id: ProjectRuntimeTaskId,
  owner: string,
  override: Partial<ProjectRuntimeTask> = {},
): ProjectRuntimeTask {
  return {
    taskId: id,
    projectId,
    title: String(id),
    scope: "An explicitly scoped synthetic task",
    owner,
    acceptanceCriteria: [{ id: "c1", text: "Review the exact handed-off work." }],
    status: "ready",
    blocker: null,
    verification: { milestone: "none", evidence: [] },
    latestHandoffId: null,
    revision: 2,
    createdAt: at,
    updatedAt: at,
    createdBy: "user:maintainer",
    updatedBy: "user:maintainer",
    ...override,
  };
}

function attempt(
  id: string,
  t: ProjectRuntimeTask,
  provider = "worker-x",
  status: RuntimeExecutionAttempt["status"] = "completed",
): RuntimeExecutionAttempt {
  return {
    attemptId: id,
    projectId,
    taskId: t.taskId,
    taskTitle: t.title,
    status,
    revision: 2,
    threadId: ThreadId.make(`thread-${id}`),
    runId: `run-${id}`,
    modelSelection: { instanceId: ProviderInstanceId.make(provider), model: provider },
    routeSource: "project",
    failure: status === "failed" ? "Synthetic failed launch" : null,
    handoffId: ProjectRuntimeHandoffId.make(`handoff-${id}`),
    createdAt: at,
    updatedAt: at,
    // Routing is not inspected by the pure evaluator; only the exact packet
    // task revision is authoritative for handoff provenance.
    receipt: {
      packet: { version: 1, taskRevision: 1, handoffId: null, text: "synthetic" },
    },
  } as RuntimeExecutionAttempt;
}

function handoff(
  a: RuntimeExecutionAttempt,
  result: "pass" | "fail" | "none" = "none",
  overrides: Partial<ProjectRuntimeHandoff> = {},
): ProjectRuntimeHandoff {
  return {
    handoffId: ProjectRuntimeHandoffId.make(`handoff-${a.attemptId}`),
    projectId,
    taskId: a.taskId,
    checkpoint: "Synthetic fixture",
    summary: "Explicit test fixture, not repository verification",
    filesChanged: [],
    verification: {
      milestone: result === "pass" ? "review-pass" : "none",
      evidence:
        result === "none"
          ? []
          : [
              {
                evidenceId: "test-outcome",
                result,
                summary: "Synthetic independent review evidence",
                recordedAt: at,
              },
            ],
    },
    runtimeRevision: 1,
    taskRevision: 1,
    threadId: a.threadId,
    providerInstanceId: a.modelSelection.instanceId,
    model: a.modelSelection.model,
    createdAt: at,
    createdBy: `thread:${a.threadId}`,
    ...overrides,
  };
}

const source = task(sourceId, "worker", { continuation: authorization });
const reviewer = task(reviewerId, "reviewer");
const repair = task(repairId, "engineer");
const work = attempt("worker-1", source);
const reviewerAttempt = attempt("review-1", reviewer, "reviewer-y");
const workHandoff = handoff(work);
const reviewHandoff = handoff(reviewerAttempt, "pass");

const afterWorker = {
  stage: "after_worker" as const,
  sourceTask: source,
  cursorTask: source,
  cursorAttempt: work,
  cursorHandoff: workHandoff,
  repairCyclesSpent: 0,
};
const afterReview = {
  ...afterWorker,
  stage: "after_review" as const,
  reviewTask: reviewer,
  reviewAttempt: reviewerAttempt,
  reviewHandoff,
};

it("starts exactly the previously authorized reviewer from a completed worker handoff", () => {
  const decision = evaluateContinuation(afterWorker);
  assert.equal(decision.action, "review");
  assert.equal(decision.targetTaskId, reviewerId);
  assert.equal(decision.requestKey, continuationRequestKey("review", work.attemptId));
  assert.equal(decision.evidenceHandoffId, workHandoff.handoffId);
  assert.deepEqual(evaluateContinuation(afterWorker), decision); // reordered/duplicate event
});

it("accepts a clean independent review claim without another manager or repair action", () => {
  const decision = evaluateContinuation(afterReview);
  assert.equal(decision.action, "no_action");
  assert.equal(decision.reason, "independent_review_claim_pass_no_manager_turn");
  assert.equal(decision.targetTaskId, null);
  assert.equal(decision.requestKey, null);
  // The task milestone is deliberately not promoted by this decision.
  assert.equal(source.verification.milestone, "none");
});

it("permits only a preauthorized bounded repair on a failing review", () => {
  const decision = evaluateContinuation({
    ...afterReview,
    reviewHandoff: handoff(reviewerAttempt, "fail"),
  });
  assert.equal(decision.action, "repair_or_retry");
  assert.equal(decision.targetTaskId, repairId);
  assert.equal(
    decision.requestKey,
    continuationRequestKey("repair_or_retry", reviewerAttempt.attemptId),
  );
});

it("rephrasing the same failure, or changing provider, cannot reset the consumed budget", () => {
  const changedProvider = attempt("review-1", reviewer, "provider-z");
  const first = evaluateContinuation({
    ...afterReview,
    reviewAttempt: changedProvider,
    reviewHandoff: handoff(changedProvider, "fail", { summary: "Different prose" }),
    repairCyclesSpent: 2,
  });
  const second = evaluateContinuation({
    ...afterReview,
    reviewAttempt: changedProvider,
    reviewHandoff: handoff(changedProvider, "fail", { summary: "Reworded again" }),
    repairCyclesSpent: 2,
  });
  assert.equal(first.action, "ask_user");
  assert.equal(first.reason, "repair_budget_exhausted");
  assert.equal(second.action, "ask_user");
  assert.equal(second.requestKey, null);
});

it("does not infer permission to repair from failure alone", () => {
  const denied = task(sourceId, "worker", {
    continuation: { version: 1, mode: "synthetic", reviewTaskId: reviewerId, maxRepairCycles: 2 },
  });
  const decision = evaluateContinuation({
    ...afterReview,
    sourceTask: denied,
    reviewHandoff: handoff(reviewerAttempt, "fail"),
  });
  assert.equal(decision.action, "ask_user");
  assert.equal(decision.reason, "repair_not_authorized");
});

it("fails closed on wrong-thread, stale-revision, and missing handoffs", () => {
  assert.equal(
    evaluateContinuation({ ...afterWorker, cursorHandoff: null }).reason,
    "missing_or_wrong_thread_handoff",
  );
  assert.equal(
    evaluateContinuation({
      ...afterWorker,
      cursorHandoff: handoff(work, "none", { threadId: ThreadId.make("other-thread") }),
    }).action,
    "blocked",
  );
  assert.equal(
    evaluateContinuation({
      ...afterWorker,
      cursorTask: task(sourceId, "worker", { revision: 1 }),
    }).reason,
    "stale_task_revision",
  );
  assert.equal(
    evaluateContinuation({ ...afterReview, reviewHandoff: null }).reason,
    "missing_or_wrong_thread_review",
  );
});

it("blocks contradictory or inconclusive review evidence, never upgrades verification", () => {
  const contradiction = handoff(reviewerAttempt, "pass", {
    verification: {
      milestone: "review-pass",
      evidence: [
        { evidenceId: "p", result: "pass", summary: "pass", recordedAt: at },
        { evidenceId: "f", result: "fail", summary: "fail", recordedAt: at },
      ],
    },
  });
  assert.equal(
    evaluateContinuation({ ...afterReview, reviewHandoff: contradiction }).reason,
    "contradictory_review_evidence",
  );
  assert.equal(
    evaluateContinuation({ ...afterReview, reviewHandoff: handoff(reviewerAttempt) }).reason,
    "missing_review_verdict_evidence",
  );
});

it("blocks self-review and a matching provider instance", () => {
  assert.equal(
    evaluateContinuation({ ...afterReview, reviewTask: task(reviewerId, "worker") }).reason,
    "stale_or_non_independent_review",
  );
  const sameProvider = attempt("review-1", reviewer, "worker-x");
  assert.equal(
    evaluateContinuation({
      ...afterReview,
      reviewAttempt: sameProvider,
      reviewHandoff: handoff(sameProvider, "pass"),
    }).action,
    "blocked",
  );
});

it("stops immediately for an operator-owned decision without spending a repair cycle", () => {
  assert.equal(
    evaluateContinuation({
      ...afterWorker,
      cursorHandoff: handoff(work, "none", {
        unresolvedDecisions: ["Destructive action requested"],
      }),
    }).action,
    "ask_user",
  );
  assert.equal(
    evaluateContinuation({
      ...afterReview,
      reviewHandoff: handoff(reviewerAttempt, "pass", {
        unresolvedDecisions: ["Product choice"],
      }),
    }).action,
    "ask_user",
  );
});

it("does not treat healthy in-progress work as failed debate", () => {
  assert.equal(
    evaluateContinuation({
      ...afterWorker,
      cursorAttempt: attempt("worker-1", source, "worker-x", "launched"),
    }).reason,
    "worker_not_terminal",
  );
  assert.equal(
    evaluateContinuation({
      ...afterReview,
      reviewAttempt: attempt("review-1", reviewer, "reviewer-y", "launched"),
    }).reason,
    "review_not_terminal",
  );
});

it("never automatically re-runs cancelled work, failed launches or unresolved attempts", () => {
  for (const status of ["failed", "cancelled", "interrupted", "reconcile_required"] as const) {
    const decision = evaluateContinuation({
      ...afterWorker,
      cursorAttempt: attempt("worker-1", source, "worker-x", status),
    });
    assert.notEqual(decision.action, "review");
    assert.notEqual(decision.action, "repair_or_retry");
  }
  assert.equal(
    evaluateContinuation({
      ...afterWorker,
      sourceTask: task(sourceId, "worker", { status: "cancelled", continuation: authorization }),
    }).action,
    "no_action",
  );
});

it("does not mint authorization when the source has no operator-owned continuation policy", () => {
  const unconfigured = task(sourceId, "worker");
  assert.equal(
    evaluateContinuation({ ...afterWorker, sourceTask: unconfigured }).action,
    "no_action",
  );
});

it("tracks a repair's independent review without treating historical revision advances as new cycles", () => {
  const repaired = attempt("repair-1", repair, "engineer-z");
  const repairDecision = evaluateContinuation({
    ...afterWorker,
    cursorTask: task(repairId, "engineer", { revision: 3 }),
    cursorAttempt: repaired,
    cursorHandoff: handoff(repaired),
    repairCyclesSpent: 1,
  });
  assert.equal(repairDecision.action, "review");
  assert.equal(repairDecision.repairCyclesSpent, 1);
  assert.equal(repairDecision.requestKey, continuationRequestKey("review", repaired.attemptId));
});
