"use client";

interface EmptyStateProps {
  hasAnyEntry: boolean;
}

export default function EmptyState({ hasAnyEntry }: EmptyStateProps) {
  return (
    <div className="empty">
      {hasAnyEntry
        ? "Tidak ada transaksi pada rentang ini."
        : "Belum ada catatan. Coba ketik pengeluaran pertama kamu."}
    </div>
  );
}
