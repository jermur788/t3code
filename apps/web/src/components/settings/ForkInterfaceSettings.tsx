import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "../ui/select";
import { useForkWorkspaceMode } from "../../forkWorkspaceMode";
import { SettingsPageContainer, SettingsRow, SettingsSection } from "./settingsLayout";

export function ForkInterfaceSettings() {
  const { mode, setMode } = useForkWorkspaceMode();

  return (
    <SettingsPageContainer>
      <SettingsSection id="fork-interface-mode" title="T3 Fork interface">
        <SettingsRow
          title="Interface mode"
          description="Workspace keeps project context and conversations prominent. Development shows routing, Runtime tasks, executions, handoffs, and verification controls directly. Changing this setting never changes project Runtime state."
          control={
            <Select
              value={mode}
              onValueChange={(value) => {
                if (value === "workspace" || value === "development") setMode(value);
              }}
            >
              <SelectTrigger size="sm" className="w-full sm:w-44" aria-label="T3 Fork interface mode">
                <SelectValue>{mode === "workspace" ? "Workspace" : "Development"}</SelectValue>
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
