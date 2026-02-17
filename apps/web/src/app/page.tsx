"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatAmountCompact, formatAmountIDR } from "@kemana/core/format";
import { parseQuickAdd } from "@kemana/core/parser";
import { inferCategory, updateCategoryRule } from "@kemana/core/rules";
import { buildCustomSplit, buildEqualSplit } from "@kemana/core/split";
import {
  CATEGORIES,
  Category,
  CategoryRules,
  Entry,
  EntrySource,
  ParseQuickAddResult,
  EntrySplit,
  ParseWarning,
  PAYMENT_METHODS,
  PaymentMethod
} from "@kemana/core/types";
import { createId } from "@/lib/id";
import { loadEntries, loadRules, saveEntries, saveRules } from "@kemana/storage";

interface BulkPreviewLine {
  line: string;
  ok: boolean;
  reason?: string;
}

interface UndoToastState {
  entry: Entry;
  index: number;
  expiresAt: number;
}

interface TopCategorySummary {
  category: Category;
  totalAmount: number;
}

interface CategoryBreakdown {
  category: Category;
  totalAmount: number;
  percentage: number;
}

interface SpendingStatus {
  label: string;
  tone: "hemat" | "aman" | "normal" | "lumayan" | "boros";
}

interface SmartEmptyState {
  title: string;
  subtitle: string;
}

interface TodaySummaryStats {
  totalAmount: number;
  entryCount: number;
  topCategory: TopCategorySummary | null;
  topCategories: CategoryBreakdown[];
  sevenDayAverage: number;
  status: SpendingStatus;
  emptyState: SmartEmptyState | null;
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function offsetDate(base: Date, days: number): Date {
  const next = new Date(base);
  next.setDate(base.getDate() + days);
  return next;
}

function parseDateKey(value: string): Date | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function sumAmount(items: Entry[]): number {
  return items.reduce((sum, entry) => sum + entry.amount, 0);
}

function formatDayLabel(dateISO: string, now: Date = new Date()): string {
  const todayKey = toDateKey(now);
  if (dateISO === todayKey) {
    return "Hari ini";
  }

  const yesterdayKey = toDateKey(offsetDate(now, -1));
  if (dateISO === yesterdayKey) {
    return "Kemarin";
  }

  const parsed = parseDateKey(dateISO);
  if (!parsed) {
    return dateISO;
  }

  const label = new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short"
  }).format(parsed);

  return label.charAt(0).toUpperCase() + label.slice(1);
}

function groupEntriesByDate(entries: Entry[]): { dates: string[]; groups: Record<string, Entry[]> } {
  const groups: Record<string, Entry[]> = {};

  for (const entry of entries) {
    if (!groups[entry.date]) {
      groups[entry.date] = [];
    }
    groups[entry.date].push(entry);
  }

  const dates = Object.keys(groups).sort((a, b) => b.localeCompare(a));
  return { dates, groups };
}

function getTodayEntries(entries: Entry[], now: Date = new Date()): Entry[] {
  const todayKey = toDateKey(now);
  return entries.filter((entry) => entry.date === todayKey);
}

function getSpendingStatus(todayTotal: number, sevenDayAverage: number): SpendingStatus {
  if (todayTotal === 0) {
    return { label: "Hemat 🎉", tone: "hemat" };
  }

  if (sevenDayAverage <= 0) {
    return { label: "Normal 🙂", tone: "normal" };
  }

  if (todayTotal < sevenDayAverage * 0.6) {
    return { label: "Aman 👍", tone: "aman" };
  }
  if (todayTotal < sevenDayAverage * 1.2) {
    return { label: "Normal 🙂", tone: "normal" };
  }
  if (todayTotal < sevenDayAverage * 1.8) {
    return { label: "Lumayan 💸", tone: "lumayan" };
  }
  return { label: "Boros 😬", tone: "boros" };
}

function getTopCategoryToday(entries: Entry[], now: Date = new Date()): TopCategorySummary | null {
  const todayEntries = getTodayEntries(entries, now);
  if (todayEntries.length === 0) {
    return null;
  }

  const perCategory = new Map<Category, number>();
  for (const entry of todayEntries) {
    perCategory.set(entry.category, (perCategory.get(entry.category) ?? 0) + entry.amount);
  }

  let top: TopCategorySummary | null = null;
  for (const [category, totalAmount] of perCategory.entries()) {
    if (!top || totalAmount > top.totalAmount) {
      top = { category, totalAmount };
    }
  }

  return top;
}

function getTopCategoryBreakdownToday(entries: Entry[], now: Date = new Date()): CategoryBreakdown[] {
  const todayEntries = getTodayEntries(entries, now);
  const totalAmount = todayEntries.reduce((sum, entry) => sum + entry.amount, 0);
  if (todayEntries.length === 0 || totalAmount <= 0) {
    return [];
  }

  const perCategory = new Map<Category, number>();
  for (const entry of todayEntries) {
    perCategory.set(entry.category, (perCategory.get(entry.category) ?? 0) + entry.amount);
  }

  return Array.from(perCategory.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([category, amount]) => ({
      category,
      totalAmount: amount,
      percentage: Math.max(1, Math.round((amount / totalAmount) * 100))
    }));
}

