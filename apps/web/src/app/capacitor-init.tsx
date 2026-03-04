"use client";

import { useCapacitor } from "@/hooks/useCapacitor";

/**
 * Component untuk inisialisasi Capacitor
 * Digunakan di root layout untuk setup plugins native
 */
export default function CapacitorInit() {
  useCapacitor();
  return null;
}
