import { db, type SyncQueueItem } from "./db";
import type { Entry, CategoryRules } from "../core/types";

export class SyncWorker {
  private isRunning = false;
  private supabaseClient: any;
  private userId: string | null = null;
  private checkInterval = 2000; // Check every 2 seconds
  private maxRetries = 10;
  private baseDelay = 1000; // 1 second

  constructor(supabaseClient: any) {
    this.supabaseClient = supabaseClient;
  }

  /**
   * Start the sync worker
   */
  async start(userId: string) {
    if (this.isRunning) {
      console.log('⚠️ Sync worker already running');
      return;
    }

    this.userId = userId;
    this.isRunning = true;
    console.log('🔄 Sync worker started for user:', userId);

    this.processQueue();
  }

  /**
   * Stop the sync worker
   */
  stop() {
    this.isRunning = false;
    this.userId = null;
    console.log('⏹️ Sync worker stopped');
  }

  /**
   * Main processing loop
   */
  private async processQueue() {
    while (this.isRunning) {
      try {
        // Check if online
        if (!navigator.onLine) {
          await this.sleep(5000); // Check every 5s when offline
          continue;
        }

        // Get pending items
        const pendingItems = await db.syncQueue
          .where('status')
          .anyOf(['pending', 'failed'])
          .sortBy('createdAt');

        if (pendingItems.length === 0) {
          await this.sleep(this.checkInterval);
          continue;
        }

        console.log(`📤 Processing ${pendingItems.length} sync items...`);

        // Process in batches of 10
        const batch = pendingItems.slice(0, 10);
        await this.processBatch(batch);

      } catch (error) {
        console.error('❌ Sync worker error:', error);
        await this.sleep(5000); // Wait 5s on error
      }
    }
  }

  /**
   * Process a batch of sync items
   */
  private async processBatch(items: SyncQueueItem[]) {
    for (const item of items) {
      if (!this.isRunning) break;

      try {
        // Mark as syncing
        await db.syncQueue.update(item.id, { status: 'syncing' });

        // Sync the item
        await this.syncItem(item);

        // Mark as synced
        await db.syncQueue.update(item.id, { status: 'synced' });
        console.log(`✓ Synced ${item.entity} ${item.operation}:`, item.entityId);

      } catch (error) {
        console.error(`❌ Failed to sync ${item.entity}:`, error);

        const nextRetry = item.retryCount + 1;
        
        if (nextRetry >= this.maxRetries) {
          console.error(`⚠️ Max retries reached for ${item.entity}:`, item.entityId);
          await db.syncQueue.update(item.id, {
            status: 'failed',
            retryCount: nextRetry
          });
        } else {
          // Exponential backoff
          const delay = Math.min(
            this.baseDelay * Math.pow(2, nextRetry),
            30000 // Max 30s
          );

          await db.syncQueue.update(item.id, {
            status: 'pending',
            retryCount: nextRetry
          });

          console.log(`🔄 Retry ${nextRetry}/${this.maxRetries} in ${delay}ms`);
          await this.sleep(delay);
        }
      }
    }
  }

  /**
   * Sync a single item to Supabase
   */
  private async syncItem(item: SyncQueueItem) {
    if (!this.userId) {
      throw new Error('User ID not set');
    }

    const { entity, entityId, operation, payload } = item;

    if (entity === 'entry') {
      if (operation === 'create' || operation === 'update') {
        if (!payload) throw new Error('Payload required for create/update');
        
        const entry = payload as Entry;
        const serverEntry = {
          id: entry.id,
          owner_id: this.userId,
          text: entry.text,
          amount: entry.amount,
          date: entry.date,
          category: entry.category,
          source: entry.source || 'quick_add',
          raw_input: entry.rawInput,
          payment_method: entry.paymentMethod,
          parse_warnings: entry.parseWarnings,
          split: entry.split,
          created_at: entry.createdAt,
          updated_at: entry.updatedAt
        };

        const { error } = await this.supabaseClient
          .from('entries')
          .upsert(serverEntry, {
            onConflict: 'id'
          });

        if (error) throw error;

      } else if (operation === 'delete') {
        const { error } = await this.supabaseClient
          .from('entries')
          .delete()
          .eq('id', entityId)
          .eq('owner_id', this.userId);

        if (error) throw error;
      }

    } else if (entity === 'rule') {
      if (operation === 'create' || operation === 'update') {
        if (!payload) throw new Error('Payload required for create/update');
        
        const rule = payload as CategoryRules[number];
        const serverRule = {
          owner_id: this.userId,
          pattern: rule.pattern,
          match: rule.match,
          category: rule.category
        };

        const { error } = await this.supabaseClient
          .from('rules')
          .upsert(serverRule, {
            onConflict: 'owner_id,pattern,match'
          });

        if (error) throw error;

      } else if (operation === 'delete') {
        if (!payload) throw new Error('Payload required for delete rule');
        
        const rule = payload as CategoryRules[number];
        const { error } = await this.supabaseClient
          .from('rules')
          .delete()
          .eq('owner_id', this.userId)
          .eq('pattern', rule.pattern)
          .eq('match', rule.match);

        if (error) throw error;
      }
    }
  }

  /**
   * Helper to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get sync queue status
   */
  async getStatus() {
    const pending = await db.syncQueue.where('status').equals('pending').count();
    const syncing = await db.syncQueue.where('status').equals('syncing').count();
    const failed = await db.syncQueue.where('status').equals('failed').count();
    const synced = await db.syncQueue.where('status').equals('synced').count();

    return {
      pending,
      syncing,
      failed,
      synced,
      total: pending + syncing + failed + synced
    };
  }

  /**
   * Clear synced items (cleanup)
   */
  async clearSynced() {
    const count = await db.syncQueue.where('status').equals('synced').delete();
    console.log(`🗑️ Cleared ${count} synced items`);
    return count;
  }
}

/**
 * Helper to generate UUID for sync queue items
 */
export function generateSyncId(): string {
  return `sync_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Helper to enqueue a sync operation
 */
export async function enqueueSyncOperation(
  entity: 'entry' | 'rule',
  entityId: string,
  operation: 'create' | 'update' | 'delete',
  payload: Entry | CategoryRules[number] | null
): Promise<void> {
  const item: SyncQueueItem = {
    id: generateSyncId(),
    entity,
    entityId,
    operation,
    payload,
    createdAt: Date.now(),
    retryCount: 0,
    status: 'pending'
  };

  await db.syncQueue.add(item);
  console.log(`📝 Enqueued ${entity} ${operation}:`, entityId);
}
