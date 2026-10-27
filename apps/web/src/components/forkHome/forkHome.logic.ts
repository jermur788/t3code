import type {
  EffectiveProjectInstructions,
  ProjectRuntimeHandoffListResult,
  ProjectRuntimeInstructions,
  ProjectRuntimeSourceListResult,
  ProjectRuntimeTask,
  ProjectRuntimeTaskListResult,
} from "@t3tools/contracts";

import type {
  SidebarProjectGroupMember,
  SidebarProjectSnapshot,
} from "../../sidebarProjectGrouping";
import type { ResolvedSettingsScope, SettingsScopeSearch } from "../settings/settingsScope";

export type ForkSection<T> =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly value: T }
  | { readonly status: "unavailable"; readonly message: string };

export interface ForkInstructionSummary {
  readonly revision: number;
  readonly updatedAt: string;
  readonly updatedBy: string;
  readonly characters: number;
  readonly preview: string;
}

export interface ForkSourceSummary {
  readonly total: number;
  readonly enabled: number;
  readonly available: number;
  readonly missing: number;
  readonly unreadable: number;
  readonly unsupported: number;
  readonly truncated: boolean;
}

export interface ForkTaskHandoffReference {
  readonly handoffId: string;
  readonly checkpoint: string | null;
  readonly summary: string | null;
}

export interface ForkTaskCard {
  readonly taskId: string;
  readonly title: string;
  readonly status: ProjectRuntimeTask["status"];
  readonly owner: string;
  readonly blockerSummary: string | null;
  readonly verificationMilestone: ProjectRuntimeTask["verification"]["milestone"];
  readonly nextAction: string | null;
  readonly latestHandoff: ForkTaskHandoffReference | null;
}

export interface ForkTaskSummary {
  readonly total: number;
  readonly active: number;
  readonly blocked: number;
  readonly review: number;
  readonly ready: number;
  readonly done: number;
  readonly cards: readonly ForkTaskCard[];
  readonly truncated: boolean;
}

export interface ForkHandoffSummary {
  readonly latest: {
    readonly taskId: string;
    readonly taskTitle: string | null;
    readonly checkpoint: string;
    readonly summary: string;
    readonly createdAt: string;
  } | null;
  readonly total: number | null;
  readonly truncated: boolean;
}

export interface ForkProfileSummary {
  readonly assigned: boolean;
  readonly profileName: string | null;
  readonly profileId: string | null;
  readonly profileLayer: boolean;
  readonly projectLayer: boolean;
  readonly layerCount: number;
}

export interface ForkSelectedProject {
  readonly group: SidebarProjectSnapshot;
  readonly member: SidebarProjectGroupMember;
}

/**
 * TanStack's default search parser runs JSON.parse, so `?classic=1` arrives as
 * the number 1 rather than a string.
 */
export function keepsUpstreamHome(search: unknown): boolean {
  if (typeof search !== "object" || search === null) return false;
  const classic = (search as Record<string, unknown>)["classic"];
  return classic === true || classic === 1 || classic === "1";
}

/** Both the bare root and its fork-home target count as the app's landing page. */
export function isForkLandingPath(pathname: string): boolean {
  return pathname === "/" || pathname === "/home";
}

/** The fork home is the authenticated root; `?classic=1` opts into upstream. */
export function shouldRedirectToForkHome(input: {
  readonly pathname: string;
  readonly authStatus: string;
  readonly search: unknown;
}): boolean {
  return (
    input.pathname === "/" &&
    input.authStatus === "authenticated" &&
    !keepsUpstreamHome(input.search)
  );
}

function timeValue(iso: string): number {
  const value = Date.parse(iso);
  return Number.isNaN(value) ? 0 : value;
}

function newestMember(
  members: readonly SidebarProjectGroupMember[],
): SidebarProjectGroupMember | null {
  let newest: SidebarProjectGroupMember | null = null;
  for (const member of members) {
    if (newest === null || timeValue(member.updatedAt) > timeValue(newest.updatedAt)) {
      newest = member;
    }
  }
  return newest;
}

