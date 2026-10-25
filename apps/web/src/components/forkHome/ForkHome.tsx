import type {
  EffectiveProjectInstructions,
  ProjectRuntimeHandoffListResult,
  ProjectRuntimeInstructions,
  ProjectRuntimeSourceListResult,
  ProjectRuntimeStatus,
  ProjectRuntimeTaskListResult,
} from "@t3tools/contracts";
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
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { RefreshIcon } from "../ui/refresh-icon";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "../ui/alert";
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
import { useSettingsProjectGroups } from "../settings/useSettingsProjectGroups";
import { resolveSettingsScope, type SettingsScopeSearch } from "../settings/settingsScope";
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
  type ForkHandoffSummary,
  type ForkInstructionSummary,
  type ForkProfileSummary,
  type ForkSection,
  type ForkSourceSummary,
  type ForkTaskSummary,
} from "./forkHome.logic";
import { useForkHomeProfile, useForkHomeRuntime } from "./useForkHomeData";

const OPTION_SEPARATOR = "\u0000";

function optionValue(group: SidebarProjectSnapshot, member: SidebarProjectGroupMember): string {
  return [group.projectKey, member.environmentId, member.physicalProjectKey].join(OPTION_SEPARATOR);
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}

function runtimeDisabled(status: ForkSection<ProjectRuntimeStatus>): boolean {
  return status.status === "ready" && !status.value.enabled;
}

