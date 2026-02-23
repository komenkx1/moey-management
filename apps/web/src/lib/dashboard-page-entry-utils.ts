import { CATEGORIES, PAYMENT_METHODS, type Entry } from "@kemana/core/types";
import type { TransactionItem } from "@/components/kemana-ui/TransactionCard";
import { normalizeDateInput, splitDisplayText } from "@/lib/kemana-utils";
import { createEntryId, escapeCsvCell, sortEntriesNewestFirst, toParserAmountToken, triggerDownloadFromText } from "@/lib/dashboard-page-helpers";

export function mergeEntriesById(currentEntries: Entry[], incomingEntries: Entry[]): Entry[] {
  const map = new Map<string, Entry>();
  for (const entry of currentEntries) {
    map.set(entry.id, entry);
  }
  for (const entry of incomingEntries) {
    map.set(entry.id, entry);
  }
  return sortEntriesNewestFirst(Array.from(map.values()));
}

function parseCsvRows(raw: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];

    if (inQuotes) {
      if (char === '"') {
        const nextChar = raw[index + 1];
        if (nextChar === '"') {
          currentCell += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        currentCell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if (char === "\n") {
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = "";
      continue;
    }

    if (char === "\r") {
      continue;
    }

    currentCell += char;
  }

  currentRow.push(currentCell);
  if (currentRow.some((cell) => cell.trim().length > 0)) {
    rows.push(currentRow);
  }

  return rows;
}

function parsePaymentMethodFromCsv(value: string): Entry["paymentMethod"] | undefined {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  const mapping: Record<string, Entry["paymentMethod"]> = {
    unknown: "Unknown",
    "belum pilih": "Unknown",
    lainnya: "Unknown",
    cash: "Cash",
    tunai: "Cash",
    qris: "QRIS",
    debit: "Debit",
    kredit: "Credit",
    credit: "Credit",
    transfer: "Transfer"
  };

  if (mapping[normalized]) {
    return mapping[normalized];
  }

  if (PAYMENT_METHODS.includes(value.trim() as (typeof PAYMENT_METHODS)[number])) {
    return value.trim() as Entry["paymentMethod"];
  }

  return undefined;
}

function parseSplitFromCsv(modeRaw: string, detailRaw: string): Entry["split"] | undefined {
  const mode = modeRaw.trim().toLowerCase();
  if (mode !== "equal" && mode !== "custom") {
    return undefined;
  }

  const shares = detailRaw
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separator = part.lastIndexOf(":");
      if (separator <= 0) {
        return null;
      }
      const person = part.slice(0, separator).trim();
      const amount = Number.parseInt(part.slice(separator + 1).replace(/[^\d]/g, ""), 10);
      if (!person || !Number.isFinite(amount) || amount < 0) {
        return null;
      }
      return { person, amount };
    })
    .filter((share): share is { person: string; amount: number } => Boolean(share));

  if (shares.length < 2) {
    return undefined;
  }

  return {
    mode,
    payer: "Kamu",
    shares
  };
}

