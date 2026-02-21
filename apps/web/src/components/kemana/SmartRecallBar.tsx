"use client";

import type { SmartRecallPrompt } from "@/app/recall";
import { Button } from "@/components/ui/button";

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
        <Button className="btn secondary btn-sm" variant="secondary" size="sm" type="button" onClick={onAddRecent}>
          Tambah yang barusan
        </Button>
        <Button className="btn ghost btn-sm" variant="ghost" size="sm" type="button" onClick={onDismiss}>
          Engga ada
        </Button>
      </div>
    </div>
  );
}
