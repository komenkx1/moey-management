# Debug: Clear Local Database

Jika ada masalah dengan data lokal yang corrupt, jalankan ini di browser console:

## Clear All Local Data

```javascript
// Clear IndexedDB
await db.delete();
console.log('IndexedDB cleared');

// Clear localStorage
localStorage.clear();
console.log('localStorage cleared');

// Reload page
location.reload();
```

## Clear Only Entries

```javascript
// Clear entries only
await db.entries.clear();
console.log('Entries cleared');

// Reload
location.reload();
```

## Check Current Data

```javascript
// Check entries
const entries = await db.entries.toArray();
console.log('Entries:', entries);

// Check if any have invalid owner_id
const invalid = entries.filter(e => e.owner_id && e.owner_id.length < 30);
console.log('Invalid owner_id:', invalid);
```

## Fix Invalid owner_id

```javascript
// Remove owner_id from all local entries
const entries = await db.entries.toArray();
const fixed = entries.map(e => {
  const { owner_id, ...rest } = e;
  return rest;
});

await db.entries.clear();
await db.entries.bulkPut(fixed);
console.log('Fixed', fixed.length, 'entries');
```

## After Clearing

1. Refresh page
2. Add new transactions
3. Login with Google
4. Should work now!
