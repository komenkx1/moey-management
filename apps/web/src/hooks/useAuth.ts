import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/use-auth-store";
import { useKemanaStore } from "@/store/use-kemana-store";
import { migrateLocalDataToAccount, initialSyncOnLogin, SyncWorker, loadEntries, loadRules, clearLocalDatabase, clearLastSyncTime } from "@kemana/storage";
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { isNativeAndroid, isNativePlatform } from '@/lib/capacitor';
import { Network } from '@capacitor/network';
import { checkRateLimit } from '@/lib/rate-limiter';
import { logInvalidAuth, logUnauthorizedAccess } from '@/lib/security-monitoring';
import { buildAuthCallbackUrl } from '@/lib/navigation-safety';

import CryptoJS from 'crypto-js';

// Global sync worker instance
let syncWorkerInstance: SyncWorker | null = null;

// Helper function to log only in development
const devLog = (...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
        console.log(...args);
    }
};

const devError = (...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
        console.error(...args);
    }
};

const devWarn = (...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
        console.warn(...args);
    }
};

const getNativeGoogleAuthInitOptions = () => {
    const options: {
        clientId?: string;
        scopes: string[];
        grantOfflineAccess: boolean;
    } = {
        scopes: ['profile', 'email'],
        grantOfflineAccess: true,
    };

    // The Android plugin incorrectly uses `clientId` for offline access.
    // Force the Web OAuth client here so Google can mint an ID token/auth code.
    if (isNativeAndroid()) {
        const webClientId = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID;
        if (!webClientId) {
            throw new Error("Missing NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID for Android Google Sign-In.");
        }
        options.clientId = webClientId;
    }

    return options;
};

