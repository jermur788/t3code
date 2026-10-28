import {
  type ProjectRuntimeHandoff,
  type ProjectRuntimeTask,
  RUNTIME_EXECUTION_BOUNDS,
} from "@t3tools/contracts";

export const RUNTIME_TASK_PACKET_VERSION = 1 as const;

const section = (title: string, body: string | undefined): string[] =>
  body === undefined || body.trim().length === 0 ? [] : [`## ${title}`, "", body.trim(), ""];

const list = (title: string, values: ReadonlyArray<string> | undefined): string[] =>
  values === undefined || values.length === 0
    ? []
    : [`${title}:`, ...values.map((value) => `- ${value}`), ""];

function truncatePacket(text: string): string {
  const max = RUNTIME_EXECUTION_BOUNDS.packetMaxLength;
  if (text.length <= max) return text;
  const marker = "\n\n[Task packet truncated.]\n";
  let end = Math.max(0, max - marker.length);
  const last = text.charCodeAt(end - 1);
  if (last >= 0xd800 && last <= 0xdbff) end -= 1;
  return `${text.slice(0, end)}${marker}`;
}

/**
 * Deterministic prompt for one Runtime task execution. Routing and project
 * instructions are deliberately absent: routing is a launch receipt, and T3
 * injects the effective instructions as turn context.
 */
export function buildRuntimeTaskPacket(
  task: ProjectRuntimeTask,
  handoff: ProjectRuntimeHandoff | null,
): string {
  const lines: string[] = [
    `# Runtime task: ${task.title}`,
    "",
    `Task ID: ${task.taskId}`,
    `Task revision: ${task.revision}`,
    `Status: ${task.status}`,
    `Owner: ${task.owner}`,
    "",
  ];

  lines.push(...section("Objective", task.objective));
  lines.push(...section("Scope", task.scope));
  lines.push(...section("Out of scope", task.outOfScope));

  if (task.acceptanceCriteria.length > 0) {
    lines.push("## Acceptance criteria", "");
    for (const criterion of task.acceptanceCriteria) {
      lines.push(`- [${criterion.id}] ${criterion.text}`);
    }
    lines.push("");
  }

  lines.push(...section("Verification plan", task.verificationPlan));

  if (task.base !== undefined) {
    const base = task.base;
    const baseLines = [
      base.repository === undefined ? null : `Repository: ${base.repository}`,
      base.branch === undefined ? null : `Branch: ${base.branch}`,
      base.revision === undefined ? null : `Revision: ${base.revision}`,
      base.worktreePath === undefined ? null : `Worktree: ${base.worktreePath}`,
      base.upstreamRevision === undefined ? null : `Upstream revision: ${base.upstreamRevision}`,
      base.notes === undefined ? null : `Notes: ${base.notes}`,
    ].filter((line): line is string => line !== null);
    if (baseLines.length > 0) {
      lines.push("## Recorded base", "", ...baseLines, "");
    }
  }

  if (handoff !== null) {
    lines.push("## Latest handoff", "");
    lines.push(`Handoff ID: ${handoff.handoffId}`);
    lines.push(`Checkpoint: ${handoff.checkpoint}`);
    lines.push(`Task revision: ${handoff.taskRevision}`);
    lines.push("");
    lines.push(...section("Handoff summary", handoff.summary));
    lines.push(...section("Handoff result", handoff.result));
    lines.push(...list("Files changed", handoff.filesChanged));
    lines.push(...list("Tests run", handoff.testsRun));
    lines.push(...list("Tests not run", handoff.testsNotRun));
    lines.push(...section("Failures and risks", handoff.failuresRisks));
    lines.push(...list("Unresolved decisions", handoff.unresolvedDecisions));
    lines.push(...section("Repository state", handoff.repositoryState));
    lines.push(...section("Integration state", handoff.integrationState));
    lines.push(...section("Next action", handoff.nextAction));
  }

  return truncatePacket(lines.join("\n").trimEnd() + "\n");
}
