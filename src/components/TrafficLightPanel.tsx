import React, { useState, useEffect, useCallback } from "react";
import {
  Member, AccumulatedStats, memberName, memberLightAccurate, memberScoreAccurate,
  findAcc, computePathToGreen, computeScoreBreakdown, effectiveAbsenceCount, PathToGreen
} from "../types";
import { ChapterGoals } from "../types";
import { getCurrentTerm, ALL_TERMS } from "../data";
import {
  CheckCircle2, Save, Trash2, ChevronDown, ChevronUp, Target, TrendingUp,
  CalendarDays, Settings, Info
} from "lucide-react";

interface Props {
  members: Member[];
  accStats: AccumulatedStats[];
  weekTitle: string;
  goals: ChapterGoals;
  stage: string;
  onStageChange: (s: string) => void;
}

type LightColor = "green" | "yellow" | "red" | "black";

const LIGHT_CONFIG: Record<LightColor, { label: string; bg: string; border: string; dot: string; text: string }> = {
  green:  { label: "綠燈", bg: "bg-green-50",  border: "border-green-200", dot: "bg-green-500",  text: "text-green-800" },
  yellow: { label: "黃燈", bg: "bg-yellow-50", border: "border-yellow-200", dot: "bg-yellow-400", text: "text-yellow-800" },
  red:    { label: "紅燈", bg: "bg-red-50",    border: "border-red-200",   dot: "bg-red-500",    text: "text-red-800" },
  black:  { label: "暗燈", bg: "bg-slate-100", border: "border-slate-300", dot: "bg-slate-600",  text: "text-slate-700" },
};

const SCORE_THRESHOLDS = [
  { min: 70,  max: 100, color: "green" as LightColor,  label: "綠燈 70–100" },
  { min: 50,  max: 69,  color: "yellow" as LightColor, label: "黃燈 50–69" },
  { min: 30,  max: 49,  color: "red" as LightColor,    label: "紅燈 30–49" },
  { min: 0,   max: 29,  color: "black" as LightColor,  label: "暗燈 0–29" },
];

function LightDot({ color, size = "md" }: { color: LightColor; size?: "sm" | "md" | "lg" }) {
  const s = size === "sm" ? "w-2.5 h-2.5" : size === "lg" ? "w-5 h-5" : "w-3.5 h-3.5";
  return <span className={`inline-block rounded-full ${s} ${LIGHT_CONFIG[color].dot} shadow-sm`} />;
}

function ScoreBar({ score, max = 100 }: { score: number; max?: number }) {
  const pct = Math.min(100, Math.round((score / max) * 100));
  const color = score >= 70 ? "bg-green-500" : score >= 50 ? "bg-yellow-400" : score >= 30 ? "bg-red-500" : "bg-slate-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold w-7 text-right text-slate-600">{score}</span>
    </div>
  );
}

interface MonthlyLight {
  id: string;
  month: string;
  termId: string;
  termName: string;
  weekTitle: string;
  memberLights: Array<{ name: string; score: number; light: string; attScore: number; refScore: number; otoScore: number; visScore: number; ceuScore: number; tvScore: number }>;
  savedAt: number;
}

const STAGE_OPTIONS = [
  { value: "stage1", label: "第一階段：只公佈整體數據", desc: "公開整體KPI，不點名個人" },
  { value: "stage2", label: "第二階段：表揚達標者", desc: "公開表揚綠燈達標會員" },
  { value: "stage3", label: "第三階段：私下暖心輔導", desc: "會委會主動約談未達標者" },
];

