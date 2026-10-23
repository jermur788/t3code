import { describe, expect, it } from "vite-plus/test";

import { T3_MCP_TOOL_NAMES, resolveT3McpToolPresentation } from "./t3McpToolPresentation.ts";

describe("resolveT3McpToolPresentation", () => {
  it("recognizes every T3 tool across provider prefixes and completion suffixes", () => {
    for (const tool of T3_MCP_TOOL_NAMES) {
      const presentation = resolveT3McpToolPresentation(tool);
      for (const prefix of [
        "mcp__t3-code__",
        "mcp__t3_code__",
        "mcp__t3code__",
        "T3-code.",
        "t3_code/",
        "t3code:",
        "mcp_t3-code_",
        "T3 Code ",
        "t3-code · ",
      ]) {
        expect(resolveT3McpToolPresentation(`${prefix}${tool} completed`), tool).toEqual(
          presentation,
        );
      }
      expect(resolveT3McpToolPresentation(`mcp__another-server__${tool}`), tool).toBeNull();
    }
  });

  it("matches OpenCode 2's per-thread server names, whose thread ids hold underscores", () => {
    expect(
      resolveT3McpToolPresentation("t3-code-thread_opencode2-adapter_delegate_task")?.displayName,
    ).toBe("Delegate a child task");
    expect(resolveT3McpToolPresentation("t3-code-thread_opencode2-adapter_not_a_tool")).toBeNull();
  });
});

it("presents all eleven Runtime tools as T3-owned tools", () => {
  for (const suffix of [
    "context",
    "source_list",
    "source_search",
    "source_read",
    "task_list",
    "task_read",
    "task_create",
    "task_update",
    "handoff_append",
    "handoff_list",
    "handoff_read",
  ]) {
    const name = `t3_project_${suffix}`;
    expect(T3_MCP_TOOL_NAMES).toContain(name);
    const presentation = resolveT3McpToolPresentation(`mcp__t3-code__${name}`);
    expect(presentation?.logo).toBe("t3-code");
    expect(presentation?.displayName).toContain("Runtime");
  }
});
