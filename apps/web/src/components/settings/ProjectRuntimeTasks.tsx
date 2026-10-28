import * as Equal from "effect/Equal";
import { Link } from "@tanstack/react-router";
import { randomUUID } from "../../lib/utils";
import { useEffect, useRef, useState } from "react";
import { useStableCallback } from "../../hooks/useStableCallback";
import {
  PROJECT_RUNTIME_BOUNDS as B,
  type EnvironmentId,
  type ProjectId,
  type ProjectRuntimeBlockerClassification,
  type ProjectRuntimeEvidenceResult,
  type ProjectRuntimeTask,
  type ProjectRuntimeTaskBase,
  type ProjectRuntimeTaskStatus,
  type ProjectRuntimeVerificationMilestone,
  type RuntimeRoleRoute,
  type RuntimeRouteResolution,
  type RuntimeRoutingFallback,
  type RuntimeWorkerRole,
} from "@t3tools/contracts";
import { Alert, AlertDescription } from "../ui/alert";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "../ui/select";
import {
  RuntimeText,
  RuntimeSelect,
  RuntimeError,
  RuntimePager,
  RuntimeLoadError,
  useRuntimeLoad,
} from "./ProjectRuntimeFields";
import type { ProjectRuntimeApi, RuntimeResult } from "./useProjectRuntimeApi";
import { ProjectRuntimeHandoffs } from "./ProjectRuntimeHandoffs";
import { useSettingsSearchTarget } from "./settingsLayout";
import { useWorkerRoutingCatalog } from "./useWorkerRoutingCatalog";
import { WorkerRoleRouteEditor } from "./WorkerRoutingEditor";
import type { ProviderInstanceEntry } from "../../providerInstances";
import { ROUTING_EVALUATION_CAVEAT, WorkerRouteResolutionView } from "./WorkerRouteResolution";
import { WORKER_ROLE_ORDER, routeSourceLabel, workerRoleLabel } from "./workerRouting.logic";
import {
  BLOCKER_CLASSIFICATION_VALUES,
  EVIDENCE_RESULT_VALUES,
  TASK_STATUS_VALUES,
  VERIFICATION_MILESTONE_VALUES,
  mapAcceptanceCriteria,
  mapVerificationEvidence,
  taskBlockerInput,
  taskDraftIssue,
  verificationIssue,
  type TaskEvidenceDraft,
} from "./projectRuntimeTaskEditor.logic";

function legacyBlockedWithoutBlocker(task: ProjectRuntimeTask): boolean {
  return task.status === "blocked" && task.blocker === null;
}

function evidenceDrafts(task: ProjectRuntimeTask | null): TaskEvidenceDraft[] {
  return (
    task?.verification.evidence.map((entry) => ({
      key: `saved-${entry.evidenceId}`,
      evidenceId: entry.evidenceId,
      result: entry.result,
      summary: entry.summary,
      command: entry.command ?? "",
      recordedAt: entry.recordedAt,
      ...(entry.criterionIds === undefined ? {} : { criterionIds: entry.criterionIds }),
    })) ?? []
  );
}

function nullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function recordedBase(fields: {
  readonly repository: string;
  readonly branch: string;
  readonly revision: string;
  readonly worktree: string;
  readonly upstreamRevision: string;
  readonly notes: string;
}): ProjectRuntimeTaskBase | null {
  const base: {
    repository?: string;
    branch?: string;
    revision?: string;
    worktreePath?: string;
    upstreamRevision?: string;
    notes?: string;
  } = {};
  if (fields.repository.trim()) base.repository = fields.repository.trim();
  if (fields.branch.trim()) base.branch = fields.branch.trim();
  if (fields.revision.trim()) base.revision = fields.revision.trim();
  if (fields.worktree.trim()) base.worktreePath = fields.worktree.trim();
  if (fields.upstreamRevision.trim()) base.upstreamRevision = fields.upstreamRevision.trim();
  if (fields.notes.trim()) base.notes = fields.notes.trim();
  return Object.keys(base).length > 0 ? base : null;
}

const TASK_FALLBACK_OPTIONS: ReadonlyArray<RuntimeRoutingFallback> = [
  "continue",
  "inherit",
  "fail",
];
const NO_TASK_ROLE = "__project_or_profile__";

