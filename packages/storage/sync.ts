import type { Entry, CategoryRules } from "../core/types";
import { db } from "./db";
import { loadEntries, loadRules } from "./index";

export interface MigrationResult {
  success: boolean;
  entriesMigrated: number;
  rulesMigrated: number;
  error?: string;
}

/**
 * Migrate local anonymous data to authenticated user account
 * This function:
 * 1. Loads all local entries and rules
 * 2. Uploads them to Supabase with the user's owner_id
 * 3. Marks them as synced locally
 */
export async function migrateLocalDataToAccount(
  userId: string,
  supabaseClient: any // Type from @supabase/supabase-js
): Promise<MigrationResult> {
  try {
    // 1. Load all local data
    const localEntries = await loadEntries();
    const localRules = await loadRules();

    if (localEntries.length === 0 && localRules.length === 0) {
      return {
        success: true,
        entriesMigrated: 0,
        rulesMigrated: 0
      };
    }

    // 2. Check if user already has data on server
    const { data: serverEntries, error: entriesError } = await supabaseClient
      .from("entries")
      .select("*")
      .eq("owner_id", userId);

    if (entriesError) {
      throw new Error(`Failed to fetch server entries: ${entriesError.message}`);
    }

    const { data: serverRules, error: rulesError } = await supabaseClient
      .from("rules")
      .select("*")
      .eq("owner_id", userId);

    if (rulesError) {
      throw new Error(`Failed to fetch server rules: ${rulesError.message}`);
    }

    // 3. Merge strategy: keep all unique entries by ID
    const serverEntryIds = new Set((serverEntries || []).map((e: any) => e.id));
    const entriesToUpload = localEntries.filter(e => !serverEntryIds.has(e.id));

    const serverRuleKeys = new Set(
      (serverRules || []).map((r: any) => `${r.pattern}:${r.match}`)
    );
    const rulesToUpload = localRules.filter(
      r => !serverRuleKeys.has(`${r.pattern}:${r.match}`)
    );

    // 4. Batch upload to server
    let uploadedEntries = 0;
    let uploadedRules = 0;

    if (entriesToUpload.length > 0) {
      // Map entries and ensure clean data
      // Remove any existing owner_id from local data and set the correct one
      const entriesToInsert = entriesToUpload.map(e => {
        // Destructure to remove owner_id if exists
        const { owner_id, ...entryWithoutOwner } = e as any;
        
        const entry: any = {
          id: entryWithoutOwner.id,
          owner_id: userId, // Use the correct user ID
          text: entryWithoutOwner.text,
          amount: entryWithoutOwner.amount,
          date: entryWithoutOwner.date,
          category: entryWithoutOwner.category,
          source: entryWithoutOwner.source || 'quick_add'
        };

        // Optional fields
        if (entryWithoutOwner.rawInput) entry.raw_input = entryWithoutOwner.rawInput;
        if (entryWithoutOwner.paymentMethod) entry.payment_method = entryWithoutOwner.paymentMethod;
        if (entryWithoutOwner.parseWarnings) entry.parse_warnings = entryWithoutOwner.parseWarnings;
        if (entryWithoutOwner.split) entry.split = entryWithoutOwner.split;
        if (entryWithoutOwner.createdAt) entry.created_at = entryWithoutOwner.createdAt;
        if (entryWithoutOwner.updatedAt) entry.updated_at = entryWithoutOwner.updatedAt;

        return entry;
      });

      const { error: uploadEntriesError } = await supabaseClient
        .from("entries")
        .insert(entriesToInsert);

      if (uploadEntriesError) {
        throw new Error(`Failed to upload entries: ${uploadEntriesError.message}`);
      }

      uploadedEntries = entriesToUpload.length;
    }

    if (rulesToUpload.length > 0) {
      const { error: uploadRulesError } = await supabaseClient
        .from("rules")
        .insert(
          rulesToUpload.map(r => ({
            owner_id: userId,
            pattern: r.pattern,
            match: r.match,
            category: r.category
          }))
        );

      if (uploadRulesError) {
        throw new Error(`Failed to upload rules: ${uploadRulesError.message}`);
      }

      uploadedRules = rulesToUpload.length;
    }

    return {
      success: true,
      entriesMigrated: uploadedEntries,
      rulesMigrated: uploadedRules
    };
  } catch (error) {
    console.error("Migration error:", error);
    return {
      success: false,
      entriesMigrated: 0,
      rulesMigrated: 0,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Helper to wrap promises with a timeout to prevent infinite hangs on bad connections.
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  let timeoutHandle: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });

  return Promise.race([
    promise,
    timeoutPromise,
  ]).finally(() => clearTimeout(timeoutHandle));
}

