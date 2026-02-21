import { test, expect, type Page } from "@playwright/test";

/**
 * Helper — wait for the app to fully hydrate.
 */
async function waitForApp(page: Page) {
    await page.waitForSelector("section.composer input.input", { timeout: 15000 });
}

/**
 * Helper — add entry via Quick Add.
 * NOTE: The app auto-expands the newly added entry.
 */
async function quickAdd(page: Page, text: string) {
    const input = page.locator("section.composer input.input");
    await input.fill(text);
    await input.press("Enter");
    // Wait for the entry to render
    await page.locator("article[data-entry-id]").first().waitFor({ timeout: 10000 });
}

/**
 * Helper — ensure entry is expanded. Accounts for auto-expand after quickAdd.
 */
async function ensureExpanded(page: Page) {
    // Wait for auto-expand to settle after quickAdd
    await page.waitForTimeout(300);
    const rowHit = page.locator("article[data-entry-id]").first().locator("button.row-hit");
    const isExpanded = await rowHit.getAttribute("aria-expanded");
    if (isExpanded !== "true") {
        await rowHit.click();
    }
    await page.locator(".row-expanded").waitFor({ state: "visible", timeout: 10000 });
}

/**
 * Helper — ensure entry is collapsed.
 */
async function ensureCollapsed(page: Page) {
    const rowHit = page.locator("article[data-entry-id]").first().locator("button.row-hit");
    const isExpanded = await rowHit.getAttribute("aria-expanded");
    if (isExpanded === "true") {
        await rowHit.click();
    }
    await expect(page.locator(".row-expanded")).not.toBeVisible();
}

