import { expect, it } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";

import { render } from "../test/render";
import { ForkModeChoice } from "./components/forkHome/ForkModeChoice";
import {
  FORK_WORKSPACE_MODE_STORAGE_KEY,
  readForkWorkspaceMode,
  useForkWorkspaceMode,
} from "./forkWorkspaceMode";

function clearPreference(): Disposable {
  localStorage.removeItem(FORK_WORKSPACE_MODE_STORAGE_KEY);
  return {
    [Symbol.dispose]() {
      localStorage.removeItem(FORK_WORKSPACE_MODE_STORAGE_KEY);
    },
  };
}

function InterfaceChoice() {
  const { mode, configured, setMode } = useForkWorkspaceMode();
  return (
    <>
      {!configured && <ForkModeChoice onChoose={setMode} />}
      <output aria-label="Current interface">{mode}</output>
    </>
  );
}

it.each([
  ["Workspace", "workspace"],
  ["Development", "development"],
] as const)(
  "dismisses the first-choice prompt immediately after choosing %s",
  async (name, mode) => {
    using _preference = clearPreference();
    await using screen = await render(<InterfaceChoice />);
    await expect.element(screen.getByText("Choose your T3 Fork interface")).toBeVisible();
    await expect
      .element(screen.getByLabelText("Current interface"))
      .toHaveTextContent("development");
    expect(readForkWorkspaceMode()).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: new RegExp(`^${name}`) }));

    await expect.element(screen.getByText("Choose your T3 Fork interface")).not.toBeInTheDocument();
    await expect.element(screen.getByLabelText("Current interface")).toHaveTextContent(mode);
    expect(readForkWorkspaceMode()).toBe(mode);

    await screen.unmount();
    await using restored = await render(<InterfaceChoice />);
    await expect
      .element(restored.getByText("Choose your T3 Fork interface"))
      .not.toBeInTheDocument();
    await expect.element(restored.getByLabelText("Current interface")).toHaveTextContent(mode);
  },
);
