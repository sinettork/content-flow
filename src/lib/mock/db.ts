import { SEED, type MockDatabase } from "./seed";

const STORAGE_KEY = "contentflow.mockdb.v1";

function load(): MockDatabase {
  if (typeof window === "undefined") return structuredClone(SEED);
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const fresh = structuredClone(SEED);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    return fresh;
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    // Backfill any tables added after the user's localStorage snapshot
    const seed = structuredClone(SEED) as unknown as Record<string, unknown>;
    let patched = false;
    for (const key of Object.keys(seed)) {
      if (!(key in parsed)) {
        parsed[key] = seed[key];
        patched = true;
      }
    }
    if (patched) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    }
    return parsed as unknown as MockDatabase;
  } catch {
    const fresh = structuredClone(SEED);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    return fresh;
  }
}

function save(db: MockDatabase) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }
}

export function resetDatabase() {
  const fresh = structuredClone(SEED);
  save(fresh);
  return fresh;
}

export type TableName = keyof MockDatabase;
export type TableNameWithId = Exclude<TableName, "content_item_tags">;

export function getAll<T extends TableName>(table: T): MockDatabase[T] {
  return load()[table];
}

export function findById<T extends TableName>(
  table: T,
  id: string
): MockDatabase[T][number] | undefined {
  const rows = load()[table] as Array<{ id: string }>;
  return rows.find((r) => r.id === id) as MockDatabase[T][number] | undefined;
}

export function findBy<T extends TableName>(
  table: T,
  predicate: (row: MockDatabase[T][number]) => boolean
): MockDatabase[T] {
  const rows = load()[table] as MockDatabase[T];
  return (rows as Array<MockDatabase[T][number]>).filter(predicate) as MockDatabase[T];
}

export function insert<T extends TableName>(table: T, row: MockDatabase[T][number]): MockDatabase[T][number] {
  const db = load();
  (db[table] as Array<MockDatabase[T][number]>).push(row);
  save(db);
  return row;
}

export function update<T extends TableNameWithId>(
  table: T,
  id: string,
  patch: Partial<MockDatabase[T][number]>
): MockDatabase[T][number] | undefined {
  const db = load();
  const rows = db[table] as Array<MockDatabase[T][number]>;
  const idx = rows.findIndex((r) => r.id === id);
  if (idx === -1) return undefined;
  rows[idx] = { ...rows[idx], ...patch, updated_at: new Date().toISOString() };
  save(db);
  return rows[idx];
}

export function remove<T extends TableName>(table: T, id: string): boolean {
  const db = load();
  const rows = db[table] as Array<{ id: string }>;
  const idx = rows.findIndex((r) => r.id === id);
  if (idx === -1) return false;
  rows.splice(idx, 1);
  save(db);
  return true;
}

export function removeWhere<T extends TableName>(
  table: T,
  predicate: (row: MockDatabase[T][number]) => boolean
): number {
  const db = load();
  const rows = db[table] as Array<MockDatabase[T][number]>;
  const nextRows = rows.filter((row) => !predicate(row));
  const removedCount = rows.length - nextRows.length;
  if (removedCount === 0) return 0;
  rows.splice(0, rows.length, ...nextRows);
  save(db);
  return removedCount;
}

export function genId(prefix = "id"): string {
  const rnd = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}${rnd}`;
}
