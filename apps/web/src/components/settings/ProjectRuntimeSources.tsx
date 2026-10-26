import { useState } from "react";
import {
  PROJECT_RUNTIME_BOUNDS as B,
  type ProjectRuntimeSource,
  type ProjectRuntimeSourceRole,
} from "@t3tools/contracts";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import {
  RuntimeText,
  RuntimeSelect,
  RuntimeError,
  RuntimePager,
  RuntimeLoadError,
  useRuntimeLoad,
} from "./ProjectRuntimeFields";
import type { ProjectRuntimeApi } from "./useProjectRuntimeApi";
import { useSettingsSearchTarget } from "./settingsLayout";

export function ProjectRuntimeSources({ api }: { api: ProjectRuntimeApi }) {
  const [cursor, setCursor] = useState(0);
  const targetRef = useSettingsSearchTarget<HTMLElement>("project-runtime-sources");
  return (
    <section
      id="project-runtime-sources"
      ref={targetRef}
      tabIndex={-1}
      className="space-y-3"
      aria-label="Registered sources"
    >
      <h3 className="text-sm font-medium">Registered sources</h3>
      <p className="text-xs text-muted-foreground">
        Workspace-relative text files only. Health is a bounded accessibility probe, not full-file
        validation.
      </p>
      <SourcePage key={cursor} api={api} cursor={cursor} setCursor={setCursor} />
    </section>
  );
}
function SourcePage({
  api,
  cursor,
  setCursor,
}: {
  api: ProjectRuntimeApi;
  cursor: number;
  setCursor: (cursor: number) => void;
}) {
  const { result, reload } = useRuntimeLoad(() => api.listSources({ cursor, limit: 20 }));
  const [editing, setEditing] = useState<ProjectRuntimeSource | "new" | null>(null);
  const [removing, setRemoving] = useState<ProjectRuntimeSource | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toggle = async (source: ProjectRuntimeSource) => {
    setBusy(true);
    const result = await api.updateSource({
      sourceId: source.sourceId,
      expectedRevision: source.revision,
      enabled: !source.enabled,
    });
    setBusy(false);
    setError(result.ok ? null : result.message);
    await reload();
  };
  const remove = async () => {
    if (!removing) return;
    setBusy(true);
    const result = await api.removeSource({
      sourceId: removing.sourceId,
      expectedRevision: removing.revision,
    });
    setBusy(false);
    setError(result.ok ? null : result.message);
    setRemoving(null);
    await reload();
  };
  return (
    <div className="space-y-3">
      <RuntimeLoadError result={result} reload={reload} />
      <RuntimeError message={error} />
      {result?.ok && (
        <>
          {result.value.sources.length === 0 ? (
            <p className="text-sm text-muted-foreground">No registered sources.</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {result.value.sources.map(({ source, health }) => (
                <li key={source.sourceId} className="space-y-2 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-medium">{source.title}</p>
                      <p className="break-all text-xs text-muted-foreground">
                        {source.relativePath}
                      </p>
                    </div>
                    <span className="text-xs">
                      {health} · {source.enabled ? "enabled" : "disabled"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {source.role} · Rank {source.authorityRank ?? "Not set"} · Revision{" "}
                    {source.revision}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="xs"
                      variant="outline"
                      disabled={busy}
                      onClick={() => setEditing(source)}
                    >
                      {api.canEdit ? "Edit source" : "View source"}
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      disabled={!api.canEdit || busy}
                      onClick={() => void toggle(source)}
                    >
                      {source.enabled ? "Disable source" : "Enable source"}
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      disabled={!api.canEdit || busy}
                      onClick={() => setRemoving(source)}
                    >
                      Remove source
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <RuntimePager cursor={cursor} next={result.value.nextCursor} onChange={setCursor} />
        </>
      )}
      <Button
        size="sm"
        variant="outline"
        disabled={!api.canEdit || busy}
        onClick={() => setEditing("new")}
      >
        Add source
      </Button>
      <Button size="sm" variant="ghost" disabled={busy} onClick={() => void reload()}>
        Refresh sources
      </Button>
      {removing && (
        <div className="space-y-3 rounded-lg border p-3">
          <p className="break-words text-sm">
            Remove “{removing.title}” from the registry? This does not delete the workspace file.
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" disabled={busy} onClick={() => void remove()}>
              Confirm removal
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => setRemoving(null)}>
              Cancel removal
            </Button>
          </div>
        </div>
      )}
      {editing && (
        <SourceEditor
          key={editing === "new" ? "new" : `${editing.sourceId}:${editing.revision}`}
          saved={editing === "new" ? null : editing}
          api={api}
          close={() => setEditing(null)}
          savedSource={() => {
            setEditing(null);
            void reload();
          }}
          reload={async () => {
            const latest = await reload();
            if (latest.ok && editing !== "new") {
              const source = latest.value.sources.find(
                (x) => x.source.sourceId === editing.sourceId,
              )?.source;
              setEditing(source ?? null);
            }
          }}
        />
      )}
    </div>
  );
}
function SourceEditor({
  saved,
  api,
  close,
  savedSource,
  reload,
}: {
  saved: ProjectRuntimeSource | null;
  api: ProjectRuntimeApi;
  close: () => void;
  savedSource: () => void;
  reload: () => Promise<void>;
}) {
  const [title, setTitle] = useState(saved?.title ?? "");
  const [path, setPath] = useState(saved?.relativePath ?? "");
  const [role, setRole] = useState<ProjectRuntimeSourceRole>(saved?.role ?? "reference");
  const [rank, setRank] = useState(saved?.authorityRank?.toString() ?? "");
  const [description, setDescription] = useState(saved?.description ?? "");
  const [enabled, setEnabled] = useState(saved?.enabled ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const rankValue = rank.trim() === "" ? undefined : Number(rank);
  const validRank = rankValue === undefined || (Number.isSafeInteger(rankValue) && rankValue >= 0);
  const save = async () => {
    if (!validRank) return;
    setBusy(true);
    const fields = { title, relativePath: path, role, enabled };
    const result = saved
      ? await api.updateSource({
          ...fields,
          sourceId: saved.sourceId,
          expectedRevision: saved.revision,
          authorityRank: rankValue ?? null,
          description: description.trim() || null,
        })
      : await api.createSource({
          ...fields,
          ...(rankValue === undefined ? {} : { authorityRank: rankValue }),
          ...(description.trim() ? { description } : {}),
        });
    setBusy(false);
    if (result.ok) savedSource();
    else {
      setError(result.message);
      setConflict(result.conflict);
    }
  };
  return (
    <div className="space-y-3 rounded-lg border p-3" aria-label="Source editor">
      <h4 className="text-sm font-medium">
        {saved ? `Edit source · Revision ${saved.revision}` : "Add source"}
      </h4>
      <fieldset disabled={!api.canEdit || busy} className="space-y-3">
        <RuntimeText
          label="Source title"
          value={title}
          onChange={setTitle}
          maxLength={B.sourceTitleMaxLength}
        />
        <RuntimeText
          label="Workspace-relative path"
          value={path}
          onChange={setPath}
          maxLength={B.sourcePathMaxLength}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <RuntimeSelect
            label="Role"
            value={role}
            values={["authority", "implementation", "knowledge", "reference"]}
            onChange={setRole}
          />
          <RuntimeText label="Authority rank (optional)" value={rank} onChange={setRank} />
        </div>
        {!validRank && (
          <RuntimeError message="Authority rank must be a non-negative whole number." />
        )}
        <RuntimeText
          label="Source description"
          multiline
          value={description}
          onChange={setDescription}
          maxLength={B.sourceDescriptionMaxLength}
        />
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={enabled} onCheckedChange={(checked) => setEnabled(checked === true)} />
          Source enabled
        </label>
      </fieldset>
      <RuntimeError message={error} />
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={!api.canEdit || busy || conflict || !validRank || !title.trim() || !path.trim()}
          onClick={() => void save()}
        >
          Save source
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={close}>
          Cancel source edit
        </Button>
        {conflict && (
          <Button size="sm" variant="outline" onClick={() => void reload()}>
            Discard draft and reload source
          </Button>
        )}
      </div>
    </div>
  );
}
