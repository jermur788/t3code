import { DEVELOPMENT_PROFILE_BOUNDS } from "@t3tools/contracts";
import type {
  DevelopmentProfile,
  DevelopmentProfileId,
  DevelopmentProfileProject,
  EnvironmentId,
} from "@t3tools/contracts";
import { useEffect, useState } from "react";

import { useStableCallback } from "../../hooks/useStableCallback";
import { Alert, AlertDescription } from "../ui/alert";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { SettingsScopeNotice } from "./SettingsScopeNotice";
import { useSettingsScope } from "./SettingsScopeContext";
import { SettingsPageContainer, SettingsSection } from "./settingsLayout";
import {
  useDevelopmentProfilesApi,
  type DevelopmentProfilesApi,
} from "./useDevelopmentProfilesApi";

export function DevelopmentProfilesSettings() {
  const { environment } = useSettingsScope();
  const environmentId = environment?.environmentId ?? null;
  if (environmentId === null) {
    return (
      <SettingsScopeNotice target="environment">
        Choose an environment to manage its Development Profiles.
      </SettingsScopeNotice>
    );
  }
  return (
    <DevelopmentProfilesPanel
      key={environmentId}
      environmentId={environmentId}
      environmentLabel={environment?.label ?? "this environment"}
    />
  );
}

interface ProfileUsage {
  readonly profileId: DevelopmentProfileId;
  readonly projects: readonly DevelopmentProfileProject[] | null;
  readonly error: string | null;
}

interface ProfileDraft {
  readonly baseline: DevelopmentProfile;
  readonly name: string;
  readonly instructions: string;
}

