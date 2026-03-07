"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/use-auth-store";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
    const router = useRouter();
    const [status, setStatus] = useState("Menunggu otentikasi...");

    useEffect(() => {
        // onAuthStateChange or getSession is usually enough for implicit flow on SPA
        supabase.auth.getSession().then(({ data, error }) => {
            if (error) {
                setStatus(`Gagal login: ${error.message}`);
                setTimeout(() => router.replace("/"), 3000);
                return;
            }

            if (data.session) {
                setStatus("Memigrasi data lokal ke cloud...");
                // TODO: Call migration function
                // migrateAnonymousDataToUser(data.session.user.id).then(() => {
                //   router.replace("/");
                // })
                setTimeout(() => router.replace("/"), 1000);
            } else {
                // Wait, maybe the hash fragment is still being processed
                const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                    if (event === "SIGNED_IN" && session) {
                        setStatus("Memigrasi data lokal ke cloud...");
                        // TODO: Call migration
                        setTimeout(() => router.replace("/"), 1000);
                    }
                });

                return () => subscription.unsubscribe();
            }
        });
    }, [router]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-bg-base px-4">
            <div className="flex flex-col items-center gap-4 text-center max-w-sm">
                <Loader2 className="h-10 w-10 text-brand animate-spin" />
                <h1 className="text-lg font-semibold text-text-primary">Mengamankan Akun</h1>
                <p className="text-sm text-text-secondary">{status}</p>
            </div>
        </div>
    );
}
