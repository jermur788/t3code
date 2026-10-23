import { useState } from "react";
import {
  PROJECT_RUNTIME_BOUNDS,
  type ProjectRuntimeInstructions as Instructions,
} from "@t3tools/contracts";
import { Button } from "../ui/button";
import {
  RuntimeText,
  RuntimeError,
  RuntimeLoadError,
  useRuntimeLoad,
} from "./ProjectRuntimeFields";
import type { ProjectRuntimeApi } from "./useProjectRuntimeApi";

export function ProjectRuntimeInstructions({ api }: { api: ProjectRuntimeApi }) {
  const { result, reload } = useRuntimeLoad(() => api.readInstructions());
  return (
    <section className="space-y-3" aria-label="Project Instructions">
      <h3 className="text-sm font-medium">Project Instructions</h3>
      <RuntimeLoadError result={result} reload={reload} />
      {result?.ok && (
        <InstructionsEditor
          key={result.value?.revision ?? 0}
          saved={result.value}
          api={api}
          reload={reload}
        />
      )}
    </section>
  );
}
function InstructionsEditor({
  saved,
  api,
  reload,
}: {
  saved: Instructions | null;
  api: ProjectRuntimeApi;
  reload: () => unknown;
}) {
  const [text, setText] = useState(saved?.instructions ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState(false);
  const save = async () => {
    setBusy(true);
    const result = await api.saveInstructions({
      instructions: text,
      expectedRevision: saved?.revision ?? 0,
    });
    setBusy(false);
    if (result.ok) {
      setError(null);
      await reload();
    } else {
      setError(result.message);
      setConflict(result.conflict);
    }
  };
  return (
    <div className="space-y-3">
      <p className="break-words text-xs text-muted-foreground">
        {saved
          ? `Revision ${saved.revision} · Updated ${new Date(saved.updatedAt).toLocaleString()} · ${saved.updatedBy}`
          : "No instructions yet. Save project-owned working guidance here."}
      </p>
      <RuntimeText
        label="Instructions"
        multiline
        value={text}
        onChange={setText}
        maxLength={PROJECT_RUNTIME_BOUNDS.instructionsMaxLength}
        disabled={!api.canEdit || busy}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          {text.length.toLocaleString()} /{" "}
          {PROJECT_RUNTIME_BOUNDS.instructionsMaxLength.toLocaleString()} characters · Saved only
          when you choose Save
        </span>
        <Button
          size="sm"
          disabled={!api.canEdit || busy || conflict || text === (saved?.instructions ?? "")}
          onClick={() => void save()}
        >
          Save instructions
        </Button>
      </div>
      <RuntimeError message={error} />
      {conflict && (
        <Button size="sm" variant="outline" onClick={() => void reload()}>
          Discard draft and reload instructions
        </Button>
      )}
    </div>
  );
}
