"use client";

import { useEffect, useRef, useState } from "react";

type SWStatus = "idle" | "ready";

export default function SWRegister() {
  const [isOffline, setIsOffline] = useState(false);
  const [swStatus, setSwStatus] = useState<SWStatus>("idle");
  const [updateReady, setUpdateReady] = useState(false);
  const waitingRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const hasReloadedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleConnection = () => {
      setIsOffline(!window.navigator.onLine);
    };

    handleConnection();
    window.addEventListener("online", handleConnection);
    window.addEventListener("offline", handleConnection);

    return () => {
      window.removeEventListener("online", handleConnection);
      window.removeEventListener("offline", handleConnection);
    };
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    if (!("serviceWorker" in navigator)) {
      return;
    }

    let isMounted = true;

    const markUpdateReady = (registration: ServiceWorkerRegistration) => {
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

        navigator.serviceWorker.ready.then(() => {
          if (isMounted) {
            setSwStatus("ready");
          }
        });

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
      })
      .catch(() => {});

    return () => {
      isMounted = false;
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  const handleApplyUpdate = () => {
    const waitingWorker = waitingRegistrationRef.current?.waiting;
    if (!waitingWorker) {
      return;
    }
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
  };

  return (
    <>
      <div
        className={`pwa-status-badge ${isOffline ? "offline" : "online"}`}
        role="status"
        aria-live="polite"
      >
        {isOffline ? "Offline" : swStatus === "ready" ? "Siap offline" : "Online"}
      </div>
      {updateReady ? (
        <div className="pwa-update-banner" role="status" aria-live="polite">
          <span>Update tersedia</span>
          <button type="button" className="btn btn-sm secondary" onClick={handleApplyUpdate}>
            Muat ulang
          </button>
        </div>
      ) : null}
    </>
  );
}
