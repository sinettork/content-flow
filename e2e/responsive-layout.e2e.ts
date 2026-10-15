import { expect, test, type Page } from "@playwright/test";

const viewports = [
  { name: "desktop", width: 1440, height: 960 },
  { name: "tablet", width: 820, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
] as const;

async function signInAsAdmin(page: Page) {
  await page.goto("/auth/sign-in");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.getByLabel("Email address").fill("admin@demo.com");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/dashboard/);
  await page.goto("/app/content");
  await expect(page.getByRole("heading", { name: "Content", exact: true })).toBeVisible();
}

for (const viewport of viewports) {
  test(`content workspace and saved-view dialog fit ${viewport.name} viewport`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await signInAsAdmin(page);

    if (viewport.width >= 820) {
      const sectionLabel = page.getByText("Content workspace", { exact: true });
      await expect(sectionLabel).toBeVisible();
      await expect(sectionLabel).toHaveCSS("text-transform", "none");
    }

    const pageSize = await page.evaluate(() => ({
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
    }));
    expect(pageSize.documentWidth).toBeLessThanOrEqual(pageSize.viewportWidth + 1);
    await page.screenshot({ path: testInfo.outputPath(`content-${viewport.name}.png`), fullPage: true });

    await page.getByRole("button", { name: "Save current view", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.evaluate(async (element) => {
      await Promise.all(element.getAnimations().map((animation) => animation.finished.catch(() => undefined)));
    });
    const bounds = await dialog.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width + 1);
    await page.screenshot({ path: testInfo.outputPath(`saved-view-${viewport.name}.png`), fullPage: true });
  });
}
