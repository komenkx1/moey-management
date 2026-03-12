import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const rootDir = process.cwd();
const outDir = path.join(rootDir, "out");
const targetPath = path.join(rootDir, "csp-hashes.json");

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
    const body = match[1]?.trim();
    if (body) {
      bodies.push(body);
    }
  }

  return bodies;
}

function toSha256(body) {
  return `sha256-${crypto.createHash("sha256").update(body).digest("base64")}`;
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

  await writeFile(targetPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Wrote ${payload.scriptHashes.length} script hashes to ${targetPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
