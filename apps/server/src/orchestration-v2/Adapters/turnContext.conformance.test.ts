import {
  type DevelopmentProfile,
  DevelopmentProfileId,
  type ProjectRuntimeInstructions,
  ProjectId,
} from "@t3tools/contracts";
import {
  buildRuntimeInstructions,
  promptWithTurnContext,
} from "@t3tools/provider-core/server/runtimeInstructions";
import {
  assertTurnContextLength,
  chunkTurnContextText,
  instructionContextText,
  orderedTurnContext,
  TURN_CONTEXT_INSTRUCTION_CHUNK_BYTES,
  turnContextLength,
  type TurnContextEntry,
} from "@t3tools/provider-core/server/turnContext";
import { describe, expect, it } from "vite-plus/test";

import { buildCodexTurnContext } from "../../provider/CodexDeveloperInstructions.ts";
import { formatEffectiveInstructions } from "../../developmentProfiles/DevelopmentProfileService.ts";
import {
  PROJECT_INSTRUCTIONS_CONTEXT_KEY,
  PROJECT_INSTRUCTIONS_MAX_LENGTH,
  PROJECT_INSTRUCTIONS_PROVENANCE,
  projectInstructionsTurnContext,
} from "../../developmentProfiles/ProjectInstructions.ts";

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

const untrustedEntry = (text: string): TurnContextEntry => ({
  key: "untrusted-fixture",
  text,
  authority: "untrusted",
  ordering: "application",
  order: 10,
  provenance: "test-untrusted",
});

const privilegedEntry = (key: string, text: string, order: number): TurnContextEntry => ({
  key,
  text,
  authority: "privileged",
  ordering: "instruction",
  order,
  provenance: "test-privileged",
});

const contextEntry = (instructions: string | undefined): ReadonlyArray<TurnContextEntry> =>
  instructions === undefined ? [] : projectInstructionsTurnContext(instructions);

interface DeliveredText {
  readonly kind: "text";
  readonly text: string;
}
interface DeliveredContext {
  readonly kind: "context";
  readonly entries: Readonly<Record<string, { readonly kind: string; readonly value: string }>>;
}
type Delivered = DeliveredText | DeliveredContext;

const text = (value: string): DeliveredText => ({ kind: "text", text: value });

interface InstructionTransport {
  readonly adapter: string;
  readonly transport: "instruction" | "prompt" | "runtime" | "additional-context";
  readonly deliver: (turnContext: ReadonlyArray<TurnContextEntry>) => Delivered;
}

const transports: ReadonlyArray<InstructionTransport> = [
  {
    adapter: "Claude",
    transport: "instruction",
    deliver: (turnContext) => text(instructionContextText(turnContext)),
  },
  {
    adapter: "Codex",
    transport: "additional-context",
    deliver: (turnContext) => ({
      kind: "context",
      entries: buildCodexTurnContext(turnContext),
    }),
  },
  {
    adapter: "OpenCode v1",
    transport: "prompt",
    deliver: (turnContext) => text(promptWithTurnContext("Conformance request", turnContext)),
  },
  {
    adapter: "OpenCode v2",
    transport: "prompt",
    deliver: (turnContext) => text(promptWithTurnContext("Conformance request", turnContext)),
  },
  {
    adapter: "ACP",
    transport: "runtime",
    deliver: (turnContext) => text(buildRuntimeInstructions({ harness: "ACP", turnContext })),
  },
  {
    adapter: "Cursor",
    transport: "prompt",
    deliver: (turnContext) => text(promptWithTurnContext("Conformance request", turnContext)),
  },
  {
    adapter: "Pi",
    transport: "prompt",
    deliver: (turnContext) => text(promptWithTurnContext("Conformance request", turnContext)),
  },
  {
    adapter: "Muse",
    transport: "runtime",
    deliver: (turnContext) => text(buildRuntimeInstructions({ harness: "Muse Code", turnContext })),
  },
];

const deliveredText = (delivered: Delivered): string =>
  delivered.kind === "text"
    ? delivered.text
    : Object.keys(delivered.entries)
        .sort()
        .map((key) => delivered.entries[key]!.value)
        .join("");

