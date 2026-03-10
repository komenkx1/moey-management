# E2E Testing Improvements - KeMana

## Current Status: **7.5/10** ✅

### Existing Coverage (17 tests):
- ✅ Quick add flow
- ✅ Theme persistence
- ✅ Bulk input
- ✅ Inline editing
- ✅ Split transactions
- ✅ Import/Export (JSON & CSV)
- ✅ Virtualization (1000+ items)
- ✅ Insight page
- ✅ Bottom sheet interactions
- ✅ Offline mode
- ✅ Delete with undo
- ✅ Smart split calculator

**Strengths:**
- Good coverage of happy paths
- Stable test helpers (clearLocalData, seedUserName)
- Proper wait strategies
- Offline testing included

**Gaps:**
- Missing auth flow tests
- No sync worker tests
- Limited error scenario coverage
- No performance assertions
- Missing accessibility tests
- No visual regression tests

---

## 🎯 Priority 1: Critical User Flows (HIGH)

### 1. Authentication Flow Tests

```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
  test('should sign in with Google OAuth (mock)', async ({ page, context }) => {
    // Mock Google OAuth response
    await context.route('**/auth/v1/authorize**', async route => {
      await route.fulfill({
        status: 302,
        headers: {
          'Location': '/auth/callback?code=mock_auth_code'
        }
      });
    });

    await page.goto('/');
    
    // Click sign in button
    await page.getByRole('button', { name: /masuk/i }).click();
    
    // Verify redirect to auth callback
    await expect(page).toHaveURL(/\/auth\/callback/);
    
    // Verify user is logged in
    await expect(page.getByText(/halo/i)).toBeVisible();
  });

  test('should handle sign out and clear local data', async ({ page }) => {
    // Assume user is logged in (seed session)
    await seedAuthSession(page);
    
    // Add some data
    await quickAdd(page, 'test data 10k');
    
    // Sign out
    await page.getByRole('button', { name: 'Action' }).click();
    await page.getByRole('button', { name: /keluar/i }).click();
    
    // Confirm sign out
    await page.getByRole('button', { name: /ya.*keluar/i }).click();
    
    // Verify data is cleared
    const hasData = await page.evaluate(async () => {
      const dbs = await indexedDB.databases();
      return dbs.length > 0;
    });
    
    expect(hasData).toBe(false);
  });

  test('should prevent sign out when offline with pending sync', async ({ page, context }) => {
    await seedAuthSession(page);
    
    // Add data while online
    await quickAdd(page, 'pending sync 20k');
    
    // Go offline
    await context.setOffline(true);
    
    // Try to sign out
    await page.getByRole('button', { name: 'Action' }).click();
    await page.getByRole('button', { name: /keluar/i }).click();
    
    // Should show warning about pending data
    await expect(page.getByText(/data belum tersinkronisasi/i)).toBeVisible();
    
    // Cancel button should be available
    await expect(page.getByRole('button', { name: /batal/i })).toBeVisible();
  });
});

// Helper function
async function seedAuthSession(page: any) {
  await page.addInitScript(() => {
    const mockSession = {
      access_token: 'mock_token',
      user: {
        id: 'test-user-id',
        email: 'test@example.com'
      }
    };
    localStorage.setItem('supabase.auth.token', JSON.stringify(mockSession));
  });
}
```

### 2. Sync Worker Tests

