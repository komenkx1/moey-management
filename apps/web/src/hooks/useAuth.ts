import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/use-auth-store";
import { useKemanaStore } from "@/store/use-kemana-store";
import { migrateLocalDataToAccount, initialSyncOnLogin, SyncWorker, loadEntries, loadRules, clearLocalDatabase } from "@kemana/storage";

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

                // If already logged in, start sync worker
                if (session?.user) {
                    console.log('🔄 Starting sync worker for existing session');
                    startSyncWorker(session.user.id);
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
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
        if (error) throw error;
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
        forceSignOut,
    };
}

/**
 * Start the sync worker
 */
function startSyncWorker(userId: string) {
    if (!syncWorkerInstance) {
        syncWorkerInstance = new SyncWorker(supabase);
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
