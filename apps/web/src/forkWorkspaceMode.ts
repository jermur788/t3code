import * as Schema from "effect/Schema";

import { getLocalStorageItem, useLocalStorage } from "./hooks/useLocalStorage";

export const FORK_WORKSPACE_MODE_STORAGE_KEY = "t3-fork:interface-mode";

export type ForkWorkspaceMode = "workspace" | "development";
export const ForkWorkspaceModeSchema = Schema.Literals(["workspace", "development"]);

export const DEFAULT_FORK_WORKSPACE_MODE: ForkWorkspaceMode = "development";

export function readForkWorkspaceMode(): ForkWorkspaceMode | null {
  try {
    return getLocalStorageItem(FORK_WORKSPACE_MODE_STORAGE_KEY, ForkWorkspaceModeSchema);
  } catch {
    return null;
  }
}

export function useForkWorkspaceMode(): {
  readonly mode: ForkWorkspaceMode;
  readonly configured: boolean;
  readonly setMode: (mode: ForkWorkspaceMode) => void;
} {
  const [mode, setMode] = useLocalStorage(
    FORK_WORKSPACE_MODE_STORAGE_KEY,
    DEFAULT_FORK_WORKSPACE_MODE,
    ForkWorkspaceModeSchema,
  );
  return {
    mode,
    configured: readForkWorkspaceMode() !== null,
    setMode,
  };
}