```typescript
// tests/e2e/sync.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Sync Worker', () => {
  test('should sync data when going from offline to online', async ({ page, context }) => {
    await seedAuthSession(page);
    await page.goto('/');
    
    // Go offline
    await context.setOffline(true);
    await expect(page.getByText('Offline')).toBeVisible();
    
    // Add entry while offline
    await quickAdd(page, 'offline entry 15k');
    
    // Verify pending sync indicator
    await expect(page.getByText(/1.*pending/i)).toBeVisible();
    
    // Go back online
    await context.setOffline(false);
    
    // Wait for sync to complete
    await expect(page.getByText(/synced/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/pending/i)).not.toBeVisible();
  });

  test('should handle sync conflicts gracefully', async ({ page }) => {
    await seedAuthSession(page);
    
    // Simulate conflict by adding same entry ID from different devices
    await page.evaluate(() => {
      // Mock conflict scenario
      const conflictEntry = {
        id: 'conflict-id',
        text: 'device 1 version',
        amount: 10000,
        date: '2024-01-15'
      };
      // Add to local DB
      // ... implementation
    });
    
    // Trigger sync
    await page.getByRole('button', { name: /sync/i }).click();
    
    // Should resolve conflict (last-write-wins or show UI)
    await expect(page.getByText(/conflict.*resolved/i)).toBeVisible();
  });

  test('should retry failed sync operations', async ({ page, context }) => {
    await seedAuthSession(page);
    
    // Mock network failure
    let requestCount = 0;
    await context.route('**/rest/v1/entries**', async route => {
      requestCount++;
      if (requestCount < 3) {
        await route.abort('failed');
      } else {
        await route.continue();
      }
    });
    
    // Add entry
    await quickAdd(page, 'retry test 25k');
    
    // Should show retry indicator
    await expect(page.getByText(/retrying/i)).toBeVisible();
    
    // Eventually should succeed
    await expect(page.getByText(/synced/i)).toBeVisible({ timeout: 15000 });
  });
});
```

### 3. Error Scenario Tests

```typescript
// tests/e2e/errors.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Error Handling', () => {
  test('should handle storage quota exceeded', async ({ page }) => {
    // Mock quota exceeded error
    await page.addInitScript(() => {
      const originalPut = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function(...args) {
        throw new DOMException('QuotaExceededError', 'QuotaExceededError');
      };
    });
    
    await page.goto('/');
    
    // Try to add entry
    await quickAdd(page, 'quota test 10k');
    
    // Should show error message
    await expect(page.getByText(/storage.*penuh/i)).toBeVisible();
    
    // Should offer solution (clear old data)
    await expect(page.getByRole('button', { name: /bersihkan/i })).toBeVisible();
  });

  test('should handle network timeout gracefully', async ({ page, context }) => {
    await seedAuthSession(page);
    
    // Mock slow network
    await context.route('**/rest/v1/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 30000));
      await route.continue();
    });
    
    await page.goto('/');
    
    // Try to sync
    await page.getByRole('button', { name: /sync/i }).click();
    
    // Should show timeout message
    await expect(page.getByText(/timeout/i)).toBeVisible({ timeout: 35000 });
  });

  test('should recover from corrupted IndexedDB', async ({ page }) => {
    // Corrupt IndexedDB
    await page.evaluate(async () => {
      const db = await indexedDB.open('kemana-db');
      // Corrupt data structure
      // ... implementation
    });
    
    await page.goto('/');
    
    // Should detect corruption
    await expect(page.getByText(/data.*corrupt/i)).toBeVisible();
    
    // Should offer recovery
    await page.getByRole('button', { name: /perbaiki/i }).click();
    
    // Should reinitialize DB
    await expect(page.getByText(/diperbaiki/i)).toBeVisible();
  });
});
```

---

## 🎯 Priority 2: Performance & Accessibility (MEDIUM)

### 4. Performance Assertions

