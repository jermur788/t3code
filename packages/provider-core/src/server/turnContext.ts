/**
 * Turn-scoped context is application-owned text an adapter places in its native
 * instruction or context channel. It is never part of provider session identity.
 */
export type TurnContextAuthority = "privileged" | "untrusted";

/**
 * `instruction` entries are T3-owned guidance kept outside the logical user
 * message, after system/developer rules and the static T3 bootstrap; `application`
 * entries are untrusted context. Adapters choose the native channel, never user content.
 */
export type TurnContextOrdering = "instruction" | "application";

export interface TurnContextEntry {
  readonly key: string;
  readonly text: string;
  readonly authority: TurnContextAuthority;
  readonly ordering: TurnContextOrdering;
  readonly order: number;
  readonly provenance: string;
}

export interface TurnContextChunk {
  readonly index: number;
  readonly text: string;
}

/** Codex silently truncates additional-context values above 4,000 UTF-8 bytes. */
export const TURN_CONTEXT_INSTRUCTION_CHUNK_BYTES = 3_500;

/**
 * Ceiling for resolved T3 turn context. The effective instruction bound is
 * 70,000 characters; the allowance covers the instruction wrapper.
 */
export const TURN_CONTEXT_MAX_LENGTH = 72_000;

export function orderedTurnContext(
  entries: ReadonlyArray<TurnContextEntry> | undefined,
): ReadonlyArray<TurnContextEntry> {
  const group = (entry: TurnContextEntry): number => (entry.ordering === "instruction" ? 0 : 1);
  return [...(entries ?? [])].sort(
    (left, right) =>
      group(left) - group(right) ||
      left.order - right.order ||
      (left.key < right.key ? -1 : left.key > right.key ? 1 : 0),
  );
}

/** Privileged instruction text, in deterministic order, outside the user request. */
export function instructionContextText(
  entries: ReadonlyArray<TurnContextEntry> | undefined,
): string {
  return orderedTurnContext(entries)
    .filter((entry) => entry.ordering === "instruction" && entry.authority === "privileged")
    .map((entry) => entry.text)
    .filter((text) => text.length > 0)
    .join("\n\n");
}

export function turnContextLength(entries: ReadonlyArray<TurnContextEntry> | undefined): number {
  return (entries ?? []).reduce((total, entry) => total + entry.text.length, 0);
}

export function assertTurnContextLength(
  entries: ReadonlyArray<TurnContextEntry> | undefined,
  maxLength = TURN_CONTEXT_MAX_LENGTH,
): void {
  const total = turnContextLength(entries);
  if (total > maxLength) {
    throw new RangeError(`Turn context is ${total} characters; the limit is ${maxLength}.`);
  }
}

/**
 * Splits on code points so a multibyte character is never cut. Chunk indexes are
 * zero-based; an empty entry produces no chunks, which is how removal works.
 */
export function chunkTurnContextText(
  text: string,
  maxBytes = TURN_CONTEXT_INSTRUCTION_CHUNK_BYTES,
): ReadonlyArray<TurnContextChunk> {
  if (maxBytes <= 0) throw new RangeError("Turn context chunk size must be positive.");
  if (text.length === 0) return [];
  const chunks: Array<string> = [];
  let chunk = "";
  let bytes = 0;
  for (const character of text) {
    const size = Buffer.byteLength(character);
    if (bytes + size > maxBytes) {
      chunks.push(chunk);
      chunk = "";
      bytes = 0;
    }
    chunk += character;
    bytes += size;
  }
  if (chunk.length > 0) chunks.push(chunk);
  return chunks.map((chunk, index) => ({ index, text: chunk }));
}
