import fs from "node:fs";
import { defineConfig } from "@playwright/test";

const exe = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

// e2e runs against a production build served with the SYNTHETIC fixture content.
export default defineConfig({
  testDir: "e2e",
  globalTeardown: "./e2e/global-teardown.ts",
  workers: 1,
  use: {
    baseURL: "http://localhost:3101",
    viewport: { width: 360, height: 740 },
    launchOptions: { executablePath: fs.existsSync(exe) ? exe : undefined },
  },
  webServer: {
    command: "node e2e/make-fixtures.mjs && npx next start -p 3101",
    url: "http://localhost:3101/dev",
    reuseExistingServer: false,
    env: { CONTENT_DIR: "tests/fixtures/content", LOCAL_DATA_DIR: "/tmp/maalim-e2e-data", PORT: "3101" },
    timeout: 60_000,
  },
});
