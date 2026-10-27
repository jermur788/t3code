import { useState } from "react";
import type { SidebarProjectGroupMember } from "../../sidebarProjectGrouping";
import { Button } from "../ui/button";
import { SettingsSection, useSettingsSearchTarget } from "./settingsLayout";
import { useProjectRuntimeApi } from "./useProjectRuntimeApi";
import { RuntimeError, RuntimeLoadError, useRuntimeLoad } from "./ProjectRuntimeFields";
import { ProjectRuntimeInstructions } from "./ProjectRuntimeInstructions";
import { ProjectRuntimeSources } from "./ProjectRuntimeSources";
import { ProjectRuntimeTasks } from "./ProjectRuntimeTasks";
import { concreteRuntimeProject } from "./ProjectSettingsPanel.logic";

export function ProjectRuntimeSettings({
  members,
}: {
  members: readonly SidebarProjectGroupMember[];
}) {
  const member = concreteRuntimeProject(members);
  return (
    <SettingsSection id="project-runtime" title="Project Runtime">
      {member ? (
        <RuntimeProject key={`${member.environmentId}:${member.id}`} member={member} />
      ) : (
        <p className="p-4 text-sm text-muted-foreground">
          Select one environment and checkout using the settings scope above to configure Runtime.
          Runtime belongs to one concrete project; grouped projects are not synchronized.
        </p>
      )}
    </SettingsSection>
  );
}
function DisabledRuntimeSection({
  targetId,
  title,
  description,
}: {
  targetId: string;
  title: string;
  description: string;
}) {
  const targetRef = useSettingsSearchTarget<HTMLElement>(targetId);
  return (
    <section id={targetId} ref={targetRef} tabIndex={-1} className="space-y-2" aria-label={title}>
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </section>
  );
}

function RuntimeProject({ member }: { member: SidebarProjectGroupMember }) {
  const api = useProjectRuntimeApi({ environmentId: member.environmentId, projectId: member.id });
  const { result, reload } = useRuntimeLoad(() => api.status(), api.ready);
  const stateTargetRef = useSettingsSearchTarget<HTMLElement>("project-runtime-state");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toggle = async (enabled: boolean) => {
    setBusy(true);
    const changed = await api.setEnabled({ enabled });
    setBusy(false);
    setError(changed.ok ? null : changed.message);
    if (changed.ok) await reload();
  };
  return (
    <div className="space-y-6 p-4">
      <p className="break-words text-xs text-muted-foreground">
        {member.environmentLabel ?? "Environment"} · {member.workspaceRoot}
      </p>
      <RuntimeLoadError result={result} reload={reload} />
      {result?.ok && (
        <>
          <section
            id="project-runtime-state"
            ref={stateTargetRef}
            tabIndex={-1}
            className="space-y-3"
            aria-label="Project State"
          >
            <h3 className="text-sm font-medium">Project State</h3>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">
                  Runtime {result.value.enabled ? "enabled" : "disabled"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Revision {result.value.revision} · Version {result.value.version}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={!api.canEdit || busy}
                onClick={() => void toggle(!result.value.enabled)}
              >
                {result.value.enabled ? "Disable Runtime" : "Enable Runtime"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Runtime data is preserved and will be available again when re-enabled.
            </p>
          </section>
          {!api.canEdit && (
            <p className="text-sm text-muted-foreground">This connection is read-only.</p>
          )}
          <RuntimeError message={error} />
          {result.value.enabled ? (
            <>
              <ProjectRuntimeInstructions api={api} />
              <ProjectRuntimeSources api={api} />
              <ProjectRuntimeTasks api={api} />
            </>
          ) : (
            <>
              <DisabledRuntimeSection
                targetId="project-runtime-instructions"
                title="Project Instructions"
                description="Enable Runtime to view and edit project instructions."
              />
              <DisabledRuntimeSection
                targetId="project-runtime-sources"
                title="Registered sources"
                description="Enable Runtime to view and manage registered sources."
              />
              <DisabledRuntimeSection
                targetId="project-runtime-tasks"
                title="Runtime tasks"
                description="Enable Runtime to view tasks and handoffs."
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
