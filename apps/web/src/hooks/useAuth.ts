import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/use-auth-store";

export function useAuth() {
    const {
        session,
        user,
        isLoading,
        isInitialized,
        setSession,
        setInitialized
    } = useAuthStore();

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
        });

        // Listen to auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
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
