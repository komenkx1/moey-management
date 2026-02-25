import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

interface FabAddButtonProps {
    onClick?: () => void;
    className?: string;
    label?: string;
}

export default function FabAddButton({ onClick, className, label = "Catat" }: FabAddButtonProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "fixed bottom-[calc(84px+env(safe-area-inset-bottom))] right-6 z-40 flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-3.5 font-semibold text-white shadow-lg hover:bg-brand-pressed",
                "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
                "active:scale-95",
                // Limit right positioning on desktop
                "md:absolute md:right-6",
                className
            )}
            style={{
                boxShadow: "0px 8px 24px rgba(37, 99, 235, 0.3)"
            }}
            aria-label="Catat pengeluaran"
        >
            <Plus className="h-5 w-5" strokeWidth={3} />
            <span className="text-[14px]">{label}</span>
        </button>
    );
}