describe("project instruction turn context contract", () => {
  it("returns no entry when there is no effective guidance", () => {
    expect(contextEntry(undefined)).toEqual([]);
    expect(contextEntry("")).toEqual([]);
  });

  it("classifies effective instructions as privileged, ordered instruction context", () => {
    const [entry] = projectInstructionsTurnContext(projectOnly);
    expect(entry).toMatchObject({
      key: PROJECT_INSTRUCTIONS_CONTEXT_KEY,
      authority: "privileged",
      ordering: "instruction",
      order: 0,
      provenance: PROJECT_INSTRUCTIONS_PROVENANCE,
    });
    expect(entry?.text).toContain("PROJECT-CONFORMANCE-ONLY");
  });

  it("delivers profile-only and project-only guidance", () => {
    expect(projectInstructionsTurnContext(profileOnly)[0]?.text).toContain(
      "PROFILE-CONFORMANCE-ONLY",
    );
    expect(projectInstructionsTurnContext(projectOnly)[0]?.text).not.toContain(
      "PROFILE-CONFORMANCE-ONLY",
    );
  });

  it("preserves layer order and project precedence when both exist", () => {
    const delivered = projectInstructionsTurnContext(both)[0]?.text ?? "";
    expect(delivered.indexOf("### Development Profile")).toBeLessThan(
      delivered.indexOf("### Project Runtime"),
    );
    expect(delivered).toContain("Project Runtime overrides conflicting Development Profile");
  });

  it("delivers the current revision, then removal, without leaking another project", () => {
    const first = projectInstructionsTurnContext("PRT-AUTO-7c91-A")[0]?.text ?? "";
    const second = projectInstructionsTurnContext("PRT-AUTO-7c91-B")[0]?.text ?? "";
    expect(first).toContain("PRT-AUTO-7c91-A");
    expect(second).toContain("PRT-AUTO-7c91-B");
    expect(second).not.toContain("PRT-AUTO-7c91-A");
    expect(projectInstructionsTurnContext("")[0]?.text).toBeUndefined();
    expect(projectInstructionsTurnContext("PROJECT-B")[0]?.text).not.toContain("PROJECT-A");
  });

  it("accepts the full effective-instruction bound without truncation", () => {
    const atBound = "🚀".repeat(35_000);
    const entries = projectInstructionsTurnContext(atBound);
    expect(turnContextLength(entries)).toBeLessThanOrEqual(PROJECT_INSTRUCTIONS_MAX_LENGTH);
    expect(entries[0]?.text).toContain(atBound);
    expect(() => assertTurnContextLength(entries, 10)).toThrow(RangeError);
  });
});

describe("generic turn context semantics", () => {
  it("orders instruction entries deterministically and excludes untrusted text", () => {
    const entries = [
      privilegedEntry("second", "SECOND", 2),
      privilegedEntry("first", "FIRST", 1),
      untrustedEntry("UNTRUSTED"),
    ];
    expect(instructionContextText(entries)).toBe("FIRST\n\nSECOND");
    expect(orderedTurnContext(entries).map((entry) => entry.key)).toEqual([
      "first",
      "second",
      "untrusted-fixture",
    ]);
  });

  it("chunks on code points without dropping or truncating content", () => {
    const text = "🦊 guidance\n".repeat(2_000);
    const chunks = chunkTurnContextText(text);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(Buffer.byteLength(chunk.text, "utf8")).toBeLessThanOrEqual(
        TURN_CONTEXT_INSTRUCTION_CHUNK_BYTES,
      );
    }
    expect(chunks.map((chunk) => chunk.text).join("")).toBe(text);
    expect(chunkTurnContextText("")).toEqual([]);
  });

  it("keeps a logical user message separate from privileged context", () => {
    const prompt = promptWithTurnContext("Hello", contextEntry(both));
    expect(prompt).toContain("<user_request>\nHello\n</user_request>");
    expect(instructionContextText(contextEntry(both))).not.toContain("Hello");
    expect(promptWithTurnContext("Hello", [untrustedEntry("SUPPORTING")])).toBe("Hello");
  });
});

