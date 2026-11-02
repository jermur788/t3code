import type {
  DevelopmentProfile,
  DevelopmentProfileId,
  EffectiveProjectInstructions,
  ProjectDevelopmentProfile,
} from "@t3tools/contracts";
import { useEffect, useState } from "react";

import type { SidebarProjectGroupMember } from "../../sidebarProjectGrouping";
import { useStableCallback } from "../../hooks/useStableCallback";
import { Alert, AlertDescription } from "../ui/alert";
import { Button } from "../ui/button";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "../ui/select";
import { concreteRuntimeProject } from "./ProjectSettingsPanel.logic";
import { SettingsSection } from "./settingsLayout";
import { useDevelopmentProfilesApi } from "./useDevelopmentProfilesApi";

const NONE_PROFILE = "__none__";

export function DevelopmentProfilesProjectSettings({
  members,
}: {
  members: readonly SidebarProjectGroupMember[];
}) {
  const member = concreteRuntimeProject(members);
  return (
    <SettingsSection id="development-profile" title="Development Profile">
      {member ? (
        <ProjectDevelopmentProfileAssignment
          key={`${member.environmentId}:${member.id}`}
          member={member}
        />
      ) : (
        <p className="p-4 text-sm text-muted-foreground">
          Select one environment and checkout using the settings scope above to choose a Development
          Profile. A profile is assigned to one concrete project; grouped projects are not
          synchronized.
        </p>
      )}
    </SettingsSection>
  );
}

