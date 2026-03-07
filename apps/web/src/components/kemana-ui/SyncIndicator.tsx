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
            <AnimatePresence mode="wait">
                {displayStatus === 'synced' && (
                    <motion.div
                        key="synced"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center gap-1.5 text-brand"
                        title="Tersinkronisasi"
                    >
                        <CheckCircle2 className="w-4 h-4" />
                        {showText && <span className="text-[11px] font-medium">Tersimpan</span>}
                    </motion.div>
                )}

                {displayStatus === 'syncing' && (
                    <motion.div
                        key="syncing"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center gap-1.5 text-text-tertiary"
                        title="Sedang Menyinkronkan..."
                    >
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, ease: "linear", duration: 1.5 }}
                        >
                            <RefreshCw className="w-4 h-4" />
                        </motion.div>
                        {showText && <span className="text-[11px] font-medium">Menyinkronkan... {pendingCount > 0 && `(${pendingCount})`}</span>}
                    </motion.div>
                )}

                {displayStatus === 'offline' && (
                    <motion.div
                        key="offline"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center gap-1.5 text-text-tertiary"
                        title="Sedang Offline (Menunggu Jaringan)"
                    >
                        <CloudOff className="w-4 h-4" />
                        {showText && <span className="text-[11px] font-medium">Offline {pendingCount > 0 && `(${pendingCount} tunda)`}</span>}
                    </motion.div>
                )}

                {displayStatus === 'failed' && (
                    <motion.div
                        key="failed"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center gap-1.5 text-semantic-danger"
                        title="Gagal Sinkronisasi"
                    >
                        <AlertCircle className="w-4 h-4" />
                        {showText && <span className="text-[11px] font-medium">Gagal {pendingCount > 0 && `(${pendingCount})`}</span>}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
