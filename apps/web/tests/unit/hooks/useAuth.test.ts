import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/use-auth-store";

// Mock Supabase
vi.mock("@/lib/supabase", () => {
    return {
        supabase: {
            auth: {
                getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
                onAuthStateChange: vi.fn().mockReturnValue({
                    data: { subscription: { unsubscribe: vi.fn() } }
                }),
                signInWithOAuth: vi.fn().mockResolvedValue({ data: {}, error: null }),
                signOut: vi.fn().mockResolvedValue({ error: null })
            }
        }
    };
});

import { supabase } from "@/lib/supabase";

describe("useAuth Hook", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useAuthStore.setState({ session: null, user: null, isInitialized: false, isLoading: true });
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

    it("should handle signOut and call supabase.auth.signOut", async () => {
        const { result } = renderHook(() => useAuth());

        await act(async () => {
            await result.current.signOut();
        });

        expect(supabase.auth.signOut).toHaveBeenCalled();
    });
});
