import { createServer } from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";

const rootDir = path.resolve(process.cwd(), "out");
const port = Number.parseInt(process.env.PORT ?? "3100", 10);

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

server.listen(port, "127.0.0.1", () => {
  // Keep output short for Playwright webServer logs.
  console.log(`Static export server running at http://127.0.0.1:${port}`);
});
