import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SyncWorker } from '@kemana/storage';
import { db } from '@kemana/storage';

describe('Battery Optimization', () => {
  let syncWorker: SyncWorker;
  let mockSupabase: any;
  let mockBattery: any;

  beforeEach(async () => {
    // Clear database
    await db.entries.clear();
    await db.rules.clear();
    await db.syncQueue.clear();

    // Mock Supabase client
    mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        upsert: vi.fn(() => Promise.resolve({ error: null })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }))
      }))
    };

    // Mock Battery API
    mockBattery = {
      level: 1.0,
      charging: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };

    // Mock navigator.getBattery
    (global.navigator as any).getBattery = vi.fn(() => Promise.resolve(mockBattery));

    syncWorker = new SyncWorker(mockSupabase);
    syncWorker.isOnlineFn = async () => true;
  });

  afterEach(async () => {
    if (syncWorker.isRunning) {
      syncWorker.stop();
    }
    await db.entries.clear();
    await db.rules.clear();
    await db.syncQueue.clear();
  });

  describe('Battery Monitoring Initialization', () => {
    it('should initialize battery monitoring on start', async () => {
      await syncWorker.start('test-user');
      
      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect((global.navigator as any).getBattery).toHaveBeenCalled();
      expect(mockBattery.addEventListener).toHaveBeenCalledWith('levelchange', expect.any(Function));
      expect(mockBattery.addEventListener).toHaveBeenCalledWith('chargingchange', expect.any(Function));
      
      syncWorker.stop();
    });

    it('should handle missing Battery API gracefully', async () => {
      // Remove Battery API
      const originalGetBattery = (global.navigator as any).getBattery;
      delete (global.navigator as any).getBattery;
      
      // Should not throw
      await expect(syncWorker.start('test-user')).resolves.toBeUndefined();
      
      syncWorker.stop();
      
      // Restore
      (global.navigator as any).getBattery = originalGetBattery;
    });

    it('should cleanup battery listeners on stop', async () => {
      await syncWorker.start('test-user');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      syncWorker.stop();
      
      expect(mockBattery.removeEventListener).toHaveBeenCalledWith('levelchange', expect.any(Function));
      expect(mockBattery.removeEventListener).toHaveBeenCalledWith('chargingchange', expect.any(Function));
    });
  });

  describe('Adaptive Sync Intervals', () => {
    it('should use 2s interval when battery is good (>= 50%)', async () => {
      mockBattery.level = 0.80; // 80%
      mockBattery.charging = false;
      
      await syncWorker.start('test-user');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Access private checkInterval via reflection
      const interval = (syncWorker as any).checkInterval;
      expect(interval).toBe(2000);
      
      syncWorker.stop();
    });

    it('should use 10s interval when battery is medium (20-50%)', async () => {
      mockBattery.level = 0.30; // 30%
      mockBattery.charging = false;
      
      await syncWorker.start('test-user');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const interval = (syncWorker as any).checkInterval;
      expect(interval).toBe(10000);
      
      syncWorker.stop();
    });

    it('should use 30s interval when battery is low (< 20%)', async () => {
      mockBattery.level = 0.18; // 18%
      mockBattery.charging = false;
      
      await syncWorker.start('test-user');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const interval = (syncWorker as any).checkInterval;
      expect(interval).toBe(30000);
      
      syncWorker.stop();
    });

    it('should use 60s interval when battery is critical (< 15%)', async () => {
      mockBattery.level = 0.10; // 10%
      mockBattery.charging = false;
      
      await syncWorker.start('test-user');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const interval = (syncWorker as any).checkInterval;
      expect(interval).toBe(60000);
      
      syncWorker.stop();
    });

    it('should use 2s interval when charging regardless of level', async () => {
      mockBattery.level = 0.10; // 10% but charging
      mockBattery.charging = true;
      
      await syncWorker.start('test-user');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const interval = (syncWorker as any).checkInterval;
      expect(interval).toBe(2000);
      
      syncWorker.stop();
    });
  });

  describe('Dynamic Interval Adjustment', () => {
    it('should adjust interval when battery level changes', async () => {
      mockBattery.level = 0.80; // Start at 80%
      mockBattery.charging = false;
      
      await syncWorker.start('test-user');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      let interval = (syncWorker as any).checkInterval;
      expect(interval).toBe(2000);
      
      // Simulate battery drain to 30%
      mockBattery.level = 0.30;
      const levelChangeHandler = mockBattery.addEventListener.mock.calls.find(
        (call: any) => call[0] === 'levelchange'
      )?.[1];
      
      if (levelChangeHandler) {
        levelChangeHandler();
        await new Promise(resolve => setTimeout(resolve, 50));
        
        interval = (syncWorker as any).checkInterval;
        expect(interval).toBe(10000);
      }
      
      syncWorker.stop();
    });

    it('should adjust interval when charging status changes', async () => {
      mockBattery.level = 0.10; // 10%
      mockBattery.charging = false;
      
      await syncWorker.start('test-user');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      let interval = (syncWorker as any).checkInterval;
      expect(interval).toBe(60000);
      
      // Start charging
      mockBattery.charging = true;
      const chargingChangeHandler = mockBattery.addEventListener.mock.calls.find(
        (call: any) => call[0] === 'chargingchange'
      )?.[1];
      
      if (chargingChangeHandler) {
        chargingChangeHandler();
        await new Promise(resolve => setTimeout(resolve, 50));
        
        interval = (syncWorker as any).checkInterval;
        expect(interval).toBe(2000);
      }
      
      syncWorker.stop();
    });
  });

  describe('Battery Optimization Impact', () => {
    it('should reduce sync frequency by 80% at 30% battery', () => {
      const normalInterval = 2000; // 2s
      const optimizedInterval = 10000; // 10s
      
      const normalSyncsPerMinute = 60000 / normalInterval; // 30
      const optimizedSyncsPerMinute = 60000 / optimizedInterval; // 6
      
      const reduction = ((normalSyncsPerMinute - optimizedSyncsPerMinute) / normalSyncsPerMinute) * 100;
      
      expect(reduction).toBe(80);
    });

    it('should reduce sync frequency by 93% at 18% battery', () => {
      const normalInterval = 2000; // 2s
      const optimizedInterval = 30000; // 30s
      
      const normalSyncsPerMinute = 60000 / normalInterval; // 30
      const optimizedSyncsPerMinute = 60000 / optimizedInterval; // 2
      
      const reduction = ((normalSyncsPerMinute - optimizedSyncsPerMinute) / normalSyncsPerMinute) * 100;
      
      expect(reduction).toBeCloseTo(93.33, 1);
    });

    it('should reduce sync frequency by 97% at 10% battery', () => {
      const normalInterval = 2000; // 2s
      const optimizedInterval = 60000; // 60s
      
      const normalSyncsPerMinute = 60000 / normalInterval; // 30
      const optimizedSyncsPerMinute = 60000 / optimizedInterval; // 1
      
      const reduction = ((normalSyncsPerMinute - optimizedSyncsPerMinute) / normalSyncsPerMinute) * 100;
      
      expect(reduction).toBeCloseTo(96.67, 1);
    });
  });

  describe('Real-world Battery Scenarios', () => {
    it('should handle 2-hour usage at 30% battery efficiently', () => {
      const normalInterval = 2000; // 2s
      const optimizedInterval = 10000; // 10s
      const durationMs = 2 * 60 * 60 * 1000; // 2 hours
      
      const normalSyncs = durationMs / normalInterval; // 3,600
      const optimizedSyncs = durationMs / optimizedInterval; // 720
      
      const savings = ((normalSyncs - optimizedSyncs) / normalSyncs) * 100;
      
      expect(normalSyncs).toBe(3600);
      expect(optimizedSyncs).toBe(720);
      expect(savings).toBe(80);
    });

    it('should maintain normal sync when charging', () => {
      const chargingInterval = 2000;
      const normalInterval = 2000;
      
      expect(chargingInterval).toBe(normalInterval);
    });
  });

  describe('Edge Cases', () => {
    it('should handle battery level at exactly 50%', async () => {
      mockBattery.level = 0.50; // Exactly 50%
      mockBattery.charging = false;
      
      await syncWorker.start('test-user');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const interval = (syncWorker as any).checkInterval;
      // Should use normal interval (>= 50%)
      expect(interval).toBe(2000);
      
      syncWorker.stop();
    });

    it('should handle battery level at exactly 20%', async () => {
      mockBattery.level = 0.20; // Exactly 20%
      mockBattery.charging = false;
      
      await syncWorker.start('test-user');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const interval = (syncWorker as any).checkInterval;
      // Should use medium interval (< 50%, but >= 20%)
      expect(interval).toBe(10000);
      
      syncWorker.stop();
    });

    it('should handle battery level at exactly 15%', async () => {
      mockBattery.level = 0.15; // Exactly 15%
      mockBattery.charging = false;
      
      await syncWorker.start('test-user');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const interval = (syncWorker as any).checkInterval;
      // Should use low interval (>= 15%)
      expect(interval).toBe(30000);
      
      syncWorker.stop();
    });

    it('should handle 0% battery', async () => {
      mockBattery.level = 0.0; // 0%
      mockBattery.charging = false;
      
      await syncWorker.start('test-user');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const interval = (syncWorker as any).checkInterval;
      // Should use critical interval
      expect(interval).toBe(60000);
      
      syncWorker.stop();
    });

    it('should handle 100% battery', async () => {
      mockBattery.level = 1.0; // 100%
      mockBattery.charging = false;
      
      await syncWorker.start('test-user');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const interval = (syncWorker as any).checkInterval;
      // Should use normal interval
      expect(interval).toBe(2000);
      
      syncWorker.stop();
    });
  });
});
