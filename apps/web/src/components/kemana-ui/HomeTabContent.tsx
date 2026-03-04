import type { MutableRefObject, RefObject } from "react";
import { PieChart, WandSparkles, Clock3 } from "lucide-react";
import { formatAmountIDR } from "@kemana/core/format";
import type { ParseQuickAddResult } from "@kemana/core/types";
import { warningShortText, type TodaySummaryStats } from "@/lib/kemana-utils";
import type {
  LatestEntryInsight,
  QuickFormatTemplate
} from "@/lib/dashboard-page-utils";
import type { SmartRecallPrompt } from "@/app/recall";
import LastEntryGapIndicator from "@/app/LastEntryGapIndicator";
import SummaryHeroCard from "@/components/kemana-ui/SummaryHeroCard";
import QuickRecallChips, { type QuickRecallItem } from "@/components/kemana-ui/QuickRecallChips";
import ContextBanner from "@/components/kemana-ui/ContextBanner";
import HomeRecentActivitySection from "@/components/kemana-ui/HomeRecentActivitySection";
import type { TransactionItem } from "@/components/kemana-ui/TransactionCard";
import { useExpandedIds } from "@/store/kemana/hooks-granular";
import { useCallback } from "react";

interface HomeTabContentProps {
  storageWarning: string | null;
  summaryStats: TodaySummaryStats;
  onOpenInsight: () => void;

  quickInputRef: RefObject<HTMLInputElement>;
  quickInput: string;
  quickInputPlaceholder: string;
  onQuickInputChange: (next: string) => void;
  onQuickInputBlur: () => void;
  onQuickInputSubmit: () => void;
  onOpenBulk: () => void;

  showQuickFormatTemplates: boolean;
  quickFormatTemplates: QuickFormatTemplate[];
  onApplyQuickFormatTemplate: (template: string) => void;

  quickHistorySuggestions: string[];
  onApplyQuickHistorySuggestion: (title: string) => void;

  smartRecallPrompt: SmartRecallPrompt | null;
  lastEntryAt: number | null;
  latestEntryInsight: LatestEntryInsight | null;
  onRecallDismiss: () => void;
  onRecallAddRecent: () => void;

  showSuggestionCard: boolean;
  topAdaptiveRecallItem: QuickRecallItem | null;
  onUseTopSuggestion: () => void;

  quickPreview: ParseQuickAddResult | null;
  quickPreviewTextParts: { title: string; subtitle?: string } | null;
  quickPreviewSubtitleBreakdown: Array<{ raw: string; label: string; qty?: number; amount?: number }> | null;
  quickPreviewSubtitleItems: string[] | null;
  summedAmountMeta: { parts: number; total: number } | null;
  showQuickWarningDetails: boolean;
  onToggleQuickWarningDetails: () => void;

  adaptiveHints: string[];
  quickError: string | null;

  adaptiveRecallItems: QuickRecallItem[];
  onSelectQuickRecallItem: (item: QuickRecallItem) => void;

  showNightCloseBar: boolean;
  nightCloseSubtitle: string;
  onOpenNightCloseReview: () => void;
  onNightCloseDismiss: () => void;

  nightCloseConfirmation: string | null;

  allTransactions: TransactionItem[];
  homeItemRefs: MutableRefObject<Map<string, HTMLDivElement | null>>;
  highlightEntryId: string | null;
  homePendingScrollId: string | null;
  inferCategoryFromText: (text: string) => string;
  onSaveTransaction: (updatedItem: TransactionItem) => void;
  onDeleteTransaction: (id: string) => void;
  onOpenNotes: () => void;
}

