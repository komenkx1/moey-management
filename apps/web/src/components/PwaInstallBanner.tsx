"use client";

import { useEffect, useRef, useState } from "react";
import { isIOS, isStandalone } from "@/lib/pwa";

const BANNER_SEEN_KEY = "pwa_install_banner_seen_v1";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

function markBannerSeen(reason: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(BANNER_SEEN_KEY, reason);
  } catch {
    // Ignore localStorage errors.
  }
}

function hasSeenBanner(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return Boolean(window.localStorage.getItem(BANNER_SEEN_KEY));
  } catch {
    return false;
  }
}

export default function PwaInstallBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (isStandalone() || hasSeenBanner()) {
      return;
    }

    setIsVisible(true);

    const handleBeforeInstallPrompt = (event: Event) => {
      const installEvent = event as BeforeInstallPromptEvent;
      installEvent.preventDefault();
      deferredPromptRef.current = installEvent;
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      markBannerSeen("installed");
      deferredPromptRef.current = null;
      setCanInstall(false);
      setIsVisible(false);
      setShowIosHelp(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const closeBanner = () => {
    markBannerSeen("closed");
    setIsVisible(false);
    setShowIosHelp(false);
  };

  const closeIosHelp = () => {
    setShowIosHelp(false);
  };

  const handleInstallClick = async () => {
    if (isIOS()) {
      markBannerSeen("ios_help");
      setIsVisible(false);
      setShowIosHelp(true);
      return;
    }

    const deferredPrompt = deferredPromptRef.current;
    if (!deferredPrompt) {
      window.alert("Install belum tersedia, coba menu browser > Install App/Add to Home Screen");
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      markBannerSeen(choice.outcome);
    } catch {
      markBannerSeen("dismissed");
    } finally {
      deferredPromptRef.current = null;
      setCanInstall(false);
      setIsVisible(false);
      setShowIosHelp(false);
    }
  };

  if (!isVisible && !showIosHelp) {
    return null;
  }

  return (
    <>
      {isVisible ? (
        <section
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+100px)] left-1/2 z-[100] flex w-[min(400px,calc(100%-32px))] -translate-x-1/2 items-center justify-between gap-3 rounded-[16px] border border-border-subtle bg-bg-elevated p-3 shadow-xl"
          role="status"
          aria-live="polite"
          aria-label="Install aplikasi"
        >
          <div className="ml-1 flex flex-col justify-center">
            <span className="text-[14px] font-bold text-text-primary">Install KeMana</span>
            <span className="text-[11px] font-medium text-text-secondary">Akses cepat dari homescreen</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              className="rounded-xl bg-brand font-semibold px-3.5 py-2 text-[12px] text-white shadow-sm transition-all hover:bg-brand-pressed active:scale-95"
              onClick={handleInstallClick}
              aria-label={canInstall || isIOS() ? "Install" : "Install (manual)"}
            >
              Install
            </button>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[18px] text-text-tertiary transition-colors hover:bg-bg-subtle hover:text-text-primary active:scale-95"
              onClick={closeBanner}
              aria-label="Tutup banner install"
            >
              ×
            </button>
          </div>
        </section>
      ) : null}

      {showIosHelp ? (
        <>
          <button
            type="button"
            className="pwa-install-modal-backdrop animate-in fade-in duration-200"
            aria-label="Tutup instruksi install"
            onClick={closeIosHelp}
          />
          <section className="fixed top-1/2 z-[110] left-1/2 w-[min(400px,calc(100%-40px))] -translate-x-1/2 -translate-y-1/2 rounded-[20px] border border-border-subtle bg-bg-elevated p-5 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200" role="dialog" aria-modal="true" aria-label="Instruksi install iOS">
            <div className="text-[16px] font-bold text-text-primary">Install di iPhone/iPad</div>

            <img
              src="/screenshots/tutorial-install-pwa-kemana-1x1.png"
              alt="Tutorial Install iOS Safari"
              className="w-full rounded-[12px] border border-border-subtle shadow-sm object-cover"
              loading="lazy"
            />
            <ol className="ml-5 list-decimal flex flex-col gap-1.5 text-[14px] text-text-secondary">
              <li>Buka menu <span className="font-semibold text-text-primary">Share</span> di Safari.</li>
              <li>Pilih <span className="font-semibold text-text-primary">Add to Home Screen</span>.</li>
              <li>Tap <span className="font-semibold text-text-primary">Add</span> untuk menyimpan ke homescreen.</li>
            </ol>
            <div className="mt-2 flex justify-end">
              <button type="button" className="rounded-xl bg-brand font-semibold px-4 py-2.5 text-[13px] text-white shadow-sm transition-all hover:bg-brand-pressed active:scale-95 w-full" onClick={closeIosHelp}>
                Mengerti
              </button>
            </div>
          </section>
        </>
      ) : null}
    </>
  );
}
