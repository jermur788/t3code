import {
  OrchestratorMcpFailure,
  PositiveInt,
  ProjectId,
  ProjectRuntimeContext,
  ProjectRuntimeError,
  ProjectRuntimeHandoff,
  ProjectRuntimeHandoffAppendInput,
  ProjectRuntimeHandoffListInput,
  ProjectRuntimeHandoffListResult,
  ProjectRuntimeHandoffReadInput,
  ProjectRuntimeSourceListInput,
  ProjectRuntimeSourceListResult,
  ProjectRuntimeSourceReadInput,
  ProjectRuntimeSourceReadResult,
  ProjectRuntimeSourceSearchInput,
  ProjectRuntimeSourceSearchResult,
  ProjectRuntimeTask,
  ProjectRuntimeTaskCreateInput,
  ProjectRuntimeTaskListInput,
  ProjectRuntimeTaskListResult,
  ProjectRuntimeTaskReadInput,
  ProjectRuntimeTaskUpdateInput,
} from "@t3tools/contracts";
import * as Schema from "effect/Schema";
import { Tool } from "effect/ai";

import * as ThreadManagementService from "../../../orchestration-v2/ThreadManagementService.ts";
import * as ProjectRuntimeService from "../../../projectRuntime/ProjectRuntimeService.ts";
import * as ProjectRuntimeSourceAccess from "../../../projectRuntime/ProjectRuntimeSourceAccess.ts";
import * as McpInvocationContext from "../../McpInvocationContext.ts";

// Returned rather than raised so the encoded error, with its tag and revisions, reaches the
// client as the tool result instead of being flattened to its message.
const shared = {
  failure: Schema.Union([...ProjectRuntimeError.members, OrchestratorMcpFailure]),
  failureMode: "return" as const,
  dependencies: [
    McpInvocationContext.McpInvocationContext,
    ThreadManagementService.ThreadManagementService,
    ProjectRuntimeService.ProjectRuntimeService,
  ],
};
const withSources = {
  ...shared,
  dependencies: [...shared.dependencies, ProjectRuntimeSourceAccess.ProjectRuntimeSourceAccess],
};

const projectId = Schema.optional(
  ProjectId.annotate({
    description:
      "Only for an MCP client running outside a T3 thread, which must pass it. An agent in a T3 thread always acts on its own project; a different projectId is refused.",
  }),
);

const worktreeMetadataNote =
  "branch, worktreePath and baseSha are descriptive notes only: setting them does not create, move, bind, or authorize a worktree or change the thread's workspace.";

export const ProjectContextTool = Tool.make("t3_project_context", {
  ...shared,
  description:
    "Read the Project Runtime bootstrap for this project: its status, full Project Instructions, enabled source descriptors, and summaries of active, blocked and review tasks with each task's latest handoff. Built only from saved Runtime state, never from conversation history, and it never includes source contents (use t3_project_source_read). Assigned Development Profile metadata and canonical effectiveInstructions contain inherited policy, followed by higher-precedence Project Runtime instructions. Profiles remain available when Runtime is disabled; in that case Runtime returns enabled:false with no project instructions, sources or tasks. truncated flags report anything omitted for the count and size limits; page the full lists with the list tools.",
  parameters: Schema.Struct({ projectId }),
  success: ProjectRuntimeContext,
})
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false)
  .annotate(Tool.OpenWorld, false);

export const ProjectSourceListTool = Tool.make("t3_project_source_list", {
  ...withSources,
  description:
    "List this project's registered Runtime sources with their current health (available, missing, unreadable or unsupported). Disabled sources are listed too. Read-only: the registry is managed by the user.",
  parameters: Schema.Struct({ projectId, ...ProjectRuntimeSourceListInput.fields }),
  success: ProjectRuntimeSourceListResult,
})
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false)
  .annotate(Tool.OpenWorld, false);

export const ProjectSourceSearchTool = Tool.make("t3_project_source_search", {
  ...withSources,
  description:
    "Search the contents of this project's enabled, readable registered sources. Only registered source files are searched, never other workspace files. truncated is true when results were cut by a limit.",
  parameters: Schema.Struct({ projectId, ...ProjectRuntimeSourceSearchInput.fields }),
  success: ProjectRuntimeSourceSearchResult,
})
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false)
  .annotate(Tool.OpenWorld, false);

