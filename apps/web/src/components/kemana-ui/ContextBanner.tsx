import { cn } from "@/lib/utils";
import { Clock, Moon, ChevronRight } from "lucide-react";

export type ContextBannerVariant = "recall" | "nightClose";

interface ContextBannerProps {
    variant: ContextBannerVariant;
    title: string;
    subtitle: string;
    actionLabel: string;
    onAction?: () => void;
    className?: string;
}

export default function ContextBanner({
    variant,
    title,
    subtitle,
    actionLabel,
    onAction,
    className,
}: ContextBannerProps) {
    const isRecall = variant === "recall";

    return (
        <div
            onClick={onAction}
            role="button"
            tabIndex={0}
            className={cn(
                "group relative flex w-full items-center gap-3 rounded-2xl p-4 text-left transition-all active:scale-[0.98]",
                isRecall
                    ? "bg-warning-soft text-warning" // Warning soft for recall
                    : "bg-brand-soft text-brand", // Accent soft for night close
                className
            )}
        >
            <div
                className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white backdrop-blur-sm",
                    isRecall ? "text-warning shadow-[0_2px_8px_rgba(245,158,11,0.15)]" : "text-brand shadow-[0_2px_8px_rgba(37,99,235,0.15)]"
                )}
            >
                {isRecall ? (
                    <Clock className="h-5 w-5" strokeWidth={2.5} />
                ) : (
                    <Moon className="h-5 w-5" strokeWidth={2.5} />
                )}
            </div>

            <div className="flex flex-1 flex-col">
                <span className="text-[13px] font-bold tracking-tight text-text-primary">
                    {title}
                </span>
                <span className="mt-0.5 text-[12px] leading-snug text-text-secondary">
                    {subtitle}
                </span>
                <div
                    className={cn(
                        "mt-2 inline-flex items-center gap-1 text-[12px] font-bold",
                        isRecall ? "text-warning" : "text-brand"
                    )}
                >
                    {actionLabel}
                    <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={3} />
                </div>
            </div>
        </div>
    );
}
