import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import XLSX from "xlsx";
import { createServer as createViteServer } from "vite";
import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";
import { historyDb, goalsDb } from "./db";

dotenv.config();

const DATA_DIR = process.env.DATA_DIR || process.cwd();
const WEEKLY_DATA_DIR = path.join(DATA_DIR, "weekly-data");
const HOME_DIR = process.env.HOME || process.env.USERPROFILE || "";

// ── 允許匯入紅綠燈 Excel 的安全目錄白名單 ──────────────────────────
const SAFE_IMPORT_DIRS = [
  WEEKLY_DATA_DIR,
  path.join(HOME_DIR, "Downloads"),
  path.join(HOME_DIR, "Desktop"),
].map(d => path.resolve(d));

function isSafeImportPath(filepath: string): boolean {
  const resolved = path.resolve(filepath);
  return SAFE_IMPORT_DIRS.some(safe => resolved.startsWith(safe + path.sep) || resolved === safe);
}

const app = express();
const PORT = parseInt(process.env.PORT || "3000");

app.use(express.json({ limit: "1mb" }));

// ── 簡易 Token 認證（選用）──────────────────────────────────────────
// 在 .env 設定 ACCESS_TOKEN=你的密碼 即可啟用
// 啟用後所有寫入 API 需帶 Authorization: Bearer <token>
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!ACCESS_TOKEN) return next(); // 未設定則不啟用
  const auth = req.headers["authorization"];
  if (!auth || auth !== `Bearer ${ACCESS_TOKEN}`) {
    return res.status(401).json({ error: "未授權" });
  }
  next();
}

// ── AI 分析速率限制（每分鐘最多 5 次）──────────────────────────────
const aiCallTimestamps: number[] = [];
function aiRateLimit(req: Request, res: Response, next: NextFunction) {
  const now = Date.now();
  const oneMinuteAgo = now - 60_000;
  // 清除一分鐘前的記錄
  while (aiCallTimestamps.length && aiCallTimestamps[0] < oneMinuteAgo) {
    aiCallTimestamps.shift();
  }
  if (aiCallTimestamps.length >= 5) {
    return res.status(429).json({ success: false, error: "請求過於頻繁，請稍後再試" });
  }
  aiCallTimestamps.push(now);
  next();
}

// ── 統一錯誤回應（不洩漏內部訊息）──────────────────────────────────
function serverError(res: Response, e: unknown, userMsg = "伺服器錯誤") {
  console.error("[BNI Server Error]", e);
  res.status(500).json({ error: userMsg });
}

