# Phase 2: Google OAuth + Auto-Sync Architecture Design

## Tanggal: 28 Februari 2026

## Prinsip Utama: Local-First with Background Sync

### Core Philosophy
1. **App selalu offline-capable** - data lokal adalah source of truth
2. **Sync adalah enhancement** - bukan requirement untuk pakai app
3. **Auto-sync background** - user tidak perlu mikir tentang sync
4. **Multi-device seamless** - buka di device lain langsung ada data
5. **Conflict resolution otomatis** - Last-Write-Wins (LWW) by server timestamp

---

## 1. User Journey & States

### State 1: Anonymous User (Offline-Only)
```
User buka app pertama kali
├─ Langsung bisa pakai (no signup wall)
├─ Data tersimpan di IndexedDB lokal
├─ Tidak ada sync
└─ Banner subtle: "Login untuk backup otomatis" (dismissible)
```

### State 2: Logged In User (Auto-Sync Active)
```
User klik "Login dengan Google"
├─ OAuth flow Google
├─ Anonymous data lokal di-migrate ke account
├─ Sync queue aktif background
├─ Setiap create/update/delete → auto enqueue
└─ Sync berjalan otomatis saat online
```

### State 3: Multi-Device Sync
```
User buka app di device baru
├─ Login dengan Google
├─ Initial sync: download semua data dari server
├─ Merge dengan data lokal (jika ada)
├─ Auto-sync aktif untuk perubahan baru
└─ Offline tetap bisa add/edit (sync saat online lagi)
```

---

## 2. Technical Architecture

### 2.1 Auth Flow (Google OAuth)

```typescript
// Supabase Auth Setup
1. Enable Google OAuth provider di Supabase dashboard
2. Enable Email/Password provider di Supabase dashboard
3. Configure OAuth callback: https://kemana.app/auth/callback
4. Store Google Client ID di env

// Frontend Flow - Initial Google Login
┌─────────────────────────────────────────────────────┐
│ User clicks "Login dengan Google"                   │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│ supabase.auth.signInWithOAuth({ provider: 'google' })│
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│ Google OAuth consent screen                         │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│ Redirect ke /auth/callback                          │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│ 1. Get user session from Supabase                   │
│ 2. Migrate local data ke server                     │
│ 3. Activate sync queue                              │
│ 4. Redirect ke home                                 │
└─────────────────────────────────────────────────────┘

// Frontend Flow - Add Password to Google Account
┌─────────────────────────────────────────────────────┐
│ User (logged in via Google) clicks                  │
│ "Tambah password manual"                            │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│ Show password form (password + confirm)             │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│ supabase.auth.updateUser({                          │
│   password: newPassword                             │
│ })                                                  │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│ Success: User can now login with:                   │
│ - Google OAuth (existing)                           │
│ - Email + Password (new)                            │
└─────────────────────────────────────────────────────┘

// Frontend Flow - Login with Email/Password
┌─────────────────────────────────────────────────────┐
│ User enters email + password                        │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│ supabase.auth.signInWithPassword({                  │
│   email: email,                                     │
│   password: password                                │
│ })                                                  │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│ Same flow as Google login:                          │
│ 1. Get session                                      │
│ 2. Initial sync (if new device)                     │
│ 3. Activate sync queue                              │
│ 4. Redirect ke home                                 │
└─────────────────────────────────────────────────────┘
```

### 2.2 Data Migration (Anonymous → Logged In)

```typescript
async function migrateLocalDataToAccount(userId: string) {
  // 1. Load all local data
  const localEntries = await loadEntries(); // from IndexedDB
  const localRules = await loadRules();
  
  // 2. Check if user already has data on server
  const { data: serverEntries } = await supabase
    .from('entries')
    .select('*')
    .eq('owner_id', userId);
  
  // 3. Merge strategy: keep all unique entries
  const mergedEntries = mergeByIdKeepBoth(localEntries, serverEntries);
  
  // 4. Batch upload to server
  await supabase.from('entries').upsert(
    mergedEntries.map(e => ({ ...e, owner_id: userId }))
  );
  
  // 5. Mark local data as synced
  await markAllAsSynced();
  
  // 6. Enable sync queue
  await enableSyncQueue();
}
```

### 2.3 Sync Queue Architecture

