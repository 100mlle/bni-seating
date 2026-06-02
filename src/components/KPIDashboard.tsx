import React, { useMemo, useState } from "react";
import { Member, ChapterGoals, PALMS, PALMS_LABEL, memberLightAccurate, memberScoreAccurate, memberName, totalReferralsGiven, AccumulatedStats, findAcc, WeeklyRecord } from "../types";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { TrendingUp, Users, Activity, DollarSign, BookOpen, Search, Trophy, ChevronLeft, ChevronRight } from "lucide-react";
import { GROUPS, CHAPTER_PERIOD, currentMeetingNumber, meetingNumberForDate } from "../data";
import TrendPanel from "./TrendPanel";

interface KPIDashboardProps {
  members: Member[];
  goals: ChapterGoals;
  accStats: AccumulatedStats[];
  weekTitle?: string;
  history?: WeeklyRecord[];
  dashboardWeekIdx?: number;         // 0 = 本週, 1..N = history[0..N-1]
  onDashboardWeekChange?: (idx: number) => void;
}

const PALMS_COLORS: Record<PALMS, string> = {
  P: "#16a34a", A: "#dc2626", L: "#ca8a04", M: "#ea580c", S: "#9333ea"
};

const LIGHT_COLORS = { green: "#16a34a", yellow: "#ca8a04", red: "#dc2626", black: "#374151" };

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`text-3xl font-black mt-1 ${color || "text-slate-800"}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Color helpers ───────────────────────────────────────────────────────────
function colAdj(hex: string, amt: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (n >> 16) + amt));
  const g = Math.min(255, Math.max(0, ((n >> 8) & 0xff) + amt));
  const b = Math.min(255, Math.max(0, (n & 0xff) + amt));
  return `rgb(${r},${g},${b})`;
}

// ─── 3D vertical bar shape for Recharts ─────────────────────────────────────
function Bar3D(props: any) {
  const { x, y, width, height, fill } = props;
  if (!height || height <= 0 || !width || !fill) return null;
  const d = Math.max(5, Math.min(10, width * 0.4));
  const light = colAdj(fill, 70);
  const dark  = colAdj(fill, -60);
  return (
    <g>
      {/* Front face */}
      <rect x={x} y={y} width={width} height={height} fill={fill} rx={2} />
      {/* Top face */}
      <polygon points={`${x},${y} ${x+d},${y-d} ${x+width+d},${y-d} ${x+width},${y}`} fill={light} />
      {/* Right face */}
      <polygon points={`${x+width},${y} ${x+width+d},${y-d} ${x+width+d},${y+height-d} ${x+width},${y+height}`} fill={dark} />
    </g>
  );
}

// ─── 3D horizontal bar (CSS box-shadow depth illusion) ───────────────────────
function HBar3D({ pct, color, height = 12 }: { pct: number; color: string; height?: number }) {
  const dark = colAdj(color, -70);
  const light = colAdj(color, 60);
  return (
    <div style={{ position: 'relative', height: height + 6, overflow: 'visible' }}>
      {/* Track shadow (depth) */}
      <div style={{
        position: 'absolute', bottom: 0, left: 4, right: -4,
        height, background: '#cbd5e1', borderRadius: 3,
        transform: 'translateY(-4px)',
      }} />
      {/* Track face */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height, background: '#e2e8f0', borderRadius: 3 }} />
      {pct > 0 && (
        <>
          {/* Bar depth (right+top shadow) */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0,
            width: `${pct * 100}%`, height,
            background: dark, borderRadius: 3,
            transform: 'translate(4px, -4px)',
          }} />
          {/* Top face sliver */}
          <div style={{
            position: 'absolute', bottom: height, left: 0,
            width: `${pct * 100}%`, height: 4,
            background: light, borderRadius: '3px 3px 0 0',
            clipPath: 'polygon(0 100%, 4px 0%, 100% 0%, calc(100% - 0px) 100%)',
          }} />
          {/* Front face */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0,
            width: `${pct * 100}%`, height,
            background: `linear-gradient(to bottom, ${light}, ${color})`,
            borderRadius: 3,
          }} />
        </>
      )}
    </div>
  );
}

function Progress({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min(100, Math.round((value / (max || 1)) * 100));
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-semibold text-slate-600">
        <span>{label}</span>
        <span>{value} / {max} ({pct}%)</span>
      </div>
      <HBar3D pct={pct / 100} color={color} height={10} />
    </div>
  );
}

// ─── 3D Isometric Group Ranking Chart ────────────────────────────────────────
function GroupRankChart3D({ groups }: { groups: Array<{ name: string; avg: number; green: number; count: number }> }) {
  const VW = 720, VH = 300;
  const slots = groups.length || 6;
  const slotW = (VW - 80) / slots;
  const bW = Math.min(58, slotW - 28);
  const d = 15;
  const baseY = 248;
  const maxH = 175;
  const maxScore = Math.max(...groups.map(g => g.avg), 100);
  const colors = ["#f59e0b", "#94a3b8", "#b45309", "#818cf8", "#34d399", "#f87171"];
  const medals = ["🥇", "🥈", "🥉", "4.", "5.", "6."];

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" style={{ display: "block" }}>
      {/* Grid lines */}
      {[25, 50, 75, 100].map(v => {
        const gy = baseY - (v / maxScore) * maxH;
        return (
          <g key={v}>
            <line x1={40} y1={gy} x2={VW - 10} y2={gy} stroke="#e2e8f0" strokeWidth={1} strokeDasharray="4 3" />
            <text x={36} y={gy + 4} textAnchor="end" fontSize={9} fill="#94a3b8">{v}</text>
          </g>
        );
      })}
      {/* Baseline */}
      <line x1={40} y1={baseY} x2={VW - 10} y2={baseY} stroke="#94a3b8" strokeWidth={1.5} />

      {groups.map((g, i) => {
        const color = colors[i] || "#818cf8";
        const light = colAdj(color, 70);
        const dark  = colAdj(color, -60);
        const slotX = 40 + i * slotW;
        const bX = slotX + (slotW - bW) / 2;
        const barH = Math.max(6, (g.avg / maxScore) * maxH);
        const bY = baseY - barH;

        return (
          <g key={g.name}>
            {/* Right face */}
            <polygon points={`${bX+bW},${bY} ${bX+bW+d},${bY-d} ${bX+bW+d},${baseY-d} ${bX+bW},${baseY}`} fill={dark} />
            {/* Front face */}
            <rect x={bX} y={bY} width={bW} height={barH} fill={color} rx={2} />
            {/* Top face */}
            <polygon points={`${bX},${bY} ${bX+d},${bY-d} ${bX+bW+d},${bY-d} ${bX+bW},${bY}`} fill={light} />
            {/* Score */}
            <text x={bX + bW/2} y={bY - d - 5} textAnchor="middle" fontSize={12} fontWeight="bold" fill="#1e293b">{g.avg}分</text>
            {/* Medal */}
            <text x={bX + bW/2} y={baseY + 16} textAnchor="middle" fontSize={13}>{medals[i]}</text>
            {/* Name */}
            <text x={bX + bW/2} y={baseY + 30} textAnchor="middle" fontSize={11} fill="#475569" fontWeight="600">{g.name}</text>
            {/* Green ratio */}
            <text x={bX + bW/2} y={baseY + 44} textAnchor="middle" fontSize={9} fill="#16a34a">🟢{g.green}/{g.count}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── 3D Grouped Referral Chart ────────────────────────────────────────────────
function ReferralChart3D({ members, accStats }: { members: Member[]; accStats: AccumulatedStats[] }) {
  const sorted = [...members]
    .sort((a, b) =>
      (totalReferralsGiven(b) + b.referralsReceivedInternal + b.referralsReceivedExternal) -
      (totalReferralsGiven(a) + a.referralsReceivedInternal + a.referralsReceivedExternal)
    )
    .slice(0, 16);

  const allMax = Math.max(...sorted.map(m =>
    Math.max(totalReferralsGiven(m), m.referralsReceivedInternal + m.referralsReceivedExternal)
  ), 1);

  const VW = 900, VH = 330;
  const slots = sorted.length;
  const slotW = (VW - 60) / slots;
  const bW = Math.max(9, Math.min(16, slotW * 0.34));
  const gap = 4;
  const d = 7;
  const baseY = 260;
  const maxH = 195;
  const GC = "#f43f5e", RC = "#6366f1";
  const GL = colAdj(GC, 70), GD = colAdj(GC, -60);
  const RL = colAdj(RC, 70), RD = colAdj(RC, -60);

  return (
    <div>
      <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" style={{ display: "block" }}>
        {/* Grid */}
        {[1,2,3,4].map(idx => {
          const v = Math.round((allMax / 4) * idx);
          const gy = baseY - (v / allMax) * maxH;
          return (
            <g key={idx}>
              <line x1={30} y1={gy} x2={VW-5} y2={gy} stroke="#e2e8f0" strokeWidth={1} strokeDasharray="3 3" />
              <text x={26} y={gy + 4} textAnchor="end" fontSize={9} fill="#94a3b8">{v}</text>
            </g>
          );
        })}
        <line x1={30} y1={baseY} x2={VW-5} y2={baseY} stroke="#94a3b8" strokeWidth={1.5} />

        {sorted.map((m, i) => {
          const given    = totalReferralsGiven(m);
          const received = m.referralsReceivedInternal + m.referralsReceivedExternal;
          const light    = memberLightAccurate(m, findAcc(m, accStats));
          const dotC     = light === "green" ? "#16a34a" : light === "yellow" ? "#ca8a04" : light === "red" ? "#dc2626" : "#374151";

          const slotX  = 30 + i * slotW;
          const grpW   = bW * 2 + gap;
          const gX     = slotX + (slotW - grpW) / 2;

          const gH = given    > 0 ? Math.max(4, (given    / allMax) * maxH) : 0;
          const rH = received > 0 ? Math.max(4, (received / allMax) * maxH) : 0;
          const gY = baseY - gH;
          const rY = baseY - rH;
          const rX = gX + bW + gap;

          return (
            <g key={m.id}>
              {/* Given bar */}
              {gH > 0 && <>
                <polygon points={`${gX+bW},${gY} ${gX+bW+d},${gY-d} ${gX+bW+d},${baseY-d} ${gX+bW},${baseY}`} fill={GD} />
                <rect x={gX} y={gY} width={bW} height={gH} fill={GC} rx={1} />
                <polygon points={`${gX},${gY} ${gX+d},${gY-d} ${gX+bW+d},${gY-d} ${gX+bW},${gY}`} fill={GL} />
                <text x={gX+bW/2} y={gY-d-3} textAnchor="middle" fontSize={9} fontWeight="bold" fill={GC}>{given}</text>
              </>}
              {/* Received bar */}
              {rH > 0 && <>
                <polygon points={`${rX+bW},${rY} ${rX+bW+d},${rY-d} ${rX+bW+d},${baseY-d} ${rX+bW},${baseY}`} fill={RD} />
                <rect x={rX} y={rY} width={bW} height={rH} fill={RC} rx={1} />
                <polygon points={`${rX},${rY} ${rX+d},${rY-d} ${rX+bW+d},${rY-d} ${rX+bW},${rY}`} fill={RL} />
                <text x={rX+bW/2} y={rY-d-3} textAnchor="middle" fontSize={9} fontWeight="bold" fill={RC}>{received}</text>
              </>}
              {/* Status dot */}
              <circle cx={gX + grpW/2} cy={baseY + 7} r={3} fill={dotC} />
              {/* Name label rotated */}
              <text
                x={gX + grpW/2} y={baseY + 14}
                textAnchor="end" fontSize={10} fill="#475569"
                transform={`rotate(-42, ${gX + grpW/2}, ${baseY + 14})`}
              >
                {memberName(m)}
              </text>
            </g>
          );
        })}
      </svg>
      {/* Legend */}
      <div className="flex gap-6 justify-center mt-1 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: GC }} />給出引薦
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: RC }} />收到引薦
        </span>
        <span className="ml-4 text-slate-400">Top 16 本週數據</span>
      </div>
    </div>
  );
}

// ─── 領導/委員會 KPI 小表格 ──────────────────────────────────────────
const LEADERSHIP_ROLES = new Set(["主席","副主席","秘書/財務","教育協調員","活動協調員","成長協調員","導師協調員","來賓接待員","網站管理員"]);

function RoleKPITable({
  title, icon, members, accStats, goals, accentCls, headerCls,
}: {
  title: string; icon: React.ReactNode;
  members: Member[]; accStats: AccumulatedStats[]; goals: ChapterGoals;
  accentCls: string; headerCls: string;
}) {
  if (members.length === 0) return null;
  const lights = { green: 0, yellow: 0, red: 0, black: 0 };
  members.forEach(m => { lights[memberLightAccurate(m, findAcc(m, accStats))]++; });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className={`px-5 py-3 flex items-center gap-3 ${headerCls}`}>
        <span>{icon}</span>
        <h3 className="font-black text-sm">{title}</h3>
        <span className="text-xs opacity-70">（{members.length} 位）</span>
        <span className="ml-auto flex gap-2 text-xs font-bold">
          <span>🟢{lights.green}</span>
          <span>🟡{lights.yellow}</span>
          <span>🔴{lights.red}</span>
          <span>⚫{lights.black}</span>
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className={`border-b text-xs font-semibold text-white ${accentCls}`}>
              <th className="px-4 py-2 text-left">姓名</th>
              <th className="px-4 py-2 text-left">職位</th>
              <th className="px-4 py-2 text-left">產業</th>
              <th className="px-4 py-2 text-center">PALMS</th>
              <th className="px-4 py-2 text-center">121</th>
              <th className="px-4 py-2 text-center">給引薦</th>
              <th className="px-4 py-2 text-center">收引薦</th>
              <th className="px-4 py-2 text-center">來賓</th>
              <th className="px-4 py-2 text-center">交易額</th>
              <th className="px-4 py-2 text-center">CEU</th>
              <th className="px-4 py-2 text-center">燈號</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[...members]
              .sort((a, b) => {
                const lo = { green: 0, yellow: 1, red: 2, black: 3 };
                const la = memberLightAccurate(a, findAcc(a, accStats));
                const lb = memberLightAccurate(b, findAcc(b, accStats));
                const cmp = lo[la] - lo[lb];
                if (cmp !== 0) return cmp;
                return memberScoreAccurate(b, findAcc(b, accStats)) - memberScoreAccurate(a, findAcc(a, accStats));
              })
              .map(m => {
                const acc = findAcc(m, accStats);
                const light = memberLightAccurate(m, acc);
                const score = memberScoreAccurate(m, acc);
                const lightUI = light === "green" ? "🟢" : light === "yellow" ? "🟡" : light === "red" ? "🔴" : "⚫";
                const refGiven = totalReferralsGiven(m);
                const refRec = m.referralsReceivedInternal + m.referralsReceivedExternal;
                return (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5 font-semibold text-slate-800">{memberName(m)}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{m.role}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-400">{m.category}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{ backgroundColor: PALMS_COLORS[m.palms] + "22", color: PALMS_COLORS[m.palms] }}>
                        {m.palms} {PALMS_LABEL[m.palms]}
                      </span>
                    </td>
                    <td className={`px-4 py-2.5 text-center font-bold ${m.oneToOne >= goals.kpi121PerMember ? "text-green-700" : "text-rose-600"}`}>{m.oneToOne}</td>
                    <td className={`px-4 py-2.5 text-center font-bold ${refGiven >= goals.kpiReferralPerMember ? "text-green-700" : "text-rose-600"}`}>
                      {refGiven} <span className="text-xs font-normal text-slate-400">({m.referralsGivenInternal}+{m.referralsGivenExternal})</span>
                    </td>
                    <td className="px-4 py-2.5 text-center text-slate-600">
                      {refRec} <span className="text-xs text-slate-400">({m.referralsReceivedInternal}+{m.referralsReceivedExternal})</span>
                    </td>
                    <td className="px-4 py-2.5 text-center text-slate-600">{m.visitors}</td>
                    <td className="px-4 py-2.5 text-center text-slate-600 text-xs">{m.transactionValue > 0 ? `$${m.transactionValue.toLocaleString()}` : "—"}</td>
                    <td className={`px-4 py-2.5 text-center font-bold ${m.ceu >= goals.kpiCeuPerMember ? "text-teal-700" : "text-slate-400"}`}>{m.ceu}</td>
                    <td className="px-4 py-2.5 text-center">{lightUI} <span className="text-xs font-bold text-slate-500">{score}分</span></td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type DashSubTab = "overview" | "trend";

export default function KPIDashboard({
  members: currentMembers, goals, accStats, weekTitle: currentWeekTitle,
  history = [], dashboardWeekIdx = 0, onDashboardWeekChange,
}: KPIDashboardProps) {
  const [search, setSearch] = useState("");
  const [subTab, setSubTab] = useState<DashSubTab>("overview");
  const [sortKey, setSortKey] = useState<string>("燈號");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // 決定要顯示的數據：idx=0 → 本週；idx≥1 → history[idx-1]
  const members = dashboardWeekIdx === 0
    ? currentMembers
    : (history[dashboardWeekIdx - 1]?.members ?? currentMembers);
  const weekTitle = dashboardWeekIdx === 0
    ? currentWeekTitle
    : (() => {
        const rec = history[dashboardWeekIdx - 1];
        if (!rec) return currentWeekTitle;
        const n = meetingNumberForDate(rec.date);
        const mmdd = rec.date.slice(5).replace("-", "/");
        return `第 ${n} 次例會 ${mmdd}`;
      })();
  const totalWeeks = history.length + 1; // 0=本週 + history weeks

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const stats = useMemo(() => {
    const total = members.length;
    const totalOneToOne = members.reduce((s, m) => s + m.oneToOne, 0);
    const totalRefGivenInt = members.reduce((s, m) => s + m.referralsGivenInternal, 0);
    const totalRefGivenExt = members.reduce((s, m) => s + m.referralsGivenExternal, 0);
    const totalRefGiven = totalRefGivenInt + totalRefGivenExt;
    const totalRefRecInt = members.reduce((s, m) => s + m.referralsReceivedInternal, 0);
    const totalRefRecExt = members.reduce((s, m) => s + m.referralsReceivedExternal, 0);
    const totalVisitors = members.reduce((s, m) => s + m.visitors, 0);
    const totalTxValue = members.reduce((s, m) => s + m.transactionValue, 0);
    const totalCeu = members.reduce((s, m) => s + m.ceu, 0);

    const palmsCounts: Record<PALMS, number> = { P: 0, A: 0, L: 0, M: 0, S: 0 };
    members.forEach(m => { palmsCounts[m.palms]++; });

    const lights = { green: 0, yellow: 0, red: 0, black: 0 };
    members.forEach(m => { lights[memberLightAccurate(m, findAcc(m, accStats))]++; });

    const absenceRate = total > 0 ? Math.round(((palmsCounts.A + palmsCounts.S) / total) * 100) : 0;

    return {
      total, totalOneToOne, totalRefGivenInt, totalRefGivenExt, totalRefGiven,
      totalRefRecInt, totalRefRecExt, totalVisitors, totalTxValue, totalCeu,
      palmsCounts, lights, absenceRate,
    };
  }, [members, goals]);

  const palmsChartData = (["P", "A", "L", "M", "S"] as PALMS[]).map(p => ({
    name: `${p} ${PALMS_LABEL[p]}`, value: stats.palmsCounts[p], fill: PALMS_COLORS[p],
  })).filter(d => d.value > 0);

  const lightChartData = [
    { name: "🟢 綠燈", value: stats.lights.green, fill: LIGHT_COLORS.green },
    { name: "🟡 黃燈", value: stats.lights.yellow, fill: LIGHT_COLORS.yellow },
    { name: "🔴 紅燈", value: stats.lights.red, fill: LIGHT_COLORS.red },
    { name: "⚫ 黑燈", value: stats.lights.black, fill: LIGHT_COLORS.black },
  ].filter(d => d.value > 0);

  const topMembers = [...members]
    .sort((a, b) => (b.oneToOne + totalReferralsGiven(b)) - (a.oneToOne + totalReferralsGiven(a)))
    .slice(0, 10)
    .map(m => ({
      name: memberName(m),
      "一對一": m.oneToOne,
      "給引薦": totalReferralsGiven(m),
    }));

  // 本週之星（含並列）
  const topWithTie = (getValue: (m: Member) => number) => {
    if (members.length === 0) return { value: 0, names: [] as string[] };
    const sorted = [...members].sort((a, b) => getValue(b) - getValue(a));
    const topVal = getValue(sorted[0]);
    if (topVal <= 0) return { value: 0, names: [] };
    return { value: topVal, names: sorted.filter(m => getValue(m) === topVal).map(memberName) };
  };
  const starRefGiven   = topWithTie(m => totalReferralsGiven(m));
  const starTxValue    = topWithTie(m => m.transactionValue);
  const starVisitors   = topWithTie(m => m.visitors);

  // 主表格只顯示夥伴會員（領導/委員會已獨立列表）
  const filtered = members.filter(m =>
    !LEADERSHIP_ROLES.has(m.role) && m.role !== "會員委員會" &&
    (memberName(m).includes(search) || m.category.includes(search))
  );

  const sorted = [...filtered].sort((a, b) => {
    const lightOrder = { green: 0, yellow: 1, red: 2, black: 3 };
    let cmp = 0;
    switch (sortKey) {
      case "姓名":    cmp = memberName(a).localeCompare(memberName(b), "zh-TW"); break;
      case "產業":    cmp = a.category.localeCompare(b.category, "zh-TW"); break;
      case "PALMS": { const po = { P:0, L:1, M:2, S:3, A:4 }; cmp = po[a.palms] - po[b.palms]; break; }
      case "121":     cmp = a.oneToOne - b.oneToOne; break;
      case "給引薦":  cmp = totalReferralsGiven(a) - totalReferralsGiven(b); break;
      case "收引薦":  cmp = (a.referralsReceivedInternal + a.referralsReceivedExternal) - (b.referralsReceivedInternal + b.referralsReceivedExternal); break;
      case "來賓":    cmp = a.visitors - b.visitors; break;
      case "交易額":  cmp = a.transactionValue - b.transactionValue; break;
      case "CEU":     cmp = a.ceu - b.ceu; break;
      case "燈號":
      default: {
        const la = memberLightAccurate(a, findAcc(a, accStats));
        const lb = memberLightAccurate(b, findAcc(b, accStats));
        cmp = lightOrder[la] - lightOrder[lb];
        if (cmp === 0) {
          const sa = memberScoreAccurate(a, findAcc(a, accStats));
          const sb = memberScoreAccurate(b, findAcc(b, accStats));
          cmp = sb - sa; // higher score first as tiebreaker
        }
        break;
      }
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  // 六組平均積分排行
  const groupRankings = GROUPS.map(group => {
    const allNames = [group.leaderFullName, ...group.memberFullNames];
    const groupMs = members.filter(m => allNames.includes(memberName(m)));
    if (groupMs.length === 0) return { name: group.name, avg: 0, count: 0, green: 0 };
    const scores = groupMs.map(m => memberScoreAccurate(m, findAcc(m, accStats)));
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const green = groupMs.filter(m => memberLightAccurate(m, findAcc(m, accStats)) === "green").length;
    return { name: group.name, avg, count: groupMs.length, green };
  }).sort((a, b) => b.avg - a.avg);

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6">

      {/* ── 週次切換器 ── */}
      <div className="bg-gradient-to-r from-rose-900 to-slate-800 rounded-xl px-4 py-3 text-white shadow-sm">
        <div className="flex items-center gap-3">
          <Activity className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-xs text-slate-300 shrink-0">查看週次</span>

          {/* prev */}
          <button
            onClick={() => onDashboardWeekChange?.(Math.min(dashboardWeekIdx + 1, history.length))}
            disabled={dashboardWeekIdx >= history.length}
            className="p-1 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 cursor-pointer disabled:cursor-default transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* week pills */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none flex-1">
            {/* 本週 pill */}
            <button
              onClick={() => onDashboardWeekChange?.(0)}
              className={`shrink-0 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                dashboardWeekIdx === 0
                  ? "bg-amber-400 text-rose-950"
                  : "bg-white/10 hover:bg-white/20 text-slate-200"
              }`}
            >
              本週
            </button>
            {history.map((rec, i) => {
              const n = meetingNumberForDate(rec.date);
              const mmdd = rec.date.slice(5).replace("-", "/");
              const active = dashboardWeekIdx === i + 1;
              return (
                <button
                  key={rec.id}
                  onClick={() => onDashboardWeekChange?.(i + 1)}
                  className={`shrink-0 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    active
                      ? "bg-amber-400 text-rose-950"
                      : "bg-white/10 hover:bg-white/20 text-slate-200"
                  }`}
                >
                  第{n}次 {mmdd}
                </button>
              );
            })}
          </div>

          {/* next */}
          <button
            onClick={() => onDashboardWeekChange?.(Math.max(dashboardWeekIdx - 1, 0))}
            disabled={dashboardWeekIdx === 0}
            className="p-1 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 cursor-pointer disabled:cursor-default transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <span className="text-amber-300 font-black text-sm shrink-0 ml-1">{weekTitle}</span>
        </div>
      </div>

      {/* Sub-tab toggle */}
      <div className="flex gap-2">
        {([
          { key: "overview", label: "數據總覽" },
          { key: "trend",    label: "📈 趨勢追蹤" },
        ] as const).map(({ key, label }) => (
          <button key={key} onClick={() => setSubTab(key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              subTab === key ? "bg-slate-800 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* 會期進度 */}
      {subTab === "overview" && (() => {
        const meetingNow = currentMeetingNumber();
        const pct = Math.round((meetingNow / CHAPTER_PERIOD.totalMeetings) * 100);
        const remaining = CHAPTER_PERIOD.totalMeetings - meetingNow;
        return (
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-slate-700">
                第13屆會期進度　{CHAPTER_PERIOD.start} ～ {CHAPTER_PERIOD.end}
              </span>
              <span className="text-xs font-bold text-indigo-600">
                第 {meetingNow} 次 / 共 {CHAPTER_PERIOD.totalMeetings} 次　剩 {remaining} 次
              </span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>4/1 開始</span>
              <span className="font-bold text-indigo-500">{pct}% 完成</span>
              <span>9/30 結束</span>
            </div>
          </div>
        );
      })()}

      {subTab === "trend" && <TrendPanel currentMembers={members} />}

      {subTab === "overview" && <>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="會員人數" value={stats.total} sub={`目標 ${goals.memberTarget}`} />
        <StatCard label="一對一 121" value={stats.totalOneToOne} sub={`目標 ${goals.oneToOneTarget}`} color="text-indigo-700" />
        <StatCard label="提供引薦總計" value={stats.totalRefGiven} sub={`內 ${stats.totalRefGivenInt} / 外 ${stats.totalRefGivenExt}`} color="text-rose-700" />
        <StatCard label="來賓" value={stats.totalVisitors} sub={`目標 ${goals.visitorTarget}`} color="text-amber-700" />
        <StatCard label="教育培訓 總計" value={stats.totalCeu} sub={`目標 ${goals.memberTarget * goals.kpiCeuPerMember}`} color="text-teal-700" />
        <StatCard
          label="總交易價值"
          value={`$${stats.totalTxValue >= 10000 ? (stats.totalTxValue / 10000).toFixed(1) + "萬" : stats.totalTxValue.toLocaleString()}`}
          color="text-emerald-700"
        />
      </div>

      {/* 本週之星 */}
      {(starRefGiven.names.length > 0 || starTxValue.names.length > 0 || starVisitors.names.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              label: "給出引薦最多",
              icon: "📨",
              value: starRefGiven.value > 0 ? `${starRefGiven.value} 張` : null,
              names: starRefGiven.names,
              gradient: "from-rose-50 to-orange-50",
              border: "border-rose-200",
              badge: "bg-rose-100 text-rose-700",
              nameColor: "text-rose-800",
            },
            {
              label: "引薦金額最多",
              icon: "💰",
              value: starTxValue.value > 0 ? `NT$${starTxValue.value.toLocaleString()}` : null,
              names: starTxValue.names,
              gradient: "from-emerald-50 to-teal-50",
              border: "border-emerald-200",
              badge: "bg-emerald-100 text-emerald-700",
              nameColor: "text-emerald-800",
            },
            {
              label: "帶來賓最多",
              icon: "🙋",
              value: starVisitors.value > 0 ? `${starVisitors.value} 位` : null,
              names: starVisitors.names,
              gradient: "from-amber-50 to-yellow-50",
              border: "border-amber-200",
              badge: "bg-amber-100 text-amber-700",
              nameColor: "text-amber-800",
            },
          ].map(({ label, icon, value, names, gradient, border, badge, nameColor }) =>
            value ? (
              <div key={label} className={`bg-gradient-to-br ${gradient} rounded-2xl border ${border} p-4 shadow-sm`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{icon} {label}</span>
                  {names.length > 1 && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${badge}`}>並列 {names.length} 人</span>
                  )}
                </div>
                <p className="text-2xl font-black text-slate-800 mb-1">{value}</p>
                <p className={`text-sm font-bold ${nameColor} leading-snug`}>
                  {names.join("　·　")}
                </p>
              </div>
            ) : null
          )}
        </div>
      )}

      {/* Progress Bars */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-rose-800" /> 本週目標達成率
        </h3>
        <Progress label="一對一 121" value={stats.totalOneToOne} max={goals.oneToOneTarget} color="#7c3aed" />
        <Progress label="提供引薦（內部+外部）" value={stats.totalRefGiven} max={goals.referralTarget} color="#dc2626" />
        <Progress label="來賓" value={stats.totalVisitors} max={goals.visitorTarget} color="#d97706" />
        <div className="pt-2 border-t border-slate-100">
          <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
            <span>出席率（PALMS P）</span>
            <span>{stats.palmsCounts.P} / {stats.total} ({stats.total > 0 ? Math.round((stats.palmsCounts.P / stats.total) * 100) : 0}%)</span>
          </div>
          <HBar3D pct={stats.total > 0 ? stats.palmsCounts.P / stats.total : 0} color="#16a34a" height={10} />
          {stats.absenceRate > goals.absenceWarningRate && (
            <p className="text-xs text-red-600 mt-1 font-semibold">
              ⚠️ 缺席率 {stats.absenceRate}% 超過警戒線 {goals.absenceWarningRate}%（A+S）
            </p>
          )}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* PALMS Pie */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-indigo-600" /> PALMS 出席分佈
          </h3>
          {palmsChartData.length > 0 ? (
            <div style={{ transform: 'perspective(500px) rotateX(20deg)', transformOrigin: 'center 65%' }}>
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie data={palmsChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                    {palmsChartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-center text-slate-400 text-sm py-12">無資料</p>
          )}
          <div className="flex flex-wrap gap-1.5 mt-2 justify-center">
            {(["P", "A", "L", "M", "S"] as PALMS[]).map(p => (
              <span key={p} className="text-xs px-2 py-0.5 rounded-full font-semibold text-white" style={{ backgroundColor: PALMS_COLORS[p] }}>
                {p} {PALMS_LABEL[p]}: {stats.palmsCounts[p]}
              </span>
            ))}
          </div>
        </div>

        {/* Traffic Light Pie */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-rose-700" /> KPI 紅黃綠燈分佈
          </h3>
          {lightChartData.length > 0 ? (
            <div style={{ transform: 'perspective(500px) rotateX(20deg)', transformOrigin: 'center 65%' }}>
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie data={lightChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} label={({ name, value }) => `${value}人`} >
                    {lightChartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-center text-slate-400 text-sm py-12">無資料</p>
          )}
          <p className="text-xs text-slate-400 text-center mt-1">
            綠燈：P出席 + 121≥{goals.kpi121PerMember} + 引薦≥{goals.kpiReferralPerMember}
          </p>
        </div>

        {/* Referral Internal vs External */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-teal-600" /> 引薦結構分析
          </h3>
          <div className="space-y-3 mt-4">
            {[
              { label: "提供內部引薦", value: stats.totalRefGivenInt, colorHex: "#6366f1" },
              { label: "提供外部引薦", value: stats.totalRefGivenExt, colorHex: "#f43f5e" },
              { label: "收到內部引薦", value: stats.totalRefRecInt, colorHex: "#14b8a6" },
              { label: "收到外部引薦", value: stats.totalRefRecExt, colorHex: "#f59e0b" },
            ].map(({ label, value, colorHex }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-xs text-slate-600 w-28 shrink-0">{label}</span>
                <div className="flex-1">
                  <HBar3D pct={Math.min(1, value / (Math.max(stats.totalRefGivenInt, stats.totalRefGivenExt, stats.totalRefRecInt, stats.totalRefRecExt) || 1))} color={colorHex} height={10} />
                </div>
                <span className="text-xs font-bold text-slate-700 w-6 text-right">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Members Bar Chart */}
      {topMembers.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h3 className="font-bold text-slate-800 text-sm mb-4">Top 10 夥伴 121 & 引薦排行</h3>
          <ResponsiveContainer width="100%" height={270}>
            <BarChart data={topMembers} margin={{ top: 8, right: 10, bottom: 36, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 13, fontWeight: 600, fill: "#334155" }}
                interval={0}
                angle={-30}
                textAnchor="end"
                dy={6}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend wrapperStyle={{ paddingTop: 12 }} />
              <Bar dataKey="一對一" fill="#7c3aed" shape={<Bar3D />} />
              <Bar dataKey="給引薦" fill="#dc2626" shape={<Bar3D />} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 領導團隊 KPI 表格 */}
      <RoleKPITable
        title="領導團隊 KPI"
        icon={<span className="text-base">👑</span>}
        members={members.filter(m => LEADERSHIP_ROLES.has(m.role))}
        accStats={accStats}
        goals={goals}
        accentCls="bg-indigo-700"
        headerCls="bg-indigo-50 text-indigo-900 border-b border-indigo-100"
      />

      {/* 會員委員會 KPI 表格 */}
      <RoleKPITable
        title="會員委員會 KPI"
        icon={<span className="text-base">🛡️</span>}
        members={members.filter(m => m.role === "會員委員會")}
        accStats={accStats}
        goals={goals}
        accentCls="bg-emerald-700"
        headerCls="bg-emerald-50 text-emerald-900 border-b border-emerald-100"
      />

      {/* Member Detail Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <h3 className="font-bold text-slate-800 text-base flex-1">夥伴會員 KPI 明細</h3>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜尋姓名/產業"
              className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:border-rose-700 outline-none w-44" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b text-xs font-semibold text-slate-500">
                {([
                  { key: "姓名",   align: "text-left"   },
                  { key: "產業",   align: "text-left"   },
                  { key: "PALMS", align: "text-center"  },
                  { key: "121",   align: "text-center"  },
                  { key: "給引薦", align: "text-center"  },
                  { key: "收引薦", align: "text-center"  },
                  { key: "來賓",   align: "text-center"  },
                  { key: "交易額", align: "text-center"  },
                  { key: "CEU",   align: "text-center"  },
                  { key: "燈號",   align: "text-center"  },
                ] as const).map(({ key, align }) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    className={`px-4 py-2 ${align} cursor-pointer select-none hover:bg-slate-100 transition-colors group`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {key}
                      <span className={`text-[10px] transition-opacity ${sortKey === key ? "opacity-100 text-rose-600" : "opacity-0 group-hover:opacity-40"}`}>
                        {sortKey === key ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
                      </span>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map(m => {
                const acc = findAcc(m, accStats);
                const light = memberLightAccurate(m, acc);
                const score = memberScoreAccurate(m, acc);
                const lightUI = light === "green" ? "🟢" : light === "yellow" ? "🟡" : light === "red" ? "🔴" : "⚫";
                const refGiven = totalReferralsGiven(m);
                const refRec = m.referralsReceivedInternal + m.referralsReceivedExternal;
                return (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-semibold text-slate-800">{memberName(m)}</td>
                    <td className="px-4 py-2.5 text-slate-500 text-xs">{m.category}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: PALMS_COLORS[m.palms] + "20", color: PALMS_COLORS[m.palms] }}>
                        {m.palms} {PALMS_LABEL[m.palms]}
                      </span>
                    </td>
                    <td className={`px-4 py-2.5 text-center font-bold ${m.oneToOne >= goals.kpi121PerMember ? "text-green-700" : "text-rose-600"}`}>{m.oneToOne}</td>
                    <td className={`px-4 py-2.5 text-center font-bold ${refGiven >= goals.kpiReferralPerMember ? "text-green-700" : "text-rose-600"}`}>
                      {refGiven} <span className="text-xs font-normal text-slate-400">({m.referralsGivenInternal}+{m.referralsGivenExternal})</span>
                    </td>
                    <td className="px-4 py-2.5 text-center text-slate-600">{refRec} <span className="text-xs text-slate-400">({m.referralsReceivedInternal}+{m.referralsReceivedExternal})</span></td>
                    <td className="px-4 py-2.5 text-center text-slate-600">{m.visitors}</td>
                    <td className="px-4 py-2.5 text-center text-slate-600 text-xs">{m.transactionValue > 0 ? `$${m.transactionValue.toLocaleString()}` : "—"}</td>
                    <td className={`px-4 py-2.5 text-center font-bold ${m.ceu >= goals.kpiCeuPerMember ? "text-teal-700" : "text-slate-400"}`}>{m.ceu}</td>
                    <td className="px-4 py-2.5 text-center text-lg">{lightUI} <span className="text-xs font-bold text-slate-500">{score}分</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 六組 KPI 競賽排行榜 — 3D 直立柱狀圖 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          <h3 className="text-base font-black text-slate-800">六組平均積分排行榜</h3>
          <span className="text-xs text-slate-400 ml-auto">
            {accStats.length > 0 ? `累積 ${accStats[0]?.weeksRecorded ?? "?"} 週歷史精算` : "本週 KPI 即時估算"}
            　·　第13屆 4/10～9/30
          </span>
        </div>
        <GroupRankChart3D groups={groupRankings} />
      </div>

      {/* 引薦活躍度 — 3D 分組直立柱狀圖 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-sm font-black text-slate-800 mb-2">引薦活躍度 — 給出 vs 收入</h3>
        <ReferralChart3D members={members} accStats={accStats} />
      </div>

      </> }
    </div>
  );
}
