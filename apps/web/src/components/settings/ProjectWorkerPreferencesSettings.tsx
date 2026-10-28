import type {
  ProjectRuntimeRouting,
  RuntimeRouteResolution,
  RuntimeRoutingFallback,
  RuntimeRoutingPolicy,
  RuntimeWorkerRole,
} from "@t3tools/contracts";
import * as Equal from "effect/Equal";
import { useEffect, useRef, useState } from "react";

import { useStableCallback } from "../../hooks/useStableCallback";
import type { SidebarProjectGroupMember } from "../../sidebarProjectGrouping";
import { Alert, AlertDescription } from "../ui/alert";
import { Button } from "../ui/button";
import { concreteRuntimeProject } from "./ProjectSettingsPanel.logic";
import { SettingsSection } from "./settingsLayout";
import { useProjectRuntimeApi } from "./useProjectRuntimeApi";
import { useWorkerRoutingCatalog } from "./useWorkerRoutingCatalog";
import { ROUTING_EVALUATION_CAVEAT, WorkerRoleResolutionList } from "./WorkerRouteResolution";
import { WorkerRoutingEditor } from "./WorkerRoutingEditor";
import { WORKER_ROLE_ORDER } from "./workerRouting.logic";

const EMPTY_POLICY: RuntimeRoutingPolicy = { roleRoutes: [] };
const PROJECT_FALLBACK_OPTIONS: ReadonlyArray<RuntimeRoutingFallback> = [
  "continue",
  "inherit",
  "fail",
];

export function ProjectWorkerPreferencesSettings({
  members,
}: {
  readonly members: readonly SidebarProjectGroupMember[];
}) {
  const member = concreteRuntimeProject(members);
  return (
    <SettingsSection id="project-worker-preferences" title="Worker preferences">
      {member ? (
        <ProjectWorkerPreferences key={`${member.environmentId}:${member.id}`} member={member} />
      ) : (
        <p className="p-4 text-sm text-muted-foreground">
          Select one environment and checkout using the settings scope above to choose worker
          preferences. A project overrides one concrete project; grouped projects are not
          synchronized.
        </p>
      )}
    </SettingsSection>
  );
}