// ── AI 分析 ──────────────────────────────────────────────────────────
app.post("/api/analyze-kpi", aiRateLimit, async (req, res) => {
  try {
    const { weekTitle, stage, committeeText, goals, members, summary } = req.body;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey.trim() === "" || apiKey === "YOUR_ANTHROPIC_API_KEY") {
      return res.status(200).json({
        success: false,
        api_key_missing: true,
        message: "請在 .env 檔案中設定 ANTHROPIC_API_KEY",
      });
    }

    const client = new Anthropic({ apiKey });

    const prompt = `你是一位 BNI 副主席與分會成長教練專家。請根據以下分會本週 PALMS 數據，產生一份完整的會後會分析報告。

【分會基本資訊】
- 週次標題：${weekTitle}
- 管理階段：${stage}
- 委員會幹部：${committeeText}

【本週目標 vs 實際】
- 會員總數：${summary.memberCount} 人
- 來賓：${summary.visitors} 人（目標 ${goals.visitorTarget}）
- 121 一對一：${summary.oneToOne} 次（目標 ${goals.oneToOneTarget}）
- 提供引薦（內部+外部）：${summary.referralsGiven} 張（目標 ${goals.referralTarget}）
- 缺席（A）：${summary.absentCount} 人
- 病假（M）：${summary.medicalCount} 人
- 代理人（S）：${summary.substituteCount} 人
- 遲到（L）：${summary.lateCount} 人
- 總交易價值：NT$${summary.totalTransactionValue?.toLocaleString()}
- 總 CEU：${summary.totalCeu} 單位
- 缺席率：${summary.absenceRate}%

【各會員詳細數據】
${JSON.stringify(members, null, 2)}

【KPI 個人標準】
- 個人每週 121 門檻：${goals.kpi121PerMember} 次
- 個人每週引薦門檻：${goals.kpiReferralPerMember} 張
- 個人每週 CEU 門檻：${goals.kpiCeuPerMember} 單位
- 六個月 A+S 不超過 3 次

請用繁體中文回答，遵循 BNI「公開表揚、私下輔導、數字非責備」原則。
必須嚴格以 JSON 格式回覆，包含以下欄位：
{
  "chapterHealthScore": <0-100的整數>,
  "executiveSummary": "<本週分會綜合診斷，200字以內>",
  "coachingAdvice": [
    {
      "memberName": "<姓名>",
      "category": "<產業別>",
      "issue": "<問題指標>",
      "actionPlan": "<暖心私下輔導建議，具體可行>"
    }
  ],
  "powerTeamTraction": "<Power Team 產業協同建言>",
  "slideSpeakingNotes": ["<投影片1講稿>", "...共12個，每個150字以內"],
  "actionItems": ["<行動1>", "<行動2>", "<行動3>"]
}`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const textContent = message.content.find(c => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("Claude 未回傳文字內容");
    }

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("無法解析 Claude 回傳的 JSON");
    const parsedData = JSON.parse(jsonMatch[0]);

    return res.json({ success: true, api_key_missing: false, data: parsedData });

  } catch (error: any) {
    return res.status(500).json({ success: false, error: "AI 分析失敗，請稍後再試" });
  }
});

// ── 分會目標 ─────────────────────────────────────────────────────────
app.get("/api/goals", (_req, res) => {
  try {
    res.json(goalsDb.get() ?? null);
  } catch (e) { serverError(res, e); }
});

app.post("/api/goals", requireAuth, (req, res) => {
  try {
    goalsDb.save(req.body);
    res.json({ ok: true });
  } catch (e) { serverError(res, e); }
});

// ── 歷史週次 ─────────────────────────────────────────────────────────
app.get("/api/history", (_req, res) => {
  try {
    res.json(historyDb.getAll());
  } catch (e) { serverError(res, e); }
});

app.post("/api/history", requireAuth, (req, res) => {
  try {
    historyDb.save(req.body);
    res.json({ ok: true });
  } catch (e) { serverError(res, e); }
});

app.get("/api/history/accumulated", (_req, res) => {
  try {
    res.json(historyDb.getAccumulatedStats());
  } catch (e) { serverError(res, e); }
});

app.get("/api/history/trend", (req, res) => {
  try {
    // 修復：驗證 weeks 為正整數，防止 NaN / 負數
    const raw = parseInt(String(req.query.weeks || "8"), 10);
    const weeks = (!isNaN(raw) && raw > 0) ? Math.min(raw, 26) : 8;
    const records = historyDb.getAll().slice(0, weeks).reverse();
    res.json(records.map(r => ({
      date: r.date,
      weekTitle: r.weekTitle,
      members: r.members,
    })));
  } catch (e) { serverError(res, e); }
});

app.post("/api/history/accumulated/seed", requireAuth, (req, res) => {
  try {
    historyDb.saveSeedStats(req.body);
    res.json({ ok: true });
  } catch (e) { serverError(res, e); }
});

app.delete("/api/history/:id", requireAuth, (req, res) => {
  try {
    // 驗證 id 格式（week-{timestamp}）
    const id = req.params.id;
    if (!/^week-\d+$/.test(id)) {
      return res.status(400).json({ error: "無效的記錄 ID" });
    }
    historyDb.delete(id);
    res.json({ ok: true });
  } catch (e) { serverError(res, e); }
});

