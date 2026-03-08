import { defineConfig, devices } from "@playwright/test";

const PLAYWRIGHT_PORT = Number.parseInt(process.env.PLAYWRIGHT_PORT ?? "3100", 10);
const PLAYWRIGHT_BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PLAYWRIGHT_PORT}`;

export default defineConfig({
    testDir: "./tests/e2e",
    timeout: 60000,
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1,
    reporter: "html",
    use: {
        baseURL: PLAYWRIGHT_BASE_URL,
        trace: "on-first-retry",
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
    ],
    webServer: {
        command: `PORT=${PLAYWRIGHT_PORT} node scripts/serve-static-export.mjs`,
        port: PLAYWRIGHT_PORT,
        reuseExistingServer: false,
        timeout: 120000,
    },
});
