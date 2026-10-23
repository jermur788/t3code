import { useState } from "react";
import {
  PROJECT_RUNTIME_BOUNDS as B,
  type ProjectRuntimeTask,
  type ProjectRuntimeTaskStatus,
} from "@t3tools/contracts";
import { Button } from "../ui/button";
import {
  RuntimeText,
  RuntimeSelect,
  RuntimeError,
  RuntimePager,
  RuntimeLoadError,
  useRuntimeLoad,
} from "./ProjectRuntimeFields";
import type { ProjectRuntimeApi } from "./useProjectRuntimeApi";
import { ProjectRuntimeHandoffs } from "./ProjectRuntimeHandoffs";

export function ProjectRuntimeTasks({ api }: { api: ProjectRuntimeApi }) {
  const [cursor, setCursor] = useState(0);
  return (
    <section className="space-y-3" aria-label="Runtime tasks">
      <h3 className="text-sm font-medium">Runtime tasks</h3>
      <p className="text-xs text-muted-foreground">
        Durable project work, independent of threads and delegated executions. A status change does
        not establish verification or acceptance.
      </p>
      <TaskPage key={cursor} api={api} cursor={cursor} setCursor={setCursor} />
    </section>
  );
}
function TaskPage({
  api,
  cursor,
  setCursor,
}: {
  api: ProjectRuntimeApi;
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
                <li key={task.taskId} className="space-y-2 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="min-w-0 break-words text-sm font-medium">{task.title}</p>
                    <span className="text-xs">
                      {task.status} · Revision {task.revision}
                    </span>
                  </div>
                  <p className="break-words text-xs text-muted-foreground">
                    Next: {task.nextAction ?? "Not set"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Updated {new Date(task.updatedAt).toLocaleString()}
                  </p>
                  <div className="flex flex-wrap gap-2">
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
  close,
  savedTask,
  reload,
}: {
  saved: ProjectRuntimeTask | null;
  api: ProjectRuntimeApi;
  close: () => void;
  savedTask: () => void;
  reload: () => Promise<void>;
}) {
  const [title, setTitle] = useState(saved?.title ?? "");
  const [status, setStatus] = useState<ProjectRuntimeTaskStatus>(saved?.status ?? "planned");
  const [scope, setScope] = useState(saved?.scope ?? "");
  const [criteria, setCriteria] = useState(saved?.acceptanceCriteria ?? "");
  const [next, setNext] = useState(saved?.nextAction ?? "");
  const [branch, setBranch] = useState(saved?.branch ?? "");
  const [worktree, setWorktree] = useState(saved?.worktreePath ?? "");
  const [sha, setSha] = useState(saved?.baseSha ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const save = async () => {
    setBusy(true);
    const fields = { title, status, scope, acceptanceCriteria: criteria };
    const result = saved
      ? await api.updateTask({
          ...fields,
          taskId: saved.taskId,
          expectedRevision: saved.revision,
          nextAction: next.trim() || null,
          branch: branch.trim() || null,
          worktreePath: worktree.trim() || null,
          baseSha: sha.trim() || null,
        })
      : await api.createTask({
          ...fields,
          ...(next.trim() ? { nextAction: next } : {}),
          ...(branch.trim() ? { branch } : {}),
          ...(worktree.trim() ? { worktreePath: worktree } : {}),
          ...(sha.trim() ? { baseSha: sha } : {}),
        });
    setBusy(false);
    if (result.ok) savedTask();
    else {
      setError(result.message);
      setConflict(result.conflict);
    }
  };
  return (
    <div className="space-y-3 rounded-lg border p-3" aria-label="Task editor">
      <h4 className="text-sm font-medium">
        {saved ? `Edit task · Revision ${saved.revision}` : "Create task"}
      </h4>
      <fieldset disabled={!api.canEdit || busy} className="space-y-3">
        <RuntimeText
          label="Task title"
          value={title}
          onChange={setTitle}
          maxLength={B.taskTitleMaxLength}
        />
        <RuntimeSelect
          label="Task status"
          value={status}
          values={["planned", "ready", "active", "blocked", "review", "done", "cancelled"]}
          onChange={setStatus}
        />
        <RuntimeText
          label="Scope"
          multiline
          value={scope}
          onChange={setScope}
          maxLength={B.taskTextMaxLength}
        />
        <RuntimeText
          label="Acceptance criteria"
          multiline
          value={criteria}
          onChange={setCriteria}
          maxLength={B.taskTextMaxLength}
        />
        <RuntimeText
          label="Next action"
          multiline
          value={next}
          onChange={setNext}
          maxLength={B.taskNextActionMaxLength}
        />
        <details>
          <summary className="cursor-pointer text-sm font-medium">
            Git/worktree metadata only
          </summary>
          <div className="mt-3 space-y-3">
            <p className="text-xs text-muted-foreground">
              These descriptive fields do not create a branch, create or move a worktree, rebind a
              thread, grant ownership, or authorize writes.
            </p>
            <RuntimeText
              label="Descriptive branch"
              value={branch}
              onChange={setBranch}
              maxLength={B.taskBranchMaxLength}
            />
            <RuntimeText
              label="Descriptive worktree path"
              value={worktree}
              onChange={setWorktree}
              maxLength={B.taskWorktreePathMaxLength}
            />
            <RuntimeText
              label="Descriptive base SHA"
              value={sha}
              onChange={setSha}
              maxLength={B.taskBaseShaMaxLength}
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
