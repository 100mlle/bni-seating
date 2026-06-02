import React, { useState, useCallback } from "react";
import * as XLSX from "xlsx";
import { Member, ChapterGoals, PALMS, PALMS_LABEL, memberLightAccurate, memberName, totalReferralsGiven, AccumulatedStats, findAcc } from "../types";
import { defaultCommitteeText, meetingNumberForDate } from "../data";
import {
  Users, Settings, Plus, Trash2, RefreshCw, Upload, ShieldCheck, Target, X, CheckCircle, Folder, FileText, RefreshCcw
} from "lucide-react";

interface MemberEditorProps {
  members: Member[];
  onChangeMembers: (members: Member[]) => void;
  committeeText: string;
  onChangeCommitteeText: (text: string) => void;
  goals: ChapterGoals;
  onChangeGoals: (goals: ChapterGoals) => void | Promise<void>;
  stage: string;
  onChangeStage: (stage: string) => void;
  weekTitle: string;
  onChangeWeekTitle: (title: string) => void;
  accStats: AccumulatedStats[];
}

const PALMS_OPTIONS: PALMS[] = ["P", "A", "L", "M", "S"];

const PALMS_COLOR: Record<PALMS, string> = {
  P: "bg-green-100 text-green-800",
  A: "bg-red-100 text-red-800",
  L: "bg-yellow-100 text-yellow-800",
  M: "bg-orange-100 text-orange-800",
  S: "bg-purple-100 text-purple-800",
};

// ─── CSV 解析工具 ────────────────────────────────────────────────────

type FieldKey = "firstName" | "lastName" | "palms"
  | "attendAbsent" | "attendLate" | "attendMedical" | "attendSubstitute"
  | "referralsGivenInternal" | "referralsGivenExternal"
  | "referralsReceivedInternal" | "referralsReceivedExternal"
  | "visitors" | "oneToOne" | "transactionValue" | "ceu"
  | "category" | "role" | "__ignore__";

const FIELD_OPTIONS: { key: FieldKey; label: string }[] = [
  { key: "__ignore__",              label: "（略過）" },
  { key: "firstName",              label: "名字" },
  { key: "lastName",               label: "姓氏" },
  { key: "palms",                  label: "PALMS (P/A/L/M/S)" },
  { key: "attendAbsent",           label: "缺席 (A)" },
  { key: "attendLate",             label: "遲到 (L)" },
  { key: "attendMedical",          label: "病假 (M)" },
  { key: "attendSubstitute",       label: "替代人 (S)" },
  { key: "referralsGivenInternal",    label: "提供內部引薦" },
  { key: "referralsGivenExternal",    label: "提供外部引薦" },
  { key: "referralsReceivedInternal", label: "收到內部引薦" },
  { key: "referralsReceivedExternal", label: "收到外部引薦" },
  { key: "visitors",               label: "來賓" },
  { key: "oneToOne",               label: "一對一會面" },
  { key: "transactionValue",       label: "交易價值" },
  { key: "ceu",                    label: "教育培訓" },
  { key: "category",               label: "產業別" },
  { key: "role",                   label: "角色" },
];

// 自動猜測欄位對應
const AUTO_MAP: Record<string, FieldKey> = {
  "名字": "firstName", "first": "firstName", "firstname": "firstName",
  "姓氏": "lastName",  "last": "lastName",  "lastname": "lastName",
  "palms": "palms",
  // BNI Connect 多欄位出席格式
  "出席": "__ignore__",  // 出席=1 是 default P，不需對應
  "缺席": "attendAbsent",
  "遲到": "attendLate",
  "病假": "attendMedical",
  "替代人": "attendSubstitute",
  "提供內部引薦": "referralsGivenInternal", "內部引薦": "referralsGivenInternal", "給內": "referralsGivenInternal",
  "提供外部引薦": "referralsGivenExternal", "外部引薦": "referralsGivenExternal", "給外": "referralsGivenExternal",
  "收到內部引薦": "referralsReceivedInternal", "收內": "referralsReceivedInternal",
  "收到外部引薦": "referralsReceivedExternal", "收外": "referralsReceivedExternal",
  "來賓": "visitors", "訪客": "visitors",
  "一對一": "oneToOne", "121": "oneToOne", "一對一會面": "oneToOne",
  "交易價值": "transactionValue", "交易金額": "transactionValue", "成交": "transactionValue",
  "教育培訓": "ceu", "ceu": "ceu", "分會教育單位": "ceu",
  "產業": "category", "產業別": "category",
  "角色": "role",
};

