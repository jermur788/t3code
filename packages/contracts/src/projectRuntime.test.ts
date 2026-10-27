import * as Schema from "effect/Schema";
import { describe, expect, it } from "vite-plus/test";

import { ProjectId, ThreadId } from "./baseSchemas.ts";
import { ProviderInstanceId } from "./providerInstance.ts";
import {
  PROJECT_RUNTIME_BOUNDS,
  PROJECT_RUNTIME_VERSION,
  ProjectRuntimeBlockerClassification,
  ProjectRuntimeConflictError,
  ProjectRuntimeContext,
  ProjectRuntimeDisabledError,
  ProjectRuntimeError,
  ProjectRuntimeEvidenceResult,
  ProjectRuntimeHandoff,
  ProjectRuntimeHandoffAppendInput,
  ProjectRuntimeHandoffId,
  ProjectRuntimeInvalidRangeError,
  ProjectRuntimeInvalidTransitionError,
  ProjectRuntimeInstructions,
  ProjectRuntimeInstructionsSaveInput,
  ProjectRuntimeNotFoundError,
  ProjectRuntimeProjectMismatchError,
  ProjectRuntimeSource,
  ProjectRuntimeSourceDisabledError,
  ProjectRuntimeSourceHealth,
  ProjectRuntimeSourceId,
  ProjectRuntimeSourceListInput,
  ProjectRuntimeSourceMatch,
  ProjectRuntimeSourceMissingError,
  ProjectRuntimeSourcePathError,
  ProjectRuntimeSourceReadInput,
  ProjectRuntimeSourceRole,
  ProjectRuntimeSourceSearchInput,
  ProjectRuntimeSourceUnsupportedError,
  ProjectRuntimeSourceUpdateInput,
  ProjectRuntimeTask,
  ProjectRuntimeTaskCreateInput,
  ProjectRuntimeTaskId,
  ProjectRuntimeTaskStatus,
  ProjectRuntimeTaskUpdateInput,
  ProjectRuntimeVerificationMilestone,
} from "./projectRuntime.ts";

const iso = "2026-10-22T00:00:00.000Z";
const projectId = ProjectId.make("project-1");
const sourceId = ProjectRuntimeSourceId.make("source-1");
const taskId = ProjectRuntimeTaskId.make("task-1");
const handoffId = ProjectRuntimeHandoffId.make("handoff-1");

const decodeInstructions = Schema.decodeUnknownSync(ProjectRuntimeInstructions);
const decodeSource = Schema.decodeUnknownSync(ProjectRuntimeSource);
const decodeTask = Schema.decodeUnknownSync(ProjectRuntimeTask);
const decodeHandoff = Schema.decodeUnknownSync(ProjectRuntimeHandoff);
const decodeContext = Schema.decodeUnknownSync(ProjectRuntimeContext);
const decodeSourceListInput = Schema.decodeUnknownSync(ProjectRuntimeSourceListInput);
const decodeSourceSearchInput = Schema.decodeUnknownSync(ProjectRuntimeSourceSearchInput);
const decodeSourceReadInput = Schema.decodeUnknownSync(ProjectRuntimeSourceReadInput);
const decodeSourceMatch = Schema.decodeUnknownSync(ProjectRuntimeSourceMatch);
const decodeSourceUpdateInput = Schema.decodeUnknownSync(ProjectRuntimeSourceUpdateInput);
const decodeTaskCreateInput = Schema.decodeUnknownSync(ProjectRuntimeTaskCreateInput);
const decodeTaskUpdateInput = Schema.decodeUnknownSync(ProjectRuntimeTaskUpdateInput);
const decodeHandoffAppendInput = Schema.decodeUnknownSync(ProjectRuntimeHandoffAppendInput);
const decodeInstructionsSaveInput = Schema.decodeUnknownSync(ProjectRuntimeInstructionsSaveInput);
const decodeSourceRole = Schema.decodeUnknownSync(ProjectRuntimeSourceRole);
const decodeTaskStatus = Schema.decodeUnknownSync(ProjectRuntimeTaskStatus);
const decodeSourceHealth = Schema.decodeUnknownSync(ProjectRuntimeSourceHealth);
const decodeMilestone = Schema.decodeUnknownSync(ProjectRuntimeVerificationMilestone);
const decodeEvidenceResult = Schema.decodeUnknownSync(ProjectRuntimeEvidenceResult);
const decodeBlockerClassification = Schema.decodeUnknownSync(ProjectRuntimeBlockerClassification);

const source = {
  sourceId,
  projectId,
  title: "Project brief",
  role: "authority" as const,
  relativePath: "docs/brief.md",
  enabled: true,
  revision: 1,
  createdAt: iso,
  updatedAt: iso,
  createdBy: "user",
  updatedBy: "user",
};

const unverified = { milestone: "none" as const, evidence: [] };

