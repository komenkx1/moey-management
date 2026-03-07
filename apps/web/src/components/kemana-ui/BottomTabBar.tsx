import { ReactNode, startTransition } from "react";
import { cn } from "@/lib/utils";
import { Home, FileText, PieChart, User } from "lucide-react";
import { useActiveTab } from "@/store/kemana/hooks-granular";

interface TabItem {
    id: string;
    label: string;
    icon: ReactNode;
}

const TABS: TabItem[] = [
    { id: "home", label: "Beranda", icon: <Home className="h-6 w-6" /> },
    { id: "notes", label: "Catatan", icon: <FileText className="h-6 w-6" /> },
    { id: "insight", label: "Insight", icon: <PieChart className="h-6 w-6" /> },
    { id: "account", label: "Akun", icon: <User className="h-6 w-6" /> },
];

interface BottomTabBarProps {
    className?: string;
}

export default function BottomTabBar({ className }: BottomTabBarProps) {
    const { activeTab, setActiveTab } = useActiveTab();
    return (
        <nav
            className={cn(
                "fixed bottom-0 left-1/2 z-30 flex h-[calc(64px+env(safe-area-inset-bottom))] w-full max-w-md -translate-x-1/2 items-center justify-around border-t border-border-subtle bg-bg-elevated pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_24px_rgba(0,0,0,0.04)]",
                "transition-colors duration-300",
                className
            )}
        >
            {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                    <button
                        key={tab.id}
                        onClick={() => {
                            if (!isActive) {
                                startTransition(() => {
                                    setActiveTab(tab.id);
                                });
                            }
                        }}
                        className="group relative flex flex-1 flex-col items-center justify-center gap-1 h-full active:scale-95 transition-transform"
                    >
                        {/* Active Indicator Top Bar */}
                        {isActive && (
                            <div className="absolute top-0 h-[3px] w-12 rounded-b-full bg-brand" />
                        )}

                        <div className={cn("transition-colors", isActive ? "text-brand" : "text-text-tertiary")}>
                            {tab.icon}
                        </div>
                        <span
                            className={cn(
                                "text-[10px] sm:text-[11px] font-medium transition-colors",
                                isActive ? "text-brand" : "text-text-tertiary"
                            )}
                        >
                            {tab.label}
                        </span>
                    </button>
                );
            })}
        </nav>
    );
}
