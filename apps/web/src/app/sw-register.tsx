"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

const CONNECTION_BADGE_DURATION_MS = 2400;
const UPDATE_BANNER_DISMISSED_SESSION_KEY = "kemana.updateBanner.dismissedSession.v1";
const UPDATE_APPLIED_KEY = "kemana.updateApplied.v1";

export default function SWRegister() {
  const [connectionStatus, setConnectionStatus] = useState<"online" | "offline">("online");
  const [isConnectionBadgeVisible, setIsConnectionBadgeVisible] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const [isUpdateBannerDismissed, setIsUpdateBannerDismissed] = useState(false);
  const waitingRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const hasReloadedRef = useRef(false);
  const lastConnectionStateRef = useRef<boolean | null>(null);
  const hideConnectionBadgeTimeoutRef = useRef<number | null>(null);
  const updateAppliedRef = useRef(false);

  const clearConnectionBadgeTimer = useCallback(() => {
    if (hideConnectionBadgeTimeoutRef.current !== null) {
      window.clearTimeout(hideConnectionBadgeTimeoutRef.current);
      hideConnectionBadgeTimeoutRef.current = null;
    }
  }, []);

  const showConnectionBadge = useCallback(() => {
    setIsConnectionBadgeVisible(true);
    clearConnectionBadgeTimer();
    hideConnectionBadgeTimeoutRef.current = window.setTimeout(() => {
      setIsConnectionBadgeVisible(false);
      hideConnectionBadgeTimeoutRef.current = null;
    }, CONNECTION_BADGE_DURATION_MS);
  }, [clearConnectionBadgeTimer]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      setIsUpdateBannerDismissed(window.sessionStorage.getItem(UPDATE_BANNER_DISMISSED_SESSION_KEY) === "1");
      
      // Check if update was just applied - if so, clear the flag and don't show banner
      const updateApplied = window.localStorage.getItem(UPDATE_APPLIED_KEY);
      if (updateApplied) {
        updateAppliedRef.current = true;
        window.localStorage.removeItem(UPDATE_APPLIED_KEY);
        setIsUpdateBannerDismissed(true);
      }
    } catch {
      setIsUpdateBannerDismissed(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncConnectionState = (forceShowBadge = false) => {
      const isOnline = window.navigator.onLine;
      const previous = lastConnectionStateRef.current;
      lastConnectionStateRef.current = isOnline;
      setConnectionStatus(isOnline ? "online" : "offline");

      if (forceShowBadge || previous === null || previous !== isOnline) {
        showConnectionBadge();
      }
    };

    syncConnectionState(true);

    const handleOnline = () => syncConnectionState();
    const handleOffline = () => syncConnectionState();
    const handlePageShow = () => syncConnectionState(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("pageshow", handlePageShow);
      clearConnectionBadgeTimer();
    };
  }, [clearConnectionBadgeTimer, showConnectionBadge]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    if (!("serviceWorker" in navigator)) {
      return;
    }

    let isMounted = true;

    const markUpdateReady = (registration: ServiceWorkerRegistration) => {
      // Don't show banner if update was just applied
      if (updateAppliedRef.current) {
        return;
      }
      
      waitingRegistrationRef.current = registration;
      if (isMounted) {
        setUpdateReady(true);
      }
    };

    const handleControllerChange = () => {
      if (hasReloadedRef.current) {
        return;
      }
      hasReloadedRef.current = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    navigator.serviceWorker
      .register(`/sw.js?v=${process.env.NEXT_PUBLIC_APP_VERSION || "dev"}`)
      .then((registration) => {
        if (!isMounted) {
          return;
        }

        if (registration.waiting) {
          markUpdateReady(registration);
        }

        registration.addEventListener("updatefound", () => {
          const installingWorker = registration.installing;
          if (!installingWorker) {
            return;
          }

          installingWorker.addEventListener("statechange", () => {
            if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
              markUpdateReady(registration);
            }
          });
        });

        // 1. Cek otomatis saat aplikasi dibuka lagi dari background (visibility change)
        const handleVisibilityChange = () => {
          if (document.visibilityState === "visible") {
            registration.update().catch(() => { });
          }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);

        // 2. Cek otomatis berjalan berkala (misal: setiap 2 jam) jika app didiamkan terus-menerus
        const UPDATE_INTERVAL_MS = 2 * 60 * 60 * 1000;
        const intervalId = setInterval(() => {
          registration.update().catch(() => { });
        }, UPDATE_INTERVAL_MS);

        return () => {
          document.removeEventListener("visibilitychange", handleVisibilityChange);
          clearInterval(intervalId);
        };
      })
      .catch(() => { });

    return () => {
      isMounted = false;
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  const handleDismissUpdate = useCallback(() => {
    setIsUpdateBannerDismissed(true);
    try {
      window.sessionStorage.setItem(UPDATE_BANNER_DISMISSED_SESSION_KEY, "1");
    } catch {
      // Ignore sessionStorage errors.
    }
  }, []);

  const handleApplyUpdate = () => {
    const waitingWorker = waitingRegistrationRef.current?.waiting;
    if (!waitingWorker) {
      return;
    }
    
    // Mark that update is being applied so we don't show banner after reload
    try {
      window.localStorage.setItem(UPDATE_APPLIED_KEY, "1");
    } catch {
      // Ignore localStorage errors
    }
    
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
  };

  return (
    <>
      {isConnectionBadgeVisible ? (
        <div className={`pwa-status-badge ${connectionStatus}`} role="status" aria-live="polite">
          {connectionStatus === "offline" ? "Offline" : "Online"}
        </div>
      ) : null}
      {updateReady && !isUpdateBannerDismissed ? (
        <div className="pwa-update-banner" role="status" aria-live="polite">
          <div className="pwa-update-banner-main">
            <span className="pwa-update-banner-title">Versi baru siap dipakai</span>
            <span className="pwa-update-banner-subtitle">Muat ulang untuk pakai update terbaru.</span>
          </div>
          <div className="pwa-update-banner-actions">
            <button type="button" className="btn btn-sm ghost" onClick={handleDismissUpdate}>
              Nanti
            </button>
            <button type="button" className="btn btn-sm secondary" onClick={handleApplyUpdate}>
              Muat ulang
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
