import * as Schema from "effect/Schema";
import * as Rpc from "effect/rpc/Rpc";

import { ProjectId } from "./baseSchemas.ts";
import { EnvironmentAuthorizationError } from "./auth.ts";
import {
  DevelopmentProfile,
  DevelopmentProfileCreateInput,
  DevelopmentProfileDeleteInput,
  DevelopmentProfileError,
  DevelopmentProfileId,
  DevelopmentProfileProject,
  DevelopmentProfileUpdateInput,
  EffectiveProjectInstructions,
  ProjectDevelopmentProfile,
  ProjectDevelopmentProfileSetInput,
} from "./developmentProfiles.ts";

export const DEVELOPMENT_PROFILE_RPC_METHODS = {
  list: "developmentProfiles.list",
  read: "developmentProfiles.read",
  create: "developmentProfiles.create",
  update: "developmentProfiles.update",
  delete: "developmentProfiles.delete",
  listProjects: "developmentProfiles.listProjects",
  getAssignment: "developmentProfiles.getAssignment",
  setAssignment: "developmentProfiles.setAssignment",
  resolve: "developmentProfiles.resolve",
} as const;

export class DevelopmentProfileRequestError extends Schema.TaggedError<DevelopmentProfileRequestError>()(
  "DevelopmentProfileRequestError",
  { reason: Schema.Literals(["not_found", "invalid_request", "server_error"]) },
) {
  override get message(): string {
    return this.reason === "not_found"
      ? "This Development Profile is no longer available."
      : this.reason === "invalid_request"
        ? "The Development Profiles request is not valid."
        : "Development Profiles could not complete the request.";
  }
}

const error = Schema.Union([
  DevelopmentProfileError,
  DevelopmentProfileRequestError,
  EnvironmentAuthorizationError,
]);

export const DEVELOPMENT_PROFILE_RPCS = [
  Rpc.make(DEVELOPMENT_PROFILE_RPC_METHODS.list, {
    payload: Schema.Struct({}),
    success: Schema.Array(DevelopmentProfile),
    error,
  }),
  Rpc.make(DEVELOPMENT_PROFILE_RPC_METHODS.read, {
    payload: Schema.Struct({ profileId: DevelopmentProfileId }),
    success: DevelopmentProfile,
    error,
  }),
  Rpc.make(DEVELOPMENT_PROFILE_RPC_METHODS.create, {
    payload: DevelopmentProfileCreateInput,
    success: DevelopmentProfile,
    error,
  }),
  Rpc.make(DEVELOPMENT_PROFILE_RPC_METHODS.update, {
    payload: DevelopmentProfileUpdateInput,
    success: DevelopmentProfile,
    error,
  }),
  Rpc.make(DEVELOPMENT_PROFILE_RPC_METHODS.delete, {
    payload: DevelopmentProfileDeleteInput,
    success: Schema.Void,
    error,
  }),
  Rpc.make(DEVELOPMENT_PROFILE_RPC_METHODS.listProjects, {
    payload: Schema.Struct({ profileId: DevelopmentProfileId }),
    success: Schema.Array(DevelopmentProfileProject),
    error,
  }),
  Rpc.make(DEVELOPMENT_PROFILE_RPC_METHODS.getAssignment, {
    payload: Schema.Struct({ projectId: ProjectId }),
    success: Schema.NullOr(ProjectDevelopmentProfile),
    error,
  }),
  Rpc.make(DEVELOPMENT_PROFILE_RPC_METHODS.setAssignment, {
    payload: ProjectDevelopmentProfileSetInput,
    success: ProjectDevelopmentProfile,
    error,
  }),
  Rpc.make(DEVELOPMENT_PROFILE_RPC_METHODS.resolve, {
    payload: Schema.Struct({ projectId: ProjectId }),
    success: EffectiveProjectInstructions,
    error,
  }),
] as const;
