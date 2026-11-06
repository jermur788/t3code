import * as Context from "effect/Context";
import * as Layer from "effect/Layer";

/**
 * Server-controlled capability for the synthetic continuation experiment.
 * Fail-closed: only the exact env value `1` enables it, and task payloads, RPC
 * inputs, MCP tools and model output can never reach or flip it.
 */
export const CONTINUATION_GATE_ENV = "T3CODE_EXPERIMENTAL_CONTINUATION";

export interface ContinuationGateShape {
  readonly enabled: boolean;
}

export class ContinuationGate extends Context.Service<ContinuationGate, ContinuationGateShape>()(
  "t3/projectRuntime/RuntimeTaskContinuationGate/ContinuationGate",
) {}

export const layer = (enabled: boolean) =>
  Layer.succeed(ContinuationGate, ContinuationGate.of({ enabled }));

/** Only the exact string `1` enables the experiment; every other value stays off. */
export const enabledFromEnvironment = (
  environment: Readonly<Record<string, string | undefined>> = process.env,
): boolean => environment[CONTINUATION_GATE_ENV] === "1";

export const layerFromEnvironment = () =>
  Layer.sync(ContinuationGate, () => ContinuationGate.of({ enabled: enabledFromEnvironment() }));
