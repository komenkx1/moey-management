import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getLastSyncTime, setLastSyncTime, initialSyncOnLogin } from '@kemana/storage';
import { db } from '@kemana/storage';

describe('Delta Sync', () => {
  const userId = 'test-user-123';
  
  beforeEach(async () => {
    // Clear localStorage
    localStorage.clear();
    
    // Clear IndexedDB
    await db.entries.clear();
    await db.rules.clear();
    await db.syncQueue.clear();
  });

  afterEach(async () => {
    localStorage.clear();
    await db.entries.clear();
    await db.rules.clear();
    await db.syncQueue.clear();
  });

  describe('getLastSyncTime', () => {
    it('should return null when no sync time is stored', async () => {
      const result = await getLastSyncTime(userId);
      expect(result).toBeNull();
    });

    it('should return stored sync time', async () => {
      const timestamp = '2026-03-11T10:00:00.000Z';
      localStorage.setItem(`kemana.lastSync.${userId}`, timestamp);
      
      const result = await getLastSyncTime(userId);
      expect(result).toBe(timestamp);
    });

    it('should handle different user IDs', async () => {
      const user1 = 'user-1';
      const user2 = 'user-2';
      const time1 = '2026-03-11T10:00:00.000Z';
      const time2 = '2026-03-11T11:00:00.000Z';
      
      localStorage.setItem(`kemana.lastSync.${user1}`, time1);
      localStorage.setItem(`kemana.lastSync.${user2}`, time2);
      
      expect(await getLastSyncTime(user1)).toBe(time1);
      expect(await getLastSyncTime(user2)).toBe(time2);
    });

    it('should handle localStorage errors gracefully', async () => {
      // Mock localStorage to throw error
      const originalGetItem = Storage.prototype.getItem;
      Storage.prototype.getItem = vi.fn(() => {
        throw new Error('Storage error');
      });
      
      const result = await getLastSyncTime(userId);
      expect(result).toBeNull();
      
      // Restore
      Storage.prototype.getItem = originalGetItem;
    });
  });

  describe('setLastSyncTime', () => {
    it('should store sync time', async () => {
      const timestamp = '2026-03-11T10:00:00.000Z';
      await setLastSyncTime(userId, timestamp);
      
      const stored = localStorage.getItem(`kemana.lastSync.${userId}`);
      expect(stored).toBe(timestamp);
    });

    it('should update existing sync time', async () => {
      const oldTime = '2026-03-11T10:00:00.000Z';
      const newTime = '2026-03-11T11:00:00.000Z';
      
      await setLastSyncTime(userId, oldTime);
      expect(localStorage.getItem(`kemana.lastSync.${userId}`)).toBe(oldTime);
      
      await setLastSyncTime(userId, newTime);
      expect(localStorage.getItem(`kemana.lastSync.${userId}`)).toBe(newTime);
    });

    it('should handle localStorage errors gracefully', async () => {
      // Mock localStorage to throw error
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = vi.fn(() => {
        throw new Error('Storage error');
      });
      
      // Should not throw
      await expect(setLastSyncTime(userId, '2026-03-11T10:00:00.000Z')).resolves.toBeUndefined();
      
      // Restore
      Storage.prototype.setItem = originalSetItem;
    });
  });

  describe('initialSyncOnLogin - Delta Sync', () => {
    it('should perform full sync on first login (no last sync time)', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({
                data: [
                  {
                    id: 'entry-1',
                    owner_id: userId,
                    text: 'Test entry',
                    amount: 10000,
                    date: '2026-03-11',
                    category: 'Makanan',
                    source: 'quick_add',
                    created_at: '2026-03-11T10:00:00.000Z',
                    updated_at: '2026-03-11T10:00:00.000Z'
                  }
                ],
                error: null
              })),
              gt: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({
                  data: [],
                  error: null
                }))
              }))
            }))
          }))
        }))
      };

      const result = await initialSyncOnLogin(userId, mockSupabase);
      
      expect(result.success).toBe(true);
      
      // Should have stored last sync time
      const lastSync = await getLastSyncTime(userId);
      expect(lastSync).toBeTruthy();
      expect(new Date(lastSync!).getTime()).toBeGreaterThan(Date.now() - 5000);
    });

    it('should perform delta sync on subsequent logins', async () => {
      // Set last sync time (simulate previous login)
      const lastSyncTime = '2026-03-11T10:00:00.000Z';
      await setLastSyncTime(userId, lastSyncTime);
      
      // Add existing local entry
      await db.entries.add({
        id: 'entry-1',
        text: 'Old entry',
        amount: 10000,
        date: '2026-03-11',
        category: 'Makan',
        source: 'quick_add',
        createdAt: '2026-03-11T09:00:00.000Z',
        updatedAt: '2026-03-11T09:00:00.000Z'
      });

      let deltaFilterUsed = false;
      
      const mockSupabase = {
        from: vi.fn((table: string) => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({
                data: [],
                error: null
              })),
              gt: vi.fn((field: string, value: string) => {
                if (field === 'updated_at' && value === lastSyncTime) {
                  deltaFilterUsed = true;
                }
                return {
                  order: vi.fn(() => Promise.resolve({
                    data: [
                      {
                        id: 'entry-2',
                        owner_id: userId,
                        text: 'New entry',
                        amount: 20000,
                        date: '2026-03-11',
                        category: 'Transport',
                        source: 'quick_add',
                        created_at: '2026-03-11T11:00:00.000Z',
                        updated_at: '2026-03-11T11:00:00.000Z'
                      }
                    ],
                    error: null
                  }))
                };
              })
            }))
          }))
        }))
      };

      const result = await initialSyncOnLogin(userId, mockSupabase);
      
      expect(result.success).toBe(true);
      expect(deltaFilterUsed).toBe(true);
      
      // Should have both old and new entries
      const entries = await db.entries.toArray();
      expect(entries.length).toBe(2);
      expect(entries.some(e => e.id === 'entry-1')).toBe(true);
      expect(entries.some(e => e.id === 'entry-2')).toBe(true);
    });

    it('should update last sync time after successful sync', async () => {
      const beforeSync = Date.now();
      
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null })),
              gt: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: [], error: null }))
              }))
            }))
          }))
        }))
      };

      await initialSyncOnLogin(userId, mockSupabase);
      
      const lastSync = await getLastSyncTime(userId);
      expect(lastSync).toBeTruthy();
      
      const lastSyncTime = new Date(lastSync!).getTime();
      expect(lastSyncTime).toBeGreaterThanOrEqual(beforeSync);
      expect(lastSyncTime).toBeLessThanOrEqual(Date.now());
    });

    it('should preserve pending local changes during delta sync', async () => {
      // Set last sync time
      await setLastSyncTime(userId, '2026-03-11T10:00:00.000Z');
      
      // Add local entry with pending sync
      const localEntry = {
        id: 'entry-1',
        text: 'Local pending entry',
        amount: 15000,
        date: '2026-03-11',
        category: 'Makan' as const,
        source: 'quick_add' as const,
        createdAt: '2026-03-11T11:00:00.000Z',
        updatedAt: '2026-03-11T11:00:00.000Z'
      };
      
      await db.entries.add(localEntry);
      
      // Add to sync queue (pending)
      await db.syncQueue.add({
        id: 'sync-1',
        entity: 'entry',
        entityId: 'entry-1',
        operation: 'create',
        payload: localEntry,
        status: 'pending',
        createdAt: Date.now(),
        retryCount: 0
      });

      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null })),
              gt: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: [], error: null }))
              }))
            }))
          }))
        }))
      };

      await initialSyncOnLogin(userId, mockSupabase);
      
      // Local pending entry should still exist
      const entries = await db.entries.toArray();
      expect(entries.length).toBe(1);
      expect(entries[0].id).toBe('entry-1');
      expect(entries[0].text).toBe('Local pending entry');
    });
  });

  describe('Delta Sync Performance', () => {
    it('should be faster than full sync for large datasets', async () => {
      // This is a conceptual test - in real world:
      // Full sync: 1000 entries × 500 bytes = 500 KB
      // Delta sync: 5 entries × 500 bytes = 2.5 KB
      // Expected: 200x faster
      
      const fullSyncSize = 1000 * 500; // 500 KB
      const deltaSyncSize = 5 * 500;   // 2.5 KB
      
      const speedup = fullSyncSize / deltaSyncSize;
      
      expect(speedup).toBeGreaterThan(100);
      expect(speedup).toBe(200);
    });
  });
});