function getSmartEmptyState(entries: Entry[], now: Date = new Date()): SmartEmptyState {
  if (entries.length === 0) {
    return {
      title: "Catat pengeluaran pertamamu",
      subtitle: "Biar tau uangmu kemana"
    };
  }

  const yesterdayKey = toDateKey(offsetDate(now, -1));
  const hasYesterdayEntry = entries.some((entry) => entry.date === yesterdayKey);
  if (hasYesterdayEntry) {
    return {
      title: "Hari ini kamu nggak keluar uang 🎉",
      subtitle: "Dompet istirahat hari ini"
    };
  }

  const last7Keys = Array.from({ length: 7 }, (_, index) => toDateKey(offsetDate(now, -(index + 1))));
  const last7KeySet = new Set(last7Keys);
  const activeDays = new Set(
    entries
      .filter((entry) => last7KeySet.has(entry.date))
      .map((entry) => entry.date)
  );

  if (activeDays.size >= 4) {
    return {
      title: "Belum ada catatan hari ini",
      subtitle: "Ada yang kelupaan?"
    };
  }

  if (entries.length <= 2) {
    return {
      title: "Catat pengeluaran pertamamu",
      subtitle: "Biar tau uangmu kemana"
    };
  }

  return {
    title: "Belum ada catatan hari ini",
    subtitle: "Ada yang kelupaan?"
  };
}

function getTodaySummaryStats(entries: Entry[], now: Date = new Date()): TodaySummaryStats {
  const todayEntries = getTodayEntries(entries, now);
  const totalAmount = todayEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const last7Keys = Array.from({ length: 7 }, (_, index) => toDateKey(offsetDate(now, -(index + 1))));
  const dailyTotals = new Map<string, number>();
  for (const entry of entries) {
    dailyTotals.set(entry.date, (dailyTotals.get(entry.date) ?? 0) + entry.amount);
  }
  const sevenDayTotal = last7Keys.reduce((sum, dateKey) => sum + (dailyTotals.get(dateKey) ?? 0), 0);
  const sevenDayAverage = sevenDayTotal / 7;
  const status = getSpendingStatus(totalAmount, sevenDayAverage);
  const topCategory = getTopCategoryToday(entries, now);
  const topCategories = getTopCategoryBreakdownToday(entries, now);
  const emptyState = todayEntries.length === 0 ? getSmartEmptyState(entries, now) : null;

  return {
    totalAmount,
    entryCount: todayEntries.length,
    topCategory,
    topCategories,
    sevenDayAverage,
    status,
    emptyState
  };
}

function paymentMethodLabel(value: PaymentMethod | undefined): string {
  switch (value) {
    case "Cash":
      return "Tunai";
    case "QRIS":
      return "QRIS";
    case "Debit":
      return "Debit";
    case "Credit":
      return "Kredit";
    case "Transfer":
      return "Transfer";
    default:
      return "Belum pilih";
  }
}

