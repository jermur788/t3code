import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import {
  DEVELOPMENT_PROFILE_BOUNDS,
  DEVELOPMENT_PROFILE_PRECEDENCE,
  DevelopmentProfileConflictError,
  DevelopmentProfileId,
  DevelopmentProfileInUseError,
  DevelopmentProfileNotFoundError,
  DevelopmentProfileProjectNotFoundError,
  EffectiveProjectInstructions,
  ProjectId,
  ProviderInstanceId,
} from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import * as SqlClient from "effect/sql/SqlClient";
import * as TestClock from "effect/testing/TestClock";

import * as SqlitePersistence from "../persistence/Sqlite.ts";
import * as DevelopmentProfileService from "./DevelopmentProfileService.ts";

const projectA = ProjectId.make("profile-a");
const projectB = ProjectId.make("profile-b");
const projectC = ProjectId.make("profile-c");
const actor = { actor: "user:maintainer" };
const otherActor = { actor: "user:editor" };
const timestamp = "2026-10-24T00:00:00.000Z";
const decodeConflictError = Schema.decodeUnknownSync(DevelopmentProfileConflictError);
const decodeEffectiveProjectInstructions = Schema.decodeUnknownSync(EffectiveProjectInstructions);

const seedProjects = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  for (const [projectId, title] of [
    [projectA, "Alpha"],
    [projectB, "Beta"],
    [projectC, "Gamma"],
  ] as const) {
    yield* sql`INSERT INTO projection_projects (project_id, title, workspace_root, scripts_json, created_at, updated_at)
      VALUES (${projectId}, ${title}, ${`/work/${projectId}`}, '[]', ${timestamp}, ${timestamp})`;
  }
});

const layerTest = DevelopmentProfileService.layer.pipe(
  Layer.provideMerge(SqlitePersistence.layerMemory),
  Layer.provide(NodeServices.layer),
);

it.effect("creates, renames, edits, and rejects stale updates and deletes", () =>
  Effect.gen(function* () {
    const service = yield* DevelopmentProfileService.DevelopmentProfileService;
    const created = yield* service.create(
      { name: "Policy", instructions: "First instructions" },
      actor,
    );
    assert.equal(created.revision, 1);
    assert.equal(created.createdBy, actor.actor);
    assert.equal(created.updatedBy, actor.actor);
    assert.deepEqual(yield* service.read(created.profileId), created);
    assert.deepEqual(yield* service.list(), [created]);

    yield* TestClock.adjust(1000);
    const updated = yield* service.update(
      {
        profileId: created.profileId,
        name: "Renamed policy",
        instructions: "Second instructions",
        expectedRevision: 1,
      },
      otherActor,
    );
    assert.equal(updated.revision, 2);
    assert.equal(updated.name, "Renamed policy");
    assert.equal(updated.instructions, "Second instructions");
    assert.equal(updated.createdAt, created.createdAt);
    assert.notEqual(updated.updatedAt, created.updatedAt);
    assert.equal(updated.updatedBy, otherActor.actor);

    const staleUpdate = yield* service
      .update(
        {
          profileId: created.profileId,
          name: "Stale",
          instructions: "Stale instructions",
          expectedRevision: 1,
        },
        actor,
      )
      .pipe(Effect.flip);
    assert.instanceOf(staleUpdate, DevelopmentProfileConflictError);
    if (staleUpdate._tag === "DevelopmentProfileConflictError") {
      assert.equal(staleUpdate.entityId, created.profileId);
      assert.equal(staleUpdate.expectedRevision, 1);
      assert.equal(staleUpdate.currentRevision, 2);
    }
    assert.deepEqual(yield* service.read(created.profileId), updated);

    const staleDelete = yield* service
      .delete({ profileId: created.profileId, expectedRevision: 1 })
      .pipe(Effect.flip);
    assert.instanceOf(staleDelete, DevelopmentProfileConflictError);

    yield* service.delete({ profileId: created.profileId, expectedRevision: 2 });
    assert.instanceOf(
      yield* service.read(created.profileId).pipe(Effect.flip),
      DevelopmentProfileNotFoundError,
    );
    assert.deepEqual(yield* service.list(), []);
    assert.instanceOf(
      yield* service
        .update(
          {
            profileId: created.profileId,
            name: "Gone",
            instructions: "Gone",
            expectedRevision: 2,
          },
          actor,
        )
        .pipe(Effect.flip),
      DevelopmentProfileNotFoundError,
    );
  }).pipe(Effect.provide(layerTest)),
);

