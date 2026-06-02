import React, { useEffect, useState, useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, LineChart, Line, Legend,
} from "recharts";
import { Member, memberName, memberScore } from "../types";
import { GROUPS } from "../data";
import { TrendingUp, TrendingDown, Minus, Users, BarChart2, X, Table2 } from "lucide-react";

interface WeekSnapshot { date: string; weekTitle: string; members: Member[]; }
interface TrendPanelProps { currentMembers: Member[]; }

type MemberTrend = {
  name: string; scores: number[]; trend: "up"|"down"|"flat";
  latest: number; delta: number; light: "green"|"yellow"|"red"|"black";
};

const LINE_COLORS = [
  "#6366f1","#e11d48","#0891b2","#059669","#d97706","#7c3aed","#db2777","#65a30d",
];

function calcScore(m: Member) { return memberScore(m); }
function sparkTrend(s: number[]): "up"|"down"|"flat" {
  if (s.length < 2) return "flat";
  const d = s[s.length-1] - s[s.length-2];
  return d >= 5 ? "up" : d <= -5 ? "down" : "flat";
}
function lightOf(score: number): "green"|"yellow"|"red"|"black" {
  return score >= 70 ? "green" : score >= 50 ? "yellow" : score >= 30 ? "red" : "black";
}

// Cell color for heatmap
const CELL_BG: Record<string, string> = {
  green:  "bg-green-500 text-white",
  yellow: "bg-amber-400 text-white",
  red:    "bg-red-500 text-white",
  black:  "bg-gray-600 text-white",
  empty:  "bg-slate-100 text-slate-300",
};
const CELL_EMOJI: Record<string, string> = {
  green:"🟢", yellow:"🟡", red:"🔴", black:"⚫",
};

const LIGHT_CFG = {
  green:  { bg:"bg-green-500",  text:"text-green-600",  badge:"bg-green-100 text-green-700 border-green-300",  label:"綠燈" },
  yellow: { bg:"bg-amber-400",  text:"text-amber-600",  badge:"bg-amber-100 text-amber-700 border-amber-300",  label:"黃燈" },
  red:    { bg:"bg-red-500",    text:"text-red-600",    badge:"bg-red-100 text-red-700 border-red-300",        label:"紅燈" },
  black:  { bg:"bg-gray-600",   text:"text-gray-600",   badge:"bg-gray-100 text-gray-700 border-gray-300",     label:"黑燈" },
};

// ── Trend arrow ───────────────────────────────────────────────────────────────
function TrendArrow({ trend, delta }: { trend: string; delta: number }) {
  if (trend === "up")   return <span className="text-green-600 font-black text-xs">↑{delta > 0 ? `+${delta}` : ""}</span>;
  if (trend === "down") return <span className="text-red-500 font-black text-xs">↓{delta}</span>;
  return <span className="text-slate-400 text-xs">→</span>;
}

