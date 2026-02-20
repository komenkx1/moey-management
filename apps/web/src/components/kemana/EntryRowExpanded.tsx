"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { formatAmountCompact, formatAmountIDR } from "@kemana/core/format";
import { buildCustomSplit, buildEqualSplit } from "@kemana/core/split";
import {
  CATEGORIES,
  type Category,
  type Entry,
  PAYMENT_METHODS,
  type PaymentMethod
} from "@kemana/core/types";
import {
  formatItemPillText,
  normalizeDateInput,
  parseItemBreakdownFromSubtitle,
  paymentMethodLabel,
  splitDisplayText,
  splitSubtitleItems,
  warningDetail
} from "@/lib/kemana-utils";
import EntryRowCollapsed from "./EntryRowCollapsed";
import SplitEditor from "./SplitEditor";

interface EntryRowExpandedProps {
  entry: Entry;
  isHighlighted?: boolean;
  shouldAutoExpand?: boolean;
  onAutoExpandHandled?: () => void;
  onDelete: () => void;
  onUpdate: (updater: (entry: Entry) => Entry, toastMessage?: string) => void;
  onDateChanged?: (entryId: string, nextDateISO: string) => void;
  onCategoryChange: (category: Category) => void;
}

function EntryRowExpanded({
  entry,
  isHighlighted,
  shouldAutoExpand,
  onAutoExpandHandled,
  onDelete,
  onUpdate,
  onDateChanged,
  onCategoryChange
}: EntryRowExpandedProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [textDraft, setTextDraft] = useState(entry.text);
  const [amountDraft, setAmountDraft] = useState(String(entry.amount));
  const [dateEditorOpen, setDateEditorOpen] = useState(false);
  const [dateDraft, setDateDraft] = useState(entry.date);
  const [splitOpen, setSplitOpen] = useState(false);
  const [splitMode, setSplitMode] = useState<"equal" | "custom">(entry.split?.mode ?? "equal");
  const [peopleInput, setPeopleInput] = useState(
    entry.split?.shares.map((share) => share.person).join(", ") || "Kamu, Budi"
  );
  const [customDraft, setCustomDraft] = useState<Record<string, string>>({});
  const [isCustomDirty, setIsCustomDirty] = useState(false);
  const [showItemBreakdown, setShowItemBreakdown] = useState(false);
  const [isAssumedThousandsReviewing, setIsAssumedThousandsReviewing] = useState(false);
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
    setDateDraft(entry.date);
    setIsAssumedThousandsReviewing(false);
  }, [entry.text, entry.amount, entry.date]);

  useEffect(() => {
    if (!shouldAutoExpand) {
      return;
    }
    setIsExpanded(true);
    onAutoExpandHandled?.();
  }, [shouldAutoExpand, onAutoExpandHandled]);

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
  const hasSplit = Boolean(entry.split && entry.split.shares.length > 0);
  const splitStateLabel = hasSplit
    ? `${entry.split?.shares.length ?? 0} orang • ${entry.split?.mode === "custom" ? "Custom" : "Equal"}`
    : "Belum diatur";
  const splitToggleLabel = splitOpen ? "Selesai" : hasSplit ? "Edit Split" : "Buat Split";
  const hasSelectedPaymentMethod = currentPaymentMethod !== "Unknown";
  const expandedPanelId = `row-expanded-${entry.id}`;
  const displayText = useMemo(() => splitDisplayText(entry.text), [entry.text]);
  const subtitleBreakdown = useMemo(
    () => (displayText.subtitle ? parseItemBreakdownFromSubtitle(displayText.subtitle) : null),
    [displayText.subtitle]
  );
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

  useEffect(() => {
    if (!subtitleBreakdown) {
      setShowItemBreakdown(false);
    }
  }, [subtitleBreakdown]);

  function saveInlineEdit() {
    const numericAmount = Number.parseInt(amountDraft.replace(/[^\d]/g, ""), 10);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return;
    }
    const nextText = textDraft.trim() || "Pengeluaran";

    onUpdate((current) => {
      const shouldClearAssumedThousands =
        isAssumedThousandsReviewing || numericAmount !== current.amount;
      const nextWarnings = shouldClearAssumedThousands
        ? current.parseWarnings?.filter((warning) => warning.code !== "ASSUMED_THOUSANDS")
        : current.parseWarnings;

      return {
        ...current,
        text: nextText,
        amount: numericAmount,
        parseWarnings: nextWarnings && nextWarnings.length > 0 ? nextWarnings : undefined
      };
    }, "Perubahan disimpan");
    setIsAssumedThousandsReviewing(false);
  }

  function saveDateEdit() {
    const normalizedDate = normalizeDateInput(dateDraft);
    if (!normalizedDate) {
      return;
    }

    if (normalizedDate === entry.date) {
      setDateEditorOpen(false);
      return;
    }

    onUpdate((current) => ({
      ...current,
      date: normalizedDate
    }));
    onDateChanged?.(entry.id, normalizedDate);
    setDateDraft(normalizedDate);
    setDateEditorOpen(false);
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
    }), "Split diperbarui");
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
    }), "Split diperbarui");
    setIsCustomDirty(false);
    setCustomSubmitStatus({ type: "ok", diff: 0 });
  }

  function cancelSplitEditPanel() {
    setSplitOpen(false);
    setIsCustomDirty(false);
    setCustomSubmitStatus(null);
  }

  function clearAppliedSplit() {
    if (!entry.split) {
      return;
    }
    onUpdate((current) => ({
      ...current,
      split: undefined
    }), "Split dibatalkan");
    setSplitOpen(false);
    setSplitMode("equal");
    setIsCustomDirty(false);
    setCustomSubmitStatus(null);
  }

  return (
    <article
      id={`entry-${entry.id}`}
      data-entry-id={entry.id}
      className={`row ${isExpanded ? "expanded" : ""} ${isHighlighted ? "highlight" : ""}`}
    >
      <EntryRowCollapsed
        entry={entry}
        isExpanded={isExpanded}
        expandedPanelId={expandedPanelId}
        onToggleExpand={() => setIsExpanded((prev) => !prev)}
        displayText={displayText}
        subtitleBreakdown={subtitleBreakdown}
        subtitleItems={subtitleItems}
        currentPaymentMethod={currentPaymentMethod}
        hasSelectedPaymentMethod={hasSelectedPaymentMethod}
        splitCount={splitCount}
        warningCount={warningCount}
      />

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

          <div className="date-inline-editor">
            <div className="hint subtle">Tanggal: {entry.date}</div>
            {!dateEditorOpen ? (
              <button className="btn secondary btn-sm" type="button" onClick={() => setDateEditorOpen(true)}>
                Ubah tanggal
              </button>
            ) : (
              <div className="date-inline-controls">
                <input
                  className="input"
                  type="date"
                  value={dateDraft}
                  onChange={(event) => setDateDraft(event.target.value)}
                />
                <div className="row-actions compact">
                  <button className="btn secondary btn-sm" type="button" onClick={saveDateEdit}>
                    Simpan tanggal
                  </button>
                  <button
                    className="btn ghost btn-sm"
                    type="button"
                    onClick={() => {
                      setDateDraft(entry.date);
                      setDateEditorOpen(false);
                    }}
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="chip-group">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                className={`chip ${entry.category === category ? "active" : ""}`}
                onClick={() => onCategoryChange(category)}
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
                    }), "Metode bayar diperbarui")
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
                      <button
                        className="btn secondary btn-sm"
                        type="button"
                        onClick={() => {
                          setIsAssumedThousandsReviewing(true);
                          amountInputRef.current?.focus();
                        }}
                      >
                        Edit nominal
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <SplitEditor
            splitStateLabel={splitStateLabel}
            splitToggleLabel={splitToggleLabel}
            splitOpen={splitOpen}
            hasSplit={hasSplit}
            splitMode={splitMode}
            peopleInput={peopleInput}
            people={people}
            customDraft={customDraft}
            isCustomDirty={isCustomDirty}
            customSubmitStatus={customSubmitStatus}
            splitSummary={splitSummary}
            showSplitSummary={splitMode !== "custom" || !isCustomDirty}
            onToggleSplitOpen={() => setSplitOpen((prev) => !prev)}
            onCancelSplitEditPanel={cancelSplitEditPanel}
            onClearAppliedSplit={clearAppliedSplit}
            onDelete={onDelete}
            onPeopleInputChange={setPeopleInput}
            onSetSplitModeEqual={() => {
              setSplitMode("equal");
              setIsCustomDirty(false);
              setCustomSubmitStatus(null);
            }}
            onSetSplitModeCustom={() => setSplitMode("custom")}
            onCustomDraftChange={(person, value) => {
              setIsCustomDirty(true);
              setCustomSubmitStatus(null);
              setCustomDraft((prev) => ({
                ...prev,
                [person]: value
              }));
            }}
            onApplyEqualSplit={applyEqualSplit}
            onApplyCustomSplit={applyCustomSplit}
          />

          {subtitleBreakdown ? (
            <div className="item-breakdown-wrap">
              <button
                className="btn secondary btn-sm"
                type="button"
                onClick={() => setShowItemBreakdown((prev) => !prev)}
              >
                {showItemBreakdown ? "Sembunyikan item" : "Lihat item"}
              </button>
              {showItemBreakdown ? (
                <div className="breakdown">
                  {subtitleBreakdown.map((item, index) => (
                    <div key={`${item.raw}-${index}`} className="breakdown-row">
                      <span>{item.label || item.raw}</span>
                      <span className="breakdown-meta">
                        {item.qty ? `×${item.qty}` : ""}
                        {item.amount !== undefined ? ` ${item.qty ? "• " : ""}Rp${formatAmountCompact(item.amount)}` : ""}
                      </span>
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
        </div>
      ) : null}
    </article>
  );
}

function areEntryRowExpandedPropsEqual(
  previousProps: EntryRowExpandedProps,
  nextProps: EntryRowExpandedProps
): boolean {
  return (
    previousProps.entry === nextProps.entry &&
    previousProps.isHighlighted === nextProps.isHighlighted &&
    previousProps.shouldAutoExpand === nextProps.shouldAutoExpand
  );
}

export default memo(EntryRowExpanded, areEntryRowExpandedPropsEqual);
