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
  owner?: string;
  nextAction?: string;
  blockerSummary?: string;
  milestone?: ProjectRuntimeTask["verification"]["milestone"];
  latestHandoffId?: string;
}): ProjectRuntimeTask {
  return {
    taskId: ProjectRuntimeTaskId.make(input.id),
    projectId: ProjectId.make("project"),
    title: input.title,
    owner: input.owner ?? "user:test",
    status: input.status,
    scope: "",
    acceptanceCriteria: [],
    blocker:
      input.blockerSummary === undefined
        ? null
        : {
            classification: "implementation-defect",
            summary: input.blockerSummary,
            createdAt: time,
          },
    verification: { milestone: input.milestone ?? "none", evidence: [] },
    latestHandoffId:
      input.latestHandoffId === undefined
        ? null
        : ProjectRuntimeHandoffId.make(input.latestHandoffId),
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
    filesChanged: [],
    verification: { milestone: "none", evidence: [] },
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
      truncated: false,
    });
    expect(summary.cards[0]).toMatchObject({
      title: "Newest active work",
      status: "active",
      owner: "user:test",
      blockerSummary: null,
      verificationMilestone: "none",
      nextAction: "Run the focused tests",
    });
    expect(summary.cards.map((card) => card.title)).toEqual([
      "Newest active work",
      "Older active work",
      "Blocked work",
    ]);
  });

  it("surfaces blocker, owner, milestone, next action, and the pointed handoff per task", () => {
    const blocked = task({
      id: "blocked",
      title: "Blocked work",
      status: "blocked",
      updatedAt: "2026-10-24T12:00:00.000Z",
      owner: "user:owner",
      blockerSummary: "Waiting on upstream release",
      milestone: "implemented",
      nextAction: "Retry after the upstream tag",
      latestHandoffId: "blocked-handoff",
    });
    const active = task({
      id: "active",
      title: "Active work",
      status: "active",
      updatedAt: "2026-10-24T11:00:00.000Z",
      latestHandoffId: "active-handoff",
    });
    const handoffs = {
      handoffs: [
        handoff({
          id: "active-handoff",
          taskId: "active",
          summary: "Active continuation",
          createdAt: "2026-10-24T10:00:00.000Z",
        }),
        handoff({
          id: "blocked-handoff",
          taskId: "blocked",
          summary: "Blocked continuation",
          createdAt: "2026-10-24T09:00:00.000Z",
        }),
      ],
      nextCursor: null,
    };
    const summary = summarizeTasks({ tasks: [active, blocked], nextCursor: null }, handoffs);

    expect(summary.cards[0]).toMatchObject({
      title: "Active work",
      status: "active",
      owner: "user:test",
      blockerSummary: null,
      verificationMilestone: "none",
      latestHandoff: {
        handoffId: "active-handoff",
        summary: "Active continuation",
      },
    });
    expect(summary.cards[1]).toMatchObject({
      title: "Blocked work",
      status: "blocked",
      owner: "user:owner",
      blockerSummary: "Waiting on upstream release",
      verificationMilestone: "implemented",
      nextAction: "Retry after the upstream tag",
      latestHandoff: {
        handoffId: "blocked-handoff",
        summary: "Blocked continuation",
      },
    });
  });

  it("bounds long task summaries without adding fields that are absent", () => {
    const longText = "x".repeat(400);
    const summary = summarizeTasks({
      tasks: [
        task({
          id: "blocked",
          title: "Blocked work",
          status: "blocked",
          updatedAt: time,
          blockerSummary: longText,
          nextAction: longText,
        }),
      ],
      nextCursor: null,
    });

    expect(summary.cards[0]?.blockerSummary).toHaveLength(160);
    expect(summary.cards[0]?.blockerSummary?.endsWith("…")).toBe(true);
    expect(summary.cards[0]?.nextAction).toHaveLength(120);
    expect(summary.cards[0]?.nextAction?.endsWith("…")).toBe(true);
    expect(summary.cards[0]?.latestHandoff).toBeNull();
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

  it("follows the task's authoritative latest handoff pointer", () => {
    const tasks = [
      task({
        id: "task",
        title: "Runtime task",
        status: "active",
        updatedAt: time,
        latestHandoffId: "pointed",
      }),
    ];
    const pointed = handoff({
      id: "pointed",
      taskId: "task",
      summary: "Authoritative continuation",
      createdAt: "2026-10-24T10:00:00.000Z",
    });
    const newerButUnpointed = handoff({
      id: "newer",
      taskId: "task",
      summary: "Newer but not the task pointer",
      createdAt: "2026-10-24T11:00:00.000Z",
    });

    expect(
      summarizeHandoffs({ handoffs: [pointed, newerButUnpointed], nextCursor: null }, tasks),
    ).toMatchObject({
      latest: { summary: "Authoritative continuation" },
      total: 2,
    });
    expect(
      summarizeTasks(
        { tasks, nextCursor: null },
        {
          handoffs: [pointed, newerButUnpointed],
          nextCursor: null,
        },
      ).cards[0]?.latestHandoff?.summary,
    ).toBe("Authoritative continuation");
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
