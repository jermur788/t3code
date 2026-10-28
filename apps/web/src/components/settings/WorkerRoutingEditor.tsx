import type {
  EnvironmentId,
  ProviderInstanceId,
  RuntimeRouteCandidate,
  RuntimeRoutingFallback,
  RuntimeWorkerRole,
} from "@t3tools/contracts";
import { useNavigate } from "@tanstack/react-router";

import { runtimeModeConfig, runtimeModeOptions } from "../chat/runtimeModeConfig";
import { ProviderModelPicker } from "../chat/ProviderModelPicker";
import { TraitsPicker } from "../chat/TraitsPicker";
import type { ModelEsque } from "../chat/providerIconUtils";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "../ui/select";
import type { ProviderInstanceEntry } from "../../providerInstances";
import { SETTINGS_PICKER_TRIGGER_CLASSNAME } from "./settingsLayout";
import {
  WORKER_ROLE_ORDER,
  candidateOptionSelections,
  candidateProviderLabel,
  candidateUnavailableReason,
  defaultWorkerCandidate,
  fallbackDescription,
  fallbackLabel,
  workerRoleLabel,
} from "./workerRouting.logic";
import type { WorkerRoutingCatalog } from "./useWorkerRoutingCatalog";

const ANY_RUNTIME_MODE = "__provider_default__";
const ANY_INTERACTION_MODE = "__provider_default__";

export interface WorkerRoleRouteDraft<F extends RuntimeRoutingFallback> {
  readonly role: RuntimeWorkerRole;
  readonly candidates: ReadonlyArray<RuntimeRouteCandidate>;
  readonly fallback: F;
}

export interface WorkerRoutingPolicyDraft<F extends RuntimeRoutingFallback> {
  readonly roleRoutes: ReadonlyArray<WorkerRoleRouteDraft<F>>;
}

function savedModelOption(model: string): ModelEsque {
  return { slug: model, name: model, isUnavailable: true };
}

function modelOptionsForCandidate(
  catalog: WorkerRoutingCatalog,
  candidate: RuntimeRouteCandidate,
  instanceId: ProviderInstanceId | null,
): ReadonlyMap<ProviderInstanceId, ReadonlyArray<ModelEsque>> {
  if (instanceId === null) return catalog.modelOptionsByInstance;
  const options = catalog.modelOptionsByInstance.get(instanceId) ?? [];
  if (options.some((option) => option.slug === candidate.model)) {
    return catalog.modelOptionsByInstance;
  }
  const next = new Map(catalog.modelOptionsByInstance);
  next.set(instanceId, [...options, savedModelOption(candidate.model)]);
  return next;
}

function entryForCandidate(
  candidate: RuntimeRouteCandidate,
  entries: ReadonlyArray<ProviderInstanceEntry>,
): ProviderInstanceEntry | undefined {
  if (candidate.providerInstanceId !== undefined) {
    return entries.find((entry) => entry.instanceId === candidate.providerInstanceId);
  }
  return candidate.driverKind === undefined
    ? undefined
    : entries.find((entry) => entry.driverKind === candidate.driverKind);
}

function candidatePickerInstanceId(
  candidate: RuntimeRouteCandidate,
  entry: ProviderInstanceEntry | undefined,
): ProviderInstanceId | null {
  return candidate.providerInstanceId ?? entry?.instanceId ?? null;
}

function runtimeModeValues(
  candidate: RuntimeRouteCandidate,
  entry: ProviderInstanceEntry | undefined,
) {
  const supported = entry?.snapshot.supportedRuntimeModes;
  const modes =
    supported !== undefined && supported.length > 0 ? [...supported] : [...runtimeModeOptions];
  if (candidate.runtimeMode !== undefined && !modes.includes(candidate.runtimeMode)) {
    modes.push(candidate.runtimeMode);
  }
  return modes;
}

type CandidatePatch = {
  readonly [Key in keyof RuntimeRouteCandidate]?: RuntimeRouteCandidate[Key] | undefined;
};

function updateCandidate(
  candidate: RuntimeRouteCandidate,
  patch: CandidatePatch,
): RuntimeRouteCandidate {
  const next = { ...candidate } as Record<string, unknown>;
  for (const key of Object.keys(patch) as Array<keyof RuntimeRouteCandidate>) {
    if (patch[key] === undefined) delete next[key];
    else next[key] = patch[key];
  }
  return next as RuntimeRouteCandidate;
}

