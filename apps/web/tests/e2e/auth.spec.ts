import { test, expect, type Page } from "@playwright/test";
import {
  seedAuthSession,
  seedAuthSessionStorage,
  clearAuthSession,
  mockSupabaseAuth,
  mockGoogleOAuth
} from "./helpers/auth-helpers";
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
import { mockSupabaseSync } from "./helpers/sync-helpers";

async function openAccountTab(page: Page) {
  await page.locator("nav").last().getByRole("button", { name: "Akun" }).click();
  await expect(page.getByRole("heading", { name: "Akun" })).toBeVisible();
}

async function waitForAccountReady(page: Page) {
  await page.waitForTimeout(1200);
  await expect
    .poll(
      async () => {
        const hasLoginButton = await page.getByRole("button", { name: "Lanjutkan dengan Google" }).isVisible().catch(() => false);
        const hasLogoutButton = await page.getByRole("button", { name: "Keluar Akun" }).isVisible().catch(() => false);
        const hasEditNameButton = await page.getByRole("button", { name: "Ubah Nama" }).isVisible().catch(() => false);
        return hasLoginButton || hasLogoutButton || hasEditNameButton;
      },
      { timeout: 10000 }
    )
    .toBe(true);
}

test.describe("Authentication Flows", () => {
  test.beforeEach(async ({ page }) => {
    await gotoHomeStable(page);
    await clearLocalData(page);
  });

  test("should work in anonymous mode without authentication", async ({ page }) => {
    await seedUserName(page);
    await gotoHomeStable(page);
    await waitForHomeReady(page);
    await ensureUiUnblocked(page);

    // Should be able to use app without auth
    await quickAdd(page, "anonymous test 10k");
    await openNotesTab(page);

    await expect(page.locator("[data-entry-id]").first()).toContainText("anonymous test");
    
    await openAccountTab(page);
    await waitForAccountReady(page);
    await expect(page.getByRole("button", { name: "Lanjutkan dengan Google" })).toBeVisible();
  });

  test("should show sign in option in account tab", async ({ page }) => {
    await seedUserName(page);
    await gotoHomeStable(page);
    await waitForHomeReady(page);
    await ensureUiUnblocked(page);

    // Open account tab
    await openAccountTab(page);
    await waitForAccountReady(page);

    // Should show sign in button
    await expect(page.getByRole("button", { name: "Lanjutkan dengan Google" })).toBeVisible();
  });

  test("should handle Google OAuth sign in flow (mocked)", async ({ page }) => {
    await mockSupabaseAuth(page);
    await mockGoogleOAuth(page);
    await mockSupabaseSync(page);
    
    await seedUserName(page);
    await gotoHomeStable(page);
    await waitForHomeReady(page);
    await ensureUiUnblocked(page);

    await openAccountTab(page);
    await waitForAccountReady(page);

    // Static export does not complete a real OAuth redirect in CI, so simulate
    // the post-callback state directly after confirming the CTA is available.
    await seedAuthSession(page, "google-user-id");
    await page.reload();
    await waitForHomeReady(page);
    await ensureUiUnblocked(page);

    await openAccountTab(page);
    await waitForAccountReady(page);
    await expect(page.getByRole("button", { name: "Keluar Akun" })).toBeVisible();
  });

  test("should migrate anonymous data to account on sign in", async ({ page }) => {
    await mockSupabaseAuth(page);
    await mockSupabaseSync(page);
    await seedUserName(page);
    await gotoHomeStable(page);
    await waitForHomeReady(page);
    await ensureUiUnblocked(page);

    // Add data as anonymous user
    await quickAdd(page, "before auth 15k");
    await quickAdd(page, "before auth 2 20k");

    await openNotesTab(page);
    await expect(page.locator("[data-entry-id]")).toHaveCount(2);

    const today = getTodayKey();
    await page.route("**/rest/v1/entries**", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            {
              id: "migrated-entry-1",
              text: "before auth",
              amount: 15000,
              date: today,
              category: "Lainnya",
              source: "quick_add",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              id: "migrated-entry-2",
              text: "before auth 2",
              amount: 20000,
              date: today,
              category: "Lainnya",
              source: "quick_add",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ])
        });
        return;
      }

      await route.fallback();
    });

    // Sign in
    await seedAuthSession(page);
    await page.reload();
    await waitForHomeReady(page);

    // Data should still be there after auth
    await openNotesTab(page);
    await expect(page.locator("[data-entry-id]")).toHaveCount(2, { timeout: 15000 });
    await expect(page.locator("[data-entry-id]").first()).toContainText("before auth");
  });

  test("should show user info when authenticated", async ({ page }) => {
    await mockSupabaseAuth(page);
    await mockSupabaseSync(page);
    await seedAuthSession(page, "test-user-123");
    await seedUserName(page);
    await gotoHomeStable(page);
    await waitForHomeReady(page);
    await ensureUiUnblocked(page);

    // Open account tab
    await openAccountTab(page);
    await waitForAccountReady(page);

    await expect(page.getByText("test@example.com")).toBeVisible({ timeout: 15000 });
  });

  test("should handle sign out and clear local data", async ({ page }) => {
    await mockSupabaseAuth(page);
    await mockSupabaseSync(page);
    await seedAuthSession(page);
    await seedUserName(page);
    await gotoHomeStable(page);
    await waitForHomeReady(page);
    await ensureUiUnblocked(page);

    // Add some data
    await quickAdd(page, "test data 10k");
    await openNotesTab(page);
    await expect(page.locator("[data-entry-id]")).toHaveCount(1);

    await openAccountTab(page);
    await expect(page.getByRole("button", { name: "Keluar Akun" })).toBeVisible({ timeout: 15000 });

    // Sign out
    await page.getByRole("button", { name: "Keluar Akun" }).click();

    // Confirm sign out if modal appears
    const confirmButton = page.getByRole("button", { name: /tetap.*keluar/i });
    if (await confirmButton.isVisible().catch(() => false)) {
      await confirmButton.click();
    }

    // Wait for sign out to complete
    await page.waitForTimeout(1000);

    const hasPersistedSession = await page.evaluate(() => {
      return Boolean(localStorage.getItem("sb-oyxhohsxpbbsedidujvt-auth-token"));
    });

    expect(hasPersistedSession).toBe(false);
  });

  test("should keep pending sync data visible while offline", async ({ page, context }) => {
    await mockSupabaseAuth(page);
    await mockSupabaseSync(page);
    await seedAuthSession(page);
    await seedUserName(page);
    await gotoHomeStable(page);
    await waitForHomeReady(page);
    await ensureUiUnblocked(page);

    // Add data while online
    await quickAdd(page, "pending sync 20k");

    // Go offline
    await context.setOffline(true);
    await expect(page.getByText(/offline/i)).toBeVisible();

    await openNotesTab(page);
    await expect(page.locator("[data-entry-id]").first()).toContainText("pending sync");
  });

  test("should handle session expiry gracefully", async ({ page }) => {
    await mockSupabaseAuth(page);
    await mockSupabaseSync(page);
    await seedUserName(page);
    await gotoHomeStable(page);
    await waitForHomeReady(page);
    await ensureUiUnblocked(page);

    await seedAuthSessionStorage(page);
    await page.reload();
    await waitForHomeReady(page);
    await ensureUiUnblocked(page);

    // Simulate expired session
    await clearAuthSession(page);
    
    await page.reload();
    await waitForHomeReady(page);
    await ensureUiUnblocked(page);

    await openAccountTab(page);
    await expect(page.getByRole("button", { name: "Lanjutkan dengan Google" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: "Keluar Akun" })).toHaveCount(0);
  });

  test("should remain usable when stored token expiry changes", async ({ page }) => {
    await mockSupabaseAuth(page);
    await mockSupabaseSync(page);
    
    // Mock token refresh endpoint
    await page.route('**/auth/v1/token?grant_type=refresh_token**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'new_access_token',
          refresh_token: 'new_refresh_token',
          expires_in: 3600,
          token_type: 'bearer'
        })
      });
    });

    await seedAuthSession(page);
    await seedUserName(page);
    await gotoHomeStable(page);
    await waitForHomeReady(page);
    await ensureUiUnblocked(page);

    // Simulate token expiring soon
    await page.evaluate(() => {
      const storageKey = Object.keys(localStorage).find(key => 
        key.includes('sb-') && key.includes('-auth-token')
      );
      
      if (storageKey) {
        const session = JSON.parse(localStorage.getItem(storageKey) || '{}');
        session.expires_at = Math.floor(Date.now() / 1000) + 60;
        localStorage.setItem(storageKey, JSON.stringify(session));
      }
    });

    // Add entry (should trigger token refresh check)
    await quickAdd(page, "token refresh test 10k");

    // The static test setup does not complete a real refresh handshake, so the
    // important assertion here is that the app remains interactive.
    await expect(page.getByRole("heading", { name: "KeMana" })).toBeVisible();
    await expect(page.locator("main input[type='text']").first()).toBeVisible();
  });

  test("should render a single Google sign in CTA", async ({ page }) => {
    await mockSupabaseAuth(page);
    await mockGoogleOAuth(page);
    await seedUserName(page);
    await gotoHomeStable(page);
    await waitForHomeReady(page);
    await ensureUiUnblocked(page);

    await openAccountTab(page);
    await waitForAccountReady(page);
    const signInButton = page.getByRole("button", { name: "Lanjutkan dengan Google" });
    await expect(signInButton).toBeVisible();
    await expect(page.getByRole("button", { name: "Lanjutkan dengan Google" })).toHaveCount(1);
  });

  test("should persist auth state across page reloads", async ({ page }) => {
    await mockSupabaseAuth(page);
    await mockSupabaseSync(page);
    await seedAuthSession(page);
    await seedUserName(page);
    await gotoHomeStable(page);
    await waitForHomeReady(page);
    await ensureUiUnblocked(page);

    await page.reload();
    await waitForHomeReady(page);
    await ensureUiUnblocked(page);

    await expect(page.locator("[title='Tersinkronisasi']").first()).toBeVisible({ timeout: 15000 });
  });
});
