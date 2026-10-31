import {
  type ProviderInstanceId,
  type ServerProvider,
  type ServerSettings,
} from "@t3tools/contracts";
import {
  type ProviderInstanceCapacity,
  resolveProviderInstanceCapacity,
} from "@t3tools/shared/usageLimits";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import * as ProviderInstanceRegistry from "../provider/ProviderInstanceRegistry.ts";
import * as ProviderRegistry from "../provider/ProviderRegistry.ts";
import * as ServerSettingsModule from "../serverSettings.ts";
import * as UsageLimitSources from "../usage/UsageLimitSources.ts";

/** A read-only view over existing provider state; Runtime does not keep a catalog. */
export class RuntimeRoutingProviderView extends Context.Service<
  RuntimeRoutingProviderView,
  {
    readonly read: Effect.Effect<{
      readonly providers: ReadonlyArray<ServerProvider>;
      readonly orchestrationCapableInstanceIds: ReadonlySet<ProviderInstanceId>;
      readonly settings: ServerSettings;
      readonly capacityByInstanceId: ReadonlyMap<ProviderInstanceId, ProviderInstanceCapacity>;
    }>;
  }
>()("t3/runtimeRouting/RuntimeRoutingProviderView") {}

export const layer = Layer.effect(
  RuntimeRoutingProviderView,
  Effect.gen(function* () {
    const providers = yield* ProviderRegistry.ProviderRegistry;
    const instances = yield* ProviderInstanceRegistry.ProviderInstanceRegistry;
    const settings = yield* ServerSettingsModule.ServerSettingsService;
    const usageSources = yield* UsageLimitSources.UsageLimitSources;
    return RuntimeRoutingProviderView.of({
      read: Effect.gen(function* () {
        // Every live instance carries a V2 orchestration adapter; unavailable
        // instances are absent from this list, and provider snapshots report why.
        const [providerList, liveInstances, currentSettings, sources] = yield* Effect.all(
          [
            providers.getProviders,
            instances.listInstances,
            settings.getSettings.pipe(Effect.orDie),
            usageSources.current,
          ],
          { concurrency: "unbounded" },
        );
        const capacityByInstanceId = new Map(
          resolveProviderInstanceCapacity(providerList, sources).map((capacity) => [
            capacity.instanceId,
            capacity,
          ]),
        );
        return {
          providers: providerList,
          orchestrationCapableInstanceIds: new Set(
            liveInstances.map((instance) => instance.instanceId),
          ),
          settings: currentSettings,
          capacityByInstanceId,
        };
      }),
    });
  }),
);
