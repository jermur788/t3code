import { isCommitDenied } from "../orchestration-v2/EventSink.ts";
import {
  PrivateContinuationAuthorization,
  type Authorization,
  encodeAuthorization,
} from "./ContinuationCommitGuard.ts";
import {
  CommandId,
  DEFAULT_PROVIDER_INTERACTION_MODE,
  isProviderAvailable,
  MessageId,
  type ProjectId,
  ProjectRuntimeConflictError,
  ProjectRuntimeDisabledError,
  ProjectRuntimeNotFoundError,
  ProjectRuntimeTaskId,
  type ProjectRuntimeContinuationPolicy,
  type ProjectRuntimeHandoff,
  type ProjectRuntimeTask,
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
import * as SecureRandom from "effect/crypto/SecureRandom";
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
import { ContinuationGate } from "./RuntimeTaskContinuationGate.ts";
import {
  buildRuntimeTaskPacket,
  RUNTIME_TASK_PACKET_VERSION,
  type RuntimeTaskContinuationOrigin,
} from "./RuntimeTaskPacket.ts";
import { evaluateContinuation, handoffMatchesAttempt } from "./RuntimeTaskContinuationPolicy.ts";

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

/** A currently valid policy decision, re-derived at the insertion boundary. */
interface ContinuationAuthorization {
  readonly kind: "r" | "p";
  readonly sourceTask: ProjectRuntimeTask;
  readonly sourceAttempt: RuntimeExecutionAttempt;
  readonly sourceHandoff: ProjectRuntimeHandoff;
}

interface ContinuationSource {
  readonly sourceTask: ProjectRuntimeTask;
  readonly policy: ProjectRuntimeContinuationPolicy;
}

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

/**
 * Every request key in the `cont:v1:` namespace is reserved. The prefix is a
 * label, never a capability: the public entry point rejects malformed keys too,
 * while only a well-formed key can be re-derived by the internal dispatcher.
 */
const CONTINUATION_REQUEST_KEY_NAMESPACE = "cont:v1:";
// SQLite LIKE is ASCII case-insensitive, so the public reservation must be too:
// otherwise `CONT:V1:P:x` slips past the guard and can consume a repair cycle.
const isReservedContinuationRequestKey = (key: string) =>
  key.slice(0, CONTINUATION_REQUEST_KEY_NAMESPACE.length).toLowerCase() ===
  CONTINUATION_REQUEST_KEY_NAMESPACE;

const parseContinuationRequestKey = (
  key: string,
): { readonly kind: "r" | "p"; readonly attemptId: RuntimeExecutionAttemptId } | null => {
  const match = /^cont:v1:([rp]):(.+)$/.exec(key);
  return match === null ? null : { kind: match[1] as "r" | "p", attemptId: asAttemptId(match[2]!) };
};

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
  const random = yield* SecureRandom.SecureRandom;
  const continuationEnabled = (yield* ContinuationGate).enabled;
  const ids = yield* IdAllocator.IdAllocatorV2;
  const runtime = yield* ProjectRuntimeService.ProjectRuntimeService;
  const routing = yield* RuntimeRoutingService.RuntimeRoutingService;
  const providerView = yield* RuntimeRoutingProviderView;
  const projects = yield* ProjectService.ProjectService;
  const settings = yield* ServerSettingsService.ServerSettingsService;
  const launch = yield* ThreadLaunchService.ThreadLaunchService;
  const threads = yield* ThreadManagementService.ThreadManagementService;
  const lane = yield* Semaphore.make(1);
  const newAttemptId = random.uuidV4().pipe(Effect.map(asAttemptId));

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

  /**
   * The root execution of a source task is the only candidate for the chain.
   * A tie at the recorded instant is ambiguous and fails closed.
   */
  const readRootAttempt = Effect.fn("RuntimeTaskExecutionService.readRootAttempt")(function* (
    projectId: ProjectId,
    sourceTaskId: ProjectRuntimeTaskId,
  ) {
    const rows = yield* sql<AttemptRow>`SELECT * FROM project_runtime_execution_attempts
        WHERE project_id = ${projectId} AND task_id = ${sourceTaskId}
        ORDER BY created_at DESC, attempt_id DESC LIMIT 2`;
    if (rows.length === 0) return null;
    if (rows.length === 2 && rows[0]?.created_at === rows[1]?.created_at) return null;
    return yield* decodeRow(rows[0]!);
  });

  const requestKeyForAttempt = Effect.fn("RuntimeTaskExecutionService.requestKeyForAttempt")(
    function* (projectId: ProjectId, attemptId: RuntimeExecutionAttemptId) {
      const rows = yield* sql<{ readonly request_key: string | null }>`SELECT request_key
        FROM project_runtime_execution_attempts
        WHERE project_id = ${projectId} AND attempt_id = ${attemptId}`;
      return rows[0]?.request_key ?? null;
    },
  );

  const linkedHandoffFor = Effect.fn("RuntimeTaskExecutionService.linkedHandoffFor")(function* (
    projectId: ProjectId,
    attempt: RuntimeExecutionAttempt,
  ) {
    if (attempt.handoffId === undefined || attempt.handoffId === null) return null;
    return yield* runtime
      .readHandoff(projectId, attempt.handoffId)
      .pipe(Effect.catchTags({ ProjectRuntimeNotFoundError: () => Effect.succeed(null) }));
  });

  const repairCyclesFor = Effect.fn("RuntimeTaskExecutionService.repairCyclesFor")(function* (
    projectId: ProjectId,
    repairTaskId: ProjectRuntimeTaskId,
    excludeAttemptId?: RuntimeExecutionAttemptId,
  ) {
    const rows = yield* sql<{ readonly count: number }>`SELECT count(*) AS count
      FROM project_runtime_execution_attempts
      WHERE project_id = ${projectId} AND task_id = ${repairTaskId}
        AND request_key GLOB 'cont:v1:p:*'
        ${excludeAttemptId === undefined ? sql`` : sql`AND attempt_id <> ${excludeAttemptId}`}`;
    // The public entry point reserves the whole `cont:v1:` namespace, so every
    // row counted here is host-issued rather than a caller-chosen key.
    return rows[0]?.count ?? 0;
  });

  const readContinuationSource = Effect.fn("RuntimeTaskExecutionService.readContinuationSource")(
    function* (projectId: ProjectId, sourceTaskId: ProjectRuntimeTaskId) {
      const option = yield* runtime.readTask(projectId, sourceTaskId).pipe(Effect.option);
      if (Option.isNone(option)) return null;
      const sourceTask = option.value;
      const policy = sourceTask.continuation;
      if (policy?.mode !== "synthetic") return null;
      if (!["planned", "ready", "active", "review"].includes(sourceTask.status)) return null;
      return { sourceTask, policy } satisfies ContinuationSource;
    },
  );

  /**
   * Re-derives a review decision from current durable state. A request key
   * prefix is never sufficient: the source status/policy, the linked terminal
   * handoff and reviewer independence must still produce exactly this key.
   */
  const authorizeReviewContinuation = Effect.fn(
    "RuntimeTaskExecutionService.authorizeReviewContinuation",
  )(function* (input: {
    readonly projectId: ProjectId;
    readonly sourceTaskId: ProjectRuntimeTaskId;
    readonly targetTaskId: ProjectRuntimeTaskId;
    readonly requestKey: string;
  }) {
    const parsed = parseContinuationRequestKey(input.requestKey);
    if (parsed?.kind !== "r") return null;
    const source = yield* readContinuationSource(input.projectId, input.sourceTaskId);
    if (source === null) return null;
    const { sourceTask, policy } = source;
    if (policy.reviewTaskId !== input.targetTaskId) return null;
    // The chain is authorized by the source snapshot the operator accepted. If
    // the source was edited after its root handoff, this decision is stale even
    // when the immediately reviewed task did not change.
    const rootAttempt = yield* readRootAttempt(input.projectId, input.sourceTaskId);
    if (
      rootAttempt === null ||
      sourceTask.revision !== rootAttempt.receipt.packet.taskRevision + 1
    ) {
      return null;
    }

    const linkedOption = yield* readAttemptRow(input.projectId, parsed.attemptId).pipe(
      Effect.option,
    );
    if (Option.isNone(linkedOption)) return null;
    const linked = linkedOption.value;
    if (linked.taskId !== input.sourceTaskId && linked.taskId !== policy.repairTaskId) return null;
    const linkedHandoff = yield* linkedHandoffFor(input.projectId, linked);
    if (linkedHandoff === null || !handoffMatchesAttempt(linked, linkedHandoff)) return null;
    const cursorTaskOption = yield* runtime
      .readTask(input.projectId, linked.taskId)
      .pipe(Effect.option);
    if (Option.isNone(cursorTaskOption)) return null;
    const cursorTask = cursorTaskOption.value;
    // This is the launch/receipt authorization boundary, so it binds the exact
    // authoritative revision: the handoff advanced the task once from the packet
    // revision. A later operator edit (scope, acceptance, status) is a different
    // decision and must be re-authorized explicitly rather than inherited.
    if (cursorTask.revision !== linked.receipt.packet.taskRevision + 1) return null;
    const decision = evaluateContinuation({
      stage: "after_worker",
      sourceTask,
      cursorTask,
      cursorAttempt: linked,
      cursorHandoff: linkedHandoff,
      repairCyclesSpent: 0,
    });
    if (decision.action !== "review" || decision.requestKey !== input.requestKey) return null;
    return {
      kind: "r" as const,
      sourceTask,
      sourceAttempt: linked,
      sourceHandoff: linkedHandoff,
    };
  });

  /**
   * Re-derives a repair decision, including the review's own authorization.
   * The repair budget is the count of persisted repair receipts for this
   * policy, so replay and restart cannot reset it.
   */
  const authorizeContinuationDispatch = Effect.fn(
    "RuntimeTaskExecutionService.authorizeContinuationDispatch",
  )(function* (input: {
    readonly projectId: ProjectId;
    readonly sourceTaskId: ProjectRuntimeTaskId;
    readonly targetTaskId: ProjectRuntimeTaskId;
    readonly requestKey: string;
    readonly excludeAttemptId?: RuntimeExecutionAttemptId;
  }) {
    const parsed = parseContinuationRequestKey(input.requestKey);
    if (parsed === null) return null;
    if (parsed.kind === "r") return yield* authorizeReviewContinuation(input);

    const source = yield* readContinuationSource(input.projectId, input.sourceTaskId);
    if (source === null) return null;
    const { sourceTask, policy } = source;
    const repairTaskId = policy.repairTaskId;
    if (repairTaskId === undefined || repairTaskId !== input.targetTaskId) return null;

    const linkedOption = yield* readAttemptRow(input.projectId, parsed.attemptId).pipe(
      Effect.option,
    );
    if (Option.isNone(linkedOption)) return null;
    const linked = linkedOption.value;
    if (linked.taskId !== policy.reviewTaskId) return null;
    const linkedHandoff = yield* linkedHandoffFor(input.projectId, linked);
    if (linkedHandoff === null) return null;

    const reviewKey = yield* requestKeyForAttempt(input.projectId, linked.attemptId);
    if (reviewKey === null) return null;
    // A repair cannot bootstrap from a standalone or hand-written review row.
    const reviewAuthorization = yield* authorizeReviewContinuation({
      projectId: input.projectId,
      sourceTaskId: input.sourceTaskId,
      targetTaskId: policy.reviewTaskId,
      requestKey: reviewKey,
    });
    if (reviewAuthorization === null) return null;
    const cursor = reviewAuthorization.sourceAttempt;
    if (cursor.taskId !== input.sourceTaskId && cursor.taskId !== repairTaskId) return null;
    const cursorTaskOption = yield* runtime
      .readTask(input.projectId, cursor.taskId)
      .pipe(Effect.option);
    if (Option.isNone(cursorTaskOption)) return null;
    const reviewTaskOption = yield* runtime
      .readTask(input.projectId, policy.reviewTaskId)
      .pipe(Effect.option);
    if (Option.isNone(reviewTaskOption)) return null;
    const cursorTask = cursorTaskOption.value;
    const reviewTask = reviewTaskOption.value;
    // Repair authorization inherits the reviewed work and the reviewer verdict.
    // Both revisions must still be exactly the post-handoff revision recorded in
    // their receipts; otherwise the operator changed the accepted source or the
    // reviewer instructions after dispatch.
    if (
      cursorTask.revision !== cursor.receipt.packet.taskRevision + 1 ||
      reviewTask.revision !== linked.receipt.packet.taskRevision + 1
    ) {
      return null;
    }
    const cycles = yield* repairCyclesFor(input.projectId, repairTaskId, input.excludeAttemptId);
    const decision = evaluateContinuation({
      stage: "after_review",
      sourceTask,
      cursorTask,
      cursorAttempt: cursor,
      cursorHandoff: reviewAuthorization.sourceHandoff,
      repairCyclesSpent: cycles,
      reviewTask,
      reviewAttempt: linked,
      reviewHandoff: linkedHandoff,
    });
    if (decision.action !== "repair_or_retry" || decision.requestKey !== input.requestKey)
      return null;
    return {
      kind: "p" as const,
      sourceTask,
      sourceAttempt: linked,
      sourceHandoff: linkedHandoff,
    };
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
        updated_at = ${next.updatedAt}, payload_json = CASE WHEN json_type(payload_json, '$.continuationAuthorization') IS NULL THEN ${payload} ELSE json_set(${payload}, '$.continuationAuthorization', json_extract(payload_json, '$.continuationAuthorization')) END
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
    authorization?: Authorization,
  ) {
    const commandId = CommandId.make(`command:runtime-execution:${attempt.attemptId}:launch`);
    const messageId = MessageId.make(`message:runtime-execution:${attempt.attemptId}`);
    const result = yield* launch
      .launch({
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
      })
      .pipe(Effect.provideService(PrivateContinuationAuthorization, authorization));
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
      status: run.status === "cancelled" ? "cancelled" : "launched",
      runId: run.id,
      failure: run.status === "cancelled" ? "Continuation revoked before provider start." : null,
    });
  });

  const threadPresence = Effect.fn("RuntimeTaskExecutionService.threadPresence")(function* (
    threadId: RuntimeExecutionAttempt["threadId"],
  ) {
    const shell = yield* threads.getThreadShell(threadId).pipe(
      Effect.asSome,
      Effect.orElseSucceed(() => Option.none()),
    );
    // A failed read is ambiguous, not proof that the thread is absent.
    if (Option.isNone(shell)) return "unknown" as const;
    return shell.value === null ? ("absent" as const) : ("present" as const);
  });

  const launchAttempt = Effect.fn("RuntimeTaskExecutionService.launchAttempt")(function* (
    attempt: RuntimeExecutionAttempt,
  ) {
    let commitAuthorization: Authorization | undefined;
    const requestKey = yield* requestKeyForAttempt(attempt.projectId, attempt.attemptId);
    if (requestKey !== null && isReservedContinuationRequestKey(requestKey)) {
      // A disabled gate is checked before any authorization or launch. Replay of
      // a saved continuation receipt must never become an enablement path.
      if (!continuationEnabled) {
        const presence = yield* threadPresence(attempt.threadId);
        yield* Effect.logWarning("runtime-execution.continuation-disabled", {
          attemptId: attempt.attemptId,
          threadPresent: presence === "present",
          threadPresence: presence,
          packetTaskRevision: attempt.receipt.packet.taskRevision,
        });
        return yield* updateAttempt({
          attempt,
          status: presence === "absent" ? "cancelled" : "reconcile_required",
          runId: attempt.runId,
          failure:
            presence === "absent"
              ? "Synthetic continuation is disabled on this server; no work was started."
              : "Synthetic continuation is disabled on this server. Reconcile this attempt; no new turn was started.",
        });
      }
      // A pending receipt replays the packet that was authorized for one exact
      // target revision. If the operator edited that task after insertion, the
      // stored instructions are stale and must not launch.
      const targetOption = yield* runtime
        .readTask(attempt.projectId, attempt.taskId)
        .pipe(Effect.option);
      const target = Option.isNone(targetOption) ? null : targetOption.value;
      const targetFresh =
        target !== null && target.revision === attempt.receipt.packet.taskRevision;
      const sourceIds = yield* continuationSourceIds(attempt.projectId, attempt.taskId);
      const authorization =
        !targetFresh || sourceIds.length !== 1
          ? null
          : yield* authorizeContinuationDispatch({
              projectId: attempt.projectId,
              sourceTaskId: sourceIds[0]!,
              targetTaskId: attempt.taskId,
              requestKey,
              excludeAttemptId: attempt.attemptId,
            });
      // The receipt insert is the dispatch boundary; this narrows, but does not
      // close, the gap between that insert and the external launch (including
      // pending replay after restart). A launched thread is reconciled, never
      // discarded.
      if (authorization === null) {
        const presence = yield* threadPresence(attempt.threadId);
        yield* Effect.logWarning("runtime-execution.continuation-revoked", {
          attemptId: attempt.attemptId,
          threadPresent: presence === "present",
          threadPresence: presence,
          packetTaskRevision: attempt.receipt.packet.taskRevision,
          currentTaskRevision: target?.revision ?? null,
        });
        return yield* updateAttempt({
          attempt,
          status: presence === "absent" ? "cancelled" : "reconcile_required",
          runId: attempt.runId,
          failure:
            presence === "absent"
              ? "Continuation authorization was withdrawn or superseded before launch; no work was started."
              : "Continuation authorization was withdrawn or superseded before launch. Reconcile this attempt; no new turn was started.",
        });
      }
      commitAuthorization = {
        projectId: attempt.projectId,
        sourceTaskId: authorization.sourceTask.taskId,
        sourceRevision: authorization.sourceTask.revision,
        targetTaskId: attempt.taskId,
        targetRevision: attempt.receipt.packet.taskRevision,
        attemptId: attempt.attemptId,
        threadId: attempt.threadId,
        requestKey,
        kind: authorization.kind,
      };
      const authorizationJson = yield* encodeAuthorization(commitAuthorization).pipe(Effect.orDie);
      yield* sql`UPDATE project_runtime_execution_attempts
        SET payload_json = json_set(payload_json, '$.continuationAuthorization', json(${authorizationJson}))
        WHERE project_id = ${attempt.projectId} AND attempt_id = ${attempt.attemptId}`;
    }
    return yield* runLaunch(attempt, commitAuthorization).pipe(
      Effect.catch((cause) =>
        Effect.gen(function* () {
          const shell = yield* threads.getThreadShell(attempt.threadId).pipe(
            Effect.asSome,
            Effect.orElseSucceed(() => Option.none()),
          );
          const threadKnownAbsent = Option.isSome(shell) && shell.value === null;
          const projection =
            commitAuthorization === undefined || threadKnownAbsent
              ? Option.none()
              : yield* threads.getThreadProjection(attempt.threadId).pipe(Effect.option);
          const runKnownAbsent =
            Option.isSome(projection) &&
            !projection.value.runs.some(
              (run) => run.userMessageId === `message:runtime-execution:${attempt.attemptId}`,
            );
          let denialCause: unknown = cause;
          const visited = new Set<unknown>();
          while (
            typeof denialCause === "object" &&
            denialCause !== null &&
            !isCommitDenied(denialCause) &&
            !visited.has(denialCause)
          ) {
            visited.add(denialCause);
            denialCause = "cause" in denialCause ? denialCause.cause : undefined;
          }
          const denied = isCommitDenied(denialCause);
          // Compensation can already have cancelled the attempt and run. Preserve that
          // decision explicitly rather than relying on updateAttempt's revision CAS.
          if (denied) {
            const current = yield* readAttemptRow(attempt.projectId, attempt.attemptId);
            if (current.status === "cancelled") return current;
          }
          const runCancelled =
            Option.isSome(projection) &&
            projection.value.runs.some(
              (run) =>
                run.userMessageId === `message:runtime-execution:${attempt.attemptId}` &&
                run.status === "cancelled",
            );
          const status: AttemptStatus =
            denied && (runKnownAbsent || runCancelled)
              ? "cancelled"
              : threadKnownAbsent
                ? !denied
                  ? "failed"
                  : "cancelled"
                : "reconcile_required";
          const failure =
            status === "cancelled"
              ? "Continuation authorization was revoked before a run committed; no work was started."
              : status === "failed"
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
        // A revoked continuation start is uncertain; the best-effort stop that follows it must
        // not silently resolve that uncertainty into a terminal run status.
        if (attempt.status === "reconcile_required") {
          const requestKey = yield* requestKeyForAttempt(attempt.projectId, attempt.attemptId);
          if (requestKey !== null && isReservedContinuationRequestKey(requestKey)) {
            return run.id === attempt.runId && handoffId === (attempt.handoffId ?? null)
              ? attempt
              : yield* updateAttempt({
                  attempt,
                  status: "reconcile_required",
                  runId: run.id,
                  failure: attempt.failure,
                  handoffId,
                });
          }
        }
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

  /** Operator policy is the only authorization; durable request keys, not
   * reviewer wording, drive each link, and the existing receipt replays its ids. */
  const advanceContinuation = Effect.fn("RuntimeTaskExecutionService.advanceContinuation")(
    function* (projectId: ProjectId, sourceTaskId: ProjectRuntimeTaskId) {
      // Disabled means inert: no automatic review, repair, blocked-state write
      // or launch. Ordinary task execution and reconciliation are unaffected.
      if (!continuationEnabled) {
        yield* Effect.logDebug("runtime-execution.continuation-disabled", {
          projectId,
          sourceTaskId,
        });
        return;
      }
      const sourceTask = yield* runtime.readTask(projectId, sourceTaskId);
      const policy = sourceTask.continuation;
      if (
        policy?.mode !== "synthetic" ||
        !["planned", "ready", "active", "review"].includes(sourceTask.status)
      )
        return;
      // A shared target would allow one policy's completion to influence
      // another policy. Fail closed rather than arbitrating ownership.
      const collisions = yield* sql<{ readonly count: number }>`SELECT count(*) AS count
        FROM project_runtime_tasks WHERE project_id = ${projectId}
          AND json_extract(payload_json, '$.continuation.mode') = 'synthetic'
          AND (
            json_extract(payload_json, '$.continuation.reviewTaskId') IN (${policy.reviewTaskId}, ${policy.repairTaskId ?? ""})
            OR json_extract(payload_json, '$.continuation.repairTaskId') IN (${policy.reviewTaskId}, ${policy.repairTaskId ?? ""})
          )`;
      if ((collisions[0]?.count ?? 0) !== 1) return;

      const rootAttempt = yield* readRootAttempt(projectId, sourceTaskId);
      // The latest implementation attempt is the only candidate. No implicit
      // choice is made when two root attempts share the same recorded instant.
      if (rootAttempt === null) return;
      let cursor = yield* lane.withPermits(1)(reconcileAttemptRow(rootAttempt));
      if (sourceTask.revision !== cursor.receipt.packet.taskRevision + 1) return;
      let cursorTask: ProjectRuntimeTask = sourceTask;
      let cycles = 0;

      // No external question is emitted: the single durable blocked task is the
      // operator-facing escalation receipt for this synthetic spike.
      const holdForUser = Effect.fn("RuntimeTaskExecutionService.holdForUser")(function* (
        reason: string,
        sourceAttemptId: string,
        evidenceHandoffId: string | null,
        expectedSourceRevision: number,
      ) {
        const current = yield* runtime.readTask(projectId, sourceTaskId);
        if (current.status === "blocked" || current.status === "cancelled") return;
        // The escalation describes the snapshot that produced it. A newer
        // operator decision (done, deferred, or withdrawn continuation) advances
        // the revision; the delayed stop must not overwrite it.
        if (
          current.revision !== expectedSourceRevision ||
          current.continuation?.mode !== "synthetic"
        ) {
          yield* Effect.logWarning("runtime-execution.continuation-stop-superseded", {
            projectId,
            taskId: sourceTaskId,
            expectedSourceRevision,
            currentRevision: current.revision,
            status: current.status,
          });
          return;
        }
        const written = yield* runtime
          .updateTask(
            projectId,
            {
              taskId: sourceTaskId,
              expectedRevision: expectedSourceRevision,
              status: "blocked",
              blocker: {
                classification: "review-required",
                summary: "Continuation stopped for operator review",
                detail: `Synthetic continuation stopped: ${reason}. Source attempt: ${sourceAttemptId}. Evidence handoff: ${evidenceHandoffId ?? "none"}.`,
              },
              nextAction: "Review the evidence and explicitly authorize any further work.",
            },
            { actor: "runtime:continuation" },
          )
          .pipe(
            Effect.catchTags({
              ProjectRuntimeConflictError: (conflict) =>
                Effect.logWarning("runtime-execution.continuation-stop-superseded", {
                  projectId,
                  taskId: sourceTaskId,
                  expectedSourceRevision,
                  currentRevision: conflict.currentRevision,
                }).pipe(Effect.as(null)),
            }),
          );
        if (written === null) return;
      });

      const dispatchAuthorized = Effect.fn("RuntimeTaskExecutionService.dispatchContinuation")(
        function* (
          targetTaskId: ProjectRuntimeTaskId,
          requestKey: string,
          compareWith: RuntimeExecutionAttempt,
          independentReview: boolean,
        ) {
          const target = yield* runtime.readTask(projectId, targetTaskId);
          if (
            !EXECUTABLE_TASK_STATUSES.has(target.status) ||
            target.projectId !== sourceTask.projectId ||
            (independentReview && target.owner === sourceTask.owner)
          )
            return;

          const active = yield* sql<{ readonly request_key: string | null }>`SELECT request_key
            FROM project_runtime_execution_attempts
            WHERE project_id = ${projectId} AND task_id = ${targetTaskId}
              AND status IN ('pending', 'launched', 'cancelling', 'reconcile_required')
            LIMIT 1`;
          if (active[0] !== undefined && active[0].request_key !== requestKey) return;

          if (independentReview) {
            // Do not infer independence from a role string or prompt. An
            // explicit eligible alternative provider instance is required.
            const reviewRoute = yield* routing.resolveRoute({ projectId, taskId: targetTaskId });
            if (
              reviewRoute.status !== "resolved" ||
              reviewRoute.selected === null ||
              reviewRoute.selected.providerInstanceId === compareWith.modelSelection.instanceId
            ) {
              return;
            }
          }
          // The internal dispatcher re-derives the policy decision and inserts
          // the receipt with a source-revision CAS. Never call ThreadLaunchService
          // directly here, and never accept a caller-minted continuation key.
          yield* dispatchContinuation({
            projectId,
            sourceTaskId,
            targetTaskId,
            requestKey,
            expectedTargetRevision: target.revision,
          });
        },
      );

      // Synthetic budget is at most two. A review/repair row already persisted
      // under a request key consumes the same slot regardless of provider,
      // restart, event replay, or rephrased reviewer complaint.
      for (let step = 0; step <= policy.maxRepairCycles; step++) {
        const cursorHandoff = yield* linkedHandoffFor(projectId, cursor);
        const workerDecision = evaluateContinuation({
          stage: "after_worker",
          sourceTask,
          cursorTask,
          cursorAttempt: cursor,
          cursorHandoff,
          repairCyclesSpent: cycles,
        });
        if (workerDecision.action !== "review" || workerDecision.requestKey === null) {
          if (workerDecision.action === "ask_user" || workerDecision.action === "blocked") {
            yield* holdForUser(
              workerDecision.reason,
              cursor.attemptId,
              cursor.handoffId ?? null,
              workerDecision.sourceTaskRevision,
            );
          }
          return;
        }
        const reviewTask = yield* runtime.readTask(projectId, policy.reviewTaskId);
        const reviewKey = workerDecision.requestKey;
        const savedReview = yield* readByRequestKey(projectId, policy.reviewTaskId, reviewKey);
        const review =
          savedReview === null
            ? null
            : yield* lane.withPermits(1)(reconcileAttemptRow(savedReview));
        if (review === null) {
          if (cursorTask.revision !== cursor.receipt.packet.taskRevision + 1) return;
          yield* dispatchAuthorized(policy.reviewTaskId, reviewKey, cursor, true);
          return;
        }
        if (!TERMINAL_ATTEMPT_STATUSES.has(review.status)) return;
        const reviewHandoff = yield* linkedHandoffFor(projectId, review);
        const reviewDecision = evaluateContinuation({
          stage: "after_review",
          sourceTask,
          cursorTask,
          cursorAttempt: cursor,
          cursorHandoff,
          repairCyclesSpent: cycles,
          reviewTask,
          reviewAttempt: review,
          reviewHandoff,
        });
        if (reviewDecision.action === "ask_user" || reviewDecision.action === "blocked") {
          yield* holdForUser(
            reviewDecision.reason,
            review.attemptId,
            review.handoffId ?? null,
            reviewDecision.sourceTaskRevision,
          );
          return;
        }
        if (
          reviewDecision.action !== "repair_or_retry" ||
          reviewDecision.requestKey === null ||
          policy.repairTaskId === undefined
        )
          return;

        const repair = yield* readByRequestKey(
          projectId,
          policy.repairTaskId,
          reviewDecision.requestKey,
        );
        if (repair === null) {
          if (reviewTask.revision !== review.receipt.packet.taskRevision + 1) return;
          yield* dispatchAuthorized(policy.repairTaskId, reviewDecision.requestKey, review, false);
          return;
        }
        cycles += 1;
        const reconciledRepair = yield* lane.withPermits(1)(reconcileAttemptRow(repair));
        if (!TERMINAL_ATTEMPT_STATUSES.has(reconciledRepair.status)) return;
        cursor = reconciledRepair;
        cursorTask = yield* runtime.readTask(projectId, policy.repairTaskId);
      }
    },
  );

  const continuationSourceIds = Effect.fn("RuntimeTaskExecutionService.continuationSourceIds")(
    function* (projectId: ProjectId, taskId: ProjectRuntimeTaskId) {
      const rows = yield* sql<{ readonly task_id: string }>`SELECT task_id
        FROM project_runtime_tasks
        WHERE project_id = ${projectId}
          AND (
            (task_id = ${taskId} AND json_extract(payload_json, '$.continuation.mode') = 'synthetic')
            OR json_extract(payload_json, '$.continuation.reviewTaskId') = ${taskId}
            OR json_extract(payload_json, '$.continuation.repairTaskId') = ${taskId}
          )
        ORDER BY task_id`;
      // Sharing review/repair lanes between policies is ambiguous; stop rather
      // than guessing which project decision owns the completion event.
      return rows.length === 1 ? [ProjectRuntimeTaskId.make(rows[0]!.task_id)] : [];
    },
  );

  const advanceAfterReconcile = Effect.fn("RuntimeTaskExecutionService.advanceAfterReconcile")(
    function* (attempt: RuntimeExecutionAttempt) {
      if (!TERMINAL_ATTEMPT_STATUSES.has(attempt.status)) return;
      const sourceIds = yield* continuationSourceIds(attempt.projectId, attempt.taskId);
      for (const sourceTaskId of sourceIds) {
        yield* advanceContinuation(attempt.projectId, sourceTaskId).pipe(
          Effect.catchCause((cause) =>
            Effect.logWarning("runtime-execution.continuation-blocked", {
              projectId: attempt.projectId,
              taskId: sourceTaskId,
              cause,
            }),
          ),
        );
      }
    },
  );

  const reconcileAttempt: RuntimeTaskExecutionService["Service"]["reconcileAttempt"] = Effect.fn(
    "RuntimeTaskExecutionService.reconcileAttempt",
  )(function* (projectId, attemptId) {
    const reconciled = yield* lane.withPermits(1)(
      Effect.gen(function* () {
        yield* runtime.getStatus(projectId);
        const attempt = yield* readAttemptRow(projectId, attemptId);
        return yield* reconcileAttemptRow(attempt);
      }),
    );
    yield* advanceAfterReconcile(reconciled);
    return reconciled;
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
      // Catch a crash after terminal settlement but before the authorized
      // follow-up dispatch. Historical terminal rows remain authoritative.
      const configured = yield* sql<{
        readonly project_id: string;
        readonly task_id: string;
      }>`SELECT project_id, task_id FROM project_runtime_tasks
        WHERE json_extract(payload_json, '$.continuation.mode') = 'synthetic'
        ORDER BY project_id, task_id`;
      yield* Effect.forEach(
        configured,
        (row) =>
          advanceContinuation(
            row.project_id as ProjectId,
            ProjectRuntimeTaskId.make(row.task_id),
          ).pipe(
            Effect.catchCause((cause) =>
              Effect.logWarning("runtime-execution.continuation-recovery-blocked", {
                projectId: row.project_id,
                taskId: row.task_id,
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
          `command:runtime-execution:${attempt.attemptId}:cancel:${yield* random.uuidV4()}`,
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

  const runExecute = Effect.fn("RuntimeTaskExecutionService.runExecute")(function* (
    projectId: ProjectId,
    input: {
      readonly taskId: ProjectRuntimeTaskId;
      readonly expectedTaskRevision: number;
      readonly clientRequestId?: string;
    },
    continuation: ContinuationAuthorization | null,
  ) {
    return yield* lane.withPermits(1)(
      Effect.gen(function* () {
        const status = yield* runtime.getStatus(projectId);
        if (!status.enabled) return yield* new ProjectRuntimeDisabledError({ projectId });

        // Defense in depth: only the internal dispatcher can request a
        // continuation, and only while the server gate is explicitly enabled.
        if (continuation !== null && !continuationEnabled) {
          return yield* rejected(
            projectId,
            input.taskId,
            "task_not_executable",
            "Synthetic continuation is disabled on this server.",
          );
        }

        // Defense in depth for the public entry point: the entire continuation
        // namespace is reserved, including malformed keys that never parse.
        if (
          continuation === null &&
          input.clientRequestId !== undefined &&
          isReservedContinuationRequestKey(input.clientRequestId)
        ) {
          return yield* rejected(
            projectId,
            input.taskId,
            "task_not_executable",
            "Continuation request keys are reserved for server-issued continuation dispatch.",
          );
        }

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
        const continuationOrigin: RuntimeTaskContinuationOrigin | undefined =
          continuation === null
            ? undefined
            : {
                sourceTaskId: continuation.sourceAttempt.taskId,
                sourceAttemptId: continuation.sourceAttempt.attemptId,
                sourceHandoffId: continuation.sourceHandoff.handoffId,
              };
        if (
          continuation?.kind === "r" &&
          (continuation.sourceTask.owner === task.owner ||
            continuation.sourceAttempt.modelSelection.instanceId ===
              resolved.launchPlan.modelSelection.instanceId)
        ) {
          return yield* rejected(
            projectId,
            task.taskId,
            "task_not_executable",
            "The resolved reviewer is not independent of the source worker.",
          );
        }
        const packetText = buildRuntimeTaskPacket(task, handoff, continuationOrigin);
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
            ${
              continuation === null
                ? sql``
                : sql`AND EXISTS (
                    SELECT 1 FROM project_runtime_tasks
                    WHERE project_id = ${projectId}
                      AND task_id = ${continuation.sourceTask.taskId}
                      AND revision = ${continuation.sourceTask.revision}
                      AND status IN ('planned', 'ready', 'active', 'review')
                      AND json_extract(payload_json, '$.continuation.mode') = 'synthetic'
                  )`
            }
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
          if (continuation !== null) {
            return yield* rejected(
              projectId,
              task.taskId,
              "task_not_executable",
              "Continuation authorization changed before dispatch.",
            );
          }
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

  const execute: RuntimeTaskExecutionService["Service"]["execute"] = Effect.fn(
    "RuntimeTaskExecutionService.execute",
  )(function* (projectId, input) {
    return yield* runExecute(projectId, input, null);
  });

  const dispatchContinuation = Effect.fn("RuntimeTaskExecutionService.dispatchContinuation")(
    function* (input: {
      readonly projectId: ProjectId;
      readonly sourceTaskId: ProjectRuntimeTaskId;
      readonly targetTaskId: ProjectRuntimeTaskId;
      readonly requestKey: string;
      readonly expectedTargetRevision: number;
    }) {
      if (!continuationEnabled) {
        yield* Effect.logWarning("runtime-execution.continuation-disabled", {
          projectId: input.projectId,
          sourceTaskId: input.sourceTaskId,
          targetTaskId: input.targetTaskId,
        });
        return null;
      }
      const authorization = yield* authorizeContinuationDispatch({
        projectId: input.projectId,
        sourceTaskId: input.sourceTaskId,
        targetTaskId: input.targetTaskId,
        requestKey: input.requestKey,
      });
      if (authorization === null) {
        yield* Effect.logWarning("runtime-execution.continuation-stale-decision", {
          projectId: input.projectId,
          sourceTaskId: input.sourceTaskId,
          targetTaskId: input.targetTaskId,
        });
        return null;
      }
      return yield* runExecute(
        input.projectId,
        {
          taskId: input.targetTaskId,
          expectedTaskRevision: input.expectedTargetRevision,
          clientRequestId: input.requestKey,
        },
        authorization,
      );
    },
  );

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
