import { useEffect, useRef } from "react";
import {
    clearStorageHealthWarnings,
    getStorageHealth,
    loadEntries,
    loadRules,
    migrateFromLocalStorage,
    readNightCloseMarker,
    saveEntries,
    saveRules
} from "@kemana/storage";
import { STORAGE_KEYS } from "@/lib/constants";
import { scheduleBackgroundTask } from "@/lib/perf";
import type { Entry, CategoryRules } from "@kemana/core/types";

interface UseStorageInitProps {
    entries: Entry[];
    rules: CategoryRules;
    isStorageReady: boolean;
    setEntries: (entries: Entry[]) => void;
    setRules: (rules: CategoryRules) => void;
    setNightCloseClosedAt: (date: string | null) => void;
    setIsNightCloseReady: (ready: boolean) => void;
    setStorageWarning: (warning: string | null) => void;
    setIsStorageReady: (ready: boolean) => void;
    setLastAppOpenAt: (timestamp: number | null) => void;
    setRecallDismissedInSession: (dismissed: boolean) => void;
    setIsRecallSessionReady: (ready: boolean) => void;
    cancelEntriesPersistRef: React.MutableRefObject<(() => void) | null>;
    isUnmountingRef: React.MutableRefObject<boolean>;
    flushPendingUpdates: () => void;
}

export function useStorageInit({
    entries,
    rules,
    isStorageReady,
    setEntries,
    setRules,
    setNightCloseClosedAt,
    setIsNightCloseReady,
    setStorageWarning,
    setIsStorageReady,
    setLastAppOpenAt,
    setRecallDismissedInSession,
    setIsRecallSessionReady,
    cancelEntriesPersistRef,
    isUnmountingRef,
    flushPendingUpdates
}: UseStorageInitProps) {
    const isFirstEntriesSyncRef = useRef(true);
    const isFirstRulesSyncRef = useRef(true);

    useEffect(() => {
        async function initStorage() {
            await migrateFromLocalStorage();
            const [loadedEntries, loadedRules, nightMarker] = await Promise.all([
                loadEntries(),
                loadRules(),
                readNightCloseMarker()
            ]);

            // Need flushSync or similar? Next.js 18 batches anyway
            setEntries(loadedEntries);
            setRules(loadedRules);
            setNightCloseClosedAt(nightMarker);
            setIsNightCloseReady(true);

            const health = getStorageHealth();
            if (health.hasCorruption) {
                setStorageWarning("Data penyimpanan bermasalah. Coba import backup.");
            }
            setIsStorageReady(true);
        }

        initStorage();
    }, [
        setEntries,
        setRules,
        setNightCloseClosedAt,
        setIsNightCloseReady,
        setStorageWarning,
        setIsStorageReady
    ]);

    useEffect(() => {
        if (!isStorageReady) {
            return;
        }

        // Prevent accidental IndexedDB wipe from stale closure of `[]` before Zustand hydration propagates
        if (isFirstEntriesSyncRef.current) {
            isFirstEntriesSyncRef.current = false;
            return;
        }

        cancelEntriesPersistRef.current?.();
        const cancelPersist = scheduleBackgroundTask(() => {
            saveEntries(entries);
            if (cancelEntriesPersistRef.current === cancelPersist) {
                cancelEntriesPersistRef.current = null;
            }
        });
        cancelEntriesPersistRef.current = cancelPersist;

        return () => {
            if (isUnmountingRef.current) {
                return;
            }
            cancelPersist();
            if (cancelEntriesPersistRef.current === cancelPersist) {
                cancelEntriesPersistRef.current = null;
            }
        };
    }, [entries, isStorageReady, cancelEntriesPersistRef, isUnmountingRef]);

    useEffect(() => {
        if (!isStorageReady) {
            return;
        }

        // Prevent accidental IndexedDB wipe from stale closure
        if (isFirstRulesSyncRef.current) {
            isFirstRulesSyncRef.current = false;
            return;
        }

        saveRules(rules);
    }, [rules, isStorageReady]);

    useEffect(() => {
        const now = Date.now();
        const rawLastOpenAt = window.localStorage.getItem(STORAGE_KEYS.LAST_OPEN_AT);
        const parsedLastOpenAt = rawLastOpenAt ? Number.parseInt(rawLastOpenAt, 10) : Number.NaN;
        setLastAppOpenAt(Number.isFinite(parsedLastOpenAt) ? parsedLastOpenAt : null);
        window.localStorage.setItem(STORAGE_KEYS.LAST_OPEN_AT, String(now));

        const dismissed = window.sessionStorage.getItem(STORAGE_KEYS.RECALL_DISMISSED_SESSION);
        setRecallDismissedInSession(Boolean(dismissed));
        setIsRecallSessionReady(true);
    }, [setIsRecallSessionReady, setLastAppOpenAt, setRecallDismissedInSession]);
}
