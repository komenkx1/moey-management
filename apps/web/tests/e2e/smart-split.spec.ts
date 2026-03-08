import { test, expect } from '@playwright/test';

async function clearLocalData(page: any) {
  await page.evaluate(async () => {
    const databaseList = await window.indexedDB.databases();
    for (const db of databaseList) {
      if (db.name) {
        window.indexedDB.deleteDatabase(db.name);
      }
    }

    if ("serviceWorker" in window.navigator) {
      const registrations = await window.navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    if ("caches" in window) {
      const cacheKeys = await window.caches.keys();
      await Promise.all(cacheKeys.map((key) => window.caches.delete(key)));
    }

    window.localStorage.clear();
    window.sessionStorage.clear();
  });
}

async function seedUserName(page: any, userName = "Tester") {
  await page.addInitScript((nextName: string) => {
    window.localStorage.setItem("kemana.userName", nextName);
    window.localStorage.setItem("pwa_install_banner_seen_v1", "e2e");
  }, userName);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.evaluate((nextName: string) => {
        window.localStorage.setItem("kemana.userName", nextName);
        window.localStorage.setItem("pwa_install_banner_seen_v1", "e2e");
      }, userName);
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isExecutionContextRace =
        message.includes("Execution context was destroyed") ||
        message.includes("Target page, context or browser has been closed");

      if (!isExecutionContextRace || attempt === 2) {
        throw error;
      }

      await page.goto("/", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(120);
    }
  }
}

async function gotoHomeStable(page: any) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto("/", { waitUntil: "domcontentloaded" });
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isNavigationRace = message.includes("interrupted by another navigation");
      let isAlreadyOnHome = false;
      try {
        const currentUrl = new URL(page.url());
        isAlreadyOnHome = currentUrl.hostname === "localhost" && currentUrl.pathname === "/";
      } catch {
        isAlreadyOnHome = false;
      }

      if (isNavigationRace && isAlreadyOnHome) {
        await page.waitForLoadState("domcontentloaded");
        return;
      }

      if (attempt === 2) {
        throw error;
      }

      await page.waitForTimeout(150);
    }
  }
}

async function waitForHomeReady(page: any) {
  await expect(page.getByRole("heading", { name: "KeMana" })).toBeVisible();
  await expect(page.locator("main input[type='text']").first()).toBeVisible();
}

async function ensureUiUnblocked(page: any, fallbackName = "Tester") {
  const namePrompt = page.getByRole("heading", { name: "Biar sapaan lebih personal" });
  const isNamePromptVisible = await namePrompt.isVisible().catch(() => false);
  if (isNamePromptVisible) {
    const nameInput = page.getByLabel("Nama panggilan");
    await nameInput.fill(fallbackName);
    await page.getByRole("button", { name: "Lanjut pakai KeMana" }).click();
    await expect(namePrompt).not.toBeVisible();
  }

  const closeNightCloseButton = page.getByRole("button", { name: "Tutup review hari" });
  const isNightCloseVisible = await closeNightCloseButton.isVisible().catch(() => false);
  if (isNightCloseVisible) {
    await closeNightCloseButton.click();
  }

  const closeAddSheetButton = page.locator("button[aria-label='Tutup lembar catatan']:visible");
  if (await closeAddSheetButton.isVisible().catch(() => false)) {
    await closeAddSheetButton.click();
  }

  const closeBulkSheetButton = page.locator("button[aria-label='Tutup input massal']:visible");
  if (await closeBulkSheetButton.isVisible().catch(() => false)) {
    await closeBulkSheetButton.click();
  }

  const closeDataToolsButton = page.locator("button[aria-label='Tutup data dan tools']:visible");
  if (await closeDataToolsButton.isVisible().catch(() => false)) {
    await closeDataToolsButton.click();
  }

  // Close install banner if visible
  try {
    const installBanner = page.locator('section[aria-label="Install aplikasi"]');
    if (await installBanner.isVisible({ timeout: 500 })) {
      await installBanner.locator('button').last().click();
      await page.waitForTimeout(300);
    }
  } catch (e) {
    // No install banner, continue
  }
}

test.describe('Smart Split Calculator Flows', () => {
  test.beforeEach(async ({ page }) => {
    await gotoHomeStable(page);
    await clearLocalData(page);
    await seedUserName(page);
    await gotoHomeStable(page);
    await waitForHomeReady(page);
    await ensureUiUnblocked(page);
  });

  test('user can split bill using smart calculator', async ({ page }) => {
    // Navigate to Notes tab first
    await page.locator("nav").last().getByRole("button", { name: "Catatan", exact: true }).click();
    
    // Click Add Transaction button
    await page.getByRole("button", { name: "Catat pengeluaran" }).click();

    // Verify modal is open
    await expect(page.getByRole('heading', { name: 'Catat pengeluaran', exact: true })).toBeVisible();

    // Enter Amount (100k total)
    const amountInput = page.locator('input[placeholder="0"]').first();
    await amountInput.fill('100000');

    // Select category Makan
    await page.getByRole('button', { name: 'Makan' }).click();

    // Enable Split Bill by clicking "Custom" button (use exact match)
    await page.getByRole('button', { name: 'Custom', exact: true }).click();

    // Enter split people (Kamu + Teman1 = 2 people)
    const splitInput = page.getByPlaceholder('Contoh: Budi, Cici');
    await splitInput.fill('Teman1');
    await splitInput.blur();
    
    // Wait for split people to update and SmartSplitCalculator to render
    await page.waitForTimeout(1000);

    // Wait for SmartSplitCalculator to appear
    await expect(page.getByTestId('smart-split-subtotal')).toBeVisible({ timeout: 10000 });

    // Fill subtotal (90k before tax)
    await page.getByTestId('smart-split-subtotal').fill('90000');

    // Fill Item 1 price (50k)
    await page.getByTestId('smart-split-item-price-0').fill('50000');
    
    // Assign Item 1 to Kamu
    await page.getByTestId('smart-split-item-select-0').selectOption('Kamu');

    // Add Item 2
    await page.getByTestId('smart-split-add-item').click();
    
    // Fill Item 2 price (40k)
    await page.getByTestId('smart-split-item-price-1').fill('40000');
    
    // Assign Item 2 to Teman1
    await page.getByTestId('smart-split-item-select-1').selectOption('Teman1');

    // Verify validation shows success
    await expect(page.getByTestId('smart-split-validation')).toContainText('Semua item cocok!');

    // Save transaction
    await page.getByRole('button', { name: 'Simpan catatan' }).click();

    // Verify we are back to notes tab and transaction exists
    await expect(page.locator('[data-entry-id]').first()).toContainText('Makan');
    await expect(page.locator('[data-entry-id]').first()).toContainText('55.556');
  });
});
