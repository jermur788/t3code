import { createFileRoute } from "@tanstack/react-router";

import { DevelopmentProfilesSettings } from "../components/settings/DevelopmentProfilesSettings";

export const Route = createFileRoute("/_chat/settings/development-profiles")({
  component: DevelopmentProfilesSettings,
});
