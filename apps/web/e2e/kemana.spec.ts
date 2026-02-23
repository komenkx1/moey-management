import { expect, test, type Locator, type Page } from "@playwright/test";

function getTodayKey() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function clearLocalData(page: Page) {
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

async function seedUserName(page: Page, userName = "Komang") {
  await page.evaluate((nextName) => {
    window.localStorage.setItem("kemana.userName", nextName);
    window.localStorage.setItem("pwa_install_banner_seen_v1", "e2e");
  }, userName);
}

async function gotoHomeStable(page: Page) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto("/", { waitUntil: "domcontentloaded" });
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isNavigationRace = message.includes("interrupted by another navigation");
      const isAlreadyOnHome = /^https?:\/\/localhost:3000\/?$/.test(page.url());

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

async function waitForHomeReady(page: Page) {
  await expect(page.getByRole("heading", { name: "KeMana" })).toBeVisible();
  await expect(page.locator("main input[type='text']").first()).toBeVisible();
}

async function quickAdd(page: Page, input: string) {
  const quickInput = page.locator("main input[type='text']").first();
  await quickInput.fill(input);
  await quickInput.press("Enter");
}

async function openNotesTab(page: Page) {
  await page.locator("nav").last().getByRole("button", { name: "Catatan", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Catatan" })).toBeVisible();
}

async function expandEntryByText(page: Page, title: string): Promise<Locator> {
  const entry = page.locator("[data-entry-id]").filter({ hasText: title }).first();
  await expect(entry).toBeVisible();
  await entry.locator("button").first().click();
  await expect(page.locator("label").filter({ hasText: "Jumlah" }).first()).toBeVisible();
  return entry;
}

async function dragBottomSheetDownToClose(page: Page) {
  const handle = page.locator("div[aria-hidden='false'] .cursor-grab.touch-none:visible").last();
  await expect(handle).toBeVisible();
  const box = await handle.boundingBox();
  if (!box) {
    throw new Error("Drag handle sheet tidak ditemukan.");
  }

  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  const endY = startY + 260;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX, endY, { steps: 18 });
  await page.mouse.up();
  await page.waitForTimeout(120);

  let isStillOpen = false;
  try {
    isStillOpen = await handle.isVisible();
  } catch {
    isStillOpen = false;
  }

  if (!isStillOpen) {
    return;
  }

  const gesture = {
    pointerId: 1,
    pointerType: "touch",
    clientX: startX,
    clientY: startY,
    button: 0,
    bubbles: true,
    cancelable: true
  };

  await handle.dispatchEvent("pointerdown", gesture);
  for (let step = 1; step <= 12; step += 1) {
    const nextY = startY + ((endY - startY) * step) / 12;
    await handle.dispatchEvent("pointermove", { ...gesture, clientY: nextY });
  }
  await handle.dispatchEvent("pointerup", { ...gesture, clientY: endY });
  await page.waitForTimeout(160);
}

function buildCsvImport(totalRows: number): string {
  const todayKey = getTodayKey();
  const rows = ["id,tanggal,kategori,metode_bayar,nominal,catatan,split_mode,split_rincian,raw_input"];
  for (let index = 1; index <= totalRows; index += 1) {
    rows.push(
      `imp-many-${index},${todayKey},Makan,Cash,1000,item ${index},,,item ${index} 1k`
    );
  }
  return rows.join("\n");
}

test.describe("KeMana UI flow (new UI selectors)", () => {
  test.beforeEach(async ({ page }) => {
    await gotoHomeStable(page);
    await clearLocalData(page);
    await seedUserName(page);
    await gotoHomeStable(page);
    await waitForHomeReady(page);
  });

  test("Quick add tersimpan dan muncul di tab Catatan", async ({ page }) => {
    await expect(page.getByRole("banner").getByText(/^Halo,\s+\S+/)).toBeVisible();

    await quickAdd(page, "kopi 15k");
    await openNotesTab(page);
    const entry = page.locator("[data-entry-id]").first();
    await expect(entry).toContainText("kopi");
    await expect(entry).toContainText("15.000");
  });

  test("Tema light/dark tetap tersimpan setelah reload", async ({ page }) => {
    const beforeToggle = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    await page.getByRole("button", { name: "Action" }).first().click();

    await expect
      .poll(async () => page.evaluate(() => document.documentElement.classList.contains("dark")))
      .not.toBe(beforeToggle);

    const afterToggle = await page.evaluate(() => ({
      isDark: document.documentElement.classList.contains("dark"),
      storedMode: window.localStorage.getItem("kemana.themeMode")
    }));
    const expectedMode = afterToggle.isDark ? "dark" : "light";

    expect(afterToggle.storedMode).toBe(expectedMode);

    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForHomeReady(page);

    const afterReload = await page.evaluate(() => ({
      isDark: document.documentElement.classList.contains("dark"),
      storedMode: window.localStorage.getItem("kemana.themeMode")
    }));

    expect(afterReload.storedMode).toBe(expectedMode);
    expect(afterReload.isDark).toBe(afterToggle.isDark);
  });

  test("Quick add di Beranda auto-expand item terbaru untuk inline edit cepat", async ({ page }) => {
    await quickAdd(page, "makan 19k");

    const homeEntry = page.locator("[data-home-entry-id]").first();
    await expect(homeEntry).toContainText("makan");
    await expect(homeEntry.getByRole("button", { name: "Simpan", exact: true })).toBeVisible();

    await homeEntry.getByPlaceholder("Tambah detail...").fill("langsung edit dari beranda");
    await homeEntry.getByRole("button", { name: "Simpan", exact: true }).click();

    await expect(homeEntry).toContainText("langsung edit dari beranda");
  });

  test("Format cepat muncul saat mengetik dan bisa dipakai opsional", async ({ page }) => {
    const quickInput = page.locator("main input[type='text']").first();
    await quickInput.fill("mcd");

    await expect(page.getByText("Format cepat", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Qty x nominal: mcd 3x 15k" }).click();
    await expect(quickInput).toHaveValue("mcd 3x 15k");

    await quickInput.press("Enter");
    await openNotesTab(page);
    await expect(page.locator("[data-entry-id]").first()).toContainText("mcd");
  });

  test("Bulk input 3 baris valid tersimpan", async ({ page }) => {
    await page.getByRole("button", { name: "Banyak" }).click();
    await expect(page.getByText("Catat banyak sekaligus")).toBeVisible();

    await page.locator("textarea").fill("kopi 18\nparkir 4k\nmakan siang 25k");
    await page.getByRole("button", { name: "Simpan 3 catatan" }).click();

    await openNotesTab(page);
    await expect(page.locator("[data-entry-id]")).toHaveCount(3);
  });

  test("Inline edit transaksi: ubah nama item + nominal + catatan", async ({ page }) => {
    await quickAdd(page, "makan 20k");
    await openNotesTab(page);
    const entry = await expandEntryByText(page, "makan");

    await entry.getByPlaceholder("Misal: Makan siang").fill("makan siang kantor");
    await entry.locator("input[type='number']").first().fill("25000");
    await entry.getByPlaceholder("Tambah detail...").fill("siang kantor");
    await entry.getByRole("button", { name: "Simpan", exact: true }).click();

    await expect(entry).toContainText("makan siang kantor");
    await expect(entry).toContainText("25.000");
    await expect(entry).toContainText("siang kantor");
  });

  test("Inline edit format cepat: parser bisa diterapkan ulang untuk qty/split", async ({ page }) => {
    await quickAdd(page, "mcd 2x 10k");
    await openNotesTab(page);
    const entry = await expandEntryByText(page, "mcd");

    await entry.getByTestId("inline-quick-format-input").fill("mcd 3x 15k 3p");
    await expect(entry.getByText("Rp45.000")).toBeVisible();
    await page.waitForTimeout(500); // Wait for React state to fully commit
    await entry.getByTestId("inline-quick-format-apply").click();
    await expect(entry.locator("input[type='number']").first()).toHaveValue("45000");

    await entry.getByRole("button", { name: "Simpan", exact: true }).click();
    // Nominal list menampilkan porsi pengguna saat split aktif.
    await expect(entry).toContainText("15.000");
    await expect(entry).toContainText("Split 3");
  });

  test("Split transaksi bisa disimpan dari inline edit", async ({ page }) => {
    await quickAdd(page, "dinner 90k");
    await openNotesTab(page);
    const entry = await expandEntryByText(page, "dinner");

    await entry.getByRole("button", { name: "Bagi rata" }).first().click();
    await entry.getByPlaceholder("Kamu, Budi, Cici").fill("Kamu, Budi, Cici");
    await entry.getByRole("button", { name: "Simpan", exact: true }).click();

    await expect(entry).toContainText("Split 3");
  });

  test("Data tools export JSON memicu download", async ({ page }) => {
    await quickAdd(page, "test export 10k");
    await openNotesTab(page);
    await page.getByRole("button", { name: "Data & tools" }).first().click();
    await expect(page.getByRole("heading", { name: "Data & tools" })).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "JSON" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain("kemana-backup");
    expect(download.suggestedFilename()).toContain(".json");
  });

  test("Data tools export CSV memicu download", async ({ page }) => {
    await quickAdd(page, "test export csv 12k");
    await openNotesTab(page);
    await page.getByRole("button", { name: "Data & tools" }).first().click();
    await expect(page.getByRole("heading", { name: "Data & tools" })).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page
      .locator("section")
      .filter({ hasText: "Export" })
      .getByRole("button", { name: "CSV", exact: true })
      .click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain("kemana-export");
    expect(download.suggestedFilename()).toContain(".csv");
  });

  test("Data tools import JSON backup menambahkan catatan", async ({ page }) => {
    await openNotesTab(page);
    await page.getByRole("button", { name: "Data & tools" }).first().click();
    await expect(page.getByRole("heading", { name: "Data & tools" })).toBeVisible();

    const todayKey = getTodayKey();
    const backupJson = JSON.stringify({
      entries: [
        {
          id: "imp-json-1",
          text: "backup json",
          amount: 27000,
          rawInput: "backup json 27k",
          date: todayKey,
          category: "Makan",
          source: "quick_add",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ],
      rules: [],
      meta: {
        exportedAt: new Date().toISOString(),
        appVersion: "1.0.8",
        storageVersion: "1"
      }
    });

    await page.locator("input[type='file']").setInputFiles({
      name: "kemana-backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(backupJson)
    });

    await expect(page.locator("section").filter({ hasText: "Import" }).getByText(/Import selesai/).first()).toBeVisible();
    await expect(page.locator("[data-entry-id]").first()).toContainText("backup json");
    await expect(page.locator("[data-entry-id]").first()).toContainText("27.000");
  });

  test("Data tools import CSV export menambahkan catatan", async ({ page }) => {
    await openNotesTab(page);
    await page.getByRole("button", { name: "Data & tools" }).first().click();
    await expect(page.getByRole("heading", { name: "Data & tools" })).toBeVisible();

    const todayKey = getTodayKey();
    const csv = [
      "id,tanggal,kategori,metode_bayar,nominal,catatan,split_mode,split_rincian,raw_input",
      `imp-csv-1,${todayKey},Makan,Cash,45000,backup csv,,,backup csv 45k`
    ].join("\n");

    await page.locator("input[type='file']").setInputFiles({
      name: "kemana-export.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csv)
    });

    await expect(page.locator("section").filter({ hasText: "Import" }).getByText(/Import CSV selesai/).first()).toBeVisible();
    await expect(page.locator("[data-entry-id]").first()).toContainText("backup csv");
    await expect(page.locator("[data-entry-id]").first()).toContainText("45.000");
  });

  test("Catatan 1000+ item mengaktifkan virtualisasi list secara otomatis", async ({ page }) => {
    await openNotesTab(page);
    await page.getByRole("button", { name: "Data & tools" }).first().click();
    await expect(page.getByRole("heading", { name: "Data & tools" })).toBeVisible();

    const csv = buildCsvImport(1001);
    await page.locator("input[type='file']").setInputFiles({
      name: "kemana-export-many.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csv)
    });

    await expect(page.locator("section").filter({ hasText: "Import" }).getByText(/Import CSV selesai/).first()).toBeVisible();
    await page.locator("button[aria-label='Tutup data dan tools']:visible").click();

    await expect(page.getByText("Menampilkan 220 dari 1001 catatan")).toBeVisible();
    await expect(page.getByText("Memuat catatan lainnya...")).toBeVisible();
    await expect(page.locator("[data-entry-id]")).toHaveCount(220);
  });

  test("Insight page menampilkan faktor penyebab dan CTA lanjutan", async ({ page }) => {
    await quickAdd(page, "makan 35k");
    await quickAdd(page, "bensin 50k");
    await quickAdd(page, "kopi 18k");

    await page.locator("nav").last().getByRole("button", { name: "Insight", exact: true }).click();

    await expect(page.getByRole("heading", { name: "Insight" })).toBeVisible();
    const thirtyDayFilter = page.getByRole("button", { name: "30 hari", exact: true });
    await thirtyDayFilter.click();
    await expect(thirtyDayFilter).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("30 hari terakhir").first()).toBeVisible();

    const customFilter = page.locator("button[aria-label='Filter rentang tanggal custom']").first();
    await customFilter.click();
    await expect(customFilter).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("main input[type='date']")).toHaveCount(2);

    await expect(page.getByRole("heading", { name: "Kenapa segitu?" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Dari mana paling banyak keluar" })).toBeVisible();

    await expect(page.getByRole("heading", { name: /^Ritme/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("heading", { name: /Transaksi terbesar/i })).toBeVisible();

    await page.getByRole("button", { name: "Lihat detail catatan" }).click();
    await expect(page.getByRole("heading", { name: "Catatan" })).toBeVisible();
  });

  test("Bottom sheet close flow stabil (Add/Bulk/Data tools)", async ({ page }) => {
    await openNotesTab(page);
    await page.getByRole("button", { name: "Catat pengeluaran" }).click();
    await expect(page.getByRole("heading", { name: "Catat pengeluaran" })).toBeVisible();
    await page.locator("button[aria-label='Tutup lembar catatan']:visible").click();

    await page.locator("nav").last().getByRole("button", { name: "Beranda", exact: true }).click();
    await page.getByRole("button", { name: "Banyak" }).click();
    await expect(page.getByText("Catat banyak sekaligus")).toBeVisible();
    await page.locator("button[aria-label='Tutup input massal']:visible").click();

    await openNotesTab(page);
    await page.getByRole("button", { name: "Data & tools" }).first().click();
    await expect(page.getByRole("heading", { name: "Data & tools" })).toBeVisible();
    await page.locator("button[aria-label='Tutup data dan tools']:visible").click();
  });

  test("Bottom sheet bisa ditutup dengan drag pelan di beberapa halaman", async ({ page }) => {
    await openNotesTab(page);
    await page.getByRole("button", { name: "Catat pengeluaran" }).click();
    await expect(page.getByRole("heading", { name: "Catat pengeluaran" })).toBeVisible();
    await dragBottomSheetDownToClose(page);
    await expect(page.getByRole("heading", { name: "Catat pengeluaran" })).not.toBeVisible();

    await page.locator("nav").last().getByRole("button", { name: "Beranda", exact: true }).click();
    await page.getByRole("button", { name: "Banyak" }).click();
    await expect(page.getByText("Catat banyak sekaligus")).toBeVisible();
    await dragBottomSheetDownToClose(page);
    await expect(page.getByText("Catat banyak sekaligus")).not.toBeVisible();

    await openNotesTab(page);
    await page.getByRole("button", { name: "Data & tools" }).first().click();
    await expect(page.getByRole("heading", { name: "Data & tools" })).toBeVisible();
    await dragBottomSheetDownToClose(page);
    await expect(page.getByRole("heading", { name: "Data & tools" })).not.toBeVisible();
  });

  test("Offline mode: quick add dan list tetap berjalan tanpa jaringan", async ({ page }) => {
    await page.context().setOffline(true);
    await expect(page.getByText("Offline")).toBeVisible();

    await quickAdd(page, "offline test 11k");
    await openNotesTab(page);
    const firstEntry = page.locator("[data-entry-id]").first();
    await expect(firstEntry).toContainText("offline test");
    await expect(firstEntry).toContainText("11.000");

    await page.context().setOffline(false);
  });

  test("Catat pengeluaran: qty menghitung total nominal", async ({ page }) => {
    await openNotesTab(page);
    await page.getByRole("button", { name: "Catat pengeluaran" }).click();
    await expect(page.getByRole("heading", { name: "Catat pengeluaran" })).toBeVisible();

    await page.locator("input[inputmode='numeric']").first().fill("15000");
    await page.locator("input[aria-label='Jumlah item']").fill("3");
    await page.getByRole("button", { name: "Makan" }).click();
    await page.getByRole("button", { name: "Simpan catatan" }).click();

    const firstEntry = page.locator("[data-entry-id]").first();
    await expect(firstEntry).toContainText("45.000");
  });
});
