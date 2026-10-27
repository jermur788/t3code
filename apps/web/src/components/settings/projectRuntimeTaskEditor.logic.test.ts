import { describe, expect, it } from "vite-plus/test";
import { PROJECT_RUNTIME_BOUNDS } from "@t3tools/contracts";
import {
  mapAcceptanceCriteria,
  mapVerificationEvidence,
  taskBlockerInput,
  taskDraftIssue,
  verificationIssue,
  type TaskEvidenceDraft,
} from "./projectRuntimeTaskEditor.logic";

describe("acceptance criteria mapping", () => {
  it("maps one non-empty line to one criterion and ignores blank lines", () => {
    const mapping = mapAcceptanceCriteria("First\n\n  Second  \n", []);
    expect(mapping.error).toBeNull();
    expect(mapping.criteria).toEqual([
      { id: "c1", text: "First" },
      { id: "c2", text: "Second" },
    ]);
  });

  it("keeps existing ids by position and gives added criteria fresh unique ids", () => {
    const mapping = mapAcceptanceCriteria("Edited first\nSecond\nThird", [
      { id: "c7", text: "First" },
      { id: "c9", text: "Second" },
    ]);
    expect(mapping.error).toBeNull();
    expect(mapping.criteria).toEqual([
      { id: "c7", text: "Edited first" },
      { id: "c9", text: "Second" },
      { id: "c1", text: "Third" },
    ]);
  });

  it("does not reuse an id after a criterion is removed", () => {
    const mapping = mapAcceptanceCriteria("Second\nThird", [
      { id: "c1", text: "First" },
      { id: "c2", text: "Second" },
    ]);
    expect(mapping.criteria.map((criterion) => criterion.id)).toEqual(["c1", "c2"]);
    expect(new Set(mapping.criteria.map((criterion) => criterion.id)).size).toBe(2);
  });

  it("rejects too many criteria or an over-long line with guidance", () => {
    const tooMany = Array.from(
      { length: PROJECT_RUNTIME_BOUNDS.criteriaMaxCount + 1 },
      (_, index) => `Criterion ${index + 1}`,
    ).join("\n");
    expect(mapAcceptanceCriteria(tooMany, []).error).toContain(
      String(PROJECT_RUNTIME_BOUNDS.criteriaMaxCount),
    );
    expect(
      mapAcceptanceCriteria("x".repeat(PROJECT_RUNTIME_BOUNDS.criterionTextMaxLength + 1), [])
        .error,
    ).toContain("Criterion 1");
  });
});

function evidenceDraft(overrides: Partial<TaskEvidenceDraft> = {}): TaskEvidenceDraft {
  return {
    key: "draft-1",
    evidenceId: null,
    result: "pass",
    summary: "Focused tests passed",
    command: "",
    recordedAt: "2026-10-24T12:00:00.000Z",
    ...overrides,
  };
}

describe("verification evidence mapping", () => {
  it("drops blank rows and keeps unique positional ids", () => {
    const mapping = mapVerificationEvidence([
      evidenceDraft({ evidenceId: "e9", summary: "First" }),
      evidenceDraft({ key: "blank", summary: "   " }),
      evidenceDraft({ key: "new", summary: "Second", command: " vp test " }),
    ]);
    expect(mapping.error).toBeNull();
    expect(mapping.evidence).toEqual([
      {
        evidenceId: "e9",
        result: "pass",
        summary: "First",
        recordedAt: "2026-10-24T12:00:00.000Z",
      },
      {
        evidenceId: "e1",
        command: "vp test",
        result: "pass",
        summary: "Second",
        recordedAt: "2026-10-24T12:00:00.000Z",
      },
    ]);
  });

  it("rejects an over-long evidence summary", () => {
    const mapping = mapVerificationEvidence([
      evidenceDraft({
        summary: "x".repeat(PROJECT_RUNTIME_BOUNDS.evidenceSummaryMaxLength + 1),
      }),
    ]);
    expect(mapping.error).toContain("Evidence 1");
  });
});

describe("verification rules", () => {
  it("requires passing evidence for passing milestones and never treats inconclusive as pass", () => {
    expect(verificationIssue("static-pass", [{ result: "inconclusive" }])).toContain(
      "passing evidence",
    );
    expect(verificationIssue("static-pass", [{ result: "pass" }])).toBeNull();
    expect(verificationIssue("implemented", [])).toBeNull();
    expect(verificationIssue("none", [{ result: "fail" }])).toBeNull();
  });

  it("forbids failing evidence only at verified", () => {
    expect(verificationIssue("verified", [{ result: "pass" }, { result: "fail" }])).toContain(
      "failing evidence",
    );
    expect(verificationIssue("integrated", [{ result: "pass" }, { result: "fail" }])).toBeNull();
  });
});

describe("task draft validation", () => {
  it("requires a blocker for blocked and a result for done", () => {
    expect(
      taskDraftIssue({
        status: "blocked",
        blockerSummary: "  ",
        result: "",
        criteriaError: null,
        verificationError: null,
      }),
    ).toContain("Blocked tasks need a blocker");
    expect(
      taskDraftIssue({
        status: "done",
        blockerSummary: "",
        result: " ",
        criteriaError: null,
        verificationError: null,
      }),
    ).toContain("Done tasks need a result");
    expect(
      taskDraftIssue({
        status: "done",
        blockerSummary: "",
        result: "Shipped",
        criteriaError: null,
        verificationError: "verification problem",
      }),
    ).toBe("verification problem");
  });

  it("builds a blocker input only with a non-empty optional detail", () => {
    expect(
      taskBlockerInput({
        classification: "integration-conflict",
        summary: " Waiting ",
        detail: " ",
      }),
    ).toEqual({ classification: "integration-conflict", summary: "Waiting" });
    expect(
      taskBlockerInput({
        classification: "review-required",
        summary: "Review",
        detail: " Needs sign-off ",
      }),
    ).toEqual({
      classification: "review-required",
      summary: "Review",
      detail: "Needs sign-off",
    });
  });
});
