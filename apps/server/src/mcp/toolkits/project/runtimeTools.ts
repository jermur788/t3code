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
      "Outside a T3 thread only. An agent in a T3 thread acts on its own project; a different projectId is refused.",
  }),
);

const worktreeMetadataNote =
  "branch, worktreePath, and baseSha are descriptive only; they do not create, move, bind, or authorize a worktree or change the thread workspace.";

export const ProjectContextTool = Tool.make("t3_project_context", {
  ...shared,
  description:
    "Read saved Project Runtime context: status, instructions, enabled source descriptors, and active/blocked/review task summaries. Never source bodies. `enabled:false` means Runtime is off; profiles still apply. `truncated` means a limit cut something.",
  parameters: Schema.Struct({ projectId }),
  success: ProjectRuntimeContext,
})
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false)
  .annotate(Tool.OpenWorld, false);

export const ProjectSourceListTool = Tool.make("t3_project_source_list", {
  ...withSources,
  description:
    "List registered sources and health. Disabled entries are included. Read-only; the user manages the registry.",
  parameters: Schema.Struct({ projectId, ...ProjectRuntimeSourceListInput.fields }),
  success: ProjectRuntimeSourceListResult,
})
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false)
  .annotate(Tool.OpenWorld, false);

export const ProjectSourceSearchTool = Tool.make("t3_project_source_search", {
  ...withSources,
  description:
    "Search enabled, readable registered sources only. `truncated` means a limit cut results.",
  parameters: Schema.Struct({ projectId, ...ProjectRuntimeSourceSearchInput.fields }),
  success: ProjectRuntimeSourceSearchResult,
})
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false)
  .annotate(Tool.OpenWorld, false);

export const ProjectSourceReadTool = Tool.make("t3_project_source_read", {
  ...withSources,
  description:
    "Read one registered source by `sourceId`, at most 400 lines or 65,536 bytes. When `truncated`, continue from `toLine + 1`. No file paths. Disabled, missing, binary, or unreadable sources return a structured error.",
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
    "List Runtime tasks, oldest first; optional status. Pass `nextCursor` back as `cursor`.",
  parameters: Schema.Struct({ projectId, ...ProjectRuntimeTaskListInput.fields }),
  success: ProjectRuntimeTaskListResult,
})
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false)
  .annotate(Tool.OpenWorld, false);

export const ProjectTaskReadTool = Tool.make("t3_project_task_read", {
  ...shared,
  description: "Read one Runtime task by `taskId`, including its revision.",
  parameters: Schema.Struct({ projectId, ...ProjectRuntimeTaskReadInput.fields }),
  success: ProjectRuntimeTask,
})
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false)
  .annotate(Tool.OpenWorld, false);

export const ProjectTaskCreateTool = Tool.make("t3_project_task_create", {
  ...shared,
  description: `Create a Runtime task. The server records the author. ${worktreeMetadataNote}`,
  parameters: Schema.Struct({ projectId, ...ProjectRuntimeTaskCreateInput.fields }),
  success: ProjectRuntimeTask,
})
  .annotate(Tool.Destructive, false)
  .annotate(Tool.OpenWorld, false);

export const ProjectTaskUpdateTool = Tool.make("t3_project_task_update", {
  ...shared,
  description: `Update a Runtime task. Pass the revision last read as \`expectedRevision\`; on \`ProjectRuntimeConflictError\`, reread and retry. Omitted fields stay; null clears optional metadata. ${worktreeMetadataNote}`,
  parameters: Schema.Struct({ projectId, ...ProjectRuntimeTaskUpdateInput.fields }),
  success: ProjectRuntimeTask,
}).annotate(Tool.OpenWorld, false);

export const ProjectHandoffAppendTool = Tool.make("t3_project_handoff_append", {
  ...shared,
  description:
    "Append an immutable handoff to a Runtime task: a checkpoint for the next worker. The server records author, thread, provider, and model. Cannot be edited or deleted.",
  parameters: Schema.Struct({ projectId, ...ProjectRuntimeHandoffAppendInput.fields }),
  success: ProjectRuntimeHandoff,
})
  .annotate(Tool.Destructive, false)
  .annotate(Tool.OpenWorld, false);

export const ProjectHandoffListTool = Tool.make("t3_project_handoff_list", {
  ...shared,
  description:
    "List Runtime handoffs, oldest first; optional `taskId`. Pass `nextCursor` back as `cursor`.",
  parameters: Schema.Struct({ projectId, ...ProjectRuntimeHandoffListInput.fields }),
  success: ProjectRuntimeHandoffListResult,
})
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false)
  .annotate(Tool.OpenWorld, false);

export const ProjectHandoffReadTool = Tool.make("t3_project_handoff_read", {
  ...shared,
  description: "Read one Runtime handoff by `handoffId`.",
  parameters: Schema.Struct({ projectId, ...ProjectRuntimeHandoffReadInput.fields }),
  success: ProjectRuntimeHandoff,
})
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false)
  .annotate(Tool.OpenWorld, false);
