import { describe, expect, it } from "vitest";

import {
  getFacebookInsightsWindow,
  mapMetaInsights,
  mergeMetaInsightsWithExisting,
  summarizeFacebookInsights,
  type FacebookDailyInsight,
} from "./facebook-insights";

const fixedNow = new Date("2026-10-15T12:00:00Z");

describe("getFacebookInsightsWindow", () => {
  it.each([30, 90] as const)("returns a full %i completed-day UTC window", (days) => {
    const window = getFacebookInsightsWindow(days, fixedNow);
    expect(window).toEqual({
      since: days === 30 ? "2026-09-15" : "2026-07-17",
      until: "2026-10-15",
    });
    expect(Date.parse(`${window.until}T00:00:00Z`) - Date.parse(`${window.since}T00:00:00Z`))
      .toBe(days * 24 * 60 * 60 * 1000);
  });
});

describe("mapMetaInsights", () => {
  it("merges supported daily metrics by date, accounting for end_time being next day", () => {
    const rows = mapMetaInsights([
      { name: "page_daily_follows_unique", values: [{ value: 4, end_time: "2026-10-15T08:00:00+0000" }, { value: 2, end_time: "2026-10-14T08:00:00+0000" }] },
      { name: "page_total_media_view_unique", values: [{ value: 125, end_time: "2026-10-14T08:00:00+0000" }] },
      { name: "page_daily_unfollows_unique", values: [{ value: 1, end_time: "2026-10-14T08:00:00+0000" }] },
      { name: "page_follows", values: [{ value: "980", end_time: "2026-10-14T08:00:00+0000" }] },
      { name: "legacy_metric", values: [{ value: 99, end_time: "2026-10-14T08:00:00+0000" }] },
    ]);

    expect(rows).toEqual([
      { metric_date: "2026-10-13", unique_viewers: 125, daily_follows: 2, daily_unfollows: 1, total_followers: 980 },
      { metric_date: "2026-10-14", unique_viewers: null, daily_follows: 4, daily_unfollows: null, total_followers: null },
    ]);
  });

  it("ignores malformed dates and non-numeric metric values", () => {
    expect(mapMetaInsights([
      { name: "page_daily_follows_unique", values: [
        { value: "nope", end_time: "2026-10-15T08:00:00Z" },
        { value: 2, end_time: "not-a-date" },
        { value: -1, end_time: "2026-10-15T08:00:00Z" },
      ] },
    ])).toEqual([]);
  });
});

describe("mergeMetaInsightsWithExisting", () => {
  it("preserves stored metrics when a later response omits those metrics for the date", () => {
    const existing: FacebookDailyInsight[] = [{
      metric_date: "2026-10-13",
      unique_viewers: 100,
      daily_follows: 2,
      daily_unfollows: 1,
      total_followers: 980,
      updated_at: "2026-10-14T00:00:00Z",
    }];
    const incoming = mapMetaInsights([
      { name: "page_daily_follows_unique", values: [{ value: 0, end_time: "2026-10-14T08:00:00+0000" }] },
    ]);

    expect(mergeMetaInsightsWithExisting(incoming, existing)).toEqual([{
      metric_date: "2026-10-13",
      unique_viewers: 100,
      daily_follows: 0,
      daily_unfollows: 1,
      total_followers: 980,
    }]);
  });
});

describe("summarizeFacebookInsights", () => {
  const rows: FacebookDailyInsight[] = [
    { metric_date: "2026-10-13", unique_viewers: 100, daily_follows: 5, daily_unfollows: 2, total_followers: 900, updated_at: "2026-10-15T00:00:00Z" },
    { metric_date: "2026-10-14", unique_viewers: 120, daily_follows: 3, daily_unfollows: 4, total_followers: 899, updated_at: "2026-10-15T00:00:00Z" },
  ];

  it("returns latest snapshots and complete-period net follower change", () => {
    expect(summarizeFacebookInsights(rows, 2)).toEqual({
      latestViewers: 120,
      latestViewersDate: "2026-10-14",
      follows: { total: 8, coveredDays: 2, expectedDays: 2, complete: true },
      unfollows: { total: 6, coveredDays: 2, expectedDays: 2, complete: true },
      netFollows: 2,
      latestFollowers: 899,
      latestFollowersDate: "2026-10-14",
    });
  });

  it("keeps incomplete totals visibly partial and does not calculate net", () => {
    const partial = summarizeFacebookInsights([rows[0]], 2);
    expect(partial.follows).toEqual({ total: 5, coveredDays: 1, expectedDays: 2, complete: false });
    expect(partial.unfollows.complete).toBe(false);
    expect(partial.netFollows).toBeNull();
  });

  it("keeps missing metrics unknown instead of presenting them as zero", () => {
    expect(summarizeFacebookInsights([], 30)).toEqual({
      latestViewers: null,
      latestViewersDate: null,
      follows: { total: null, coveredDays: 0, expectedDays: 30, complete: false },
      unfollows: { total: null, coveredDays: 0, expectedDays: 30, complete: false },
      netFollows: null,
      latestFollowers: null,
      latestFollowersDate: null,
    });
  });
});
