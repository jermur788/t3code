import { createFileRoute, redirect } from "@tanstack/react-router";

import { ForkHome } from "../components/forkHome/ForkHome";
import {
  validateSettingsScopeSearch,
  type SettingsScopeSearch,
} from "../components/settings/settingsScope";

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
  return (
    <ForkHome
      search={search}
      onSearchChange={(next) => {
        void navigate({ to: "/home", search: next, replace: true });
      }}
    />
  );
}