it.effect("bounds profile fields and reports unknown records", () =>
  Effect.gen(function* () {
    const service = yield* DevelopmentProfileService.DevelopmentProfileService;
    const longName = "n".repeat(DEVELOPMENT_PROFILE_BOUNDS.nameMaxLength + 1);
    const longInstructions = "i".repeat(DEVELOPMENT_PROFILE_BOUNDS.instructionsMaxLength + 1);
    const longActor = "a".repeat(DEVELOPMENT_PROFILE_BOUNDS.actorMaxLength + 1);

    for (const result of [
      yield* service.create({ name: longName, instructions: "ok" }, actor).pipe(Effect.flip),
      yield* service
        .create({ name: "ok", instructions: longInstructions }, actor)
        .pipe(Effect.flip),
      yield* service
        .create({ name: "ok", instructions: "ok" }, { actor: longActor })
        .pipe(Effect.flip),
    ]) {
      assert.equal(result._tag, "SchemaError");
    }

    const profile = yield* service.create({ name: "Valid", instructions: "Valid" }, actor);
    const unknownId = DevelopmentProfileId.make("unknown-profile");
    assert.instanceOf(
      yield* service.read(unknownId).pipe(Effect.flip),
      DevelopmentProfileNotFoundError,
    );
    assert.instanceOf(
      yield* service.listProjects(unknownId).pipe(Effect.flip),
      DevelopmentProfileNotFoundError,
    );
    assert.deepEqual(yield* service.read(profile.profileId), profile);
  }).pipe(Effect.provide(layerTest)),
);

