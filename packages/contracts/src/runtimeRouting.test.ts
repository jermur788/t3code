import * as Schema from "effect/Schema";
import { describe, expect, it } from "vite-plus/test";

import { ProviderInstanceId } from "./providerInstance.ts";
import { ProjectRuntimeTaskCreateInput } from "./projectRuntime.ts";
import {
  RuntimeProfileRoutingPolicy,
  RuntimeRouteCandidate,
  RuntimeRoutingPolicy,
  RUNTIME_ROUTING_BOUNDS,
} from "./runtimeRouting.ts";

const decodeCandidate = Schema.decodeUnknownSync(RuntimeRouteCandidate);
const decodePolicy = Schema.decodeUnknownSync(RuntimeRoutingPolicy);
const decodeProfilePolicy = Schema.decodeUnknownSync(RuntimeProfileRoutingPolicy);
const decodeTaskCreate = Schema.decodeUnknownSync(ProjectRuntimeTaskCreateInput);

const codex = ProviderInstanceId.make("codex");
const baseCandidate = { providerInstanceId: codex, model: "gpt-6" };
const baseRoute = {
  role: "implementation" as const,
  candidates: [baseCandidate],
  fallback: "inherit" as const,
};

describe("runtime routing contracts", () => {
  it("accepts an instance route and a driver-only route", () => {
    expect(decodeCandidate(baseCandidate)).toEqual(baseCandidate);
    expect(decodeCandidate({ driverKind: "opencode", model: "deepseek-v4.1-flash" })).toEqual({
      driverKind: "opencode",
      model: "deepseek-v4.1-flash",
    });
  });

  it("requires a provider instance or driver", () => {
    expect(() => decodeCandidate({ model: "gpt-6" })).toThrow();
  });

  it("bounds candidates and rejects duplicate roles", () => {
    const candidates = Array.from(
      { length: RUNTIME_ROUTING_BOUNDS.candidatesPerRoleMax + 1 },
      () => baseCandidate,
    );
    expect(() => decodePolicy({ roleRoutes: [{ ...baseRoute, candidates }] })).toThrow();
    expect(() =>
      decodePolicy({
        roleRoutes: [baseRoute, { ...baseRoute, role: "review" }, baseRoute],
      }),
    ).toThrow();
  });

  it("does not let the terminal profile layer continue", () => {
    expect(() =>
      decodeProfilePolicy({
        roleRoutes: [{ ...baseRoute, fallback: "continue" }],
      }),
    ).toThrow();
    expect(
      decodeProfilePolicy({
        roleRoutes: [{ ...baseRoute, fallback: "fail" }],
      }),
    ).toEqual({ roleRoutes: [{ ...baseRoute, fallback: "fail" }] });
  });

  it("carries task routing as ordinary task state", () => {
    const input = decodeTaskCreate({
      title: "Route this",
      scope: "Routing",
      acceptanceCriteria: [],
      routing: baseRoute,
    });
    expect(input.routing).toEqual(baseRoute);
  });
});
