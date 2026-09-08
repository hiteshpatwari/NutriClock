import {
  decodeSerializedState,
  encodeState,
  type RegimenRepository,
} from "@nutriclock/persistence";
import type { PersistedNutriClockState } from "@nutriclock/domain";

const DATABASE = "nutriclock";
const STORE = "state";
const KEY = "canonical";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Unable to open local storage."));
  });
}

export function createIndexedDbRepository(): RegimenRepository {
  return {
    async load() {
      const db = await openDatabase();
      return new Promise((resolve, reject) => {
        const request = db.transaction(STORE, "readonly").objectStore(STORE).get(KEY);
        request.onsuccess = () => {
          try {
            resolve(request.result ? decodeSerializedState(request.result as string) : null);
          } catch (error) {
            reject(error);
          }
        };
        request.onerror = () => reject(request.error ?? new Error("Unable to read local storage."));
      });
    },
    async save(state: PersistedNutriClockState) {
      const db = await openDatabase();
      await new Promise<void>((resolve, reject) => {
        const request = db
          .transaction(STORE, "readwrite")
          .objectStore(STORE)
          .put(encodeState(state), KEY);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error ?? new Error("Unable to save local storage."));
      });
    },
    async clear() {
      const db = await openDatabase();
      await new Promise<void>((resolve, reject) => {
        const request = db.transaction(STORE, "readwrite").objectStore(STORE).delete(KEY);
        request.onsuccess = () => resolve();
        request.onerror = () =>
          reject(request.error ?? new Error("Unable to delete local storage."));
      });
    },
  };
}
