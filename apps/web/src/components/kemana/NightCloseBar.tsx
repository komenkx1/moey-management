"use client";

import { Button } from "@/components/ui/button";

interface NightCloseBarProps {
  subtitle: string;
  onReview: () => void;
  onClose: () => void;
}

export default function NightCloseBar({
  subtitle,
  onReview,
  onClose
}: NightCloseBarProps) {
  return (
    <section className="night-close-bar" aria-label="Tutup hari">
      <div className="night-close-title">Tutup hari</div>
      <div className="night-close-subtitle">{subtitle}</div>
      <div className="night-close-actions">
        <Button className="btn btn-sm" size="sm" type="button" onClick={onReview}>
          Review
        </Button>
        <Button className="btn ghost btn-sm" variant="ghost" size="sm" type="button" onClick={onClose}>
          Tutup
        </Button>
      </div>
    </section>
  );
}
