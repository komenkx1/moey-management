import fs from "node:fs";
import path from "node:path";

function readScriptHashes() {
  const hashesPath = path.join(process.cwd(), "csp-hashes.json");

  if (!fs.existsSync(hashesPath)) {
    return [];
  }

  try {
    const raw = fs.readFileSync(hashesPath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.scriptHashes) ? parsed.scriptHashes : [];
  } catch {
    return [];
  }
}

const scriptHashes = readScriptHashes();
const scriptSrc = ["'self'", ...scriptHashes].join(" ");
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co https://*.sentry.io wss://*.supabase.co",
  "frame-src 'self' https://*.supabase.co",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests"
].join("; ");

export default {
  headers: [
    {
      source: "/(.*)",
      headers: [
        {
          key: "Content-Security-Policy",
          value: contentSecurityPolicy
        },
        {
          key: "X-Content-Type-Options",
          value: "nosniff"
        },
        {
          key: "X-Frame-Options",
          value: "DENY"
        },
        {
          key: "X-XSS-Protection",
          value: "1; mode=block"
        },
        {
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin"
        },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()"
        },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload"
        },
        {
          key: "Cross-Origin-Embedder-Policy",
          value: "credentialless"
        },
        {
          key: "Cross-Origin-Opener-Policy",
          value: "same-origin"
        },
        {
          key: "Cross-Origin-Resource-Policy",
          value: "same-origin"
        }
      ]
    }
  ]
};
