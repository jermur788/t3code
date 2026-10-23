import { createProjectRuntimeEnvironmentAtoms } from "@t3tools/client-runtime/state/project-runtime";
import { connectionAtomRuntime } from "../connection/runtime";
export const projectRuntimeEnvironment =
  createProjectRuntimeEnvironmentAtoms(connectionAtomRuntime);
