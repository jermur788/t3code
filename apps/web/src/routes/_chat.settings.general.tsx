import { createFileRoute } from "@tanstack/react-router";

import { ForkInterfaceSettings } from "../components/settings/ForkInterfaceSettings";
import { GeneralSettingsPanel } from "../components/settings/SettingsPanels";

function SettingsGeneralRoute() {
  return (
    <>
      <ForkInterfaceSettings />
      <GeneralSettingsPanel />
    </>
  );
}

export const Route = createFileRoute("/_chat/settings/general")({
  component: SettingsGeneralRoute,
});
