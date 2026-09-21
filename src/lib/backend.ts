export type DataBackend = "mock" | "supabase";

const value = import.meta.env.VITE_DATA_BACKEND?.trim().toLowerCase();

if (value && value !== "mock" && value !== "supabase") {
  throw new Error(`Unsupported VITE_DATA_BACKEND value: ${value}`);
}

// A production bundle must opt into its data backend explicitly. Falling back to
// browser-local mock data would otherwise make a broken production deployment
// appear to work while silently persisting customer data only in one browser.
if (import.meta.env.PROD && value !== "supabase") {
  throw new Error("Production requires VITE_DATA_BACKEND=supabase.");
}

export const dataBackend: DataBackend = value === "supabase" ? "supabase" : "mock";
export const isSupabaseBackend = dataBackend === "supabase";
