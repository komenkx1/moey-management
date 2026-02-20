"use client";

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
        <button className="btn btn-sm" type="button" onClick={onReview}>
          Review
        </button>
        <button className="btn ghost btn-sm" type="button" onClick={onClose}>
          Tutup
        </button>
      </div>
    </section>
  );
}
