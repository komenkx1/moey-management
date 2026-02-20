"use client";

import { useCallback, useEffect, useState } from "react";
import type { Category, Entry } from "@kemana/core/types";
import { formatAmountIDR } from "@kemana/core/format";
import { formatDayLabel } from "@/lib/kemana-utils";
import EmptyState from "./EmptyState";
import EntryRowCollapsed from "./EntryRowCollapsed";
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
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!autoExpandedEntryId) {
      return;
    }
    setExpandedId(autoExpandedEntryId);
    onAutoExpandHandled(autoExpandedEntryId);
  }, [autoExpandedEntryId, onAutoExpandHandled]);

  useEffect(() => {
    if (!expandedId) {
      return;
    }

    const stillVisible = filteredEntries.some((entry) => entry.id === expandedId);
    if (!stillVisible) {
      setExpandedId(null);
    }
  }, [expandedId, filteredEntries]);

  const toggleExpand = useCallback((entryId: string) => {
    setExpandedId((current) => (current === entryId ? null : entryId));
  }, []);

  const handleDelete = useCallback(
    (entryId: string) => {
      setExpandedId((current) => (current === entryId ? null : current));
      onDelete(entryId);
    },
    [onDelete]
  );

  const handleUpdate = useCallback(
    (entryId: string, updater: (entry: Entry) => Entry, toastMessage?: string) => {
      onUpdate(entryId, updater, toastMessage);
    },
    [onUpdate]
  );

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
              {(groupedEntries[dateISO] ?? []).map((entry) => {
                const isExpanded = expandedId === entry.id;
                const expandedPanelId = `row-expanded-${entry.id}`;

                return (
                  <article
                    key={entry.id}
                    id={`entry-${entry.id}`}
                    data-entry-id={entry.id}
                    className={`row ${isExpanded ? "expanded" : ""} ${highlightEntryId === entry.id ? "highlight" : ""}`}
                  >
                    {isExpanded ? (
                      <EntryRowExpanded
                        entry={entry}
                        expandedPanelId={expandedPanelId}
                        onToggleExpand={toggleExpand}
                        onDelete={handleDelete}
                        onUpdate={handleUpdate}
                        onDateChanged={onDateChanged}
                        onCategoryChange={onCategoryChange}
                      />
                    ) : (
                      <EntryRowCollapsed
                        entry={entry}
                        isExpanded={false}
                        expandedPanelId={expandedPanelId}
                        onToggleExpand={toggleExpand}
                      />
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        ))
      )}
    </section>
  );
}
