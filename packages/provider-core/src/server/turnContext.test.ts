import { describe, expect, it } from "vite-plus/test";

import {
  assertTurnContextLength,
  chunkTurnContextText,
  instructionContextText,
  orderedTurnContext,
  TURN_CONTEXT_INSTRUCTION_CHUNK_BYTES,
  TURN_CONTEXT_MAX_LENGTH,
  turnContextLength,
  type TurnContextEntry,
} from "./turnContext.ts";

const entry = (input: Partial<TurnContextEntry> & Pick<TurnContextEntry, "key" | "text">) => ({
  authority: "privileged" as const,
  ordering: "instruction" as const,
  order: 0,
  provenance: "test",
  ...input,
});

describe("turn context contract", () => {
  it("produces no instruction text for no entries", () => {
    expect(instructionContextText(undefined)).toBe("");
    expect(instructionContextText([])).toBe("");
  });

  it("keeps authority/order explicit and filters untrusted text from instructions", () => {
    const entries = [
      entry({ key: "later", text: "LATER", order: 2 }),
      entry({ key: "earlier", text: "EARLIER", order: 1 }),
      entry({
        key: "untrusted",
        text: "UNTRUSTED",
        authority: "untrusted",
        ordering: "application",
      }),
    ];
    expect(instructionContextText(entries)).toBe("EARLIER\n\nLATER");
    expect(orderedTurnContext(entries).map((item) => item.key)).toEqual([
      "earlier",
      "later",
      "untrusted",
    ]);
  });

  it("measures the total length of all entries", () => {
    expect(turnContextLength([entry({ key: "a", text: "12345" })])).toBe(5);
    expect(turnContextLength(undefined)).toBe(0);
  });

  it("rejects a total length above the configured limit", () => {
    const entries = [entry({ key: "a", text: "x".repeat(TURN_CONTEXT_MAX_LENGTH + 1) })];
    expect(() => assertTurnContextLength(entries)).toThrow(RangeError);
  });

  it("chunks deterministically on code points and reconstructs the input", () => {
    const text = "🦊 guidance\n".repeat(2_000);
    const chunks = chunkTurnContextText(text);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.map((chunk) => chunk.index)).toEqual(chunks.map((_, index) => index));
    for (const chunk of chunks) {
      expect(Buffer.byteLength(chunk.text, "utf8")).toBeLessThanOrEqual(
        TURN_CONTEXT_INSTRUCTION_CHUNK_BYTES,
      );
      expect(chunk.text).not.toMatch(/^[\uDC00-\uDFFF]/);
    }
    expect(chunks.map((chunk) => chunk.text).join("")).toBe(text);
  });

  it("treats empty text as removal", () => {
    expect(chunkTurnContextText("")).toEqual([]);
  });
});
