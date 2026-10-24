import { useAtomValue } from "@effect/atom-react";
import type {
  DevelopmentProfile,
  DevelopmentProfileCreateInput,
  DevelopmentProfileDeleteInput,
  DevelopmentProfileId,
  DevelopmentProfileProject,
  DevelopmentProfileUpdateInput,
  EffectiveProjectInstructions,
  EnvironmentId,
  ProjectDevelopmentProfile,
  ProjectDevelopmentProfileSetInput,
  ProjectId,
} from "@t3tools/contracts";
import {
  squashAtomCommandFailure,
  type AtomCommandResult,
} from "@t3tools/client-runtime/state/runtime";
import { useConnectedEnvironmentIds } from "../../state/environments";
import { useAtomCommand } from "../../state/use-atom-command";
import { developmentProfilesEnvironment as commands } from "../../state/developmentProfiles";

export type DevelopmentProfilesResult<T> =
  | { ok: true; value: T }
  | {
      ok: false;
      message: string;
      conflict: boolean;
      inUse: boolean;
    };

const IN_USE_PROJECTS_SHOWN = 5;
const IN_USE_PROJECT_NAME_MAX_LENGTH = 60;

function projectNamesFromInUseError(error: unknown): string[] {
  if (typeof error !== "object" || error === null || !("projects" in error)) return [];
  const projects = (error as { projects?: unknown }).projects;
  if (!Array.isArray(projects)) return [];
  return projects.flatMap((project) => {
    if (typeof project !== "object" || project === null || !("name" in project)) return [];
    const name = (project as { name?: unknown }).name;
    if (typeof name !== "string") return [];
    const trimmed = name.trim();
    if (trimmed.length === 0) return [];
    return [
      trimmed.length > IN_USE_PROJECT_NAME_MAX_LENGTH
        ? `${trimmed.slice(0, IN_USE_PROJECT_NAME_MAX_LENGTH - 1)}…`
        : trimmed,
    ];
  });
}

function inUseMessage(error: unknown): string {
  const names = projectNamesFromInUseError(error);
  if (names.length === 0) {
    return "This profile is assigned to a project. Refresh the assignments and remove it before deleting.";
  }
  const shown = names.slice(0, IN_USE_PROJECTS_SHOWN);
  const remaining = names.length - shown.length;
  const suffix = remaining > 0 ? ` and ${remaining} more project${remaining === 1 ? "" : "s"}` : "";
  return `This profile is assigned to ${shown.join(", ")}${suffix}. Remove those assignments before deleting it.`;
}

export function developmentProfileErrorMessage(error: unknown): string {
  const tag = typeof error === "object" && error !== null && "_tag" in error ? error._tag : "";
  switch (tag) {
    case "DevelopmentProfileConflictError":
      return "This profile changed since you loaded it. Your draft is kept until you choose Discard draft and reload latest.";
    case "DevelopmentProfileInUseError":
      return inUseMessage(error);
    case "DevelopmentProfileNotFoundError":
      return "This profile is no longer available.";
    case "DevelopmentProfileRequestError":
      return error instanceof Error
        ? error.message
        : "The Development Profiles request could not be completed.";
    case "EnvironmentAuthorizationError":
      return "This connection does not have permission to change Development Profiles.";
    default:
      return error instanceof Error
        ? error.message
        : "Development Profiles could not complete the request. Check your connection and try again.";
  }
}

function result<A, E>(
  value: AtomCommandResult<A, E>,
  conflictMessage?: string,
): DevelopmentProfilesResult<A> {
  if (value._tag === "Success") return { ok: true, value: value.value };
  const error = value._tag === "Failure" ? squashAtomCommandFailure(value) : undefined;
  const tag = typeof error === "object" && error !== null && "_tag" in error ? error._tag : "";
  const conflict = tag === "DevelopmentProfileConflictError";
  return {
    ok: false,
    message:
      conflict && conflictMessage !== undefined
        ? conflictMessage
        : developmentProfileErrorMessage(error),
    conflict,
    inUse: tag === "DevelopmentProfileInUseError",
  };
}

export function useDevelopmentProfilesApi(target: { environmentId: EnvironmentId }) {
  const list = useAtomCommand(commands.list, { reportFailure: false });
  const read = useAtomCommand(commands.read, { reportFailure: false });
  const create = useAtomCommand(commands.create, { reportFailure: false });
  const update = useAtomCommand(commands.update, { reportFailure: false });
  const remove = useAtomCommand(commands.remove, { reportFailure: false });
  const listProjects = useAtomCommand(commands.listProjects, { reportFailure: false });
  const getAssignment = useAtomCommand(commands.getAssignment, { reportFailure: false });
  const setAssignment = useAtomCommand(commands.setAssignment, { reportFailure: false });
  const resolve = useAtomCommand(commands.resolve, { reportFailure: false });
  const canEdit = useAtomValue(commands.create.permissionAtom(target.environmentId));
  const canAssign = useAtomValue(commands.setAssignment.permissionAtom(target.environmentId));
  const ready = useConnectedEnvironmentIds().includes(target.environmentId);
  return {
    ready,
    canEdit,
    canAssign,
    list: async (): Promise<DevelopmentProfilesResult<readonly DevelopmentProfile[]>> =>
      result(
        await list({
          environmentId: target.environmentId,
          input: {},
        }),
      ),
    read: async (
      profileId: DevelopmentProfileId,
    ): Promise<DevelopmentProfilesResult<DevelopmentProfile>> =>
      result(
        await read({
          environmentId: target.environmentId,
          input: { profileId },
        }),
      ),
    create: async (
      input: DevelopmentProfileCreateInput,
    ): Promise<DevelopmentProfilesResult<DevelopmentProfile>> =>
      result(
        await create({
          environmentId: target.environmentId,
          input,
        }),
      ),
    update: async (
      input: DevelopmentProfileUpdateInput,
    ): Promise<DevelopmentProfilesResult<DevelopmentProfile>> =>
      result(
        await update({
          environmentId: target.environmentId,
          input,
        }),
      ),
    remove: async (
      input: DevelopmentProfileDeleteInput,
    ): Promise<DevelopmentProfilesResult<void>> =>
      result(
        await remove({
          environmentId: target.environmentId,
          input,
        }),
      ),
    listProjects: async (
      profileId: DevelopmentProfileId,
    ): Promise<DevelopmentProfilesResult<readonly DevelopmentProfileProject[]>> =>
      result(
        await listProjects({
          environmentId: target.environmentId,
          input: { profileId },
        }),
      ),
    getAssignment: async (
      projectId: ProjectId,
    ): Promise<DevelopmentProfilesResult<ProjectDevelopmentProfile | null>> =>
      result(
        await getAssignment({
          environmentId: target.environmentId,
          input: { projectId },
        }),
      ),
    setAssignment: async (
      input: ProjectDevelopmentProfileSetInput,
    ): Promise<DevelopmentProfilesResult<ProjectDevelopmentProfile>> =>
      result(
        await setAssignment({
          environmentId: target.environmentId,
          input,
        }),
        "This assignment changed since you loaded it. Your selection is kept until you reload the latest assignment.",
      ),
    resolve: async (
      projectId: ProjectId,
    ): Promise<DevelopmentProfilesResult<EffectiveProjectInstructions>> =>
      result(
        await resolve({
          environmentId: target.environmentId,
          input: { projectId },
        }),
      ),
  };
}

export type DevelopmentProfilesApi = ReturnType<typeof useDevelopmentProfilesApi>;
