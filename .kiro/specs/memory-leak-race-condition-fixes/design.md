# Memory Leak & Race Condition Fixes Design

## Overview

This design addresses five critical memory leaks and race conditions in the KeMana authentication and sync worker lifecycle. The bugs cause resource leaks, premature initialization states, silent data loss, and incomplete cleanup that degrade app stability over time. The fix strategy focuses on proper resource cleanup, correct async timing, network validation, graceful error handling, and complete useEffect lifecycle management.

## Glossary

- **Bug_Condition (C)**: The conditions that trigger each of the 5 bug categories
- **Property (P)**: The desired correct behavior when bugs are fixed
- **Preservation**: Existing sync, auth, and data operation behaviors that must remain unchanged
- **syncWorkerInstance**: Global singleton instance of `SyncWorker` class in `useAuth.ts`
- **hasInitializedRef**: React ref that tracks whether auth initialization has completed
- **Network.addListener**: Capacitor Network plugin listener for native platform network status changes
- **QuotaExceededError**: Browser exception thrown when IndexedDB storage quota is exceeded
- **mounted**: React useEffect flag to prevent state updates on unmounted components
- **isRunning**: Internal flag in `SyncWorker` that controls the processing loop
- **Event Listeners**: Callback functions (`onStatusChange`, `onPendingCountChange`, `onLastSyncTimeChange`) attached to sync worker

## Bug Details

### Bug Condition 1: Memory Leak in Sync Worker

The sync worker cleanup is incomplete, leaving the global instance and event listeners in memory after logout.

**Formal Specification:**
```
FUNCTION isBugCondition1(state)
  INPUT: state of type { event: AuthEvent, syncWorkerInstance: SyncWorker | null }
  OUTPUT: boolean
  
  RETURN state.event == 'SIGNED_OUT'
         AND state.syncWorkerInstance != null
         AND (state.syncWorkerInstance.onStatusChange != null
              OR state.syncWorkerInstance.onPendingCountChange != null
              OR state.syncWorkerInstance.onLastSyncTimeChange != null
              OR networkListenerStillAttached())
END FUNCTION
```

### Bug Condition 2: Race Condition in Auth Initialization

The initialization flag is set before the async session fetch completes, causing premature "initialized" state.

**Formal Specification:**
```
FUNCTION isBugCondition2(state)
  INPUT: state of type { hasInitializedRef: boolean, sessionResolved: boolean }
  OUTPUT: boolean
  
  RETURN state.hasInitializedRef == true
         AND state.sessionResolved == false
END FUNCTION
```

### Bug Condition 3: Missing Network Status Check

Sync operations start without verifying network connectivity, causing immediate failures when offline.

**Formal Specification:**
```
FUNCTION isBugCondition3(state)
  INPUT: state of type { operation: string, isOnline: boolean }
  OUTPUT: boolean
  
  RETURN state.operation IN ['startSyncWorker', 'forceGlobalSync']
         AND state.isOnline == false
         AND noNetworkCheckPerformed()
END FUNCTION
```

### Bug Condition 4: IndexedDB Quota Exceeded Handling

IndexedDB quota exceeded errors are not caught, causing silent data loss without user notification.

**Formal Specification:**
```
FUNCTION isBugCondition4(error)
  INPUT: error of type Error
  OUTPUT: boolean
  
  RETURN error.name == 'QuotaExceededError'
         AND errorNotCaught()
         AND userNotNotified()
END FUNCTION
```

### Bug Condition 5: Missing Cleanup in useEffect

The auth initialization useEffect does not reset refs or cleanup resources on unmount.

**Formal Specification:**
```
FUNCTION isBugCondition5(state)
  INPUT: state of type { componentMounted: boolean, hasInitializedRef: boolean }
  OUTPUT: boolean
  
  RETURN state.componentMounted == false
         AND state.hasInitializedRef == true
END FUNCTION
```

### Examples

