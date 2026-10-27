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
 * One non-empty line maps to one criterion. Text matches keep an id on the same
 * criterion when lines are inserted, removed, or reordered; an edited line falls
 * back to its position, and fresh ids never reuse a removed criterion's id.
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
  const seenExisting = new Set<string>();
  const taken = new Set<string>();
  const byText = new Map<string, string[]>();
  for (const criterion of existing) {
    if (
      !isRecordKey(criterion.id, PROJECT_RUNTIME_BOUNDS.criterionIdMaxLength) ||
      seenExisting.has(criterion.id)
    ) {
      continue;
    }
    seenExisting.add(criterion.id);
    taken.add(criterion.id);
    const ids = byText.get(criterion.text);
    if (ids === undefined) byText.set(criterion.text, [criterion.id]);
    else ids.push(criterion.id);
  }
  const ids: Array<string | undefined> = Array.from({ length: lines.length });
  lines.forEach((line, index) => {
    const id = byText.get(line)?.shift();
    if (id === undefined) return;
    ids[index] = id;
    used.add(id);
  });
  let ordinal = 1;
  lines.forEach((_line, index) => {
    if (ids[index] !== undefined) return;
    const inherited = existing[index]?.id;
    if (
      inherited !== undefined &&
      isRecordKey(inherited, PROJECT_RUNTIME_BOUNDS.criterionIdMaxLength) &&
      !used.has(inherited)
    ) {
      ids[index] = inherited;
      used.add(inherited);
      return;
    }
    while (used.has(`c${ordinal}`) || taken.has(`c${ordinal}`)) ordinal += 1;
    const id = `c${ordinal}`;
    ordinal += 1;
    taken.add(id);
    used.add(id);
    ids[index] = id;
  });
  return {
    criteria: lines.map((line, index) => ({ id: ids[index]!, text: line })),
    error: null,
  };
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

/**
 * Blank draft rows are treated as removals; ids stay unique and positional.
 * When criteria changed, links to criteria that no longer exist are dropped.
 */
export function mapVerificationEvidence(
  drafts: readonly TaskEvidenceDraft[],
  acceptedCriterionIds?: ReadonlySet<string>,
): EvidenceMapping {
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
    const criterionIds =
      draft.criterionIds === undefined
        ? undefined
        : acceptedCriterionIds === undefined
          ? draft.criterionIds
          : draft.criterionIds.filter((id) => acceptedCriterionIds.has(id));
    return {
      evidenceId,
      ...(command === "" ? {} : { command }),
      result: draft.result,
      summary: draft.summary.trim(),
      recordedAt: draft.recordedAt,
      ...(criterionIds === undefined || criterionIds.length === 0
        ? {}
        : { criterionIds: [...criterionIds] }),
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