```typescript
// Event-based sync queue
interface SyncEvent {
  id: string;                    // UUID for idempotency
  entity: 'entry' | 'rule';      // What to sync
  entityId: string;              // ID of the entity
  operation: 'create' | 'update' | 'delete';
  payload: Entry | CategoryRule | null;
  createdAt: number;             // Timestamp for ordering
  retryCount: number;            // For exponential backoff
  status: 'pending' | 'syncing' | 'synced' | 'failed';
}

// Queue stored in IndexedDB
db.syncQueue.add(event);

// Background worker
class SyncWorker {
  private isRunning = false;
  private retryDelay = 1000; // Start with 1s
  
  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    
    while (this.isRunning) {
      if (!navigator.onLine) {
        await this.sleep(5000); // Check every 5s when offline
        continue;
      }
      
      const pendingEvents = await db.syncQueue
        .where('status').equals('pending')
        .or('status').equals('failed')
        .sortBy('createdAt');
      
      if (pendingEvents.length === 0) {
        await this.sleep(2000); // Idle check every 2s
        continue;
      }
      
      // Process in batches of 10
      const batch = pendingEvents.slice(0, 10);
      await this.processBatch(batch);
    }
  }
  
  async processBatch(events: SyncEvent[]) {
    for (const event of events) {
      try {
        await this.syncEvent(event);
        await db.syncQueue.update(event.id, { status: 'synced' });
      } catch (error) {
        const nextRetry = event.retryCount + 1;
        const delay = Math.min(1000 * Math.pow(2, nextRetry), 30000); // Max 30s
        
        await db.syncQueue.update(event.id, {
          status: 'failed',
          retryCount: nextRetry
        });
        
        // Exponential backoff
        await this.sleep(delay);
      }
    }
  }
  
  async syncEvent(event: SyncEvent) {
    const { entity, entityId, operation, payload } = event;
    
    // Idempotency: use event.id as idempotency key
    const headers = { 'Idempotency-Key': event.id };
    
    if (entity === 'entry') {
      if (operation === 'create' || operation === 'update') {
        await supabase.from('entries').upsert(payload, { headers });
      } else if (operation === 'delete') {
        await supabase.from('entries').delete().eq('id', entityId);
      }
    }
    
    // Similar for rules...
  }
  
  private sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 2.4 Optimistic UI + Background Sync

```typescript
// User adds entry
async function addEntry(entry: Entry) {
  // 1. Save to local IndexedDB immediately (optimistic)
  await db.entries.add(entry);
  
  // 2. Update UI instantly
  updateUIWithNewEntry(entry);
  
  // 3. Enqueue sync event (background, non-blocking)
  if (isLoggedIn()) {
    await db.syncQueue.add({
      id: generateUUID(),
      entity: 'entry',
      entityId: entry.id,
      operation: 'create',
      payload: entry,
      createdAt: Date.now(),
      retryCount: 0,
      status: 'pending'
    });
  }
  
  // 4. Sync worker will pick it up automatically
}

// User edits entry
async function updateEntry(entryId: string, updates: Partial<Entry>) {
  // 1. Update local immediately
  await db.entries.update(entryId, updates);
  
  // 2. Update UI
  updateUIWithChanges(entryId, updates);
  
  // 3. Enqueue sync
  if (isLoggedIn()) {
    const fullEntry = await db.entries.get(entryId);
    await db.syncQueue.add({
      id: generateUUID(),
      entity: 'entry',
      entityId: entryId,
      operation: 'update',
      payload: fullEntry,
      createdAt: Date.now(),
      retryCount: 0,
      status: 'pending'
    });
  }
}

