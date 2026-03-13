import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const cwd = process.cwd();
const repoRoot = path.resolve(cwd, "..", "..");
const scanRoots = [path.join(cwd, "src"), path.join(repoRoot, "packages")];
const allowedExtensions = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]);
const ignoredPathParts = new Set([
  "node_modules",
  ".next",
  "out",
  "build",
  "dist",
  "coverage",
  "playwright-report",
  "test-results"
]);

const forbiddenPatterns = [
  {
    id: "dangerouslySetInnerHTML",
    regex: /\bdangerouslySetInnerHTML\b/g,
    guidance: "Render text via JSX or use a reviewed sanitizer for trusted rich HTML only."
  },
  {
    id: "innerHTML assignment",
    regex: /\.innerHTML\s*=/g,
    guidance: "Use textContent or build DOM nodes explicitly."
  },
  {
    id: "outerHTML assignment",
    regex: /\.outerHTML\s*=/g,
    guidance: "Avoid replacing DOM with raw HTML strings."
  },
  {
    id: "insertAdjacentHTML",
    regex: /\binsertAdjacentHTML\s*\(/g,
    guidance: "Avoid HTML string insertion; use safe DOM APIs instead."
  },
  {
    id: "document.write",
    regex: /\bdocument\.write(?:ln)?\s*\(/g,
    guidance: "Do not write raw HTML into the document at runtime."
  },
  {
    id: "eval",
    regex: /\beval\s*\(/g,
    guidance: "Replace dynamic code execution with explicit logic."
  },
  {
    id: "new Function",
    regex: /\bnew Function\s*\(/g,
    guidance: "Do not construct executable code from strings."
  },
  {
    id: "string setTimeout",
    regex: /\bsetTimeout\s*\(\s*["'`]/g,
    guidance: "Pass a function to setTimeout instead of a string."
  },
  {
    id: "string setInterval",
    regex: /\bsetInterval\s*\(\s*["'`]/g,
    guidance: "Pass a function to setInterval instead of a string."
  },
  {
    id: "window.open",
    regex: /\bwindow\.open\s*\(/g,
    guidance: "Review popup navigation carefully and prefer reviewed internal navigation helpers."
  },
  {
    id: "postMessage wildcard targetOrigin",
    regex: /\bpostMessage\s*\([^,]+,\s*["']\*["']/g,
    guidance: "Do not use '*' as targetOrigin; pin postMessage to a reviewed origin."
  },
  {
    id: "unsafe router navigation",
    regex: /\brouter\.(?:push|replace)\s*\(\s*(?!["'`](?:\/|#))/g,
    guidance: "Only navigate to reviewed internal literal paths or a centralized safe helper."
  },
  {
    id: "unsafe location assignment",
    regex: /(?:window\.)?location(?:\.href)?\s*=\s*(?!["'`](?:\/|https?:\/\/))/g,
    guidance: "Avoid assigning unreviewed URLs directly to location."
  },
  {
    id: "unsafe location assign/replace",
    regex: /(?:window\.)?location\.(?:assign|replace)\s*\(\s*(?!["'`](?:\/|https?:\/\/))/g,
    guidance: "Only redirect to reviewed literal paths or explicit same-origin URLs."
  }
];

function shouldSkipPath(filePath) {
  const relative = path.relative(repoRoot, filePath);
  const parts = relative.split(path.sep);

  if (parts.some((part) => ignoredPathParts.has(part))) {
    return true;
  }

  return (
    relative.includes(`${path.sep}tests${path.sep}`) ||
    relative.includes(`${path.sep}test${path.sep}`) ||
    /\.test\.[jt]sx?$/.test(relative) ||
    /\.spec\.[jt]sx?$/.test(relative) ||
    relative.endsWith(".d.ts")
  );
}

function isAllowedMatch(filePath, ruleId, content, index) {
  const relative = path.relative(repoRoot, filePath);

  if (
    ruleId === "window.open" &&
    relative.endsWith(path.join("packages", "storage", "index.ts"))
  ) {
    return true;
  }

  if (
    (ruleId === "unsafe router navigation" || ruleId === "unsafe location assignment") &&
    /security-reviewed:\s*safe-internal-navigation/.test(
      content.slice(Math.max(0, index - 120), Math.min(content.length, index + 120))
    )
  ) {
    return true;
  }

  return false;
}

async function collectFiles(dir) {
  const dirStat = await stat(dir).catch(() => null);
  if (!dirStat?.isDirectory()) {
    return [];
  }

  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);

      if (shouldSkipPath(fullPath)) {
        return [];
      }

      if (entry.isDirectory()) {
        return collectFiles(fullPath);
      }

      if (!allowedExtensions.has(path.extname(entry.name))) {
        return [];
      }

      return [fullPath];
    })
  );

  return files.flat();
}

function getLineNumber(content, index) {
  return content.slice(0, index).split("\n").length;
}

async function main() {
  const files = (await Promise.all(scanRoots.map((root) => collectFiles(root)))).flat();
  const findings = [];

  for (const filePath of files) {
    const content = await readFile(filePath, "utf8");

    for (const rule of forbiddenPatterns) {
      for (const match of content.matchAll(rule.regex)) {
        if (isAllowedMatch(filePath, rule.id, content, match.index ?? 0)) {
          continue;
        }
        findings.push({
          filePath: path.relative(repoRoot, filePath),
          line: getLineNumber(content, match.index ?? 0),
          id: rule.id,
          snippet: match[0],
          guidance: rule.guidance
        });
      }
    }
  }

  if (findings.length === 0) {
    console.log(`Security guardrail passed. Checked ${files.length} files.`);
    return;
  }

  console.error("Security guardrail failed. Dangerous sinks detected:\n");
  for (const finding of findings) {
    console.error(
      `- ${finding.id} at ${finding.filePath}:${finding.line}\n` +
        `  snippet: ${finding.snippet}\n` +
        `  fix: ${finding.guidance}`
    );
  }
  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
