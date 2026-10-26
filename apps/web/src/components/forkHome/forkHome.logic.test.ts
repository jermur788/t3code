import { describe, expect, it } from "vite-plus/test";
import {
  DevelopmentProfileId,
  ProjectId,
  ProjectRuntimeHandoffId,
  ProjectRuntimeSourceId,
  ProjectRuntimeTaskId,
  type EffectiveProjectInstructions,
  type ProjectRuntimeHandoff,
  type ProjectRuntimeSource,
  type ProjectRuntimeTask,
} from "@t3tools/contracts";

import type {
  SidebarProjectGroupMember,
  SidebarProjectSnapshot,
} from "../../sidebarProjectGrouping";
import { resolveSettingsScope } from "../settings/settingsScope";
import {
  defaultForkProjectSelection,
  isForkLandingPath,
  keepsUpstreamHome,
  shouldRedirectToForkHome,
  projectOptionLabel,
  selectedForkProject,
  selectionForProject,
  summarizeHandoffs,
  summarizeInstructions,
  summarizeProfile,
  summarizeSources,
  summarizeTasks,
} from "./forkHome.logic";

const time = "2026-10-24T12:00:00.000Z";

function member(input: {
  id: string;
  environmentId: string;
  updatedAt: string;
  workspaceRoot?: string;
}): SidebarProjectGroupMember {
  return {
    id: ProjectId.make(input.id),
    environmentId: input.environmentId,
    title: input.id,
    workspaceRoot: input.workspaceRoot ?? `/workspace/${input.id}`,
    scripts: [],
    createdAt: time,
    updatedAt: input.updatedAt,
    physicalProjectKey: `${input.environmentId}:${input.id}`,
    environmentLabel: input.environmentId,
  } as unknown as SidebarProjectGroupMember;
}

function group(input: {
  key: string;
  updatedAt: string;
  members: SidebarProjectGroupMember[];
  isScratch?: true;
}): SidebarProjectSnapshot {
  return {
    projectKey: input.key,
    displayName: input.key,
    updatedAt: input.updatedAt,
    isScratch: input.isScratch,
    memberProjects: input.members,
    memberProjectRefs: input.members.map((entry) => ({
      environmentId: entry.environmentId,
      projectId: entry.id,
    })),
  } as unknown as SidebarProjectSnapshot;
}

function task(input: {
  id: string;
  title: string;
  status: ProjectRuntimeTask["status"];
  updatedAt: string;
  nextAction?: string;
}): ProjectRuntimeTask {
  return {
    taskId: ProjectRuntimeTaskId.make(input.id),
    projectId: ProjectId.make("project"),
    title: input.title,
    status: input.status,
    scope: "",
    acceptanceCriteria: "",
    ...(input.nextAction === undefined ? {} : { nextAction: input.nextAction }),
    revision: 1,
    createdAt: time,
    updatedAt: input.updatedAt,
    createdBy: "user:test",
    updatedBy: "user:test",
  };
}

function source(input: {
  id: string;
  enabled?: boolean;
  health: "available" | "missing" | "unreadable" | "unsupported";
}): {
  source: ProjectRuntimeSource;
  health: "available" | "missing" | "unreadable" | "unsupported";
} {
  return {
    source: {
      sourceId: ProjectRuntimeSourceId.make(input.id),
      projectId: ProjectId.make("project"),
      title: input.id,
      role: "reference",
      relativePath: `${input.id}.md`,
      enabled: input.enabled ?? true,
      revision: 1,
      createdAt: time,
      updatedAt: time,
      createdBy: "user:test",
      updatedBy: "user:test",
    },
    health: input.health,
  };
}

function handoff(input: {
  id: string;
  taskId: string;
  summary: string;
  createdAt: string;
}): ProjectRuntimeHandoff {
  return {
    handoffId: ProjectRuntimeHandoffId.make(input.id),
    projectId: ProjectId.make("project"),
    taskId: ProjectRuntimeTaskId.make(input.taskId),
    checkpoint: "checkpoint",
    summary: input.summary,
    runtimeRevision: 1,
    taskRevision: 1,
    createdAt: input.createdAt,
    createdBy: "user:test",
  };
}

