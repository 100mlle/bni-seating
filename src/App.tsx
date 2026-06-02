import React, { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Member, ChapterGoals, WeeklyRecord, memberName, memberLightAccurate, findAcc } from "./types";
import { defaultMembers, defaultGoals, defaultCommitteeText, meetingNumberForDate, CHAPTER_PERIOD, currentMeetingNumber } from "./data";

import MemberEditor from "./components/MemberEditor";
import KPIDashboard from "./components/KPIDashboard";
import SlidesPreviewer from "./components/SlidesPreviewer";
import AIConsultantPanel from "./components/AIConsultantPanel";
import LineMessagePanel from "./components/LineMessagePanel";
import CommitteeMeetingPanel from "./components/CommitteeMeetingPanel";
import AlertPanel from "./components/AlertPanel";
import VisitorTracker from "./components/VisitorTracker";

import {
  Sliders, BarChart3, Presentation, Sparkles, FileText,
  MessageCircle, Bookmark, Heart, Save, Clock, Users, ShieldAlert, Download, UserCheck,
  CalendarDays, TrendingUp, ChevronRight
} from "lucide-react";
import { AccumulatedStats } from "./types";

const MAX_WEEKS = 26;

export default function App() {
  const [activeTab, setActiveTab] = useState<"input" | "dashboard" | "slides" | "ai" | "line" | "alert" | "committee" | "guidelines" | "visitors">("input");
  const [accStats, setAccStats] = useState<AccumulatedStats[]>([]);

  const [weekTitle, setWeekTitle] = useState(() => {
    const today = new Date().toISOString().split("T")[0];
    const n = meetingNumberForDate(today);
    const mmdd = today.slice(5).replace("-", "/");
    return `第 ${n} 次例會 ${mmdd}`;
  });
  const [stage, setStage] = useState("stage1");
  const [committeeText, setCommitteeText] = useState(defaultCommitteeText);
  const [goals, setGoals] = useState<ChapterGoals>(defaultGoals);
  const [members, setMembers] = useState<Member[]>(defaultMembers);
  const [customAINotes, setCustomAINotes] = useState<string[] | undefined>(undefined);

  const [history, setHistory] = useState<WeeklyRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [absenceWarning, setAbsenceWarning] = useState<string[]>([]);
  const [dashboardWeekIdx, setDashboardWeekIdx] = useState(0); // 0 = 本週，1+ = 歷史
  const autoLoaded = useRef(false);

  useEffect(() => {
    fetch("/api/history")
      .then(r => r.json())
      .then((data: WeeklyRecord[]) => {
        const sliced = data.slice(0, MAX_WEEKS);
        setHistory(sliced);
        // 啟動時自動套入最新週次數據
        if (!autoLoaded.current && sliced.length > 0) {
          autoLoaded.current = true;
          const latest = sliced[0];
          setMembers(latest.members);
          if (latest.committeeText) setCommitteeText(latest.committeeText);
          const n = meetingNumberForDate(latest.date);
          const mmdd = latest.date.slice(5).replace("-", "/");
          setWeekTitle(`第 ${n} 次例會 ${mmdd}`);
        }
      })
      .catch(() => {});
    fetch("/api/history/accumulated")
      .then(r => r.json())
      .then((data: AccumulatedStats[]) => setAccStats(data))
      .catch(() => {});
    fetch("/api/goals")
      .then(r => r.json())
      .then((data: ChapterGoals | null) => { if (data) setGoals(data); })
      .catch(() => {});
  }, []);

  const refreshHistory = useCallback(() => {
    fetch("/api/history")
      .then(r => r.json())
      .then((data: WeeklyRecord[]) => setHistory(data.slice(0, MAX_WEEKS)))
      .catch(() => {});
    fetch("/api/history/accumulated")
      .then(r => r.json())
      .then((data: AccumulatedStats[]) => setAccStats(data))
      .catch(() => {});
  }, []);

  const handleApplyAIScripts = useCallback((scripts: string[]) => {
    setCustomAINotes(scripts);
    setActiveTab("slides");
  }, []);

  const saveWeek = async () => {
    const record: WeeklyRecord = {
      id: `week-${Date.now()}`,
      weekTitle,
      date: new Date().toISOString().split("T")[0],
      members: [...members],
      goals: { ...goals },
      committeeText,
    };
    await fetch("/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    });
    setHistory(prev => [record, ...prev].slice(0, MAX_WEEKS));
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  };

  const deleteWeek = async (id: string) => {
    await fetch(`/api/history/${id}`, { method: "DELETE" });
    setHistory(prev => prev.filter(r => r.id !== id));
  };

  const loadWeek = (record: WeeklyRecord) => {
    // 合併：PALMS 數據來自歷史，category/role 保留現有會員資料
    const metaMap = new Map<string, Member>(members.map(m => [`${m.lastName}${m.firstName}`, m] as [string, Member]));
    const merged: Member[] = record.members.map((m: Member) => {
      const existing = metaMap.get(`${m.lastName}${m.firstName}`);
      return {
        ...m,
        id: existing?.id ?? m.id,
        category: m.category || existing?.category || "未填寫",
        role: m.role || existing?.role || "夥伴會員",
      };
    });
    setMembers(merged);
    setCommitteeText(record.committeeText || committeeText);
    // 依日期重新計算正確的例會次數
    const n = meetingNumberForDate(record.date);
    const mmdd = record.date.slice(5).replace("-", "/");
    setWeekTitle(`第 ${n} 次例會 ${mmdd}`);
    setShowHistory(false);
    setActiveTab("input");
    // Check accumulated absence warnings
    const atRisk = accStats.filter(a =>
      (a.absenceRuleCount ?? 0) >= 2 || (a.substituteRuleCount ?? 0) >= 2
    );
    if (atRisk.length > 0) {
      setAbsenceWarning(atRisk.map(a => {
        const parts: string[] = [];
        if ((a.absenceRuleCount ?? 0) >= 2) parts.push(`缺席 ${a.absenceRuleCount} 次`);
        if ((a.substituteRuleCount ?? 0) >= 2) parts.push(`代理人 ${a.substituteRuleCount} 次`);
        return `${a.memberName}（${parts.join("、")}）`;
      }));
      setTimeout(() => setAbsenceWarning([]), 8000);
    }
  };

  const saveGoals = async (newGoals: ChapterGoals) => {
    setGoals(newGoals);
    await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newGoals),
    }).catch(() => {});
  };

  const tabs = [
    { key: "input", label: "數據輸入", icon: Sliders },
    { key: "dashboard", label: "核心看板", icon: BarChart3 },
    { key: "slides", label: "16:9 簡報", icon: Presentation },
    { key: "ai", label: "AI 診斷", icon: Sparkles },
    { key: "line", label: "LINE 提醒", icon: MessageCircle },
    { key: "alert", label: "緊急警示", icon: ShieldAlert },
    { key: "committee", label: "月會任務", icon: Users },
    { key: "guidelines", label: "操作指南", icon: FileText },
    { key: "visitors", label: "來賓追蹤", icon: UserCheck },
  ] as const;

  // Chapter progress
  const todayStr = new Date().toISOString().split("T")[0];
  const currentMtg = currentMeetingNumber();
  const progressPct = Math.round((currentMtg / CHAPTER_PERIOD.totalMeetings) * 100);
  const todayDisplay = todayStr.replace(/-/g, "/");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-rose-50/30 text-slate-800 flex flex-col font-sans">

      {/* ── Header ── */}
      <header className="relative bg-gradient-to-br from-rose-950 via-[#5a0a14] to-slate-900 text-white shadow-2xl overflow-hidden">
        {/* decorative background rings */}
        <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-rose-800/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 w-64 h-64 rounded-full bg-amber-600/10 blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 pt-4 pb-3">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">

            {/* LEFT — branding */}
            <div className="flex items-center gap-4">
              {/* BNI badge — larger */}
              <div className="shrink-0 flex flex-col items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-xl shadow-amber-900/50 border-2 border-amber-300/40">
                <span className="text-rose-950 font-black text-xl leading-none tracking-tight">BNI</span>
                <div className="w-10 h-px bg-rose-900/30 my-1" />
                <span className="text-rose-950 font-black text-base tracking-widest leading-none">長溙</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-amber-400 text-[10px] font-bold tracking-widest uppercase">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Vice President · Executive Data Console
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                  BNI 長溙分會 副主席數據平台
                </h1>
                <p className="text-rose-200/60 text-xs">
                  PALMS 匯入 · 紅黃綠燈自動計算 · AI 講稿 · LINE KPI 提醒
                </p>
              </div>
            </div>

            {/* RIGHT — info cards + actions */}
            <div className="flex flex-col gap-2 items-end shrink-0">
              {/* info row */}
              <div className="flex items-center gap-2">
                {/* current meeting badge */}
                <div className="flex flex-col items-center px-3.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/30 backdrop-blur-sm">
                  <span className="text-amber-300 text-[10px] font-bold tracking-wider">本次例會</span>
                  <span className="text-amber-100 text-xl font-black leading-none">第 {currentMtg} 次</span>
                  <span className="text-amber-300/70 text-[9px]">/ {CHAPTER_PERIOD.totalMeetings} 次</span>
                </div>
                {/* date badge */}
                <div className="flex flex-col items-center px-3.5 py-1.5 rounded-xl bg-white/10 border border-white/10 backdrop-blur-sm">
                  <span className="text-slate-300 text-[10px] font-bold tracking-wider">今日</span>
                  <span className="text-white text-sm font-black leading-tight">{todayDisplay}</span>
                  <span className="text-slate-300/70 text-[9px]">第13屆會期</span>
                </div>
              </div>
              {/* action buttons */}
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                <button onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg border border-white/15 cursor-pointer transition">
                  <Clock className="w-3.5 h-3.5" />
                  歷史記錄 <span className="bg-white/20 rounded px-1">{history.length}</span>
                </button>
                <button onClick={saveWeek}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition border shadow-sm ${
                    savedToast
                      ? "bg-green-500 border-green-400 text-white shadow-green-900/30"
                      : "bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 border-amber-300/50 text-rose-950 shadow-amber-900/20"
                  }`}>
                  <Save className="w-3.5 h-3.5" />
                  {savedToast ? "✓ 已儲存！" : "儲存本週"}
                </button>
                <button
                  onClick={() => { window.location.href = "/api/export"; }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg border border-white/15 cursor-pointer transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  備份
                </button>
              </div>
            </div>
          </div>

          {/* chapter progress bar */}
          <div className="mt-3 mb-1">
            <div className="flex justify-between text-[10px] text-rose-200/50 mb-1">
              <span>會期進度 {CHAPTER_PERIOD.start.slice(5).replace("-","/")} → {CHAPTER_PERIOD.end.slice(5).replace("-","/")}</span>
              <span className="text-amber-400 font-bold">{progressPct}%</span>
            </div>
            <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-700"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* History Panel */}
        {showHistory && (
          <div className="border-t border-white/10 bg-slate-900/60 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-4 py-3">
              <div className="flex items-center gap-3 mb-2.5">
                <CalendarDays className="w-3.5 h-3.5 text-amber-400" />
                <p className="text-xs font-bold text-amber-400">歷史週次（點擊載入）— 最近 {MAX_WEEKS} 週</p>
                <button onClick={refreshHistory} className="ml-auto flex items-center gap-1 px-2.5 py-1 bg-sky-600/80 hover:bg-sky-500 text-white text-[11px] font-bold rounded-lg cursor-pointer transition">
                  ↻ 重整
                </button>
              </div>
              {history.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">尚無歷史記錄，點「儲存本週」開始累積。</p>
              ) : (
                <div className="flex flex-wrap gap-2 pb-1">
                  {history.map(r => {
                    const mNo = meetingNumberForDate(r.date);
                    return (
                      <div key={r.id} className="group flex items-stretch bg-white/8 border border-white/12 hover:border-amber-400/50 rounded-xl overflow-hidden transition">
                        <button onClick={() => loadWeek(r)}
                          className="px-3.5 py-2 hover:bg-white/15 text-white text-xs cursor-pointer text-left transition">
                          <span className="text-amber-300 font-black block text-[11px]">第 {mNo} 次例會</span>
                          <span className="text-slate-400 text-[10px]">{r.date}</span>
                        </button>
                        <button onClick={() => deleteWeek(r.id)}
                          className="px-2.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/40 text-slate-400 hover:text-white text-xs cursor-pointer border-l border-white/10 transition">
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* A+S 預警 Toast */}
      {absenceWarning.length > 0 && (
        <div className="fixed top-24 right-4 z-50 bg-amber-50 border-2 border-amber-400 rounded-2xl p-4 shadow-2xl max-w-xs">
          <div className="flex items-start gap-2.5">
            <span className="text-2xl shrink-0">⚠️</span>
            <div className="flex-1">
              <p className="font-black text-amber-900 text-sm mb-1">出席警告！再缺一次即超規定</p>
              <ul className="text-xs text-amber-800 space-y-0.5">
                {absenceWarning.map(w => <li key={w}>· {w}</li>)}
              </ul>
              <p className="text-[10px] text-amber-600 mt-1.5 font-semibold">BNI 規定：缺席(A) 各別不超過 3 次 ／ 代理人(S) 各別不超過 3 次</p>
            </div>
            <button onClick={() => setAbsenceWarning([])} className="text-amber-400 hover:text-amber-700 cursor-pointer text-xl leading-none">×</button>
          </div>
        </div>
      )}

      {/* ── Tab Bar ── */}
      <div className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex gap-0.5 py-2 overflow-x-auto scrollbar-none">
            {(() => {
              const hasBlack = members.some(m => memberLightAccurate(m, findAcc(m, accStats)) === "black");
              return tabs.map(({ key, label, icon: Icon }) => {
                const hasAlert = key === "alert" && hasBlack;
                const isActive = activeTab === key;
                return (
                  <button key={key} onClick={() => setActiveTab(key)}
                    className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                      isActive
                        ? "bg-gradient-to-br from-rose-800 to-rose-950 text-white shadow-md shadow-rose-900/30"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                    }`}>
                    <Icon className={`w-3.5 h-3.5 ${isActive ? "text-amber-300" : ""}`} />
                    <span>{label}</span>
                    {hasAlert && (
                      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 border border-white animate-pulse" />
                    )}
                  </button>
                );
              });
            })()}
          </nav>
        </div>
      </div>

      {/* ── Main ── */}
      <main className="max-w-7xl w-full mx-auto px-4 py-5 flex-1">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}>

            {activeTab === "input" && (
              <MemberEditor
                members={members} onChangeMembers={setMembers}
                committeeText={committeeText} onChangeCommitteeText={setCommitteeText}
                goals={goals} onChangeGoals={saveGoals}
                stage={stage} onChangeStage={setStage}
                weekTitle={weekTitle} onChangeWeekTitle={setWeekTitle}
                accStats={accStats}
              />
            )}

            {activeTab === "dashboard" && (
              <KPIDashboard
                members={members} goals={goals} accStats={accStats} weekTitle={weekTitle}
                history={history}
                dashboardWeekIdx={dashboardWeekIdx}
                onDashboardWeekChange={setDashboardWeekIdx}
              />
            )}

            {activeTab === "slides" && (
              <SlidesPreviewer
                members={members} goals={goals} weekTitle={weekTitle}
                stage={stage} committeeText={committeeText} customAINotes={customAINotes}
                accStats={accStats}
              />
            )}

            {activeTab === "ai" && (
              <AIConsultantPanel
                members={members} goals={goals} weekTitle={weekTitle}
                stage={stage} committeeText={committeeText} onApplyAIScripts={handleApplyAIScripts}
              />
            )}

            {activeTab === "line" && (
              <LineMessagePanel members={members} goals={goals} weekTitle={weekTitle} accStats={accStats} />
            )}

            {activeTab === "alert" && (
              <AlertPanel members={members} goals={goals} weekTitle={weekTitle} accStats={accStats} />
            )}

            {activeTab === "committee" && (
              <CommitteeMeetingPanel members={members} />
            )}

            {activeTab === "visitors" && (
              <VisitorTracker memberNames={members.map(m => `${m.lastName}${m.firstName}`)} />
            )}

            {activeTab === "guidelines" && (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm max-w-4xl mx-auto">
                <div className="flex items-center gap-2 pb-4 border-b">
                  <Bookmark className="w-6 h-6 text-rose-800" />
                  <h3 className="text-xl font-black text-slate-800">BNI 副主席會後會核心指南</h3>
                </div>
                <div className="space-y-5 text-sm text-slate-600 leading-relaxed">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    {[
                      { title: "第一階段：只看團隊目標", desc: "大會上公布整體 121、引薦比率，不點名個人。培養數據習慣。" },
                      { title: "第二階段：表揚楷模夥伴", desc: "公開誇獎綠燈達標者，邀請分享一分鐘心法。榮譽驅動氛圍。" },
                      { title: "第三階段：暖心私下一對一", desc: "連續未達標者，嚴禁大會點名。會委會主動約 121，幫商業對策。" },
                    ].map(({ title, desc }) => (
                      <div key={title} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="font-extrabold text-slate-800 text-sm block mb-1">{title}</span>
                        <p className="text-slate-500">{desc}</p>
                      </div>
                    ))}
                  </div>

                  <div className="bg-rose-50 rounded-2xl p-5 border border-rose-100">
                    <p className="font-bold text-rose-950 flex items-center gap-1 mb-2">
                      <Heart className="w-4 h-4 text-rose-800" /> BNI PALMS 出席規範
                    </p>
                    <ul className="text-xs text-rose-800 space-y-1">
                      <li><strong>P (Present)</strong> — 全程出席，完整計分</li>
                      <li><strong>A (Absent)</strong> — 缺席，計入 6 個月計數</li>
                      <li><strong>L (Late)</strong> — 遲到，部分計分</li>
                      <li><strong>M (Medical)</strong> — 病假，計入 6 個月計數</li>
                      <li><strong>S (Substitute)</strong> — 代理人，同樣計入 6 個月計數</li>
                      <li className="font-bold mt-2">⚠️ 缺席（A）六個月內超過 3 次，面臨退會警告</li>
                      <li className="font-bold">⚠️ 代理人（S）六個月內超過 3 次，同樣面臨退會警告</li>
                    </ul>
                  </div>

                  <div className="bg-green-50 rounded-2xl p-5 border border-green-100">
                    <p className="font-bold text-green-900 mb-2">🟢 台灣 BNI 綠燈標準</p>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs text-green-800">
                      {[
                        { label: "出席", score: "20 分" },
                        { label: "教育培訓", score: "15 分 (每期3次)" },
                        { label: "121", score: "15 分 (每週2次)" },
                        { label: "邀來賓", score: "10 分 (每月1位)" },
                        { label: "引薦", score: "15 分 (每週1.5張)" },
                      ].map(({ label, score }) => (
                        <div key={label} className="bg-white rounded-lg p-2 text-center border border-green-100">
                          <p className="font-bold">{label}</p>
                          <p className="text-green-600">{score}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs font-bold text-green-900 mt-2">總分 75 分 = 綠燈達標會員</p>
                  </div>

                  <p className="italic text-center text-rose-800 font-semibold border-t pt-4">
                    「數據不是責備，是讓我們看見需要協助的人在哪裡。」
                  </p>
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-gradient-to-r from-slate-900 via-rose-950/80 to-slate-900 text-slate-400 border-t border-rose-900/30 mt-10">
        <div className="max-w-7xl mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 shadow">
              <span className="text-rose-950 font-black text-[9px] leading-none tracking-tighter">BNI</span>
            </div>
            <div>
              <p className="font-black text-white tracking-wide">BNI 長溙分會 · 第13屆 · 副主席數據平台</p>
              <p className="text-slate-500 text-[10px] mt-0.5">會期 {CHAPTER_PERIOD.start} ～ {CHAPTER_PERIOD.end} · 共 {CHAPTER_PERIOD.totalMeetings} 次例會</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-slate-500 text-[10px]">
            <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3 text-amber-500" /> Givers Gain</span>
            <span className="text-slate-700">|</span>
            <span>Powered by Claude AI</span>
            <span className="text-slate-700">|</span>
            <span>支援 PALMS 格式匯入</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
