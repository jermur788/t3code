import * as Schema from "effect/Schema";
import { describe, expect, it } from "vite-plus/test";

import { ProjectId, ThreadId } from "./baseSchemas.ts";
import { ProviderInstanceId } from "./providerInstance.ts";
import {
  PROJECT_RUNTIME_BOUNDS,
  PROJECT_RUNTIME_VERSION,
  ProjectRuntimeConflictError,
  ProjectRuntimeContext,
  ProjectRuntimeDisabledError,
  ProjectRuntimeError,
  ProjectRuntimeHandoff,
  ProjectRuntimeHandoffAppendInput,
  ProjectRuntimeHandoffId,
  ProjectRuntimeInvalidRangeError,
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
  ProjectRuntimeTaskId,
  ProjectRuntimeTaskStatus,
  ProjectRuntimeTaskUpdateInput,
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
const decodeTaskUpdateInput = Schema.decodeUnknownSync(ProjectRuntimeTaskUpdateInput);
const decodeHandoffAppendInput = Schema.decodeUnknownSync(ProjectRuntimeHandoffAppendInput);
const decodeInstructionsSaveInput = Schema.decodeUnknownSync(ProjectRuntimeInstructionsSaveInput);
const decodeSourceRole = Schema.decodeUnknownSync(ProjectRuntimeSourceRole);
const decodeTaskStatus = Schema.decodeUnknownSync(ProjectRuntimeTaskStatus);
const decodeSourceHealth = Schema.decodeUnknownSync(ProjectRuntimeSourceHealth);

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

const task = {
  taskId,
  projectId,
  title: "Implement Project Runtime",
  status: "active" as const,
  scope: "Project Runtime v1",
  acceptanceCriteria: "Contracts decode and reject invalid bounds.",
  revision: 1,
  createdAt: iso,
  updatedAt: iso,
  createdBy: "agent:thread-1",
  updatedBy: "agent:thread-1",
};

const handoff = {
  handoffId,
  projectId,
  taskId,
  checkpoint: "PRT-010",
  summary: "Contracts added.",
  runtimeRevision: 0,
  taskRevision: 1,
  createdAt: iso,
  createdBy: "agent:thread-1",
};

const decodeProjectRuntimeSourceId = Schema.decodeSync(ProjectRuntimeSourceId);
const decodeProjectRuntimeTaskId = Schema.decodeSync(ProjectRuntimeTaskId);
const decodeProjectRuntimeHandoffId = Schema.decodeSync(ProjectRuntimeHandoffId);
const encodeConflictError = Schema.encodeSync(ProjectRuntimeConflictError);
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

    expect(decodeTask(task)).toEqual(task);

    const decodedHandoff = decodeHandoff(handoff);
    expect(decodedHandoff).toEqual(handoff);
    expect(decodedHandoff).not.toHaveProperty("threadId");
    expect(decodedHandoff).not.toHaveProperty("providerInstanceId");
    expect(decodedHandoff).not.toHaveProperty("model");
  });

  it("preserves optional metadata and explicit null clearing on updates", () => {
    const decodedSource = decodeSource({
      ...source,
      authorityRank: 2,
      description: "Governing product decisions.",
    });
    expect(decodedSource.authorityRank).toBe(2);
    expect(decodedSource.description).toBe("Governing product decisions.");

    const decodedTask = decodeTask({
      ...task,
      nextAction: "Open PRT-020.",
      branch: "feature/project-runtime-v1",
      worktreePath: "/tmp/project-runtime-v1",
      baseSha: "f9c1d023f1dad68360e19a8db89c9c485e2da410",
    });
    expect(decodedTask.nextAction).toBe("Open PRT-020.");
    expect(decodedTask.branch).toBe("feature/project-runtime-v1");
    expect(decodedTask.worktreePath).toBe("/tmp/project-runtime-v1");
    expect(decodedTask.baseSha).toBe("f9c1d023f1dad68360e19a8db89c9c485e2da410");

    const decodedHandoff = decodeHandoff({
      ...handoff,
      changes: "Added contracts.",
      verification: "Contract tests.",
      failuresOrBlockers: "None.",
      nextAction: "Implement persistence.",
      evidenceRefs: ["PRT-010", "packages/contracts/src/projectRuntime.ts"],
      threadId: ThreadId.make("thread-1"),
      providerInstanceId: ProviderInstanceId.make("codex"),
      model: "gpt-5.3-codex",
    });
    expect(decodedHandoff.evidenceRefs).toEqual([
      "PRT-010",
      "packages/contracts/src/projectRuntime.ts",
    ]);
    expect(decodedHandoff.threadId).toBe("thread-1");
    expect(decodedHandoff.providerInstanceId).toBe("codex");
    expect(decodedHandoff.model).toBe("gpt-5.3-codex");

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
    expect(
      decodeTaskUpdateInput({
        taskId,
        expectedRevision: 1,
        nextAction: null,
        branch: null,
        worktreePath: null,
        baseSha: null,
      }),
    ).toEqual({
      taskId,
      expectedRevision: 1,
      nextAction: null,
      branch: null,
      worktreePath: null,
      baseSha: null,
    });
  });

  it("accepts only the approved role, status, and health vocabulary", () => {
    for (const role of ["authority", "implementation", "knowledge", "reference"]) {
      expect(decodeSourceRole(role)).toBe(role);
    }
    expect(() => decodeSourceRole("accepted")).toThrow();

    for (const status of ["planned", "ready", "active", "blocked", "review", "done", "cancelled"]) {
      expect(decodeTaskStatus(status)).toBe(status);
    }
    expect(() => decodeTaskStatus("in_progress")).toThrow();

    for (const health of ["available", "missing", "unreadable", "unsupported"]) {
      expect(decodeSourceHealth(health)).toBe(health);
    }
    expect(() => decodeSourceHealth("binary")).toThrow();
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

  it("bounds task and handoff text", () => {
    expect(() =>
      decodeTask({ ...task, title: "x".repeat(PROJECT_RUNTIME_BOUNDS.taskTitleMaxLength + 1) }),
    ).toThrow();
    expect(() =>
      decodeTask({ ...task, scope: "x".repeat(PROJECT_RUNTIME_BOUNDS.taskTextMaxLength + 1) }),
    ).toThrow();
    expect(() =>
      decodeTask({
        ...task,
        acceptanceCriteria: "x".repeat(PROJECT_RUNTIME_BOUNDS.taskTextMaxLength + 1),
      }),
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
        branch: "x".repeat(PROJECT_RUNTIME_BOUNDS.taskBranchMaxLength + 1),
      }),
    ).toThrow();
    expect(() =>
      decodeTask({
        ...task,
        worktreePath: "x".repeat(PROJECT_RUNTIME_BOUNDS.taskWorktreePathMaxLength + 1),
      }),
    ).toThrow();
    expect(() =>
      decodeTask({
        ...task,
        baseSha: "x".repeat(PROJECT_RUNTIME_BOUNDS.taskBaseShaMaxLength + 1),
      }),
    ).toThrow();

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
        changes: "x".repeat(PROJECT_RUNTIME_BOUNDS.handoffTextMaxLength + 1),
      }),
    ).toThrow();
    expect(() =>
      decodeHandoff({
        ...handoff,
        evidenceRefs: Array.from(
          { length: PROJECT_RUNTIME_BOUNDS.handoffEvidenceMaxCount + 1 },
          () => "evidence",
        ),
      }),
    ).toThrow();
    expect(() =>
      decodeHandoff({
        ...handoff,
        evidenceRefs: ["x".repeat(PROJECT_RUNTIME_BOUNDS.handoffEvidenceMaxLength + 1)],
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

  it("accepts bounded handoff append and instructions save input", () => {
    expect(
      decodeHandoffAppendInput({
        taskId,
        checkpoint: "PRT-010",
        summary: "Contracts added.",
        evidenceRefs: ["PRT-010"],
      }),
    ).toEqual({
      taskId,
      checkpoint: "PRT-010",
      summary: "Contracts added.",
      evidenceRefs: ["PRT-010"],
    });
    expect(() =>
      decodeHandoffAppendInput({ taskId, checkpoint: "PRT-010", summary: "" }),
    ).toThrow();

    expect(
      decodeInstructionsSaveInput({ instructions: "Follow the rules.", expectedRevision: 1 }),
    ).toEqual({ instructions: "Follow the rules.", expectedRevision: 1 });
    expect(decodeInstructionsSaveInput({ instructions: "" })).toEqual({ instructions: "" });
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

  it("round-trips a conflict through the tagged error union", () => {
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
  });
});
