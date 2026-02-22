"use client";

import { useState, useCallback, useEffect } from "react";
import { Coffee, Settings, Bell, PieChart, Sun, Moon } from "lucide-react";
import ScreenContainer from "@/components/kemana-ui/ScreenContainer";
import TopAppBar from "@/components/kemana-ui/TopAppBar";
import BottomTabBar from "@/components/kemana-ui/BottomTabBar";
import FabAddButton from "@/components/kemana-ui/FabAddButton";
import SummaryHeroCard from "@/components/kemana-ui/SummaryHeroCard";
import QuickRecallChips, { QuickRecallItem } from "@/components/kemana-ui/QuickRecallChips";
import ContextBanner from "@/components/kemana-ui/ContextBanner";
import { TransactionCard, TransactionItem } from "@/components/kemana-ui/TransactionCard";
import AddTransactionSheet from "@/components/kemana-ui/AddTransactionSheet";
import { formatAmountIDR } from "@kemana/core/format";

// --- DUMMY DATA ---
const MOCK_RECALL: QuickRecallItem[] = [
  { id: "r1", category: "Makan", title: "Nasi padang", amount: 25000 },
  { id: "r2", category: "Transport", title: "Gojek kantor", amount: 14000 },
  { id: "r3", category: "Kopi", title: "Americano", amount: 18000 },
];