const task = {
  taskId,
  projectId,
  title: "Implement Project Runtime",
  scope: "Project Runtime v1",
  owner: "worker",
  acceptanceCriteria: [{ id: "c1", text: "Contracts decode and reject invalid bounds." }],
  status: "active" as const,
  blocker: null,
  verification: unverified,
  latestHandoffId: null,
  revision: 1,
  createdAt: iso,
  updatedAt: iso,
  createdBy: "agent:thread-1",
  updatedBy: "agent:thread-1",
};

const evidence = {
  evidenceId: "e1",
  command: "vp test run projectRuntime.test.ts",
  result: "pass" as const,
  summary: "1184/1184 pass.",
  recordedAt: iso,
  criterionIds: ["c1"],
};

const handoff = {
  handoffId,
  projectId,
  taskId,
  checkpoint: "PRT-010",
  summary: "Contracts added.",
  filesChanged: [],
  verification: unverified,
  runtimeRevision: 0,
  taskRevision: 1,
  createdAt: iso,
  createdBy: "agent:thread-1",
};

const decodeProjectRuntimeSourceId = Schema.decodeSync(ProjectRuntimeSourceId);
const decodeProjectRuntimeTaskId = Schema.decodeSync(ProjectRuntimeTaskId);
const decodeProjectRuntimeHandoffId = Schema.decodeSync(ProjectRuntimeHandoffId);
const encodeConflictError = Schema.encodeSync(ProjectRuntimeConflictError);
const encodeTransitionError = Schema.encodeSync(ProjectRuntimeInvalidTransitionError);
const decodeRuntimeError = Schema.decodeSync(ProjectRuntimeError);