export function WorkerRoleRouteEditor<F extends RuntimeRoutingFallback>({
  role,
  roleHeading,
  candidates,
  fallback,
  fallbackOptions,
  catalog,
  environmentId,
  disabled = false,
  onChange,
  onRemoveRole,
}: {
  readonly role: RuntimeWorkerRole;
  readonly roleHeading?: string;
  readonly candidates: ReadonlyArray<RuntimeRouteCandidate>;
  readonly fallback: F;
  readonly fallbackOptions: ReadonlyArray<F>;
  readonly catalog: WorkerRoutingCatalog;
  readonly environmentId: EnvironmentId;
  readonly disabled?: boolean;
  readonly onChange: (next: {
    readonly candidates: ReadonlyArray<RuntimeRouteCandidate>;
    readonly fallback: F;
  }) => void;
  readonly onRemoveRole?: () => void;
}) {
  const navigate = useNavigate();
  const heading = roleHeading ?? workerRoleLabel(role);

  const setCandidates = (next: ReadonlyArray<RuntimeRouteCandidate>) =>
    onChange({ candidates: next, fallback });

  const replaceCandidate = (index: number, next: RuntimeRouteCandidate) =>
    setCandidates(
      candidates.map((candidate, candidateIndex) => (candidateIndex === index ? next : candidate)),
    );

  const moveCandidate = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= candidates.length) return;
    const next = [...candidates];
    const [moved] = next.splice(index, 1);
    if (moved === undefined) return;
    next.splice(target, 0, moved);
    setCandidates(next);
  };

  const addCandidate = () => {
    const candidate = defaultWorkerCandidate(catalog.entries);
    if (candidate !== null) setCandidates([...candidates, candidate]);
  };

  const candidateRows = (() => {
    const counts = new Map<string, number>();
    return candidates.map((candidate) => {
      const base = [
        candidate.providerInstanceId ?? candidate.driverKind ?? "none",
        candidate.model,
        candidate.isolation ?? "shared",
        candidate.runtimeMode ?? "default",
        candidate.interactionMode ?? "default",
      ].join(":");
      const count = counts.get(base) ?? 0;
      counts.set(base, count + 1);
      return { candidate, key: `${base}:${count}` };
    });
  })();

  return (
    <div className="space-y-3 rounded-lg border border-border p-3" data-worker-role={role}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-sm font-medium">{heading}</h4>
          {roleHeading !== undefined ? (
            <p className="text-xs text-muted-foreground">
              {workerRoleLabel(role)} work uses this preference.
            </p>
          ) : null}
        </div>
        {onRemoveRole !== undefined ? (
          <Button
            size="xs"
            variant="ghost"
            disabled={disabled}
            aria-label={`Remove ${workerRoleLabel(role)} worker preference`}
            onClick={onRemoveRole}
          >
            Remove
          </Button>
        ) : null}
      </div>

      {candidates.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No preferred worker. The fallback below decides what happens.
        </p>
      ) : (
        <ol className="space-y-3">
          {candidateRows.map(({ candidate, key }, index) => {
            const entry = entryForCandidate(candidate, catalog.entries);
            const instanceId = candidatePickerInstanceId(candidate, entry);
            const unavailable = candidateUnavailableReason(candidate, catalog.entries);
            const candidateLabel = index === 0 ? "Preferred worker" : `Alternative worker ${index}`;
            const candidateOptions = modelOptionsForCandidate(catalog, candidate, instanceId);
            const modes = runtimeModeValues(candidate, entry);
            return (
              <li key={key} className="space-y-2 rounded-md border border-border/70 p-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-medium text-muted-foreground">{candidateLabel}</p>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      size="micro"
                      variant="ghost"
                      disabled={disabled || index === 0}
                      aria-label={`Move ${candidateLabel.toLowerCase()} for ${workerRoleLabel(role)} up`}
                      onClick={() => moveCandidate(index, -1)}
                    >
                      Up
                    </Button>
                    <Button
                      size="micro"
                      variant="ghost"
                      disabled={disabled || index === candidates.length - 1}
                      aria-label={`Move ${candidateLabel.toLowerCase()} for ${workerRoleLabel(role)} down`}
                      onClick={() => moveCandidate(index, 1)}
                    >
                      Down
                    </Button>
                    <Button
                      size="micro"
                      variant="ghost"
                      disabled={disabled}
                      aria-label={`Remove ${candidateLabel.toLowerCase()} for ${workerRoleLabel(role)}`}
                      onClick={() =>
                        setCandidates(
                          candidates.filter((_entry, candidateIndex) => candidateIndex !== index),
                        )
                      }
                    >
                      Remove
                    </Button>
                  </div>
                </div>

                {instanceId !== null ? (
                  <ProviderModelPicker
                    environmentId={environmentId}
                    activeInstanceId={instanceId}
                    model={candidate.model}
                    lockedProvider={null}
                    instanceEntries={catalog.entries}
                    modelOptionsByInstance={candidateOptions}
                    triggerClassName={SETTINGS_PICKER_TRIGGER_CLASSNAME}
                    triggerAriaLabel={`${candidateLabel} for ${workerRoleLabel(role)}: provider and model`}
                    disabled={disabled}
                    onOpenProviderSetup={(providerInstanceId) =>
                      void navigate({
                        to: "/settings/providers",
                        search: { environmentId, instanceId: providerInstanceId },
                      })
                    }
                    onInstanceModelChange={(providerInstanceId, model) =>
                      replaceCandidate(
                        index,
                        updateCandidate(candidate, {
                          providerInstanceId,
                          driverKind: undefined,
                          model,
                          options: undefined,
                        }),
                      )
                    }
                  />
                ) : (
                  <p className="break-words text-sm">
                    {candidateProviderLabel(candidate, catalog.entries)} · {candidate.model}
                  </p>
                )}

                {unavailable !== null ? (
                  <p
                    className="flex flex-wrap items-center gap-2 text-xs text-warning-foreground"
                    role="status"
                  >
                    <Badge variant="warning" size="sm">
                      Currently unavailable
                    </Badge>
                    {unavailable}
                  </p>
                ) : null}

                {entry !== undefined && instanceId !== null ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <TraitsPicker
                      provider={entry.driverKind}
                      instanceId={instanceId}
                      models={entry.models}
                      model={candidate.model}
                      modelOptions={candidateOptionSelections(candidate)}
                      allowPromptInjectedEffort={false}
                      planModeEnabled={false}
                      triggerClassName={SETTINGS_PICKER_TRIGGER_CLASSNAME}
                      disabled={disabled}
                      onModelOptionsChange={(options) =>
                        replaceCandidate(index, updateCandidate(candidate, { options }))
                      }
                    />
                  </div>
                ) : null}

                <details className="rounded-md border border-border/70 p-2">
                  <summary className="cursor-pointer text-xs font-medium">
                    Advanced worker details
                  </summary>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    <label className="space-y-1 text-xs">
                      <span className="font-medium">Isolation</span>
                      <Select
                        value={candidate.isolation ?? "shared"}
                        onValueChange={(value) => {
                          if (value === "shared" || value === "worktree") {
                            replaceCandidate(
                              index,
                              updateCandidate(candidate, {
                                isolation: value === "shared" ? undefined : value,
                              }),
                            );
                          }
                        }}
                        disabled={disabled}
                      >
                        <SelectTrigger
                          size="sm"
                          aria-label={`Isolation for ${candidateLabel} for ${workerRoleLabel(role)}`}
                        >
                          <SelectValue>
                            {(value: string | null) =>
                              value === "worktree" ? "New worktree" : "Shared checkout"
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectPopup>
                          <SelectItem value="shared">Shared checkout</SelectItem>
                          <SelectItem value="worktree">New worktree</SelectItem>
                        </SelectPopup>
                      </Select>
                    </label>
                    <label className="space-y-1 text-xs">
                      <span className="font-medium">Permission mode</span>
                      <Select
                        value={candidate.runtimeMode ?? ANY_RUNTIME_MODE}
                        onValueChange={(value) => {
                          if (value === null) return;
                          replaceCandidate(
                            index,
                            updateCandidate(candidate, {
                              runtimeMode:
                                value === ANY_RUNTIME_MODE
                                  ? undefined
                                  : (value as NonNullable<RuntimeRouteCandidate["runtimeMode"]>),
                            }),
                          );
                        }}
                        disabled={disabled}
                      >
                        <SelectTrigger
                          size="sm"
                          aria-label={`Permission mode for ${candidateLabel} for ${workerRoleLabel(role)}`}
                        >
                          <SelectValue>
                            {(value: string | null) =>
                              value === null || value === ANY_RUNTIME_MODE
                                ? "Provider default"
                                : (runtimeModeConfig[value as keyof typeof runtimeModeConfig]
                                    ?.label ?? value)
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectPopup>
                          <SelectItem value={ANY_RUNTIME_MODE}>Provider default</SelectItem>
                          {modes.map((mode) => (
                            <SelectItem key={mode} value={mode}>
                              {runtimeModeConfig[mode].label}
                            </SelectItem>
                          ))}
                        </SelectPopup>
                      </Select>
                    </label>
                    <label className="space-y-1 text-xs">
                      <span className="font-medium">Interaction</span>
                      <Select
                        value={candidate.interactionMode ?? ANY_INTERACTION_MODE}
                        onValueChange={(value) => {
                          if (value === null) return;
                          replaceCandidate(
                            index,
                            updateCandidate(candidate, {
                              interactionMode:
                                value === ANY_INTERACTION_MODE
                                  ? undefined
                                  : (value as NonNullable<
                                      RuntimeRouteCandidate["interactionMode"]
                                    >),
                            }),
                          );
                        }}
                        disabled={disabled}
                      >
                        <SelectTrigger
                          size="sm"
                          aria-label={`Interaction mode for ${candidateLabel} for ${workerRoleLabel(role)}`}
                        >
                          <SelectValue>
                            {(value: string | null) =>
                              value === null || value === ANY_INTERACTION_MODE
                                ? "Provider default"
                                : value === "plan"
                                  ? "Plan mode"
                                  : "Default mode"
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectPopup>
                          <SelectItem value={ANY_INTERACTION_MODE}>Provider default</SelectItem>
                          <SelectItem value="default">Default mode</SelectItem>
                          <SelectItem value="plan">Plan mode</SelectItem>
                        </SelectPopup>
                      </Select>
                    </label>
                  </div>
                </details>
              </li>
            );
          })}
        </ol>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="xs"
          variant="outline"
          disabled={disabled || defaultWorkerCandidate(catalog.entries) === null}
          aria-label={`Add alternative worker for ${workerRoleLabel(role)}`}
          onClick={addCandidate}
        >
          Add alternative worker
        </Button>
      </div>

      <label className="block space-y-1">
        <span className="text-xs font-medium">If none of these workers can be used</span>
        <Select
          value={fallback}
          onValueChange={(value) => {
            if (value !== null && fallbackOptions.includes(value as F)) {
              onChange({ candidates, fallback: value as F });
            }
          }}
          disabled={disabled}
        >
          <SelectTrigger size="sm" aria-label={`Fallback for ${workerRoleLabel(role)}`}>
            <SelectValue>
              {(value: string | null) =>
                value === "continue" || value === "inherit" || value === "fail"
                  ? fallbackLabel(value)
                  : "Choose a fallback"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectPopup>
            {fallbackOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {fallbackLabel(option)}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
        <span className="block text-xs text-muted-foreground">{fallbackDescription(fallback)}</span>
      </label>

      <p className="text-xs text-muted-foreground">
        This is a preference, not a reservation. T3 checks provider availability and permissions
        again when work starts.
      </p>
    </div>
  );
}

export function WorkerRoutingEditor<F extends RuntimeRoutingFallback>({
  policy,
  fallbackOptions,
  catalog,
  environmentId,
  disabled = false,
  idPrefix,
  onChange,
}: {
  readonly policy: WorkerRoutingPolicyDraft<F>;
  readonly fallbackOptions: ReadonlyArray<F>;
  readonly catalog: WorkerRoutingCatalog;
  readonly environmentId: EnvironmentId;
  readonly disabled?: boolean;
  readonly idPrefix: string;
  readonly onChange: (next: WorkerRoutingPolicyDraft<F>) => void;
}) {
  const configuredRoles = new Set(policy.roleRoutes.map((route) => route.role));
  const availableRoles = WORKER_ROLE_ORDER.filter((role) => !configuredRoles.has(role));

  const addRole = (role: RuntimeWorkerRole) => {
    const candidate = defaultWorkerCandidate(catalog.entries);
    const fallback = fallbackOptions[0];
    if (fallback === undefined) return;
    onChange({
      roleRoutes: [
        ...policy.roleRoutes,
        {
          role,
          candidates: candidate === null ? [] : [candidate],
          fallback,
        },
      ],
    });
  };

  return (
    <div className="space-y-3" data-worker-routing-editor={idPrefix}>
      {policy.roleRoutes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No worker roles are configured. Add a role to prefer a provider or model for that kind of
          work.
        </p>
      ) : (
        <div className="space-y-3">
          {policy.roleRoutes.map((route, index) => (
            <WorkerRoleRouteEditor
              key={route.role}
              role={route.role}
              candidates={route.candidates}
              fallback={route.fallback}
              fallbackOptions={fallbackOptions}
              catalog={catalog}
              environmentId={environmentId}
              disabled={disabled}
              onChange={(next) =>
                onChange({
                  roleRoutes: policy.roleRoutes.map((current, currentIndex) =>
                    currentIndex === index ? { ...current, ...next } : current,
                  ),
                })
              }
              onRemoveRole={() =>
                onChange({
                  roleRoutes: policy.roleRoutes.filter(
                    (_current, currentIndex) => currentIndex !== index,
                  ),
                })
              }
            />
          ))}
        </div>
      )}

      {availableRoles.length > 0 ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-52 space-y-1">
            <p className="text-xs font-medium">Add a worker role</p>
            <Select
              value={null}
              onValueChange={(value) => {
                if (value !== null && WORKER_ROLE_ORDER.includes(value as RuntimeWorkerRole)) {
                  addRole(value as RuntimeWorkerRole);
                }
              }}
              disabled={disabled}
            >
              <SelectTrigger size="sm" aria-label={`Add a worker role to ${idPrefix}`}>
                <SelectValue placeholder="Choose a role" />
              </SelectTrigger>
              <SelectPopup>
                {availableRoles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {workerRoleLabel(role)}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          </div>
        </div>
      ) : null}
    </div>
  );
}
