import { expect, it } from "vite-plus/test";

import { isForkWorkspaceMode, resolveForkWorkspaceMode } from "./forkWorkspaceMode";

it("accepts only the two Workspace Modes V1 values", () => {
  expect(isForkWorkspaceMode("workspace")).toBe(true);
  expect(isForkWorkspaceMode("development")).toBe(true);
  expect(isForkWorkspaceMode("advanced")).toBe(false);
  expect(isForkWorkspaceMode(null)).toBe(false);
});

it("keeps the existing Development presentation until a mode is chosen", () => {
  expect(resolveForkWorkspaceMode(null)).toBe("development");
  expect(resolveForkWorkspaceMode("workspace")).toBe("workspace");
  expect(resolveForkWorkspaceMode("development")).toBe("development");
});