it.effect("assigns, replaces, and removes with CAS while isolating projects", () =>
  Effect.gen(function* () {
    yield* seedProjects;
    const service = yield* DevelopmentProfileService.DevelopmentProfileService;
    const first = yield* service.create({ name: "First", instructions: "First" }, actor);
    const second = yield* service.create({ name: "Second", instructions: "Second" }, actor);

    // A conflict against a project with no assignment row reports revision 0.
    // That error crosses the RPC boundary as the same domain schema, so it must
    // decode with a zero currentRevision and must not create a row.
    const absentConflict = yield* service
      .setAssignment({
        projectId: projectA,
        profileId: first.profileId,
        expectedRevision: 1,
      })
      .pipe(Effect.flip);
    assert.instanceOf(absentConflict, DevelopmentProfileConflictError);
    if (absentConflict._tag === "DevelopmentProfileConflictError") {
      assert.equal(absentConflict.entityId, projectA);
      assert.equal(absentConflict.expectedRevision, 1);
      assert.equal(absentConflict.currentRevision, 0);
      const decoded = decodeConflictError(absentConflict);
      assert.equal(decoded.currentRevision, 0);
    }
    assert.isNull(yield* service.getAssignment(projectA));

    const assignedA = yield* service.setAssignment({
      projectId: projectA,
      profileId: first.profileId,
      expectedRevision: 0,
    });
    assert.equal(assignedA.revision, 1);
    assert.equal(assignedA.profileId, first.profileId);
    const assignedB = yield* service.setAssignment({
      projectId: projectB,
      profileId: first.profileId,
      expectedRevision: 0,
    });
    assert.equal(assignedB.revision, 1);
    assert.deepEqual(yield* service.listProjects(first.profileId), [
      { projectId: projectA, name: "Alpha" },
      { projectId: projectB, name: "Beta" },
    ]);
    assert.deepEqual(yield* service.getAssignment(projectB), assignedB);

    const replaced = yield* service.setAssignment({
      projectId: projectA,
      profileId: second.profileId,
      expectedRevision: 1,
    });
    assert.equal(replaced.revision, 2);
    assert.equal(replaced.profileId, second.profileId);
    assert.deepEqual(yield* service.listProjects(first.profileId), [
      { projectId: projectB, name: "Beta" },
    ]);
    assert.deepEqual(yield* service.listProjects(second.profileId), [
      { projectId: projectA, name: "Alpha" },
    ]);

    const staleReplace = yield* service
      .setAssignment({
        projectId: projectA,
        profileId: first.profileId,
        expectedRevision: 1,
      })
      .pipe(Effect.flip);
    assert.instanceOf(staleReplace, DevelopmentProfileConflictError);
    if (staleReplace._tag === "DevelopmentProfileConflictError") {
      assert.equal(staleReplace.entityId, projectA);
      assert.equal(staleReplace.expectedRevision, 1);
      assert.equal(staleReplace.currentRevision, 2);
    }

    const removed = yield* service.setAssignment({
      projectId: projectA,
      profileId: null,
      expectedRevision: 2,
    });
    assert.equal(removed.revision, 3);
    assert.isNull(removed.profileId);
    assert.deepEqual(yield* service.getAssignment(projectA), removed);
    assert.deepEqual(yield* service.listProjects(second.profileId), []);

    // A stale write from before the unassignment must not pass now that the
    // row exists at revision 3 with a null profile.
    const aba = yield* service
      .setAssignment({
        projectId: projectA,
        profileId: first.profileId,
        expectedRevision: 2,
      })
      .pipe(Effect.flip);
    assert.instanceOf(aba, DevelopmentProfileConflictError);
    if (aba._tag === "DevelopmentProfileConflictError") {
      assert.equal(aba.currentRevision, 3);
    }

    const reAssigned = yield* service.setAssignment({
      projectId: projectA,
      profileId: first.profileId,
      expectedRevision: 3,
    });
    assert.equal(reAssigned.revision, 4);
    assert.equal(reAssigned.profileId, first.profileId);

    assert.instanceOf(
      yield* service
        .setAssignment({
          projectId: projectB,
          profileId: DevelopmentProfileId.make("unknown-profile"),
          expectedRevision: 1,
        })
        .pipe(Effect.flip),
      DevelopmentProfileNotFoundError,
    );
    assert.instanceOf(
      yield* service
        .setAssignment({
          projectId: ProjectId.make("unknown-project"),
          profileId: first.profileId,
          expectedRevision: 0,
        })
        .pipe(Effect.flip),
      DevelopmentProfileProjectNotFoundError,
    );

    const inUse = yield* service
      .delete({ profileId: first.profileId, expectedRevision: first.revision })
      .pipe(Effect.flip);
    assert.instanceOf(inUse, DevelopmentProfileInUseError);
    if (inUse._tag === "DevelopmentProfileInUseError") {
      assert.equal(inUse.profileId, first.profileId);
      assert.deepEqual(inUse.projects, [
        { projectId: projectA, name: "Alpha" },
        { projectId: projectB, name: "Beta" },
      ]);
    }

    const sql = yield* SqlClient.SqlClient;
    yield* sql`UPDATE projection_projects SET deleted_at = ${timestamp} WHERE project_id = ${projectB}`;
    assert.deepEqual(
      yield* sql`SELECT 1 FROM project_development_profiles WHERE project_id = ${projectB}`,
      [],
    );
    assert.instanceOf(
      yield* service.getAssignment(projectB).pipe(Effect.flip),
      DevelopmentProfileProjectNotFoundError,
    );
    assert.instanceOf(
      yield* service
        .setAssignment({
          projectId: projectB,
          profileId: first.profileId,
          expectedRevision: 1,
        })
        .pipe(Effect.flip),
      DevelopmentProfileProjectNotFoundError,
    );
    assert.deepEqual(yield* service.listProjects(first.profileId), [
      { projectId: projectA, name: "Alpha" },
    ]);

    yield* service.setAssignment({
      projectId: projectA,
      profileId: null,
      expectedRevision: 4,
    });
    yield* service.delete({ profileId: first.profileId, expectedRevision: first.revision });
    assert.instanceOf(
      yield* service.listProjects(first.profileId).pipe(Effect.flip),
      DevelopmentProfileNotFoundError,
    );
  }).pipe(Effect.provide(layerTest)),
);