**Bug 1 - Memory Leak:**
- User logs in → `syncWorkerInstance` created with 3 event listeners + Network listener
- User logs out → `stopSyncWorker()` sets `isRunning = false` but leaves `syncWorkerInstance` in memory
- User logs in again → New `syncWorkerInstance` created, old one still in memory with listeners
- Result: Multiple worker instances accumulate, consuming memory and potentially causing duplicate sync operations

**Bug 2 - Race Condition:**
- `initializeAuth()` called → `hasInitializedRef.current = true` set immediately
- `await supabase.auth.getSession()` takes 500ms to complete
- UI component checks `isInitialized` at 200ms → Returns `true`
- Component tries to access `session` → `null` because async operation not complete
- Result: "Session not ready" errors in components that depend on auth state

**Bug 3 - Missing Network Check:**
- User opens app while offline
- `startSyncWorker()` called without checking network
- Sync worker starts processing queue → All operations fail immediately
- Result: Unnecessary error logs, failed status updates, wasted CPU cycles

**Bug 4 - Quota Exceeded:**
- User has 500MB of data in IndexedDB, browser quota is 500MB
- User adds new entry → `db.entries.put()` throws `QuotaExceededError`
- Error propagates silently, entry not saved
- Result: User thinks entry is saved (optimistic UI) but data is lost

**Bug 5 - Missing Cleanup:**
- Component mounts → `hasInitializedRef.current = true`, async operations start
- Component unmounts during async operation → `mounted = false` but `hasInitializedRef.current` still `true`
- Component remounts → `initializeAuth()` skipped because `hasInitializedRef.current == true`
- Result: Auth not re-initialized, potential stale state

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Sync worker processes queue items every 2 seconds when running and online
- Sync worker retries failed items with exponential backoff up to 10 times
- Sync worker updates last sync time and pending count after successful sync
- User sign-in with Google migrates local data and performs initial sync
- Auth token refresh ensures sync worker is running
- User sign-out clears local database and UI state
- Network restoration on native platform wakes up sync worker via `Network.addListener`
- Sync worker checks network status every 5 seconds when offline
- `forceGlobalSync()` flushes local queue, fetches fresh data, and updates UI when online
- `flushSyncQueue()` throws "PENDING_OFFLINE_DATA" error if offline with pending items
- Entries and rules are enqueued with optimistic local updates immediately

**Scope:**
All existing sync, auth, and data operation behaviors must continue to work exactly as before. The fixes only add proper cleanup, timing corrections, validation checks, and error handling without changing the core functionality.

## Hypothesized Root Cause

Based on the bug analysis, the root causes are:

### 1. Incomplete Sync Worker Cleanup

**Root Cause**: The `stopSyncWorker()` function only sets `isRunning = false` but does not:
- Nullify the global `syncWorkerInstance` variable
- Remove event listener callbacks (`onStatusChange`, `onPendingCountChange`, `onLastSyncTimeChange`)
- Remove the Capacitor Network listener registered via `Network.addListener()`

**Evidence**: In `useAuth.ts` line 76-80, `stopSyncWorker()` only calls `syncWorkerInstance.stop()` which sets `isRunning = false`. The instance remains in memory with all listeners attached.

### 2. Premature Initialization Flag

**Root Cause**: In `initializeAuth()` at line 52, `hasInitializedRef.current = true` is set BEFORE `await supabase.auth.getSession()` completes. This creates a timing window where `isInitialized` is true but session is not yet resolved.

**Evidence**: The flag is set at the start of the function, then the async `getSession()` call happens, then `setInitialized(true)` is called. The ref should be set AFTER the async operation completes.

### 3. Missing Network Validation

**Root Cause**: Neither `startSyncWorker()` nor `forceGlobalSync()` check network connectivity before starting operations. The sync worker's internal loop checks network, but by then the worker is already started and resources allocated.

**Evidence**: `startSyncWorker()` at line 318 immediately creates and starts the worker without checking `isOnlineFn()`. `forceGlobalSync()` at line 234 calls `initialSyncOnLogin()` without network validation.

