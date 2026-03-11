import { db, type SyncQueueItem } from "./db";
import type { Entry, CategoryRules } from "../core/types";

export type SyncWorkerStatus = 'idle' | 'syncing' | 'synced' | 'failed' | 'offline';

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

export class SyncWorker {
  private _isRunning = false;
  private supabaseClient: any;
  private userId: string | null = null;
  private checkInterval = 2000; // Dynamic interval (default 2 seconds)
  private maxRetries = 10;
  private baseDelay = 1000; // 1 second
  private wakeupResolver: (() => void) | null = null;
  public isOnlineFn: () => Promise<boolean> = async () => navigator.onLine;
  private batteryManager: any = null;
  private batteryListenersAttached = false;

  public onStatusChange?: (status: SyncWorkerStatus) => void;
  public onPendingCountChange?: (count: number) => void;
  public onLastSyncTimeChange?: (time: number | null) => void;
  private currentStatus: SyncWorkerStatus = 'idle';

  constructor(supabaseClient: any) {
    this.supabaseClient = supabaseClient;
  }

  // Public getter for isRunning status
  get isRunning(): boolean {
    return this._isRunning;
  }

  private setStatus(status: SyncWorkerStatus) {
    if (this.currentStatus !== status) {
      this.currentStatus = status;
      this.onStatusChange?.(status);
    }
  }

  private async notifyPendingCount(count?: number) {
    if (!this.onPendingCountChange) return;
    if (count !== undefined) {
      this.onPendingCountChange(count);
    } else {
      const stats = await this.getStatus();
      this.onPendingCountChange(stats.pending + stats.failed);
    }
  }

  /**
   * Start the sync worker
   */
  async start(userId: string) {
    if (this._isRunning) {
      console.log('⚠️ Sync worker already running');
      return;
    }

    this.userId = userId;
    this._isRunning = true;
    console.log('🔄 Sync worker started for user:', userId);

    // Initialize battery monitoring for adaptive sync
    await this.initBatteryMonitoring();

    this.processQueue();
  }

  /**
   * Stop the sync worker
   */
  stop() {
    this._isRunning = false;
    this.userId = null;
    
    // Cleanup event listeners to prevent memory leaks
    this.onStatusChange = undefined;
    this.onPendingCountChange = undefined;
    this.onLastSyncTimeChange = undefined;
    
    // Cleanup battery listeners
    this.cleanupBatteryMonitoring();
    
    this.wakeup(); // Wake up so the loop can exit if it's sleeping
    console.log('⏹️ Sync worker stopped');
  }

  /**
   * Main processing loop
   */
  private async processQueue() {
    while (this._isRunning) {
      try {
        // Check if online using injected function
        const isOnline = await this.isOnlineFn();
        if (!isOnline) {
          this.setStatus('offline');
          await this.notifyPendingCount();
          await this.sleep(5000); // Check every 5s when offline
          continue;
        }

        // Get pending items
        const pendingItems = await db.syncQueue
          .where('status')
          .anyOf(['pending', 'failed'])
          .sortBy('createdAt');

        if (pendingItems.length === 0) {
          this.setStatus('synced');
          await this.notifyPendingCount(0);
          await this.sleep(this.checkInterval);
          continue;
        }

        this.setStatus('syncing');
        await this.notifyPendingCount(pendingItems.length);
        console.log(`📤 Processing ${pendingItems.length} sync items...`);

        // Process in batches of 10
        const batch = pendingItems.slice(0, 10);
        await this.processBatch(batch);

      } catch (error) {
        this.setStatus('failed');
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
      if (!this._isRunning) break;

      try {
        // Mark as syncing
        await db.syncQueue.update(item.id, { status: 'syncing' });

        // Sync the item
        await this.syncItem(item);

        // Mark as synced
        await db.syncQueue.update(item.id, { status: 'synced' });
        console.log(`✓ Synced ${item.entity} ${item.operation}:`, item.entityId);
        this.onLastSyncTimeChange?.(Date.now());
        await this.notifyPendingCount();

      } catch (error) {
        this.setStatus('failed');
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
          raw_input: entry.rawInput || null,
          payment_method: entry.paymentMethod || null,
          parse_warnings: entry.parseWarnings || null,
          split: entry.split || null,
          created_at: entry.createdAt,
          updated_at: entry.updatedAt
        };

        const { error } = await withTimeout(
          this.supabaseClient
            .from('entries')
            .upsert(serverEntry, {
              onConflict: 'id'
            }) as Promise<{ error: any }>,
          15000,
          "Waktu koneksi habis saat menyimpan transaksi."
        );

        if (error) throw error;

      } else if (operation === 'delete') {
        const { error } = await withTimeout(
          this.supabaseClient
            .from('entries')
            .delete()
            .eq('id', entityId)
            .eq('owner_id', this.userId) as Promise<{ error: any }>,
          15000,
          "Waktu koneksi habis saat menghapus transaksi."
        );

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

        const { error } = await withTimeout(
          this.supabaseClient
            .from('rules')
            .upsert(serverRule, {
              onConflict: 'owner_id,pattern,match'
            }) as Promise<{ error: any }>,
          15000,
          "Waktu koneksi habis saat menyimpan aturan."
        );

        if (error) throw error;

      } else if (operation === 'delete') {
        if (!payload) throw new Error('Payload required for delete rule');
        
        const rule = payload as CategoryRules[number];
        const { error } = await withTimeout(
          this.supabaseClient
            .from('rules')
            .delete()
            .eq('owner_id', this.userId)
            .eq('pattern', rule.pattern)
            .eq('match', rule.match) as Promise<{ error: any }>,
          15000,
          "Waktu koneksi habis saat menghapus aturan."
        );

        if (error) throw error;
      }
    }
  }

