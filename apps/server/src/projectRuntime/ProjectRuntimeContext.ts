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

const toSummary = (
  task: ProjectRuntimeTask,
  latestHandoff: ProjectRuntimeHandoffReference | null,
): ProjectRuntimeTaskSummary => ({
  taskId: task.taskId,
  title: task.title,
  status: task.status,
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

/**
 * `contextMaxBytes` budgets only the variable bootstrap collections (source
 * descriptors, task summaries, latest-handoff references), measured as the
 * UTF-8 bytes of their serialized JSON. Project Instructions are deliberately
 * outside it: they keep their own `instructionsMaxLength` bound and are never
 * truncated, so the packed Runtime fields are bounded by that, this budget,
 * and the fixed status fields. Profile resolution adds separately bounded text.
 *
 * Packing is greedy in the given order: sources first, then tasks. A task
 * whose handoff reference does not fit is kept without it (`handoffs`); a task
 * that does not fit at all ends the list (`tasks`).
 */
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
