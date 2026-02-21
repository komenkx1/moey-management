"use client";

import { formatAmountIDR } from "@kemana/core/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";

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
      <Separator className="section-divider" />
      <div className="split-entry-header">
        <div className="split-entry-info">
          <div className="split-entry-title">Split bill</div>
          <div className="split-entry-meta">{splitStateLabel}</div>
        </div>
        <div className="row-actions compact split-entry-actions">
          <Button
            className={`btn btn-sm ${splitOpen || hasSplit ? "secondary" : ""}`}
            variant={splitOpen || hasSplit ? "secondary" : "default"}
            size="sm"
            type="button"
            onClick={splitOpen ? onCancelSplitEditPanel : onToggleSplitOpen}
          >
            {splitToggleLabel}
          </Button>
          {hasSplit ? (
            <Button className="btn ghost btn-sm danger" variant="ghost" size="sm" type="button" onClick={onClearAppliedSplit}>
              Batalkan split
            </Button>
          ) : null}
          <Button className="btn ghost btn-sm danger" variant="ghost" size="sm" type="button" onClick={onDelete}>
            Hapus
          </Button>
        </div>
      </div>

      <Sheet
        open={splitOpen}
        onOpenChange={(open) => {
          if (!open) {
            onCancelSplitEditPanel();
          }
        }}
      >
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="split-sheet-content"
          aria-label="Atur split bill"
        >
          <SheetHeader className="split-sheet-header">
            <SheetTitle>Split bill</SheetTitle>
            <SheetDescription>{splitStateLabel}</SheetDescription>
          </SheetHeader>

          <div className="split-box split-box-sheet">
            <div className="hint">People (pisahkan koma)</div>
            <Input className="input" value={peopleInput} onChange={(event) => onPeopleInputChange(event.target.value)} />
            <div className="row-actions compact">
              <Button
                className={`btn btn-sm ${splitMode === "equal" ? "" : "secondary"}`}
                variant={splitMode === "equal" ? "default" : "secondary"}
                size="sm"
                type="button"
                onClick={onSetSplitModeEqual}
              >
                Equal
              </Button>
              <Button
                className={`btn btn-sm ${splitMode === "custom" ? "" : "secondary"}`}
                variant={splitMode === "custom" ? "default" : "secondary"}
                size="sm"
                type="button"
                onClick={onSetSplitModeCustom}
              >
                Custom
              </Button>
            </div>

            {splitMode === "custom" ? (
              <>
                <div className="inline-grid">
                  {people.map((person) => (
                    <div key={person}>
                      <div className="hint">{person}</div>
                      <Input
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

            <div className="row-actions compact split-sheet-actions">
              <Button
                className="btn secondary btn-sm"
                variant="secondary"
                size="sm"
                type="button"
                onClick={onCancelSplitEditPanel}
              >
                Batal
              </Button>
              {splitMode === "equal" ? (
                <Button className="btn btn-sm" size="sm" type="button" onClick={onApplyEqualSplit}>
                  Terapkan Equal
                </Button>
              ) : (
                <Button className="btn btn-sm" size="sm" type="button" onClick={onApplyCustomSplit}>
                  Terapkan Custom
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

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
