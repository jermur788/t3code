import { createFileRoute } from "@tanstack/react-router";

import { ForkWorkspaceModeSettings } from "../components/settings/ForkWorkspaceModeSettings";
import { GeneralSettingsPanel } from "../components/settings/SettingsPanels";

function SettingsGeneralRoute() {
  return (
    <>
      <ForkWorkspaceModeSettings />
      <GeneralSettingsPanel />
    </>
  );
}

export const Route = createFileRoute("/_chat/settings/general")({
  component: SettingsGeneralRoute,
});