describe("Project Runtime records", () => {
  it("brands Runtime identifiers and rejects blank values", () => {
    expect(decodeProjectRuntimeSourceId("source-1")).toBe("source-1");
    expect(decodeProjectRuntimeTaskId("task-1")).toBe("task-1");
    expect(decodeProjectRuntimeHandoffId("handoff-1")).toBe("handoff-1");

    expect(() => decodeProjectRuntimeSourceId(" ")).toThrow();
    expect(() => decodeProjectRuntimeTaskId("")).toThrow();
    expect(() => decodeProjectRuntimeHandoffId(" ")).toThrow();
  });

  it("decodes instructions, sources, tasks, and handoffs", () => {
    expect(
      decodeInstructions({
        projectId,
        instructions: "Follow the project rules.",
        revision: 1,
        updatedAt: iso,
        updatedBy: "user",
      }),
    ).toEqual({
      projectId,
      instructions: "Follow the project rules.",
      revision: 1,
      updatedAt: iso,
      updatedBy: "user",
    });

    const decodedSource = decodeSource(source);
    expect(decodedSource).toEqual(source);
    expect(decodedSource).not.toHaveProperty("authorityRank");
    expect(decodedSource).not.toHaveProperty("description");

    const decodedTask = decodeTask(task);
    expect(decodedTask).toEqual(task);
    expect(decodedTask).not.toHaveProperty("objective");
    expect(decodedTask).not.toHaveProperty("outOfScope");
    expect(decodedTask).not.toHaveProperty("base");
    expect(decodedTask).not.toHaveProperty("verificationPlan");
    expect(decodedTask).not.toHaveProperty("result");
    expect(decodedTask).not.toHaveProperty("nextAction");

    const decodedHandoff = decodeHandoff(handoff);
    expect(decodedHandoff).toEqual(handoff);
    expect(decodedHandoff).not.toHaveProperty("result");
    expect(decodedHandoff).not.toHaveProperty("testsRun");
    expect(decodedHandoff).not.toHaveProperty("testsNotRun");
    expect(decodedHandoff).not.toHaveProperty("failuresRisks");
    expect(decodedHandoff).not.toHaveProperty("unresolvedDecisions");
    expect(decodedHandoff).not.toHaveProperty("repositoryState");
    expect(decodedHandoff).not.toHaveProperty("integrationState");
    expect(decodedHandoff).not.toHaveProperty("nextAction");
    expect(decodedHandoff).not.toHaveProperty("threadId");
    expect(decodedHandoff).not.toHaveProperty("providerInstanceId");
    expect(decodedHandoff).not.toHaveProperty("model");
  });

  it("round-trips the full task shape with base, blocker, and verification", () => {
    const full = {
      ...task,
      objective: "Durable project-owned task state.",
      outOfScope: "No kanban, no automation.",
      base: {
        repository: "github.com/jermur788/t3code",
        branch: "feature/project-runtime-v1",
        revision: "f9c1d023f1dad68360e19a8db89c9c485e2da410",
        worktreePath: "/tmp/project-runtime-v1",
        upstreamRevision: "560ddb14d90eba7652da4f7846e4b18d4d802aa4",
        notes: "Descriptive only.",
      },
      acceptanceCriteria: [
        { id: "c1", text: "Contracts decode." },
        { id: "c2", text: "Bounds hold." },
      ],
      verificationPlan: "Run focused suites, then check:changed.",
      blocker: {
        classification: "verification-failure" as const,
        summary: "One suite times out.",
        detail: "provider-opencode usage.test.ts.",
        createdAt: iso,
      },
      result: "Implemented and statically verified.",
      verification: {
        milestone: "static-pass" as const,
        evidence: [evidence],
      },
      latestHandoffId: handoffId,
      nextAction: "Open PRT-020.",
    };
    const decoded = decodeTask(full);
    expect(decoded).toEqual(full);
  });

  it("round-trips the full handoff shape with provenance and structured fields", () => {
    const full = {
      ...handoff,
      result: "INTEGRATED.",
      filesChanged: ["packages/contracts/src/projectRuntime.ts"],
      testsRun: ["vp test run projectRuntime.test.ts"],
      testsNotRun: ["provider-opencode full suite"],
      failuresRisks: "One known timeout remains.",
      unresolvedDecisions: ["Split criteria on lines?"],
      repositoryState: "branch t1/task-handoff-state-v1, clean",
      integrationState: "based on integration/current-upstream",
      verification: { milestone: "static-pass" as const, evidence: [evidence] },
      nextAction: "Implement persistence.",
      threadId: ThreadId.make("thread-1"),
      providerInstanceId: ProviderInstanceId.make("codex"),
      model: "gpt-5.3-codex",
    };
    const decoded = decodeHandoff(full);
    expect(decoded).toEqual(full);
  });

  it("accepts only the approved role, status, milestone, evidence, blocker, and health vocabulary", () => {
    for (const role of ["authority", "implementation", "knowledge", "reference"]) {
      expect(decodeSourceRole(role)).toBe(role);
    }
    expect(() => decodeSourceRole("accepted")).toThrow();

    for (const status of [
      "planned",
      "ready",
      "active",
      "blocked",
      "review",
      "done",
      "deferred",
      "cancelled",
    ]) {
      expect(decodeTaskStatus(status)).toBe(status);
    }
    expect(() => decodeTaskStatus("in_progress")).toThrow();

    for (const milestone of [
      "none",
      "implemented",
      "static-pass",
      "runtime-pass",
      "review-pass",
      "integrated",
      "verified",
    ]) {
      expect(decodeMilestone(milestone)).toBe(milestone);
    }
    expect(() => decodeMilestone("static_pass")).toThrow();

    for (const result of ["pass", "fail", "inconclusive"]) {
      expect(decodeEvidenceResult(result)).toBe(result);
    }
    expect(() => decodeEvidenceResult("passed")).toThrow();

    for (const classification of [
      "implementation-defect",
      "verification-failure",
      "operational-blocker",
      "review-required",
      "integration-conflict",
      "upstream-compatibility",
      "product-decision",
    ]) {
      expect(decodeBlockerClassification(classification)).toBe(classification);
    }
    expect(() => decodeBlockerClassification("unknown")).toThrow();

    for (const health of ["available", "missing", "unreadable", "unsupported"]) {
      expect(decodeSourceHealth(health)).toBe(health);
    }
    expect(() => decodeSourceHealth("binary")).toThrow();
  });

  it("preserves optional metadata and explicit null clearing on updates", () => {
    const decodedSource = decodeSource({
      ...source,
      authorityRank: 2,
      description: "Governing product decisions.",
    });
    expect(decodedSource.authorityRank).toBe(2);
    expect(decodedSource.description).toBe("Governing product decisions.");

    expect(
      decodeSourceUpdateInput({
        sourceId,
        expectedRevision: 1,
        authorityRank: null,
        description: null,
      }),
    ).toEqual({
      sourceId,
      expectedRevision: 1,
      authorityRank: null,
      description: null,
    });

    const decodedUpdate = decodeTaskUpdateInput({
      taskId,
      expectedRevision: 1,
      objective: null,
      outOfScope: null,
      base: null,
      verificationPlan: null,
      blocker: null,
      result: null,
      verification: null,
      nextAction: null,
    });
    expect(decodedUpdate).toEqual({
      taskId,
      expectedRevision: 1,
      objective: null,
      outOfScope: null,
      base: null,
      verificationPlan: null,
      blocker: null,
      result: null,
      verification: null,
      nextAction: null,
    });

    expect(
      decodeTaskUpdateInput({
        taskId,
        expectedRevision: 2,
        status: "blocked",
        blocker: {
          classification: "product-decision",
          summary: "Awaiting the owner's call.",
        },
      }),
    ).toEqual({
      taskId,
      expectedRevision: 2,
      status: "blocked",
      blocker: { classification: "product-decision", summary: "Awaiting the owner's call." },
    });
  });
});