function ProjectWorkerPreferences({ member }: { member: SidebarProjectGroupMember }) {
  const api = useProjectRuntimeApi({ environmentId: member.environmentId, projectId: member.id });
  const catalog = useWorkerRoutingCatalog({
    environmentId: member.environmentId,
    projectId: member.id,
  });
  const [routing, setRouting] = useState<ProjectRuntimeRouting | null | undefined>(undefined);
  const [draft, setDraft] = useState<RuntimeRoutingPolicy>(EMPTY_POLICY);
  const [resolutions, setResolutions] = useState<ReadonlyMap<
    RuntimeWorkerRole,
    RuntimeRouteResolution
  > | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [effectiveError, setEffectiveError] = useState<string | null>(null);
  const [effectiveLoading, setEffectiveLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const initialized = useRef(false);
  const mounted = useRef(true);

  const loadEffective = useStableCallback(async (isActive: () => boolean = () => true) => {
    setEffectiveLoading(true);
    const results = await Promise.all(
      WORKER_ROLE_ORDER.map(async (role) => ({ role, result: await api.resolveRoute({ role }) })),
    );
    if (!isActive()) return;
    setEffectiveLoading(false);
    const failed = results.find(({ result }) => !result.ok);
    if (failed !== undefined && !failed.result.ok) {
      setEffectiveError(failed.result.message);
      return;
    }
    const next = new Map<RuntimeWorkerRole, RuntimeRouteResolution>();
    for (const { role, result } of results) {
      if (result.ok) next.set(role, result.value);
    }
    setEffectiveError(null);
    setResolutions(next);
  });

  const load = useStableCallback(async (isActive: () => boolean = () => true) => {
    setRouting(undefined);
    setLoadError(null);
    setSaveError(null);
    setConflict(false);
    const read = await api.readRouting();
    if (!isActive()) return;
    if (!read.ok) {
      setLoadError(read.message);
      setEffectiveLoading(false);
      return;
    }
    setRouting(read.value);
    setDraft(read.value?.routing ?? EMPTY_POLICY);
    await loadEffective(isActive);
  });

  // oxlint-disable-next-line t3code/react-effect-budget -- Loads worker routing over RPC and cancels stale results on unmount.
  useEffect(() => {
    mounted.current = true;
    if (api.ready && !initialized.current) {
      initialized.current = true;
      void load(() => mounted.current);
    }
    return () => {
      mounted.current = false;
    };
  }, [api.ready, load]);

  const reload = async () => {
    setBusy(true);
    await load();
    setBusy(false);
  };

  const saveRouting = async (next: RuntimeRoutingPolicy | null) => {
    setBusy(true);
    const saved = await api.saveRouting({
      routing: next,
      expectedRevision: routing?.revision ?? 0,
    });
    setBusy(false);
    if (!saved.ok) {
      setSaveError(saved.message);
      setConflict(saved.conflict);
      return;
    }
    setRouting(saved.value);
    setDraft(saved.value.routing ?? EMPTY_POLICY);
    setSaveError(null);
    setConflict(false);
    await loadEffective();
  };

  const reloadLatest = async () => {
    setBusy(true);
    const read = await api.readRouting();
    if (!read.ok) {
      setBusy(false);
      setLoadError(read.message);
      return;
    }
    setRouting(read.value);
    setDraft(read.value?.routing ?? EMPTY_POLICY);
    setSaveError(null);
    setConflict(false);
    setLoadError(null);
    await loadEffective();
    setBusy(false);
  };

  const dirty = !Equal.equals(draft, routing?.routing ?? EMPTY_POLICY);
  const hasOverride = routing?.routing != null;

  return (
    <div className="space-y-5 p-3 sm:p-4">
      <p className="break-words text-xs text-muted-foreground">
        {member.environmentLabel ?? "Environment"} · {member.workspaceRoot}
      </p>
      <Alert variant="info">
        <AlertDescription>
          Worker preferences choose which provider and model T3 prefers for each kind of work. They
          apply in this order: task setting, project setting, Development Profile setting, then
          normal T3 behaviour.
        </AlertDescription>
      </Alert>

      <section className="space-y-3" aria-label="Effective worker choices">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-medium">Effective worker choices</h3>
            <p className="text-xs text-muted-foreground">
              What is taking effect with the last saved settings, for every worker role. Refresh
              after changing the Development Profile or provider status.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={effectiveLoading}
            onClick={() => void loadEffective()}
          >
            Refresh effective choices
          </Button>
        </div>
        {!api.ready ? (
          <p className="text-sm text-muted-foreground">
            Connect {member.environmentLabel ?? "the environment"} to read effective worker choices.
          </p>
        ) : effectiveError !== null ? (
          <div className="space-y-2">
            <Alert variant="error">
              <AlertDescription>{effectiveError}</AlertDescription>
            </Alert>
            <Button
              size="sm"
              variant="outline"
              disabled={effectiveLoading}
              onClick={() => void loadEffective()}
            >
              Retry effective choices
            </Button>
          </div>
        ) : effectiveLoading && resolutions === null ? (
          <p className="text-sm text-muted-foreground" role="status">
            Checking effective worker choices…
          </p>
        ) : resolutions === null ? (
          <p className="text-sm text-muted-foreground">
            Effective worker choices are unavailable. Use Retry effective choices to load them.
          </p>
        ) : (
          <WorkerRoleResolutionList resolutions={resolutions} entries={catalog.entries} />
        )}
        <p className="break-words text-xs text-muted-foreground">{ROUTING_EVALUATION_CAVEAT}</p>
      </section>

      <section className="space-y-3" aria-label="Project worker settings">
        <div>
          <h3 className="text-sm font-medium">Project worker settings</h3>
          <p className="text-xs text-muted-foreground">
            {hasOverride
              ? "This project overrides the Development Profile for the roles listed below. Other roles still use the Development Profile or normal T3 behaviour."
              : "This project has no worker override. Development Profile settings apply, then normal T3 behaviour."}
          </p>
        </div>

        {loadError !== null ? (
          <div className="space-y-2">
            <Alert variant="error">
              <AlertDescription>{loadError}</AlertDescription>
            </Alert>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void reload()}>
              Reload worker settings
            </Button>
          </div>
        ) : !api.ready ? (
          <p className="text-sm text-muted-foreground">
            Connect {member.environmentLabel ?? "the environment"} to change worker preferences.
          </p>
        ) : routing === undefined ? (
          <p className="text-sm text-muted-foreground">Loading worker settings…</p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              {routing === null
                ? "Never saved · Revision 0"
                : routing.routing === null
                  ? `Inherits the Development Profile · Revision ${routing.revision}`
                  : `Project override · Revision ${routing.revision}`}
              {dirty ? " · Unsaved changes" : ""}
            </p>
            <WorkerRoutingEditor
              policy={draft}
              fallbackOptions={PROJECT_FALLBACK_OPTIONS}
              catalog={catalog}
              environmentId={member.environmentId}
              disabled={!api.canEdit || busy}
              idPrefix={`project-worker:${member.id}`}
              onChange={setDraft}
            />
            {!api.canEdit ? (
              <p className="text-sm text-muted-foreground">This connection is read-only.</p>
            ) : null}
            {saveError !== null ? (
              <Alert variant="error">
                <AlertDescription>{saveError}</AlertDescription>
              </Alert>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={!api.canEdit || busy || conflict || !dirty}
                onClick={() => void saveRouting(draft)}
              >
                Save worker settings
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!api.canEdit || busy || conflict || !hasOverride}
                onClick={() => void saveRouting(null)}
              >
                Reset to Development Profile
              </Button>
              {conflict ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void reloadLatest()}
                >
                  Reload latest worker settings
                </Button>
              ) : null}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
