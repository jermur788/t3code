import {
  CommandId,
  DEFAULT_PROVIDER_INTERACTION_MODE,
  isProviderAvailable,
  MessageId,
  type ProjectId,
  ProjectRuntimeConflictError,
  ProjectRuntimeDisabledError,
  ProjectRuntimeNotFoundError,
  type ProjectRuntimeTask,
  type ProjectRuntimeTaskId,
  type OrchestrationV2Run,
  RuntimeExecutionAttempt,
  type RuntimeExecutionAttemptId,
  type RuntimeExecutionAttemptListResult,
  type RuntimeExecutionAttemptSummary,
  type RuntimeExecutionLaunch,
  RuntimeExecutionAttemptConflictError,
  RuntimeExecutionAttemptNotFoundError,
  RuntimeExecutionRejectedError,
  type RuntimeExecutionRoutingReceipt,
  type RuntimeExecutionWorkspaceStrategy,
  type ServerProvider,
  type ServerSettings as ContractServerSettings,
  resolveProjectProviderInstanceEnabled,
} from "@t3tools/contracts";
import * as Context from "effect/Context";
import * as Crypto from "effect/Crypto";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as PlatformError from "effect/PlatformError";
import * as Schema from "effect/Schema";
import * as Semaphore from "effect/Semaphore";
import * as SqlClient from "effect/sql/SqlClient";
import { type SqlError } from "effect/sql/SqlError";
import { resolveProjectSettings } from "@t3tools/shared/projectSettings";
import * as IdAllocator from "@t3tools/provider-core/server/IdAllocator";

import { PersistenceSqlError } from "../persistence/Errors.ts";
import { ProjectNotFoundError } from "../project/ProjectService.ts";
import * as ProjectService from "../project/ProjectService.ts";
import { providerEligibilityIssues } from "../provider/providerEligibility.ts";
import * as ThreadLaunchService from "../orchestration-v2/ThreadLaunchService.ts";
import * as ThreadManagementService from "../orchestration-v2/ThreadManagementService.ts";
import { RuntimeRoutingProviderView } from "../runtimeRouting/RuntimeRoutingProviderView.ts";
import * as RuntimeRoutingService from "../runtimeRouting/RuntimeRoutingService.ts";
import * as ServerSettingsService from "../serverSettings.ts";

import * as ProjectRuntimeService from "./ProjectRuntimeService.ts";
import { buildRuntimeTaskPacket, RUNTIME_TASK_PACKET_VERSION } from "./RuntimeTaskPacket.ts";

const AttemptJson = Schema.fromJsonString(RuntimeExecutionAttempt);
const encodeAttempt = Schema.encodeEffect(AttemptJson);
const decodeAttempt = Schema.decodeUnknownEffect(AttemptJson);

type RuntimeServiceError = Effect.Error<
  ReturnType<ProjectRuntimeService.ProjectRuntimeService["Service"]["readTask"]>
>;
type RoutingServiceError = Effect.Error<
  ReturnType<RuntimeRoutingService.RuntimeRoutingService["Service"]["resolveRoute"]>
>;
type LaunchError = Effect.Error<
  ReturnType<ThreadLaunchService.ThreadLaunchService["Service"]["launch"]>
>;
type ThreadError = Effect.Error<
  ReturnType<ThreadManagementService.ThreadManagementService["Service"]["getThreadShell"]>
>;
type ThreadProjectionError = Effect.Error<
  ReturnType<ThreadManagementService.ThreadManagementService["Service"]["getThreadProjection"]>
>;
type ThreadDispatchError = Effect.Error<
  ReturnType<ThreadManagementService.ThreadManagementService["Service"]["dispatch"]>
>;

type ServiceError =
  | RuntimeServiceError
  | RoutingServiceError
  | RuntimeExecutionRejectedError
  | RuntimeExecutionAttemptConflictError
  | RuntimeExecutionAttemptNotFoundError
  | PersistenceSqlError
  | Schema.SchemaError
  | SqlError
  | ProjectNotFoundError
  | LaunchError
  | ThreadError
  | ThreadProjectionError
  | ThreadDispatchError
  | IdAllocator.IdAllocatorV2Error
  | PlatformError.PlatformError;
