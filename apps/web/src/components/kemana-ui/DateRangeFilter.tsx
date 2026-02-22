import { cn } from "@/lib/utils";
import {
  FILTER_OPTIONS,
  getDefaultCustomDateRange,
  normalizeCustomDateRange,
  parseDateKey,
  type CustomDateRange,
  type DateFilterPreset
} from "@/lib/kemana-utils";
import { CalendarDays } from "lucide-react";

interface DateRangeFilterProps {
  value: DateFilterPreset;
  onChange: (next: DateFilterPreset) => void;
  options?: Array<{ value: DateFilterPreset; label: string }>;
  customRange?: CustomDateRange | null;
  onCustomRangeChange?: (next: CustomDateRange) => void;
  className?: string;
}

export default function DateRangeFilter({
  value,
  onChange,
  options = FILTER_OPTIONS,
  customRange,
  onCustomRangeChange,
  className
}: DateRangeFilterProps) {
  const resolvedCustomRange = normalizeCustomDateRange(customRange, new Date());
  const fallbackCustomRange = getDefaultCustomDateRange(new Date());
  const canRenderCustomInputs = value === "custom" && Boolean(onCustomRangeChange);
  const quickPresetOptions = options.filter((option) => option.value !== "custom");
  const customOptionLabel = options.find((option) => option.value === "custom")?.label ?? "Custom";

  const formatCustomRangeLabel = (range: CustomDateRange) => {
    const startDate = parseDateKey(range.start);
    const endDate = parseDateKey(range.end);
    if (!startDate || !endDate) {
      return `${range.start} - ${range.end}`;
    }

    const formatter = new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short"
    });
    return `${formatter.format(startDate)} - ${formatter.format(endDate)}`;
  };

  return (
    <div className={cn("rounded-[16px] border border-border-subtle bg-bg-elevated p-1 shadow-sm", className)}>
      <div className="grid grid-cols-4 gap-1">
        {quickPresetOptions.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={cn(
                "h-9 shrink-0 rounded-[12px] px-4 text-[13px] font-semibold transition-colors",
                selected
                  ? "bg-text-primary text-bg-elevated shadow-sm"
                  : "bg-transparent text-text-secondary hover:bg-bg-subtle"
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {onCustomRangeChange ? (
        <button
          type="button"
          data-testid="date-filter-custom-trigger"
          aria-label="Filter rentang tanggal custom"
          aria-pressed={value === "custom"}
          onClick={() => onChange("custom")}
          className={cn(
            "mt-3 flex h-9 w-full items-center justify-between rounded-[12px] border px-3 text-[12px] font-semibold transition-colors",
            value === "custom"
              ? "border-brand bg-brand-soft/30 text-brand"
              : "border-border-subtle bg-bg-subtle text-text-secondary hover:border-brand/50 hover:text-brand"
          )}
        >
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {value === "custom"
                ? `Rentang: ${formatCustomRangeLabel(resolvedCustomRange)}`
                : `${customOptionLabel} tanggal`}
            </span>
          </span>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
              value === "custom"
                ? "bg-brand text-white"
                : "bg-bg-elevated text-text-tertiary ring-1 ring-border-subtle"
            )}
          >
            {value === "custom" ? "Aktif" : "Pilih"}
          </span>
        </button>
      ) : null}

      {canRenderCustomInputs ? (
        <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2 px-1 pb-1">
          <label className="grid gap-1">
            <span className="px-1 text-[11px] font-semibold text-text-tertiary">Mulai</span>
            <input
              type="date"
              value={resolvedCustomRange.start}
              max={resolvedCustomRange.end}
              className="h-9 rounded-[10px] border border-border-subtle bg-bg-base px-2.5 text-[12px] font-semibold text-text-primary outline-none transition-colors focus:border-brand"
              onChange={(event) => {
                const candidate = normalizeCustomDateRange(
                  {
                    start: event.target.value || fallbackCustomRange.start,
                    end: resolvedCustomRange.end
                  },
                  new Date()
                );
                onCustomRangeChange?.(candidate);
              }}
            />
          </label>

          <span className="pb-2 text-[12px] font-semibold text-text-tertiary">s/d</span>

          <label className="grid gap-1">
            <span className="px-1 text-[11px] font-semibold text-text-tertiary">Sampai</span>
            <input
              type="date"
              value={resolvedCustomRange.end}
              min={resolvedCustomRange.start}
              max={fallbackCustomRange.end}
              className="h-9 rounded-[10px] border border-border-subtle bg-bg-base px-2.5 text-[12px] font-semibold text-text-primary outline-none transition-colors focus:border-brand"
              onChange={(event) => {
                const candidate = normalizeCustomDateRange(
                  {
                    start: resolvedCustomRange.start,
                    end: event.target.value || fallbackCustomRange.end
                  },
                  new Date()
                );
                onCustomRangeChange?.(candidate);
              }}
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}
