import { createFileRoute } from "@tanstack/react-router";

import { ForkProjectsSettingsShell } from "../components/settings/ForkProjectsSettingsShell";

export const Route = createFileRoute("/_chat/settings/projects")({
  component: ForkProjectsSettingsShell,
});
