# KeMana

KeMana adalah aplikasi pencatatan pengeluaran single-device, local-first, dengan fokus input cepat: "Biar tau uangmu kemana".

## Menjalankan Lokal

```bash
nvm use 22
cd apps/web
npm install
npm run dev
```

Buka `http://localhost:3000`.

## Struktur Repo (Monorepo Sederhana)

- `apps/web`: aplikasi Next.js utama
- `packages/core`: domain logic reusable (parser/split/rules)
- `packages/storage`: storage adapter reusable

## Deploy

Panduan push GitHub + deploy Vercel ada di `DEPLOY.md`.
