import { expect, it, vi } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";

import { render } from "../../../test/render";

vi.mock("./SettingsScopeContext", () => ({
  useOptionalSettingsScope: () => null,
  useSettingsScope: () => ({
    search: { project: "project" },
    scope: { kind: "project" },
    selectScope: vi.fn(),
  }),
}));
vi.mock("../../forkWorkspaceMode", () => ({
  useForkWorkspaceMode: () => ({ mode: "workspace" }),
}));
vi.mock("./SettingsScopeSentence", () => ({ SettingsScopeSentence: () => null }));
vi.mock("./ProjectSettingsPanel", () => ({
  // Runtime targets can arrive after their deep link while project data loads.
  ProjectSettingsPanel: () => <p>Loading Runtime…</p>,
}));

import { ProjectsSettings } from "./ProjectsSettings";

it("reveals a changed advanced deep link after the user closes a pending target", async () => {
  await using screen = await render(<ProjectsSettings />, {
    router: "/settings/projects#development-profile",
  });
  const disclosure = screen.container.querySelector("details")!;
  await expect.element(screen.getByText("Advanced", { exact: true })).toBeVisible();
  expect(disclosure.open).toBe(true);

  await userEvent.click(screen.getByText("Advanced", { exact: true }));
  await vi.waitFor(() => expect(disclosure.open).toBe(false));
  await screen.router!.navigate({ hash: "project-runtime-tasks" });

  await vi.waitFor(() => expect(disclosure.open).toBe(true));
  await userEvent.click(screen.getByText("Advanced", { exact: true }));
  await vi.waitFor(() => expect(disclosure.open).toBe(false));
  await screen.router!.navigate({ hash: "project-worker-preferences" });
  await vi.waitFor(() => expect(disclosure.open).toBe(true));
});