```typescript
// tests/e2e/performance.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Performance Benchmarks', () => {
  test('quick add should complete within 100ms', async ({ page }) => {
    await page.goto('/');
    
    const startTime = Date.now();
    await quickAdd(page, 'perf test 10k');
    const endTime = Date.now();
    
    const duration = endTime - startTime;
    expect(duration).toBeLessThan(100);
  });

  test('list rendering with 1000 items should be under 2s', async ({ page }) => {
    // Import 1000 items
    await importLargeDataset(page, 1000);
    
    const startTime = Date.now();
    await page.locator('nav').last().getByRole('button', { name: 'Catatan' }).click();
    await expect(page.locator('[data-entry-id]').first()).toBeVisible();
    const endTime = Date.now();
    
    const duration = endTime - startTime;
    expect(duration).toBeLessThan(2000);
  });

  test('should track Core Web Vitals', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    
    // Get Web Vitals
    const vitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const metrics: any = {};
        
        // LCP
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          metrics.lcp = entries[entries.length - 1].renderTime;
        }).observe({ entryTypes: ['largest-contentful-paint'] });
        
        // CLS
        new PerformanceObserver((list) => {
          metrics.cls = list.getEntries().reduce((sum, entry: any) => {
            return sum + entry.value;
          }, 0);
        }).observe({ entryTypes: ['layout-shift'] });
        
        setTimeout(() => resolve(metrics), 3000);
      });
    });
    
    expect(vitals.lcp).toBeLessThan(2500); // Good LCP < 2.5s
    expect(vitals.cls).toBeLessThan(0.1);  // Good CLS < 0.1
  });
});
```

### 5. Accessibility Tests

```typescript
// tests/e2e/accessibility.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  test('homepage should have no accessibility violations', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/');
    
    // Tab through interactive elements
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
    
    // Should be able to add entry with keyboard
    await page.keyboard.type('keyboard test 10k');
    await page.keyboard.press('Enter');
    
    // Verify entry was added
    await page.locator('nav').last().getByRole('button', { name: 'Catatan' }).click();
    await expect(page.getByText('keyboard test')).toBeVisible();
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/');
    
    // Check main navigation
    const nav = page.locator('nav').last();
    await expect(nav).toHaveAttribute('aria-label');
    
    // Check buttons have accessible names
    const buttons = await page.locator('button').all();
    for (const button of buttons) {
      const hasAccessibleName = await button.evaluate(el => {
        return el.getAttribute('aria-label') || el.textContent?.trim();
      });
      expect(hasAccessibleName).toBeTruthy();
    }
  });

  test('should support screen reader announcements', async ({ page }) => {
    await page.goto('/');
    
    // Add entry
    await quickAdd(page, 'screen reader test 10k');
    
    // Check for live region announcement
    const liveRegion = page.locator('[aria-live="polite"]');
    await expect(liveRegion).toContainText(/tersimpan/i);
  });
});
```

---

## 🎯 Priority 3: Advanced Scenarios (LOW)

### 6. Visual Regression Tests

```typescript
// tests/e2e/visual.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test('homepage should match snapshot', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot
    await expect(page).toHaveScreenshot('homepage.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('dark mode should match snapshot', async ({ page }) => {
    await page.goto('/');
    
    // Enable dark mode
    await page.getByRole('button', { name: 'Action' }).click();
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('homepage-dark.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('entry list with data should match snapshot', async ({ page }) => {
    await page.goto('/');
    
    // Add some entries
    await quickAdd(page, 'visual test 1 10k');
    await quickAdd(page, 'visual test 2 20k');
    await quickAdd(page, 'visual test 3 30k');
    
    // Navigate to notes
    await page.locator('nav').last().getByRole('button', { name: 'Catatan' }).click();
    
    await expect(page.locator('[data-entry-id]').first()).toBeVisible();
    
    await expect(page).toHaveScreenshot('notes-with-data.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });
});
```

### 7. Multi-Device Tests

```typescript
// tests/e2e/multi-device.spec.ts
import { test, expect, devices } from '@playwright/test';

test.describe('Multi-Device Sync', () => {
  test('should sync data between two devices', async ({ browser }) => {
    // Device 1
    const context1 = await browser.newContext(devices['iPhone 12']);
    const page1 = await context1.newPage();
    await seedAuthSession(page1);
    await page1.goto('/');
    
    // Add entry on device 1
    await quickAdd(page1, 'device 1 entry 10k');
    
    // Wait for sync
    await expect(page1.getByText(/synced/i)).toBeVisible();
    
    // Device 2
    const context2 = await browser.newContext(devices['Desktop Chrome']);
    const page2 = await context2.newPage();
    await seedAuthSession(page2);
    await page2.goto('/');
    
    // Should see entry from device 1
    await page2.locator('nav').last().getByRole('button', { name: 'Catatan' }).click();
    await expect(page2.getByText('device 1 entry')).toBeVisible();
    
    // Add entry on device 2
    await page2.locator('nav').last().getByRole('button', { name: 'Beranda' }).click();
    await quickAdd(page2, 'device 2 entry 20k');
    
    // Refresh device 1
    await page1.reload();
    await page1.locator('nav').last().getByRole('button', { name: 'Catatan' }).click();
    
    // Should see entry from device 2
    await expect(page1.getByText('device 2 entry')).toBeVisible();
    
    await context1.close();
    await context2.close();
  });
});
```

