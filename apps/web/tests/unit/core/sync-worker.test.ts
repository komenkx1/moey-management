import { describe, expect, it, beforeEach, vi } from "vitest";
import { db, SyncWorker, enqueueSyncOperation, generateSyncId } from "@kemana/storage";

describe("SyncWorker", () => {
  let mockSupabase: any;
  let worker: SyncWorker;

  beforeEach(async () => {
    await db.syncQueue.clear();
    
    mockSupabase = {
      from: vi.fn(() => ({
        upsert: vi.fn().mockResolvedValue({ error: null }),
        delete: vi.fn().mockResolvedValue({ error: null })
      }))
    };

    worker = new SyncWorker(mockSupabase);
    (worker as any).sleep = vi.fn().mockResolvedValue(undefined); // Fast forward sleep timeouts
  });

  describe("flushAll", () => {
    it("should process pending items in the queue", async () => {
       (worker as any).userId = "test-user-123";
       (worker as any).isRunning = true;

       await enqueueSyncOperation("entry", "entry-1", "create", {
         id: "entry-1",
         text: "Sync Test",
         amount: 1000,
         date: new Date().toISOString(),
         category: "Lainnya",
         source: "quick_add",
         createdAt: new Date().toISOString(),
         updatedAt: new Date().toISOString()
       });

       await worker.flushAll();

       const items = await db.syncQueue.toArray();
       expect(items).toHaveLength(1);
       expect(items[0].status).toBe("synced");
       expect(mockSupabase.from).toHaveBeenCalledWith("entries");
    });

    it("should handle upsert failures safely without crashing", async () => {
       (worker as any).userId = "test-user-123";
       (worker as any).isRunning = true;

       mockSupabase.from.mockImplementation(() => ({
         upsert: vi.fn().mockRejectedValue(new Error("Network Error"))
       }));

       await enqueueSyncOperation("entry", "entry-fail", "create", {
         id: "entry-fail",
         text: "Sync Test Fail",
         amount: 1000,
         date: new Date().toISOString(),
         category: "Lainnya",
         source: "quick_add",
         createdAt: new Date().toISOString(),
         updatedAt: new Date().toISOString()
       });

       await worker.flushAll();

       const items = await db.syncQueue.toArray();
       expect(items).toHaveLength(1);
       expect(items[0].status).toBe("pending");
       expect(items[0].retryCount).toBe(1);
    });

    it("should gracefully do nothing if queue is empty", async () => {
       (worker as any).userId = "test-user-123";
       (worker as any).isRunning = true;
       await worker.flushAll(); 
       const items = await db.syncQueue.toArray();
       expect(items).toHaveLength(0);
    });
  });

  describe("clearSynced", () => {
    it("should remove all synced items from the queue", async () => {
       await db.syncQueue.add({
         id: generateSyncId(),
         entity: "entry",
         entityId: "1",
         operation: "create",
         payload: null,
         createdAt: Date.now(),
         retryCount: 0,
         status: "synced"
       });
       await db.syncQueue.add({
         id: generateSyncId(),
         entity: "entry",
         entityId: "2",
         operation: "create",
         payload: null,
         createdAt: Date.now(),
         retryCount: 0,
         status: "pending"
       });

       const cleared = await worker.clearSynced();
       expect(cleared).toBe(1);

       const remaining = await db.syncQueue.toArray();
       expect(remaining).toHaveLength(1);
       expect(remaining[0].status).toBe("pending");
    });
  });
});
