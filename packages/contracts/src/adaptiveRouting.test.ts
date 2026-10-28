import * as Schema from "effect/Schema";
import { describe, expect, it } from "vite-plus/test";

import {
  ADAPTIVE_ROUTING_BOUNDS,
  AdaptiveAcceptedOutcome,
  AdaptiveCapacityPool,
  AdaptiveCapacityResetEvent,
  AdaptiveCapacitySnapshot,
  AdaptiveDifficultyPrediction,
  AdaptiveExecutionObservationReference,
  AdaptiveExperimentAssignment,
  AdaptiveOutcomeReconcileInput,
  AdaptiveRealizedDifficulty,
  AdaptiveRecommendationReceipt,
} from "./adaptiveRouting.ts";

const decodePrediction = Schema.decodeUnknownSync(AdaptiveDifficultyPrediction);
const decodeRealized = Schema.decodeUnknownSync(AdaptiveRealizedDifficulty);
const decodeObservation = Schema.decodeUnknownSync(AdaptiveExecutionObservationReference);
const decodePool = Schema.decodeUnknownSync(AdaptiveCapacityPool);
const decodeSnapshot = Schema.decodeUnknownSync(AdaptiveCapacitySnapshot);
const decodeResetEvent = Schema.decodeUnknownSync(AdaptiveCapacityResetEvent);
const decodeOutcome = Schema.decodeUnknownSync(AdaptiveAcceptedOutcome);
const decodeReconcileInput = Schema.decodeUnknownSync(AdaptiveOutcomeReconcileInput);
const decodeReceipt = Schema.decodeUnknownSync(AdaptiveRecommendationReceipt);
const decodeAssignment = Schema.decodeUnknownSync(AdaptiveExperimentAssignment);

const at = "2026-10-28T00:00:00.000Z";
const candidate = { instanceId: "codex", model: "gpt-6" };

const dimensions = {
  ambiguity: 0,
  scopeBreadth: 1,
  reasoningComplexity: 2,
  integrationToolComplexity: 3,
  risk: 4,
  verificationBurden: 2,
};
const assessment = { dimensions, band: "hard", confidence: 0.5 };

const prediction = {
  schemaVersion: 1,
  predictionId: "prediction-1",
  projectId: "project-1",
  taskId: "task-1",
  taskRevision: 1,
  assessment,
  predictionVersion: "v1",
  inputFingerprint: "sha256:abc",
  createdAt: at,
};

const realized = {
  schemaVersion: 1,
  realizedDifficultyId: "realized-1",
  projectId: "project-1",
  taskId: "task-1",
  assessment,
  derivationVersion: "v1",
  evidenceRefs: ["handoff:1"],
  createdAt: at,
};

const observation = {
  schemaVersion: 1,
  observationId: "observation-1",
  projectId: "project-1",
  taskId: "task-1",
  attemptId: "attempt-1",
  predictionId: "prediction-1",
  createdAt: at,
};

const pool = {
  schemaVersion: 1,
  capacityPoolId: "pool-1",
  providerDriver: "codex",
  identityQuality: "provider_instance",
  createdAt: at,
};

const unknownMeasurement = { quality: "unknown" };
const window = {
  windowId: "five-hour",
  windowType: "rolling",
  used: unknownMeasurement,
  remaining: unknownMeasurement,
  limit: unknownMeasurement,
};
const snapshot = {
  schemaVersion: 1,
  snapshotId: "snapshot-1",
  capacityPoolId: "pool-1",
  observedAt: at,
  sourceQuality: "t3_observed",
  windows: [window],
};

const resetEvent = {
  schemaVersion: 1,
  resetEventId: "reset-1",
  capacityPoolId: "pool-1",
  kind: "scheduled_reset",
  observedAt: at,
  sourceQuality: "provider_reported",
};