### 4. Unhandled IndexedDB Exceptions

**Root Cause**: The `enqueueSyncOperation()` function in `sync-worker.ts` at line 367 calls `db.syncQueue.add()` and `db.entries.put()` without try-catch blocks for `QuotaExceededError`. When storage quota is exceeded, the error propagates silently.

**Evidence**: No error handling exists for IndexedDB operations in the enqueue function. The transaction will fail but the user is never notified.

### 5. Incomplete useEffect Cleanup

**Root Cause**: The auth initialization useEffect at line 48 sets `mounted = false` in the cleanup function but does not:
- Reset `hasInitializedRef.current` to `false`
- Stop the sync worker
- Remove network listeners
- Cancel in-flight promises

**Evidence**: The cleanup function only sets `mounted = false`. All other resources remain allocated.

## Correctness Properties

Property 1: Bug Condition 1 - Sync Worker Memory Cleanup

_For any_ logout event where the sync worker is running, the fixed `stopSyncWorker` function SHALL nullify the global `syncWorkerInstance` variable, remove all event listener callbacks, and remove the Capacitor Network listener, ensuring no memory leaks occur.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Bug Condition 2 - Auth Initialization Timing

_For any_ auth initialization where `getSession()` is called, the fixed `initializeAuth` function SHALL set `hasInitializedRef.current = true` ONLY after the async session fetch completes, ensuring UI components never see a premature "initialized" state.

**Validates: Requirements 2.5, 2.6, 2.7**

Property 3: Bug Condition 3 - Network Status Validation

_For any_ sync operation start where network connectivity is required, the fixed functions SHALL check network status BEFORE starting operations and SHALL set appropriate status or throw descriptive errors when offline.

**Validates: Requirements 2.8, 2.9, 2.10**

Property 4: Bug Condition 4 - Quota Exceeded Error Handling

_For any_ IndexedDB operation that throws `QuotaExceededError`, the fixed `enqueueSyncOperation` function SHALL catch the exception, notify the user with a clear Indonesian error message, attempt to clear old synced items, and retry the operation once.

**Validates: Requirements 2.11, 2.12, 2.13**

Property 5: Bug Condition 5 - useEffect Cleanup Completeness

_For any_ component unmount during auth initialization, the fixed useEffect cleanup function SHALL reset `hasInitializedRef.current` to `false`, stop the sync worker, remove all network listeners, and prevent state updates on unmounted components.

**Validates: Requirements 2.14, 2.15, 2.16**

Property 6: Preservation - Sync Worker Functionality

_For any_ sync operation where the bug conditions do NOT hold (worker running online, proper initialization, network available, quota not exceeded, component mounted), the fixed code SHALL produce exactly the same sync behavior as the original code, preserving all queue processing, retry logic, and status updates.

**Validates: Requirements 3.1, 3.2, 3.3**

Property 7: Preservation - Auth Flow

_For any_ authentication operation (sign-in, token refresh, sign-out) where the bug conditions do NOT hold, the fixed code SHALL produce exactly the same auth behavior as the original code, preserving data migration, initial sync, and database clearing.

**Validates: Requirements 3.4, 3.5, 3.6**

Property 8: Preservation - Network Handling

_For any_ network status change or offline operation where the bug conditions do NOT hold, the fixed code SHALL produce exactly the same network handling behavior as the original code, preserving worker wakeup and status checking.

**Validates: Requirements 3.7, 3.8**

Property 9: Preservation - Data Operations

_For any_ data operation (global sync, queue flush, entry/rule enqueue) where the bug conditions do NOT hold, the fixed code SHALL produce exactly the same data operation behavior as the original code, preserving sync flow, error handling, and optimistic updates.

**Validates: Requirements 3.9, 3.10, 3.11**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File 1**: `apps/web/src/hooks/useAuth.ts`

**Changes**:

