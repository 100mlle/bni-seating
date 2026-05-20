import React, { useState } from "react";
import { Member, ChapterGoals, CoachingNote } from "../types";
import { 
  Sparkles, 
  Settings, 
  CheckCircle, 
  AlertTriangle, 
  Activity, 
  HelpCircle, 
  TrendingUp, 
  CornerDownRight,
  ShieldAlert,
  Sliders,
  BookmarkCheck
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
  members,
  goals,
  weekTitle,
  stage,
  committeeText,
  onApplyAIScripts
}: AIConsultantPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  
  // State for loaded data
  const [diagnoseResult, setDiagnoseResult] = useState<{
    chapterHealthScore: number;
    executiveSummary: string;
    coachingAdvice: CoachingNote[];
    powerTeamTraction: string;
    slideSpeakingNotes: string[];
    actionItems: string[];
  } | null>(null);

  const [appliedScripts, setAppliedScripts] = useState(false);

  // Fallback Rule-Based (Heuristic) Diagnostic logic (for Sandbox offline)
  const generateOfflineDiagnostic = () => {
    setLoading(true);
    setError(null);
    setApiKeyMissing(false);
    
    setTimeout(() => {
      // Calculate local diagnostics from metrics
      const total = members.length;
      const visitors = members.reduce((sum, m) => sum + m.visitors, 0);
      const oneToOne = members.reduce((sum, m) => sum + m.oneToOne, 0);
      const referrals = members.reduce((sum, m) => sum + m.referrals, 0);
      const absentCount = members.filter(m => m.attendance === "缺席").length;
      
      const oneToOneRate = Math.min(100, Math.round((oneToOne / (goals.oneToOneTarget || 1)) * 100));
      const referralRate = Math.min(100, Math.round((referrals / (goals.referralTarget || 1)) * 100));
      const visitorRate = Math.min(100, Math.round((visitors / (goals.visitorTarget || 1)) * 100));
      
      const absenceRate = total > 0 ? Math.round((absentCount / total) * 100) : 0;
      
      // Heuristic score
      let score = Math.round((oneToOneRate + referralRate + visitorRate) / 3);
      if (absenceRate > goals.absenceWarningRate) score = Math.max(0, score - 15);
      
      // Analyze red members
      const redMembers = members.filter(m => m.oneToOne < goals.kpi121PerMember && m.referrals < goals.kpiReferralPerMember);
      const coaching: CoachingNote[] = redMembers.map(m => {
        let plan = "此學長之121與引薦產量本週處於瓶頸。建議會委會或執事組夥伴主動邀請安排1場1對1對位，了解近期產業鏈匹配度。";
        if (m.category.includes("室內設計") || m.category.includes("設計") || m.category.includes("工程") || m.category.includes("工程") || m.category.includes("水電") || m.category.includes("木作")) {
          plan = `工程設計是分會黃金產業組。本週邀請同組綠燈夥伴與 ${m.name} 進行協作121，分享外部包案或聯合採購契機，透過團隊力量帶動 ${m.name} 的引薦單量。`;
        } else if (m.attendance === "缺席") {
          plan = `夥伴因無故缺席導致商業斷路。請出席專員主動約 ${m.name} 私下探訪，理解是否遭逢工作出差瓶頸或健康原因，用溫馨協助重組其「大會代理人」制度。`;
        }
        return {
          memberName: m.name,
          category: m.category,
          issue: m.attendance === "缺席" ? "出席異常，缺乏現場高頻匹配機會" : "本週 1 對 1 及給引薦單皆尚未突破零位數",
          actionPlan: plan
        };
      });

      // Simple generic slide notes fallback (Offline custom variant)
      const offlineSlideNotes = [
        `各位會委會與執事團隊學長姊午安！歡迎加入我們今天的數據研討課。今天我們的會後會，主軸是透過 ${weekTitle} 的數據來做預警託底。數據是用來幫助夥伴改善商業配對，願我們秉持 Givers Gain 的奉獻氣魄！`,
        `本週分會現狀總結：評估人數為 ${total} 人，來賓引進 ${visitors} 人，累積 121 指標共完成了 ${oneToOne} 次，給予金引薦 ${referrals} 次。我們看到夥伴本週依然十分忙碌！`,
        `KPI 的總體達成率檢視：週121完成比率為 ${oneToOneRate}%，引薦完成量比率為 ${referralRate}%。以商務規格而言仍需衝刺。我們執行第一階段原則，只看整體數字，絕對不在公開會中點名、抱怨或處罰任何一員！`,
        `來到第二階段，公開表楊榮耀學長。王小明、林小美、周智控、黃設計師等達標學長！他們是分會的數據燈塔。下週大會，我們高調褒獎並邀請其進行1分鐘心法分享，創造渴望成功的團體氛圍！`,
        `本週燈號比例分析：綠燈達綠夥伴共 ${members.filter(m => m.oneToOne >= goals.kpi121PerMember && m.referrals >= goals.kpiReferralPerMember).length} 位，紅燈關懷夥伴還有 ${members.filter(m => m.oneToOne === 0 && m.referrals === 0).length} 位。大家切記『紅燈是看見需求，不是責備』，這代表有夥伴斷鏈了、需要執事組私下對位了。`,
        `本週出席率為 ${100 - absenceRate}%。缺席率為 ${absenceRate}%。我們的警戒防落線設在 ${goals.absenceWarningRate}%。出席專員本週辛苦了，請再次對未委派代理人的學長發出溫和問候，保持誠信防守。`,
        `來賓到申請書轉換漏斗：來賓帶來 ${visitors} 位。來賓是帶來引薦的潛在生命力，來賓專員將在大會結束48小時內提供暖心回訪，加速申請書填寫流程，促成高轉化留存！`,
        `會員續約 90 天預警提示。續約不考驗臨陣抱佛腳，各組 Power Team 與續約專員提早90天約談待續約學長，為其精算分會年收 ROI，了解痛點以便協助托底。`,
        `會員委員會幹部成員崗位落實。出席專員、來賓專員、續約專員等，每個人都是分會成長的發動引擎。我們幹部職能做得精緻，分會的氛圍就蓬勃！`,
        `副主席本週建言大綱：『管理不是限制，而是提供更好的服務與對位可能』。我們要落實公開表楊，以此點燃大會引薦渴望，執事會夥伴下週主動與紅燈學長約1對1，幫大家找引薦出路！`,
        `下週三大行動方案：第一、引導黃綠燈學長開展內循環121；第二、促成建材與行銷這兩大 Power Team 的跨組121；第三、配合續約專員執行90天留續ROI核算。`,
        `『數據只是結果，溫度才是決定因素！』感謝今天出席的每一位委員幹部。讓我們帶頭建立有溫度的 Chapter，下週大會攜手共創奇蹟。謝謝學長，祝大家下週引薦爆棚，散會！`
      ];

      setDiagnoseResult({
        chapterHealthScore: score,
        executiveSummary: `【 offline 離線模擬報告 】分會本週運作綜合診斷：目前 121 指標達成率與引薦成交率維持在 ${score >= 60 ? "健康水準" : "待提升水位"}。分會目前面臨的戰術瓶頸是「動能不均勻」── 綠燈模範生表現強勁，但相對有 ${redMembers.length} 名學長本週尚未建立交流引薦，這可能反映了特定產業鏈夥伴在本會期尚未對位、或有商業摩擦。會委會可以開始多度促進小組內部的商業引導。`,
        coachingAdvice: coaching,
        powerTeamTraction: `本分會包含豐富的營建、裝修和設計類產業（如水電工程、室內設計、木作、冷凍空調、窗飾規劃、油漆等）。這是一個完美且具備龐大包案能量的「營建室裝 Power Team」！然而部分成員（例如木作工程、鐵件鋼構造）本週數據偏低，可能出現了案源共享斷裂。副主席下週可主辦「建材室裝小組私房 121 會議」，由綠燈學長包案帶動紅黃燈夥伴進入良性內循環。`,
        slideSpeakingNotes: offlineSlideNotes,
        actionItems: [
          "下週促進『室內裝修/設計組』完成至少 3 次內循環 121 商業訪談",
          "出席專員主動約談請假或缺席學長、排程建立合格代理人檔案",
          "來賓專員在 48 小時內展開本週蒞會之 5 位來賓的精細回訪與 ROI 分析"
        ]
      });
      setLoading(false);
    }, 1200);
  };

  const handleAIDiagnose = async () => {
    setLoading(true);
    setError(null);
    setApiKeyMissing(false);
    
    try {
      const response = await fetch("/api/analyze-kpi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekTitle,
          stage,
          committeeText,
          goals,
          members,
          summary: {
            memberCount: members.length,
            visitors: members.reduce((sum, m) => sum + m.visitors, 0),
            oneToOne: members.reduce((sum, m) => sum + m.oneToOne, 0),
            referrals: members.reduce((sum, m) => sum + m.referrals, 0),
            absentCount: members.filter(m => m.attendance === "缺席").length,
            leaveCount: members.filter(m => m.attendance === "請假").length,
            absenceRate: members.length ? Math.round((members.filter(m => m.attendance === "缺席").length / members.length) * 100) : 0,
          }
        })
      });

      const res = await response.json();
      
      if (!response.ok) {
        throw new Error(res.error || "Server response was bad");
      }

      if (res.success) {
        setDiagnoseResult(res.data);
      } else if (res.api_key_missing) {
        setApiKeyMissing(true);
        // Trigger simulation so the tab functions even without API keys! Excellent.
        generateOfflineDiagnostic();
      } else {
        throw new Error(res.error || "Failed API request");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "診斷遠程 API 連線失敗，請檢查網路。");
      // Fallback
      generateOfflineDiagnostic();
    } finally {
      setLoading(false);
    }
  };

  const handleApplyScriptsToSlides = () => {
    if (diagnoseResult && diagnoseResult.slideSpeakingNotes) {
      onApplyAIScripts(diagnoseResult.slideSpeakingNotes);
      setAppliedScripts(true);
      setTimeout(() => setAppliedScripts(false), 3000);
    }
  };

  return (
    <div className="space-y-4" id="ai-consultant-panel-container">
      
      {/* Upper Sparkles Hero Panel */}
      <div className="bg-gradient-to-r from-rose-950 via-rose-900 to-slate-900 rounded-xl p-4 text-white shadow-sm space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/30 flex items-center justify-center shrink-0">
            <Sparkles className="w-4.5 h-4.5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black tracking-tight text-white">Gemini 3.5-Flash 智慧數據剖析</h3>
            <p className="text-rose-100/70 text-xs font-normal">大語言模型智能化透視各行同盟、KPI 燈盤分佈與出席率，定制私密一對一偕同策劃與大會致辭講詞。</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1 border-t border-white/5">
          <div className="text-[11px] text-rose-200/80 leading-normal max-w-2xl">
            🤝 <span className="font-bold">運作精神：</span>模型遵循 BNI 副主席會後會「公開表揚、私下輔導、數字非責備」原則編排兼蓄專業深度與文化溫暖的逐字大會備忘。
          </div>
          
          <button
            onClick={handleAIDiagnose}
            disabled={loading}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-700 text-rose-950 text-xs font-black rounded-lg shadow-xs transition whitespace-nowrap cursor-pointer shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {loading ? "深度計算中..." : "啟動智能化數據診斷"}
          </button>
        </div>
      </div>

      {/* API Key Instructions Alert Callout - Only if user hasn't successfully loaded real key */}
      {apiKeyMissing && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 flex gap-2 w-full text-slate-700 text-xs leading-normal">
          <ShieldAlert className="w-4.5 h-4.5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1 flex-1">
            <h5 className="font-bold text-slate-800 text-[11px]">已啟用離線沙盒規則診斷 🔐</h5>
            <p className="text-[11px] text-slate-600">
              分會分析採全 Fullstack 漏斗機制，Gemini API 計算均安全隔離在 NodeJS 伺服端中。您可前往頁面右方 <span className="font-semibold text-rose-800 font-sans">Settings / Secrets</span> 密鑰管理配置您的專屬 <code className="bg-slate-100 border px-1 py-0.5 rounded font-mono text-[10px]">GEMINI_API_KEY</code> 喚醒 Gemini 真實智庫報告。
              <span className="font-semibold text-emerald-800 block mt-1">✨ 現在，您可以先在下方瀏覽我們基於本地規則引擎，為您產出的精緻本地端分析成果！</span>
            </p>
          </div>
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 shadow-sm animate-pulse">
          <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mx-auto border border-rose-100">
            <Sparkles className="w-8 h-8 text-rose-800 animate-spin" />
          </div>
          <div className="space-y-2">
            <h4 className="font-bold text-slate-800 text-base">AI 大腦正在深度建模分析...</h4>
            <div className="text-xs text-slate-400 space-y-1">
              <p>✔ 正在讀取學長姊產業別與121次數...</p>
              <p>✔ 正在關聯出席異常與代理人考證...</p>
              <p>✔ 正在自動編制 12 頁副主席專屬商務語法講詞...</p>
            </div>
          </div>
        </div>
      )}

      {error && !diagnoseResult && (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-rose-950/90 text-sm flex gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <div>
            <span className="font-bold">連線異常：</span>{error}。系統已切換至本機 Rule Heuristics 自動運作，請點選「啟動 AI 智能數據診斷」。
          </div>
        </div>
      )}

      {/* Successful Diagnose Results Rendering */}
      {diagnoseResult && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          
          {/* Left Column: Summary and Power Teams (7/12 width) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Executive summary block */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5">
                  <Activity className="w-4.5 h-4.5 text-rose-800" />
                  <h4 className="font-bold text-slate-800 text-xs sm:text-sm">一、分會營運主筆 & 本週綜合診斷</h4>
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 bg-rose-50 rounded-full border border-rose-100">
                  <span className="text-[9px] font-bold text-rose-900 tracking-wider">分會營運得分</span>
                  <span className="text-sm font-black text-rose-900">{diagnoseResult.chapterHealthScore}</span>
                </div>
              </div>

              <div className="text-slate-700 text-xs leading-relaxed bg-slate-50 p-3 border rounded-lg relative">
                <p className="relative z-10">{diagnoseResult.executiveSummary}</p>
              </div>
            </div>

            {/* Power Teams suggestions */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
              <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <TrendingUp className="w-4.5 h-4.5 text-indigo-700" />
                <h4 className="font-bold text-slate-800 text-xs sm:text-sm">二、商業小組 (Power Team) 協同與拓鏈建言</h4>
              </div>

              <p className="text-slate-600 text-xs leading-relaxed">
                {diagnoseResult.powerTeamTraction}
              </p>
            </div>

            {/* Bottom 3 recommended actions */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-2.5">
              <h4 className="font-bold text-slate-800 text-xs sm:text-sm border-b border-slate-100 pb-1.5 flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                三、會委會下週三大核心戰略工作交辦
              </h4>
              <ul className="text-xs text-slate-600 space-y-1.5">
                {diagnoseResult.actionItems.map((item, i) => (
                  <li key={i} className="flex gap-1.5 items-start">
                    <span className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[10px] flex-shrink-0 text-slate-600 mt-0.5">{i+1}</span>
                    <span className="leading-normal pt-0.5">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>

          {/* Right Column: Weak member coaching & script applicator (5/12 width) */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Red members Warm Coaching panel */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
              <div className="border-b border-slate-100 pb-1.5">
                <h4 className="font-bold text-slate-800 text-xs sm:text-sm">四、暖心紅燈/缺席學長姐關懷清單</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">※ 大會不點名，由執事會幹部啟動私密教練輔導機制</p>
              </div>

              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {diagnoseResult.coachingAdvice.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    🎉 太棒了！本週無任何會員處在紅燈，全分會都在熱烈引薦軌道上。
                  </div>
                ) : (
                  diagnoseResult.coachingAdvice.map((advice, index) => (
                    <div key={index} className="bg-slate-50 hover:bg-slate-100/60 p-3 rounded-xl border border-slate-100 text-xs transition">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-black text-slate-800 text-[13px]">{advice.memberName}</span>
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-800 font-bold rounded-md">{advice.category}</span>
                      </div>
                      <p className="text-slate-400 text-[10px] leading-tight flex items-center gap-1">
                        <Sliders className="w-3 h-3 text-rose-700" />
                        瓶頸指標：{advice.issue}
                      </p>
                      
                      <div className="mt-2 text-slate-600 border-t border-slate-200/50 pt-2 leading-relaxed pl-1.5 border-l-2 border-slate-300">
                        <span className="font-bold text-slate-700">暖心協助對策：</span>{advice.actionPlan}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Script Applicator controller card */}
            <div className="bg-white rounded-xl border border-rose-200 p-4 shadow-2xs space-y-2.5 bg-rose-50/20">
              <div className="space-y-1">
                <span className="px-2 py-0.5 bg-rose-800 text-rose-100 text-[9px] font-bold rounded uppercase tracking-wider block w-max select-none leading-none">
                  AI 逐字稿聯動
                </span>
                <h5 className="font-bold text-slate-800 text-xs sm:text-sm">一鍵套用 AI 大師講詞至簡報預覽</h5>
                <p className="text-[11px] text-slate-500 leading-normal">
                  將剛才 AI 根據分會實際數據算出的 12 面口頭簡報腳本（逐字稿），注入簡報備忘錄，後續可在「簡報預覽」下看到並一併與 PPTX 講稿導出！
                </p>
              </div>

              <button
                onClick={handleApplyScriptsToSlides}
                className="w-full flex items-center justify-center gap-1 px-3 py-2 bg-rose-800 hover:bg-rose-950 text-white text-xs font-bold rounded-lg transition cursor-pointer"
              >
                {appliedScripts ? <BookmarkCheck className="w-3.5 h-3.5 text-amber-400" /> : <Sparkles className="w-3.5 h-3.5" />}
                {appliedScripts ? "已經注入全部投影片講詞！" : "匯入 AI 智慧講稿至簡報備忘"}
              </button>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
