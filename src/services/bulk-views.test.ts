import { describe, expect, it } from "vitest";

import { useUiStore } from "@/stores/ui-store";

describe("saved content views", () => {
  it("persists a snapshot and replaces duplicate names", () => {
    useUiStore.setState({ savedContentViews: [] });
    useUiStore.getState().setContentFilters({ search: "launch", status: "draft" });
    useUiStore.getState().saveContentView("Launch");
    useUiStore.getState().setContentFilters({ search: "other" });
    useUiStore.getState().saveContentView("launch");
    const views = useUiStore.getState().savedContentViews;
    expect(views).toHaveLength(1);
    expect(views[0].filters.search).toBe("other");
  });
});
