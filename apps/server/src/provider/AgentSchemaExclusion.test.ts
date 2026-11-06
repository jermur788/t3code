import { expect, it } from "@effect/vitest";
import * as Digest from "effect/crypto/Digest";
import * as Effect from "effect/Effect";
import * as Hex from "effect/encoding/Hex";
import * as Layer from "effect/Layer";
import { McpServer } from "effect/ai";

import { layerAdvertisedTools } from "./AgentToolSchemaTest.layer.ts";
import budget from "./agentContextBudget.json" with { type: "json" };

const fieldPaths = (value: unknown, path: string): string[] => {
  if (value === null || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, child]) => [
    ...(key === "properties" && child !== null && typeof child === "object"
      ? Object.keys(child).map((field) => `${path}.properties.${field}`)
      : []),
    ...fieldPaths(child, `${path}.${key}`),
  ]);
};

it.effect("D2: the source-loaded agent registry excludes continuation at the exact U budget", () =>
  Effect.gen(function* () {
    const mcp = yield* McpServer.McpServer;
    const advertised = mcp.tools.map(({ tool }) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));
    const serialized = JSON.stringify(advertised);
    expect(advertised).toHaveLength(82);
    const paths = mcp.tools.flatMap(({ tool }) => [
      ...fieldPaths(tool.inputSchema, `${tool.name}.inputSchema`),
      ...fieldPaths(tool.outputSchema, `${tool.name}.outputSchema`),
    ]);
    const namedContinuationPaths = paths.filter((path) =>
      path.endsWith(".properties.continuation"),
    );
    expect(namedContinuationPaths).toEqual([
      "t3_worktree_handoff.outputSchema.properties.continuation",
    ]);
    const continuationPaths = paths.filter(
      (path) => path.startsWith("t3_project_") && /\.continuation(?:\.|$)/i.test(path),
    );
    const taskTools = advertised
      .filter(({ name }) => /^t3_project_(task|handoff|context)/.test(name))
      .map(({ name }) => name);
    expect(taskTools).toEqual([
      "t3_project_context",
      "t3_project_task_list",
      "t3_project_task_read",
      "t3_project_task_create",
      "t3_project_task_update",
      "t3_project_handoff_append",
      "t3_project_handoff_list",
      "t3_project_handoff_read",
    ]);
    for (const name of taskTools) {
      expect(paths.some((path) => path.startsWith(`${name}.inputSchema.`))).toBe(true);
      expect(paths.some((path) => path.startsWith(`${name}.outputSchema.`))).toBe(true);
      const definition = mcp.tools.find(({ tool }) => tool.name === name)!.tool;
      expect(JSON.stringify([definition.inputSchema, definition.outputSchema])).not.toMatch(
        /continuation/i,
      );
    }
    expect(continuationPaths).toEqual([]);
    expect(budget).toEqual({
      claudeSystemAppendBytes: 7_476,
      codexAdditionalContextBytes: 9_204,
      mcpToolListJsonBytes: 58_799,
    });
    expect(Buffer.byteLength(serialized, "utf8")).toBe(58_799);
    const crypto = yield* Digest.Digest;
    const digest = yield* crypto.digest(Digest.sha256, new TextEncoder().encode(serialized));
    expect(Hex.encode(digest)).toBe(
      "3b4b680e32cdae7eb9c3bd40f91f1ac6aa6791caf7d174cd2b458f781aea26f9",
    );
    const report = JSON.stringify({
      verdict: "D2 SCOPED PASS",
      packaged: "D2 PACKAGED SHIPPING NOT VERIFIED",
      baseline: "c037460c",
      toolCount: advertised.length,
      toolNames: advertised.map(({ name }) => name),
      namesDescriptionsInputSchemasUtf8Bytes: Buffer.byteLength(serialized, "utf8"),
      sha256: Hex.encode(digest),
      continuationAttributableBytes: 0,
      continuationFieldPaths: continuationPaths,
      unrelatedBaselineContinuationFieldPaths: namedContinuationPaths,
      fieldPaths: paths,
      perToolUtf8Bytes: advertised.map((tool) => ({
        name: tool.name,
        nameBytes: Buffer.byteLength(tool.name, "utf8"),
        descriptionBytes: Buffer.byteLength(tool.description ?? "", "utf8"),
        inputSchemaBytes: Buffer.byteLength(JSON.stringify(tool.inputSchema), "utf8"),
        bytes: Buffer.byteLength(JSON.stringify(tool), "utf8"),
      })),
    });
    yield* Effect.sync(() => process.stdout.write(`${report}\n`));
  }).pipe(Effect.provide(Layer.merge(layerAdvertisedTools, Digest.layerWebCrypto))),
);
