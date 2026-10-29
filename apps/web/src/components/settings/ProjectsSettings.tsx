import { EnvironmentId } from "@t3tools/contracts";
import { useLocation } from "@tanstack/react-router";
import { LayersIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useForkWorkspaceMode } from "../../forkWorkspaceMode";
import { Button } from "../ui/button";
import { WorkspacePageContainer } from "../WorkspacePageContainer";
import { ProjectSettingsPanel } from "./ProjectSettingsPanel";
import { useSettingsScope } from "./SettingsScopeContext";
import { SettingsScopeNotice } from "./SettingsScopeNotice";
import { SettingsPageContainer } from "./settingsLayout";
import { ALL_ENVIRONMENTS_VALUE, selectEnvironmentAxis } from "./settingsScopeAxis";
import "./workspaceProjectSettings.css";

const WORKSPACE_ADVANCED_TARGETS = new Set([
  "development-profile",
  "project-worker-preferences",
  "project-runtime-state",
  "project-runtime-tasks",
]);

export function ProjectsSettings() {
  const { search: value, scope, selectScope } = useSettingsScope();
  const { mode } = useForkWorkspaceMode();
  const hash = useLocation({ select: (location) => location.hash.replace(/^#/, "") });
  const advancedRequested = WORKSPACE_ADVANCED_TARGETS.has(hash);
  const [advancedOpen, setAdvancedOpen] = useState(advancedRequested);
  // A deep link reveals Advanced once per hash change; the user can still collapse it afterwards.
  const [seenHash, setSeenHash] = useState(hash);
  // The target handles its own reveal while it is mounted, but a direct load can request the
  // hash before Advanced has made the section visible. Keep the target until the next frame.
  const revealTarget = useRef<string | null>(advancedRequested ? hash : null);
  if (seenHash !== hash) {
    setSeenHash(hash);
    if (advancedRequested) {
      setAdvancedOpen(true);
      revealTarget.current = hash;
    }
  }
  useEffect(() => {
    if (!advancedOpen || revealTarget.current === null) return;
    const targetId = revealTarget.current;
    revealTarget.current = null;
    requestAnimationFrame(() => {
      const target = document.getElementById(targetId);
      if (!target) return;
      target.scrollIntoView({ block: "start", behavior: "auto" });
      target.focus({ preventScroll: true });
    });
  }, [advancedOpen, hash]);

  const unavailable =
    scope.kind === "unavailable" ? (
      <SettingsPageContainer>
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-muted-foreground">{scope.message}</p>
          {value.machine || value.checkout ? (
            <Button
              variant="outline"
              size="xs"
              onClick={() => selectScope(selectEnvironmentAxis(value, ALL_ENVIRONMENTS_VALUE))}
            >
              <LayersIcon />
              Show all environments
            </Button>
          ) : null}
        </div>
      </SettingsPageContainer>
    ) : null;
  // Keep the panel mounted so it can follow members when regrouping changes the project key.
  const projectScope =
    scope.kind === "project" ||
    scope.kind === "checkout" ||
    (scope.kind === "unavailable" &&
      (scope.reason === "project-missing" || scope.reason === "checkout-missing"));

  const panel =
    value.project && projectScope ? (
      <div
        className="flex min-h-0 flex-1 flex-col"
        data-fork-project-settings-mode={mode}
        data-fork-advanced-open={advancedOpen ? "true" : "false"}
      >
        {mode === "workspace" ? (
          <WorkspacePageContainer className="shrink-0 pb-0">
            <details
              className="rounded-lg border border-border p-3"
              open={advancedOpen}
              onToggle={(event) => setAdvancedOpen(event.currentTarget.open)}
            >
              <summary className="cursor-pointer text-sm font-medium">Advanced</summary>
              <p className="mt-2 text-xs text-muted-foreground">
                Development Profile, worker routing, Runtime state, tasks, handoffs, execution,
                verification, and recovery controls. Opening this section does not change project
                state or your saved interface mode.
              </p>
            </details>
          </WorkspacePageContainer>
        ) : null}
        <ProjectSettingsPanel
          projectKey={value.project}
          environmentId={value.machine ? EnvironmentId.make(value.machine) : null}
          checkoutKey={value.checkout ?? null}
          unavailable={unavailable}
        />
      </div>
    ) : unavailable ? (
      unavailable
    ) : (
      <SettingsScopeNotice target="project">
        Choose a project to manage its name, icon, checkouts and actions.
      </SettingsScopeNotice>
    );

  return <div className="flex min-h-0 flex-1 flex-col">{panel}</div>;
}
