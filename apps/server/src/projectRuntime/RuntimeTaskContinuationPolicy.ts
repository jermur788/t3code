import type {
  ProjectRuntimeContinuationPolicy,
  ProjectRuntimeHandoff,
  ProjectRuntimeTask,
  RuntimeExecutionAttempt,
} from "@t3tools/contracts";

/**
 * Pure fork-owned project decision. It does not run a model, mutate acceptance,
 * allocate a worker, or replace the upstream V2 execution/receipt machinery.
 * The experiment is opt-in and is NOT a production routing default.
 */
export type ContinuationAction =
  | "no_action"
  | "review"
  | "repair_or_retry"
  | "ask_user"
  | "blocked";

export interface ContinuationDecision {
  readonly action: ContinuationAction;
  readonly reason: string;
  readonly policyVersion: 1;
  readonly sourceAttemptId: string;
  readonly sourceAttemptRevision: number;
  readonly sourceTaskRevision: number;
  readonly evidenceHandoffId: string | null;
  readonly targetTaskId: string | null;
  readonly requestKey: string | null;
  readonly repairCyclesSpent: number;
}

export type ContinuationEvaluation = {
  readonly sourceTask: ProjectRuntimeTask;
  readonly cursorTask: ProjectRuntimeTask;
  readonly cursorAttempt: RuntimeExecutionAttempt;
  readonly cursorHandoff: ProjectRuntimeHandoff | null;
  readonly repairCyclesSpent: number;
} & (
  | { readonly stage: "after_worker" }
  | {
      readonly stage: "after_review";
      readonly reviewTask: ProjectRuntimeTask;
      readonly reviewAttempt: RuntimeExecutionAttempt;
      readonly reviewHandoff: ProjectRuntimeHandoff | null;
    }
);

export const continuationRequestKey = (
  action: "review" | "repair_or_retry",
  attemptId: string,
): string => `cont:v1:${action === "review" ? "r" : "p"}:${attemptId}`;

const TERMINAL = new Set(["completed", "failed", "cancelled", "interrupted"]);

export function handoffMatchesAttempt(
  attempt: RuntimeExecutionAttempt,
  handoff: ProjectRuntimeHandoff | null,
): handoff is ProjectRuntimeHandoff {
  return (
    handoff !== null &&
    handoff.projectId === attempt.projectId &&
    handoff.taskId === attempt.taskId &&
    handoff.threadId === attempt.threadId &&
    handoff.taskRevision === attempt.receipt.packet.taskRevision &&
    attempt.handoffId === handoff.handoffId &&
    handoff.createdBy === `thread:${attempt.threadId}`
  );
}

export function evaluateContinuation(input: ContinuationEvaluation): ContinuationDecision {
  const { sourceTask, cursorTask, cursorAttempt, cursorHandoff, repairCyclesSpent } = input;
  const policy: ProjectRuntimeContinuationPolicy | undefined = sourceTask.continuation;
  const decide = (
    action: ContinuationAction,
    reason: string,
    targetTaskId: string | null = null,
    requestKey: string | null = null,
    evidenceHandoffId: string | null = cursorHandoff?.handoffId ?? null,
  ): ContinuationDecision => ({
    action,
    reason,
    policyVersion: 1,
    sourceAttemptId: cursorAttempt.attemptId,
    sourceAttemptRevision: cursorAttempt.revision,
    sourceTaskRevision: sourceTask.revision,
    evidenceHandoffId,
    targetTaskId,
    requestKey,
    repairCyclesSpent,
  });

  if (policy?.mode !== "synthetic" || sourceTask.status === "cancelled") {
    return decide("no_action", "no_operator_authorized_policy");
  }
  if (sourceTask.status === "blocked" || sourceTask.status === "deferred") {
    return decide("no_action", "source_task_on_hold");
  }
  if (cursorAttempt.projectId !== sourceTask.projectId || cursorTask.taskId !== cursorAttempt.taskId) {
    return decide("blocked", "attempt_task_or_project_mismatch");
  }
  if (!TERMINAL.has(cursorAttempt.status)) return decide("no_action", "worker_not_terminal");
  if (cursorAttempt.status !== "completed") return decide("blocked", "worker_not_completed");
  if (!handoffMatchesAttempt(cursorAttempt, cursorHandoff)) {
    return decide("blocked", "missing_or_wrong_thread_handoff");
  }
  // A handoff append advances the task revision once. Additional edits invalidate
  // the execution packet and cannot be silently ignored.
  if (cursorTask.revision !== cursorAttempt.receipt.packet.taskRevision + 1) {
    return decide("blocked", "stale_task_revision");
  }
  if (cursorHandoff.unresolvedDecisions?.length) {
    return decide("ask_user", "unresolved_protected_decision");
  }

  if (input.stage === "after_worker") {
    return decide(
      "review",
      "authorized_independent_review",
      policy.reviewTaskId,
      continuationRequestKey("review", cursorAttempt.attemptId),
    );
  }

  const { reviewTask, reviewAttempt, reviewHandoff } = input;
  if (
    reviewTask.taskId !== policy.reviewTaskId ||
    reviewTask.projectId !== sourceTask.projectId ||
    reviewAttempt.taskId !== reviewTask.taskId ||
    reviewAttempt.projectId !== sourceTask.projectId
  ) {
    return decide("blocked", "review_task_identity_mismatch");
  }
  if (!TERMINAL.has(reviewAttempt.status)) return decide("no_action", "review_not_terminal");
  if (reviewAttempt.status !== "completed") return decide("blocked", "review_not_completed");
  if (!handoffMatchesAttempt(reviewAttempt, reviewHandoff)) {
    return decide("blocked", "missing_or_wrong_thread_review");
  }
  if (
    reviewTask.revision !== reviewAttempt.receipt.packet.taskRevision + 1 ||
    reviewTask.owner === sourceTask.owner ||
    reviewAttempt.modelSelection.instanceId === cursorAttempt.modelSelection.instanceId
  ) {
    return decide("blocked", "stale_or_non_independent_review");
  }
  if (reviewHandoff.unresolvedDecisions?.length) {
    return decide("ask_user", "review_requires_user_decision");
  }
  const results = reviewHandoff.verification.evidence.map((entry) => entry.result);
  const hasPass = results.includes("pass");
  const hasFail = results.includes("fail");
  if (hasPass && hasFail) return decide("blocked", "contradictory_review_evidence");
  if (hasPass && reviewHandoff.verification.milestone === "review-pass") {
    // No automatic VERIFIED write: this is attributable reviewer evidence,
    // not independent repository/runtime qualification.
    return decide("no_action", "independent_review_claim_pass_no_manager_turn");
  }
  if (!hasFail) return decide("blocked", "missing_review_verdict_evidence");
  if (policy.repairTaskId === undefined) {
    return decide("ask_user", "repair_not_authorized");
  }
  if (repairCyclesSpent >= policy.maxRepairCycles) {
    return decide("ask_user", "repair_budget_exhausted");
  }
  return decide(
    "repair_or_retry",
    "authorized_bounded_repair",
    policy.repairTaskId,
    continuationRequestKey("repair_or_retry", reviewAttempt.attemptId),
    reviewHandoff.handoffId,
  );
}
