# KeMana Landing

Landing page terpisah untuk menjelaskan produk KeMana dengan pendekatan ringan, SEO-friendly, dan siap dijadikan project Vercel terpisah.

## Jalankan lokal

```bash
npm --prefix apps/landing install
npm --prefix apps/landing run dev
```

Buka `http://127.0.0.1:3006`.

## Environment

Salin `.env.example` menjadi `.env.local`, lalu isi:

- `NEXT_PUBLIC_SITE_URL`: domain final landing page
- `NEXT_PUBLIC_APP_URL`: URL aplikasi utama yang akan dituju CTA
- `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`: opsional, untuk tag Search Console

## Deploy ke Vercel

1. Buat project baru di Vercel.
2. Pilih repo ini.
3. Set `Root Directory` ke `apps/landing`.
4. Set env vars dari `.env.example`.
5. Deploy.

Karena app ini berbasis Next.js App Router tanpa dependency UI tambahan, bundle klien tetap kecil dan sebagian besar halaman dirender dari server component.
