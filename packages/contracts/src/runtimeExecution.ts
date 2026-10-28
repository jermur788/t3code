import * as Schema from "effect/Schema";

import {
  IsoDateTime,
  NonNegativeInt,
  PositiveInt,
  ProjectId,
  ThreadId,
  TrimmedNonEmptyString,
} from "./baseSchemas.ts";
import { ModelSelection } from "./modelSelection.ts";
import {
  ProjectRuntimeHandoffId,
  ProjectRuntimeTaskId,
  PROJECT_RUNTIME_BOUNDS,
} from "./projectRuntime.ts";
import { ProviderInteractionMode, RuntimeMode } from "./providerPolicy.ts";
import { RuntimeRouteResolution, RuntimeRouteSource } from "./runtimeRoutingResolution.ts";

export const RUNTIME_EXECUTION_BOUNDS = {
  failureMaxLength: 1_000,
  packetMaxLength: 65_536,
  requestKeyMaxLength: 200,
} as const;

const AttemptId = TrimmedNonEmptyString.check(
  Schema.isMaxLength(PROJECT_RUNTIME_BOUNDS.idMaxLength),
).pipe(Schema.brand("RuntimeExecutionAttemptId"));
export const RuntimeExecutionAttemptId = AttemptId;
export type RuntimeExecutionAttemptId = typeof RuntimeExecutionAttemptId.Type;

const RequestKey = TrimmedNonEmptyString.check(
  Schema.isMaxLength(RUNTIME_EXECUTION_BOUNDS.requestKeyMaxLength),
);

export const RuntimeExecutionAttemptStatus = Schema.Literals([
  "pending",
  "launched",
  "cancelling",
  "completed",
  "failed",
  "cancelled",
  "interrupted",
  "reconcile_required",
]);
export type RuntimeExecutionAttemptStatus = typeof RuntimeExecutionAttemptStatus.Type;

export const RuntimeExecutionWorkspaceStrategy = Schema.Union([
  Schema.Struct({ type: Schema.Literal("root") }),
  Schema.Struct({
    type: Schema.Literal("worktree"),
    baseRef: TrimmedNonEmptyString,
    startFromOrigin: Schema.Boolean,
  }),
]);
export type RuntimeExecutionWorkspaceStrategy = typeof RuntimeExecutionWorkspaceStrategy.Type;

/** The concrete launch parameters selected from a route or normal T3 defaults. */
export const RuntimeExecutionLaunch = Schema.Struct({
  modelSelection: ModelSelection,
  runtimeMode: RuntimeMode,
  interactionMode: ProviderInteractionMode,
  workspaceStrategy: RuntimeExecutionWorkspaceStrategy,
});
export type RuntimeExecutionLaunch = typeof RuntimeExecutionLaunch.Type;

/** The exact prompt sent to the worker. Routing is deliberately absent. */
export const RuntimeExecutionPacket = Schema.Struct({
  version: Schema.Literal(1),
  taskRevision: PositiveInt,
  handoffId: Schema.NullOr(ProjectRuntimeHandoffId),
  text: Schema.String.check(Schema.isMaxLength(RUNTIME_EXECUTION_BOUNDS.packetMaxLength)),
});
export type RuntimeExecutionPacket = typeof RuntimeExecutionPacket.Type;

export const RuntimeExecutionRoutingReceipt = Schema.Struct({
  route: RuntimeRouteResolution,
  launch: RuntimeExecutionLaunch,
  packet: RuntimeExecutionPacket,
});
export type RuntimeExecutionRoutingReceipt = typeof RuntimeExecutionRoutingReceipt.Type;

export const RuntimeExecutionAttemptSummary = Schema.Struct({
  attemptId: RuntimeExecutionAttemptId,
  projectId: ProjectId,
  taskId: ProjectRuntimeTaskId,
  taskTitle: Schema.String.check(Schema.isMaxLength(PROJECT_RUNTIME_BOUNDS.taskTitleMaxLength)),
  status: RuntimeExecutionAttemptStatus,
  revision: PositiveInt,
  threadId: ThreadId,
  runId: Schema.NullOr(TrimmedNonEmptyString),
  modelSelection: ModelSelection,
  routeSource: RuntimeRouteSource,
  failure: Schema.NullOr(
    Schema.String.check(Schema.isMaxLength(RUNTIME_EXECUTION_BOUNDS.failureMaxLength)),
  ),
  handoffId: Schema.optionalKey(Schema.NullOr(ProjectRuntimeHandoffId)),
  cancelRequestedAt: Schema.optionalKey(Schema.NullOr(IsoDateTime)),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});
export type RuntimeExecutionAttemptSummary = typeof RuntimeExecutionAttemptSummary.Type;

