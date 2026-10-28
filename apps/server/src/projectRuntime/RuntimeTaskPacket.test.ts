import { assert, it } from "@effect/vitest";
import {
  ProjectId,
  ProjectRuntimeHandoffId,
  ProjectRuntimeTaskId,
  type ProjectRuntimeHandoff,
  type ProjectRuntimeTask,
} from "@t3tools/contracts";

import { buildRuntimeTaskPacket } from "./RuntimeTaskPacket.ts";

const timestamp = "2026-10-28T00:00:00.000Z";
const projectId = ProjectId.make("packet-project");
const taskId = ProjectRuntimeTaskId.make("task-1");
const handoffId = ProjectRuntimeHandoffId.make("handoff-1");

const task: ProjectRuntimeTask = {
  taskId,
  projectId,
  title: "Ship the packet",
  objective: "Produce a deterministic prompt.",
  scope: "Implementation only.",
  outOfScope: "No execution changes.",
  owner: "user:maintainer",
  base: { branch: "rte/rte-040", revision: "abc123", notes: "Recorded only." },
  acceptanceCriteria: [
    { id: "c1", text: "Packet is stable." },
    { id: "c2", text: "Routing is absent." },
  ],
  verificationPlan: "Run the focused test.",
  status: "ready",
  blocker: null,
  verification: { milestone: "none", evidence: [] },
  latestHandoffId: handoffId,
  nextAction: "Test it.",
  revision: 4,
  createdAt: timestamp,
  updatedAt: timestamp,
  createdBy: "user:maintainer",
  updatedBy: "user:maintainer",
};

const handoff: ProjectRuntimeHandoff = {
  handoffId,
  projectId,
  taskId,
  checkpoint: "checkpoint-1",
  summary: "Previous attempt stopped.",
  result: "No files changed.",
  filesChanged: ["apps/server/src/projectRuntime/RuntimeTaskPacket.ts"],
  testsRun: ["vp test run RuntimeTaskPacket.test.ts"],
  testsNotRun: ["Full suite"],
  failuresRisks: "None recorded.",
  unresolvedDecisions: ["Whether to keep the golden test."],
  verification: { milestone: "none", evidence: [] },
  nextAction: "Implement the packet.",
  runtimeRevision: 2,
  taskRevision: 4,
  createdAt: timestamp,
  createdBy: "user:maintainer",
};

it("builds a deterministic task packet without routing", () => {
  const first = buildRuntimeTaskPacket(task, handoff);
  const second = buildRuntimeTaskPacket(task, handoff);
  assert.equal(first, second);
  assert.include(first, "# Runtime task: Ship the packet");
  assert.include(first, "Task revision: 4");
  assert.include(first, "## Objective\n\nProduce a deterministic prompt.");
  assert.include(first, "## Latest handoff");
  assert.include(first, "Handoff ID: handoff-1");
  assert.include(first, "Files changed:");
  assert.notInclude(first, "routing");
  assert.notInclude(first, "providerInstanceId");
});

it("builds a packet for a task with no handoff", () => {
  const packet = buildRuntimeTaskPacket({ ...task, latestHandoffId: null }, null);
  assert.include(packet, "## Scope");
  assert.notInclude(packet, "## Latest handoff");
});

it("bounds an oversized packet deterministically", () => {
  const packet = buildRuntimeTaskPacket({ ...task, scope: "x".repeat(70_000) }, null);
  assert.isAtMost(packet.length, 65_536);
  assert.include(packet, "[Task packet truncated.]");
});