/** Home always names one concrete checkout so Runtime and Profiles have one owner. */
export function defaultForkProjectSelection(
  groups: readonly SidebarProjectSnapshot[],
): SettingsScopeSearch | null {
  let selectedGroup: SidebarProjectSnapshot | null = null;
  for (const group of groups) {
    if (group.isScratch || group.memberProjects.length === 0) continue;
    if (selectedGroup === null || timeValue(group.updatedAt) > timeValue(selectedGroup.updatedAt)) {
      selectedGroup = group;
    }
  }
  const member = selectedGroup === null ? null : newestMember(selectedGroup.memberProjects);
  if (selectedGroup === null || member === null) return null;
  return {
    project: selectedGroup.projectKey,
    machine: member.environmentId,
    checkout: member.physicalProjectKey,
  };
}

/** Returns the one concrete checkout a project-scoped home can operate on. */
export function selectedForkProject(
  scope: ResolvedSettingsScope | null,
): ForkSelectedProject | null {
  if (scope === null) return null;
  if (scope.kind === "checkout") {
    return { group: scope.group, member: scope.checkout };
  }
  if (scope.kind === "project") {
    const member = newestMember(scope.members);
    return member === null ? null : { group: scope.group, member };
  }
  return null;
}

export function selectionForProject(
  group: SidebarProjectSnapshot,
  member: SidebarProjectGroupMember,
): SettingsScopeSearch {
  return {
    project: group.projectKey,
    machine: member.environmentId,
    checkout: member.physicalProjectKey,
  };
}

export function projectOptionLabel(
  group: SidebarProjectSnapshot,
  member: SidebarProjectGroupMember,
): string {
  const workspace = member.workspaceRoot
    .replace(/[\\/]+$/, "")
    .split(/[\\/]/)
    .at(-1);
  const environment = member.environmentLabel ?? member.environmentId;
  if (group.memberProjects.length === 1) return `${group.displayName} · ${environment}`;
  return `${group.displayName} · ${environment} · ${workspace ?? member.workspaceRoot}`;
}

function previewText(text: string, maxLength = 180): string {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) return compact;
  let end = maxLength - 1;
  const last = compact.charCodeAt(end - 1);
  if (last >= 0xd800 && last <= 0xdbff) end -= 1;
  return `${compact.slice(0, end)}…`;
}

export function summarizeInstructions(
  instructions: ProjectRuntimeInstructions | null,
): ForkInstructionSummary | null {
  if (instructions === null) return null;
  return {
    revision: instructions.revision,
    updatedAt: instructions.updatedAt,
    updatedBy: instructions.updatedBy,
    characters: instructions.instructions.length,
    preview: previewText(instructions.instructions),
  };
}

export function summarizeSources(result: ProjectRuntimeSourceListResult): ForkSourceSummary {
  const summary = {
    total: result.sources.length,
    enabled: 0,
    available: 0,
    missing: 0,
    unreadable: 0,
    unsupported: 0,
    truncated: result.nextCursor !== null,
  };
  for (const entry of result.sources) {
    if (entry.source.enabled) summary.enabled += 1;
    summary[entry.health] += 1;
  }
  return summary;
}

const TASK_STATUS_PRIORITY: Readonly<Record<ProjectRuntimeTask["status"], number>> = {
  active: 0,
  blocked: 1,
  review: 2,
  ready: 3,
  planned: 4,
  deferred: 5,
  done: 6,
  cancelled: 7,
};

function handoffReferenceFor(
  task: ProjectRuntimeTask,
  handoffs: ProjectRuntimeHandoffListResult | null,
): ForkTaskHandoffReference | null {
  if (task.latestHandoffId === null) return null;
  const handoff =
    handoffs?.handoffs.find((entry) => entry.handoffId === task.latestHandoffId) ?? null;
  return {
    handoffId: task.latestHandoffId,
    checkpoint: handoff?.checkpoint ?? null,
    summary: handoff === null ? null : previewText(handoff.summary, 160),
  };
}

