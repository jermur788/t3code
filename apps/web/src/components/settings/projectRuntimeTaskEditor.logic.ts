import {
  PROJECT_RUNTIME_BOUNDS,
  type ProjectRuntimeAcceptanceCriterion,
  type ProjectRuntimeBlockerClassification,
  type ProjectRuntimeEvidenceResult,
  type ProjectRuntimeTaskBlockerInput,
  type ProjectRuntimeTaskStatus,
  type ProjectRuntimeVerificationEvidence,
  type ProjectRuntimeVerificationMilestone,
} from "@t3tools/contracts";

export const TASK_STATUS_VALUES = [
  "planned",
  "ready",
  "active",
  "blocked",
  "review",
  "done",
  "deferred",
  "cancelled",
] as const satisfies readonly ProjectRuntimeTaskStatus[];

export const BLOCKER_CLASSIFICATION_VALUES = [
  "implementation-defect",
  "verification-failure",
  "operational-blocker",
  "review-required",
  "integration-conflict",
  "upstream-compatibility",
  "product-decision",
] as const satisfies readonly ProjectRuntimeBlockerClassification[];

export const VERIFICATION_MILESTONE_VALUES = [
  "none",
  "implemented",
  "static-pass",
  "runtime-pass",
  "review-pass",
  "integrated",
  "verified",
] as const satisfies readonly ProjectRuntimeVerificationMilestone[];

export const EVIDENCE_RESULT_VALUES = [
  "pass",
  "fail",
  "inconclusive",
] as const satisfies readonly ProjectRuntimeEvidenceResult[];

const PASSING_MILESTONES: ReadonlySet<ProjectRuntimeVerificationMilestone> = new Set([
  "static-pass",
  "runtime-pass",
  "review-pass",
  "integrated",
  "verified",
]);

const RECORD_KEY_PATTERN = /^[A-Za-z0-9_-]+$/;

function isRecordKey(value: string, maxLength: number): boolean {
  return value.length > 0 && value.length <= maxLength && RECORD_KEY_PATTERN.test(value);
}

export interface AcceptanceCriteriaMapping {
  readonly criteria: readonly ProjectRuntimeAcceptanceCriterion[];
  readonly error: string | null;
}

/**
 * One non-empty line maps to one criterion. Existing ids carry over by position
 * so evidence links survive an edit; fresh ids skip anything already in use.
 */
export function mapAcceptanceCriteria(
  text: string,
  existing: readonly ProjectRuntimeAcceptanceCriterion[],
): AcceptanceCriteriaMapping {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");
  if (lines.length > PROJECT_RUNTIME_BOUNDS.criteriaMaxCount) {
    return {
      criteria: [],
      error: `Acceptance criteria support at most ${PROJECT_RUNTIME_BOUNDS.criteriaMaxCount} lines. Remove ${lines.length - PROJECT_RUNTIME_BOUNDS.criteriaMaxCount} before saving.`,
    };
  }
  const overLong = lines.findIndex(
    (line) => line.length > PROJECT_RUNTIME_BOUNDS.criterionTextMaxLength,
  );
  if (overLong !== -1) {
    return {
      criteria: [],
      error: `Criterion ${overLong + 1} is longer than ${PROJECT_RUNTIME_BOUNDS.criterionTextMaxLength.toLocaleString()} characters. Shorten it before saving.`,
    };
  }
  const used = new Set<string>();
  let ordinal = 1;
  const criteria = lines.map((line, index) => {
    const inherited = existing[index]?.id;
    if (
      inherited !== undefined &&
      isRecordKey(inherited, PROJECT_RUNTIME_BOUNDS.criterionIdMaxLength) &&
      !used.has(inherited)
    ) {
      used.add(inherited);
      return { id: inherited, text: line };
    }
    while (used.has(`c${ordinal}`)) ordinal += 1;
    const id = `c${ordinal}`;
    ordinal += 1;
    used.add(id);
    return { id, text: line };
  });
  return { criteria, error: null };
}

