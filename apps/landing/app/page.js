import { headers } from "next/headers";
import { getAppUrl, getSiteOriginFromHeaders, siteConfig } from "../lib/site";
import ThemeToggle from "./theme-toggle";

export default async function HomePage() {
  const headerBag = await headers();
  const origin = getSiteOriginFromHeaders(headerBag);
  const appUrl = getAppUrl(origin);
  const applicationSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: siteConfig.name,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web, Android, iOS",
    url: origin,
    description: siteConfig.description,
    featureList: siteConfig.featureCards.map((feature) => feature.title)
  };
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: origin,
    description: siteConfig.description,
    inLanguage: "id-ID"
  };
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: siteConfig.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer
      }
    }))
  };
  const schemaMarkup = JSON.stringify([websiteSchema, applicationSchema, faqSchema]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: schemaMarkup }}
      />

      <div className="site-shell">
        <div className="ambient ambient-a" aria-hidden="true" />
        <div className="ambient ambient-b" aria-hidden="true" />
        <div className="ambient ambient-c" aria-hidden="true" />

        <header className="site-header">
          <div className="container site-header-inner">
            <a className="brand" href="#top" aria-label="KeMana">
              <span className="brand-mark" aria-hidden="true">
                <img src="/icons/icon-192.png" alt="" width="38" height="38" />
              </span>
              <span className="brand-text">KeMana</span>
            </a>

            <nav className="site-nav" aria-label="Navigasi utama">
              {siteConfig.navigation.map((item) => (
                <a key={item.href} href={item.href}>
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="header-actions">
              <ThemeToggle />
              <a className="button button-primary header-cta" href={appUrl}>
                Buka aplikasi
              </a>
            </div>
          </div>
        </header>

        <main id="main-content">
          <section className="hero container" id="top">
            <div className="hero-copy-block">
              <p className="eyebrow">Aplikasi catat pengeluaran yang terasa ringan</p>
              <h1 className="hero-title">Catat pengeluaran harian secepat kamu mengingatnya.</h1>
              <p className="hero-copy">
                KeMana adalah aplikasi catat pengeluaran harian untuk kamu yang ingin
                tahu uangmu ke mana tanpa alur ribet. Quick add natural language,
                pengalaman local-first, insight yang tenang, smart recall, dan
                ritual Night Close dibuat supaya expense tracker ini benar-benar
                kepakai setiap hari.
              </p>

              <div className="hero-actions">
                <a className="button button-primary" href={appUrl}>
                  Mulai pakai
                </a>
                <a className="button button-secondary" href="#fitur">
                  Lihat fitur utama
                </a>
              </div>

              <ul className="hero-pills" aria-label="Nilai utama KeMana">
                <li>Aplikasi catat uang keluar</li>
                <li>Quick add natural language</li>
                <li>Local-first dan siap sync</li>
                <li>Night Close ritual</li>
                <li>PWA expense tracker yang ringkas</li>
              </ul>

              <div className="glass-panel proof-strip">
                {siteConfig.proofPoints.map((point) => (
                  <div key={point.value} className="proof-item">
                    <strong>{point.value}</strong>
                    <span>{point.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="hero-visual" aria-hidden="true">
              <div className="visual-orbit visual-orbit-a" />
              <div className="visual-orbit visual-orbit-b" />
              <div className="visual-beam" />
              <div className="floating-chip chip-a glass-panel">Terakhir catat 18 menit lalu</div>
              <div className="floating-chip chip-b glass-panel">Night Close siap jam 20.00</div>
              <div className="floating-chip chip-c glass-panel">Cloud sync aktif saat dibutuhkan</div>

              <div className="device-frame glass-panel">
                <div className="device-topbar">
                  <span className="pulse-dot" />
                  <span>KeMana</span>
                  <span>Hari ini</span>
                </div>

                <div className="device-screen">
                  <section className="summary-card">
                    <div className="summary-head">
                      <div>
                        <p>Total hari ini</p>
                        <strong>Rp148.000</strong>
                      </div>
                      <span className="summary-badge">Normal</span>
                    </div>
                    <p className="summary-note">
                      Transport dan kopi paling sering muncul sejak pagi.
                    </p>
                    <div className="summary-bars">
                      <span style={{ width: "78%" }} />
                      <span style={{ width: "55%" }} />
                      <span style={{ width: "38%" }} />
                    </div>
                  </section>

                  <section className="composer-card glass-panel">
                    <p className="composer-label">Quick add</p>
                    <div className="composer-input">kopi 28k, parkir 5k, grab 18k</div>
                    <div className="composer-tags">
                      <span>Makanan</span>
                      <span>Transport</span>
                      <span>Multi-item</span>
                    </div>
                  </section>

                  <section className="transaction-list">
                    <article className="transaction-row">
                      <div>
                        <strong>Kopi susu</strong>
                        <p>Makanan · 08.14</p>
                      </div>
                      <span>Rp28.000</span>
                    </article>
                    <article className="transaction-row">
                      <div>
                        <strong>Transport pulang</strong>
                        <p>Transport · 18.26</p>
                      </div>
                      <span>Rp32.000</span>
                    </article>
                    <article className="transaction-row">
                      <div>
                        <strong>Langganan cloud</strong>
                        <p>Tagihan · 10.02</p>
                      </div>
                      <span>Rp99.000</span>
                    </article>
                  </section>
                </div>
              </div>
            </div>
          </section>

          <section className="section container" id="fitur" aria-labelledby="fitur-title">
            <div className="section-copy">
              <p className="eyebrow">Dirancang dari kebiasaan pencatatan nyata</p>
              <h2 id="fitur-title" className="section-title">
                Bukan aplikasi keuangan pribadi yang sibuk minta perhatianmu.
              </h2>
              <p className="section-lead">
                KeMana fokus ke beberapa momen yang benar-benar penting: saat kamu
                mencatat pengeluaran, saat membaca pola, dan saat menutup hari.
                Sisanya dibuat sehalus mungkin supaya aplikasi pencatatan
                pengeluaran ini terasa ringan dipakai.
              </p>
            </div>

            <div className="feature-grid">
              {siteConfig.featureCards.map((feature) => (
                <article key={feature.title} className="feature-card glass-panel">
                  <span className="card-tag">{feature.tag}</span>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="section container split-layout" aria-labelledby="alur-title" id="alur">
            <div className="section-copy">
              <p className="eyebrow">Alur yang dibuat untuk dipakai setiap hari</p>
              <h2 id="alur-title" className="section-title">
                Tiga langkah sederhana untuk tahu uangmu ke mana.
              </h2>
              <p className="section-lead">
                Bukan spreadsheet yang menunggu dibuka akhir bulan, tapi aplikasi
                catat pengeluaran yang mendukung kebiasaan ringan di sela aktivitas.
              </p>
            </div>

            <div className="workflow-list">
              {siteConfig.workflowSteps.map((step) => (
                <article key={step.step} className="workflow-card glass-panel">
                  <span className="workflow-index">{step.step}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="section container" aria-labelledby="experience-title">
            <div className="section-copy compact">
              <p className="eyebrow">Cocok untuk pencarian yang paling sering muncul</p>
              <h2 id="experience-title" className="section-title">
                Kalau kamu mencari aplikasi catat pengeluaran yang ringan, mulai dari sini.
              </h2>
            </div>

            <div className="experience-grid">
              {siteConfig.experiencePoints.map((item) => (
                <article key={item.title} className="experience-card">
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="section container" id="faq" aria-labelledby="faq-title">
            <div className="section-copy compact">
              <p className="eyebrow">FAQ dan search intent</p>
              <h2 id="faq-title" className="section-title">
                Pertanyaan yang biasanya muncul sebelum mencoba aplikasi ini.
              </h2>
            </div>

            <div className="faq-list">
              {siteConfig.faq.map((item) => (
                <details key={item.question} className="faq-item glass-panel">
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </section>

          <section className="section container">
            <div className="cta-panel glass-panel">
              <div>
                <p className="eyebrow">Siap mulai?</p>
                <h2 className="section-title">
                  Buka KeMana dan rasakan aplikasi catat pengeluaran yang lebih ringan.
                </h2>
                <p className="section-lead">
                  Landing page ini dibuat ringan, server-first, dan siap dipasang di
                  Vercel. Aplikasi utamanya tinggal kamu arahkan lewat environment CTA
                  untuk membantu orang menemukan expense tracker KeMana dengan lebih
                  mudah.
                </p>
              </div>

              <div className="cta-actions">
                <a className="button button-primary" href={appUrl}>
                  Buka aplikasi
                </a>
                <a className="button button-secondary" href="#top">
                  Kembali ke atas
                </a>
              </div>
            </div>
          </section>
        </main>

        <footer className="site-footer">
          <div className="container footer-row">
            <p>
              <strong>KeMana</strong> · Biar tau uangmu ke mana.
            </p>
            <p>Built as a lightweight Next.js landing page with strong SEO defaults.</p>
          </div>
        </footer>
      </div>
    </>
  );
}