1. **Sync Worker Cleanup Enhancement**:
   - Modify `stopSyncWorker()` to nullify `syncWorkerInstance` after calling `stop()`
   - Add cleanup of event listener callbacks before nullifying
   - Store Network listener handle and remove it on cleanup
   - Add a `cleanup()` method to `SyncWorker` class for proper resource disposal

2. **Auth Initialization Timing Fix**:
   - Move `hasInitializedRef.current = true` to AFTER `await supabase.auth.getSession()` completes
   - Ensure the flag is set in both success and error paths after async resolution

3. **Network Status Validation**:
   - Add network check at the start of `startSyncWorker()` before creating worker instance
   - Add network check at the start of `forceGlobalSync()` before flushing queue
   - Set appropriate status ('offline') or throw descriptive error when offline

4. **useEffect Cleanup Enhancement**:
   - Add `hasInitializedRef.current = false` to the cleanup function
   - Add `stopSyncWorker()` call to the cleanup function
   - Ensure all resources are released on unmount

5. **Network Listener Management**:
   - Store the Network listener handle in a module-level variable
   - Remove the listener in `stopSyncWorker()` using `Network.removeAllListeners('networkStatusChange')`

**File 2**: `packages/storage/sync-worker.ts`

**Changes**:

1. **Quota Exceeded Error Handling**:
   - Wrap `db.syncQueue.add()` and `db.entries.put()` / `db.rules.put()` in try-catch blocks
   - Catch `QuotaExceededError` specifically
   - Show user notification: "Penyimpanan browser penuh. Silakan hapus data lama atau bersihkan cache browser."
   - Attempt to clear old synced items via `clearSynced()`
   - Retry the operation once after clearing

2. **Cleanup Method Addition**:
   - Add a `cleanup()` method to `SyncWorker` class
   - Method should nullify event listener callbacks
   - Method should be called before instance is nullified

### Specific Code Changes

**useAuth.ts - stopSyncWorker() enhancement:**
```typescript
function stopSyncWorker() {
    if (syncWorkerInstance) {
        syncWorkerInstance.stop();
        
        // Cleanup event listeners
        syncWorkerInstance.onStatusChange = undefined;
        syncWorkerInstance.onPendingCountChange = undefined;
        syncWorkerInstance.onLastSyncTimeChange = undefined;
        
        // Nullify instance to allow garbage collection
        syncWorkerInstance = null;
    }
    
    // Remove network listener on native platforms
    if (isNativePlatform()) {
        Network.removeAllListeners('networkStatusChange');
    }
}
```

**useAuth.ts - initializeAuth() timing fix:**
```typescript
const initializeAuth = async () => {
    if (hasInitializedRef.current) return;
    
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
            devError("Error getting session:", error);
        }
        
        // Set initialized flag AFTER async operation completes
        hasInitializedRef.current = true;
        
        if (mounted) {
            setSession(session);
            setInitialized(true);
        }
        
        // ... rest of the function
    } catch (err) {
        hasInitializedRef.current = true; // Set even on error
        if (mounted) {
            setInitialized(true); 
        }
    }
};
```

**useAuth.ts - network validation in startSyncWorker():**
```typescript
async function startSyncWorker(userId: string) {
    // Check network status first
    const isOnline = isNativePlatform() 
        ? (await Network.getStatus()).connected 
        : navigator.onLine;
    
    if (!syncWorkerInstance) {
        syncWorkerInstance = new SyncWorker(supabase);
        
        // ... event listener setup
    }
    
    // Set offline status if not online
    if (!isOnline) {
        useKemanaStore.getState().setSyncStatus('offline');
    }
    
    syncWorkerInstance.start(userId);
}
```

**useAuth.ts - network validation in forceGlobalSync():**
```typescript
const forceGlobalSync = async () => {
    if (!user) throw new Error("Pengguna belum login.");
    
    // Check network first
    const isOnline = isNativePlatform() 
        ? (await Network.getStatus()).connected 
        : navigator.onLine;
    
    if (!isOnline) {
        throw new Error("Tidak dapat sinkronisasi saat offline. Silakan periksa koneksi internet Anda.");
    }
    
    // ... rest of the function
};
```

