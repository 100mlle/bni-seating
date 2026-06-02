import React, { useState } from "react";
import {
  Member, ChapterGoals, AccumulatedStats,
  memberName, memberScoreAccurate, memberLightAccurate,
  asWarningLevel, findAcc, scoreActions, memberScore, LightColor,
} from "../types";
import { AlertTriangle, Copy, CheckCircle, ShieldAlert, Database, Mail } from "lucide-react";

interface AlertPanelProps {
  members: Member[];
  goals: ChapterGoals;
  weekTitle: string;
  accStats: AccumulatedStats[];
}

const AS_WARN_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  safe:     { label: "安全",   color: "text-green-700",  bg: "bg-green-50 border-green-200" },
  caution:  { label: "注意⚠️", color: "text-amber-700",  bg: "bg-amber-50 border-amber-200" },
  warning:  { label: "警告🚨", color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
  critical: { label: "超標❌", color: "text-red-700",    bg: "bg-red-50 border-red-200" },
};

// 各別取最嚴的一項（用於排序）
function asWorst(acc: AccumulatedStats): number {
  return Math.max(acc.absenceRuleCount ?? 0, acc.substituteRuleCount ?? 0);
}

function scoreBreakdown(m: Member, acc?: AccumulatedStats): string {
  const hasAcc = acc && acc.weeksRecorded >= 1;
  const lines = [];

  if (hasAcc) {
    const scale = Math.min(1, acc!.weeksRecorded / 25);
    const att = acc!.absenceCount === 0 ? 20 : acc!.absenceCount === 1 ? 15 : acc!.absenceCount === 2 ? 10 : 0;
    const ceuT = [2, 4, 6].map(t => Math.max(1, Math.round(t * scale)));
    const ceu = acc!.totalCeu < ceuT[0] ? 0 : acc!.totalCeu < ceuT[1] ? 5 : acc!.totalCeu < ceuT[2] ? 10 : 15;
    const vis = acc!.avgVisitorsPerMonth < 1 ? 0 : acc!.avgVisitorsPerMonth < 2 ? 10 : 15;
    const oto = acc!.avg121PerWeek < 1 ? 0 : acc!.avg121PerWeek < 2 ? 10 : 15;
    const ref = acc!.avgRefPerWeek;
    const refPts = ref < 0.75 ? 0 : ref < 1 ? 5 : ref < 1.2 ? 10 : ref < 1.5 ? 15 : 20;
    const tvT = [400_000, 800_000, 2_000_000].map(t => Math.round(t * scale));
    const tv = acc!.totalTransactionValue;
    const tvPts = tv < tvT[0] ? 0 : tv < tvT[1] ? 5 : tv < tvT[2] ? 10 : 15;
    lines.push(`出席${att}/20 培訓${ceu}/15 來賓${vis}/15 121=${oto}/15 引薦${refPts}/20 金額${tvPts}/15`);
    lines.push(`（累積${acc!.weeksRecorded}/25週｜缺席${acc!.absenceRuleCount ?? 0}次 代理人${acc!.substituteRuleCount ?? 0}次｜CEU=${acc!.totalCeu}）`);
  } else {
    const actions = scoreActions(m);
    const lost = actions.filter(a => !a.done).map(a => `${a.label}(差${a.max - a.pts}分)`).join("、");
    lines.push(`週估分 ${memberScore(m)} 分｜未達標：${lost || "無"}`);
    lines.push("（首週無累積資料，顯示本週估算）");
  }
  return lines.join("\n");
}

