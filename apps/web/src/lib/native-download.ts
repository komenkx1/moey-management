/**
 * Native File Download Utility
 * Pada native (iOS/Android), <a download> tidak berfungsi di WKWebView.
 * Utility ini menggunakan Capacitor Filesystem + Share untuk menyimpan/share file.
 */

import { Capacitor } from "@capacitor/core";

/**
 * Download/share file secara native menggunakan Capacitor.
 * Menulis file ke cache directory lalu membuka native share sheet.
 * @returns true jika berhasil handle di native, false jika harus fallback ke web
 */
export async function nativeShareFile(params: {
    content: string;
    filename: string;
}): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
        return false;
    }

    try {
        const { Filesystem, Directory, Encoding } = await import("@capacitor/filesystem");
        const { Share } = await import("@capacitor/share");

        const result = await Filesystem.writeFile({
            path: params.filename,
            data: params.content,
            directory: Directory.Cache,
            encoding: Encoding.UTF8,
        });

        await Share.share({
            title: params.filename,
            url: result.uri,
        });

        return true;
    } catch (error) {
        console.error("Native share failed:", error);
        return false;
    }
}
