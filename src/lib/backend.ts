export type DataBackend = "mock" | "supabase";

const value = import.meta.env.VITE_DATA_BACKEND?.trim().toLowerCase();

if (value && value !== "mock" && value !== "supabase") {
  throw new Error(`Unsupported VITE_DATA_BACKEND value: ${value}`);
}

export const dataBackend: DataBackend = value === "supabase" ? "supabase" : "mock";
export const isSupabaseBackend = dataBackend === "supabase";
