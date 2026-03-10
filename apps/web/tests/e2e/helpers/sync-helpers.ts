import type { Page, BrowserContext } from "@playwright/test";

/**
 * Mock Supabase REST API for sync operations
 */
export async function mockSupabaseSync(page: Page, options: {
  shouldFail?: boolean;
  delay?: number;
} = {}) {
  const { shouldFail = false, delay = 0 } = options;
  const remoteEntries: any[] = [];
  const remoteRules: any[] = [];

  // Mock entries endpoint (GET - fetch)
  await page.route('**/rest/v1/entries**', async (route) => {
    if (route.request().method() === 'GET') {
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      if (shouldFail) {
        await route.abort('failed');
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(remoteEntries)
      });
    } else if (route.request().method() === 'POST') {
      // Mock create entry
      if (shouldFail) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        });
        return;
      }

      const body = route.request().postDataJSON();
      const items = Array.isArray(body) ? body : [body];
      const createdItems = items.map((item, index) => ({
        ...item,
        id: item.id || `mock-entry-${remoteEntries.length + index + 1}`
      }));
      remoteEntries.push(...createdItems);

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(createdItems)
      });
    } else {
      await route.continue();
    }
  });

  // Mock rules endpoint
  await page.route('**/rest/v1/rules**', async (route) => {
    if (shouldFail) {
      await route.abort('failed');
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(remoteRules)
    });
  });
}

/**
 * Wait for sync status to change
 */
export async function waitForSyncStatus(
  page: Page,
  expectedStatus: 'syncing' | 'synced' | 'failed' | 'offline',
  timeout = 10000
) {
  await page.waitForFunction(
    (status) => {
      // Check for sync status indicator in UI
      const syncIndicator = document.querySelector('[data-sync-status]');
      return syncIndicator?.getAttribute('data-sync-status') === status;
    },
    expectedStatus,
    { timeout }
  );
}

/**
 * Get current sync status from UI
 */
export async function getSyncStatus(page: Page): Promise<string | null> {
  return await page.evaluate(() => {
    const syncIndicator = document.querySelector('[data-sync-status]');
    return syncIndicator?.getAttribute('data-sync-status') || null;
  });
}

/**
 * Get pending sync count
 */
export async function getPendingSyncCount(page: Page): Promise<number> {
  return await page.evaluate(() => {
    const pendingText = document.querySelector('[data-pending-sync]')?.textContent;
    if (!pendingText) return 0;
    const match = pendingText.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  });
}

/**
 * Simulate network going offline
 */
export async function goOffline(context: BrowserContext) {
  await context.setOffline(true);
}

/**
 * Simulate network coming back online
 */
export async function goOnline(context: BrowserContext) {
  await context.setOffline(false);
}

/**
 * Simulate slow network
 */
export async function simulateSlowNetwork(page: Page, delayMs = 3000) {
  await page.route('**/rest/v1/**', async (route) => {
    await new Promise(resolve => setTimeout(resolve, delayMs));
    await route.continue();
  });
}

/**
 * Simulate network timeout
 */
export async function simulateNetworkTimeout(page: Page) {
  await page.route('**/rest/v1/**', async (route) => {
    // Never resolve - simulates timeout
    await new Promise(() => {});
  });
}

/**
 * Mock sync worker retry behavior
 */
export async function mockSyncRetry(page: Page, failCount = 2) {
  let requestCount = 0;

  await page.route('**/rest/v1/entries**', async (route) => {
    if (route.request().method() === 'POST') {
      requestCount++;
      
      if (requestCount <= failCount) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Temporary failure' })
        });
      } else {
        const body = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify([{ ...body, id: body.id || 'mock-id' }])
        });
      }
    } else {
      await route.continue();
    }
  });
}

/**
 * Check if IndexedDB has pending sync items
 */
export async function hasPendingSyncItems(page: Page): Promise<boolean> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await page.evaluate(async () => {
        return new Promise((resolve) => {
          const timeoutId = window.setTimeout(() => resolve(false), 2000);
          const request = indexedDB.open('kemana');
          
          request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction(['syncQueue'], 'readonly');
            const store = transaction.objectStore('syncQueue');
            const countRequest = store.count();
            
            countRequest.onsuccess = () => {
              window.clearTimeout(timeoutId);
              resolve(countRequest.result > 0);
            };
            
            countRequest.onerror = () => {
              window.clearTimeout(timeoutId);
              resolve(false);
            };
          };
          
          request.onerror = () => {
            window.clearTimeout(timeoutId);
            resolve(false);
          };
        });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isContextRace = message.includes("Execution context was destroyed");
      if (!isContextRace || attempt === 2) {
        throw error;
      }
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(150);
    }
  }

  return false;
}

/**
 * Get sync queue items from IndexedDB
 */
export async function getSyncQueueItems(page: Page): Promise<any[]> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await page.evaluate(async () => {
        return new Promise((resolve) => {
          const timeoutId = window.setTimeout(() => resolve([]), 2000);
          const request = indexedDB.open('kemana');
          
          request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction(['syncQueue'], 'readonly');
            const store = transaction.objectStore('syncQueue');
            const getAllRequest = store.getAll();
            
            getAllRequest.onsuccess = () => {
              window.clearTimeout(timeoutId);
              resolve(getAllRequest.result);
            };
            
            getAllRequest.onerror = () => {
              window.clearTimeout(timeoutId);
              resolve([]);
            };
          };
          
          request.onerror = () => {
            window.clearTimeout(timeoutId);
            resolve([]);
          };
        });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isContextRace = message.includes("Execution context was destroyed");
      if (!isContextRace || attempt === 2) {
        throw error;
      }
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(150);
    }
  }

  return [];
}
