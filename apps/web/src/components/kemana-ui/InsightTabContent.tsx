import type { Ref } from "react";
import { ArrowDownRight, ArrowUpRight, CalendarDays, CircleHelp, CreditCard, Flame, PieChart } from "lucide-react";
import { formatAmountCompact, formatAmountIDR } from "@kemana/core/format";
import { cn } from "@/lib/utils";

type TrendTone = "up" | "down" | "neutral";

interface InsightTrendBadge {
  label: string;
  tone: TrendTone;
}

interface InsightWhyCard {
  key: string;
  label: string;
  value: string;
  detail: string;
  isCurrencyDetail: boolean;
}

interface InsightTopCategory {
  category: string;
  amount: number;
  percentage: number;
}

interface InsightLargestEntry {
  id: string;
  title: string;
  dateLabel: string;
  category: string;
  paymentMethod: string;
  amount: number;
}

interface InsightSummary {
  periodLabel: string;
  total: number;
  hasData: boolean;
  entryCount: number;
  windowDays: number | null;
  activeDays: number;
  topCategories: InsightTopCategory[];
  largestEntries: InsightLargestEntry[];
}

interface TrendBucket {
  label: string;
  total: number;
}

interface InsightCoachCopy {
  title: string;
  subtitle: string;
  primaryLabel: string;
  secondaryLabel: string;
}

interface InsightTabContentProps {
  insightSevenDay: InsightSummary;
  insightTrendBadge: InsightTrendBadge;
  insightAverageAmountLabel: string;
  insightWhyCards: InsightWhyCard[];
  trendTitle: string;
  trendSubtitle: string;
  isTrendChartOverflowing: boolean;
  insightTrendScrollRef: Ref<HTMLDivElement>;
  insightTrendSeriesDisplay: TrendBucket[];
  insightMaxTrendTotal: number;
  trendCompactItemWidth: string;
  insightCoachCopy: InsightCoachCopy;
  onPrimaryAction: () => void;
  onOpenNotes: () => void;
}