**useAuth.ts - useEffect cleanup enhancement:**
```typescript
return () => {
    mounted = false;
    hasInitializedRef.current = false;
    stopSyncWorker();
};
```

**sync-worker.ts - quota exceeded handling in enqueueSyncOperation():**
```typescript
export async function enqueueSyncOperation(
  entity: 'entry' | 'rule',
  entityId: string,
  operation: 'create' | 'update' | 'delete',
  payload: Entry | CategoryRules[number] | null
): Promise<void> {
  const item: SyncQueueItem = {
    id: generateSyncId(),
    entity,
    entityId,
    operation,
    payload,
    createdAt: Date.now(),
    retryCount: 0,
    status: 'pending'
  };

  try {
    await db.transaction("rw", db.syncQueue, db.entries, db.rules, async () => {
      await db.syncQueue.add(item);
      
      if (operation === 'create' || operation === 'update') {
        if (entity === 'entry' && payload) {
          await db.entries.put(payload as Entry);
        } else if (entity === 'rule' && payload) {
          await db.rules.put(payload as CategoryRules[number]);
        }
      } else if (operation === 'delete') {
        if (entity === 'entry') {
          await db.entries.delete(entityId);
        } else if (entity === 'rule') {
          await db.rules.delete(entityId);
        }
      }
    });

    console.log(`📝 Enqueued & Applied ${entity} ${operation}:`, entityId);
    
  } catch (error: any) {
    if (error.name === 'QuotaExceededError') {
      console.error('❌ Storage quota exceeded');
      
      // Notify user
      alert("Penyimpanan browser penuh. Silakan hapus data lama atau bersihkan cache browser.");
      
      // Attempt to clear old synced items and retry once
      try {
        const worker = new SyncWorker(null as any); // Temporary instance for cleanup
        await worker.clearSynced();
        
        // Retry the operation
        await db.transaction("rw", db.syncQueue, db.entries, db.rules, async () => {
          await db.syncQueue.add(item);
          
          if (operation === 'create' || operation === 'update') {
            if (entity === 'entry' && payload) {
              await db.entries.put(payload as Entry);
            } else if (entity === 'rule' && payload) {
              await db.rules.put(payload as CategoryRules[number]);
            }
          }
        });
        
        console.log(`✓ Retry successful after clearing synced items`);
      } catch (retryError) {
        console.error('❌ Retry failed after quota cleanup:', retryError);
        throw new Error("Penyimpanan penuh dan pembersihan otomatis gagal. Silakan hapus data secara manual.");
      }
    } else {
      throw error;
    }
  }
}
```

## Testing Strategy

### Validation Approach

The testing strategy follows a three-phase approach:
1. **Exploratory Bug Condition Checking**: Surface counterexamples on unfixed code to confirm root causes
2. **Fix Checking**: Verify fixes work correctly for all bug conditions
3. **Preservation Checking**: Verify existing behaviors remain unchanged

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate all 5 bugs BEFORE implementing fixes. Confirm or refute the root cause analysis.

**Test Plan**: Write tests that simulate each bug condition and observe failures on UNFIXED code.

**Test Cases**:

1. **Memory Leak Test**: 
   - Simulate login → logout → login cycle
   - Check if `syncWorkerInstance` is nullified after logout (will fail on unfixed code)
   - Check if event listeners are removed (will fail on unfixed code)
   - Check if Network listener is removed (will fail on unfixed code)

2. **Race Condition Test**:
   - Mock slow `getSession()` (500ms delay)
   - Check `isInitialized` immediately after `initializeAuth()` starts
   - Verify it returns `true` before session resolves (will fail on unfixed code)

3. **Network Check Test**:
   - Mock offline network status
   - Call `startSyncWorker()` and `forceGlobalSync()`
   - Verify they proceed without checking network (will fail on unfixed code)