export function importEntriesFromCsv(params: {
  raw: string;
  currentEntries: Entry[];
  mode: "merge" | "replace";
}): {
  ok: boolean;
  message: string;
  entries: Entry[];
  importedEntries: number;
  ignoredEntries: number;
} {
  const { raw, currentEntries, mode } = params;
  const rows = parseCsvRows(raw);
  if (rows.length < 2) {
    return {
      ok: false,
      message: "CSV kosong atau format tidak sesuai.",
      entries: currentEntries,
      importedEntries: 0,
      ignoredEntries: 0
    };
  }

  const headerRow = rows[0].map((header) => header.replace(/^\uFEFF/, "").trim().toLowerCase());
  const headerIndex = new Map<string, number>();
  headerRow.forEach((header, index) => {
    if (!headerIndex.has(header)) {
      headerIndex.set(header, index);
    }
  });

  const getCell = (row: string[], keys: string[]): string => {
    for (const key of keys) {
      const index = headerIndex.get(key);
      if (typeof index === "number" && index < row.length) {
        return row[index] ?? "";
      }
    }
    return "";
  };

  if (!headerIndex.has("nominal")) {
    return {
      ok: false,
      message: "CSV tidak memiliki kolom nominal.",
      entries: currentEntries,
      importedEntries: 0,
      ignoredEntries: 0
    };
  }

  const nowIso = new Date().toISOString();
  const parsedEntries: Entry[] = [];
  let ignoredEntries = 0;

  for (const row of rows.slice(1)) {
    if (!row.some((cell) => cell.trim().length > 0)) {
      continue;
    }

    const dateRaw = getCell(row, ["tanggal", "date"]).trim();
    const normalizedDate = normalizeDateInput(dateRaw);
    const amountRaw = getCell(row, ["nominal", "amount"]).trim();
    const parsedAmount = Number.parseInt(amountRaw.replace(/[^\d]/g, ""), 10);
    const categoryRaw = getCell(row, ["kategori", "category"]).trim();
    const noteRaw = getCell(row, ["catatan", "note", "text"]).trim();
    const paymentRaw = getCell(row, ["metode_bayar", "payment_method"]).trim();
    const splitModeRaw = getCell(row, ["split_mode"]).trim();
    const splitDetailRaw = getCell(row, ["split_rincian", "split_detail"]).trim();
    const rawInputRaw = getCell(row, ["raw_input"]).trim();

    if (!normalizedDate || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      ignoredEntries += 1;
      continue;
    }

    const matchedCategory = CATEGORIES.find((category) => category.toLowerCase() === categoryRaw.toLowerCase());
    const normalizedCategory = matchedCategory ?? "Lainnya";
    const split = parseSplitFromCsv(splitModeRaw, splitDetailRaw);
    const fallbackText = noteRaw || normalizedCategory;
    const splitCount = split?.shares.length ?? 0;
    const splitToken = splitCount > 1 ? ` ${splitCount}p` : "";
    const fallbackRawInput = `${fallbackText} ${toParserAmountToken(parsedAmount)}${splitToken}`.trim();
    const idRaw = getCell(row, ["id"]).trim();

    parsedEntries.push({
      id: idRaw || createEntryId(),
      text: fallbackText,
      amount: parsedAmount,
      rawInput: rawInputRaw || fallbackRawInput,
      date: normalizedDate,
      category: normalizedCategory,
      paymentMethod: parsePaymentMethodFromCsv(paymentRaw),
      source: "quick_add",
      split,
      createdAt: nowIso,
      updatedAt: nowIso
    });
  }

  if (!parsedEntries.length) {
    return {
      ok: false,
      message: "Tidak ada baris transaksi valid di CSV.",
      entries: currentEntries,
      importedEntries: 0,
      ignoredEntries
    };
  }

  const entries =
    mode === "replace"
      ? sortEntriesNewestFirst(parsedEntries)
      : mergeEntriesById(currentEntries, parsedEntries);

  const messageBase =
    mode === "replace"
      ? `Import CSV selesai. ${parsedEntries.length} transaksi dimuat.`
      : `Import CSV selesai. ${parsedEntries.length} transaksi ditambahkan.`;

  return {
    ok: true,
    message: ignoredEntries > 0 ? `${messageBase} ${ignoredEntries} baris dilewati.` : messageBase,
    entries,
    importedEntries: parsedEntries.length,
    ignoredEntries
  };
}

export function downloadCsv(entries: Entry[]): void {
  const headers = [
    "id",
    "tanggal",
    "kategori",
    "metode_bayar",
    "nominal",
    "catatan",
    "split_mode",
    "split_rincian",
    "raw_input"
  ];

  const rows = entries.map((entry) => {
    const splitMode = entry.split?.mode ?? "";
    const splitDetail =
      entry.split?.shares.map((share) => `${share.person}:${Math.round(share.amount)}`).join(" | ") ?? "";
    const title = splitDisplayText(entry.text).title;
    const subtitle = splitDisplayText(entry.text).subtitle ?? "";
    const note = subtitle ? `${title} - ${subtitle}` : title;

    return [
      entry.id,
      entry.date,
      entry.category,
      entry.paymentMethod ?? "",
      String(Math.round(entry.amount)),
      note,
      splitMode,
      splitDetail,
      entry.rawInput ?? ""
    ];
  });

  const headerLine = "\uFEFF" + headers.map((header) => escapeCsvCell(header)).join(",");
  const rowLines = rows.map((row) => row.map((cell) => escapeCsvCell(cell)).join(","));
  const content = [headerLine, ...rowLines].join("\n");

  const date = new Date().toISOString().slice(0, 10);
  triggerDownloadFromText({
    content,
    mimeType: "text/csv;charset=utf-8;",
    filename: `kemana-export-${date}.csv`
  });
}

export function toTransactionItem(entry: Entry): TransactionItem {
  const display = splitDisplayText(entry.text);
  return {
    id: entry.id,
    title: display.title,
    note: display.subtitle || undefined,
    amount: entry.amount,
    type: "expense",
    category: entry.category,
    paymentMethod: entry.paymentMethod,
    time: entry.date,
    split: entry.split,
    rawInput: entry.rawInput,
    parseWarnings: entry.parseWarnings
  };
}
