export const siteConfig = {
  name: "KeMana",
  title: "KeMana | Aplikasi Catat Pengeluaran Harian yang Ringan",
  description:
    "KeMana adalah aplikasi catat pengeluaran harian dan expense tracker Indonesia yang ringan. Bantu kamu mencatat uang keluar dengan cepat, membaca insight, dan tetap tahu uangmu ke mana tanpa alur yang ribet.",
  keywords: [
    "KeMana",
    "KeMana app",
    "KeMana aplikasi",
    "KeMana catat pengeluaran",
    "aplikasi catat pengeluaran",
    "aplikasi catat pengeluaran harian",
    "expense tracker indonesia",
    "aplikasi pencatatan pengeluaran",
    "budgeting harian",
    "pencatatan keuangan pribadi",
    "catat uang keluar",
    "aplikasi keuangan local first",
    "aplikasi keuangan yang ringan",
    "expense tracker local first",
    "money tracking indonesia"
  ],
  navigation: [
    { label: "Fitur", href: "#fitur" },
    { label: "Alur", href: "#alur" },
    { label: "FAQ", href: "#faq" }
  ],
  proofPoints: [
    {
      value: "4 rentang waktu",
      label: "Hari ini, 7 hari, 30 hari, dan custom range untuk membaca pola."
    },
    {
      value: "3 pemicu recall",
      label: "Gap, first today, dan comeback prompt untuk bantu mengingat transaksi."
    },
    {
      value: "JSON + CSV",
      label: "Import dan export tersedia supaya data tetap mudah dibawa ke alur lain."
    }
  ],
  featureCards: [
    {
      tag: "Quick Add",
      title: "Catat seperti cara kamu bicara sehari-hari",
      description:
        "Sebagai aplikasi catat pengeluaran harian, KeMana memudahkan kamu memasukkan uang keluar dengan bahasa natural seperti `kopi 28k`, `parkir 5 ribu`, atau beberapa item sekaligus tanpa form panjang."
    },
    {
      tag: "Local-first",
      title: "Tetap terasa cepat walau koneksi tidak ideal",
      description:
        "Pengalaman inti dirancang local-first supaya aplikasi pencatatan pengeluaran tetap responsif. Saat kamu butuh, alur sinkronisasi multi-device juga sudah disiapkan."
    },
    {
      tag: "Insight",
      title: "Cukup insight untuk mengambil keputusan, tanpa noise",
      description:
        "Lihat total pengeluaran, tren per periode, kategori dominan, dan konteks yang relevan untuk evaluasi budgeting harian tanpa dashboard yang melelahkan."
    },
    {
      tag: "Recall",
      title: "Smart recall dan Night Close menjaga ritme",
      description:
        "KeMana membantu mengingat transaksi yang mungkin terlewat, lalu menutup hari dengan review singkat supaya kebiasaan mencatat uang keluar tetap konsisten."
    }
  ],
  workflowSteps: [
    {
      step: "01",
      title: "Catat saat transaksi baru lewat",
      description:
        "Friksi dibuat serendah mungkin, dari quick add natural language sampai quick recall untuk transaksi berulang supaya aplikasi keuangan pribadi ini benar-benar kepakai setiap hari."
    },
    {
      step: "02",
      title: "Baca pola tanpa membuka laporan yang melelahkan",
      description:
        "Ringkasan, tren, dan kategori utama dirancang agar expense tracker ini cepat terbaca di sela aktivitas, bukan hanya saat kamu sedang senggang."
    },
    {
      step: "03",
      title: "Tutup hari dengan ritual yang singkat",
      description:
        "Night Close muncul di jam malam agar kamu bisa mengecek pengeluaran hari itu, melengkapi yang tertinggal, lalu selesai tanpa ritme yang berat."
    }
  ],
  experiencePoints: [
    {
      title: "Cocok untuk yang butuh aplikasi catat pengeluaran yang ringan",
      description:
        "KeMana dibuat untuk langsung dipakai. Fokus utamanya adalah mencatat sekarang, bukan mengisi konfigurasi panjang yang memecah momentum."
    },
    {
      title: "Cocok untuk expense tracker Indonesia yang cepat dibuka",
      description:
        "App utama sudah dirancang sebagai PWA dan disiapkan ke mobile native shell, jadi pengalaman tetap terasa ringkas di browser, homescreen, dan konteks mobile."
    },
    {
      title: "Cocok untuk pencatatan uang keluar dan budgeting harian",
      description:
        "Import/export JSON + CSV membantu kamu tetap pegang kendali atas data, baik untuk backup, evaluasi keuangan pribadi, maupun perpindahan workflow."
    }
  ],
  faq: [
    {
      question: "Apakah KeMana cocok sebagai aplikasi catat pengeluaran harian?",
      answer:
        "Cocok. KeMana dirancang untuk mencatat pengeluaran harian dengan cepat, terutama saat kamu ingin langsung menulis uang keluar tanpa alur yang ribet."
    },
    {
      question: "Apakah KeMana bisa dipakai saat koneksi buruk?",
      answer:
        "Bisa. KeMana dibangun dengan pendekatan local-first supaya pengalaman mencatat tetap responsif. Saat koneksi tersedia, alur sinkronisasi bisa melanjutkan kebutuhan multi-device."
    },
    {
      question: "Apakah KeMana hanya cocok untuk input manual yang sederhana?",
      answer:
        "Tidak. Quick add natural language mendukung catatan cepat, multiple items, dan split bill untuk skenario yang lebih kompleks tanpa membuat input terasa berat."
    },
    {
      question: "Insight apa saja yang bisa dibaca dari expense tracker KeMana?",
      answer:
        "Kamu bisa melihat ringkasan pengeluaran, tren per periode, kategori paling dominan, indikator terakhir mencatat, dan ritual Night Close di malam hari."
    },
    {
      question: "Apakah data bisa diekspor atau diimpor?",
      answer:
        "Ya. KeMana sudah mendukung import dan export JSON + CSV agar data tetap mudah dipindahkan, dibackup, atau diproses di tempat lain."
    },
    {
      question: "Apa beda KeMana dengan aplikasi keuangan pribadi yang terlalu kompleks?",
      answer:
        "KeMana fokus pada pencatatan pengeluaran, insight yang cukup, dan ritme harian yang ringan. Jadi lebih cocok untuk kamu yang ingin tahu uangmu ke mana tanpa setup dan dashboard yang berlebihan."
    }
  ]
};

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

export function getFallbackSiteOrigin() {
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return trimTrailingSlash(configuredOrigin || "https://kemana.app");
}

export function getAppUrl(origin = getFallbackSiteOrigin()) {
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  return trimTrailingSlash(configuredAppUrl || `${origin}/app`);
}

export function getSiteOriginFromHeaders(headerBag) {
  const forwardedHost = headerBag.get("x-forwarded-host");
  const host = forwardedHost || headerBag.get("host");
  const forwardedProto = headerBag.get("x-forwarded-proto");
  const protocol = forwardedProto || (host?.includes("localhost") ? "http" : "https");

  if (!host) {
    return getFallbackSiteOrigin();
  }

  return trimTrailingSlash(`${protocol}://${host}`);
}

export function absoluteUrl(pathname = "/", origin = getFallbackSiteOrigin()) {
  return new URL(pathname, `${origin}/`).toString();
}