// ── Mini sparkline (SVG) ──────────────────────────────────────────────────────
function Sparkline({ scores }: { scores: number[] }) {
  if (scores.length < 2) return null;
  const w = 60, h = 20, pad = 2;
  const xs = scores.map((_, i) => pad + (i / (scores.length - 1)) * (w - pad * 2));
  const ys = scores.map(s => h - pad - ((s / 100) * (h - pad * 2)));
  const d = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x} ${ys[i]}`).join(" ");
  const lastColor = scores[scores.length-1] >= 70 ? "#16a34a" : scores[scores.length-1] >= 50 ? "#ca8a04" : scores[scores.length-1] >= 30 ? "#dc2626" : "#374151";
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <path d={d} fill="none" stroke={lastColor} strokeWidth={1.8} strokeLinejoin="round" />
      <circle cx={xs[xs.length-1]} cy={ys[ys.length-1]} r={2.5} fill={lastColor} />
    </svg>
  );
}

export default function TrendPanel({ currentMembers }: TrendPanelProps) {
  const [history, setHistory] = useState<WeekSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"heatmap" | "group">("heatmap");

  useEffect(() => {
    fetch("/api/history/trend?weeks=8")
      .then(r => r.json())
      .then((data: WeekSnapshot[]) => { setHistory(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const allNames = useMemo(() => {
    const s = new Set<string>();
    history.forEach(w => w.members.forEach(m => s.add(memberName(m))));
    currentMembers.forEach(m => s.add(memberName(m)));
    return Array.from(s).sort();
  }, [history, currentMembers]);

  const weekLabels = history.map(w => w.date.slice(5).replace("-", "/"));

  const memberTrends = useMemo<MemberTrend[]>(() => {
    return allNames.map(name => {
      const scores = history
        .map(w => { const m = w.members.find(x => memberName(x) === name); return m ? calcScore(m) : null; })
        .filter((s): s is number => s !== null);
      const trend = sparkTrend(scores);
      const latest = scores[scores.length - 1] ?? 0;
      const delta = scores.length >= 2 ? latest - scores[scores.length - 2] : 0;
      const light = lightOf(latest);
      return { name, scores, trend, latest, delta, light };
    });
  }, [allNames, history]);

  // ── chart data for detail view ────────────────────────────────────────────
  const chartData = useMemo(() => history.map(week => {
    const pt: Record<string, string | number> = { label: week.date.slice(5).replace("-", "/") };
    week.members.forEach(m => { pt[memberName(m)] = calcScore(m); });
    return pt;
  }), [history]);

  // Summary
  const upCount   = memberTrends.filter(t => t.trend === "up").length;
  const downCount = memberTrends.filter(t => t.trend === "down").length;
  const flatCount = memberTrends.filter(t => t.trend === "flat").length;

  // Group stats
  const groupStats = useMemo(() => GROUPS.map(g => {
    const gNames = [g.leaderFullName, ...g.memberFullNames];
    const gTrends = memberTrends.filter(t => gNames.includes(t.name));
    if (!gTrends.length) return { ...g, avg: 0, up: 0, down: 0, members: gTrends };
    const avg = Math.round(gTrends.reduce((a, t) => a + t.latest, 0) / gTrends.length);
    return { ...g, avg, up: gTrends.filter(t => t.trend==="up").length, down: gTrends.filter(t => t.trend==="down").length, members: gTrends };
  }), [memberTrends]);

  if (loading) return <div className="py-16 text-center text-slate-400 text-sm">載入趨勢資料中…</div>;

  if (history.length === 0) return (
    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
      <BarChart2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
      <p className="text-slate-600 font-bold">尚無歷史週次資料</p>
      <p className="text-slate-400 text-xs mt-1">每週儲存一次後，累積 2 週即可查看趨勢走勢</p>
    </div>
  );

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-4 text-white">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-5 h-5 text-indigo-300" />
          <h3 className="text-base font-black">積分趨勢追蹤</h3>
          <span className="text-indigo-400 text-xs ml-auto">近 {history.length} 週 · {memberTrends.length} 位</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label:"上升中", count:upCount,   icon:"📈", bg:"bg-green-500/20 border-green-400/30", text:"text-green-300" },
            { label:"持平",   count:flatCount,  icon:"➡️", bg:"bg-white/10 border-white/10",         text:"text-slate-300" },
            { label:"下滑中", count:downCount,  icon:"📉", bg:"bg-red-500/20 border-red-400/30",     text:"text-red-300" },
          ].map(({ label, count, icon, bg, text }) => (
            <div key={label} className={`border rounded-xl py-2 text-center ${bg}`}>
              <div className="text-sm">{icon}</div>
              <div className={`text-xl font-black ${text}`}>{count}<span className="text-xs font-normal">人</span></div>
              <div className="text-[10px] text-white/50">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-2">
        {[
          { key:"heatmap", icon:<Table2 className="w-3.5 h-3.5" />,    label:"熱力表格" },
          { key:"group",   icon:<BarChart2 className="w-3.5 h-3.5" />, label:"六組分類" },
        ].map(({ key, icon, label }) => (
          <button key={key} onClick={() => setViewMode(key as any)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              viewMode === key ? "bg-indigo-700 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}>{icon}{label}</button>
        ))}
        {selected && (
          <button onClick={() => setSelected(null)}
            className="ml-auto flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg px-2.5 py-1.5 font-bold cursor-pointer hover:bg-indigo-100">
            <X className="w-3 h-3" /> 關閉詳細
          </button>
        )}
      </div>

      {/* ── 熱力表格 ─────────────────────────────────────────────────────── */}
      {viewMode === "heatmap" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="px-3 py-2 text-left font-bold sticky left-0 bg-slate-800 z-10 min-w-[72px]">姓名</th>
                  {weekLabels.map((lbl, i) => (
                    <th key={i} className="px-2 py-2 text-center font-semibold whitespace-nowrap min-w-[52px]">{lbl}</th>
                  ))}
                  <th className="px-2 py-2 text-center font-bold min-w-[48px]">走勢</th>
                  <th className="px-2 py-2 text-center font-bold min-w-[40px]">最新</th>
                  <th className="px-2 py-2 text-center font-bold min-w-[36px]">▲▼</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {memberTrends
                  .sort((a, b) => {
                    const lo = { green:0, yellow:1, red:2, black:3 };
                    const cmp = lo[a.light] - lo[b.light];
                    return cmp !== 0 ? cmp : b.latest - a.latest;
                  })
                  .map((t, ri) => {
                    const isSelected = selected === t.name;
                    const lc = LIGHT_CFG[t.light];
                    // Build score array aligned with weekLabels
                    const scoreByWeek: (number | null)[] = history.map(w => {
                      const m = w.members.find(x => memberName(x) === t.name);
                      return m ? calcScore(m) : null;
                    });
                    return (
                      <tr key={t.name}
                        onClick={() => setSelected(isSelected ? null : t.name)}
                        className={`cursor-pointer transition-colors ${isSelected ? "bg-indigo-50 ring-1 ring-inset ring-indigo-300" : ri % 2 === 0 ? "bg-white hover:bg-slate-50" : "bg-slate-50/50 hover:bg-slate-100"}`}>
                        {/* Name */}
                        <td className={`px-3 py-1.5 font-bold text-slate-800 sticky left-0 z-10 ${isSelected ? "bg-indigo-50" : ri % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}>
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${lc.bg}`} />
                            {t.name}
                          </div>
                        </td>
                        {/* Weekly score cells */}
                        {scoreByWeek.map((s, ci) => (
                          <td key={ci} className="px-1 py-1 text-center">
                            {s !== null ? (
                              <span className={`inline-block w-11 py-0.5 rounded font-bold text-[11px] ${
                                s >= 70 ? "bg-green-100 text-green-800" :
                                s >= 50 ? "bg-amber-100 text-amber-800" :
                                s >= 30 ? "bg-red-100 text-red-700" :
                                "bg-gray-100 text-gray-600"
                              }`}>
                                {CELL_EMOJI[lightOf(s)]} {s}
                              </span>
                            ) : (
                              <span className="text-slate-200">—</span>
                            )}
                          </td>
                        ))}
                        {/* Sparkline */}
                        <td className="px-2 py-1 text-center">
                          <div className="flex justify-center"><Sparkline scores={t.scores} /></div>
                        </td>
                        {/* Latest */}
                        <td className="px-2 py-1 text-center">
                          <span className={`font-black text-sm ${lc.text}`}>{t.latest}</span>
                        </td>
                        {/* Trend */}
                        <td className="px-2 py-1 text-center">
                          <TrendArrow trend={t.trend} delta={t.delta} />
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 px-4 py-2 border-t border-slate-100 bg-slate-50 text-[10px] text-slate-500">
            <span>點擊列查看詳細走勢</span>
            <span className="flex items-center gap-1"><span className="bg-green-100 text-green-800 rounded px-1 font-bold">🟢 70+</span>綠燈</span>
            <span className="flex items-center gap-1"><span className="bg-amber-100 text-amber-800 rounded px-1 font-bold">🟡 50+</span>黃燈</span>
            <span className="flex items-center gap-1"><span className="bg-red-100 text-red-700 rounded px-1 font-bold">🔴 30+</span>紅燈</span>
            <span className="flex items-center gap-1"><span className="bg-gray-100 text-gray-600 rounded px-1 font-bold">⚫ &lt;30</span>黑燈</span>
          </div>
        </div>
      )}

      {/* ── 六組分類 ─────────────────────────────────────────────────────── */}
      {viewMode === "group" && (
        <div className="space-y-2">
          {groupStats.map(g => {
            const avgLight = lightOf(g.avg);
            const alc = LIGHT_CFG[avgLight];
            return (
              <div key={g.name} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                {/* Group header */}
                <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                  <span className={`w-3 h-3 rounded-full shrink-0 ${alc.bg}`} />
                  <span className="font-black text-slate-800 text-sm">{g.name}</span>
                  <span className="text-xs text-slate-500">組長：<strong className="text-amber-600">{g.leaderFullName}</strong></span>
                  <div className="ml-auto flex items-center gap-3">
                    <span className={`text-base font-black ${alc.text}`}>{g.avg}<span className="text-xs text-slate-400 font-normal ml-0.5">均分</span></span>
                    {g.up > 0   && <span className="bg-green-100 text-green-700 rounded px-1.5 py-0.5 text-[10px] font-bold">↑{g.up}</span>}
                    {g.down > 0 && <span className="bg-red-100 text-red-700 rounded px-1.5 py-0.5 text-[10px] font-bold">↓{g.down}</span>}
                  </div>
                </div>
                {/* Member compact rows */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <tbody className="divide-y divide-slate-50">
                      {(g.members as MemberTrend[])
                        .sort((a, b) => { const lo={green:0,yellow:1,red:2,black:3}; return lo[a.light]-lo[b.light] || b.latest-a.latest; })
                        .map((t, ri) => {
                          const lc2 = LIGHT_CFG[t.light];
                          const scoreByWeek: (number | null)[] = history.map(w => {
                            const m = w.members.find(x => memberName(x) === t.name);
                            return m ? calcScore(m) : null;
                          });
                          return (
                            <tr key={t.name}
                              onClick={() => setSelected(selected === t.name ? null : t.name)}
                              className={`cursor-pointer transition-colors ${selected === t.name ? "bg-indigo-50" : ri%2===0?"bg-white hover:bg-slate-50":"bg-slate-50/40 hover:bg-slate-100"}`}>
                              <td className="px-3 py-1.5 font-bold text-slate-700 min-w-[72px]">
                                <div className="flex items-center gap-1.5">
                                  <span className={`w-2 h-2 rounded-full ${lc2.bg}`} />{t.name}
                                </div>
                              </td>
                              {scoreByWeek.map((s, ci) => (
                                <td key={ci} className="px-1 py-1 text-center">
                                  {s !== null ? (
                                    <span className={`inline-block w-10 py-0.5 rounded text-[11px] font-bold ${
                                      s>=70?"bg-green-100 text-green-800":s>=50?"bg-amber-100 text-amber-800":s>=30?"bg-red-100 text-red-700":"bg-gray-100 text-gray-600"
                                    }`}>{s}</span>
                                  ) : <span className="text-slate-200">—</span>}
                                </td>
                              ))}
                              <td className="px-2 py-1"><div className="flex justify-center"><Sparkline scores={t.scores} /></div></td>
                              <td className="px-2 py-1 text-center font-black text-sm" style={{ color: t.latest>=70?"#16a34a":t.latest>=50?"#ca8a04":t.latest>=30?"#dc2626":"#374151" }}>{t.latest}</td>
                              <td className="px-2 py-1 text-center"><TrendArrow trend={t.trend} delta={t.delta} /></td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 點選後詳細走勢圖 ─────────────────────────────────────────────── */}
      {selected && (() => {
        const t = memberTrends.find(x => x.name === selected);
        if (!t) return null;
        const { scores } = t;
        const avg = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : 0;
        const max = scores.length ? Math.max(...scores) : 0;
        const min = scores.length ? Math.min(...scores) : 0;
        const lc = LIGHT_CFG[t.light];
        const detailChartData = history.map((w, i) => {
          const m = w.members.find(x => memberName(x) === selected);
          return { label: w.date.slice(5).replace("-","/"), score: m ? calcScore(m) : null };
        }).filter(d => d.score !== null);

        return (
          <section className="bg-white rounded-2xl border-2 border-indigo-200 shadow-md overflow-hidden">
            <div className={`flex items-center justify-between px-5 py-3 ${
              t.light==="green"?"bg-green-50 border-b border-green-100":
              t.light==="yellow"?"bg-amber-50 border-b border-amber-100":
              "bg-red-50 border-b border-red-100"
            }`}>
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${lc.bg}`} />
                <span className="font-black text-slate-800">{selected}</span>
                <span className={`text-xs font-bold border rounded-full px-2 py-0.5 ${lc.badge}`}>{lc.label}</span>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* 3 stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label:"歷史平均", value:avg, color:avg>=70?"text-green-600":avg>=50?"text-amber-600":"text-red-600", bg:avg>=70?"bg-green-50":avg>=50?"bg-amber-50":"bg-red-50" },
                  { label:"最高紀錄", value:max, color:"text-indigo-600", bg:"bg-indigo-50" },
                  { label:"最低紀錄", value:min, color:min>=70?"text-green-600":"text-red-600", bg:min>=70?"bg-green-50":"bg-red-50" },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} className={`rounded-xl p-3 text-center ${bg}`}>
                    <p className="text-[11px] text-slate-500 mb-0.5">{label}</p>
                    <p className={`text-2xl font-black ${color}`}>{value}<span className="text-xs font-normal text-slate-400">分</span></p>
                  </div>
                ))}
              </div>

              {/* Area chart */}
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs font-black text-slate-600 mb-2">積分走勢圖</p>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={detailChartData} margin={{ top:5, right:40, left:0, bottom:5 }}>
                    <defs>
                      <linearGradient id="areaGrad2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize:10 }} />
                    <YAxis domain={[0,100]} tick={{ fontSize:10 }} width={28} />
                    <Tooltip formatter={(v:number) => [`${v} 分`, selected]} contentStyle={{ fontSize:12, borderRadius:8 }} />
                    <ReferenceLine y={70} stroke="#16a34a" strokeDasharray="5 3" label={{ value:"綠燈 70", position:"right", fontSize:9, fill:"#16a34a" }} />
                    <ReferenceLine y={50} stroke="#ca8a04" strokeDasharray="5 3" label={{ value:"黃燈 50", position:"right", fontSize:9, fill:"#ca8a04" }} />
                    <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2.5}
                      fill="url(#areaGrad2)" dot={{ r:4, fill:"#6366f1" }} activeDot={{ r:6 }} connectNulls />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        );
      })()}
    </div>
  );
}