describe("fork home root routing", () => {
  it("treats the bare root and /home as the same landing page", () => {
    expect(isForkLandingPath("/")).toBe(true);
    expect(isForkLandingPath("/home")).toBe(true);
    expect(isForkLandingPath("/settings")).toBe(false);
    expect(isForkLandingPath("/threads/1")).toBe(false);
  });

  it("redirects only an authenticated root without the classic flag", () => {
    expect(
      shouldRedirectToForkHome({ pathname: "/", authStatus: "authenticated", search: {} }),
    ).toBe(true);
    expect(
      shouldRedirectToForkHome({
        pathname: "/",
        authStatus: "authenticated",
        search: { classic: 1 },
      }),
    ).toBe(false);
    expect(
      shouldRedirectToForkHome({ pathname: "/", authStatus: "unauthenticated", search: {} }),
    ).toBe(false);
    expect(
      shouldRedirectToForkHome({
        pathname: "/settings",
        authStatus: "authenticated",
        search: {},
      }),
    ).toBe(false);
  });

  it("requires the explicit classic flag to keep the upstream home", () => {
    expect(keepsUpstreamHome({ classic: 1 })).toBe(true);
    expect(keepsUpstreamHome({ classic: "1" })).toBe(true);
    expect(keepsUpstreamHome({ classic: true })).toBe(true);
    expect(keepsUpstreamHome({})).toBe(false);
    expect(keepsUpstreamHome({ classic: "true" })).toBe(false);
    expect(keepsUpstreamHome({ classic: 0 })).toBe(false);
    expect(keepsUpstreamHome(null)).toBe(false);
  });
});

describe("fork home project selection", () => {
  it("selects the newest durable checkout and ignores scratch projects", () => {
    const older = member({
      id: "older",
      environmentId: "local",
      updatedAt: "2026-10-01T00:00:00.000Z",
    });
    const newer = member({
      id: "newer",
      environmentId: "remote",
      updatedAt: "2026-10-23T00:00:00.000Z",
    });
    const groups = [
      group({ key: "older", updatedAt: older.updatedAt, members: [older] }),
      group({ key: "newer", updatedAt: newer.updatedAt, members: [newer] }),
      group({
        key: "scratch",
        updatedAt: "2026-10-24T00:00:00.000Z",
        members: [{ ...older, updatedAt: "2026-10-24T00:00:00.000Z" }],
        isScratch: true,
      }),
    ];

    expect(defaultForkProjectSelection(groups)).toEqual({
      project: "newer",
      machine: "remote",
      checkout: "remote:newer",
    });
  });

  it("chooses the newest checkout when a deep link names only the project", () => {
    const older = member({
      id: "older",
      environmentId: "local",
      updatedAt: "2026-10-01T00:00:00.000Z",
    });
    const newer = member({
      id: "newer",
      environmentId: "remote",
      updatedAt: "2026-10-23T00:00:00.000Z",
    });
    const project = group({ key: "project", updatedAt: newer.updatedAt, members: [older, newer] });
    const scope = resolveSettingsScope(
      { project: "project" },
      [project],
      [
        { environmentId: older.environmentId, label: "Local" },
        { environmentId: newer.environmentId, label: "Remote" },
      ],
    );

    expect(selectedForkProject(scope)).toEqual({ group: project, member: newer });
    expect(selectionForProject(project, newer)).toEqual({
      project: "project",
      machine: "remote",
      checkout: "remote:newer",
    });
  });

  it("disambiguates checkouts that share a project name", () => {
    const one = member({
      id: "one",
      environmentId: "local",
      updatedAt: time,
      workspaceRoot: "/workspace/alpha",
    });
    const two = member({
      id: "two",
      environmentId: "remote",
      updatedAt: time,
      workspaceRoot: "/workspace/beta",
    });
    const project = group({ key: "project", updatedAt: time, members: [one, two] });

    expect(projectOptionLabel(project, one)).toBe("project · local · alpha");
    expect(projectOptionLabel(project, two)).toBe("project · remote · beta");
  });
});