export interface TaskEvidenceDraft {
  readonly key: string;
  readonly evidenceId: string | null;
  readonly result: ProjectRuntimeEvidenceResult;
  readonly summary: string;
  readonly command: string;
  readonly recordedAt: string;
  readonly criterionIds?: readonly string[];
}

export interface EvidenceMapping {
  readonly evidence: readonly ProjectRuntimeVerificationEvidence[];
  readonly error: string | null;
}

/** Blank draft rows are treated as removals; ids stay unique and positional. */
export function mapVerificationEvidence(drafts: readonly TaskEvidenceDraft[]): EvidenceMapping {
  const kept = drafts.filter((draft) => draft.summary.trim() !== "");
  if (kept.length > PROJECT_RUNTIME_BOUNDS.evidenceMaxCount) {
    return {
      evidence: [],
      error: `Verification evidence supports at most ${PROJECT_RUNTIME_BOUNDS.evidenceMaxCount} items.`,
    };
  }
  const overLong = kept.findIndex(
    (draft) => draft.summary.trim().length > PROJECT_RUNTIME_BOUNDS.evidenceSummaryMaxLength,
  );
  if (overLong !== -1) {
    return {
      evidence: [],
      error: `Evidence ${overLong + 1} is longer than ${PROJECT_RUNTIME_BOUNDS.evidenceSummaryMaxLength.toLocaleString()} characters. Shorten it before saving.`,
    };
  }
  const used = new Set<string>();
  let ordinal = 1;
  const evidence = kept.map((draft) => {
    let evidenceId = draft.evidenceId;
    if (
      evidenceId === null ||
      !isRecordKey(evidenceId, PROJECT_RUNTIME_BOUNDS.evidenceIdMaxLength) ||
      used.has(evidenceId)
    ) {
      while (used.has(`e${ordinal}`)) ordinal += 1;
      evidenceId = `e${ordinal}`;
      ordinal += 1;
    }
    used.add(evidenceId);
    const command = draft.command.trim();
    return {
      evidenceId,
      ...(command === "" ? {} : { command }),
      result: draft.result,
      summary: draft.summary.trim(),
      recordedAt: draft.recordedAt,
      ...(draft.criterionIds === undefined || draft.criterionIds.length === 0
        ? {}
        : { criterionIds: [...draft.criterionIds] }),
    };
  });
  return { evidence, error: null };
}

export function verificationIssue(
  milestone: ProjectRuntimeVerificationMilestone,
  evidence: readonly { readonly result: ProjectRuntimeEvidenceResult }[],
): string | null {
  if (PASSING_MILESTONES.has(milestone) && !evidence.some((entry) => entry.result === "pass")) {
    return `${milestone} needs at least one passing evidence item. Add passing evidence or choose a lower milestone.`;
  }
  if (milestone === "verified" && evidence.some((entry) => entry.result === "fail")) {
    return "Verified cannot coexist with failing evidence. Remove or resolve the failing evidence, or choose another milestone.";
  }
  return null;
}

export function taskDraftIssue(input: {
  readonly status: ProjectRuntimeTaskStatus;
  readonly blockerSummary: string;
  readonly result: string;
  readonly criteriaError: string | null;
  readonly verificationError: string | null;
}): string | null {
  if (input.criteriaError !== null) return input.criteriaError;
  if (input.status === "blocked" && input.blockerSummary.trim() === "") {
    return "Blocked tasks need a blocker classification and summary before saving.";
  }
  if (input.status === "done" && input.result.trim() === "") {
    return "Done tasks need a result before saving. A handoff summary is not a task result.";
  }
  return input.verificationError;
}

export function taskBlockerInput(input: {
  readonly classification: ProjectRuntimeBlockerClassification;
  readonly summary: string;
  readonly detail: string;
}): ProjectRuntimeTaskBlockerInput {
  const detail = input.detail.trim();
  return {
    classification: input.classification,
    summary: input.summary.trim(),
    ...(detail === "" ? {} : { detail }),
  };
}