// User deletes entry
async function deleteEntry(entryId: string) {
  // 1. Delete from local
  await db.entries.delete(entryId);
  
  // 2. Update UI
  removeEntryFromUI(entryId);
  
  // 3. Enqueue sync
  if (isLoggedIn()) {
    await db.syncQueue.add({
      id: generateUUID(),
      entity: 'entry',
      entityId: entryId,
      operation: 'delete',
      payload: null,
      createdAt: Date.now(),
      retryCount: 0,
      status: 'pending'
    });
  }
}
```

### 2.5 Initial Sync (New Device)

```typescript
async function initialSyncOnLogin(userId: string) {
  // 1. Show loading indicator (subtle, non-blocking)
  showSyncIndicator('Memuat data...');
  
  // 2. Fetch all data from server
  const { data: serverEntries } = await supabase
    .from('entries')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });
  
  const { data: serverRules } = await supabase
    .from('rules')
    .select('*')
    .eq('owner_id', userId);
  
  // 3. Load local data (might have some from anonymous usage)
  const localEntries = await db.entries.toArray();
  const localRules = await db.rules.toArray();
  
  // 4. Merge: server wins for conflicts, keep unique local
  const mergedEntries = mergeWithServerPriority(localEntries, serverEntries);
  const mergedRules = mergeRules(localRules, serverRules);
  
  // 5. Save merged data to local IndexedDB
  await db.transaction('rw', db.entries, db.rules, async () => {
    await db.entries.clear();
    await db.entries.bulkPut(mergedEntries);
    await db.rules.clear();
    await db.rules.bulkPut(mergedRules);
  });
  
  // 6. Update UI
  refreshUI();
  
  // 7. Start sync worker
  syncWorker.start();
  
  hideSyncIndicator();
}

function mergeWithServerPriority(
  local: Entry[], 
  server: Entry[]
): Entry[] {
  const map = new Map<string, Entry>();
  
  // Add local entries first
  for (const entry of local) {
    map.set(entry.id, entry);
  }
  
  // Server entries override (LWW by updated_at)
  for (const entry of server) {
    const existing = map.get(entry.id);
    if (!existing || entry.updatedAt > existing.updatedAt) {
      map.set(entry.id, entry);
    }
  }
  
  return Array.from(map.values());
}
```

### 2.6 Conflict Resolution (Last-Write-Wins)

```typescript
// Server-side: Supabase RLS + updated_at
// Policy ensures owner_id isolation
// updated_at is server timestamp (now())

// Client-side: Always trust server timestamp
async function resolveConflict(
  localEntry: Entry,
  serverEntry: Entry
): Promise<Entry> {
  // Parse timestamps
  const localTime = new Date(localEntry.updatedAt).getTime();
  const serverTime = new Date(serverEntry.updatedAt).getTime();
  
  // Server timestamp wins
  if (serverTime >= localTime) {
    return serverEntry;
  }
  
  // Local is newer (rare, but possible if sync delayed)
  // Re-sync local to server
  await supabase.from('entries').upsert(localEntry);
  return localEntry;
}
```

---

## 3. Database Schema (Supabase)

### 3.1 Tables

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Entries table
CREATE TABLE entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  raw_input TEXT,
  date DATE NOT NULL,
  category TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'quick_add',
  payment_method TEXT,
  parse_warnings JSONB,
  split JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rules table
CREATE TABLE rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pattern TEXT NOT NULL,
  match TEXT NOT NULL CHECK (match IN ('contains', 'equals')),
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(owner_id, pattern, match)
);

-- Indexes for performance
CREATE INDEX idx_entries_owner_date ON entries(owner_id, date DESC);
CREATE INDEX idx_entries_owner_updated ON entries(owner_id, updated_at DESC);
CREATE INDEX idx_rules_owner ON rules(owner_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_entries_updated_at
  BEFORE UPDATE ON entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rules_updated_at
  BEFORE UPDATE ON rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 3.2 Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;

-- Entries policies
CREATE POLICY "Users can view own entries"
  ON entries FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own entries"
  ON entries FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own entries"
  ON entries FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete own entries"
  ON entries FOR DELETE
  USING (auth.uid() = owner_id);

-- Rules policies (same pattern)
CREATE POLICY "Users can view own rules"
  ON rules FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own rules"
  ON rules FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own rules"
  ON rules FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete own rules"
  ON rules FOR DELETE
  USING (auth.uid() = owner_id);
```

---

## 4. UI/UX Design

### 4.1 Login Banner (Anonymous State)

```
┌─────────────────────────────────────────────────────┐
│ 💾 Login untuk backup otomatis                      │
│ Data kamu aman di semua perangkat                   │
│                                                      │
│ [Login dengan Google]  [Nanti]                      │
└─────────────────────────────────────────────────────┘

Position: Bottom sheet, dismissible
Frequency: Show once per session, max 3 times total
Timing: After user adds 5+ entries (engaged user)
```

### 4.2 Sync Status Indicator

