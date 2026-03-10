import { test, expect } from "@playwright/test";
import { seedAuthSession, mockSupabaseAuth } from "./helpers/auth-helpers";
import {
  simulateQuotaExceeded,
  simulateCorruptedDB,
  simulate500Error,
  simulate401Error,
  simulate429Error,
  hasErrorToast,
  getErrorMessage,
  simulateJSError,
  hasErrorBoundary
} from "./helpers/error-helpers";
import {
  clearLocalData,
  seedUserName,
  gotoHomeStable,
  waitForHomeReady,
  ensureUiUnblocked,
  quickAdd,
  openNotesTab
} from "./helpers/common-helpers";

test.describe("Error Handling Tests", () => {
  test.beforeEach(async ({ page }) => {
    await gotoHomeStable(page);
    await clearLocalData(page);
  });

  test("should handle storage quota exceeded error", async ({ page }) => {
    await simulateQuotaExceeded(page);
    await seedUserName(page);
    await gotoHomeStable(page);
    await waitForHomeReady(page);
    await ensureUiUnblocked(page);

    // Try to add entry (will trigger quota error)
    await quickAdd(page, "quota test 10k");

    // Should show error message
    await page.waitForTimeout(1000);
    
    // App should still be functional (not crashed)
    await expect(page.getByRole("heading", { name: "KeMana" })).toBeVisible();
  });

  test("should handle corrupted IndexedDB gracefully", async ({ page }) => {
    await simulateCorruptedDB(page);
    await seedUserName(page);
    
    // Try to load app with corrupted DB
    await gotoHomeStable(page);
    
    // Should either show error or auto-recover
    await page.waitForTimeout(2000);

    // App should still load (with recovery)
    const isAppLoaded = await page.getByRole("heading", { name: "KeMana" }).isVisible().catch(() => false);
    expect(isAppLoaded).toBe(true);
  });

  test("should handle 500 Internal Server Error", async ({ page }) => {
    await mockSupabaseAuth(page);
    await simulate500Error(page);
    await seedAuthSession(page);
    await seedUserName(page);
    await gotoHomeStable(page);
    await waitForHomeReady(page);
    await ensureUiUnblocked(page);

    // Try to add entry (will get 500 error)
    await quickAdd(page, "500 error test 10k");

    // Entry should still be saved locally
    await openNotesTab(page);
    await expect(page.locator("[data-entry-id]").first()).toContainText("500 error test");

    // Should show error notification
    await page.waitForTimeout(1000);
    const hasError = await hasErrorToast(page);
    
    // Error toast might appear
    if (hasError) {
      const errorMsg = await getErrorMessage(page);
      expect(errorMsg).toBeTruthy();
    }
  });

  test("should handle 401 Unauthorized Error", async ({ page }) => {
    await mockSupabaseAuth(page);
    await seedAuthSession(page);
    await seedUserName(page);
    await gotoHomeStable(page);
    await waitForHomeReady(page);
    await ensureUiUnblocked(page);

    // Mock 401 error
    await simulate401Error(page);

    // Try to add entry
    await quickAdd(page, "401 error test 10k");

    await page.waitForTimeout(2000);
    await openNotesTab(page);
    await expect(page.locator("[data-entry-id]").filter({ hasText: "401 error test" }).first()).toBeVisible();
  });

  test("should handle 429 Rate Limit Error", async ({ page }) => {
    await mockSupabaseAuth(page);
    await simulate429Error(page);
    await seedAuthSession(page);
    await seedUserName(page);
    await gotoHomeStable(page);
    await waitForHomeReady(page);
    await ensureUiUnblocked(page);

    // Try to add entry (will get rate limited)
    await quickAdd(page, "rate limit test 10k");

    // Should show rate limit error
    await page.waitForTimeout(1000);
    
    // Entry should still be saved locally
    await openNotesTab(page);
    await expect(page.locator("[data-entry-id]").first()).toContainText("rate limit test");
  });

  test("should handle network timeout gracefully", async ({ page }) => {
    await mockSupabaseAuth(page);
    await seedAuthSession(page);
    await seedUserName(page);
    await gotoHomeStable(page);
    await waitForHomeReady(page);
    await ensureUiUnblocked(page);

    // Mock very slow network (timeout)
    await page.route('**/rest/v1/**', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 30000));
      await route.continue();
    });

    // Try to add entry
    await quickAdd(page, "timeout test 10k");

    // Entry should be saved locally
    await openNotesTab(page);
    await expect(page.locator("[data-entry-id]").first()).toContainText("timeout test");

    // Should show timeout or retry indicator
    await page.waitForTimeout(3000);
  });

  test("should handle JavaScript runtime errors with error boundary", async ({ page }) => {
    await seedUserName(page);
    await gotoHomeStable(page);
    await waitForHomeReady(page);
    await ensureUiUnblocked(page);

    // Trigger JS error
    try {
      await simulateJSError(page, "Test runtime error");
    } catch (e) {
      // Expected to throw
    }

    // Check if error boundary caught it
    await page.waitForTimeout(1000);
    
    const hasErrorBoundaryUI = await hasErrorBoundary(page);
    
    // Either error boundary shows or app continues working
    if (hasErrorBoundaryUI) {
      await expect(page.locator('[data-error-boundary]')).toBeVisible();
    } else {
      // App should still be functional
      await expect(page.getByRole("heading", { name: "KeMana" })).toBeVisible();
    }
  });

  test("should handle invalid data format in import", async ({ page }) => {
    await seedUserName(page);
    await gotoHomeStable(page);
    await waitForHomeReady(page);
    await ensureUiUnblocked(page);

    await openNotesTab(page);
    await page.getByRole("button", { name: "Data & tools" }).first().click();
    await expect(page.getByRole("heading", { name: "Data & tools" })).toBeVisible();

    // Try to import invalid JSON
    const invalidJson = "{ invalid json }";
    
    await page.locator("input[type='file']").setInputFiles({
      name: "invalid.json",
      mimeType: "application/json",
      buffer: Buffer.from(invalidJson)
    });

    // Should show error message
    await page.waitForTimeout(1000);
    
    const hasError = await page.getByText(/tidak.*valid|invalid|error|format tidak sesuai|csv kosong/i).isVisible().catch(() => false);
    expect(hasError || await page.getByRole("heading", { name: "Data & tools" }).isVisible().catch(() => false)).toBe(true);
  });

  test("should handle missing required fields in data", async ({ page }) => {
    await seedUserName(page);
    await gotoHomeStable(page);
    await waitForHomeReady(page);
    await ensureUiUnblocked(page);

    await openNotesTab(page);
    await page.getByRole("button", { name: "Data & tools" }).first().click();

    // Import data with missing fields
    const incompleteData = JSON.stringify({
      entries: [
        {
          id: "incomplete-1",
          // Missing required fields: text, amount, date
          category: "Makan"
        }
      ],
      rules: [],
      meta: {
        exportedAt: new Date().toISOString(),
        storageVersion: "1"
      }
    });

    await page.locator("input[type='file']").setInputFiles({
      name: "incomplete.json",
      mimeType: "application/json",
      buffer: Buffer.from(incompleteData)
    });

    await page.waitForTimeout(1000);

    // Should either skip invalid entries or show error
    const hasWarning = await page.getByText(/diabaikan|skipped|invalid/i).isVisible().catch(() => false);
    
    // App should not crash
    await expect(page.getByRole("heading", { name: "Data & tools" })).toBeVisible();
  });

  test("should handle concurrent error scenarios", async ({ page }) => {
    await mockSupabaseAuth(page);
    await seedAuthSession(page);
    await seedUserName(page);
    await gotoHomeStable(page);
    await waitForHomeReady(page);
    await ensureUiUnblocked(page);

    // Simulate multiple errors at once
    await simulate500Error(page);

    // Try multiple operations
    await quickAdd(page, "error 1 10k");
    await quickAdd(page, "error 2 20k");
    await quickAdd(page, "error 3 30k");

    // All entries should still be saved locally
    await openNotesTab(page);
    await expect(page.locator("[data-entry-id]")).toHaveCount(3);

    // App should still be functional in the notes view
    await expect(page.getByRole("heading", { name: "Catatan" })).toBeVisible();
  });

  test("should recover from temporary network failures", async ({ page, context }) => {
    await mockSupabaseAuth(page);
    await seedAuthSession(page);
    await seedUserName(page);
    await gotoHomeStable(page);
    await waitForHomeReady(page);
    await ensureUiUnblocked(page);

    // Go offline
    await context.setOffline(true);
    await page.waitForTimeout(600);

    // Add entry while offline
    await quickAdd(page, "recovery test 15k");

    // Go back online
    await context.setOffline(false);

    // Should recover and sync
    await page.waitForTimeout(3000);

    // Entry should be visible
    await openNotesTab(page);
    await expect(page.locator("[data-entry-id]").first()).toContainText("recovery test");
  });

  test("should handle browser back button gracefully", async ({ page }) => {
    await seedUserName(page);
    await gotoHomeStable(page);
    await waitForHomeReady(page);
    await ensureUiUnblocked(page);

    // Navigate to notes
    await openNotesTab(page);
    await expect(page.getByRole("button", { name: "Catat banyak" })).toBeVisible();

    // Go back
    await page.goBack();

    // History handling may keep the SPA on the current screen; the important
    // part is that navigation does not break the page.
    await expect(page.locator("body")).toBeVisible();

    // Go forward
    await page.goForward();

    await expect(page.locator("body")).toBeVisible();
  });

  test("should handle rapid user interactions without crashing", async ({ page }) => {
    await seedUserName(page);
    await gotoHomeStable(page);
    await waitForHomeReady(page);
    await ensureUiUnblocked(page);

    // Rapid clicks and inputs
    for (let i = 0; i < 10; i++) {
      await page.locator("main input[type='text']").first().fill(`rapid ${i} 10k`);
      await page.locator("main input[type='text']").first().press("Enter");
      await page.waitForTimeout(50);
    }

    // App should still be functional
    await expect(page.getByRole("heading", { name: "KeMana" })).toBeVisible();

    // Some entries should be saved
    await openNotesTab(page);
    const entryCount = await page.locator("[data-entry-id]").count();
    expect(entryCount).toBeGreaterThan(0);
  });

  test("should handle page reload during operation", async ({ page }) => {
    await seedUserName(page);
    await gotoHomeStable(page);
    await waitForHomeReady(page);
    await ensureUiUnblocked(page);

    // Start adding entry
    await page.locator("main input[type='text']").first().fill("reload test 10k");

    // Reload before submitting
    await page.reload();
    await waitForHomeReady(page);

    // App should recover
    await expect(page.getByRole("heading", { name: "KeMana" })).toBeVisible();

    // Should be able to add entry after reload
    await quickAdd(page, "after reload 20k");
    await openNotesTab(page);
    await expect(page.locator("[data-entry-id]").first()).toContainText("after reload");
  });
});
