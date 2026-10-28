import { runtimeErrorMessage } from "./ProjectRuntimeErrors";
import { useConnectedEnvironmentIds } from "../../state/environments";
import { useAtomValue } from "@effect/atom-react";
import type {
  EnvironmentId,
  ProjectId,
  ProjectRuntimeSetEnabledInput,
  ProjectRuntimeInstructionsSaveInput,
  ProjectRuntimeSourceListInput,
  ProjectRuntimeSourceCreateInput,
  ProjectRuntimeSourceUpdateInput,
  ProjectRuntimeSourceRemoveInput,
  ProjectRuntimeTaskListInput,
  ProjectRuntimeTaskReadInput,
  ProjectRuntimeTaskCreateInput,
  ProjectRuntimeTaskUpdateInput,
  ProjectRuntimeHandoffListInput,
  ProjectRuntimeHandoffReadInput,
  ProjectRuntimeRoutingSaveInput,
  RuntimeRouteResolutionInput,
  ExecuteProjectRuntimeTaskInput,
  ListRuntimeExecutionAttemptsInput,
  ReadRuntimeExecutionAttemptInput,
} from "@t3tools/contracts";
import {
  squashAtomCommandFailure,
  type AtomCommandResult,
} from "@t3tools/client-runtime/state/runtime";
import { useAtomCommand } from "../../state/use-atom-command";
import { projectRuntimeEnvironment as commands } from "../../state/projectRuntime";

export type RuntimeResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string; conflict: boolean };