```
Logged In States:

1. Synced (default, subtle)
   ✓ Tersinkron

2. Syncing (active)
   ⟳ Menyinkronkan...

3. Offline (waiting)
   ⚠ Offline - akan sync otomatis

4. Error (rare, retry automatic)
   ⚠ Sync tertunda - mencoba lagi...

Position: Top bar, small badge
Color: Green (synced), Blue (syncing), Gray (offline), Yellow (error)
```

### 4.3 Account Tab (New Bottom Tab)

```
Bottom Navigation:
[Beranda] [Catatan] [Insight] [Akun] ← NEW TAB
```

#### 4.3.1 Account Tab - Anonymous State

```
┌─────────────────────────────────────────────────────┐
│ Akun                                                │
├─────────────────────────────────────────────────────┤
│                                                      │
│ � Komang                                           │
│ [Ubah nama]                                         │
│                                                      │
├─────────────────────────────────────────────────────┤
│ 💾 Backup & Sync                                    │
├─────────────────────────────────────────────────────┤
│ Data kamu hanya tersimpan di perangkat ini          │
│                                                      │
│ [Login dengan Google]                               │
│                                                      │
│ Login untuk:                                        │
│ • Backup otomatis ke cloud                          │
│ • Akses dari perangkat lain                         │
│ • Data tidak hilang                                 │
└─────────────────────────────────────────────────────┘
```

#### 4.3.2 Account Tab - Logged In (Google Only)

```
┌─────────────────────────────────────────────────────┐
│ Akun                                                │
├─────────────────────────────────────────────────────┤
│                                                      │
│ 👤 Komang                                           │
│ [Ubah nama]                                         │
│                                                      │
│ 📧 user@gmail.com                                   │
│ 🔐 Login via Google                                 │
│                                                      │
│ [Tambah password manual] ← NEW                      │
│                                                      │
├─────────────────────────────────────────────────────┤
│ 💾 Backup & Sync                                    │
├─────────────────────────────────────────────────────┤
│ ✓ Sync otomatis aktif                              │
│ 📊 127 transaksi tersinkron                        │
│ 🕐 Terakhir sync: 2 menit lalu                     │
│                                                      │
│ [Paksa sync sekarang]                               │
│                                                      │
├─────────────────────────────────────────────────────┤
│ [Logout]                                            │
└─────────────────────────────────────────────────────┘
```

#### 4.3.3 Account Tab - Logged In (Google + Password)

```
┌─────────────────────────────────────────────────────┐
│ Akun                                                │
├─────────────────────────────────────────────────────┤
│                                                      │
│ 👤 Komang                                           │
│ [Ubah nama]                                         │
│                                                      │
│ 📧 user@gmail.com                                   │
│ 🔐 Login via Google atau Email/Password            │
│                                                      │
│ [Ubah password]                                     │
│                                                      │
├─────────────────────────────────────────────────────┤
│ 💾 Backup & Sync                                    │
├─────────────────────────────────────────────────────┤
│ ✓ Sync otomatis aktif                              │
│ 📊 127 transaksi tersinkron                        │
│ 🕐 Terakhir sync: 2 menit lalu                     │
│                                                      │
│ [Paksa sync sekarang]                               │
│                                                      │
├─────────────────────────────────────────────────────┤
│ [Logout]                                            │
└─────────────────────────────────────────────────────┘
```

### 4.4 Add Password Flow (Link Email/Password to Google Account)

```
User clicks "Tambah password manual"
↓
┌─────────────────────────────────────────────────────┐
│ Tambah Password Manual                              │
├─────────────────────────────────────────────────────┤
│ Setelah ini, kamu bisa login dengan:               │
│ • Google (seperti sekarang)                         │
│ • Email + password                                  │
│                                                      │
│ Email: user@gmail.com (dari Google)                │
│                                                      │
│ Password baru:                                      │
│ [________________]                                  │
│                                                      │
│ Konfirmasi password:                                │
│ [________________]                                  │
│                                                      │
│ ⚠ Password minimal 8 karakter                      │
│                                                      │
│ [Batal]  [Simpan Password]                         │
└─────────────────────────────────────────────────────┘
```

### 4.5 Login Screen (After Password Added)

