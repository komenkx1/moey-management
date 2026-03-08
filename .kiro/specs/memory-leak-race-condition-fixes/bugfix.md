# Bugfix Requirements Document

## Introduction

The KeMana expense tracking app has several critical memory leaks and race conditions that affect stability and reliability. These bugs occur in the authentication initialization flow and sync worker lifecycle management, causing memory leaks, race conditions, and silent failures that degrade app performance and user experience over time.

The primary issues are:
1. Sync worker continues running after logout, consuming resources
2. Auth initialization race condition causes premature "initialized" state
3. Missing network status checks before sync operations
4. Unhandled IndexedDB quota exceeded errors causing silent data loss
5. Incomplete useEffect cleanup causing memory leaks

## Bug Analysis

### Current Behavior (Defect)

#### 1. Memory Leak in Sync Worker

1.1 WHEN user logs out via `forceSignOut()` THEN the system calls `stopSyncWorker()` which sets `isRunning = false` but does NOT nullify the global `syncWorkerInstance` variable

1.2 WHEN user logs out THEN the system leaves the `syncWorkerInstance` object in memory with all its event listeners (`onStatusChange`, `onPendingCountChange`, `onLastSyncTimeChange`) still attached

1.3 WHEN user logs out and logs back in THEN the system creates a new sync worker instance without cleaning up the old one, causing multiple worker instances to accumulate in memory

1.4 WHEN sync worker is stopped THEN the system does NOT remove the Network event listener registered via `Network.addListener('networkStatusChange', ...)`, causing the listener to persist after logout

#### 2. Race Condition in Auth Initialization

2.1 WHEN `initializeAuth()` is called THEN the system sets `hasInitializedRef.current = true` at the start of the function, before `await supabase.auth.getSession()` completes

2.2 WHEN `getSession()` is slow or fails THEN the system reports `isInitialized = true` to the UI even though the session is not yet ready

2.3 WHEN UI components check `isInitialized` during the async gap THEN the system allows components to proceed with operations that require session data, causing "session not ready" errors

#### 3. Missing Network Status Check

3.1 WHEN `startSyncWorker()` is called during sign-in or token refresh THEN the system starts the sync worker without checking if the device is online

3.2 WHEN sync worker starts while offline THEN the system attempts sync operations that immediately fail, causing unnecessary error logs and failed status updates

3.3 WHEN `forceGlobalSync()` is called THEN the system attempts `initialSyncOnLogin()` without checking network connectivity first, causing sync failures when offline

#### 4. IndexedDB Quota Exceeded Handling

3.4 WHEN IndexedDB operations exceed browser storage quota THEN the system does NOT catch the `QuotaExceededError` exception

3.5 WHEN quota exceeded error occurs during `db.entries.put()` or `db.syncQueue.add()` THEN the system allows the error to propagate silently, causing data loss without user notification

3.6 WHEN quota exceeded error occurs in `enqueueSyncOperation()` THEN the system fails to save the entry locally but does NOT inform the user or retry with a different strategy

#### 5. Missing Cleanup in useEffect

3.7 WHEN the auth initialization useEffect unmounts THEN the system sets `mounted = false` but does NOT clean up the `hasInitializedRef.current` flag

3.8 WHEN component unmounts during async operations THEN the system does NOT cancel in-flight promises or cleanup event listeners, potentially causing state updates on unmounted components

3.9 WHEN component unmounts THEN the system does NOT stop the sync worker or remove network listeners, causing memory leaks

### Expected Behavior (Correct)

#### 1. Proper Sync Worker Cleanup

2.1 WHEN user logs out via `forceSignOut()` THEN the system SHALL call `stopSyncWorker()` which sets `isRunning = false` AND nullifies the global `syncWorkerInstance` variable to `null`

2.2 WHEN user logs out THEN the system SHALL remove all event listeners from the sync worker instance before nullifying it

2.3 WHEN user logs out and logs back in THEN the system SHALL ensure only one sync worker instance exists at any time

2.4 WHEN sync worker is stopped THEN the system SHALL remove the Network event listener to prevent memory leaks

#### 2. Correct Auth Initialization Timing

2.5 WHEN `initializeAuth()` is called THEN the system SHALL set `hasInitializedRef.current = true` ONLY after `await supabase.auth.getSession()` completes successfully

2.6 WHEN `getSession()` fails THEN the system SHALL still set `isInitialized = true` but SHALL NOT set `hasInitializedRef.current = true` until the next successful attempt

2.7 WHEN UI components check `isInitialized` THEN the system SHALL guarantee that the session state is fully resolved (either present or absent)

#### 3. Network Status Validation

2.8 WHEN `startSyncWorker()` is called THEN the system SHALL check network connectivity before starting the worker

2.9 WHEN sync worker starts while offline THEN the system SHALL set status to 'offline' and wait for network restoration before attempting sync operations

2.10 WHEN `forceGlobalSync()` is called THEN the system SHALL check network connectivity first and throw a descriptive error if offline

#### 4. Graceful Quota Exceeded Handling

2.11 WHEN IndexedDB operations exceed browser storage quota THEN the system SHALL catch the `QuotaExceededError` exception

2.12 WHEN quota exceeded error occurs THEN the system SHALL notify the user with a clear error message in Indonesian: "Penyimpanan browser penuh. Silakan hapus data lama atau bersihkan cache browser."

2.13 WHEN quota exceeded error occurs in `enqueueSyncOperation()` THEN the system SHALL attempt to clear old synced items from the sync queue and retry the operation once

#### 5. Complete useEffect Cleanup

2.14 WHEN the auth initialization useEffect unmounts THEN the system SHALL reset `hasInitializedRef.current` to `false`

2.15 WHEN component unmounts during async operations THEN the system SHALL use the `mounted` flag to prevent state updates and SHALL cleanup all resources

2.16 WHEN component unmounts THEN the system SHALL stop the sync worker and remove all network listeners to prevent memory leaks

### Unchanged Behavior (Regression Prevention)

#### Sync Worker Functionality

3.1 WHEN sync worker is running and online THEN the system SHALL CONTINUE TO process sync queue items every 2 seconds

3.2 WHEN sync worker encounters a failed item THEN the system SHALL CONTINUE TO retry with exponential backoff up to 10 times

3.3 WHEN sync worker successfully syncs an item THEN the system SHALL CONTINUE TO update the last sync time and notify pending count changes

#### Auth Flow

3.4 WHEN user signs in with Google THEN the system SHALL CONTINUE TO migrate local data and perform initial sync

3.5 WHEN auth token is refreshed THEN the system SHALL CONTINUE TO ensure sync worker is running

3.6 WHEN user signs out THEN the system SHALL CONTINUE TO clear local database and UI state

#### Network Handling

3.7 WHEN network is restored on native platform THEN the system SHALL CONTINUE TO wake up the sync worker via `Network.addListener` callback

3.8 WHEN sync worker is offline THEN the system SHALL CONTINUE TO check network status every 5 seconds

#### Data Operations

3.9 WHEN `forceGlobalSync()` is called while online THEN the system SHALL CONTINUE TO flush local queue, fetch fresh data, and update UI

3.10 WHEN `flushSyncQueue()` is called before logout THEN the system SHALL CONTINUE TO throw "PENDING_OFFLINE_DATA" error if offline with pending items

3.11 WHEN entries or rules are enqueued THEN the system SHALL CONTINUE TO apply optimistic local updates immediately
