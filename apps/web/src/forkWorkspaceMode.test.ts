import { expect, it } from "vite-plus/test";

import { isForkWorkspaceMode } from "./forkWorkspaceMode";

it("accepts only the two Workspace Modes V1 values", () => {
  expect(isForkWorkspaceMode("workspace")).toBe(true);
  expect(isForkWorkspaceMode("development")).toBe(true);
  expect(isForkWorkspaceMode("advanced")).toBe(false);
  expect(isForkWorkspaceMode(null)).toBe(false);
});