```
┌─────────────────────────────────────────────────────┐
│ Login ke KeMana                                     │
├─────────────────────────────────────────────────────┤
│                                                      │
│ [Login dengan Google]                               │
│                                                      │
│ ─────────── atau ───────────                       │
│                                                      │
│ Email:                                              │
│ [________________]                                  │
│                                                      │
│ Password:                                           │
│ [________________]                                  │
│                                                      │
│ [Lupa password?]                                    │
│                                                      │
│ [Login]                                             │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### 4.6 Change Name Flow

```
User clicks "Ubah nama"
↓
┌─────────────────────────────────────────────────────┐
│ Ubah Nama Panggilan                                 │
├─────────────────────────────────────────────────────┤
│                                                      │
│ Nama saat ini: Komang                               │
│                                                      │
│ Nama baru:                                          │
│ [________________]                                  │
│                                                      │
│ [Batal]  [Simpan]                                  │
└─────────────────────────────────────────────────────┘
```

---

## 5. Edge Cases & Error Handling

### 5.1 Network Errors

```typescript
// Automatic retry with exponential backoff
// Max retry: 10 times
// Max delay: 30 seconds
// After 10 failures: mark as "sync paused", show user notification

if (syncFailureCount > 10) {
  showNotification({
    title: 'Sync tertunda',
    message: 'Akan dicoba lagi saat koneksi stabil',
    action: 'Coba sekarang'
  });
}
```

### 5.2 User Logs Out

```typescript
async function logout() {
  // 1. Flush pending sync queue first
  await syncWorker.flushAll();
  
  // 2. Clear Supabase session
  await supabase.auth.signOut();
  
  // 3. Keep local data (don't delete)
  // User might want to login again later
  
  // 4. Stop sync worker
  syncWorker.stop();
  
  // 5. Show banner again for re-login
  showLoginBanner();
}
```

### 5.3 User Revokes Google Access

```typescript
// Supabase will trigger auth state change
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    // Handle same as logout
    handleLogout();
  }
  
  if (event === 'TOKEN_REFRESHED') {
    // Continue syncing with new token
    syncWorker.resume();
  }
});
```

### 5.4 Add Password to Google Account

```typescript
async function addPasswordToAccount(password: string) {
  // Validate password strength
  if (password.length < 8) {
    throw new Error('Password minimal 8 karakter');
  }
  
  // Update user with password
  const { data, error } = await supabase.auth.updateUser({
    password: password
  });
  
  if (error) {
    throw new Error('Gagal menambah password: ' + error.message);
  }
  
  // Success: user can now login with email+password
  showNotification({
    title: 'Password berhasil ditambahkan',
    message: 'Sekarang kamu bisa login dengan email atau Google'
  });
  
  // Update UI to show password option
  refreshAccountTab();
}
```

### 5.5 Change Password

```typescript
async function changePassword(newPassword: string) {
  // Validate password strength
  if (newPassword.length < 8) {
    throw new Error('Password minimal 8 karakter');
  }
  
  // Update password
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword
  });
  
  if (error) {
    throw new Error('Gagal mengubah password: ' + error.message);
  }
  
  showNotification({
    title: 'Password berhasil diubah',
    message: 'Password baru sudah aktif'
  });
}
```

### 5.6 Forgot Password Flow

```typescript
async function sendPasswordResetEmail(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://kemana.app/auth/reset-password'
  });
  
  if (error) {
    throw new Error('Gagal mengirim email reset: ' + error.message);
  }
  
  showNotification({
    title: 'Email terkirim',
    message: 'Cek inbox untuk reset password'
  });
}

// On reset password page
async function resetPassword(newPassword: string) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword
  });
  
  if (error) {
    throw new Error('Gagal reset password: ' + error.message);
  }
  
  // Redirect to login
  router.push('/login?message=Password berhasil direset');
}
```

### 5.7 Change Display Name

```typescript
async function changeDisplayName(newName: string) {
  // Validate name
  if (newName.trim().length === 0) {
    throw new Error('Nama tidak boleh kosong');
  }
  
  if (newName.length > 50) {
    throw new Error('Nama maksimal 50 karakter');
  }
  
  // Save to local storage (for anonymous users)
  localStorage.setItem('kemana.userName', newName);
  
  // If logged in, also save to Supabase user metadata
  if (isLoggedIn()) {
    const { data, error } = await supabase.auth.updateUser({
      data: { display_name: newName }
    });
    
    if (error) {
      console.error('Failed to sync name to server:', error);
      // Don't throw - local update already succeeded
    }
  }
  
  // Update UI
  updateDisplayNameInUI(newName);
  
  showNotification({
    title: 'Nama berhasil diubah',
    message: `Halo, ${newName}!`
  });
}
```

### 5.8 Email Already Exists (Edge Case)

```typescript
// When user tries to add password, but email already registered
// This shouldn't happen if they logged in via Google first
// But handle gracefully just in case

