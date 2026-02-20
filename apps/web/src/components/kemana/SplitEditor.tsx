"use client";

import { formatAmountIDR } from "@kemana/core/format";

interface CustomSubmitStatus {
  type: "less" | "more" | "ok";
  diff: number;
}

interface SplitSummary {
  paymentLines: string[];
  settlementLines: string[];
}

interface SplitEditorProps {
  splitStateLabel: string;
  splitToggleLabel: string;
  splitOpen: boolean;
  hasSplit: boolean;
  splitMode: "equal" | "custom";
  peopleInput: string;
  people: string[];
  customDraft: Record<string, string>;
  isCustomDirty: boolean;
  customSubmitStatus: CustomSubmitStatus | null;
  splitSummary: SplitSummary | null;
  showSplitSummary: boolean;
  onToggleSplitOpen: () => void;
  onCancelSplitEditPanel: () => void;
  onClearAppliedSplit: () => void;
  onDelete: () => void;
  onPeopleInputChange: (value: string) => void;
  onSetSplitModeEqual: () => void;
  onSetSplitModeCustom: () => void;
  onCustomDraftChange: (person: string, value: string) => void;
  onApplyEqualSplit: () => void;
  onApplyCustomSplit: () => void;
}

export default function SplitEditor({
  splitStateLabel,
  splitToggleLabel,
  splitOpen,
  hasSplit,
  splitMode,
  peopleInput,
  people,
  customDraft,
  isCustomDirty,
  customSubmitStatus,
  splitSummary,
  showSplitSummary,
  onToggleSplitOpen,
  onCancelSplitEditPanel,
  onClearAppliedSplit,
  onDelete,
  onPeopleInputChange,
  onSetSplitModeEqual,
  onSetSplitModeCustom,
  onCustomDraftChange,
  onApplyEqualSplit,
  onApplyCustomSplit
}: SplitEditorProps) {
  return (
    <>
      <hr className="section-divider" />
      <div className="split-entry-header">
        <div className="split-entry-info">
          <div className="split-entry-title">Split bill</div>
          <div className="split-entry-meta">{splitStateLabel}</div>
        </div>
        <div className="row-actions compact split-entry-actions">
          <button
            className={`btn btn-sm ${splitOpen || hasSplit ? "secondary" : ""}`}
            type="button"
            onClick={onToggleSplitOpen}
          >
            {splitToggleLabel}
          </button>
          {splitOpen ? (
            <button className="btn secondary btn-sm" type="button" onClick={onCancelSplitEditPanel}>
              Batal
            </button>
          ) : null}
          {hasSplit ? (
            <button className="btn ghost btn-sm danger" type="button" onClick={onClearAppliedSplit}>
              Batalkan split
            </button>
          ) : null}
          <button className="btn ghost btn-sm danger" type="button" onClick={onDelete}>
            Hapus
          </button>
        </div>
      </div>

      {splitOpen ? (
        <div className="split-box">
          <div className="hint">People (pisahkan koma)</div>
          <input className="input" value={peopleInput} onChange={(event) => onPeopleInputChange(event.target.value)} />
          <div className="row-actions compact">
            <button
              className={`btn btn-sm ${splitMode === "equal" ? "" : "secondary"}`}
              type="button"
              onClick={onSetSplitModeEqual}
            >
              Equal
            </button>
            <button
              className={`btn btn-sm ${splitMode === "custom" ? "" : "secondary"}`}
              type="button"
              onClick={onSetSplitModeCustom}
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
                      onChange={(event) => onCustomDraftChange(person, event.target.value)}
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
              <button className="btn btn-sm" type="button" onClick={onApplyEqualSplit}>
                Terapkan Equal
              </button>
            ) : (
              <button className="btn btn-sm" type="button" onClick={onApplyCustomSplit}>
                Terapkan Custom
              </button>
            )}
          </div>
        </div>
      ) : null}

      {splitSummary && showSplitSummary ? (
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
    </>
  );
}
