import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:4321",
    headless: true,
    viewport: { width: 1440, height: 900 }
  },
  webServer: {
    command: "python3 -m http.server 4321 --bind 127.0.0.1",
    url: "http://127.0.0.1:4321",
    reuseExistingServer: true,
    timeout: 10_000
  }
});