describe("Project Runtime bounds", () => {
  it("bounds instructions and source text", () => {
    expect(() =>
      decodeInstructions({
        projectId,
        instructions: "x".repeat(PROJECT_RUNTIME_BOUNDS.instructionsMaxLength + 1),
        revision: 1,
        updatedAt: iso,
        updatedBy: "user",
      }),
    ).toThrow();

    expect(() =>
      decodeSource({
        ...source,
        title: "x".repeat(PROJECT_RUNTIME_BOUNDS.sourceTitleMaxLength + 1),
      }),
    ).toThrow();
    expect(() =>
      decodeSource({
        ...source,
        relativePath: "x".repeat(PROJECT_RUNTIME_BOUNDS.sourcePathMaxLength + 1),
      }),
    ).toThrow();
    expect(() =>
      decodeSource({
        ...source,
        description: "x".repeat(PROJECT_RUNTIME_BOUNDS.sourceDescriptionMaxLength + 1),
      }),
    ).toThrow();
  });

  it("accepts boundary values for tasks", () => {
    expect(
      decodeTask({
        ...task,
        title: "x".repeat(PROJECT_RUNTIME_BOUNDS.taskTitleMaxLength),
        objective: "x".repeat(PROJECT_RUNTIME_BOUNDS.taskObjectiveMaxLength),
        scope: "x".repeat(PROJECT_RUNTIME_BOUNDS.taskTextMaxLength),
        outOfScope: "x".repeat(PROJECT_RUNTIME_BOUNDS.taskOutOfScopeMaxLength),
        owner: "x".repeat(PROJECT_RUNTIME_BOUNDS.actorMaxLength),
        base: {
          repository: "x".repeat(PROJECT_RUNTIME_BOUNDS.baseRepositoryMaxLength),
          branch: "x".repeat(PROJECT_RUNTIME_BOUNDS.baseBranchMaxLength),
          revision: "x".repeat(PROJECT_RUNTIME_BOUNDS.baseRevisionMaxLength),
          worktreePath: "x".repeat(PROJECT_RUNTIME_BOUNDS.baseWorktreePathMaxLength),
          upstreamRevision: "x".repeat(PROJECT_RUNTIME_BOUNDS.baseUpstreamRevisionMaxLength),
          notes: "x".repeat(PROJECT_RUNTIME_BOUNDS.baseNotesMaxLength),
        },
        acceptanceCriteria: Array.from(
          { length: PROJECT_RUNTIME_BOUNDS.criteriaMaxCount },
          (_, i) => ({
            id: `c${i + 1}`,
            text: "x".repeat(PROJECT_RUNTIME_BOUNDS.criterionTextMaxLength),
          }),
        ),
        verificationPlan: "x".repeat(PROJECT_RUNTIME_BOUNDS.taskVerificationPlanMaxLength),
        blocker: {
          classification: "operational-blocker",
          summary: "x".repeat(PROJECT_RUNTIME_BOUNDS.blockerSummaryMaxLength),
          detail: "x".repeat(PROJECT_RUNTIME_BOUNDS.blockerDetailMaxLength),
          createdAt: iso,
        },
        result: "x".repeat(PROJECT_RUNTIME_BOUNDS.taskResultMaxLength),
        verification: {
          milestone: "verified",
          evidence: Array.from({ length: PROJECT_RUNTIME_BOUNDS.evidenceMaxCount }, (_, i) => ({
            evidenceId: `e${i + 1}`,
            command: "x".repeat(PROJECT_RUNTIME_BOUNDS.evidenceCommandMaxLength),
            result: "pass" as const,
            summary: "x".repeat(PROJECT_RUNTIME_BOUNDS.evidenceSummaryMaxLength),
            recordedAt: iso,
          })),
        },
        nextAction: "x".repeat(PROJECT_RUNTIME_BOUNDS.taskNextActionMaxLength),
      }),
    ).toBeTruthy();
  });

  it("rejects over-bound tasks", () => {
    expect(() =>
      decodeTask({ ...task, title: "x".repeat(PROJECT_RUNTIME_BOUNDS.taskTitleMaxLength + 1) }),
    ).toThrow();
    expect(() =>
      decodeTask({ ...task, scope: "x".repeat(PROJECT_RUNTIME_BOUNDS.taskTextMaxLength + 1) }),
    ).toThrow();
    expect(() =>
      decodeTask({
        ...task,
        objective: "x".repeat(PROJECT_RUNTIME_BOUNDS.taskObjectiveMaxLength + 1),
      }),
    ).toThrow();
    expect(() =>
      decodeTask({
        ...task,
        outOfScope: "x".repeat(PROJECT_RUNTIME_BOUNDS.taskOutOfScopeMaxLength + 1),
      }),
    ).toThrow();
    expect(() =>
      decodeTask({
        ...task,
        verificationPlan: "x".repeat(PROJECT_RUNTIME_BOUNDS.taskVerificationPlanMaxLength + 1),
      }),
    ).toThrow();
    expect(() =>
      decodeTask({ ...task, result: "x".repeat(PROJECT_RUNTIME_BOUNDS.taskResultMaxLength + 1) }),
    ).toThrow();
    expect(() =>
      decodeTask({
        ...task,
        nextAction: "x".repeat(PROJECT_RUNTIME_BOUNDS.taskNextActionMaxLength + 1),
      }),
    ).toThrow();
    expect(() =>
      decodeTask({
        ...task,
        base: { branch: "x".repeat(PROJECT_RUNTIME_BOUNDS.baseBranchMaxLength + 1) },
      }),
    ).toThrow();
    expect(() =>
      decodeTask({
        ...task,
        base: { revision: "x".repeat(PROJECT_RUNTIME_BOUNDS.baseRevisionMaxLength + 1) },
      }),
    ).toThrow();
    expect(() =>
      decodeTask({
        ...task,
        base: { worktreePath: "x".repeat(PROJECT_RUNTIME_BOUNDS.baseWorktreePathMaxLength + 1) },
      }),
    ).toThrow();
    expect(() =>
      decodeTask({
        ...task,
        blocker: {
          classification: "implementation-defect",
          summary: "x".repeat(PROJECT_RUNTIME_BOUNDS.blockerSummaryMaxLength + 1),
          createdAt: iso,
        },
      }),
    ).toThrow();
    expect(() =>
      decodeTask({
        ...task,
        blocker: {
          classification: "implementation-defect",
          summary: "broken",
          detail: "x".repeat(PROJECT_RUNTIME_BOUNDS.blockerDetailMaxLength + 1),
          createdAt: iso,
        },
      }),
    ).toThrow();
    expect(() =>
      decodeTask({
        ...task,
        acceptanceCriteria: [
          { id: "c1", text: "x".repeat(PROJECT_RUNTIME_BOUNDS.criterionTextMaxLength + 1) },
        ],
      }),
    ).toThrow();
    expect(() =>
      decodeTask({
        ...task,
        acceptanceCriteria: Array.from(
          { length: PROJECT_RUNTIME_BOUNDS.criteriaMaxCount + 1 },
          (_, i) => ({ id: `c${i + 1}`, text: "x" }),
        ),
      }),
    ).toThrow();
    expect(() =>
      decodeTask({
        ...task,
        verification: {
          milestone: "verified",
          evidence: [
            {
              ...evidence,
              summary: "x".repeat(PROJECT_RUNTIME_BOUNDS.evidenceSummaryMaxLength + 1),
            },
          ],
        },
      }),
    ).toThrow();
    expect(() =>
      decodeTask({
        ...task,
        verification: {
          milestone: "verified",
          evidence: [
            {
              ...evidence,
              command: "x".repeat(PROJECT_RUNTIME_BOUNDS.evidenceCommandMaxLength + 1),
            },
          ],
        },
      }),
    ).toThrow();
    expect(() =>
      decodeTask({
        ...task,
        verification: {
          milestone: "verified",
          evidence: Array.from({ length: PROJECT_RUNTIME_BOUNDS.evidenceMaxCount + 1 }, (_, i) => ({
            evidenceId: `e${i + 1}`,
            result: "pass" as const,
            summary: "x",
            recordedAt: iso,
          })),
        },
      }),
    ).toThrow();
  });

  it("accepts boundary values for handoffs", () => {
    expect(
      decodeHandoff({
        ...handoff,
        checkpoint: "x".repeat(PROJECT_RUNTIME_BOUNDS.handoffCheckpointMaxLength),
        summary: "x".repeat(PROJECT_RUNTIME_BOUNDS.handoffSummaryMaxLength),
        result: "x".repeat(PROJECT_RUNTIME_BOUNDS.handoffResultMaxLength),
        filesChanged: Array.from({ length: PROJECT_RUNTIME_BOUNDS.handoffFileMaxCount }, () =>
          "x".repeat(PROJECT_RUNTIME_BOUNDS.handoffFileMaxLength),
        ),
        testsRun: Array.from({ length: PROJECT_RUNTIME_BOUNDS.handoffTestMaxCount }, () =>
          "x".repeat(PROJECT_RUNTIME_BOUNDS.handoffTestMaxLength),
        ),
        testsNotRun: Array.from({ length: PROJECT_RUNTIME_BOUNDS.handoffTestMaxCount }, () =>
          "x".repeat(PROJECT_RUNTIME_BOUNDS.handoffTestMaxLength),
        ),
        failuresRisks: "x".repeat(PROJECT_RUNTIME_BOUNDS.handoffTextMaxLength),
        unresolvedDecisions: Array.from(
          { length: PROJECT_RUNTIME_BOUNDS.handoffDecisionMaxCount },
          () => "x".repeat(PROJECT_RUNTIME_BOUNDS.handoffDecisionMaxLength),
        ),
        repositoryState: "x".repeat(PROJECT_RUNTIME_BOUNDS.handoffStateMaxLength),
        integrationState: "x".repeat(PROJECT_RUNTIME_BOUNDS.handoffStateMaxLength),
        nextAction: "x".repeat(PROJECT_RUNTIME_BOUNDS.handoffTextMaxLength),
      }),
    ).toBeTruthy();
  });

  it("rejects over-bound handoffs", () => {
    expect(() =>
      decodeHandoff({
        ...handoff,
        checkpoint: "x".repeat(PROJECT_RUNTIME_BOUNDS.handoffCheckpointMaxLength + 1),
      }),
    ).toThrow();
    expect(() =>
      decodeHandoff({
        ...handoff,
        summary: "x".repeat(PROJECT_RUNTIME_BOUNDS.handoffSummaryMaxLength + 1),
      }),
    ).toThrow();
    expect(() =>
      decodeHandoff({
        ...handoff,
        result: "x".repeat(PROJECT_RUNTIME_BOUNDS.handoffResultMaxLength + 1),
      }),
    ).toThrow();
    expect(() =>
      decodeHandoff({
        ...handoff,
        filesChanged: ["x".repeat(PROJECT_RUNTIME_BOUNDS.handoffFileMaxLength + 1)],
      }),
    ).toThrow();
    expect(() =>
      decodeHandoff({
        ...handoff,
        filesChanged: Array.from(
          { length: PROJECT_RUNTIME_BOUNDS.handoffFileMaxCount + 1 },
          () => "x",
        ),
      }),
    ).toThrow();
    expect(() =>
      decodeHandoff({
        ...handoff,
        testsRun: ["x".repeat(PROJECT_RUNTIME_BOUNDS.handoffTestMaxLength + 1)],
      }),
    ).toThrow();
    expect(() =>
      decodeHandoff({
        ...handoff,
        testsRun: Array.from({ length: PROJECT_RUNTIME_BOUNDS.handoffTestMaxCount + 1 }, () => "x"),
      }),
    ).toThrow();
    expect(() =>
      decodeHandoff({
        ...handoff,
        failuresRisks: "x".repeat(PROJECT_RUNTIME_BOUNDS.handoffTextMaxLength + 1),
      }),
    ).toThrow();
    expect(() =>
      decodeHandoff({
        ...handoff,
        unresolvedDecisions: ["x".repeat(PROJECT_RUNTIME_BOUNDS.handoffDecisionMaxLength + 1)],
      }),
    ).toThrow();
    expect(() =>
      decodeHandoff({
        ...handoff,
        repositoryState: "x".repeat(PROJECT_RUNTIME_BOUNDS.handoffStateMaxLength + 1),
      }),
    ).toThrow();
    expect(() =>
      decodeHandoff({
        ...handoff,
        integrationState: "x".repeat(PROJECT_RUNTIME_BOUNDS.handoffStateMaxLength + 1),
      }),
    ).toThrow();
    expect(() =>
      decodeHandoff({
        ...handoff,
        nextAction: "x".repeat(PROJECT_RUNTIME_BOUNDS.handoffTextMaxLength + 1),
      }),
    ).toThrow();
    expect(() =>
      decodeHandoff({
        ...handoff,
        verification: {
          milestone: "verified",
          evidence: [
            {
              ...evidence,
              summary: "x".repeat(PROJECT_RUNTIME_BOUNDS.evidenceSummaryMaxLength + 1),
            },
          ],
        },
      }),
    ).toThrow();
  });

  it("rejects malformed criterion and evidence identifiers", () => {
    for (const id of ["c.1", "c 1", "c1!", "", " "]) {
      expect(() => decodeTask({ ...task, acceptanceCriteria: [{ id, text: "x" }] })).toThrow();
      expect(() =>
        decodeTask({
          ...task,
          verification: {
            milestone: "implemented",
            evidence: [{ ...evidence, evidenceId: id }],
          },
        }),
      ).toThrow();
    }
    expect(() =>
      decodeTask({
        ...task,
        acceptanceCriteria: [
          { id: "x".repeat(PROJECT_RUNTIME_BOUNDS.criterionIdMaxLength + 1), text: "x" },
        ],
      }),
    ).toThrow();
    for (const id of ["c1", "a_b-C9", "0"]) {
      expect(() => decodeTask({ ...task, acceptanceCriteria: [{ id, text: "x" }] })).not.toThrow();
    }
  });

  it("links evidence to criteria at the schema level", () => {
    const decoded = decodeTask({
      ...task,
      acceptanceCriteria: [
        { id: "c1", text: "One" },
        { id: "c2", text: "Two" },
      ],
      verification: {
        milestone: "static-pass",
        evidence: [
          { ...evidence, criterionIds: ["c1", "c2"] },
          { evidenceId: "e2", result: "inconclusive", summary: "Not linked.", recordedAt: iso },
        ],
      },
    });
    expect(decoded.verification.evidence[0]?.criterionIds).toEqual(["c1", "c2"]);
    expect(decoded.verification.evidence[1]).not.toHaveProperty("criterionIds");
    expect(() =>
      decodeTask({
        ...task,
        verification: {
          milestone: "static-pass",
          evidence: [{ ...evidence, criterionIds: ["c.1"] }],
        },
      }),
    ).toThrow();
  });

  it("bounds list, search, and read requests", () => {
    expect(decodeSourceListInput({ limit: PROJECT_RUNTIME_BOUNDS.listMaxLimit })).toEqual({
      limit: PROJECT_RUNTIME_BOUNDS.listMaxLimit,
    });
    expect(() =>
      decodeSourceListInput({ limit: PROJECT_RUNTIME_BOUNDS.listMaxLimit + 1 }),
    ).toThrow();

    expect(
      decodeSourceSearchInput({
        query: "authority",
        limit: PROJECT_RUNTIME_BOUNDS.searchMaxLimit,
      }),
    ).toEqual({ query: "authority", limit: PROJECT_RUNTIME_BOUNDS.searchMaxLimit });
    expect(() => decodeSourceSearchInput({ query: "" })).toThrow();
    expect(() => decodeSourceSearchInput({ query: " " })).not.toThrow();
    expect(() =>
      decodeSourceSearchInput({
        query: "x".repeat(PROJECT_RUNTIME_BOUNDS.searchQueryMaxLength + 1),
      }),
    ).toThrow();

    expect(decodeSourceReadInput({ sourceId })).toEqual({ sourceId });
    expect(
      decodeSourceReadInput({
        sourceId,
        fromLine: 1,
        lineCount: PROJECT_RUNTIME_BOUNDS.readMaxLines,
      }),
    ).toEqual({ sourceId, fromLine: 1, lineCount: PROJECT_RUNTIME_BOUNDS.readMaxLines });
    expect(() =>
      decodeSourceReadInput({
        sourceId,
        lineCount: PROJECT_RUNTIME_BOUNDS.readMaxLines + 1,
      }),
    ).toThrow();

    const match = {
      sourceId,
      path: "docs/brief.md",
      lineNumber: 1,
      lineContent: "project authority",
      matchRanges: [{ start: 0, end: 7 }],
    };
    expect(decodeSourceMatch(match)).toEqual(match);
    expect(() =>
      decodeSourceMatch({
        ...match,
        lineContent: "x".repeat(PROJECT_RUNTIME_BOUNDS.searchLineMaxLength + 1),
      }),
    ).toThrow();
  });

  it("bounds the bootstrap context deterministically", () => {
    const descriptor = {
      sourceId,
      title: "Project brief",
      role: "authority" as const,
      relativePath: "docs/brief.md",
      enabled: true,
    };
    const summary = {
      taskId,
      title: "Implement Project Runtime",
      status: "active" as const,
      updatedAt: iso,
      latestHandoff: null,
    };
    const context = {
      projectId,
      status: { enabled: true, version: PROJECT_RUNTIME_VERSION, revision: 0 },
      instructions: null,
      sources: Array.from({ length: PROJECT_RUNTIME_BOUNDS.contextMaxSources }, () => descriptor),
      tasks: Array.from({ length: PROJECT_RUNTIME_BOUNDS.contextMaxTasks }, () => summary),
      truncated: { sources: false, tasks: false, handoffs: false },
    };
    expect(decodeContext(context).sources).toHaveLength(PROJECT_RUNTIME_BOUNDS.contextMaxSources);
    expect(() =>
      decodeContext({
        ...context,
        sources: [...context.sources, descriptor],
      }),
    ).toThrow();
    expect(() =>
      decodeContext({
        ...context,
        tasks: [...context.tasks, summary],
      }),
    ).toThrow();
    expect(() =>
      decodeContext({
        ...context,
        status: { ...context.status, version: 2 },
      }),
    ).toThrow();
  });
});