export default function InsightTabContent({
  insightSevenDay,
  insightTrendBadge,
  insightAverageAmountLabel,
  insightWhyCards,
  trendTitle,
  trendSubtitle,
  isTrendChartOverflowing,
  insightTrendScrollRef,
  insightTrendSeriesDisplay,
  insightMaxTrendTotal,
  trendCompactItemWidth,
  insightCoachCopy,
  onPrimaryAction,
  onOpenNotes
}: InsightTabContentProps) {
  return (
    <>
      <section className="rounded-[24px] border border-border-subtle bg-bg-elevated p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full bg-bg-subtle px-3 py-1 text-[11px] font-semibold text-text-secondary">
            {insightSevenDay.periodLabel}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
              insightTrendBadge.tone === "up"
                ? "bg-warning-soft text-warning"
                : insightTrendBadge.tone === "down"
                  ? "bg-success-soft text-success"
                  : "bg-bg-subtle text-text-secondary"
            )}
          >
            {insightTrendBadge.tone === "up" ? (
              <ArrowUpRight className="h-3.5 w-3.5" />
            ) : insightTrendBadge.tone === "down" ? (
              <ArrowDownRight className="h-3.5 w-3.5" />
            ) : (
              <PieChart className="h-3.5 w-3.5" />
            )}
            {insightTrendBadge.label}
          </span>
        </div>

        <p className="mt-4 text-[13px] font-medium text-text-secondary">Pengeluaranmu</p>
        <p className="mt-1 text-[42px] font-bold leading-none tracking-tight text-text-primary">
          -Rp{formatAmountIDR(insightSevenDay.total)}
        </p>
        <p className="mt-2 text-[12px] font-medium text-text-secondary">
          {insightSevenDay.hasData
            ? `${insightSevenDay.periodLabel} kamu mencatat ${insightSevenDay.entryCount} transaksi.`
            : `Belum ada catatan untuk dianalisis di ${insightSevenDay.periodLabel.toLowerCase()}.`}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-border-subtle bg-bg-subtle px-3 py-2">
            <p className="text-[11px] font-medium text-text-tertiary">Catatan</p>
            <p className="mt-1 text-[16px] font-bold text-text-primary">{insightSevenDay.entryCount}</p>
          </div>
          <div className="rounded-xl border border-border-subtle bg-bg-subtle px-3 py-2">
            <p className="text-[11px] font-medium text-text-tertiary">Hari aktif</p>
            <p className="mt-1 text-[16px] font-bold text-text-primary">
              {insightSevenDay.windowDays
                ? `${insightSevenDay.activeDays}/${insightSevenDay.windowDays}`
                : `${insightSevenDay.activeDays} hari`}
            </p>
          </div>
          <div className="col-span-2 rounded-xl border border-border-subtle bg-bg-subtle px-3 py-2 sm:col-span-1">
            <p className="text-[11px] font-medium text-text-tertiary">
              {insightSevenDay.windowDays ? "Rata-rata/hari" : "Rata-rata/hari aktif"}
            </p>
            <p className="mt-1 text-[15px] font-bold leading-tight text-text-primary sm:text-[16px]">
              -{insightAverageAmountLabel}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[20px] border border-border-subtle bg-bg-elevated px-4 py-3.5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-brand">
            <CircleHelp className="h-4.5 w-4.5" />
          </div>
          <h3 className="text-[16px] font-bold text-text-primary">Kenapa segitu?</h3>
        </div>

        {insightWhyCards.length ? (
          <div className="mt-3 flex flex-col gap-2.5">
            {insightWhyCards.map((item) => (
              <div
                key={item.key}
                className="flex items-start justify-between gap-3 rounded-xl border border-border-subtle bg-bg-subtle px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">{item.label}</p>
                  <p className="mt-1 text-[14px] font-semibold text-text-primary">{item.value}</p>
                </div>
                <p className="text-right text-[11px] font-medium text-text-secondary">
                  {item.isCurrencyDetail ? "-" : ""}
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-xl border border-dashed border-border-subtle bg-bg-subtle px-3 py-3 text-[12px] font-medium text-text-secondary">
            Belum cukup data untuk jelasin penyebab pengeluaranmu.
          </p>
        )}
      </section>

      <section className="rounded-[20px] border border-border-subtle bg-bg-elevated px-4 py-3.5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-brand">
            <Flame className="h-4.5 w-4.5" />
          </div>
          <h3 className="text-[16px] font-bold text-text-primary">Dari mana paling banyak keluar</h3>
        </div>

        {insightSevenDay.topCategories.length ? (
          <div className="mt-3 flex flex-col gap-2.5">
            {insightSevenDay.topCategories.map((item) => (
              <div key={item.category} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold text-text-primary">{item.category}</span>
                  <span className="text-[12px] font-medium text-text-secondary">
                    -Rp{formatAmountIDR(item.amount)} ({item.percentage}%)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-bg-subtle">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(8, item.percentage)}%` }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-xl border border-dashed border-border-subtle bg-bg-subtle px-3 py-3 text-[12px] font-medium text-text-secondary">
            Belum ada pengeluaran untuk ditampilkan.
          </p>
        )}
      </section>

      <section className="rounded-[20px] border border-border-subtle bg-bg-elevated px-4 py-3.5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-brand">
            <CalendarDays className="h-4.5 w-4.5" />
          </div>
          <h3 className="text-[16px] font-bold text-text-primary">{trendTitle}</h3>
        </div>
        <p className="mt-1 text-[12px] font-medium text-text-secondary">{trendSubtitle}</p>

        {isTrendChartOverflowing ? (
          <p className="mt-2 text-[10px] font-medium text-text-tertiary">
            Geser chart ke kanan untuk lihat data yang lebih lama.
          </p>
        ) : null}

        <div ref={insightTrendScrollRef} className="mt-4 overflow-x-auto pb-1 no-scrollbar">
          <div
            className={cn(
              "flex items-start gap-2.5",
              isTrendChartOverflowing
                ? "w-max min-w-full justify-start"
                : insightTrendSeriesDisplay.length === 1
                  ? "w-full justify-center"
                  : "w-full justify-center"
            )}
          >
            {insightTrendSeriesDisplay.map((bucket, index) => {
              const isLatest = index === 0;
              const height = insightMaxTrendTotal
                ? Math.max(16, Math.round((bucket.total / insightMaxTrendTotal) * 100))
                : 16;

              return (
                <div
                  key={`${bucket.label}-${index}`}
                  className={cn("flex shrink-0 flex-col items-center gap-2", isTrendChartOverflowing ? "w-[56px]" : "")}
                  style={isTrendChartOverflowing ? undefined : { width: trendCompactItemWidth }}
                >
                  <div className="flex h-28 w-full max-w-[56px] items-end rounded-xl bg-bg-subtle/80 px-1.5 pb-1.5">
                    <div
                      className={cn(
                        "w-full rounded-lg transition-[height]",
                        isLatest ? "bg-brand shadow-[0_4px_14px_rgba(37,99,235,0.24)]" : "bg-brand/35"
                      )}
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <span className="w-full truncate px-0.5 text-center text-[10px] font-semibold text-text-secondary">
                    {bucket.label}
                  </span>
                  <span
                    className={cn(
                      "w-full truncate text-center text-[10px] font-semibold",
                      isLatest ? "text-brand" : "text-text-tertiary"
                    )}
                  >
                    {bucket.total > 0 ? "Rp" + formatAmountCompact(bucket.total) : "Rp0"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="rounded-[20px] border border-border-subtle bg-bg-elevated px-4 py-3.5">
        <h3 className="text-[16px] font-bold text-text-primary">
          Transaksi terbesar {insightSevenDay.periodLabel.toLowerCase()}
        </h3>
        {insightSevenDay.largestEntries.length ? (
          <div className="mt-3 flex flex-col gap-2.5">
            {insightSevenDay.largestEntries.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border-subtle bg-bg-subtle px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-text-primary">{item.title}</p>
                  <p className="mt-0.5 text-[11px] font-medium text-text-secondary">
                    {item.dateLabel} • {item.category} • {item.paymentMethod}
                  </p>
                </div>
                <span className="shrink-0 text-[13px] font-bold text-text-primary">-Rp{formatAmountIDR(item.amount)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-xl border border-dashed border-border-subtle bg-bg-subtle px-3 py-3 text-[12px] font-medium text-text-secondary">
            Belum ada transaksi yang bisa dirangkum.
          </p>
        )}
      </section>

      <section className="rounded-[20px] border border-border-subtle bg-bg-elevated px-4 py-3.5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
            <CreditCard className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-[15px] font-bold leading-snug text-text-primary">{insightCoachCopy.title}</h3>
            <p className="mt-1 text-[12px] font-medium leading-relaxed text-text-secondary">{insightCoachCopy.subtitle}</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={onPrimaryAction}
            className="min-h-10 w-full rounded-lg bg-brand px-3.5 py-2 text-center text-[12px] font-semibold leading-tight text-white shadow-sm transition-colors hover:bg-brand-pressed"
          >
            {insightCoachCopy.primaryLabel}
          </button>
          <button
            type="button"
            onClick={onOpenNotes}
            className="min-h-10 w-full rounded-lg border border-border-subtle bg-bg-subtle px-3.5 py-2 text-center text-[12px] font-semibold leading-tight text-text-secondary transition-colors hover:border-brand hover:text-brand"
          >
            {insightCoachCopy.secondaryLabel}
          </button>
        </div>
      </section>
    </>
  );
}
