import * as Effect from "effect/Effect";
import * as Migrator from "effect/sql/Migrator";
import * as SqlClient from "effect/sql/SqlClient";

import { developmentProfilesSchema } from "./Migrations/Fork/002_DevelopmentProfiles.ts";
import { projectRuntimeSchema } from "./Migrations/Fork/001_ProjectRuntime.ts";
import DevelopmentProfiles from "./Migrations/Fork/002_DevelopmentProfiles.ts";
import ProjectRuntime from "./Migrations/Fork/001_ProjectRuntime.ts";
import TaskHandoffState from "./Migrations/Fork/003_TaskHandoffState.ts";
import RuntimeRouting from "./Migrations/Fork/004_RuntimeRouting.ts";

// Fork-owned schema lives in its own ledger. Upstream's numeric history stays
// upstream's alone, so neither side can skip the other's migrations by id.
const forkMigrationEntries = [
  [1, "ProjectRuntime", ProjectRuntime],
  [2, "DevelopmentProfiles", DevelopmentProfiles],
  [3, "TaskHandoffState", TaskHandoffState],
  [4, "RuntimeRouting", RuntimeRouting],
] as const;

export const FORK_MIGRATION_TABLE = "t3_fork_migrations";
export const FORK_RECONCILIATION_TABLE = "t3_fork_migration_reconciliations";

const FORK_LEDGER_TABLE_DDL = `CREATE TABLE IF NOT EXISTS ${FORK_MIGRATION_TABLE} (
  migration_id integer PRIMARY KEY NOT NULL,
  created_at datetime NOT NULL DEFAULT current_timestamp,
  name VARCHAR(255) NOT NULL
)`;

const FORK_AUDIT_TABLE_DDL = `CREATE TABLE IF NOT EXISTS ${FORK_RECONCILIATION_TABLE} (
  legacy_migration_id INTEGER PRIMARY KEY,
  legacy_name TEXT NOT NULL,
  legacy_created_at TEXT NOT NULL,
  fork_migration_id INTEGER NOT NULL,
  fork_name TEXT NOT NULL,
  reconciled_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`;

export const forkMigrationManifest = forkMigrationEntries.map(([id, name]) => [id, name] as const);

interface ForkSchemaObject {
  readonly type: "table" | "index" | "trigger";
  readonly name: string;
  readonly sql: string;
}

const parseSchemaObject = (statement: string): ForkSchemaObject => {
  const match = /^CREATE (TABLE|INDEX|TRIGGER) (\w+)/.exec(statement);
  if (match === null) throw new Error(`Unrecognized fork migration statement: ${statement}`);
  return {
    type: match[1]!.toLowerCase() as ForkSchemaObject["type"],
    name: match[2]!,
    sql: statement,
  };
};

const schemaObjects = (schema: ReadonlyArray<string>): ReadonlyArray<ForkSchemaObject> =>
  schema.map(parseSchemaObject);

const projectRuntimeObjects = schemaObjects(projectRuntimeSchema);
const developmentProfilesObjects = schemaObjects(developmentProfilesSchema);

const normalizeSql = (value: string | null): string => (value ?? "").replace(/\s+/g, " ").trim();

const makeForkMigrationLoader = () =>
  Migrator.fromRecord(
    Object.fromEntries(
      forkMigrationEntries.map(([id, name, migration]) => [`${id}_${name}`, migration]),
    ),
  );

const run = Migrator.make({});

const assertForkLedgerCanRun = Effect.fn("assertForkLedgerCanRun")(function* () {
  const sql = yield* SqlClient.SqlClient;
  const tables = yield* sql`
    SELECT name FROM sqlite_master
    WHERE type = 'table' AND name = ${FORK_MIGRATION_TABLE}
  `;
  if (tables.length === 0) return;
  const recorded = yield* sql<{
    readonly migration_id: number;
    readonly name: string;
  }>`SELECT migration_id, name FROM ${sql(FORK_MIGRATION_TABLE)}`;
  const latest = Math.max(0, ...recorded.map((row) => Number(row.migration_id)));
  const names = new Map(recorded.map((row) => [Number(row.migration_id), row.name]));
  const divergent = forkMigrationManifest.flatMap(([id, name]) => {
    if (id > latest) return [];
    const recordedName = names.get(id);
    return recordedName === name ? [] : [`${id}_${name} (recorded: ${recordedName ?? "nothing"})`];
  });
  if (divergent.length === 0) return;
  return yield* new Migrator.MigrationError({
    kind: "BadState",
    message: `This database's fork migration history would skip required schema migrations: ${divergent.join(", ")}. Do not reuse a fork migration slot.`,
  });
});

