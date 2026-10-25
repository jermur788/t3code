// @effect-diagnostics nodeBuiltinImport:off
import * as NodeFS from "node:fs";

import {
  type DevelopmentProfile,
  DevelopmentProfileId,
  type ProjectRuntimeInstructions,
  ProjectId,
} from "@t3tools/contracts";
import {
  buildRuntimeInstructions,
  promptWithProjectInstructions,
} from "@t3tools/provider-core/server/runtimeInstructions";
import { describe, expect, it } from "vite-plus/test";

import { buildCodexProjectInstructions } from "../../provider/CodexDeveloperInstructions.ts";
import { formatEffectiveInstructions } from "../../developmentProfiles/DevelopmentProfileService.ts";
import {
  claudeEffectiveQueryPolicyKey,
  claudeRuntimeQueryPolicyForRuntimePolicy,
} from "./ClaudeAdapterV2.ts";

const projectId = ProjectId.make("project:instruction-conformance");
const profile = {
  profileId: DevelopmentProfileId.make("profile:instruction-conformance"),
  name: "Conformance profile",
  instructions: "PROFILE-CONFORMANCE-ONLY",
  revision: 1,
  createdAt: "2026-10-25T00:00:00.000Z",
  updatedAt: "2026-10-25T00:00:00.000Z",
  createdBy: "user:test",
  updatedBy: "user:test",
} as DevelopmentProfile;
const projectInstructions = (text: string): ProjectRuntimeInstructions =>
  ({
    projectId,
    instructions: text,
    revision: 1,
    updatedAt: "2026-10-25T00:00:00.000Z",
    updatedBy: "user:test",
  }) as ProjectRuntimeInstructions;

const profileOnly = formatEffectiveInstructions(profile, null);
const projectOnly = formatEffectiveInstructions(
  null,
  projectInstructions("PROJECT-CONFORMANCE-ONLY"),
);
const both = formatEffectiveInstructions(profile, projectInstructions("PROJECT-CONFORMANCE-ONLY"));

interface DeliveredText {
  readonly kind: "text";
  readonly text: string;
}
interface DeliveredContext {
  readonly kind: "context";
  readonly entries: Readonly<Record<string, { readonly kind: string; readonly value: string }>>;
}
type Delivered = DeliveredText | DeliveredContext;

interface InstructionTransport {
  readonly adapter: string;
  readonly transport: "prompt" | "runtime" | "additional-context" | "session";
  readonly deliver: (instructions: string | undefined) => Delivered;
}

const text = (value: string): DeliveredText => ({ kind: "text", text: value });

// Every supported instruction-delivery adapter maps to one shared logical
// payload. Only the transport differs.
const transports: ReadonlyArray<InstructionTransport> = [
  {
    adapter: "Claude",
    transport: "prompt",
    deliver: (instructions) =>
      text(promptWithProjectInstructions("Conformance request", instructions)),
  },
  {
    adapter: "Codex",
    transport: "additional-context",
    deliver: (instructions) => ({
      kind: "context",
      entries: buildCodexProjectInstructions(instructions),
    }),
  },
  {
    adapter: "OpenCode",
    transport: "prompt",
    deliver: (instructions) =>
      text(promptWithProjectInstructions("Conformance request", instructions)),
  },
  {
    adapter: "ACP",
    transport: "runtime",
    deliver: (instructions) =>
      text(buildRuntimeInstructions({ harness: "ACP", projectInstructions: instructions })),
  },
  {
    adapter: "Cursor",
    transport: "prompt",
    deliver: (instructions) =>
      text(promptWithProjectInstructions("Conformance request", instructions)),
  },
  {
    adapter: "Pi",
    transport: "prompt",
    deliver: (instructions) =>
      text(promptWithProjectInstructions("Conformance request", instructions)),
  },
  {
    adapter: "Muse",
    transport: "runtime",
    deliver: (instructions) =>
      text(buildRuntimeInstructions({ harness: "Muse Code", projectInstructions: instructions })),
  },
];

const deliveredText = (delivered: Delivered): string =>
  delivered.kind === "text"
    ? delivered.text
    : Object.keys(delivered.entries)
        .sort()
        .map((key) => delivered.entries[key]!.value)
        .join("");

