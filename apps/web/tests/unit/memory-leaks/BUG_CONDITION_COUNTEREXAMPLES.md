# Bug Condition Exploration - Counterexamples Found

## Test Execution Summary

**Date**: Task 1 Execution
**Status**: All 6 tests FAILED (as expected - confirms bugs exist)
**Test File**: `apps/web/tests/unit/memory-leaks/bug-condition-exploration.test.ts`

## Counterexamples Demonstrating Each Bug

### Bug 1: Sync Worker Memory Leak

**Test**: `should demonstrate that syncWorkerInstance is NOT nullified after logout (memory leak)`

**Counterexample Found**:
- After calling `worker.stop()`, the event listeners remain attached
- `worker.onStatusChange` is still defined (expected: undefined)
- `worker.onPendingCountChange` is still defined (expected: undefined)
- `worker.onLastSyncTimeChange` is still defined (expected: undefined)

**Evidence**:
```
AssertionError: expected [Function Mock] to be undefined
```

**Conclusion**: Bug confirmed. The `stopSyncWorker()` function does NOT clean up event listeners or nullify the global instance.

---

### Bug 2: Auth Initialization Race Condition

**Test**: `should demonstrate that hasInitializedRef is set BEFORE session resolves (race condition)`

**Counterexample Found**:
- `hasInitializedRef.current = true` is set at line 52
- `await supabase.auth.getSession()` is called at line 55
- The flag is set BEFORE the async operation completes

**Evidence**:
```
AssertionError: expected 52 to be greater than 55
```

**Conclusion**: Bug confirmed. The initialization flag is set prematurely, creating a race condition where `isInitialized` is true before the session is actually resolved.

---

### Bug 3a: Missing Network Status Check in startSyncWorker

**Test**: `should demonstrate that startSyncWorker does NOT check network before starting (missing check)`

**Counterexample Found**:
- The `startSyncWorker()` function body does NOT contain:
  - `Network.getStatus()` call
  - `navigator.onLine` check
  - Any network validation before creating the worker

**Evidence**:
```
AssertionError: expected false to be true // Object.is equality
```

**Conclusion**: Bug confirmed. The sync worker starts without checking network connectivity, causing immediate failures when offline.

---

### Bug 3b: Missing Network Status Check in forceGlobalSync

**Test**: `should demonstrate that forceGlobalSync does NOT check network before syncing (missing check)`

**Counterexample Found**:
- The `forceGlobalSync()` function body does NOT contain:
  - Network status check
  - Indonesian error message for offline status

**Evidence**:
```
AssertionError: expected false to be true // Object.is equality
```

**Conclusion**: Bug confirmed. The global sync operation proceeds without network validation, causing sync failures when offline.

---

### Bug 4: IndexedDB Quota Exceeded Handling

**Test**: `should demonstrate that QuotaExceededError is NOT caught (missing error handling)`

**Counterexample Found**:
- The `enqueueSyncOperation()` function does NOT contain:
  - `QuotaExceededError` handling
  - User notification message "Penyimpanan browser penuh"
  - Retry logic with `clearSynced()`

**Evidence**:
```
AssertionError: expected false to be true // Object.is equality
```

**Conclusion**: Bug confirmed. IndexedDB quota exceeded errors are not caught, causing silent data loss without user notification.

---

### Bug 5: Incomplete useEffect Cleanup

**Test**: `should demonstrate that hasInitializedRef is NOT reset on unmount (incomplete cleanup)`

**Counterexample Found**:
- The useEffect cleanup function does NOT contain:
  - `hasInitializedRef.current = false` (reset flag)
  - `stopSyncWorker()` call (stop worker)

**Evidence**:
```
AssertionError: expected false to be true // Object.is equality
```

**Conclusion**: Bug confirmed. The cleanup function only sets `mounted = false` but does not reset the initialization flag or stop the sync worker, causing memory leaks and preventing re-initialization on remount.

---

## Summary

All 5 bug conditions have been confirmed through counterexamples:

1. ✅ **Bug 1**: Sync worker instance and event listeners persist after logout
2. ✅ **Bug 2**: Initialization flag set before session resolves (race condition)
3. ✅ **Bug 3**: No network validation before sync operations
4. ✅ **Bug 4**: No error handling for IndexedDB quota exceeded
5. ✅ **Bug 5**: Incomplete cleanup on component unmount

These tests encode the expected correct behavior. When the fixes are implemented, all tests should PASS, confirming that the bugs are resolved.

## Next Steps

1. Proceed to Task 2: Write preservation property tests
2. Then implement fixes in Task 3
3. Re-run these tests after fixes to verify they pass
