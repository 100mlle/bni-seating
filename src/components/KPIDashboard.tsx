import React, { useState, useMemo } from "react";
import { Member, ChapterGoals } from "../types";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar
} from "recharts";
import { 
  Users, 
  Compass, 
  TrendingUp, 
  Activity, 
  AlertCircle, 
  CheckCircle,
  HelpCircle,
  ArrowUpDown,
  Search,
  Download
} from "lucide-react";

interface KPIDashboardProps {
  members: Member[];
  goals: ChapterGoals;
}

export default function KPIDashboard({ members, goals }: KPIDashboardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [lightFilter, setLightFilter] = useState<"ALL" | "GREEN" | "YELLOW" | "RED">("ALL");
  const [attendanceFilter, setAttendanceFilter] = useState<"ALL" | "出席" | "請假" | "缺席">("ALL");
  const [sortField, setSortField] = useState<"name" | "category" | "oneToOne" | "referrals" | "visitors" | "light">("light");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Basic aggregates
  const stats = useMemo(() => {
    const total = members.length;
    const visitors = members.reduce((sum, m) => sum + m.visitors, 0);
    const oneToOne = members.reduce((sum, m) => sum + m.oneToOne, 0);
    const referrals = members.reduce((sum, m) => sum + m.referrals, 0);
    
    const absentCount = members.filter(m => m.attendance === "缺席").length;
    const leaveCount = members.filter(m => m.attendance === "請假").length;
    const presentCount = members.filter(m => m.attendance === "出席").length;
    
    const absenceRate = total > 0 ? Math.round((absentCount / total) * 100) : 0;
    const leaveRate = total > 0 ? Math.round((leaveCount / total) * 100) : 0;
    const attendanceRate = total > 0 ? Math.round((presentCount / total) * 100) : 0;

    // Lights
    const green: Member[] = [];
    const yellow: Member[] = [];
    const red: Member[] = [];

    members.forEach(m => {
      const isGreen = m.oneToOne >= goals.kpi121PerMember && m.referrals >= goals.kpiReferralPerMember;
      if (isGreen) {
        green.push(m);
      } else if (m.oneToOne > 0 || m.referrals > 0) {
        yellow.push(m);
      } else {
        red.push(m);
      }
    });

    return {
      total,
      visitors,
      oneToOne,
      referrals,
      absentCount,
      leaveCount,
      presentCount,
      absenceRate,
      leaveRate,
      attendanceRate,
      greenCount: green.length,
      yellowCount: yellow.length,
      redCount: red.length,
      green,
      yellow,
      red
    };
  }, [members, goals]);

  // Percentage calculations
  const percent = (actual: number, target: number) => {
    if (!target || target <= 0) return 0;
    return Math.round((actual / target) * 100);
  };

  // Recharts target data
  const weeklyKPIChartData = [
    {
      name: "121 交流 (次)",
      "目標總量": goals.oneToOneTarget,
      "實際完成": stats.oneToOne,
    },
    {
      name: "引薦單量 (張)",
      "目標總量": goals.referralTarget,
      "實際完成": stats.referrals,
    },
    {
      name: "邀請來賓 (人)",
      "目標總量": goals.visitorTarget,
      "實際完成": stats.visitors,
    }
  ];

  // Recharts light distribution
  const trafficLightPieData = [
    { name: "🟢 綠燈 - KPI皆達標 ", value: stats.greenCount, color: "#10b981" },
    { name: "🟡 黃燈 - 部份達標 ", value: stats.yellowCount, color: "#f59e0b" },
    { name: "🔴 紅燈 - 需要暖心關懷 ", value: stats.redCount, color: "#ef4444" }
  ].filter(item => item.value > 0);

  // Chapters radial data
  const attendanceGaugeData = [
    { name: "缺席率", value: stats.absenceRate, fill: stats.absenceRate >= goals.absenceWarningRate ? "#ef4444" : "#64748b" },
    { name: "請假率", value: stats.leaveRate, fill: "#f59e0b" },
    { name: "出席率", value: stats.attendanceRate, fill: "#10b981" }
  ];

  // Sorting and filtering members
  const filteredMembers = useMemo(() => {
    return members
      .filter(m => {
        // Search filter
        const matchedSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              m.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              m.role.toLowerCase().includes(searchTerm.toLowerCase());
        
        // Light filter
        const isGreen = m.oneToOne >= goals.kpi121PerMember && m.referrals >= goals.kpiReferralPerMember;
        const isYellow = !isGreen && (m.oneToOne > 0 || m.referrals > 0);
        const isRed = !isGreen && !isYellow;
        
        let matchedLight = true;
        if (lightFilter === "GREEN") matchedLight = isGreen;
        else if (lightFilter === "YELLOW") matchedLight = isYellow;
        else if (lightFilter === "RED") matchedLight = isRed;

        // Attendance filter
        let matchedAttendance = true;
        if (attendanceFilter !== "ALL") matchedAttendance = m.attendance === attendanceFilter;

        return matchedSearch && matchedLight && matchedAttendance;
      })
      .sort((a, b) => {
        let valA: any = a[sortField === "light" ? "oneToOne" : sortField];
        let valB: any = b[sortField === "light" ? "oneToOne" : sortField];

        if (sortField === "light") {
          // Calculate score based on green > yellow > red
          const getLightScore = (m: Member) => {
            const isG = m.oneToOne >= goals.kpi121PerMember && m.referrals >= goals.kpiReferralPerMember;
            if (isG) return 3;
            if (m.oneToOne > 0 || m.referrals > 0) return 2;
            return 1;
          };
          valA = getLightScore(a);
          valB = getLightScore(b);
        }

        if (typeof valA === "string") {
          return sortOrder === "asc" 
            ? valA.localeCompare(valB) 
            : valB.localeCompare(valA);
        } else {
          return sortOrder === "asc"
            ? (valA as number) - (valB as number)
            : (valB as number) - (valA as number);
        }
      });
  }, [members, searchTerm, lightFilter, attendanceFilter, sortField, sortOrder, goals]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const getLightBgAndEmoji = (m: Member) => {
    const isGreen = m.oneToOne >= goals.kpi121PerMember && m.referrals >= goals.kpiReferralPerMember;
    const isYellow = !isGreen && (m.oneToOne > 0 || m.referrals > 0);
    if (isGreen) return { bg: "bg-green-50 text-green-700 border-green-200", emoji: "🟢 達標" };
    if (isYellow) return { bg: "bg-amber-50 text-amber-700 border-amber-200", emoji: "🟡 補強" };
    return { bg: "bg-rose-50 text-rose-700 border-rose-200", emoji: "🔴 關懷" };
  };

  return (
    <div className="space-y-4" id="kpi-dashboard-container">
      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Members */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-0.5 flex-1 min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">分會總會員數</p>
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">{stats.total}</span>
              <span className="text-[10px] text-slate-400">/ 目標 {goals.memberTarget} 人</span>
            </div>
            <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden mt-1.5">
              <div 
                className="bg-rose-800 h-1 rounded-full transition-all duration-550"
                style={{ width: `${Math.min(100, percent(stats.total, goals.memberTarget))}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500 font-semibold mt-1">達成率: {percent(stats.total, goals.memberTarget)}%</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center border border-rose-100 shrink-0 ml-2">
            <Users className="w-4.5 h-4.5 text-rose-800" />
          </div>
        </div>

        {/* Weekly Visitors */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-0.5 flex-1 min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">本週來賓總人數</p>
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">{stats.visitors}</span>
              <span className="text-[10px] text-slate-400">/ 目標 {goals.visitorTarget} 人</span>
            </div>
            <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden mt-1.5">
              <div 
                className="bg-indigo-600 h-1 rounded-full transition-all duration-550"
                style={{ width: `${Math.min(100, percent(stats.visitors, goals.visitorTarget))}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500 font-semibold mt-1">本週達成: {percent(stats.visitors, goals.visitorTarget)}%</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center border border-indigo-100 shrink-0 ml-2">
            <Compass className="w-4.5 h-4.5 text-indigo-600" />
          </div>
        </div>

        {/* Weekly 1 to 1s */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-0.5 flex-1 min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">本週 1 對 1 交流</p>
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">{stats.oneToOne}</span>
              <span className="text-[10px] text-slate-400">/ 目標 {goals.oneToOneTarget} 次</span>
            </div>
            <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden mt-1.5">
              <div 
                className="bg-emerald-600 h-1 rounded-full transition-all duration-550"
                style={{ width: `${Math.min(100, percent(stats.oneToOne, goals.oneToOneTarget))}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500 font-semibold mt-1">本週達成: {percent(stats.oneToOne, goals.oneToOneTarget)}%</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center border border-emerald-100 shrink-0 ml-2">
            <TrendingUp className="w-4.5 h-4.5 text-emerald-600" />
          </div>
        </div>

        {/* Weekly Referrals */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-0.5 flex-1 min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">本週引薦單成交/引導</p>
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">{stats.referrals}</span>
              <span className="text-[10px] text-slate-400">/ 目標 {goals.referralTarget} 張</span>
            </div>
            <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden mt-1.5">
              <div 
                className="bg-amber-500 h-1 rounded-full transition-all duration-550"
                style={{ width: `${Math.min(100, percent(stats.referrals, goals.referralTarget))}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500 font-semibold mt-1">本週達成: {percent(stats.referrals, goals.referralTarget)}%</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center border border-amber-100 shrink-0 ml-2">
            <Activity className="w-4.5 h-4.5 text-amber-500" />
          </div>
        </div>

      </div>

      {/* Traffic Lights quick indicator cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        
        <div className="bg-green-50/40 hover:bg-green-50/80 rounded-xl p-3 border border-green-150 shadow-2xs transition">
          <span className="text-[10px] font-bold text-green-700 tracking-wider block uppercase">🟢 綠燈達標學長姊</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-2xl font-black text-green-700 font-mono">{stats.greenCount}</span>
            <span className="text-[11px] text-green-600 font-medium">人 ({stats.total > 0 ? Math.round((stats.greenCount / stats.total) * 100) : 0}%)</span>
          </div>
          <p className="text-[11px] text-green-600 mt-1 leading-normal">
            雙項 KPI 達標。列為分會商業代表，大會公開表揚並安排心法分享。
          </p>
        </div>

        <div className="bg-amber-50/40 hover:bg-amber-50/80 rounded-xl p-3 border border-amber-150 shadow-2xs transition">
          <span className="text-[10px] font-bold text-amber-800 tracking-wider block uppercase">🟡 黃燈輔導學長姊</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-2xl font-black text-amber-700 font-mono">{stats.yellowCount}</span>
            <span className="text-[11px] text-amber-600 font-medium">人 ({stats.total > 0 ? Math.round((stats.yellowCount / stats.total) * 100) : 0}%)</span>
          </div>
          <p className="text-[11px] text-amber-700 mt-1 leading-normal">
            單項 KPI 達標。本店會期主要輔導對象，最易激活提效的動能核心。
          </p>
        </div>

        <div className="bg-rose-50/40 hover:bg-rose-50/80 rounded-xl p-3 border border-rose-150 shadow-2xs transition">
          <span className="text-[10px] font-bold text-rose-800 tracking-wider block uppercase">🔴 紅燈關懷學長姊</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-2xl font-black text-rose-700 font-mono">{stats.redCount}</span>
            <span className="text-[11px] text-rose-600 font-medium">人 ({stats.total > 0 ? Math.round((stats.redCount / stats.total) * 100) : 0}%)</span>
          </div>
          <p className="text-[11px] text-rose-600 mt-1 leading-normal">
            雙項暂未突破指標。實踐「私下暖心協助」理念，排解產業配對瓶頸。
          </p>
        </div>

      </div>

      {/* Corporate Recharts Visualizers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Visualizer: Targets comparison chart (7/12 width) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm lg:col-span-7 space-y-4">
          <h4 className="font-bold text-slate-800 text-base">本週營運指標 ── 目標量與實際量比較圖</h4>
          
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={weeklyKPIChartData}
                margin={{ top: 20, right: 10, left: -10, bottom: 5 }}
                barSize={32}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(241, 245, 249, 0.4)' }}
                  contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}
                />
                <Legend iconType="circle" />
                <Bar dataKey="目標總量" fill="#cbd5e1" radius={[6, 6, 0, 0]} />
                <Bar dataKey="實際完成" fill="#9f1239" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Visualizer: Traffic Light donut and Attendance Dial (5/12 width) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm lg:col-span-5 flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-slate-800 text-base mb-1">分會本週數據健康分佈</h4>
            <p className="text-xs text-slate-400 mb-3">紅黃綠燈與請假/出席率多重關聯比對</p>
          </div>

          <div className="grid grid-cols-2 gap-4 items-center">
            
            {/* Traffic Light Donut Pie */}
            <div className="h-44 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={trafficLightPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {trafficLightPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} 人`, "會員數"]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute text-center">
                <span className="text-xs font-semibold text-slate-400 block leading-none">評核總量</span>
                <span className="text-xl font-extrabold text-slate-800 leading-none block mt-1">{stats.total} <span className="text-xs font-normal">人</span></span>
              </div>
            </div>

            {/* Attendance Dial representation */}
            <div className="space-y-3.5">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">出席狀態檢驗</span>
              
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-500">🟢 出席率 ({stats.presentCount}人)</span>
                  <span className="font-bold text-slate-800">{stats.attendanceRate}%</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${stats.attendanceRate}%` }}></div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-500">🟡 請假率 ({stats.leaveCount}人)</span>
                  <span className="font-bold text-slate-800">{stats.leaveRate}%</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-amber-400 h-full rounded-full" style={{ width: `${stats.leaveRate}%` }}></div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-500">🔴 缺席率 ({stats.absentCount}人)</span>
                  <span className={`font-bold ${stats.absenceRate >= goals.absenceWarningRate ? "text-rose-600" : "text-slate-800"}`}>
                    {stats.absenceRate}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${stats.absenceRate >= goals.absenceWarningRate ? "bg-rose-500 animate-pulse" : "bg-slate-400"}`} style={{ width: `${stats.absenceRate}%` }}></div>
                </div>
              </div>

            </div>

          </div>

          <div className="border-t border-slate-150 pt-2 flex items-center gap-1 text-[11px] text-slate-500 mt-2">
            {stats.absenceRate >= goals.absenceWarningRate ? (
              <span className="text-rose-600 font-bold flex items-center gap-0.5">
                ⚠️ 缺席率已達 {stats.absenceRate}% 警戒值！已召集會委關懷。
              </span>
            ) : (
              <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                ✓ 出席良好。未達 {goals.absenceWarningRate}% 警戒線。
              </span>
            )}
          </div>
        </div>

      </div>

      {/* Advanced Members Grid */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        
        {/* Filter controls */}
        <div className="p-4 border-b border-slate-150 bg-slate-50/50 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <h4 className="font-bold text-slate-800 text-sm">分會本週數據明細表</h4>
            
            <div className="relative w-full md:w-72">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="搜尋姓名、職位或產業類別..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-rose-700 focus:ring-1 focus:ring-rose-700 transition"
              />
            </div>
          </div>

          {/* Tag filters */}
          <div className="flex flex-wrap gap-1.5 text-[11px] items-center">
            <span className="font-bold text-slate-500 mr-1 shrink-0">燈號篩選：</span>
            <button
              onClick={() => setLightFilter("ALL")}
              className={`px-2 py-1 rounded border font-semibold transition cursor-pointer ${lightFilter === "ALL" ? "bg-slate-800 border-slate-800 text-white" : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"}`}
            >
              全部 ({members.length})
            </button>
            <button
              onClick={() => setLightFilter("GREEN")}
              className={`px-2 py-1 rounded border font-semibold transition cursor-pointer ${lightFilter === "GREEN" ? "bg-green-600 border-green-600 text-white" : "bg-green-50/40 border-green-200 hover:bg-green-50 text-green-700"}`}
            >
              🟢 綠燈 ({stats.greenCount})
            </button>
            <button
              onClick={() => setLightFilter("YELLOW")}
              className={`px-2 py-1 rounded border font-semibold transition cursor-pointer ${lightFilter === "YELLOW" ? "bg-amber-500 border-amber-500 text-white" : "bg-amber-50/40 border-amber-200 hover:bg-amber-50 text-amber-700"}`}
            >
              🟡 黃燈 ({stats.yellowCount})
            </button>
            <button
              onClick={() => setLightFilter("RED")}
              className={`px-2 py-1 rounded border font-semibold transition cursor-pointer ${lightFilter === "RED" ? "bg-rose-600 border-rose-600 text-white" : "bg-rose-50/40 border-rose-200 hover:bg-rose-50 text-rose-700"}`}
            >
              🔴 紅燈 ({stats.redCount})
            </button>

            <div className="h-4 w-[1px] bg-slate-200 mx-1.5 self-center hidden sm:block shrink-0"></div>

            <span className="font-bold text-slate-500 mr-1 shrink-0">出席篩選：</span>
            {["ALL", "出席", "請假", "缺席"].map((att) => (
              <button
                key={att}
                onClick={() => setAttendanceFilter(att as any)}
                className={`px-2 py-1 rounded border font-semibold transition cursor-pointer ${attendanceFilter === att ? "bg-slate-700 border-slate-700 text-white" : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"}`}
              >
                {att === "ALL" ? "不限出席" : att}
              </button>
            ))}
          </div>
        </div>

        {/* Members static table representation inside dashboard */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-150">
                <th className="px-3 py-2.5 text-center cursor-pointer hover:bg-slate-100/60 w-[100px]" onClick={() => handleSort("light")}>
                  <div className="flex items-center justify-center gap-0.5">
                    燈號狀態 <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-3 py-2.5 cursor-pointer hover:bg-slate-100/60 font-semibold" onClick={() => handleSort("name")}>
                  <div className="flex items-center gap-0.5">
                    會員姓名 <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-3 py-2.5 cursor-pointer hover:bg-slate-100/60" onClick={() => handleSort("category")}>
                  <div className="flex items-center gap-0.5">
                    產業別 <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-3 py-2.5">主要頭銜</th>
                <th className="px-3 py-2.5">出席</th>
                <th className="px-3 py-2.5 text-center cursor-pointer hover:bg-slate-100/60" onClick={() => handleSort("oneToOne")}>
                  <div className="flex items-center justify-center gap-0.5">
                    121 次數 <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-3 py-2.5 text-center cursor-pointer hover:bg-slate-100/60" onClick={() => handleSort("referrals")}>
                  <div className="flex items-center justify-center gap-0.5">
                    給出引薦 <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-3 py-2.5 text-center cursor-pointer hover:bg-slate-100/60" onClick={() => handleSort("visitors")}>
                  <div className="flex items-center justify-center gap-0.5">
                    邀請來賓 <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-3 py-2.5">續約進程</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    找不到符合篩選條件的學長姊。
                  </td>
                </tr>
              ) : (
                filteredMembers.map((m) => {
                  const { bg, emoji } = getLightBgAndEmoji(m);
                  
                  return (
                    <tr key={m.id} className="hover:bg-slate-55/65 transition-colors">
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none border ${bg}`}>
                          {emoji}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-bold text-slate-900">{m.name}</td>
                      <td className="px-3 py-2 text-slate-700">{m.category}</td>
                      <td className="px-3 py-2 text-slate-500 font-medium">{m.role}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          m.attendance === "出席" ? "bg-emerald-100 text-emerald-800" :
                          m.attendance === "請假" ? "bg-amber-100 text-amber-800" :
                          "bg-rose-100 text-rose-800 animate-pulse"
                        }`}>
                          {m.attendance}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center font-bold text-slate-800 font-mono">
                        <span className={m.oneToOne >= goals.kpi121PerMember ? "text-green-600" : "text-slate-700"}>
                          {m.oneToOne}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center font-bold text-slate-800 font-mono">
                        <span className={m.referrals >= goals.kpiReferralPerMember ? "text-green-600" : "text-slate-700"}>
                          {m.referrals}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center font-semibold text-slate-600 font-mono">{m.visitors}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          m.renewal === "已續約" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                          m.renewal === "未到期" ? "bg-slate-50 text-slate-600 border border-slate-100" :
                          m.renewal === "待追蹤" ? "bg-amber-50 text-amber-700 border border-amber-100" :
                          "bg-rose-50 text-rose-700 border border-rose-100"
                        }`}>
                          {m.renewal}
                        </span>
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