function ProjectDevelopmentProfileAssignment({ member }: { member: SidebarProjectGroupMember }) {
  const api = useDevelopmentProfilesApi({
    environmentId: member.environmentId,
  });
  const [profiles, setProfiles] = useState<readonly DevelopmentProfile[] | null>(null);
  const [assignment, setAssignment] = useState<ProjectDevelopmentProfile | null>(null);
  const [effective, setEffective] = useState<EffectiveProjectInstructions | null>(null);
  const [selection, setSelection] = useState(NONE_PROFILE);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [effectiveError, setEffectiveError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [effectiveBusy, setEffectiveBusy] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);

  const loadEffective = useStableCallback(async (isActive: () => boolean = () => true) => {
    setEffectiveBusy(true);
    const resolved = await api.resolve(member.id);
    if (!isActive()) return;
    setEffectiveBusy(false);
    setEffective(resolved.ok ? resolved.value : null);
    setEffectiveError(resolved.ok ? null : resolved.message);
  });

  const load = useStableCallback(async (isActive: () => boolean = () => true) => {
    setEffectiveBusy(true);
    const listed = await api.list();
    if (!isActive()) return;
    if (!listed.ok) {
      setLoadError(listed.message);
      setEffectiveBusy(false);
      return;
    }
    const assigned = await api.getAssignment(member.id);
    if (!isActive()) return;
    if (!assigned.ok) {
      setLoadError(assigned.message);
      setEffectiveBusy(false);
      return;
    }
    setProfiles(listed.value);
    setAssignment(assigned.value);
    setSelection(assigned.value?.profileId ?? NONE_PROFILE);
    setLoadError(null);
    setSaveError(null);
    setConflict(false);
    await loadEffective(isActive);
  });

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- Loads the project's effective profile over RPC and cancels stale results on unmount.
  useEffect(() => {
    if (!api.ready) return;
    let active = true;
    void load(() => active);
    return () => {
      active = false;
    };
  }, [api.ready, load]);

  const reload = async () => {
    setReloading(true);
    await load();
    setReloading(false);
  };

  const save = async () => {
    setBusy(true);
    const saved = await api.setAssignment({
      projectId: member.id,
      profileId: selection === NONE_PROFILE ? null : (selection as DevelopmentProfileId),
      expectedRevision: assignment?.revision ?? 0,
    });
    setBusy(false);
    if (!saved.ok) {
      setSaveError(saved.message);
      setConflict(saved.conflict);
      return;
    }
    setAssignment(saved.value);
    setSelection(saved.value.profileId ?? NONE_PROFILE);
    setSaveError(null);
    setConflict(false);
    await loadEffective();
  };

  const assignedProfileId = assignment?.profileId ?? null;
  const selectedProfileId = selection === NONE_PROFILE ? null : selection;
  const pending = selectedProfileId !== assignedProfileId;
  const currentProfile =
    profiles?.find((profile) => profile.profileId === assignedProfileId) ?? null;
  const missingProfile =
    assignedProfileId !== null &&
    profiles !== null &&
    !profiles.some((profile) => profile.profileId === assignedProfileId);

  return (
    <div className="space-y-5 p-3 sm:p-4">
      <p className="break-words text-xs text-muted-foreground">
        {member.environmentLabel ?? "Environment"} · {member.workspaceRoot}
      </p>
      <p className="text-sm text-muted-foreground">
        Choose None or one profile for this project. Profiles are independent of Project Runtime, so
        this assignment stays available while Runtime is disabled.
      </p>
      {loadError !== null ? (
        <div className="space-y-2">
          <Alert variant="error">
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
          {api.ready ? (
            <Button size="sm" variant="outline" disabled={reloading} onClick={() => void reload()}>
              Reload assignment
            </Button>
          ) : null}
        </div>
      ) : null}
      {!api.ready ? (
        <p className="text-sm text-muted-foreground">
          Connect {member.environmentLabel ?? "the environment"} to choose a Development Profile.
        </p>
      ) : profiles === null ? (
        loadError === null ? (
          <p className="text-sm text-muted-foreground">Loading Development Profiles…</p>
        ) : null
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-56 flex-1 space-y-2">
              <p className="text-sm font-medium">Assigned profile</p>
              <Select
                value={selection}
                onValueChange={(value) => {
                  if (value !== null) {
                    setSelection(value);
                    if (!conflict) setSaveError(null);
                  }
                }}
                disabled={!api.canAssign || busy || reloading}
              >
                <SelectTrigger aria-label="Assigned Development Profile">
                  <SelectValue>
                    {selectedProfileId === null
                      ? "None"
                      : (profiles.find((profile) => profile.profileId === selectedProfileId)
                          ?.name ?? "Unavailable profile")}
                  </SelectValue>
                </SelectTrigger>
                <SelectPopup>
                  <SelectItem value={NONE_PROFILE}>None</SelectItem>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.profileId} value={profile.profileId}>
                      {profile.name}
                    </SelectItem>
                  ))}
                  {missingProfile ? (
                    <SelectItem value={assignedProfileId}>Unavailable profile</SelectItem>
                  ) : null}
                </SelectPopup>
              </Select>
            </div>
            <Button
              size="sm"
              disabled={!api.canAssign || busy || reloading || !pending || conflict}
              onClick={() => void save()}
            >
              Save assignment
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {assignment === null
              ? "Never assigned · Revision 0"
              : `Revision ${assignment.revision} · ${currentProfile?.name ?? "None"}`}
          </p>
          {saveError !== null ? (
            <Alert variant="error">
              <AlertDescription>{saveError}</AlertDescription>
            </Alert>
          ) : null}
          {conflict ? (
            <Button
              size="sm"
              variant="outline"
              disabled={busy || reloading}
              onClick={() => void reload()}
            >
              Reload latest
            </Button>
          ) : null}
          {!api.canAssign ? (
            <p className="text-sm text-muted-foreground">This connection is read-only.</p>
          ) : null}
        </>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium">Effective instructions</h3>
        {api.ready ? (
          <Button
            size="sm"
            variant="outline"
            disabled={effectiveBusy}
            onClick={() => void loadEffective()}
          >
            Refresh effective instructions
          </Button>
        ) : null}
      </div>

      {api.ready && effectiveBusy && effective === null ? (
        <p className="text-sm text-muted-foreground">Loading effective instructions…</p>
      ) : null}

      {effectiveError !== null ? (
        <Alert variant="error">
          <AlertDescription>{effectiveError}</AlertDescription>
        </Alert>
      ) : null}

      {effective === null && effectiveError === null && !effectiveBusy && api.ready ? (
        <p className="text-sm text-muted-foreground">
          Effective instructions are unavailable. Refresh to try again.
        </p>
      ) : null}

      {effective !== null ? (
        <div className="space-y-3">
          <section aria-label="Development Profile instructions" className="space-y-2">
            <h3 className="text-sm font-medium">Inherited Development Profile</h3>
            <p className="break-words text-xs text-muted-foreground">
              {effective.developmentProfile === null
                ? "No profile instructions are inherited."
                : `${effective.developmentProfile.name} · Revision ${effective.developmentProfile.revision}`}
            </p>
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-muted/32 p-3 text-xs">
              {effective.developmentProfile?.instructions ?? "None"}
            </pre>
          </section>
          <section aria-label="Project instructions" className="space-y-2">
            <h3 className="text-sm font-medium">Project instructions</h3>
            <p className="break-words text-xs text-muted-foreground">
              Owned by this project and kept separate from the Development Profile.
            </p>
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-muted/32 p-3 text-xs">
              {effective.projectInstructions?.instructions ?? "None"}
            </pre>
          </section>
          <p className="break-words text-xs text-muted-foreground">
            Precedence: {effective.precedence}
          </p>
          <details className="rounded-lg border border-border p-3">
            <summary className="cursor-pointer text-sm font-medium">
              Combined effective instructions preview
            </summary>
            <p className="mt-2 text-xs text-muted-foreground">
              Read-only composition. T3 Code does not save a merged copy.
            </p>
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/32 p-3 text-xs">
              {effective.formattedInstructions.length > 0
                ? effective.formattedInstructions
                : "No instructions."}
            </pre>
          </details>
        </div>
      ) : null}
    </div>
  );
}
