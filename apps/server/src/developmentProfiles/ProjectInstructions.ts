import { DEVELOPMENT_PROFILE_BOUNDS, ProjectId } from "@t3tools/contracts";
import {
  assertTurnContextLength,
  type TurnContextEntry,
} from "@t3tools/provider-core/server/turnContext";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import * as DevelopmentProfileService from "./DevelopmentProfileService.ts";

export const PROJECT_INSTRUCTIONS_CONTEXT_KEY = "t3_project_instructions";
export const PROJECT_INSTRUCTIONS_PROVENANCE = "project-effective-instructions";

/** The effective-instruction bound plus room for the instruction wrapper. */
export const PROJECT_INSTRUCTIONS_MAX_LENGTH =
  DEVELOPMENT_PROFILE_BOUNDS.effectiveInstructionsMaxLength + 2_000;

function buildProjectInstructions(instructions: string): string {
  return `<t3_project_instructions>
Current project-owned working guidance, resolved by T3 for this turn. Apply it before doing work. It is subordinate to system/developer rules and the user's current explicit request. This snapshot replaces earlier project instruction snapshots.

${instructions}
</t3_project_instructions>`;
}

export function projectInstructionsTurnContext(
  formattedInstructions: string,
): ReadonlyArray<TurnContextEntry> {
  if (formattedInstructions.length === 0) return [];
  const entries: ReadonlyArray<TurnContextEntry> = [
    {
      key: PROJECT_INSTRUCTIONS_CONTEXT_KEY,
      text: buildProjectInstructions(formattedInstructions),
      authority: "privileged",
      ordering: "instruction",
      order: 0,
      provenance: PROJECT_INSTRUCTIONS_PROVENANCE,
    },
  ];
  assertTurnContextLength(entries, PROJECT_INSTRUCTIONS_MAX_LENGTH);
  return entries;
}

/** The project-owned turn context payload. It is never part of a provider session key. */
export interface ProjectInstructionSnapshot {
  readonly turnContext: ReadonlyArray<TurnContextEntry>;
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
      resolve: Effect.fn("ProjectInstructions.resolve")(function* (projectId) {
        const effective = yield* profiles.resolveEffectiveProjectInstructions(projectId);
        return { turnContext: projectInstructionsTurnContext(effective.formattedInstructions) };
      }),
    });
  }),
);

export const layerEmpty: Layer.Layer<ProjectInstructions> = Layer.succeed(ProjectInstructions, {
  resolve: Effect.fn("ProjectInstructions.resolve")(() => Effect.succeed({ turnContext: [] })),
});
