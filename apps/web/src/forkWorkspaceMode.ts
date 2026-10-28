import * as Schema from "effect/Schema";

import { useLocalStorage } from "./hooks/useLocalStorage";

export const FORK_WORKSPACE_MODE_STORAGE_KEY = "t3code:fork-workspace-mode-v1";

export const ForkWorkspaceMode = Schema.Literals(["workspace", "development"]);
export type ForkWorkspaceMode = typeof ForkWorkspaceMode.Type;

const StoredForkWorkspaceMode = Schema.NullOr(ForkWorkspaceMode);

export interface ForkWorkspaceModeState {
  readonly savedMode: ForkWorkspaceMode | null;
  readonly effectiveMode: ForkWorkspaceMode;
  readonly hasChosenMode: boolean;
  readonly setMode: (mode: ForkWorkspaceMode) => void;
}

/** Existing users keep the full Development presentation until they explicitly choose a mode. */
export function resolveForkWorkspaceMode(savedMode: ForkWorkspaceMode | null): ForkWorkspaceMode {
  return savedMode ?? "development";
}

/**
 * Workspace mode is device-local presentation state. It never participates in Runtime, routing,
 * provider eligibility, task, handoff, or execution persistence.
 */
export function useForkWorkspaceMode(): ForkWorkspaceModeState {
  const [savedMode, setSavedMode] = useLocalStorage(
    FORK_WORKSPACE_MODE_STORAGE_KEY,
    null as ForkWorkspaceMode | null,
    StoredForkWorkspaceMode,
  );
  return {
    savedMode,
    effectiveMode: resolveForkWorkspaceMode(savedMode),
    hasChosenMode: savedMode !== null,
    setMode: setSavedMode,
  };
}

export function isForkWorkspaceMode(value: unknown): value is ForkWorkspaceMode {
  return Schema.is(ForkWorkspaceMode)(value);
}
