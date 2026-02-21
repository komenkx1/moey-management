"use client";

import { useEffect, useState } from "react";
import { formatAmountIDR } from "@kemana/core/format";
import type { NightCloseTopCategory } from "@/app/night-close";
import { Button } from "@/components/ui/button";

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
  const [isRendered, setIsRendered] = useState(open);
  const [isVisible, setIsVisible] = useState(open);

  useEffect(() => {
    const ANIMATION_MS = 220;

    if (open) {
      setIsRendered(true);
      const raf = window.requestAnimationFrame(() => {
        setIsVisible(true);
      });
      return () => window.cancelAnimationFrame(raf);
    }

    setIsVisible(false);
    const timer = window.setTimeout(() => {
      setIsRendered(false);
    }, ANIMATION_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  if (!isRendered) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className={`night-close-backdrop ${isVisible ? "open" : "closing"}`}
        aria-label="Tutup review"
        onClick={onClose}
      />
      <section
        className={`night-close-panel ${isVisible ? "open" : "closing"}`}
        role="dialog"
        aria-modal="false"
        aria-label="Review tutup hari"
      >
        <div className="night-close-panel-header">
          <div>
            <div className="night-close-panel-title">Tutup hari ini</div>
            <div className="night-close-panel-date">{dateLabel}</div>
          </div>
          <button className="night-close-close" type="button" onClick={onClose} aria-label="Tutup panel">
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
          <Button className="btn" type="button" onClick={onDone}>
            Selesai (tandai beres)
          </Button>
          <Button className="btn secondary" variant="secondary" type="button" onClick={onAddEntry}>
            Tambah transaksi
          </Button>
          <Button className="btn ghost" variant="ghost" type="button" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </section>
    </>
  );
}
