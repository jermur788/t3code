import { DEVELOPMENT_PROFILE_RPC_METHODS } from "@t3tools/contracts";
import type { Atom } from "effect/reactivity";
import type { EnvironmentRegistry } from "../connection/registry.ts";
import { createEnvironmentRpcCommand } from "./runtime.ts";

export function createDevelopmentProfilesEnvironmentAtoms<R, E>(
  runtime: Atom.AtomRuntime<EnvironmentRegistry | R, E>,
) {
  return {
    list: createEnvironmentRpcCommand(runtime, {
      label: "environment-command:development-profiles:list",
      tag: DEVELOPMENT_PROFILE_RPC_METHODS.list,
    }),
    read: createEnvironmentRpcCommand(runtime, {
      label: "environment-command:development-profiles:read",
      tag: DEVELOPMENT_PROFILE_RPC_METHODS.read,
    }),
    create: createEnvironmentRpcCommand(runtime, {
      label: "environment-command:development-profiles:create",
      tag: DEVELOPMENT_PROFILE_RPC_METHODS.create,
    }),
    update: createEnvironmentRpcCommand(runtime, {
      label: "environment-command:development-profiles:update",
      tag: DEVELOPMENT_PROFILE_RPC_METHODS.update,
    }),
    remove: createEnvironmentRpcCommand(runtime, {
      label: "environment-command:development-profiles:delete",
      tag: DEVELOPMENT_PROFILE_RPC_METHODS.delete,
    }),
    listProjects: createEnvironmentRpcCommand(runtime, {
      label: "environment-command:development-profiles:list-projects",
      tag: DEVELOPMENT_PROFILE_RPC_METHODS.listProjects,
    }),
    getAssignment: createEnvironmentRpcCommand(runtime, {
      label: "environment-command:development-profiles:get-assignment",
      tag: DEVELOPMENT_PROFILE_RPC_METHODS.getAssignment,
    }),
    setAssignment: createEnvironmentRpcCommand(runtime, {
      label: "environment-command:development-profiles:set-assignment",
      tag: DEVELOPMENT_PROFILE_RPC_METHODS.setAssignment,
    }),
    resolve: createEnvironmentRpcCommand(runtime, {
      label: "environment-command:development-profiles:resolve",
      tag: DEVELOPMENT_PROFILE_RPC_METHODS.resolve,
    }),
  };
}