function result<A, E>(value: AtomCommandResult<A, E>): RuntimeResult<A> {
  if (value._tag === "Success") return { ok: true, value: value.value };
  const error = value._tag === "Failure" ? squashAtomCommandFailure(value) : undefined;
  return {
    ok: false,
    message: runtimeErrorMessage(error),
    conflict:
      typeof error === "object" &&
      error !== null &&
      "_tag" in error &&
      (error._tag === "ProjectRuntimeConflictError" ||
        error._tag === "ProjectRuntimeRoutingConflictError"),
  };
}
export function useProjectRuntimeApi(target: {
  environmentId: EnvironmentId;
  projectId: ProjectId;
}) {
  const status = useAtomCommand(commands.status, { reportFailure: false });
  const setEnabled = useAtomCommand(commands.setEnabled, { reportFailure: false });
  const readInstructions = useAtomCommand(commands.readInstructions, { reportFailure: false });
  const saveInstructions = useAtomCommand(commands.saveInstructions, { reportFailure: false });
  const listSources = useAtomCommand(commands.listSources, { reportFailure: false });
  const createSource = useAtomCommand(commands.createSource, { reportFailure: false });
  const updateSource = useAtomCommand(commands.updateSource, { reportFailure: false });
  const removeSource = useAtomCommand(commands.removeSource, { reportFailure: false });
  const listTasks = useAtomCommand(commands.listTasks, { reportFailure: false });
  const readTask = useAtomCommand(commands.readTask, { reportFailure: false });
  const createTask = useAtomCommand(commands.createTask, { reportFailure: false });
  const updateTask = useAtomCommand(commands.updateTask, { reportFailure: false });
  const listHandoffs = useAtomCommand(commands.listHandoffs, { reportFailure: false });
  const readHandoff = useAtomCommand(commands.readHandoff, { reportFailure: false });
  const readRouting = useAtomCommand(commands.readRouting, { reportFailure: false });
  const saveRouting = useAtomCommand(commands.saveRouting, { reportFailure: false });
  const resolveRoute = useAtomCommand(commands.resolveRoute, { reportFailure: false });
  const executeTask = useAtomCommand(commands.executeTask, { reportFailure: false });
  const listExecutionAttempts = useAtomCommand(commands.listExecutionAttempts, {
    reportFailure: false,
  });
  const readExecutionAttempt = useAtomCommand(commands.readExecutionAttempt, {
    reportFailure: false,
  });
  const canEdit = useAtomValue(commands.setEnabled.permissionAtom(target.environmentId));
  const ready = useConnectedEnvironmentIds().includes(target.environmentId);
  return {
    ready,
    canEdit,
    status: async () =>
      result(
        await status({
          environmentId: target.environmentId,
          input: { projectId: target.projectId },
        }),
      ),
    setEnabled: async (input: ProjectRuntimeSetEnabledInput) =>
      result(
        await setEnabled({
          environmentId: target.environmentId,
          input: { ...input, projectId: target.projectId },
        }),
      ),
    readInstructions: async () =>
      result(
        await readInstructions({
          environmentId: target.environmentId,
          input: { projectId: target.projectId },
        }),
      ),
    saveInstructions: async (input: ProjectRuntimeInstructionsSaveInput) =>
      result(
        await saveInstructions({
          environmentId: target.environmentId,
          input: { ...input, projectId: target.projectId },
        }),
      ),
    listSources: async (input: ProjectRuntimeSourceListInput) =>
      result(
        await listSources({
          environmentId: target.environmentId,
          input: { ...input, projectId: target.projectId },
        }),
      ),
    createSource: async (input: ProjectRuntimeSourceCreateInput) =>
      result(
        await createSource({
          environmentId: target.environmentId,
          input: { ...input, projectId: target.projectId },
        }),
      ),
    updateSource: async (input: ProjectRuntimeSourceUpdateInput) =>
      result(
        await updateSource({
          environmentId: target.environmentId,
          input: { ...input, projectId: target.projectId },
        }),
      ),
    removeSource: async (input: ProjectRuntimeSourceRemoveInput) =>
      result(
        await removeSource({
          environmentId: target.environmentId,
          input: { ...input, projectId: target.projectId },
        }),
      ),
    listTasks: async (input: ProjectRuntimeTaskListInput) =>
      result(
        await listTasks({
          environmentId: target.environmentId,
          input: { ...input, projectId: target.projectId },
        }),
      ),
    readTask: async (input: ProjectRuntimeTaskReadInput) =>
      result(
        await readTask({
          environmentId: target.environmentId,
          input: { ...input, projectId: target.projectId },
        }),
      ),
    createTask: async (input: ProjectRuntimeTaskCreateInput) =>
      result(
        await createTask({
          environmentId: target.environmentId,
          input: { ...input, projectId: target.projectId },
        }),
      ),
    updateTask: async (input: ProjectRuntimeTaskUpdateInput) =>
      result(
        await updateTask({
          environmentId: target.environmentId,
          input: { ...input, projectId: target.projectId },
        }),
      ),
    listHandoffs: async (input: ProjectRuntimeHandoffListInput) =>
      result(
        await listHandoffs({
          environmentId: target.environmentId,
          input: { ...input, projectId: target.projectId },
        }),
      ),
    readHandoff: async (input: ProjectRuntimeHandoffReadInput) =>
      result(
        await readHandoff({
          environmentId: target.environmentId,
          input: { ...input, projectId: target.projectId },
        }),
      ),
    readRouting: async () =>
      result(
        await readRouting({
          environmentId: target.environmentId,
          input: { projectId: target.projectId },
        }),
      ),
    saveRouting: async (input: ProjectRuntimeRoutingSaveInput) =>
      result(
        await saveRouting({
          environmentId: target.environmentId,
          input: { ...input, projectId: target.projectId },
        }),
      ),
    resolveRoute: async (input: Omit<RuntimeRouteResolutionInput, "projectId"> = {}) =>
      result(
        await resolveRoute({
          environmentId: target.environmentId,
          input: { ...input, projectId: target.projectId },
        }),
      ),
    executeTask: async (input: ExecuteProjectRuntimeTaskInput) =>
      result(
        await executeTask({
          environmentId: target.environmentId,
          input: { ...input, projectId: target.projectId },
        }),
      ),
    listExecutionAttempts: async (input: ListRuntimeExecutionAttemptsInput = {}) =>
      result(
        await listExecutionAttempts({
          environmentId: target.environmentId,
          input: { ...input, projectId: target.projectId },
        }),
      ),
    readExecutionAttempt: async (input: ReadRuntimeExecutionAttemptInput) =>
      result(
        await readExecutionAttempt({
          environmentId: target.environmentId,
          input: { ...input, projectId: target.projectId },
        }),
      ),
  };
}
export type ProjectRuntimeApi = ReturnType<typeof useProjectRuntimeApi>;
