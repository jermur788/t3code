import { scopeProjectRef } from "@t3tools/client-runtime/environment";
import { Link } from "@tanstack/react-router";
import { CircleAlertIcon, FolderGit2Icon, PlusIcon, SendIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { openCommandPalette } from "../../commandPaletteBus";
import { isElectron } from "../../env";
import { useNewThreadHandler } from "../../hooks/useHandleNewThread";
import { useEnvironments } from "../../state/environments";
import { useAllEnvironmentProjectSnapshotsReady } from "../../state/entities";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "../ui/empty";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "../ui/select";
import { SidebarInset } from "../ui/sidebar";
import { WorkspacePageContainer } from "../WorkspacePageContainer";
import { WorkspacePageHeader } from "../WorkspacePageHeader";
import { resolveSettingsScope, type SettingsScopeSearch } from "../settings/settingsScope";
import { useSettingsProjectGroups } from "../settings/useSettingsProjectGroups";
import {
  defaultForkProjectSelection,
  projectOptionLabel,
  selectedForkProject,
  selectionForProject,
  summarizeInstructions,
  summarizeSources,
} from "./forkHome.logic";
import { useForkHomeRuntime } from "./useForkHomeData";

const OPTION_SEPARATOR = "\u0000";

export function WorkspaceForkHome({
  search,
  onSearchChange,
}: {
  readonly search: SettingsScopeSearch;
  readonly onSearchChange: (next: SettingsScopeSearch) => void;
}) {
  const groups = useSettingsProjectGroups();
  const projectSnapshotsReady = useAllEnvironmentProjectSnapshotsReady();
  const { environments } = useEnvironments();
  const handleNewThread = useNewThreadHandler();
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const choices = groups
    .filter((group) => !group.isScratch)
    .flatMap((group) =>
      group.memberProjects.map((member) => ({
        group,
        member,
        value: [group.projectKey, member.environmentId, member.physicalProjectKey].join(
          OPTION_SEPARATOR,
        ),
        label: projectOptionLabel(group, member),
      })),
    );
  const defaultSelection = defaultForkProjectSelection(groups);
  const requested = search.project ? search : defaultSelection;
  const scope = requested === null ? null : resolveSettingsScope(requested, groups, environments);
  const selected = selectedForkProject(scope);
  const selectedValue =
    selected === null
      ? ""
      : [selected.group.projectKey, selected.member.environmentId, selected.member.physicalProjectKey].join(
          OPTION_SEPARATOR,
        );

  useEffect(() => {
    if (search.project === undefined && defaultSelection !== null) onSearchChange(defaultSelection);
  }, [defaultSelection, onSearchChange, search.project]);

  const startThread = async () => {
    if (selected === null) return;
    setStarting(true);
    setStartError(null);
    try {
      const opened = await handleNewThread(
        scopeProjectRef(selected.member.environmentId, selected.member.id),
      );
      if (opened === null) setStartError("The project is still available. Try starting the thread again.");
    } catch {
      setStartError("Could not start a thread for this project. Try again.");
    }
    setStarting(false);
  };

  return (
    <SidebarInset className="h-dvh min-h-0 overflow-hidden overscroll-y-none" data-fork-workspace-home="">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-background">
        <WorkspacePageHeader electron={isElectron}>
          <div className="flex min-w-0 items-center gap-2">
            <Badge variant="warning" size="sm">Fork</Badge>
            <span className="truncate text-sm font-medium">Workspace</span>
          </div>
        </WorkspacePageHeader>

        <WorkspacePageContainer width="expanded" className="max-w-5xl">
          {!projectSnapshotsReady ? (
            <p role="status" className="text-sm text-muted-foreground">Loading projects…</p>
          ) : choices.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 bg-card/30">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon"><FolderGit2Icon /></EmptyMedia>
                  <EmptyTitle>No project configured</EmptyTitle>
                  <EmptyDescription>Add a project to keep instructions and sources available across conversations and providers.</EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button size="sm" onClick={() => openCommandPalette({ open: "add-project" })}>
                    <PlusIcon /> Add project
                  </Button>
                </EmptyContent>
              </Empty>
            </div>
          ) : (
            <>
              <header className="flex flex-wrap items-end justify-between gap-4">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" size="sm">Workspace</Badge>
                    <span className="text-2xs font-medium tracking-widest text-muted-foreground uppercase">Project workspace</span>
                  </div>
                  <h1 className="truncate text-2xl font-semibold tracking-tight">{selected?.group.displayName ?? "Select a project"}</h1>
                  <p className="break-all text-xs text-muted-foreground">
                    {selected ? `${selected.member.workspaceRoot} · ${selected.member.environmentLabel ?? selected.member.environmentId}` : "Choose a project."}
                  </p>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
                  <Select
                    value={selectedValue}
                    items={choices.map((choice) => ({ value: choice.value, label: choice.label }))}
                    onValueChange={(value) => {
                      if (value === null) return;
                      const [project, machine, checkout] = value.split(OPTION_SEPARATOR);
                      if (project && machine && checkout) onSearchChange({ project, machine, checkout });
                    }}
                  >
                    <SelectTrigger aria-label="Project" className="w-full sm:w-80"><SelectValue placeholder="Select a project" /></SelectTrigger>
                    <SelectPopup>
                      {choices.map((choice) => <SelectItem key={choice.value} value={choice.value}>{choice.label}</SelectItem>)}
                    </SelectPopup>
                  </Select>
                  {selected ? (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" disabled={starting} onClick={() => void startThread()}><SendIcon />{starting ? "Opening…" : "Start a thread"}</Button>
                      <Button size="sm" variant="outline" render={<Link to="/settings/projects" search={selectionForProject(selected.group, selected.member)} />}>Project settings</Button>
                    </div>
                  ) : null}
                </div>
              </header>

              {scope?.kind === "unavailable" ? (
                <Alert variant="error"><CircleAlertIcon aria-hidden /><AlertTitle>Project unavailable</AlertTitle><AlertDescription>{scope.message}</AlertDescription></Alert>
              ) : null}
              {startError ? <Alert variant="error"><AlertDescription>{startError}</AlertDescription></Alert> : null}
              {selected ? <WorkspaceProjectSummary environmentId={selected.member.environmentId} projectId={selected.member.id} environmentLabel={selected.member.environmentLabel ?? selected.member.environmentId} settingsSearch={selectionForProject(selected.group, selected.member)} /> : null}
            </>
          )}
        </WorkspacePageContainer>
      </div>
    </SidebarInset>
  );
}

