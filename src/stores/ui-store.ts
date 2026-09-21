import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { MasterStatus, Platform } from "@/lib/constants";

export interface ContentListFilters {
  search: string;
  status: MasterStatus | "all";
  campaign_id: string | "all";
  assigned_to: string | "all";
  platform: Platform | "all";
}
export interface SavedContentView {
  id: string;
  name: string;
  filters: ContentListFilters;
}

interface UiState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;

  contentFilters: ContentListFilters;
  setContentFilters: (patch: Partial<ContentListFilters>) => void;
  resetContentFilters: () => void;
  savedContentViews: SavedContentView[];
  saveContentView: (name: string) => void;
  deleteContentView: (id: string) => void;
}

const defaultFilters: ContentListFilters = {
  search: "",
  status: "all",
  campaign_id: "all",
  assigned_to: "all",
  platform: "all",
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),

      contentFilters: defaultFilters,
      setContentFilters: (patch) =>
        set((s) => ({ contentFilters: { ...s.contentFilters, ...patch } })),
      resetContentFilters: () => set({ contentFilters: defaultFilters }),
      savedContentViews: [],
      saveContentView: (name) => set((s) => ({
        savedContentViews: [
          ...s.savedContentViews.filter((view) => view.name.toLowerCase() !== name.trim().toLowerCase()),
          { id: `view_${Date.now()}`, name: name.trim(), filters: { ...s.contentFilters } },
        ],
      })),
      deleteContentView: (id) => set((s) => ({ savedContentViews: s.savedContentViews.filter((view) => view.id !== id) })),
    }),
    { name: "contentflow.ui.v1" }
  )
);
