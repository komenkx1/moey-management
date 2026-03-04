import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ScreenContainerProps {
    children: ReactNode;
    className?: string;
    withBottomNav?: boolean;
    withFab?: boolean;
}

export default function ScreenContainer({
    children,
    className,
    withBottomNav: _withBottomNav = false,
    withFab: _withFab = false,
}: ScreenContainerProps) {
    return (
        <div
            className={cn(
                "relative mx-auto flex h-[100dvh] min-h-[100dvh] w-full max-w-md flex-col overflow-hidden bg-bg-base text-text-primary",
                className
            )}
        >
            {children}
        </div>
    );
}
