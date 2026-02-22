import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface NameOnboardingSheetProps {
  isOpen: boolean;
  value: string;
  onValueChange: (next: string) => void;
  onSave: () => void;
  canSave: boolean;
}

export default function NameOnboardingSheet({
  isOpen,
  value,
  onValueChange,
  onSave,
  canSave
}: NameOnboardingSheetProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 60);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isOpen]);

  return (
    <div
      className={cn("fixed inset-0 z-50", isOpen ? "visible pointer-events-auto" : "invisible pointer-events-none")}
      aria-hidden={!isOpen}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <section
        className={cn(
          "absolute inset-x-0 bottom-0 flex flex-col rounded-t-[24px] bg-bg-base px-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-4 shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] sm:mx-auto sm:max-w-md",
          isOpen ? "translate-y-0" : "translate-y-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="name-onboarding-title"
      >
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-border-subtle" />
        <h2 id="name-onboarding-title" className="text-[21px] font-bold text-text-primary">
          Biar sapaan lebih personal
        </h2>
        <p className="mt-1 text-[13px] font-medium text-text-secondary">
          Isi nama panggilan dulu sebelum lanjut pakai KeMana.
        </p>

        <label htmlFor="name-onboarding-input" className="mt-4 text-[12px] font-semibold text-text-secondary">
          Nama panggilan
        </label>
        <input
          ref={inputRef}
          id="name-onboarding-input"
          type="text"
          value={value}
          maxLength={24}
          placeholder="Contoh: Komang"
          className="mt-1 h-11 w-full rounded-xl border border-border-subtle bg-bg-elevated px-3 text-[15px] font-medium text-text-primary outline-none transition-colors focus:border-brand"
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && canSave) {
              event.preventDefault();
              onSave();
            }
          }}
          aria-label="Nama panggilan"
        />

        <p className="mt-2 text-[11px] font-medium text-text-tertiary">Nama disimpan lokal di perangkat ini.</p>

        <button
          type="button"
          onClick={onSave}
          disabled={!canSave}
          className={cn(
            "mt-4 h-11 w-full rounded-xl text-[14px] font-semibold transition-colors",
            canSave ? "bg-brand text-white hover:bg-brand-pressed" : "bg-bg-subtle text-text-tertiary"
          )}
        >
          Lanjut pakai KeMana
        </button>
      </section>
    </div>
  );
}