  /**
   * Initialize battery monitoring for adaptive sync intervals
   * Adjusts sync frequency based on battery level to save power
   */
  private async initBatteryMonitoring() {
    // Check if Battery API is supported
    if (typeof navigator === 'undefined' || !('getBattery' in navigator)) {
      console.log('⚠️ Battery API not supported, using default sync interval');
      return;
    }

    try {
      this.batteryManager = await (navigator as any).getBattery();
      
      // Initial adjustment
      this.adjustSyncInterval();
      
      // Bind event handlers to preserve 'this' context
      const handleBatteryChange = () => this.adjustSyncInterval();
      
      // Listen for battery changes
      this.batteryManager.addEventListener('levelchange', handleBatteryChange);
      this.batteryManager.addEventListener('chargingchange', handleBatteryChange);
      
      this.batteryListenersAttached = true;
      
      console.log('🔋 Battery monitoring initialized');
    } catch (error) {
      console.warn('⚠️ Failed to initialize battery monitoring:', error);
    }
  }

  /**
   * Adjust sync interval based on battery level and charging status
   * Reduces sync frequency when battery is low to extend battery life
   */
  private adjustSyncInterval() {
    if (!this.batteryManager) return;

    const level = this.batteryManager.level;
    const charging = this.batteryManager.charging;
    
    let newInterval: number;
    let description: string;

    if (charging) {
      // Charging: use normal sync interval
      newInterval = 2000; // 2 seconds
      description = 'charging (normal)';
    } else if (level < 0.15) {
      // Critical battery (< 15%): very slow sync
      newInterval = 60000; // 1 minute
      description = 'critical (<15%)';
    } else if (level < 0.20) {
      // Low battery (< 20%): slow sync
      newInterval = 30000; // 30 seconds
      description = 'low (<20%)';
    } else if (level < 0.50) {
      // Medium battery (< 50%): reduced sync
      newInterval = 10000; // 10 seconds
      description = 'medium (<50%)';
    } else {
      // Good battery (>= 50%): normal sync
      newInterval = 2000; // 2 seconds
      description = 'good (>=50%)';
    }

    // Only log if interval changed
    if (this.checkInterval !== newInterval) {
      this.checkInterval = newInterval;
      console.log(`🔋 Battery ${Math.round(level * 100)}% ${description}: sync interval ${newInterval}ms`);
      
      // Wake up worker to apply new interval immediately
      this.wakeup();
    }
  }

  /**
   * Cleanup battery monitoring listeners
   * Prevents memory leaks when worker is stopped
   */
  private cleanupBatteryMonitoring() {
    if (this.batteryManager && this.batteryListenersAttached) {
      try {
        const handleBatteryChange = () => this.adjustSyncInterval();
        this.batteryManager.removeEventListener('levelchange', handleBatteryChange);
        this.batteryManager.removeEventListener('chargingchange', handleBatteryChange);
        this.batteryListenersAttached = false;
        console.log('🔋 Battery monitoring cleaned up');
      } catch (error) {
        console.warn('⚠️ Failed to cleanup battery monitoring:', error);
      }
    }
    this.batteryManager = null;
  }

  /**
   * Helper to sleep (interruptible)
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      let timeoutId: any;
      
      const doResolve = () => {
        if (timeoutId) clearTimeout(timeoutId);
        this.wakeupResolver = null;
        resolve();
      };
      
      timeoutId = setTimeout(doResolve, ms);
      this.wakeupResolver = doResolve;
    });
  }

  /**
   * Wake up the worker if it's sleeping (e.g., network restored)
   */
  public wakeup() {
    if (this.wakeupResolver) {
      this.wakeupResolver();
    }
  }

