# DEPLOY

## 1) Git Workflow (Solo Dev)

### Inisialisasi repo + commit pertama

```bash
git init
git add .
git commit -m "chore: initial KeMana single-device MVP scaffold"
git branch -M main
```

### Hubungkan ke GitHub + push

```bash
git remote add origin git@github.com:<username>/<repo>.git
git push -u origin main
```

Alternatif HTTPS:

```bash
git remote add origin https://github.com/<username>/<repo>.git
git push -u origin main
```

### Tag versi `v0.1.0`

```bash
git tag -a v0.1.0 -m "v0.1.0 single-device MVP"
git push origin v0.1.0
```

### Contoh commit message

- `feat: quick add parser for dense input flow`
- `fix: inline edit amount rounding in entry row`
- `chore: update deployment docs and gitignore`

## 2) Deploy ke Vercel (GitHub Integration)

### Langkah setup

1. Push repo ke GitHub.
2. Di Vercel: `Add New...` -> `Project`.
3. Import repo GitHub KeMana.
4. Set `Framework Preset`: `Next.js` (auto-detected).
5. Set `Root Directory`: `apps/web` (wajib untuk monorepo ini).
6. Build settings:
   - `Install Command`: `npm install`
   - `Build Command`: `npm run build`
   - `Output Directory`: `.next` (atau kosong/default Next.js)
7. `Environment Variables`: tidak ada (kosong).
8. Klik `Deploy`.

### Catatan monorepo penting

- Aplikasi yang dideploy adalah `apps/web`.
- Walaupun nanti root repo punya `package.json`/workspace, Vercel tetap akan install+build berdasarkan `Root Directory = apps/web`.
- Ini mencegah package lain di monorepo ikut dibuild pada Phase 0.

## 3) Cara Test di HP

### Akses URL

1. Buka URL deployment Vercel dari HP.
2. Pastikan halaman terbuka cepat dan input bisa langsung fokus.

### Add to Home Screen

- iOS Safari: `Share` -> `Add to Home Screen`.
- Android Chrome: menu `⋮` -> `Add to Home screen` / `Install app`.

### Checklist uji cepat

- Quick Add: input seperti `kopi 18` bisa tersimpan.
- Add instan via Enter (tanpa modal blocking).
- Dense list: row default collapsed, tap untuk expand.
- Inline edit tetap di halaman yang sama.
- Split equal/custom tetap bisa dipakai.
- Bulk paste multi-line bekerja.
- Delete menampilkan Undo toast dan bisa restore item.
