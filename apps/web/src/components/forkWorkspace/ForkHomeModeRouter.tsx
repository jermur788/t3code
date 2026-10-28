import { Button } from "../ui/button";
import { ForkHome } from "../forkHome/ForkHome";
import type { SettingsScopeSearch } from "../settings/settingsScope";
import { useForkWorkspaceMode } from "../../forkWorkspaceMode";
import { WorkspaceForkHome } from "./WorkspaceForkHome";

export function ForkHomeModeRouter({
  search,
  onSearchChange,
}: {
  readonly search: SettingsScopeSearch;
  readonly onSearchChange: (next: SettingsScopeSearch) => void;
}) {
  const mode = useForkWorkspaceMode();

  return (
    <>
      {mode.effectiveMode === "workspace" ? (
        <WorkspaceForkHome search={search} onSearchChange={onSearchChange} />
      ) : (
        <ForkHome search={search} onSearchChange={onSearchChange} />
      )}
      {!mode.hasChosenMode ? <FirstModeChoice setMode={mode.setMode} /> : null}
    </>
  );
}

function FirstModeChoice({
  setMode,
}: {
  readonly setMode: (mode: "workspace" | "development") => void;
}) {
  return (
    <aside
      aria-label="Choose T3 Fork interface"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-2xl rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-lg"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Choose how you want to use T3 Fork</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Workspace keeps the project UI focused. Development shows routing, executions, handoffs,
            review, and recovery controls directly. You can switch later in General settings.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setMode("workspace")}>
            Workspace
          </Button>
          <Button size="sm" onClick={() => setMode("development")}>
            Development
          </Button>
        </div>
      </div>
    </aside>
  );
}