describe.each(transports)("$adapter instruction delivery", (transport) => {
  it("delivers no snapshot when neither profile nor project instructions exist", () => {
    const delivered = deliveredText(transport.deliver(undefined));
    expect(delivered).not.toContain("t3_project_instructions");
    expect(delivered).not.toContain("Development Profile");
  });

  it("delivers profile-only guidance", () => {
    expect(deliveredText(transport.deliver(profileOnly))).toContain("PROFILE-CONFORMANCE-ONLY");
  });

  it("delivers project-only guidance", () => {
    const delivered = deliveredText(transport.deliver(projectOnly));
    expect(delivered).toContain("PROJECT-CONFORMANCE-ONLY");
    expect(delivered).not.toContain("PROFILE-CONFORMANCE-ONLY");
  });

  it("delivers both layers with project precedence", () => {
    const delivered = deliveredText(transport.deliver(both));
    expect(delivered).toContain("PROFILE-CONFORMANCE-ONLY");
    expect(delivered).toContain("PROJECT-CONFORMANCE-ONLY");
    expect(delivered.indexOf("### Development Profile")).toBeLessThan(
      delivered.indexOf("### Project Runtime"),
    );
    expect(delivered).toContain("Project Runtime overrides conflicting Development Profile");
  });

  it("delivers the current revision on the next turn", () => {
    const first = deliveredText(transport.deliver("PRT-AUTO-7c91-A"));
    const second = deliveredText(transport.deliver("PRT-AUTO-7c91-B"));
    expect(first).toContain("PRT-AUTO-7c91-A");
    expect(second).toContain("PRT-AUTO-7c91-B");
    expect(second).not.toContain("PRT-AUTO-7c91-A");
  });

  it("stops injecting removed guidance on a new turn", () => {
    expect(deliveredText(transport.deliver("PRT-AUTO-7c91-REMOVED"))).toContain(
      "PRT-AUTO-7c91-REMOVED",
    );
    expect(deliveredText(transport.deliver(undefined))).not.toContain("PRT-AUTO-7c91-REMOVED");
  });

  it("does not leak guidance between projects", () => {
    const first = deliveredText(transport.deliver("PROJECT-A"));
    const second = deliveredText(transport.deliver("PROJECT-B"));
    expect(first).not.toContain("PROJECT-B");
    expect(second).not.toContain("PROJECT-A");
  });

  it("preserves a bounded payload without dropping content", () => {
    const instructions = "🦊 guidance\n".repeat(2_000);
    const delivered = transport.deliver(instructions);
    const value = deliveredText(delivered);
    expect(value).toContain("🦊 guidance");
    if (delivered.kind === "context") {
      for (const entry of Object.values(delivered.entries)) {
        expect(Buffer.byteLength(entry.value)).toBeLessThanOrEqual(4_000);
      }
      expect(value).toContain("🦊 guidance");
    } else {
      expect(value.length).toBeGreaterThan(10_000);
    }
  });

  it("uses the adapter transport shape", () => {
    const delivered = transport.deliver(projectOnly);
    if (transport.transport === "additional-context") {
      expect(delivered.kind).toBe("context");
      if (delivered.kind === "context") {
        expect(Object.keys(delivered.entries)[0]).toMatch(/^t3_project_instructions_/);
        expect(Object.values(delivered.entries)[0]?.kind).toBe("application");
      }
      return;
    }
    expect(delivered.kind).toBe("text");
    if (transport.transport === "prompt") {
      expect(deliveredText(delivered)).toMatch(/<t3_project_instructions>[\s\S]*<user_request>/);
    } else {
      expect(deliveredText(delivered)).toContain("<runtime_info>");
      expect(deliveredText(delivered)).toContain("<t3_project_instructions>");
    }
  });
});

describe("Claude query identity", () => {
  it("does not change the live-query key when instruction revisions change", () => {
    const queryPolicy = claudeRuntimeQueryPolicyForRuntimePolicy({
      runtimeMode: "full-access",
      interactionMode: "default",
      cwd: "/workspace",
    });
    const keys = ["PRT-AUTO-7c91-A", "PRT-AUTO-7c91-B", undefined].map(() =>
      claudeEffectiveQueryPolicyKey(queryPolicy, {}),
    );
    expect(new Set(keys).size).toBe(1);
  });
});

describe("adapter wiring", () => {
  const root = new URL("../../../../../", import.meta.url);
  const files = [
    ["Claude", "apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts", "turnInput"],
    ["Codex", "apps/server/src/orchestration-v2/Adapters/CodexAdapterV2.ts", "input"],
    ["ACP", "packages/provider-acp/src/server/adapter.ts", "turnInput"],
    ["Cursor", "packages/provider-cursor/src/server/adapter.ts", "turnInput"],
    ["Muse", "packages/provider-muse/src/server/adapter.ts", "turnInput"],
    ["OpenCode", "packages/provider-opencode/src/server/adapter.ts", "turnInput"],
    ["OpenCode v2", "packages/provider-opencode/src/server/v2/adapter.ts", "turnInput"],
    ["Pi", "packages/provider-pi/src/server/adapter.ts", "turnInput"],
  ] as const;

  it.each(files)("%s reads the turn-scoped snapshot, not session policy", (_name, path, input) => {
    const source = NodeFS.readFileSync(new URL(path, root), "utf8");
    expect(source).toContain(`${input}.projectInstructions`);
    expect(source).not.toContain("runtimePolicy.projectInstructions");
  });
});
