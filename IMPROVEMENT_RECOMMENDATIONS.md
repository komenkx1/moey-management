# KeMana - Improvement Recommendations

## 1. Error Handling & Monitoring (Priority: HIGH)

### Current Issues:
- Silent error swallowing in storage operations
- No centralized error tracking
- Limited error context for debugging

### Recommendations:

#### A. Add Error Boundary with Sentry Integration
```typescript
// src/lib/error-handler.ts
import * as Sentry from "@sentry/nextjs";

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function handleError(error: unknown, context?: Record<string, any>) {
  if (error instanceof AppError) {
    Sentry.captureException(error, {
      level: 'error',
      extra: { ...error.context, ...context }
    });
  } else {
    Sentry.captureException(error, { extra: context });
  }
  
  // Log in development
  if (process.env.NODE_ENV !== 'production') {
    console.error('Error:', error, 'Context:', context);
  }
}
```

#### B. Improve Storage Error Handling
```typescript
// Instead of:
} catch {
  // Ignore write failures
}

// Use:
} catch (error) {
  handleError(error, {
    operation: 'saveEntries',
    entryCount: entries.length,
    timestamp: Date.now()
  });
  
  // Show user-friendly message
  toast.error('Gagal menyimpan data. Silakan coba lagi.');
  
  // Attempt recovery
  await attemptStorageRecovery();
}
```

#### C. Add Storage Quota Monitoring
```typescript
export async function checkStorageQuota(): Promise<{
  usage: number;
  quota: number;
  percentUsed: number;
}> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const percentUsed = (usage / quota) * 100;
    
    // Warn if > 80%
    if (percentUsed > 80) {
      Sentry.captureMessage('Storage quota warning', {
        level: 'warning',
        extra: { usage, quota, percentUsed }
      });
    }
    
    return { usage, quota, percentUsed };
  }
  
  return { usage: 0, quota: 0, percentUsed: 0 };
}
```

---

## 2. Performance Monitoring (Priority: MEDIUM)

### Add Real User Monitoring (RUM)

```typescript
// src/lib/performance-monitor.ts
import * as Sentry from "@sentry/nextjs";

export function trackOperation(name: string, fn: () => Promise<void>) {
  const transaction = Sentry.startTransaction({
    op: 'operation',
    name
  });
  
  const start = performance.now();
  
  return fn()
    .then(() => {
      const duration = performance.now() - start;
      transaction.setMeasurement(name, duration, 'millisecond');
      transaction.finish();
      
      // Track slow operations
      if (duration > 1000) {
        Sentry.captureMessage(`Slow operation: ${name}`, {
          level: 'warning',
          extra: { duration }
        });
      }
    })
    .catch((error) => {
      transaction.setStatus('internal_error');
      transaction.finish();
      throw error;
    });
}

// Usage:
await trackOperation('saveEntries', async () => {
  await saveEntries(entries);
});
```

---

## 3. Code Quality Improvements (Priority: MEDIUM)

### A. Add ESLint + Prettier
```bash
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
npm install -D prettier eslint-config-prettier
```

```json
// .eslintrc.json
{
  "extends": [
    "next/core-web-vitals",
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": ["error", { 
      "argsIgnorePattern": "^_" 
    }]
  }
}
```

### B. Add Pre-commit Hooks
```bash
npm install -D husky lint-staged
npx husky init
```

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

---

## 4. Security Enhancements (Priority: MEDIUM)

### A. Add Content Security Policy (CSP)
```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net;
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: https:;
      font-src 'self' data:;
      connect-src 'self' https://*.supabase.co;
      frame-ancestors 'none';
    `.replace(/\s{2,}/g, ' ').trim()
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  }
];

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
```

### B. Add Dependency Vulnerability Scanning
```bash
# Add to CI/CD pipeline
npm audit --production
npm audit fix

