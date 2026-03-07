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
 * Perform initial sync when user logs in on a new device
 * Downloads all data from server and merges with local data
 */
export async function initialSyncOnLogin(
  userId: string,
  supabaseClient: any
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Fetch all data from server
    const { data: serverEntries, error: entriesError } = await supabaseClient
      .from("entries")
      .select("*")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });

    if (entriesError) {
      throw new Error(`Failed to fetch entries: ${entriesError.message}`);
    }

    const { data: serverRules, error: rulesError } = await supabaseClient
      .from("rules")
      .select("*")
      .eq("owner_id", userId);

    if (rulesError) {
      throw new Error(`Failed to fetch rules: ${rulesError.message}`);
    }

    // 2. Load local data
    const localEntries = await loadEntries();
    const localRules = await loadRules();

    // 3. Merge: server wins for conflicts (Last-Write-Wins by updated_at)
    const mergedEntries = mergeWithServerPriority(
      localEntries,
      (serverEntries || []).map(normalizeServerEntry)
    );

    const mergedRules = mergeRules(
      localRules,
      (serverRules || []).map(normalizeServerRule)
    );

    // 4. Save merged data to local IndexedDB
    await db.transaction("rw", db.entries, db.rules, async () => {
      await db.entries.clear();
      await db.entries.bulkPut(mergedEntries);
      await db.rules.clear();
      await db.rules.bulkPut(mergedRules);
    });

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
 * Merge local and server entries with server priority (LWW)
 */
function mergeWithServerPriority(local: Entry[], server: Entry[]): Entry[] {
  const map = new Map<string, Entry>();

  // Add local entries first
  for (const entry of local) {
    map.set(entry.id, entry);
  }

  // Server entries override if newer (LWW by updated_at)
  for (const entry of server) {
    const existing = map.get(entry.id);
    if (!existing) {
      map.set(entry.id, entry);
    } else {
      const existingTime = new Date(existing.updatedAt).getTime();
      const serverTime = new Date(entry.updatedAt).getTime();
      if (serverTime >= existingTime) {
        map.set(entry.id, entry);
      }
    }
  }

  return Array.from(map.values());
}

/**
 * Merge rules: server wins for same pattern+match
 */
function mergeRules(local: CategoryRules, server: CategoryRules): CategoryRules {
  const map = new Map<string, CategoryRules[number]>();

  // Add local rules first
  for (const rule of local) {
    const key = `${rule.pattern}:${rule.match}`;
    map.set(key, rule);
  }

  // Server rules override
  for (const rule of server) {
    const key = `${rule.pattern}:${rule.match}`;
    map.set(key, rule);
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
