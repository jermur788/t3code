import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import {
  DEVELOPMENT_PROFILE_RPCS,
  DEVELOPMENT_PROFILE_RPC_METHODS as M,
  AuthOrchestrationOperateScope,
  AuthOrchestrationReadScope,
  AuthSettingsWriteScope,
  ProjectId,
  RpcScopeAuthorization,
} from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as SqlClient from "effect/sql/SqlClient";
import { RpcGroup, RpcTest } from "effect/rpc";
import * as RpcAuthorization from "../auth/RpcAuthorization.ts";
import * as Sqlite from "../persistence/Sqlite.ts";
import * as Profiles from "./DevelopmentProfileService.ts";
import { makeHandlers } from "./DevelopmentProfileRpc.ts";

const group = RpcGroup.make(...DEVELOPMENT_PROFILE_RPCS).middleware(RpcScopeAuthorization);
const layer = Profiles.layer.pipe(
  Layer.provideMerge(Sqlite.layerMemory),
  Layer.provide(NodeServices.layer),
);
const projectId = ProjectId.make("profile-rpc-project");
const setup = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`INSERT INTO projection_projects(project_id,title,workspace_root,scripts_json,created_at,updated_at)
    VALUES (${projectId},'Profile RPC project','/work/profile-rpc','[]','2026-10-24T00:00:00.000Z','2026-10-24T00:00:00.000Z')`;
  const handlers = yield* makeHandlers("settings-client");
  const client = yield* RpcTest.makeClient(group).pipe(
    Effect.provide(
      Layer.mergeAll(
        group.toLayer(handlers),
        RpcAuthorization.layer([AuthOrchestrationReadScope, AuthSettingsWriteScope]),
      ),
    ),
  );
  return { client, handlers };
});

it.effect(
  "round-trips profile configuration, reports conflicts and rejects deleting an assigned profile",
  () =>
    Effect.gen(function* () {
      const { client } = yield* setup;
      const profile = yield* client[M.create]({
        name: "Shared policy",
        instructions: "Use workflow A",
      });
      assert.equal(profile.createdBy, "user:settings-client");
      assert.deepEqual(yield* client[M.read]({ profileId: profile.profileId }), profile);
      const updated = yield* client[M.update]({
        profileId: profile.profileId,
        name: "Renamed policy",
        instructions: "Use workflow B",
        expectedRevision: profile.revision,
      });
      const conflict = yield* client[M.update]({
        profileId: profile.profileId,
        name: "Stale",
        instructions: "Stale policy",
        expectedRevision: profile.revision,
      }).pipe(Effect.flip);
      assert.equal(conflict._tag, "DevelopmentProfileConflictError");
      assert.deepEqual(yield* client[M.read]({ profileId: profile.profileId }), updated);
      const assigned = yield* client[M.setAssignment]({
        projectId,
        profileId: profile.profileId,
        expectedRevision: 0,
      });
      const inUse = yield* client[M.delete]({
        profileId: profile.profileId,
        expectedRevision: updated.revision,
      }).pipe(Effect.flip);
      assert.equal(inUse._tag, "DevelopmentProfileInUseError");
      if (inUse._tag === "DevelopmentProfileInUseError")
        assert.deepEqual(inUse.projects, [{ projectId, name: "Profile RPC project" }]);
      assert.equal(
        (yield* client[M.resolve]({ projectId })).developmentProfile?.revision,
        updated.revision,
      );
      yield* client[M.setAssignment]({
        projectId,
        profileId: null,
        expectedRevision: assigned.revision,
      });
      yield* client[M.delete]({ profileId: profile.profileId, expectedRevision: updated.revision });
      assert.deepEqual(yield* client[M.list]({}), []);
    }).pipe(Effect.provide(layer)),
);

it.effect("refuses profile configuration to an orchestration-only connection", () =>
  Effect.gen(function* () {
    const { client, handlers } = yield* setup;
    const profile = yield* client[M.create]({ name: "Protected", instructions: "Policy" });
    const unprivileged = yield* RpcTest.makeClient(group).pipe(
      Effect.provide(
        Layer.mergeAll(
          group.toLayer(handlers),
          RpcAuthorization.layer([AuthOrchestrationReadScope, AuthOrchestrationOperateScope]),
        ),
      ),
    );
    assert.equal(
      (yield* unprivileged[M.create]({ name: "Agent policy", instructions: "No" }).pipe(
        Effect.flip,
      ))._tag,
      "EnvironmentAuthorizationError",
    );
    assert.equal(
      (yield* unprivileged[M.update]({
        profileId: profile.profileId,
        name: "Rewrite",
        instructions: "No",
        expectedRevision: profile.revision,
      }).pipe(Effect.flip))._tag,
      "EnvironmentAuthorizationError",
    );
    assert.equal(
      (yield* unprivileged[M.delete]({
        profileId: profile.profileId,
        expectedRevision: profile.revision,
      }).pipe(Effect.flip))._tag,
      "EnvironmentAuthorizationError",
    );
    assert.equal(
      (yield* unprivileged[M.setAssignment]({
        projectId,
        profileId: profile.profileId,
        expectedRevision: 0,
      }).pipe(Effect.flip))._tag,
      "EnvironmentAuthorizationError",
    );
    assert.deepEqual(yield* unprivileged[M.list]({}), [profile]);
    assert.isNull(yield* client[M.getAssignment]({ projectId }));
  }).pipe(Effect.provide(layer)),
);