const assertForkLedgerComplete = Effect.fn("assertForkLedgerComplete")(function* () {
  const sql = yield* SqlClient.SqlClient;
  const recorded = yield* sql<{
    readonly migration_id: number;
    readonly name: string;
  }>`SELECT migration_id, name FROM ${sql(FORK_MIGRATION_TABLE)}`;
  const names = new Map(recorded.map((row) => [Number(row.migration_id), row.name]));
  const missing = forkMigrationManifest.filter(([id, name]) => names.get(id) !== name);
  if (missing.length === 0) return;
  return yield* new Migrator.MigrationError({
    kind: "BadState",
    message: `Fork migrations did not record: ${missing.map(([id, name]) => `${id}_${name}`).join(", ")}. The database may have a conflicting fork ledger row.`,
  });
});

export const runForkMigrations = Effect.fn("runForkMigrations")(function* () {
  yield* assertForkLedgerCanRun();
  const executed = yield* run({
    loader: makeForkMigrationLoader(),
    table: FORK_MIGRATION_TABLE,
  });
  yield* assertForkLedgerComplete();
  return executed;
});

const LEGACY_FORK_MIGRATIONS = [
  {
    migrationId: 68,
    migrationName: "ProjectRuntime",
    replacementId: 1,
    replacementName: "ProjectRuntime",
    objects: projectRuntimeObjects,
  },
  {
    migrationId: 69,
    migrationName: "DevelopmentProfiles",
    replacementId: 2,
    replacementName: "DevelopmentProfiles",
    objects: developmentProfilesObjects,
  },
] as const;

const assertLegacyObjects = Effect.fn("assertForkLegacyObjects")(function* (
  objects: ReadonlyArray<ForkSchemaObject>,
) {
  const sql = yield* SqlClient.SqlClient;
  const names = objects.map((object) => object.name);
  const live = yield* sql<{
    readonly type: string;
    readonly name: string;
    readonly sql: string | null;
  }>`SELECT type, name, sql FROM sqlite_master WHERE name IN ${sql.in(names)}`;
  const byName = new Map(live.map((row) => [row.name, row]));
  const mismatches = objects.flatMap((expected) => {
    const actual = byName.get(expected.name);
    if (actual === undefined) return [`${expected.type} ${expected.name} is missing`];
    if (actual.type !== expected.type) {
      return [`${expected.name} is a ${actual.type}, expected a ${expected.type}`];
    }
    return normalizeSql(actual.sql) === normalizeSql(expected.sql)
      ? []
      : [`${expected.type} ${expected.name} differs from the shipped definition`];
  });
  if (mismatches.length === 0) return;
  return yield* new Migrator.MigrationError({
    kind: "BadState",
    message: `Migration history claims fork schema that does not match this build: ${mismatches.join("; ")}. It cannot be adopted without risking Runtime/Profile data. Start the build that wrote it, or restore a backup.`,
  });
});

export interface ForkMigrationReconciliation {
  readonly legacyMigrationId: number;
  readonly legacyName: string;
  readonly forkMigrationId: number;
  readonly forkName: string;
}

/**
 * An existing fork wrote ProjectRuntime and DevelopmentProfiles into upstream's
 * numeric ledger at 68/69. Move only those exact rows into the fork ledger so
 * upstream's real 68/69 can run, and leave an audit row that keeps the original
 * timestamps. Schema objects stay untouched; a mismatched history fails closed.
 */
