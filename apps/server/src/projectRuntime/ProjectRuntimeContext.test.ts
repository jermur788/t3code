import { assert, it } from "@effect/vitest";
import {
  PROJECT_RUNTIME_BOUNDS,
  ProjectId,
  type ProjectRuntimeHandoff,
  ProjectRuntimeHandoffId,
  type ProjectRuntimeInstructions,
  type ProjectRuntimeSource,
  ProjectRuntimeSourceId,
  type ProjectRuntimeTask,
  ProjectRuntimeTaskId,
} from "@t3tools/contracts";

import { disabledContext, packContext } from "./ProjectRuntimeContext.ts";

const projectId = ProjectId.make("context-project");
const status = { enabled: true, version: 1 as const, revision: 7 };
const timestamp = "2026-10-23T00:00:00.000Z";

const source = (index: number, title = `Source ${index}`): ProjectRuntimeSource => ({
  sourceId: ProjectRuntimeSourceId.make(`source-${index}`),
  projectId,
  title,
  role: "reference",
  relativePath: `docs/${index}.md`,
  enabled: true,
  revision: 3,
  createdAt: timestamp,
  updatedAt: timestamp,
  createdBy: "user:maintainer",
  updatedBy: "user:maintainer",
});

const task = (index: number): ProjectRuntimeTask => ({
  taskId: ProjectRuntimeTaskId.make(`task-${index}`),
  projectId,
  title: `Task ${index}`,
  status: "active",
  scope: "Scope that never reaches the summary",
  acceptanceCriteria: "Criteria that never reach the summary",
  revision: 2,
  createdAt: timestamp,
  updatedAt: timestamp,
  createdBy: "user:maintainer",
  updatedBy: "user:maintainer",
});

const handoff = (index: number, summary: string): ProjectRuntimeHandoff => ({
  handoffId: ProjectRuntimeHandoffId.make(`handoff-${index}`),
  projectId,
  taskId: ProjectRuntimeTaskId.make(`task-${index}`),
  checkpoint: `checkpoint ${index}`,
  summary,
  changes: "Detail that never reaches the reference",
  runtimeRevision: 4,
  taskRevision: 2,
  createdAt: timestamp,
  createdBy: "user:maintainer",
});

const candidates = (
  parts: Partial<Parameters<typeof packContext>[0]> = {},
): Parameters<typeof packContext>[0] => ({
  projectId,
  status,
  instructions: null,
  sources: [],
  tasks: [],
  ...parts,
});

const utf8 = (value: unknown) => Buffer.byteLength(JSON.stringify(value), "utf8");

it("returns only descriptors, never registry bookkeeping or contents", () => {
  const context = packContext(candidates({ sources: [source(1)] }));
  assert.deepEqual(context.sources, [
    {
      sourceId: ProjectRuntimeSourceId.make("source-1"),
      title: "Source 1",
      role: "reference",
      relativePath: "docs/1.md",
      enabled: true,
    },
  ]);
  assert.deepEqual(context.truncated, { sources: false, tasks: false, handoffs: false });
});

it("builds a disabled context with nothing truncated", () => {
  assert.deepEqual(disabledContext(projectId, { ...status, enabled: false }), {
    projectId,
    status: { enabled: false, version: 1, revision: 7 },
    instructions: null,
    sources: [],
    tasks: [],
    truncated: { sources: false, tasks: false, handoffs: false },
  });
});

it("truncates by count only when a record beyond the limit exists", () => {
  const { contextMaxSources, contextMaxTasks } = PROJECT_RUNTIME_BOUNDS;
  const sourcesOf = (count: number) =>
    Array.from({ length: count }, (_, index) => source(index, "S"));
  const tasksOf = (count: number) =>
    Array.from({ length: count }, (_, index) => ({
      task: task(index),
      latestHandoff: null,
    }));

  const exact = packContext(
    candidates({ sources: sourcesOf(contextMaxSources), tasks: tasksOf(contextMaxTasks) }),
  );
  assert.lengthOf(exact.sources, contextMaxSources);
  assert.lengthOf(exact.tasks, contextMaxTasks);
  assert.deepEqual(exact.truncated, { sources: false, tasks: false, handoffs: false });

  const over = packContext(
    candidates({
      sources: sourcesOf(contextMaxSources + 1),
      tasks: tasksOf(contextMaxTasks + 1),
    }),
  );
  assert.lengthOf(over.sources, contextMaxSources);
  assert.lengthOf(over.tasks, contextMaxTasks);
  assert.deepEqual(over.sources.at(-1)?.sourceId, `source-${contextMaxSources - 1}`);
  assert.deepEqual(over.truncated, { sources: true, tasks: true, handoffs: false });
});

