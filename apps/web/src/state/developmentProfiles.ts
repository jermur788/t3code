import { createDevelopmentProfilesEnvironmentAtoms } from "@t3tools/client-runtime/state/development-profiles";
import { connectionAtomRuntime } from "../connection/runtime";

export const developmentProfilesEnvironment =
  createDevelopmentProfilesEnvironmentAtoms(connectionAtomRuntime);
