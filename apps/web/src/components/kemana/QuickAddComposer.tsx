"use client";

import { formatAmountIDR } from "@kemana/core/format";
import type { ParseQuickAddResult } from "@kemana/core/types";
import LastEntryGapIndicator from "@/app/LastEntryGapIndicator";
import type { SmartRecallPrompt } from "@/app/recall";
import { formatItemPillText, type ItemLine, warningShortText } from "@/lib/kemana-utils";
import SmartRecallBar from "./SmartRecallBar";

interface BulkPreviewLine {
  line: string;
  ok: boolean;
  reason?: string;
}

interface QuickAddComposerProps {
  lastEntryAt: number | null;
  onGlobalRecoveryClick: () => void;
  smartRecallPrompt: SmartRecallPrompt | null;
  onRecallAddRecent: () => void;
  onRecallDismiss: () => void;
  quickInputRef: React.RefObject<HTMLInputElement>;
  quickInput: string;
  onQuickInputChange: (value: string) => void;
  quickInputPlaceholder: string;
  onQuickInputBlur: () => void;
  onQuickAdd: () => void;
  adaptiveHints: string[];
  quickPreview: ParseQuickAddResult | null;
  quickPreviewTextParts: { title: string; subtitle?: string } | null;
  quickPreviewSubtitleBreakdown: ItemLine[] | null;
  quickPreviewSubtitleItems: string[] | null;
  summedAmountMeta: { parts: number; total: number } | null;
  isSummationInput: boolean;
  showQuickWarningDetails: boolean;
  onToggleQuickWarningDetails: () => void;
  quickError: string | null;
  bulkOpen: boolean;
  onToggleBulkOpen: () => void;
  bulkInput: string;
  onBulkInputChange: (value: string) => void;
  validBulkCount: number;
  bulkPreview: BulkPreviewLine[];
  onBulkSave: () => void;
}

export default function QuickAddComposer({
  lastEntryAt,
  onGlobalRecoveryClick,
  smartRecallPrompt,
  onRecallAddRecent,
  onRecallDismiss,
  quickInputRef,
  quickInput,
  onQuickInputChange,
  quickInputPlaceholder,
  onQuickInputBlur,
  onQuickAdd,
  adaptiveHints,
  quickPreview,
  quickPreviewTextParts,
  quickPreviewSubtitleBreakdown,
  quickPreviewSubtitleItems,
  summedAmountMeta,
  isSummationInput,
  showQuickWarningDetails,
  onToggleQuickWarningDetails,
  quickError,
  bulkOpen,
  onToggleBulkOpen,
  bulkInput,
  onBulkInputChange,
  validBulkCount,
  bulkPreview,
  onBulkSave
}: QuickAddComposerProps) {
  return (
    <section className="composer">
      <div className="composer-context-row">
        <button
          className="btn secondary btn-sm recovery-cta"
          type="button"
          onClick={onGlobalRecoveryClick}
        >
          Tambah yang barusan
        </button>
        <LastEntryGapIndicator lastEntryAt={lastEntryAt} />
      </div>
      {smartRecallPrompt ? (
        <SmartRecallBar
          prompt={smartRecallPrompt}
          onAddRecent={onRecallAddRecent}
          onDismiss={onRecallDismiss}
        />
      ) : null}
      <div className="composer-row">
        <input
          ref={quickInputRef}
          className="input"
          value={quickInput}
          onChange={(event) => {
            onQuickInputChange(event.target.value);
          }}
          placeholder={quickInputPlaceholder}
          onBlur={onQuickInputBlur}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onQuickAdd();
            }
          }}
        />
        <button className="btn" type="button" onClick={onQuickAdd}>
          Tambah
        </button>
      </div>
      {adaptiveHints.length ? (
        <div className="smart-hints">
          {adaptiveHints.map((hint, index) => (
            <div key={`${hint}-${index}`} className="hint subtle smart-hint">
              {hint}
            </div>
          ))}
        </div>
      ) : null}

      {quickPreview?.ok && (
        <div className="hint preview-row">
          <div className="preview-content">
            {quickPreviewTextParts?.subtitle ? (
              <>
                <div className="preview-title">{quickPreviewTextParts.title}</div>
                {quickPreviewSubtitleBreakdown ? (
                  <div className="subtitle-items">
                    {quickPreviewSubtitleBreakdown.slice(0, 3).map((item, index) => (
                      <span key={`${item.raw}-${index}`} className="item-pill">
                        {formatItemPillText(item)}
                      </span>
                    ))}
                    {quickPreviewSubtitleBreakdown.length > 3 ? (
                      <span className="item-pill more">+{quickPreviewSubtitleBreakdown.length - 3}</span>
                    ) : null}
                  </div>
                ) : quickPreviewSubtitleItems ? (
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
                onClick={onToggleQuickWarningDetails}
              >
                !
              </button>
            ) : null}
          </div>
        </div>
      )}
      {quickError && <div className="error subtle">{quickError}</div>}

      {showQuickWarningDetails && quickPreview?.ok && quickPreview.warnings?.length ? (
        <ul className="warning-list">
          {quickPreview.warnings.map((warning, index) => (
            <li key={`${warning.code}-${index}`}>{warningShortText(warning)}</li>
          ))}
        </ul>
      ) : null}

      <button className="btn secondary" type="button" onClick={onToggleBulkOpen}>
        {bulkOpen ? "Tutup masukan banyak item" : "Masukan banyak item"}
      </button>

      {bulkOpen && (
        <div className="bulk-panel">
          <textarea
            className="textarea"
            value={bulkInput}
            onChange={(event) => onBulkInputChange(event.target.value)}
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
            onClick={onBulkSave}
            disabled={validBulkCount === 0}
          >
            Simpan Semua
          </button>
        </div>
      )}
    </section>
  );
}
