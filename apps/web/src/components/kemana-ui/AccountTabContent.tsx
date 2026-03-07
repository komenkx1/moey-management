import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/use-auth-store";
import { useKemanaStore } from "@/store/use-kemana-store";
import { useUserProfile } from "@/store/kemana/hooks-granular";
import { Button } from "@/components/ui/button";
import { UserCircle, Shield, Cloud, LogOut, Database, Clock, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function AccountTabContent() {
    // Subscribe directly to auth store for reactive updates (not via useAuth hook)
    const user = useAuthStore((state) => state.user);
    const isInitialized = useAuthStore((state) => state.isInitialized);

    const entriesCount = useKemanaStore((state) => state.entries.length);
    const rulesCount = useKemanaStore((state) => state.rules.length);
    const pendingSyncCount = useKemanaStore((state) => state.pendingSyncCount);
    const lastSyncTime = useKemanaStore((state) => state.lastSyncTime);
    const syncStatus = useKemanaStore((state) => state.syncStatus);

    // Use useAuth only for action methods
    const { signInWithGoogle, flushSyncQueue, forceGlobalSync, forceSignOut } = useAuth();
    const { userName, setIsNamePromptOpen } = useUserProfile();
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isForceSyncing, setIsForceSyncing] = useState(false);
    const [showOfflineWarning, setShowOfflineWarning] = useState(false);

    const handleLogin = async () => {
        setIsLoggingIn(true);
        try {
            await signInWithGoogle();
        } catch (e: any) {
            toast.error(e.message || "Gagal masuk. Coba lagi.");
            setIsLoggingIn(false);
        }
    };

    const handleLogoutClick = async () => {
        setIsLoggingOut(true);
        try {
            // Step 1: Try to flush pending sync queue
            await flushSyncQueue();
            // If flush succeeded (online + queue empty or synced), proceed to force sign out
            await forceSignOut();
            toast.success("Berhasil keluar.");
            setIsLoggingOut(false);
        } catch (e: any) {
            if (e.message === "PENDING_OFFLINE_DATA") {
                // Step 2: User is offline with pending data — show custom modal
                setShowOfflineWarning(true);
                setIsLoggingOut(false);
            } else {
                toast.error(e.message || "Gagal keluar.");
                setIsLoggingOut(false);
            }
        } 
    };

    const handleForceSync = async () => {
        setIsForceSyncing(true);
        try {
            await forceGlobalSync();
            toast.success("Data berhasil disinkronkan.");
        } catch (e: any) {
            toast.error(e.message === "PENDING_OFFLINE_DATA" ? "Tidak ada koneksi internet." : (e.message || "Gagal menyinkronkan data."));
        } finally {
            setIsForceSyncing(false);
        }
    };

    const confirmForceLogout = async () => {
        setShowOfflineWarning(false);
        setIsLoggingOut(true);
        try {
            await forceSignOut();
            toast.success("Berhasil keluar.");
        } catch (signOutError: any) {
            toast.error(signOutError.message || "Gagal keluar.");
        } finally {
            setIsLoggingOut(false);
        }
    };

    if (!isInitialized) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-[13px] text-text-tertiary animate-pulse">
                Memuat data akun...
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 w-full max-w-md mx-auto pt-2 pb-[100px]">
            {/* Profile Section */}
            <section className="bg-bg-elevated rounded-[20px] p-5 shadow-sm border border-border-subtle/40 flex flex-col items-center gap-3">
                <div className="h-16 w-16 rounded-full bg-brand/10 text-brand flex items-center justify-center mb-1">
                    <UserCircle className="h-8 w-8" />
                </div>

                <div className="text-center">
                    <h2 className="text-lg font-semibold text-text-primary">
                        {userName || (user ? user.email?.split("@")[0] : "Tamu")}
                    </h2>
                    {user ? (
                        <p className="text-[13px] text-text-tertiary mt-0.5">{user.email}</p>
                    ) : (
                        <p className="text-[13px] text-text-tertiary mt-0.5">Offline Mode</p>
                    )}
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 rounded-full h-8 text-xs font-medium"
                    onClick={() => setIsNamePromptOpen(true)}
                >
                    Ubah Nama
                </Button>
            </section>

            {/* Sync Status Section */}
            <section className="bg-bg-elevated rounded-[20px] p-5 shadow-sm border border-border-subtle/40 flex flex-col gap-4">
                <div className="flex items-center gap-2 mb-1">
                    <div className="h-8 w-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
                        <Cloud className="h-4 w-4" />
                    </div>
                    <h3 className="font-semibold text-text-primary text-[15px]">Backup & Sync</h3>
                </div>

                {!user ? (
                    <div className="flex flex-col gap-3">
                        <p className="text-[13px] leading-relaxed text-text-secondary">
                            Data kamu saat ini hanya tersimpan di perangkat ini. Login untuk mendapatkan:
                        </p>
                        <ul className="text-[13px] text-text-tertiary space-y-1.5 list-disc list-inside mb-2">
                            <li>Backup otomatis ke cloud aman</li>
                            <li>Akses dari HP atau perangkat lain</li>
                            <li>Data aman jika aplikasi terhapus</li>
                        </ul>
                        <Button
                            onClick={handleLogin}
                            disabled={isLoggingIn}
                            className="w-full rounded-2xl h-11 bg-brand text-white hover:bg-brand/90 font-medium"
                        >
                            {isLoggingIn ? "Mengalihkan..." : "Lanjutkan dengan Google"}
                        </Button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col p-3 rounded-2xl bg-bg-base border border-border-subtle/50">
                                <div className="flex items-center gap-1.5 text-text-tertiary mb-1">
                                    <Database className="w-4 h-4" />
                                    <span className="text-[11px] font-medium uppercase tracking-wider">Total Data</span>
                                </div>
                                <span className="text-[20px] font-bold text-text-primary">{entriesCount + rulesCount}</span>
                                <span className="text-[11px] text-text-secondary mt-0.5">{entriesCount} catatan, {rulesCount} aturan</span>
                            </div>

                            <div className="flex flex-col p-3 rounded-2xl bg-bg-base border border-border-subtle/50">
                                <div className="flex items-center gap-1.5 text-text-tertiary mb-1">
                                    <Clock className="w-4 h-4" />
                                    <span className="text-[11px] font-medium uppercase tracking-wider">Terakhir Sync</span>
                                </div>
                                <span className="text-[14px] font-bold text-text-primary leading-tight mt-1">
                                    {lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Belum pernah"}
                                </span>
                                <span className="text-[11px] text-text-secondary mt-1">
                                    {pendingSyncCount > 0 ? <span className="text-amber-500 font-medium">{pendingSyncCount} offline</span> : "Semua tersimpan"}
                                </span>
                            </div>
                        </div>

                        <Button
                            variant="secondary"
                            onClick={handleForceSync}
                            disabled={isForceSyncing || syncStatus === 'syncing'}
                            className="w-full flex items-center justify-center gap-2 rounded-2xl h-11 bg-brand/10 text-brand hover:bg-brand/15 border border-brand/20 transition-all font-semibold"
                        >
                            <RefreshCw className={cn("w-4 h-4", (isForceSyncing || syncStatus === 'syncing') && "animate-spin")} />
                            {isForceSyncing || syncStatus === 'syncing' ? "Menyinkronkan..." : "Paksa Sinkronisasi"}
                        </Button>
                    </div>
                )}
            </section>

            {/* Security & Settings */}
            {user && (
                <section className="bg-bg-elevated rounded-[20px] p-2 shadow-sm border border-border-subtle/40 flex flex-col">
                    <div className="px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-border-subtle/30 text-text-secondary flex items-center justify-center">
                                <Shield className="h-4 w-4" />
                            </div>
                            <div>
                                <h4 className="text-[14px] font-medium text-text-primary">Metode Login</h4>
                                <p className="text-[12px] text-text-tertiary mt-0.5">Google OAuth</p>
                            </div>
                        </div>
                    </div>
                    <div className="h-px w-full bg-border-subtle/30" />
                    <button
                        onClick={handleLogoutClick}
                        disabled={isLoggingOut}
                        className="px-4 py-4 flex items-center gap-3 text-red-500 hover:bg-red-500/5 active:bg-red-500/10 transition-colors w-full text-left rounded-b-[20px] disabled:opacity-50"
                    >
                        <LogOut className="h-4 w-4" />
                        <span className="text-[14px] font-medium">{isLoggingOut ? "Mengeluarkan..." : "Keluar Akun"}</span>
                    </button>
                </section>
            )}

            {/* Offline Data Loss Warning Modal */}
            <AnimatePresence>
                {showOfflineWarning && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setShowOfflineWarning(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="relative w-full max-w-[320px] bg-background-elevated rounded-[24px] overflow-hidden shadow-2xl border border-border-subtle"
                        >
                            <div className="p-6">
                                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4 mx-auto">
                                    <LogOut className="h-6 w-6 text-red-500" />
                                </div>
                                <h3 className="text-lg font-semibold text-text-primary text-center mb-2">
                                    Peringatan Data Belum Tersimpan
                                </h3>
                                <p className="text-[14px] text-text-tertiary text-center leading-relaxed">
                                    Kamu sedang offline. Masih ada transaksi yang belum tersimpan ke Cloud. Jika kamu keluar sekarang, data tersebut akan <strong className="text-red-400 font-medium">hilang permanen</strong>.
                                </p>
                            </div>
                            
                            <div className="flex border-t border-border-subtle">
                                <button
                                    onClick={() => setShowOfflineWarning(false)}
                                    className="flex-1 py-4 text-[14px] font-medium text-text-secondary hover:bg-white/5 transition-colors border-r border-border-subtle"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={confirmForceLogout}
                                    disabled={isLoggingOut}
                                    className="flex-1 py-4 text-[14px] font-medium text-red-500 hover:bg-red-500/5 transition-colors"
                                >
                                    {isLoggingOut ? "Memproses..." : "Tetap Keluar"}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