export const RuntimeExecutionAttempt = Schema.Struct({
  ...RuntimeExecutionAttemptSummary.fields,
  receipt: RuntimeExecutionRoutingReceipt,
});
export type RuntimeExecutionAttempt = typeof RuntimeExecutionAttempt.Type;

export const ExecuteProjectRuntimeTaskInput = Schema.Struct({
  taskId: ProjectRuntimeTaskId,
  expectedTaskRevision: PositiveInt,
  clientRequestId: Schema.optionalKey(RequestKey),
});
export type ExecuteProjectRuntimeTaskInput = typeof ExecuteProjectRuntimeTaskInput.Type;

export const ListRuntimeExecutionAttemptsInput = Schema.Struct({
  taskId: Schema.optionalKey(ProjectRuntimeTaskId),
  cursor: Schema.optionalKey(NonNegativeInt),
  limit: Schema.optionalKey(
    PositiveInt.check(Schema.isLessThanOrEqualTo(PROJECT_RUNTIME_BOUNDS.listMaxLimit)),
  ),
});
export type ListRuntimeExecutionAttemptsInput = typeof ListRuntimeExecutionAttemptsInput.Type;

export const RuntimeExecutionAttemptListResult = Schema.Struct({
  attempts: Schema.Array(RuntimeExecutionAttemptSummary).check(
    Schema.isMaxLength(PROJECT_RUNTIME_BOUNDS.listMaxLimit),
  ),
  nextCursor: Schema.NullOr(NonNegativeInt),
});
export type RuntimeExecutionAttemptListResult = typeof RuntimeExecutionAttemptListResult.Type;

export const ReadRuntimeExecutionAttemptInput = Schema.Struct({
  attemptId: RuntimeExecutionAttemptId,
});
export type ReadRuntimeExecutionAttemptInput = typeof ReadRuntimeExecutionAttemptInput.Type;

export const CancelRuntimeExecutionAttemptInput = Schema.Struct({
  attemptId: RuntimeExecutionAttemptId,
  expectedRevision: PositiveInt,
  reason: Schema.optionalKey(
    Schema.String.check(Schema.isMaxLength(RUNTIME_EXECUTION_BOUNDS.failureMaxLength)),
  ),
});
export type CancelRuntimeExecutionAttemptInput = typeof CancelRuntimeExecutionAttemptInput.Type;

export const ReconcileRuntimeExecutionAttemptInput = Schema.Struct({
  attemptId: RuntimeExecutionAttemptId,
});
export type ReconcileRuntimeExecutionAttemptInput =
  typeof ReconcileRuntimeExecutionAttemptInput.Type;

export const RuntimeExecutionRejectionReason = Schema.Literals([
  "runtime_disabled",
  "task_not_executable",
  "route_unavailable",
  "no_default_model",
  "provider_disabled",
  "workspace_unavailable",
  "cancellation_failed",
]);
export type RuntimeExecutionRejectionReason = typeof RuntimeExecutionRejectionReason.Type;

export class RuntimeExecutionRejectedError extends Schema.TaggedError<RuntimeExecutionRejectedError>()(
  "RuntimeExecutionRejectedError",
  {
    projectId: ProjectId,
    taskId: ProjectRuntimeTaskId,
    reason: RuntimeExecutionRejectionReason,
    detail: Schema.optionalKey(
      Schema.String.check(Schema.isMaxLength(RUNTIME_EXECUTION_BOUNDS.failureMaxLength)),
    ),
  },
) {
  override get message(): string {
    return `Runtime task ${this.taskId} cannot be executed: ${this.reason.replaceAll("_", " ")}.`;
  }
}

export class RuntimeExecutionAttemptConflictError extends Schema.TaggedError<RuntimeExecutionAttemptConflictError>()(
  "RuntimeExecutionAttemptConflictError",
  {
    projectId: ProjectId,
    attemptId: RuntimeExecutionAttemptId,
    expectedRevision: PositiveInt,
    currentRevision: PositiveInt,
  },
) {
  override get message(): string {
    return `Execution attempt ${this.attemptId} is at revision ${this.currentRevision}, not the expected revision ${this.expectedRevision}.`;
  }
}

export class RuntimeExecutionAttemptNotFoundError extends Schema.TaggedError<RuntimeExecutionAttemptNotFoundError>()(
  "RuntimeExecutionAttemptNotFoundError",
  {
    projectId: ProjectId,
    attemptId: RuntimeExecutionAttemptId,
  },
) {
  override get message(): string {
    return `Runtime execution attempt ${this.attemptId} was not found for project ${this.projectId}.`;
  }
}

export const RuntimeExecutionError = Schema.Union([
  RuntimeExecutionRejectedError,
  RuntimeExecutionAttemptNotFoundError,
  RuntimeExecutionAttemptConflictError,
]);
export type RuntimeExecutionError = typeof RuntimeExecutionError.Type;
