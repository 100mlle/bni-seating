import React, { useState, useMemo, useEffect } from "react";
import { Member, ChapterGoals } from "../types";
import { defaultSlideScripts } from "../data";
import pptxgen from "pptxgenjs";
import { 
  Presentation, 
  ChevronLeft, 
  ChevronRight, 
  Copy, 
  Check, 
  Download, 
  Volume2, 
  Layout, 
  Grid, 
  Play,
  Bookmark,
  FileSpreadsheet,
  FileJson
} from "lucide-react";

interface SlidesPreviewerProps {
  members: Member[];
  goals: ChapterGoals;
  weekTitle: string;
  stage: string;
  committeeText: string;
  customAINotes?: string[]; // Array of 12 strings from AI
}

export default function SlidesPreviewer({
  members,
  goals,
  weekTitle,
  stage,
  committeeText,
  customAINotes
}: SlidesPreviewerProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideScripts, setSlideScripts] = useState<string[]>(defaultSlideScripts);
  const [copied, setCopied] = useState(false);
  const [pptGenerating, setPptGenerating] = useState(false);

  // Sync with AI notes when they arrive
  useEffect(() => {
    if (customAINotes && customAINotes.length === 12) {
      setSlideScripts(customAINotes);
    }
  }, [customAINotes]);

  // Aggregate metrics
  const stats = useMemo(() => {
    const total = members.length;
    const visitors = members.reduce((sum, m) => sum + m.visitors, 0);
    const oneToOne = members.reduce((sum, m) => sum + m.oneToOne, 0);
    const referrals = members.reduce((sum, m) => sum + m.referrals, 0);
    
    const absentCount = members.filter(m => m.attendance === "缺席").length;
    const leaveCount = members.filter(m => m.attendance === "請假").length;
    const presentCount = members.filter(m => m.attendance === "出席").length;
    
    const absenceRate = total > 0 ? Math.round((absentCount / total) * 100) : 0;
    const renewed = members.filter(m => m.renewal === "已續約").length;
    const upcomingRenewal = members.filter(m => m.renewal === "待追蹤" || m.renewal === "需要關懷").length;

    // Traffic light arrays
    const green = members.filter(m => m.oneToOne >= goals.kpi121PerMember && m.referrals >= goals.kpiReferralPerMember);
    const yellow = members.filter(m => !green.includes(m) && (m.oneToOne > 0 || m.referrals > 0));
    const red = members.filter(m => !green.includes(m) && !yellow.includes(m));

    return {
      total,
      visitors,
      oneToOne,
      referrals,
      absentCount,
      leaveCount,
      presentCount,
      absenceRate,
      renewed,
      upcomingRenewal,
      green,
      yellow,
      red
    };
  }, [members, goals]);

  // Slide list names
  const slideDeckMeta = [
    { id: 0, title: "1. 封面：會後會追蹤", category: "Cover" },
    { id: 1, title: "2. 本週數據總覽", category: "Metrics Overview" },
    { id: 2, title: "3. 目標達成率 (不點名)", category: "KPI Targets" },
    { id: 3, title: "4. 達標表揚行動榜", category: "Honor Roll" },
    { id: 4, title: "5. 紅黃綠燈健康分佈", category: "Traffic Lights" },
    { id: 5, title: "6. 出席與請假追蹤", category: "Attendance Tracker" },
    { id: 6, title: "7. 來賓到申請書轉換 funnel", category: "Visitor Funnel" },
    { id: 7, title: "8. 續約關懷 90 天提示", category: "Renewal Forecast" },
    { id: 8, title: "9. 會委會成員分工落實", category: "Committee Alignment" },
    { id: 9, title: "10. 副主席策略建言", category: "VP Counsel" },
    { id: 10, title: "11. 下週三大核心行動", category: "Strategic Actions" },
    { id: 11, title: "12. 結尾：溫度托底共識", category: "Outro Motto" }
  ];

  const handlePrev = () => {
    setCurrentSlide(prev => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentSlide(prev => Math.min(11, prev + 1));
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(slideScripts[currentSlide]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleScriptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const updated = [...slideScripts];
    updated[currentSlide] = e.target.value;
    setSlideScripts(updated);
  };

  // Convert BNI committee text into lines
  const parsedCommittee = useMemo(() => {
    return committeeText
      .split("\n")
      .map(line => line.trim())
      .filter(Boolean);
  }, [committeeText]);

  const percent = (val: number, max: number) => {
    return max > 0 ? Math.round((val / max) * 100) : 0;
  };

  // Export to Powerpoint using pptxgenjs!
  const exportToPowerpoint = async () => {
    setPptGenerating(true);
    try {
      const ppt = new pptxgen();
      
      // Theme colors
      const COLOR_PRIMARY_BG = "4A0E17"; // Maroon
      const COLOR_SECONDARY_BG = "1E293B"; // Slate
      const COLOR_TEXT_LIGHT = "FFFFFF";
      const COLOR_TEXT_DARK = "334155";
      const COLOR_GOLD = "D4AF37"; // Golden
      
      ppt.layout = "LAYOUT_16x9";
      
      // Slide 1: Cover
      {
        const slide = ppt.addSlide();
        slide.background = { fill: COLOR_PRIMARY_BG };
        slide.addNotes(slideScripts[0] || "");
        slide.addText("BNI 數據會後會", {
          x: 1.0, y: 1.8, w: 10.0, h: 0.8,
          fontSize: 32, bold: true, color: COLOR_GOLD, align: "left"
        });
        slide.addText(weekTitle, {
          x: 1.0, y: 2.6, w: 10.0, h: 0.8,
          fontSize: 27, bold: true, color: COLOR_TEXT_LIGHT, align: "left"
        });
        slide.addText("數據不是責備，是協助看見問題 ｜ 副主席執事會口頭簡報報告", {
          x: 1.0, y: 3.4, w: 10.0, h: 0.5,
          fontSize: 14, color: "E2E8F0", align: "left"
        });
        slide.addText("管理階段方針: " + (stage === "stage1" ? "第一階段 (不公開點名)" : stage === "stage2" ? "第二階段 (公開表揚)" : "第三階段 (私下關懷)"), {
          x: 1.0, y: 4.8, w: 10.0, h: 0.4,
          fontSize: 12, color: "cbd5e1"
        });
      }
      
      // Slide 2: Weekly Overview
      {
        const slide = ppt.addSlide();
        slide.addNotes(slideScripts[1] || "");
        slide.addText("本週數據總覽 (Metrics Overview)", {
          x: 0.8, y: 0.5, w: 11.0, h: 0.6,
          fontSize: 24, bold: true, color: "800020"
        });
        
        const rows = [
          ["核心交流指標", "本週實際完成數據", "會期達成基準比對"],
          ["分會會員總人數", `${stats.total} 人`, `本會期目標: ${goals.memberTarget} 人`],
          ["本週來賓出席量", `${stats.visitors} 人`, `單週目標: ${goals.visitorTarget} 人`],
          ["完成 1 對 1 次數", `${stats.oneToOne} 次`, `單週目標: ${goals.oneToOneTarget} 次`],
          ["成交/引薦單張數", `${stats.referrals} 張`, `單週目標: ${goals.referralTarget} 張`]
        ] as any;
        slide.addTable(rows, {
          x: 0.8, y: 1.5, w: 11.5, h: 3.5,
          border: { pt: 1, color: "CBD5E1" },
          fill: { color: "F8FAFC" },
          fontSize: 14,
          align: "center",
          valign: "middle"
        });
      }
      
      // Slide 3: KPI Target Achievement
      {
        const slide = ppt.addSlide();
        slide.addNotes(slideScripts[2] || "");
        slide.addText("本週整體營運達成率 (不記名檢視)", {
          x: 0.8, y: 0.5, w: 11.0, h: 0.6,
          fontSize: 24, bold: true, color: "800020"
        });
        slide.addText(`第一階段方針：公開看總體目標、不點名抱怨。了解分會動能痛點：`, {
          x: 0.8, y: 1.2, w: 11.0, h: 0.4, fontSize: 13, color: "64748B"
        });
        
        // Add 121 box
        slide.addText(`1 對 1 交流達成： ${stats.oneToOne} / ${goals.oneToOneTarget} 次`, {
          x: 0.8, y: 2.0, w: 5.5, h: 1.0,
          fill: { color: "F1F5F9" }, fontSize: 16, bold: true, color: "1e293b", align: "center", valign: "middle"
        });
        // Add referrals box
        slide.addText(`引薦單量達成： ${stats.referrals} / ${goals.referralTarget} 張`, {
          x: 6.8, y: 2.0, w: 5.5, h: 1.0,
          fill: { color: "F1F5F9" }, fontSize: 16, bold: true, color: "1e293b", align: "center", valign: "middle"
        });
        
        slide.addText(`121 單週達成率：${Math.round((stats.oneToOne / goals.oneToOneTarget) * 100)}% ｜ 引薦單週達成率：${Math.round((stats.referrals / goals.referralTarget) * 100)}%`, {
          x: 0.8, y: 3.8, w: 11.5, h: 0.5, fontSize: 15, bold: true, color: "9f1239"
        });
      }
      
      // Slide 4: Leaderboard
      {
        const slide = ppt.addSlide();
        slide.addNotes(slideScripts[3] || "");
        slide.addText("本週學長姊行動榜 (表揚達標者)", {
          x: 0.8, y: 0.5, w: 11.0, h: 0.6,
          fontSize: 24, bold: true, color: "800020"
        });
        
        const greenMembersName = stats.green.map(m => m.name).join("、") || "本週尚無雙達標者";
        const visitorActiveNames = members.filter(m => m.visitors > 0).map(m => `${m.name}(${m.visitors}來賓)`).join(" 、 ") || "本週尚無來賓";
        
        slide.addText("🟢 121 & 引薦 雙達標學長姊（大會公開表揚，邀請1分鐘心法分享）", {
          x: 0.8, y: 1.5, w: 11.5, h: 0.4, fontSize: 14, bold: true, color: "15803d"
        });
        slide.addText(greenMembersName, {
          x: 0.8, y: 2.1, w: 11.5, h: 0.8, fontSize: 18, color: "334155", fontFace: "Georgia"
        });
        
        slide.addText("🟠 積極邀約來賓學長姊（為分會引入活力生力軍）", {
          x: 0.8, y: 3.2, w: 11.5, h: 0.4, fontSize: 14, bold: true, color: "0369a1"
        });
        slide.addText(visitorActiveNames, {
          x: 0.8, y: 3.8, w: 11.5, h: 0.8, fontSize: 18, color: "334155"
        });
      }
      
      // Slide 5: Traffic Light Distribution
      {
        const slide = ppt.addSlide();
        slide.addNotes(slideScripts[4] || "");
        slide.addText("本週紅黃綠燈健康分佈", {
          x: 0.8, y: 0.5, w: 11.0, h: 0.6,
          fontSize: 24, bold: true, color: "800020"
        });
        
        const greenCount = stats.green.length;
        const yellowCount = stats.yellow.length;
        const redCount = stats.red.length;
        
        slide.addText(`🟢 綠燈達標人數： ${greenCount} 人 ｜ 建議大會高度鼓勵`, {
          x: 0.8, y: 1.5, w: 11.5, h: 0.6, fill: { color: "DCFCE7" } as any, fontSize: 14, color: "15803d", bold: true, valign: "middle"
        } as any);
        slide.addText(`🟡 黃燈輔導人數： ${yellowCount} 人 ｜ 建議由會委會主動輔導121，極易轉綠`, {
          x: 0.8, y: 2.4, w: 11.5, h: 0.6, fill: { color: "FEF3C7" } as any, fontSize: 14, color: "b45309", bold: true, valign: "middle"
        } as any);
        slide.addText(`🔴 紅燈關懷人數： ${redCount} 人 ｜ 嚴守「私下教練溫馨關懷」原則，拒絕公開羞辱`, {
          x: 0.8, y: 3.3, w: 11.5, h: 0.6, fill: { color: "FFE4E6" } as any, fontSize: 14, color: "be123c", bold: true, valign: "middle"
        } as any);
      }
      
      // Slide 6: Attendance Tracker
      {
        const slide = ppt.addSlide();
        slide.addNotes(slideScripts[5] || "");
        slide.addText("出席與請假追蹤 ─ 穩定根基", {
          x: 0.8, y: 0.5, w: 11.0, h: 0.6,
          fontSize: 24, bold: true, color: "800020"
        });
        
        const absentNames = members.filter(m => m.attendance === "缺席").map(m => m.name).join("、") || "無無故缺席";
        const leaveNames = members.filter(m => m.attendance === "請假").map(m => m.name).join("、") || "無請假";
        
        slide.addText(`本週分會出席率： ${stats.attendanceRate}% (警戒防護線：${(100 - goals.absenceWarningRate)}%)`, {
          x: 0.8, y: 1.3, w: 11.5, h: 0.4, fontSize: 15, bold: true, color: stats.absenceRate >= goals.absenceWarningRate ? "9f1239" : "15803d"
        });
        
        slide.addText(`📋 本週請假名單： ${leaveNames}`, {
          x: 0.8, y: 1.9, w: 11.5, h: 0.8, fill: { color: "F8FAFC" }, fontSize: 14, color: "475569", valign: "middle"
        });
        slide.addText(`⚠️ 本週無故缺席名單： ${absentNames}`, {
          x: 0.8, y: 2.9, w: 11.5, h: 0.8, fill: { color: "F8FAFC" }, fontSize: 14, color: "475569", valign: "middle"
        });
        slide.addText("💡 會後方針：出席專員主動聯絡未派代理人之學長，傳遞「商務對外線路不可中斷」的 BNI 誠信共識。", {
          x: 0.8, y: 4.1, w: 11.5, h: 0.4, fontSize: 12, italic: true, color: "64748B"
        });
      }
      
      // Slide 7: Visitor Funnel
      {
        const slide = ppt.addSlide();
        slide.addNotes(slideScripts[6] || "");
        slide.addText("來賓到申請書轉換漏斗", {
          x: 0.8, y: 0.5, w: 11.0, h: 0.6,
          fontSize: 24, bold: true, color: "800020"
        });
        
        slide.addText(`本編總計來賓： ${stats.visitors} 人`, {
          x: 0.8, y: 1.6, w: 11.5, h: 0.7, fill: { color: "EEF2F6" }, fontSize: 16, bold: true, color: "1E293B", align: "center", valign: "middle"
        });
        slide.addText(`來賓申請書目： ${goals.applicationTarget} 本 (本期週均目標)`, {
          x: 2.0, y: 2.6, w: 9.1, h: 0.7, fill: { color: "E2E8F0" }, fontSize: 14, bold: true, color: "334155", align: "center", valign: "middle"
        });
        slide.addText("來賓專員行動指引：大會結束後 48 小時內，專員進行高質感回訪，幫助來賓釐清行業鏈配對利益。", {
          x: 0.8, y: 3.8, w: 11.5, h: 0.4, fontSize: 13, color: "0284c7"
        });
      }
      
      // Slide 8: Renewal Tracker
      {
        const slide = ppt.addSlide();
        slide.addNotes(slideScripts[7] || "");
        slide.addText("會員續約健康關懷 90 天提示", {
          x: 0.8, y: 0.5, w: 11.0, h: 0.6,
          fontSize: 24, bold: true, color: "800020"
        });
        
        const followRenewalList = members.filter(m => m.renewal === "待追蹤" || m.renewal === "需要關懷");
        const listText = followRenewalList.map(m => `${m.name} (${m.category}) - ${m.renewal}`).join(" ｜ ") || "本週無待追蹤/需要關懷之夥伴";
        
        slide.addText(`已完成續約學長姊： ${stats.renewed} 人 ｜ 近期需追蹤關懷人數： ${stats.upcomingRenewal} 人`, {
          x: 0.8, y: 1.4, w: 11.5, h: 0.4, fontSize: 15, bold: true, color: "334155"
        });
        slide.addText(listText, {
          x: 0.8, y: 2.1, w: 11.5, h: 1.0, fill: { color: "FFF1F2" } as any, fontSize: 14, color: "be123c", align: "center", valign: "middle"
        } as any);
        slide.addText("💡 關懷機制：提早 90 天偕同 Power Team 幹部與待續約學長姊做 ROI 精算與痛點診斷，避免届期被動流失。", {
          x: 0.8, y: 3.6, w: 11.5, h: 0.5, fontSize: 13, color: "475569"
        });
      }
      
      // Slide 9: Committee Mapping
      {
        const slide = ppt.addSlide();
        slide.addNotes(slideScripts[8] || "");
        slide.addText("會員委員會成員分工執行表", {
          x: 0.8, y: 0.5, w: 11.0, h: 0.6,
          fontSize: 24, bold: true, color: "800020"
        });
        
        const rolesArray = parsedCommittee.map(line => {
          const parts = line.split("：");
          return [parts[0] || "職位", parts[1] || "未指定專人"];
        });
        
        slide.addTable([["會委會專門崗位", "本週落實負責幹部"], ...rolesArray] as any, {
          x: 0.8, y: 1.5, w: 11.5, h: 3.2,
          border: { pt: 1, color: "E2E8F0" },
          fontSize: 13,
          align: "center",
          valign: "middle"
        } as any);
      }
      
      // Slide 10: Vice President Strategy
      {
        const slide = ppt.addSlide();
        slide.background = { fill: COLOR_SECONDARY_BG };
        slide.addNotes(slideScripts[9] || "");
        slide.addText("副主席數據策略與建言", {
          x: 0.8, y: 0.5, w: 11.0, h: 0.6,
          fontSize: 24, bold: true, color: COLOR_GOLD
        });
        
        slide.addText("「 開口要溫度、出手要專業；公開看楷模、私下看託底。 」", {
          x: 0.8, y: 1.6, w: 11.5, h: 1.0,
          fontSize: 19, bold: true, italic: true, color: COLOR_GOLD, align: "center", valign: "middle"
        });
        
        slide.addText("副主席提醒執事團隊：數據只是我們發掘夥伴瓶頸的溫度計。切忌在大會 or 群組公開羞辱。本週執事分頭展開一對一關懷，以協助引流的心態了解紅燈原因。同時大力表揚達標的領頭羊學長，建立積極的榮譽感！", {
          x: 0.8, y: 2.8, w: 11.5, h: 1.5,
          fontSize: 14, color: "E2E8F0"
        });
      }
      
      // Slide 11: Top 3 Action items
      {
        const slide = ppt.addSlide();
        slide.addNotes(slideScripts[10] || "");
        slide.addText("下週三大核心戰術行動方針", {
          x: 0.8, y: 0.5, w: 11.0, h: 0.6,
          fontSize: 24, bold: true, color: "800020"
        });
        
        slide.addText("1. 121 指標推進：鼓勵各組 Power Team 內循環，每人下週至少安排 1 場精確對位的 121 商業訪談。", {
          x: 0.8, y: 1.5, w: 11.5, h: 0.7, fill: { color: "F8FAFC" }, fontSize: 13, bold: true, color: "334155", valign: "middle"
        });
        slide.addText("2. 來賓帶入精準化：結合建材營造、行銷設計等核心組別發起『產業主題日』，定點精準邀約來賓進場配對。", {
          x: 0.8, y: 2.4, w: 11.5, h: 0.7, fill: { color: "F8FAFC" }, fontSize: 13, bold: true, color: "334155", valign: "middle"
        });
        slide.addText("3. ROI 面談關懷啟動：續約專員與數據專員近期主動排程『90天輔導面談』，用具體成交算盤輔助留續率。", {
          x: 0.8, y: 3.3, w: 11.5, h: 0.7, fill: { color: "F8FAFC" }, fontSize: 13, bold: true, color: "334155", valign: "middle"
        });
      }
      
      // Slide 12: Outro Motto (Burgundy banner)
      {
        const slide = ppt.addSlide();
        slide.background = { fill: COLOR_PRIMARY_BG };
        slide.addNotes(slideScripts[11] || "");
        slide.addText("數字只是結果，溫度決定結果", {
          x: 1.0, y: 1.6, w: 10.0, h: 0.8,
          fontSize: 28, bold: true, color: COLOR_GOLD, align: "center"
        });
        slide.addText("攜手打造健康、有溫度且高產引薦的分會！", {
          x: 1.0, y: 2.5, w: 10.0, h: 0.6,
          fontSize: 18, color: COLOR_TEXT_LIGHT, align: "center"
        });
        slide.addText("BNI 副主席會會報告 ｜ 感謝每一位會員委員會學長姊的商務奉獻 ── Givers Gain", {
          x: 1.0, y: 4.2, w: 10.0, h: 0.5,
          fontSize: 12, color: "80C6C6C6", align: "center"
        });
      }
      
      // Save the presentation file!
      await ppt.writeFile({ fileName: `BNI_副主席會後會_${weekTitle.replace(/[\/\|\\:\*\?"<>]/g, "_")}.pptx` });
    } catch (e) {
      console.error(e);
      alert("Powerpoint 匯出失敗，請重試！");
    } finally {
      setPptGenerating(false);
    }
  };

  const exportToJson = () => {
    try {
      const exportData = {
        weekTitle,
        stage,
        goals,
        slideDeckMeta,
        slideScripts,
        committeeText,
        membersCount: members.length,
        exportedAt: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const cleanWeekTitle = weekTitle.replace(/[\/\|\\:\*\?"<>]/g, "_");
      link.href = url;
      link.download = `BNI_簡報數據_${cleanWeekTitle}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("簡報數據 JSON 導出失敗，請重試！");
    }
  };

  return (
    <div className="space-y-4" id="slides-previewer-container">
      
      {/* Upper header action row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-white border border-slate-200 rounded-xl gap-2 shadow-2xs">
        <div className="flex items-center gap-2">
          <Presentation className="w-4.5 h-4.5 text-rose-800 shrink-0" />
          <div>
            <h4 className="font-bold text-slate-800 text-xs sm:text-sm">投影簡報投片 (第 {currentSlide + 1}/12 頁)</h4>
            <p className="text-[11px] text-slate-400">風格：商務簡約、大字精準、對位 BNI 圓角金質簡報風格</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          <button
            onClick={exportToPowerpoint}
            disabled={pptGenerating}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg shadow-2xs transition w-full sm:w-auto cursor-pointer font-sans"
          >
            <Download className="w-3.5 h-3.5" />
            {pptGenerating ? "正在生成..." : "下載真實簡報 .pptx"}
          </button>
          
          <button
            onClick={exportToJson}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg shadow-2xs transition w-full sm:w-auto cursor-pointer border border-slate-300 font-sans"
          >
            <FileJson className="w-3.5 h-3.5 text-slate-500" />
            導出簡報數據 .json
          </button>
        </div>
      </div>

      {/* Main presentation console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* Left selector sidebar (3/12 width) */}
        <div className="lg:col-span-3 space-y-1.5 max-h-[460px] overflow-y-auto pr-1">
          {slideDeckMeta.map((slide) => {
            const isSelected = slide.id === currentSlide;
            return (
              <button
                key={slide.id}
                onClick={() => setCurrentSlide(slide.id)}
                className={`w-full text-left p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                  isSelected 
                    ? "bg-rose-900 border-rose-900 text-white shadow-xs"
                    : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                <span className="truncate pr-1">{slide.title}</span>
                <span className={`px-1 py-0.5 rounded text-[9px] font-bold shrink-0 ${
                  isSelected ? "bg-rose-800 text-rose-200" : "bg-slate-100 text-slate-500"
                }`}>
                  {slide.category}
                </span>
              </button>
            );
          })}
        </div>

        {/* Center: Interactive widescreen 16:9 mockup (9/12 width) */}
        <div className="lg:col-span-9 space-y-4">
          
          {/* Simulated Slide Canvas */}
          <div className="relative w-full aspect-video rounded-3xl overflow-hidden border border-slate-350 shadow-xl bg-slate-900 text-white select-none">
            
            {/* Slide 1: Welcome burgundy cover */}
            {currentSlide === 0 && (
              <div className="absolute inset-0 bg-gradient-to-br from-rose-950 via-rose-900 to-amber-950 p-[7%] flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <span className="font-mono text-amber-400 font-extrabold tracking-widest text-sm uppercase">★ BNI 執事會常務工作會議</span>
                  <span className="px-2.5 py-0.5 border border-amber-400/40 text-amber-400 font-bold text-[10px] rounded-full">副主席專用</span>
                </div>
                
                <div className="space-y-2">
                  <span className="px-2.5 py-1 bg-amber-500 text-rose-950 font-black text-xs rounded-lg uppercase tracking-wide inline-block">
                    {stage === "stage1" ? "第一階段: 總量看板" : stage === "stage2" ? "第二階段: 榮譽表揚" : "第三階段: 溫馨協助"}
                  </span>
                  <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
                    {weekTitle}
                  </h1>
                  <p className="text-sm sm:text-base text-amber-200/90 font-serif max-w-2xl leading-relaxed">
                    「 數據不是責備、亦非監控；數據是用來幫我們及時發掘夥伴瓶頸的溫度計。 」
                  </p>
                </div>

                <div className="border-t border-white/10 pt-3 flex items-center justify-between text-xs text-white/40">
                  <span>BNI 金質分會 ｜ 樂施者得 Givers Gain</span>
                  <span>彙整專員：會員委員會執事組</span>
                </div>
              </div>
            )}

            {/* Slide 2: Table Metrics Report */}
            {currentSlide === 1 && (
              <div className="absolute inset-0 bg-slate-900 p-[6%] flex flex-col justify-between">
                <div className="flex justify-between items-center pb-2 border-b border-white/10">
                  <h2 className="text-xl sm:text-2xl font-black text-white">本週分會核心動能總覽</h2>
                  <span className="text-xs text-amber-400">CHAPTER METRICS DAILY INDEX</span>
                </div>

                <div className="grid grid-cols-4 gap-4 my-2">
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-1">
                    <span className="text-slate-400 text-xs block">分會人數</span>
                    <p className="text-3xl font-black text-amber-400">{stats.total}人</p>
                    <span className="text-[10px] text-slate-500 block">目前目標: {goals.memberTarget} 人</span>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-1">
                    <span className="text-slate-400 text-xs block">來賓人數</span>
                    <p className="text-3xl font-black text-amber-400">{stats.visitors}人</p>
                    <span className="text-[10px] text-slate-500 block">本週目標: {goals.visitorTarget} 人</span>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-1">
                    <span className="text-slate-400 text-xs block">累積 121</span>
                    <p className="text-3xl font-black text-amber-400">{stats.oneToOne}次</p>
                    <span className="text-[10px] text-slate-500 block">本週總目標: {goals.oneToOneTarget} 次</span>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-1">
                    <span className="text-slate-400 text-xs block">引薦成交</span>
                    <p className="text-3xl font-black text-amber-400">{stats.referrals}張</p>
                    <span className="text-[10px] text-slate-500 block">本週總目標: {goals.referralTarget} 張</span>
                  </div>
                </div>

                <div className="p-3.5 bg-white/5 rounded-xl text-xs text-amber-300 border border-amber-300/10">
                  🎯 數據導引：目前分會會員總人數達標 {(percent(stats.total, goals.memberTarget))}%，本週完成商業交流共 {stats.oneToOne} 次、給予引薦金單 {stats.referrals} 次。
                </div>
              </div>
            )}

            {/* Slide 3: Achievement Gaps */}
            {currentSlide === 2 && (
              <div className="absolute inset-0 bg-slate-900 p-[6%] flex flex-col justify-between">
                <div className="flex justify-between items-center pb-2 border-b border-white/10">
                  <h2 className="text-xl sm:text-2xl font-black text-white">營運 KPI 整體目標達成率看板</h2>
                  <span className="px-2 py-0.5 bg-rose-900/40 border border-rose-300/20 text-rose-300 font-bold text-[9px] rounded uppercase select-none">
                    第一階段: 不公布姓名
                  </span>
                </div>

                <div className="space-y-4 my-2">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs sm:text-sm font-semibold">
                      <span className="text-slate-300">1 對 1 交流推進狀況(次)</span>
                      <span className="text-amber-400 font-bold">{stats.oneToOne} / {goals.oneToOneTarget} ({Math.round(stats.oneToOne / (goals.oneToOneTarget || 1) * 100)}%)</span>
                    </div>
                    <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.round(stats.oneToOne / (goals.oneToOneTarget || 1) * 100))}%` }}></div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs sm:text-sm font-semibold">
                      <span className="text-slate-300">外部+內部引薦單累積量(張)</span>
                      <span className="text-amber-400 font-bold">{stats.referrals} / {goals.referralTarget} ({Math.round(stats.referrals / (goals.referralTarget || 1) * 100)}%)</span>
                    </div>
                    <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-rose-600 h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.round(stats.referrals / (goals.referralTarget || 1) * 100))}%` }}></div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs sm:text-sm font-semibold">
                      <span className="text-slate-300">本週邀約商務來賓(人)</span>
                      <span className="text-amber-400 font-bold">{stats.visitors} / {goals.visitorTarget} ({Math.round(stats.visitors / (goals.visitorTarget || 1) * 100)}%)</span>
                    </div>
                    <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.round(stats.visitors / (goals.visitorTarget || 1) * 100))}%` }}></div>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 border-t border-white/5 pt-2 italic">
                  * 戰略：第一階段我們只比對總盤數字，不作個人點名考核。重在激發夥伴本週自發與對位 Power Team 進行引薦爆破！
                </p>
              </div>
            )}

            {/* Slide 4: Honour board (Winners focus) */}
            {currentSlide === 3 && (
              <div className="absolute inset-0 bg-slate-900 p-[6%] flex flex-col justify-between">
                <div className="flex justify-between items-center pb-2 border-b border-white/10">
                  <h2 className="text-xl sm:text-2xl font-black text-emerald-400">本週金牌學長姊榮譽行動榜</h2>
                  <span className="px-2 py-0.5 bg-green-950/55 border border-green-300/20 text-green-300 font-bold text-[9px] rounded uppercase">
                    第二階段: 表揚公佈
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-5 my-2">
                  <div className="bg-white/5 rounded-2xl p-4 border border-green-500/10 space-y-2">
                    <span className="text-green-400 text-xs font-black tracking-wider block">🟢 121 與引薦雙達标模範</span>
                    <div className="text-sm font-bold leading-relaxed text-slate-200">
                      {stats.green.map(m => m.name).join("、") || "本週暫無雙達標學長"}
                    </div>
                    <p className="text-[10px] text-slate-500">大會上將由副主席安排頒獎儀式，並邀請其上台分享。</p>
                  </div>

                  <div className="bg-white/5 rounded-2xl p-4 border border-indigo-500/10 space-y-2">
                    <span className="text-sky-400 text-xs font-black tracking-wider block">🟠 本週熱門邀約來賓榜</span>
                    <div className="text-sm font-bold leading-relaxed text-slate-200">
                      {members.filter(m => m.visitors > 0).map(m => `${m.name} (${m.visitors}位)`).join(" 、 ") || "本週無來賓"}
                    </div>
                    <p className="text-[10px] text-slate-500">引領來賓進入系統，為分會產業鏈注入全新活水。</p>
                  </div>
                </div>

                <p className="text-xs text-white/50 bg-green-950/20 px-3 py-1.5 rounded-lg border border-green-500/5">
                  📢 報告建言：在群組以及大會中「高度誇獎」達標學長，塑造正能量，讓其他學長自發想要靠近這個榮耀。
                </p>
              </div>
            )}

            {/* Slide 5: Traffic Light Distribution */}
            {currentSlide === 4 && (
              <div className="absolute inset-0 bg-slate-900 p-[6%] flex flex-col justify-between">
                <div className="flex justify-between items-center pb-2 border-b border-white/15">
                  <h2 className="text-xl sm:text-2xl font-black text-white">紅黃綠燈學長姊分佈情況</h2>
                  <span className="text-xs text-slate-400 font-mono">TRAFFIC LIGHT COMPOSITION</span>
                </div>

                <div className="grid grid-cols-3 gap-4 my-2">
                  <div className="bg-green-950/15 border border-green-500/20 rounded-2xl p-4 text-center space-y-1">
                    <span className="text-2xl block">🟢</span>
                    <span className="text-xs font-bold text-green-400">綠燈達標</span>
                    <p className="text-3xl font-black text-slate-100">{stats.greenCount} 人</p>
                    <span className="text-[10px] text-slate-400 font-medium">達分會 121 與引薦指標</span>
                  </div>

                  <div className="bg-amber-950/15 border border-amber-500/20 rounded-2xl p-4 text-center space-y-1">
                    <span className="text-2xl block">🟡</span>
                    <span className="text-xs font-bold text-amber-400">黃燈補強</span>
                    <p className="text-3xl font-black text-slate-100">{stats.yellowCount} 人</p>
                    <span className="text-[10px] text-slate-400 font-medium">單項不足 ｜ 本週推進重點</span>
                  </div>

                  <div className="bg-rose-950/15 border border-rose-500/20 rounded-2xl p-4 text-center space-y-1">
                    <span className="text-2xl block">🔴</span>
                    <span className="text-xs font-bold text-rose-400">紅燈關懷</span>
                    <p className="text-3xl font-black text-slate-100">{stats.redCount} 人</p>
                    <span className="text-[10px] text-slate-400 font-medium">急需援助 ｜ 禁止公開羞辱</span>
                  </div>
                </div>

                <div className="p-3 bg-white/5 rounded-xl text-xs text-rose-300 border border-rose-400/10">
                  ❤️ 溫馨叮嚀：會委會運作真諦 ──「紅燈是看見，不是指責」。紅燈學長將由輔導群私下進行暖心關懷，不公開責備。
                </div>
              </div>
            )}

            {/* Slide 6: Attendance Tracker */}
            {currentSlide === 5 && (
              <div className="absolute inset-0 bg-slate-900 p-[6%] flex flex-col justify-between">
                <div className="flex justify-between items-center pb-2 border-b border-white/10">
                  <h2 className="text-xl sm:text-2xl font-black text-white">分會出席狀況與請假追蹤表</h2>
                  <span className="text-xs text-rose-400 font-mono">ATTENDANCE COMPLIANCE</span>
                </div>

                <div className="grid grid-cols-12 gap-4 items-center my-1">
                  
                  {/* Gauge block (4/12) */}
                  <div className="col-span-4 bg-white/5 rounded-2xl p-4 text-center border border-white/5">
                    <span className="text-slate-400 text-xs block mb-1">分會本週出席率</span>
                    <p className={`text-4xl font-extrabold ${stats.absenceRate >= goals.absenceWarningRate ? "text-rose-500 animate-pulse" : "text-green-400"}`}>
                      {stats.attendanceRate}%
                    </p>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
                      <div className={`h-full ${stats.absenceRate >= goals.absenceWarningRate ? "bg-rose-500" : "bg-green-400"}`} style={{ width: `${stats.attendanceRate}%` }}></div>
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-1.5">警戒標準: {100 - goals.absenceWarningRate}% 以上</span>
                  </div>

                  {/* Details column (8/12) */}
                  <div className="col-span-8 space-y-2">
                    <div className="bg-white/5 rounded-xl p-3 border border-white/5 flex justify-between items-center text-sm">
                      <span className="text-slate-300 font-bold">📋 本週請假學長姊：</span>
                      <span className="text-amber-300 font-semibold">
                        {members.filter(m => m.attendance === "請假").map(m => m.name).join("、") || "無"}
                      </span>
                    </div>

                    <div className="bg-white/5 rounded-xl p-3 border border-white/5 flex justify-between items-center text-sm">
                      <span className="text-slate-300 font-bold">⚠️ 本週無故缺席學長姊：</span>
                      <span className="text-rose-400 font-semibold">
                        {members.filter(m => m.attendance === "缺席").map(m => m.name).join("、") || "無"}
                      </span>
                    </div>
                  </div>

                </div>

                <p className="text-xs text-slate-400 italic">
                  💡 戰術執行：出席專員將偕同請假學者，落實「優質代理人機制」，以確保該行業的商務合作線路不中斷！
                </p>
              </div>
            )}

            {/* Slide 7: Funnel visual */}
            {currentSlide === 6 && (
              <div className="absolute inset-0 bg-slate-900 p-[6%] flex flex-col justify-between">
                <div className="flex justify-between items-center pb-2 border-b border-white/10">
                  <h2 className="text-xl sm:text-2xl font-black text-white">來賓 ── 申請書高質感轉換漏斗</h2>
                  <span className="text-xs text-amber-400 font-mono">CONVERSION FUNNEL</span>
                </div>

                <div className="space-y-4 my-2 flex flex-col justify-center items-center">
                  
                  {/* Visitor Bar */}
                  <div className="w-10/12 bg-indigo-950/40 p-3 border border-indigo-500/20 rounded-xl flex justify-between items-center">
                    <span className="text-xs sm:text-sm font-bold text-indigo-300">階段一 ｜ 蒞臨商務來賓人數</span>
                    <span className="text-xl font-black text-white">{stats.visitors} 人</span>
                  </div>

                  {/* Funnel Arrow indicator */}
                  <div className="text-slate-500 font-extrabold text-sm block leading-none">▼ 蒞會 48 小時內精確回訪面談</div>

                  {/* Submit App Bar */}
                  <div className="w-7/12 bg-amber-950/40 p-3 border border-amber-500/20 rounded-xl flex justify-between items-center">
                    <span className="text-xs sm:text-sm font-bold text-amber-300">階段二 ｜ 評估提交申請書</span>
                    <span className="text-xl font-black text-amber-400">{goals.applicationTarget} 本 (目標預估)</span>
                  </div>

                </div>

                <p className="text-xs text-slate-400 text-center leading-relaxed">
                  💡 來賓專員戰術：來賓非偶然，要引導成員精準邀約「行業核心鏈夥伴」，透過會委會溫馨面談以落實高效留存。
                </p>
              </div>
            )}

            {/* Slide 8: Renewal alerts */}
            {currentSlide === 7 && (
              <div className="absolute inset-0 bg-slate-900 p-[6%] flex flex-col justify-between">
                <div className="flex justify-between items-center pb-2 border-b border-white/10">
                  <h2 className="text-xl sm:text-2xl font-black text-white">會員續約健康評估 90 天關懷預警</h2>
                  <span className="text-xs text-rose-400 font-mono">MEMBERSHIP RETENTION</span>
                </div>

                <div className="space-y-3.5 my-2">
                  <div className="flex justify-between text-xs text-slate-400 font-semibold border-b border-white/5 pb-1">
                    <span>已完成續約學長：{stats.renewed} 人</span>
                    <span className="text-rose-400">本會期需追蹤關懷：{stats.upcomingRenewal} 人</span>
                  </div>

                  <div className="bg-rose-950/15 border border-rose-500/15 rounded-2xl p-4 space-y-2">
                    <span className="text-xs font-bold text-rose-300 tracking-wider block">🚨 近期需重點關懷/待追蹤學長名單</span>
                    <div className="text-sm font-semibold leading-relaxed text-slate-200">
                      {members.filter(m => m.renewal === "待追蹤" || m.renewal === "需要關懷").map(m => `${m.name} (${m.category} | ${m.renewal})`).join(" 、 ") || "本週無人需要特別關懷，非常健康！"}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-400 block border-t border-white/5 pt-2 italic">
                  💡 溫馨對策：續約非臨時起意。提早90天偕同對組 Power Team 開啟商業 ROI 精估面談，以實實在在的引薦業績促成續約。
                </p>
              </div>
            )}

            {/* Slide 9: Staff Map */}
            {currentSlide === 8 && (
              <div className="absolute inset-0 bg-slate-900 p-[6%] flex flex-col justify-between">
                <div className="flex justify-between items-center pb-2 border-b border-white/10">
                  <h2 className="text-xl sm:text-2xl font-black text-white">會員委員會幹部成員責任崗位落實</h2>
                  <span className="text-xs text-slate-400 font-mono">STAFF ALIGNMENT</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 my-2">
                  {parsedCommittee.map((line, index) => {
                    const parts = line.split("：");
                    return (
                      <div key={index} className="bg-white/5 rounded-xl p-3 border border-white/5">
                        <span className="text-[10px] text-amber-400 font-bold block">{parts[0] || "幹部崗位"}</span>
                        <p className="text-sm font-bold text-slate-200 mt-1">{parts[1] || "未指定編制"}</p>
                      </div>
                    );
                  })}
                </div>

                <p className="text-xs text-slate-400">
                  💡 會委會運作真諦：副主席統領，出席、來賓、續約、121 專員分工帶領戰術。有責任、有溫度、有回報！
                </p>
              </div>
            )}

            {/* Slide 10: VP advises */}
            {currentSlide === 9 && (
              <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-rose-950 p-[7%] flex flex-col justify-between">
                <h2 className="text-xl sm:text-2xl font-bold tracking-widest text-amber-400 font-serif">副主席本週指導建言</h2>
                
                <div className="my-[4%] space-y-4">
                  <h3 className="text-2xl sm:text-3.5xl font-black leading-tight text-white font-serif">
                    「 開口要溫度、出手要專業；公開看楷模、私下看託底！ 」
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
                    各位會委員夥伴，我們的責任不是找瑕疵，而是成為夥伴背後的托底力量。
                    大會中我們公開、高調褒揚綠燈夥伴；私底下，我們由專員暖心約 121 紅燈學長，給予其產業配對的援助，讓大家在這個分會真正感受到商業的溫潤與豐收。
                  </p>
                </div>

                <div className="text-[11px] text-white/30 border-t border-white/5 pt-2">
                  副主席會後會語錄 ── 樂施者得 Givers Gain
                </div>
              </div>
            )}

            {/* Slide 11: Top 3 action plans */}
            {currentSlide === 10 && (
              <div className="absolute inset-0 bg-slate-900 p-[6%] flex flex-col justify-between">
                <div className="flex justify-between items-center pb-2 border-b border-white/10">
                  <h2 className="text-xl sm:text-2xl font-black text-white">下週三大分會核心戰略行動方針</h2>
                  <span className="text-xs text-amber-400">ACTION ITEMS</span>
                </div>

                <div className="space-y-3 my-2 text-xs sm:text-sm">
                  <div className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-start gap-2">
                    <span className="px-2 py-0.5 bg-rose-900 text-amber-400 font-black rounded">1</span>
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-100">核心組別（建材/行銷）發起 1 對 1 配對專攻</span>
                      <p className="text-[11px] text-slate-400">協助黃燈、紅燈學長對接產業链，透過高效121，直接激活商業氣氛。</p>
                    </div>
                  </div>

                  <div className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-start gap-2">
                    <span className="px-2 py-0.5 bg-rose-900 text-amber-400 font-black rounded">2</span>
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-100">來賓邀約精準度檢核與精細訪談開展</span>
                      <p className="text-[11px] text-slate-400">大會結束後 48 小時內進行溫馨高質感回訪，引導來賓看見商業紅利。</p>
                    </div>
                  </div>

                  <div className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-start gap-2">
                    <span className="px-2 py-0.5 bg-rose-900 text-amber-400 font-black rounded">3</span>
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-100">提早 90 天會員 ROI 精算面談排程</span>
                      <p className="text-[11px] text-slate-400">續約專員與數據專員近期主動會同，避免到期被動流失，輔佐長久留存。</p>
                    </div>
                  </div>
                </div>

                <span className="text-xs text-slate-500 italic block">
                  * 攜手把控執行細節，下週大會看成果！
                </span>
              </div>
            )}

            {/* Slide 12: Cohesion banner */}
            {currentSlide === 11 && (
              <div className="absolute inset-0 bg-gradient-to-br from-rose-950 via-rose-900 to-amber-950 p-[8%] flex flex-col justify-between text-center items-center">
                <span className="text-amber-400 font-bold uppercase tracking-widest text-xs">★ BNI 會會後會精神精神</span>
                
                <div className="space-y-3.5 my-auto">
                  <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight text-white font-serif">
                    「 數字只是結果，溫度決定結果！」
                  </h2>
                  <p className="text-xs sm:text-sm text-amber-200/80 max-w-2xl mx-auto leading-relaxed">
                    健康的分會不只是引薦引擎，更是一個彼此照拂、精緻契合的信任網路。
                    感謝每一位幹部與專員的無私付出，用愛托底、用數據推進商業成功！
                  </p>
                </div>

                <div className="text-xs text-white/35">
                  副主席會後會結語 ── 感謝大家的付出，散會！ ｜ Givers Gain 樂施者得
                </div>
              </div>
            )}

            {/* Pagination overlays (floating slightly) */}
            <div className="absolute bottom-5 right-5 flex gap-2 select-none z-10">
              <button
                onClick={handlePrev}
                disabled={currentSlide === 0}
                className="w-10 h-10 rounded-full bg-slate-800/80 hover:bg-slate-700/80 disabled:opacity-40 disabled:hover:bg-slate-800/80 border border-white/10 flex items-center justify-center transition cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={handleNext}
                disabled={currentSlide === 11}
                className="w-10 h-10 rounded-full bg-slate-800/80 hover:bg-slate-700/80 disabled:opacity-40 disabled:hover:bg-slate-800/80 border border-white/10 flex items-center justify-center transition cursor-pointer"
              >
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
            </div>

          </div>

          {/* Bottom section: Editable Speaking Script note section */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-rose-700 animate-pulse shrink-0" />
                <div>
                  <h4 className="font-bold text-slate-800 text-[11px] sm:text-xs">【 副主席口述講稿 & 簡報備忘錄 】</h4>
                  <p className="text-[10px] text-slate-400">大會會後發言逐字對稿（支持於下方編輯，直接存入匯出的 PowerPoint 備忘錄）</p>
                </div>
              </div>

              <button
                onClick={handleCopyScript}
                className="flex items-center justify-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-bold rounded-lg transition self-end sm:self-auto cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-500" />}
                {copied ? "已複製講稿" : "複製此頁講稿"}
              </button>
            </div>

            <textarea
              value={slideScripts[currentSlide]}
              onChange={handleScriptChange}
              className="w-full h-24 p-2.5 border border-slate-200 rounded-lg text-xs leading-relaxed text-slate-700 outline-none bg-slate-50/50 focus:bg-white focus:border-rose-700 transition font-sans"
              placeholder="請輸入此張投影片的簡報口述講稿..."
            />
          </div>

        </div>

      </div>
    </div>
  );
}
