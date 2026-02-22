import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TopAppBarProps {
    title: ReactNode;
    subtitle?: ReactNode;
    actionIcon?: ReactNode;
    onActionClick?: () => void;
    className?: string;
}

export default function TopAppBar({ title, subtitle, actionIcon, onActionClick, className }: TopAppBarProps) {
    return (
        <header className={cn("sticky top-0 z-10 flex w-full items-center justify-between bg-bg-base/90 px-4 py-4 backdrop-blur-md safe-top", className)}>
            <div className="flex flex-col gap-0.5">
                <h1 className="text-[20px] font-bold leading-tight text-text-primary">{title}</h1>
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