const MOCK_TRANSACTIONS: TransactionItem[] = [
  { id: "t1", title: "Nasi campur", amount: 25000, type: "expense", category: "Makan", time: "13:12", paymentMethod: "QRIS", note: "Makan siang" },
  { id: "t2", title: "Tiket KRL", amount: 15000, type: "expense", category: "Transport", time: "10:30", note: "Ke kantor" },
  { id: "t3", title: "Kopi susu", amount: 18000, type: "expense", category: "Hiburan", time: "09:15", paymentMethod: "Cash" },
  { id: "t4", title: "Token listrik", amount: 100000, type: "expense", category: "Tagihan", time: "Kemarin", paymentMethod: "Transfer" },
  { id: "t5", title: "Bensin motor", amount: 35000, type: "expense", category: "Transport", time: "Kemarin", paymentMethod: "Cash" },
];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("home");
  const [transactions, setTransactions] = useState<TransactionItem[]>(MOCK_TRANSACTIONS);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Sheet state
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [sheetPrefill, setSheetPrefill] = useState<any>(null);

  // Theme Toggle State
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check initial dark mode state
    setIsDarkMode(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTheme = useCallback(() => {
    const root = document.documentElement;
    if (root.classList.contains("dark")) {
      root.classList.remove("dark");
      setIsDarkMode(false);
    } else {
      root.classList.add("dark");
      setIsDarkMode(true);
    }
  }, []);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSaveTransaction = useCallback((updatedItem: TransactionItem) => {
    setTransactions(prev => prev.map(t => t.id === updatedItem.id ? updatedItem : t));
  }, []);

  const handleCreateTransaction = (data: any) => {
    const newItem: TransactionItem = {
      id: `t${Date.now()}`,
      title: data.category, // fallback title
      amount: data.amount,
      type: data.type,
      category: data.category,
      time: "Baru saja",
      paymentMethod: data.payment,
      note: data.note,
    };
    setTransactions(prev => [newItem, ...prev]);
    // TODO: show snackbar
  };

  const openAddSheet = useCallback((prefillData?: any) => {
    setSheetPrefill(prefillData);
    setIsAddSheetOpen(true);
  }, []);

  // Render dummy Insight view
  if (activeTab === "insight") {
    return (
      <ScreenContainer withBottomNav>
        <TopAppBar title="Insight" />
        <div className="px-4 py-2 flex flex-col gap-4">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {["Minggu ini", "Bulan ini", "Tahun ini"].map((f, i) => (
              <button key={f} className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ${i === 1 ? "bg-text-primary text-bg-elevated shadow-sm" : "bg-bg-subtle text-text-secondary hover:bg-border-subtle"}`}>
                {f}
              </button>
            ))}
          </div>

          <div className="rounded-[24px] bg-bg-elevated p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] ring-1 ring-border-subtle">
            <h3 className="text-[18px] font-bold tracking-tight text-text-primary">Alokasi Pengeluaran</h3>
            <p className="mt-1 text-[14px] font-medium text-text-secondary">Rp1.105.000 digunakan sejauh ini.</p>

            <div className="mt-8 flex h-40 w-full items-end justify-between gap-2 px-2">
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 rounded-t-lg bg-insight-chip-bg" style={{ height: "40%" }} />
                <span className="text-[11px] font-medium text-text-secondary">Pekan 1</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 rounded-t-lg bg-insight-chip-bg" style={{ height: "65%" }} />
                <span className="text-[11px] font-medium text-text-secondary">Pekan 2</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 rounded-t-lg bg-brand shadow-sm" style={{ height: "100%" }} />
                <span className="text-[11px] font-bold text-text-primary">Pekan 3</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 rounded-t-lg bg-insight-chip-bg/50" style={{ height: "20%" }} />
                <span className="text-[11px] font-medium text-text-secondary">Pekan 4</span>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-danger-soft text-danger">M</div>
                  <div className="flex flex-col">
                    <span className="text-[14px] font-bold text-text-primary">Makan</span>
                    <span className="text-[12px] text-text-secondary">48 Transaksi</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[14px] font-bold text-text-primary">-Rp540.000</span>
                  <span className="text-[12px] font-semibold text-danger">48%</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning-soft text-warning">T</div>
                  <div className="flex flex-col">
                    <span className="text-[14px] font-bold text-text-primary">Transport</span>
                    <span className="text-[12px] text-text-secondary">22 Transaksi</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[14px] font-bold text-text-primary">-Rp215.000</span>
                  <span className="text-[12px] font-semibold text-warning">19%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <BottomTabBar activeTab={activeTab} onTabChange={setActiveTab} />
      </ScreenContainer>
    );
  }

  // Render Notes/Transactions view (Catatan)
  if (activeTab === "notes") {
    return (
      <ScreenContainer withBottomNav>
        <TopAppBar
          title="Catatan"
          actionIcon={<Settings className="h-5 w-5" />}
        />

        <div className="px-4 py-2">
          {/* Quick Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {["Hari ini", "Minggu ini", "Bulan ini", "Semua"].map((f, i) => (
              <button key={f} className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ${i === 0 ? "bg-text-primary text-bg-elevated shadow-sm" : "bg-bg-subtle text-text-secondary hover:bg-border-subtle"}`}>
                {f}
              </button>
            ))}
          </div>

          <div className="mt-2 mb-4 flex items-center justify-between rounded-[16px] bg-bg-card px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-border-subtle">
            <span className="text-[14px] font-semibold text-text-secondary">Total Keluar</span>
            <span className="text-[15px] font-bold tracking-tight text-text-primary">Rp178.000</span>
          </div>

          <div className="flex flex-col gap-3">
            {transactions.map(t => (
              <TransactionCard
                key={t.id}
                item={t}
                isExpanded={expandedIds.has(t.id)}
                onToggleExpand={() => handleToggleExpand(t.id)}
                onSave={handleSaveTransaction}
              />
            ))}
            {transactions.length === 0 && (
              <div className="py-12 text-center text-text-secondary">
                <p>Belum ada catatan.</p>
              </div>
            )}
          </div>
        </div>

        <FabAddButton onClick={() => openAddSheet()} />
        <BottomTabBar activeTab={activeTab} onTabChange={setActiveTab} />

        <AddTransactionSheet
          isOpen={isAddSheetOpen}
          onClose={() => setIsAddSheetOpen(false)}
          onSave={handleCreateTransaction}
          prefill={sheetPrefill}
        />
      </ScreenContainer>
    );
  }

  // Render Home view
  return (
    <ScreenContainer withBottomNav>
      <TopAppBar
        title="KeMana"
        subtitle="Halo, Komang👋"
        actionIcon={isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        onActionClick={toggleTheme}
      />

      <main className="flex flex-col gap-6 px-4 py-2">
        <SummaryHeroCard
          expense={1105000}
          transactionCount={42}
          averagePerDay={36000}
        >
          {/* Combined Insight Block */}
          <div className="flex flex-col gap-3 rounded-[20px] bg-insight-bg border border-insight-border p-4 relative overflow-hidden">
            {/* Subtle bg decoration */}
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/20 blur-2xl" />

            <div className="flex items-center justify-between relative z-10">
              <span className="text-[12px] font-semibold text-insight-header uppercase tracking-widest">
                Insight Hari Ini
              </span>
              <button
                onClick={() => setActiveTab("insight")}
                className="flex items-center gap-1 text-[12px] font-semibold text-brand hover:opacity-80 transition-opacity"
              >
                Detail
                <PieChart className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex items-start gap-3 mt-1 relative z-10">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-insight-icon-bg shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <span className="text-[20px]">😎</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[16px] font-bold text-insight-title leading-tight">Kamu hemat hari ini</span>
                <span className="text-[13px] font-medium text-insight-subtitle leading-snug">Pengeluaranmu di bawah rata-rata.</span>
              </div>
            </div>

            <div className="mt-2 pt-3 border-t border-insight-border flex items-center justify-between relative z-10">
              <span className="text-[12px] font-medium text-insight-subtitle">Kategori terbesar:</span>
              <div className="flex items-center gap-1.5 rounded-full bg-insight-chip-bg px-3 py-1 border border-insight-chip-text/10">
                <span className="text-[12px] font-bold text-insight-chip-text">Makan (48%)</span>
              </div>
            </div>
          </div>
        </SummaryHeroCard>

        {/* Quick Add Composer */}
        <div className="flex w-full items-center overflow-hidden rounded-[20px] bg-bg-card p-1.5 shadow-sm ring-1 ring-border-subtle focus-within:ring-2 focus-within:ring-brand/50 transition-shadow">
          <input
            type="text"
            placeholder="Misal: 25k makan siang"
            className="flex-1 bg-transparent px-4 py-2.5 text-[15px] font-medium outline-none placeholder:text-text-secondary/70"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const val = e.currentTarget.value;
                if (val) {
                  // Mock simple hardcoded parser behavior
                  handleCreateTransaction({ type: "expense", amount: parseInt(val.match(/\d+/)?.[0] || "25") * 1000, category: "Makan", note: val, payment: "Cash" });
                  e.currentTarget.value = "";
                }
              }
            }}
          />
          <button
            className="flex items-center justify-center rounded-[14px] bg-brand/10 text-brand px-5 py-2.5 font-bold transition-all active:scale-95 hover:bg-brand hover:text-white"
            onClick={(e) => {
              const input = e.currentTarget.previousElementSibling as HTMLInputElement;
              const val = input.value;
              if (val) {
                handleCreateTransaction({ type: "expense", amount: parseInt(val.match(/\d+/)?.[0] || "25") * 1000, category: "Makan", note: val, payment: "Cash" });
                input.value = "";
              }
            }}
          >
            Catat
          </button>
        </div>

        <QuickRecallChips
          items={MOCK_RECALL}
          onSelect={(item) => openAddSheet({ category: item.category, amount: item.amount, type: "expense" })}
        />

        <ContextBanner
          variant="nightClose"
          title="Tutup hari ini yuk"
          subtitle="Review transaksi hari ini sebelum tidur"
          actionLabel="Review hari ini"
          className="dark:bg-brand-soft/20 dark:border dark:border-brand/20"
          onAction={() => console.log("Night close trigger")}
        />

        <div className="flex flex-col gap-3">
          <h3 className="text-[16px] font-bold text-text-primary">Aktivitas terbaru</h3>
          <div className="flex flex-col gap-3">
            {transactions.slice(0, 3).map(t => (
              <TransactionCard
                key={t.id}
                item={t}
                isExpanded={expandedIds.has(t.id)}
                onToggleExpand={() => handleToggleExpand(t.id)}
                onSave={handleSaveTransaction}
              />
            ))}
          </div>
        </div>
      </main>

      <FabAddButton onClick={() => openAddSheet()} />
      <BottomTabBar activeTab={activeTab} onTabChange={setActiveTab} />

      <AddTransactionSheet
        isOpen={isAddSheetOpen}
        onClose={() => setIsAddSheetOpen(false)}
        onSave={handleCreateTransaction}
        prefill={sheetPrefill}
      />
    </ScreenContainer>
  );
}
