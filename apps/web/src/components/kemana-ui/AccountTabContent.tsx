import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/store/kemana/hooks-granular";
import { Button } from "@/components/ui/button";
import { UserCircle, Shield, Cloud, LogOut, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useState } from "react";

export default function AccountTabContent() {
    const { user, isInitialized, signInWithGoogle, signOut } = useAuth();
    const { userName, setIsNamePromptOpen } = useUserProfile();
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const handleLogin = async () => {
        setIsLoggingIn(true);
        try {
            await signInWithGoogle();
        } catch (e: any) {
            toast.error(e.message || "Gagal masuk. Coba lagi.");
            setIsLoggingIn(false);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut();
            toast.success("Berhasil keluar.");
        } catch (e: any) {
            toast.error(e.message || "Gagal keluar.");
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
                        <div className="flex items-center justify-between p-3 rounded-2xl bg-brand/5 border border-brand/10">
                            <div className="flex flex-col">
                                <span className="text-[13px] font-medium text-text-primary">Sync otomatis aktif</span>
                                <span className="text-[11px] text-text-tertiary">Terhubung ke cloud</span>
                            </div>
                            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        </div>
                        {/* TODO: Add Password linking for Google accounts later in Edge Cases */}
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
                        onClick={handleLogout}
                        className="px-4 py-4 flex items-center gap-3 text-red-500 hover:bg-red-500/5 active:bg-red-500/10 transition-colors w-full text-left rounded-b-[20px]"
                    >
                        <LogOut className="h-4 w-4" />
                        <span className="text-[14px] font-medium">Keluar Akun</span>
                    </button>
                </section>
            )}
        </div>
    );
}
