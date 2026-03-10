import { expect, type Page } from "@playwright/test";

export function getTodayKey() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function clearLocalData(page: Page) {
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

export async function seedUserName(page: Page, userName = "Tester") {
  await page.addInitScript((nextName) => {
    window.localStorage.setItem("kemana.userName", nextName);
    window.localStorage.setItem("pwa_install_banner_seen_v1", "e2e");
  }, userName);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.evaluate((nextName) => {
        window.localStorage.setItem("kemana.userName", nextName);
        window.localStorage.setItem("pwa_install_banner_seen_v1", "e2e");
      }, userName);
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isExecutionContextRace =
        message.includes("Execution context was destroyed") ||
        message.includes("Target page, context or browser has been closed");
      const isNoOriginYet =
        message.includes("Failed to read the 'localStorage' property from 'Window'") ||
        message.includes("Access is denied for this document");

      if (isNoOriginYet) {
        return;
      }

      if (!isExecutionContextRace || attempt === 2) {
        throw error;
      }

      await gotoHomeStable(page);
      await page.waitForTimeout(120);
    }
  }
}

export async function gotoHomeStable(page: Page) {
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

export async function waitForHomeReady(page: Page) {
  await expect(page.getByRole("heading", { name: "KeMana" })).toBeVisible();
  await expect(page.locator("main input[type='text']").first()).toBeVisible();
}

export async function quickAdd(page: Page, input: string) {
  const quickInput = page.locator("main input[type='text']").first();
  await quickInput.fill(input);
  await quickInput.press("Enter");
}

export async function openNotesTab(page: Page) {
  const notesTabButton = page.locator("nav").last().getByRole("button", { name: "Catatan", exact: true });
  const notesIndicator = page.getByRole("button", { name: "Catat banyak" });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await notesTabButton.click();

    const isVisible = await notesIndicator.isVisible().catch(() => false);
    if (isVisible) {
      return;
    }

    await page.waitForTimeout(180);
  }

  await expect(notesIndicator).toBeVisible();
}

export async function ensureUiUnblocked(page: Page, fallbackName = "Tester") {
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