describe("Project Runtime inputs", () => {
  it("requires expected revisions for task updates", () => {
    expect(() => decodeTaskUpdateInput({ taskId })).toThrow();
    expect(decodeTaskUpdateInput({ taskId, expectedRevision: 1, status: "blocked" })).toEqual({
      taskId,
      expectedRevision: 1,
      status: "blocked",
    });
  });

  it("requires structured acceptance criteria on task creation", () => {
    expect(decodeTaskCreateInput({ title: "T", scope: "S", acceptanceCriteria: [] })).toEqual({
      title: "T",
      scope: "S",
      acceptanceCriteria: [],
    });
    expect(() =>
      decodeTaskCreateInput({
        title: "T",
        scope: "S",
        acceptanceCriteria: "free text",
      }),
    ).toThrow();
  });

  it("accepts bounded handoff append and instructions save input", () => {
    expect(
      decodeHandoffAppendInput({
        taskId,
        expectedTaskRevision: 2,
        checkpoint: "PRT-010",
        summary: "Contracts added.",
        filesChanged: ["packages/contracts/src/projectRuntime.ts"],
        verification: { milestone: "implemented", evidence: [] },
      }),
    ).toEqual({
      taskId,
      expectedTaskRevision: 2,
      checkpoint: "PRT-010",
      summary: "Contracts added.",
      filesChanged: ["packages/contracts/src/projectRuntime.ts"],
      verification: { milestone: "implemented", evidence: [] },
    });
    expect(() =>
      decodeHandoffAppendInput({
        taskId,
        expectedTaskRevision: 2,
        checkpoint: "PRT-010",
        summary: "",
      }),
    ).toThrow();
    expect(() =>
      decodeHandoffAppendInput({
        taskId,
        expectedTaskRevision: 2,
        checkpoint: "PRT-010",
        summary: "s",
        verification: "1184/1184 pass",
      }),
    ).toThrow();

    expect(
      decodeInstructionsSaveInput({ instructions: "Follow the rules.", expectedRevision: 1 }),
    ).toEqual({ instructions: "Follow the rules.", expectedRevision: 1 });
    expect(decodeInstructionsSaveInput({ instructions: "" })).toEqual({ instructions: "" });
  });

  it("requires a task revision and decodes atomic task state for handoff append", () => {
    expect(() =>
      decodeHandoffAppendInput({ taskId, checkpoint: "PRT-010", summary: "No revision" }),
    ).toThrow();
    expect(() =>
      decodeHandoffAppendInput({
        taskId,
        expectedTaskRevision: 0,
        checkpoint: "PRT-010",
        summary: "Invalid revision",
      }),
    ).toThrow();
    expect(
      decodeHandoffAppendInput({
        taskId,
        expectedTaskRevision: 3,
        taskState: {
          status: "done",
          result: "Shipped",
          blocker: null,
          verification: null,
        },
        checkpoint: "PRT-010",
        summary: "Atomic append",
      }),
    ).toEqual({
      taskId,
      expectedTaskRevision: 3,
      taskState: {
        status: "done",
        result: "Shipped",
        blocker: null,
        verification: null,
      },
      checkpoint: "PRT-010",
      summary: "Atomic append",
    });
    expect(() =>
      decodeHandoffAppendInput({
        taskId,
        expectedTaskRevision: 3,
        taskState: { status: "unknown" },
        checkpoint: "PRT-010",
        summary: "Invalid status",
      }),
    ).toThrow();
  });
});

