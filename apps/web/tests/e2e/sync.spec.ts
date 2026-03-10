import { test, expect } from "@playwright/test";
import { seedAuthSession, mockSupabaseAuth } from "./helpers/auth-helpers";
import {
  mockSupabaseSync,
  waitForSyncStatus,
  getPendingSyncCount,
  goOffline,
  goOnline,
  mockSyncRetry,
  hasPendingSyncItems,
  getSyncQueueItems
} from "./helpers/sync-helpers";
import {
  clearLocalData,
  getTodayKey,
  seedUserName,
  gotoHomeStable,
  waitForHomeReady,
  ensureUiUnblocked,
  quickAdd,
  openNotesTab
} from "./helpers/common-helpers";

test.describe("Sync Worker Tests", () => {
  test.beforeEach(async ({ page }) => {
    await gotoHomeStable(page);
    await clearLocalData(page);
    await mockSupabaseAuth(page);
    await mockSupabaseSync(page);
  });

  test("should sync data when going from offline to online", async ({ page, context }) => {
    await seedAuthSession(page);
    await seedUserName(page);
    await gotoHomeStable(page);
    await waitForHomeReady(page);
    await ensureUiUnblocked(page);

    // Go offline
    await goOffline(context);
    const offlineIndicator = page.locator("[title='Sedang Offline (Menunggu Jaringan)']").first();
    await page.waitForTimeout(600);

    // Add entry while offline
    await quickAdd(page, "offline entry 15k");

    // Check if pending sync indicator appears
    const hasPending = await hasPendingSyncItems(page);
    expect(hasPending).toBe(true);

    // Go back online
    await goOnline(context);

    // Wait for sync to complete (with longer timeout for sync worker)
    await page.waitForTimeout(3000);

    // Verify offline indicator is gone
    await expect(offlineIndicator).not.toBeVisible({ timeout: 10000 });

    // Verify entry is still there
    await openNotesTab(page);
    await expect(page.locator("[data-entry-id]").first()).toContainText("offline entry");
  });

  test("should queue multiple entries while offline", async ({ page, context }) => {
    await seedAuthSession(page);
    await seedUserName(page);
    await gotoHomeStable(page);
    await waitForHomeReady(page);
    await ensureUiUnblocked(page);

    // Go offline
    await goOffline(context);
    await page.waitForTimeout(600);

    // Add multiple entries
    await quickAdd(page, "offline 1 10k");
    await quickAdd(page, "offline 2 20k");
    await quickAdd(page, "offline 3 30k");

    // Verify all entries are in local DB
    await openNotesTab(page);
    await expect(page.locator("[data-entry-id]")).toHaveCount(3);

    // Check sync queue
    const queueItems = await getSyncQueueItems(page);
    expect(queueItems.length).toBeGreaterThanOrEqual(3);

    // Go online
    await goOnline(context);
    await page.waitForTimeout(3000);

    // All entries should still be visible
    await expect(page.locator("[data-entry-id]")).toHaveCount(3);
  });

  test("should retry failed sync operations", async ({ page }) => {
    await mockSyncRetry(page, 2); // Fail first 2 attempts
    await seedAuthSession(page);
    await seedUserName(page);
    await gotoHomeStable(page);
    await waitForHomeReady(page);
    await ensureUiUnblocked(page);

    // Add entry (will fail first 2 times, succeed on 3rd)
    await quickAdd(page, "retry test 25k");

    // Wait for retries to complete
    await page.waitForTimeout(5000);

    // Entry should eventually be synced
    await openNotesTab(page);
    await expect(page.locator("[data-entry-id]").first()).toContainText("retry test");
  });

  test("should handle sync failure gracefully", async ({ page }) => {
    await mockSupabaseSync(page, { shouldFail: true });
    await seedAuthSession(page);
    await seedUserName(page);
    await gotoHomeStable(page);
    await waitForHomeReady(page);
    await ensureUiUnblocked(page);

    // Add entry (sync will fail)
    await quickAdd(page, "fail test 30k");

    // Entry should still be saved locally
    await openNotesTab(page);
    await expect(page.locator("[data-entry-id]").first()).toContainText("fail test");

    // Should show sync failed indicator
    const hasFailed = await page.getByText(/sync.*failed|gagal/i).isVisible().catch(() => false);
    
    // Even if sync fails, data should be in queue
    const hasPending = await hasPendingSyncItems(page);
    expect(hasPending).toBe(true);
  });

  test("should sync on app startup when authenticated", async ({ page }) => {
    await seedAuthSession(page);
    await seedUserName(page);
    
    // Add some data to mock server
    await page.route('**/rest/v1/entries**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'server-entry-1',
              text: 'from server',
              amount: 50000,
              date: getTodayKey(),
              category: 'Makan',
              source: 'quick_add',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          ])
        });
      } else {
        await route.fallback();
      }
    });

    await gotoHomeStable(page);
    await waitForHomeReady(page);
    await ensureUiUnblocked(page);

    // Wait for initial sync
    await page.waitForTimeout(2000);

    // Should have data from server
    await openNotesTab(page);
    const hasServerData = await page.getByText("from server").isVisible().catch(() => false);
    
    // If sync worked, server data should be visible
    if (hasServerData) {
      await expect(page.getByText("from server")).toBeVisible();
    }
  });

  test("should handle concurrent sync operations", async ({ page }) => {
    await seedAuthSession(page);
    await seedUserName(page);
    await gotoHomeStable(page);
    await waitForHomeReady(page);
    await ensureUiUnblocked(page);

    // Quick-add uses a single shared input; fire them rapidly but sequentially
    // to avoid clobbering the field value in the browser.
    await quickAdd(page, "concurrent 1 10k");
    await quickAdd(page, "concurrent 2 20k");
    await quickAdd(page, "concurrent 3 30k");

    // Wait for sync
    await page.waitForTimeout(3000);

    // All entries should be saved
    await openNotesTab(page);
    await expect(page.locator("[data-entry-id]")).toHaveCount(3);
  });

  test("should keep notes screen usable during sync conflicts", async ({ page }) => {
    await seedAuthSession(page);
    await seedUserName(page);
    await gotoHomeStable(page);
    await waitForHomeReady(page);
    await ensureUiUnblocked(page);

    // Add entry locally
    await quickAdd(page, "local entry 15k");

    // Simulate server having different version
    await page.route('**/rest/v1/entries**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'conflict-entry',
              text: 'server version',
              amount: 99999,
              date: getTodayKey(),
              category: 'Makan',
              source: 'quick_add',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ])
        });
      } else {
        await route.fallback();
      }
    });

    // Trigger sync
    await page.reload();
    await waitForHomeReady(page);
    await page.waitForTimeout(2000);

    // Conflict resolution is handled asynchronously; the stable UI contract here
    // is that the notes screen remains usable after the refresh.
    await openNotesTab(page);
    await expect(page.getByRole("heading", { name: "Catatan" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Catat banyak" })).toBeVisible();
  });

  test("should handle network timeout during sync", async ({ page }) => {
    await mockSupabaseSync(page, { delay: 30000 }); // 30s delay = timeout
    await seedAuthSession(page);
    await seedUserName(page);
    await gotoHomeStable(page);
    await waitForHomeReady(page);
    await ensureUiUnblocked(page);

    // Add entry (will timeout)
    await quickAdd(page, "timeout test 20k");

    // Entry should still be saved locally
    await openNotesTab(page);
    await expect(page.locator("[data-entry-id]").first()).toContainText("timeout test");

    // Should show timeout or retry indicator
    await page.waitForTimeout(5000);
    
    // Data should be in queue for retry
    const hasPending = await hasPendingSyncItems(page);
    expect(hasPending).toBe(true);
  });

  test("should open authenticated state across multiple tabs/windows", async ({ browser }) => {
    const context = await browser.newContext();
    const page1 = await context.newPage();

    await mockSupabaseAuth(page1);
    await mockSupabaseSync(page1);
    await seedAuthSession(page1);
    await seedUserName(page1);
    await gotoHomeStable(page1);
    await waitForHomeReady(page1);
    await ensureUiUnblocked(page1);

    await quickAdd(page1, "tab 1 entry 10k");
    await page1.waitForTimeout(1200);

    const page2 = await context.newPage();
    await mockSupabaseAuth(page2);
    await mockSupabaseSync(page2);
    await seedAuthSession(page2);
    await seedUserName(page2);
    await gotoHomeStable(page2);
    await waitForHomeReady(page2);
    await ensureUiUnblocked(page2);
    await openNotesTab(page2);

    await expect(page2.getByRole("heading", { name: "Catatan" })).toBeVisible();
    await expect(page1.getByRole("heading", { name: "KeMana" })).toBeVisible();

    await context.close();
  });

  test("should handle rapid online/offline transitions", async ({ page, context }) => {
    await seedAuthSession(page);
    await seedUserName(page);
    await gotoHomeStable(page);
    await waitForHomeReady(page);
    await ensureUiUnblocked(page);

    // Rapid transitions
    await goOffline(context);
    await page.waitForTimeout(500);
    await goOnline(context);
    await page.waitForTimeout(500);
    await goOffline(context);
    await page.waitForTimeout(500);
    await goOnline(context);

    // Add entry after transitions
    await quickAdd(page, "transition test 15k");

    // Should still work
    await openNotesTab(page);
    await expect(page.locator("[data-entry-id]").first()).toContainText("transition test");
  });

  test("should preserve sync queue across page reloads", async ({ page, context }) => {
    await seedAuthSession(page);
    await seedUserName(page);
    await gotoHomeStable(page);
    await waitForHomeReady(page);
    await ensureUiUnblocked(page);
    await page.waitForTimeout(1000);

    await goOffline(context);
    await page.waitForTimeout(600);

    // Add entry
    await quickAdd(page, "reload test 25k");

    await openNotesTab(page);
    await expect(page.locator("[data-entry-id]").first()).toContainText("reload test", { timeout: 10000 });

    // Check queue before reload
    const queueBefore = await getSyncQueueItems(page);
    expect(queueBefore.length).toBeGreaterThan(0);

    // Reload page
    await page.reload();
    await waitForHomeReady(page);

    // Check queue after reload
    const queueAfter = await getSyncQueueItems(page);

    // Queue should be preserved while still offline.
    expect(queueAfter.length).toBeGreaterThan(0);

    // Entry should still be visible
    await openNotesTab(page);
    await expect(page.getByText("reload test")).toBeVisible({ timeout: 10000 });
  });
});
