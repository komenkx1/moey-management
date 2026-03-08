import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/use-auth-store";
import { useKemanaStore } from "@/store/use-kemana-store";
import { migrateLocalDataToAccount, initialSyncOnLogin, SyncWorker, loadEntries, loadRules, clearLocalDatabase } from "@kemana/storage";
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { isNativePlatform } from '@/lib/capacitor';
import { Network } from '@capacitor/network';

import CryptoJS from 'crypto-js';

// Global sync worker instance
let syncWorkerInstance: SyncWorker | null = null;

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
        // Get initial session only once across strict mode re-renders
        if (!hasInitializedRef.current) {
            hasInitializedRef.current = true;
            supabase.auth.getSession().then(({ data: { session }, error }) => {
                if (error) {
                    console.error("Error getting session:", error);
                }
                setSession(session);
                setInitialized(true);

                // If already logged in, start sync worker and pull fresh remote data
                if (session?.user) {
                    console.log('🔄 Starting sync worker & fetching latest cloud data for existing session');
                    startSyncWorker(session.user.id);
                    
                    // Fire-and-forget background synchronization to keep multi-device data completely fresh
                    useKemanaStore.getState().setSyncStatus('syncing');
                    initialSyncOnLogin(session.user.id, supabase)
                        .then(async (result) => {
                            if (result.success) {
                                const [freshEntries, freshRules] = await Promise.all([
                                    loadEntries(),
                                    loadRules()
                                ]);
                                const store = useKemanaStore.getState();
                                store.setEntries(freshEntries);
                                store.setRules(freshRules);
                                store.setSyncStatus('synced');
                                store.setLastSyncTime(Date.now());
                            } else {
                                useKemanaStore.getState().setSyncStatus('failed');
                            }
                        })
                        .catch(() => {
                            useKemanaStore.getState().setSyncStatus('failed');
                        });
                }
            });
        }

        // Listen to auth changes permanently
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('🔐 Auth state changed:', event, session?.user?.id);
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
                            console.log(
                                `✓ Data lokal berhasil di-backup: ${migrationResult.entriesMigrated} transaksi, ${migrationResult.rulesMigrated} aturan`
                            );
                        }
                    } else {
                        console.error("Migration failed:", migrationResult.error);
                    }

                    // Then, perform initial sync to get server data
                    const syncResult = await initialSyncOnLogin(
                        session.user.id,
                        supabase
                    );

                    if (syncResult.success) {
                        console.log("✓ Data tersinkronisasi");
                        // Reload merged data from IndexedDB into UI state
                        try {
                            const [freshEntries, freshRules] = await Promise.all([
                                loadEntries(),
                                loadRules()
                            ]);
                            const store = useKemanaStore.getState();
                            store.setEntries(freshEntries);
                            store.setRules(freshRules);
                            console.log(`✓ UI diperbarui: ${freshEntries.length} transaksi, ${freshRules.length} aturan`);
                        } catch (reloadError) {
                            console.error("Failed to reload data into UI:", reloadError);
                        }
                    } else {
                        console.error("Initial sync failed:", syncResult.error);
                    }

                    // Start sync worker
                    console.log('🔄 Starting sync worker after sign in');
                    startSyncWorker(session.user.id);

                } catch (error) {
                    console.error("Auth migration/sync error:", error);
                }
            }

            // Handle token refresh - ensure worker is running
            if (event === "TOKEN_REFRESHED" && session?.user) {
                console.log('🔄 Token refreshed, ensuring worker is running');
                startSyncWorker(session.user.id);
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
                    console.log('🔄 UI reloaded after sign out:', freshEntries.length, 'entries');
                } catch (reloadError) {
                    console.error('Failed to reload after sign out:', reloadError);
                }
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []); // Empty dependency array so it only mounts/unmounts once 

    const signInWithGoogle = async () => {
        if (isNativePlatform()) {
            console.log("📱 Using Native Google Auth");
            
            // Initialize the Google Auth plugin
            GoogleAuth.initialize({
                scopes: ['profile', 'email'],
                grantOfflineAccess: true,
            });
            
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
            console.log("🌐 Using Web Google OAuth");
            const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
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
            console.log('✓ Sync queue flushed before logout');
        }
    };

    /**
     * Performs a full 2-way sync: flushes local queue up to the cloud, 
     * then pulls latest cloud state down to IndexedDB and refreshes UI.
     */
    const forceGlobalSync = async () => {
        if (!user) throw new Error("Pengguna belum login.");

        // 1. Flush local queue up to cloud
        if (syncWorkerInstance) {
            await syncWorkerInstance.flushAll();
        }

        useKemanaStore.getState().setSyncStatus('syncing');

        try {
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
            console.log(`✓ Global Sync Complete: UI updated (${freshEntries.length} entries)`);
            
        } catch (error: any) {
            useKemanaStore.getState().setSyncStatus('failed');
            throw error;
        }
    };

    /**
     * Forcibly logs out, clears local UI memory, drops the Local Database to prevent leaks,
     * and signs out of the Supabase Authenticator.
     */
    const forceSignOut = async () => {
        try {
            await clearLocalDatabase();
            
            const store = useKemanaStore.getState();
            store.setEntries([]);
            store.setRules([]);
            console.log("🧹 UI Memory Cleared");
        } catch (dbError) {
            console.error("Failed to clear local database upon signout:", dbError);
        }

        if (isNativePlatform()) {
            try {
                // Prevent Swift fatal crash by ensuring Native SDK is initialized
                GoogleAuth.initialize({
                    scopes: ['profile', 'email'],
                    grantOfflineAccess: true,
                });
                await GoogleAuth.signOut();
            } catch (googleError) {
                console.warn("⚠️ Non-fatal: Failed to sign out of native Google SDK:", googleError);
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
 */
function startSyncWorker(userId: string) {
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
        let isCurrentlyOnline = true;

        if (isNativePlatform()) {
            // Initial check
            Network.getStatus().then(status => {
                isCurrentlyOnline = status.connected;
            });
            
            // Listen for changes
            Network.addListener('networkStatusChange', (status) => {
                isCurrentlyOnline = status.connected;
                if (status.connected && syncWorkerInstance) {
                    console.log('📶 Network restored, waking up sync worker...');
                    syncWorkerInstance.wakeup();
                }
            });
            
            syncWorkerInstance.isOnlineFn = async () => isCurrentlyOnline;
        } else {
            syncWorkerInstance.isOnlineFn = async () => navigator.onLine;
        }
    }
    syncWorkerInstance.start(userId);
}

/**
 * Stop the sync worker
 */
function stopSyncWorker() {
    if (syncWorkerInstance) {
        syncWorkerInstance.stop();
    }
}

/**
 * Get sync worker instance (for debugging)
 */
export function getSyncWorker(): SyncWorker | null {
    return syncWorkerInstance;
}
