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

/**
 * Workspace mode is device-local presentation state. An unset preference deliberately resolves to
 * Development so existing users never have advanced controls hidden after an upgrade.
 */
export function useForkWorkspaceMode(): ForkWorkspaceModeState {
  const [savedMode, setSavedMode] = useLocalStorage<ForkWorkspaceMode | null, unknown>(
    FORK_WORKSPACE_MODE_STORAGE_KEY,
    null,
    StoredForkWorkspaceMode,
  );
  return {
    savedMode,
    effectiveMode: savedMode ?? "development",
    hasChosenMode: savedMode !== null,
    setMode: setSavedMode,
  };
}

export function isForkWorkspaceMode(value: unknown): value is ForkWorkspaceMode {
  return Schema.is(ForkWorkspaceMode)(value);
}
