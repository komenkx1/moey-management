import { formatAmountIDR } from "@kemana/core/format";
import type { Category, Entry } from "@kemana/core/types";
import { getLocalDayKey } from "@kemana/storage";

const DAY_MS = 86_400_000;

export interface NightCloseStats {
    dateISO: string;
    total: number;
    count: number;
    byCategory: Partial<Record<Category, number>>;
}

export interface NightCloseTopCategory {
    name: Category;
    percent: number;
}

export interface NightCloseCopy {
    subtitle: string;
    promptLine: string;
}

function offsetDate(base: Date, days: number): Date {
    const next = new Date(base);
    next.setDate(base.getDate() + days);
    return next;
}

function getEntryReportAmount(entry: Entry): number {
    if (!entry.split || !entry.split.shares.length) {
        return entry.amount;
    }

    const ownShare = entry.split.shares.find(
        (share) => share.person.trim().toLowerCase() === "kamu"
    );
    if (!ownShare || !Number.isFinite(ownShare.amount)) {
        return entry.amount;
    }

    return Math.max(0, Math.round(ownShare.amount));
}

export function isNightWindow(now: Date = new Date()): boolean {
    const hour = now.getHours();
    return hour >= 20 && hour <= 23;
}

export function getTodayStats(entries: Entry[], now: Date = new Date()): NightCloseStats {
    const todayISO = getLocalDayKey(now);
    const stats: NightCloseStats = {
        dateISO: todayISO,
        total: 0,
        count: 0,
        byCategory: {}
    };

    for (const entry of entries) {
        if (entry.date !== todayISO) {
            continue;
        }

        const amount = getEntryReportAmount(entry);
        stats.total += amount;
        stats.count += 1;
        stats.byCategory[entry.category] = (stats.byCategory[entry.category] ?? 0) + amount;
    }

    return stats;
}

export function getTopCategory(
    byCategory: NightCloseStats["byCategory"]
): NightCloseTopCategory | null {
    const rows = Object.entries(byCategory) as Array<[Category, number]>;
    if (rows.length === 0) {
        return null;
    }

    const total = rows.reduce((sum, [, amount]) => sum + amount, 0);
    if (total <= 0) {
        return null;
    }

    rows.sort((a, b) => b[1] - a[1]);
    const [name, amount] = rows[0];
    return {
        name,
        percent: Math.max(1, Math.round((amount / total) * 100))
    };
}

export function getAverageLast7Days(entries: Entry[], now: Date = new Date()): number {
    const todayISO = getLocalDayKey(now);
    const last7Keys = Array.from({ length: 7 }, (_, index) =>
        getLocalDayKey(offsetDate(now, -(index + 1)))
    );
    const last7Set = new Set(last7Keys);

    const total = entries.reduce((sum, entry) => {
        if (entry.date === todayISO || !last7Set.has(entry.date)) {
            return sum;
        }
        return sum + getEntryReportAmount(entry);
    }, 0);

    return total / 7;
}

export function shouldShowNightClose(params: {
    entries: Entry[];
    closedAt: string | null;
    now?: Date;
}): boolean {
    const { closedAt, now = new Date() } = params;
    if (!isNightWindow(now)) {
        return false;
    }

    const todayISO = getLocalDayKey(now);
    if (closedAt === todayISO) {
        return false;
    }

    return true;
}

export function getNightCloseCopy(params: {
    stats: NightCloseStats;
    avg7: number;
}): NightCloseCopy {
    const { stats, avg7 } = params;

    if (stats.count === 0) {
        return {
            subtitle: "Hari ini belum ada catatan. Mau cek sekali lagi?",
            promptLine: "Kadang bayar setelah pulang. Ada yang belum sempat dicatat?"
        };
    }

    const subtitle = `Hari ini kamu keluar Rp${formatAmountIDR(stats.total)} dari ${stats.count} catatan.`;

    if (avg7 > 0 && stats.total >= avg7 * 1.35) {
        return {
            subtitle,
            promptLine: "Hari ini agak tinggi, wajar kok. Ada yang bisa dihemat besok?"
        };
    }

    if (avg7 > 0 && stats.total <= avg7 * 0.75) {
        return {
            subtitle,
            promptLine: "Nice. Hari ini cukup hemat."
        };
    }

    return {
        subtitle,
        promptLine: "Aman. Tidak banyak pengeluaran."
    };
}

export function getTodayISO(now: Date = new Date()): string {
    return getLocalDayKey(now);
}

export function getDayDiffFromToday(dateISO: string, now: Date = new Date()): number | null {
    const parsed = new Date(`${dateISO}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    const today = new Date(`${getLocalDayKey(now)}T00:00:00`);
    return Math.floor((today.getTime() - parsed.getTime()) / DAY_MS);
}