export function useAuth() {
    const {
        session,
        user,
        isLoading,
        isInitialized,
        setSession,
        setInitialized
    } = useAuthStore();

    const migrationAttemptedRef = useRef(false);

    const hasInitializedRef = useRef(false);

    useEffect(() => {
        let mounted = true;

        const initializeAuth = async () => {
            if (hasInitializedRef.current) return;

            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) {
                    devError("Error getting session:", error);
                }
                
                // Set initialized flag AFTER async operation completes
                // This prevents race conditions where UI components check isInitialized
                // before session data is ready. Guarantees session state is fully resolved.
                hasInitializedRef.current = true;
                
                if (mounted) {
                    setSession(session);
                    setInitialized(true);
                }

                // If already logged in, start sync worker and pull fresh remote data
                if (session?.user && mounted) {
                    devLog('🔄 Starting sync worker & fetching latest cloud data for existing session');
                    await startSyncWorker(session.user.id);
                    
                    // Fire-and-forget background synchronization to keep multi-device data completely fresh
                    useKemanaStore.getState().setSyncStatus('syncing');
                    const result = await initialSyncOnLogin(session.user.id, supabase);
                    if (result.success && mounted) {
                        const [freshEntries, freshRules] = await Promise.all([
                            loadEntries(),
                            loadRules()
                        ]);
                        const store = useKemanaStore.getState();
                        store.setEntries(freshEntries);
                        store.setRules(freshRules);
                        store.setSyncStatus('synced');
                        store.setLastSyncTime(Date.now());
                    } else if (mounted) {
                        useKemanaStore.getState().setSyncStatus('failed');
                    }
                }
            } catch (err) {
                 // Set initialized flag even on error
                 hasInitializedRef.current = true;
                 if (mounted) {
                     setInitialized(true); 
                 }
            }
        };

        initializeAuth();
        
        return () => {
             mounted = false;
             // Reset initialization flag to allow proper re-initialization on remount
             // This prevents stale state when component unmounts during async operations
             hasInitializedRef.current = false;
             // NOTE: Do NOT stop sync worker here - it should persist across component remounts
             // Worker is only stopped on explicit logout (forceSignOut) or auth state change
        };
    }, []);

        // Listen to auth changes permanently
        useEffect(() => {
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
            devLog('🔐 Auth state changed:', event, session?.user?.id);
            setSession(session);

            // Handle sign in - migrate local data
            if (event === "SIGNED_IN" && session?.user && !migrationAttemptedRef.current) {
                migrationAttemptedRef.current = true;
                
                try {
                    // First, migrate any local anonymous data
                    const migrationResult = await migrateLocalDataToAccount(
                        session.user.id,
                        supabase
                    );

                    if (migrationResult.success) {
                        const totalMigrated = migrationResult.entriesMigrated + migrationResult.rulesMigrated;
                        if (totalMigrated > 0) {
                            devLog(
                                `✓ Data lokal berhasil di-backup: ${migrationResult.entriesMigrated} transaksi, ${migrationResult.rulesMigrated} aturan`
                            );
                        }
                    } else {
                        devError("Migration failed:", migrationResult.error);
                    }

                    // Then, perform initial sync to get server data
                    const syncResult = await initialSyncOnLogin(
                        session.user.id,
                        supabase
                    );

                    if (syncResult.success) {
                        devLog("✓ Data tersinkronisasi");
                        // Reload merged data from IndexedDB into UI state
                        try {
                            const [freshEntries, freshRules] = await Promise.all([
                                loadEntries(),
                                loadRules()
                            ]);
                            const store = useKemanaStore.getState();
                            store.setEntries(freshEntries);
                            store.setRules(freshRules);
                            devLog(`✓ UI diperbarui: ${freshEntries.length} transaksi, ${freshRules.length} aturan`);
                        } catch (reloadError) {
                            devError("Failed to reload data into UI:", reloadError);
                        }
                    } else {
                        devError("Initial sync failed:", syncResult.error);
                    }

                    // Start sync worker
                    devLog('🔄 Starting sync worker after sign in');
                    await startSyncWorker(session.user.id);

                } catch (error) {
                    devError("Auth migration/sync error:", error);
                }
            }

            // Handle token refresh - ensure worker is running
            if (event === "TOKEN_REFRESHED" && session?.user) {
                devLog('🔄 Token refreshed, ensuring worker is running');
                await startSyncWorker(session.user.id);
            }

            // Reset migration flag on sign out
            if (event === "SIGNED_OUT") {
                migrationAttemptedRef.current = false;
                stopSyncWorker();
                
                // Reload from IndexedDB to ensure UI reflects the true DB state
                // This prevents race conditions where scheduled background saves
                // from previous state overwrite newly added entries
                try {
                    const [freshEntries, freshRules] = await Promise.all([
                        loadEntries(),
                        loadRules()
                    ]);
                    const store = useKemanaStore.getState();
                    store.setEntries(freshEntries);
                    store.setRules(freshRules);
                    devLog('🔄 UI reloaded after sign out:', freshEntries.length, 'entries');
                } catch (reloadError) {
                    devError('Failed to reload after sign out:', reloadError);
                }
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []); // Empty deps to listen once // Empty dependency array so it only mounts/unmounts once 

    const signInWithGoogle = async () => {
        // Check rate limit for auth endpoint
        const { allowed, retryAfter } = checkRateLimit('auth');
        if (!allowed) {
            throw new Error(`Too many login attempts. Please try again in ${retryAfter} seconds.`);
        }

        if (isNativePlatform()) {
            devLog("📱 Using Native Google Auth");
            
            // Initialize the Google Auth plugin
            await GoogleAuth.initialize(getNativeGoogleAuthInitOptions());
            
            const googleUser = await GoogleAuth.signIn();
            
            if (!googleUser.authentication.idToken) {
                throw new Error("Google Login failed: No ID Token returned.");
            }
            
            // Pass the ID Token directly to Supabase without a nonce, 
            // as the old @codetrix-studio plugin does not support nonce injection.
            const { error } = await supabase.auth.signInWithIdToken({
                provider: "google",
                token: googleUser.authentication.idToken,
            });
            if (error) throw error;
            
        } else {
            devLog("🌐 Using Web Google OAuth");
            const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo: buildAuthCallbackUrl(window.location.origin),
                },
            });
            if (error) throw error;
        }
    };

    /**
     * Attempts to flush the sync queue before sign out.
     * If this throws "PENDING_OFFLINE_DATA", the UI must warn the user before proceeding.
     */
    const flushSyncQueue = async () => {
        if (syncWorkerInstance) {
            await syncWorkerInstance.flushAll();
            devLog('✓ Sync queue flushed before logout');
        }
    };

    /**
     * Performs a full 2-way sync: flushes local queue up to the cloud, 
     * then pulls latest cloud state down to IndexedDB and refreshes UI.
     * Validates network connectivity before starting to prevent failures when offline.
     */
    const forceGlobalSync = async () => {
        if (!user) throw new Error("Pengguna belum login.");

        // Check rate limit for sync endpoint
        const { allowed, retryAfter } = checkRateLimit('sync');
        if (!allowed) {
            throw new Error(`Too many sync requests. Please try again in ${retryAfter} seconds.`);
        }

        // Check network first to prevent wasted sync attempts when offline
        // Throws descriptive error to inform user of connectivity requirement
        const isOnline = isNativePlatform() 
            ? (await Network.getStatus()).connected 
            : navigator.onLine;
        
        if (!isOnline) {
            throw new Error("Tidak dapat sinkronisasi saat offline. Silakan periksa koneksi internet Anda.");
        }

        // CRITICAL: Pause sync worker to prevent race conditions during global sync
        // Without this, new items could be added to queue between flush and fetch,
        // causing them to be overwritten by stale server data
        const wasRunning = syncWorkerInstance?.isRunning || false;
        if (syncWorkerInstance && wasRunning) {
            syncWorkerInstance.stop();
        }

        useKemanaStore.getState().setSyncStatus('syncing');

        try {
            // 1. Flush local queue up to cloud
            if (syncWorkerInstance) {
                await syncWorkerInstance.flushAll();
            }

            // 2. Fetch all fresh data down from cloud and merge into IndexedDB
            const syncResult = await initialSyncOnLogin(user.id, supabase);
            if (!syncResult.success) {
                throw new Error(syncResult.error);
            }

            // 3. Rebuild UI memory seamlessly
            const [freshEntries, freshRules] = await Promise.all([
                loadEntries(),
                loadRules()
            ]);
            
            const store = useKemanaStore.getState();
            store.setEntries(freshEntries);
            store.setRules(freshRules);
            
            // Artificial delay to show the nice animation and prevent flashing
            await new Promise(resolve => setTimeout(resolve, 800));
            
            useKemanaStore.getState().setSyncStatus('synced');
            useKemanaStore.getState().setLastSyncTime(Date.now());
            devLog(`✓ Global Sync Complete: UI updated (${freshEntries.length} entries)`);
            
            // Resume sync worker if it was running before
            if (syncWorkerInstance && wasRunning) {
                syncWorkerInstance.start(user.id);
            }
            
        } catch (error: any) {
            useKemanaStore.getState().setSyncStatus('failed');
            
            // Resume sync worker even on error if it was running before
            if (syncWorkerInstance && wasRunning) {
                syncWorkerInstance.start(user.id);
            }
            
            throw error;
        }
    };

    /**
     * Forcibly logs out, clears local UI memory, drops the Local Database to prevent leaks,
     * and signs out of the Supabase Authenticator.
     */
    const forceSignOut = async () => {
        try {
            if (user?.id) {
                await clearLastSyncTime(user.id);
            }
            await clearLocalDatabase();
            
            const store = useKemanaStore.getState();
            store.setEntries([]);
            store.setRules([]);
            devLog("🧹 UI Memory Cleared");
        } catch (dbError) {
            devError("Failed to clear local database upon signout:", dbError);
        }

        if (isNativePlatform()) {
            try {
                // Prevent Swift fatal crash by ensuring Native SDK is initialized
                await GoogleAuth.initialize(getNativeGoogleAuthInitOptions());
                await GoogleAuth.signOut();
            } catch (googleError) {
                devWarn("⚠️ Non-fatal: Failed to sign out of native Google SDK:", googleError);
            }
        }

        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    };

    return {
        session,
        user,
        isLoading,
        isInitialized,
        signInWithGoogle,
        flushSyncQueue,
        forceGlobalSync,
        forceSignOut,
    };
}