describe("fork home runtime summaries", () => {
  it("summarizes saved instructions without inventing values", () => {
    expect(summarizeInstructions(null)).toBeNull();
    const summary = summarizeInstructions({
      projectId: ProjectId.make("project"),
      instructions: "  Keep   this short.  ",
      revision: 4,
      updatedAt: time,
      updatedBy: "user:maintainer",
    });
    expect(summary).toMatchObject({
      revision: 4,
      updatedBy: "user:maintainer",
      characters: 22,
      preview: "Keep this short.",
    });
  });

  it("counts source health, enabled state, and page truncation", () => {
    expect(
      summarizeSources({
        sources: [
          source({ id: "a", health: "available" }),
          source({ id: "b", health: "missing", enabled: false }),
          source({ id: "c", health: "unreadable" }),
          source({ id: "d", health: "unsupported" }),
        ],
        nextCursor: 4,
      }),
    ).toEqual({
      total: 4,
      enabled: 3,
      available: 1,
      missing: 1,
      unreadable: 1,
      unsupported: 1,
      truncated: true,
    });
  });

  it("derives project state from task status, focus, blockers, and next action", () => {
    const summary = summarizeTasks({
      tasks: [
        task({
          id: "blocked",
          title: "Blocked work",
          status: "blocked",
          updatedAt: "2026-10-24T11:00:00.000Z",
        }),
        task({
          id: "active-old",
          title: "Older active work",
          status: "active",
          updatedAt: "2026-10-24T10:00:00.000Z",
        }),
        task({
          id: "active-new",
          title: "Newest active work",
          status: "active",
          updatedAt: "2026-10-24T12:00:00.000Z",
          nextAction: "Run the focused tests",
        }),
        task({
          id: "review",
          title: "Review work",
          status: "review",
          updatedAt: "2026-10-24T09:00:00.000Z",
        }),
        task({
          id: "done",
          title: "Done work",
          status: "done",
          updatedAt: "2026-10-24T08:00:00.000Z",
        }),
      ],
      nextCursor: null,
    });

    expect(summary).toMatchObject({
      total: 5,
      active: 2,
      blocked: 1,
      review: 1,
      done: 1,
      blockers: ["Blocked work"],
      truncated: false,
    });
    expect(summary.focus).toEqual({
      title: "Newest active work",
      status: "active",
      nextAction: "Run the focused tests",
    });
  });

  it("does not claim a latest handoff when the page is truncated", () => {
    const tasks = [
      task({
        id: "task",
        title: "Runtime task",
        status: "active",
        updatedAt: time,
      }),
    ];
    const older = handoff({
      id: "older",
      taskId: "task",
      summary: "Older handoff",
      createdAt: "2026-10-24T10:00:00.000Z",
    });
    const newer = handoff({
      id: "newer",
      taskId: "task",
      summary: "Newer handoff",
      createdAt: "2026-10-24T11:00:00.000Z",
    });

    expect(summarizeHandoffs({ handoffs: [newer, older], nextCursor: null }, tasks)).toMatchObject({
      latest: {
        taskId: "task",
        taskTitle: "Runtime task",
        checkpoint: "checkpoint",
        summary: "Newer handoff",
      },
      total: 2,
      truncated: false,
    });
    expect(summarizeHandoffs({ handoffs: [older], nextCursor: 100 }, tasks)).toEqual({
      latest: null,
      total: null,
      truncated: true,
    });
  });

  it("summarizes the effective Development Profile layers", () => {
    const noLayers = summarizeProfile(null);
    expect(noLayers).toEqual({
      assigned: false,
      profileName: null,
      profileId: null,
      profileLayer: false,
      projectLayer: false,
      layerCount: 0,
    });

    const effective = {
      projectId: ProjectId.make("project"),
      assignment: null,
      developmentProfile: {
        profileId: DevelopmentProfileId.make("profile"),
        name: "Shared policy",
        instructions: "Use the shared policy.",
        revision: 1,
        createdAt: time,
        updatedAt: time,
        createdBy: "user:test",
        updatedBy: "user:test",
      },
      projectInstructions: null,
      precedence: "host rules/user > project > profile > source data",
      formattedInstructions: "Use the shared policy.",
    } as unknown as EffectiveProjectInstructions;

    expect(summarizeProfile(effective)).toEqual({
      assigned: true,
      profileName: "Shared policy",
      profileId: "profile",
      profileLayer: true,
      projectLayer: false,
      layerCount: 1,
    });
  });
});