const provenance = { authority: "runtime_task", reference: "runtime-task:task-1", observedAt: at };
const outcome = {
  schemaVersion: 1,
  outcomeId: "outcome-1",
  projectId: "project-1",
  taskId: "task-1",
  state: "unresolved",
  revision: 1,
  provenance,
  evidenceRefs: [],
  reconciledAt: at,
};

const reconcileInput = {
  reconciliationId: "reconciliation-1",
  outcomeId: "outcome-1",
  expectedRevision: 1,
  state: "failed",
  provenance,
  evidenceRefs: [],
  reconciledAt: at,
};

const receipt = {
  schemaVersion: 1,
  recommendationReceiptId: "receipt-1",
  projectId: "project-1",
  taskId: "task-1",
  predictionId: "prediction-1",
  staticRouteSource: "task",
  eligibleCandidates: [candidate],
  recommendedCandidate: candidate,
  historicalSampleCount: 0,
  capacitySnapshotIds: ["snapshot-1"],
  confidence: 0.25,
  scoringVersion: "v1",
  reasons: ["no history"],
  uncertaintyNotes: [],
  createdAt: at,
};

const assignment = {
  schemaVersion: 1,
  assignmentId: "assignment-1",
  projectId: "project-1",
  taskId: "task-1",
  comparabilityKey: "key",
  comparabilityVersion: "v1",
  candidateSet: [candidate],
  assignedCandidate: candidate,
  method: "prospective",
  propensity: 0.5,
  capacitySnapshotIds: [],
  exclusionChecks: [],
  createdAt: at,
};

const repeat = <A>(value: A, count: number) => Array.from({ length: count }, () => value);

