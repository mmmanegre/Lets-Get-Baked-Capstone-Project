import { defineConfig } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, "..");

export default defineConfig({
  testDir: path.join(__dirname, "integration"),
  testMatch: "**/*.spec.js",

  use: {
    baseURL: "http://127.0.0.1:5500",
    headless: true,
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  webServer: {
    command: "npx http-server -p 5500 -c-1 .",
    cwd: repoRoot,
    url: "http://127.0.0.1:5500/login.html",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
