/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Member, ChapterGoals } from "./types";
import { 
  defaultMembers, 
  defaultGoals, 
  defaultCommitteeText 
} from "./data";

import MemberEditor from "./components/MemberEditor";
import KPIDashboard from "./components/KPIDashboard";
import SlidesPreviewer from "./components/SlidesPreviewer";
import AIConsultantPanel from "./components/AIConsultantPanel";

import { 
  Sliders, 
  BarChart3, 
  Presentation, 
  Sparkles, 
  FileText,
  Bookmark,
  TrendingUp,
  Heart,
  ChevronRight
} from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<"input" | "dashboard" | "slides" | "ai" | "guidelines">("input");
  
  // Chapter Shared States
  const [weekTitle, setWeekTitle] = useState("第 1 週｜副主席會後會數據追蹤");
  const [stage, setStage] = useState("stage1");
  const [committeeText, setCommitteeText] = useState(defaultCommitteeText);
  const [goals, setGoals] = useState<ChapterGoals>(defaultGoals);
  const [members, setMembers] = useState<Member[]>(defaultMembers);
  const [customAINotes, setCustomAINotes] = useState<string[] | undefined>(undefined);

  const handleApplyAIScripts = useCallback((scripts: string[]) => {
    setCustomAINotes(scripts);
    // Auto pivot to presentation view so they can play with their new slides immediately!
    setActiveTab("slides");
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-rose-900 selection:text-rose-100">
      
      {/* Dynamic Gold & Burgundy Top Branding Header */}
      <header className="bg-gradient-to-r from-rose-950 via-rose-900 to-slate-900 text-white border-b border-amber-500/20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-amber-400 text-[10px] font-bold tracking-wider uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse"></span>
              BNI Chapter Executive Suite ─ Vice President Console
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              BNI 副主席會後會數據 PPT 產生器
            </h1>
            <p className="text-rose-100/70 text-xs font-normal">
              自動精算會員 121 與引薦達成率、繪製紅黃綠燈雷達，一鍵生成 12 頁專業投影簡報、大會講稿演辭與 PPTX 導出。
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 backdrop-blur-xs shadow-xs text-right hidden sm:block">
              <span className="text-[9px] text-amber-400 block uppercase font-bold tracking-wider">分會營運階段</span>
              <span className="text-xs font-bold text-slate-200">
                {stage === "stage1" ? "🏆 1. 綜效總看板" : stage === "stage2" ? "⭐ 2. 榮譽分享榜" : "🤝 3. 私下暖心輔導"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Corporate Tab navigation bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex space-x-1 py-2 select-none overflow-x-auto scrollbar-none">
            
            <button
              onClick={() => setActiveTab("input")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                activeTab === "input" 
                  ? "bg-rose-900 text-white shadow-xs" 
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              數據輸入
            </button>

            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                activeTab === "dashboard" 
                  ? "bg-rose-900 text-white shadow-xs" 
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              核心數據看板
            </button>

            <button
              onClick={() => setActiveTab("slides")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                activeTab === "slides" 
                  ? "bg-rose-900 text-white shadow-xs" 
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
              }`}
            >
              <Presentation className="w-3.5 h-3.5" />
              16:9 簡報預覽
            </button>

            <button
              onClick={() => setActiveTab("ai")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                activeTab === "ai" 
                  ? "bg-rose-900 text-white shadow-xs" 
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              AI 智能顧問診斷
            </button>

            <button
              onClick={() => setActiveTab("guidelines")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                activeTab === "guidelines" 
                  ? "bg-rose-900 text-white shadow-xs" 
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              會委營運指南
            </button>

          </nav>
        </div>
      </div>

      {/* Main Container Content */}
      <main className="max-w-7xl w-full mx-auto px-4 py-4 flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="focus:outline-none"
          >
            {activeTab === "input" && (
              <MemberEditor
                members={members}
                onChangeMembers={setMembers}
                committeeText={committeeText}
                onChangeCommitteeText={setCommitteeText}
                goals={goals}
                onChangeGoals={setGoals}
                stage={stage}
                onChangeStage={setStage}
                weekTitle={weekTitle}
                onChangeWeekTitle={setWeekTitle}
              />
            )}

            {activeTab === "dashboard" && (
              <KPIDashboard
                members={members}
                goals={goals}
              />
            )}

            {activeTab === "slides" && (
              <SlidesPreviewer
                members={members}
                goals={goals}
                weekTitle={weekTitle}
                stage={stage}
                committeeText={committeeText}
                customAINotes={customAINotes}
              />
            )}

            {activeTab === "ai" && (
              <AIConsultantPanel
                members={members}
                goals={goals}
                weekTitle={weekTitle}
                stage={stage}
                committeeText={committeeText}
                onApplyAIScripts={handleApplyAIScripts}
              />
            )}

            {activeTab === "guidelines" && (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm max-w-4xl mx-auto">
                <div className="flex items-center gap-2 pb-4 border-b">
                  <Bookmark className="w-6 h-6 text-rose-800" />
                  <h3 className="text-xl font-black text-slate-800 font-sans">BNI 會後會 ── 副主席的核心定位指南</h3>
                </div>

                <div className="prose prose-slate max-w-none text-slate-600 text-sm leading-relaxed space-y-5">
                  <p>
                    會後會是 BNI 分會健康運作的關鍵核心。副主席帶領會員委員會執事團隊，不以評估之名「懲罰、施壓」或「點名批判」會員，而是建立一個具有對位能力、能用熱度和商業眼光輔助夥伴突破瓶頸的決策核心。
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-sans text-xs">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="font-extrabold text-slate-800 text-sm block mb-1">第一階段：只看團隊目標</span>
                      <p className="text-slate-500">大會上公布單週121、引薦整體比率，不點名個人。鼓勵在小組內發起對位，了解引薦缺口，培養自發性。</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="font-extrabold text-slate-800 text-sm block mb-1">第二階段：表揚楷模夥伴</span>
                      <p className="text-slate-500">大會公開誇獎雙項達標、熱情邀來賓的綠燈楷模，並邀請一分鐘心法，藉由榮譽建立向上突破氛圍。</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="font-extrabold text-slate-800 text-sm block mb-1">第三階段：暖心私下一對一</span>
                      <p className="text-slate-500">連續多週未達標、無故缺席之夥伴，嚴禁大會群組羞辱。會委會主動邀約，幫想商業對策並拉近對位。</p>
                    </div>
                  </div>

                  <div className="bg-rose-50/50 rounded-2xl p-5 border border-rose-150 space-y-2">
                    <span className="font-bold text-rose-950 text-sm flex items-center gap-1">
                      <Heart className="w-4 h-4 text-rose-800" />
                      「數據不是責備，是讓我們看見需要協助的人在哪裡。」
                    </span>
                    <p className="text-xs text-rose-800 leading-relaxed">
                      副主席常說，數字沒有溫度，但我們幹部有溫度。當發現室內裝飾、木作、或水電等任何一位夥伴數據下落，不代表他們不奉獻，往往意味著分會特定的 Power Team
                      產業鏈斷裂、或新進會員還不知道如何開展精準121。我們去服務、去約121、去幫忙對接案源，這才是 BNI 樂施者得的精神寫意。
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer Branding */}
      <footer className="bg-slate-900 text-slate-400 py-8 border-t border-slate-850 mt-12 text-center text-xs">
        <div className="max-w-7xl mx-auto px-4 space-y-3">
          <p className="font-bold tracking-wider text-slate-300 uppercase">
            BNI GOLD chapter VP EXECUTIVE DATA ENGINE© ── givers gain
          </p>
          <p className="text-slate-500">
            本工具旨在為 BNI Taiwan 及全球分會副主席會後會提供一鍵可行的簡報與数据投影方案。
          </p>
        </div>
      </footer>

    </div>
  );
}