export const reconcileForkMigrationHistory = Effect.fn("reconcileForkMigrationHistory")(
  function* () {
    const sql = yield* SqlClient.SqlClient;
    return yield* sql.withTransaction(
      Effect.gen(function* () {
        const migrationTables = yield* sql`
          SELECT name FROM sqlite_master
          WHERE type = 'table' AND name = 'effect_sql_migrations'
        `;
        if (migrationTables.length === 0) return [];

        const rows = yield* sql<{
          readonly migration_id: number;
          readonly name: string;
          readonly created_at: string;
        }>`SELECT migration_id, name, created_at FROM effect_sql_migrations
          WHERE migration_id >= 68 ORDER BY migration_id`;
        const legacy = rows.filter((row) =>
          LEGACY_FORK_MIGRATIONS.some(
            (candidate) =>
              candidate.migrationId === Number(row.migration_id) &&
              candidate.migrationName === row.name,
          ),
        );
        if (legacy.length === 0) return [];

        const expectedShape =
          rows.length === 1 &&
          Number(rows[0]!.migration_id) === 68 &&
          rows[0]!.name === "ProjectRuntime"
            ? [LEGACY_FORK_MIGRATIONS[0]]
            : rows.length === 2 &&
                Number(rows[0]!.migration_id) === 68 &&
                rows[0]!.name === "ProjectRuntime" &&
                Number(rows[1]!.migration_id) === 69 &&
                rows[1]!.name === "DevelopmentProfiles"
              ? [LEGACY_FORK_MIGRATIONS[0], LEGACY_FORK_MIGRATIONS[1]]
              : undefined;
        if (expectedShape === undefined) {
          return yield* new Migrator.MigrationError({
            kind: "BadState",
            message: `Unrecognized fork migration history at or above 68: ${rows.map((row) => `${row.migration_id}_${row.name}`).join(", ")}. Refusing to rewrite it.`,
          });
        }

        const ledgerTables = yield* sql`
          SELECT name FROM sqlite_master
          WHERE type = 'table' AND name = ${FORK_MIGRATION_TABLE}
        `;
        if (ledgerTables.length > 0) {
          const ledgerRows = yield* sql<{ readonly migration_id: number }>`
            SELECT migration_id FROM ${sql(FORK_MIGRATION_TABLE)}
          `;
          if (ledgerRows.length > 0) {
            return yield* new Migrator.MigrationError({
              kind: "BadState",
              message: `Both a legacy fork history and a ${FORK_MIGRATION_TABLE} ledger exist. Refusing to reconcile an ambiguous database.`,
            });
          }
        }

        for (const entry of expectedShape) {
          yield* assertLegacyObjects(entry.objects);
        }

        yield* sql.unsafe(FORK_LEDGER_TABLE_DDL).unprepared;
        yield* sql.unsafe(FORK_AUDIT_TABLE_DDL).unprepared;

        const reconciled: Array<ForkMigrationReconciliation> = [];
        for (const entry of expectedShape) {
          const legacyRow = rows.find((row) => Number(row.migration_id) === entry.migrationId)!;
          yield* sql`INSERT INTO ${sql(FORK_MIGRATION_TABLE)}
            (migration_id, name, created_at)
            VALUES (${entry.replacementId}, ${entry.replacementName}, ${legacyRow.created_at})`;
          yield* sql`INSERT INTO ${sql(FORK_RECONCILIATION_TABLE)}
            (legacy_migration_id, legacy_name, legacy_created_at, fork_migration_id, fork_name)
            VALUES (
              ${entry.migrationId},
              ${entry.migrationName},
              ${legacyRow.created_at},
              ${entry.replacementId},
              ${entry.replacementName}
            )`;
          yield* sql`DELETE FROM effect_sql_migrations
            WHERE migration_id = ${entry.migrationId} AND name = ${entry.migrationName}`;
          reconciled.push({
            legacyMigrationId: entry.migrationId,
            legacyName: entry.migrationName,
            forkMigrationId: entry.replacementId,
            forkName: entry.replacementName,
          });
        }
        return reconciled;
      }),
    );
  },
);
