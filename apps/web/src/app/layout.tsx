import type { Metadata, Viewport } from "next";
import PwaInstallBanner from "@/components/PwaInstallBanner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import SafeAreaSync from "./safe-area-sync";
import CapacitorInit from "./capacitor-init";
import SWRegister from "./sw-register";
import ThemeColorSync from "./theme-color";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "KeMana",
  description: "Biar tau uangmu kemana",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "KeMana"
  },
  icons: {
    icon: [
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" }
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon-32.png"]
  }
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F8FA" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  viewportFit: "cover"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>
        <ErrorBoundary>
          <SafeAreaSync />
          <CapacitorInit />
          <PwaInstallBanner />
          {children}
          <Toaster position="bottom-center" richColors />
          <ThemeColorSync />
          <SWRegister />
        </ErrorBoundary>
      </body>
    </html>
  );
}
