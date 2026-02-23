import type { NightCloseTopCategory } from "@/app/night-close";
import AddTransactionSheet, {
  type AddTransactionSubmitPayload
} from "@/components/kemana-ui/AddTransactionSheet";
import BulkInputSheet, { type BulkPreviewLine } from "@/components/kemana-ui/BulkInputSheet";
import DataToolsSheet from "@/components/kemana-ui/DataToolsSheet";
import NightCloseReviewSheet from "@/components/kemana-ui/NightCloseReviewSheet";
import NameOnboardingSheet from "@/components/kemana-ui/NameOnboardingSheet";

interface DashboardSheetsProps {
  isAddSheetOpen: boolean;
  onCloseAddSheet: () => void;
  onSaveAddSheet: (data: AddTransactionSubmitPayload) => void;
  sheetPrefill?: Partial<AddTransactionSubmitPayload>;

  isBulkSheetOpen: boolean;
  onCloseBulkSheet: () => void;
  bulkInput: string;
  onBulkInputChange: (next: string) => void;
  bulkPreview: BulkPreviewLine[];
  validBulkCount: number;
  onSaveBulk: () => void;

  isDataToolsSheetOpen: boolean;
  onCloseDataToolsSheet: () => void;
  replaceOnImport: boolean;
  onReplaceOnImportChange: (next: boolean) => void;
  onExportJson: () => void;
  onExportCsv: () => void;
  onImportFile: (file: File) => Promise<void>;
  importMessage: string | null;

  isNightCloseSheetOpen: boolean;
  nightCloseDateLabel: string;
  nightCloseTotal: number;
  nightCloseCount: number;
  nightCloseTopCategory: NightCloseTopCategory | null;
  nightClosePromptLine: string;
  onCloseNightCloseSheet: () => void;
  onDoneNightClose: () => void;
  onAddNightCloseEntry: () => void;

  isNamePromptOpen: boolean;
  nameDraft: string;
  onNameDraftChange: (next: string) => void;
  onSaveUserName: () => void;
  canSaveName: boolean;
}

export default function DashboardSheets({
  isAddSheetOpen,
  onCloseAddSheet,
  onSaveAddSheet,
  sheetPrefill,
  isBulkSheetOpen,
  onCloseBulkSheet,
  bulkInput,
  onBulkInputChange,
  bulkPreview,
  validBulkCount,
  onSaveBulk,
  isDataToolsSheetOpen,
  onCloseDataToolsSheet,
  replaceOnImport,
  onReplaceOnImportChange,
  onExportJson,
  onExportCsv,
  onImportFile,
  importMessage,
  isNightCloseSheetOpen,
  nightCloseDateLabel,
  nightCloseTotal,
  nightCloseCount,
  nightCloseTopCategory,
  nightClosePromptLine,
  onCloseNightCloseSheet,
  onDoneNightClose,
  onAddNightCloseEntry,
  isNamePromptOpen,
  nameDraft,
  onNameDraftChange,
  onSaveUserName,
  canSaveName
}: DashboardSheetsProps) {
  return (
    <>
      <AddTransactionSheet
        isOpen={isAddSheetOpen}
        onClose={onCloseAddSheet}
        onSave={onSaveAddSheet}
        prefill={sheetPrefill}
      />
      <BulkInputSheet
        isOpen={isBulkSheetOpen}
        onClose={onCloseBulkSheet}
        input={bulkInput}
        onInputChange={onBulkInputChange}
        preview={bulkPreview}
        validCount={validBulkCount}
        onSave={onSaveBulk}
      />
      <DataToolsSheet
        isOpen={isDataToolsSheetOpen}
        onClose={onCloseDataToolsSheet}
        replaceOnImport={replaceOnImport}
        onReplaceOnImportChange={onReplaceOnImportChange}
        onExportJson={onExportJson}
        onExportCsv={onExportCsv}
        onImportFile={onImportFile}
        importMessage={importMessage}
      />
      <NightCloseReviewSheet
        isOpen={isNightCloseSheetOpen}
        dateLabel={nightCloseDateLabel}
        total={nightCloseTotal}
        count={nightCloseCount}
        topCategory={nightCloseTopCategory}
        promptLine={nightClosePromptLine}
        onClose={onCloseNightCloseSheet}
        onDone={onDoneNightClose}
        onAddEntry={onAddNightCloseEntry}
      />
      <NameOnboardingSheet
        isOpen={isNamePromptOpen}
        value={nameDraft}
        onValueChange={onNameDraftChange}
        onSave={onSaveUserName}
        canSave={canSaveName}
      />
    </>
  );
}
