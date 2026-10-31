import {
  DEFAULT_SERVER_SETTINGS,
  ProviderDriverKind,
  ProviderInstanceId,
  type ServerProvider,
  UsageLimitSourceId,
  type UsageLimitSourceSnapshot,
} from "@t3tools/contracts";
import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import * as ProviderInstanceRegistry from "../provider/ProviderInstanceRegistry.ts";
import * as ProviderRegistry from "../provider/ProviderRegistry.ts";
import * as ServerSettingsModule from "../serverSettings.ts";
import * as UsageLimitSources from "../usage/UsageLimitSources.ts";
import * as RuntimeRoutingProviderView from "./RuntimeRoutingProviderView.ts";

const checkedAt = "2026-09-03T11:00:00.000Z";
const codexDriver = ProviderDriverKind.make("codex");

const managed = (instanceId: string, displayName: string, email: string): ServerProvider => ({
  instanceId: ProviderInstanceId.make(instanceId),
  driver: codexDriver,
  displayName,
  enabled: true,
  installed: true,
  version: null,
  status: "ready",
  auth: { status: "authenticated", email, subscriptionSharing: true },
  checkedAt,
  models: [],
  slashCommands: [],
  skills: [],
  usageLimits: {
    checkedAt,
    windows: [],
    unavailable: { reason: "unsupported", message: "Track usage in ChatGPT." },
  },
});

const sources: ReadonlyArray<UsageLimitSourceSnapshot> = [
  {
    id: UsageLimitSourceId.make("hub"),
    kind: "cliproxy",
    label: "Accounts",
    checkedAt,
    accounts: [
      {
        id: "work",
        driver: codexDriver,
        email: "work@example.com",
        usageLimits: {
          checkedAt,
          windows: [
            {
              id: "five_hour",
              kind: "session",
              label: "Session",
              usedPercent: 40,
            },
          ],
        },
      },
      {
        id: "personal",
        driver: codexDriver,
        email: "personal@example.com",
        usageLimits: {
          checkedAt,
          windows: [
            {
              id: "five_hour",
              kind: "session",
              label: "Session",
              usedPercent: 75,
            },
          ],
        },
      },
    ],
  },
];

const viewLayer = (
  providers: ReadonlyArray<ServerProvider>,
  usageSources: ReadonlyArray<UsageLimitSourceSnapshot> = sources,
) =>
  RuntimeRoutingProviderView.layer.pipe(
    Layer.provide(
      Layer.mock(ProviderRegistry.ProviderRegistry)({
        getProviders: Effect.succeed(providers),
      }),
    ),
    Layer.provide(
      Layer.mock(ProviderInstanceRegistry.ProviderInstanceRegistry)({
        listInstances: Effect.succeed([]),
      }),
    ),
    Layer.provide(
      Layer.mock(ServerSettingsModule.ServerSettingsService)({
        getSettings: Effect.succeed(DEFAULT_SERVER_SETTINGS),
      }),
    ),
    Layer.provide(
      Layer.mock(UsageLimitSources.UsageLimitSources)({
        current: Effect.succeed(usageSources),
      }),
    ),
  );

it.effect("reads separate bound capacity for two Codex provider instances", () =>
  Effect.gen(function* () {
    const view = yield* RuntimeRoutingProviderView.RuntimeRoutingProviderView;
    const state = yield* view.read;
    const work = state.capacityByInstanceId.get(ProviderInstanceId.make("codex-work"));
    const personal = state.capacityByInstanceId.get(ProviderInstanceId.make("codex-personal"));
    assert.equal(work?.source, "cliproxy");
    assert.equal(work?.sourceAccountId, "work");
    assert.equal(work?.limits.windows[0]?.usedPercent, 40);
    assert.equal(personal?.source, "cliproxy");
    assert.equal(personal?.sourceAccountId, "personal");
    assert.equal(personal?.limits.windows[0]?.usedPercent, 75);
    assert.notEqual(work?.sourceAccountId, personal?.sourceAccountId);
  }).pipe(
    Effect.provide(
      viewLayer([
        managed("codex-work", "Codex Work", "work@example.com"),
        managed("codex-personal", "Codex Personal", "personal@example.com"),
      ]),
    ),
  ),
);

it.effect("keeps ambiguous account identities native-only", () =>
  Effect.gen(function* () {
    const view = yield* RuntimeRoutingProviderView.RuntimeRoutingProviderView;
    const state = yield* view.read;
    const work = state.capacityByInstanceId.get(ProviderInstanceId.make("codex-work"));
    const personal = state.capacityByInstanceId.get(ProviderInstanceId.make("codex-personal"));
    assert.equal(work?.source, "native");
    assert.equal(personal?.source, "native");
    assert.equal(work?.limits.unavailable?.reason, "unsupported");
  }).pipe(
    Effect.provide(
      viewLayer(
        [
          {
            ...managed("codex-work", "Codex Work", "shared@example.com"),
            auth: {
              status: "authenticated",
              email: "shared@example.com",
              workspaceId: "ws-a",
              subscriptionSharing: true,
            },
          },
          {
            ...managed("codex-personal", "Codex Personal", "shared@example.com"),
            auth: {
              status: "authenticated",
              email: "shared@example.com",
              workspaceId: "ws-b",
              subscriptionSharing: true,
            },
          },
        ],
        [
          {
            id: UsageLimitSourceId.make("hub"),
            kind: "cliproxy",
            label: "Accounts",
            checkedAt,
            accounts: [
              {
                id: "shared",
                driver: codexDriver,
                email: "shared@example.com",
                usageLimits: {
                  checkedAt,
                  windows: [
                    {
                      id: "five_hour",
                      kind: "session",
                      label: "Session",
                      usedPercent: 55,
                    },
                  ],
                },
              },
            ],
          },
        ],
      ),
    ),
  ),
);
