import { createFileRoute, redirect } from "@tanstack/react-router";

import { ForkHome } from "../components/forkHome/ForkHome";
import { ForkModeChoice } from "../components/forkHome/ForkModeChoice";
import { WorkspaceForkHome } from "../components/forkHome/WorkspaceForkHome";
import {
  validateSettingsScopeSearch,
  type SettingsScopeSearch,
} from "../components/settings/settingsScope";
import { useForkWorkspaceMode } from "../forkWorkspaceMode";

export const Route = createFileRoute("/_chat/home")({
  validateSearch: (raw: Record<string, unknown>): SettingsScopeSearch =>
    validateSettingsScopeSearch(raw),
  beforeLoad: async ({ context }) => {
    if (
      context.authGateState.status !== "authenticated" &&
      context.authGateState.status !== "hosted-static"
    ) {
      throw redirect({ to: "/pair", replace: true });
    }
  },
  component: ForkHomeRoute,
});

function ForkHomeRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { mode, configured, setMode } = useForkWorkspaceMode();
  const onSearchChange = (next: SettingsScopeSearch) => {
    void navigate({ to: "/home", search: next, replace: true });
  };

  return (
    <>
      {!configured ? <ForkModeChoice onChoose={setMode} /> : null}
      {mode === "workspace" ? (
        <WorkspaceForkHome search={search} onSearchChange={onSearchChange} />
      ) : (
        <ForkHome search={search} onSearchChange={onSearchChange} />
      )}
    </>
  );
}
