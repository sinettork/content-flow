import { requireSupabase } from "@/lib/supabase/client";

type SupabaseTable = ReturnType<ReturnType<typeof requireSupabase>["from"]>;
type SelectQuery = ReturnType<SupabaseTable["select"]>;

function message(error: { message: string } | null): string {
  return error?.message ?? "The database request failed.";
}

export async function selectMany<T>(
  table: string,
  configure?: (query: SelectQuery) => SelectQuery
): Promise<T[]> {
  let query = requireSupabase().from(table).select("*");
  if (configure) query = configure(query);
  const { data, error } = await query;
  if (error) throw new Error(message(error));
  return (data ?? []) as T[];
}

export async function selectOne<T>(table: string, id: string): Promise<T | null> {
  const { data, error } = await requireSupabase().from(table).select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(message(error));
  return (data as T | null) ?? null;
}

export async function insertOne<T>(table: string, input: object): Promise<T> {
  const { data, error } = await requireSupabase().from(table).insert(input as Record<string, unknown>).select("*").single();
  if (error) throw new Error(message(error));
  return data as T;
}

export async function updateOne<T>(table: string, id: string, patch: object): Promise<T | null> {
  const { data, error } = await requireSupabase().from(table).update(patch as Record<string, unknown>).eq("id", id).select("*").maybeSingle();
  if (error) throw new Error(message(error));
  return (data as T | null) ?? null;
}

export async function deleteWhere(table: string, column: string, value: string): Promise<number> {
  const { data, error } = await requireSupabase().from(table).delete().eq(column, value).select("id");
  if (error) throw new Error(message(error));
  return data?.length ?? 0;
}

export async function deleteOne(table: string, id: string): Promise<boolean> {
  const { data, error } = await requireSupabase().from(table).delete().eq("id", id).select("id").maybeSingle();
  if (error) throw new Error(message(error));
  return Boolean(data);
}