export default function HomeTabContent({
  storageWarning,
  summaryStats,
  onOpenInsight,
  quickInputRef,
  quickInput,
  quickInputPlaceholder,
  onQuickInputChange,
  onQuickInputBlur,
  onQuickInputSubmit,
  onOpenBulk,
  showQuickFormatTemplates,
  quickFormatTemplates,
  onApplyQuickFormatTemplate,
  quickHistorySuggestions,
  onApplyQuickHistorySuggestion,
  smartRecallPrompt,
  lastEntryAt,
  latestEntryInsight,
  onRecallDismiss,
  onRecallAddRecent,
  showSuggestionCard,
  topAdaptiveRecallItem,
  onUseTopSuggestion,
  quickPreview,
  quickPreviewTextParts,
  quickPreviewSubtitleBreakdown,
  quickPreviewSubtitleItems,
  summedAmountMeta,
  showQuickWarningDetails,
  onToggleQuickWarningDetails,
  adaptiveHints,
  quickError,
  adaptiveRecallItems,
  onSelectQuickRecallItem,
  showNightCloseBar,
  nightCloseSubtitle,
  onOpenNightCloseReview,
  onNightCloseDismiss,
  nightCloseConfirmation,
  allTransactions,
  homeItemRefs,
  highlightEntryId,
  homePendingScrollId,
  inferCategoryFromText,
  onSaveTransaction,
  onDeleteTransaction,
  onOpenNotes
}: HomeTabContentProps) {
  const { expandedIds, setExpandedIds } = useExpandedIds();

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, [setExpandedIds]);

  return (
    <main className="flex flex-col gap-5 px-4 py-2 pb-[calc(164px+env(safe-area-inset-bottom))]">
      {storageWarning ? (
        <div className="rounded-xl border border-danger/20 bg-danger-soft/60 px-3 py-2 text-[12px] font-medium text-danger">
          {storageWarning}
        </div>
      ) : null}

      <SummaryHeroCard
        expense={summaryStats.totalAmount}
        transactionCount={summaryStats.entryCount}
        averagePerDay={summaryStats.sevenDayAverage}
        periodLabel={summaryStats.periodLabel}
      >
        <div className="relative overflow-hidden rounded-[20px] border border-insight-border bg-insight-bg p-4">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/20 blur-2xl" />

          <div className="relative z-10 flex items-center justify-between">
            <span className="text-[12px] font-semibold uppercase tracking-widest text-insight-header">Insight hari ini</span>
            <button
              onClick={onOpenInsight}
              className="flex items-center gap-1 text-[12px] font-semibold text-brand transition-opacity hover:opacity-80"
            >
              Detail
              <PieChart className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="relative z-10 mt-2 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-insight-icon-bg shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <span className="text-[20px]">📌</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[16px] font-bold leading-tight text-insight-title">{summaryStats.status.label}</span>
              <span className="text-[13px] font-medium leading-snug text-insight-subtitle">{summaryStats.compareText}</span>
            </div>
          </div>

          <div className="relative z-10 mt-3 flex items-center justify-between border-t border-insight-border pt-3">
            <span className="text-[12px] font-medium text-insight-subtitle">Kategori terbesar:</span>
            <div className="flex items-center gap-1.5 rounded-full border border-insight-chip-text/10 bg-insight-chip-bg px-3 py-1">
              <span className="text-[12px] font-bold text-insight-chip-text">
                {summaryStats.topCategory
                  ? `${summaryStats.topCategory.category} (${Math.max(
                    1,
                    Math.round((summaryStats.topCategory.totalAmount / Math.max(1, summaryStats.totalAmount)) * 100)
                  )}%)`
                  : "Belum ada"}
              </span>
            </div>
          </div>
        </div>
      </SummaryHeroCard>

      <div className="overflow-hidden rounded-[20px] bg-bg-card p-1.5 shadow-sm ring-1 ring-border-subtle transition-shadow focus-within:ring-2 focus-within:ring-brand/50">
        <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-1 sm:gap-2">
          <input
            ref={quickInputRef}
            type="text"
            value={quickInput}
            placeholder={quickInputPlaceholder}
            className="min-w-0 w-full flex-1 bg-transparent px-2.5 py-2.5 text-[15px] font-medium outline-none placeholder:text-[14px] placeholder:text-text-secondary/70 sm:px-3 sm:placeholder:text-[15px]"
            onChange={(event) => onQuickInputChange(event.target.value)}
            onBlur={onQuickInputBlur}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onQuickInputSubmit();
              }
            }}
          />
          <button
            className="h-10 min-w-[62px] shrink-0 rounded-[12px] bg-brand/10 px-2.5 text-[12px] font-semibold text-brand transition-all hover:bg-brand hover:text-white active:scale-95 sm:h-11 sm:min-w-[80px] sm:rounded-[14px] sm:px-4 sm:text-[13px]"
            onClick={onQuickInputSubmit}
          >
            Catat
          </button>
          <button
            type="button"
            aria-label="Catat banyak"
            className="h-10 min-w-[68px] shrink-0 rounded-[12px] border border-border-subtle bg-bg-elevated px-2.5 text-[12px] font-semibold text-text-secondary transition-colors hover:border-brand hover:text-brand active:scale-95 sm:h-11 sm:min-w-[88px] sm:rounded-[14px] sm:px-3 sm:text-[13px]"
            onClick={onOpenBulk}
          >
            Banyak
          </button>
        </div>
      </div>

      {showQuickFormatTemplates ? (
        <section className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">Format cepat</span>
            <span className="text-[11px] font-medium text-text-tertiary">Geser, lalu tap untuk pakai</span>
          </div>
          <div className="relative -mx-4">
            <div className="flex gap-2 overflow-x-auto pl-4 pr-0 pb-1 scrollbar-hide">
              {quickFormatTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => onApplyQuickFormatTemplate(template.sample)}
                  className="shrink-0 rounded-full border border-border-subtle bg-bg-elevated px-3 py-1.5 text-[12px] font-semibold text-text-secondary transition-colors hover:border-brand hover:text-brand"
                  aria-label={`${template.description}: ${template.sample}`}
                >
                  {template.sample}
                </button>
              ))}
            </div>
            <div
              className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-bg-base via-bg-base/70 to-transparent"
              aria-hidden
            />
          </div>
        </section>
      ) : null}

      {quickHistorySuggestions.length ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">Saran cepat</span>
          {quickHistorySuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onApplyQuickHistorySuggestion(suggestion)}
              className="rounded-full border border-border-subtle bg-bg-elevated px-3 py-1.5 text-[12px] font-medium text-text-secondary transition-colors hover:border-brand hover:text-brand"
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}

      {smartRecallPrompt ? (
        <section className="rounded-2xl border border-border-subtle bg-bg-elevated px-3.5 py-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
              <Clock3 className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <LastEntryGapIndicator lastEntryAt={lastEntryAt} />
              <p className="mt-1 text-[14px] font-semibold leading-snug text-text-primary">{smartRecallPrompt.title}</p>
              <p className="mt-0.5 text-[12px] font-medium text-text-secondary">
                {smartRecallPrompt.subtitle ??
                  (latestEntryInsight
                    ? `Terakhir: ${latestEntryInsight.title} • -Rp${formatAmountIDR(latestEntryInsight.amount)}`
                    : "Coba catat lagi supaya saran makin akurat.")}
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onRecallDismiss}
              className="rounded-lg border border-border-subtle bg-bg-base px-3 py-1.5 text-[12px] font-semibold text-text-secondary transition-colors hover:border-text-secondary hover:text-text-primary"
            >
              Nanti
            </button>
            <button
              type="button"
              onClick={onRecallAddRecent}
              className="rounded-lg bg-brand px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-pressed"
            >
              Tambah lagi
            </button>
          </div>
        </section>
      ) : null}

      {showSuggestionCard && topAdaptiveRecallItem ? (
        <section className="rounded-2xl border border-border-subtle bg-bg-elevated px-3.5 py-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
              <WandSparkles className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Saran</p>
              <p className="mt-1 text-[14px] font-semibold leading-snug text-text-primary">
                {topAdaptiveRecallItem.title} sekitar -Rp{formatAmountIDR(topAdaptiveRecallItem.amount)}.
              </p>
            </div>
            <button
              type="button"
              onClick={onUseTopSuggestion}
              className="shrink-0 rounded-full border border-border-subtle bg-bg-base px-3 py-1.5 text-[12px] font-semibold text-text-secondary transition-colors hover:border-brand hover:text-brand"
            >
              Pakai
            </button>
          </div>
        </section>
      ) : null}

      {quickPreview?.ok ? (
        <div className="rounded-xl border border-border-subtle bg-bg-elevated px-3 py-2.5">
          <div className="text-[13px] font-semibold text-text-primary">
            {quickPreviewTextParts?.title ?? quickPreview.value.text} • Rp{formatAmountIDR(quickPreview.value.amount)}
          </div>
          <div className="mt-0.5 text-[12px] font-medium text-text-secondary">
            {quickPreview.value.date}
            {quickPreview.value.splitCount ? ` • ${quickPreview.value.splitCount} orang` : ""}
            {summedAmountMeta ? ` • total ${summedAmountMeta.parts} item` : ""}
          </div>
          {quickPreviewTextParts?.subtitle ? (
            <div className="mt-1 text-[12px] font-medium text-text-secondary">{quickPreviewTextParts.subtitle}</div>
          ) : null}
          {quickPreviewSubtitleBreakdown?.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {quickPreviewSubtitleBreakdown.slice(0, 5).map((item, index) => (
                <span
                  key={`${item.raw}-${index}`}
                  className="rounded-full border border-border-subtle bg-bg-base px-2.5 py-1 text-[11px] font-medium text-text-secondary"
                >
                  {item.label}
                  {item.qty ? ` ×${item.qty}` : ""}
                  {item.amount !== undefined ? ` • Rp${formatAmountIDR(item.amount)}` : ""}
                </span>
              ))}
              {quickPreviewSubtitleBreakdown.length > 5 ? (
                <span className="rounded-full border border-border-subtle bg-bg-base px-2.5 py-1 text-[11px] font-medium text-text-tertiary">
                  +{quickPreviewSubtitleBreakdown.length - 5} item
                </span>
              ) : null}
            </div>
          ) : quickPreviewSubtitleItems?.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {quickPreviewSubtitleItems.slice(0, 4).map((item, index) => (
                <span
                  key={`${item}-${index}`}
                  className="rounded-full border border-border-subtle bg-bg-base px-2.5 py-1 text-[11px] font-medium text-text-secondary"
                >
                  {item}
                </span>
              ))}
            </div>
          ) : null}
          {quickPreview.warnings?.length ? (
            <>
              <button
                type="button"
                onClick={onToggleQuickWarningDetails}
                className="mt-2 text-[12px] font-semibold text-brand"
              >
                {showQuickWarningDetails ? "Sembunyikan" : "Lihat"} peringatan parser
              </button>
              {showQuickWarningDetails ? (
                <ul className="mt-1 list-disc pl-4 text-[12px] font-medium text-text-secondary">
                  {quickPreview.warnings.map((warning, index) => (
                    <li key={`${warning.code}-${index}`}>{warningShortText(warning)}</li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}

      {adaptiveHints.length && !showQuickFormatTemplates ? (
        <div className="rounded-xl border border-border-subtle bg-bg-elevated px-3 py-2 text-[12px] font-medium text-text-secondary">
          {adaptiveHints[0]}
        </div>
      ) : null}

      {quickError ? (
        <div className="rounded-xl border border-danger/20 bg-danger-soft/60 px-3 py-2 text-[12px] font-medium text-danger">
          {quickError}
        </div>
      ) : null}

      <QuickRecallChips
        items={
          adaptiveRecallItems.length
            ? adaptiveRecallItems
            : [
              { id: "r1", category: "Makan", title: "Nasi padang", amount: 25_000 },
              { id: "r2", category: "Transport", title: "Gojek kantor", amount: 14_000 }
            ]
        }
        onSelect={onSelectQuickRecallItem}
      />

      {showNightCloseBar ? (
        <ContextBanner
          variant="nightClose"
          title="Tutup hari ini"
          subtitle={nightCloseSubtitle}
          actionLabel="Review sekarang"
          secondaryActionLabel="Tutup"
          className="dark:border dark:border-brand/20 dark:bg-brand-soft/20"
          onAction={onOpenNightCloseReview}
          onSecondaryAction={onNightCloseDismiss}
        />
      ) : null}

      {nightCloseConfirmation ? (
        <div className="rounded-xl border border-success/20 bg-success-soft px-3 py-2 text-[12px] font-semibold text-success">
          {nightCloseConfirmation}
        </div>
      ) : null}

      <HomeRecentActivitySection
        allTransactions={allTransactions}
        homeItemRefs={homeItemRefs}
        highlightEntryId={highlightEntryId}
        homePendingScrollId={homePendingScrollId}
        expandedIds={expandedIds}
        onToggleExpand={handleToggleExpand}
        inferCategoryFromText={inferCategoryFromText}
        onSaveTransaction={onSaveTransaction}
        onDeleteTransaction={onDeleteTransaction}
        onOpenNotes={onOpenNotes}
      />

      <div className="h-2" aria-hidden />
    </main>
  );
}
