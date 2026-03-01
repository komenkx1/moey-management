import { useEffect, useRef } from 'react';
import { useEntries, useRules, useStorageState } from '@/store/kemana/hooks-granular';
import { loadEntries, saveEntries, loadRules, saveRules } from '@kemana/storage/db.native';

export function useStorageInit() {
    const { entries, setEntries } = useEntries();
    const { rules, setRules } = useRules();
    const { setIsStorageReady } = useStorageState();

    const isHydrated = useRef(false);
    const lastEntriesRef = useRef(entries);
    const lastRulesRef = useRef(rules);

    // Initial load from SQLite
    useEffect(() => {
        let isMounted = true;

        async function hydrate() {
            try {
                const [dbEntries, dbRules] = await Promise.all([
                    loadEntries(),
                    loadRules()
                ]);

                if (!isMounted) return;

                // Update store and refs
                setEntries(dbEntries);
                setRules(dbRules);
                lastEntriesRef.current = dbEntries;
                lastRulesRef.current = dbRules;

                setIsStorageReady(true);
                isHydrated.current = true;
            } catch (error) {
                console.error('Failed to load storage:', error);
                if (isMounted) setIsStorageReady(true); // proceed anyway to not block UI
            }
        }

        hydrate();

        return () => {
            isMounted = false;
        };
    }, []);

    // Auto-save entries to SQLite on change
    useEffect(() => {
        if (!isHydrated.current) return;
        if (entries === lastEntriesRef.current) return;

        lastEntriesRef.current = entries;
        const save = async () => {
            try {
                await saveEntries(entries);
            } catch (error) {
                console.error('Failed to save entries to SQLite:', error);
            }
        };

        // Simple debounce
        const timeoutId = setTimeout(save, 500);
        return () => clearTimeout(timeoutId);
    }, [entries]);

    // Auto-save rules to SQLite on change
    useEffect(() => {
        if (!isHydrated.current) return;
        if (rules === lastRulesRef.current) return;

        lastRulesRef.current = rules;
        const save = async () => {
            try {
                await saveRules(rules);
            } catch (error) {
                console.error('Failed to save rules to SQLite:', error);
            }
        };

        // Simple debounce
        const timeoutId = setTimeout(save, 500);
        return () => clearTimeout(timeoutId);
    }, [rules]);
}
