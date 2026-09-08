import * as SQLite from "expo-sqlite";
import {
  decodeSerializedState,
  encodeState,
  type RegimenRepository,
} from "@nutriclock/persistence";
import type { PersistedNutriClockState } from "@nutriclock/domain";

const KEY = "canonical";

export function createSqliteRepository(): RegimenRepository {
  let databasePromise: Promise<SQLite.SQLiteDatabase> | undefined;
  const database = () => {
    databasePromise ??= SQLite.openDatabaseAsync("nutriclock.db");
    return databasePromise;
  };
  return {
    async load() {
      const db = await database();
      await db.execAsync(
        "CREATE TABLE IF NOT EXISTS nutriclock_state (id TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)",
      );
      const row = await db.getFirstAsync<{ value: string }>(
        "SELECT value FROM nutriclock_state WHERE id = ?",
        KEY,
      );
      return row ? decodeSerializedState(row.value) : null;
    },
    async save(state: PersistedNutriClockState) {
      const db = await database();
      await db.execAsync(
        "CREATE TABLE IF NOT EXISTS nutriclock_state (id TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)",
      );
      await db.runAsync(
        "INSERT INTO nutriclock_state (id, value) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET value = excluded.value",
        KEY,
        encodeState(state),
      );
    },
    async clear() {
      const db = await database();
      await db.execAsync("DROP TABLE IF EXISTS nutriclock_state");
    },
  };
}
