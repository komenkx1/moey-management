import type { Page } from "@playwright/test";

/**
 * Simulate storage quota exceeded error
 */
export async function simulateQuotaExceeded(page: Page) {
  await page.addInitScript(() => {
    // Override IndexedDB put to throw quota error
    const originalOpen = indexedDB.open;
    indexedDB.open = function(...args: any[]) {
      const request = originalOpen.apply(this, args as [string, number?]);
      
      request.onsuccess = function() {
        const db = request.result;
        const originalTransaction = db.transaction.bind(db);
        
        db.transaction = function(storeNames: any, mode?: any) {
          const tx = originalTransaction(storeNames, mode);
          const stores: any = {};
          
          for (const storeName of tx.objectStoreNames) {
            const store = tx.objectStore(storeName);
            const originalPut = store.put.bind(store);
            
            store.put = function(value: any, key?: any) {
              const putRequest = originalPut(value, key);
              
              // Simulate quota error on next tick
              setTimeout(() => {
                const error = new DOMException(
                  'QuotaExceededError',
                  'QuotaExceededError'
                );
                if (putRequest.onerror) {
                  putRequest.onerror({ target: { error } } as any);
                }
              }, 0);
              
              return putRequest;
            };
            
            stores[storeName] = store;
          }
          
          return tx;
        };
      };
      
      return request;
    };
  });
}

/**
 * Simulate corrupted IndexedDB
 */
export async function simulateCorruptedDB(page: Page) {
  await page.addInitScript(() => {
    const dbName = "kemana";
    indexedDB.deleteDatabase(dbName);

    const request = indexedDB.open(dbName, 999);
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("corrupted_store")) {
        db.createObjectStore("corrupted_store");
      }
    };
  });
}

/**
 * Simulate network error
 */
export async function simulateNetworkError(page: Page, errorType: 'timeout' | 'failed' | 'aborted' = 'failed') {
  await page.route('**/rest/v1/**', async (route) => {
    await route.abort(errorType);
  });
}

/**
 * Simulate 500 Internal Server Error
 */
export async function simulate500Error(page: Page) {
  await page.route('**/rest/v1/**', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: 'Something went wrong on the server'
      })
    });
  });
}

/**
 * Simulate 401 Unauthorized Error
 */
export async function simulate401Error(page: Page) {
  await page.route('**/rest/v1/**', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      })
    });
  });
}

/**
 * Simulate 429 Rate Limit Error
 */
export async function simulate429Error(page: Page) {
  await page.route('**/rest/v1/**', async (route) => {
    await route.fulfill({
      status: 429,
      contentType: 'application/json',
      headers: {
        'Retry-After': '60'
      },
      body: JSON.stringify({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded'
      })
    });
  });
}

/**
 * Check if error toast is visible
 */
export async function hasErrorToast(page: Page, errorText?: string): Promise<boolean> {
  const notificationRegion = page.getByRole("region", { name: /Notifications/i });
  const toast = errorText
    ? notificationRegion.locator("li").filter({ hasText: errorText }).first()
    : notificationRegion.locator("li").first();

  return await toast.isVisible().catch(() => false);
}

/**
 * Get error message from toast
 */
export async function getErrorMessage(page: Page): Promise<string | null> {
  const toast = page.getByRole("region", { name: /Notifications/i }).locator("li").first();
  const isVisible = await toast.isVisible().catch(() => false);
  
  if (!isVisible) return null;
  
  return await toast.textContent();
}

/**
 * Simulate JavaScript error
 */
export async function simulateJSError(page: Page, errorMessage = 'Test error') {
  await page.evaluate((msg) => {
    throw new Error(msg);
  }, errorMessage);
}

/**
 * Check if error boundary is shown
 */
export async function hasErrorBoundary(page: Page): Promise<boolean> {
  return await page.locator('[data-error-boundary]').isVisible().catch(() => false);
}

/**
 * Simulate memory pressure
 */
export async function simulateMemoryPressure(page: Page) {
  await page.evaluate(() => {
    // Allocate large arrays to simulate memory pressure
    const arrays: any[] = [];
    for (let i = 0; i < 100; i++) {
      arrays.push(new Array(1000000).fill(0));
    }
    // Keep reference to prevent GC
    (window as any).__memoryPressure = arrays;
  });
}

/**
 * Clear simulated memory pressure
 */
export async function clearMemoryPressure(page: Page) {
  await page.evaluate(() => {
    delete (window as any).__memoryPressure;
  });
}

/**
 * Simulate slow device (throttle CPU)
 */
export async function simulateSlowDevice(page: Page) {
  const client = await page.context().newCDPSession(page);
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
}

/**
 * Reset device throttling
 */
export async function resetDeviceThrottling(page: Page) {
  const client = await page.context().newCDPSession(page);
  await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
}