type Result<A> = Effect.Effect<A, ServiceError>;
type AttemptStatus = RuntimeExecutionAttempt["status"];
type AttemptRow = {
  readonly attempt_id: string;
  readonly project_id: string;
  readonly task_id: string;
  readonly status: string;
  readonly revision: number;
  readonly thread_id: string;
  readonly run_id: string | null;
  readonly request_key: string | null;
  readonly created_at: string;
  readonly updated_at: string;
  readonly payload_json: string;
};

const EXECUTABLE_TASK_STATUSES = new Set<ProjectRuntimeTask["status"]>([
  "planned",
  "ready",
  "active",
]);
const ACTIVE_ATTEMPT_STATUSES = new Set<AttemptStatus>([
  "pending",
  "launched",
  "cancelling",
  "reconcile_required",
]);
const TERMINAL_ATTEMPT_STATUSES = new Set<AttemptStatus>([
  "completed",
  "failed",
  "cancelled",
  "interrupted",
]);
const isActiveAttempt = (status: AttemptStatus) => ACTIVE_ATTEMPT_STATUSES.has(status);

const now = DateTime.now.pipe(Effect.map(DateTime.formatIso));
const asAttemptId = (value: string) => value as RuntimeExecutionAttemptId;

function toSummary(attempt: RuntimeExecutionAttempt): RuntimeExecutionAttemptSummary {
  const { receipt: _receipt, ...rest } = attempt;
  return rest;
}

function rejected(
  projectId: ProjectId,
  taskId: ProjectRuntimeTaskId,
  reason:
    | "task_not_executable"
    | "route_unavailable"
    | "no_default_model"
    | "provider_disabled"
    | "workspace_unavailable",
  detail: string,
): RuntimeExecutionRejectedError {
  return new RuntimeExecutionRejectedError({ projectId, taskId, reason, detail });
}

function launchEligibilityIssue(input: {
  readonly provider: ServerProvider | undefined;
  readonly orchestrationCapable: boolean;
  readonly settings: Pick<ContractServerSettings, "providerInstances" | "projectSettingsOverrides">;
  readonly projectId: ProjectId;
  readonly model: string;
}): string | null {
  if (input.provider === undefined) return "The provider instance is not registered.";
  if (!isProviderAvailable(input.provider)) {
    return input.provider.unavailableReason ?? "The provider is currently unavailable.";
  }
  if (
    input.provider.models.length > 0 &&
    !input.provider.models.some((entry) => entry.slug === input.model)
  ) {
    return "The selected model is not currently advertised.";
  }
  const issue = providerEligibilityIssues(input.provider, input.orchestrationCapable)[0];
  if (issue !== undefined) return issue.detail;
  if (
    !resolveProjectProviderInstanceEnabled(
      input.settings,
      input.projectId,
      input.provider.instanceId,
    )
  ) {
    return "The provider instance is disabled for this project.";
  }
  return null;
}

export class RuntimeTaskExecutionService extends Context.Service<
  RuntimeTaskExecutionService,
  {
    readonly execute: (
      projectId: ProjectId,
      input: {
        readonly taskId: ProjectRuntimeTaskId;
        readonly expectedTaskRevision: number;
        readonly clientRequestId?: string;
      },
    ) => Result<RuntimeExecutionAttempt>;
    readonly listAttempts: (
      projectId: ProjectId,
      input: {
        readonly taskId?: ProjectRuntimeTaskId;
        readonly cursor?: number;
        readonly limit?: number;
      },
    ) => Result<RuntimeExecutionAttemptListResult>;
    readonly readAttempt: (
      projectId: ProjectId,
      attemptId: RuntimeExecutionAttemptId,
    ) => Result<RuntimeExecutionAttempt>;
    readonly cancelAttempt: (
      projectId: ProjectId,
      attemptId: RuntimeExecutionAttemptId,
      expectedRevision: number,
      reason?: string,
    ) => Result<RuntimeExecutionAttempt>;
    readonly reconcileAttempt: (
      projectId: ProjectId,
      attemptId: RuntimeExecutionAttemptId,
    ) => Result<RuntimeExecutionAttempt>;
    readonly reconcileActiveAttempts: () => Result<number>;
  }
>()("t3/projectRuntime/RuntimeTaskExecutionService") {}

