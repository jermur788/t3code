import { expect, it } from "vite-plus/test";

import { isWorkspaceAdvancedProjectTarget } from "./ForkProjectsSettingsShell";

it("opens Workspace Advanced for development-only project setting deep links", () => {
  for (const target of [
    "development-profile",
    "project-worker-preferences",
    "project-runtime",
    "project-runtime-state",
    "project-runtime-tasks",
  ]) {
    expect(isWorkspaceAdvancedProjectTarget(`#${target}`)).toBe(true);
    expect(isWorkspaceAdvancedProjectTarget(target)).toBe(true);
  }

  expect(isWorkspaceAdvancedProjectTarget("#project-runtime-instructions")).toBe(false);
  expect(isWorkspaceAdvancedProjectTarget("#project-runtime-sources")).toBe(false);
});
