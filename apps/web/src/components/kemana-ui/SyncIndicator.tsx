import { useKemanaStore } from "@/store/use-kemana-store";
import { CheckCircle2, CloudOff, AlertCircle, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { SyncStatus } from "@/store/kemana/types";

interface SyncIndicatorProps {
    className?: string;
    showText?: boolean;
}

export default function SyncIndicator({ className, showText = false }: SyncIndicatorProps) {
    const syncStatus = useKemanaStore((state) => state.syncStatus);
    const pendingCount = useKemanaStore((state) => state.pendingSyncCount);
    
    // Fall back to offline if status is strictly 'offline', but let idle show as synced if no pending.
    const displayStatus: SyncStatus = syncStatus === 'idle' 
        ? (pendingCount > 0 ? 'syncing' : 'synced') 
        : syncStatus;

    return (
        <div className={cn("flex items-center gap-1.5", className)}>
            {displayStatus === 'synced' && (
                <div className="flex items-center gap-1.5 text-brand" title="Tersinkronisasi">
                    <CheckCircle2 className="w-4 h-4" />
                    {showText && <span className="text-[11px] font-medium">Tersimpan</span>}
                </div>
            )}

            {displayStatus === 'syncing' && (
                <div className="flex items-center gap-1.5 text-text-tertiary" title="Sedang Menyinkronkan...">
                    <RefreshCw className="w-4 h-4 animate-spin transform-gpu" style={{ willChange: 'transform' }} />
                    {showText && <span className="text-[11px] font-medium">Menyinkronkan... {pendingCount > 0 && `(${pendingCount})`}</span>}
                </div>
            )}

            {displayStatus === 'offline' && (
                <div className="flex items-center gap-1.5 text-text-tertiary" title="Sedang Offline (Menunggu Jaringan)">
                    <CloudOff className="w-4 h-4" />
                    {showText && <span className="text-[11px] font-medium">Offline {pendingCount > 0 && `(${pendingCount} tunda)`}</span>}
                </div>
            )}

            {displayStatus === 'failed' && (
                <div className="flex items-center gap-1.5 text-semantic-danger" title="Gagal Sinkronisasi">
                    <AlertCircle className="w-4 h-4" />
                    {showText && <span className="text-[11px] font-medium">Gagal {pendingCount > 0 && `(${pendingCount})`}</span>}
                </div>
            )}
        </div>
    );
}