# Or use Snyk
npx snyk test
```

---

## 5. Testing Improvements (Priority: LOW)

### A. Add Integration Tests
```typescript
// tests/integration/sync-flow.test.ts
describe('Sync Flow Integration', () => {
  it('should sync data end-to-end', async () => {
    // 1. Create entry offline
    const entry = await createEntry({ text: 'Test', amount: 1000 });
    
    // 2. Go online
    await simulateOnline();
    
    // 3. Verify sync
    await waitFor(() => {
      expect(getSyncStatus()).toBe('synced');
    });
    
    // 4. Verify data in Supabase
    const { data } = await supabase
      .from('entries')
      .select('*')
      .eq('id', entry.id);
    
    expect(data).toHaveLength(1);
  });
});
```

### B. Add Visual Regression Testing
```bash
npm install -D @playwright/test
```

```typescript
// tests/visual/homepage.spec.ts
test('homepage visual regression', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('homepage.png');
});
```

---

## 6. Documentation Improvements (Priority: LOW)

### A. Add API Documentation
```typescript
/**
 * Saves entries to IndexedDB with optimistic updates
 * 
 * @param entries - Array of entries to save
 * @throws {StorageQuotaError} When storage quota is exceeded
 * @throws {DatabaseError} When IndexedDB operation fails
 * 
 * @example
 * ```typescript
 * await saveEntries([
 *   { id: '1', text: 'Lunch', amount: 50000, ... }
 * ]);
 * ```
 */
export async function saveEntries(entries: Entry[]): Promise<void>
```

### B. Add Architecture Decision Records (ADR)
```markdown
# ADR-001: Use Zustand for State Management

## Status
Accepted

## Context
Need centralized state management for complex UI state and sync status.

## Decision
Use Zustand with encrypted persistence middleware.

## Consequences
- Simpler than Redux
- Better TypeScript support
- Smaller bundle size
- Need custom encryption layer
```

---

## 7. DevOps Improvements (Priority: MEDIUM)

### A. Add GitHub Actions CI/CD
```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '22'
      - run: npm ci
      - run: npm test
      - run: npm run build
      
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e
```

### B. Add Automated Dependency Updates
```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
```

---

## 8. User Experience Improvements (Priority: LOW)

### A. Add Offline Indicator
```typescript
// src/components/OfflineIndicator.tsx
export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  if (isOnline) return null;
  
  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white p-2 text-center z-50">
      📡 Anda sedang offline. Data akan disinkronkan saat online.
    </div>
  );
}
```

### B. Add Data Export to CSV
```typescript
export function exportToCSV(entries: Entry[]): void {
  const headers = ['Tanggal', 'Kategori', 'Deskripsi', 'Jumlah', 'Metode Bayar'];
  const rows = entries.map(e => [
    e.date,
    e.category,
    e.text,
    e.amount.toString(),
    e.paymentMethod || ''
  ]);
  
  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `kemana-export-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
```

---

## Priority Summary

### Immediate (This Sprint):
1. ✅ Improve error handling in storage operations
2. ✅ Add Sentry error tracking for production
3. ✅ Add storage quota monitoring

### Short-term (Next Sprint):
1. Add ESLint + Prettier
2. Add pre-commit hooks
3. Improve CSP headers
4. Add GitHub Actions CI/CD

### Long-term (Future):
1. Add integration tests
2. Add visual regression testing
3. Add API documentation
4. Add offline indicator UI
5. Add CSV export feature

---

## Estimated Impact

| Improvement | Effort | Impact | Priority |
|-------------|--------|--------|----------|
| Error Handling | Medium | High | 🔴 Critical |
| Performance Monitoring | Low | High | 🟡 High |
| ESLint/Prettier | Low | Medium | 🟡 High |
| CSP Headers | Low | High | 🟡 High |
| Integration Tests | High | Medium | 🟢 Medium |
| Visual Regression | Medium | Low | 🟢 Medium |
| Offline Indicator | Low | Medium | 🟢 Medium |
| CSV Export | Low | Low | 🟢 Low |