test.describe("Kemana App E2E", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        // Clear IndexedDB + localStorage so every test starts fresh
        await page.evaluate(async () => {
            const dbs = await window.indexedDB.databases();
            for (const db of dbs) {
                if (db.name) window.indexedDB.deleteDatabase(db.name);
            }
            localStorage.clear();
        });
        await page.reload();
        await waitForApp(page);
    });

    // ─── Quick Add ───────────────────────────────────────────────

    test("Quick Add: ketik + Enter → entry muncul di list", async ({ page }) => {
        await quickAdd(page, "kopi 15k");

        const entry = page.locator("article[data-entry-id]").first();
        await expect(entry).toContainText("kopi");
        await expect(entry).toContainText("15.000");
    });

    test("Quick Add: preview muncul saat mengetik", async ({ page }) => {
        const input = page.locator("section.composer input.input");
        await input.fill("makan siang 35k");

        const preview = page.locator(".hint.preview-row");
        await expect(preview).toBeVisible({ timeout: 5000 });
        await expect(preview).toContainText("35.000");
    });

    test("Quick Add: error ditolak tanpa nominal", async ({ page }) => {
        const input = page.locator("section.composer input.input");
        await input.fill("cuma deskripsi doang");
        await input.press("Enter");

        await expect(page.locator(".error")).toBeVisible();
        await expect(page.locator("article[data-entry-id]")).toHaveCount(0);
    });

    // ─── Bulk Paste ──────────────────────────────────────────────

    test("Bulk Paste: 3 baris valid → 3 entries tersimpan", async ({ page }) => {
        await page.click("button:has-text('Masukan banyak item')");
        const textarea = page.locator("textarea.textarea");
        await textarea.waitFor({ state: "visible", timeout: 5000 });

        await textarea.fill("satu 10k\ndua 20k\ntiga 30k");
        await expect(page.locator(".bulk-panel")).toContainText("Valid: 3/3");

        await page.click("button:has-text('Simpan Semua')");
        await page.waitForTimeout(500);

        await expect(page.locator("article[data-entry-id]")).toHaveCount(3);
    });

    test("Bulk Paste: mixed valid/invalid → hanya valid tersimpan", async ({ page }) => {
        await page.click("button:has-text('Masukan banyak item')");
        const textarea = page.locator("textarea.textarea");
        await textarea.waitFor({ state: "visible", timeout: 5000 });

        await textarea.fill("valid 10k\ninvalid tanpa angka\nvalid2 20k");
        await expect(page.locator(".bulk-panel")).toContainText("Valid: 2/3");

        await page.click("button:has-text('Simpan Semua')");
        await page.waitForTimeout(500);

        await expect(page.locator("article[data-entry-id]")).toHaveCount(2);
    });

    // ─── Entry Expand / Collapse ─────────────────────────────────

    test("Entry expand/collapse toggle", async ({ page }) => {
        await quickAdd(page, "gojek 14k");

        // Entry is auto-expanded after quickAdd
        await expect(page.locator(".row-expanded")).toBeVisible();
        await expect(page.locator("button:has-text('Hapus')")).toBeVisible();

        // Collapse
        await ensureCollapsed(page);
        await expect(page.locator(".row-expanded")).not.toBeVisible();

        // Re-expand
        await ensureExpanded(page);
        await expect(page.locator(".row-expanded")).toBeVisible();
    });

    // ─── Category Edit ───────────────────────────────────────────

    test("Category edit: pilih chip lain → tersimpan", async ({ page }) => {
        await quickAdd(page, "random item 10k");

        // Entry is auto-expanded
        await ensureExpanded(page);

        // Click "Transport" category chip
        await page.locator(".chip-group .chip:has-text('Transport')").first().click();

        await expect(
            page.locator(".chip-group .chip.active:has-text('Transport')").first()
        ).toBeVisible();
    });

    // ─── Delete + Undo ───────────────────────────────────────────

    test("Delete entry + Undo toast → entry kembali", async ({ page }) => {
        await quickAdd(page, "hapus ini 5k");
        await expect(page.locator("article[data-entry-id]")).toHaveCount(1);

        // Entry is auto-expanded, click delete
        await ensureExpanded(page);
        await page.locator("button.danger:has-text('Hapus')").click();

        // Undo toast
        await expect(page.locator(".undo-toast")).toBeVisible({ timeout: 10000 });
        await expect(page.locator(".undo-toast")).toContainText("Dihapus");

        // Click Undo
        await page.locator(".undo-toast .undo-link").click();
        await page.waitForTimeout(300);

        // Entry should reappear
        await expect(page.locator("article[data-entry-id]")).toHaveCount(1);
    });

    // ─── Filter Range ────────────────────────────────────────────

    test("Filter range: switch antar filter chip", async ({ page }) => {
        await quickAdd(page, "test filter 25k");

        const filterSection = page.locator("section.range-filter");
        await expect(filterSection).toBeVisible();
        await expect(filterSection.locator(".chip.active")).toContainText("Hari ini");

        // Switch to "Semua"
        await filterSection.locator(".chip:has-text('Semua')").click();
        await expect(filterSection.locator(".chip.active")).toContainText("Semua");
        await expect(page.locator("article[data-entry-id]")).toHaveCount(1);
    });

    // ─── Split Equal ─────────────────────────────────────────────

    test("Split equal: 3 orang → nominal terbagi", async ({ page }) => {
        await quickAdd(page, "makan bareng 90k");

        // Entry is auto-expanded
        await ensureExpanded(page);

        await page.click("button:has-text('Buat Split')");
        await expect(page.locator(".split-box")).toBeVisible();

        await page.locator(".split-box input.input").first().fill("Kamu, Budi, Ani");
        await page.click("button:has-text('Terapkan Equal')");

        await expect(page.locator(".summary")).toBeVisible();
        await expect(page.locator(".summary")).toContainText("Pembagian");
    });

    // ─── Split Custom ────────────────────────────────────────────

    test("Split custom: isi manual + apply", async ({ page }) => {
        await quickAdd(page, "dinner 100k");

        // Entry is auto-expanded
        await ensureExpanded(page);

        await page.click("button:has-text('Buat Split')");
        await page.locator(".split-box input.input").first().fill("Kamu, Budi");

        await page.click("button:has-text('Custom')");
        const customInputs = page.locator(".split-box .inline-grid input.input");
        await customInputs.nth(0).fill("50000");
        await customInputs.nth(1).fill("50000");

        await page.click("button:has-text('Terapkan Custom')");
        await expect(page.locator(".split-status")).toContainText("Sudah pas");
    });

    // ─── Export Backup ───────────────────────────────────────────

    test("Export backup → triggers download", async ({ page }) => {
        await quickAdd(page, "data export 10k");

        const downloadPromise = page.waitForEvent("download");
        await page.click("button:has-text('Export Backup')");
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toContain("kemana");
        expect(download.suggestedFilename()).toContain(".json");
    });

    // ─── Data Persistence ────────────────────────────────────────

    test("Data persists across page reload (IndexedDB)", async ({ page }) => {
        await quickAdd(page, "persist test 99k");
        await expect(page.locator("article[data-entry-id]")).toHaveCount(1);

        // Reload WITHOUT clearing IndexedDB (skip beforeEach logic)
        await page.reload();
        await waitForApp(page);

        // Switch to "Semua" filter to make sure all entries are visible
        await page.locator("section.range-filter .chip:has-text('Semua')").click();

        await expect(page.locator("article[data-entry-id]")).toHaveCount(1, { timeout: 10000 });
        await expect(page.locator("article[data-entry-id]").first()).toContainText("persist test");
    });

    // ─── Summary Stats ──────────────────────────────────────────

    test("Summary card shows total dan jumlah transaksi", async ({ page }) => {
        await quickAdd(page, "item satu 30k");
        await quickAdd(page, "item dua 20k");

        const summaryCard = page.locator("section.daily-summary-card");
        await expect(summaryCard).toBeVisible();
        await expect(summaryCard).toContainText("50.000");
        await expect(summaryCard).toContainText("2 transaksi");
    });
    // ─── Inline Edit ─────────────────────────────────────────────

    test("Inline edit: ubah judul dan nominal dari panel expanded", async ({ page }) => {
        await quickAdd(page, "makan 20k");
        await ensureExpanded(page);

        // Edit Title
        const titleInput = page.locator(".row-expanded input.input").first();
        await titleInput.fill("makan siang");

        // Edit Amount
        const amountInput = page.locator(".row-expanded input.input").nth(1);
        await amountInput.fill("25000");

        // Save
        await page.click("button:has-text('Simpan')");

        // Wait for update (it might collapse or stay expanded depending on state, let's just check the text)
        await ensureCollapsed(page);
        const entry = page.locator("article[data-entry-id]").first();
        await expect(entry).toContainText("makan siang");
        await expect(entry).toContainText("25.000");
    });

    // ─── Assumed Thousands Warning ──────────────────────────────

    test("Warning: angka ambigu (15) memunculkan warning Asumsi Ribuan", async ({ page }) => {
        await quickAdd(page, "gaji 15");

        // Should show !1 warning on collapsed row
        await ensureCollapsed(page);
        const entry = page.locator("article[data-entry-id]").first();
        await expect(entry.locator(".row-meta")).toContainText("!1");

        // Expand to see details and warning chip
        await ensureExpanded(page);

        // Warning should be present
        const warningItem = page.locator("li:has-text('Nominal diasumsikan ribuan')");
        await expect(warningItem).toBeVisible();

        // Resolve it: click Edit, fill explicit value, save
        await warningItem.locator("button:has-text('Edit nominal')").click();
        const amountInput = page.locator(".row-expanded input.input").nth(1);
        await amountInput.fill("15000");
        await page.locator("button:has-text('Simpan')").click();

        // Warning should be resolved
        await ensureCollapsed(page);
        await expect(entry.locator(".row-meta")).not.toContainText("!1");
    });

    // ─── Night Close ─────────────────────────────────────────────

    test("Night Close: buat laporan tutup hari", async ({ page }) => {
        await quickAdd(page, "kopi 15k");

        // Click the Review button in the night close bar
        await page.locator("button:has-text('Review')").click();

        // The panel should open
        await expect(page.locator(".night-close-panel-title")).toBeVisible();

        // Click close day
        await page.locator("button:has-text('Selesai (tandai beres)')").click();

        // Wait for it to close (the panel should disappear)
        await expect(page.locator(".night-close-panel-title")).not.toBeVisible();
    });

    // ─── Smart Recall ────────────────────────────────────────────

    test("Smart Recall: muncul prompt karena ada gap waktu (5 jam)", async ({ page }) => {
        // Prepare a backup with an entry created 5 hours ago (> 3h gap triggers prompt)
        const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);
        const todayDate = new Date().toISOString().split("T")[0];
        const mockBackup = {
            entries: [
                { id: "test-recall-1", text: "kopi pagi", amount: 15000, date: todayDate, category: "Makan", createdAt: fiveHoursAgo.toISOString(), updatedAt: fiveHoursAgo.toISOString() }
            ],
            rules: []
        };

        const buffer = Buffer.from(JSON.stringify(mockBackup));

        // Import the backup via file chooser
        const fileChooserPromise = page.waitForEvent("filechooser");
        await page.locator("button:has-text('Import Backup')").click();
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles({
            name: "kemana-backup.json",
            mimeType: "application/json",
            buffer: buffer
        });

        // Wait for import to settle
        await page.waitForTimeout(1000);

        // Reload to trigger recall based on the new IndexedDB state
        await page.reload();
        await waitForApp(page);

        // Prompt should be visible (gap > 3 hours → "Terakhir kamu catat jam ...")
        const recallPrompt = page.locator(".smart-recall");
        await expect(recallPrompt).toBeVisible({ timeout: 10000 });
        await expect(recallPrompt).toContainText("Terakhir kamu catat jam");

        // Click "Tambah yang barusan" to add an entry
        await recallPrompt.locator("button:has-text('Tambah yang barusan')").click();
        const input = page.locator("section.composer input.input");
        await input.fill("gaji 5jt");
        await input.press("Enter");

        // Prompt should disappear after submitting (new entry closes the gap)
        await page.waitForTimeout(500);
        await expect(page.locator(".smart-recall")).not.toBeVisible();
    });

    // ─── Import Backup ───────────────────────────────────────────

    test("Import Backup: parse JSON file dan kembalikan data", async ({ page }) => {
        // Create an empty state first
        await expect(page.locator("article[data-entry-id]")).toHaveCount(0);

        // Prepare dummy backup in the correct format: { entries: [...], rules: [...] }
        const todayDate = new Date().toISOString().split("T")[0];
        const now = new Date().toISOString();
        const mockBackup = {
            entries: [
                { id: "test-import-1", text: "import kopi", amount: 15000, date: todayDate, category: "Makan", createdAt: now, updatedAt: now },
                { id: "test-import-2", text: "import tiket", amount: 50000, date: todayDate, category: "Transport", createdAt: now, updatedAt: now }
            ],
            rules: []
        };

        // Create file buffer
        const buffer = Buffer.from(JSON.stringify(mockBackup));

        // Use Playwright's setInputFiles
        const fileChooserPromise = page.waitForEvent("filechooser");
        await page.locator("button:has-text('Import Backup')").click();
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles({
            name: "kemana-backup.json",
            mimeType: "application/json",
            buffer: buffer
        });

        // Check for success toast
        await expect(page.locator(".action-toast")).toContainText("Import backup berhasil", { timeout: 10000 });

        // Switch to "Semua" to ensure we see all dates
        await page.locator("section.range-filter .chip:has-text('Semua')").click();

        // Wait for list to reflect imports
        await expect(page.locator("article[data-entry-id]")).toHaveCount(2, { timeout: 10000 });
        await expect(page.locator("article[data-entry-id]").nth(0)).toContainText("import");
    });
});
