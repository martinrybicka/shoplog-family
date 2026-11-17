import { defineConfig, devices } from "@playwright/test";
const target = process.env.E2E_URL || "http://localhost:8090";
if (!["localhost", "127.0.0.1"].includes(new URL(target).hostname))
  throw new Error("E2E povoluje pouze vlastní lokální izolované prostředí.");
export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  timeout: 45000,
  use: {
    baseURL: target,
    trace: "retain-on-failure",
    reducedMotion: "reduce",
    locale: "cs-CZ",
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1100 },
      },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
});
