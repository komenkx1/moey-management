import Link from "next/link";
import ScreenContainer from "@/components/kemana-ui/ScreenContainer";
import TopAppBar from "@/components/kemana-ui/TopAppBar";

export default function NotFound() {
    return (
        <ScreenContainer>
            <TopAppBar title="Halaman Tidak Ditemukan" />
            <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
                <h2 className="text-[20px] font-bold text-text-primary">404</h2>
                <p className="mt-2 text-[14px] text-text-secondary">
                    Maaf, halaman yang Anda cari tidak ditemukan atau telah dihapus.
                </p>
                <Link
                    href="/"
                    className="mt-8 rounded-full bg-brand px-6 py-3 text-[14px] font-bold text-white shadow-md transition-transform active:scale-95"
                >
                    Kembali ke Beranda
                </Link>
            </div>
        </ScreenContainer>
    );
}
