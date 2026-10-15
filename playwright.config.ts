import { existsSync } from "node:fs";

import { defineConfig } from "@playwright/test";

const systemChromium = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined);
const launchOptions = systemChromium ? { executablePath: systemChromium, args: ["--no-sandbox"] } : undefined;

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    browserName: "chromium",
    headless: true,
    locale: "en-US",
    timezoneId: "Asia/Phnom_Penh",
    trace: "retain-on-failure",
    ...(launchOptions ? { launchOptions } : {}),
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173/auth/sign-in",
    reuseExistingServer: false,
    timeout: 30_000,
    env: { ...process.env, VITE_DATA_BACKEND: "mock" },
  },
});