it.effect("resolves the four instruction combinations with ordered labels", () =>
  Effect.gen(function* () {
    yield* seedProjects;
    const service = yield* DevelopmentProfileService.DevelopmentProfileService;
    const sql = yield* SqlClient.SqlClient;

    assert.deepEqual(yield* service.resolveEffectiveProjectInstructions(projectA), {
      projectId: projectA,
      assignment: null,
      developmentProfile: null,
      projectInstructions: null,
      precedence: DEVELOPMENT_PROFILE_PRECEDENCE,
      formattedInstructions: "",
    });

    const precedenceNote =
      "Precedence: host rules and the current user rank above Project Runtime; Project Runtime overrides conflicting Development Profile instructions; source data ranks below the profile.";
    const profile = yield* service.create({ name: "Profile", instructions: "Profile rule" }, actor);
    const assignment = yield* service.setAssignment({
      projectId: projectA,
      profileId: profile.profileId,
      expectedRevision: 0,
    });
    const profileOnly = yield* service.resolveEffectiveProjectInstructions(projectA);
    assert.deepEqual(profileOnly.assignment, assignment);
    assert.deepEqual(profileOnly.developmentProfile, profile);
    assert.isNull(profileOnly.projectInstructions);
    assert.equal(
      profileOnly.formattedInstructions,
      `### Development Profile\n\nProfile rule\n\n${precedenceNote}`,
    );

    const insertRuntime = (projectId: ProjectId, instructions: string, enabled = 1) =>
      sql`INSERT INTO project_runtime
        (project_id, enabled, revision, instructions_json, instructions_revision, created_at, updated_at)
        VALUES (${projectId}, ${enabled}, 1, ${JSON.stringify({
          projectId,
          instructions,
          revision: 1,
          updatedAt: timestamp,
          updatedBy: actor.actor,
        })}, 1, ${timestamp}, ${timestamp})`;

    yield* insertRuntime(projectB, "Runtime rule");
    const runtimeOnly = yield* service.resolveEffectiveProjectInstructions(projectB);
    assert.isNull(runtimeOnly.assignment);
    assert.isNull(runtimeOnly.developmentProfile);
    assert.equal(runtimeOnly.projectInstructions?.instructions, "Runtime rule");
    assert.equal(runtimeOnly.formattedInstructions, "### Project Runtime\n\nRuntime rule");

    yield* insertRuntime(projectA, "Runtime rule");
    const both = yield* service.resolveEffectiveProjectInstructions(projectA);
    assert.equal(both.projectInstructions?.instructions, "Runtime rule");
    assert.equal(
      both.formattedInstructions,
      `### Development Profile\n\nProfile rule\n\n${precedenceNote}\n\n### Project Runtime\n\nRuntime rule`,
    );

    yield* sql`UPDATE project_runtime SET enabled = 0 WHERE project_id = ${projectA}`;
    const disabled = yield* service.resolveEffectiveProjectInstructions(projectA);
    assert.isNull(disabled.projectInstructions);
    assert.deepEqual(disabled.developmentProfile, profile);
    assert.equal(
      disabled.formattedInstructions,
      `### Development Profile\n\nProfile rule\n\n${precedenceNote}`,
    );

    // Both sources at their Unicode-heavy maximum must fit the effective
    // bound without truncating either one.
    const maxUnicodeInstructions = "😀".repeat(
      DEVELOPMENT_PROFILE_BOUNDS.instructionsMaxLength / 2,
    );
    const maxProjectInstructions = "🚀".repeat(
      DEVELOPMENT_PROFILE_BOUNDS.instructionsMaxLength / 2,
    );
    const maxUnicodeName = "界".repeat(DEVELOPMENT_PROFILE_BOUNDS.nameMaxLength);
    assert.equal(maxUnicodeInstructions.length, DEVELOPMENT_PROFILE_BOUNDS.instructionsMaxLength);
    assert.equal(maxProjectInstructions.length, DEVELOPMENT_PROFILE_BOUNDS.instructionsMaxLength);
    assert.equal(maxUnicodeName.length, DEVELOPMENT_PROFILE_BOUNDS.nameMaxLength);

    const maxProfile = yield* service.create(
      { name: maxUnicodeName, instructions: maxUnicodeInstructions },
      actor,
    );
    yield* service.setAssignment({
      projectId: projectC,
      profileId: maxProfile.profileId,
      expectedRevision: 0,
    });
    const profileAtMaximum = yield* service.resolveEffectiveProjectInstructions(projectC);
    assert.equal(
      profileAtMaximum.formattedInstructions,
      `### Development Profile\n\n${maxUnicodeInstructions}\n\n${precedenceNote}`,
    );

    yield* insertRuntime(projectC, maxProjectInstructions);
    const atMaximum = yield* service.resolveEffectiveProjectInstructions(projectC);
    const expectedMaximum = `### Development Profile\n\n${maxUnicodeInstructions}\n\n${precedenceNote}\n\n### Project Runtime\n\n${maxProjectInstructions}`;
    assert.equal(atMaximum.developmentProfile?.name, maxUnicodeName);
    assert.equal(atMaximum.projectInstructions?.instructions, maxProjectInstructions);
    assert.equal(atMaximum.formattedInstructions, expectedMaximum);
    assert.isAtMost(
      atMaximum.formattedInstructions.length,
      DEVELOPMENT_PROFILE_BOUNDS.effectiveInstructionsMaxLength,
    );
    assert.deepEqual(decodeEffectiveProjectInstructions(atMaximum), atMaximum);

    assert.instanceOf(
      yield* service
        .resolveEffectiveProjectInstructions(ProjectId.make("unknown-project"))
        .pipe(Effect.flip),
      DevelopmentProfileProjectNotFoundError,
    );
  }).pipe(Effect.provide(layerTest)),
);