### 8. PWA Installation Tests

```typescript
// tests/e2e/pwa.spec.ts
import { test, expect } from '@playwright/test';

test.describe('PWA Features', () => {
  test('should show install prompt on supported browsers', async ({ page, context }) => {
    // Mock beforeinstallprompt event
    await page.addInitScript(() => {
      window.addEventListener('load', () => {
        const event = new Event('beforeinstallprompt');
        window.dispatchEvent(event);
      });
    });
    
    await page.goto('/');
    
    // Should show install banner
    await expect(page.locator('[aria-label="Install aplikasi"]')).toBeVisible();
  });

  test('should work offline after installation', async ({ page, context }) => {
    await page.goto('/');
    
    // Wait for service worker to register
    await page.waitForTimeout(2000);
    
    // Go offline
    await context.setOffline(true);
    
    // Reload page
    await page.reload();
    
    // Should still load
    await expect(page.getByRole('heading', { name: 'KeMana' })).toBeVisible();
  });

  test('should update service worker when new version available', async ({ page }) => {
    await page.goto('/');
    
    // Mock service worker update
    await page.evaluate(() => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
          // Simulate update found
          const event = new Event('updatefound');
          registration.dispatchEvent(event);
        });
      }
    });
    
    // Should show update notification
    await expect(page.getByText(/update.*tersedia/i)).toBeVisible();
    
    // Click update button
    await page.getByRole('button', { name: /muat ulang/i }).click();
    
    // Should reload page
    await expect(page).toHaveURL('/');
  });
});
```

---

## 📊 Test Organization Improvements

### 9. Page Object Model (POM)

```typescript
// tests/e2e/pages/HomePage.ts
export class HomePage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/');
    await this.waitForReady();
  }

  async waitForReady() {
    await expect(this.page.getByRole('heading', { name: 'KeMana' })).toBeVisible();
    await expect(this.quickAddInput).toBeVisible();
  }

  get quickAddInput() {
    return this.page.locator('main input[type="text"]').first();
  }

  async quickAdd(input: string) {
    await this.quickAddInput.fill(input);
    await this.quickAddInput.press('Enter');
  }

  async navigateToNotes() {
    await this.page.locator('nav').last().getByRole('button', { name: 'Catatan' }).click();
  }

  async navigateToInsight() {
    await this.page.locator('nav').last().getByRole('button', { name: 'Insight' }).click();
  }
}

// Usage:
test('quick add with POM', async ({ page }) => {
  const homePage = new HomePage(page);
  await homePage.goto();
  await homePage.quickAdd('test 10k');
  await homePage.navigateToNotes();
  // assertions...
});
```

### 10. Test Data Fixtures

```typescript
// tests/e2e/fixtures/test-data.ts
export const testEntries = {
  simple: {
    text: 'Simple entry',
    amount: 10000,
    category: 'Makan'
  },
  withSplit: {
    text: 'Split entry',
    amount: 90000,
    category: 'Makan',
    split: {
      mode: 'equal',
      people: ['Kamu', 'Budi', 'Cici']
    }
  },
  withQty: {
    text: 'Qty entry',
    amount: 45000,
    qty: 3,
    category: 'Makan'
  }
};

export const testUsers = {
  default: {
    name: 'Tester',
    email: 'test@example.com'
  },
  premium: {
    name: 'Premium User',
    email: 'premium@example.com',
    subscription: 'premium'
  }
};
```

---

