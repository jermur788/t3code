import { Button } from "../ui/button";
import type { ForkWorkspaceMode } from "../../forkWorkspaceMode";

export function ForkModeChoice({
  onChoose,
}: {
  readonly onChoose: (mode: ForkWorkspaceMode) => void;
}) {
  return (
    <div className="fixed inset-x-4 top-4 z-50 mx-auto max-w-2xl rounded-xl border border-border bg-background/95 p-4 shadow-lg backdrop-blur">
      <div className="space-y-1">
        <p className="text-sm font-semibold">Choose your T3 Fork interface</p>
        <p className="text-xs text-muted-foreground">
          This only changes what the interface shows. You can switch later in Settings → General.
        </p>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Button
          className="justify-start text-left"
          size="sm-multiline"
          variant="outline"
          onClick={() => onChoose("workspace")}
        >
          <span>
            <span className="block font-medium">Workspace</span>
            <span className="mt-1 block text-xs font-normal text-muted-foreground">
              Project context and conversations first; development controls stay under Advanced.
            </span>
          </span>
        </Button>
        <Button
          className="justify-start text-left"
          size="sm-multiline"
          variant="outline"
          onClick={() => onChoose("development")}
        >
          <span>
            <span className="block font-medium">Development</span>
            <span className="mt-1 block text-xs font-normal text-muted-foreground">
              Show routing, Runtime tasks, executions, handoffs, review, and recovery directly.
            </span>
          </span>
        </Button>
      </div>
    </div>
  );
}
