import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const rootDir = process.cwd();
const outDir = path.join(rootDir, "out");
const hashesPath = path.join(rootDir, "csp-hashes.json");
const vercelConfigPath = path.join(rootDir, "vercel.json");

async function collectHtmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return collectHtmlFiles(fullPath);
      }
      return fullPath.endsWith(".html") ? [fullPath] : [];
    })
  );

  return files.flat();
}

function extractInlineScriptBodies(html) {
  const matches = html.matchAll(/<script(?:[^>]*)>([\s\S]*?)<\/script>/g);
  const bodies = [];

  for (const match of matches) {
    const rawBody = match[1] ?? "";
    if (rawBody.trim()) {
      bodies.push(rawBody);
    }
  }

  return bodies;
}

function toSha256(body) {
  return `sha256-${crypto.createHash("sha256").update(body).digest("base64")}`;
}

function buildVercelConfig(scriptHashes) {
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

  return {
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
}

async function main() {
  const outStat = await stat(outDir).catch(() => null);
  if (!outStat?.isDirectory()) {
    console.error(`Static export folder not found: ${outDir}`);
    console.error("Run `npm run build` first, then rerun this script.");
    process.exit(1);
  }

  const htmlFiles = await collectHtmlFiles(outDir);
  const hashes = new Set();

  for (const filePath of htmlFiles) {
    const html = await readFile(filePath, "utf8");
    for (const body of extractInlineScriptBodies(html)) {
      hashes.add(toSha256(body));
    }
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    source: "out/**/*.html",
    scriptHashes: [...hashes].sort()
  };

  await writeFile(hashesPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await writeFile(
    vercelConfigPath,
    `${JSON.stringify(buildVercelConfig(payload.scriptHashes), null, 2)}\n`,
    "utf8"
  );
  console.log(`Wrote ${payload.scriptHashes.length} script hashes to ${hashesPath}`);
  console.log(`Wrote Vercel headers to ${vercelConfigPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
