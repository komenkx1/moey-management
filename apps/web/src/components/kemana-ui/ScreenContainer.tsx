import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ScreenContainerProps {
    children: ReactNode;
    className?: string;
    withBottomNav?: boolean;
}

export default function ScreenContainer({
    children,
    className,
    withBottomNav = false,
}: ScreenContainerProps) {
    return (
        <div
            className={cn(
                "relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col bg-bg-base text-text-primary",
                // Add padding at the bottom if the screen has a bottom navigation bar (approx 80px)
                withBottomNav ? "pb-[calc(80px+env(safe-area-inset-bottom))]" : "pb-[env(safe-area-inset-bottom)]",
                className
            )}
        >
            {children}
        </div>
    );
}
