import { createServer } from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

const rootDir = path.resolve(process.cwd(), "out");
const port = Number.parseInt(process.env.PORT ?? "3100", 10);
const serveLan = process.env.SERVE_LAN === "1" || process.env.SERVE_LAN === "true";
const host = serveLan ? "0.0.0.0" : "127.0.0.1";

function getLanUrl() {
  if (!serveLan) return null;
  const ifaces = os.networkInterfaces();
  const isPrivateLAN = (addr) =>
    addr.startsWith("192.168.") || addr.startsWith("10.") || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(addr);
  const all = [];
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) all.push(iface.address);
    }
  }
  const ip = all.find(isPrivateLAN) ?? all[0];
  return ip ? `http://${ip}:${port}` : null;
}

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".xml": "application/xml; charset=utf-8",
};

const indexPath = path.join(rootDir, "index.html");

async function fileExists(filePath) {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

function setHeaders(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  res.setHeader("Content-Type", mimeTypes[ext] ?? "application/octet-stream");

  if (filePath.includes(`${path.sep}_next${path.sep}`)) {
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return;
  }

  res.setHeader("Cache-Control", "no-cache");
}

const server = createServer(async (req, res) => {
  try {
    const requestedPathname = decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname);
    const safePathname = requestedPathname.replace(/^\/+/, "");
    let filePath = path.join(rootDir, safePathname);

    if (requestedPathname.endsWith("/")) {
      filePath = path.join(rootDir, safePathname, "index.html");
    }

    if (!filePath.startsWith(rootDir)) {
      res.statusCode = 403;
      res.end("Forbidden");
      return;
    }

    if (!(await fileExists(filePath))) {
      filePath = indexPath;
    }

    if (!(await fileExists(filePath))) {
      res.statusCode = 404;
      res.end("Not Found");
      return;
    }

    const file = await fs.readFile(filePath);
    res.statusCode = 200;
    setHeaders(res, filePath);
    res.end(file);
  } catch {
    res.statusCode = 500;
    res.end("Internal Server Error");
  }
});

server.listen(port, host, () => {
  console.log(`Static export: http://${host === "0.0.0.0" ? "localhost" : host}:${port}`);
  const lanUrl = getLanUrl();
  if (lanUrl) {
    console.log(`  Buka di HP (satu WiFi): ${lanUrl}\n`);
  }
});
