"use client";

import { formatAmountIDR } from "@kemana/core/format";
import type { Entry, PaymentMethod } from "@kemana/core/types";
import { formatItemPillText, paymentMethodLabel, type ItemLine } from "@/lib/kemana-utils";

interface EntryRowCollapsedProps {
  entry: Entry;
  isExpanded: boolean;
  expandedPanelId: string;
  onToggleExpand: () => void;
  displayText: { title: string; subtitle?: string };
  subtitleBreakdown: ItemLine[] | null;
  subtitleItems: string[] | null;
  currentPaymentMethod: PaymentMethod;
  hasSelectedPaymentMethod: boolean;
  splitCount: number | null;
  warningCount: number;
}

export default function EntryRowCollapsed({
  entry,
  isExpanded,
  expandedPanelId,
  onToggleExpand,
  displayText,
  subtitleBreakdown,
  subtitleItems,
  currentPaymentMethod,
  hasSelectedPaymentMethod,
  splitCount,
  warningCount
}: EntryRowCollapsedProps) {
  return (
    <button
      className="row-hit"
      type="button"
      onClick={onToggleExpand}
      aria-expanded={isExpanded}
      aria-controls={expandedPanelId}
    >
      <div className="row-top">
        <div>
          <div className="row-text">{displayText.title}</div>
          {displayText.subtitle ? (
            subtitleBreakdown ? (
              <div className="subtitle-items">
                {subtitleBreakdown.slice(0, 3).map((item, index) => (
                  <span key={`${item.raw}-${index}`} className="item-pill">
                    {formatItemPillText(item)}
                  </span>
                ))}
                {subtitleBreakdown.length > 3 ? (
                  <span className="item-pill more">+{subtitleBreakdown.length - 3}</span>
                ) : null}
              </div>
            ) : subtitleItems ? (
              <div className="subtitle-items">
                {subtitleItems.slice(0, 3).map((item, index) => (
                  <span key={`${item}-${index}`} className="item-pill">
                    {item}
                  </span>
                ))}
                {subtitleItems.length > 3 ? <span className="item-pill more">+{subtitleItems.length - 3}</span> : null}
              </div>
            ) : (
              <div className="row-subtext">{displayText.subtitle}</div>
            )
          ) : null}
          <div className="row-meta">
            {entry.date} • {entry.category}
            {hasSelectedPaymentMethod ? ` • ${paymentMethodLabel(currentPaymentMethod)}` : ""}
            {splitCount && splitCount > 1 ? ` • Split ${splitCount}p` : ""}
            {warningCount ? ` • !${warningCount}` : ""}
          </div>
        </div>
        <div className="row-amount">Rp{formatAmountIDR(entry.amount)}</div>
      </div>
    </button>
  );
}
