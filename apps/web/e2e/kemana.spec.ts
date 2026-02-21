import { test, expect } from "@playwright/test";

test.describe("Kemana App E2E", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        // We clear indexeddb by evaluating in page
        await page.evaluate(async () => {
            const dbs = await window.indexedDB.databases();
            for (const db of dbs) {
                if (db.name) window.indexedDB.deleteDatabase(db.name);
            }
            localStorage.clear();
        });
        await page.reload();
    });

    test("App mounts and displays title", async ({ page }) => {
        await expect(page).toHaveTitle(/KeMana/);
        await expect(page.locator("h1")).toHaveText("KeMana");
    });
});
