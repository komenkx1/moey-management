"use client";

import { formatAmountIDR } from "@kemana/core/format";
import type { NightCloseTopCategory } from "./night-close";

interface NightClosePanelProps {
  open: boolean;
  dateLabel: string;
  total: number;
  count: number;
  promptLine: string;
  topCategory: NightCloseTopCategory | null;
  onClose: () => void;
  onDone: () => void;
  onAddEntry: () => void;
}

export default function NightClosePanel({
  open,
  dateLabel,
  total,
  count,
  promptLine,
  topCategory,
  onClose,
  onDone,
  onAddEntry
}: NightClosePanelProps) {
  if (!open) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className="night-close-backdrop"
        aria-label="Tutup review"
        onClick={onClose}
      />
      <section
        className="night-close-panel"
        role="dialog"
        aria-modal="false"
        aria-label="Review tutup hari"
      >
        <div className="night-close-panel-header">
          <div>
            <div className="night-close-panel-title">Tutup hari ini</div>
            <div className="night-close-panel-date">{dateLabel}</div>
          </div>
          <button className="btn ghost btn-sm" type="button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="night-close-panel-grid">
          <div className="night-close-panel-line">Total: Rp{formatAmountIDR(total)}</div>
          <div className="night-close-panel-line">Transaksi: {count}</div>
          {topCategory ? (
            <div className="night-close-panel-line">
              Kategori terbesar: {topCategory.name} {topCategory.percent}%
            </div>
          ) : null}
        </div>

        <div className="night-close-panel-prompt">{promptLine}</div>

        <div className="night-close-panel-actions">
          <button className="btn" type="button" onClick={onDone}>
            Selesai (tandai beres)
          </button>
          <button className="btn secondary" type="button" onClick={onAddEntry}>
            Tambah transaksi
          </button>
          <button className="btn ghost" type="button" onClick={onClose}>
            Tutup
          </button>
        </div>
      </section>
    </>
  );
}
