import { useRef } from "react";
import { cn } from "@/lib/utils";
import { Download, Upload, FileSpreadsheet, FileJson, X } from "lucide-react";
import { useBottomSheetDrag } from "./use-bottom-sheet-drag";

interface DataToolsSheetProps {
    isOpen: boolean;
    onClose: () => void;
    replaceOnImport: boolean;
    onReplaceOnImportChange: (next: boolean) => void;
    onExportJson: () => void;
    onExportCsv: () => void;
    onImportFile: (file: File) => void;
    importMessage?: string | null;
}

export default function DataToolsSheet({
    isOpen,
    onClose,
    replaceOnImport,
    onReplaceOnImportChange,
    onExportJson,
    onExportCsv,
    onImportFile,
    importMessage
}: DataToolsSheetProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { dragY, dragHandleProps } = useBottomSheetDrag({
        isOpen,
        onClose
    });

    return (
        <div
            className={cn("fixed inset-0 z-50", isOpen ? "visible pointer-events-auto" : "invisible pointer-events-none")}
            aria-hidden={!isOpen}
        >
            <div
                className={cn(
                    "absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300",
                    isOpen ? "opacity-100" : "opacity-0"
                )}
                onClick={onClose}
            />

            <div
                className={cn(
                    "absolute inset-x-0 bottom-0 flex max-h-[86dvh] flex-col rounded-t-[24px] bg-bg-base shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] sm:mx-auto sm:max-w-md",
                    isOpen && dragY === 0 ? "translate-y-0" : "translate-y-full"
                )}
                style={{ transform: dragY > 0 ? `translateY(${dragY}px)` : undefined }}
            >
                <div
                    className="w-full shrink-0 cursor-grab touch-none pb-2 active:cursor-grabbing"
                    {...dragHandleProps}
                >
                    <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-border-subtle" />
                </div>
                <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-3">
                    <div className="flex flex-col">
                        <h2 className="text-[20px] font-bold text-text-primary">Data &amp; tools</h2>
                        <p className="mt-0.5 text-[12px] font-medium text-text-secondary">
                            Backup dan pulihkan catatan di perangkat ini.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full bg-bg-subtle p-2 text-text-secondary transition-transform hover:bg-border-subtle hover:text-text-primary active:scale-95"
                        aria-label="Tutup data dan tools"
                    >
                        <X className="h-5 w-5" strokeWidth={2.5} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 pb-8 pt-2">
                    <section className="rounded-2xl border border-border-subtle bg-bg-elevated p-4">
                        <h3 className="text-[13px] font-semibold text-text-primary">Export</h3>
                        <div className="mt-3 grid grid-cols-2 gap-2.5">
                            <button
                                type="button"
                                onClick={onExportJson}
                                className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border-subtle bg-bg-base text-[13px] font-semibold text-text-primary transition-colors hover:border-brand hover:text-brand"
                            >
                                <FileJson className="h-4 w-4" />
                                JSON
                            </button>
                            <button
                                type="button"
                                onClick={onExportCsv}
                                className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border-subtle bg-bg-base text-[13px] font-semibold text-text-primary transition-colors hover:border-brand hover:text-brand"
                            >
                                <FileSpreadsheet className="h-4 w-4" />
                                CSV
                            </button>
                        </div>
                    </section>

                    <section className="mt-4 rounded-2xl border border-border-subtle bg-bg-elevated p-4">
                        <h3 className="text-[13px] font-semibold text-text-primary">Import</h3>
                        <p className="mt-1 text-[12px] font-medium text-text-secondary">
                            File yang didukung: JSON backup atau CSV export KeMana.
                        </p>

                        <label className="mt-3 flex items-center gap-2 text-[12px] font-medium text-text-secondary">
                            <input
                                type="checkbox"
                                checked={replaceOnImport}
                                onChange={(event) => onReplaceOnImportChange(event.target.checked)}
                                className="h-4 w-4 rounded border-border-subtle accent-brand"
                            />
                            Ganti semua data saat import
                        </label>

                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-pressed"
                        >
                            <Upload className="h-4 w-4" />
                            Pilih file import
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json,.csv,application/json,text/csv,text/plain,application/octet-stream"
                            className="hidden"
                            onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file) {
                                    onImportFile(file);
                                }
                                event.currentTarget.value = "";
                            }}
                        />
                    </section>

                    {importMessage ? (
                        <div className="mt-4 rounded-xl border border-border-subtle bg-bg-elevated px-3 py-2.5 text-[12px] font-medium text-text-secondary">
                            {importMessage}
                        </div>
                    ) : null}

                    <div className="mt-4 flex items-center gap-2 rounded-xl border border-border-subtle bg-bg-elevated px-3 py-2.5 text-[12px] font-medium text-text-secondary">
                        <Download className="h-4 w-4 text-text-tertiary" />
                        Simpan backup rutin sebelum ubah data besar.
                    </div>
                </div>
            </div>
        </div>
    );
}
