import { scopeProjectRef } from "@t3tools/client-runtime/environment";
import { Link } from "@tanstack/react-router";
import {
  ArrowRightIcon,
  BookOpenIcon,
  CircleAlertIcon,
  FileTextIcon,
  FolderGit2Icon,
  LayersIcon,
  ListChecksIcon,
  PlusIcon,
  SendIcon,
  SlidersHorizontalIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { openCommandPalette } from "../../commandPaletteBus";
import { isElectron } from "../../env";
import { useNewThreadHandler } from "../../hooks/useHandleNewThread";
import type {
  SidebarProjectGroupMember,
  SidebarProjectSnapshot,
} from "../../sidebarProjectGrouping";
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
import {
  defaultForkProjectSelection,
  projectOptionLabel,
  selectedForkProject,
  selectionForProject,
  summarizeHandoffs,
  summarizeInstructions,
  summarizeProfile,
  summarizeSources,
  summarizeTasks,
  type ForkSection,
} from "../forkHome/forkHome.logic";
import { useForkHomeProfile, useForkHomeRuntime } from "../forkHome/useForkHomeData";
import { resolveSettingsScope, type SettingsScopeSearch } from "../settings/settingsScope";
import { useSettingsProjectGroups } from "../settings/useSettingsProjectGroups";

const OPTION_SEPARATOR = "\u0000";

function optionValue(group: SidebarProjectSnapshot, member: SidebarProjectGroupMember): string {
  return [group.projectKey, member.environmentId, member.physicalProjectKey].join(OPTION_SEPARATOR);
}

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
        value: optionValue(group, member),
        label: projectOptionLabel(group, member),
      })),
    );
  const defaultSelection = defaultForkProjectSelection(groups);
  const requested = search.project ? search : defaultSelection;
  const scope = requested === null ? null : resolveSettingsScope(requested, groups, environments);
  const selected = selectedForkProject(scope);
  const selectedValue = selected === null ? "" : optionValue(selected.group, selected.member);

  // oxlint-disable-next-line t3code/react-effect-budget -- Matches ForkHome: put the default concrete project in the URL once.
  useEffect(() => {
    if (search.project === undefined && defaultSelection !== null) onSearchChange(defaultSelection);
  }, [defaultSelection, onSearchChange, search.project]);

  const selectProject = (value: string) => {
    const [project, machine, checkout] = value.split(OPTION_SEPARATOR);
    if (!project || !machine || !checkout) return;
    setStartError(null);
    onSearchChange({ project, machine, checkout });
  };

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
    <SidebarInset className="h-dvh min-h-0 overflow-hidden overscroll-y-none" data-fork-home="workspace">
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
            <NoProjects />
          ) : (
            <>
              <header className="flex flex-wrap items-end justify-between gap-4">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" size="sm">Workspace</Badge>
                    <span className="text-2xs font-medium tracking-widest text-muted-foreground uppercase">
                      Project workspace
                    </span>
                  </div>
                  <h1 className="truncate text-2xl font-semibold tracking-tight">
                    {selected?.group.displayName ?? "Select a project"}
                  </h1>
                  <p className="break-all text-xs text-muted-foreground">
                    {selected
                      ? `${selected.member.workspaceRoot} · ${selected.member.environmentLabel ?? selected.member.environmentId}`
                      : "Choose a project to continue working."}
                  </p>
                </div>

                <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
                  <div className="min-w-56 space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Project</p>
                    <Select
                      value={selectedValue}
                      items={choices.map((choice) => ({ value: choice.value, label: choice.label }))}
                      onValueChange={(value) => {
                        if (value !== null) selectProject(value);
                      }}
                    >
                      <SelectTrigger aria-label="Project" className="w-full sm:w-80">
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                      <SelectPopup>
                        {choices.map((choice) => (
                          <SelectItem key={choice.value} value={choice.value}>{choice.label}</SelectItem>
                        ))}
                      </SelectPopup>
                    </Select>
                  </div>
                  {selected ? (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" disabled={starting} onClick={() => void startThread()}>
                        <SendIcon />
                        {starting ? "Opening…" : "Start a thread"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        render={
                          <Link
                            to="/settings/projects"
                            search={selectionForProject(selected.group, selected.member)}
                          />
                        }
                      >
                        Project settings
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        render={<Link to="/settings/general" hash="t3-fork-interface" />}
                      >
                        Interface
                      </Button>
                    </div>
                  ) : null}
                </div>
              </header>

              {scope?.kind === "unavailable" ? (
                <Alert variant="error">
                  <CircleAlertIcon aria-hidden />
                  <AlertTitle>Project unavailable</AlertTitle>
                  <AlertDescription>{scope.message}</AlertDescription>
                </Alert>
              ) : null}
              {startError ? (
                <Alert variant="error"><AlertDescription>{startError}</AlertDescription></Alert>
              ) : null}

              {selected ? (
                <WorkspaceProject
                  key={`${selected.group.projectKey}:${selected.member.environmentId}:${selected.member.id}`}
                  group={selected.group}
                  member={selected.member}
                />
              ) : null}
            </>
          )}
        </WorkspacePageContainer>
      </div>
    </SidebarInset>
  );
}

