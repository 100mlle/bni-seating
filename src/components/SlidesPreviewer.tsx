import React, { useState, useMemo, useEffect } from "react";
import { Member, ChapterGoals, memberName, memberLightAccurate, memberScoreAccurate, totalReferralsGiven, PALMS_LABEL, AccumulatedStats, findAcc } from "../types";
import { defaultSlideScripts, GROUPS } from "../data";
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
  FileJson,
  Upload
} from "lucide-react";

interface SlidesPreviewerProps {
  members: Member[];
  goals: ChapterGoals;
  weekTitle: string;
  stage: string;
  committeeText: string;
  customAINotes?: string[];
  accStats: AccumulatedStats[];
}

// ─── Slide category color dots ────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  "Cover":               "bg-rose-500",
  "Metrics Overview":    "bg-amber-500",
  "KPI Targets":         "bg-yellow-500",
  "Honor Roll":          "bg-emerald-500",
  "Group Rankings":      "bg-amber-400",
  "Traffic Lights":      "bg-lime-500",
  "Attendance Analysis": "bg-sky-400",
  "Attendance Tracker":  "bg-sky-500",
  "Visitor Funnel":      "bg-indigo-500",
  "Renewal Forecast":    "bg-orange-500",
  "Committee Alignment": "bg-teal-500",
  "VP Counsel":          "bg-purple-500",
  "Strategic Actions":   "bg-cyan-500",
  "Outro Motto":         "bg-rose-500",
};

