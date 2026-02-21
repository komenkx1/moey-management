import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    testDir: "./e2e",
    timeout: 60000,
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1,
    reporter: "html",
    use: {
        baseURL: "http://localhost:3000",
        trace: "on-first-retry",
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
    ],
    webServer: {
        command: "NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS='' npm start",
        port: 3000,
        reuseExistingServer: true,
        timeout: 120000,
    },
});