// ── 匯出備份 ─────────────────────────────────────────────────────────
app.get("/api/export", requireAuth, (_req, res) => {
  try {
    const exportData = {
      exportedAt: new Date().toISOString(),
      version: "1.0",
      records: historyDb.getAll(),
      accumulatedSeed: historyDb.getSeedStats(),
      goals: goalsDb.get(),
    };
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Disposition", `attachment; filename="BNI_長溙_備份_${date}.json"`);
    res.setHeader("Content-Type", "application/json");
    res.json(exportData);
  } catch (e) { serverError(res, e); }
});

// ── 官方紅綠燈 Excel 匯入 ─────────────────────────────────────────────
app.post("/api/redgreen/import", requireAuth, (req, res) => {
  try {
    const { filepath } = req.body as { filepath: string };
    if (!filepath || typeof filepath !== "string") {
      return res.status(400).json({ error: "請提供檔案路徑" });
    }
    // 安全檢查：路徑必須在白名單目錄內
    if (!isSafeImportPath(filepath)) {
      return res.status(403).json({ error: "不允許的檔案路徑，請將檔案放到 Downloads 或 weekly-data 目錄" });
    }
    // 副檔名必須是 xlsx/xls
    if (!/\.(xlsx|xls)$/i.test(filepath)) {
      return res.status(400).json({ error: "只接受 .xlsx 或 .xls 檔案" });
    }
    if (!fs.existsSync(filepath)) {
      return res.status(400).json({ error: "找不到檔案" });
    }
    const count = historyDb.importFromRedGreenExcel(filepath);
    res.json({ success: true, count });
  } catch (e) { serverError(res, e, "匯入失敗"); }
});

// ── weekly-data 資料夾 ────────────────────────────────────────────────
app.get("/api/weekly-data/files", (_req, res) => {
  try {
    if (!fs.existsSync(WEEKLY_DATA_DIR)) fs.mkdirSync(WEEKLY_DATA_DIR, { recursive: true });
    const files = fs.readdirSync(WEEKLY_DATA_DIR)
      .filter(f => /\.(csv|tsv|txt|xlsx|xls)$/i.test(f))
      .map(f => {
        const stat = fs.statSync(path.join(WEEKLY_DATA_DIR, f));
        return { name: f, size: stat.size, mtime: stat.mtime.toISOString() };
      })
      .sort((a, b) => b.mtime.localeCompare(a.mtime));
    res.json(files);
  } catch (e) { serverError(res, e); }
});

app.get("/api/weekly-data/files/:filename", (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    // 確認解析後路徑確實在 WEEKLY_DATA_DIR 內（防止路徑穿越）
    const filepath = path.resolve(WEEKLY_DATA_DIR, filename);
    if (!filepath.startsWith(path.resolve(WEEKLY_DATA_DIR) + path.sep)) {
      return res.status(403).json({ error: "不允許的路徑" });
    }
    if (!fs.existsSync(filepath)) return res.status(404).json({ error: "找不到檔案" });

    let content: string;
    if (/\.(xlsx|xls)$/i.test(filename)) {
      const wb = XLSX.readFile(filepath);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_csv(ws, { FS: "\t" });
      // BNI Connect PALMS 報告格式：找到含「姓氏」的真正欄位標題行，略去前置說明列
      const lines = raw.split("\n");
      const headerIdx = lines.findIndex(l => {
        const cols = l.split("\t").map(c => c.trim());
        return cols.includes("姓氏") || cols.includes("名字");
      });
      content = headerIdx >= 0 ? lines.slice(headerIdx).join("\n") : raw;
    } else {
      content = fs.readFileSync(filepath, "utf-8");
    }
    res.json({ name: filename, content });
  } catch (e) { serverError(res, e, "讀取檔案失敗"); }
});

