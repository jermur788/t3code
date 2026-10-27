import {
  PROJECT_RUNTIME_BOUNDS,
  type ProjectId,
  type ProjectRuntimeContext,
  type ProjectRuntimeHandoff,
  type ProjectRuntimeHandoffReference,
  type ProjectRuntimeInstructions,
  type ProjectRuntimeSource,
  type ProjectRuntimeSourceDescriptor,
  type ProjectRuntimeStatus,
  type ProjectRuntimeTask,
  type ProjectRuntimeTaskSummary,
} from "@t3tools/contracts";

const utf8Bytes = (value: unknown) => Buffer.byteLength(JSON.stringify(value), "utf8");

const toDescriptor = (source: ProjectRuntimeSource): ProjectRuntimeSourceDescriptor => ({
  sourceId: source.sourceId,
  title: source.title,
  role: source.role,
  ...(source.authorityRank === undefined ? {} : { authorityRank: source.authorityRank }),
  relativePath: source.relativePath,
  ...(source.description === undefined ? {} : { description: source.description }),
  enabled: source.enabled,
});

const toReference = (handoff: ProjectRuntimeHandoff): ProjectRuntimeHandoffReference => ({
  handoffId: handoff.handoffId,
  taskId: handoff.taskId,
  checkpoint: handoff.checkpoint,
  summary: handoff.summary,
  taskRevision: handoff.taskRevision,
  createdAt: handoff.createdAt,
});

// A summary is a projection, so a long blocker is clipped rather than copied in full.
// The surrogate check keeps the clip on a character boundary.
const clipBlockerSummary = (summary: string): string => {
  const maxLength = PROJECT_RUNTIME_BOUNDS.taskSummaryBlockerMaxLength;
  if (summary.length <= maxLength) return summary;
  const last = summary.charCodeAt(maxLength - 1);
  return summary.slice(0, last >= 0xd800 && last <= 0xdbff ? maxLength - 1 : maxLength).trimEnd();
};

const toSummary = (
  task: ProjectRuntimeTask,
  latestHandoff: ProjectRuntimeHandoffReference | null,
): ProjectRuntimeTaskSummary => ({
  taskId: task.taskId,
  title: task.title,
  status: task.status,
  verificationMilestone: task.verification.milestone,
  ...(task.blocker === null ? {} : { blockerSummary: clipBlockerSummary(task.blocker.summary) }),
  ...(task.nextAction === undefined ? {} : { nextAction: task.nextAction }),
  updatedAt: task.updatedAt,
  latestHandoff,
});

export interface ProjectRuntimeContextCandidates {
  readonly projectId: ProjectId;
  readonly status: ProjectRuntimeStatus;
  readonly instructions: ProjectRuntimeInstructions | null;
  /** Enabled sources in registry order; one beyond `contextMaxSources` says more exist. */
  readonly sources: ReadonlyArray<ProjectRuntimeSource>;
  /** Tasks in packing order, each with its latest handoff; one extra says more exist. */
  readonly tasks: ReadonlyArray<{
    readonly task: ProjectRuntimeTask;
    readonly latestHandoff: ProjectRuntimeHandoff | null;
  }>;
}

export const disabledContext = (
  projectId: ProjectId,
  status: ProjectRuntimeStatus,
): ProjectRuntimeContext => ({
  projectId,
  status,
  instructions: null,
  sources: [],
  tasks: [],
  truncated: { sources: false, tasks: false, handoffs: false },
});

// contextMaxBytes bounds variable collections as serialized JSON; Project Instructions keep
// their own bound. Packing is greedy: sources, then tasks; a task whose handoff does not fit
// stays without it, and one that fits in no form ends the list. Milestone and blocker summary
// stay with a task either way.
export const packContext = (
  candidates: ProjectRuntimeContextCandidates,
  maxBytes: number = PROJECT_RUNTIME_BOUNDS.contextMaxBytes,
): ProjectRuntimeContext => {
  let usedBytes = 0;
  // Entries of one JSON array are joined by a comma.
  const admit = (entry: unknown, entriesBefore: number) => {
    const bytes = utf8Bytes(entry) + (entriesBefore === 0 ? 0 : 1);
    if (usedBytes + bytes > maxBytes) return false;
    usedBytes += bytes;
    return true;
  };

  const sources: Array<ProjectRuntimeSourceDescriptor> = [];
  let sourcesTruncated = false;
  for (const source of candidates.sources) {
    const descriptor = toDescriptor(source);
    if (
      sources.length >= PROJECT_RUNTIME_BOUNDS.contextMaxSources ||
      !admit(descriptor, sources.length)
    ) {
      sourcesTruncated = true;
      break;
    }
    sources.push(descriptor);
  }

  const tasks: Array<ProjectRuntimeTaskSummary> = [];
  let tasksTruncated = false;
  let handoffsTruncated = false;
  for (const { task, latestHandoff } of candidates.tasks) {
    if (tasks.length >= PROJECT_RUNTIME_BOUNDS.contextMaxTasks) {
      tasksTruncated = true;
      break;
    }
    const full = toSummary(task, latestHandoff === null ? null : toReference(latestHandoff));
    if (admit(full, tasks.length)) {
      tasks.push(full);
      continue;
    }
    const bare = toSummary(task, null);
    if (latestHandoff !== null && admit(bare, tasks.length)) {
      tasks.push(bare);
      handoffsTruncated = true;
      continue;
    }
    tasksTruncated = true;
    break;
  }

  return {
    projectId: candidates.projectId,
    status: candidates.status,
    instructions: candidates.instructions,
    sources,
    tasks,
    truncated: { sources: sourcesTruncated, tasks: tasksTruncated, handoffs: handoffsTruncated },
  };
};