async function addPasswordToAccount(password: string) {
  try {
    const { data, error } = await supabase.auth.updateUser({
      password: password
    });
    
    if (error) {
      if (error.message.includes('already registered')) {
        // This means email is already in use by another account
        // Should not happen in normal flow, but handle it
        throw new Error(
          'Email ini sudah terdaftar dengan akun lain. ' +
          'Hubungi support jika ini adalah akun kamu.'
        );
      }
      throw error;
    }
    
    // Success
    return data;
  } catch (error) {
    console.error('Add password error:', error);
    throw error;
  }
}
```

### 5.9 Duplicate Entries (Same ID, Different Devices)

```typescript
// Prevented by:
// 1. UUID v4 for entry IDs (collision probability ~0)
// 2. Server-side upsert with updated_at check
// 3. Client-side merge by ID with LWW

// If somehow duplicate occurs:
await supabase.from('entries').upsert(entry, {
  onConflict: 'id',
  ignoreDuplicates: false // Update existing
});
```

### 5.10 Large Initial Sync (1000+ Entries)

```typescript
async function initialSyncLarge(userId: string) {
  // Paginate server fetch
  const pageSize = 500;
  let page = 0;
  let allEntries: Entry[] = [];
  
  while (true) {
    const { data, error } = await supabase
      .from('entries')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (error || !data || data.length === 0) break;
    
    allEntries = allEntries.concat(data);
    page++;
    
    // Show progress
    updateSyncProgress(allEntries.length);
  }
  
  // Batch insert to IndexedDB
  await db.entries.bulkPut(allEntries);
}
```

---

## 6. Performance Considerations

### 6.1 Sync Queue Optimization

```typescript
// Batch multiple operations on same entity
// Example: User edits entry 3 times quickly
// Queue: [update-1, update-2, update-3]
// Optimize to: [update-3] (only latest)

