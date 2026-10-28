import type { RuntimeRouteResolution, RuntimeWorkerRole } from "@t3tools/contracts";

import { runtimeModeConfig } from "../chat/runtimeModeConfig";
import { ProviderInstanceIcon } from "../chat/ProviderInstanceIcon";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import type { ProviderInstanceEntry } from "../../providerInstances";
import {
  candidateProviderLabel,
  effectiveSourceLabel,
  rejectionReasonLabel,
  routeSourceLabel,
  workerRoleLabel,
} from "./workerRouting.logic";

export const ROUTING_EVALUATION_CAVEAT =
  "Worker preferences are evaluated before work starts. T3 checks provider availability and permissions again when that work actually starts, so a preference is not a guarantee.";

function SourceBadge({ resolution }: { resolution: RuntimeRouteResolution }) {
  if (resolution.status === "failed") {
    return (
      <Badge variant="warning" size="sm">
        Not available
      </Badge>
    );
  }
  if (resolution.status === "inherited") {
    return (
      <Badge variant="outline" size="sm">
        Normal T3 behaviour
      </Badge>
    );
  }
  return (
    <Badge variant={resolution.source === "project" ? "info" : "secondary"} size="sm">
      {routeSourceLabel(resolution.source)}
    </Badge>
  );
}

export function WorkerRouteResolutionView({
  resolution,
  entries,
  roleLabel,
  compact = false,
  showCaveat = false,
  onRefresh,
}: {
  readonly resolution: RuntimeRouteResolution;
  readonly entries: ReadonlyArray<ProviderInstanceEntry>;
  readonly roleLabel?: string;
  readonly compact?: boolean;
  readonly showCaveat?: boolean;
  readonly onRefresh?: () => void;
}) {
  const selected = resolution.selected;
  const entry =
    selected === null
      ? undefined
      : entries.find((candidate) => candidate.instanceId === selected.providerInstanceId);
  const details =
    selected === null
      ? []
      : [
          selected.isolation === "worktree" ? "Separate worktree" : null,
          selected.runtimeMode === undefined ? null : runtimeModeConfig[selected.runtimeMode].label,
          selected.interactionMode === "plan" ? "Plan mode" : null,
        ].filter((detail): detail is string => detail !== null);

  return (
    <div
      className={compact ? "space-y-1.5" : "space-y-3 rounded-lg border border-border p-3"}
      aria-label={`Effective worker choice${roleLabel === undefined ? "" : ` for ${roleLabel}`}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          {roleLabel === undefined ? null : (
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {roleLabel}
            </p>
          )}
          <p className="break-words text-sm font-medium">
            Effective worker choice: {effectiveSourceLabel(resolution)}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <SourceBadge resolution={resolution} />
          {onRefresh === undefined ? null : (
            <Button size="xs" variant="outline" onClick={onRefresh}>
              Refresh
            </Button>
          )}
        </div>
      </div>

      {selected !== null ? (
        <div className="space-y-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {entry === undefined ? null : (
              <ProviderInstanceIcon
                driverKind={entry.driverKind}
                displayName={entry.displayName}
                accentColor={entry.accentColor}
                acpRegistryAgentId={entry.acpRegistryAgentId}
                acpRegistryIconUrl={entry.acpRegistryIconUrl}
                className="size-4 shrink-0"
                iconClassName="size-4"
              />
            )}
            <span className="break-words text-sm">
              {entry?.displayName ?? selected.driverKind} · {selected.model}
            </span>
            <Badge variant="outline" size="sm">
              Available when last checked
            </Badge>
          </div>
          {details.length > 0 ? (
            <p className="break-words text-xs text-muted-foreground">{details.join(" · ")}</p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Supplied by {routeSourceLabel(resolution.source)}
            {resolution.source === "profile" && resolution.revisions.profile !== null
              ? ` · Revision ${resolution.revisions.profile.revision}`
              : resolution.source === "project"
                ? ` · Revision ${resolution.revisions.projectRouting}`
                : resolution.source === "task" && resolution.revisions.task !== null
                  ? ` · Task revision ${resolution.revisions.task}`
                  : ""}
          </p>
        </div>
      ) : resolution.status === "inherited" ? (
        <p className="break-words text-xs text-muted-foreground">
          {resolution.inheritedFrom === null
            ? "No task, project, or Development Profile preference applies to this role, so T3 behaves as it normally would."
            : `No worker was selected by ${routeSourceLabel(resolution.inheritedFrom)}, so T3 uses normal T3 behaviour for this role.`}
        </p>
      ) : (
        <p className="break-words text-xs text-warning-foreground">
          {resolution.failure?.reason === "explicit_override_unavailable"
            ? "The one-run choice could not be used, and one-run choices never fall through to saved settings."
            : `${routeSourceLabel(resolution.source)} is set to fail rather than use another worker.`}
        </p>
      )}

      {resolution.rejected.length > 0 ? (
        <details className="rounded-md border border-border/70 p-2">
          <summary className="cursor-pointer text-xs font-medium">
            Why preferred workers were skipped ({resolution.rejected.length})
          </summary>
          <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
            {resolution.rejected.map((rejection) => (
              <li key={`${rejection.source}:${rejection.candidateIndex}`} className="break-words">
                <span className="font-medium">{routeSourceLabel(rejection.source)}</span> ·{" "}
                {candidateProviderLabel(rejection.candidate, entries)} · {rejection.candidate.model}
                : {rejectionReasonLabel(rejection.reason)}
                {rejection.detail === undefined ? null : (
                  <span className="block break-words">{rejection.detail}</span>
                )}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {showCaveat ? (
        <p className="break-words text-xs text-muted-foreground">{ROUTING_EVALUATION_CAVEAT}</p>
      ) : null}
    </div>
  );
}

export function WorkerRoleResolutionList({
  resolutions,
  entries,
}: {
  readonly resolutions: ReadonlyMap<RuntimeWorkerRole, RuntimeRouteResolution>;
  readonly entries: ReadonlyArray<ProviderInstanceEntry>;
}) {
  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {[...resolutions.entries()].map(([role, resolution]) => (
        <li key={role} className="p-3">
          <WorkerRouteResolutionView
            resolution={resolution}
            entries={entries}
            roleLabel={workerRoleLabel(role)}
            compact
          />
        </li>
      ))}
    </ul>
  );
}
