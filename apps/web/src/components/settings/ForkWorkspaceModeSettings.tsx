import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "../ui/select";
import { useForkWorkspaceMode } from "../../forkWorkspaceMode";
import { SettingsPageContainer, SettingsRow, SettingsSection } from "./settingsLayout";

export function ForkWorkspaceModeSettings() {
  const { effectiveMode, hasChosenMode, setMode } = useForkWorkspaceMode();

  return (
    <SettingsPageContainer>
      <SettingsSection id="t3-fork-interface" title="T3 Fork">
        <SettingsRow
          id="t3-fork-interface-mode"
          title="T3 Fork interface"
          description={
            effectiveMode === "workspace"
              ? "Workspace focuses on project context and conversations. Development controls remain available under Advanced."
              : "Development shows worker routing, Runtime tasks, executions, handoffs, review, and recovery controls directly."
          }
          status={
            hasChosenMode ? null : (
              <span className="text-xs text-muted-foreground">
                Not chosen yet. Development is shown for upgrade compatibility.
              </span>
            )
          }
          control={
            <Select
              value={effectiveMode}
              onValueChange={(value) => {
                if (value === "workspace" || value === "development") setMode(value);
              }}
            >
              <SelectTrigger
                size="sm"
                className="w-full sm:w-40"
                aria-label="T3 Fork interface"
              >
                <SelectValue>{effectiveMode === "workspace" ? "Workspace" : "Development"}</SelectValue>
              </SelectTrigger>
              <SelectPopup align="end" alignItemWithTrigger={false}>
                <SelectItem value="workspace">Workspace</SelectItem>
                <SelectItem value="development">Development</SelectItem>
              </SelectPopup>
            </Select>
          }
        />
      </SettingsSection>
    </SettingsPageContainer>
  );
}
