import React, { useState, useMemo, useEffect } from "react";
import { Plus, Trash2, Receipt, Calculator, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatAmountIDR } from "@kemana/core/format";
import { formatCurrencyInputDisplay, parseCurrencyInputToNumber, sanitizeCurrencyInput } from "@/lib/kemana-utils";

interface SmartSplitItem {
  id: string;
  name: string;
  priceStr: string;
  assignedTo: string; // 'EQUAL' or person name
}

export interface SmartSplitCalculatorProps {
  totalAmount: number;
  splitPeople: string[];
  onSharesCalculated: (shares: { person: string; amount: number }[], isValid: boolean) => void;
}

export default function SmartSplitCalculator({ totalAmount, splitPeople, onSharesCalculated }: SmartSplitCalculatorProps) {
  const [subtotalStr, setSubtotalStr] = useState("");
  const [items, setItems] = useState<SmartSplitItem[]>([]);

  // Automatically add an empty item if list is empty
  useEffect(() => {
    if (items.length === 0) {
      setItems([{ id: Math.random().toString(), name: "", priceStr: "", assignedTo: splitPeople[0] || "EQUAL" }]);
    }
  }, [items.length, splitPeople]);

  const subtotalAmount = parseCurrencyInputToNumber(subtotalStr);
  const taxAmount = Math.max(0, totalAmount - subtotalAmount);

  const parsedItems = useMemo(() => {
    return items.map(i => ({
      ...i,
      price: parseCurrencyInputToNumber(i.priceStr)
    }));
  }, [items]);

  const sumOfItems = parsedItems.reduce((acc, curr) => acc + curr.price, 0);
  const diff = subtotalAmount - sumOfItems;
  const isValid = subtotalAmount > 0 && totalAmount >= subtotalAmount && diff === 0 && splitPeople.length > 0;

  // Calculate shares
  const finalShares = useMemo(() => {
    if (!isValid || sumOfItems === 0) return [];

    // 1. Calculate base assignment for each person
    const baseShares: Record<string, number> = {};
    splitPeople.forEach(p => baseShares[p] = 0);

    let equalPool = 0;
    parsedItems.forEach(item => {
      if (item.assignedTo === "EQUAL") {
        equalPool += item.price;
      } else if (baseShares[item.assignedTo] !== undefined) {
        baseShares[item.assignedTo] += item.price;
      }
    });

    const equalSlice = equalPool / splitPeople.length;
    splitPeople.forEach(p => baseShares[p] += equalSlice);

    // 2. Distribute tax proportionally
    const shares: { person: string; amount: number }[] = [];
    let allocatedTotal = 0;
    
    splitPeople.forEach((p, idx) => {
      const base = baseShares[p];
      const ratio = base / sumOfItems;
      const taxShare = Math.round(ratio * taxAmount);
      
      let finalAmount = base + taxShare;
      
      // Handle rounding error on the last person to perfectly match totalAmount
      if (idx === splitPeople.length - 1) {
         const remainder = totalAmount - (allocatedTotal + finalAmount);
         finalAmount += remainder;
      }
      
      shares.push({ person: p, amount: finalAmount });
      allocatedTotal += finalAmount;
    });

    // 3. Validate that sum of shares equals total amount (within ±1 tolerance for rounding)
    /**
     * Split Transaction Validation
     * 
     * Validation Rationale:
     * - Ensures data integrity (sum of shares must equal total)
     * - ±1 tolerance accounts for floating-point rounding errors
     * - Prevents inconsistent transactions (e.g., 100k split into 60k + 30k)
     * - Returns empty array on validation failure (prevents save)
     * 
     * Example Valid Cases:
     * - Total: 100,000, Shares: [50,000, 50,000] → difference = 0 ✓
     * - Total: 100,000, Shares: [33,333, 33,333, 33,334] → difference = 0 ✓
     * - Total: 100,000, Shares: [33,333, 33,333, 33,333] → difference = 1 ✓
     * 
     * Example Invalid Case:
     * - Total: 100,000, Shares: [60,000, 30,000] → difference = 10,000 ✗
     */
    const sumOfShares = shares.reduce((acc, s) => acc + s.amount, 0);
    const difference = Math.abs(sumOfShares - totalAmount);
    
    if (difference > 1) {
      // Validation failed - sum doesn't match total
      console.error(`Split validation failed: sum=${sumOfShares}, total=${totalAmount}, diff=${difference}`);
      return [];
    }

    return shares;
  }, [isValid, sumOfItems, parsedItems, splitPeople, taxAmount, totalAmount]);

  useEffect(() => {
    onSharesCalculated(finalShares, isValid);
  }, [finalShares, isValid, onSharesCalculated]);

  const addItem = () => {
    setItems(prev => [...prev, { id: Math.random().toString(), name: "", priceStr: "", assignedTo: splitPeople[0] || "EQUAL" }]);
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const updateItem = (id: string, field: keyof SmartSplitItem, value: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  return (
    <div className="flex flex-col gap-4 mt-3">
      {/* Subtotal Input */}
      <div className="rounded-2xl border border-border-subtle bg-bg-base p-4">
         <div className="flex items-center gap-2 mb-3">
             <Receipt className="w-4 h-4 text-text-secondary" />
             <span className="text-[13px] font-semibold text-text-secondary">Subtotal Menu (Tanpa Pajak)</span>
         </div>
         <div className="flex items-center gap-2 border-b border-border-subtle pb-2">
            <span className="text-[16px] font-bold text-text-primary">Rp</span>
            <input
                type="text"
                inputMode="numeric"
                value={formatCurrencyInputDisplay(subtotalStr)}
                onChange={(e) => setSubtotalStr(sanitizeCurrencyInput(e.target.value))}
                placeholder="0"
                data-testid="smart-split-subtotal"
                className="w-full bg-transparent text-[20px] font-bold text-text-primary outline-none"
            />
         </div>
         <div className="flex justify-between mt-3 text-[12px]">
             <span className="text-text-tertiary">Pajak & Layanan:</span>
             <span className="font-semibold text-text-secondary">
                 Rp {formatAmountIDR(taxAmount)}
             </span>
         </div>
      </div>

      {/* Item List */}
      <div className="flex flex-col gap-3">
          <div className="flex items-center px-1">
              <span className="text-[12px] font-semibold text-text-secondary">Detail Item</span>
          </div>

          <div className="flex flex-col gap-2">
              {items.map((item, index) => (
                  <div key={item.id} className="flex flex-col gap-2 p-3 rounded-2xl border border-border-subtle bg-bg-base">
                      <div className="flex items-center gap-2">
                          <div className="flex-1 flex items-center gap-2 bg-bg-subtle/50 px-2.5 py-1.5 rounded-lg border border-transparent focus-within:border-border-subtle transition-colors">
                              <Pencil className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
                              <input 
                                  type="text" 
                                  placeholder={`Masukan nama item ${index + 1} (Opsional)`}
                                  value={item.name}
                                  onChange={(e) => updateItem(item.id, "name", e.target.value)}
                                  className="flex-1 bg-transparent text-[13px] font-semibold text-text-primary outline-none placeholder:text-text-tertiary"
                              />
                          </div>
                          {items.length > 1 && (
                              <button type="button" onClick={() => removeItem(item.id)} className="p-1.5 text-text-tertiary hover:text-red-500 transition-colors">
                                  <Trash2 className="w-4 h-4" />
                              </button>
                          )}
                      </div>
                      <div className="flex items-center gap-2">
                          <div className="flex-1 flex items-center gap-1.5 bg-bg-subtle rounded-xl px-3 py-2 border border-border-subtle focus-within:border-brand transition-colors">
                              <span className="text-[13px] font-semibold text-text-secondary">Rp</span>
                              <input 
                                  type="text"
                                  inputMode="numeric"
                                  placeholder="0"
                                  value={formatCurrencyInputDisplay(item.priceStr)}
                                  onChange={(e) => updateItem(item.id, "priceStr", sanitizeCurrencyInput(e.target.value))}
                                  data-testid={`smart-split-item-price-${index}`}
                                  className="w-full bg-transparent text-[14px] font-semibold text-text-primary outline-none"
                              />
                          </div>
                          <select 
                              value={item.assignedTo}
                              onChange={(e) => updateItem(item.id, "assignedTo", e.target.value)}
                              data-testid={`smart-split-item-select-${index}`}
                              className="max-w-[120px] bg-bg-subtle rounded-xl px-2 py-2 border border-border-subtle text-[12px] font-semibold text-text-secondary outline-none appearance-none text-center cursor-pointer"
                          >
                              <option value="EQUAL">Bagi Rata</option>
                              {splitPeople.map(p => (
                                  <option key={p} value={p}>{p}</option>
                              ))}
                          </select>
                      </div>
                  </div>
              ))}
          </div>
          
          {/* Add Item Button (Moved to bottom) */}
          <button 
              type="button" 
              onClick={addItem}
              data-testid="smart-split-add-item"
              className="mt-1 w-full py-2.5 rounded-xl border border-dashed border-border-subtle hover:border-brand hover:bg-brand-soft/50 text-text-secondary hover:text-brand text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-colors active:scale-[0.98]"
          >
              <Plus className="w-4 h-4" /> Tambah Makanan
          </button>
      </div>

      {/* Validation Banner */}
      <div 
          data-testid="smart-split-validation"
          className={cn(
          "p-3 rounded-xl border flex items-center justify-between transition-colors",
          subtotalAmount === 0 ? "bg-bg-subtle border-border-subtle" :
          diff === 0 ? "bg-green-500/10 border-green-500/30 text-green-600" : "bg-red-500/10 border-red-500/30 text-red-500"
      )}>
          <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              <span className="text-[12px] font-semibold">
                  {subtotalAmount === 0 ? "Masukkan subtotal instruksi" :
                   diff === 0 ? "Semua item cocok!" :
                   diff > 0 ? `Sisa: Rp${formatAmountIDR(diff)}` :
                   `Lebih: Rp${formatAmountIDR(Math.abs(diff))}`}
              </span>
          </div>
          <span className="text-[13px] font-bold shrink-0">
              {formatAmountIDR(sumOfItems)} / {formatAmountIDR(subtotalAmount)}
          </span>
      </div>
      
      {/* Result Preview */}
      {isValid && finalShares.length > 0 && (
          <div className="mt-2 flex flex-col gap-1.5 border-t border-border-subtle pt-4 pb-2">
              <span className="text-[11px] font-semibold text-text-tertiary mb-1 uppercase tracking-wider">Hasil Patungan (Termasuk Pajak)</span>
              {finalShares.map(share => (
                  <div key={share.person} className="flex justify-between items-center text-[13px]">
                      <span className="font-medium text-text-secondary">{share.person}</span>
                      <span className="font-bold text-text-primary">Rp {formatAmountIDR(share.amount)}</span>
                  </div>
              ))}
          </div>
      )}
    </div>
  );
}
