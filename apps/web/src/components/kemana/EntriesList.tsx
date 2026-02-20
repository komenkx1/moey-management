"use client";

import type { Category, Entry } from "@kemana/core/types";
import { formatAmountIDR } from "@kemana/core/format";
import { formatDayLabel } from "@/lib/kemana-utils";
import EmptyState from "./EmptyState";
import EntryRowExpanded from "./EntryRowExpanded";

interface EntriesListProps {
  filteredEntries: Entry[];
  entriesCount: number;
  orderedDates: string[];
  groupedEntries: Record<string, Entry[]>;
  dailyTotal: Record<string, number>;
  highlightEntryId: string | null;
  autoExpandedEntryId: string | null;
  onAutoExpandHandled: (entryId: string) => void;
  onDelete: (entryId: string) => void;
  onUpdate: (entryId: string, updater: (entry: Entry) => Entry, toastMessage?: string) => void;
  onDateChanged: (entryId: string, nextDateISO: string) => void;
  onCategoryChange: (entry: Entry, category: Category) => void;
}

export default function EntriesList({
  filteredEntries,
  entriesCount,
  orderedDates,
  groupedEntries,
  dailyTotal,
  highlightEntryId,
  autoExpandedEntryId,
  onAutoExpandHandled,
  onDelete,
  onUpdate,
  onDateChanged,
  onCategoryChange
}: EntriesListProps) {
  return (
    <section className="list">
      {filteredEntries.length === 0 ? (
        <EmptyState hasAnyEntry={entriesCount > 0} />
      ) : (
        orderedDates.map((dateISO) => (
          <section key={dateISO} className="day-group" aria-label={`Grup ${dateISO}`}>
            <div className="day-header">
              <h2 className="day-title">{formatDayLabel(dateISO)}</h2>
              <div className="day-total">Rp{formatAmountIDR(dailyTotal[dateISO] ?? 0)}</div>
            </div>
            <div className="day-list">
              {(groupedEntries[dateISO] ?? []).map((entry) => (
                <EntryRowExpanded
                  key={entry.id}
                  entry={entry}
                  isHighlighted={highlightEntryId === entry.id}
                  shouldAutoExpand={autoExpandedEntryId === entry.id}
                  onAutoExpandHandled={() => onAutoExpandHandled(entry.id)}
                  onDelete={() => onDelete(entry.id)}
                  onUpdate={(updater, toastMessage) => onUpdate(entry.id, updater, toastMessage)}
                  onDateChanged={onDateChanged}
                  onCategoryChange={(category) => onCategoryChange(entry, category)}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </section>
  );
}
