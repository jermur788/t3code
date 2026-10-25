import { ProjectId } from "@t3tools/contracts";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import * as DevelopmentProfileService from "./DevelopmentProfileService.ts";

/** The turn-scoped instruction payload. It is never part of a provider session key. */
export interface ProjectInstructionSnapshot {
  readonly formattedInstructions: string;
}

export interface ProjectInstructionsShape {
  readonly resolve: (
    projectId: ProjectId,
  ) => Effect.Effect<
    ProjectInstructionSnapshot,
    DevelopmentProfileService.DevelopmentProfileServiceError
  >;
}

export class ProjectInstructions extends Context.Service<
  ProjectInstructions,
  ProjectInstructionsShape
>()("t3/developmentProfiles/ProjectInstructions") {}

export const layerFromDevelopmentProfiles: Layer.Layer<
  ProjectInstructions,
  never,
  DevelopmentProfileService.DevelopmentProfileService
> = Layer.effect(
  ProjectInstructions,
  Effect.gen(function* () {
    const profiles = yield* DevelopmentProfileService.DevelopmentProfileService;
    return ProjectInstructions.of({
      resolve: (projectId) =>
        profiles
          .resolveEffectiveProjectInstructions(projectId)
          .pipe(
            Effect.map((effective) => ({ formattedInstructions: effective.formattedInstructions })),
          ),
    });
  }),
);

export const layerEmpty: Layer.Layer<ProjectInstructions> = Layer.succeed(ProjectInstructions, {
  resolve: () => Effect.succeed({ formattedInstructions: "" }),
});