async function optimizeQueue() {
  const pending = await db.syncQueue
    .where('status').equals('pending')
    .toArray();
  
  // Group by entity + entityId
  const grouped = new Map<string, SyncEvent[]>();
  for (const event of pending) {
    const key = `${event.entity}:${event.entityId}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(event);
  }
  
  // Keep only latest for each entity
  for (const [key, events] of grouped) {
    if (events.length <= 1) continue;
    
    // Sort by createdAt
    events.sort((a, b) => a.createdAt - b.createdAt);
    
    // Delete all except latest
    const toDelete = events.slice(0, -1);
    await db.syncQueue.bulkDelete(toDelete.map(e => e.id));
  }
}
```

### 6.2 Bandwidth Optimization

```typescript
// Only sync changed fields (delta sync)
// For updates, send only modified fields

interface DeltaUpdate {
  id: string;
  updated_at: string;
  changes: Partial<Entry>;
}

// Server endpoint: PATCH /entries/:id
// Body: { text: "new text", amount: 50000 }
// Server merges with existing entry
```

### 6.3 Battery Optimization

```typescript
// Reduce sync frequency when battery low
if ('getBattery' in navigator) {
  const battery = await (navigator as any).getBattery();
  
  if (battery.level < 0.2 && !battery.charging) {
    // Reduce sync frequency
    syncWorker.setInterval(10000); // 10s instead of 2s
  }
}
```

---

## 7. Testing Strategy

### 7.1 Unit Tests

```typescript
// Test sync queue operations
describe('SyncQueue', () => {
  it('enqueues events correctly', async () => {
    await addEntry(mockEntry);
    const queue = await db.syncQueue.toArray();
    expect(queue).toHaveLength(1);
    expect(queue[0].operation).toBe('create');
  });
  
  it('processes events in FIFO order', async () => {
    // Add 3 events
    // Verify processing order
  });
  
  it('retries failed events with backoff', async () => {
    // Mock network failure
    // Verify retry count increases
    // Verify delay increases exponentially
  });
});
```

### 7.2 Integration Tests

```typescript
// Test auth flow
describe('Google OAuth', () => {
  it('migrates local data after login', async () => {
    // Add entries as anonymous
    // Login with Google
    // Verify entries uploaded to server
  });
  
  it('merges server data on new device', async () => {
    // Device A: add entries, sync
    // Device B: login, verify entries appear
  });
});
```

### 7.3 E2E Tests

```typescript
// Test offline/online transitions
test('Offline add syncs when online', async ({ page }) => {
  await page.context().setOffline(true);
  await quickAdd(page, 'offline entry 10k');
  
  await page.context().setOffline(false);
  await page.waitForTimeout(3000); // Wait for sync
  
  // Verify entry on server
  const { data } = await supabase
    .from('entries')
    .select('*')
    .eq('text', 'offline entry');
  
  expect(data).toHaveLength(1);
});
```

---

## 8. Rollout Plan

### Phase 2.1: Auth Foundation (Week 1)
- [ ] Setup Supabase Google OAuth
- [ ] Implement login flow UI
- [ ] Implement auth state management
- [ ] Implement local data migration
- [ ] Test auth flow end-to-end

### Phase 2.2: Sync Queue (Week 2)
- [ ] Implement sync queue in IndexedDB
- [ ] Implement sync worker
- [ ] Implement optimistic UI updates
- [ ] Test queue processing
- [ ] Test retry logic

### Phase 2.3: Initial Sync (Week 3)
- [ ] Implement server data fetch
- [ ] Implement merge logic
- [ ] Implement conflict resolution
- [ ] Test multi-device sync
- [ ] Test large dataset sync

### Phase 2.4: Polish & Edge Cases (Week 4)
- [ ] Implement sync status indicator
- [ ] Implement error handling
- [ ] Implement logout flow
- [ ] Performance optimization
- [ ] Battery optimization
- [ ] E2E testing

### Phase 2.5: Beta Testing (Week 5)
- [ ] Internal dogfooding with 2+ devices
- [ ] Monitor sync reliability
- [ ] Fix critical bugs
- [ ] Tune retry parameters
- [ ] Prepare for production

---

## 9. Monitoring & Observability

### 9.1 Client-Side Metrics

```typescript
// Track sync health locally
interface SyncMetrics {
  totalSynced: number;
  totalFailed: number;
  lastSyncAt: number;
  averageSyncTime: number;
  queueSize: number;
}

// Store in IndexedDB meta table
await db.meta.put({
  key: 'sync_metrics',
  value: JSON.stringify(metrics)
});
```

### 9.2 Server-Side Monitoring (Future)

```typescript
// Supabase Edge Functions for monitoring
// Track:
// - Sync request rate per user
// - Failed sync attempts
// - Conflict resolution frequency
// - Average sync latency
```

---

## 10. Security Checklist

- [ ] RLS policies tested for all tables
- [ ] No service role key in client
- [ ] OAuth callback URL whitelisted
- [ ] HTTPS only for all requests
- [ ] Token refresh handled automatically
- [ ] Logout clears sensitive data
- [ ] No PII in error logs
- [ ] Rate limiting on sync endpoints (future)

---

## 11. Success Metrics

### Technical Metrics
- Sync success rate: > 99.5%
- Average sync latency: < 2 seconds
- Conflict rate: < 0.1%
- Queue processing time: < 5 seconds for 100 events

### User Metrics
- Login conversion: > 30% after 10+ entries
- Multi-device usage: > 20% of logged-in users
- Sync-related support tickets: < 1% of users
- User retention (logged in): > 80% after 30 days

---

## 12. Future Enhancements (Phase 3+)

- [ ] Apple Sign In (iOS users)
- [ ] Selective sync (date range filter)
- [ ] Sync pause/resume manual control
- [ ] Conflict resolution UI (show both versions)
- [ ] Export sync logs for debugging
- [ ] Realtime sync (WebSocket) for instant multi-device
- [ ] Offline-first PWA install prompt after login
- [ ] Profile picture upload
- [ ] Email change feature (with verification)
- [ ] Account deletion with data export

---

## 13. Account Management Features (Phase 2.1)

### 13.1 Display Name Management

**Feature:** User dapat mengubah nama panggilan kapan saja
**Storage:** 
- Anonymous: localStorage only
- Logged in: localStorage + Supabase user metadata

**Implementation:**
```typescript
interface UserProfile {
  displayName: string;
  email?: string;
  authProvider: 'anonymous' | 'google' | 'email';
  hasPassword: boolean;
}

async function updateDisplayName(newName: string): Promise<void> {
  // Validate
  if (!newName.trim() || newName.length > 50) {
    throw new Error('Nama tidak valid');
  }
  
  // Update local
  localStorage.setItem('kemana.userName', newName);
  
  // Update server if logged in
  if (isLoggedIn()) {
    await supabase.auth.updateUser({
      data: { display_name: newName }
    });
  }
  
  // Refresh UI
  updateUIDisplayName(newName);
}
```

### 13.2 Password Management

**Add Password (Google → Google + Email/Password):**
- User logged in via Google
- Clicks "Tambah password manual"
- Enters new password (min 8 chars)
- Supabase links password to existing account
- User can now login with either method

**Change Password:**
- User already has password
- Clicks "Ubah password"
- Enters new password
- Supabase updates password

**Forgot Password:**
- User on login screen
- Clicks "Lupa password?"
- Enters email
- Supabase sends reset email
- User clicks link, sets new password

**Implementation:**
```typescript
// Add password to Google account
async function addPassword(password: string): Promise<void> {
  if (password.length < 8) {
    throw new Error('Password minimal 8 karakter');
  }
  
  const { error } = await supabase.auth.updateUser({
    password: password
  });
  
  if (error) throw error;
  
  // Update local state
  setHasPassword(true);
}

// Change existing password
async function changePassword(newPassword: string): Promise<void> {
  if (newPassword.length < 8) {
    throw new Error('Password minimal 8 karakter');
  }
  
  const { error } = await supabase.auth.updateUser({
    password: newPassword
  });
  
  if (error) throw error;
}

// Request password reset
async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`
  });
  
  if (error) throw error;
}

