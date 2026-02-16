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
  EntrySplit,
  ParseWarning
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

export default function HomePage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [rules, setRules] = useState<CategoryRules>([]);
  const [quickInput, setQuickInput] = useState("");
  const [debouncedQuickInput, setDebouncedQuickInput] = useState("");
  const [quickError, setQuickError] = useState<string | null>(null);
  const [showQuickWarningDetails, setShowQuickWarningDetails] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkInput, setBulkInput] = useState("");
  const [undoToast, setUndoToast] = useState<UndoToastState | null>(null);
  const quickInputRef = useRef<HTMLInputElement>(null);
  const pendingUndoRef = useRef<UndoToastState | null>(null);

  useEffect(() => {
    setEntries(loadEntries());
    setRules(loadRules());
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
    saveEntries(entries);
  }, [entries]);

  useEffect(() => {
    if (!pendingUndoRef.current) {
      return;
    }

    setUndoToast(pendingUndoRef.current);
    pendingUndoRef.current = null;
  }, [entries]);

  useEffect(() => {
    saveRules(rules);
  }, [rules]);

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
              setShowQuickWarningDetails(false);
            }}
            placeholder="contoh: kopi 18, parkir 2k, dinner 120 3p"
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

        {quickPreview?.ok && (
          <div className="hint preview-row">
            <span>
              {quickPreview.value.text} • Rp{formatAmountIDR(quickPreview.value.amount)} • {quickPreview.value.date}
              {quickPreview.value.splitCount ? ` • ${quickPreview.value.splitCount}p` : ""}
            </span>
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
        )}
        {quickPreview && !quickPreview.ok && <div className="error subtle">{quickPreview.reason}</div>}
        {quickError && <div className="error subtle">{quickError}</div>}

        {showQuickWarningDetails && quickPreview?.ok && quickPreview.warnings?.length ? (
          <ul className="warning-list">
            {quickPreview.warnings.map((warning, index) => (
              <li key={`${warning.code}-${index}`}>{warningShortText(warning)}</li>
            ))}
          </ul>
        ) : null}

        <button className="btn secondary" type="button" onClick={() => setBulkOpen((prev) => !prev)}>
          {bulkOpen ? "Tutup Tempel Banyak" : "Tempel Banyak"}
        </button>

        {bulkOpen && (
          <div className="bulk-panel">
            <textarea
              className="textarea"
              value={bulkInput}
              onChange={(event) => setBulkInput(event.target.value)}
              placeholder={"Satu baris satu transaksi.\nkopi 18\nparkir 2k\ndinner 120 3p"}
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

      <section className="list">
        {entries.length === 0 ? (
          <div className="empty">Belum ada catatan. Coba ketik pengeluaran pertama kamu.</div>
        ) : (
          entries.map((entry) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              onDelete={() => handleDelete(entry.id)}
              onUpdate={(updater) => updateEntry(entry.id, updater)}
              onCategoryChange={(category) => handleCategoryChange(entry, category)}
            />
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
    default:
      return warning.message;
  }
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
  const [splitError, setSplitError] = useState<string | null>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTextDraft(entry.text);
    setAmountDraft(String(entry.amount));
  }, [entry.text, entry.amount]);

  const people = useMemo(
    () =>
      peopleInput
        .split(",")
        .map((person) => person.trim())
        .filter((person) => person.length > 0),
    [peopleInput]
  );

  const splitCount = entry.split?.shares?.length ?? null;
  const warningCount = entry.parseWarnings?.length ?? 0;
  const expandedPanelId = `row-expanded-${entry.id}`;

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
      setSplitError("Minimal 2 orang untuk split.");
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
    setSplitError(null);
  }

  function applyCustomSplit() {
    if (people.length < 2) {
      setSplitError("Minimal 2 orang untuk split.");
      return;
    }

    const shares = people.map((person) => ({
      person,
      amount: Number.parseInt((customDraft[person] ?? "0").replace(/[^\d]/g, ""), 10) || 0
    }));

    const validated = buildCustomSplit(entry.amount, shares);
    if (!validated) {
      setSplitError("Total split harus sama dengan nominal.");
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
    setSplitError(null);
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
            <div className="row-text">{entry.text}</div>
            <div className="row-meta">
              {entry.date} • {entry.category}
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
                  onClick={() => setSplitMode("equal")}
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
                <div className="inline-grid">
                  {people.map((person) => (
                    <div key={person}>
                      <div className="hint">{person}</div>
                      <input
                        className="input"
                        value={customDraft[person] ?? ""}
                        onChange={(event) =>
                          setCustomDraft((prev) => ({
                            ...prev,
                            [person]: event.target.value
                          }))
                        }
                        placeholder="Nominal"
                      />
                    </div>
                  ))}
                </div>
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
              {splitError ? <div className="error subtle">{splitError}</div> : null}
            </div>
          ) : null}

          {entry.split && entry.split.shares.length > 1 ? (
            <div className="summary">
              {entry.split.shares
                .filter((share) => share.person !== entry.split?.payer && share.amount > 0)
                .map((share) => `${share.person} owes ${entry.split?.payer} ${formatAmountCompact(share.amount)}`)
                .join(" · ")}
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
