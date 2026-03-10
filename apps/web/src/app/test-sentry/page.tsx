"use client";

import { useState } from "react";
import * as Sentry from "@sentry/nextjs";
import { 
  captureException, 
  captureMessage, 
  addBreadcrumb,
  setUser,
  clearUser,
  withPerformanceTracking,
  isSentryInitialized,
  showFeedbackDialog
} from "@/lib/sentry";

/**
 * Sentry Test Page
 * 
 * Halaman ini untuk testing Sentry integration di local development.
 * Akses: http://localhost:3005/test-sentry
 */
export default function TestSentryPage() {
  const [testResults, setTestResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // Check Sentry initialization status
  const checkInit = () => {
    const initialized = isSentryInitialized();
    const client = Sentry.getClient();
    addResult(`Sentry Initialized: ${initialized}`);
    if (client) {
      addResult(`DSN Configured: ${!!client.getOptions().dsn}`);
    }
  };

  // Test 1: Capture simple exception
  const testCaptureException = () => {
    try {
      throw new Error("Test error dari Sentry Test Page");
    } catch (error) {
      const eventId = captureException(error, { 
        testContext: "manual_test",
        page: "test-sentry",
        timestamp: Date.now()
      });
      addResult(`Exception captured. Event ID: ${eventId}`);
    }
  };

  // Test 2: Capture message
  const testCaptureMessage = () => {
    const eventId = captureMessage("Test message dari Sentry Test Page", "info");
    addResult(`Message captured. Event ID: ${eventId}`);
  };

  // Test 3: Add breadcrumbs
  const testBreadcrumbs = () => {
    addBreadcrumb("User clicked test button", "test", { buttonId: "test-breadcrumb" });
    addBreadcrumb("Processing test action", "test", { action: "breadcrumb_test" });
    addResult("Breadcrumbs added (check console for details)");
  };

  // Test 4: Set user context
  const testSetUser = () => {
    setUser({ 
      id: "test-user-123", 
      email: "test@kemana.app",
      username: "Test User"
    });
    addResult("User context set: test-user-123");
  };

  // Test 5: Clear user context
  const testClearUser = () => {
    clearUser();
    addResult("User context cleared");
  };

  // Test 6: Performance tracking
  const testPerformance = async () => {
    addResult("Starting performance test...");
    
    await withPerformanceTracking("test_operation", async () => {
      // Simulate async work
      await new Promise(resolve => setTimeout(resolve, 500));
      addResult("Performance tracking test completed (500ms)");
    }, "test.performance");
  };

  // Test 7: Component error (will trigger ErrorBoundary)
  const testComponentError = () => {
    // This will be caught by ErrorBoundary
    throw new Error("Error untuk test ErrorBoundary + Sentry");
  };

  // Test 8: Show feedback dialog
  const testFeedbackDialog = () => {
    showFeedbackDialog();
    addResult("Feedback dialog opened");
  };

  // Test 9: Promise rejection
  const testPromiseRejection = () => {
    Promise.reject(new Error("Unhandled promise rejection test"));
    addResult("Promise rejected (check Sentry for unhandled rejection)");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🐛 Sentry Test Page</h1>
        <p className="text-gray-600 mb-6">
          Halaman untuk testing Sentry integration. Pastikan <code>SENTRY_ENABLE_DEV=true</code> di .env.local
        </p>

        {/* Status */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-blue-900 mb-2">Status</h2>
          <button 
            onClick={checkInit}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Check Sentry Status
          </button>
        </div>

        {/* Test Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <button
            onClick={testCaptureException}
            className="bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 transition-colors"
          >
            1. Test Capture Exception
          </button>

          <button
            onClick={testCaptureMessage}
            className="bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors"
          >
            2. Test Capture Message
          </button>

          <button
            onClick={testBreadcrumbs}
            className="bg-yellow-600 text-white px-4 py-3 rounded-lg hover:bg-yellow-700 transition-colors"
          >
            3. Test Breadcrumbs
          </button>

          <button
            onClick={testSetUser}
            className="bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 transition-colors"
          >
            4. Set User Context
          </button>

          <button
            onClick={testClearUser}
            className="bg-gray-600 text-white px-4 py-3 rounded-lg hover:bg-gray-700 transition-colors"
          >
            5. Clear User Context
          </button>

          <button
            onClick={testPerformance}
            className="bg-indigo-600 text-white px-4 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            6. Test Performance Tracking
          </button>

          <button
            onClick={testFeedbackDialog}
            className="bg-pink-600 text-white px-4 py-3 rounded-lg hover:bg-pink-700 transition-colors"
          >
            7. Show Feedback Dialog
          </button>

          <button
            onClick={testPromiseRejection}
            className="bg-orange-600 text-white px-4 py-3 rounded-lg hover:bg-orange-700 transition-colors"
          >
            8. Test Promise Rejection
          </button>
        </div>

        {/* Error Boundary Test */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-red-900 mb-2">Error Boundary Test</h2>
          <p className="text-red-700 text-sm mb-3">
            Tombol ini akan throw error dan ditangkap oleh ErrorBoundary + dikirim ke Sentry
          </p>
          <button
            onClick={testComponentError}
            className="bg-red-700 text-white px-4 py-3 rounded-lg hover:bg-red-800 transition-colors w-full"
          >
            9. Test Error Boundary (Will Crash!)
          </button>
        </div>

        {/* Results */}
        <div className="bg-gray-900 rounded-lg p-4">
          <h2 className="font-semibold text-white mb-2">Test Results</h2>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {testResults.length === 0 ? (
              <p className="text-gray-500 italic">Click buttons above to see results...</p>
            ) : (
              testResults.map((result, index) => (
                <p key={index} className="text-green-400 text-sm font-mono">
                  {result}
                </p>
              ))
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 text-sm text-gray-600">
          <h3 className="font-semibold mb-2">Cara Verifikasi:</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li>Buka browser console (F12 → Console)</li>
            <li>Klik tombol-tombol test di atas</li>
            <li>Cek console untuk log Sentry</li>
            <li>Buka dashboard Sentry → Issues</li>
            <li>Verifikasi error muncul di dashboard</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
