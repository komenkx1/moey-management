import { test, expect } from '@playwright/test';

test.describe('Smart Split Calculator Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to local dev, reset state just in case
    await page.goto('/');
    
    // Clear storage to start fresh (depends on app's storage mechanism, assuming localStorage or IDB)
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Reload to apply cleared state
    await page.reload();

    // Handle Onboarding screen
    const nameInput = page.getByPlaceholder('Panggilan kamu...');
    await nameInput.waitFor({ state: 'visible' });
    await nameInput.fill('Tester');
    await page.getByRole('button', { name: 'Lanjut pakai KeMana' }).click();

    // Verify main page loaded by checking for the add button
    await expect(page.locator('button[aria-label="Catat pengeluaran baru"]')).toBeVisible();
  });

  test('user can split bill using smart calculator', async ({ page }) => {
    // Open Add Transaction modal
    await page.locator('button[aria-label="Catat pengeluaran baru"]').click();

    // Verify modal is open
    await expect(page.locator('text=Catat pengeluaran')).toBeVisible();

    // Enter Amount
    const amountInput = page.locator('input[placeholder="0"]').first();
    await amountInput.fill('100000');

    // Select category (e.g., Makanan)
    await page.locator('button:has-text("Makanan")').click();

    // Enable Split Bill Options
    await page.locator('button[role="switch"]').click();

    // Enter split people
    const splitInput = page.locator('input[placeholder="Tempatkan koma sesudah nama..."]');
    await splitInput.fill('Teman1');
    await splitInput.press('Enter');

    // Switch to Custom Split (Manual)
    await page.locator('button:has-text("Atur Manual")').click();

    // Start Smart Split (Calculator button inside Manual)
    await page.locator('button:has-text("Kalkulator pintar berdasar item")').click();

    // Smart Split Calculator is now visible
    // Fill subtotal
    const subtotalInput = page.locator('text=Subtotal Menu').locator('..').locator('..').locator('input[placeholder="0"]');
    await subtotalInput.fill('90000');

    // Fill Item 1
    const item1Price = page.locator('input[placeholder="0"]').nth(1);
    await item1Price.fill('50000');
    // Assign Item 1 to Kamu
    const item1Select = page.locator('select').first();
    await item1Select.selectOption('Kamu');

    // Add Item 2
    await page.locator('button:has-text("Tambah Makanan")').click();
    const item2Price = page.locator('input[placeholder="0"]').nth(2);
    await item2Price.fill('40000');
    
    // Assign Item 2 to Teman1
    const item2Select = page.locator('select').nth(1);
    await item2Select.selectOption('Teman1');

    // Verify success banner appears
    await expect(page.locator('text=Semua item cocok!')).toBeVisible();

    // Save transaction
    await page.locator('button:has-text("Simpan")').click();

    // Verify we are back to dashboard and transaction has splitting metadata
    await expect(page.locator('text=Makanan').last()).toBeVisible();
    await expect(page.locator('text=100.000').last()).toBeVisible();
  });
});
