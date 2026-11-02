import {
  DEFAULT_SERVER_SETTINGS,
  type EnvironmentId,
  type ProjectId,
  type ProviderInstanceId,
} from "@t3tools/contracts";

import { useMergedSettings } from "../../hooks/useSettings";
import { getCustomModelOptionsByInstance } from "../../modelSelection";
import { providerInstanceEntriesFor, type ProviderInstanceEntry } from "../../providerInstances";
import { useEnvironmentProviders } from "../../state/environments";
import { EMPTY_SERVER_PROVIDERS } from "../../state/server";
import type { ModelEsque } from "../chat/providerIconUtils";
import { useOptionalSettingsScope } from "./SettingsScopeContext";

export interface WorkerRoutingCatalog {
  readonly entries: ReadonlyArray<ProviderInstanceEntry>;
  readonly modelOptionsByInstance: ReadonlyMap<ProviderInstanceId, ReadonlyArray<ModelEsque>>;
}

export function useWorkerRoutingCatalog(target: {
  readonly environmentId: EnvironmentId;
  readonly projectId: ProjectId | null;
}): WorkerRoutingCatalog {
  const providersByEnvironment = useEnvironmentProviders();
  const scope = useOptionalSettingsScope();
  const settings = useMergedSettings(scope?.target?.settings ?? DEFAULT_SERVER_SETTINGS);
  const providers = providersByEnvironment.get(target.environmentId) ?? EMPTY_SERVER_PROVIDERS;
  return {
    entries: providerInstanceEntriesFor(providers, settings, target.projectId),
    modelOptionsByInstance: getCustomModelOptionsByInstance(settings, providers),
  };
}