function generateLeadershipAlert(
  blackMembers: { m: Member; acc?: AccumulatedStats; score: number }[],
  asWarnMembers: { m: Member; acc: AccumulatedStats; warn: string }[],
  weekTitle: string
): string {
  const blackSection = blackMembers.length === 0
    ? "  本週無黑燈夥伴 ✅"
    : blackMembers.map(({ m, acc, score }) => {
        const hasAcc = acc && acc.weeksRecorded >= 1;
        return `  • ${memberName(m)}（${score}分）${hasAcc
          ? `累積${acc!.weeksRecorded}週｜缺席${acc!.absenceRuleCount ?? 0}次 代理人${acc!.substituteRuleCount ?? 0}次 CEU=${acc!.totalCeu} 引薦均${acc!.avgRefPerWeek.toFixed(1)}/週`
          : "（無累積資料）"}`;
      }).join("\n");

  const asSection = asWarnMembers.length === 0
    ? "  本週無警告夥伴 ✅"
    : asWarnMembers.map(({ m, acc, warn }) => {
        const aCount = acc.absenceRuleCount ?? 0;
        const sCount = acc.substituteRuleCount ?? 0;
        return `  • ${memberName(m)}｜缺席 ${aCount}/3 次｜代理人 ${sCount}/3 次｜狀態：${AS_WARN_LABEL[warn]?.label}`;
      }).join("\n");

  const urgentActions = [
    ...blackMembers.map(({ m }) => `  🆘 ${memberName(m)}：今天私訊關懷，安排 1-on-1 了解困難`),
    ...asWarnMembers.filter(x => x.warn === "warning" || x.warn === "critical")
      .map(({ m, acc }) => {
        const aCount = acc.absenceRuleCount ?? 0;
        const sCount = acc.substituteRuleCount ?? 0;
        const detail = [aCount >= 2 && `缺席 ${aCount} 次`, sCount >= 2 && `代理人 ${sCount} 次`].filter(Boolean).join("、");
        return `  ⚠️ ${memberName(m)}：${detail}，需立即輔導`;
      }),
  ].join("\n") || "  無緊急行動";

  return `🚨【BNI 長溙 · 主席緊急警示報告】
${weekTitle}

── 主席黃芯慧、副主席劉家豪 收 ──

⚫ 黑燈夥伴（積分 ≤ 29 分）共 ${blackMembers.length} 位：
${blackSection}

⚠️ 出席警告（6個月內 缺席/代理人 各別上限 3 次）共 ${asWarnMembers.length} 位：
${asSection}

📌 本週緊急行動清單：
${urgentActions}

❗ 提醒：
  • 黑燈夥伴需在本週例會前完成私下關懷
  • 缺席（A）達 3 次 = 已觸警告上限，請啟動輔導流程
  • 代理人（S）達 3 次 = 同樣觸警告上限，請啟動輔導流程
  • 缺席或代理人達 4 次以上 = 已超標，需向台灣區回報

Givers Gain，我們一起守護每一位夥伴！🙏
── BNI 長溙分會 第十三屆 會員委員會`;
}

type WarningLetterLevel = "A" | "B" | "C";

interface WarningLetterMember {
  m: Member;
  acc: AccumulatedStats;
  level: WarningLetterLevel;
  absenceCount: number;
}

function generateWarningLetter(name: string, level: WarningLetterLevel, absenceCount: number): string {
  if (level === "A") {
    return `主旨：【BNI 長溙】6個月出席關懷通知 — ${name} 夥伴

${name} 夥伴，您好：

感謝您長期對 BNI 長溙分會的支持與投入。
依照 BNI 台灣的出席規範，我們注意到您在過去 6 個月內已有 2 次缺席紀錄（A）。

BNI 規定：6 個月內缺席（A）及代理人（S）合計不得超過 3 次。
目前您距離警告門檻還有 1 次，希望您能在接下來的例會盡量出席。

如有任何不便或困難，歡迎私下聯繫副主席劉家豪，我們很樂意提供協助。

Givers Gain！🌟
BNI 長溙分會 第十三屆 會員委員會`;
  }
  if (level === "B") {
    return `主旨：【BNI 長溙】6個月出席正式警告通知 — ${name} 夥伴

${name} 夥伴，您好：

這封信是依 BNI 台灣正式規定發出的出席警告通知。
您在過去 6 個月內已有 3 次缺席紀錄（A），已達 BNI 規定上限。

⚠️ 依 BNI 台灣規定，6 個月內缺席（A）及代理人（S）合計超過 3 次，將面臨強制退會警告。

為了保護您的會籍，請務必：
1. 接下來每次例會全勤出席
2. 若有特殊情況，請事先安排代理人（但請注意 S 也計入合計）
3. 本週請主動聯繫副主席進行 1-on-1 確認出席計畫

我們非常珍惜您在分會的商業貢獻，希望能一起找到解決方案。

Givers Gain！🌟
BNI 長溙分會 第十三屆 會員委員會`;
  }
  // level === "C"
  return `主旨：【BNI 長溙】6個月出席超標 — 需進行訪談 — ${name} 夥伴

${name} 夥伴，您好：

依 BNI 台灣正式規定，您在過去 6 個月內的缺席紀錄（A）已達 ${absenceCount} 次，超過規定上限（3次）。

🔴 依規定，會員委員會須啟動以下程序：
1. 安排正式訪談：瞭解您缺席的原因及未來出席計畫
2. 提交分會投票：由全體會員決定是否繼續保留會籍
3. 考慮開放產業別：如會籍無法保留，分會將重新開放該產業別名額

我們非常希望在投票前，能先透過訪談找到雙方都能接受的解決方案。
請在收到此信後 3 個工作天內，與副主席劉家豪約定訪談時間。

Givers Gain！
BNI 長溙分會 第十三屆 會員委員會`;
}

