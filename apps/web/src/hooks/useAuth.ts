import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/use-auth-store";
import { migrateLocalDataToAccount, initialSyncOnLogin, SyncWorker } from "@kemana/storage";

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

    useEffect(() => {
        // Only initialize once
        if (isInitialized) return;

        // Get initial session
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

        // Listen to auth changes
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
            }
        });

        return () => subscription.unsubscribe();
    }, [isInitialized, setSession, setInitialized]);

    const signInWithGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
        if (error) throw error;
    };

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    };

    return {
        session,
        user,
        isLoading,
        isInitialized,
        signInWithGoogle,
        signOut,
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
