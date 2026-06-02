/**
 * db.ts — 純 JSON 檔案資料庫（無需原生編譯，Railway 相容）
 * 取代 better-sqlite3，使用 fs 讀寫 JSON 檔案
 */
import fs from "fs";
import path from "path";

const CHAPTER_START = "2026-04-10";
const CHAPTER_END   = "2026-09-30";

const DATA_DIR = process.env.DATA_DIR || process.cwd();

// 確保資料目錄存在
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const RECORDS_FILE = path.join(DATA_DIR, "bni_records.json");
const SEED_FILE    = path.join(DATA_DIR, "bni_seed.json");
const GOALS_FILE   = path.join(DATA_DIR, "bni_goals.json");

// ── 通用讀寫工具 ──────────────────────────────────────────────────────────────
function readJson<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson(filePath: string, data: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// ── 型別定義 ─────────────────────────────────────────────────────────────────
export interface WeeklyRecordRow {
  id: string;
  weekTitle: string;
  date: string;
  members: unknown;
  goals: unknown;
  committeeText: string;
  createdAt: number;
}

export interface AccumulatedSeedEntry {
  memberName: string;
  weeksRecorded: number;
  absenceCount: number;
  absenceRuleCount: number;
  substituteRuleCount: number;
  lateCount: number;
  totalCeu: number;
  totalTransactionValue: number;
  avgVisitorsPerMonth: number;
  avg121PerWeek: number;
  avgRefPerWeek: number;
}

// ── 週次歷史 ─────────────────────────────────────────────────────────────────
export const historyDb = {
  getAll(): WeeklyRecordRow[] {
    const rows = readJson<WeeklyRecordRow[]>(RECORDS_FILE, []);
    return rows.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  },

  save(record: { id: string; weekTitle: string; date: string; members: unknown; goals: unknown; committeeText: string }) {
    const rows = readJson<WeeklyRecordRow[]>(RECORDS_FILE, []);
    const idx = rows.findIndex(r => r.id === record.id);
    const entry: WeeklyRecordRow = { ...record, createdAt: Date.now() };
    if (idx >= 0) rows[idx] = entry;
    else rows.push(entry);
    writeJson(RECORDS_FILE, rows);
  },

  delete(id: string) {
    const rows = readJson<WeeklyRecordRow[]>(RECORDS_FILE, []);
    writeJson(RECORDS_FILE, rows.filter(r => r.id !== id));
  },

  saveSeedStats(data: AccumulatedSeedEntry[]) {
    writeJson(SEED_FILE, data);
  },

  getSeedStats(): AccumulatedSeedEntry[] {
    const data = readJson<any[]>(SEED_FILE, []);
    return data.map((s: any) => {
      let migrated = { ...s };
      if (migrated.absenceRuleCount === undefined) {
        const combined = migrated.asRuleCount ?? 0;
        const absCap = Math.min(migrated.absenceCount ?? 0, combined);
        migrated.absenceRuleCount = absCap;
        migrated.substituteRuleCount = combined - absCap;
      }
      if (migrated.lateCount === undefined) migrated.lateCount = 0;
      return migrated as AccumulatedSeedEntry;
    });
  },

  hasSeed(): boolean {
    return fs.existsSync(SEED_FILE);
  },

  getAccumulatedStats(): AccumulatedSeedEntry[] {
    const seed = this.getSeedStats();
    const allRows = readJson<WeeklyRecordRow[]>(RECORDS_FILE, []);

    const rows = allRows.filter(r => r.date >= CHAPTER_START && r.date <= CHAPTER_END);
    if (rows.length === 0) return seed;

    const attMap = new Map<string, {
      weeksRecorded: number; absenceCount: number;
      absenceRuleCount: number; substituteRuleCount: number; lateCount: number;
    }>();

    for (const row of rows) {
      const members: any[] = Array.isArray(row.members) ? row.members : [];
      for (const m of members) {
        const key = `${m.lastName}${m.firstName}`;
        if (!attMap.has(key)) {
          attMap.set(key, { weeksRecorded: 0, absenceCount: 0, absenceRuleCount: 0, substituteRuleCount: 0, lateCount: 0 });
        }
        const a = attMap.get(key)!;
        a.weeksRecorded++;
        if (m.palms === "A" || m.palms === "M") a.absenceCount++;
        if (m.palms === "A") a.absenceRuleCount++;
        if (m.palms === "S") a.substituteRuleCount++;
        if (m.palms === "L") a.lateCount++;
      }
    }

    return seed.map(s => {
      const att = attMap.get(s.memberName);
      if (!att) return { ...s, lateCount: s.lateCount ?? 0 };
      return { ...s, absenceCount: att.absenceCount, absenceRuleCount: att.absenceRuleCount, substituteRuleCount: att.substituteRuleCount, lateCount: att.lateCount };
    });
  },

  getSeedStats_raw() { return readJson<any[]>(SEED_FILE, []); },

  importFromRedGreenExcel(xlsxPath: string): number {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const XLSX = require("xlsx") as typeof import("xlsx");
    const wb = XLSX.readFile(xlsxPath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][];
    const seed: AccumulatedSeedEntry[] = [];
    for (const r of rows.slice(5)) {
      if (typeof r[1] !== "string" || !r[1].trim()) continue;
      if (typeof r[3] !== "number" || r[3] === 0) continue;
      const weeks = r[3] as number;
      seed.push({
        memberName: r[1].trim(),
        weeksRecorded: weeks,
        absenceCount: (r[13] || 0) + (r[15] || 0),
        absenceRuleCount: r[13] || 0,
        substituteRuleCount: r[16] || 0,
        lateCount: 0,
        totalCeu: r[21] || 0,
        totalTransactionValue: r[22] || 0,
        avgVisitorsPerMonth: (r[19] || 0) / weeks * 4,
        avg121PerWeek: (r[20] || 0) / weeks,
        avgRefPerWeek: (r[17] || 0) / weeks,
      });
    }
    this.saveSeedStats(seed);
    return seed.length;
  },
};

// ── 分會目標 ─────────────────────────────────────────────────────────────────
export const goalsDb = {
  get(): unknown | null {
    return readJson<unknown | null>(GOALS_FILE, null);
  },
  save(goals: unknown) {
    writeJson(GOALS_FILE, goals);
  },
};

export default { historyDb, goalsDb };
