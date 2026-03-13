"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/hooks/useTheme";
import { APP_HOME_PATH } from "@/lib/navigation-safety";

type CallbackState = "loading" | "success" | "error";

export default function AuthCallbackPage() {
  useTheme(); // Initialize theme mode based on cache so the screen isn't glaring white
  const router = useRouter();
  const [state, setState] = useState<CallbackState>("loading");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Animate progress bar
    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressTimer);
          return 90; // Hold at 90% until redirect
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    const handleCallback = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Auth callback error:", error);
          setState("error");
          clearInterval(progressTimer);
          return;
        }

        if (!session) {
          // Try exchanging the hash for a session
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get("access_token");
          if (!accessToken) {
            // No token available — might need more time or it's the code flow
            // Wait for onAuthStateChange to handle it
            await new Promise((resolve) => setTimeout(resolve, 2000));
            const retry = await supabase.auth.getSession();
            if (!retry.data.session) {
              setState("error");
              clearInterval(progressTimer);
              return;
            }
          }
        }

        // Success — complete the progress and redirect
        setState("success");
        setProgress(100);
        clearInterval(progressTimer);

        // Brief delay for the animation to feel complete
        await new Promise((resolve) => setTimeout(resolve, 600));
        // security-reviewed: safe-internal-navigation
        router.push(APP_HOME_PATH);
      } catch (error) {
        console.error("Unexpected auth callback error:", error);
        setState("error");
        clearInterval(progressTimer);
      }
    };

    const timer = setTimeout(handleCallback, 300);
    return () => {
      clearTimeout(timer);
      clearInterval(progressTimer);
    };
  }, [router]);

  const handleRetry = () => {
    // security-reviewed: safe-internal-navigation
    window.location.href = APP_HOME_PATH;
  };

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-bg-base px-6">
      {/* Brand Icon */}
      <div className="relative mb-8">
        <div
          className="h-20 w-20 rounded-[22px] bg-brand/10 flex items-center justify-center shadow-lg"
          style={{
            animation: state === "loading" ? "pulse 2s ease-in-out infinite" : undefined,
          }}
        >
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-brand"
          >
            <path d="M12 2v20M2 12h20" />
            <circle cx="12" cy="12" r="4" />
          </svg>
        </div>

        {/* Spinner ring around icon */}
        {state === "loading" && (
          <div className="absolute -inset-2 rounded-[28px] border-2 border-brand/20">
            <div
              className="absolute -inset-0 rounded-[28px] border-2 border-transparent border-t-brand"
              style={{ animation: "spin 1s linear infinite" }}
            />
          </div>
        )}

        {/* Success checkmark */}
        {state === "success" && (
          <div
            className="absolute -right-1 -bottom-1 h-8 w-8 rounded-full bg-green-500 flex items-center justify-center shadow-md"
            style={{ animation: "scaleIn 0.3s ease-out" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        )}
      </div>

      {/* Status Text */}
      <div className="text-center mb-8">
        {state === "loading" && (
          <>
            <h1 className="text-lg font-semibold text-text-primary mb-1.5">
              Menyiapkan akunmu...
            </h1>
            <p className="text-[13px] text-text-tertiary">
              Menghubungkan dengan Google
            </p>
          </>
        )}
        {state === "success" && (
          <>
            <h1 className="text-lg font-semibold text-text-primary mb-1.5">
              Berhasil masuk!
            </h1>
            <p className="text-[13px] text-text-tertiary">
              Mengalihkan ke beranda...
            </p>
          </>
        )}
        {state === "error" && (
          <>
            <h1 className="text-lg font-semibold text-text-primary mb-1.5">
              Gagal masuk
            </h1>
            <p className="text-[13px] text-text-tertiary mb-5">
              Terjadi kesalahan saat menghubungkan akun Google-mu. Coba lagi.
            </p>
            <button
              onClick={handleRetry}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-brand px-6 text-[14px] font-medium text-white hover:bg-brand/90 active:scale-[0.98] transition-all"
            >
              Kembali ke Beranda
            </button>
          </>
        )}
      </div>

      {/* Progress Bar */}
      {state !== "error" && (
        <div className="w-full max-w-[200px]">
          <div className="h-1 w-full rounded-full bg-border-subtle/50 overflow-hidden">
            <div
              className="h-full rounded-full bg-brand transition-all duration-300 ease-out"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Inline Styles for animations */}
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }
        @keyframes scaleIn {
          from { transform: scale(0); }
          to { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
