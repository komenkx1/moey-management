"use client";

import React, { Component, type ReactNode } from "react";
import * as Sentry from "@sentry/nextjs";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  eventId: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, eventId: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, eventId: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }
    
    // Send error to Sentry with additional context
    Sentry.withScope((scope) => {
      // Add component stack as extra context
      scope.setExtra("componentStack", errorInfo.componentStack);
      // Set the level to error
      scope.setLevel("error");
      // Set the context for React errors
      scope.setContext("react", {
        componentStack: errorInfo.componentStack,
      });
      
      // Capture the exception and store the event ID
      const eventId = Sentry.captureException(error);
      this.setState({ eventId });
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, eventId: null });
  };

  handleReportFeedback = () => {
    // Show Sentry feedback dialog if available
    if (Sentry.getClient()) {
      Sentry.showReportDialog({
        eventId: this.state.eventId || undefined,
        title: "Laporkan Masalah",
        subtitle: "Terjadi kesalahan yang tidak terduga.",
        subtitle2: "Bantu kami memperbaiki masalah ini dengan mengirimkan laporan.",
        labelName: "Nama",
        labelEmail: "Email",
        labelComments: "Komentar atau deskripsi masalah",
        labelClose: "Tutup",
        labelSubmit: "Kirim Laporan",
        errorGeneric: "Terjadi kesalahan saat mengirim laporan. Silakan coba lagi.",
        errorFormEntry: "Beberapa kolom tidak valid. Periksa kembali isian Anda.",
        successMessage: "Terima kasih! Laporan Anda telah dikirim.",
      });
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="mb-4">
              <svg
                className="mx-auto h-12 w-12 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Terjadi Kesalahan
            </h2>
            <p className="text-gray-600 mb-4">
              Maaf, ada yang tidak beres. Data kamu aman, tapi aplikasi perlu dimuat ulang.
            </p>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mb-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Detail error (development only)
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40 text-black">
                  {this.state.error.toString()}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Muat Ulang Aplikasi
            </button>
            
            {this.state.eventId && (
              <>
                <div className="mt-3 text-xs text-gray-500">
                  Error ID: <code className="bg-gray-100 px-1 py-0.5 rounded">{this.state.eventId}</code>
                </div>
                <button
                  onClick={this.handleReportFeedback}
                  className="mt-3 w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  Laporkan Masalah ke Tim Support
                </button>
              </>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