// ── Seed 初始化 ───────────────────────────────────────────────────────
function seedHistoricalDataIfNeeded() {
  if (historyDb.hasSeed()) return;
  const raw = [
    ["陳宜寧",  22, 0, 0, 20, 427383,   11,  88, 120],
    ["許文婉",  22, 0, 1, 19, 1537494,   7,  55,  71],
    ["劉峻嘉",  22, 0, 0, 26, 1293826,   6, 102, 111],
    ["黃芯慧",  22, 0, 0, 43,   79287,   6, 111, 106],
    ["簡廷桓",  22, 1, 1, 18, 2247454,   5,  75, 105],
    ["曾郁婷",  22, 0, 1, 10,  823296,   2,  67,  54],
    ["周宥達",  22, 0, 3, 19, 1224181,   1,  49,  48],
    ["王湘慈",  22, 0, 2, 20,  890485,   0,  47,  50],
    ["李惠暄",  22, 0, 2, 18,  421910,   3,  57,  61],
    ["許祥泰",  22, 0, 0, 18,  501386,   2,  85,  94],
    ["廖翊如",  22, 0, 1, 28,  477012,   2,  63, 152],
    ["陳政華",  22, 0, 0, 30,  105765,   3,  71,  59],
    ["崔永疇",  22, 0, 0,  6,    7353,   3,  58,  35],
    ["劉兆矩",  22, 0, 0, 13,   21880,   3,  62,  63],
    ["劉家豪",  22, 0, 0, 36,  158711,   2,  93,  53],
    ["林彥合",  22, 0, 0, 34,  148889,   1,  88,  55],
    ["程韋銘",  22, 0, 1, 41,   27535,   1, 145,  75],
    ["劉洛安",  22, 0, 1, 14,  213220,   1,  64,  51],
    ["李冠樺",  21, 0, 1, 33,   38965,   0,  66,  47],
    ["譚宇芩",  22, 2, 3, 21,  847789,   0,  89,  46],
    ["陳裔潔",  14, 0, 1,  7,  747380,   2,  12,  21],
    ["黃信樺",  22, 1, 1, 26,   50434,   0,  55, 100],
    ["李孟涵",   6, 0, 0, 10,   25195,   0,   2,  14],
    ["楊尚恩",  22, 2, 4,  0, 6162106,   0,  56,  31],
    ["周昆胤",  22, 3, 4,  7,  425791,   0,  43,  43],
    ["洪瑋君",  22, 3, 5,  3,  888260,   0,  28,  38],
  ] as const;

  const seed = raw.map(([memberName, weeksRecorded, absenceCount, asRuleCount, totalCeu, totalTransactionValue, totalVisitors, total121, totalRef]) => {
    const wk = weeksRecorded as number;
    const abs = absenceCount as number;
    const combined = asRuleCount as number;
    const absRule = Math.min(abs, combined);
    const subRule = combined - absRule;
    return {
      memberName: memberName as string,
      weeksRecorded: wk,
      absenceCount: abs,
      absenceRuleCount: absRule,
      substituteRuleCount: subRule,
      lateCount: 0,  // 歷史 seed 無遲到資料，從本屆週記錄累積
      totalCeu: totalCeu as number,
      totalTransactionValue: totalTransactionValue as number,
      avgVisitorsPerMonth: wk > 0 ? ((totalVisitors as number) / wk) * 4 : 0,
      avg121PerWeek: wk > 0 ? (total121 as number) / wk : 0,
      avgRefPerWeek: wk > 0 ? (totalRef as number) / wk : 0,
    };
  });

  historyDb.saveSeedStats(seed);
  console.log(`✅ 已載入 ${seed.length} 位會員的 6 個月歷史 seed 資料`);
}

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    // 明確的 HTML fallback（Vite middleware mode 需要）
    app.get("*", async (req, res, next) => {
      try {
        const template = fs.readFileSync(path.resolve("index.html"), "utf-8");
        const html = await vite.transformIndexHtml(req.url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(html);
      } catch (e) {
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  seedHistoricalDataIfNeeded();

  // Railway 需要監聽 0.0.0.0；本機開發維持 127.0.0.1
  const host = process.env.SERVER_HOST || (process.env.RAILWAY_ENVIRONMENT ? "0.0.0.0" : "127.0.0.1");
  app.listen(PORT, host, () => {
    console.log(`✅ BNI 商務平台啟動：http://localhost:${PORT}`);
    if (ACCESS_TOKEN) {
      console.log(`🔒 Token 認證已啟用`);
    }
  });
}

startServer();
