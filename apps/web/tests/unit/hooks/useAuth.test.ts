import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/use-auth-store";
import { useKemanaStore } from "@/store/use-kemana-store";
import { migrateLocalDataToAccount, initialSyncOnLogin, loadEntries } from "@kemana/storage";

// Mock Supabase
let currentAuthCallback: any = null;
vi.mock("@/lib/supabase", () => {
    return {
        supabase: {
            auth: {
                getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
                onAuthStateChange: vi.fn((callback) => {
                    currentAuthCallback = callback;
                    return { data: { subscription: { unsubscribe: vi.fn() } } };
                }),
                signInWithOAuth: vi.fn().mockResolvedValue({ data: {}, error: null }),
                signOut: vi.fn().mockResolvedValue({ error: null })
            }
        }
    };
});

// Mock Storage
const mockFlushAll = vi.fn();
const mockStart = vi.fn();
const mockStop = vi.fn();
vi.mock("@kemana/storage", () => {
    return {
        migrateLocalDataToAccount: vi.fn().mockResolvedValue({ success: true, entriesMigrated: 0, rulesMigrated: 0 }),
        initialSyncOnLogin: vi.fn().mockResolvedValue({ success: true }),
        loadEntries: vi.fn().mockResolvedValue([{ id: "test-entry" }]),
        loadRules: vi.fn().mockResolvedValue([{ pattern: "test", match: "exact", category: "Test" }]),
        clearLocalDatabase: vi.fn().mockResolvedValue(undefined),
        clearLastSyncTime: vi.fn().mockResolvedValue(undefined),
        SyncWorker: vi.fn().mockImplementation(function() {
            return {
                start: mockStart,
                stop: mockStop,
                flushAll: mockFlushAll
            };
        })
    };
});

import { supabase } from "@/lib/supabase";

describe("useAuth Hook", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        currentAuthCallback = null;
        useAuthStore.setState({ session: null, user: null, isInitialized: false, isLoading: true });
        // Reset Zustand mock state
        useKemanaStore.setState({
            entries: [],
            rules: [],
            setEntries: vi.fn((entries) => useKemanaStore.setState({ entries })),
            setRules: vi.fn((rules) => useKemanaStore.setState({ rules }))
        } as any);
    });

    it("should initialize with null session and then resolve", async () => {
        const { result } = renderHook(() => useAuth());

        expect(result.current.isInitialized).toBe(false);
        expect(result.current.isLoading).toBe(true);

        // Wait for effect to run and initialize
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });

        expect(result.current.isInitialized).toBe(true);
        expect(result.current.session).toBeNull();
        expect(result.current.user).toBeNull();
    });

    it("should call signInWithOAuth with google provider", async () => {
        const { result } = renderHook(() => useAuth());

        await act(async () => {
            await result.current.signInWithGoogle();
        });

        expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
            provider: "google",
            options: {
                redirectTo: expect.any(String)
            }
        });
    });

    it("should update Zustand store after SIGNED_IN and sync success", async () => {
        renderHook(() => useAuth());

        // Wait for initialize
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });

        // Trigger SIGNED_IN event
        await act(async () => {
            if (currentAuthCallback) {
                await currentAuthCallback("SIGNED_IN", { user: { id: "user-123" } });
            }
        });

        // Verify the store was updated with reloaded data from mock storage
        const store = useKemanaStore.getState();
        expect(store.entries).toEqual([{ id: "test-entry" }]);
        expect(store.rules).toEqual([{ pattern: "test", match: "exact", category: "Test" }]);
        
        // Output from sync worker should happen
        expect(mockStart).toHaveBeenCalledWith("user-123");
    });

    it("should handle forceSignOut, clear local DB, and call supabase.auth.signOut", async () => {
        const { result } = renderHook(() => useAuth());

        // We first need a session so the worker is instantiated
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0)); // init
            if (currentAuthCallback) {
                await currentAuthCallback("SIGNED_IN", { user: { id: "user-123" } });
            }
        });

        await act(async () => {
            await result.current.forceSignOut();
        });

        expect(supabase.auth.signOut).toHaveBeenCalled();
    });
    it("should handle migration error gracefully and continue to initial sync", async () => {
        vi.mocked(migrateLocalDataToAccount).mockResolvedValueOnce({ success: false, error: new Error('Migration failed') } as any);
        
        renderHook(() => useAuth());

        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
            if (currentAuthCallback) {
                await currentAuthCallback("SIGNED_IN", { user: { id: "user-123" } });
            }
        });

        // Even though migration failed, it should have proceeded to sync and update store
        const store = useKemanaStore.getState();
        expect(store.entries).toEqual([{ id: "test-entry" }]);
        expect(mockStart).toHaveBeenCalledWith("user-123");
    });

    it("should handle initial sync failure and not update Zustand store", async () => {
        vi.mocked(initialSyncOnLogin).mockResolvedValueOnce({ success: false, error: new Error('Sync failed') } as any);
        
        renderHook(() => useAuth());

        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
            if (currentAuthCallback) {
                await currentAuthCallback("SIGNED_IN", { user: { id: "user-fail" } });
            }
        });

        // Store should remain empty because sync failed
        const store = useKemanaStore.getState();
        expect(store.entries).toEqual([]);
        
        // Worker should STILL start
        expect(mockStart).toHaveBeenCalledWith("user-fail");
    });

    it("should handle data reload failure safely", async () => {
        vi.mocked(loadEntries).mockRejectedValueOnce(new Error("IDB read failed"));
        
        renderHook(() => useAuth());

        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
            if (currentAuthCallback) {
                await currentAuthCallback("SIGNED_IN", { user: { id: "user-reload-fail" } });
            }
        });

        // Store should remain empty because data reload failed
        const store = useKemanaStore.getState();
        expect(store.entries).toEqual([]);
    });

    it("should handle flushSyncQueue gracefully if flushAll throws an error", async () => {
        // Mock flushAll to throw
        mockFlushAll.mockRejectedValueOnce(new Error("Network offline"));
        
        const { result } = renderHook(() => useAuth());

        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0)); 
            if (currentAuthCallback) {
                await currentAuthCallback("SIGNED_IN", { user: { id: "user-123" } });
            }
        });

        // flushSyncQueue should throw, not swallow the error
        await expect(
            act(async () => {
                await result.current.flushSyncQueue();
            })
        ).rejects.toThrow("Network offline");

        expect(mockFlushAll).toHaveBeenCalled();
    });

    it("should restart sync worker upon TOKEN_REFRESHED", async () => {
        renderHook(() => useAuth());

        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0)); 
            if (currentAuthCallback) {
                // Not SIGNED_IN, just TOKEN_REFRESHED
                await currentAuthCallback("TOKEN_REFRESHED", { user: { id: "user-refresh" } });
            }
        });

        // Worker should start
        expect(mockStart).toHaveBeenCalledWith("user-refresh");
    });
});