export default function AlertPanel({ members, goals, weekTitle, accStats }: AlertPanelProps) {
  const [copiedAlert, setCopiedAlert] = useState(false);
  const [copiedLetters, setCopiedLetters] = useState<Record<number, boolean>>({});
  const [copiedAllLetters, setCopiedAllLetters] = useState(false);

  const dataWeeks = accStats.length > 0 ? Math.max(...accStats.map(s => s.weeksRecorded)) : 0;
  const isAccurate = dataWeeks >= 4;

  const memberData = members.map(m => {
    const acc = findAcc(m, accStats);
    const score = memberScoreAccurate(m, acc);
    const light = memberLightAccurate(m, acc);
    const asWarn = asWarningLevel(acc);
    return { m, acc, score, light, asWarn };
  });

  const blackMembers = memberData.filter(d => d.light === "black");
  const redMembers = memberData.filter(d => d.light === "red");
  const asWarnMembers = memberData
    .filter(d => d.asWarn !== "safe" && d.acc)
    .map(d => ({ m: d.m, acc: d.acc!, warn: d.asWarn }))
    .sort((a, b) => asWorst(b.acc) - asWorst(a.acc));

  const alertMsg = generateLeadershipAlert(
    blackMembers.map(d => ({ m: d.m, acc: d.acc, score: d.score })),
    asWarnMembers,
    weekTitle
  );

  const copyAlert = () => {
    navigator.clipboard.writeText(alertMsg).then(() => {
      setCopiedAlert(true);
      setTimeout(() => setCopiedAlert(false), 2500);
    });
  };

  // 缺席警告信件：只看 absenceRuleCount（A 缺席），>= 2 次才顯示
  const warningLetterMembers: WarningLetterMember[] = memberData
    .filter(d => d.acc && (d.acc.absenceRuleCount ?? 0) >= 2)
    .map(d => {
      const aCount = d.acc!.absenceRuleCount ?? 0;
      const level: WarningLetterLevel = aCount >= 4 ? "C" : aCount === 3 ? "B" : "A";
      return { m: d.m, acc: d.acc!, level, absenceCount: aCount };
    })
    .sort((a, b) => b.absenceCount - a.absenceCount);

  const copyLetter = (id: number, letter: string) => {
    navigator.clipboard.writeText(letter).then(() => {
      setCopiedLetters(prev => ({ ...prev, [id]: true }));
      setTimeout(() => setCopiedLetters(prev => ({ ...prev, [id]: false })), 2500);
    });
  };

  const copyAllLetters = () => {
    const all = warningLetterMembers
      .map(({ m, level, absenceCount }) => generateWarningLetter(memberName(m), level, absenceCount))
      .join("\n\n" + "─".repeat(60) + "\n\n");
    navigator.clipboard.writeText(all).then(() => {
      setCopiedAllLetters(true);
      setTimeout(() => setCopiedAllLetters(false), 2500);
    });
  };

  const levelConfig: Record<WarningLetterLevel, { label: string; bg: string; border: string; badge: string; badgeText: string }> = {
    A: { label: "A 信（第一次警告）", bg: "bg-amber-50", border: "border-amber-300", badge: "bg-amber-100 text-amber-800", badgeText: "缺席 2 次" },
    B: { label: "B 信（第二次警告）", bg: "bg-orange-50", border: "border-orange-400", badge: "bg-orange-100 text-orange-800", badgeText: "缺席 3 次" },
    C: { label: "C 信（情節嚴重）",   bg: "bg-red-50",    border: "border-red-500",    badge: "bg-red-100 text-red-800",    badgeText: "缺席 4+ 次" },
  };

  const lightConfig: Record<LightColor, { emoji: string; label: string; border: string; bg: string }> = {
    green:  { emoji: "🟢", label: "綠燈達標", border: "border-l-green-500",  bg: "bg-green-50" },
    yellow: { emoji: "🟡", label: "黃燈",     border: "border-l-amber-500",  bg: "bg-amber-50" },
    red:    { emoji: "🔴", label: "紅燈",     border: "border-l-red-500",    bg: "bg-red-50" },
    black:  { emoji: "⚫", label: "黑燈緊急", border: "border-l-gray-700",   bg: "bg-gray-100" },
  };

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 via-red-950 to-slate-900 rounded-xl p-5 text-white">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-red-300" />
          </div>
          <div>
            <h3 className="text-lg font-black">緊急警示中心</h3>
            <p className="text-red-200 text-xs">黑燈關懷 · 缺席/代理人分別追蹤 · 6個月精確積分 · 主席緊急報告</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className={`px-3 py-1 rounded-full ${blackMembers.length > 0 ? "bg-gray-600" : "bg-white/10"}`}>
            ⚫ 黑燈 {blackMembers.length} 位
          </span>
          <span className={`px-3 py-1 rounded-full ${redMembers.length > 0 ? "bg-red-600/60" : "bg-white/10"}`}>
            🔴 紅燈 {redMembers.length} 位
          </span>
          <span className={`px-3 py-1 rounded-full ${asWarnMembers.length > 0 ? "bg-orange-600/60" : "bg-white/10"}`}>
            ⚠️ 出席警告 {asWarnMembers.length} 位
          </span>
        </div>
      </div>

      {/* 資料品質指示器 */}
      <div className={`rounded-xl border p-3 flex items-center gap-3 ${isAccurate ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
        <Database className={`w-4 h-4 shrink-0 ${isAccurate ? "text-emerald-600" : "text-amber-600"}`} />
        <div className="text-xs">
          {isAccurate
            ? <><strong className="text-emerald-800">✅ 使用 {dataWeeks} 週歷史資料計算精確6個月積分</strong><span className="text-emerald-700"> — 出席、培訓、引薦金額均為累積值</span></>
            : <><strong className="text-amber-800">⚠️ 歷史資料不足（{dataWeeks} 週）</strong><span className="text-amber-700"> — 目前顯示週次近似值。每週儲存資料後，4週起自動切換為6個月精確計算</span></>
          }
        </div>
      </div>

      {/* 一鍵產生主席緊急報告 */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-bold text-slate-800 text-sm">📋 主席緊急警示報告</p>
            <p className="text-xs text-slate-500">包含所有黑燈夥伴 + 出席警告名單 + 本週行動清單，傳給主席和副主席</p>
          </div>
          <button onClick={copyAlert}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
              copiedAlert ? "bg-green-100 text-green-700 border border-green-300" : "bg-red-700 hover:bg-red-800 text-white"
            }`}>
            {copiedAlert ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copiedAlert ? "已複製！" : "複製緊急報告"}
          </button>
        </div>
        <pre className="mt-3 whitespace-pre-wrap text-xs text-slate-600 bg-slate-50 p-3 rounded-lg font-sans leading-relaxed max-h-48 overflow-y-auto">
          {alertMsg}
        </pre>
      </div>

      {/* ⚫ 黑燈夥伴詳細 */}
      <section>
        <h4 className="text-sm font-black text-slate-800 mb-2 flex items-center gap-2">
          <span className="text-base">⚫</span> 黑燈夥伴（積分 ≤ 29 分）
          {blackMembers.length === 0 && <span className="text-green-600 font-normal text-xs">本週無黑燈 ✅</span>}
        </h4>
        {blackMembers.length > 0 && (
          <div className="space-y-2">
            {blackMembers.map(({ m, acc, score }) => (
              <div key={m.id} className="bg-white border border-gray-300 border-l-4 border-l-gray-700 rounded-xl p-3 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">⚫ {memberName(m)} <span className="text-gray-500 font-normal">— {score}分</span></p>
                    <p className="text-xs text-slate-500">{m.category} ／ {m.role}</p>
                    <pre className="text-xs text-gray-600 mt-1 font-sans whitespace-pre-wrap">{scoreBreakdown(m, acc)}</pre>
                  </div>
                </div>
                <div className="mt-2 bg-gray-50 rounded-lg p-2 text-xs text-gray-700">
                  <strong>建議行動：</strong>今天私訊關懷，了解困難原因，安排本週 1-on-1 找解決方案。
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 🔴 紅燈夥伴 */}
      <section>
        <h4 className="text-sm font-black text-slate-800 mb-2 flex items-center gap-2">
          <span className="text-base">🔴</span> 紅燈夥伴（30-49分）
          {redMembers.length === 0 && <span className="text-green-600 font-normal text-xs">本週無紅燈 ✅</span>}
        </h4>
        {redMembers.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {redMembers.map(({ m, acc, score }) => (
              <div key={m.id} className="bg-white border border-red-200 border-l-4 border-l-red-500 rounded-xl p-3">
                <p className="font-bold text-sm text-slate-800">🔴 {memberName(m)} <span className="text-slate-400 font-normal">{score}分</span></p>
                <p className="text-xs text-slate-500">{m.category}</p>
                <pre className="text-xs text-slate-600 mt-1 font-sans whitespace-pre-wrap">{scoreBreakdown(m, acc)}</pre>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ⚠️ 出席追蹤（缺席 / 代理人分開） */}
      <section>
        <h4 className="text-sm font-black text-slate-800 mb-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          六個月出席追蹤（缺席 / 代理人 各別上限 3 次）
          {asWarnMembers.length === 0 && <span className="text-green-600 font-normal text-xs">全員安全 ✅</span>}
        </h4>
        {!isAccurate && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-700 mb-2">
            ⚠️ 歷史週次不足，追蹤需要至少 4 週資料才能啟動。
          </div>
        )}
        {asWarnMembers.length > 0 && (
          <div className="space-y-2">
            {asWarnMembers.map(({ m, acc, warn }) => {
              const cfg = AS_WARN_LABEL[warn];
              const aCount = acc.absenceRuleCount ?? 0;
              const sCount = acc.substituteRuleCount ?? 0;
              const aRemain = Math.max(0, 3 - aCount);
              const sRemain = Math.max(0, 3 - sCount);
              return (
                <div key={m.id} className={`border rounded-xl p-3 ${cfg.bg}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-bold text-sm text-slate-800">{memberName(m)}
                        <span className={`ml-2 text-xs font-black ${cfg.color}`}>{cfg.label}</span>
                      </p>
                      <p className="text-xs text-slate-500">{m.category} ／ 統計 {acc.weeksRecorded} 週</p>
                    </div>
                  </div>
                  {/* 缺席進度條 */}
                  <div className="space-y-1.5">
                    <div>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-red-700 font-bold">🚫 缺席（A）</span>
                        <span className={`font-black ${aCount >= 3 ? "text-red-600" : aCount >= 2 ? "text-orange-600" : "text-slate-500"}`}>
                          {aCount} / 3 次　{aRemain > 0 ? `還剩 ${aRemain} 次` : "⚠️ 已達上限"}
                        </span>
                      </div>
                      <div className="h-2 bg-white/70 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${aCount >= 4 ? "bg-red-600" : aCount === 3 ? "bg-orange-500" : "bg-amber-400"}`}
                          style={{ width: `${Math.min(aCount / 3, 1) * 100}%` }} />
                      </div>
                    </div>
                    {/* 代理人進度條 */}
                    <div>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-purple-700 font-bold">🔄 代理人（S）</span>
                        <span className={`font-black ${sCount >= 3 ? "text-red-600" : sCount >= 2 ? "text-orange-600" : "text-slate-500"}`}>
                          {sCount} / 3 次　{sRemain > 0 ? `還剩 ${sRemain} 次` : "⚠️ 已達上限"}
                        </span>
                      </div>
                      <div className="h-2 bg-white/70 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${sCount >= 4 ? "bg-red-600" : sCount === 3 ? "bg-orange-500" : "bg-purple-400"}`}
                          style={{ width: `${Math.min(sCount / 3, 1) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                  {(warn === "critical" || warn === "warning") && (
                    <p className="text-xs mt-1.5 font-semibold text-red-700">
                      {warn === "critical" ? "❌ 已超標，需向台灣區回報" : "🚨 已達上限，請立即安排輔導"}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 📧 缺席警告信件 */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
            <Mail className="w-4 h-4 text-red-500" />
            缺席警告信件（依缺席次數 A 自動分級）
            {warningLetterMembers.length === 0 && <span className="text-green-600 font-normal text-xs">無需發送警告 ✅</span>}
          </h4>
          {warningLetterMembers.length > 0 && (
            <button
              onClick={copyAllLetters}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                copiedAllLetters ? "bg-green-100 text-green-700 border border-green-300" : "bg-slate-700 hover:bg-slate-800 text-white"
              }`}
            >
              {copiedAllLetters ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedAllLetters ? "已複製全部！" : "一鍵複製全部"}
            </button>
          )}
        </div>
        {warningLetterMembers.length > 0 && (
          <div className="space-y-3">
            {warningLetterMembers.map(({ m, level, absenceCount }) => {
              const cfg = levelConfig[level];
              const letter = generateWarningLetter(memberName(m), level, absenceCount);
              const isCopied = copiedLetters[m.id] ?? false;
              return (
                <div key={m.id} className={`border-l-4 rounded-xl p-4 ${cfg.bg} ${cfg.border}`}>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-800 text-sm">{memberName(m)}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${cfg.badge}`}>{cfg.badgeText}</span>
                      <span className="text-xs text-slate-500">{cfg.label}</span>
                      <span className="text-xs text-slate-400">{m.category}</span>
                    </div>
                    <button
                      onClick={() => copyLetter(m.id, letter)}
                      className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                        isCopied ? "bg-green-100 text-green-700 border border-green-300" : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-300"
                      }`}
                    >
                      {isCopied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {isCopied ? "已複製" : "複製信件"}
                    </button>
                  </div>
                  <pre className="text-xs text-slate-600 bg-white/70 rounded-lg p-3 whitespace-pre-wrap font-sans leading-relaxed max-h-48 overflow-y-auto">
                    {letter}
                  </pre>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 全員6個月積分總覽 */}
      <section>
        <h4 className="text-sm font-black text-slate-800 mb-2">📊 全員6個月精確積分總覽</h4>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3 py-2 text-left">姓名</th>
                <th className="px-3 py-2 text-center">精確積分</th>
                <th className="px-3 py-2 text-center">燈號</th>
                <th className="px-3 py-2 text-center">缺席</th>
                <th className="px-3 py-2 text-center">代理人</th>
                <th className="px-3 py-2 text-center">CEU累計</th>
                <th className="px-3 py-2 text-center">引薦/週均</th>
                <th className="px-3 py-2 text-center">週次</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {memberData
                .sort((a, b) => a.score - b.score)
                .map(({ m, acc, score, light, asWarn }) => {
                  const lc = lightConfig[light];
                  const warnCfg = AS_WARN_LABEL[asWarn];
                  const aCount = acc?.absenceRuleCount ?? 0;
                  const sCount = acc?.substituteRuleCount ?? 0;
                  const total = aCount + sCount;
                  return (
                    <tr key={m.id} className={`${lc.bg} hover:opacity-90`}>
                      <td className="px-3 py-2 font-semibold">{memberName(m)}</td>
                      <td className="px-3 py-2 text-center font-black">{score}</td>
                      <td className="px-3 py-2 text-center">{lc.emoji} {lc.label}</td>
                      <td className="px-3 py-2 text-center text-red-600 font-medium">{acc ? aCount : "—"}</td>
                      <td className="px-3 py-2 text-center text-purple-600 font-medium">{acc ? sCount : "—"}</td>
                      <td className="px-3 py-2 text-center">{acc ? acc.totalCeu : "—"}</td>
                      <td className="px-3 py-2 text-center">{acc ? acc.avgRefPerWeek.toFixed(1) : "—"}</td>
                      <td className="px-3 py-2 text-center text-slate-400">{acc ? acc.weeksRecorded : 0}w</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