it("budgets the serialized UTF-8 bytes of each collection, commas included", () => {
  // 1, 2, 3 and 4 bytes per character, so bytes and characters disagree.
  const titles = ["a".repeat(30), "é".repeat(30), "日".repeat(30), "😀".repeat(30)];
  const sources = titles.map((title, index) => source(index, title));
  const descriptors = packContext(candidates({ sources })).sources;
  assert.lengthOf(descriptors, 4);
  const sizes = descriptors.map(utf8);
  assert.isBelow(sizes[0]!, sizes[3]!);
  const total = sizes.reduce((sum, size) => sum + size, 0) + (sizes.length - 1);

  assert.lengthOf(packContext(candidates({ sources }), total).sources, 4);
  assert.deepEqual(packContext(candidates({ sources }), total).truncated.sources, false);

  const short = packContext(candidates({ sources }), total - 1);
  assert.lengthOf(short.sources, 3);
  assert.deepEqual(short.truncated, { sources: true, tasks: false, handoffs: false });
  // Characters would have admitted all four: the budget is bytes.
  assert.isBelow(JSON.stringify(sources.map((entry) => entry.title)).length, total);

  assert.deepEqual(packContext(candidates({ sources }), 0).sources, []);
});

it("keeps instructions whole whatever the budget", () => {
  const text = "指示".repeat(PROJECT_RUNTIME_BOUNDS.instructionsMaxLength / 2);
  const instructions: ProjectRuntimeInstructions = {
    projectId,
    instructions: text,
    revision: 1,
    updatedAt: timestamp,
    updatedBy: "user:maintainer",
  };
  assert.isAbove(Buffer.byteLength(text, "utf8"), PROJECT_RUNTIME_BOUNDS.contextMaxBytes);
  const context = packContext(candidates({ instructions, sources: [source(1)] }), 10);
  assert.equal(context.instructions?.instructions, text);
  assert.deepEqual(context.sources, []);
  assert.isTrue(context.truncated.sources);
});

it("spends one budget on sources, then tasks", () => {
  const sources = [source(1, "S")];
  const tasks = [0, 1].map((index) => ({ task: task(index), latestHandoff: null }));
  const sourceBytes = utf8(packContext(candidates({ sources })).sources[0]);
  const taskBytes = utf8(packContext(candidates({ tasks })).tasks[0]);

  const fits = packContext(candidates({ sources, tasks }), sourceBytes + taskBytes * 2 + 1);
  assert.lengthOf(fits.sources, 1);
  assert.lengthOf(fits.tasks, 2);

  const tight = packContext(candidates({ sources, tasks }), sourceBytes + taskBytes * 2);
  assert.lengthOf(tight.sources, 1);
  assert.lengthOf(tight.tasks, 1);
  assert.deepEqual(tight.truncated, { sources: false, tasks: true, handoffs: false });
});

it("keeps a task without its handoff reference when only the reference does not fit", () => {
  const long = "日".repeat(2_000);
  const tasks = [
    { task: task(0), latestHandoff: handoff(0, "short") },
    { task: task(1), latestHandoff: handoff(1, long) },
    { task: task(2), latestHandoff: handoff(2, "short") },
  ];
  const everything = packContext(candidates({ tasks })).tasks;
  const bareBytes = utf8({ ...everything[1], latestHandoff: null });
  const budget = utf8(everything[0]) + 1 + bareBytes + 1 + utf8(everything[2]);

  const packed = packContext(candidates({ tasks }), budget);
  assert.deepEqual(
    packed.tasks.map((entry) => entry.latestHandoff?.handoffId ?? null),
    ["handoff-0", null, "handoff-2"],
  );
  assert.deepEqual(packed.truncated, { sources: false, tasks: false, handoffs: true });
  assert.deepEqual(packed.tasks[0]?.latestHandoff, {
    handoffId: "handoff-0",
    taskId: "task-0",
    checkpoint: "checkpoint 0",
    summary: "short",
    taskRevision: 2,
    createdAt: timestamp,
  });
});

it("stops at the first task that fits in no form", () => {
  const tasks = [
    { task: task(0), latestHandoff: null },
    { task: task(1), latestHandoff: null },
  ];
  const first = utf8(packContext(candidates({ tasks })).tasks[0]);
  const packed = packContext(candidates({ tasks }), first + 5);
  assert.deepEqual(
    packed.tasks.map((entry) => entry.taskId),
    ["task-0"],
  );
  assert.deepEqual(packed.truncated, { sources: false, tasks: true, handoffs: false });
});
