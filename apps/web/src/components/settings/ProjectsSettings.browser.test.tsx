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
const mockPanel = vi.hoisted(() => ({ renderTarget: false }));
vi.mock("./ProjectSettingsPanel", () => ({
  // Runtime targets can arrive after their deep link while project data loads.
  ProjectSettingsPanel: () => (
    <>
      <p>Loading Runtime…</p>
      {mockPanel.renderTarget ? (
        <div id="project-worker-preferences" tabIndex={-1}>
          Worker preferences target
        </div>
      ) : null}
    </>
  ),
}));

import { ProjectsSettings } from "./ProjectsSettings";

const setup = (renderTarget: boolean) => {
  mockPanel.renderTarget = renderTarget;
};

it("reveals a changed advanced deep link after the user closes a pending target", async () => {
  setup(false);
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

it("scrolls an initially deep-linked advanced target into view after opening Advanced", async () => {
  setup(true);
  using scrollSpy = vi.spyOn(HTMLElement.prototype, "scrollIntoView").mockImplementation(() => {});
  await using screen = await render(<ProjectsSettings />, {
    router: "/settings/projects#project-worker-preferences",
  });
  const disclosure = screen.container.querySelector("details")!;
  await expect.element(screen.getByText("Advanced", { exact: true })).toBeVisible();
  expect(disclosure.open).toBe(true);
  await vi.waitFor(() => expect(scrollSpy).toHaveBeenCalled());
  expect(scrollSpy).toHaveBeenCalledWith({ block: "start", behavior: "auto" });
  await vi.waitFor(() =>
    expect(document.activeElement).toBe(document.getElementById("project-worker-preferences")),
  );
});
