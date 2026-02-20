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
        <section className="pwa-install-banner" role="status" aria-live="polite" aria-label="Install aplikasi">
          <div className="pwa-install-banner-text">Install KeMana</div>
          <div className="pwa-install-banner-actions">
            <button
              type="button"
              className="btn btn-sm secondary"
              onClick={handleInstallClick}
              aria-label={canInstall || isIOS() ? "Install" : "Install (manual)"}
            >
              Install
            </button>
            <button
              type="button"
              className="pwa-install-close"
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
            className="pwa-install-modal-backdrop"
            aria-label="Tutup instruksi install"
            onClick={closeIosHelp}
          />
          <section className="pwa-install-modal" role="dialog" aria-modal="true" aria-label="Instruksi install iOS">
            <div className="pwa-install-modal-title">Install di iPhone/iPad</div>
            <ol className="pwa-install-steps">
              <li>Buka menu Share di Safari.</li>
              <li>Pilih Add to Home Screen.</li>
              <li>Tap Add untuk menyimpan ke homescreen.</li>
            </ol>
            <button type="button" className="btn btn-sm" onClick={closeIosHelp}>
              Mengerti
            </button>
          </section>
        </>
      ) : null}
    </>
  );
}
