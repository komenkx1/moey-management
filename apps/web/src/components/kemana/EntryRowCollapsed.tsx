"use client";

import { memo, useMemo } from "react";
import { formatAmountIDR } from "@kemana/core/format";
import type { Entry, PaymentMethod } from "@kemana/core/types";
import {
  formatItemPillText,
  parseItemBreakdownFromSubtitle,
  paymentMethodLabel,
  splitDisplayText,
  splitSubtitleItems
} from "@/lib/kemana-utils";

interface EntryRowCollapsedProps {
  entry: Entry;
  isExpanded: boolean;
  expandedPanelId: string;
  onToggleExpand: (entryId: string) => void;
}

function EntryRowCollapsed({
  entry,
  isExpanded,
  expandedPanelId,
  onToggleExpand
}: EntryRowCollapsedProps) {
  const displayText = useMemo(() => splitDisplayText(entry.text), [entry.text]);
  const subtitleBreakdown = useMemo(
    () => (displayText.subtitle ? parseItemBreakdownFromSubtitle(displayText.subtitle) : null),
    [displayText.subtitle]
  );
  const subtitleItems = useMemo(
    () => (displayText.subtitle ? splitSubtitleItems(displayText.subtitle) : null),
    [displayText.subtitle]
  );
  const currentPaymentMethod: PaymentMethod = entry.paymentMethod ?? "Unknown";
  const hasSelectedPaymentMethod = currentPaymentMethod !== "Unknown";
  const splitCount = entry.split?.shares?.length ?? null;
  const warningCount = entry.parseWarnings?.length ?? 0;

  return (
    <button
      className="row-hit"
      type="button"
      onClick={() => onToggleExpand(entry.id)}
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

function areEntryRowCollapsedPropsEqual(
  previousProps: EntryRowCollapsedProps,
  nextProps: EntryRowCollapsedProps
): boolean {
  return (
    previousProps.entry === nextProps.entry &&
    previousProps.isExpanded === nextProps.isExpanded &&
    previousProps.expandedPanelId === nextProps.expandedPanelId &&
    previousProps.onToggleExpand === nextProps.onToggleExpand
  );
}

export default memo(EntryRowCollapsed, areEntryRowCollapsedPropsEqual);