## 🚀 CI/CD Integration

### 11. GitHub Actions Workflow

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        browser: [chromium, firefox, webkit]
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '22'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps ${{ matrix.browser }}
      
      - name: Build app
        run: npm run build
      
      - name: Run E2E tests
        run: npm run test:e2e -- --project=${{ matrix.browser }}
        env:
          CI: true
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report-${{ matrix.browser }}
          path: playwright-report/
          retention-days: 30
      
      - name: Upload screenshots
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: screenshots-${{ matrix.browser }}
          path: test-results/
          retention-days: 7
```

---

## 📈 Metrics & Reporting

### 12. Test Coverage Dashboard

```typescript
// tests/e2e/coverage.spec.ts
import { test } from '@playwright/test';

test('generate coverage report', async ({ page }) => {
  // Enable coverage
  await page.coverage.startJSCoverage();
  
  // Run through critical flows
  await page.goto('/');
  await quickAdd(page, 'coverage test 10k');
  // ... more flows
  
  // Get coverage
  const coverage = await page.coverage.stopJSCoverage();
  
  // Save to file
  const fs = require('fs');
  fs.writeFileSync('coverage/e2e-coverage.json', JSON.stringify(coverage));
});
```

---

## 🎯 Implementation Roadmap

### Phase 1 (Week 1-2): Critical Flows
- [ ] Auth flow tests (sign in, sign out)
- [ ] Sync worker tests (offline/online)
- [ ] Error handling tests

### Phase 2 (Week 3-4): Performance & A11y
- [ ] Performance benchmarks
- [ ] Accessibility tests
- [ ] Page Object Model refactor

### Phase 3 (Month 2): Advanced
- [ ] Visual regression tests
- [ ] Multi-device sync tests
- [ ] PWA installation tests

### Phase 4 (Month 3): Infrastructure
- [ ] CI/CD integration
- [ ] Test coverage reporting
- [ ] Automated screenshot comparison

---

## 📊 Expected Impact

| Improvement | Current | Target | Impact |
|-------------|---------|--------|--------|
| Test Coverage | 17 tests | 50+ tests | 🔴 High |
| Critical Paths | 70% | 95% | 🔴 High |
| Performance Tests | 0 | 5+ | 🟡 Medium |
| A11y Tests | 0 | 10+ | 🟡 Medium |
| Visual Tests | 0 | 15+ | 🟢 Low |
| CI/CD Integration | ❌ | ✅ | 🔴 High |

---

## 💡 Quick Wins (Can implement today!)

1. **Add auth flow test** - 30 minutes
2. **Add performance assertion to existing test** - 15 minutes
3. **Setup GitHub Actions** - 1 hour
4. **Add accessibility scan to homepage test** - 20 minutes

```bash
# Install axe-core for accessibility testing
npm install -D @axe-core/playwright

# Run tests with coverage
npm run test:e2e -- --reporter=html,json
```

---

## 🎓 Best Practices to Follow

1. **Use data-testid for stable selectors**
   ```typescript
   // Good
   await page.getByTestId('quick-add-input');
   
   // Avoid (brittle)
   await page.locator('input').nth(2);
   ```

2. **Wait for network idle before assertions**
   ```typescript
   await page.waitForLoadState('networkidle');
   await expect(element).toBeVisible();
   ```

3. **Use Page Object Model for reusability**
4. **Mock external services (Supabase, Google Auth)**
5. **Test in isolation (clear data before each test)**
6. **Use meaningful test names**
7. **Add retry logic for flaky tests**
8. **Capture screenshots on failure**

---

## 📝 Summary

**Current E2E Score: 7.5/10**

With these improvements, you can reach **9.5/10**:
- ✅ Comprehensive coverage of all user flows
- ✅ Performance and accessibility testing
- ✅ Visual regression detection
- ✅ CI/CD integration
- ✅ Multi-device testing
- ✅ Better test organization (POM)

**Estimated effort:** 2-3 weeks for full implementation
**Priority:** Start with Phase 1 (auth + sync + errors)
