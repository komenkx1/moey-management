import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TopAppBarProps {
    title: ReactNode;
    subtitle?: ReactNode;
    actionIcon?: ReactNode;
    onActionClick?: () => void;
    className?: string;
    showVersion?: boolean;
    indicator?: ReactNode;
}

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "dev";

export default function TopAppBar({
    title,
    subtitle,
    actionIcon,
    onActionClick,
    className,
    showVersion = true,
    indicator
}: TopAppBarProps) {
    return (
        <header
            className={cn(
                "sticky top-0 z-40 flex w-full items-center justify-between border-b border-border-subtle/70 px-4 pb-4 pt-[calc(1rem+var(--safe-header-offset))]",
                "bg-bg-base transition-colors duration-300",
                className
            )}
        >
            <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                    <h1 className="text-[20px] font-bold leading-tight text-text-primary">{title}</h1>
                    {showVersion ? (
                        <span
                            className="inline-flex items-center rounded-full border border-border-subtle bg-bg-elevated px-2 py-0.5 text-[10px] font-semibold tracking-wide text-text-tertiary"
                            aria-label={`Versi aplikasi v${APP_VERSION}`}
                            title={`Versi aplikasi v${APP_VERSION}`}
                        >
                            v{APP_VERSION}
                        </span>
                    ) : null}
                    {indicator && (
                        <div className="ml-1 pl-2 border-l border-border-subtle/50">
                            {indicator}
                        </div>
                    )}
                </div>
                {subtitle && <p className="text-[14px] font-medium text-text-secondary">{subtitle}</p>}
            </div>
            {actionIcon && (
                <button
                    onClick={onActionClick}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-bg-elevated text-text-primary shadow-sm hover:bg-bg-subtle active:scale-95 transition-transform"
                    aria-label="Action"
                >
                    {actionIcon}
                </button>
            )}
        </header>
    );
}
