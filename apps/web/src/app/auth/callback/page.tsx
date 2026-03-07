"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Supabase will automatically handle the callback
        // Just wait for the session to be set
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Auth callback error:", error);
          router.push("/?error=auth_failed");
          return;
        }

        // Redirect to home
        router.push("/");
      } catch (error) {
        console.error("Unexpected auth callback error:", error);
        router.push("/?error=auth_failed");
      }
    };

    // Small delay to let Supabase process the callback
    const timer = setTimeout(handleCallback, 500);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 text-lg">Menyelesaikan login...</div>
        <div className="text-sm text-text-tertiary">Mohon tunggu sebentar</div>
      </div>
    </div>
  );
}
