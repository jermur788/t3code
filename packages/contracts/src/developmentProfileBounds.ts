/**
 * Public bounds for Development Profiles. The server enforces the same values
 * at the service boundary so a client can reject oversized input before a
 * round trip.
 */
export const DEVELOPMENT_PROFILE_BOUNDS = {
  idMaxLength: 200,
  nameMaxLength: 200,
  instructionsMaxLength: 32_000,
  actorMaxLength: 200,
  /**
   * Ceiling for the canonical resolved instructions and the MCP Project
   * Runtime bootstrap. A profile and Project Runtime can each use the full
   * instructions bound, so this stays above their sum plus the headings and
   * precedence note.
   */
  effectiveInstructionsMaxLength: 70_000,
} as const;
