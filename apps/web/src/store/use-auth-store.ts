import { create } from "zustand";
import { Session, User } from "@supabase/supabase-js";

interface AuthState {
    session: Session | null;
    user: User | null;
    isLoading: boolean;
    isInitialized: boolean;
    setSession: (session: Session | null) => void;
    setUser: (user: User | null) => void;
    setLoading: (isLoading: boolean) => void;
    setInitialized: (isInitialized: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    session: null,
    user: null,
    isLoading: true,
    isInitialized: false,
    setSession: (session) => set({ session, user: session?.user || null }),
    setUser: (user) => set({ user }),
    setLoading: (isLoading) => set({ isLoading }),
    setInitialized: (isInitialized) => set({ isInitialized, isLoading: false }),
}));
