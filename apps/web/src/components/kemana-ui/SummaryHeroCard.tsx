import { cn } from "@/lib/utils";
import { formatAmountIDR } from "@kemana/core/format";

interface SummaryHeroCardProps {
    expense: number;
    transactionCount: number;
    averagePerDay: number;
    periodLabel?: string;
    className?: string;
    children?: React.ReactNode;
}

export default function SummaryHeroCard({
    expense,
    transactionCount,
    averagePerDay,
    periodLabel = "Bulan ini",
    className,
    children,
}: SummaryHeroCardProps) {
    const roundedAveragePerDay = Math.max(0, Math.round(averagePerDay || 0));

    return (
        <div
            className={cn(
                "relative flex w-full flex-col gap-5 rounded-[24px] bg-bg-elevated p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] ring-1 ring-border-subtle",
                className
            )}
        >
            <div className="flex flex-col gap-1.5">
                <span className="w-fit rounded-full bg-bg-subtle px-3 py-1 text-[11px] font-semibold tracking-wide text-text-secondary">
                    {periodLabel}
                </span>
                <div className="mt-1 flex flex-col gap-0">
                    <h2 className="text-[14px] font-medium text-text-secondary">Pengeluaran</h2>
                    <div className="text-[32px] font-bold tracking-tight text-text-primary">
                        Rp{formatAmountIDR(expense)}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-border-subtle/60 pt-4">
                <div className="flex flex-col gap-0.5">
                    <span className="text-[12px] font-medium text-text-tertiary">Total catatan</span>
                    <span className="text-[14px] font-semibold text-text-primary">{transactionCount} catatan</span>
                </div>
                <div className="flex flex-col gap-0.5">
                    <span className="text-[12px] font-medium text-text-tertiary">Rata-rata harian</span>
                    <span className="text-[14px] font-semibold text-text-primary">
                        Rp{formatAmountIDR(roundedAveragePerDay)}/hari
                    </span>
                </div>
            </div>

            {children && (
                <div className="flex flex-col gap-3">
                    {children}
                </div>
            )}
        </div>
    );
}