/**
 * Get last sync timestamp for delta sync
 */
export async function getLastSyncTime(userId: string): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  
  try {
    const key = `kemana.lastSync.${userId}`;
    return localStorage.getItem(key);
  } catch (error) {
    console.warn('Failed to get last sync time:', error);
    return null;
  }
}

/**
 * Set last sync timestamp for delta sync
 */
export async function setLastSyncTime(userId: string, time: string): Promise<void> {
  if (typeof window === 'undefined') return;
  
  try {
    const key = `kemana.lastSync.${userId}`;
    localStorage.setItem(key, time);
  } catch (error) {
    console.warn('Failed to set last sync time:', error);
  }
}

/**
 * Perform initial full fetch from server and sync with local data
 * Uses delta sync (only fetch changed data) after first sync
 */
export async function initialSyncOnLogin(
  userId: string,
  supabaseClient: any
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get last sync time for delta sync
    const lastSyncTime = await getLastSyncTime(userId);
    const isDeltaSync = lastSyncTime !== null;
    
    if (isDeltaSync) {
      console.log(`📊 Delta sync: fetching changes after ${lastSyncTime}`);
    } else {
      console.log(`📊 Full sync: first time login`);
    }
    
    // 1. Fetch data from server with optional delta filter
    let fetchEntriesPromise = supabaseClient
      .from("entries")
      .select("*")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false }) as Promise<{ data: any[] | null; error: any }>;
    
    // Apply delta filter if we have last sync time
    if (isDeltaSync) {
      fetchEntriesPromise = supabaseClient
        .from("entries")
        .select("*")
        .eq("owner_id", userId)
        .gt("updated_at", lastSyncTime)
        .order("created_at", { ascending: false }) as Promise<{ data: any[] | null; error: any }>;
    }

    const fetchRulesPromise = supabaseClient
      .from("rules")
      .select("*")
      .eq("owner_id", userId) as Promise<{ data: any[] | null; error: any }>;

    const [entriesResponse, rulesResponse] = await Promise.all([
      withTimeout(fetchEntriesPromise, 15000, "Waktu koneksi habis saat mengambil transaksi."),
      withTimeout(fetchRulesPromise, 15000, "Waktu koneksi habis saat mengambil aturan.")
    ]);

    const { data: serverEntries, error: entriesError } = entriesResponse;
    const { data: serverRules, error: rulesError } = rulesResponse;

    if (entriesError) {
      throw new Error(`Gagal mengambil data transaksi: ${entriesError.message}`);
    }
    if (rulesError) {
      throw new Error(`Gagal mengambil data aturan: ${rulesError.message}`);
    }

    // 2. Load local data
    const localEntries = await loadEntries();
    const localRules = await loadRules();

    // 2.1 Identify pending deletions in the local sync queue to prevent server resurrection
    const pendingItems = await db.syncQueue
      .where('status')
      .anyOf(['pending', 'failed'])
      .toArray();
    
    // Deletions that haven't reached the server yet
    const pendingDeletedEntryIds = new Set(
      pendingItems.filter(q => q.entity === 'entry' && q.operation === 'delete').map(q => q.entityId)
    );
    const pendingDeletedRuleKeys = new Set(
      pendingItems.filter(q => q.entity === 'rule' && q.operation === 'delete' && q.payload)
        .map(q => {
          const rule = q.payload as CategoryRules[number];
          return `${rule.pattern}:${rule.match}`;
        })
    );

    // Creations/Updates that haven't reached the server yet
    const pendingUpsertEntryIds = new Set(
      pendingItems.filter(q => q.entity === 'entry' && (q.operation === 'create' || q.operation === 'update')).map(q => q.entityId)
    );
    const pendingUpsertRuleKeys = new Set(
      pendingItems.filter(q => q.entity === 'rule' && (q.operation === 'create' || q.operation === 'update') && q.payload)
        .map(q => {
          const rule = q.payload as CategoryRules[number];
          return `${rule.pattern}:${rule.match}`;
        })
    );

    // Filter server data to remove items that are locally pending deletion
    const validServerEntries = (serverEntries || [])
      .map(normalizeServerEntry)
      .filter((entry: Entry) => !pendingDeletedEntryIds.has(entry.id));

    const validServerRules = (serverRules || [])
      .map(normalizeServerRule)
      .filter((rule: CategoryRules[number]) => !pendingDeletedRuleKeys.has(`${rule.pattern}:${rule.match}`));

    // 3. Merge strategy depends on sync type
    let mergedEntries: Entry[];
    let mergedRules: CategoryRules;
    
    if (isDeltaSync) {
      // Delta sync: merge changed entries with local data
      mergedEntries = mergeDeltaEntries(localEntries, validServerEntries, pendingUpsertEntryIds, pendingDeletedEntryIds);
      mergedRules = mergeRules(localRules, validServerRules, pendingUpsertRuleKeys, pendingDeletedRuleKeys);
      
      console.log(`📊 Delta sync merged: ${validServerEntries.length} changed entries`);
    } else {
      // Full sync: server is absolute truth (except pending items)
      mergedEntries = mergeWithServerPriority(localEntries, validServerEntries, pendingUpsertEntryIds, pendingDeletedEntryIds);
      mergedRules = mergeRules(localRules, validServerRules, pendingUpsertRuleKeys, pendingDeletedRuleKeys);
      
      console.log(`📊 Full sync merged: ${validServerEntries.length} total entries`);
    }

    // 4. Save merged data to local IndexedDB
    await db.transaction("rw", db.entries, db.rules, async () => {
      if (isDeltaSync) {
        // Delta sync: only update changed entries
        await db.entries.bulkPut(mergedEntries);
        await db.rules.clear();
        await db.rules.bulkPut(mergedRules);
      } else {
        // Full sync: replace all data
        await db.entries.clear();
        await db.entries.bulkPut(mergedEntries);
        await db.rules.clear();
        await db.rules.bulkPut(mergedRules);
      }
    });

    // 5. Update last sync time for next delta sync
    const now = new Date().toISOString();
    await setLastSyncTime(userId, now);
    console.log(`✓ Last sync time updated: ${now}`);

    return { success: true };
  } catch (error) {
    console.error("Initial sync error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Merge delta entries (only changed entries from server)
 * Used for incremental sync after first login
 */
function mergeDeltaEntries(
  local: Entry[],
  changedFromServer: Entry[],
  pendingUpsertIds: Set<string>,
  pendingDeleteIds: Set<string>
): Entry[] {
  const map = new Map<string, Entry>();

  // 1. Start with all local entries
  for (const entry of local) {
    if (!pendingDeleteIds.has(entry.id)) {
      map.set(entry.id, entry);
    }
  }

  // 2. Apply changed entries from server
  for (const entry of changedFromServer) {
    if (pendingDeleteIds.has(entry.id)) {
      // Deleted locally but not synced yet
      continue;
    }

    if (pendingUpsertIds.has(entry.id)) {
      // Has pending local changes
      const existing = map.get(entry.id);
      if (existing) {
        const localTime = new Date(existing.updatedAt).getTime();
        const serverTime = new Date(entry.updatedAt).getTime();
        // Keep newer version
        if (serverTime > localTime) {
          map.set(entry.id, entry);
        }
      } else {
        map.set(entry.id, entry);
      }
    } else {
      // No pending changes, server wins
      map.set(entry.id, entry);
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

/**
 * Merge local and server entries. Server is the absolute truth UNLESS the local item is stuck in the sync queue.
 */
function mergeWithServerPriority(
  local: Entry[], 
  server: Entry[], 
  pendingUpsertIds: Set<string>,
  pendingDeleteIds: Set<string>
): Entry[] {
  const map = new Map<string, Entry>();

  // 1. Add all server entries (unless they are pending deletion locally)
  for (const entry of server) {
    if (!pendingDeleteIds.has(entry.id)) {
      map.set(entry.id, entry);
    }
  }

  const serverIds = new Set(server.map(e => e.id));

  // 2. Process local entries
  for (const entry of local) {
    if (pendingDeleteIds.has(entry.id)) {
      // It was deleted locally but hasn't synced up yet. Skip it.
      continue;
    }

    if (!serverIds.has(entry.id)) {
      // It's local but missing from the server.
      if (pendingUpsertIds.has(entry.id)) {
        // It's a new offline creation/update that hasn't synced up yet. Keep it.
        map.set(entry.id, entry);
      } else {
        // It's missing from sync queue AND server.
        // That means it was deleted on another device, OR it's a ghost from a React race condition.
        // We do NOT add it to the map.
      }
    } else {
      // It's on both local and server.
      // Server already added it in Step 1. Should local override?
      if (pendingUpsertIds.has(entry.id)) {
        // Local has pending offline changes!
        const existing = map.get(entry.id);
        if (existing) {
          const localTime = new Date(entry.updatedAt).getTime();
          const serverTime = new Date(existing.updatedAt).getTime();
          if (localTime >= serverTime) {
            map.set(entry.id, entry);
          }
        }
      }
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

/**
 * Merge rules using the mathematically correct two-way reconciliation
 */
function mergeRules(
  local: CategoryRules, 
  server: CategoryRules, 
  pendingUpsertKeys: Set<string>,
  pendingDeleteKeys: Set<string>
): CategoryRules {
  const map = new Map<string, CategoryRules[number]>();

  // 1. Add all server rules
  for (const rule of server) {
    const key = `${rule.pattern}:${rule.match}`;
    if (!pendingDeleteKeys.has(key)) {
      map.set(key, rule);
    }
  }

  const serverKeys = new Set(server.map(r => `${r.pattern}:${r.match}`));

  // 2. Process local rules
  for (const rule of local) {
    const key = `${rule.pattern}:${rule.match}`;
    
    if (pendingDeleteKeys.has(key)) {
      continue;
    }

    if (!serverKeys.has(key)) {
      // Local but missing from server
      if (pendingUpsertKeys.has(key)) {
        // New offline rule
        map.set(key, rule);
      }
    } else {
      // On both
      if (pendingUpsertKeys.has(key)) {
        // Local has pending changes. Since rules lack timestamps, local blindly wins here.
        map.set(key, rule);
      }
    }
  }

  return Array.from(map.values());
}

/**
 * Normalize server entry to local Entry format
 */
function normalizeServerEntry(serverEntry: any): Entry {
  return {
    id: serverEntry.id,
    text: serverEntry.text,
    amount: serverEntry.amount,
    rawInput: serverEntry.raw_input,
    date: serverEntry.date,
    category: serverEntry.category,
    source: serverEntry.source || "quick_add",
    paymentMethod: serverEntry.payment_method,
    parseWarnings: serverEntry.parse_warnings,
    split: serverEntry.split,
    createdAt: serverEntry.created_at,
    updatedAt: serverEntry.updated_at
  };
}

/**
 * Normalize server rule to local CategoryRule format
 */
function normalizeServerRule(serverRule: any): CategoryRules[number] {
  return {
    pattern: serverRule.pattern,
    match: serverRule.match,
    category: serverRule.category
  };
}
