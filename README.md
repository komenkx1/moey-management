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

## Release ke Git (Dengan Validasi)

Jalankan satu perintah ini dari root repo:

```bash
./scripts/release-and-push.sh
```

Alur otomatis:
1. Menjalankan test (`apps/web`)
2. Meminta input versi (mis. `0.1.1` atau `v0.1.1`)
3. Membuat annotated tag release
4. Push branch aktif + push tag ke `origin`