export default function HomePage() {
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [rules, setRules] = useState<CategoryRules>([]);
  const [quickInput, setQuickInput] = useState("");
  const [debouncedQuickInput, setDebouncedQuickInput] = useState("");
  const [quickError, setQuickError] = useState<string | null>(null);
  const [showQuickWarningDetails, setShowQuickWarningDetails] = useState(false);
  const [showFormatHelp, setShowFormatHelp] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkInput, setBulkInput] = useState("");
  const [undoToast, setUndoToast] = useState<UndoToastState | null>(null);
  const quickInputRef = useRef<HTMLInputElement>(null);
  const pendingUndoRef = useRef<UndoToastState | null>(null);

  useEffect(() => {
    const loadedEntries = loadEntries();
    const loadedRules = loadRules();
    setEntries(loadedEntries);
    setRules(loadedRules);
    setIsStorageReady(true);
  }, []);

  useEffect(() => {
    quickInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuickInput(quickInput);
    }, 150);
    return () => window.clearTimeout(timer);
  }, [quickInput]);

  useEffect(() => {
    if (!isStorageReady) {
      return;
    }
    saveEntries(entries);
  }, [entries, isStorageReady]);

  useEffect(() => {
    if (!pendingUndoRef.current) {
      return;
    }

    setUndoToast(pendingUndoRef.current);
    pendingUndoRef.current = null;
  }, [entries]);

  useEffect(() => {
    if (!isStorageReady) {
      return;
    }
    saveRules(rules);
  }, [rules, isStorageReady]);

  useEffect(() => {
    if (!undoToast) {
      return;
    }

    const timeoutMs = Math.max(0, undoToast.expiresAt - Date.now());
    const timer = window.setTimeout(() => {
      setUndoToast((current) => (current?.expiresAt === undoToast.expiresAt ? null : current));
    }, timeoutMs);

    return () => window.clearTimeout(timer);
  }, [undoToast]);

  const quickPreview = useMemo(() => {
    if (!debouncedQuickInput.trim()) {
      return null;
    }
    return parseQuickAdd(debouncedQuickInput);
  }, [debouncedQuickInput]);
  const showTeachingHint = useMemo(
    () =>
      shouldShowTeachingHint({
        input: quickInput,
        preview: quickPreview,
        bulkOpen,
        quickError
      }),
    [quickInput, quickPreview, bulkOpen, quickError]
  );
  const teachingHintText = useMemo(
    () => (showTeachingHint ? getTeachingHint(quickInput) : null),
    [showTeachingHint, quickInput]
  );
  const quickPreviewTextParts = quickPreview?.ok ? splitDisplayText(quickPreview.value.text) : null;
  const summedAmountMeta = quickPreview?.ok ? extractSummedAmountMeta(quickPreview.warnings) : null;
  const isSummationInput = summedAmountMeta !== null;
  const quickPreviewSubtitleItems =
    quickPreviewTextParts?.subtitle ? splitSubtitleItems(quickPreviewTextParts.subtitle) : null;

  const bulkPreview = useMemo(() => {
    const lines = bulkInput
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const preview: BulkPreviewLine[] = [];
    for (const line of lines) {
      const result = parseQuickAdd(line, new Date(), "bulk_paste");
      if (result.ok) {
        preview.push({ line, ok: true });
      } else {
        preview.push({ line, ok: false, reason: result.reason });
      }
    }
    return preview;
  }, [bulkInput]);

  const validBulkCount = bulkPreview.filter((line) => line.ok).length;
  const todaySummaryStats = useMemo(() => getTodaySummaryStats(entries), [entries]);
  const groupedEntriesResult = useMemo(() => groupEntriesByDate(entries), [entries]);
  const groupedEntries = useMemo(() => groupedEntriesResult.groups, [groupedEntriesResult]);
  const orderedDates = useMemo(() => groupedEntriesResult.dates, [groupedEntriesResult]);
  const dailyTotal = useMemo(
    () =>
      orderedDates.reduce(
        (acc, dateISO) => {
          acc[dateISO] = sumAmount(groupedEntries[dateISO] ?? []);
          return acc;
        },
        {} as Record<string, number>
      ),
    [orderedDates, groupedEntries]
  );

  function buildEntry(raw: string, source: EntrySource): Entry | null {
    const parsed = parseQuickAdd(raw, new Date(), source);
    if (!parsed.ok) {
      return null;
    }

    const category = inferCategory(parsed.value.text, rules);
    const now = new Date().toISOString();
    return {
      id: createId("entry"),
      text: parsed.value.text,
      amount: parsed.value.amount,
      date: parsed.value.date,
      category,
      paymentMethod: "Unknown",
      source,
      parseWarnings: parsed.warnings,
      createdAt: now,
      updatedAt: now,
      split: makeInitialSplit(parsed.value.amount, parsed.value.splitCount)
    };
  }

  function handleQuickAdd() {
    const parsed = parseQuickAdd(quickInput, new Date(), "quick_add");
    if (!parsed.ok) {
      setQuickError(parsed.reason);
      return;
    }

    const category = inferCategory(parsed.value.text, rules);
    const now = new Date().toISOString();
    const nextEntry: Entry = {
      id: createId("entry"),
      text: parsed.value.text,
      amount: parsed.value.amount,
      date: parsed.value.date,
      category,
      paymentMethod: "Unknown",
      source: "quick_add",
      parseWarnings: parsed.warnings,
      createdAt: now,
      updatedAt: now,
      split: makeInitialSplit(parsed.value.amount, parsed.value.splitCount)
    };

    setEntries((prev) => [nextEntry, ...prev]);
    setQuickInput("");
    setQuickError(null);
    setShowQuickWarningDetails(false);
    window.requestAnimationFrame(() => {
      quickInputRef.current?.focus();
    });
  }

  function handleBulkSave() {
    const lines = bulkInput
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const nextEntries: Entry[] = [];
    for (const line of lines) {
      const entry = buildEntry(line, "bulk_paste");
      if (entry) {
        nextEntries.push(entry);
      }
    }

    if (nextEntries.length === 0) {
      return;
    }

    setEntries((prev) => [...nextEntries.reverse(), ...prev]);
    setBulkInput("");
    setBulkOpen(false);
  }

  function updateEntry(entryId: string, updater: (entry: Entry) => Entry) {
    setEntries((prev) =>
      prev.map((entry) => {
        if (entry.id !== entryId) {
          return entry;
        }
        return {
          ...updater(entry),
          updatedAt: new Date().toISOString()
        };
      })
    );
  }

  function handleCategoryChange(entry: Entry, category: Category) {
    updateEntry(entry.id, (current) => ({
      ...current,
      category
    }));
    setRules((prev) => updateCategoryRule(prev, entry.text, category));
  }

  function handleDelete(entryId: string) {
    setEntries((prev) => {
      const deletedIndex = prev.findIndex((entry) => entry.id === entryId);
      if (deletedIndex === -1) {
        return prev;
      }

      pendingUndoRef.current = {
        entry: prev[deletedIndex],
        index: deletedIndex,
        expiresAt: Date.now() + 6_000
      };
      return prev.filter((current) => current.id !== entryId);
    });
  }

  function handleUndoDelete() {
    if (!undoToast) {
      return;
    }

    setEntries((prev) => {
      const next = [...prev];
      const insertIndex = Math.max(0, Math.min(undoToast.index, next.length));
      next.splice(insertIndex, 0, undoToast.entry);
      return next;
    });
    setUndoToast(null);
  }

  return (
    <main className="page">
      <h1 className="title">KeMana</h1>
      <p className="subtitle">Biar tau uangmu kemana</p>

      <section className="composer">
        <div className="composer-row">
          <input
            ref={quickInputRef}
            className="input"
            value={quickInput}
            onChange={(event) => {
              setQuickInput(event.target.value);
              setQuickError(null);
              setShowQuickWarningDetails(false);
            }}
            placeholder="contoh: kopi 18 | Gacoan - mie 25 + es 10 + pajak 5 | dinner 120 3p"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleQuickAdd();
              }
            }}
          />
          <button className="btn" type="button" onClick={handleQuickAdd}>
            Tambah
          </button>
        </div>
        <div>
          <button
            type="button"
            className="hint-link"
            onClick={() => setShowFormatHelp((prev) => !prev)}
            aria-expanded={showFormatHelp}
          >
            Format
          </button>
          {showFormatHelp ? (
            <div className="hint subtle format-help">
              contoh: `kopi 18` • `Gacoan - nasi 10k + mie 10k` • `dinner 120 3p`
            </div>
          ) : null}
        </div>

        {quickPreview?.ok && (
          <div className="hint preview-row">
            <div className="preview-content">
              {quickPreviewTextParts?.subtitle ? (
                <>
                  <div className="preview-title">{quickPreviewTextParts.title}</div>
                  {quickPreviewSubtitleItems ? (
                    <div className="subtitle-items">
                      {quickPreviewSubtitleItems.slice(0, 3).map((item, index) => (
                        <span key={`${item}-${index}`} className="item-pill">
                          {item}
                        </span>
                      ))}
                      {quickPreviewSubtitleItems.length > 3 ? (
                        <span className="item-pill more">+{quickPreviewSubtitleItems.length - 3}</span>
                      ) : null}
                    </div>
                  ) : (
                    <div className="preview-subtitle">{quickPreviewTextParts.subtitle}</div>
                  )}
                  {summedAmountMeta ? (
                    <div className="preview-sum">
                      Total dari {summedAmountMeta.parts} item: Rp{formatAmountIDR(summedAmountMeta.total)}
                    </div>
                  ) : null}
                  <div className="preview-meta">
                    Rp{formatAmountIDR(quickPreview.value.amount)} • {quickPreview.value.date}
                    {quickPreview.value.splitCount ? ` • ${quickPreview.value.splitCount}p` : ""}
                  </div>
                </>
              ) : (
                <>
                  <span>
                    {quickPreview.value.text} • Rp{formatAmountIDR(quickPreview.value.amount)} • {quickPreview.value.date}
                    {quickPreview.value.splitCount ? ` • ${quickPreview.value.splitCount}p` : ""}
                  </span>
                  {summedAmountMeta ? (
                    <div className="preview-sum">
                      Total dari {summedAmountMeta.parts} item: Rp{formatAmountIDR(summedAmountMeta.total)}
                    </div>
                  ) : null}
                </>
              )}
            </div>
            <div className="preview-badges">
              {isSummationInput ? <span className="mode-pill">Mode jumlah</span> : null}
              {quickPreview.warnings?.length ? (
                <button
                  className="warning-pill"
                  type="button"
                  onClick={() => setShowQuickWarningDetails((prev) => !prev)}
                >
                  !
                </button>
              ) : null}
            </div>
          </div>
        )}
        {quickError && <div className="error subtle">{quickError}</div>}
        {showTeachingHint ? <div className="hint teaching">{teachingHintText}</div> : null}

        {showQuickWarningDetails && quickPreview?.ok && quickPreview.warnings?.length ? (
          <ul className="warning-list">
            {quickPreview.warnings.map((warning, index) => (
              <li key={`${warning.code}-${index}`}>{warningShortText(warning)}</li>
            ))}
          </ul>
        ) : null}

        <button className="btn secondary" type="button" onClick={() => setBulkOpen((prev) => !prev)}>
          {bulkOpen ? "Tutup masukan banyak item" : "Masukan banyak item"}
        </button>

        {bulkOpen && (
          <div className="bulk-panel">
            <textarea
              className="textarea"
              value={bulkInput}
              onChange={(event) => setBulkInput(event.target.value)}
              placeholder={"Tempel banyak transaksi (1 baris = 1 transaksi).\nContoh :\nkopi 18\nparkir 2k\ndinner 120 3p"}
            />
            <div className="hint">
              Valid: {validBulkCount}/{bulkPreview.length}
            </div>
            {bulkPreview
              .filter((line) => !line.ok)
              .slice(0, 3)
              .map((line) => (
                <div key={line.line} className="error subtle">
                  {line.line}: {line.reason}
                </div>
              ))}
            <button
              className="btn"
              type="button"
              onClick={handleBulkSave}
              disabled={validBulkCount === 0}
            >
              Simpan Semua
            </button>
          </div>
        )}
      </section>

      <DailySummaryCard summary={todaySummaryStats} />

      <section className="list">
        {entries.length === 0 ? (
          <div className="empty">Belum ada catatan. Coba ketik pengeluaran pertama kamu.</div>
        ) : (
          orderedDates.map((dateISO) => (
            <section key={dateISO} className="day-group" aria-label={`Grup ${dateISO}`}>
              <div className="day-header">
                <h2 className="day-title">{formatDayLabel(dateISO)}</h2>
                <div className="day-total">Rp{formatAmountIDR(dailyTotal[dateISO] ?? 0)}</div>
              </div>
              <div className="day-list">
                {(groupedEntries[dateISO] ?? []).map((entry) => (
                  <EntryRow
                    key={entry.id}
                    entry={entry}
                    onDelete={() => handleDelete(entry.id)}
                    onUpdate={(updater) => updateEntry(entry.id, updater)}
                    onCategoryChange={(category) => handleCategoryChange(entry, category)}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </section>

      {undoToast ? (
        <div className="undo-toast">
          <span>Dihapus</span>
          <button className="undo-link" type="button" onClick={handleUndoDelete}>
            Undo
          </button>
        </div>
      ) : null}

      <footer className="app-version" aria-label="Versi aplikasi">
        v{appVersion}
      </footer>
    </main>
  );
}

function makeInitialSplit(amount: number, splitCount?: number): EntrySplit | undefined {
  if (!splitCount || splitCount <= 1) {
    return undefined;
  }

  const people = ["Kamu", ...Array.from({ length: splitCount - 1 }, (_, index) => `Orang ${index + 2}`)];
  return {
    mode: "equal",
    payer: "Kamu",
    shares: buildEqualSplit(amount, people)
  };
}

function warningShortText(warning: ParseWarning): string {
  switch (warning.code) {
    case "ASSUMED_THOUSANDS":
      return "Nominal diasumsikan ribuan";
    case "AMOUNT_TOKEN_CLEANED":
      return "Format nominal dibersihkan otomatis";
    case "SPLIT_COUNT_IGNORED":
      return "Split 1p diabaikan";
    case "AMOUNT_SUMMED":
      return "Nominal dijumlahkan otomatis";
    default:
      return warning.message;
  }
}

function warningDetail(warning: ParseWarning): string {
  switch (warning.code) {
    case "ASSUMED_THOUSANDS":
      return "Nominal diasumsikan ribuan.";
    case "AMOUNT_TOKEN_CLEANED":
      return "Token nominal dibersihkan otomatis.";
    case "SPLIT_COUNT_IGNORED":
      return "Split 1p diabaikan karena tidak perlu pembagian.";
    case "AMOUNT_SUMMED":
      return "Nominal dijumlahkan otomatis.";
    default:
      return warning.message;
  }
}

function extractSummedAmountMeta(
  warnings?: ParseWarning[]
): { parts: number; total: number } | null {
  const sumWarning = warnings?.find((warning) => warning.code === "AMOUNT_SUMMED");
  if (!sumWarning?.meta) {
    return null;
  }

  const parts = Number(sumWarning.meta.parts);
  const total = Number(sumWarning.meta.total);
  if (!Number.isFinite(parts) || !Number.isFinite(total) || parts < 2 || total <= 0) {
    return null;
  }

  return { parts, total };
}

function splitDisplayText(text: string): { title: string; subtitle?: string } {
  const delimiters = [" - ", " — "];
  let matchedDelimiter: string | null = null;
  let delimiterIndex = -1;

  for (const delimiter of delimiters) {
    const index = text.indexOf(delimiter);
    if (index > 0 && (delimiterIndex === -1 || index < delimiterIndex)) {
      delimiterIndex = index;
      matchedDelimiter = delimiter;
    }
  }

  if (!matchedDelimiter || delimiterIndex < 0) {
    return { title: text };
  }

  const title = text.slice(0, delimiterIndex).trim();
  const subtitle = text.slice(delimiterIndex + matchedDelimiter.length).trim();

  if (!title || !subtitle) {
    return { title: text };
  }

  return { title, subtitle };
}

function splitSubtitleItems(subtitle: string): string[] | null {
  if (!/[,;•]|\s\+\s/.test(subtitle)) {
    return null;
  }

  const items = subtitle
    .split(/[,;•]|\s\+\s/)
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter((item) => item.length > 0);

  return items.length > 0 ? items : null;
}

function parseDisplayAmountToken(token: string): number | undefined {
  const lowered = token.trim().toLowerCase();
  if (!lowered) {
    return undefined;
  }

  const cleaned = lowered
    .replace(/^rp\s*/i, "")
    .replace(/[^a-z0-9.,]/g, "")
    .replace(/[.,]+$/g, "");

  const match = cleaned.match(/^(\d+(?:[.,]\d+)?)(k|rb|jt)?$/i);
  if (!match) {
    return undefined;
  }

  const numericPart = match[1];
  const suffix = match[2]?.toLowerCase();

  if (suffix) {
    const parsedFloat = Number.parseFloat(numericPart.replace(",", "."));
    if (!Number.isFinite(parsedFloat)) {
      return undefined;
    }
    const multiplier = suffix === "jt" ? 1_000_000 : 1_000;
    return Math.round(parsedFloat * multiplier);
  }

  const parsedInt = Number.parseInt(numericPart.replace(/[.,]/g, ""), 10);
  if (!Number.isFinite(parsedInt)) {
    return undefined;
  }

  if (parsedInt >= 1 && parsedInt <= 999) {
    return parsedInt * 1_000;
  }

  return parsedInt;
}

function extractDisplayItems(text: string): { name: string; amount?: number }[] | null {
  const subtitle = splitDisplayText(text).subtitle;
  if (!subtitle) {
    return null;
  }

  const rawItems = subtitle
    .split(/[,;•]|\s\+\s/)
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter((item) => item.length > 0);

  if (rawItems.length < 2) {
    return null;
  }

  const amountTokenRegex = /rp?\s*\d+(?:[.,]\d+)?(?:k|rb|jt)?|\d+(?:[.,]\d+)?(?:k|rb|jt)?/gi;

  return rawItems.map((rawItem) => {
    const matches = rawItem.match(amountTokenRegex);
    const lastAmountToken = matches?.[matches.length - 1];
    const amount = lastAmountToken ? parseDisplayAmountToken(lastAmountToken) : undefined;

    let name = rawItem;
    if (lastAmountToken) {
      const removePattern = new RegExp(`\\s*${lastAmountToken.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "i");
      name = rawItem.replace(removePattern, "").trim();
    }

    return {
      name: name || rawItem,
      amount
    };
  });
}

function shouldShowTeachingHint(params: {
  input: string;
  preview: ParseQuickAddResult | null;
  bulkOpen: boolean;
  quickError: string | null;
}): boolean {
  const { input, preview, bulkOpen, quickError } = params;
  const trimmed = input.trim();

  if (bulkOpen) {
    return false;
  }

  if (quickError !== null) {
    return false;
  }

  if (trimmed.length < 3) {
    return false;
  }

  if (preview?.ok === true) {
    return false;
  }

  const hasLetter = /[a-z]/i.test(trimmed);
  const hasDigit = /\d/.test(trimmed);
  const hasSplitToken = /\b\d+p\b/i.test(trimmed);
  const withoutSplitToken = trimmed.replace(/\b\d+p\b/gi, " ");
  const hasNominalDigit = /\d/.test(withoutSplitToken);

  if (hasLetter && !hasDigit) {
    return true;
  }

  if (hasSplitToken && !hasNominalDigit) {
    return true;
  }

  return false;
}

function getTeachingHint(input: string): string {
  const trimmed = input.trim();
  const hasSplitToken = /\b\d+p\b/i.test(trimmed);
  const withoutSplitToken = trimmed.replace(/\b\d+p\b/gi, " ");
  const hasNominalDigit = /\d/.test(withoutSplitToken);

  if (hasSplitToken && !hasNominalDigit) {
    return "Tambah harga dulu: contoh `Gacoan 32k 3p`";
  }

  return "Tambah nominal: contoh `Gacoan 32k`";
}

function DailySummaryCard({ summary }: { summary: TodaySummaryStats }) {
  const breakdownText = summary.topCategories
    .map((item) => `${item.category} ${item.percentage}%`)
    .join(" • ");

  return (
    <section className="daily-summary-card" aria-label="Ringkasan hari ini">
      <div className="daily-summary-title">Hari ini</div>
      <div className="daily-summary-amount">Kamu keluar Rp{formatAmountIDR(summary.totalAmount)}</div>
      <div className={`daily-summary-status ${summary.status.tone}`}>{summary.status.label}</div>
      <div className="daily-summary-compare">
        Rata-rata 7 hari: Rp{formatAmountIDR(Math.round(summary.sevenDayAverage))}
      </div>
      <div className="daily-summary-meta">{summary.entryCount} transaksi</div>
      {summary.emptyState ? (
        <div className="daily-summary-empty">
          <div className="daily-summary-empty-title">{summary.emptyState.title}</div>
          <div className="daily-summary-empty-subtitle">{summary.emptyState.subtitle}</div>
        </div>
      ) : (
        <>
          {breakdownText ? <div className="daily-summary-breakdown">{breakdownText}</div> : null}
          {summary.topCategory ? (
            <div className="daily-summary-top">
              Terbesar: {summary.topCategory.category} (Rp{formatAmountIDR(summary.topCategory.totalAmount)})
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

function EntryRow({
  entry,
  onDelete,
  onUpdate,
  onCategoryChange
}: {
  entry: Entry;
  onDelete: () => void;
  onUpdate: (updater: (entry: Entry) => Entry) => void;
  onCategoryChange: (category: Category) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [textDraft, setTextDraft] = useState(entry.text);
  const [amountDraft, setAmountDraft] = useState(String(entry.amount));
  const [splitOpen, setSplitOpen] = useState(false);
  const [splitMode, setSplitMode] = useState<"equal" | "custom">(entry.split?.mode ?? "equal");
  const [peopleInput, setPeopleInput] = useState(
    entry.split?.shares.map((share) => share.person).join(", ") || "Kamu, Budi"
  );
  const [customDraft, setCustomDraft] = useState<Record<string, string>>({});
  const [isCustomDirty, setIsCustomDirty] = useState(false);
  const [customSubmitStatus, setCustomSubmitStatus] = useState<{
    type: "less" | "more" | "ok";
    diff: number;
  } | null>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const prevSplitOpenRef = useRef(splitOpen);
  const prevSplitModeRef = useRef(splitMode);

  useEffect(() => {
    setTextDraft(entry.text);
    setAmountDraft(String(entry.amount));
  }, [entry.text, entry.amount]);

  useEffect(() => {
    const wasSplitOpen = prevSplitOpenRef.current;
    const wasSplitMode = prevSplitModeRef.current;
    const openedNow = !wasSplitOpen && splitOpen;
    const switchedToCustom = wasSplitMode !== "custom" && splitMode === "custom";
    const shouldHydrateCustomDraft = splitMode === "custom" && (openedNow || switchedToCustom);

    if (shouldHydrateCustomDraft) {
      const nextDraft: Record<string, string> = {};
      const appliedShares = entry.split?.shares ?? [];
      for (const share of appliedShares) {
        nextDraft[share.person] = share.amount > 0 ? String(share.amount) : "";
      }
      for (const person of peopleInput.split(",").map((item) => item.trim()).filter(Boolean)) {
        if (!(person in nextDraft)) {
          nextDraft[person] = "";
        }
      }

      setCustomDraft(nextDraft);
      setIsCustomDirty(false);
      setCustomSubmitStatus(entry.split ? { type: "ok", diff: 0 } : null);
    }

    if (!splitOpen && wasSplitOpen) {
      setIsCustomDirty(false);
      setCustomSubmitStatus(null);
    }

    prevSplitOpenRef.current = splitOpen;
    prevSplitModeRef.current = splitMode;
  }, [entry.split, peopleInput, splitMode, splitOpen]);

  const people = useMemo(
    () =>
      peopleInput
        .split(",")
        .map((person) => person.trim())
        .filter((person) => person.length > 0),
    [peopleInput]
  );

  const currentPaymentMethod: PaymentMethod = entry.paymentMethod ?? "Unknown";
  const splitCount = entry.split?.shares?.length ?? null;
  const warningCount = entry.parseWarnings?.length ?? 0;
  const hasSelectedPaymentMethod = currentPaymentMethod !== "Unknown";
  const expandedPanelId = `row-expanded-${entry.id}`;
  const displayText = useMemo(() => splitDisplayText(entry.text), [entry.text]);
  const subtitleItems = useMemo(
    () => (displayText.subtitle ? splitSubtitleItems(displayText.subtitle) : null),
    [displayText.subtitle]
  );
  const splitSummary = useMemo(() => {
    if (!entry.split || entry.split.shares.length <= 1) {
      return null;
    }

    return {
      paymentLines: entry.split.shares.map(
        (share) => `${share.person} bayar Rp${formatAmountCompact(share.amount)}`
      ),
      settlementLines: entry.split.shares
        .filter((share) => share.person !== entry.split?.payer && share.amount > 0)
        .map((share) => `${share.person} ganti ke ${entry.split?.payer} Rp${formatAmountCompact(share.amount)}`)
    };
  }, [entry.split]);
  const displayItems = useMemo(() => extractDisplayItems(entry.text), [entry.text]);

  function saveInlineEdit() {
    const numericAmount = Number.parseInt(amountDraft.replace(/[^\d]/g, ""), 10);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return;
    }
    const nextText = textDraft.trim() || "Pengeluaran";

    onUpdate((current) => ({
      ...current,
      text: nextText,
      amount: numericAmount
    }));
  }

  function applyEqualSplit() {
    if (people.length < 2) {
      return;
    }

    const shares = buildEqualSplit(entry.amount, people);
    onUpdate((current) => ({
      ...current,
      split: {
        mode: "equal",
        payer: current.split?.payer ?? "Kamu",
        shares
      }
    }));
    setIsCustomDirty(false);
    setCustomSubmitStatus(null);
  }

  function applyCustomSplit() {
    const shares = people.map((person) => ({
      person,
      amount: Number.parseInt((customDraft[person] ?? "0").replace(/[^\d]/g, ""), 10) || 0
    }));
    const customTotal = shares.reduce((sum, share) => sum + share.amount, 0);
    const diff = customTotal - entry.amount;

    if (diff < 0) {
      setCustomSubmitStatus({ type: "less", diff });
      return;
    }

    if (diff > 0) {
      setCustomSubmitStatus({ type: "more", diff });
      return;
    }

    const validated = buildCustomSplit(entry.amount, shares);
    if (!validated) {
      return;
    }

    onUpdate((current) => ({
      ...current,
      split: {
        mode: "custom",
        payer: current.split?.payer ?? "Kamu",
        shares: validated
      }
    }));
    setIsCustomDirty(false);
    setCustomSubmitStatus({ type: "ok", diff: 0 });
  }

  return (
    <article className={`row ${isExpanded ? "expanded" : ""}`}>
      <button
        className="row-hit"
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        aria-controls={expandedPanelId}
      >
        <div className="row-top">
          <div>
            <div className="row-text">{displayText.title}</div>
            {displayText.subtitle ? (
              subtitleItems ? (
                <div className="subtitle-items">
                  {subtitleItems.slice(0, 3).map((item, index) => (
                    <span key={`${item}-${index}`} className="item-pill">
                      {item}
                    </span>
                  ))}
                  {subtitleItems.length > 3 ? <span className="item-pill more">+{subtitleItems.length - 3}</span> : null}
                </div>
              ) : (
                <div className="row-subtext">{displayText.subtitle}</div>
              )
            ) : null}
            <div className="row-meta">
              {entry.date} • {entry.category}
              {hasSelectedPaymentMethod ? ` • ${paymentMethodLabel(currentPaymentMethod)}` : ""}
              {splitCount && splitCount > 1 ? ` • ${splitCount}p` : ""}
              {warningCount ? ` • !${warningCount}` : ""}
            </div>
          </div>
          <div className="row-amount">Rp{formatAmountIDR(entry.amount)}</div>
        </div>
      </button>

      {isExpanded ? (
        <div id={expandedPanelId} className="row-expanded">
          <div className="inline-grid">
            <input className="input" value={textDraft} onChange={(event) => setTextDraft(event.target.value)} />
            <input
              ref={amountInputRef}
              className="input"
              value={amountDraft}
              onChange={(event) => setAmountDraft(event.target.value)}
            />
            <button className="btn secondary btn-sm" type="button" onClick={saveInlineEdit}>
              Simpan
            </button>
          </div>

          <div className="chip-group">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                className={`chip ${entry.category === category ? "active" : ""}`}
                onClick={() => {
                  onCategoryChange(category);
                  setIsExpanded(false);
                }}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="field-section">
            <div className="hint subtle">Metode bayar (opsional)</div>
            <div className="chip-group compact">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method}
                  type="button"
                  className={`chip secondary ${currentPaymentMethod === method ? "active" : ""}`}
                  onClick={() =>
                    onUpdate((current) => ({
                      ...current,
                      paymentMethod: method
                    }))
                  }
                >
                  {paymentMethodLabel(method)}
                </button>
              ))}
            </div>
          </div>

          {entry.parseWarnings?.length ? (
            <div className="warning-box">
              <div className="hint">Perlu cek</div>
              <ul className="warning-list">
                {entry.parseWarnings.map((warning, index) => (
                  <li key={`${warning.code}-${index}`}>
                    {warningDetail(warning)}
                    {warning.code === "ASSUMED_THOUSANDS" ? (
                      <button className="btn secondary btn-sm" type="button" onClick={() => amountInputRef.current?.focus()}>
                        Edit nominal
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <hr className="section-divider" />
          <div className="row-actions compact">
            <button className="btn ghost btn-sm" type="button" onClick={() => setSplitOpen((prev) => !prev)}>
              {splitOpen ? "Tutup Split" : "Split"}
            </button>
            <button className="btn ghost btn-sm danger" type="button" onClick={onDelete}>
              Hapus
            </button>
          </div>

          {splitOpen ? (
            <div className="split-box">
              <div className="hint">People (pisahkan koma)</div>
              <input className="input" value={peopleInput} onChange={(event) => setPeopleInput(event.target.value)} />
              <div className="row-actions compact">
                <button
                  className={`btn btn-sm ${splitMode === "equal" ? "" : "secondary"}`}
                  type="button"
                  onClick={() => {
                    setSplitMode("equal");
                    setIsCustomDirty(false);
                    setCustomSubmitStatus(null);
                  }}
                >
                  Equal
                </button>
                <button
                  className={`btn btn-sm ${splitMode === "custom" ? "" : "secondary"}`}
                  type="button"
                  onClick={() => setSplitMode("custom")}
                >
                  Custom
                </button>
              </div>

              {splitMode === "custom" ? (
                <>
                  <div className="inline-grid">
                    {people.map((person) => (
                      <div key={person}>
                        <div className="hint">{person}</div>
                        <input
                          className="input"
                          value={customDraft[person] ?? ""}
                          onChange={(event) => {
                            setIsCustomDirty(true);
                            setCustomSubmitStatus(null);
                            setCustomDraft((prev) => ({
                              ...prev,
                              [person]: event.target.value
                            }));
                          }}
                          placeholder="Nominal"
                        />
                      </div>
                    ))}
                  </div>
                  <div className={`split-status ${customSubmitStatus?.type ?? "pending"}`}>
                    {customSubmitStatus
                      ? customSubmitStatus.type === "less"
                        ? `Kurang Rp${formatAmountIDR(Math.abs(customSubmitStatus.diff))}`
                        : customSubmitStatus.type === "more"
                          ? `Lebih Rp${formatAmountIDR(customSubmitStatus.diff)}`
                          : "Sudah pas"
                      : "Draft belum diterapkan"}
                  </div>
                  {isCustomDirty ? <div className="hint subtle">Klik Terapkan Custom untuk lihat hasil</div> : null}
                </>
              ) : null}

              <div className="row-actions compact">
                {splitMode === "equal" ? (
                  <button className="btn btn-sm" type="button" onClick={applyEqualSplit}>
                    Terapkan Equal
                  </button>
                ) : (
                  <button className="btn btn-sm" type="button" onClick={applyCustomSplit}>
                    Terapkan Custom
                  </button>
                )}
              </div>
            </div>
          ) : null}

          {splitSummary && (splitMode !== "custom" || !isCustomDirty) ? (
            <div className="summary">
              <div>Pembagian</div>
              {splitSummary.paymentLines.map((line, index) => (
                <div key={`${line}-${index}`}>{line}</div>
              ))}
              {splitSummary.settlementLines.length > 0
                ? splitSummary.settlementLines.map((line, index) => (
                    <div key={`settlement-${index}`} className="hint subtle">
                      {line}
                    </div>
                  ))
                : null}
            </div>
          ) : null}

          {displayItems ? (
            <div className="breakdown">
              {displayItems.map((item, index) => (
                <div key={`${item.name}-${index}`} className="breakdown-row">
                  <span>{item.name}</span>
                  <span>{item.amount !== undefined ? `Rp${formatAmountIDR(item.amount)}` : ""}</span>
                </div>
              ))}
              <div className="breakdown-total">
                <span>total</span>
                <span>Rp{formatAmountIDR(entry.amount)}</span>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