export default function SlidesPreviewer({
  members,
  goals,
  weekTitle,
  stage,
  committeeText,
  customAINotes,
  accStats,
}: SlidesPreviewerProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideScripts, setSlideScripts] = useState<string[]>(defaultSlideScripts);
  const [copied, setCopied] = useState(false);
  const [pptGenerating, setPptGenerating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync with AI notes when they arrive
  useEffect(() => {
    if (customAINotes && customAINotes.length === 14) {
      setSlideScripts(customAINotes);
    }
  }, [customAINotes]);

  // ── Bug fixes: use .length on arrays; add attendanceRate ──────────────────
  const stats = useMemo(() => {
    const total = members.length;
    const visitors = members.reduce((sum, m) => sum + m.visitors, 0);
    const oneToOne = members.reduce((sum, m) => sum + m.oneToOne, 0);
    const referrals = members.reduce((sum, m) => sum + totalReferralsGiven(m), 0);

    const absentCount = members.filter(m => m.palms === "A").length;
    const leaveCount = members.filter(m => m.palms === "M" || m.palms === "S").length;
    const presentCount = members.filter(m => m.palms === "P" || m.palms === "L").length;

    const absenceRate = total > 0 ? Math.round(((absentCount + leaveCount) / total) * 100) : 0;
    // BUG FIX #4 — attendanceRate was missing from useMemo
    const attendanceRate = total > 0 ? Math.round((presentCount / total) * 100) : 0;

    const renewed = members.filter(m => m.renewal === "已續約").length;
    const upcomingRenewal = members.filter(m => m.renewal === "待追蹤" || m.renewal === "需要關懷").length;

    const green = members.filter(m => memberLightAccurate(m, findAcc(m, accStats)) === "green");
    const yellow = members.filter(m => memberLightAccurate(m, findAcc(m, accStats)) === "yellow");
    const red = members.filter(m => memberLightAccurate(m, findAcc(m, accStats)) === "red");

    return {
      total, visitors, oneToOne, referrals,
      absentCount, leaveCount, presentCount, absenceRate, attendanceRate,
      renewed, upcomingRenewal,
      green, yellow, red,
    };
  }, [members, goals, accStats]);

  const groupRankings = useMemo(() => {
    return GROUPS.map(group => {
      const allNames = [group.leaderFullName, ...group.memberFullNames];
      const gms = members.filter(m => allNames.includes(memberName(m)));
      if (gms.length === 0) return { name: group.name, leader: group.leaderFullName, avg: 0, count: 0, green: 0, total: allNames.length };
      const scores = gms.map(m => memberScoreAccurate(m, findAcc(m, accStats)));
      const avg = Math.round(scores.reduce((a,b) => a+b, 0) / scores.length);
      const green = gms.filter(m => memberLightAccurate(m, findAcc(m, accStats)) === "green").length;
      return { name: group.name, leader: group.leaderFullName, avg, count: gms.length, green, total: allNames.length };
    }).sort((a, b) => b.avg - a.avg);
  }, [members, accStats]);

  const CARE_MESSAGES = [
    "夥伴，您辛苦了！每一次出席都是對分會的支持，我們看見您的付出。",
    "會員委員會關心您，如有任何商業上的困難，歡迎隨時找副主席聊聊。",
    "一個人走得快，一群人走得遠。我們在乎每一位夥伴的成長！",
    "您上週的努力，我們都記得。本週繼續一起創造商業奇蹟！",
    "感謝您對BNI長溙分會的投入，Givers Gain，付出的人終將得到回報！",
    "我們的分會因有您而更完整，期待下週再見到您精彩的身影！",
    "商業夥伴不只是交易夥伴，更是並肩前行的戰友，感謝您的同行！",
    "每一張引薦單背後都是信任，謝謝您對分會夥伴的信心！",
  ];
  const careMessage = useMemo(() => CARE_MESSAGES[Math.floor(Math.random() * CARE_MESSAGES.length)], [weekTitle]);

  // Slide list names
  const slideDeckMeta = [
    { id: 0,  title: "封面",                            category: "Cover" },
    { id: 1,  title: "本週數據總覽",                    category: "Metrics Overview" },
    { id: 2,  title: "目標達成率",                      category: "KPI Targets" },
    { id: 3,  title: "達標表揚行動榜",                  category: "Honor Roll" },
    { id: 4,  title: "六組積分競賽排行榜",              category: "Group Rankings" },
    { id: 5,  title: "紅黃綠燈健康分佈",               category: "Traffic Lights" },
    { id: 6,  title: "PALMS 出席 & 燈號分析",          category: "Attendance Analysis" },
    { id: 7,  title: "出席與請假追蹤",                  category: "Attendance Tracker" },
    { id: 8,  title: "來賓到申請書轉換 Funnel",         category: "Visitor Funnel" },
    { id: 9,  title: "續約關懷 90 天提示",              category: "Renewal Forecast" },
    { id: 10, title: "會委會成員分工落實",              category: "Committee Alignment" },
    { id: 11, title: "副主席策略建言",                  category: "VP Counsel" },
    { id: 12, title: "下週三大核心行動",                category: "Strategic Actions" },
    { id: 13, title: "結尾：溫度托底共識",              category: "Outro Motto" },
  ];

  const handlePrev = () => setCurrentSlide(prev => Math.max(0, prev - 1));
  const handleNext = () => setCurrentSlide(prev => Math.min(13, prev + 1));

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

  const parsedCommittee = useMemo(() => {
    return committeeText.split("\n").map(l => l.trim()).filter(Boolean);
  }, [committeeText]);

  const percent = (val: number, max: number) => max > 0 ? Math.round((val / max) * 100) : 0;

  const todayStr = new Date().toISOString().split("T")[0].replace(/-/g, "/");
  const stageLabel =
    stage === "stage1" ? "第一階段: 不公開點名" :
    stage === "stage2" ? "第二階段: 公開表揚" :
    "第三階段: 私下關懷";

  // ── Reusable slide layout helpers ─────────────────────────────────────────
  // Shared dark-slide wrapper with left accent bar + footer
  const DarkSlide = ({ children, noAccent }: { children: React.ReactNode; noAccent?: boolean }) => (
    <div className="absolute inset-0 bg-[#0f172a] flex flex-col">
      {/* Left accent bar */}
      {!noAccent && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 to-rose-600 z-10" />
      )}
      <div className="flex-1 flex flex-col overflow-hidden pl-[3%] pr-[4%] pt-[4%] pb-[8%]">
        {children}
      </div>
      {/* Footer bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-white/5 border-t border-white/5 text-[9px] text-white/30 px-[6%] py-1.5 flex justify-between z-10">
        <span>{weekTitle}</span>
        <span>BNI 長溙分會 第13屆</span>
        <span>{todayStr}</span>
      </div>
    </div>
  );

  const SlideHeader = ({
    title,
    tag,
    tagColor = "text-slate-400",
  }: {
    title: string;
    tag: string;
    tagColor?: string;
  }) => (
    <div className="flex justify-between items-start mb-3 pb-2 border-b border-white/10 shrink-0">
      <h2 className="text-lg sm:text-xl font-black text-white leading-tight">{title}</h2>
      <span className={`font-mono text-[9px] sm:text-[10px] uppercase shrink-0 ml-2 ${tagColor}`}>{tag}</span>
    </div>
  );

  // ── Export to PowerPoint ───────────────────────────────────────────────────
  const exportToPowerpoint = async () => {
    setPptGenerating(true);
    try {
      const ppt = new pptxgen();
      ppt.layout = "LAYOUT_WIDE";

      // ── Color constants — orange primary + white palette ────────────────
      const ORANGE    = "E05010";  // deep orange — primary (cover/closing bg, header stripe)
      const ORANGE_M  = "F07030";  // medium orange — accents, bar colors
      const ORANGE_L  = "F4A060";  // light orange — secondary accents, badges
      const WHITE     = "FFFFFF";  // white — content slide background, text on orange
      const CARD_L    = "FFF8F2";  // near-white card on light slides
      const CARD_W    = "FFEEDD";  // light orange-tint card
      const TXT_D     = "1C0800";  // very dark text on white slides
      const TXT_M     = "6A3810";  // mid orange-brown text
      const TXT_S     = "B07040";  // soft muted orange text
      const SUCCESS   = "3A7850";  // sage green — for green/good items
      const INFO      = "3A6888";  // muted blue — for info items
      const WARN_C    = "C04040";  // muted red — for warnings/danger
      const GOLD_H    = "E89020";  // orange-gold — for highlights
      const SHADOW    = "DFC0A0";  // warm orange shadow for light bg cards
      const DARK_SHAD = "8C2800";  // deep orange shadow for orange bg cards

      // ── stageLabel (already in component scope but redefined for PPT) ──
      const stageLabel =
        stage === "stage1" ? "第一階段: 不公開點名" :
        stage === "stage2" ? "第二階段: 公開表揚" :
        "第三階段: 私下關懷";

      // ── Shared helpers ───────────────────────────────────────────────────
      const setLightBg = (slide: any) => {
        slide.background = { fill: WHITE };
      };

      const setDarkBg = (slide: any) => {
        slide.background = { fill: ORANGE };
      };

      const lightHeader = (slide: any, title: string, sub: string) => {
        slide.addShape((ppt as any).ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.07, fill: { color: ORANGE_M }, line: { color: ORANGE_M } });
        slide.addText(title, { x: 0.5, y: 0.12, w: 10, h: 0.7, fontSize: 24, bold: true, color: TXT_D, fontFace: "Arial" });
        slide.addText(sub, { x: 0.5, y: 0.82, w: 12.5, h: 0.3, fontSize: 10, color: ORANGE_M, fontFace: "Arial" });
        slide.addShape((ppt as any).ShapeType.rect, { x: 0.5, y: 1.12, w: 12.3, h: 0.02, fill: { color: ORANGE_M }, line: { color: ORANGE_M } });
      };

      const addFooter = (slide: any, dark = false) => {
        const fbg = dark ? "8C2800" : "FFF0E4";
        const ftxt = dark ? "FFEEDD" : TXT_S;
        slide.addShape((ppt as any).ShapeType.rect, { x: 0, y: 7.0, w: 13.33, h: 0.5, fill: { color: fbg }, line: { color: fbg } });
        slide.addText(`${weekTitle}  ·  BNI 長溙分會 第13屆  ·  ${new Date().toISOString().split("T")[0].replace(/-/g,"/")}`, {
          x: 0, y: 7.0, w: 13.33, h: 0.5, fontSize: 8, color: ftxt, align: "center", valign: "middle", fontFace: "Arial"
        });
      };

      const card3d = (slide: any, x: number, y: number, w: number, h: number, fillColor: string) => {
        slide.addShape((ppt as any).ShapeType.roundRect, { x: x+0.06, y: y+0.06, w, h, fill: { color: SHADOW }, line: { color: SHADOW }, rectRadius: 0.1 });
        slide.addShape((ppt as any).ShapeType.roundRect, { x, y, w, h, fill: { color: fillColor }, line: { color: "F0C090" }, rectRadius: 0.1 });
      };

      const darkCard3d = (slide: any, x: number, y: number, w: number, h: number, fillColor: string) => {
        slide.addShape((ppt as any).ShapeType.roundRect, { x: x+0.06, y: y+0.06, w, h, fill: { color: DARK_SHAD }, line: { color: DARK_SHAD }, rectRadius: 0.1 });
        slide.addShape((ppt as any).ShapeType.roundRect, { x, y, w, h, fill: { color: fillColor }, line: { color: "FF8030" }, rectRadius: 0.1 });
      };

      const kpiCard = (slide: any, x: number, y: number, w: number, h: number, icon: string, label: string, value: string, target: string, pct: number, barColor: string) => {
        card3d(slide, x, y, w, h, CARD_L);
        slide.addText(icon, { x: x+0.15, y: y+0.15, w: 0.5, h: 0.4, fontSize: 18 });
        slide.addText(label, { x: x+0.1, y: y+0.55, w: w-0.2, h: 0.3, fontSize: 10, color: TXT_M, fontFace: "Arial" });
        slide.addText(value, { x: x+0.1, y: y+0.82, w: w-0.2, h: 0.7, fontSize: 30, bold: true, color: barColor, fontFace: "Arial" });
        slide.addText(`目標 ${target}`, { x: x+0.1, y: y+1.5, w: w-0.2, h: 0.25, fontSize: 9, color: TXT_S });
        slide.addShape((ppt as any).ShapeType.rect, { x: x+0.1, y: y+1.78, w: w-0.2, h: 0.14, fill: { color: "F5DCC0" }, line: { color: "F5DCC0" } });
        const fillW = Math.max(0.05, (Math.min(pct,100)/100) * (w-0.2));
        slide.addShape((ppt as any).ShapeType.rect, { x: x+0.1, y: y+1.78, w: fillW, h: 0.14, fill: { color: barColor }, line: { color: barColor } });
        slide.addText(`${pct}%`, { x: x+0.1, y: y+1.95, w: w-0.2, h: 0.2, fontSize: 8, color: barColor, bold: true, align: "right" });
      };

      // ── Slide 1 — Cover ──────────────────────────────────────────────────
      {
        const slide = ppt.addSlide();
        slide.addNotes(slideScripts[0] ?? "");
        setDarkBg(slide);
        addFooter(slide, true);
        for (let i = 0; i < 8; i++) {
          slide.addShape((ppt as any).ShapeType.line, { x: i*2, y: 0, w: 0, h: 7.5, line: { color: "FF7040", width: 0.5 } });
        }
        slide.addShape((ppt as any).ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.08, fill: { color: WHITE }, line: { color: WHITE } });
        slide.addShape((ppt as any).ShapeType.rect, { x: 0, y: 0, w: 0.08, h: 7.0, fill: { color: WHITE }, line: { color: WHITE } });

        slide.addShape((ppt as any).ShapeType.roundRect, { x: 0.5, y: 0.5, w: 1.8, h: 0.5, fill: { color: WHITE }, line: { color: WHITE }, rectRadius: 0.05 });
        slide.addText("BNI 長溙分會", { x: 0.5, y: 0.5, w: 1.8, h: 0.5, fontSize: 11, bold: true, color: ORANGE, align: "center", valign: "middle" });

        slide.addText("副主席週報  ·  VICE PRESIDENT WEEKLY REPORT", { x: 0.5, y: 1.2, w: 12, h: 0.35, fontSize: 11, color: WHITE, fontFace: "Arial", bold: false });

        slide.addText(weekTitle, { x: 0.5, y: 1.65, w: 12, h: 1.2, fontSize: 42, bold: true, color: WHITE, fontFace: "Arial" });

        slide.addText(stageLabel, {
          x: 0.5, y: 2.95, w: 5, h: 0.45,
          fontSize: 13, color: ORANGE, bold: true, fontFace: "Arial",
          fill: { color: WHITE }, align: "center", valign: "middle"
        });

        slide.addShape((ppt as any).ShapeType.rect, { x: 0.5, y: 3.6, w: 0.06, h: 1.0, fill: { color: WHITE }, line: { color: WHITE } });
        slide.addText("數據不是責備，是協助看見問題\n用數據推進，用溫度帶人", {
          x: 0.75, y: 3.6, w: 9, h: 1.0, fontSize: 16, color: WHITE, italic: true, fontFace: "Arial"
        });

        slide.addText(`感謝各組組長：${GROUPS.map((g: any) => g.leaderFullName).join("、")} 的帶領！`, {
          x: 0.5, y: 4.9, w: 12, h: 0.35, fontSize: 11, color: "FFEEDD", italic: true
        });

        slide.addText("Givers Gain  ｜  樂施者得", { x: 0, y: 6.3, w: 13.33, h: 0.4, fontSize: 14, color: WHITE, align: "center", bold: true });
      }

      // ── Slide 3 — KPI Achievement bars ──────────────────────────────────
      {
        const slide = ppt.addSlide();
        slide.addNotes(slideScripts[2] ?? "");
        setLightBg(slide);
        addFooter(slide);
        lightHeader(slide, "目標達成率看板", "KPI ACHIEVEMENT — 不公開點名");

        const bars = [
          { label: "1 對 1 交流推進", actual: stats.oneToOne, target: goals.oneToOneTarget, color: ORANGE_M, icon: "💬" },
          { label: "外部＋內部引薦單", actual: stats.referrals, target: goals.referralTarget, color: ORANGE_L, icon: "📋" },
          { label: "本週邀約商務來賓", actual: stats.visitors, target: goals.visitorTarget, color: SUCCESS, icon: "🤝" },
          { label: "出席率（PALMS P）", actual: stats.presentCount, target: stats.total, color: INFO, icon: "✅" },
        ];
        bars.forEach((b, i) => {
          const y = 1.38 + i * 1.4;
          const pct = b.target > 0 ? Math.min(100, Math.round((b.actual/b.target)*100)) : 0;
          card3d(slide, 0.4, y, 12.2, 1.1, CARD_L);
          slide.addText(b.icon, { x: 0.55, y: y+0.1, w: 0.4, h: 0.5, fontSize: 16 });
          slide.addText(b.label, { x: 1.05, y: y+0.12, w: 5, h: 0.35, fontSize: 15, color: TXT_D, bold: true });
          slide.addText(`${b.actual} / ${b.target}`, { x: 1.05, y: y+0.5, w: 5, h: 0.3, fontSize: 13, color: TXT_M });
          slide.addText(`${pct}%`, { x: 10.5, y: y+0.1, w: 1.7, h: 0.8, fontSize: 36, bold: true, color: b.color, align: "right", valign: "middle" });
          slide.addShape((ppt as any).ShapeType.rect, { x: 1.05, y: y+0.82, w: 9.0, h: 0.14, fill: { color: "F5DCC0" }, line: { color: "F5DCC0" } });
          const fw = Math.max(0.05, (pct/100)*9.0);
          slide.addShape((ppt as any).ShapeType.rect, { x: 1.05, y: y+0.82, w: fw, h: 0.14, fill: { color: b.color }, line: { color: b.color } });
        });
        slide.addText("第一階段方針：公開看總體目標，不公開點名", {
          x: 0.4, y: 6.5, w: 12.2, h: 0.3, fontSize: 10, color: TXT_M, italic: true, align: "center"
        });
      }

      // ── Slide 4 — Honor Board ────────────────────────────────────────────
      {
        const slide = ppt.addSlide();
        slide.addNotes(slideScripts[3] ?? "");
        setLightBg(slide);
        addFooter(slide);
        lightHeader(slide, "本週金牌夥伴榮譽行動榜", "HONOR ROLL — 公開表揚楷模");

        const greenNames = stats.green.map((m: any) => memberName(m));
        const visitorMembers = members.filter((m: any) => m.visitors > 0);

        card3d(slide, 0.4, 1.3, 7.5, 5.0, "F0FBF4");
        slide.addShape((ppt as any).ShapeType.rect, { x: 0.4, y: 1.3, w: 7.5, h: 0.06, fill: { color: SUCCESS }, line: { color: SUCCESS } });
        slide.addText("🏆 121 & 引薦 雙達標模範", { x: 0.55, y: 1.38, w: 7.2, h: 0.45, fontSize: 13, bold: true, color: SUCCESS });
        let col = 0, row = 0;
        greenNames.forEach((name: string) => {
          const bx = 0.55 + col * 2.4;
          const by = 1.95 + row * 0.55;
          slide.addShape((ppt as any).ShapeType.roundRect, { x: bx, y: by, w: 2.2, h: 0.42, fill: { color: "E0F5EA" }, line: { color: SUCCESS }, rectRadius: 0.08 });
          slide.addText(name, { x: bx, y: by, w: 2.2, h: 0.42, fontSize: 11, color: SUCCESS, bold: true, align: "center", valign: "middle" });
          col++;
          if (col >= 3) { col = 0; row++; }
        });
        if (!greenNames.length) {
          slide.addText("本週暫無雙達標夥伴", { x: 0.55, y: 2.2, w: 7, h: 0.5, fontSize: 13, color: TXT_S, italic: true });
        }
        slide.addText("大會公開表揚，邀請分享 1 分鐘心法", { x: 0.55, y: 6.0, w: 7.2, h: 0.25, fontSize: 9, color: TXT_M, italic: true });

        card3d(slide, 8.1, 1.3, 4.8, 5.0, "FFF8F2");
        slide.addShape((ppt as any).ShapeType.rect, { x: 8.1, y: 1.3, w: 4.8, h: 0.06, fill: { color: ORANGE_M }, line: { color: ORANGE_M } });
        slide.addText("🌟 積極邀約來賓榜", { x: 8.25, y: 1.38, w: 4.5, h: 0.45, fontSize: 13, bold: true, color: ORANGE_M });
        visitorMembers.forEach((m: any, i: number) => {
          const by = 2.0 + i * 0.65;
          card3d(slide, 8.25, by, 4.4, 0.52, CARD_L);
          slide.addText(`${memberName(m)}`, { x: 8.35, y: by+0.04, w: 2.5, h: 0.44, fontSize: 12, color: TXT_D, bold: true, valign: "middle" });
          slide.addText(`${m.visitors} 位來賓`, { x: 10.9, y: by+0.04, w: 1.6, h: 0.44, fontSize: 11, color: ORANGE_M, bold: true, align: "right", valign: "middle" });
        });
        if (!visitorMembers.length) {
          slide.addText("本週尚無來賓邀約", { x: 8.25, y: 2.2, w: 4.4, h: 0.5, fontSize: 12, color: TXT_S, italic: true, align: "center" });
        }
        slide.addText("公開表揚楷模，讓榮耀帶動行動", { x: 0, y: 6.55, w: 13.33, h: 0.3, fontSize: 11, color: TXT_M, align: "center", italic: true });
      }

      // ── Slide 5 — Group Rankings ─────────────────────────────────────────
      {
        const slide = ppt.addSlide();
        slide.addNotes(slideScripts[4] ?? "");
        setLightBg(slide);
        addFooter(slide);
        lightHeader(slide, "六組積分競賽排行榜", "GROUP RANKING — 小組競賽看板");

        const barColors = [ORANGE, ORANGE_M, ORANGE_L, SUCCESS, INFO, "A08060"];
        const medals = ["🥇","🥈","🥉","4.","5.","6."];

        groupRankings.forEach((g: any, i: number) => {
          const y = 1.38 + i * 0.87;
          const pct = Math.min(100, g.avg);
          const bw = (pct / 100) * 9.0;
          const bc = barColors[i] || SUCCESS;

          card3d(slide, 0.4, y, 12.4, 0.75, i === 0 ? "FFF0E0" : CARD_L);

          slide.addText(medals[i], { x: 0.5, y: y+0.05, w: 0.5, h: 0.65, fontSize: i < 3 ? 18 : 14, valign: "middle", align: "center" });
          slide.addText(g.name, { x: 1.05, y: y+0.05, w: 1.2, h: 0.65, fontSize: 13, bold: true, color: TXT_D, valign: "middle" });
          slide.addShape((ppt as any).ShapeType.roundRect, { x: 2.35, y: y+0.18, w: 1.6, h: 0.38, fill: { color: i === 0 ? ORANGE_L : CARD_W }, line: { color: i === 0 ? ORANGE_L : CARD_W }, rectRadius: 0.06 });
          slide.addText(`組長 ${g.leader}`, { x: 2.35, y: y+0.18, w: 1.6, h: 0.38, fontSize: 10, color: i === 0 ? TXT_D : TXT_M, align: "center", valign: "middle" });

          slide.addShape((ppt as any).ShapeType.rect, { x: 4.1, y: y+0.28, w: 9.0, h: 0.22, fill: { color: "F5DCC0" }, line: { color: "F5DCC0" } });
          slide.addShape((ppt as any).ShapeType.rect, { x: 4.1, y: y+0.28, w: bw, h: 0.22, fill: { color: bc }, line: { color: bc } });
          slide.addText(`${g.avg} 分`, { x: 4.1 + bw + 0.1, y: y+0.2, w: 1.0, h: 0.38, fontSize: 12, bold: true, color: bc, valign: "middle" });
          slide.addText(`🟢${g.green}/${g.total}`, { x: 12.0, y: y+0.2, w: 0.8, h: 0.38, fontSize: 9, color: SUCCESS, align: "right", valign: "middle" });
        });

        slide.addText("小組競賽不是壓力，是讓行動被看見", { x: 0, y: 6.55, w: 13.33, h: 0.3, fontSize: 11, color: TXT_M, align: "center", italic: true });
      }

      // ── Slide 6 — Traffic Lights ─────────────────────────────────────────
      {
        const slide = ppt.addSlide();
        slide.addNotes(slideScripts[5] ?? "");
        setLightBg(slide);
        addFooter(slide);
        lightHeader(slide, "紅黃綠燈健康分佈", "KPI TRAFFIC LIGHTS");

        const lights = [
          { emoji: "🟢", label: "綠燈達標", count: stats.green.length, note: "121 & 引薦雙達標", bg: "F0FBF4", border: SUCCESS, textC: SUCCESS, subC: SUCCESS },
          { emoji: "🟡", label: "黃燈補強", count: stats.yellow.length, note: "單項不足，本週重點推進", bg: "FBF8E8", border: GOLD_H, textC: GOLD_H, subC: GOLD_H },
          { emoji: "🔴", label: "紅燈關懷", count: stats.red.length, note: "需私下溫馨支援", bg: "FBF0F0", border: WARN_C, textC: WARN_C, subC: WARN_C },
        ];
        lights.forEach((l, i) => {
          const x = 0.55 + i * 4.15;
          card3d(slide, x, 1.35, 3.8, 4.8, l.bg);
          slide.addShape((ppt as any).ShapeType.rect, { x, y: 1.35, w: 3.8, h: 0.06, fill: { color: l.border }, line: { color: l.border } });
          slide.addText(l.emoji, { x, y: 1.6, w: 3.8, h: 1.0, fontSize: 52, align: "center" });
          slide.addText(l.label, { x, y: 2.7, w: 3.8, h: 0.45, fontSize: 16, bold: true, color: l.textC, align: "center" });
          slide.addText(`${l.count} 人`, { x, y: 3.2, w: 3.8, h: 1.0, fontSize: 54, bold: true, color: l.textC, align: "center" });
          slide.addText(l.note, { x: x+0.1, y: 4.3, w: 3.6, h: 0.45, fontSize: 10, color: l.subC, align: "center", italic: true });
          const bw = (l.count / Math.max(1, stats.total)) * 3.4;
          slide.addShape((ppt as any).ShapeType.rect, { x: x+0.2, y: 4.85, w: 3.4, h: 0.1, fill: { color: "F5DCC0" }, line: { color: "F5DCC0" } });
          if (bw > 0) slide.addShape((ppt as any).ShapeType.rect, { x: x+0.2, y: 4.85, w: bw, h: 0.1, fill: { color: l.border }, line: { color: l.border } });
        });
        card3d(slide, 2.5, 6.35, 8.0, 0.4, CARD_W);
        slide.addText("紅燈是看見，不是指責  ·  公開看數據，私下做關懷", {
          x: 2.5, y: 6.35, w: 8.0, h: 0.4, fontSize: 11, color: ORANGE_M, align: "center", valign: "middle", italic: true
        });
      }

      // ── Slide 7 — PALMS Analysis ─────────────────────────────────────────
      {
        const slide = ppt.addSlide();
        slide.addNotes(slideScripts[6] ?? "");
        setLightBg(slide);
        addFooter(slide);
        lightHeader(slide, "PALMS 出席 & 燈號分析", "ATTENDANCE & KPI STATUS");

        const palmsItems = [
          { key: "P", label: "P 出席", count: members.filter((m:any) => m.palms==="P").length, color: SUCCESS, bg: "EEF8F2", border: SUCCESS },
          { key: "L", label: "L 遲到", count: members.filter((m:any) => m.palms==="L").length, color: GOLD_H, bg: "FFF8E8", border: GOLD_H },
          { key: "A", label: "A 缺席", count: members.filter((m:any) => m.palms==="A").length, color: WARN_C, bg: "FAF0F0", border: WARN_C },
          { key: "M", label: "M 病假", count: members.filter((m:any) => m.palms==="M").length, color: INFO, bg: "F0F4FA", border: INFO },
          { key: "S", label: "S 代理人", count: members.filter((m:any) => m.palms==="S").length, color: ORANGE_M, bg: "FFF4EC", border: ORANGE_M },
        ];
        palmsItems.forEach((p, i) => {
          const x = 0.4 + i * 2.5;
          card3d(slide, x, 1.35, 2.2, 2.2, p.bg);
          slide.addShape((ppt as any).ShapeType.rect, { x, y: 1.35, w: 2.2, h: 0.06, fill: { color: p.color }, line: { color: p.color } });
          slide.addText(p.label, { x, y: 1.55, w: 2.2, h: 0.35, fontSize: 11, bold: true, color: p.color, align: "center" });
          slide.addText(`${p.count}`, { x, y: 1.95, w: 2.2, h: 0.85, fontSize: 44, bold: true, color: TXT_D, align: "center" });
          slide.addText("人", { x, y: 2.85, w: 2.2, h: 0.3, fontSize: 10, color: TXT_S, align: "center" });
          const bw = (p.count / Math.max(1, stats.total)) * 1.8;
          slide.addShape((ppt as any).ShapeType.rect, { x: x+0.2, y: 3.2, w: 1.8, h: 0.1, fill: { color: "F5DCC0" }, line: { color: "F5DCC0" } });
          if (bw > 0) slide.addShape((ppt as any).ShapeType.rect, { x: x+0.2, y: 3.2, w: bw, h: 0.1, fill: { color: p.color }, line: { color: p.color } });
        });

        card3d(slide, 0.4, 3.7, 12.4, 2.5, CARD_L);
        slide.addText("KPI 燈號分佈", { x: 0.6, y: 3.82, w: 11.8, h: 0.4, fontSize: 12, bold: true, color: TXT_D });
        [
          { label: "🟢 綠燈達標", count: stats.green.length, color: SUCCESS, note: "121 & 引薦雙達標" },
          { label: "🟡 黃燈補強", count: stats.yellow.length, color: GOLD_H, note: "單項不足" },
          { label: "🔴 紅燈關懷", count: stats.red.length, color: WARN_C, note: "私下溫馨輔導" },
        ].forEach((t, i) => {
          const tx = 0.6 + i * 4.1;
          slide.addText(`${t.label}  ${t.count} 人`, { x: tx, y: 4.3, w: 3.9, h: 0.5, fontSize: 16, bold: true, color: t.color });
          const bw2 = (t.count / Math.max(1, stats.total)) * 3.5;
          slide.addShape((ppt as any).ShapeType.rect, { x: tx, y: 4.85, w: 3.5, h: 0.16, fill: { color: "F5DCC0" }, line: { color: "F5DCC0" } });
          if (bw2 > 0) slide.addShape((ppt as any).ShapeType.rect, { x: tx, y: 4.85, w: bw2, h: 0.16, fill: { color: t.color }, line: { color: t.color } });
          slide.addText(t.note, { x: tx, y: 5.06, w: 3.5, h: 0.3, fontSize: 9, color: TXT_M, italic: true });
        });
        slide.addText(careMessage, { x: 0.4, y: 6.4, w: 12.4, h: 0.35, fontSize: 10, color: ORANGE_M, italic: true, align: "center" });
      }

      // ── Slide 8 — Attendance Tracker ─────────────────────────────────────
      {
        const slide = ppt.addSlide();
        slide.addNotes(slideScripts[7] ?? "");
        setLightBg(slide);
        addFooter(slide);
        lightHeader(slide, "出席狀況與請假追蹤", "ATTENDANCE COMPLIANCE");

        const absentNames = members.filter((m:any) => m.palms==="A").map((m:any) => memberName(m)).join("、") || "無";
        const attOk = stats.absenceRate < goals.absenceWarningRate;

        card3d(slide, 0.4, 1.35, 4.2, 4.8, attOk ? "F0FBF4" : "FAF0F0");
        slide.addShape((ppt as any).ShapeType.rect, { x: 0.4, y: 1.35, w: 4.2, h: 0.06, fill: { color: attOk ? SUCCESS : WARN_C }, line: { color: attOk ? SUCCESS : WARN_C } });
        slide.addText("本週出席率", { x: 0.4, y: 1.55, w: 4.2, h: 0.4, fontSize: 12, color: TXT_M, align: "center" });
        slide.addText(`${stats.attendanceRate}%`, { x: 0.4, y: 2.0, w: 4.2, h: 1.4, fontSize: 64, bold: true, color: attOk ? SUCCESS : WARN_C, align: "center" });
        slide.addText(`警戒標準：${100-goals.absenceWarningRate}% 以上`, { x: 0.4, y: 3.5, w: 4.2, h: 0.35, fontSize: 10, color: TXT_M, align: "center" });
        const bwAtt = (stats.attendanceRate/100) * 3.5;
        slide.addShape((ppt as any).ShapeType.rect, { x: 0.65, y: 4.0, w: 3.5, h: 0.2, fill: { color: "F5DCC0" }, line: { color: "F5DCC0" } });
        slide.addShape((ppt as any).ShapeType.rect, { x: 0.65, y: 4.0, w: bwAtt, h: 0.2, fill: { color: attOk ? SUCCESS : WARN_C }, line: { color: attOk ? SUCCESS : WARN_C } });
        slide.addText(attOk ? "出席健康 ✅" : "⚠️ 低於警戒線", { x: 0.4, y: 4.3, w: 4.2, h: 0.3, fontSize: 11, bold: true, color: attOk ? SUCCESS : WARN_C, align: "center" });

        const mNames  = members.filter((m:any) => m.palms==="M").map((m:any) => memberName(m)).join("、") || "無";
        const sNames  = members.filter((m:any) => m.palms==="S").map((m:any) => memberName(m)).join("、") || "無";
        const infoItems = [
          { icon: "🔄", title: "S 代理人夥伴（本週）", value: sNames, color: ORANGE_M },
          { icon: "🏥", title: "M 病假夥伴（本週）", value: mNames, color: INFO },
          { icon: "⚠️", title: "A 缺席夥伴（本週）", value: absentNames, color: WARN_C },
        ];
        infoItems.forEach((item, i) => {
          const iy = 1.35 + i * 1.65;
          card3d(slide, 5.0, iy, 7.8, 1.5, CARD_L);
          slide.addText(`${item.icon} ${item.title}`, { x: 5.2, y: iy+0.15, w: 7.4, h: 0.4, fontSize: 12, bold: true, color: item.color });
          slide.addText(item.value, { x: 5.2, y: iy+0.65, w: 7.4, h: 0.7, fontSize: 14, color: TXT_D, valign: "middle", wrap: true });
        });
        slide.addText("BNI 無請假制度 — A 缺席需補件、S 代理可抵免，M 病假計入六個月出席紀錄。", {
          x: 0.4, y: 6.4, w: 12.4, h: 0.35, fontSize: 10, color: TXT_M, italic: true, align: "center"
        });
      }

      // ── Slide 9 — Visitor Funnel ─────────────────────────────────────────
      {
        const slide = ppt.addSlide();
        slide.addNotes(slideScripts[8] ?? "");
        setLightBg(slide);
        addFooter(slide);
        lightHeader(slide, "來賓到申請書轉換漏斗", "VISITOR CONVERSION FUNNEL");

        const funnelStages = [
          { label: "邀約接觸", sub: "精準鎖定目標產業", w: 12.0, color: "EDE8FF", text: TXT_D },
          { label: `蒞臨來賓 ${stats.visitors} 人`, sub: "本週實際到訪人數", w: 9.5, color: CARD_W, text: TXT_D },
          { label: "48小時高質感回訪", sub: "專員溫馨追蹤聯繫", w: 7.5, color: "FFDDC0", text: TXT_D },
          { label: "一對一面談配對", sub: "深度了解商業需求", w: 5.5, color: "FFC8A0", text: TXT_D },
          { label: `提交申請書 目標 ${goals.applicationTarget} 本`, sub: "成功加入分會", w: 4.0, color: ORANGE, text: WHITE },
        ];
        funnelStages.forEach((f, i) => {
          const y = 1.3 + i * 1.12;
          const x = (13.33 - f.w) / 2;
          card3d(slide, x, y, f.w, 1.0, f.color);
          slide.addText(f.label, { x: x+0.15, y: y+0.05, w: f.w-0.3, h: 0.55, fontSize: 18, bold: true, color: f.text, align: "center", valign: "middle" });
          slide.addText(f.sub, { x: x+0.15, y: y+0.62, w: f.w-0.3, h: 0.32, fontSize: 11, color: f.text, align: "center", italic: true });
          if (i < funnelStages.length - 1) {
            slide.addText("▼", { x: 0, y: y+1.0, w: 13.33, h: 0.12, fontSize: 12, color: TXT_S, align: "center" });
          }
        });
        slide.addText("來賓不是偶然，是精準邀約與系統追蹤的成果", {
          x: 0, y: 6.55, w: 13.33, h: 0.3, fontSize: 11, color: TXT_M, italic: true, align: "center"
        });
      }

      // ── Slide 10 — Renewal Tracker ───────────────────────────────────────
      {
        const slide = ppt.addSlide();
        slide.addNotes(slideScripts[9] ?? "");
        setLightBg(slide);
        addFooter(slide);
        lightHeader(slide, "會員續約 90 天關懷預警", "MEMBERSHIP RENEWAL HEALTH");

        const renewalList = members.filter((m:any) => m.renewal==="待追蹤"||m.renewal==="需要關懷");

        const stages = [
          { label: "90 天前提醒", icon: "📅", sub: "偕同 Power Team\n啟動 ROI 面談", color: ORANGE },
          { label: "ROI 精算面談", icon: "📊", sub: "具體成交算盤\n輔助留續決策", color: ORANGE_M },
          { label: "續約確認", icon: "✅", sub: "確認續約意願\n完成手續", color: SUCCESS },
        ];
        stages.forEach((s, i) => {
          const x = 0.8 + i * 4.2;
          card3d(slide, x, 1.35, 3.6, 2.8, CARD_L);
          slide.addShape((ppt as any).ShapeType.rect, { x, y: 1.35, w: 3.6, h: 0.06, fill: { color: s.color }, line: { color: s.color } });
          slide.addText(s.icon, { x, y: 1.55, w: 3.6, h: 0.7, fontSize: 30, align: "center" });
          slide.addText(s.label, { x: x+0.1, y: 2.3, w: 3.4, h: 0.45, fontSize: 13, bold: true, color: TXT_D, align: "center" });
          slide.addText(s.sub, { x: x+0.1, y: 2.8, w: 3.4, h: 0.8, fontSize: 10, color: TXT_M, align: "center", italic: true });
          if (i < 2) slide.addText("→", { x: x+3.6, y: 2.2, w: 0.6, h: 0.5, fontSize: 20, color: ORANGE_M, align: "center", valign: "middle" });
        });

        card3d(slide, 0.4, 4.4, 12.4, 1.5, CARD_W);
        slide.addText(`✅ 已完成續約：${stats.renewed} 人  ·  🔔 需追蹤關懷：${stats.upcomingRenewal} 人`, {
          x: 0.6, y: 4.55, w: 12.0, h: 0.45, fontSize: 13, color: WHITE, align: "center", bold: true
        });
        const listText = renewalList.length ? renewalList.map((m:any) => `${memberName(m)} (${m.renewal})`).join("  ·  ") : "本週無待追蹤夥伴，非常健康！";
        slide.addText(listText, { x: 0.6, y: 5.05, w: 12.0, h: 0.7, fontSize: 11, color: renewalList.length ? WARN_C : SUCCESS, align: "center", italic: true });
        slide.addText("提早關懷，不讓續約變成最後一刻的壓力", { x: 0, y: 6.55, w: 13.33, h: 0.3, fontSize: 11, color: TXT_M, italic: true, align: "center" });
      }

      // ── Slide 11 — Committee Org Chart ───────────────────────────────────
      {
        const slide = ppt.addSlide();
        slide.addNotes(slideScripts[10] ?? "");
        setLightBg(slide);
        addFooter(slide);
        lightHeader(slide, "會員委員會幹部責任分工", "COMMITTEE ORGANIZATION");

        const roles: { role: string; name: string }[] = [];
        parsedCommittee.forEach((line: string) => {
          const parts = line.split("：");
          const roleName = parts[0]?.trim() || "職位";
          const namesPart = parts[1]?.trim() || "未指定";
          if (namesPart.includes("、")) {
            // Multiple people — expand into individual entries with shortened role label
            const shortRole = roleName.replace("會員委員會", "會委會").replace("協調員", "專員");
            namesPart.split("、").forEach(n => {
              roles.push({ role: shortRole, name: n.trim() });
            });
          } else {
            roles.push({ role: roleName, name: namesPart });
          }
        });

        card3d(slide, 5.2, 1.35, 3.0, 1.0, "FFE8D8");
        slide.addShape((ppt as any).ShapeType.rect, { x: 5.2, y: 1.35, w: 3.0, h: 0.06, fill: { color: ORANGE }, line: { color: ORANGE } });
        slide.addText("副主席 · 劉家豪", { x: 5.2, y: 1.42, w: 3.0, h: 0.87, fontSize: 14, bold: true, color: TXT_D, align: "center", valign: "middle" });

        slide.addShape((ppt as any).ShapeType.line, { x: 6.7, y: 2.35, w: 0, h: 0.4, line: { color: ORANGE_M, width: 1.5 } });

        const cols = 4;
        roles.forEach((r: { role: string; name: string }, i: number) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const x = 0.4 + col * 3.15;
          const y = 2.85 + row * 1.1;
          card3d(slide, x, y, 2.9, 0.92, CARD_L);
          slide.addText(r.role, { x: x+0.1, y: y+0.06, w: 2.7, h: 0.35, fontSize: 9, color: ORANGE_M, bold: true, align: "center" });
          slide.addText(r.name, { x: x+0.1, y: y+0.44, w: 2.7, h: 0.4, fontSize: 11, color: TXT_D, align: "center", bold: true });
        });
        slide.addText("有責任、有溫度、有回報", { x: 0, y: 6.55, w: 13.33, h: 0.3, fontSize: 11, color: TXT_M, italic: true, align: "center" });
      }

      // ── Slide 12 — VP Counsel ────────────────────────────────────────────
      {
        const slide = ppt.addSlide();
        slide.addNotes(slideScripts[11] ?? "");
        setDarkBg(slide);
        addFooter(slide, true);
        for (let i = 0; i < 6; i++) {
          slide.addShape((ppt as any).ShapeType.line, { x: i*2.5, y: 0, w: 0, h: 7.5, line: { color: "FF7040", width: 0.5 } });
        }
        slide.addShape((ppt as any).ShapeType.rect, { x: 0, y: 0, w: 0.08, h: 7.0, fill: { color: WHITE }, line: { color: WHITE } });
        slide.addShape((ppt as any).ShapeType.rect, { x: 13.25, y: 0, w: 0.08, h: 7.0, fill: { color: WHITE }, line: { color: WHITE } });

        slide.addText("副主席本週指導建言", { x: 0.5, y: 0.4, w: 12.3, h: 0.45, fontSize: 14, color: WHITE, bold: true, align: "center" });

        darkCard3d(slide, 1.5, 1.1, 10.3, 2.0, "C03800");
        slide.addText("開口要溫度，出手要專業\n公開看楷模，私下看託底", {
          x: 1.6, y: 1.2, w: 10.1, h: 1.8, fontSize: 24, bold: true, color: WHITE, align: "center", valign: "middle",
        });

        slide.addText("我們的責任不是找瑕疵，而是成為夥伴背後的托底力量。\n公開表揚綠燈夥伴，私下協助紅燈夥伴，讓每一位會員都感受到商業網絡的溫度。", {
          x: 1.0, y: 3.4, w: 11.3, h: 1.5, fontSize: 13, color: "FFEEDD", align: "center", italic: true, wrap: true
        });
        slide.addText("副主席會後會語錄  ·  樂施者得 Givers Gain", {
          x: 0, y: 6.0, w: 13.33, h: 0.35, fontSize: 11, color: "FFEEDD", align: "center"
        });
      }

      // ── Slide 13 — Action Items ──────────────────────────────────────────
      {
        const slide = ppt.addSlide();
        slide.addNotes(slideScripts[12] ?? "");
        setLightBg(slide);
        addFooter(slide);
        lightHeader(slide, "下週三大核心行動方針", "NEXT WEEK — ACTION ITEMS");

        const actions = [
          { num: "1", icon: "💬", title: "121 指標推進", body: "鼓勵各組 Power Team 內循環，每人下週至少安排 1 場精確對位的 121 商業訪談。協助黃燈、紅燈夥伴快速連線。", cardBg: "FFF0E4", accent: ORANGE },
          { num: "2", icon: "🤝", title: "來賓帶入精準化", body: "結合建材營造、行銷設計等核心組別，發起產業主題日，定點精準邀約目標來賓進場配對。", cardBg: "EEF8F4", accent: SUCCESS },
          { num: "3", icon: "📈", title: "ROI 面談關懷啟動", body: "續約專員與數據專員主動排程 90 天輔導面談，用具體成交算盤輔助留續率，避免被動流失。", cardBg: "FFF8E0", accent: GOLD_H },
        ];
        actions.forEach((a, i) => {
          const y = 1.38 + i * 1.65;
          card3d(slide, 0.4, y, 12.4, 1.45, a.cardBg);
          slide.addShape((ppt as any).ShapeType.rect, { x: 0.4, y, w: 12.4, h: 0.06, fill: { color: a.accent }, line: { color: a.accent } });
          slide.addShape((ppt as any).ShapeType.roundRect, { x: 0.5, y: y+0.2, w: 0.55, h: 0.55, fill: { color: a.accent }, line: { color: a.accent }, rectRadius: 0.08 });
          slide.addText(a.num, { x: 0.5, y: y+0.2, w: 0.55, h: 0.55, fontSize: 18, bold: true, color: TXT_D, align: "center", valign: "middle" });
          slide.addText(a.icon, { x: 1.15, y: y+0.12, w: 0.5, h: 0.6, fontSize: 22, valign: "middle" });
          slide.addText(a.title, { x: 1.75, y: y+0.12, w: 4.0, h: 0.55, fontSize: 15, bold: true, color: TXT_D, valign: "middle" });
          slide.addText(a.body, { x: 1.75, y: y+0.7, w: 10.8, h: 0.65, fontSize: 10, color: TXT_M, wrap: true });
        });
        slide.addText("下週不是看誰做最多，而是看誰開始行動", { x: 0, y: 6.55, w: 13.33, h: 0.3, fontSize: 11, color: TXT_M, italic: true, align: "center" });
      }

      // ── Slide 14 — Closing ───────────────────────────────────────────────
      {
        const slide = ppt.addSlide();
        slide.addNotes(slideScripts[13] ?? "");
        setDarkBg(slide);
        addFooter(slide, true);
        for (let i = 0; i < 8; i++) {
          slide.addShape((ppt as any).ShapeType.line, { x: i*2, y: 0, w: 0, h: 7.5, line: { color: "FF7040", width: 0.5 } });
        }
        slide.addShape((ppt as any).ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.08, fill: { color: WHITE }, line: { color: WHITE } });
        slide.addShape((ppt as any).ShapeType.rect, { x: 0, y: 6.92, w: 13.33, h: 0.08, fill: { color: WHITE }, line: { color: WHITE } });

        slide.addText("「", { x: 0.8, y: 1.3, w: 1.0, h: 1.0, fontSize: 60, color: WHITE, bold: true });
        slide.addText("數字只是結果，溫度決定結果", {
          x: 1.3, y: 1.5, w: 10.8, h: 1.2, fontSize: 34, bold: true, color: WHITE, align: "center", valign: "middle"
        });
        slide.addText("」", { x: 11.5, y: 2.1, w: 1.0, h: 1.0, fontSize: 60, color: WHITE, bold: true, align: "right" });

        slide.addText("健康的分會不只是引薦引擎，\n更是一個彼此照拂、精準配對的信任網路。\n感謝每一位幹部與專員的無私付出！", {
          x: 1.5, y: 3.3, w: 10.3, h: 1.8, fontSize: 14, color: "FFEEDD", align: "center", italic: true, wrap: true
        });

        darkCard3d(slide, 3.5, 5.3, 6.3, 0.8, "C03800");
        slide.addText("Givers Gain  ｜  樂施者得  ｜  BNI 長溙分會", {
          x: 3.5, y: 5.3, w: 6.3, h: 0.8, fontSize: 13, bold: true, color: WHITE, align: "center", valign: "middle"
        });
      }

      await ppt.writeFile({ fileName: `BNI_副主席會後會_${weekTitle.replace(/[\/\|\\:\*\?"<>]/g, "_")}.pptx` });
    } catch (e) {
      console.error(e);
      alert("Powerpoint 匯出失敗，請重試！");
    } finally {
      setPptGenerating(false);
    }
  };

  // ── Export JSON ─────────────────────────────────────────────────────────────
  const getSlidesStructuredData = () => {
    const greenNames = stats.green.map(m => memberName(m)).join("、") || "無";
    const visitorActiveNames = members.filter(m => m.visitors > 0).map(m => `${memberName(m)}(${m.visitors}來賓)`).join(" 、 ") || "無";
    const absentNames = members.filter(m => m.palms === "A").map(m => memberName(m)).join("、") || "無";
    const leaveNames = members.filter(m => (m.palms === "M" || m.palms === "S")).map(m => memberName(m)).join("、") || "無";
    const followRenewalList = members.filter(m => m.renewal === "待追蹤" || m.renewal === "需要關懷").map(m => `${memberName(m)}(${m.category}) - ${m.renewal}`).join("、") || "無";

    return [
      { id: 0,  title: "第一頁：封面：會後會追蹤",              category: "Cover",                content: `主體：${weekTitle}。小標：「數據不是責備、亦非監控；數據是用來幫我們及時發掘夥伴瓶頸的溫度計。」`, notes: slideScripts[0] || "" },
      { id: 1,  title: "第二頁：本週數據總覽",                  category: "Metrics Overview",     content: `分會人數: ${stats.total}人 (目標: ${goals.memberTarget})、來賓人數: ${stats.visitors}人 (目標: ${goals.visitorTarget})、121交流: ${stats.oneToOne}次 (目標: ${goals.oneToOneTarget})、引薦成交: ${stats.referrals}張 (目標: ${goals.referralTarget})`, notes: slideScripts[1] || "" },
      { id: 2,  title: "第三頁：目標達成率 (不點名)",           category: "KPI Targets",          content: `1對1達成率: ${Math.round(stats.oneToOne / (goals.oneToOneTarget || 1) * 100)}%、引薦達成率: ${Math.round(stats.referrals / (goals.referralTarget || 1) * 100)}%、來賓達成率: ${Math.round(stats.visitors / (goals.visitorTarget || 1) * 100)}%`, notes: slideScripts[2] || "" },
      { id: 3,  title: "第四頁：達標表揚行動榜",                category: "Honor Roll",           content: `綠燈達標(121&引薦雙達標): ${greenNames}。來賓邀約模範: ${visitorActiveNames}`, notes: slideScripts[3] || "" },
      { id: 4,  title: "第五頁：紅黃綠燈健康分佈",             category: "Traffic Lights",       content: `綠燈: ${stats.green.length}人、黃燈: ${stats.yellow.length}人、紅燈: ${stats.red.length}人`, notes: slideScripts[4] || "" },
      { id: 5,  title: "第六頁：出席與請假追蹤",                category: "Attendance Tracker",   content: `分會出席率: ${stats.attendanceRate}%。請假名單: ${leaveNames}。缺席名單: ${absentNames}`, notes: slideScripts[5] || "" },
      { id: 6,  title: "第七頁：來賓到申請書轉換 funnel",       category: "Visitor Funnel",       content: `來賓總數: ${stats.visitors}人。預期申請書目標: ${goals.applicationTarget}張`, notes: slideScripts[6] || "" },
      { id: 7,  title: "第八頁：續約關懷 90 天提示",           category: "Renewal Forecast",     content: `已完成續約: ${stats.renewed}人。近期需追蹤與關懷名單: ${followRenewalList}`, notes: slideScripts[7] || "" },
      { id: 8,  title: "第九頁：會委會成員分工落實",           category: "Committee Alignment",  content: committeeText, notes: slideScripts[8] || "" },
      { id: 9,  title: "第十頁：副主席策略建言",               category: "VP Counsel",           content: `口號：「開口要溫度、出手要專業；公開看楷模、私下看託底。」`, notes: slideScripts[9] || "" },
      { id: 10, title: "第十一頁：下週三大核心行動",           category: "Strategic Actions",    content: "1. 121指標推進。\n2. 來賓帶入精準化。\n3. ROI面談關懷啟動。", notes: slideScripts[10] || "" },
      { id: 11, title: "第十二頁：結尾：溫度托底共識",         category: "Outro Motto",          content: "「數字只是結果，溫度決定結果！」攜手打造健康、有溫度且高產引薦的分會。", notes: slideScripts[11] || "" },
    ];
  };

  const exportToJson = () => {
    try {
      const exportData = {
        weekTitle, stage, goals, committeeText,
        slideDeckMeta, slideScripts,
        slides: getSlidesStructuredData(),
        membersCount: members.length,
        exportedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `BNI_簡報數據_${weekTitle.replace(/[\/\|\\:\*\?"<>]/g, "_")}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("簡報數據 JSON 導出失敗，請重試！");
    }
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        let importedScripts: string[] | null = null;
        if (Array.isArray(json.slideScripts) && json.slideScripts.length === 14) {
          importedScripts = json.slideScripts;
        } else if (Array.isArray(json.slideScripts) && json.slideScripts.length >= 12) {
          const notes = [...json.slideScripts];
          while (notes.length < 14) notes.push("");
          importedScripts = notes.slice(0, 14);
        } else if (Array.isArray(json.slides) && json.slides.length === 14) {
          importedScripts = json.slides.map((s: any) => s.notes || "");
        } else if (Array.isArray(json.slides)) {
          const notes = json.slides.map((s: any) => s.notes || "");
          while (notes.length < 14) notes.push("");
          importedScripts = notes.slice(0, 14);
        }
        if (importedScripts) {
          setSlideScripts(importedScripts);
          setSuccessMessage("成功匯入簡報數據！已成功載入您的 14 頁簡報講稿演辭與簡報備忘錄。");
          setTimeout(() => setSuccessMessage(null), 5000);
        } else {
          alert("匯入格式不正確：找不到符合條件的簡報內容或備忘錄！");
        }
      } catch (err) {
        console.error(err);
        alert("讀取 JSON 檔案失敗，格式不合法！");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4" id="slides-previewer-container">

      {/* Action row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-white border border-slate-200 rounded-xl gap-2 shadow-sm">
        <div className="flex items-center gap-2">
          <Presentation className="w-4.5 h-4.5 text-rose-800 shrink-0" />
          <div>
            <h4 className="font-bold text-slate-800 text-xs sm:text-sm">投影簡報預覽 (第 {currentSlide + 1}/14 頁)</h4>
            <p className="text-[11px] text-slate-400">商務簡約 · 大字精準 · BNI 金質簡報風格</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          <button
            onClick={exportToPowerpoint}
            disabled={pptGenerating}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg shadow-sm transition w-full sm:w-auto cursor-pointer font-sans"
          >
            <Download className="w-3.5 h-3.5" />
            {pptGenerating ? "正在生成..." : "下載 .pptx 簡報"}
          </button>

          <button
            onClick={exportToJson}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg shadow-sm transition w-full sm:w-auto cursor-pointer border border-slate-300 font-sans"
          >
            <FileJson className="w-3.5 h-3.5 text-slate-500" />
            導出 .json
          </button>

          <label className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold rounded-lg shadow-sm transition w-full sm:w-auto cursor-pointer border border-rose-200 font-sans">
            <Upload className="w-3.5 h-3.5 text-rose-700" />
            <span>導入 .json</span>
            <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
          </label>
        </div>
      </div>

      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between shadow-sm">
          <span className="font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            {successMessage}
          </span>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700 font-bold ml-2 cursor-pointer">✕</button>
        </div>
      )}

      {/* Main console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

        {/* ── Sidebar (slide list) ─────────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-1 max-h-[460px] overflow-y-auto pr-1">
          {slideDeckMeta.map((slide) => {
            const isSelected = slide.id === currentSlide;
            const dotColor = CATEGORY_COLORS[slide.category] ?? "bg-slate-400";
            return (
              <button
                key={slide.id}
                onClick={() => setCurrentSlide(slide.id)}
                className={`w-full text-left p-2.5 rounded-lg border text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                  isSelected
                    ? "bg-rose-900 border-rose-900 text-white shadow-sm"
                    : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                {/* Slide number badge */}
                <span className={`shrink-0 w-5 h-5 rounded flex items-center justify-center text-[9px] font-black ${isSelected ? "bg-rose-800 text-rose-200" : "bg-slate-100 text-slate-500"}`}>
                  {slide.id + 1}
                </span>
                {/* Category dot */}
                <span className={`shrink-0 w-2 h-2 rounded-full ${dotColor}`} />
                {/* Title */}
                <span className="truncate flex-1">{slide.title}</span>
              </button>
            );
          })}
        </div>

        {/* ── Canvas + script ─────────────────────────────────────────────── */}
        <div className="lg:col-span-9 space-y-4">

          {/* 16:9 slide canvas */}
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-[#0f172a] text-white select-none">

            {/* ── Slide 1: Cover ──────────────────────────────────────────── */}
            {currentSlide === 0 && (
              <div className="absolute inset-0 bg-gradient-to-br from-rose-950 via-[#4a0e1a] to-slate-900 flex flex-col justify-between p-[7%]">
                {/* Decorative circle */}
                <div className="absolute top-[-20%] right-[-12%] w-[55%] aspect-square rounded-full bg-rose-900/20 border border-rose-800/20" />

                {/* BNI badge row */}
                <div className="flex justify-between items-start relative z-10">
                  <div className="flex items-center gap-2.5">
                    <div className="bg-amber-500 rounded px-2 py-1 flex flex-col items-center leading-none">
                      <span className="text-rose-950 font-black text-xs">BNI</span>
                      <span className="text-rose-950 font-bold text-[9px]">長溙</span>
                    </div>
                    <span className="font-mono text-amber-400 font-bold tracking-wider text-[11px] uppercase">副主席週報</span>
                  </div>
                  <span className="px-2 py-0.5 border border-amber-400/40 text-amber-400 font-bold text-[9px] rounded-full">副主席專用</span>
                </div>

                {/* Main content */}
                <div className="space-y-3 relative z-10">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-1 bg-amber-500 text-rose-950 font-black text-[10px] rounded-lg uppercase tracking-wide">
                      {stageLabel}
                    </span>
                    <span className="px-2.5 py-1 bg-white/10 text-amber-300 font-bold text-[10px] rounded-lg border border-amber-400/30">
                      第13屆 · {todayStr}
                    </span>
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                    {weekTitle}
                  </h1>
                  <p className="text-xs sm:text-sm text-amber-200/90 font-serif leading-relaxed max-w-xl italic">
                    「 數據不是責備、亦非監控；數據是用來幫我們及時發掘夥伴瓶頸的溫度計。 」
                  </p>
                </div>

                {/* Footer */}
                <div className="relative z-10 border-t border-white/10 pt-2 text-[10px] text-white/35 flex justify-between">
                  <span>樂施者得 · Givers Gain · BNI 長溙分會 第13屆</span>
                  <span>彙整：副主席</span>
                </div>
              </div>
            )}

            {/* ── Slide 2: Metrics Overview ────────────────────────────────── */}
            {currentSlide === 1 && (
              <DarkSlide>
                <SlideHeader title="本週分會核心動能總覽" tag="METRICS OVERVIEW" tagColor="text-amber-400" />
                <div className="grid grid-cols-2 gap-3 flex-1">
                  {[
                    { label: "分會人數",  val: stats.total,     unit: "人",  target: goals.memberTarget,     tLabel: "目前目標" },
                    { label: "來賓人數",  val: stats.visitors,  unit: "人",  target: goals.visitorTarget,    tLabel: "本週目標" },
                    { label: "累積 121",  val: stats.oneToOne,  unit: "次",  target: goals.oneToOneTarget,   tLabel: "本週目標" },
                    { label: "引薦成交",  val: stats.referrals, unit: "張",  target: goals.referralTarget,   tLabel: "本週目標" },
                  ].map((m, i) => {
                    const pct = Math.min(100, percent(m.val, m.target));
                    return (
                      <div key={i} className="bg-white/8 border border-white/10 rounded-2xl p-3 flex flex-col justify-between hover:bg-white/12 transition">
                        <div>
                          <span className="text-slate-400 text-[10px] block">{m.label}</span>
                          <p className="text-3xl font-black text-amber-400 leading-tight">{m.val}<span className="text-base font-bold ml-1">{m.unit}</span></p>
                          <span className="text-[10px] text-slate-500">{m.tLabel}: {m.target} {m.unit}</span>
                        </div>
                        <div className="mt-2">
                          <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-amber-500 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[9px] text-amber-400/70 mt-0.5 block">{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 p-2 bg-amber-500/10 rounded-xl text-[10px] text-amber-300 border border-amber-400/15 shrink-0">
                  🎯 本週完成 121 共 {stats.oneToOne} 次 · 引薦 {stats.referrals} 張 · 來賓 {stats.visitors} 人
                </div>
              </DarkSlide>
            )}

            {/* ── Slide 3: KPI Targets ─────────────────────────────────────── */}
            {currentSlide === 2 && (
              <DarkSlide>
                <div className="flex justify-between items-start mb-3 pb-2 border-b border-white/10 shrink-0">
                  <h2 className="text-lg sm:text-xl font-black text-white">營運 KPI 目標達成看板</h2>
                  <span className="px-2 py-0.5 bg-rose-900/40 border border-rose-300/20 text-rose-300 font-bold text-[9px] rounded uppercase shrink-0 ml-2">
                    第一階段: 不公布姓名
                  </span>
                </div>

                <div className="space-y-4 flex-1">
                  {[
                    { label: "1 對 1 交流推進狀況（次）",     actual: stats.oneToOne,  target: goals.oneToOneTarget,  color: "from-violet-500 to-purple-600" },
                    { label: "外部+內部引薦單累積量（張）",    actual: stats.referrals,  target: goals.referralTarget,  color: "from-rose-500 to-red-600" },
                    { label: "本週邀約商務來賓（人）",        actual: stats.visitors,   target: goals.visitorTarget,   color: "from-orange-400 to-amber-500" },
                    { label: "本週出席率（%）",               actual: stats.attendanceRate, target: 100,               color: "from-emerald-500 to-green-600" },
                  ].map((b, i) => {
                    const pct = Math.min(100, percent(b.actual, b.target));
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-300">{b.label}</span>
                          <span className="text-amber-400">{b.actual} / {b.target} <span className="text-slate-400">({pct}%)</span></span>
                        </div>
                        <div className="relative h-6 bg-white/5 rounded-full overflow-hidden border border-white/5">
                          {/* 3D highlight stripe */}
                          <div className="absolute inset-x-0 top-0 h-px bg-white/20 z-10" />
                          {/* Filled portion */}
                          <div className={`h-full rounded-full bg-gradient-to-r ${b.color} transition-all relative`} style={{width:`${Math.min(100,pct)}%`}}>
                            {pct >= 20 && <span className="absolute right-2 top-0 bottom-0 flex items-center text-[10px] font-black text-white drop-shadow">{pct}%</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 p-2.5 bg-rose-950/30 rounded-xl border border-rose-400/15 shrink-0">
                  <p className="text-[10px] text-slate-400 italic">
                    ★ 戰略：第一階段只比對總盤數字，不作個人點名考核。重在激發夥伴本週自發進行引薦爆破！
                  </p>
                </div>
              </DarkSlide>
            )}

            {/* ── Slide 4: Honor Board ─────────────────────────────────────── */}
            {currentSlide === 3 && (
              <DarkSlide>
                <SlideHeader title="本週金牌夥伴榮譽行動榜" tag="HONOR ROLL" tagColor="text-emerald-400" />
                <div className="grid grid-cols-2 gap-3 flex-1">
                  <div className="bg-white/8 border border-green-500/20 rounded-2xl p-3 flex flex-col gap-2 hover:bg-white/12 transition">
                    <span className="text-green-400 text-[10px] font-black tracking-wider">🟢 121 & 引薦 雙達標模範</span>
                    <div className="text-sm font-bold leading-relaxed text-slate-200 flex-1">
                      {stats.green.map(m => memberName(m)).join("、") || "本週暫無雙達標學長"}
                    </div>
                    <p className="text-[9px] text-slate-500">大會上安排頒獎儀式，邀請分享心法。</p>
                  </div>

                  <div className="bg-white/8 border border-sky-500/20 rounded-2xl p-3 flex flex-col gap-2 hover:bg-white/12 transition">
                    <span className="text-sky-400 text-[10px] font-black tracking-wider">🟠 積極邀約來賓榜</span>
                    <div className="text-sm font-bold leading-relaxed text-slate-200 flex-1">
                      {members.filter(m => m.visitors > 0).map(m => `${memberName(m)} (${m.visitors}位)`).join(" 、 ") || "本週無來賓邀約"}
                    </div>
                    <p className="text-[9px] text-slate-500">引領來賓進入系統，注入活水！</p>
                  </div>
                </div>

                <div className="mt-2 px-3 py-2 bg-emerald-950/25 rounded-lg border border-emerald-500/10 text-[10px] text-white/50 shrink-0">
                  📢 報告建言：高調誇獎達標學長，塑造正能量，讓其他學長自發想要靠近這個榮耀。
                </div>
              </DarkSlide>
            )}

            {/* ── Slide 5: Group Rankings ──────────────────────────────────── */}
            {currentSlide === 4 && (
              <DarkSlide>
                <SlideHeader title="六組積分競賽排行榜" tag="GROUP RANKINGS" tagColor="text-amber-400" />
                <div className="flex-1 space-y-2 overflow-hidden">
                  {groupRankings.map((g, i) => {
                    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i+1}.`;
                    const barColor = i === 0 ? "from-amber-400 to-yellow-500" : i === 1 ? "from-slate-400 to-slate-300" : i === 2 ? "from-orange-700 to-orange-500" : "from-indigo-400 to-indigo-500";
                    const pct = Math.min(100, Math.round((g.avg / 100) * 100));
                    return (
                      <div key={g.name} className="flex items-center gap-2">
                        <span className="text-sm w-6 shrink-0 text-center">{medal}</span>
                        <span className="text-xs text-white font-bold w-12 shrink-0">{g.name}</span>
                        {/* Leader badge */}
                        <span className="text-[9px] text-amber-300 bg-amber-900/40 border border-amber-500/30 rounded px-1.5 py-0.5 shrink-0 font-bold">
                          組長 {g.leader}
                        </span>
                        <div className="flex-1 h-6 bg-white/5 rounded-full overflow-hidden relative">
                          <div className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all`} style={{width:`${pct}%`}}>
                            <span className="absolute right-2 top-0 bottom-0 flex items-center text-[10px] font-black text-white/90">{g.avg}分</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-green-400 shrink-0 w-14 text-right">🟢{g.green}/{g.total}達標</span>
                      </div>
                    );
                  })}
                </div>
                {/* Leader encouragement section */}
                <div className="mt-2 bg-amber-900/20 border border-amber-500/20 rounded-xl p-2.5">
                  <p className="text-[10px] text-amber-300 font-bold mb-1">🏆 本週組長辛苦了！感謝各組領袖的付出</p>
                  <div className="flex flex-wrap gap-1.5">
                    {GROUPS.map(g => (
                      <span key={g.name} className="text-[9px] bg-amber-500/20 border border-amber-400/30 text-amber-200 rounded-lg px-2 py-0.5 font-bold">
                        {g.name} {g.leaderFullName}
                      </span>
                    ))}
                  </div>
                </div>
              </DarkSlide>
            )}

            {/* ── Slide 6: Traffic Lights ──────────────────────────────────── */}
            {currentSlide === 5 && (
              <DarkSlide>
                <SlideHeader title="紅黃綠燈夥伴分佈情況" tag="TRAFFIC LIGHTS" tagColor="text-slate-400" />
                <div className="grid grid-cols-3 gap-3 flex-1">
                  {[
                    { emoji: "🟢", label: "綠燈達標", count: stats.green.length,  note: "達 121 & 引薦指標", border: "border-green-500/25", bg: "bg-green-950/20", numColor: "text-green-300" },
                    { emoji: "🟡", label: "黃燈補強", count: stats.yellow.length, note: "單項不足 · 重點推進", border: "border-amber-500/25", bg: "bg-amber-950/20",  numColor: "text-amber-300" },
                    { emoji: "🔴", label: "紅燈關懷", count: stats.red.length,   note: "急需援助 · 禁止公開", border: "border-rose-500/25",  bg: "bg-rose-950/20",   numColor: "text-rose-300"  },
                  ].map((l, i) => (
                    <div key={i} className={`${l.bg} border ${l.border} rounded-2xl p-3 text-center flex flex-col items-center justify-between hover:brightness-110 transition`}>
                      <span className="text-xl">{l.emoji}</span>
                      <div>
                        <span className={`text-[10px] font-black block mb-1 ${l.numColor}`}>{l.label}</span>
                        <p className={`text-3xl font-black text-slate-100`}>{l.count} <span className="text-sm font-bold">人</span></p>
                      </div>
                      <span className="text-[9px] text-slate-400 font-medium">{l.note}</span>
                    </div>
                  ))}
                </div>

                {/* Distribution bar */}
                {(() => {
                  const tot = (stats.green.length + stats.yellow.length + stats.red.length) || 1;
                  const gP = stats.green.length / tot;
                  const yP = stats.yellow.length / tot;
                  return (
                    <div className="mt-3 w-full h-2 rounded-full overflow-hidden flex shrink-0">
                      <div className="bg-green-500 h-full transition-all" style={{ width: `${gP * 100}%` }} />
                      <div className="bg-amber-500 h-full transition-all" style={{ width: `${yP * 100}%` }} />
                      <div className="bg-rose-600 h-full flex-1 transition-all" />
                    </div>
                  );
                })()}

                <div className="mt-2 p-2 bg-rose-950/20 rounded-xl border border-rose-400/10 text-[10px] text-rose-300/70 shrink-0">
                  ❤️ 紅燈是看見，不是指責。由輔導群私下暖心關懷，拒絕公開羞辱。
                </div>
              </DarkSlide>
            )}

            {/* ── Slide 7: PALMS Attendance Analysis ──────────────────────── */}
            {currentSlide === 6 && (
              <DarkSlide>
                <SlideHeader title="PALMS 出席 & 燈號分析" tag="ATTENDANCE ANALYSIS" tagColor="text-sky-400" />
                <div className="flex-1 grid grid-cols-2 gap-3">
                  {/* Left: PALMS distribution */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                    <p className="text-[10px] font-black text-sky-300 mb-2">PALMS 出席分佈</p>
                    {/* Donut-like bar */}
                    <div className="space-y-1.5">
                      {[
                        { label:"P 出席", count: members.filter(m=>m.palms==="P").length, color:"bg-green-500", text:"text-green-400" },
                        { label:"L 遲到", count: members.filter(m=>m.palms==="L").length, color:"bg-amber-400", text:"text-amber-400" },
                        { label:"A 缺席", count: members.filter(m=>m.palms==="A").length, color:"bg-red-500", text:"text-red-400" },
                        { label:"M 病假", count: members.filter(m=>m.palms==="M").length, color:"bg-slate-400", text:"text-slate-400" },
                        { label:"S 代理人", count: members.filter(m=>m.palms==="S").length, color:"bg-purple-500", text:"text-purple-400" },
                      ].map(p => (
                        <div key={p.label} className="flex items-center gap-2">
                          <span className={`text-[9px] w-12 shrink-0 ${p.text} font-bold`}>{p.label}</span>
                          <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${p.color}`} style={{width:`${stats.total > 0 ? (p.count/stats.total)*100 : 0}%`}} />
                          </div>
                          <span className={`text-[10px] font-black ${p.text} w-4`}>{p.count}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[9px] text-slate-500 mt-2">總人數 {stats.total} 人</p>
                  </div>
                  {/* Right: traffic light distribution */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                    <p className="text-[10px] font-black text-lime-300 mb-2">KPI 紅黃綠燈分佈</p>
                    <div className="space-y-2">
                      {[
                        { label:"🟢 綠燈達標", count: stats.green.length, color:"bg-green-500", text:"text-green-400", note:"121+引薦達標" },
                        { label:"🟡 黃燈補強", count: stats.yellow.length, color:"bg-amber-400", text:"text-amber-400", note:"單項不足" },
                        { label:"🔴 紅燈關懷", count: stats.red.length, color:"bg-red-500", text:"text-red-400", note:"需私下輔導" },
                      ].map(t => (
                        <div key={t.label} className="flex items-center gap-2">
                          <span className={`text-[9px] w-14 shrink-0 font-bold ${t.text}`}>{t.label}</span>
                          <div className="flex-1 h-4 bg-white/5 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${t.color}`} style={{width:`${stats.total > 0 ? (t.count/stats.total)*100 : 0}%`}} />
                          </div>
                          <span className={`text-[11px] font-black ${t.text} w-4`}>{t.count}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[9px] text-slate-500 mt-3 italic">{careMessage}</p>
                  </div>
                </div>
              </DarkSlide>
            )}

            {/* ── Slide 8: Attendance Tracker ──────────────────────────────── */}
            {currentSlide === 7 && (
              <DarkSlide>
                <SlideHeader title="出席狀況與請假追蹤表" tag="ATTENDANCE COMPLIANCE" tagColor="text-rose-400" />
                <div className="grid grid-cols-12 gap-3 flex-1">
                  {/* Gauge */}
                  <div className="col-span-4 bg-white/8 rounded-2xl p-3 border border-white/10 flex flex-col items-center justify-center gap-2 hover:bg-white/12 transition">
                    <span className="text-slate-400 text-[10px]">本週出席率</span>
                    <p className={`text-4xl font-extrabold leading-none ${stats.absenceRate >= goals.absenceWarningRate ? "text-rose-400" : "text-green-400"}`}>
                      {stats.attendanceRate}%
                    </p>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={stats.absenceRate >= goals.absenceWarningRate ? "bg-rose-500 h-full rounded-full" : "bg-green-400 h-full rounded-full"}
                        style={{ width: `${stats.attendanceRate}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-slate-500">警戒: ≥{100 - goals.absenceWarningRate}%</span>
                  </div>

                  {/* Info panels */}
                  <div className="col-span-8 flex flex-col gap-2.5">
                    <div className="bg-white/8 rounded-xl p-3 border border-white/10 flex justify-between items-start gap-2 hover:bg-white/12 transition flex-1">
                      <span className="text-slate-300 font-bold text-xs shrink-0">🔄 M病假 / S代理人：</span>
                      <span className="text-amber-300 font-semibold text-xs text-right">
                        {members.filter(m => m.palms === "M" || m.palms === "S").map(m => memberName(m)).join("、") || "無"}
                      </span>
                    </div>

                    <div className="bg-white/8 rounded-xl p-3 border border-white/10 flex justify-between items-start gap-2 hover:bg-white/12 transition flex-1">
                      <span className="text-slate-300 font-bold text-xs shrink-0">⚠️ 無故缺席夥伴：</span>
                      <span className="text-rose-400 font-semibold text-xs text-right">
                        {members.filter(m => m.palms === "A").map(m => memberName(m)).join("、") || "無"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-2 p-2 bg-white/5 rounded-xl border border-white/5 text-[10px] text-slate-400 italic shrink-0">
                  💡 出席專員落實「優質代理人機制」，確保行業商務線路不中斷！
                </div>
                <p className="text-[10px] text-amber-200/70 italic mt-1 border-t border-white/5 pt-1">{careMessage}</p>
              </DarkSlide>
            )}

            {/* ── Slide 9: Visitor Funnel ──────────────────────────────────── */}
            {currentSlide === 8 && (
              <DarkSlide>
                <SlideHeader title="來賓 → 申請書高質感轉換漏斗" tag="CONVERSION FUNNEL" tagColor="text-amber-400" />
                <div className="flex flex-col items-center justify-center gap-4 flex-1">
                  <div className="w-10/12 bg-indigo-950/40 border border-indigo-500/25 rounded-xl p-3 flex justify-between items-center hover:bg-indigo-950/55 transition">
                    <div>
                      <span className="text-[10px] font-bold text-indigo-300 block">階段一 ｜ 蒞臨商務來賓人數</span>
                      <span className="text-[9px] text-slate-500">本週實際到場統計</span>
                    </div>
                    <span className="text-2xl font-black text-white">{stats.visitors} <span className="text-sm font-bold">人</span></span>
                  </div>

                  <div className="flex flex-col items-center gap-0.5 text-slate-500 text-xs">
                    <span>▼</span>
                    <span className="text-[10px]">48 小時內精確回訪面談</span>
                    <span>▼</span>
                  </div>

                  <div className="w-7/12 bg-amber-950/40 border border-amber-500/25 rounded-xl p-3 flex justify-between items-center hover:bg-amber-950/55 transition">
                    <div>
                      <span className="text-[10px] font-bold text-amber-300 block">階段二 ｜ 評估提交申請書</span>
                      <span className="text-[9px] text-slate-500">本期週均目標</span>
                    </div>
                    <span className="text-2xl font-black text-amber-400">{goals.applicationTarget} <span className="text-sm font-bold">本</span></span>
                  </div>
                </div>

                <div className="mt-2 p-2 bg-white/5 rounded-xl border border-white/5 text-[10px] text-slate-400 text-center italic shrink-0">
                  💡 來賓專員戰術：精準邀約「行業核心鏈夥伴」，透過溫馨面談落實高效留存。
                </div>
              </DarkSlide>
            )}

            {/* ── Slide 10: Renewal ────────────────────────────────────────── */}
            {currentSlide === 9 && (
              <DarkSlide>
                <SlideHeader title="會員續約健康評估 90 天關懷" tag="MEMBERSHIP RETENTION" tagColor="text-rose-400" />
                <div className="flex gap-3 mb-3 shrink-0">
                  <div className="flex-1 bg-emerald-950/30 border border-emerald-500/20 rounded-xl p-2.5 text-center hover:bg-emerald-950/45 transition">
                    <span className="text-[10px] text-emerald-400 block font-bold">✅ 已完成續約</span>
                    <p className="text-2xl font-black text-slate-100">{stats.renewed} <span className="text-sm font-bold">人</span></p>
                  </div>
                  <div className="flex-1 bg-rose-950/30 border border-rose-500/20 rounded-xl p-2.5 text-center hover:bg-rose-950/45 transition">
                    <span className="text-[10px] text-rose-400 block font-bold">⚠️ 需追蹤關懷</span>
                    <p className="text-2xl font-black text-slate-100">{stats.upcomingRenewal} <span className="text-sm font-bold">人</span></p>
                  </div>
                </div>

                <div className="bg-rose-950/20 border border-rose-500/15 rounded-2xl p-3 flex-1 flex flex-col gap-1.5 overflow-hidden hover:bg-rose-950/30 transition">
                  <span className="text-[10px] font-black text-rose-300 tracking-wider shrink-0">🚨 近期重點關懷 / 待追蹤學長</span>
                  <div className="text-xs font-semibold leading-relaxed text-slate-200 overflow-hidden">
                    {members.filter(m => m.renewal === "待追蹤" || m.renewal === "需要關懷")
                      .map(m => `${memberName(m)} (${m.category} | ${m.renewal})`).join(" 、 ") || "本週無人需要特別關懷，非常健康！"}
                  </div>
                </div>

                <div className="mt-2 p-2 bg-white/5 rounded-xl border border-white/5 text-[10px] text-slate-400 italic shrink-0">
                  💡 提早 90 天偕同 Power Team 開啟商業 ROI 精估面談，輔助長久留存。
                </div>
              </DarkSlide>
            )}

            {/* ── Slide 11: Committee ──────────────────────────────────────── */}
            {currentSlide === 10 && (
              <DarkSlide>
                <SlideHeader title="會委會幹部責任崗位落實" tag="STAFF ALIGNMENT" tagColor="text-slate-400" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 flex-1 overflow-y-auto">
                  {parsedCommittee.map((line, i) => {
                    const parts = line.split("：");
                    return (
                      <div key={i} className="bg-white/8 border border-white/10 rounded-xl p-2.5 hover:bg-white/12 transition">
                        <span className="text-[9px] text-amber-400 font-black block mb-1">{parts[0] || "幹部崗位"}</span>
                        <p className="text-xs font-bold text-slate-200">{parts[1] || "未指定"}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 text-[10px] text-slate-500 shrink-0">
                  💡 有責任、有溫度、有回報！副主席統領各專員分工帶領戰術。
                </div>
              </DarkSlide>
            )}

            {/* ── Slide 12: VP Strategy ────────────────────────────────────── */}
            {currentSlide === 11 && (
              <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-rose-950 flex flex-col p-[7%]">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 to-rose-600" />
                <h2 className="text-base sm:text-lg font-bold tracking-widest text-amber-400 font-serif mb-4 shrink-0">
                  副主席本週指導建言
                </h2>
                <div className="flex-1 flex flex-col justify-center gap-4">
                  <h3 className="text-xl sm:text-2xl font-black leading-snug text-white font-serif">
                    「 開口要溫度、出手要專業；公開看楷模、私下看託底！ 」
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed">
                    各位會委員夥伴，我們的責任不是找瑕疵，而是成為夥伴背後的托底力量。
                    大會中我們公開、高調褒揚綠燈夥伴；私底下，由專員暖心約 121 紅燈學長，
                    給予其產業配對的援助，讓大家在這個分會真正感受到商業的溫潤與豐收。
                  </p>
                </div>
                {/* Footer */}
                <div className="absolute bottom-0 left-0 right-0 bg-white/5 border-t border-white/5 text-[9px] text-white/30 px-[6%] py-1.5 flex justify-between">
                  <span>{weekTitle}</span>
                  <span>BNI 長溙分會 第13屆</span>
                  <span>{todayStr}</span>
                </div>
              </div>
            )}

            {/* ── Slide 13: Action Items ───────────────────────────────────── */}
            {currentSlide === 12 && (
              <DarkSlide>
                <div className="flex justify-between items-start mb-3 pb-2 border-b border-white/10 shrink-0">
                  <h2 className="text-lg sm:text-xl font-black text-white">下週三大核心戰略行動方針</h2>
                  <span className="text-[10px] text-amber-400 font-mono shrink-0 ml-2">ACTION ITEMS</span>
                </div>

                <div className="space-y-3 flex-1">
                  {[
                    {
                      n: "1",
                      title: "121 指標推進",
                      desc: "核心組別發起 1 對 1 配對專攻，協助黃/紅燈學長對接產業鏈，每人下週至少 1 場精確對位的 121 商業訪談。",
                    },
                    {
                      n: "2",
                      title: "來賓邀約精準度提升",
                      desc: "結合建材/行銷等核心組別發起「產業主題日」，大會後 48 小時內溫馨高質感回訪，引導來賓看見商業紅利。",
                    },
                    {
                      n: "3",
                      title: "ROI 面談關懷啟動",
                      desc: "提早 90 天，續約與數據專員近期主動排程「90天輔導面談」，以具體成交算盤輔佐長久留存。",
                    },
                  ].map((a) => (
                    <div key={a.n} className="p-3 bg-white/8 border border-white/10 rounded-xl flex items-start gap-3 hover:bg-white/12 transition">
                      <span className="shrink-0 w-6 h-6 bg-rose-900 text-amber-400 font-black rounded flex items-center justify-center text-xs">{a.n}</span>
                      <div>
                        <span className="font-bold text-slate-100 text-xs block mb-0.5">{a.title}</span>
                        <p className="text-[10px] text-slate-400 leading-relaxed">{a.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <span className="text-[10px] text-slate-500 italic shrink-0 mt-1 block">
                  ★ 攜手把控執行細節，下週大會看成果！
                </span>
              </DarkSlide>
            )}

            {/* ── Slide 14: Closing ────────────────────────────────────────── */}
            {currentSlide === 13 && (
              <div className="absolute inset-0 bg-gradient-to-br from-rose-950 via-[#4a0e1a] to-slate-900 flex flex-col justify-between items-center p-[8%] text-center">
                {/* Decorative circle */}
                <div className="absolute bottom-[-15%] left-[-8%] w-[45%] aspect-square rounded-full bg-rose-900/15 border border-rose-800/15" />

                <span className="text-amber-400 font-bold uppercase tracking-widest text-[10px] relative z-10">
                  ★ BNI 會後會精神
                </span>

                <div className="space-y-3.5 my-auto relative z-10">
                  <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight text-white font-serif">
                    「 數字只是結果，溫度決定結果！」
                  </h2>
                  <p className="text-[11px] sm:text-xs text-amber-200/80 max-w-lg mx-auto leading-relaxed">
                    健康的分會不只是引薦引擎，更是一個彼此照拂、精緻契合的信任網路。
                    感謝每一位幹部與專員的無私付出，用愛托底、用數據推進商業成功！
                  </p>
                </div>

                <div className="text-[10px] text-white/35 relative z-10">
                  副主席會後會結語 ── 感謝大家的付出，散會！ ｜ Givers Gain 樂施者得
                </div>
              </div>
            )}

            {/* ── Navigation: prev/next buttons ───────────────────────────── */}
            <div className="absolute bottom-5 right-5 flex gap-2 select-none z-20">
              <button
                onClick={handlePrev}
                disabled={currentSlide === 0}
                className="w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700/80 disabled:opacity-30 border border-white/15 flex items-center justify-center transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-white" />
              </button>
              <button
                onClick={handleNext}
                disabled={currentSlide === 13}
                className="w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700/80 disabled:opacity-30 border border-white/15 flex items-center justify-center transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* ── Progress dots (bottom center) ────────────────────────────── */}
            <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-1.5 select-none z-20 pointer-events-none px-14">
              {Array.from({ length: 14 }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`rounded-full transition-all pointer-events-auto cursor-pointer ${
                    i === currentSlide
                      ? "w-4 h-3 bg-amber-400"
                      : "w-2 h-2 bg-white/20 hover:bg-white/40 mt-0.5"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Script editor */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-rose-700 shrink-0" />
                <div>
                  <h4 className="font-bold text-slate-800 text-[11px] sm:text-xs">【 副主席口述講稿 & 簡報備忘錄 】</h4>
                  <p className="text-[10px] text-slate-400">大會發言逐字對稿（可編輯，直接寫入 .pptx 備忘錄）</p>
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
              className="w-full h-24 p-2.5 border border-slate-200 rounded-lg text-xs leading-relaxed text-slate-700 outline-none bg-slate-50/50 focus:bg-white focus:border-rose-700 transition font-sans resize-none"
              placeholder="請輸入此張投影片的簡報口述講稿..."
            />
          </div>

        </div>
      </div>
    </div>
  );
}