export const ProjectSourceReadTool = Tool.make("t3_project_source_read", {
  ...withSources,
  description:
    "Read lines from one registered source by sourceId. Returns at most 400 lines and 65,536 UTF-8 bytes; truncated says more follows, so continue from toLine + 1. A disabled, missing, binary or unreadable source fails with a structured error. It takes no file path.",
  parameters: Schema.Struct({
    projectId,
    ...ProjectRuntimeSourceReadInput.fields,
    // The service rejects an oversized count with a structured range error that names the limit.
    lineCount: Schema.optionalKey(PositiveInt),
  }),
  success: ProjectRuntimeSourceReadResult,
})
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false)
  .annotate(Tool.OpenWorld, false);

export const ProjectTaskListTool = Tool.make("t3_project_task_list", {
  ...shared,
  description:
    "List this project's Runtime tasks, optionally by status, oldest first. Pass nextCursor back as cursor for the next page.",
  parameters: Schema.Struct({ projectId, ...ProjectRuntimeTaskListInput.fields }),
  success: ProjectRuntimeTaskListResult,
})
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false)
  .annotate(Tool.OpenWorld, false);

export const ProjectTaskReadTool = Tool.make("t3_project_task_read", {
  ...shared,
  description: "Read one Runtime task of this project by taskId, including its current revision.",
  parameters: Schema.Struct({ projectId, ...ProjectRuntimeTaskReadInput.fields }),
  success: ProjectRuntimeTask,
})
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false)
  .annotate(Tool.OpenWorld, false);

export const ProjectTaskCreateTool = Tool.make("t3_project_task_create", {
  ...shared,
  description: `Create a Runtime task in this project. Who created it is recorded by the server. ${worktreeMetadataNote}`,
  parameters: Schema.Struct({ projectId, ...ProjectRuntimeTaskCreateInput.fields }),
  success: ProjectRuntimeTask,
})
  .annotate(Tool.Destructive, false)
  .annotate(Tool.OpenWorld, false);

export const ProjectTaskUpdateTool = Tool.make("t3_project_task_update", {
  ...shared,
  description: `Update a Runtime task. expectedRevision is required and must be the revision you last read; a stale value fails with ProjectRuntimeConflictError naming expectedRevision and currentRevision, so read the task again and retry. Omitted fields are kept; null clears nextAction, branch, worktreePath or baseSha. ${worktreeMetadataNote}`,
  parameters: Schema.Struct({ projectId, ...ProjectRuntimeTaskUpdateInput.fields }),
  success: ProjectRuntimeTask,
}).annotate(Tool.OpenWorld, false);

export const ProjectHandoffAppendTool = Tool.make("t3_project_handoff_append", {
  ...shared,
  description:
    "Append an immutable handoff to a Runtime task: a checkpoint summary for whoever continues the work. The author, thread, provider and model are recorded by the server from this call; handoffs cannot be edited or deleted afterwards.",
  parameters: Schema.Struct({ projectId, ...ProjectRuntimeHandoffAppendInput.fields }),
  success: ProjectRuntimeHandoff,
})
  .annotate(Tool.Destructive, false)
  .annotate(Tool.OpenWorld, false);

export const ProjectHandoffListTool = Tool.make("t3_project_handoff_list", {
  ...shared,
  description:
    "List this project's Runtime handoffs, oldest first, optionally for one taskId. Pass nextCursor back as cursor for the next page.",
  parameters: Schema.Struct({ projectId, ...ProjectRuntimeHandoffListInput.fields }),
  success: ProjectRuntimeHandoffListResult,
})
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false)
  .annotate(Tool.OpenWorld, false);

export const ProjectHandoffReadTool = Tool.make("t3_project_handoff_read", {
  ...shared,
  description: "Read one Runtime handoff of this project by handoffId.",
  parameters: Schema.Struct({ projectId, ...ProjectRuntimeHandoffReadInput.fields }),
  success: ProjectRuntimeHandoff,
})
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false)
  .annotate(Tool.OpenWorld, false);
