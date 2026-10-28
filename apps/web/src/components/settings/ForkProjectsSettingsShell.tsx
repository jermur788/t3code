import { useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { useForkWorkspaceMode } from "../../forkWorkspaceMode";
import { Button } from "../ui/button";
import { ProjectsSettings } from "./ProjectsSettings";
import { SettingsPageContainer, SettingsRow, SettingsSection } from "./settingsLayout";

import "./ForkProjectsSettingsShell.css";

const ADVANCED_PROJECT_TARGETS = new Set([
  "development-profile",
  "project-worker-preferences",
  "project-runtime",
  "project-runtime-state",
  "project-runtime-tasks",
]);

export function isWorkspaceAdvancedProjectTarget(hash: string): boolean {
  const target = hash.replace(/^#/, "");
  return ADVANCED_PROJECT_TARGETS.has(target);
}

export function ForkProjectsSettingsShell() {
  const { effectiveMode } = useForkWorkspaceMode();
  const hash = useLocation({ select: (location) => location.hash });
  const deepLinkedAdvanced = isWorkspaceAdvancedProjectTarget(hash);
  const [advancedOpen, setAdvancedOpen] = useState(deepLinkedAdvanced);

  useEffect(() => {
    if (deepLinkedAdvanced) setAdvancedOpen(true);
  }, [deepLinkedAdvanced]);

  if (effectiveMode === "development") return <ProjectsSettings />;

  const showAdvanced = advancedOpen || deepLinkedAdvanced;

  return (
    <>
      <SettingsPageContainer>
        <SettingsSection id="fork-workspace-project-controls" title="Workspace">
          <SettingsRow
            title="Advanced project controls"
            description="Development Profile, worker routing, Runtime state, tasks, handoffs, executions, review, and recovery stay configured but are hidden from the normal Workspace path."
            control={
              <Button
                size="sm"
                variant="outline"
                aria-expanded={showAdvanced}
                onClick={() => setAdvancedOpen((open) => !open)}
              >
                {showAdvanced ? "Hide Advanced" : "Show Advanced"}
              </Button>
            }
          />
        </SettingsSection>
      </SettingsPageContainer>
      <div data-fork-project-settings={showAdvanced ? "workspace-advanced" : "workspace-simple"}>
        <ProjectsSettings />
      </div>
    </>
  );
}
