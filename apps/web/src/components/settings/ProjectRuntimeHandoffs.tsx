import { useState } from "react";
import type { ProjectRuntimeTask } from "@t3tools/contracts";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { RuntimePager, RuntimeLoadError, useRuntimeLoad } from "./ProjectRuntimeFields";
import type { ProjectRuntimeApi } from "./useProjectRuntimeApi";

export function ProjectRuntimeHandoffs({
  api,
  task,
  close,
}: {
  api: ProjectRuntimeApi;
  task: ProjectRuntimeTask;
  close: () => void;
}) {
  const [cursor, setCursor] = useState(0);
  return (
    <section className="space-y-3 rounded-lg border p-3" aria-label="Task handoffs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="min-w-0 break-words text-sm font-medium">Handoffs · {task.title}</h4>
        <Button size="xs" variant="ghost" onClick={close}>
          Close handoffs
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Immutable continuation records. Provider/model provenance is not project authority.
      </p>
      <HandoffPage
        key={`${task.taskId}:${cursor}`}
        api={api}
        task={task}
        cursor={cursor}
        setCursor={setCursor}
      />
    </section>
  );
}
function HandoffPage({
  api,
  task,
  cursor,
  setCursor,
}: {
  api: ProjectRuntimeApi;
  task: ProjectRuntimeTask;
  cursor: number;
  setCursor: (cursor: number) => void;
}) {
  const { result, reload } = useRuntimeLoad(() =>
    api.listHandoffs({ taskId: task.taskId, cursor, limit: 20 }),
  );
  return (
    <div className="space-y-3">
      <RuntimeLoadError result={result} reload={reload} />
      {result?.ok && (
        <>
          {result.value.handoffs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No handoffs for this task.</p>
          ) : (
            result.value.handoffs.map((handoff) => (
              <details key={handoff.handoffId} className="rounded-lg border p-3">
                <summary className="cursor-pointer break-words text-sm font-medium">
                  <span className="inline-flex items-center gap-2">
                    <span>{handoff.checkpoint}</span>
                    {handoff.handoffId === task.latestHandoffId ? (
                      <Badge variant="info" size="sm">
                        Latest
                      </Badge>
                    ) : null}
                  </span>
                </summary>
                <div className="mt-3 space-y-3">
                  <p className="whitespace-pre-wrap break-words text-sm">{handoff.summary}</p>
                  <p className="break-words text-xs text-muted-foreground">
                    {new Date(handoff.createdAt).toLocaleString()} · Task revision{" "}
                    {handoff.taskRevision} · Runtime revision {handoff.runtimeRevision} ·{" "}
                    {handoff.createdBy}
                  </p>
                  {(
                    [
                      ["Result", handoff.result],
                      ["Files changed", handoff.filesChanged.join("\n")],
                      ["Tests run", handoff.testsRun?.join("\n")],
                      ["Tests not run", handoff.testsNotRun?.join("\n")],
                      ["Failures / risks", handoff.failuresRisks],
                      ["Unresolved decisions", handoff.unresolvedDecisions?.join("\n")],
                      ["Repository state", handoff.repositoryState],
                      ["Integration state", handoff.integrationState],
                      [
                        "Verification",
                        handoff.verification.milestone === "none"
                          ? ""
                          : handoff.verification.milestone,
                      ],
                      ["Next action", handoff.nextAction],
                      ["Thread", handoff.threadId],
                      ["Provider", handoff.providerInstanceId],
                      ["Model", handoff.model],
                    ] as const
                  ).map(([label, value]) =>
                    value ? (
                      <div key={label}>
                        <h5 className="text-xs font-medium">{label}</h5>
                        <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
                          {value}
                        </p>
                      </div>
                    ) : null,
                  )}
                  {handoff.verification.evidence.length ? (
                    <div>
                      <h5 className="text-xs font-medium">Evidence</h5>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {handoff.verification.evidence.map((entry) => (
                          <li key={entry.evidenceId} className="flex flex-wrap gap-1.5">
                            <span className="font-medium">{entry.result}</span>
                            <span className="break-words">{entry.summary}</span>
                            {entry.command ? (
                              <span className="block w-full break-all text-xs">
                                {entry.command}
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </details>
            ))
          )}
          <RuntimePager cursor={cursor} next={result.value.nextCursor} onChange={setCursor} />
        </>
      )}
    </div>
  );
}