function WorkspaceProjectSummary({
  environmentId,
  projectId,
  environmentLabel,
  settingsSearch,
}: {
  readonly environmentId: string;
  readonly projectId: string;
  readonly environmentLabel: string;
  readonly settingsSearch: SettingsScopeSearch;
}) {
  const runtime = useForkHomeRuntime({ environmentId, projectId, environmentLabel });
  const instructions =
    runtime.data.instructions.status === "ready" ? summarizeInstructions(runtime.data.instructions.value) : null;
  const sources = runtime.data.sources.status === "ready" ? summarizeSources(runtime.data.sources.value) : null;

  return (
    <div className="space-y-4">
      {runtime.data.status.status === "ready" && !runtime.data.status.value.enabled ? (
        <Alert variant="warning"><AlertTitle>Project Runtime is disabled</AlertTitle><AlertDescription>Enable Runtime in Project settings to use persistent instructions and sources.</AlertDescription></Alert>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card/40 p-4">
          <h2 className="text-sm font-medium">Instructions</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {instructions === null
              ? runtime.data.instructions.status === "unavailable"
                ? runtime.data.instructions.message
                : "Loading project instructions…"
              : instructions.present
                ? instructions.preview
                : "No project instructions yet."}
          </p>
          <Button className="mt-3" size="xs" variant="outline" render={<Link to="/settings/projects" search={settingsSearch} hash="project-runtime-instructions" />}>Edit instructions</Button>
        </section>
        <section className="rounded-xl border border-border bg-card/40 p-4">
          <h2 className="text-sm font-medium">Sources</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {sources === null
              ? runtime.data.sources.status === "unavailable"
                ? runtime.data.sources.message
                : "Loading registered sources…"
              : sources.total === 0
                ? "No sources registered yet."
                : `${sources.total} registered source${sources.total === 1 ? "" : "s"}.`}
          </p>
          <Button className="mt-3" size="xs" variant="outline" render={<Link to="/settings/projects" search={settingsSearch} hash="project-runtime-sources" />}>Manage sources</Button>
        </section>
      </div>
      <details className="rounded-xl border border-border bg-card/30 p-4">
        <summary className="cursor-pointer text-sm font-medium">Advanced</summary>
        <p className="mt-2 text-sm text-muted-foreground">Development Profiles, worker routing, Runtime tasks, handoffs, executions, verification, and recovery remain available without changing Workspace mode.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="xs" variant="outline" render={<Link to="/settings/projects" search={settingsSearch} hash="development-profile" />}>Development Profile</Button>
          <Button size="xs" variant="outline" render={<Link to="/settings/projects" search={settingsSearch} hash="project-worker-preferences" />}>Worker preferences</Button>
          <Button size="xs" variant="outline" render={<Link to="/settings/projects" search={settingsSearch} hash="project-runtime-tasks" />}>Tasks & handoffs</Button>
          <Button size="xs" variant="ghost" render={<Link to="/settings/development-profiles" />}>Manage profiles</Button>
        </div>
      </details>
    </div>
  );
}