/**
 * Start the sync worker
 * Validates network connectivity before starting to prevent immediate failures when offline
 */
async function startSyncWorker(userId: string) {
    // Check network status first to prevent wasted resource allocation when offline
    const isOnline = isNativePlatform() 
        ? (await Network.getStatus()).connected 
        : navigator.onLine;
    
    if (!syncWorkerInstance) {
        syncWorkerInstance = new SyncWorker(supabase);
        
        // Link internal sync events to the React global store
        syncWorkerInstance.onStatusChange = (status) => {
            useKemanaStore.getState().setSyncStatus(status);
        };
        syncWorkerInstance.onPendingCountChange = (count) => {
            useKemanaStore.getState().setPendingSyncCount(count);
        };
        syncWorkerInstance.onLastSyncTimeChange = (time) => {
            useKemanaStore.getState().setLastSyncTime(time);
        };

        // Use a cached online status to prevent polling the native bridge every second
        let isCurrentlyOnline = isOnline;

        if (isNativePlatform()) {
            // Initial check
            Network.getStatus().then(status => {
                isCurrentlyOnline = status.connected;
            });
            
            // Listen for changes
            Network.addListener('networkStatusChange', (status) => {
                isCurrentlyOnline = status.connected;
                if (status.connected && syncWorkerInstance) {
                    devLog('📶 Network restored, waking up sync worker...');
                    syncWorkerInstance.wakeup();
                }
            });
            
            syncWorkerInstance.isOnlineFn = async () => isCurrentlyOnline;
        } else {
            syncWorkerInstance.isOnlineFn = async () => navigator.onLine;
        }
    }
    
    // Set offline status if not online
    if (!isOnline) {
        useKemanaStore.getState().setSyncStatus('offline');
    }
    
    syncWorkerInstance.start(userId);
}

/**
 * Stop the sync worker
 * Performs complete cleanup to prevent memory leaks:
 * - Removes all event listener callbacks
 * - Nullifies global instance for garbage collection
 * - Removes native platform network listeners
 */
function stopSyncWorker() {
    if (syncWorkerInstance) {
        syncWorkerInstance.stop();
        
        // Cleanup event listeners to prevent memory leaks
        // These callbacks hold references that prevent garbage collection
        syncWorkerInstance.onStatusChange = undefined;
        syncWorkerInstance.onPendingCountChange = undefined;
        syncWorkerInstance.onLastSyncTimeChange = undefined;
        
        // Nullify instance to allow garbage collection
        // Without this, the instance persists in memory after logout
        syncWorkerInstance = null;
    }
    
    // Remove network listener on native platforms
    // Capacitor Network listeners must be explicitly removed to prevent leaks
    if (isNativePlatform()) {
        Network.removeAllListeners();
    }
}

/**
 * Get sync worker instance (for debugging)
 */
export function getSyncWorker(): SyncWorker | null {
    return syncWorkerInstance;
}
