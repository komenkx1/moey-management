#!/usr/bin/env node

import { spawn } from "node:child_process";
import process from "node:process";
import { chromium } from "playwright";

const STORAGE_KEYS = {
  entries: "kemana.entries.v1",
  rules: "kemana.rules.v1",
  version: "kemana.storage.version",
  debugPerf: "DEBUG_PERF",
  ackSamples: "kemana.perf.quickAddAck.v1"
};

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseListSizes(value) {
  const parsed = String(value)
    .split(",")
    .map((chunk) => Number.parseInt(chunk.trim(), 10))
    .filter((item) => Number.isFinite(item) && item > 0);
  return parsed.length ? parsed : [300, 1000];
}

function parseArgs(argv) {
  const options = {
    url: process.env.ACK_TEST_URL ?? "http://127.0.0.1:3000",
    sizes: parseListSizes(process.env.ACK_TEST_SIZES ?? "300,1000"),
    samples: parsePositiveInteger(process.env.ACK_TEST_SAMPLES ?? "12", 12),
    thresholdMs: parsePositiveInteger(process.env.ACK_TEST_THRESHOLD_MS ?? "100", 100),
    headed: false,
    autoServer: false,
    autoBuild: false,
    port: parsePositiveInteger(process.env.ACK_TEST_PORT ?? "3300", 3300),
    json: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--headed") {
      options.headed = true;
      continue;
    }

    if (arg === "--auto-server") {
      options.autoServer = true;
      continue;
    }

    if (arg === "--build") {
      options.autoBuild = true;
      continue;
    }

    if (arg === "--json") {
      options.json = true;
      continue;
    }

    if (arg === "--url" && argv[index + 1]) {
      options.url = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith("--url=")) {
      options.url = arg.slice("--url=".length);
      continue;
    }

    if (arg === "--sizes" && argv[index + 1]) {
      options.sizes = parseListSizes(argv[index + 1]);
      index += 1;
      continue;
    }

    if (arg.startsWith("--sizes=")) {
      options.sizes = parseListSizes(arg.slice("--sizes=".length));
      continue;
    }

    if (arg === "--samples" && argv[index + 1]) {
      options.samples = parsePositiveInteger(argv[index + 1], options.samples);
      index += 1;
      continue;
    }

    if (arg.startsWith("--samples=")) {
      options.samples = parsePositiveInteger(arg.slice("--samples=".length), options.samples);
      continue;
    }

    if (arg === "--threshold-ms" && argv[index + 1]) {
      options.thresholdMs = parsePositiveInteger(argv[index + 1], options.thresholdMs);
      index += 1;
      continue;
    }

    if (arg.startsWith("--threshold-ms=")) {
      options.thresholdMs = parsePositiveInteger(arg.slice("--threshold-ms=".length), options.thresholdMs);
      continue;
    }

    if (arg === "--port" && argv[index + 1]) {
      options.port = parsePositiveInteger(argv[index + 1], options.port);
      index += 1;
      continue;
    }

    if (arg.startsWith("--port=")) {
      options.port = parsePositiveInteger(arg.slice("--port=".length), options.port);
      continue;
    }
  }

  if (options.autoServer) {
    options.url = `http://127.0.0.1:${options.port}`;
  }

  return options;
}

function stat(values) {
  const cleaned = values.filter((value) => Number.isFinite(value) && value >= 0);
  if (!cleaned.length) {
    return {
      count: 0,
      min: null,
      max: null,
      median: null,
      p95: null,
      avg: null
    };
  }

  const sorted = [...cleaned].sort((left, right) => left - right);
  const sum = cleaned.reduce((accumulator, value) => accumulator + value, 0);
  const percentileIndex = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);

  return {
    count: cleaned.length,
    min: Number(sorted[0].toFixed(2)),
    max: Number(sorted[sorted.length - 1].toFixed(2)),
    median: Number(sorted[Math.floor(sorted.length / 2)].toFixed(2)),
    p95: Number(sorted[percentileIndex].toFixed(2)),
    avg: Number((sum / cleaned.length).toFixed(2))
  };
}

function getNpmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function runCommand(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: process.env,
      stdio: options.inheritStdio ? "inherit" : "pipe"
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} failed with code ${code ?? "unknown"}`));
    });
  });
}

function waitForServerReady(child, timeoutMs = 45_000) {
  return new Promise((resolve, reject) => {
    const readyPattern = /ready in/i;
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      reject(new Error("Timed out waiting for Next.js server to become ready."));
    }, timeoutMs);

    const onData = (chunk) => {
      const text = chunk.toString();
      if (readyPattern.test(text) && !settled) {
        settled = true;
        clearTimeout(timer);
        resolve();
      }
    };

    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);
    child.on("error", (error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
    child.on("exit", (code) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      reject(new Error(`Server exited before ready (code ${code ?? "unknown"}).`));
    });
  });
}

async function stopServer(child) {
  if (!child || child.killed) {
    return;
  }

  await new Promise((resolve) => {
    let finished = false;
    const done = () => {
      if (finished) {
        return;
      }
      finished = true;
      resolve();
    };

    const killTimer = setTimeout(() => {
      child.kill("SIGKILL");
      done();
    }, 5_000);

    child.once("exit", () => {
      clearTimeout(killTimer);
      done();
    });
    child.kill("SIGTERM");
  });
}

async function setupScenario(page, url, listSize) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ size, keys }) => {
      const categories = ["Makan", "Transport", "Belanja", "Tagihan", "Hiburan", "Lainnya"];
      const now = Date.now();
      const today = new Date();
      const dayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
        today.getDate()
      ).padStart(2, "0")}`;
      const entries = [];

      for (let index = 0; index < size; index += 1) {
        const createdAt = new Date(now - index * 60 * 1000).toISOString();
        entries.push({
          id: `seed-${size}-${index}`,
          text: `seed item ${index}`,
          amount: 1_000 + (index % 19) * 1_000,
          date: dayKey,
          category: categories[index % categories.length],
          source: "quick_add",
          paymentMethod: "Unknown",
          createdAt,
          updatedAt: createdAt
        });
      }

      window.localStorage.setItem(keys.entries, JSON.stringify(entries));
      window.localStorage.setItem(keys.rules, "[]");
      window.localStorage.setItem(keys.version, "1");
      window.localStorage.setItem(keys.debugPerf, "true");
      window.localStorage.removeItem(keys.ackSamples);
      window.sessionStorage.clear();
    },
    { size: listSize, keys: STORAGE_KEYS }
  );

  const hydrationStartedAt = Date.now();
  await page.reload({ waitUntil: "domcontentloaded" });
  const input = page.locator(".composer-row .input").first();
  await input.waitFor({ state: "visible" });

  await page.waitForFunction(
    (expectedRows) => document.querySelectorAll(".row-text").length >= expectedRows,
    listSize,
    { timeout: 20_000 }
  );

  return {
    hydrationMs: Date.now() - hydrationStartedAt
  };
}