function detectSep(line: string): string {
  return (line.match(/\t/g) || []).length > (line.match(/,/g) || []).length ? "\t" : ",";
}

function parseCSVLines(text: string): string[][] {
  return text
    .split("\n")
    .map(l => l.trim())
    .filter(l => l && !l.startsWith("總數") && !l.startsWith("BNI") && !l.startsWith("來賓合計") && !l.startsWith("來賓\t"))
    .map(l => { const sep = detectSep(l); return l.split(sep).map(c => c.trim()); });
}

function autoGuessMapping(headers: string[]): FieldKey[] {
  return headers.map(h => {
    const key = h.toLowerCase().replace(/\s/g, "");
    return AUTO_MAP[h] || AUTO_MAP[key] || "__ignore__";
  });
}

function buildMembers(rows: string[][], mapping: FieldKey[]): Member[] {
  const results: Member[] = [];
  let id = 1;
  for (const cols of rows) {
    const get = (k: FieldKey): string => {
      const idx = mapping.indexOf(k);
      return idx >= 0 ? (cols[idx] || "") : "";
    };
    const firstName = get("firstName");
    const lastName = get("lastName");
    if (!firstName || firstName === "名字" || firstName === "姓名") continue;
    // 支援兩種格式：單欄 P/A/L/M/S，或 BNI Connect 多欄出席格式
    let palms: PALMS = "P";
    const palmsRaw = get("palms").toUpperCase();
    if (["P", "A", "L", "M", "S"].includes(palmsRaw)) {
      palms = palmsRaw as PALMS;
    } else if (get("attendAbsent") === "1")    { palms = "A"; }
    else if (get("attendLate") === "1")        { palms = "L"; }
    else if (get("attendMedical") === "1")     { palms = "M"; }
    else if (get("attendSubstitute") === "1")  { palms = "S"; }
    results.push({
      id: id++, firstName, lastName,
      category: get("category") || "未填寫",
      role: get("role") || "夥伴會員",
      palms,
      referralsGivenInternal:    parseInt(get("referralsGivenInternal"))    || 0,
      referralsGivenExternal:    parseInt(get("referralsGivenExternal"))    || 0,
      referralsReceivedInternal: parseInt(get("referralsReceivedInternal")) || 0,
      referralsReceivedExternal: parseInt(get("referralsReceivedExternal")) || 0,
      visitors:        parseInt(get("visitors"))        || 0,
      oneToOne:        parseInt(get("oneToOne"))        || 0,
      transactionValue:parseInt(get("transactionValue"))|| 0,
      ceu:             parseInt(get("ceu"))             || 0,
      renewal: "未到期",
    });
  }
  return results;
}

interface FolderFile { name: string; size: number; mtime: string; }

function headerKey(hdrs: string[]): string { return hdrs.slice(0, 8).join("|"); }

