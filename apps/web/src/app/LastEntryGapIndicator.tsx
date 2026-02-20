"use client";

import { useEffect, useMemo, useState } from "react";

interface LastEntryGapIndicatorProps {
  lastEntryAt: number | null;
}

function formatGapLabel(lastEntryAt: number, now: number): string {
  const diffMs = Math.max(0, now - lastEntryAt);
  const totalMinutes = Math.floor(diffMs / 60_000);

  if (totalMinutes < 60) {
    const minutes = Math.max(1, totalMinutes);
    return `${minutes} menit lalu`;
  }

  const totalHours = Math.floor(totalMinutes / 60);
  if (totalHours < 24) {
    return `${totalHours} jam lalu`;
  }

  const totalDays = Math.floor(totalHours / 24);
  return `${totalDays} hari lalu`;
}

export default function LastEntryGapIndicator({
  lastEntryAt
}: LastEntryGapIndicatorProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (lastEntryAt === null) {
      return;
    }

    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 60_000);

    return () => window.clearInterval(timer);
  }, [lastEntryAt]);

  const label = useMemo(() => {
    if (lastEntryAt === null) {
      return null;
    }
    return formatGapLabel(lastEntryAt, now);
  }, [lastEntryAt, now]);

  if (!label) {
    return null;
  }

  return (
    <div className="last-entry-indicator hint subtle" role="status" aria-live="polite">
      Terakhir catat: {label}
    </div>
  );
}
