import { assert, it } from "@effect/vitest";
import * as NodeSqliteClient from "@t3tools/shared/nodeSqliteClient";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as SqlClient from "effect/sql/SqlClient";

import { runMigrations } from "../Migrations.ts";

const layer = it.layer(Layer.mergeAll(NodeSqliteClient.layer({ filename: ":memory:" })));

const insertTask = (sql: SqlClient.SqlClient, taskId: string, threadId: string | null) =>
  sql`INSERT INTO scheduled_tasks ${sql.insert({
    task_id: taskId,
    title: "task",
    prompt: "Run",
    enabled: 1,
    schedule_json: '{"type":"interval","everyMs":60000}',
    project_id: "project",
    thread_id: threadId,
    workspace_strategy_json: '{"type":"root"}',
    model_selection_json: '{"instanceId":"codex","model":"gpt-5"}',
    runtime_mode: "full-access",
    interaction_mode: "default",
    created_by: "user",
    creation_source: "web",
    created_at: "2026-10-01T00:00:00.000Z",
    updated_at: "2026-10-01T00:00:00.000Z",
    next_run_at: null,
    last_run_at: null,
    last_run_status: "never",
    last_run_error: null,
    run_count: 0,
  })}`;

layer("080_ScheduledTaskThreadMode", (it) => {
  it.effect("backfills continue exactly for rows with a non-null thread_id", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* runMigrations({ toMigrationInclusive: 79 });
      yield* insertTask(sql, "no-thread", null);
      yield* insertTask(sql, "real-thread", "thread:recovery:real");
      // A corrupt empty-string thread_id backfills to "continue" under the
      // upstream-shipped rule; ThreadId cannot decode '' downstream, so the row
      // is inert. Kept upstream-exact (RV-H 2026-11-08): any fail-safe
      // normalization belongs in a new Fork migration, not an edit of 080.
      yield* insertTask(sql, "empty-thread", "");
      yield* runMigrations({ toMigrationInclusive: 80 });

      const rows = yield* sql<{ task_id: string; thread_mode: string }>`
        SELECT task_id, thread_mode FROM scheduled_tasks ORDER BY task_id
      `;
      assert.deepEqual(rows, [
        { task_id: "empty-thread", thread_mode: "continue" },
        { task_id: "no-thread", thread_mode: "new_thread" },
        { task_id: "real-thread", thread_mode: "continue" },
      ]);
    }),
  );
});
