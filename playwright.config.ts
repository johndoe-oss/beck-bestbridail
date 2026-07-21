import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",

  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],

  // Boots the API server + storefront together (same as `npm run dev`,
  // minus the sandbox app, which the storefront doesn't depend on) and
  // waits for the storefront to respond before running tests.
  webServer: {
    command:
      'concurrently --names "api,web" --kill-others "npm:dev:api" "npm:dev:web"',
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