function NoProjects() {
  return (
    <div className="rounded-xl border border-dashed border-border/70 bg-card/30">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon"><FolderGit2Icon /></EmptyMedia>
          <EmptyTitle>No project configured</EmptyTitle>
          <EmptyDescription>
            Add a project to give T3 durable instructions, sources, and project context.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button size="sm" onClick={() => openCommandPalette({ open: "add-project" })}>
            <PlusIcon />
            Add project
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}

function WorkspaceProject({
  group,
  member,
}: {
  readonly group: SidebarProjectSnapshot;
  readonly member: SidebarProjectGroupMember;
}) {
  const runtime = useForkHomeRuntime({
    environmentId: member.environmentId,
    projectId: member.id,
    environmentLabel: member.environmentLabel ?? member.environmentId,
  });
  const profile = useForkHomeProfile({
    environmentId: member.environmentId,
    projectId: member.id,
    environmentLabel: member.environmentLabel ?? member.environmentId,
  });
  const reloadRuntime = () => void runtime.reload();

  return (
    <div className="space-y-4">
      {runtime.data.status.status === "ready" && !runtime.data.status.value.enabled ? (
        <Alert variant="warning">
          <CircleAlertIcon aria-hidden />
          <AlertTitle>Project context is disabled</AlertTitle>
          <AlertDescription>
            Enable Project Runtime in Advanced project settings to use durable instructions and sources.
          </AlertDescription>
        </Alert>
      ) : runtime.data.status.status === "unavailable" ? (
        <Alert variant="error">
          <CircleAlertIcon aria-hidden />
          <AlertTitle>Project context unavailable</AlertTitle>
          <AlertDescription>{runtime.data.status.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <WorkspaceCard
          icon={<FileTextIcon />}
          title="Instructions"
          footer={<ProjectSettingsLink group={group} member={member} hash="project-runtime-instructions">Open instructions</ProjectSettingsLink>}
        >
          <SectionState section={runtime.data.instructions} onRetry={reloadRuntime} label="instructions">
            {(value) => {
              const summary = summarizeInstructions(value);
              return summary === null ? (
                <p className="text-muted-foreground">No project instructions saved yet.</p>
              ) : (
                <div className="space-y-2">
                  <p className="line-clamp-4 text-foreground">{summary.preview}</p>
                  <p className="text-xs text-muted-foreground">
                    Revision {summary.revision} · {summary.characters.toLocaleString()} characters
                  </p>
                </div>
              );
            }}
          </SectionState>
        </WorkspaceCard>

        <WorkspaceCard
          icon={<BookOpenIcon />}
          title="Sources"
          footer={<ProjectSettingsLink group={group} member={member} hash="project-runtime-sources">Open sources</ProjectSettingsLink>}
        >
          <SectionState section={runtime.data.sources} onRetry={reloadRuntime} label="sources">
            {(value) => {
              const summary = summarizeSources(value);
              return summary.total === 0 ? (
                <p className="text-muted-foreground">No registered sources yet.</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-foreground">
                    {summary.enabled} enabled of {summary.total} registered{summary.truncated ? "+" : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {summary.available} available · {summary.missing} missing · {summary.unreadable} unreadable
                  </p>
                </div>
              );
            }}
          </SectionState>
        </WorkspaceCard>
      </div>

      <details className="group rounded-xl border border-border/70 bg-card/30">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium marker:hidden">
          <SlidersHorizontalIcon className="size-4 text-muted-foreground" />
          Advanced
          <span className="text-xs font-normal text-muted-foreground">
            Development Profile, Runtime state, tasks, handoffs, routing, and execution
          </span>
        </summary>
        <div className="grid gap-3 border-t border-border/60 p-4 md:grid-cols-3">
          <AdvancedSummary icon={<LayersIcon />} title="Development Profile">
            {profile.data.status === "ready" ? (() => {
              const summary = summarizeProfile(profile.data.value);
              return (
                <>
                  <p>{summary.profileName ?? "No profile assigned"}</p>
                  <p className="text-xs text-muted-foreground">{summary.layerCount} effective layer{summary.layerCount === 1 ? "" : "s"}</p>
                </>
              );
            })() : (
              <p className="text-xs text-muted-foreground">
                {profile.data.status === "loading" ? "Loading…" : profile.data.message}
              </p>
            )}
            <div className="pt-2">
              <ProjectSettingsLink group={group} member={member} hash="development-profile">Open profile settings</ProjectSettingsLink>
            </div>
          </AdvancedSummary>

          <AdvancedSummary icon={<ListChecksIcon />} title="Runtime work">
            {runtime.data.tasks.status === "ready" ? (() => {
              const handoffs = runtime.data.handoffs.status === "ready" ? runtime.data.handoffs.value : null;
              const summary = summarizeTasks(runtime.data.tasks.value, handoffs);
              return (
                <>
                  <p>{summary.active} active · {summary.blocked} blocked · {summary.total} total{summary.truncated ? "+" : ""}</p>
                  {runtime.data.handoffs.status === "ready" ? (() => {
                    const handoff = summarizeHandoffs(runtime.data.handoffs.value, runtime.data.tasks.value.tasks);
                    return <p className="text-xs text-muted-foreground">{handoff.total ?? "100+"} handoff{handoff.total === 1 ? "" : "s"}</p>;
                  })() : null}
                </>
              );
            })() : (
              <p className="text-xs text-muted-foreground">
                {runtime.data.tasks.status === "loading" ? "Loading…" : runtime.data.tasks.message}
              </p>
            )}
            <div className="pt-2">
              <ProjectSettingsLink group={group} member={member} hash="project-runtime-tasks">Open tasks and handoffs</ProjectSettingsLink>
            </div>
          </AdvancedSummary>

          <AdvancedSummary icon={<FolderGit2Icon />} title="Runtime state">
            {runtime.data.status.status === "ready" ? (
              <>
                <p>{runtime.data.status.value.enabled ? "Enabled" : "Disabled"}</p>
                <p className="text-xs text-muted-foreground">
                  Revision {runtime.data.status.value.revision} · Version {runtime.data.status.value.version}
                </p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                {runtime.data.status.status === "loading" ? "Loading…" : runtime.data.status.message}
              </p>
            )}
            <div className="flex flex-wrap gap-3 pt-2">
              <ProjectSettingsLink group={group} member={member} hash="project-runtime-state">Open Runtime state</ProjectSettingsLink>
              <ProjectSettingsLink group={group} member={member} hash="project-worker-preferences">Worker preferences</ProjectSettingsLink>
            </div>
          </AdvancedSummary>
        </div>
      </details>
    </div>
  );
}

function WorkspaceCard({
  icon,
  title,
  children,
  footer,
}: {
  readonly icon: ReactNode;
  readonly title: string;
  readonly children: ReactNode;
  readonly footer: ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-xl border border-border/70 bg-card/40 p-4 shadow-xs/5">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground [&_svg]:size-4">{icon}</span>
        <h2 className="text-sm font-medium">{title}</h2>
      </div>
      <div className="min-w-0 flex-1 space-y-2 text-sm">{children}</div>
      <div className="pt-1">{footer}</div>
    </section>
  );
}

function AdvancedSummary({
  icon,
  title,
  children,
}: {
  readonly icon: ReactNode;
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border/60 bg-background/50 p-3 text-sm">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-muted-foreground [&_svg]:size-4">{icon}</span>
        <h3 className="font-medium">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function SectionState<T>({
  section,
  onRetry,
  label,
  children,
}: {
  readonly section: ForkSection<T>;
  readonly onRetry: () => void;
  readonly label: string;
  readonly children: (value: T) => ReactNode;
}) {
  if (section.status === "loading") return <p className="text-muted-foreground">Loading {label}…</p>;
  if (section.status === "unavailable") {
    return (
      <div className="space-y-2">
        <p role="alert" className="text-error-foreground">{section.message}</p>
        <Button size="xs" variant="outline" onClick={onRetry}>Retry</Button>
      </div>
    );
  }
  return <>{children(section.value)}</>;
}

function ProjectSettingsLink({
  group,
  member,
  hash,
  children,
}: {
  readonly group: SidebarProjectSnapshot;
  readonly member: SidebarProjectGroupMember;
  readonly hash: string;
  readonly children: ReactNode;
}) {
  return (
    <Link
      to="/settings/projects"
      search={selectionForProject(group, member)}
      hash={hash}
      resetScroll={false}
      className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground [&_svg]:size-3"
    >
      {children}
      <ArrowRightIcon aria-hidden />
    </Link>
  );
}