export default function TrafficLightPanel({ members, accStats, weekTitle, goals, stage, onStageChange }: Props) {
  const [monthlyLights, setMonthlyLights] = useState<MonthlyLight[]>([]);
  const [saving, setSaving] = useState(false);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const term = getCurrentTerm();
  const termWeeks = term.totalMeetings;

  useEffect(() => {
    fetch("/api/monthly-lights")
      .then(r => r.json())
      .then(setMonthlyLights)
      .catch(() => {});
  }, []);

  // 計算每位會員的燈號與路徑
  const memberData = members.map(m => {
    const acc = findAcc(m, accStats);
    const score = memberScoreAccurate(m, acc);
    const light = memberLightAccurate(m, acc) as LightColor;
    const path = acc ? computePathToGreen(acc, termWeeks) : null;
    const breakdown = acc ? computeScoreBreakdown(acc, Math.min(1, acc.weeksRecorded / termWeeks)) : null;
    return { m, acc, score, light, path, breakdown, name: memberName(m) };
  }).sort((a, b) => {
    const order: Record<LightColor, number> = { green: 0, yellow: 1, red: 2, black: 3 };
    if (order[a.light] !== order[b.light]) return order[a.light] - order[b.light];
    return b.score - a.score;
  });

  const counts = { green: 0, yellow: 0, red: 0, black: 0 };
  memberData.forEach(d => counts[d.light]++);
  const total = members.length;
  const greenPct = total > 0 ? Math.round((counts.green / total) * 100) : 0;

  const saveSnapshot = useCallback(async () => {
    setSaving(true);
    const month = new Date().toISOString().slice(0, 7);
    const snapshot: MonthlyLight = {
      id: `ml-${Date.now()}`,
      month,
      termId: term.id,
      termName: term.name,
      weekTitle,
      memberLights: memberData.map(d => {
        const bd = d.breakdown;
        return {
          name: d.name,
          score: d.score,
          light: d.light,
          attScore: bd?.att ?? 0,
          refScore: bd?.refPts ?? 0,
          otoScore: bd?.oto ?? 0,
          visScore: bd?.vis ?? 0,
          ceuScore: bd?.ceu ?? 0,
          tvScore: bd?.tvPts ?? 0,
        };
      }),
      savedAt: Date.now(),
    };
    await fetch("/api/monthly-lights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snapshot),
    });
    setMonthlyLights(prev => [snapshot, ...prev.filter(r => r.id !== snapshot.id)]);
    setSaving(false);
  }, [memberData, term, weekTitle]);

  const deleteSnapshot = async (id: string) => {
    await fetch(`/api/monthly-lights/${id}`, { method: "DELETE" });
    setMonthlyLights(prev => prev.filter(r => r.id !== id));
  };

  // 取最近6個月的快照
  const recentSnapshots = monthlyLights.slice(0, 6);
  const allMemberNames = [...new Set([
    ...memberData.map(d => d.name),
    ...recentSnapshots.flatMap(s => s.memberLights.map(ml => ml.name)),
  ])];

  const weeksRemaining = Math.max(0, termWeeks - (accStats[0]?.weeksRecorded ?? 0));
  const progressPct = accStats.length > 0 ? Math.round(((accStats[0]?.weeksRecorded ?? 0) / termWeeks) * 100) : 0;

  return (
    <div className="space-y-5">

      {/* ── 會期進度 + 管理階段 ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* 會期資訊 */}
        <div className="bg-gradient-to-br from-rose-950 to-slate-900 text-white rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-rose-300 text-xs font-bold tracking-wider">目前會期</p>
              <h2 className="text-xl font-black">{term.name}</h2>
              <p className="text-rose-200/70 text-xs mt-0.5">{term.label}</p>
            </div>
            <div className="text-right">
              <p className="text-amber-300 text-xs">剩餘</p>
              <p className="text-3xl font-black text-amber-400">{weeksRemaining}</p>
              <p className="text-amber-300/70 text-xs">週</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-rose-200/60">
              <span>{term.start} → {term.end}</span>
              <span className="text-amber-300 font-bold">{progressPct}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500"
                style={{ width: `${progressPct}%` }} />
            </div>
            <p className="text-xs text-rose-200/50">共 {termWeeks} 次例會，
              已完成 {accStats[0]?.weeksRecorded ?? 0} 次</p>
          </div>
        </div>

        {/* 管理階段設定 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Settings className="w-4 h-4 text-rose-800" />
            <h3 className="font-black text-slate-800">管理階段設定</h3>
          </div>
          <div className="space-y-2">
            {STAGE_OPTIONS.map(opt => (
              <label key={opt.value}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                  stage === opt.value
                    ? "bg-rose-50 border-rose-300"
                    : "border-slate-100 hover:border-slate-300"
                }`}>
                <input type="radio" name="stage" value={opt.value}
                  checked={stage === opt.value}
                  onChange={() => onStageChange(opt.value)}
                  className="mt-0.5 accent-rose-700" />
                <div>
                  <p className={`text-sm font-bold ${stage === opt.value ? "text-rose-900" : "text-slate-700"}`}>
                    {opt.label}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* ── 燈號總覽 ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["green", "yellow", "red", "black"] as LightColor[]).map(color => {
          const cfg = LIGHT_CONFIG[color];
          const cnt = counts[color];
          return (
            <div key={color} className={`${cfg.bg} border ${cfg.border} rounded-2xl p-4 text-center`}>
              <LightDot color={color} size="lg" />
              <p className={`text-3xl font-black mt-1 ${cfg.text}`}>{cnt}</p>
              <p className={`text-xs font-bold ${cfg.text}`}>{cfg.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {total > 0 ? Math.round((cnt / total) * 100) : 0}%
              </p>
            </div>
          );
        })}
      </div>

      {/* 綠燈達標率進度條 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-green-600" />
            <span className="font-bold text-slate-800 text-sm">綠燈達標率</span>
          </div>
          <span className={`text-lg font-black ${greenPct >= 70 ? "text-green-600" : greenPct >= 50 ? "text-yellow-600" : "text-red-600"}`}>
            {greenPct}%
          </span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${
            greenPct >= 70 ? "bg-green-500" : greenPct >= 50 ? "bg-yellow-400" : "bg-red-500"
          }`} style={{ width: `${greenPct}%` }} />
        </div>
        <div className="flex justify-between mt-1.5 text-xs text-slate-400">
          <span>0%</span>
          <span className="text-slate-500 font-semibold">目標 ≥ 70%</span>
          <span>100%</span>
        </div>
      </div>

      {/* ── 上綠燈行動指南 ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-rose-800" />
            <h3 className="font-black text-slate-800">個人燈號 & 上綠燈行動指南</h3>
            <span className="ml-auto text-xs text-slate-400">點擊展開詳情</span>
          </div>
        </div>

        <div className="divide-y divide-slate-50">
          {memberData.map(({ m, acc, score, light, path, name }) => {
            const cfg = LIGHT_CONFIG[light];
            const isExpanded = expandedMember === name;
            const isGreen = light === "green";

            return (
              <div key={name}>
                <button
                  onClick={() => setExpandedMember(isExpanded ? null : name)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition text-left group">
                  <LightDot color={light} size="md" />
                  <span className="font-bold text-slate-800 text-sm w-20 shrink-0">{name}</span>
                  <div className="flex-1 min-w-0">
                    <ScoreBar score={score} />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!isGreen && path && (
                      <span className="text-xs bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded-lg">
                        差 {path.needed} 分
                      </span>
                    )}
                    {isGreen && (
                      <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-lg">達標</span>
                    )}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 bg-slate-50/60 border-t border-slate-100">
                    {!acc ? (
                      <p className="text-sm text-slate-400 pt-4">尚無累積統計資料</p>
                    ) : !path ? null : (
                      <div className="pt-4 space-y-4">

                        {/* 分數明細 */}
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                          {[
                            { label: "出席", val: path.items.find(i => i.key === "att")?.currentScore ?? 0, max: 20 },
                            { label: "引薦", val: path.items.find(i => i.key === "ref")?.currentScore ?? 0, max: 20 },
                            { label: "一對一", val: path.items.find(i => i.key === "oto")?.currentScore ?? 0, max: 15 },
                            { label: "來賓", val: path.items.find(i => i.key === "vis")?.currentScore ?? 0, max: 15 },
                            { label: "培訓", val: path.items.find(i => i.key === "ceu")?.currentScore ?? 0, max: 15 },
                            { label: "金額", val: path.items.find(i => i.key === "tv")?.currentScore ?? 0, max: 15 },
                          ].map(({ label, val, max }) => (
                            <div key={label} className="bg-white rounded-xl border border-slate-200 p-2.5 text-center">
                              <p className="text-[10px] text-slate-500 font-semibold">{label}</p>
                              <p className="text-lg font-black text-slate-800">{val}</p>
                              <p className="text-[10px] text-slate-400">/{max}</p>
                            </div>
                          ))}
                        </div>

                        {/* 行動建議 */}
                        {!isGreen && (
                          <div className="space-y-2">
                            <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                              <Target className="w-3.5 h-3.5 text-rose-600" />
                              達到綠燈（70分）需再 <span className="text-rose-600 font-black">{path.needed} 分</span>
                              {path.weeksRemaining > 0 && `，剩 ${path.weeksRemaining} 週可補足`}
                            </p>
                            {path.items.filter(i => !i.fixed && i.gainable > 0).map(item => (
                              <div key={item.key}
                                className="flex items-start gap-3 p-3 bg-white rounded-xl border border-amber-100">
                                <span className="shrink-0 mt-0.5 w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-black flex items-center justify-center">
                                  +{item.gainable}
                                </span>
                                <div className="flex-1">
                                  <p className="text-xs font-bold text-slate-700">{item.label}</p>
                                  <p className="text-xs text-slate-500 mt-0.5">{item.action}</p>
                                </div>
                              </div>
                            ))}
                            {path.items.filter(i => i.fixed).map(item => (
                              <div key={item.key}
                                className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 opacity-70">
                                <span className="shrink-0 mt-0.5 text-slate-400 text-xs">🔒</span>
                                <div>
                                  <p className="text-xs font-bold text-slate-500">{item.label}</p>
                                  <p className="text-xs text-slate-400 mt-0.5">{item.action}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {isGreen && (
                          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl border border-green-200">
                            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                            <p className="text-sm font-bold text-green-800">
                              已達綠燈！請繼續保持 🎉 目前得分 {score}/100
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 評分規則說明 ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="w-full flex items-center gap-2 p-5 hover:bg-slate-50 transition text-left">
          <Info className="w-4 h-4 text-slate-500" />
          <span className="font-bold text-slate-700 text-sm">評分規則說明（依官方 Excel 標準）</span>
          {showConfig ? <ChevronUp className="w-4 h-4 text-slate-400 ml-auto" /> : <ChevronDown className="w-4 h-4 text-slate-400 ml-auto" />}
        </button>
        {showConfig && (
          <div className="px-5 pb-5 border-t border-slate-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
              {[
                { title: "出席 (0-20)", rows: ["0 缺席 → 20分", "1 缺席 → 15分", "2 缺席 → 10分", ">2 缺席 → 0分"], note:"遲到3次=1次缺席" },
                { title: "業務引薦 (0-20)", rows: ["≥1.5/週 → 20分", "≥1.2/週 → 15分", "≥1.0/週 → 10分", "≥0.75/週 → 5分", "<0.75/週 → 0分"] },
                { title: "一對一 (0-15)", rows: ["≥2/週 → 15分", "≥1/週 → 10分", "≥0.5/週 → 5分", "<0.5/週 → 0分"] },
                { title: "邀請來賓 (0-15)", rows: ["≥2位/月 → 15分", "≥1位/月 → 10分", "0位/月 → 0分"] },
                { title: "培訓 CEU (0-15)", rows: ["≥6次/期 → 15分", "≥4次/期 → 10分", "≥2次/期 → 5分", "<2次/期 → 0分"] },
                { title: "引薦成交金額 (0-15)", rows: ["≥200萬/期 → 15分", "≥80萬/期 → 10分", "≥40萬/期 → 5分", "<40萬/期 → 0分"] },
              ].map(({ title, rows, note }) => (
                <div key={title} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="font-bold text-slate-700 text-xs mb-2">{title}</p>
                  {rows.map(r => (
                    <p key={r} className="text-xs text-slate-500 leading-relaxed">· {r}</p>
                  ))}
                  {note && <p className="text-xs text-amber-600 mt-1.5 font-semibold">⚠ {note}</p>}
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-slate-800 rounded-xl text-white">
              <p className="text-xs font-bold mb-1.5">燈號門檻</p>
              <div className="flex flex-wrap gap-3">
                {SCORE_THRESHOLDS.map(t => (
                  <div key={t.color} className="flex items-center gap-1.5">
                    <LightDot color={t.color} size="sm" />
                    <span className="text-xs text-slate-300">{t.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 月度快照 ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 p-5 border-b border-slate-100">
          <CalendarDays className="w-4 h-4 text-rose-800" />
          <h3 className="font-black text-slate-800">月度紅綠燈記錄</h3>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="text-xs text-slate-500 hover:text-slate-700 transition flex items-center gap-1">
              {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              歷史記錄 ({monthlyLights.length})
            </button>
            <button
              onClick={saveSnapshot}
              disabled={saving}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-800 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shadow-sm disabled:opacity-50 cursor-pointer">
              <Save className="w-3.5 h-3.5" />
              {saving ? "儲存中..." : "儲存本月快照"}
            </button>
          </div>
        </div>

        {/* 月度對比表格 */}
        {showHistory && recentSnapshots.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-2.5 font-bold text-slate-600 sticky left-0 bg-slate-50 min-w-[100px]">姓名</th>
                  {recentSnapshots.map(s => (
                    <th key={s.id} className="px-3 py-2.5 font-bold text-slate-600 text-center min-w-[80px]">
                      <div>{s.month}</div>
                      <div className="font-normal text-slate-400">{s.termName?.replace("第", "").replace("屆", "")}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {allMemberNames.map(name => (
                  <tr key={name} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-2 font-semibold text-slate-700 sticky left-0 bg-white">{name}</td>
                    {recentSnapshots.map(s => {
                      const ml = s.memberLights.find(l => l.name === name);
                      if (!ml) return <td key={s.id} className="px-3 py-2 text-center text-slate-300">—</td>;
                      const lc = ml.light as LightColor;
                      const cfg = LIGHT_CONFIG[lc];
                      return (
                        <td key={s.id} className="px-3 py-2 text-center">
                          <div className="inline-flex flex-col items-center gap-0.5">
                            <LightDot color={lc} size="sm" />
                            <span className={`text-[10px] font-bold ${cfg.text}`}>{ml.score}</span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-100">
                  <td className="px-4 py-2 text-xs font-bold text-slate-500 sticky left-0 bg-white">綠燈人數</td>
                  {recentSnapshots.map(s => {
                    const greenCount = s.memberLights.filter(l => l.light === "green").length;
                    return (
                      <td key={s.id} className="px-3 py-2 text-center">
                        <span className="text-xs font-black text-green-600">{greenCount}</span>
                        <span className="text-[10px] text-slate-400">/{s.memberLights.length}</span>
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>

            {/* 刪除快照 */}
            <div className="flex flex-wrap gap-2 p-4 border-t border-slate-100">
              {recentSnapshots.map(s => (
                <button key={s.id}
                  onClick={() => deleteSnapshot(s.id)}
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-slate-100 transition cursor-pointer">
                  <Trash2 className="w-3 h-3" />
                  {s.month}
                </button>
              ))}
            </div>
          </div>
        ) : showHistory && recentSnapshots.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">尚無月度快照</p>
            <p className="text-xs mt-1">點「儲存本月快照」開始記錄</p>
          </div>
        ) : null}

        {/* 說明 */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
          <p className="text-xs text-slate-400">
            💡 每月評估結束後點「儲存本月快照」，系統會記錄所有會員當下的燈號與分數，最多保留 24 個月紀錄。
          </p>
        </div>
      </div>

    </div>
  );
}