describe("adaptive routing contracts", () => {
  it("accepts a well-formed record of every kind", () => {
    expect(decodePrediction(prediction)).toEqual(prediction);
    expect(decodeRealized(realized)).toEqual(realized);
    expect(decodeObservation(observation)).toEqual(observation);
    expect(decodePool(pool)).toEqual(pool);
    expect(decodeSnapshot(snapshot)).toEqual(snapshot);
    expect(decodeResetEvent(resetEvent)).toEqual(resetEvent);
    expect(decodeOutcome(outcome)).toEqual(outcome);
    expect(decodeReconcileInput(reconcileInput)).toEqual(reconcileInput);
    expect(decodeReceipt(receipt)).toEqual(receipt);
    expect(decodeAssignment(assignment)).toEqual(assignment);
  });

  describe("schema version", () => {
    it("rejects any version other than 1", () => {
      for (const schemaVersion of [0, 2, "1", null]) {
        expect(() => decodePrediction({ ...prediction, schemaVersion })).toThrow();
        expect(() => decodeObservation({ ...observation, schemaVersion })).toThrow();
        expect(() => decodePool({ ...pool, schemaVersion })).toThrow();
        expect(() => decodeOutcome({ ...outcome, schemaVersion })).toThrow();
      }
    });

    it("rejects a missing version", () => {
      const { schemaVersion: _omitted, ...withoutVersion } = prediction;
      expect(() => decodePrediction(withoutVersion)).toThrow();
    });
  });

  describe("adaptive ids", () => {
    const max = ADAPTIVE_ROUTING_BOUNDS.idMaxLength;

    it("accepts an id at the maximum length and rejects one beyond it", () => {
      expect(decodePrediction({ ...prediction, predictionId: "p".repeat(max) }).predictionId).toBe(
        "p".repeat(max),
      );
      expect(() =>
        decodePrediction({ ...prediction, predictionId: "p".repeat(max + 1) }),
      ).toThrow();
      expect(() => decodePool({ ...pool, capacityPoolId: "c".repeat(max + 1) })).toThrow();
      expect(() => decodeOutcome({ ...outcome, outcomeId: "o".repeat(max + 1) })).toThrow();
    });

    it("rejects blank and whitespace-only ids", () => {
      for (const blank of ["", " ", "   ", "\t\n"]) {
        expect(() => decodePrediction({ ...prediction, predictionId: blank })).toThrow();
        expect(() => decodeObservation({ ...observation, observationId: blank })).toThrow();
        expect(() => decodeObservation({ ...observation, attemptId: blank })).toThrow();
        expect(() => decodePool({ ...pool, capacityPoolId: blank })).toThrow();
        expect(() => decodeReceipt({ ...receipt, predictionId: blank })).toThrow();
        expect(() => decodeOutcome({ ...outcome, taskId: blank })).toThrow();
      }
    });

    it("rejects non-string ids", () => {
      expect(() => decodePrediction({ ...prediction, predictionId: 1 })).toThrow();
      expect(() => decodeObservation({ ...observation, taskId: null })).toThrow();
    });
  });

  describe("version, fingerprint, label, reference and reason lengths", () => {
    it("bounds version and fingerprint strings", () => {
      const { versionMaxLength, fingerprintMaxLength } = ADAPTIVE_ROUTING_BOUNDS;
      expect(
        decodePrediction({ ...prediction, predictionVersion: "v".repeat(versionMaxLength) }),
      ).toBeDefined();
      expect(() =>
        decodePrediction({ ...prediction, predictionVersion: "v".repeat(versionMaxLength + 1) }),
      ).toThrow();
      expect(
        decodePrediction({ ...prediction, inputFingerprint: "f".repeat(fingerprintMaxLength) }),
      ).toBeDefined();
      expect(() =>
        decodePrediction({
          ...prediction,
          inputFingerprint: "f".repeat(fingerprintMaxLength + 1),
        }),
      ).toThrow();
      expect(() => decodePrediction({ ...prediction, inputFingerprint: "" })).toThrow();
    });

    it("bounds evidence references", () => {
      const { referenceMaxLength } = ADAPTIVE_ROUTING_BOUNDS;
      expect(
        decodeRealized({ ...realized, evidenceRefs: ["r".repeat(referenceMaxLength)] }),
      ).toBeDefined();
      expect(() =>
        decodeRealized({ ...realized, evidenceRefs: ["r".repeat(referenceMaxLength + 1)] }),
      ).toThrow();
      expect(() => decodeRealized({ ...realized, evidenceRefs: [" "] })).toThrow();
    });

    it("bounds reasons and the user-defined display alias", () => {
      const { reasonMaxLength, labelMaxLength } = ADAPTIVE_ROUTING_BOUNDS;
      expect(decodeReceipt({ ...receipt, reasons: ["r".repeat(reasonMaxLength)] })).toBeDefined();
      expect(() =>
        decodeReceipt({ ...receipt, reasons: ["r".repeat(reasonMaxLength + 1)] }),
      ).toThrow();
      expect(() => decodeReceipt({ ...receipt, reasons: [""] })).toThrow();
      expect(
        decodePool({ ...pool, displayAlias: "a".repeat(labelMaxLength) }).displayAlias,
      ).toHaveLength(labelMaxLength);
      expect(() => decodePool({ ...pool, displayAlias: "a".repeat(labelMaxLength + 1) })).toThrow();
      expect(() => decodePool({ ...pool, displayAlias: "  " })).toThrow();
    });

    it("bounds a capacity measurement unit", () => {
      const measurement = (unit: string) => ({
        ...snapshot,
        windows: [{ ...window, used: { quality: "exact", value: 1, unit } }],
      });
      expect(
        decodeSnapshot(measurement("u".repeat(ADAPTIVE_ROUTING_BOUNDS.unitMaxLength))),
      ).toBeDefined();
      expect(() =>
        decodeSnapshot(measurement("u".repeat(ADAPTIVE_ROUTING_BOUNDS.unitMaxLength + 1))),
      ).toThrow();
      expect(() => decodeSnapshot(measurement(""))).toThrow();
    });
  });

  describe("difficulty dimensions", () => {
    const withDimension = (key: keyof typeof dimensions, value: unknown) => ({
      ...prediction,
      assessment: { ...assessment, dimensions: { ...dimensions, [key]: value } },
    });

    it("accepts every dimension at 0 and 4", () => {
      for (const key of Object.keys(dimensions) as Array<keyof typeof dimensions>) {
        expect(decodePrediction(withDimension(key, 0))).toBeDefined();
        expect(decodePrediction(withDimension(key, 4))).toBeDefined();
      }
    });

    it("rejects every dimension outside 0..4, non-integers, and non-numbers", () => {
      for (const key of Object.keys(dimensions) as Array<keyof typeof dimensions>) {
        for (const bad of [-1, 5, 1.5, Number.NaN, "2", null]) {
          expect(() => decodePrediction(withDimension(key, bad))).toThrow();
        }
      }
    });

    it("rejects a missing dimension", () => {
      const { risk: _omitted, ...incomplete } = dimensions;
      expect(() =>
        decodePrediction({
          ...prediction,
          assessment: { ...assessment, dimensions: incomplete },
        }),
      ).toThrow();
    });

    it("applies the same bounds to realized difficulty", () => {
      expect(() =>
        decodeRealized({
          ...realized,
          assessment: { ...assessment, dimensions: { ...dimensions, ambiguity: 5 } },
        }),
      ).toThrow();
    });

    it("rejects an unknown difficulty band", () => {
      for (const band of ["", "easy", "ROUTINE", 1]) {
        expect(() =>
          decodePrediction({ ...prediction, assessment: { ...assessment, band } }),
        ).toThrow();
      }
      for (const band of ["routine", "moderate", "hard", "critical"]) {
        expect(
          decodePrediction({ ...prediction, assessment: { ...assessment, band } }),
        ).toBeDefined();
      }
    });
  });

  describe("confidence", () => {
    it("accepts the closed interval 0..1", () => {
      for (const confidence of [0, 0.5, 1]) {
        expect(
          decodePrediction({ ...prediction, assessment: { ...assessment, confidence } }),
        ).toBeDefined();
        expect(decodeReceipt({ ...receipt, confidence })).toBeDefined();
      }
      expect(decodeAssignment({ ...assignment, propensity: 0 })).toBeDefined();
      expect(decodeAssignment({ ...assignment, propensity: 1 })).toBeDefined();
    });

    it("rejects values outside 0..1 and non-finite numbers", () => {
      for (const confidence of [-0.01, 1.01, 2, Number.NaN, Number.POSITIVE_INFINITY, "0.5"]) {
        expect(() =>
          decodePrediction({ ...prediction, assessment: { ...assessment, confidence } }),
        ).toThrow();
        expect(() => decodeReceipt({ ...receipt, confidence })).toThrow();
        expect(() => decodeAssignment({ ...assignment, propensity: confidence })).toThrow();
      }
    });

    it("allows an experiment assignment without a propensity", () => {
      const { propensity: _omitted, ...withoutPropensity } = assignment;
      expect(decodeAssignment(withoutPropensity)).toEqual(withoutPropensity);
    });
  });

  describe("revisions", () => {
    it("requires positive integer revisions", () => {
      for (const revision of [0, -1, 1.5, "1", null]) {
        expect(() => decodeOutcome({ ...outcome, revision })).toThrow();
        expect(() => decodePrediction({ ...prediction, taskRevision: revision })).toThrow();
        expect(() =>
          decodeReconcileInput({ ...reconcileInput, expectedRevision: revision }),
        ).toThrow();
      }
      expect(decodeOutcome({ ...outcome, revision: 2 }).revision).toBe(2);
      expect(
        decodeReconcileInput({ ...reconcileInput, expectedRevision: 7 }).expectedRevision,
      ).toBe(7);
    });

    it("allows a zero historical sample count but not a negative or fractional one", () => {
      expect(decodeReceipt({ ...receipt, historicalSampleCount: 0 })).toBeDefined();
      for (const historicalSampleCount of [-1, 0.5]) {
        expect(() => decodeReceipt({ ...receipt, historicalSampleCount })).toThrow();
      }
    });
  });

  describe("collection limits", () => {
    const bounds = ADAPTIVE_ROUTING_BOUNDS;

    // The limit tests below derive their sizes from the constants, so pin the
    // constants themselves; a silently widened bound must fail here.
    it("pins the approved bound values", () => {
      expect(bounds).toEqual({
        idMaxLength: 200,
        versionMaxLength: 128,
        fingerprintMaxLength: 256,
        labelMaxLength: 200,
        unitMaxLength: 64,
        referenceMaxLength: 512,
        reasonMaxLength: 2_000,
        evidenceMaxCount: 100,
        reasonsMaxCount: 50,
        candidatesMaxCount: 50,
        windowsMaxCount: 50,
        snapshotsMaxCount: 50,
        exclusionChecksMaxCount: 50,
      });
    });

    it("limits evidence references on realized difficulty, outcomes and reconcile input", () => {
      const atLimit = repeat("ref", bounds.evidenceMaxCount);
      const overLimit = repeat("ref", bounds.evidenceMaxCount + 1);
      expect(decodeRealized({ ...realized, evidenceRefs: atLimit })).toBeDefined();
      expect(decodeOutcome({ ...outcome, evidenceRefs: atLimit })).toBeDefined();
      expect(decodeReconcileInput({ ...reconcileInput, evidenceRefs: atLimit })).toBeDefined();
      expect(() => decodeRealized({ ...realized, evidenceRefs: overLimit })).toThrow();
      expect(() => decodeOutcome({ ...outcome, evidenceRefs: overLimit })).toThrow();
      expect(() => decodeReconcileInput({ ...reconcileInput, evidenceRefs: overLimit })).toThrow();
    });

    it("limits reasons and uncertainty notes on a recommendation receipt", () => {
      const atLimit = repeat("because", bounds.reasonsMaxCount);
      const overLimit = repeat("because", bounds.reasonsMaxCount + 1);
      expect(
        decodeReceipt({ ...receipt, reasons: atLimit, uncertaintyNotes: atLimit }),
      ).toBeDefined();
      expect(() => decodeReceipt({ ...receipt, reasons: overLimit })).toThrow();
      expect(() => decodeReceipt({ ...receipt, uncertaintyNotes: overLimit })).toThrow();
    });

    it("limits eligible candidates and candidate sets", () => {
      const atLimit = repeat(candidate, bounds.candidatesMaxCount);
      const overLimit = repeat(candidate, bounds.candidatesMaxCount + 1);
      expect(decodeReceipt({ ...receipt, eligibleCandidates: atLimit })).toBeDefined();
      expect(decodeAssignment({ ...assignment, candidateSet: atLimit })).toBeDefined();
      expect(() => decodeReceipt({ ...receipt, eligibleCandidates: overLimit })).toThrow();
      expect(() => decodeAssignment({ ...assignment, candidateSet: overLimit })).toThrow();
    });

    it("limits capacity windows per snapshot", () => {
      expect(
        decodeSnapshot({ ...snapshot, windows: repeat(window, bounds.windowsMaxCount) }),
      ).toBeDefined();
      expect(() =>
        decodeSnapshot({ ...snapshot, windows: repeat(window, bounds.windowsMaxCount + 1) }),
      ).toThrow();
    });

    it("limits referenced snapshot ids and exclusion checks", () => {
      const snapshots = (count: number) => repeat("snapshot-1", count);
      expect(
        decodeReceipt({ ...receipt, capacitySnapshotIds: snapshots(bounds.snapshotsMaxCount) }),
      ).toBeDefined();
      expect(() =>
        decodeReceipt({ ...receipt, capacitySnapshotIds: snapshots(bounds.snapshotsMaxCount + 1) }),
      ).toThrow();
      expect(() =>
        decodeAssignment({
          ...assignment,
          capacitySnapshotIds: snapshots(bounds.snapshotsMaxCount + 1),
        }),
      ).toThrow();
      expect(
        decodeAssignment({
          ...assignment,
          exclusionChecks: repeat("check", bounds.exclusionChecksMaxCount),
        }),
      ).toBeDefined();
      expect(() =>
        decodeAssignment({
          ...assignment,
          exclusionChecks: repeat("check", bounds.exclusionChecksMaxCount + 1),
        }),
      ).toThrow();
    });
  });

  describe("enum and state values", () => {
    it("accepts every accepted-outcome state and rejects unknown ones", () => {
      for (const state of [
        "unresolved",
        "accepted_without_rework",
        "accepted_after_rework",
        "rejected_or_superseded",
        "failed",
        "cancelled",
      ]) {
        expect(decodeOutcome({ ...outcome, state }).state).toBe(state);
        expect(decodeReconcileInput({ ...reconcileInput, state }).state).toBe(state);
      }
      for (const state of ["", "accepted", "UNRESOLVED", "done", 0]) {
        expect(() => decodeOutcome({ ...outcome, state })).toThrow();
        expect(() => decodeReconcileInput({ ...reconcileInput, state })).toThrow();
      }
    });

    it("rejects unknown outcome authorities", () => {
      expect(() =>
        decodeOutcome({ ...outcome, provenance: { ...provenance, authority: "model" } }),
      ).toThrow();
      expect(() =>
        decodeOutcome({ ...outcome, provenance: { ...provenance, reference: "" } }),
      ).toThrow();
    });

    it("rejects unknown route sources, assignment methods, quality and reset kinds", () => {
      expect(() => decodeReceipt({ ...receipt, staticRouteSource: "adaptive" })).toThrow();
      expect(() => decodeAssignment({ ...assignment, method: "automatic" })).toThrow();
      expect(() => decodeSnapshot({ ...snapshot, sourceQuality: "guessed" })).toThrow();
      expect(() => decodeResetEvent({ ...resetEvent, kind: "purchase" })).toThrow();
      expect(() => decodeResetEvent({ ...resetEvent, sourceQuality: "guessed" })).toThrow();
    });

    it("accepts every reset kind and source quality", () => {
      for (const kind of [
        "scheduled_reset",
        "observed_bonus_reset",
        "manual_correction",
        "inferred_reset",
      ]) {
        expect(decodeResetEvent({ ...resetEvent, kind }).kind).toBe(kind);
      }
      for (const sourceQuality of [
        "provider_reported",
        "t3_observed",
        "user_entered",
        "inferred",
      ]) {
        expect(decodeSnapshot({ ...snapshot, sourceQuality }).sourceQuality).toBe(sourceQuality);
      }
    });

    it("allows a null recommendation but requires the field", () => {
      expect(
        decodeReceipt({ ...receipt, recommendedCandidate: null }).recommendedCandidate,
      ).toBeNull();
      const { recommendedCandidate: _omitted, ...withoutField } = receipt;
      expect(() => decodeReceipt(withoutField)).toThrow();
    });
  });

  describe("capacity measurements", () => {
    it("represents unavailable telemetry as an explicit unknown", () => {
      const decoded = decodeSnapshot(snapshot);
      expect(decoded.windows[0]!.used).toEqual({ quality: "unknown" });
      expect(decoded.windows[0]!.remaining).toEqual({ quality: "unknown" });
      expect(decoded.windows[0]!.limit).toEqual({ quality: "unknown" });
    });

    it("accepts exact and approximate measurements with a value and unit", () => {
      const decoded = decodeSnapshot({
        ...snapshot,
        windows: [
          {
            ...window,
            used: { quality: "exact", value: 12, unit: "messages" },
            remaining: { quality: "approximate", value: 38.5, unit: "messages" },
            limit: { quality: "exact", value: 50, unit: "messages" },
            resetAt: at,
          },
        ],
      });
      expect(decoded.windows[0]!.remaining).toEqual({
        quality: "approximate",
        value: 38.5,
        unit: "messages",
      });
    });

    it("does not let a measured quality omit its value or unit", () => {
      for (const used of [
        { quality: "exact" },
        { quality: "exact", value: 1 },
        { quality: "approximate", unit: "messages" },
        { quality: "exact", value: "1", unit: "messages" },
      ]) {
        expect(() => decodeSnapshot({ ...snapshot, windows: [{ ...window, used }] })).toThrow();
      }
    });

    it("rejects an unrecognised measurement quality", () => {
      expect(() =>
        decodeSnapshot({ ...snapshot, windows: [{ ...window, used: { quality: "guessed" } }] }),
      ).toThrow();
    });

    it("never carries a guessed value on an unknown measurement", () => {
      const decoded = decodeSnapshot({
        ...snapshot,
        windows: [{ ...window, used: { quality: "unknown", value: 99, unit: "messages" } }],
      });
      expect(decoded.windows[0]!.used).toEqual({ quality: "unknown" });
    });
  });

  describe("capacity pool identity", () => {
    it("accepts an opaque pool id with no provider-derived identity", () => {
      const decoded = decodePool({
        ...pool,
        capacityPoolId: "8f14e45f-ceea-467a-9575-0c1ff5a1a3b2",
        identityQuality: "unknown",
      });
      expect(decoded.capacityPoolId).toBe("8f14e45f-ceea-467a-9575-0c1ff5a1a3b2");
      expect(decoded.providerInstanceId).toBeUndefined();
      expect(decoded.displayAlias).toBeUndefined();
    });

    it("accepts every identity quality and rejects others", () => {
      for (const identityQuality of [
        "provider_instance",
        "provider_stable_alias",
        "user_defined_alias",
        "unknown",
      ]) {
        expect(decodePool({ ...pool, identityQuality }).identityQuality).toBe(identityQuality);
      }
      for (const identityQuality of ["account", "email", "billing", ""]) {
        expect(() => decodePool({ ...pool, identityQuality })).toThrow();
      }
    });

    it("accepts a provider instance and a user-defined display alias", () => {
      const decoded = decodePool({
        ...pool,
        providerInstanceId: "codex-work",
        identityQuality: "user_defined_alias",
        displayAlias: "Work laptop",
      });
      expect(decoded.providerInstanceId).toBe("codex-work");
      expect(decoded.displayAlias).toBe("Work laptop");
    });

    it("requires a valid provider driver and instance slug", () => {
      for (const providerDriver of ["", "1codex", "has space", "x".repeat(65)]) {
        expect(() => decodePool({ ...pool, providerDriver })).toThrow();
      }
      expect(() => decodePool({ ...pool, providerInstanceId: "not a slug" })).toThrow();
      const { providerDriver: _omitted, ...withoutDriver } = pool;
      expect(() => decodePool(withoutDriver)).toThrow();
    });

    it("does not retain account, billing or payment fields", () => {
      const decoded = decodePool({
        ...pool,
        accountEmail: "someone@example.com",
        billingAccountId: "acct_123",
        paymentMethod: "card",
      });
      expect(Object.keys(decoded).toSorted()).toEqual(
        [
          "capacityPoolId",
          "createdAt",
          "identityQuality",
          "providerDriver",
          "schemaVersion",
        ].toSorted(),
      );
    });
  });

  describe("required references", () => {
    it("requires the task, attempt and prediction identities on an observation", () => {
      for (const key of ["projectId", "taskId", "attemptId", "predictionId"] as const) {
        const { [key]: _omitted, ...incomplete } = observation;
        expect(() => decodeObservation(incomplete)).toThrow();
      }
    });

    it("treats the optional observation links as optional but still validated", () => {
      expect(
        decodeObservation({
          ...observation,
          realizedDifficultyId: "realized-1",
          outcomeId: "outcome-1",
          capacityBeforeSnapshotId: "snapshot-1",
          capacityAfterSnapshotId: "snapshot-2",
          experimentAssignmentId: "assignment-1",
        }).realizedDifficultyId,
      ).toBe("realized-1");
      expect(() => decodeObservation({ ...observation, outcomeId: "" })).toThrow();
    });
  });
});