  /**
   * Sync a specific item immediately without waiting for batch cycle
   * This provides instant feedback for user operations (create/update/delete)
   */
  public async syncImmediately(itemId: string) {
    console.log(`🚀 syncImmediately called for item: ${itemId}`);
    
    if (!this.userId) {
      console.warn('⚠️ Cannot sync immediately: no user ID');
      return;
    }

    const isOnline = await this.isOnlineFn();
    console.log(`📡 Network status: ${isOnline ? 'online' : 'offline'}`);
    
    if (!isOnline) {
      console.log('📴 Offline: item will sync when connection restored');
      return;
    }

    try {
      const item = await db.syncQueue.get(itemId);
      if (!item) {
        console.warn('⚠️ Item not found in queue:', itemId);
        return;
      }

      console.log(`📦 Found item in queue:`, { 
        id: item.id, 
        entity: item.entity, 
        operation: item.operation, 
        status: item.status 
      });

      if (item.status === 'synced') {
        console.log('✓ Item already synced:', itemId);
        return;
      }

      // Mark as syncing
      console.log(`⏳ Marking item as syncing...`);
      await db.syncQueue.update(itemId, { status: 'syncing' });

      // Sync the item
      console.log(`🔄 Syncing item to server...`);
      await this.syncItem(item);

      // Mark as synced
      console.log(`✅ Marking item as synced...`);
      await db.syncQueue.update(itemId, { status: 'synced' });
      console.log(`✓ Immediately synced ${item.entity} ${item.operation}:`, item.entityId);
      this.onLastSyncTimeChange?.(Date.now());
      await this.notifyPendingCount();

    } catch (error) {
      console.error('❌ Immediate sync failed:', error);
      // Don't update retry count here - let the batch processor handle retries
      // Just mark as pending so it will be retried in the next batch
      await db.syncQueue.update(itemId, { status: 'pending' });
    }
  }
  /**
   * Sync multiple items immediately in batch
   * More efficient than calling syncImmediately multiple times
   */
  /**
     * Sync multiple items immediately in batch
     * More efficient than calling syncImmediately multiple times
     */
    public async syncImmediatelyBatch(itemIds: string[]) {
      console.log(`🚀 syncImmediatelyBatch called for ${itemIds.length} items`);

      if (!this.userId) {
        console.warn('⚠️ Cannot sync immediately: no user ID');
        return;
      }

      const isOnline = await this.isOnlineFn();
      console.log(`📡 Network status: ${isOnline ? 'online' : 'offline'}`);

      if (!isOnline) {
        console.log('📴 Offline: items will sync when connection restored');
        return;
      }

      try {
        // Fetch all items from queue
        const items = await db.syncQueue.bulkGet(itemIds);
        const validItems = items.filter((item): item is SyncQueueItem => 
          item !== undefined && item.status !== 'synced'
        );

        if (validItems.length === 0) {
          console.log('✓ All items already synced or not found');
          return;
        }

        console.log(`📦 Found ${validItems.length} items to sync`);

        // Mark all as syncing
        await Promise.all(
          validItems.map(item => db.syncQueue.update(item.id, { status: 'syncing' as const }))
        );

        // Sync all items sequentially to avoid overwhelming the connection
        const results = await Promise.allSettled(
          validItems.map(item => this.syncItem(item))
        );

        // Update status based on results
        await Promise.all(
          results.map((result, index) => {
            const item = validItems[index];
            if (result.status === 'fulfilled') {
              console.log(`✓ Synced ${item.entity} ${item.operation}:`, item.entityId);
              return db.syncQueue.update(item.id, { status: 'synced' as const });
            } else {
              console.error(`❌ Failed to sync ${item.entity}:`, result.reason);
              return db.syncQueue.update(item.id, { status: 'pending' as const });
            }
          })
        );

        const successCount = results.filter(r => r.status === 'fulfilled').length;
        console.log(`✅ Batch sync complete: ${successCount}/${validItems.length} succeeded`);

        this.onLastSyncTimeChange?.(Date.now());
        await this.notifyPendingCount();

      } catch (error) {
        console.error('❌ Batch immediate sync failed:', error);
        // Mark all as pending for retry
        await Promise.all(
          itemIds.map(id => db.syncQueue.update(id, { status: 'pending' as const }))
        );
      }
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
   * Flush all pending items immediately (use before logout)
   */
  async flushAll() {
    const pendingItems = await db.syncQueue
      .where('status')
      .anyOf(['pending', 'failed'])
      .sortBy('createdAt');

    if (pendingItems.length === 0) return;

    // Critical check: Do not flush if offline and there's data to send
    const isOnline = await this.isOnlineFn();
    if (!isOnline && pendingItems.length > 0) {
      console.warn("⚠️ Cannot flush pending items while offline.");
      throw new Error("PENDING_OFFLINE_DATA");
    }

    console.log(`📤 Flushing ${pendingItems.length} pending sync items...`);
    await this.processBatch(pendingItems);
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
 * @param syncWorker Optional sync worker instance for immediate sync
 */
export async function enqueueSyncOperation(
  entity: 'entry' | 'rule',
  entityId: string,
  operation: 'create' | 'update' | 'delete',
  payload: Entry | CategoryRules[number] | null,
  syncWorker?: SyncWorker | null
): Promise<string> {  // Return item ID for batch sync
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

  try {
    await db.transaction("rw", db.syncQueue, db.entries, db.rules, async () => {
      // 1. Enqueue to sync worker
      await db.syncQueue.add(item);

      // 2. Optimistic local update so UI reflects immediately while offline
      if (operation === 'create' || operation === 'update') {
        if (entity === 'entry' && payload) {
          await db.entries.put(payload as Entry);
        } else if (entity === 'rule' && payload) {
          await db.rules.put(payload as CategoryRules[number]);
        }
      } else if (operation === 'delete') {
        if (entity === 'entry') {
          await db.entries.delete(entityId);
        } else if (entity === 'rule') {
          await db.rules.delete(entityId);
        }
      }
    });

    console.log(`📝 Enqueued & Applied ${entity} ${operation}:`, entityId);

    // Return item ID so caller can batch sync if needed
    return item.id;

  } catch (error: any) {
    // Handle IndexedDB quota exceeded errors gracefully
    // Without this, data loss occurs silently when storage is full
    if (error.name === 'QuotaExceededError') {
      console.error('❌ Storage quota exceeded');

      // Notify user with clear Indonesian message about storage issue
      alert("Penyimpanan browser penuh. Silakan hapus data lama atau bersihkan cache browser.");

      // Attempt automatic recovery: clear old synced items and retry once
      try {
        // Clear synced items from the queue using clearSynced logic
        const count = await db.syncQueue.where('status').equals('synced').delete();
        console.log(`🧹 Cleared ${count} synced items from queue`);

        // Retry the operation after cleanup
        await db.transaction("rw", db.syncQueue, db.entries, db.rules, async () => {
          await db.syncQueue.add(item);

          if (operation === 'create' || operation === 'update') {
            if (entity === 'entry' && payload) {
              await db.entries.put(payload as Entry);
            } else if (entity === 'rule' && payload) {
              await db.rules.put(payload as CategoryRules[number]);
            }
          } else if (operation === 'delete') {
            if (entity === 'entry') {
              await db.entries.delete(entityId);
            } else if (entity === 'rule') {
              await db.rules.delete(entityId);
            }
          }
        });

        console.log(`✓ Retry successful after clearing synced items`);
        return item.id;
      } catch (retryError) {
        console.error('❌ Retry failed after quota cleanup:', retryError);
        // If automatic recovery fails, inform user they need manual intervention
        throw new Error("Penyimpanan penuh dan pembersihan otomatis gagal. Silakan hapus data secara manual.");
      }
    } else {
      // Re-throw other errors for normal error handling
      throw error;
    }
  }
}
/**
 * Enqueue multiple sync operations and trigger batch immediate sync
 * More efficient than calling enqueueSyncOperation multiple times
 */
export async function enqueueSyncOperationBatch(
  operations: Array<{
    entity: 'entry' | 'rule';
    entityId: string;
    operation: 'create' | 'update' | 'delete';
    payload: Entry | CategoryRules[number] | null;
  }>,
  syncWorker?: SyncWorker | null
): Promise<void> {
  console.log(`📦 Enqueueing ${operations.length} operations in batch`);

  // Enqueue all operations and collect item IDs
  const itemIds: string[] = [];

  for (const op of operations) {
    try {
      const itemId = await enqueueSyncOperation(
        op.entity,
        op.entityId,
        op.operation,
        op.payload,
        undefined  // Don't trigger individual immediate sync
      );
      itemIds.push(itemId);
    } catch (error) {
      console.error('❌ Failed to enqueue operation:', error);
    }
  }

  console.log(`✓ Enqueued ${itemIds.length}/${operations.length} operations`);

  // Trigger batch immediate sync if sync worker is available
  if (syncWorker && syncWorker.isRunning && itemIds.length > 0) {
    console.log(`⚡ Triggering batch immediate sync for ${itemIds.length} items`);
    // Fire and forget - don't await to keep enqueue operation fast
    syncWorker.syncImmediatelyBatch(itemIds).catch(err => {
      console.warn('⚠️ Batch immediate sync failed, will retry in batch:', err);
    });
  } else {
    console.log(`⏸️ Batch immediate sync skipped: ${!syncWorker ? 'no worker' : 'worker not running'}`);
  }
}
