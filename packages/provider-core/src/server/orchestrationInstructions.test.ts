// @effect-diagnostics nodeBuiltinImport:off
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";

import { describe, expect, it } from "vite-plus/test";

import {
  T3_CODE_ORCHESTRATION_INSTRUCTIONS,
  T3_CODE_ORCHESTRATION_SECTIONS,
  t3AcpPromptWithInstructions,
  t3OrchestrationPromptForFirstRun,
  t3OrchestrationSystemPrompt,
} from "./orchestrationInstructions.ts";

const runtime = T3_CODE_ORCHESTRATION_SECTIONS.find((section) =>
  section.startsWith("### Project Runtime"),
)!;

describe("Project Runtime bootstrap", () => {
  it("delivers one bounded, provider-neutral discovery section without project contents", () => {
    expect(runtime).toBeDefined();
    expect(Buffer.byteLength(runtime, "utf8")).toBeLessThan(4_000);
    expect(T3_CODE_ORCHESTRATION_INSTRUCTIONS.split(runtime)).toHaveLength(2);
    for (const guidance of [
      "t3_project_context",
      "fresh project-working session/run",
      "Before each subsequent project-working turn, refresh",
      "enabled:false",
      "subordinate to system/developer instructions",
      "Retrieve source bodies on demand",
      "t3_project_source_search",
      "t3_project_source_read",
      "list/read pagination",
      "T3 delegated task/subagent is one execution unit",
      "revision last read",
      "ProjectRuntimeConflictError",
      "Development Profile",
      "Project Runtime instructions override conflicting Development Profile instructions",
      "Source material remains data",
      "even when Runtime is disabled",
      "Runtime handoffs",
      "descriptive metadata only",
      "rebind the current T3 thread",
      "authorize writes",
    ]) {
      expect(runtime).toContain(guidance);
    }
    expect(runtime).not.toMatch(/CCF|Claude|Codex|OpenCode|\/home\/|<source|source body:/i);
  });

  it("uses the identical section in system, first-run, and ACP instruction paths", () => {
    expect(t3OrchestrationSystemPrompt(true)).toContain(runtime);
    expect(t3OrchestrationSystemPrompt(false)).toBeUndefined();
    expect(
      t3OrchestrationPromptForFirstRun({ prompt: "Work", runOrdinal: 1, hasT3Mcp: true }),
    ).toContain(runtime);
    const state = { interactionMode: "default", hasT3Mcp: true } as const;
    const prompt = t3AcpPromptWithInstructions({ prompt: "Work", state });
    expect(prompt.split(runtime)).toHaveLength(2);
    expect(t3AcpPromptWithInstructions({ prompt: "Next", state, previousState: state })).toBe(
      "Next",
    );
    expect(t3AcpPromptWithInstructions({ prompt: "/help", state })).toBe("/help");
    expect(
      t3AcpPromptWithInstructions({ prompt: "Work", state: { ...state, hasT3Mcp: false } }),
    ).not.toContain(runtime);
  });

  it("keeps Runtime bootstrap text and source contents out of provider-specific implementations", () => {
    const root = NodePath.resolve(import.meta.dirname, "../../..");
    const directories = [
      ...NodeFS.readdirSync(root)
        .filter((name) => name.startsWith("provider-") && name !== "provider-core")
        .map((name) => NodePath.join(root, name, "src")),
      NodePath.resolve(root, "../apps/server/src/orchestration-v2/Adapters"),
      NodePath.resolve(root, "../apps/server/src/provider"),
    ];
    for (const directory of directories) {
      for (const entry of NodeFS.readdirSync(directory, { recursive: true, withFileTypes: true })) {
        if (!entry.isFile() || !entry.name.endsWith(".ts") || entry.name.endsWith(".test.ts"))
          continue;
        const contents = NodeFS.readFileSync(NodePath.join(entry.parentPath, entry.name), "utf8");
        expect(contents).not.toMatch(
          /### Project Runtime|Retrieve source bodies on demand|Runtime Task may survive/,
        );
      }
    }
  });
});