it.effect("reopens the database with the same profiles and assignments", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const dir = yield* fs.makeTempDirectoryScoped();
      const database = SqlitePersistence.layerFromPath(`${dir}/profiles.sqlite`);
      const serviceLayer = DevelopmentProfileService.layer.pipe(Layer.provideMerge(database));
      const records = yield* Effect.scoped(
        Effect.gen(function* () {
          yield* seedProjects;
          const service = yield* DevelopmentProfileService.DevelopmentProfileService;
          const profile = yield* service.create(
            { name: "Durable", instructions: "Durable instructions" },
            actor,
          );
          const assignment = yield* service.setAssignment({
            projectId: projectA,
            profileId: profile.profileId,
            expectedRevision: 0,
          });
          return { profile, assignment };
        }).pipe(Effect.provide(serviceLayer)),
      );
      yield* Effect.scoped(
        Effect.gen(function* () {
          const service = yield* DevelopmentProfileService.DevelopmentProfileService;
          assert.deepEqual(yield* service.read(records.profile.profileId), records.profile);
          assert.deepEqual(yield* service.getAssignment(projectA), records.assignment);
          assert.deepEqual(yield* service.list(), [records.profile]);
        }).pipe(Effect.provide(serviceLayer)),
      );
    }),
  ).pipe(Effect.provide(NodeServices.layer)),
);

it.effect(
  "keeps assignment with project identity after a workspace move and does not infer membership by path",
  () =>
    Effect.gen(function* () {
      yield* seedProjects;
      const service = yield* DevelopmentProfileService.DevelopmentProfileService;
      const sql = yield* SqlClient.SqlClient;
      const profile = yield* service.create(
        { name: "Move-safe policy", instructions: "Shared policy" },
        actor,
      );
      const assignment = yield* service.setAssignment({
        projectId: projectA,
        profileId: profile.profileId,
        expectedRevision: 0,
      });
      yield* sql`UPDATE projection_projects SET workspace_root = '/moved/repository' WHERE project_id = ${projectA}`;
      assert.deepEqual(yield* service.getAssignment(projectA), assignment);
      yield* sql`UPDATE projection_projects SET workspace_root = '/moved/repository' WHERE project_id = ${projectB}`;
      assert.isNull(yield* service.getAssignment(projectB));
      assert.deepEqual(yield* service.getAssignment(projectA), assignment);
    }).pipe(Effect.provide(layerTest)),
);

it.effect("writes instructions and routing under one profile revision", () =>
  Effect.gen(function* () {
    const service = yield* DevelopmentProfileService.DevelopmentProfileService;
    const implementation = {
      role: "implementation" as const,
      candidates: [{ providerInstanceId: ProviderInstanceId.make("codex"), model: "gpt-6" }],
      fallback: "inherit" as const,
    };
    const created = yield* service.create(
      { name: "Routing policy", instructions: "Use the main model" },
      actor,
    );
    assert.deepEqual(created.routing, { roleRoutes: [] });

    const updated = yield* service.update(
      {
        profileId: created.profileId,
        name: "Routing policy",
        instructions: "Use the routed model",
        routing: { roleRoutes: [implementation] },
        expectedRevision: 1,
      },
      actor,
    );
    assert.equal(updated.revision, 2);
    assert.deepEqual(updated.routing, { roleRoutes: [implementation] });

    const stale = yield* service
      .update(
        {
          profileId: created.profileId,
          name: "Routing policy",
          instructions: "Stale instructions",
          routing: { roleRoutes: [] },
          expectedRevision: 1,
        },
        actor,
      )
      .pipe(Effect.flip);
    assert.instanceOf(stale, DevelopmentProfileConflictError);
    const afterStale = yield* service.read(created.profileId);
    assert.equal(afterStale.instructions, "Use the routed model");
    assert.deepEqual(afterStale.routing, { roleRoutes: [implementation] });

    const instructionsOnly = yield* service.update(
      {
        profileId: created.profileId,
        name: "Routing policy",
        instructions: "Only instructions changed",
        expectedRevision: 2,
      },
      actor,
    );
    assert.equal(instructionsOnly.revision, 3);
    assert.deepEqual(instructionsOnly.routing, { roleRoutes: [implementation] });
  }).pipe(Effect.provide(layerTest)),
);
