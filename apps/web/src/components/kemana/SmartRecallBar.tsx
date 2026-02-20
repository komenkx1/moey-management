"use client";

import type { SmartRecallPrompt } from "@/app/recall";

interface SmartRecallBarProps {
  prompt: SmartRecallPrompt;
  onAddRecent: () => void;
  onDismiss: () => void;
}

export default function SmartRecallBar({
  prompt,
  onAddRecent,
  onDismiss
}: SmartRecallBarProps) {
  return (
    <div className="smart-recall" role="status" aria-live="polite">
      <div className="smart-recall-text">
        <div>{prompt.title}</div>
        {prompt.subtitle ? <div className="hint subtle">{prompt.subtitle}</div> : null}
      </div>
      <div className="smart-recall-actions">
        <button className="btn secondary btn-sm" type="button" onClick={onAddRecent}>
          Tambah yang barusan
        </button>
        <button className="btn ghost btn-sm" type="button" onClick={onDismiss}>
          Engga ada
        </button>
      </div>
    </div>
  );
}
