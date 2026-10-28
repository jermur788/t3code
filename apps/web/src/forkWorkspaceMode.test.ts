import { afterEach, beforeEach, expect, it } from "vite-plus/test";

import { removeLocalStorageItem, setLocalStorageItem } from "./hooks/useLocalStorage";
import {
  DEFAULT_FORK_WORKSPACE_MODE,
  FORK_WORKSPACE_MODE_STORAGE_KEY,
  ForkWorkspaceModeSchema,
  readForkWorkspaceMode,
} from "./forkWorkspaceMode";

beforeEach(() => {
  removeLocalStorageItem(FORK_WORKSPACE_MODE_STORAGE_KEY);
});

afterEach(() => {
  removeLocalStorageItem(FORK_WORKSPACE_MODE_STORAGE_KEY);
});

it("defaults the unsaved interface to development without persisting a choice", () => {
  expect(DEFAULT_FORK_WORKSPACE_MODE).toBe("development");
  expect(readForkWorkspaceMode()).toBeNull();
});

it("reads both device-local interface mode values", () => {
  setLocalStorageItem(FORK_WORKSPACE_MODE_STORAGE_KEY, "workspace", ForkWorkspaceModeSchema);
  expect(readForkWorkspaceMode()).toBe("workspace");

  setLocalStorageItem(FORK_WORKSPACE_MODE_STORAGE_KEY, "development", ForkWorkspaceModeSchema);
  expect(readForkWorkspaceMode()).toBe("development");
});