const make = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const crypto = yield* Crypto.Crypto;
  const ids = yield* IdAllocator.IdAllocatorV2;
  const runtime = yield* ProjectRuntimeService.ProjectRuntimeService;
  const routing = yield* RuntimeRoutingService.RuntimeRoutingService;
  const providerView = yield* RuntimeRoutingProviderView;
  const projects = yield* ProjectService.ProjectService;
  const settings = yield* ServerSettingsService.ServerSettingsService;
  const launch = yield* ThreadLaunchService.ThreadLaunchService;
  const threads = yield* ThreadManagementService.ThreadManagementService;
  const lane = yield* Semaphore.make(1);
  const newAttemptId = crypto.randomUUIDv4().pipe(Effect.map(asAttemptId));

  const decodeRow = Effect.fn("RuntimeTaskExecutionService.decodeRow")(function* (row: AttemptRow) {
    const decoded = yield* decodeAttempt(row.payload_json);
    if (
      decoded.attemptId !== row.attempt_id ||
      decoded.projectId !== row.project_id ||
      decoded.taskId !== row.task_id
    ) {
      throw new Error("Runtime execution attempt payload does not match its row.");
    }
    return decoded;
  });

  const readRow = Effect.fn("RuntimeTaskExecutionService.readRow")(function* (
    projectId: ProjectId,
    attemptId: RuntimeExecutionAttemptId,
  ) {
    const rows = yield* sql<AttemptRow>`SELECT * FROM project_runtime_execution_attempts
      WHERE project_id = ${projectId} AND attempt_id = ${attemptId}`;
    return rows[0] ?? null;
  });

  const readAttemptRow = Effect.fn("RuntimeTaskExecutionService.readAttempt")(function* (
    projectId: ProjectId,
    attemptId: RuntimeExecutionAttemptId,
  ) {
    const row = yield* readRow(projectId, attemptId);
    if (row === null)
      return yield* new RuntimeExecutionAttemptNotFoundError({ projectId, attemptId });
    return yield* decodeRow(row);
  });

  const readByRequestKey = Effect.fn("RuntimeTaskExecutionService.readByRequestKey")(function* (
    projectId: ProjectId,
    taskId: ProjectRuntimeTaskId,
    requestKey: string,
  ) {
    const rows = yield* sql<AttemptRow>`SELECT * FROM project_runtime_execution_attempts
      WHERE project_id = ${projectId} AND task_id = ${taskId} AND request_key = ${requestKey}`;
    return rows[0] === undefined ? null : yield* decodeRow(rows[0]);
  });

  const readActive = Effect.fn("RuntimeTaskExecutionService.readActive")(function* (
    projectId: ProjectId,
    taskId: ProjectRuntimeTaskId,
  ) {
    const rows = yield* sql<AttemptRow>`SELECT * FROM project_runtime_execution_attempts
      WHERE project_id = ${projectId} AND task_id = ${taskId}
        AND status IN ('pending', 'launched', 'cancelling', 'reconcile_required')
      ORDER BY created_at DESC, attempt_id DESC LIMIT 1`;
    return rows[0] === undefined ? null : yield* decodeRow(rows[0]);
  });

  const updateAttempt = Effect.fn("RuntimeTaskExecutionService.updateAttempt")(function* (input: {
    readonly attempt: RuntimeExecutionAttempt;
    readonly status: AttemptStatus;
    readonly runId: string | null;
    readonly failure: string | null;
    readonly handoffId?: string | null;
    readonly cancelRequestedAt?: string | null;
  }) {
    const timestamp = yield* now;
    const next = {
      ...input.attempt,
      status: input.status,
      revision: input.attempt.revision + 1,
      runId: input.runId,
      failure: input.failure,
      updatedAt: timestamp,
    } as { -readonly [K in keyof RuntimeExecutionAttempt]: RuntimeExecutionAttempt[K] };
    if (input.handoffId !== undefined) {
      next.handoffId = input.handoffId as NonNullable<RuntimeExecutionAttempt["handoffId"]> | null;
    }
    if (input.cancelRequestedAt !== undefined) {
      next.cancelRequestedAt = input.cancelRequestedAt;
    }
    const payload = yield* encodeAttempt(next);
    const changed = yield* sql`UPDATE project_runtime_execution_attempts
      SET status = ${next.status}, revision = ${next.revision}, run_id = ${next.runId},
        updated_at = ${next.updatedAt}, payload_json = ${payload}
      WHERE project_id = ${next.projectId} AND attempt_id = ${next.attemptId}
        AND revision = ${input.attempt.revision}
      RETURNING attempt_id`;
    if (changed.length === 1) return next;
    return yield* readAttemptRow(next.projectId, next.attemptId);
  });

  const resolveLaunch = Effect.fn("RuntimeTaskExecutionService.resolveLaunch")(function* (
    projectId: ProjectId,
    task: ProjectRuntimeTask,
  ) {
    const resolution = yield* routing.resolveRoute({ projectId, taskId: task.taskId });
    if (resolution.status === "failed") {
      return yield* rejected(
        projectId,
        task.taskId,
        "route_unavailable",
        "No saved worker route can currently be used.",
      );
    }
    const project = yield* projects
      .getById(projectId)
      .pipe(Effect.mapError(() => new ProjectNotFoundError({ projectId })));
    if (Option.isNone(project)) return yield* new ProjectNotFoundError({ projectId });
    const serverSettings = yield* settings.getSettings.pipe(Effect.orDie);
    const projectSettings = resolveProjectSettings(
      serverSettings,
      projectId,
      project.value,
    ).settings;
    const providerState = yield* providerView.read;
    const selected = resolution.selected;
    const modelSelection =
      selected === null
        ? projectSettings.defaultModelSelection
        : {
            instanceId: selected.providerInstanceId,
            model: selected.model,
            ...(selected.options === undefined ? {} : { options: selected.options }),
          };
    if (modelSelection === null) {
      return yield* rejected(
        projectId,
        task.taskId,
        "no_default_model",
        "The project has no default model and no worker route selected one.",
      );
    }
    const provider = providerState.providers.find(
      (candidate) => candidate.instanceId === modelSelection.instanceId,
    );
    const issue = launchEligibilityIssue({
      provider,
      orchestrationCapable:
        provider !== undefined &&
        providerState.orchestrationCapableInstanceIds.has(provider.instanceId),
      settings: providerState.settings,
      projectId,
      model: modelSelection.model,
    });
    if (issue !== null) {
      return yield* rejected(projectId, task.taskId, "provider_disabled", issue);
    }
    const isolation = selected?.isolation ?? "shared";
    const workspaceStrategy: RuntimeExecutionWorkspaceStrategy =
      isolation === "worktree"
        ? {
            type: "worktree",
            baseRef: task.base?.revision ?? task.base?.branch ?? "HEAD",
            startFromOrigin: false,
          }
        : { type: "root" };
    if (workspaceStrategy.type === "worktree") {
      yield* launch
        .checkWorktreeBase({ projectId, workspaceStrategy })
        .pipe(
          Effect.mapError(() =>
            rejected(
              projectId,
              task.taskId,
              "workspace_unavailable",
              "The requested worktree base is not available.",
            ),
          ),
        );
    }
    const launchPlan: RuntimeExecutionLaunch = {
      modelSelection,
      runtimeMode: selected?.runtimeMode ?? projectSettings.defaultRuntimeMode,
      interactionMode: selected?.interactionMode ?? DEFAULT_PROVIDER_INTERACTION_MODE,
      workspaceStrategy,
    };
    return { resolution, launchPlan };
  });

  const runLaunch = Effect.fn("RuntimeTaskExecutionService.runLaunch")(function* (
    attempt: RuntimeExecutionAttempt,
  ) {
    const commandId = CommandId.make(`command:runtime-execution:${attempt.attemptId}:launch`);
    const messageId = MessageId.make(`message:runtime-execution:${attempt.attemptId}`);
    const result = yield* launch.launch({
      commandId,
      threadId: attempt.threadId,
      projectId: attempt.projectId,
      title: attempt.taskTitle,
      modelSelection: attempt.receipt.launch.modelSelection,
      runtimeMode: attempt.receipt.launch.runtimeMode,
      interactionMode: attempt.receipt.launch.interactionMode,
      workspaceStrategy: attempt.receipt.launch.workspaceStrategy,
      initialMessage: {
        messageId,
        text: attempt.receipt.packet.text,
        attachments: [],
      },
      createdBy: "user",
      creationSource: "web",
    });
    const run = result.projection.runs.find((candidate) => candidate.userMessageId === messageId);
    if (run === undefined) {
      return yield* updateAttempt({
        attempt,
        status: "reconcile_required",
        runId: null,
        failure: "The worker thread was created but no run was found.",
      });
    }
    return yield* updateAttempt({
      attempt,
      status: "launched",
      runId: run.id,
      failure: null,
    });
  });

  const launchAttempt = Effect.fn("RuntimeTaskExecutionService.launchAttempt")(function* (
    attempt: RuntimeExecutionAttempt,
  ) {
    return yield* runLaunch(attempt).pipe(
      Effect.catch((cause) =>
        Effect.gen(function* () {
          const shell = yield* threads.getThreadShell(attempt.threadId).pipe(
            Effect.asSome,
            Effect.orElseSucceed(() => Option.none()),
          );
          const threadKnownAbsent = Option.isSome(shell) && shell.value === null;
          const status: AttemptStatus = threadKnownAbsent ? "failed" : "reconcile_required";
          const failure =
            status === "failed"
              ? "The worker could not be launched. Check the project checkout and provider status, then try again."
              : "The launch was interrupted after the worker thread was created. Reconcile this attempt before executing again.";
          yield* Effect.logWarning("runtime-execution.launch-failed", {
            attemptId: attempt.attemptId,
            status,
            cause,
          });
          return yield* updateAttempt({ attempt, status, runId: null, failure });
        }),
      ),
    );
  });

  const attemptStatusForRun = (status: OrchestrationV2Run["status"]): AttemptStatus | null => {
    switch (status) {
      case "completed":
        return "completed";
      case "failed":
        return "failed";
      case "cancelled":
        return "cancelled";
      case "interrupted":
      case "rolled_back":
        return "interrupted";
      default:
        return null;
    }
  };

  const handoffForAttempt = Effect.fn("RuntimeTaskExecutionService.handoffForAttempt")(function* (
    attempt: RuntimeExecutionAttempt,
  ) {
    const rows = yield* sql<{ readonly handoff_id: string }>`SELECT handoff_id
        FROM project_runtime_handoffs
        WHERE project_id = ${attempt.projectId} AND task_id = ${attempt.taskId}
          AND json_extract(payload_json, '$.threadId') = ${attempt.threadId}
        ORDER BY created_at DESC, handoff_id DESC
        LIMIT 1`;
    return rows[0]?.handoff_id ?? null;
  });

  const reconcileAttemptRow = Effect.fn("RuntimeTaskExecutionService.reconcileAttemptRow")(
    function* (attempt: RuntimeExecutionAttempt) {
      if (TERMINAL_ATTEMPT_STATUSES.has(attempt.status)) {
        const handoffId = yield* handoffForAttempt(attempt);
        return handoffId === null || handoffId === (attempt.handoffId ?? null)
          ? attempt
          : yield* updateAttempt({
              attempt,
              status: attempt.status,
              runId: attempt.runId,
              failure: attempt.failure,
              handoffId,
            });
      }
      // A pending attempt has not necessarily reached thread.create. Replaying the
      // same command/thread/message ids completes or resumes that one launch.
      if (attempt.status === "pending") return yield* launchAttempt(attempt);

      const shell = yield* threads.getThreadShell(attempt.threadId).pipe(
        Effect.asSome,
        Effect.orElseSucceed(() => Option.none()),
      );
      if (Option.isNone(shell)) {
        return attempt.status === "reconcile_required"
          ? attempt
          : yield* updateAttempt({
              attempt,
              status: "reconcile_required",
              runId: attempt.runId,
              failure: "T3 could not verify whether the worker thread still exists.",
            });
      }
      if (shell.value === null) {
        if (attempt.status === "cancelling") {
          return yield* updateAttempt({
            attempt,
            status: "cancelled",
            runId: attempt.runId,
            failure: null,
          });
        }
        if (attempt.status === "reconcile_required") return attempt;
        return yield* updateAttempt({
          attempt,
          status: "reconcile_required",
          runId: attempt.runId,
          failure: "The worker thread no longer exists; reconcile this attempt before retrying.",
        });
      }

      const projection = yield* threads.getThreadProjection(attempt.threadId);
      const expectedMessageId = MessageId.make(`message:runtime-execution:${attempt.attemptId}`);
      const run =
        attempt.runId === null
          ? projection.runs.find((candidate) => candidate.userMessageId === expectedMessageId)
          : projection.runs.find((candidate) => candidate.id === attempt.runId);
      const handoffId = yield* handoffForAttempt(attempt);
      if (run === undefined) {
        if (attempt.status === "cancelling") {
          return yield* updateAttempt({
            attempt,
            status: "cancelled",
            runId: null,
            failure: null,
            handoffId,
          });
        }
        if (attempt.status === "reconcile_required") return attempt;
        return yield* updateAttempt({
          attempt,
          status: "reconcile_required",
          runId: null,
          failure: "The worker thread has no run; reconcile this attempt before retrying.",
          handoffId,
        });
      }

      const terminal = attemptStatusForRun(run.status);
      if (terminal !== null) {
        return yield* updateAttempt({
          attempt,
          status: terminal,
          runId: run.id,
          failure: terminal === "failed" ? (attempt.failure ?? "The worker turn failed.") : null,
          handoffId,
        });
      }

      if (attempt.status === "launched") {
        return run.id === attempt.runId && handoffId === (attempt.handoffId ?? null)
          ? attempt
          : yield* updateAttempt({
              attempt,
              status: "launched",
              runId: run.id,
              failure: null,
              handoffId,
            });
      }
      if (attempt.status === "cancelling") {
        return run.id === attempt.runId && handoffId === (attempt.handoffId ?? null)
          ? attempt
          : yield* updateAttempt({
              attempt,
              status: "cancelling",
              runId: run.id,
              failure: null,
              handoffId,
            });
      }
      if (attempt.status === "reconcile_required") {
        return run.id === attempt.runId &&
          handoffId === (attempt.handoffId ?? null) &&
          attempt.failure !== null
          ? attempt
          : yield* updateAttempt({
              attempt,
              status: "reconcile_required",
              runId: run.id,
              failure: attempt.failure,
              handoffId,
            });
      }
      return attempt;
    },
  );

  const reconcileAttempt: RuntimeTaskExecutionService["Service"]["reconcileAttempt"] = Effect.fn(
    "RuntimeTaskExecutionService.reconcileAttempt",
  )(function* (projectId, attemptId) {
    return yield* lane.withPermits(1)(
      Effect.gen(function* () {
        yield* runtime.getStatus(projectId);
        const attempt = yield* readAttemptRow(projectId, attemptId);
        return yield* reconcileAttemptRow(attempt);
      }),
    );
  });

  const reconcileActiveAttempts: RuntimeTaskExecutionService["Service"]["reconcileActiveAttempts"] =
    Effect.fn("RuntimeTaskExecutionService.reconcileActiveAttempts")(function* () {
      const rows = yield* sql<AttemptRow>`SELECT * FROM project_runtime_execution_attempts
        WHERE status IN ('pending', 'launched', 'cancelling', 'reconcile_required')
        ORDER BY created_at, attempt_id`;
      yield* Effect.forEach(
        rows,
        (row) =>
          Effect.gen(function* () {
            const attempt = yield* decodeRow(row);
            return yield* lane.withPermits(1)(reconcileAttemptRow(attempt));
          }).pipe(
            Effect.catchCause((cause) =>
              Effect.logWarning("runtime-execution.reconcile-failed", {
                attemptId: row.attempt_id,
                cause,
              }),
            ),
          ),
        { concurrency: 1, discard: true },
      );
      return rows.length;
    });

  const cancelAttempt: RuntimeTaskExecutionService["Service"]["cancelAttempt"] = Effect.fn(
    "RuntimeTaskExecutionService.cancelAttempt",
  )(function* (projectId, attemptId, expectedRevision, reason) {
    return yield* lane.withPermits(1)(
      Effect.gen(function* () {
        yield* runtime.getStatus(projectId);
        const attempt = yield* readAttemptRow(projectId, attemptId);
        if (attempt.revision !== expectedRevision) {
          return yield* new RuntimeExecutionAttemptConflictError({
            projectId,
            attemptId,
            expectedRevision,
            currentRevision: attempt.revision,
          });
        }
        if (
          attempt.status === "completed" ||
          attempt.status === "failed" ||
          attempt.status === "cancelled" ||
          attempt.status === "interrupted"
        ) {
          return attempt;
        }

        const shell = yield* threads.getThreadShell(attempt.threadId).pipe(
          Effect.asSome,
          Effect.orElseSucceed(() => Option.none()),
        );
        if (Option.isNone(shell)) {
          return yield* updateAttempt({
            attempt,
            status: "reconcile_required",
            runId: attempt.runId,
            failure: "T3 could not verify the worker thread while cancelling.",
          });
        }
        if (shell.value === null) {
          return yield* updateAttempt({
            attempt,
            status: "cancelled",
            runId: attempt.runId,
            failure: null,
          });
        }

        const timestamp = yield* now;
        const commandId = CommandId.make(
          `command:runtime-execution:${attempt.attemptId}:cancel:${yield* crypto.randomUUIDv4()}`,
        );
        const dispatched = yield* threads
          .dispatch({
            type: "thread.stop",
            commandId,
            threadId: attempt.threadId,
            stopDelegatedTasks: false,
            ...(reason === undefined ? {} : { reason }),
          })
          .pipe(
            Effect.as(true),
            Effect.catch((cause) =>
              Effect.logWarning("runtime-execution.cancel-failed", {
                attemptId: attempt.attemptId,
                cause,
              }).pipe(Effect.as(false)),
            ),
          );
        if (!dispatched) {
          return yield* updateAttempt({
            attempt,
            status: "reconcile_required",
            runId: attempt.runId,
            failure: "T3 could not request cancellation; reconcile this attempt.",
          });
        }
        return yield* updateAttempt({
          attempt,
          status: "cancelling",
          runId: attempt.runId,
          failure: null,
          cancelRequestedAt: timestamp,
        });
      }),
    );
  });

  const execute: RuntimeTaskExecutionService["Service"]["execute"] = Effect.fn(
    "RuntimeTaskExecutionService.execute",
  )(function* (projectId, input) {
    return yield* lane.withPermits(1)(
      Effect.gen(function* () {
        const status = yield* runtime.getStatus(projectId);
        if (!status.enabled) return yield* new ProjectRuntimeDisabledError({ projectId });

        if (input.clientRequestId !== undefined) {
          const existing = yield* readByRequestKey(projectId, input.taskId, input.clientRequestId);
          if (existing !== null) return existing;
        }

        const task = yield* runtime.readTask(projectId, input.taskId);
        if (task.revision !== input.expectedTaskRevision) {
          return yield* new ProjectRuntimeConflictError({
            projectId,
            entity: "task",
            entityId: task.taskId,
            expectedRevision: input.expectedTaskRevision,
            currentRevision: task.revision,
          });
        }
        if (!EXECUTABLE_TASK_STATUSES.has(task.status)) {
          return yield* rejected(
            projectId,
            task.taskId,
            "task_not_executable",
            `Tasks with status ${task.status} cannot be executed.`,
          );
        }

        const active = yield* readActive(projectId, task.taskId);
        if (active !== null) {
          if (active.status === "pending") return yield* launchAttempt(active);
          const reconciled = yield* reconcileAttemptRow(active);
          if (isActiveAttempt(reconciled.status)) return reconciled;
        }

        const resolved = yield* resolveLaunch(projectId, task);
        const handoff =
          task.latestHandoffId === null
            ? null
            : yield* runtime.readHandoff(projectId, task.latestHandoffId).pipe(
                Effect.catchTags({
                  ProjectRuntimeNotFoundError: () => Effect.succeed(null),
                }),
              );
        const timestamp = yield* now;
        const attemptId = yield* newAttemptId;
        const threadId = yield* ids.allocate.thread({ projectId });
        const packetText = buildRuntimeTaskPacket(task, handoff);
        const receipt: RuntimeExecutionRoutingReceipt = {
          route: resolved.resolution,
          launch: resolved.launchPlan,
          packet: {
            version: RUNTIME_TASK_PACKET_VERSION,
            taskRevision: task.revision,
            handoffId: task.latestHandoffId,
            text: packetText,
          },
        };
        const attempt: RuntimeExecutionAttempt = {
          attemptId,
          projectId,
          taskId: task.taskId,
          taskTitle: task.title,
          status: "pending",
          revision: 1,
          threadId,
          runId: null,
          modelSelection: resolved.launchPlan.modelSelection,
          routeSource: resolved.resolution.source,
          failure: null,
          createdAt: timestamp,
          updatedAt: timestamp,
          receipt,
        };

        const payload = yield* encodeAttempt(attempt);
        const inserted = yield* sql`INSERT INTO project_runtime_execution_attempts
            (attempt_id, project_id, task_id, status, revision, thread_id, run_id, request_key,
              created_at, updated_at, payload_json)
            SELECT ${attempt.attemptId}, ${attempt.projectId}, ${attempt.taskId},
              ${attempt.status}, ${attempt.revision}, ${attempt.threadId}, ${attempt.runId},
              ${input.clientRequestId ?? null}, ${attempt.createdAt}, ${attempt.updatedAt}, ${payload}
            WHERE EXISTS (
              SELECT 1 FROM project_runtime_tasks
              WHERE project_id = ${projectId} AND task_id = ${task.taskId}
                AND revision = ${input.expectedTaskRevision}
            )
            ON CONFLICT DO NOTHING
            RETURNING attempt_id`;
        if (inserted.length === 0) {
          const existing =
            input.clientRequestId === undefined
              ? null
              : yield* readByRequestKey(projectId, task.taskId, input.clientRequestId);
          const activeAfterConflict = yield* readActive(projectId, task.taskId);
          if (existing !== null) return existing;
          if (activeAfterConflict !== null) return activeAfterConflict;
          const current = yield* runtime.getStatus(projectId);
          if (!current.enabled) return yield* new ProjectRuntimeDisabledError({ projectId });
          const [row] = yield* sql<{ readonly revision: number }>`SELECT revision
            FROM project_runtime_tasks WHERE project_id = ${projectId} AND task_id = ${task.taskId}`;
          if (row === undefined) {
            return yield* new ProjectRuntimeNotFoundError({
              projectId,
              entity: "task",
              entityId: task.taskId,
            });
          }
          return yield* new ProjectRuntimeConflictError({
            projectId,
            entity: "task",
            entityId: task.taskId,
            expectedRevision: input.expectedTaskRevision,
            currentRevision: row.revision,
          });
        }
        return yield* launchAttempt(attempt);
      }),
    );
  });

  const listAttempts: RuntimeTaskExecutionService["Service"]["listAttempts"] = Effect.fn(
    "RuntimeTaskExecutionService.listAttempts",
  )(function* (projectId, input) {
    yield* runtime.getStatus(projectId);
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 100);
    const cursor = Math.max(input.cursor ?? 0, 0);
    const rows = yield* sql<AttemptRow>`SELECT * FROM project_runtime_execution_attempts
        WHERE project_id = ${projectId}
        ${input.taskId === undefined ? sql`` : sql`AND task_id = ${input.taskId}`}
        ORDER BY created_at DESC, attempt_id DESC
        LIMIT ${limit + 1} OFFSET ${cursor}`;
    const attempts = yield* Effect.forEach(rows.slice(0, limit), (row) =>
      decodeRow(row).pipe(Effect.map(toSummary)),
    );
    return {
      attempts,
      nextCursor: rows.length > limit ? cursor + limit : null,
    };
  }, sql.withTransaction);

  const readAttempt: RuntimeTaskExecutionService["Service"]["readAttempt"] = Effect.fn(
    "RuntimeTaskExecutionService.readAttempt",
  )(function* (projectId, attemptId) {
    yield* runtime.getStatus(projectId);
    return yield* readAttemptRow(projectId, attemptId);
  }, sql.withTransaction);

  return RuntimeTaskExecutionService.of({
    execute,
    listAttempts,
    readAttempt,
    cancelAttempt,
    reconcileAttempt,
    reconcileActiveAttempts,
  });
});

export const layer = Layer.effect(RuntimeTaskExecutionService, make).pipe(
  Layer.provide(IdAllocator.layer),
);