export function ProjectRuntimeTasks({
  api,
  environmentId,
  projectId,
}: {
  api: ProjectRuntimeApi;
  environmentId: EnvironmentId;
  projectId: ProjectId;
}) {
  const [cursor, setCursor] = useState(0);
  const targetRef = useSettingsSearchTarget<HTMLElement>("project-runtime-tasks");
  return (
    <section
      id="project-runtime-tasks"
      ref={targetRef}
      tabIndex={-1}
      className="space-y-3"
      aria-label="Runtime tasks"
    >
      <h3 className="text-sm font-medium">Runtime tasks</h3>
      <p className="text-xs text-muted-foreground">
        Durable project work, independent of threads and delegated executions. A status change does
        not establish verification or acceptance.
      </p>
      <TaskPage
        key={cursor}
        api={api}
        environmentId={environmentId}
        projectId={projectId}
        cursor={cursor}
        setCursor={setCursor}
      />
    </section>
  );
}
function TaskPage({
  api,
  environmentId,
  projectId,
  cursor,
  setCursor,
}: {
  api: ProjectRuntimeApi;
  environmentId: EnvironmentId;
  projectId: ProjectId;
  cursor: number;
  setCursor: (cursor: number) => void;
}) {
  const { result, reload } = useRuntimeLoad(() => api.listTasks({ cursor, limit: 20 }));
  const [editing, setEditing] = useState<ProjectRuntimeTask | "new" | null>(null);
  const [history, setHistory] = useState<ProjectRuntimeTask | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reloadTask = async () => {
    if (!editing || editing === "new") return;
    const latest = await api.readTask({ taskId: editing.taskId });
    if (latest.ok) {
      setEditing(latest.value);
      await reload();
    } else setError(latest.message);
  };
  return (
    <div className="space-y-3">
      <RuntimeLoadError result={result} reload={reload} />
      <RuntimeError message={error} />
      {result?.ok && (
        <>
          {result.value.tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No Runtime tasks.</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {result.value.tasks.map((task) => (
                <li key={task.taskId} className="space-y-1.5 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="min-w-0 break-words text-sm font-medium">{task.title}</p>
                    <span className="text-xs">
                      {task.status} · Revision {task.revision}
                    </span>
                  </div>
                  <p className="break-words text-xs text-muted-foreground">
                    Owner {task.owner} · Verification {task.verification.milestone}
                  </p>
                  <p className="break-words text-xs text-muted-foreground">
                    Worker preference:{" "}
                    {task.routing == null
                      ? "Project or Development Profile"
                      : `${workerRoleLabel(task.routing.role)} · ${task.routing.candidates.length} preferred worker${task.routing.candidates.length === 1 ? "" : "s"}`}
                  </p>
                  {task.blocker ? (
                    <p className="line-clamp-2 break-words text-xs text-muted-foreground">
                      Blocker: {task.blocker.summary}
                    </p>
                  ) : legacyBlockedWithoutBlocker(task) ? (
                    <p className="text-xs text-warning-foreground">
                      Blocked without a recorded blocker. Edit the task to repair it.
                    </p>
                  ) : null}
                  <p className="line-clamp-2 break-words text-xs text-muted-foreground">
                    Next: {task.nextAction ?? "Not set"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    Latest handoff: {task.latestHandoffId ?? "None"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Updated {new Date(task.updatedAt).toLocaleString()}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="xs" variant="outline" onClick={() => setEditing(task)}>
                      {api.canEdit ? "Edit task" : "View task"}
                    </Button>
                    <Button size="xs" variant="outline" onClick={() => setHistory(task)}>
                      View handoffs
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <RuntimePager cursor={cursor} next={result.value.nextCursor} onChange={setCursor} />
        </>
      )}
      <Button size="sm" variant="outline" disabled={!api.canEdit} onClick={() => setEditing("new")}>
        Create task
      </Button>
      <Button size="sm" variant="ghost" onClick={() => void reload()}>
        Refresh tasks
      </Button>
      {editing && (
        <TaskEditor
          key={editing === "new" ? "new" : `${editing.taskId}:${editing.revision}`}
          saved={editing === "new" ? null : editing}
          api={api}
          environmentId={environmentId}
          projectId={projectId}
          close={() => setEditing(null)}
          savedTask={() => {
            setEditing(null);
            void reload();
          }}
          reload={reloadTask}
        />
      )}
      {history && (
        <ProjectRuntimeHandoffs
          key={history.taskId}
          api={api}
          task={history}
          close={() => setHistory(null)}
        />
      )}
    </div>
  );
}
function TaskEditor({
  saved,
  api,
  environmentId,
  projectId,
  close,
  savedTask,
  reload,
}: {
  saved: ProjectRuntimeTask | null;
  api: ProjectRuntimeApi;
  environmentId: EnvironmentId;
  projectId: ProjectId;
  close: () => void;
  savedTask: () => void;
  reload: () => Promise<void>;
}) {
  const [title, setTitle] = useState(saved?.title ?? "");
  const [status, setStatus] = useState<ProjectRuntimeTaskStatus>(saved?.status ?? "planned");
  const [objective, setObjective] = useState(saved?.objective ?? "");
  const [scope, setScope] = useState(saved?.scope ?? "");
  const [outOfScope, setOutOfScope] = useState(saved?.outOfScope ?? "");
  const [owner, setOwner] = useState(saved?.owner ?? "");
  const [routing, setRouting] = useState<RuntimeRoleRoute | null>(saved?.routing ?? null);
  const [verificationPlan, setVerificationPlan] = useState(saved?.verificationPlan ?? "");
  const [next, setNext] = useState(saved?.nextAction ?? "");
  const [result, setResult] = useState(saved?.result ?? "");
  const [classification, setClassification] = useState<ProjectRuntimeBlockerClassification>(
    saved?.blocker?.classification ?? "implementation-defect",
  );
  const [blockerSummary, setBlockerSummary] = useState(saved?.blocker?.summary ?? "");
  const [blockerDetail, setBlockerDetail] = useState(saved?.blocker?.detail ?? "");
  const [milestone, setMilestone] = useState<ProjectRuntimeVerificationMilestone>(
    saved?.verification.milestone ?? "none",
  );
  const [evidence, setEvidence] = useState<TaskEvidenceDraft[]>(() => evidenceDrafts(saved));
  const initialCriteria =
    saved?.acceptanceCriteria.map((criterion) => criterion.text).join("\n") ?? "";
  const [criteria, setCriteria] = useState(initialCriteria);
  const [criteriaDirty, setCriteriaDirty] = useState(false);
  const [repository, setRepository] = useState(saved?.base?.repository ?? "");
  const [branch, setBranch] = useState(saved?.base?.branch ?? "");
  const [revision, setRevision] = useState(saved?.base?.revision ?? "");
  const [worktree, setWorktree] = useState(saved?.base?.worktreePath ?? "");
  const [upstreamRevision, setUpstreamRevision] = useState(saved?.base?.upstreamRevision ?? "");
  const [baseNotes, setBaseNotes] = useState(saved?.base?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const nextEvidenceKey = useRef(0);
  const addEvidence = () => {
    nextEvidenceKey.current += 1;
    setEvidence((current) => [
      ...current,
      {
        key: `draft-${nextEvidenceKey.current}`,
        evidenceId: null,
        result: "inconclusive",
        summary: "",
        command: "",
        recordedAt: new Date().toISOString(),
      },
    ]);
  };
  const updateEvidence = (key: string, patch: Partial<Omit<TaskEvidenceDraft, "key">>) => {
    setEvidence((current) =>
      current.map((entry) => (entry.key === key ? { ...entry, ...patch } : entry)),
    );
  };
  const resetVerification = () => {
    setMilestone("none");
    setEvidence([]);
    setError(null);
  };
  const legacyBlocked = saved !== null && legacyBlockedWithoutBlocker(saved);
  const clearsSavedBlocker = saved?.blocker != null && status !== "blocked";
  const save = async () => {
    if (busy) return;
    const criteriaChanged = saved === null || criteriaDirty;
    const criteriaMapping = criteriaChanged
      ? mapAcceptanceCriteria(criteria, saved?.acceptanceCriteria ?? [])
      : null;
    const acceptedCriterionIds =
      criteriaMapping === null
        ? undefined
        : new Set(criteriaMapping.criteria.map((criterion) => criterion.id));
    const evidenceMapping = mapVerificationEvidence(evidence, acceptedCriterionIds);
    const validationError = taskDraftIssue({
      status,
      blockerSummary,
      result,
      criteriaError: criteriaMapping?.error ?? null,
      verificationError:
        evidenceMapping.error ?? verificationIssue(milestone, evidenceMapping.evidence),
    });
    if (validationError) {
      setError(validationError);
      setConflict(false);
      return;
    }
    setBusy(true);
    setError(null);
    const base = recordedBase({
      repository,
      branch,
      revision,
      worktree,
      upstreamRevision,
      notes: baseNotes,
    });
    const blocker =
      status === "blocked"
        ? taskBlockerInput({ classification, summary: blockerSummary, detail: blockerDetail })
        : null;
    const shared = {
      title: title.trim(),
      scope,
      status,
      verification: { milestone, evidence: [...evidenceMapping.evidence] },
    };
    const response = saved
      ? await api.updateTask({
          ...shared,
          ...(criteriaMapping === null
            ? {}
            : { acceptanceCriteria: [...criteriaMapping.criteria] }),
          blocker,
          taskId: saved.taskId,
          expectedRevision: saved.revision,
          objective: nullableText(objective),
          outOfScope: nullableText(outOfScope),
          verificationPlan: nullableText(verificationPlan),
          result: nullableText(result),
          nextAction: nullableText(next),
          base: base ?? null,
          routing,
          ...(owner.trim() === "" ? {} : { owner: owner.trim() }),
        })
      : await api.createTask({
          ...shared,
          acceptanceCriteria: [...(criteriaMapping?.criteria ?? [])],
          ...(blocker === null ? {} : { blocker }),
          ...(routing === null ? {} : { routing }),
          ...(nullableText(objective) === null ? {} : { objective: objective.trim() }),
          ...(nullableText(outOfScope) === null ? {} : { outOfScope: outOfScope.trim() }),
          ...(nullableText(verificationPlan) === null
            ? {}
            : { verificationPlan: verificationPlan.trim() }),
          ...(nullableText(result) === null ? {} : { result: result.trim() }),
          ...(nullableText(next) === null ? {} : { nextAction: next.trim() }),
          ...(base === null ? {} : { base }),
          ...(owner.trim() === "" ? {} : { owner: owner.trim() }),
        });
    setBusy(false);
    if (response.ok) savedTask();
    else {
      setError(response.message);
      setConflict(response.conflict);
    }
  };
  return (
    <div className="space-y-3 rounded-lg border p-3" aria-label="Task editor">
      <h4 className="text-sm font-medium">
        {saved ? `Edit task · Revision ${saved.revision}` : "Create task"}
      </h4>
      {saved ? (
        <p className="truncate text-xs text-muted-foreground">
          Latest handoff: {saved.latestHandoffId ?? "None recorded."}
        </p>
      ) : null}
      <fieldset disabled={!api.canEdit || busy} className="space-y-4">
        <div className="space-y-3">
          <RuntimeText
            label="Task title"
            value={title}
            onChange={setTitle}
            maxLength={B.taskTitleMaxLength}
          />
          <RuntimeSelect
            label="Task status"
            value={status}
            values={TASK_STATUS_VALUES}
            onChange={setStatus}
          />
          <RuntimeText
            label="Owner"
            value={owner}
            onChange={setOwner}
            maxLength={B.actorMaxLength}
          />
          <TaskWorkerPreferenceFields
            api={api}
            saved={saved}
            routing={routing}
            onChange={setRouting}
            environmentId={environmentId}
            projectId={projectId}
          />
          {saved === null ? null : (
            <TaskExecutionControl
              api={api}
              task={saved}
              environmentId={environmentId}
              projectId={projectId}
              onReload={reload}
            />
          )}
          <RuntimeText
            label="Scope"
            multiline
            value={scope}
            onChange={setScope}
            maxLength={B.taskTextMaxLength}
          />
          <RuntimeText
            label="Objective"
            multiline
            value={objective}
            onChange={setObjective}
            maxLength={B.taskObjectiveMaxLength}
          />
          <RuntimeText
            label="Out of scope"
            multiline
            value={outOfScope}
            onChange={setOutOfScope}
            maxLength={B.taskOutOfScopeMaxLength}
          />
        </div>

        {status === "blocked" ? (
          <div className="space-y-3 rounded-lg border p-3">
            <h5 className="text-sm font-medium">Blocker</h5>
            {legacyBlocked ? (
              <p role="status" className="text-xs text-warning-foreground">
                This task is recorded as blocked without a blocker. Add a blocker, or change the
                status to repair it.
              </p>
            ) : null}
            <RuntimeSelect
              label="Blocker classification"
              value={classification}
              values={BLOCKER_CLASSIFICATION_VALUES}
              onChange={setClassification}
            />
            <RuntimeText
              label="Blocker summary"
              value={blockerSummary}
              onChange={setBlockerSummary}
              maxLength={B.blockerSummaryMaxLength}
            />
            <RuntimeText
              label="Blocker detail"
              multiline
              value={blockerDetail}
              onChange={setBlockerDetail}
              maxLength={B.blockerDetailMaxLength}
            />
          </div>
        ) : clearsSavedBlocker ? (
          <p role="status" className="text-xs text-muted-foreground">
            Saving this status clears the recorded blocker.
          </p>
        ) : null}

        <RuntimeText
          label="Result"
          multiline
          value={result}
          onChange={setResult}
          maxLength={B.taskResultMaxLength}
        />
        <p className="text-xs text-muted-foreground">
          Required when the status is done. A handoff summary is not a task result.
        </p>
        <RuntimeText
          label="Next action"
          multiline
          value={next}
          onChange={setNext}
          maxLength={B.taskNextActionMaxLength}
        />
        <RuntimeText
          label="Acceptance criteria"
          multiline
          value={criteria}
          onChange={(value) => {
            setCriteria(value);
            setCriteriaDirty(value !== initialCriteria);
          }}
          maxLength={B.taskTextMaxLength}
        />
        <p className="text-xs text-muted-foreground">
          One criterion per line. Existing criteria keep their identity by text; a new line gets a
          fresh id.
        </p>
        <RuntimeText
          label="Verification plan"
          multiline
          value={verificationPlan}
          onChange={setVerificationPlan}
          maxLength={B.taskVerificationPlanMaxLength}
        />

        <div className="space-y-3 rounded-lg border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h5 className="text-sm font-medium">Verification</h5>
            <span className="text-xs text-muted-foreground">
              {evidence.length} evidence item{evidence.length === 1 ? "" : "s"}
            </span>
          </div>
          <RuntimeSelect
            label="Verification milestone"
            value={milestone}
            values={VERIFICATION_MILESTONE_VALUES}
            onChange={setMilestone}
          />
          <p className="text-xs text-muted-foreground">
            Passing milestones need at least one passing evidence item. Inconclusive evidence is not
            passing, and verified cannot coexist with failing evidence.
          </p>
          {evidence.map((entry, index) => (
            <div key={entry.key} className="space-y-2 rounded-md border p-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-medium">Evidence {index + 1}</p>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() =>
                    setEvidence((current) => current.filter((item) => item.key !== entry.key))
                  }
                >
                  Remove evidence {index + 1}
                </Button>
              </div>
              <RuntimeSelect
                label={`Evidence result ${index + 1}`}
                value={entry.result}
                values={EVIDENCE_RESULT_VALUES}
                onChange={(value: ProjectRuntimeEvidenceResult) =>
                  updateEvidence(entry.key, { result: value })
                }
              />
              <RuntimeText
                label={`Evidence summary ${index + 1}`}
                value={entry.summary}
                onChange={(value) => updateEvidence(entry.key, { summary: value })}
                maxLength={B.evidenceSummaryMaxLength}
              />
              <RuntimeText
                label={`Evidence command ${index + 1}`}
                value={entry.command}
                onChange={(value) => updateEvidence(entry.key, { command: value })}
                maxLength={B.evidenceCommandMaxLength}
              />
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button size="xs" variant="outline" onClick={addEvidence}>
              Add evidence
            </Button>
            <Button size="xs" variant="outline" onClick={resetVerification}>
              Reset verification to none
            </Button>
          </div>
        </div>

        <details>
          <summary className="cursor-pointer text-sm font-medium">Recorded base metadata</summary>
          <div className="mt-3 space-y-3">
            <p className="text-xs text-muted-foreground">
              These fields describe the recorded starting point. They do not create, move, or verify
              a Git branch or worktree, rebind a thread, grant ownership, or authorize writes.
            </p>
            <RuntimeText
              label="Recorded repository"
              value={repository}
              onChange={setRepository}
              maxLength={B.baseRepositoryMaxLength}
            />
            <RuntimeText
              label="Recorded branch"
              value={branch}
              onChange={setBranch}
              maxLength={B.baseBranchMaxLength}
            />
            <RuntimeText
              label="Recorded revision"
              value={revision}
              onChange={setRevision}
              maxLength={B.baseRevisionMaxLength}
            />
            <RuntimeText
              label="Recorded worktree"
              value={worktree}
              onChange={setWorktree}
              maxLength={B.baseWorktreePathMaxLength}
            />
            <RuntimeText
              label="Recorded upstream revision"
              value={upstreamRevision}
              onChange={setUpstreamRevision}
              maxLength={B.baseUpstreamRevisionMaxLength}
            />
            <RuntimeText
              label="Recorded notes"
              multiline
              value={baseNotes}
              onChange={setBaseNotes}
              maxLength={B.baseNotesMaxLength}
            />
          </div>
        </details>
      </fieldset>
      <RuntimeError message={error} />
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={!api.canEdit || busy || conflict || !title.trim()}
          onClick={() => void save()}
        >
          Save task
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={close}>
          Cancel task edit
        </Button>
        {conflict && (
          <Button size="sm" variant="outline" onClick={() => void reload()}>
            Discard draft and reload task
          </Button>
        )}
      </div>
    </div>
  );
}

function TaskWorkerPreferenceFields({
  api,
  saved,
  routing,
  onChange,
  environmentId,
  projectId,
}: {
  api: ProjectRuntimeApi;
  saved: ProjectRuntimeTask | null;
  routing: RuntimeRoleRoute | null;
  onChange: (routing: RuntimeRoleRoute | null) => void;
  environmentId: EnvironmentId;
  projectId: ProjectId;
}) {
  const catalog = useWorkerRoutingCatalog({ environmentId, projectId });
  const savedRouting = saved?.routing ?? null;
  const dirty = !Equal.equals(routing, savedRouting);

  return (
    <section
      aria-label="Task worker preference"
      className="space-y-3 rounded-lg border border-border p-3"
    >
      <div>
        <h5 className="text-sm font-medium">Worker preference</h5>
        <p className="text-xs text-muted-foreground">
          The worker role belongs to this task, not to a permanent AI persona. Choose which kind of
          work this task is, then optionally prefer providers or models for it.
        </p>
      </div>

      <label className="block space-y-1">
        <span className="text-xs font-medium">Task worker role</span>
        <Select
          value={routing?.role ?? NO_TASK_ROLE}
          onValueChange={(value) => {
            if (value === null) return;
            if (value === NO_TASK_ROLE) {
              onChange(null);
              return;
            }
            const role = value as RuntimeWorkerRole;
            onChange(
              routing === null
                ? { role, candidates: [], fallback: "continue" }
                : { ...routing, role },
            );
          }}
        >
          <SelectTrigger size="sm" aria-label="Task worker role">
            <SelectValue>
              {(value: string | null) =>
                value === null || value === NO_TASK_ROLE
                  ? "Use project or Development Profile setting"
                  : workerRoleLabel(value as RuntimeWorkerRole)
              }
            </SelectValue>
          </SelectTrigger>
          <SelectPopup>
            <SelectItem value={NO_TASK_ROLE}>Use project or Development Profile setting</SelectItem>
            {WORKER_ROLE_ORDER.map((role) => (
              <SelectItem key={role} value={role}>
                {workerRoleLabel(role)}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
      </label>

      {routing === null ? (
        <p className="text-xs text-muted-foreground">
          This task does not set a worker role or preferred worker. Project and Development Profile
          settings apply; Implementation is used when no role is specified.
        </p>
      ) : (
        <>
          <WorkerRoleRouteEditor
            role={routing.role}
            candidates={routing.candidates}
            fallback={routing.fallback}
            fallbackOptions={TASK_FALLBACK_OPTIONS}
            catalog={catalog}
            environmentId={environmentId}
            onChange={(next) => onChange({ ...routing, ...next })}
          />
          <Button
            size="xs"
            variant="outline"
            onClick={() => onChange(null)}
            aria-label="Clear task worker preference"
          >
            Clear task worker preference
          </Button>
        </>
      )}

      {saved === null ? (
        <p className="text-xs text-muted-foreground">
          Save the task to check which worker setting currently takes effect.
        </p>
      ) : (
        <TaskWorkerEffectiveChoice
          api={api}
          saved={saved}
          entries={catalog.entries}
          dirty={dirty}
        />
      )}
    </section>
  );
}

function TaskWorkerEffectiveChoice({
  api,
  saved,
  entries,
  dirty,
}: {
  api: ProjectRuntimeApi;
  saved: ProjectRuntimeTask;
  entries: ReadonlyArray<ProviderInstanceEntry>;
  dirty: boolean;
}) {
  const [result, setResult] = useState<RuntimeResult<RuntimeRouteResolution> | null>(null);
  const load = useStableCallback(async (isActive: () => boolean = () => true) => {
    const next = await api.resolveRoute({ taskId: saved.taskId });
    if (isActive()) setResult(next);
  });

  // oxlint-disable-next-line t3code/react-effect-budget -- Resolves the saved task's effective worker over RPC and cancels stale results when the task revision changes.
  useEffect(() => {
    let active = true;
    void load(() => active);
    return () => {
      active = false;
    };
  }, [load]);

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium">Effective worker choice for the saved task</p>
      {dirty ? (
        <p className="text-xs text-warning-foreground" role="status">
          Unsaved worker changes are not reflected here until you save the task.
        </p>
      ) : null}
      {result === null ? (
        <p className="text-sm text-muted-foreground" role="status">
          Checking effective worker choice…
        </p>
      ) : !result.ok ? (
        <div className="space-y-2">
          <RuntimeError message={result.message} />
          <Button size="sm" variant="outline" onClick={() => void load()}>
            Retry effective worker choice
          </Button>
        </div>
      ) : (
        <>
          <WorkerRouteResolutionView
            resolution={result.value}
            entries={entries}
            roleLabel={workerRoleLabel(result.value.role)}
            onRefresh={() => void load()}
          />
          <p className="break-words text-xs text-muted-foreground">
            {ROUTING_EVALUATION_CAVEAT} Resolved from task revision{" "}
            {result.value.revisions.task ?? saved.revision}.
          </p>
        </>
      )}
    </div>
  );
}

function executionStatusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "Pending launch";
    case "launched":
      return "Launched";
    case "cancelling":
      return "Cancelling";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    case "cancelled":
      return "Cancelled";
    case "interrupted":
      return "Interrupted";
    case "reconcile_required":
      return "Needs reconciliation";
    default:
      return status;
  }
}

function TaskExecutionControl({
  api,
  task,
  environmentId,
  projectId,
  onReload,
}: {
  api: ProjectRuntimeApi;
  task: ProjectRuntimeTask;
  environmentId: EnvironmentId;
  projectId: ProjectId;
  onReload: () => Promise<void>;
}) {
  const catalog = useWorkerRoutingCatalog({ environmentId, projectId });
  const { result, reload } = useRuntimeLoad(
    () => api.listExecutionAttempts({ taskId: task.taskId, limit: 1 }),
    api.ready,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const attemptsLoading = result === null;
  const latest = result?.ok ? (result.value.attempts[0] ?? null) : null;
  const active =
    latest?.status === "pending" ||
    latest?.status === "launched" ||
    latest?.status === "cancelling" ||
    latest?.status === "reconcile_required";
  const executable =
    task.status === "planned" || task.status === "ready" || task.status === "active";

  const cancel = async () => {
    if (latest === null || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await api.cancelExecutionAttempt({
        attemptId: latest.attemptId,
        expectedRevision: latest.revision,
        reason: "Cancelled from Runtime task settings.",
      });
      if (!response.ok) {
        setError(response.message);
        setConflict(response.conflict);
        return;
      }
      setConflict(false);
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const reconcile = async () => {
    if (latest === null || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await api.reconcileExecutionAttempt({ attemptId: latest.attemptId });
      if (!response.ok) {
        setError(response.message);
        setConflict(response.conflict);
        return;
      }
      setConflict(false);
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const execute = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await api.executeTask({
        taskId: task.taskId,
        expectedTaskRevision: task.revision,
        clientRequestId: randomUUID(),
      });
      if (!response.ok) {
        setError(response.message);
        setConflict(response.conflict);
        return;
      }
      setConflict(false);
      await reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label="Task execution" className="space-y-3 rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h5 className="text-sm font-medium">Execution</h5>
          <p className="text-xs text-muted-foreground">
            Starts one worker thread from this saved task. Save any edits first; execution uses the
            saved revision and does not change it.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={!api.canEdit || busy || attemptsLoading || active || !executable}
            onClick={() => void execute()}
            title={
              !executable
                ? "Only planned, ready, or active tasks can be executed."
                : active
                  ? "This task already has an active execution attempt."
                  : undefined
            }
          >
            {busy ? "Working…" : "Execute task"}
          </Button>
          {active && api.canEdit ? (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void cancel()}>
              {latest?.status === "cancelling" ? "Cancel again" : "Cancel execution"}
            </Button>
          ) : null}
          {(latest?.status === "launched" ||
            latest?.status === "cancelling" ||
            latest?.status === "reconcile_required") &&
          api.canEdit ? (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void reconcile()}>
              Recheck attempt
            </Button>
          ) : null}
        </div>
      </div>

      {error !== null ? (
        <div className="space-y-2">
          <Alert variant="error">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          {conflict ? (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void onReload()}>
              Reload task before executing
            </Button>
          ) : null}
        </div>
      ) : null}

      {result === null ? (
        <p className="text-xs text-muted-foreground" role="status">
          Loading execution attempts…
        </p>
      ) : !result.ok ? (
        <div className="space-y-2">
          <Alert variant="error">
            <AlertDescription>{result.message}</AlertDescription>
          </Alert>
          <Button size="sm" variant="outline" onClick={() => void reload()}>
            Retry execution attempts
          </Button>
        </div>
      ) : latest === null ? (
        <p className="text-xs text-muted-foreground">No execution attempts yet.</p>
      ) : (
        <div className="space-y-1.5 rounded-md border border-border/70 p-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={
                  latest.status === "failed"
                    ? "error"
                    : latest.status === "reconcile_required" || latest.status === "cancelling"
                      ? "warning"
                      : latest.status === "completed"
                        ? "success"
                        : "secondary"
                }
                size="sm"
              >
                {executionStatusLabel(latest.status)}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {catalog.entries.find(
                  (entry) => entry.instanceId === latest.modelSelection.instanceId,
                )?.displayName ?? latest.modelSelection.instanceId}{" "}
                · {latest.modelSelection.model}
              </span>
              <span className="text-xs text-muted-foreground">
                {routeSourceLabel(latest.routeSource)}
              </span>
            </div>
            {latest.status === "launched" ||
            latest.status === "cancelling" ||
            latest.status === "completed" ||
            latest.status === "cancelled" ||
            latest.status === "interrupted" ||
            latest.status === "reconcile_required" ? (
              <Link
                to="/$environmentId/$threadId"
                params={{ environmentId, threadId: latest.threadId }}
                className="text-xs font-medium underline-offset-4 hover:underline"
              >
                Open worker thread
              </Link>
            ) : null}
          </div>
          <p className="break-words text-xs text-muted-foreground">
            Attempt {latest.attemptId} · Revision {latest.revision} ·{" "}
            {new Date(latest.createdAt).toLocaleString()}
            {latest.cancelRequestedAt == null
              ? ""
              : ` · Cancellation requested ${new Date(latest.cancelRequestedAt).toLocaleString()}`}
          </p>
          {latest.handoffId == null ? null : (
            <p className="break-words text-xs text-muted-foreground">
              Linked handoff: {latest.handoffId}
            </p>
          )}
          {latest.failure === null ? null : (
            <p className="break-words text-xs text-warning-foreground">{latest.failure}</p>
          )}
        </div>
      )}
    </section>
  );
}
