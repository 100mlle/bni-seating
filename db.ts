import Database from "better-sqlite3";
import path from "path";

const CHAPTER_START = "2026-04-10";
const CHAPTER_END   = "2026-09-30";

const DATA_DIR = process.env.DATA_DIR || process.cwd();
const DB_PATH = path.join(DATA_DIR, "bni_data.db");
const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS weekly_records (
    id TEXT PRIMARY KEY,
    week_title TEXT NOT NULL,
    date TEXT NOT NULL,
    members TEXT NOT NULL,
    goals TEXT NOT NULL,
    committee_text TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
  );
  CREATE TABLE IF NOT EXISTS accumulated_seed (
    id INTEGER PRIMARY KEY DEFAULT 1,
    data TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
  );
  CREATE TABLE IF NOT EXISTS chapter_goals (
    id INTEGER PRIMARY KEY DEFAULT 1,
    data TEXT NOT NULL,
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
  )
`);

export interface WeeklyRecordRow {
  id: string;
  weekTitle: string;
  date: string;
  members: string;
  goals: string;
  committeeText: string;
}

export interface AccumulatedSeedEntry {
  memberName: string;
  weeksRecorded: number;
  absenceCount: number;
  absenceRuleCount: number;    // A 缺席（計入6個月規定）
  substituteRuleCount: number; // S 代理人（計入6個月規定）
  lateCount: number;           // L 遲到（每3次=1次缺席）
  totalCeu: number;
  totalTransactionValue: number;
  avgVisitorsPerMonth: number;
  avg121PerWeek: number;
  avgRefPerWeek: number;
}

export const historyDb = {
  getAll() {
    const rows = db.prepare(
      "SELECT * FROM weekly_records ORDER BY created_at DESC"
    ).all() as any[];
    return rows.map(r => ({
      id: r.id,
      weekTitle: r.week_title,
      date: r.date,
      members: JSON.parse(r.members),
      goals: JSON.parse(r.goals),
      committeeText: r.committee_text,
    }));
  },

  save(record: { id: string; weekTitle: string; date: string; members: unknown; goals: unknown; committeeText: string }) {
    db.prepare(`
      INSERT OR REPLACE INTO weekly_records
        (id, week_title, date, members, goals, committee_text)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      record.id,
      record.weekTitle,
      record.date,
      JSON.stringify(record.members),
      JSON.stringify(record.goals),
      record.committeeText
    );
  },

  delete(id: string) {
    db.prepare("DELETE FROM weekly_records WHERE id = ?").run(id);
  },

  saveSeedStats(data: AccumulatedSeedEntry[]) {
    db.prepare("INSERT OR REPLACE INTO accumulated_seed (id, data) VALUES (1, ?)").run(JSON.stringify(data));
  },

  getSeedStats(): AccumulatedSeedEntry[] {
    const row = db.prepare("SELECT data FROM accumulated_seed WHERE id = 1").get() as any;
    if (!row) return [];
    const data = JSON.parse(row.data);
    // Migrate old seed data: handle missing fields
    return data.map((s: any) => {
      let migrated = { ...s };
      // Migrate asRuleCount → absenceRuleCount + substituteRuleCount
      if (migrated.absenceRuleCount === undefined) {
        const combined = migrated.asRuleCount ?? 0;
        const absCap = Math.min(migrated.absenceCount ?? 0, combined);
        migrated.absenceRuleCount = absCap;
        migrated.substituteRuleCount = combined - absCap;
      }
      // Default lateCount if missing
      if (migrated.lateCount === undefined) migrated.lateCount = 0;
      return migrated;
    });
  },

  hasSeed(): boolean {
    const row = db.prepare("SELECT id FROM accumulated_seed WHERE id = 1").get();
    return !!row;
  },

  // 燈號積分：出缺席從週記錄累積；CEU/引薦/來賓/121/交易金額從官方月報 seed
  getAccumulatedStats(): AccumulatedSeedEntry[] {
    const seed = this.getSeedStats();

    const rows = db.prepare(
      "SELECT members FROM weekly_records WHERE date >= ? AND date <= ? ORDER BY date ASC"
    ).all(CHAPTER_START, CHAPTER_END) as any[];

    if (rows.length === 0) return seed;

    // 從週記錄累積出缺席（含遲到）
    const attMap = new Map<string, {
      weeksRecorded: number;
      absenceCount: number;
      absenceRuleCount: number;
      substituteRuleCount: number;
      lateCount: number;
    }>();
    for (const row of rows) {
      const members: any[] = JSON.parse(row.members);
      for (const m of members) {
        const name = `${m.firstName}${m.lastName}`;
        // BNI Connect 欄位：lastName 是姓，firstName 是名
        const altName = `${m.lastName}${m.firstName}`;
        const key = altName || name;
        if (!attMap.has(key)) {
          attMap.set(key, { weeksRecorded: 0, absenceCount: 0, absenceRuleCount: 0, substituteRuleCount: 0, lateCount: 0 });
        }
        const a = attMap.get(key)!;
        a.weeksRecorded++;
        if (m.palms === "A" || m.palms === "M") a.absenceCount++;
        if (m.palms === "A") a.absenceRuleCount++;
        if (m.palms === "S") a.substituteRuleCount++;
        if (m.palms === "L") a.lateCount++;            // 遲到累計
      }
    }

    // 合併：出缺席用週記錄，其餘用 seed
    return seed.map(s => {
      const att = attMap.get(s.memberName);
      if (!att) return { ...s, lateCount: s.lateCount ?? 0 };
      return {
        ...s,
        absenceCount: att.absenceCount,
        absenceRuleCount: att.absenceRuleCount,
        substituteRuleCount: att.substituteRuleCount,
        lateCount: att.lateCount,
      };
    });
  },

  // 從官方紅綠燈 Excel 匯入並取代 seed 資料
  importFromRedGreenExcel(xlsxPath: string): number {
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
        lateCount: 0,  // 官方 Excel 不含遲到資料，從週記錄累積
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

export const goalsDb = {
  get(): unknown | null {
    const row = db.prepare("SELECT data FROM chapter_goals WHERE id = 1").get() as any;
    return row ? JSON.parse(row.data) : null;
  },

  save(goals: unknown) {
    db.prepare(
      "INSERT OR REPLACE INTO chapter_goals (id, data, updated_at) VALUES (1, ?, strftime('%s', 'now'))"
    ).run(JSON.stringify(goals));
  },
};

export default db;