export function summarizeTasks(
  result: ProjectRuntimeTaskListResult,
  handoffs: ProjectRuntimeHandoffListResult | null = null,
): ForkTaskSummary {
  const tasks = [...result.tasks].sort(
    (left, right) => timeValue(right.updatedAt) - timeValue(left.updatedAt),
  );
  const counts = {
    total: tasks.length,
    active: 0,
    blocked: 0,
    review: 0,
    ready: 0,
    done: 0,
  };
  for (const task of tasks) {
    if (task.status === "active") counts.active += 1;
    else if (task.status === "blocked") counts.blocked += 1;
    else if (task.status === "review") counts.review += 1;
    else if (task.status === "ready") counts.ready += 1;
    else if (task.status === "done") counts.done += 1;
  }
  const ordered = [...tasks].sort(
    (left, right) =>
      TASK_STATUS_PRIORITY[left.status] - TASK_STATUS_PRIORITY[right.status] ||
      timeValue(right.updatedAt) - timeValue(left.updatedAt),
  );
  return {
    ...counts,
    cards: ordered.slice(0, 3).map((task) => ({
      taskId: task.taskId,
      title: task.title,
      status: task.status,
      owner: task.owner,
      blockerSummary: task.blocker === null ? null : previewText(task.blocker.summary, 160),
      verificationMilestone: task.verification.milestone,
      nextAction: task.nextAction === undefined ? null : previewText(task.nextAction, 120),
      latestHandoff: handoffReferenceFor(task, handoffs),
    })),
    truncated: result.nextCursor !== null,
  };
}

/**
 * The task record's latestHandoffId is the authoritative pointer. Only fall
 * back to handoff order when no task on this page carries a pointer.
 */
export function summarizeHandoffs(
  result: ProjectRuntimeHandoffListResult,
  tasks: readonly ProjectRuntimeTask[] = [],
): ForkHandoffSummary {
  const truncated = result.nextCursor !== null;
  if (truncated) return { latest: null, total: null, truncated };
  const byId = new Map(result.handoffs.map((handoff) => [handoff.handoffId, handoff]));
  const pointed = tasks.flatMap((task) => {
    if (task.latestHandoffId === null) return [];
    const handoff = byId.get(task.latestHandoffId);
    return handoff === undefined ? [] : [handoff];
  });
  const candidates =
    pointed.length > 0
      ? pointed
      : [...result.handoffs]
          .sort((left, right) => timeValue(left.createdAt) - timeValue(right.createdAt))
          .slice(-1);
  const latest =
    candidates.reduce<(typeof candidates)[number] | null>(
      (newest, handoff) =>
        newest === null || timeValue(handoff.createdAt) > timeValue(newest.createdAt)
          ? handoff
          : newest,
      null,
    ) ?? null;
  return {
    latest:
      latest === null
        ? null
        : {
            taskId: latest.taskId,
            taskTitle: tasks.find((task) => task.taskId === latest.taskId)?.title ?? null,
            checkpoint: latest.checkpoint,
            summary: previewText(latest.summary, 220),
            createdAt: latest.createdAt,
          },
    total: result.handoffs.length,
    truncated,
  };
}

export function summarizeProfile(
  effective: EffectiveProjectInstructions | null,
): ForkProfileSummary {
  const profile = effective?.developmentProfile ?? null;
  const profileLayer = profile !== null;
  const projectLayer = effective?.projectInstructions != null;
  return {
    assigned: profile !== null,
    profileName: profile?.name ?? null,
    profileId: profile?.profileId ?? null,
    profileLayer,
    projectLayer,
    layerCount: Number(profileLayer) + Number(projectLayer),
  };
}
