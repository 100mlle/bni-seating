import React, { useState } from "react";
import { Member, ChapterGoals, CoachingNote, PALMS_LABEL, memberName, totalReferralsGiven } from "../types";
import {
  Sparkles, CheckCircle, AlertTriangle, Activity, TrendingUp,
  CornerDownRight, ShieldAlert, Sliders, BookmarkCheck
} from "lucide-react";

interface AIConsultantPanelProps {
  members: Member[];
  goals: ChapterGoals;
  weekTitle: string;
  stage: string;
  committeeText: string;
  onApplyAIScripts: (scripts: string[]) => void;
}

export default function AIConsultantPanel({
  members, goals, weekTitle, stage, committeeText, onApplyAIScripts
}: AIConsultantPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const [appliedScripts, setAppliedScripts] = useState(false);
  const [diagnoseResult, setDiagnoseResult] = useState<{
    chapterHealthScore: number;
    executiveSummary: string;
    coachingAdvice: CoachingNote[];
    powerTeamTraction: string;
    slideSpeakingNotes: string[];
    actionItems: string[];
  } | null>(null);

  const buildSummary = () => {
    const refGiven = members.reduce((s, m) => s + totalReferralsGiven(m), 0);
    return {
      memberCount: members.length,
      visitors: members.reduce((s, m) => s + m.visitors, 0),
      oneToOne: members.reduce((s, m) => s + m.oneToOne, 0),
      referralsGiven: refGiven,
      totalTransactionValue: members.reduce((s, m) => s + m.transactionValue, 0),
      totalCeu: members.reduce((s, m) => s + m.ceu, 0),
      absentCount: members.filter(m => m.palms === "A").length,
      medicalCount: members.filter(m => m.palms === "M").length,
      substituteCount: members.filter(m => m.palms === "S").length,
      lateCount: members.filter(m => m.palms === "L").length,
      absenceRate: members.length
        ? Math.round(((members.filter(m => m.palms === "A" || m.palms === "S").length) / members.length) * 100)
        : 0,
    };
  };

  const handleAIDiagnose = async () => {
    setLoading(true);
    setError(null);
    setApiKeyMissing(false);

    try {
      const response = await fetch("/api/analyze-kpi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekTitle, stage, committeeText, goals, members, summary: buildSummary() }),
      });

      const res = await response.json();
      if (!response.ok) throw new Error(res.error || "伺服器錯誤");

      if (res.success) {
        setDiagnoseResult(res.data);
      } else if (res.api_key_missing) {
        setApiKeyMissing(true);
        generateOffline();
      } else {
        throw new Error(res.error || "API 呼叫失敗");
      }
    } catch (err: any) {
      setError(err.message || "連線失敗");
      generateOffline();
    } finally {
      setLoading(false);
    }
  };

  const generateOffline = () => {
    setLoading(true);
    setTimeout(() => {
      const summary = buildSummary();
      const green = members.filter(m => {
        const ref = totalReferralsGiven(m);
        return (m.palms === "P" || m.palms === "L") && m.oneToOne >= goals.kpi121PerMember && ref >= goals.kpiReferralPerMember;
      });
      const red = members.filter(m => {
        const ref = totalReferralsGiven(m);
        return m.palms === "A" || m.palms === "S" || (m.oneToOne === 0 && ref === 0);
      });

      const score = Math.min(100, Math.round(
        ((summary.oneToOne / (goals.oneToOneTarget || 1)) * 40 +
         (summary.referralsGiven / (goals.referralTarget || 1)) * 40 +
         (summary.visitors / (goals.visitorTarget || 1)) * 20) * 100
      ) / 100);

      setDiagnoseResult({
        chapterHealthScore: Math.round(score),
        executiveSummary: `【本地診斷模式】本週分會 ${summary.memberCount} 位會員，121 完成 ${summary.oneToOne} 次、提供引薦 ${summary.referralsGiven} 張、來賓 ${summary.visitors} 人。綠燈達標夥伴 ${green.length} 位，需要關懷夥伴 ${red.length} 位。請設定 ANTHROPIC_API_KEY 啟用完整 AI 診斷。`,
        coachingAdvice: red.slice(0, 5).map(m => ({
          memberName: memberName(m),
          category: m.category,
          issue: m.palms === "A" ? "缺席，錯失現場商業配對" : m.palms === "S" ? "代理人出席，商業動能斷路" : "121 及引薦均為零",
          actionPlan: `請執事幹部私下約 ${memberName(m)} 進行一對一輔導，了解近況並協助商業配對。`,
        })),
        powerTeamTraction: "分析各產業夥伴形成 Power Team，促進內循環 121 與聯合引薦。",
        slideSpeakingNotes: Array(12).fill("").map((_, i) => `第 ${i + 1} 張投影片講稿（請設定 Claude API Key 以取得 AI 生成的專屬講詞）`),
        actionItems: [
          `本週有 ${red.length} 位夥伴需要暖心私下關懷`,
          `促成 ${green.length} 位綠燈夥伴在大會分享引薦心法`,
          "來賓專員安排 48 小時內回訪蒞臨來賓",
        ],
      });
      setLoading(false);
    }, 800);
  };

  const handleApplyScripts = () => {
    if (diagnoseResult?.slideSpeakingNotes) {
      onApplyAIScripts(diagnoseResult.slideSpeakingNotes);
      setAppliedScripts(true);
      setTimeout(() => setAppliedScripts(false), 3000);
    }
  };

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="bg-gradient-to-r from-rose-950 via-rose-900 to-slate-900 rounded-xl p-5 text-white shadow-sm space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-400/30 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">Claude AI 智慧數據診斷</h3>
            <p className="text-rose-100/70 text-xs">依本週 PALMS 數據，自動生成執行摘要、暖心輔導建議與 12 頁投影片講稿</p>
          </div>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-white/10">
          <p className="text-xs text-rose-200/80 max-w-xl">
            遵循「公開表揚、私下輔導、數字非責備」BNI 副主席原則，由 Claude 產生具溫度的建議。
          </p>
          <button onClick={handleAIDiagnose} disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-700 text-rose-950 text-xs font-black rounded-lg transition cursor-pointer shrink-0 ml-3">
            <Sparkles className="w-3.5 h-3.5" />
            {loading ? "分析中..." : "啟動 AI 診斷"}
          </button>
        </div>
      </div>

      {apiKeyMissing && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2 text-xs">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-slate-800">已切換至本地診斷模式</p>
            <p className="text-slate-600 mt-0.5">請在 <code className="bg-white border px-1 rounded font-mono">桌面/BNI商務平台/.env</code> 中設定 <code className="bg-white border px-1 rounded font-mono">ANTHROPIC_API_KEY=sk-ant-...</code> 以啟用 Claude 完整分析。</p>
          </div>
        </div>
      )}

      {error && !diagnoseResult && (
        <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex gap-2 text-xs text-rose-800">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error} — 已啟用本地診斷。</span>
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <Sparkles className="w-10 h-10 text-rose-800 animate-spin mx-auto mb-3" />
          <p className="font-bold text-slate-700">Claude AI 正在分析本週數據...</p>
          <p className="text-xs text-slate-400 mt-1">讀取 PALMS、引薦、交易價值並生成講稿</p>
        </div>
      )}

      {diagnoseResult && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

          {/* Left 7 cols */}
          <div className="lg:col-span-7 space-y-4">

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5">
                  <Activity className="w-4.5 h-4.5 text-rose-800" />
                  <h4 className="font-bold text-slate-800 text-sm">分會本週綜合診斷</h4>
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 bg-rose-50 rounded-full border border-rose-100">
                  <span className="text-[9px] font-bold text-rose-900">健康分數</span>
                  <span className="text-sm font-black text-rose-900">{diagnoseResult.chapterHealthScore}</span>
                </div>
              </div>
              <p className="text-slate-700 text-xs leading-relaxed bg-slate-50 p-3 border rounded-lg">
                {diagnoseResult.executiveSummary}
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-2">
              <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <TrendingUp className="w-4.5 h-4.5 text-indigo-700" />
                <h4 className="font-bold text-slate-800 text-sm">Power Team 產業協同建言</h4>
              </div>
              <p className="text-slate-600 text-xs leading-relaxed">{diagnoseResult.powerTeamTraction}</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-2">
              <h4 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-1.5 flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-emerald-600" /> 下週三大核心行動
              </h4>
              <ul className="text-xs text-slate-600 space-y-1.5">
                {diagnoseResult.actionItems.map((item, i) => (
                  <li key={i} className="flex gap-2 items-start">
                    <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[10px] shrink-0 text-slate-600 mt-0.5">{i + 1}</span>
                    <span className="leading-normal">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right 5 cols */}
          <div className="lg:col-span-5 space-y-4">

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
              <div className="border-b border-slate-100 pb-1.5">
                <h4 className="font-bold text-slate-800 text-sm">暖心紅燈關懷清單</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">大會不點名，由執事幹部私下約 121</p>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {diagnoseResult.coachingAdvice.length === 0 ? (
                  <p className="text-center py-8 text-slate-400 text-xs">🎉 本週無紅燈！全體達標！</p>
                ) : (
                  diagnoseResult.coachingAdvice.map((advice, i) => (
                    <div key={i} className="bg-slate-50 hover:bg-slate-100 p-3 rounded-xl border border-slate-100 text-xs transition">
                      <div className="flex justify-between mb-1">
                        <span className="font-black text-slate-800">{advice.memberName}</span>
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-800 font-bold rounded text-[10px]">{advice.category}</span>
                      </div>
                      <p className="text-slate-400 text-[10px] flex items-center gap-1 mb-1.5">
                        <Sliders className="w-3 h-3 text-rose-700" /> {advice.issue}
                      </p>
                      <p className="text-slate-600 leading-relaxed border-l-2 border-slate-300 pl-2">
                        <span className="font-bold text-slate-700">建議：</span>{advice.actionPlan}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-rose-50/30 rounded-xl border border-rose-200 p-4 shadow-sm space-y-2.5">
              <div>
                <span className="px-2 py-0.5 bg-rose-800 text-rose-100 text-[9px] font-bold rounded uppercase tracking-wider block w-max mb-1">AI 講稿聯動</span>
                <h5 className="font-bold text-slate-800 text-sm">一鍵套用 AI 講稿至投影片</h5>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">將 AI 生成的 12 頁投影片逐字講稿注入簡報預覽，可在「16:9 簡報預覽」頁面查看。</p>
              </div>
              <button onClick={handleApplyScripts}
                className="w-full flex items-center justify-center gap-1 px-3 py-2 bg-rose-800 hover:bg-rose-950 text-white text-xs font-bold rounded-lg cursor-pointer transition">
                {appliedScripts ? <BookmarkCheck className="w-3.5 h-3.5 text-amber-400" /> : <Sparkles className="w-3.5 h-3.5" />}
                {appliedScripts ? "已注入全部投影片講詞！" : "匯入 AI 講稿至簡報"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