describe("Project Runtime structured errors", () => {
  it("derives messages from structured context", () => {
    const disabled = new ProjectRuntimeDisabledError({ projectId });
    expect(disabled.message).toContain("not enabled");
    expect(disabled.message).toContain(projectId);

    const missing = new ProjectRuntimeNotFoundError({
      projectId,
      entity: "task",
      entityId: taskId,
    });
    expect(missing.message).toContain("task task-1");
    expect(missing.message).toContain(projectId);

    const missingInstructions = new ProjectRuntimeNotFoundError({
      projectId,
      entity: "instructions",
    });
    expect(missingInstructions.message).toContain("record 'instructions' was not found");

    const mismatch = new ProjectRuntimeProjectMismatchError({
      projectId,
      entity: "source",
      entityId: sourceId,
    });
    expect(mismatch.message).toContain("does not belong");

    const conflict = new ProjectRuntimeConflictError({
      projectId,
      entity: "task",
      entityId: taskId,
      expectedRevision: 1,
      currentRevision: 2,
    });
    expect(conflict.message).toContain("revision 2");
    expect(conflict.message).toContain("expected revision 1");

    const transition = new ProjectRuntimeInvalidTransitionError({
      projectId,
      taskId,
      violation: "done_requires_result",
    });
    expect(transition.message).toContain("done requires result");

    const sourceDisabled = new ProjectRuntimeSourceDisabledError({ projectId, sourceId });
    expect(sourceDisabled.message).toContain("disabled");

    const sourceMissing = new ProjectRuntimeSourceMissingError({
      projectId,
      sourceId,
      relativePath: "docs/brief.md",
    });
    expect(sourceMissing.message).toContain("docs/brief.md");

    const unsupported = new ProjectRuntimeSourceUnsupportedError({
      projectId,
      sourceId,
      relativePath: "docs/brief.md",
      reason: "binary",
    });
    expect(unsupported.message).toContain("binary");

    const pathError = new ProjectRuntimeSourcePathError({
      projectId,
      relativePath: "../outside.md",
      reason: "outside_workspace",
    });
    expect(pathError.message).toContain("../outside.md");

    const range = new ProjectRuntimeInvalidRangeError({
      projectId,
      sourceId,
      fromLine: 1,
      lineCount: 500,
      maxLines: 400,
    });
    expect(range.message).toContain("400");
  });

  it("round-trips conflicts and invalid transitions through the tagged error union", () => {
    const conflict = new ProjectRuntimeConflictError({
      projectId,
      entity: "task",
      entityId: taskId,
      expectedRevision: 1,
      currentRevision: 2,
    });
    const encoded = encodeConflictError(conflict);
    expect(encoded).toMatchObject({
      _tag: "ProjectRuntimeConflictError",
      projectId,
      entity: "task",
      entityId: taskId,
      expectedRevision: 1,
      currentRevision: 2,
    });

    const decoded = decodeRuntimeError(encoded);
    expect(decoded._tag).toBe("ProjectRuntimeConflictError");
    expect(decoded.message).toBe(conflict.message);

    const transition = new ProjectRuntimeInvalidTransitionError({
      projectId,
      taskId,
      violation: "blocked_requires_blocker",
    });
    const encodedTransition = encodeTransitionError(transition);
    expect(encodedTransition).toMatchObject({
      _tag: "ProjectRuntimeInvalidTransitionError",
      violation: "blocked_requires_blocker",
    });
    const decodedTransition = decodeRuntimeError(encodedTransition);
    expect(decodedTransition._tag).toBe("ProjectRuntimeInvalidTransitionError");
  });
});