function DevelopmentProfilesPanel({
  environmentId,
  environmentLabel,
}: {
  environmentId: EnvironmentId;
  environmentLabel: string;
}) {
  const api = useDevelopmentProfilesApi({ environmentId });
  const [profiles, setProfiles] = useState<readonly DevelopmentProfile[] | null>(null);
  const [usage, setUsage] = useState<ProfileUsage | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<DevelopmentProfileId | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useStableCallback(
    async (
      isActive: () => boolean = () => true,
    ): Promise<{ ok: false } | { ok: true; selectedId: DevelopmentProfileId | null }> => {
      const listed = await api.list();
      if (!isActive()) return { ok: false };
      if (!listed.ok) {
        setLoadError(listed.message);
        return { ok: false };
      }
      const nextSelectedId =
        selectedId !== null && listed.value.some((profile) => profile.profileId === selectedId)
          ? selectedId
          : (listed.value[0]?.profileId ?? null);
      setProfiles(listed.value);
      setLoadError(null);
      setSelectedId(nextSelectedId);
      return { ok: true, selectedId: nextSelectedId };
    },
  );

  const loadUsage = useStableCallback(
    async (profileId: DevelopmentProfileId, isActive: () => boolean) => {
      const listed = await api.listProjects(profileId);
      if (!isActive()) return;
      setUsage(
        listed.ok
          ? { profileId, projects: listed.value, error: null }
          : { profileId, projects: null, error: listed.message },
      );
    },
  );

  useEffect(() => {
    if (!api.ready) return;
    let active = true;
    void load(() => active);
    return () => {
      active = false;
    };
  }, [api.ready, load]);

  useEffect(() => {
    if (!api.ready || selectedId === null) return;
    let active = true;
    void loadUsage(selectedId, () => active);
    return () => {
      active = false;
    };
  }, [api.ready, loadUsage, selectedId]);

  const refreshSelectedUsage = useStableCallback(async () => {
    if (selectedId === null) return;
    setUsage(null);
    await loadUsage(selectedId, () => true);
  });

  const refresh = async () => {
    setRefreshing(true);
    const loaded = await load();
    setRefreshing(false);
    if (loaded.ok && loaded.selectedId === selectedId && loaded.selectedId !== null) {
      await loadUsage(loaded.selectedId, () => true);
    }
  };

  const replaceProfile = (profile: DevelopmentProfile) => {
    setProfiles((current) =>
      current === null
        ? [profile]
        : current.some((existing) => existing.profileId === profile.profileId)
          ? current.map((existing) =>
              existing.profileId === profile.profileId ? profile : existing,
            )
          : [...current, profile],
    );
  };

  const selectedProfile = profiles?.find((profile) => profile.profileId === selectedId) ?? null;
  const selectedUsage =
    selectedProfile !== null && usage?.profileId === selectedProfile.profileId ? usage : null;

  return (
    <SettingsPageContainer>
      <Alert variant="info">
        <AlertDescription>
          Development Profiles are reusable instruction sets owned by {environmentLabel}. A project
          can inherit one profile, while its own Runtime project instructions stay separate.
        </AlertDescription>
      </Alert>
      <SettingsSection id="development-profiles" title="Development Profiles">
        <div className="space-y-4 p-3 sm:p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              Profiles are managed for one environment at a time. A profile can be deleted only
              after it is removed from every project.
            </p>
            {api.ready ? (
              <Button
                size="sm"
                variant="outline"
                disabled={refreshing}
                onClick={() => void refresh()}
              >
                Refresh profiles
              </Button>
            ) : null}
          </div>
          {!api.canEdit ? (
            <p className="text-sm text-muted-foreground">
              This connection can inspect profiles but cannot change them.
            </p>
          ) : null}
          {loadError !== null ? (
            <Alert variant="error">
              <AlertDescription>{loadError}</AlertDescription>
            </Alert>
          ) : null}
          {!api.ready ? (
            <p className="text-sm text-muted-foreground">
              Connect {environmentLabel} to manage its Development Profiles.
            </p>
          ) : profiles === null ? (
            loadError === null ? (
              <p className="text-sm text-muted-foreground">Loading Development Profiles…</p>
            ) : null
          ) : (
            <>
              {profiles.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No Development Profiles yet. Create one to share working guidance across projects.
                </p>
              ) : (
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {profiles.map((profile) => (
                    <li
                      key={profile.profileId}
                      className="flex min-w-0 flex-wrap items-start justify-between gap-3 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{profile.name}</p>
                        <p className="text-xs text-muted-foreground">Revision {profile.revision}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        aria-label={`Edit ${profile.name}`}
                        onClick={() => {
                          setSelectedId(profile.profileId);
                          setCreateOpen(false);
                        }}
                      >
                        Edit
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              <div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!api.canEdit}
                  onClick={() => {
                    setCreateOpen(true);
                    setSelectedId(null);
                  }}
                >
                  New profile
                </Button>
              </div>
              {createOpen && api.canEdit ? (
                <DevelopmentProfileCreateForm
                  api={api}
                  onCancel={() => setCreateOpen(false)}
                  onCreated={(profile) => {
                    replaceProfile(profile);
                    setSelectedId(profile.profileId);
                    setCreateOpen(false);
                  }}
                />
              ) : null}
              {!createOpen && selectedProfile !== null ? (
                <DevelopmentProfileEditor
                  key={selectedProfile.profileId}
                  api={api}
                  canEdit={api.canEdit}
                  profile={selectedProfile}
                  usage={selectedUsage}
                  onChanged={replaceProfile}
                  onRefreshUsage={refreshSelectedUsage}
                  onDeleted={(profileId) => {
                    const remaining =
                      profiles?.filter((profile) => profile.profileId !== profileId) ?? null;
                    setProfiles(remaining);
                    setSelectedId(remaining?.[0]?.profileId ?? null);
                    setUsage(null);
                  }}
                />
              ) : null}
            </>
          )}
        </div>
      </SettingsSection>
    </SettingsPageContainer>
  );
}

function DevelopmentProfileCreateForm({
  api,
  onCancel,
  onCreated,
}: {
  api: DevelopmentProfilesApi;
  onCancel: () => void;
  onCreated: (profile: DevelopmentProfile) => void;
}) {
  const [name, setName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setBusy(true);
    const created = await api.create({ name: name.trim(), instructions });
    setBusy(false);
    if (!created.ok) {
      setError(created.message);
      return;
    }
    setError(null);
    onCreated(created.value);
  };

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <h3 className="text-sm font-medium">New Development Profile</h3>
      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium">Name</span>
        <Input
          aria-label="Profile name"
          value={name}
          maxLength={DEVELOPMENT_PROFILE_BOUNDS.nameMaxLength}
          onChange={(event) => setName(event.target.value)}
          disabled={busy}
        />
      </label>
      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium">Instructions</span>
        <Textarea
          aria-label="Profile instructions"
          value={instructions}
          maxLength={DEVELOPMENT_PROFILE_BOUNDS.instructionsMaxLength}
          onChange={(event) => setInstructions(event.target.value)}
          disabled={busy}
        />
      </label>
      {error !== null ? (
        <Alert variant="error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={busy || name.trim().length === 0} onClick={() => void create()}>
          Create profile
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function DevelopmentProfileEditor({
  api,
  canEdit,
  profile,
  usage,
  onChanged,
  onRefreshUsage,
  onDeleted,
}: {
  api: DevelopmentProfilesApi;
  canEdit: boolean;
  profile: DevelopmentProfile;
  usage: ProfileUsage | null;
  onChanged: (profile: DevelopmentProfile) => void;
  onRefreshUsage: () => Promise<void>;
  onDeleted: (profileId: DevelopmentProfileId) => void;
}) {
  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);

  const displayed = draft ?? {
    baseline: profile,
    name: profile.name,
    instructions: profile.instructions,
  };
  const baseline = displayed.baseline;
  const dirty =
    draft !== null &&
    (draft.name.trim() !== draft.baseline.name ||
      draft.instructions !== draft.baseline.instructions);

  const editDraft = (change: Partial<Pick<ProfileDraft, "name" | "instructions">>) => {
    setDraft((current) => {
      const base = current ?? {
        baseline: profile,
        name: profile.name,
        instructions: profile.instructions,
      };
      const next = { ...base, ...change };
      return !conflict &&
        next.name === next.baseline.name &&
        next.instructions === next.baseline.instructions
        ? null
        : next;
    });
  };

  const assigned = usage?.projects ?? null;
  const usageLoading = usage === null;
  const usageError = usage?.error ?? null;
  const deleteBlocked =
    !canEdit || usageLoading || usageError !== null || assigned === null || assigned.length > 0;

  const save = async () => {
    setBusy(true);
    const updated = await api.update({
      profileId: baseline.profileId,
      name: displayed.name.trim(),
      instructions: displayed.instructions,
      expectedRevision: baseline.revision,
    });
    setBusy(false);
    if (!updated.ok) {
      setError(updated.message);
      setConflict(updated.conflict);
      return;
    }
    setDraft(null);
    setError(null);
    setConflict(false);
    onChanged(updated.value);
  };

  const reloadLatest = async () => {
    setBusy(true);
    const latest = await api.read(baseline.profileId);
    setBusy(false);
    if (!latest.ok) {
      setError(latest.message);
      return;
    }
    setDraft(null);
    setError(null);
    setConflict(false);
    onChanged(latest.value);
  };

  const remove = async () => {
    setBusy(true);
    const deleted = await api.remove({
      profileId: baseline.profileId,
      expectedRevision: baseline.revision,
    });
    if (!deleted.ok) {
      setError(deleted.message);
      setConflict(deleted.conflict);
      if (deleted.inUse) await onRefreshUsage();
      setBusy(false);
      return;
    }
    setBusy(false);
    onDeleted(baseline.profileId);
  };

  const refreshAssignments = async () => {
    setBusy(true);
    await onRefreshUsage();
    setBusy(false);
  };

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium">{baseline.name}</h3>
          <p className="text-xs text-muted-foreground">
            Revision {baseline.revision} · Updated {new Date(baseline.updatedAt).toLocaleString()} ·{" "}
            {baseline.updatedBy}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          {usageLoading
            ? "Checking assignments…"
            : usageError !== null || assigned === null
              ? "Assignments unavailable"
              : assigned.length === 0
                ? "Unused"
                : `Assigned to ${assigned.map((project) => project.name).join(", ")}`}
        </p>
      </div>
      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium">Name</span>
        <Input
          aria-label="Profile name"
          value={displayed.name}
          maxLength={DEVELOPMENT_PROFILE_BOUNDS.nameMaxLength}
          onChange={(event) => editDraft({ name: event.target.value })}
          disabled={!canEdit || busy}
        />
      </label>
      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium">Instructions</span>
        <Textarea
          aria-label="Profile instructions"
          value={displayed.instructions}
          maxLength={DEVELOPMENT_PROFILE_BOUNDS.instructionsMaxLength}
          onChange={(event) => editDraft({ instructions: event.target.value })}
          disabled={!canEdit || busy}
        />
      </label>
      <p className="text-xs text-muted-foreground">
        {displayed.instructions.length.toLocaleString()} /{" "}
        {DEVELOPMENT_PROFILE_BOUNDS.instructionsMaxLength.toLocaleString()} characters · Saved only
        when you choose Save profile
      </p>
      {error !== null ? (
        <Alert variant="error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {usageError !== null ? (
        <div className="space-y-2">
          <Alert variant="error">
            <AlertDescription>{usageError}</AlertDescription>
          </Alert>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void refreshAssignments()}
          >
            Retry assignments
          </Button>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={!canEdit || busy || conflict || !dirty}
          onClick={() => void save()}
        >
          Save profile
        </Button>
        {conflict ? (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void reloadLatest()}>
            Discard draft and reload latest
          </Button>
        ) : null}
        <Button
          size="sm"
          variant="destructive-outline"
          disabled={deleteBlocked || busy}
          title={
            usageLoading
              ? "Assignments are still loading."
              : usageError !== null
                ? "Assignments could not be loaded. Refresh profiles before deleting."
                : assigned !== null && assigned.length > 0
                  ? "Remove this profile from its projects before deleting it."
                  : undefined
          }
          onClick={() => void remove()}
        >
          Delete profile
        </Button>
      </div>
      {assigned !== null && assigned.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Delete is unavailable until this profile is unassigned from every project.
        </p>
      ) : null}
    </div>
  );
}
