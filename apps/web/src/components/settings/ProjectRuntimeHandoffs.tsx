import { useState } from "react";
import type { ProjectRuntimeTask } from "@t3tools/contracts";
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
                  {handoff.checkpoint}
                </summary>
                <div className="mt-3 space-y-3">
                  <p className="whitespace-pre-wrap break-words text-sm">{handoff.summary}</p>
                  <p className="break-words text-xs text-muted-foreground">
                    {new Date(handoff.createdAt).toLocaleString()} · Task revision{" "}
                    {handoff.taskRevision} · {handoff.createdBy}
                  </p>
                  {(
                    [
                      ["Changes", handoff.changes],
                      ["Verification", handoff.verification],
                      ["Failures / blockers", handoff.failuresOrBlockers],
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
                  {handoff.evidenceRefs?.length ? (
                    <div>
                      <h5 className="text-xs font-medium">Evidence references</h5>
                      <ul className="list-inside list-disc text-sm text-muted-foreground">
                        {[...new Set(handoff.evidenceRefs)].map((reference) => (
                          <li key={reference} className="break-all">
                            {reference}
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