// Reset password (from email link)
async function resetPassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    password: newPassword
  });
  
  if (error) throw error;
}
```

### 13.3 Account Tab Navigation Structure

```
Bottom Tabs:
┌──────────┬──────────┬──────────┬──────────┐
│ Beranda  │ Catatan  │ Insight  │  Akun    │
└──────────┴──────────┴──────────┴──────────┘
                                      ↑
                                   NEW TAB

Account Tab Sections:
1. Profile
   - Display name (editable)
   - Email (read-only, from auth provider)
   - Auth method indicator
   
2. Password Management (if logged in)
   - Add password (if Google only)
   - Change password (if has password)
   
3. Backup & Sync
   - Sync status
   - Last sync time
   - Entry count
   - Force sync button
   
4. Actions
   - Logout button
```

### 13.4 Login Methods Matrix

| Initial Login | Can Add Password? | Can Login With |
|---------------|-------------------|----------------|
| Anonymous | No | N/A (not logged in) |
| Google OAuth | Yes | Google only → Google + Email/Password |
| Email/Password | N/A (already has) | Email/Password only |

**Note:** User yang login via Google bisa menambah password, sehingga punya 2 cara login. User yang login via Email/Password tidak bisa link ke Google (Phase 3 feature).

### 13.5 Security Considerations

**Password Requirements:**
- Minimum 8 characters
- No maximum (Supabase handles)
- No complexity requirements (for UX simplicity)
- Consider adding strength indicator (optional)

**Session Management:**
- Supabase handles token refresh automatically
- Session expires after 1 hour (default)
- Refresh token valid for 30 days
- Auto-refresh before expiry

**Email Verification:**
- Not required for MVP (Google already verified)
- For email/password signup (Phase 3), require verification

**Rate Limiting:**
- Supabase has built-in rate limiting
- Password reset: max 1 email per minute per email address
- Login attempts: max 5 failed attempts per hour

---

## Conclusion

Strategi ini memastikan:
1. ✅ App tetap offline-capable (local-first)
2. ✅ Sync otomatis background (zero friction)
3. ✅ Multi-device seamless (login langsung ada data)
4. ✅ Conflict resolution otomatis (LWW)
5. ✅ Performance optimal (batching, retry, optimization)
6. ✅ Security solid (RLS, OAuth, HTTPS)

User experience: "It just works" - data selalu ada, sync tidak terasa.