export function ForkHome({
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

  // Persist the default choice so a reload returns to the same project.
  useEffect(() => {
    if (search.project === undefined && defaultSelection !== null) {
      onSearchChange(defaultSelection);
    }
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
      if (opened === null) {
        setStartError("The project is still available. Try starting the thread again.");
      }
    } catch {
      setStartError("Could not start a thread for this project. Try again.");
    }
    setStarting(false);
  };

  return (
    <SidebarInset className="h-dvh min-h-0 overflow-hidden overscroll-y-none" data-fork-home="">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-background">
        <WorkspacePageHeader electron={isElectron}>
          <div className="flex min-w-0 items-center gap-2">
            <Badge variant="warning" size="sm">
              Fork
            </Badge>
            <span className="truncate text-sm font-medium">Project Runtime home</span>
          </div>
        </WorkspacePageHeader>

        <WorkspacePageContainer width="expanded" className="max-w-5xl">
          {!projectSnapshotsReady ? (
            <p role="status" className="text-sm text-muted-foreground">
              Loading projects…
            </p>
          ) : choices.length === 0 ? (
            <NoProjectsHome />
          ) : (
            <>
              <header className="flex flex-wrap items-end justify-between gap-4">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="warning" size="sm">
                      Fork
                    </Badge>
                    <span className="text-2xs font-medium tracking-widest text-muted-foreground uppercase">
                      Project Runtime home
                    </span>
                  </div>
                  <h1 className="truncate text-2xl font-semibold tracking-tight">
                    {selected?.group.displayName ?? "Select a project"}
                  </h1>
                  <p className="break-all text-xs text-muted-foreground">
                    {selected
                      ? `${selected.member.workspaceRoot} · ${selected.member.environmentLabel ?? selected.member.environmentId}`
                      : "Choose a durable project to inspect its Runtime."}
                  </p>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
                  <div className="min-w-56 space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Project</p>
                    <Select
                      value={selectedValue}
                      items={choices.map((choice) => ({
                        value: choice.value,
                        label: choice.label,
                      }))}
                      onValueChange={(value) => {
                        if (value !== null) selectProject(value);
                      }}
                    >
                      <SelectTrigger aria-label="Project" className="w-full sm:w-80">
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                      <SelectPopup>
                        {choices.map((choice) => (
                          <SelectItem key={choice.value} value={choice.value}>
                            {choice.label}
                          </SelectItem>
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
                        render={<Link to="/" search={{ classic: 1 }} />}
                      >
                        Classic T3 Home
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
                <Alert variant="error">
                  <AlertDescription>{startError}</AlertDescription>
                </Alert>
              ) : null}

              {selected ? (
                <ProjectRuntimeHome
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

function NoProjectsHome() {
  return (
    <div className="rounded-xl border border-dashed border-border/70 bg-card/30">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FolderGit2Icon />
          </EmptyMedia>
          <EmptyTitle>No project configured</EmptyTitle>
          <EmptyDescription>
            The fork home reads durable Project Runtime state from a project. Add a project to
            establish project identity, a Development Profile, instructions, sources, tasks, and
            handoffs.
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

function ProjectRuntimeHome({
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
  const disabled = runtimeDisabled(runtime.data.status);
  const reloadRuntime = () => void runtime.reload();
  const reloadProfile = () => void profile.reload();

  return (
    <div className="space-y-4">
      <RuntimeStatus
        status={runtime.data.status}
        onRetry={reloadRuntime}
        group={group}
        member={member}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <ProfileCard section={profile.data} onRetry={reloadProfile} group={group} member={member} />
        <InstructionsCard
          section={runtime.data.instructions}
          disabled={disabled}
          onRetry={reloadRuntime}
          group={group}
          member={member}
        />
        <SourcesCard
          section={runtime.data.sources}
          disabled={disabled}
          onRetry={reloadRuntime}
          group={group}
          member={member}
        />
        <ProjectStateCard
          section={runtime.data.tasks}
          disabled={disabled}
          onRetry={reloadRuntime}
          group={group}
          member={member}
        />
        <TasksAndHandoffsCard
          tasks={runtime.data.tasks}
          handoffs={runtime.data.handoffs}
          disabled={disabled}
          onRetry={reloadRuntime}
          group={group}
          member={member}
        />
      </div>
    </div>
  );
}

function RuntimeStatus({
  status,
  onRetry,
  group,
  member,
}: {
  readonly status: ForkSection<ProjectRuntimeStatus>;
  readonly onRetry: () => void;
  readonly group: SidebarProjectSnapshot;
  readonly member: SidebarProjectGroupMember;
}) {
  if (status.status === "loading") {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Loading Project Runtime…
      </p>
    );
  }
  if (status.status === "unavailable") {
    return (
      <Alert variant="error">
        <CircleAlertIcon aria-hidden />
        <AlertTitle>Project Runtime unavailable</AlertTitle>
        <AlertDescription>{status.message}</AlertDescription>
        <AlertAction>
          <RetryButton onRetry={onRetry} />
        </AlertAction>
      </Alert>
    );
  }
  if (!status.value.enabled) {
    return (
      <Alert variant="warning">
        <CircleAlertIcon aria-hidden />
        <AlertTitle>Project Runtime is disabled</AlertTitle>
        <AlertDescription>
          Project identity and the Development Profile remain available. Enable Runtime in Project
          Runtime settings to restore instructions, sources, tasks, and handoffs.
        </AlertDescription>
        <AlertAction className="flex-wrap">
          <RetryButton onRetry={onRetry} variant="outline" />
          <RuntimeSettingsLink group={group} member={member} hash="project-runtime">
            Enable Runtime
          </RuntimeSettingsLink>
        </AlertAction>
      </Alert>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <Badge variant="success" size="sm">
        Runtime enabled
      </Badge>
      <span>Revision {status.value.revision}</span>
      <span>Version {status.value.version}</span>
      <span>State is stored with the project, independent of provider and thread.</span>
    </div>
  );
}

function ProfileCard({
  section,
  onRetry,
  group,
  member,
}: {
  readonly section: ForkSection<EffectiveProjectInstructions>;
  readonly onRetry: () => void;
  readonly group: SidebarProjectSnapshot;
  readonly member: SidebarProjectGroupMember;
}) {
  return (
    <HomeCard
      icon={<LayersIcon />}
      title="Development Profile"
      footer={
        <div className="flex flex-wrap gap-3">
          <RuntimeSettingsLink group={group} member={member} hash="development-profile">
            Inspect effective layers
          </RuntimeSettingsLink>
          <ProfilesSettingsLink>Manage profiles</ProfilesSettingsLink>
        </div>
      }
    >
      <SectionState section={section} onRetry={onRetry} label="Development Profile">
        {(effective) => <ProfileSummaryView summary={summarizeProfile(effective)} />}
      </SectionState>
    </HomeCard>
  );
}

function ProfileSummaryView({ summary }: { readonly summary: ForkProfileSummary }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-base font-medium">
          {summary.profileName ?? "No profile assigned"}
        </span>
        {summary.assigned ? (
          <Badge variant="success" size="sm">
            Active
          </Badge>
        ) : (
          <Badge variant="secondary" size="sm">
            None
          </Badge>
        )}
      </div>
      <p className="text-muted-foreground">
        {summary.layerCount === 0
          ? "No effective instruction layers exist yet."
          : `${summary.layerCount} effective instruction layer${summary.layerCount === 1 ? "" : "s"}.`}
      </p>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <li>{summary.profileLayer ? "Profile instructions" : "No profile layer"}</li>
        <li>{summary.projectLayer ? "Project instructions" : "No project layer"}</li>
      </ul>
    </div>
  );
}

function InstructionsCard({
  section,
  disabled,
  onRetry,
  group,
  member,
}: {
  readonly section: ForkSection<ProjectRuntimeInstructions | null>;
  readonly disabled: boolean;
  readonly onRetry: () => void;
  readonly group: SidebarProjectSnapshot;
  readonly member: SidebarProjectGroupMember;
}) {
  return (
    <HomeCard
      icon={<FileTextIcon />}
      title="Instructions"
      footer={
        <RuntimeSettingsLink
          group={group}
          member={member}
          hash="project-runtime-instructions"
          disabled={disabled}
        >
          Open instructions
        </RuntimeSettingsLink>
      }
    >
      {disabled ? (
        <DisabledSection />
      ) : (
        <SectionState section={section} onRetry={onRetry} label="Instructions">
          {(instructions) => (
            <InstructionsSummaryView summary={summarizeInstructions(instructions)} />
          )}
        </SectionState>
      )}
    </HomeCard>
  );
}

function InstructionsSummaryView({ summary }: { readonly summary: ForkInstructionSummary | null }) {
  if (summary === null) {
    return (
      <p className="text-muted-foreground">
        No project instructions saved. This area is project-owned and separate from provider system
        prompts.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      <p className="line-clamp-3 text-foreground">{summary.preview}</p>
      <p className="text-xs text-muted-foreground">
        Revision {summary.revision} · {summary.characters.toLocaleString()} characters · Updated{" "}
        {formatTimestamp(summary.updatedAt)} by {summary.updatedBy}
      </p>
    </div>
  );
}

function SourcesCard({
  section,
  disabled,
  onRetry,
  group,
  member,
}: {
  readonly section: ForkSection<ProjectRuntimeSourceListResult>;
  readonly disabled: boolean;
  readonly onRetry: () => void;
  readonly group: SidebarProjectSnapshot;
  readonly member: SidebarProjectGroupMember;
}) {
  return (
    <HomeCard
      icon={<BookOpenIcon />}
      title="Sources"
      footer={
        <RuntimeSettingsLink
          group={group}
          member={member}
          hash="project-runtime-sources"
          disabled={disabled}
        >
          Open sources
        </RuntimeSettingsLink>
      }
    >
      {disabled ? (
        <DisabledSection />
      ) : (
        <SectionState section={section} onRetry={onRetry} label="Sources">
          {(result) => <SourcesSummaryView summary={summarizeSources(result)} />}
        </SectionState>
      )}
    </HomeCard>
  );
}

function SourcesSummaryView({ summary }: { readonly summary: ForkSourceSummary }) {
  if (summary.total === 0) {
    return (
      <p className="text-muted-foreground">
        No registered sources. Sources are workspace files the project deliberately makes available
        to agents.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      <p className="text-foreground">
        {summary.enabled} enabled of {summary.total} registered
        {summary.truncated ? " (at least)" : ""}
      </p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <div className="flex justify-between gap-2">
          <dt>Available</dt>
          <dd>{summary.available}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Missing</dt>
          <dd>{summary.missing}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Unreadable</dt>
          <dd>{summary.unreadable}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Unsupported</dt>
          <dd>{summary.unsupported}</dd>
        </div>
      </dl>
      {summary.truncated ? (
        <p className="text-xs text-muted-foreground">
          More than 100 sources are registered. The settings list has the full registry.
        </p>
      ) : null}
    </div>
  );
}

function ProjectStateCard({
  section,
  disabled,
  onRetry,
  group,
  member,
}: {
  readonly section: ForkSection<ProjectRuntimeTaskListResult>;
  readonly disabled: boolean;
  readonly onRetry: () => void;
  readonly group: SidebarProjectSnapshot;
  readonly member: SidebarProjectGroupMember;
}) {
  return (
    <HomeCard
      icon={<FolderGit2Icon />}
      title="Project State"
      footer={
        <RuntimeSettingsLink
          group={group}
          member={member}
          hash="project-runtime-state"
          disabled={disabled}
        >
          Open Runtime state
        </RuntimeSettingsLink>
      }
    >
      {disabled ? (
        <DisabledSection />
      ) : (
        <SectionState section={section} onRetry={onRetry} label="Project State">
          {(result) => <ProjectStateSummaryView summary={summarizeTasks(result)} />}
        </SectionState>
      )}
    </HomeCard>
  );
}

function ProjectStateSummaryView({ summary }: { readonly summary: ForkTaskSummary }) {
  if (summary.total === 0) {
    return (
      <p className="text-muted-foreground">
        No Runtime tasks yet. Project State is derived from durable Runtime tasks, not from chat.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Active" value={summary.active} />
        <Stat label="Blocked" value={summary.blocked} />
        <Stat label="Review" value={summary.review} />
        <Stat label="Total" value={summary.total} />
      </dl>
      {summary.focus ? (
        <p className="text-foreground">
          <span className="text-muted-foreground">Current focus: </span>
          {summary.focus.title}
        </p>
      ) : null}
      {summary.blockers.length > 0 ? (
        <div>
          <p className="text-xs font-medium text-muted-foreground">Blockers</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
            {summary.blockers.map((title) => (
              <li key={title}>{title}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {summary.focus?.nextAction ? (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">Next action:</span> {summary.focus.nextAction}
        </p>
      ) : null}
      {summary.truncated ? (
        <p className="text-xs text-muted-foreground">
          Counts cover the first 100 tasks. Open Runtime settings for the full task list.
        </p>
      ) : null}
    </div>
  );
}

function TasksAndHandoffsCard({
  tasks,
  handoffs,
  disabled,
  onRetry,
  group,
  member,
}: {
  readonly tasks: ForkSection<ProjectRuntimeTaskListResult>;
  readonly handoffs: ForkSection<ProjectRuntimeHandoffListResult>;
  readonly disabled: boolean;
  readonly onRetry: () => void;
  readonly group: SidebarProjectSnapshot;
  readonly member: SidebarProjectGroupMember;
}) {
  const taskList = tasks.status === "ready" ? tasks.value.tasks : [];
  const taskSummary = tasks.status === "ready" ? summarizeTasks(tasks.value) : null;
  return (
    <HomeCard
      icon={<ListChecksIcon />}
      title="Tasks & Handoffs"
      footer={
        <RuntimeSettingsLink
          group={group}
          member={member}
          hash="project-runtime-tasks"
          disabled={disabled}
        >
          Open tasks and handoffs
        </RuntimeSettingsLink>
      }
    >
      {disabled ? (
        <DisabledSection />
      ) : (
        <div className="space-y-3">
          {taskSummary ? (
            <p className="text-foreground">
              {taskSummary.active} active · {taskSummary.blocked} blocked · {taskSummary.total}{" "}
              total
              {taskSummary.truncated ? "+" : ""}
            </p>
          ) : (
            <SectionState section={tasks} onRetry={onRetry} label="Tasks">
              {() => null}
            </SectionState>
          )}
          <SectionState section={handoffs} onRetry={onRetry} label="Handoffs">
            {(result) => <HandoffSummaryView summary={summarizeHandoffs(result, taskList)} />}
          </SectionState>
        </div>
      )}
    </HomeCard>
  );
}

function HandoffSummaryView({ summary }: { readonly summary: ForkHandoffSummary }) {
  if (summary.truncated) {
    return (
      <p className="text-xs text-muted-foreground">
        Handoff history is longer than the homepage window. Open Runtime settings to inspect it.
      </p>
    );
  }
  if (summary.latest === null) {
    return <p className="text-xs text-muted-foreground">No handoffs recorded yet.</p>;
  }
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">
        Latest handoff
        {summary.latest.taskTitle ? ` · ${summary.latest.taskTitle}` : ""}
      </p>
      <p className="line-clamp-2 text-sm text-foreground">{summary.latest.summary}</p>
      <p className="text-xs text-muted-foreground">
        {summary.latest.checkpoint} · {formatTimestamp(summary.latest.createdAt)}
      </p>
    </div>
  );
}

function HomeCard({
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
  if (section.status === "loading") {
    return (
      <p role="status" className="text-muted-foreground">
        Loading {label}…
      </p>
    );
  }
  if (section.status === "unavailable") {
    return (
      <div className="space-y-2">
        <p role="alert" className="text-error-foreground">
          {section.message}
        </p>
        <RetryButton onRetry={onRetry} variant="outline" />
      </div>
    );
  }
  return <>{children(section.value)}</>;
}

function DisabledSection() {
  return (
    <p className="text-muted-foreground">
      Project Runtime is disabled. Enable it in Project Runtime settings to inspect this area.
    </p>
  );
}

function Stat({ label, value }: { readonly label: string; readonly value: number }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/50 px-2.5 py-2">
      <dt className="text-2xs text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function RetryButton({
  onRetry,
  variant = "ghost",
}: {
  readonly onRetry: () => void;
  readonly variant?: "ghost" | "outline";
}) {
  return (
    <Button size="xs" variant={variant} onClick={onRetry}>
      <RefreshIcon />
      Retry
    </Button>
  );
}

function RuntimeSettingsLink({
  group,
  member,
  hash,
  disabled = false,
  children,
}: {
  readonly group: SidebarProjectSnapshot;
  readonly member: SidebarProjectGroupMember;
  readonly hash: string;
  readonly disabled?: boolean;
  readonly children: ReactNode;
}) {
  if (disabled) {
    return (
      <span aria-disabled="true" className="text-xs text-muted-foreground">
        {children}
      </span>
    );
  }
  return (
    <Link
      to="/settings/projects"
      search={selectionForProject(group, member)}
      hash={hash}
      resetScroll={false}
      className={linkClassName}
    >
      {children}
      <ArrowRightIcon aria-hidden />
    </Link>
  );
}

function ProfilesSettingsLink({ children }: { readonly children: ReactNode }) {
  return (
    <Link to="/settings/development-profiles" className={linkClassName}>
      {children}
      <ArrowRightIcon aria-hidden />
    </Link>
  );
}

const linkClassName =
  "inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground [&_svg]:size-3";
