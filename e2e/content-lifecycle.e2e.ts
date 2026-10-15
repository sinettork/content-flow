import { expect, test, type Page } from "@playwright/test";

const demoPassword = "password";

async function chooseFuturePublishTime(page: Page) {
  const { dateLabel, monthOffset } = await page.evaluate(() => {
    const today = new Date();
    const target = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14);
    return {
      dateLabel: target.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
      monthOffset: (target.getFullYear() - today.getFullYear()) * 12 + target.getMonth() - today.getMonth(),
    };
  });

  await page.getByLabel("Scheduled at").click();
  for (let month = 0; month < monthOffset; month += 1) {
    await page.getByRole("button", { name: "Next month", exact: true }).click();
  }
  await page.getByRole("button", { name: dateLabel, exact: true }).click();
  await page.getByLabel("Time in 24-hour format").fill("10:30");
  await page.getByRole("button", { name: "Done", exact: true }).click();
}

test("editor creates and configures content; manager reviews, approves, schedules, and confirms the mock published status", async ({ page }) => {
  test.setTimeout(60_000);
  const providerRequests: string[] = [];
  page.on("request", (request) => {
    if (/graph\.facebook\.com|instagram\.com|tiktok\.com|api\.telegram\.org|youtubeapis\.com/i.test(request.url())) {
      providerRequests.push(request.url());
    }
  });

  await page.goto("/auth/sign-in");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();

  await page.getByLabel("Email address").fill("editor@demo.com");
  await page.getByLabel("Password").fill(demoPassword);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/dashboard/);

  await page.getByRole("link", { name: "Content", exact: true }).click();
  await page.getByRole("link", { name: "New content", exact: true }).first().click();

  const title = `E2E content lifecycle ${Date.now()}`;
  await page.getByLabel("Title *").fill(title);
  await page.getByLabel("Campaign").click();
  await page.getByRole("option", { name: "Product Awareness", exact: true }).click();
  await page.getByLabel("Assignee").click();
  await page.getByRole("option", { name: "Ethan Editor", exact: true }).click();
  await page.getByPlaceholder("Content brief, notes, instructions…").fill("A demo-only workflow test. No external post will be sent.");
  await page.getByRole("button", { name: "facebook", exact: true }).click();
  await page.getByPlaceholder("Platform caption…").fill("A safe demo caption for the Facebook platform.");
  await page.getByPlaceholder("#hashtags").fill("#ContentFlowTest");
  await chooseFuturePublishTime(page);
  await page.getByRole("button", { name: "Create content", exact: true }).click();

  await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  const contentUrl = page.url();
  await expect(page.getByText("A safe demo caption for the Facebook platform.")).toBeVisible();
  await expect(page.getByText("#ContentFlowTest")).toBeVisible();
  await expect(page.getByText(/Scheduled for /)).toBeVisible();

  await page.getByRole("button", { name: "Send for review", exact: true }).click();
  await expect(page.getByText("In Review", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: /Ethan Editor/ }).click();
  await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/auth\/sign-in/);

  await page.getByLabel("Email address").fill("manager@demo.com");
  await page.getByLabel("Password").fill(demoPassword);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(contentUrl);
  await page.getByRole("link", { name: "Approvals & Publishing", exact: true }).click();
  await page.getByPlaceholder("Filter by content title").fill(title);
  await expect(page.getByText(title, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Approve content", exact: true }).click();
  await expect(page.getByText("Content approved", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Content", exact: true }).click();
  await page.getByPlaceholder("Search title or slug...").fill(title);
  const contentRow = page.getByRole("row").filter({ hasText: title });
  await expect(contentRow).toBeVisible();
  await contentRow.click();
  await expect(page.getByText("Approved", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Scheduled for /)).toBeVisible();

  await page.getByRole("button", { name: "Schedule", exact: true }).click();
  await expect(page.getByText("Scheduled", { exact: true }).first()).toBeVisible();

  // This records the app's internal demo status only; it does not publish to Facebook.
  await page.getByRole("button", { name: "Mark as published", exact: true }).click();
  await expect(page.getByText("Published", { exact: true }).first()).toBeVisible();
  await expect(page).toHaveURL(contentUrl);
  expect(providerRequests).toEqual([]);
});