4. **Quota Exceeded Test**:
   - Mock IndexedDB to throw `QuotaExceededError`
   - Call `enqueueSyncOperation()`
   - Verify error is not caught and user not notified (will fail on unfixed code)

5. **Cleanup Test**:
   - Mount component → start auth initialization
   - Unmount component during async operation
   - Remount component
   - Verify `hasInitializedRef` is still `true` and auth not re-initialized (will fail on unfixed code)

**Expected Counterexamples**:
- `syncWorkerInstance` remains in memory after logout with listeners attached
- `isInitialized` returns `true` before session resolves
- Sync operations start without network validation
- `QuotaExceededError` propagates silently without user notification
- `hasInitializedRef` not reset on unmount, preventing re-initialization

### Fix Checking

**Goal**: Verify that for all inputs where bug conditions hold, the fixed functions produce the expected behavior.

**Pseudocode:**
```
FOR ALL state WHERE isBugCondition1(state) DO
  result := stopSyncWorker_fixed()
  ASSERT syncWorkerInstance == null
  ASSERT allEventListenersRemoved()
  ASSERT networkListenerRemoved()
END FOR

FOR ALL state WHERE isBugCondition2(state) DO
  result := initializeAuth_fixed()
  ASSERT hasInitializedRef == true ONLY AFTER sessionResolved
END FOR

FOR ALL state WHERE isBugCondition3(state) DO
  result := startSyncWorker_fixed() OR forceGlobalSync_fixed()
  ASSERT networkCheckPerformed()
  ASSERT appropriateStatusSet() OR errorThrown()
END FOR

FOR ALL error WHERE isBugCondition4(error) DO
  result := enqueueSyncOperation_fixed()
  ASSERT errorCaught()
  ASSERT userNotified()
  ASSERT retryAttempted()
END FOR

FOR ALL state WHERE isBugCondition5(state) DO
  result := useEffectCleanup_fixed()
  ASSERT hasInitializedRef == false
  ASSERT syncWorkerStopped()
  ASSERT listenersRemoved()
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where bug conditions do NOT hold, the fixed functions produce the same result as the original functions.

**Pseudocode:**
```
FOR ALL operation WHERE NOT anyBugCondition(operation) DO
  ASSERT fixedFunction(operation) == originalFunction(operation)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for normal operations, then write property-based tests capturing that behavior.

**Test Cases**:

1. **Sync Worker Preservation**:
   - Verify queue processing continues every 2 seconds when online
   - Verify retry logic with exponential backoff works correctly
   - Verify status updates and pending count changes work correctly

2. **Auth Flow Preservation**:
   - Verify Google sign-in migrates local data correctly
   - Verify token refresh ensures worker is running
   - Verify sign-out clears database and UI state

3. **Network Handling Preservation**:
   - Verify network restoration wakes up worker on native platform
   - Verify offline status checking every 5 seconds

4. **Data Operations Preservation**:
   - Verify `forceGlobalSync()` flushes queue and fetches fresh data when online
   - Verify `flushSyncQueue()` throws error when offline with pending items
   - Verify optimistic updates apply immediately

### Unit Tests

- Test `stopSyncWorker()` nullifies instance and removes listeners
- Test `initializeAuth()` sets flag after async completion
- Test `startSyncWorker()` checks network before starting
- Test `forceGlobalSync()` validates network connectivity
- Test `enqueueSyncOperation()` catches quota exceeded errors
- Test useEffect cleanup resets refs and stops worker
- Test edge cases: multiple login/logout cycles, slow network, quota exceeded during retry

### Property-Based Tests

- Generate random login/logout sequences and verify no memory leaks
- Generate random network status changes and verify correct handling
- Generate random storage quota scenarios and verify graceful degradation
- Generate random component mount/unmount sequences and verify proper cleanup

### Integration Tests

- Test full auth flow with sync worker lifecycle
- Test offline → online transition with pending sync items
- Test storage quota exceeded during active sync operations
- Test component unmount during auth initialization with in-flight requests
- Test multiple devices syncing simultaneously with network interruptions
