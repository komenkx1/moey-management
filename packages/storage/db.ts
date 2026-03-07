import Dexie, { type Table } from "dexie";
import type { CategoryRule, Entry } from "../core/types";

export interface KemanaMeta {
    key: string;
    value: string;
}

export interface SyncQueueItem {
    id: string; // UUID for idempotency
    entity: 'entry' | 'rule'; // What to sync
    entityId: string; // ID of the entity
    operation: 'create' | 'update' | 'delete';
    payload: Entry | CategoryRule | null; // null for delete
    createdAt: number; // Timestamp for ordering
    retryCount: number; // For exponential backoff
    status: 'pending' | 'syncing' | 'synced' | 'failed';
}

export class KemanaDB extends Dexie {
    entries!: Table<Entry, string>;
    rules!: Table<CategoryRule, string>;
    meta!: Table<KemanaMeta, string>;
    syncQueue!: Table<SyncQueueItem, string>;

    constructor() {
        super("kemana");
        
        // Version 1: Original schema
        this.version(1).stores({
            entries: "id, date, category, createdAt",
            rules: "pattern",
            meta: "key"
        });
        
        // Version 2: Add owner_id for sync (but don't require it for local data)
        this.version(2).stores({
            entries: "id, date, category, createdAt",
            rules: "pattern"
        }).upgrade(tx => {
            // Migration: Remove any invalid owner_id from existing data
            return tx.table("entries").toCollection().modify(entry => {
                // Remove owner_id if it exists and is not a valid UUID
                if (entry.owner_id && typeof entry.owner_id === 'string') {
                    // Check if it's a valid UUID format (36 chars with dashes)
                    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(entry.owner_id);
                    if (!isValidUUID) {
                        delete entry.owner_id;
                    }
                }
            });
        });

        // Version 3: Add sync queue
        this.version(3).stores({
            entries: "id, date, category, createdAt",
            rules: "pattern",
            meta: "key",
            syncQueue: "id, status, createdAt, entity"
        });
    }
}

export const db = new KemanaDB();