describe.each(transports)("$adapter turn context transport", (transport) => {
  it("delivers no snapshot when there is no context", () => {
    const delivered = deliveredText(transport.deliver([]));
    expect(delivered).not.toContain("t3_project_instructions");
    expect(delivered).not.toContain("Development Profile");
  });

  it("delivers profile-only guidance", () => {
    expect(deliveredText(transport.deliver(contextEntry(profileOnly)))).toContain(
      "PROFILE-CONFORMANCE-ONLY",
    );
  });

  it("delivers project-only guidance", () => {
    const delivered = deliveredText(transport.deliver(contextEntry(projectOnly)));
    expect(delivered).toContain("PROJECT-CONFORMANCE-ONLY");
    expect(delivered).not.toContain("PROFILE-CONFORMANCE-ONLY");
  });

  it("delivers both layers with project precedence", () => {
    const delivered = deliveredText(transport.deliver(contextEntry(both)));
    expect(delivered).toContain("PROFILE-CONFORMANCE-ONLY");
    expect(delivered).toContain("PROJECT-CONFORMANCE-ONLY");
    expect(delivered.indexOf("### Development Profile")).toBeLessThan(
      delivered.indexOf("### Project Runtime"),
    );
    expect(delivered).toContain("Project Runtime overrides conflicting Development Profile");
  });

  it("delivers the current revision on the next turn and stops after removal", () => {
    const first = deliveredText(transport.deliver(contextEntry("PRT-AUTO-7c91-A")));
    const second = deliveredText(transport.deliver(contextEntry("PRT-AUTO-7c91-B")));
    expect(first).toContain("PRT-AUTO-7c91-A");
    expect(second).toContain("PRT-AUTO-7c91-B");
    expect(second).not.toContain("PRT-AUTO-7c91-A");
    expect(deliveredText(transport.deliver([]))).not.toContain("PRT-AUTO-7c91-B");
  });

  it("does not leak guidance between projects", () => {
    expect(deliveredText(transport.deliver(contextEntry("PROJECT-A")))).not.toContain("PROJECT-B");
    expect(deliveredText(transport.deliver(contextEntry("PROJECT-B")))).not.toContain("PROJECT-A");
  });

  it("preserves a bounded payload without dropping content", () => {
    const instructions = "🦊 guidance\n".repeat(2_000);
    const delivered = transport.deliver(contextEntry(instructions));
    const value = deliveredText(delivered);
    expect(value).toContain("🦊 guidance");
    if (delivered.kind === "context") {
      for (const entry of Object.values(delivered.entries)) {
        expect(Buffer.byteLength(entry.value)).toBeLessThanOrEqual(4_000);
      }
    } else {
      expect(value.length).toBeGreaterThan(10_000);
    }
  });

  it("uses the adapter transport shape", () => {
    const delivered = transport.deliver(contextEntry(projectOnly));
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
    } else if (transport.transport === "runtime") {
      expect(deliveredText(delivered)).toContain("<runtime_info>");
      expect(deliveredText(delivered)).toContain("<t3_project_instructions>");
    } else {
      expect(deliveredText(delivered)).toContain("<t3_project_instructions>");
      expect(deliveredText(delivered)).not.toContain("<user_request>");
    }
  });
});

describe("Codex authority mapping", () => {
  it("maps privileged context to application and untrusted context to untrusted", () => {
    const entries = [
      ...projectInstructionsTurnContext("PRIVILEGED-CONTEXT"),
      untrustedEntry("UNTRUSTED-CONTEXT"),
    ];
    const delivered = Object.entries(buildCodexTurnContext(entries));
    expect(delivered).toHaveLength(2);
    expect(delivered[0]?.[0]).toMatch(/^t3_project_instructions_/);
    expect(delivered[0]?.[1].kind).toBe("application");
    expect(delivered[1]?.[1].kind).toBe("untrusted");
    expect(delivered[1]?.[1].value).toContain("UNTRUSTED-CONTEXT");
  });
});
