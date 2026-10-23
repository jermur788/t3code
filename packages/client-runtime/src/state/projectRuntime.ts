import { PROJECT_RUNTIME_RPC_METHODS } from "@t3tools/contracts";
import type { Atom } from "effect/reactivity";
import type { EnvironmentRegistry } from "../connection/registry.ts";
import { createEnvironmentRpcCommand } from "./runtime.ts";

export function createProjectRuntimeEnvironmentAtoms<R, E>(
  runtime: Atom.AtomRuntime<EnvironmentRegistry | R, E>,
) {
  return {
    status: createEnvironmentRpcCommand(runtime, {
      label: "environment-command:project-runtime:status",
      tag: PROJECT_RUNTIME_RPC_METHODS.status,
    }),
    setEnabled: createEnvironmentRpcCommand(runtime, {
      label: "environment-command:project-runtime:setEnabled",
      tag: PROJECT_RUNTIME_RPC_METHODS.setEnabled,
    }),
    readInstructions: createEnvironmentRpcCommand(runtime, {
      label: "environment-command:project-runtime:readInstructions",
      tag: PROJECT_RUNTIME_RPC_METHODS.readInstructions,
    }),
    saveInstructions: createEnvironmentRpcCommand(runtime, {
      label: "environment-command:project-runtime:saveInstructions",
      tag: PROJECT_RUNTIME_RPC_METHODS.saveInstructions,
    }),
    listSources: createEnvironmentRpcCommand(runtime, {
      label: "environment-command:project-runtime:listSources",
      tag: PROJECT_RUNTIME_RPC_METHODS.listSources,
    }),
    createSource: createEnvironmentRpcCommand(runtime, {
      label: "environment-command:project-runtime:createSource",
      tag: PROJECT_RUNTIME_RPC_METHODS.createSource,
    }),
    updateSource: createEnvironmentRpcCommand(runtime, {
      label: "environment-command:project-runtime:updateSource",
      tag: PROJECT_RUNTIME_RPC_METHODS.updateSource,
    }),
    removeSource: createEnvironmentRpcCommand(runtime, {
      label: "environment-command:project-runtime:removeSource",
      tag: PROJECT_RUNTIME_RPC_METHODS.removeSource,
    }),
    listTasks: createEnvironmentRpcCommand(runtime, {
      label: "environment-command:project-runtime:listTasks",
      tag: PROJECT_RUNTIME_RPC_METHODS.listTasks,
    }),
    readTask: createEnvironmentRpcCommand(runtime, {
      label: "environment-command:project-runtime:readTask",
      tag: PROJECT_RUNTIME_RPC_METHODS.readTask,
    }),
    createTask: createEnvironmentRpcCommand(runtime, {
      label: "environment-command:project-runtime:createTask",
      tag: PROJECT_RUNTIME_RPC_METHODS.createTask,
    }),
    updateTask: createEnvironmentRpcCommand(runtime, {
      label: "environment-command:project-runtime:updateTask",
      tag: PROJECT_RUNTIME_RPC_METHODS.updateTask,
    }),
    listHandoffs: createEnvironmentRpcCommand(runtime, {
      label: "environment-command:project-runtime:listHandoffs",
      tag: PROJECT_RUNTIME_RPC_METHODS.listHandoffs,
    }),
    readHandoff: createEnvironmentRpcCommand(runtime, {
      label: "environment-command:project-runtime:readHandoff",
      tag: PROJECT_RUNTIME_RPC_METHODS.readHandoff,
    }),
  };
}