async function measureAckSample(page, marker) {
  const input = page.locator(".composer-row .input").first();
  const beforeSummary = (await page.locator(".daily-summary-amount").first().textContent())?.trim() ?? "";
  const beforeEntryCount = await page.locator("[data-entry-id]").count();

  await input.fill(`${marker} 18`);
  const t0 = await page.evaluate(() => performance.now());
  await input.press("Enter");

  await page.waitForFunction(
    ({ beforeSummaryText, initialEntryCount }) => {
      const quickInput = document.querySelector(".composer-row .input");
      const inputCleared = quickInput instanceof HTMLInputElement && quickInput.value === "";
      const currentEntryCount = document.querySelectorAll("[data-entry-id]").length;
      const entryAdded = currentEntryCount > initialEntryCount;
      const summaryText = document.querySelector(".daily-summary-amount")?.textContent?.trim() ?? "";
      const summaryChanged = beforeSummaryText.length === 0 ? summaryText.length > 0 : summaryText !== beforeSummaryText;
      return inputCleared && entryAdded && summaryChanged;
    },
    { beforeSummaryText: beforeSummary, initialEntryCount: beforeEntryCount },
    { timeout: 12_000 }
  );

  const externalAckMs = await page.evaluate(
    (start) =>
      new Promise((resolve) => {
        window.requestAnimationFrame(() => {
          resolve(performance.now() - start);
        });
      }),
    t0
  );

  const internalAckMs = await page.evaluate((samplesKey) => {
    try {
      const raw = window.localStorage.getItem(samplesKey);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed) || parsed.length === 0) {
        return null;
      }
      const last = parsed[parsed.length - 1];
      return typeof last?.durationMs === "number" ? last.durationMs : null;
    } catch {
      return null;
    }
  }, STORAGE_KEYS.ackSamples);

  return {
    marker,
    externalAckMs: Number(externalAckMs.toFixed(2)),
    internalAckMs: internalAckMs !== null ? Number(internalAckMs.toFixed(2)) : null
  };
}

async function runScenario(page, options, listSize) {
  const setup = await setupScenario(page, options.url, listSize);

  const samples = [];
  for (let index = 0; index < options.samples; index += 1) {
    const marker = `ack${listSize}sample${index}`;
    const sample = await measureAckSample(page, marker);
    samples.push(sample);
  }

  const externalStats = stat(samples.map((sample) => sample.externalAckMs));
  const internalStats = stat(samples.map((sample) => sample.internalAckMs ?? Number.NaN));

  return {
    listSize,
    hydrationMs: setup.hydrationMs,
    samples,
    externalStats,
    internalStats,
    thresholdMs: options.thresholdMs,
    pass: externalStats.p95 !== null && externalStats.p95 <= options.thresholdMs
  };
}

function printReport(report) {
  console.log("");
  console.log("Ack Benchmark (Perceived)");
  console.log(`URL: ${report.url}`);
  console.log(`Mode: ${report.mode}`);
  console.log(`Threshold: ${report.thresholdMs}ms (p95 external)`);
  console.log("");

  for (const scenario of report.scenarios) {
    console.log(`List size: ${scenario.listSize}`);
    console.log(`Hydration ready: ${scenario.hydrationMs}ms`);
    console.log(
      `External ack -> median ${scenario.externalStats.median}ms | p95 ${scenario.externalStats.p95}ms | avg ${scenario.externalStats.avg}ms`
    );
    console.log(
      `Internal ack -> median ${scenario.internalStats.median}ms | p95 ${scenario.internalStats.p95}ms | avg ${scenario.internalStats.avg}ms`
    );
    console.log(`Pass threshold: ${scenario.pass ? "YES" : "NO"}`);
    console.log("");
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const cwd = process.cwd();
  const npmCommand = getNpmCommand();
  let serverProcess = null;

  try {
    if (options.autoBuild) {
      await runCommand(npmCommand, ["run", "build"], { cwd, inheritStdio: true });
    }

    if (options.autoServer) {
      serverProcess = spawn(npmCommand, ["run", "start", "--", "-p", String(options.port)], {
        cwd,
        env: process.env,
        stdio: "pipe"
      });
      await waitForServerReady(serverProcess);
    }

    const browser = await chromium.launch({
      headless: !options.headed,
      devtools: false
    });
    const context = await browser.newContext({
      serviceWorkers: "block",
      viewport: {
        width: 430,
        height: 932
      }
    });
    const page = await context.newPage();

    const scenarios = [];
    for (const size of options.sizes) {
      const scenario = await runScenario(page, options, size);
      scenarios.push(scenario);
    }

    await context.close();
    await browser.close();

    const report = {
      url: options.url,
      mode: options.headed ? "headed (devtools closed)" : "headless (no devtools)",
      thresholdMs: options.thresholdMs,
      scenarios
    };

    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    printReport(report);
  } finally {
    await stopServer(serverProcess);
  }
}

main().catch((error) => {
  console.error("Ack benchmark failed:");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