function ImportZone({ onImport, onWeekTitle }: { onImport: (members: Member[]) => void; onWeekTitle?: (title: string) => void }) {
  const [dragging, setDragging] = useState(false);
  const [rawText, setRawText] = useState("");
  const [step, setStep] = useState<"idle" | "paste" | "folder" | "mapping" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [folderFiles, setFolderFiles] = useState<FolderFile[]>([]);
  const [folderLoading, setFolderLoading] = useState(false);
  const [loadingFile, setLoadingFile] = useState<string | null>(null);
  const [importedFilename, setImportedFilename] = useState<string>("");
  const [rememberMapping, setRememberMapping] = useState(true);

  // Parsed state
  const [headers, setHeaders] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<FieldKey[]>([]);

  const processText = (text: string) => {
    setError(null);
    const allRows = parseCSVLines(text);
    if (allRows.length === 0) { setError("無法解析，檔案是空的"); return; }

    // BNI Connect PALMS 報告格式：前幾行是說明列，真正的欄位標題含「姓氏」
    // 自動找到含「姓氏」或「名字」的行作為真正的 header
    const headerRowIdx = allRows.findIndex(row =>
      row.some(c => c === "姓氏" || c === "名字" || c.toLowerCase() === "first name" || c.toLowerCase() === "last name")
    );

    let hdrs: string[];
    let rows: string[][];

    if (headerRowIdx >= 0) {
      // 找到 BNI Connect 標準格式的欄位標題列
      hdrs = allRows[headerRowIdx];
      rows = allRows.slice(headerRowIdx + 1);
    } else {
      const firstRow = allRows[0];
      const isHeader = firstRow.some(c => /[一-鿿]/.test(c) || /[a-zA-Z]{3,}/.test(c));
      if (isHeader) {
        hdrs = firstRow;
        rows = allRows.slice(1);
      } else {
        hdrs = firstRow.map((_, i) => `欄${i + 1}`);
        rows = allRows;
      }
    }

    const guessed = autoGuessMapping(hdrs);
    const saved = localStorage.getItem("bni_palms_mapping_" + headerKey(hdrs));
    const finalMapping = saved ? JSON.parse(saved) as FieldKey[] : guessed;
    setHeaders(hdrs);
    setDataRows(rows);
    setMapping(finalMapping);
    setRawText(text);
    setStep("mapping");
  };

  const handleFile = useCallback((file: File) => {
    if (/\.(xlsx|xls)$/i.test(file.name)) {
      const reader = new FileReader();
      reader.onload = e => {
        const wb = XLSX.read(e.target?.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        processText(XLSX.utils.sheet_to_csv(ws, { FS: "\t" }));
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = e => processText(e.target?.result as string ?? "");
      reader.readAsText(file, "utf-8");
    }
  }, []);

  const confirmImport = () => {
    const built = buildMembers(dataRows, mapping);
    if (built.length === 0) { setError("未能解析出任何會員，請確認欄位對應是否正確"); return; }
    if (rememberMapping) {
      localStorage.setItem("bni_palms_mapping_" + headerKey(headers), JSON.stringify(mapping));
    }
    onImport(built);
    // 從檔名中解析日期，自動產生例會標題（格式：DD-MM-YYYY 或 YYYY-MM-DD）
    if (onWeekTitle && importedFilename) {
      const m1 = importedFilename.match(/(\d{2})-(\d{2})-(\d{4})/); // DD-MM-YYYY
      const m2 = importedFilename.match(/(\d{4})-(\d{2})-(\d{2})/); // YYYY-MM-DD
      let isoDate = "";
      if (m1) isoDate = `${m1[3]}-${m1[2]}-${m1[1]}`;
      else if (m2) isoDate = `${m2[1]}-${m2[2]}-${m2[3]}`;
      if (isoDate) {
        const n = meetingNumberForDate(isoDate);
        const mmdd = isoDate.slice(5).replace("-", "/");
        onWeekTitle(`第 ${n} 次例會 ${mmdd}`);
      }
    }
    setStep("done");
    setTimeout(() => { setStep("idle"); setRawText(""); setHeaders([]); setDataRows([]); setImportedFilename(""); }, 2000);
  };

  const reset = () => { setStep("idle"); setError(null); setRawText(""); setHeaders([]); setDataRows([]); };

  const openFolder = async () => {
    setStep("folder");
    setFolderLoading(true);
    try {
      const res = await fetch("/api/weekly-data/files");
      setFolderFiles(await res.json());
    } catch {
      setFolderFiles([]);
    } finally {
      setFolderLoading(false);
    }
  };

  const pickFolderFile = async (filename: string) => {
    setLoadingFile(filename);
    setImportedFilename(filename);
    try {
      const res = await fetch(`/api/weekly-data/files/${encodeURIComponent(filename)}`);
      const { content } = await res.json();
      processText(content);
    } catch {
      setError(`無法讀取 ${filename}`);
    } finally {
      setLoadingFile(null);
    }
  };

  if (step === "done") {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <p className="text-green-600 font-bold flex items-center gap-2">
          <CheckCircle className="w-5 h-5" /> 匯入成功！共 {dataRows.length} 位會員
        </p>
      </div>
    );
  }

  if (step === "mapping") {
    const preview = dataRows.slice(0, 3);
    const missingRequired = !mapping.includes("firstName") || !mapping.includes("lastName");
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-800 text-lg">欄位對應確認</h3>
            {localStorage.getItem("bni_palms_mapping_" + headerKey(headers)) && (
              <button
                onClick={() => {
                  localStorage.removeItem("bni_palms_mapping_" + headerKey(headers));
                  setMapping(autoGuessMapping(headers));
                }}
                className="text-xs text-slate-400 hover:text-rose-600 border border-slate-200 rounded-lg px-2 py-0.5 cursor-pointer"
              >
                清除記憶
              </button>
            )}
          </div>
          <button onClick={reset} className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer">✕ 重新上傳</button>
        </div>
        <p className="text-xs text-slate-500">系統已自動猜測欄位對應，如有誤請手動調整，再點「確認匯入」。</p>

        {/* 欄位對應下拉 */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50">
                {headers.map((h, i) => (
                  <th key={i} className="px-2 py-1.5 border border-slate-200 text-left font-semibold text-slate-600 min-w-[110px]">
                    <div className="text-slate-400 text-[10px] mb-0.5">{h}</div>
                    <select
                      value={mapping[i] || "__ignore__"}
                      onChange={e => {
                        const next = [...mapping];
                        next[i] = e.target.value as FieldKey;
                        setMapping(next);
                      }}
                      className="w-full border border-slate-300 rounded px-1 py-0.5 text-xs focus:border-indigo-500 outline-none cursor-pointer"
                    >
                      {FIELD_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                    </select>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                  {headers.map((_, ci) => (
                    <td key={ci} className={`px-2 py-1 border border-slate-100 text-slate-600 ${mapping[ci] === "__ignore__" ? "opacity-30" : ""}`}>
                      {row[ci] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
              {dataRows.length > 3 && (
                <tr><td colSpan={headers.length} className="px-2 py-1 text-slate-400 text-center">… 還有 {dataRows.length - 3} 筆</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
          <input type="checkbox" checked={rememberMapping} onChange={e => setRememberMapping(e.target.checked)} className="accent-indigo-600" />
          記住這次欄位對應（下次匯入相同格式時自動套用）
        </label>

        {missingRequired && (
          <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">⚠️ 請確認「名字」和「姓氏」欄位已對應</p>
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={confirmImport}
            disabled={missingRequired}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-sm font-bold rounded-xl transition cursor-pointer"
          >
            確認匯入 {dataRows.length} 筆
          </button>
          <button onClick={reset} className="px-4 py-2 bg-slate-100 text-slate-600 text-sm font-bold rounded-xl transition cursor-pointer">
            取消
          </button>
        </div>
      </div>
    );
  }

  if (step === "folder") {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Folder className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-slate-800 text-lg">weekly-data 資料夾</h3>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={openFolder} className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1 cursor-pointer">
              <RefreshCcw className="w-3 h-3" /> 重新整理
            </button>
            <button onClick={reset} className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer">✕ 關閉</button>
          </div>
        </div>

        {folderLoading ? (
          <p className="text-sm text-slate-400 py-4 text-center">讀取中…</p>
        ) : folderFiles.length === 0 ? (
          <div className="py-6 text-center text-slate-400">
            <Folder className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">資料夾是空的</p>
            <p className="text-xs mt-1">請將 Excel / CSV 放入 <code className="bg-slate-100 px-1 rounded">BNI商務平台/weekly-data/</code></p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {folderFiles.map(f => (
              <button
                key={f.name}
                onClick={() => pickFolderFile(f.name)}
                disabled={loadingFile === f.name}
                className="w-full flex items-center gap-3 px-2 py-3 hover:bg-indigo-50 rounded-lg text-left transition cursor-pointer disabled:opacity-50"
              >
                <FileText className="w-5 h-5 text-indigo-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700 truncate">{f.name}</p>
                  <p className="text-xs text-slate-400">
                    {(f.size / 1024).toFixed(1)} KB · {new Date(f.mtime).toLocaleDateString("zh-TW")}
                  </p>
                </div>
                {loadingFile === f.name
                  ? <span className="text-xs text-indigo-500">讀取中…</span>
                  : <span className="text-xs text-indigo-400">匯入 →</span>}
              </button>
            ))}
          </div>
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  if (step === "paste") {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Upload className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-slate-800 text-lg">貼上 BNI Connect 資料</h3>
        </div>
        <textarea
          value={rawText}
          onChange={e => setRawText(e.target.value)}
          className="w-full h-36 p-3 border border-slate-200 rounded-xl text-sm font-mono focus:border-indigo-600 outline-none bg-slate-50"
          placeholder={"名字\t姓氏\tPALMS\t提供內部引薦\t…\n許\t文婉\tP\t2\t…"}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button onClick={() => processText(rawText)} className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition cursor-pointer">
            下一步：確認欄位
          </button>
          <button onClick={reset} className="px-4 py-1.5 bg-slate-100 text-slate-600 text-sm font-bold rounded-xl transition cursor-pointer">取消</button>
        </div>
      </div>
    );
  }

  // idle state
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
        <Upload className="w-5 h-5 text-indigo-600" />
        <h3 className="font-bold text-slate-800 text-lg">匯入 BNI Connect PALMS 資料</h3>
      </div>
      <p className="text-xs text-slate-500">支援 Excel (.xlsx) / CSV / TSV / 貼上文字，自動辨識欄位，格式變動時可手動對應。</p>

      <div className="flex gap-3 flex-wrap">
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          className={`flex-1 min-w-[200px] border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
            dragging ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-indigo-300"
          }`}
          onClick={() => document.getElementById("bni-file-input")?.click()}
        >
          <Upload className="w-6 h-6 text-indigo-400 mx-auto mb-1" />
          <p className="text-sm font-semibold text-slate-600">拖放檔案或點擊上傳</p>
          <p className="text-xs text-slate-400">支援 Excel (.xlsx) / CSV / TSV</p>
          <input id="bni-file-input" type="file" accept=".csv,.tsv,.txt,.xlsx,.xls" className="hidden"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>
        <button
          onClick={() => setStep("paste")}
          className="flex-1 min-w-[200px] border-2 border-dashed border-slate-200 hover:border-indigo-300 rounded-xl p-6 text-center transition cursor-pointer"
        >
          <p className="text-sm font-semibold text-slate-600">貼上文字資料</p>
          <p className="text-xs text-slate-400">從 BNI Connect 表格複製貼上</p>
        </button>
        <button
          onClick={openFolder}
          className="flex-1 min-w-[200px] border-2 border-dashed border-amber-200 hover:border-amber-400 bg-amber-50/40 hover:bg-amber-50 rounded-xl p-6 text-center transition cursor-pointer"
        >
          <Folder className="w-6 h-6 text-amber-400 mx-auto mb-1" />
          <p className="text-sm font-semibold text-slate-600">從資料夾選取</p>
          <p className="text-xs text-slate-400">weekly-data/ 資料夾</p>
        </button>
      </div>
    </div>
  );
}

export default function MemberEditor({
  members, onChangeMembers, committeeText, onChangeCommitteeText,
  goals, onChangeGoals, stage, onChangeStage, weekTitle, onChangeWeekTitle, accStats
}: MemberEditorProps) {

  const [weekDate, setWeekDate] = useState(() => new Date().toISOString().split("T")[0]);

  const handleGoalChange = (field: keyof ChapterGoals, value: number) => {
    onChangeGoals({ ...goals, [field]: value });
  };

  const handleAddMember = () => {
    const newId = members.length > 0 ? Math.max(...members.map(m => m.id)) + 1 : 1;
    onChangeMembers([...members, {
      id: newId, firstName: "新", lastName: "會員", category: "未填寫", role: "夥伴會員",
      palms: "P", referralsGivenInternal: 0, referralsGivenExternal: 0,
      referralsReceivedInternal: 0, referralsReceivedExternal: 0,
      visitors: 0, oneToOne: 0, transactionValue: 0, ceu: 0, renewal: "未到期",
    }]);
  };

  const handleRemoveMember = (id: number) => {
    onChangeMembers(members.filter(m => m.id !== id));
  };

  const updateField = (id: number, field: keyof Member, value: any) => {
    onChangeMembers(members.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const numInput = (id: number, field: keyof Member, value: number) => (
    <input
      type="number" min="0"
      value={value}
      onChange={e => updateField(id, field, Math.max(0, Number(e.target.value)))}
      className="w-14 text-center text-sm font-semibold text-slate-800 border border-slate-200 rounded-lg px-1 py-0.5 focus:border-rose-700 outline-none"
    />
  );

  return (
    <div className="space-y-6" id="member-editor-container">

      {/* BNI Connect Import Zone */}
      <ImportZone
        onImport={(parsed) => {
          if (members.length > 0 && !confirm(`目前已有 ${members.length} 位會員資料，確定要以匯入資料覆蓋嗎？`)) return;
          onChangeMembers(parsed);
        }}
        onWeekTitle={onChangeWeekTitle}
      />

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Basic settings */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Settings className="w-5 h-5 text-rose-700" />
            <h3 className="font-bold text-slate-800 text-lg">簡報設定</h3>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">會後會標題</label>
              <input
                type="text" value={weekTitle}
                onChange={e => onChangeWeekTitle(e.target.value)}
                placeholder="第 1 週｜副主席會後會數據追蹤"
                className="mt-1 block w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:border-rose-700 focus:ring-1 focus:ring-rose-700 outline-none"
              />
              <input
                type="date" value={weekDate}
                onChange={e => {
                  const val = e.target.value;
                  setWeekDate(val);
                  if (val) {
                    const mmdd = val.slice(5).replace("-", "/");
                    onChangeWeekTitle(weekTitle.replace(/\d{1,2}\/\d{1,2}/, "").trim() + " " + mmdd);
                  }
                }}
                className="mt-1 block w-full px-3 py-1.5 border border-slate-200 rounded-xl text-sm focus:border-rose-700 outline-none text-slate-600"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">管理階段</label>
              <select value={stage} onChange={e => onChangeStage(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:border-rose-700 outline-none">
                <option value="stage1">第一階段：只公佈整體數據</option>
                <option value="stage2">第二階段：表揚達標者</option>
                <option value="stage3">第三階段：私下暖心輔導</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right: Chapter Targets */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-slate-800 text-lg">分會營運目標</h3>
              <span className="text-xs text-green-600">✓ 修改後自動儲存</span>
            </div>
            <button onClick={() => {
              if (confirm("確認重設為預設目標？")) onChangeGoals({ memberTarget: 35, visitorTarget: 5, applicationTarget: 2, oneToOneTarget: 60, referralTarget: 30, absenceWarningRate: 15, kpi121PerMember: 1, kpiReferralPerMember: 1, kpiCeuPerMember: 1 });
            }} className="flex items-center gap-1 px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold rounded-xl border border-amber-200 cursor-pointer">
              <RefreshCw className="w-3.5 h-3.5" /> 重設
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "會員人數目標", field: "memberTarget" as keyof ChapterGoals },
              { label: "本週來賓目標", field: "visitorTarget" as keyof ChapterGoals },
              { label: "本週 121 總目標", field: "oneToOneTarget" as keyof ChapterGoals },
              { label: "本週引薦總目標", field: "referralTarget" as keyof ChapterGoals },
              { label: "🟢 個人 121/週", field: "kpi121PerMember" as keyof ChapterGoals },
              { label: "🟢 個人引薦/週", field: "kpiReferralPerMember" as keyof ChapterGoals },
              { label: "🟢 個人培訓次數目標（每6個月）", field: "kpiCeuPerMember" as keyof ChapterGoals },
              { label: "缺席警戒率 (%)", field: "absenceWarningRate" as keyof ChapterGoals },
            ].map(({ label, field }) => (
              <div key={field}>
                <label className="text-xs font-semibold text-slate-500 block">{label}</label>
                <input type="number" min="0" value={goals[field]}
                  onChange={e => handleGoalChange(field, Number(e.target.value))}
                  className="mt-1 block w-full px-3 py-1.5 border border-slate-200 rounded-xl text-sm focus:border-rose-700 outline-none" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Committee & Notes */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <h3 className="font-bold text-slate-800 text-lg flex-1">第十三屆領導團隊 &amp; 委員會名單</h3>
          <button
            onClick={() => { if (confirm("確認重設為第十三屆預設名單？")) onChangeCommitteeText(defaultCommitteeText); }}
            className="flex items-center gap-1 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-200 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> 重設預設
          </button>
        </div>
        <textarea
          value={committeeText}
          onChange={e => onChangeCommitteeText(e.target.value)}
          className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none leading-relaxed"
          style={{ minHeight: "14rem", resize: "vertical" }}
          placeholder="主席：姓名&#10;副主席：姓名&#10;..." />
        <p className="text-[11px] text-slate-400">格式：職位：姓名（多人用「、」分隔）。修改後即時套用至簡報與 LINE 訊息。</p>
      </div>

      {/* Member Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-rose-800" />
            <h3 className="font-bold text-slate-800 text-lg">會員數據明細 ({members.length} 位)</h3>
          </div>
          <button onClick={handleAddMember}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-800 hover:bg-rose-900 text-white text-sm font-bold rounded-xl cursor-pointer">
            <Plus className="w-4 h-4" /> 新增夥伴
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-separate border-spacing-0">
            <thead>
              {/* ── 群組標題列 ── */}
              <tr className="text-[11px] font-bold">
                <th colSpan={3} className="px-3 pt-3 pb-1 text-center text-slate-400 bg-slate-50 border-b border-slate-200">
                  👤 會員資訊
                </th>
                <th className="px-3 pt-3 pb-1 text-center text-indigo-500 bg-indigo-50 border-b border-indigo-100">
                  出席
                </th>
                <th className="px-3 pt-3 pb-1 text-center text-violet-500 bg-violet-50 border-b border-violet-100">
                  121
                </th>
                <th colSpan={2} className="px-3 pt-3 pb-1 text-center text-rose-500 bg-rose-50 border-b border-rose-100">
                  📋 引薦（內部 / 外部）
                </th>
                <th className="px-3 pt-3 pb-1 text-center text-amber-500 bg-amber-50 border-b border-amber-100">
                  來賓
                </th>
                <th colSpan={2} className="px-3 pt-3 pb-1 text-center text-teal-500 bg-teal-50 border-b border-teal-100">
                  💰 業務成效
                </th>
                <th className="px-3 pt-3 pb-1 text-center text-slate-400 bg-slate-50 border-b border-slate-200">
                  續約
                </th>
                <th className="bg-white border-b border-slate-200" />
              </tr>
              {/* ── 欄位名稱列 ── */}
              <tr className="text-xs font-semibold">
                <th className="px-3 py-2 text-center min-w-[60px] bg-slate-50 text-slate-500 border-b-2 border-slate-200">KPI</th>
                <th className="px-3 py-2 min-w-[116px] bg-slate-50 text-slate-500 border-b-2 border-slate-200">姓名</th>
                <th className="px-3 py-2 min-w-[96px] bg-slate-50 text-slate-500 border-b-2 border-slate-200">產業</th>
                <th className="px-3 py-2 text-center min-w-[92px] bg-indigo-50 text-indigo-600 border-b-2 border-indigo-200">PALMS</th>
                <th className="px-3 py-2 text-center min-w-[56px] bg-violet-50 text-violet-600 border-b-2 border-violet-200">次</th>
                <th className="px-3 py-2 text-center min-w-[108px] bg-rose-50 text-rose-600 border-b-2 border-rose-200">
                  給出<br/><span className="font-normal text-rose-300 text-[10px]">內 ／ 外</span>
                </th>
                <th className="px-3 py-2 text-center min-w-[108px] bg-rose-50 text-rose-600 border-b-2 border-rose-200">
                  收到<br/><span className="font-normal text-rose-300 text-[10px]">內 ／ 外</span>
                </th>
                <th className="px-3 py-2 text-center min-w-[56px] bg-amber-50 text-amber-600 border-b-2 border-amber-200">人</th>
                <th className="px-3 py-2 text-center min-w-[88px] bg-teal-50 text-teal-600 border-b-2 border-teal-200">交易值</th>
                <th className="px-3 py-2 text-center min-w-[56px] bg-teal-50 text-teal-600 border-b-2 border-teal-200">CEU</th>
                <th className="px-3 py-2 text-center min-w-[88px] bg-slate-50 text-slate-500 border-b-2 border-slate-200">狀態</th>
                <th className="px-3 py-2 text-center min-w-[40px] bg-white text-slate-300 border-b-2 border-slate-200"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-6 py-12 text-center text-slate-400 text-sm">
                    請使用上方「匯入 BNI Connect PALMS 資料」或點「新增夥伴」開始
                  </td>
                </tr>
              ) : (
                members.map(m => {
                  const light = memberLightAccurate(m, findAcc(m, accStats));
                  const lightUI = light === "green"
                    ? { label: "🟢 綠", cls: "text-green-700 bg-green-50" }
                    : light === "yellow"
                    ? { label: "🟡 黃", cls: "text-amber-700 bg-amber-50" }
                    : light === "red"
                    ? { label: "🔴 紅", cls: "text-rose-700 bg-rose-50" }
                    : { label: "⚫ 黑", cls: "text-gray-700 bg-gray-100" };

                  return (
                    <tr key={m.id} className="group transition-colors">
                      {/* KPI 燈號 */}
                      <td className="px-3 py-2.5 text-center bg-white group-hover:bg-slate-50 transition-colors">
                        <span className={`inline-flex px-1.5 py-0.5 rounded-full text-xs font-bold ${lightUI.cls}`}>
                          {lightUI.label}
                        </span>
                      </td>
                      {/* 姓名 */}
                      <td className="px-3 py-2.5 bg-white group-hover:bg-slate-50 transition-colors">
                        <div className="inline-flex items-center border border-slate-200 rounded-lg overflow-hidden focus-within:border-rose-500 focus-within:ring-1 focus-within:ring-rose-300 transition-all bg-white">
                          <input
                            value={m.lastName}
                            onChange={e => updateField(m.id, "lastName", e.target.value)}
                            placeholder="姓"
                            className="w-9 border-0 border-r border-slate-200 px-1 py-1 text-sm text-center text-slate-700 font-medium outline-none bg-slate-50"
                          />
                          <input
                            value={m.firstName}
                            onChange={e => updateField(m.id, "firstName", e.target.value)}
                            placeholder="名字"
                            className="w-[68px] border-0 px-1.5 py-1 text-sm text-slate-700 outline-none bg-white"
                          />
                        </div>
                      </td>
                      {/* 產業 */}
                      <td className="px-3 py-2.5 bg-white group-hover:bg-slate-50 transition-colors">
                        <input value={m.category} onChange={e => updateField(m.id, "category", e.target.value)}
                          className="w-20 border border-slate-200 rounded px-1 py-0.5 text-sm focus:border-rose-700 outline-none bg-transparent" />
                      </td>
                      {/* PALMS */}
                      <td className="px-3 py-2.5 text-center bg-indigo-50/40 group-hover:bg-indigo-100/60 transition-colors">
                        <select value={m.palms} onChange={e => updateField(m.id, "palms", e.target.value as PALMS)}
                          className={`px-1.5 py-0.5 rounded-lg text-xs font-bold border-0 cursor-pointer ${PALMS_COLOR[m.palms]}`}>
                          {PALMS_OPTIONS.map(p => (
                            <option key={p} value={p}>{p} {PALMS_LABEL[p]}</option>
                          ))}
                        </select>
                      </td>
                      {/* 一對一 */}
                      <td className="px-3 py-2.5 text-center bg-violet-50/40 group-hover:bg-violet-100/60 transition-colors">
                        {numInput(m.id, "oneToOne", m.oneToOne)}
                      </td>
                      {/* 給引薦：內/外 合欄 */}
                      <td className="px-3 py-2.5 text-center bg-rose-50/40 group-hover:bg-rose-100/60 transition-colors">
                        <div className="flex items-center gap-1 justify-center">
                          {numInput(m.id, "referralsGivenInternal", m.referralsGivenInternal)}
                          <span className="text-rose-200 text-xs font-light">/</span>
                          {numInput(m.id, "referralsGivenExternal", m.referralsGivenExternal)}
                        </div>
                      </td>
                      {/* 收引薦：內/外 合欄 */}
                      <td className="px-3 py-2.5 text-center bg-rose-50/40 group-hover:bg-rose-100/60 transition-colors">
                        <div className="flex items-center gap-1 justify-center">
                          {numInput(m.id, "referralsReceivedInternal", m.referralsReceivedInternal)}
                          <span className="text-rose-200 text-xs font-light">/</span>
                          {numInput(m.id, "referralsReceivedExternal", m.referralsReceivedExternal)}
                        </div>
                      </td>
                      {/* 來賓 */}
                      <td className="px-3 py-2.5 text-center bg-amber-50/40 group-hover:bg-amber-100/60 transition-colors">
                        {numInput(m.id, "visitors", m.visitors)}
                      </td>
                      {/* 交易價值 */}
                      <td className="px-3 py-2.5 text-center bg-teal-50/40 group-hover:bg-teal-100/60 transition-colors">
                        <input type="number" min="0" value={m.transactionValue}
                          onChange={e => updateField(m.id, "transactionValue", Math.max(0, Number(e.target.value)))}
                          className="w-20 text-center text-sm font-semibold text-slate-800 border border-slate-200 rounded-lg px-1 py-0.5 focus:border-teal-500 outline-none bg-transparent" />
                      </td>
                      {/* 培訓 */}
                      <td className="px-3 py-2.5 text-center bg-teal-50/40 group-hover:bg-teal-100/60 transition-colors">
                        {numInput(m.id, "ceu", m.ceu)}
                      </td>
                      {/* 續約 */}
                      <td className="px-3 py-2.5 bg-slate-50/60 group-hover:bg-slate-100 transition-colors">
                        <select value={m.renewal} onChange={e => updateField(m.id, "renewal", e.target.value)}
                          className="text-xs border border-slate-200 rounded-lg px-1.5 py-0.5 bg-white focus:border-rose-700 outline-none w-full cursor-pointer">
                          <option value="已續約">✅ 已續約</option>
                          <option value="未到期">🕐 未到期</option>
                          <option value="待追蹤">⚠️ 待追蹤</option>
                          <option value="需要關懷">🆘 需要關懷</option>
                        </select>
                        <input
                          type="date"
                          value={m.renewalDate || ""}
                          onChange={e => updateField(m.id, "renewalDate", e.target.value || undefined)}
                          title="到期日"
                          className="mt-1 text-[10px] border border-slate-200 rounded px-1 py-0.5 bg-white focus:border-rose-500 outline-none w-full text-slate-500 cursor-pointer"
                        />
                      </td>
                      {/* 刪除 */}
                      <td className="px-3 py-2.5 text-center bg-white group-hover:bg-slate-50 transition-colors">
                        <button onClick={() => handleRemoveMember(m.id)}
                          className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
