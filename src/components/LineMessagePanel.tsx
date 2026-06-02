import React, { useState } from "react";
import {
  Member, ChapterGoals, PALMS_LABEL,
  memberLightAccurate, memberName, totalReferralsGiven,
  memberScoreAccurate, scoreActions, AccumulatedStats, findAcc,
  effectiveAbsenceRuleCount,
} from "../types";
import { GROUPS, Group } from "../data";
import { MessageCircle, Copy, CheckCircle, ChevronDown, ChevronUp, Bell, Users, Megaphone, Crown, BarChart2 } from "lucide-react";

interface LineMessagePanelProps {
  members: Member[];
  goals: ChapterGoals;
  weekTitle: string;
  accStats: AccumulatedStats[];
}

// ── 鼓勵語輪播（依 id 取餘數，訊息每週穩定但每人不同）──────────
const FUN_TIPS = [
  "💡 小訣竅：一次 121 只要一杯咖啡時間，卻能打開意想不到的商機大門！本週約起來！",
  "😄 BNI 冷知識：每給出 1 張引薦，平均可以收回 1.7 張！先付出，收穫自然來！",
  "🏆 本週小挑戰：試試看帶一位好朋友來例會當來賓，讓他感受長溙的商業能量！",
  "🌱 成長小語：「每週進步 1%，一年後你就強大了 52%！」小行動，大影響！",
  "☕ 溫馨提醒：下次例會前，先傳個短訊給你想引薦的夥伴打個招呼，他們會記住你的！",
  "💪 加油語：困難只是還沒找到方法，有任何商業困擾歡迎找副主席一起腦力激盪！",
  "🚀 引薦是 BNI 最美的語言：它說的是「我信任你，我把朋友交給你！」",
];

function tip(m: Member): string {
  return FUN_TIPS[m.id % FUN_TIPS.length];
}

// ── 積分說明（官方標準）────────────────────────────────────────────
function scoreLabel(score: number): string {
  if (score >= 80) return "⭐ 優秀達標";
  if (score >= 70) return "✅ 綠燈達標";
  if (score >= 50) return "🟡 黃燈";
  if (score >= 30) return "🔴 紅燈";
  return "⚫ 黑燈";
}

function gapAdvice(m: Member, acc: AccumulatedStats | undefined, target: number): string {
  const current = memberScoreAccurate(m, acc);
  if (current >= target) return "";
  const need = target - current;
  const actions = scoreActions(m).filter(a => !a.done).sort((a, b) => (b.max - b.pts) - (a.max - a.pts));
  const suggestions = actions.slice(0, 2).map(a => `${a.label}（可加 ${a.max - a.pts} 分）`).join("、");
  return `距 ${target} 分還差 ${need} 分，做到：${suggestions}，就能到達！`;
}

// ── Done/Gap 區塊 + 月度分析 ──────────────────────────────────────
function buildDoneGapBlock(m: Member, acc: AccumulatedStats | undefined, goals: ChapterGoals): string {
  const refGiven = totalReferralsGiven(m);
  const scale = acc ? Math.min(1, acc.weeksRecorded / 25) : 1;
  const ceuT = [2, 4, 6].map(t => Math.max(1, Math.round(t * scale)));
  const tvT = [400_000, 800_000, 2_000_000].map(t => Math.round(t * scale));

  const metrics = [
    {
      label: "出席",
      done: m.palms === "P" || m.palms === "L",
      detail: `${PALMS_LABEL[m.palms]}`,
    },
    {
      label: `引薦 ${refGiven}筆`,
      done: refGiven >= goals.kpiReferralPerMember,
      detail: refGiven >= goals.kpiReferralPerMember ? `達標✓` : `目標 ${goals.kpiReferralPerMember}筆，差 ${goals.kpiReferralPerMember - refGiven}筆`,
    },
    {
      label: `一對一 ${m.oneToOne}次`,
      done: m.oneToOne >= goals.kpi121PerMember,
      detail: m.oneToOne >= goals.kpi121PerMember ? `達標✓` : `目標 ${goals.kpi121PerMember}次，差 ${goals.kpi121PerMember - m.oneToOne}次`,
    },
    {
      label: `來賓 ${m.visitors}位`,
      done: m.visitors >= 1,
      detail: m.visitors >= 1 ? "達標✓" : "本月尚未帶來賓",
    },
    ...(m.ceu > 0 ? [{
      label: `培訓 ${m.ceu}次`,
      done: acc ? acc.totalCeu >= ceuT[2] : m.ceu >= 6,
      detail: acc ? `累計 ${acc.totalCeu}次（門檻 ${ceuT[2]}次）` : `本週 ${m.ceu}次`,
    }] : []),
    ...(m.transactionValue > 0 ? [{
      label: `交易 NT$${m.transactionValue.toLocaleString()}`,
      done: acc ? acc.totalTransactionValue >= tvT[0] : false,
      detail: acc ? `累計 NT$${Math.round(acc.totalTransactionValue / 10000)}萬（門檻 NT$${Math.round(tvT[0] / 10000)}萬）` : "",
    }] : []),
  ];

  const done = metrics.filter(x => x.done);
  const gap = metrics.filter(x => !x.done);

  let block = "";
  if (done.length > 0) {
    block += `\n✅ 本週已完成：\n` + done.map(x => `  • ${x.label}（${x.detail}）`).join("\n");
  }
  if (gap.length > 0) {
    block += `\n⚠️ 本週欠缺：\n` + gap.map(x => `  • ${x.label} — ${x.detail}`).join("\n");
  }
  return block;
}

function buildMonthlyBlock(m: Member, acc: AccumulatedStats | undefined): string {
  if (!acc) return "";
  const score = memberScoreAccurate(m, acc);
  if (score >= 70) return "\n🏆 綠燈達標！請繼續保持月度節奏。";

  const scale = Math.min(1, acc.weeksRecorded / 25);
  const lines: string[] = [];

  // 引薦：距下一門檻每月需多少
  const ref = acc.avgRefPerWeek;
  const refTargets = [
    { pts: 5, need: 0.75 }, { pts: 10, need: 1.0 }, { pts: 15, need: 1.2 },
    { pts: 20, need: 1.5 },
  ];
  const nextRef = refTargets.find(t => ref < t.need);
  if (nextRef) {
    const perMonth = Math.ceil((nextRef.need - ref) * 4 * 10) / 10;
    lines.push(`引薦：每月再多 ${perMonth}筆 → 引薦積分再 +${nextRef.pts - (ref < 0.75 ? 0 : ref < 1 ? 5 : ref < 1.2 ? 10 : 15)}分`);
  }

  // 一對一：距下一門檻（<1=0, 1~1.99=10, ≥2=15）
  const oto = acc.avg121PerWeek;
  const otoTargets = [{ pts: 10, need: 1.0 }, { pts: 15, need: 2.0 }];
  const nextOto = otoTargets.find(t => oto < t.need);
  if (nextOto) {
    const perMonth = Math.ceil((nextOto.need - oto) * 4 * 10) / 10;
    lines.push(`一對一：每月再多 ${perMonth}次 → +${nextOto.pts - (oto < 1 ? 0 : 10)}分`);
  }

  // 來賓：
  const vis = acc.avgVisitorsPerMonth;
  if (vis < 1) lines.push(`來賓：下個月帶 1位 → +10分`);
  else if (vis < 2) lines.push(`來賓：下個月再多帶 1位 → +5分`);

  // 交易金額：
  const tvT = [400_000, 800_000, 2_000_000].map(t => Math.round(t * scale));
  const tv = acc.totalTransactionValue;
  if (tv < tvT[0]) lines.push(`交易金額：累計再 NT$${Math.round((tvT[0] - tv) / 10000)}萬 → +5分`);
  else if (tv < tvT[1]) lines.push(`交易金額：累計再 NT$${Math.round((tvT[1] - tv) / 10000)}萬 → +5分`);

  if (lines.length === 0) return "";
  const gap = 70 - score;
  return `\n📅 月度衝刺（距綠燈還差 ${gap}分）：\n` + lines.map(l => `  • ${l}`).join("\n");
}

// ── 訊息產生器：遲到緊急警示 ──────────────────────────────────────
function generateLateAlertMessage(m: Member, acc: AccumulatedStats | undefined, weekTitle: string): string {
  const name = memberName(m);
  const score = memberScoreAccurate(m, acc);
  const absRuleCount = acc?.absenceRuleCount ?? 0;
  const subRuleCount = acc?.substituteRuleCount ?? 0;
  const lateCount = (acc?.lateCount ?? 0) + 1; // 加上本週這次
  const lateToAbsConv = Math.floor(lateCount / 3);       // 已換算的缺席次數
  const lateRemainder = lateCount % 3;                    // 還差幾次到下一次換算
  const effAbsRule = absRuleCount + lateToAbsConv;
  const urgencyLevel = effAbsRule >= 3 ? "🚨 緊急" : lateCount >= 2 ? "⚠️ 警示" : "📢 提醒";

  const lateStatusLine = lateToAbsConv > 0
    ? `  ⚠️ 您累計遲到 ${lateCount} 次 → 已換算 ${lateToAbsConv} 次缺席！`
    : lateRemainder === 2
      ? `  ⚠️ 再遲到 1 次，將換算為 1 次缺席！`
      : `  ℹ️ 累計遲到 ${lateCount} 次（再 ${3 - lateRemainder} 次遲到 = 1 次缺席）`;

  return `${urgencyLevel}【BNI 長溙 · 本週遲到通知】
${weekTitle}

${name} 夥伴，您好！

⏰ 本週例會您【遲到（L）】了。

📌 BNI 出席規定重要提醒：
  • 遲到（L）= 出席積分歸零（本週 0 分）
  • ⚡ 重要：每 3 次遲到 = 1 次缺席！
${lateStatusLine}
  • 缺席（A）6個月上限：3 次（目前 ${absRuleCount} 次）
  • 代理人（S）6個月上限：3 次（目前 ${subRuleCount} 次）
  • 含遲到換算後有效缺席：${effAbsRule} 次 / 3 次上限

🎯 本週綜合積分：${score} 分

💡 遲到的影響：
  1. 出席積分歸零（-20 至 -25 分）
  2. 累積 3 次遲到 = 被計算 1 次缺席
  3. 6個月內有效缺席達 3 次可能失去會籍

🙏 懇切建議：
  → 下週請提早 10 分鐘到場準備
  → 如有臨時狀況，請提前通知副主席
  → 有任何不便，歡迎私訊我們協助安排

感謝您對長溙的投入！我們需要您 🌟
下週見！Givers Gain！

── 會員委員會`;
}

// ── 訊息產生器：個人KPI週報 ────────────────────────────────────────
function generateKpiMessage(m: Member, acc: AccumulatedStats | undefined, goals: ChapterGoals, weekTitle: string, showDoneGap = false, showMonthly = false): string {
  const name = memberName(m);
  const light = memberLightAccurate(m, acc);
  const score = memberScoreAccurate(m, acc);
  const refGiven = totalReferralsGiven(m);
  const refRec = m.referralsReceivedInternal + m.referralsReceivedExternal;
  const lightEmoji = light === "green" ? "🟢" : light === "yellow" ? "🟡" : light === "red" ? "🔴" : "⚫";
  const lightLabel = light === "green" ? "綠燈達標" : light === "yellow" ? "黃燈待衝" : light === "red" ? "紅燈關懷" : "黑燈緊急";

  let statusMsg = "";
  if (light === "green") {
    statusMsg = score >= 80
      ? "您本週表現超級優秀！積分亮眼，感謝您對長溙的付出，下週繼續帶動組員一起衝！🎉"
      : "您本週達到綠燈標準（70分以上）！感謝您對分會的貢獻，請繼續保持這股強勁的商業動能！💪";
  } else if (light === "yellow") {
    statusMsg = `本週積分落在黃燈區（50-69分），還差一步就達標了！${gapAdvice(m, acc, 70)} 加油，您可以的！💪`;
  } else if (light === "red") {
    if (m.palms === "A" || m.palms === "S") {
      statusMsg = `本週您${m.palms === "A" ? "缺席（A）" : "由代理人（S）出席"}了例會，出席分數受到影響。提醒您：BNI 規定 6 個月內缺席（A）不得超過 3 次、代理人（S）不得超過 3 次，請多加留意。${gapAdvice(m, acc, 50)} 下週我們期待見到您！`;
    } else {
      statusMsg = `本週積分落在紅燈區（30-49分）。${gapAdvice(m, acc, 50)} 會員委員會很關心您，如有任何困難歡迎私訊！`;
    }
  } else {
    statusMsg = `本週積分為黑燈區（29分以下），需要緊急關注。${gapAdvice(m, acc, 30)} 請立即聯繫副主席或會員委員會，我們一起找解決方案！`;
  }

  const txNote = m.transactionValue > 0 ? `\n💰 交易價值：NT$${m.transactionValue.toLocaleString()}` : "";
  const scale = acc ? Math.min(1, acc.weeksRecorded / 25) : 1;
  const ceuT = [2, 4, 6].map(t => Math.max(1, Math.round(t * scale)));
  const ceuScore = acc
    ? (acc.totalCeu < ceuT[0] ? 0 : acc.totalCeu < ceuT[1] ? 5 : acc.totalCeu < ceuT[2] ? 10 : 15)
    : (m.ceu <= 0 ? 0 : m.ceu < 2 ? 5 : m.ceu < 4 ? 10 : 15);
  const ceuNote = m.ceu > 0 ? `\n📚 教育培訓：${ceuScore} 分` : "";

  const nextTarget = score < 70 ? 70 : score < 75 ? 75 : score < 80 ? 80 : 0;
  const gapLine = nextTarget > 0 ? `\n📈 ${gapAdvice(m, acc, nextTarget)}` : "\n🏆 您已達到 80 分以上，繼續保持！";

  const doneGapBlock = showDoneGap ? buildDoneGapBlock(m, acc, goals) : "";
  const monthlyBlock = showMonthly ? buildMonthlyBlock(m, acc) : "";

  return `🔔【BNI 長溙 · 週次 KPI 提醒】
${weekTitle}

您好，${name} 夥伴！

📊 本週數據摘要：
${lightEmoji} 綜合燈號：${lightLabel}
🎯 本週積分：${score} 分（${scoreLabel(score)}）
📋 出席：${m.palms}（${PALMS_LABEL[m.palms]}）
🤝 一對一 121：${m.oneToOne} 次（目標 ${goals.kpi121PerMember}）
📨 提供引薦：${refGiven} 張（內 ${m.referralsGivenInternal} + 外 ${m.referralsGivenExternal}）
📥 收到引薦：${refRec} 張
🙋 帶來賓：${m.visitors} 位${txNote}${ceuNote}${gapLine}${doneGapBlock}${monthlyBlock}

${statusMsg}

${tip(m)}

Givers Gain！🌟
── 會員委員會`;
}

// ── 訊息產生器：例會前進度提醒 ────────────────────────────────────
function generatePreMeetingMessage(m: Member, acc: AccumulatedStats | undefined, goals: ChapterGoals, weekTitle: string): string {
  const name = memberName(m);
  const score = memberScoreAccurate(m, acc);
  const refGiven = totalReferralsGiven(m);
  const undone = scoreActions(m).filter(a => !a.done);
  const topActions = undone.slice(0, 3).map((a, i) => `  ${i + 1}. ${a.label} ➜ 可加 ${a.pts} 分`).join("\n");

  const encourageLines = [
    "記得：每週的小行動，都在累積你的商業信用！",
    "例會前完成一次 121，到現場見面時就更有話聊！",
    "這週還有幾天，一個小動作就能讓積分飛起來 🚀",
    "不要等到例會才行動！今天就出發！",
  ];
  const encourage = encourageLines[m.id % encourageLines.length];

  return `⏰【BNI 長溙 · 例會前進度提醒】
${weekTitle}

${name} 夥伴，例會快到了！

🎯 目前積分：${score} 分（${scoreLabel(score)}）
📨 引薦：${refGiven} 張｜🤝 121：${m.oneToOne} 次｜🙋 來賓：${m.visitors} 位

${undone.length === 0
  ? "🎉 本週你已全部達標！繼續保持，期待在例會見到你！"
  : `📌 例會前還可以衝刺：\n${topActions}`}

💬 ${encourage}

下週例會我們一起加油！Givers Gain！🌟
── 會員委員會`;
}

// ── 訊息產生器：組長週報 ───────────────────────────────────────────
function generateGroupLeaderMessage(
  group: Group, leader: Member, groupMembers: Member[],
  accStats: AccumulatedStats[], goals: ChapterGoals, weekTitle: string
): string {
  const allInGroup = [leader, ...groupMembers];
  const greenList = allInGroup.filter(m => memberLightAccurate(m, findAcc(m, accStats)) === "green");
  const yellowList = allInGroup.filter(m => memberLightAccurate(m, findAcc(m, accStats)) === "yellow");
  const redList = allInGroup.filter(m => memberLightAccurate(m, findAcc(m, accStats)) === "red");
  const blackList = allInGroup.filter(m => memberLightAccurate(m, findAcc(m, accStats)) === "black");

  const fmt = (ms: Member[]) => ms.map(m => {
    const acc = findAcc(m, accStats);
    const sc = memberScoreAccurate(m, acc);
    const ref = totalReferralsGiven(m);
    const undone = scoreActions(m).filter(a => !a.done);
    const hint = undone.length > 0 ? `還可做：${undone[0].label}` : "已全達標";
    return `  • ${memberName(m)}（${sc}分）121: ${m.oneToOne}次 引薦: ${ref}張　${hint}`;
  }).join("\n");

  // 只顯示有人的燈號區塊
  const lightSections = [
    blackList.length > 0  ? `⚫ 黑燈緊急（${blackList.length} 位）：\n${fmt(blackList)}`  : null,
    redList.length > 0    ? `🔴 紅燈關懷（${redList.length} 位）：\n${fmt(redList)}`    : null,
    yellowList.length > 0 ? `🟡 黃燈待衝（${yellowList.length} 位）：\n${fmt(yellowList)}` : null,
    greenList.length > 0  ? `🟢 綠燈達標（${greenList.length} 位）：\n${fmt(greenList)}`  : null,
  ].filter(Boolean).join("\n\n");

  // 只顯示需要的行動建議
  const actionLines: string[] = [];
  if (blackList.length > 0)  actionLines.push("  1. ⚫ 黑燈組員：請今天就私訊關懷，情況緊急需要立即支援！");
  if (redList.length > 0)    actionLines.push(`  ${actionLines.length + 1}. 🔴 紅燈組員：傳個關心訊息，了解困難，讓他們感受組長的溫度。`);
  if (yellowList.length > 0) actionLines.push(`  ${actionLines.length + 1}. 🟡 黃燈組員：主動約 121 互加分，一杯咖啡讓積分飛起來！`);
  if (actionLines.length === 0) actionLines.push("  🎉 全組本週表現亮眼，繼續保持並帶動來賓！");

  const followUp = (redList.length > 0 || blackList.length > 0)
    ? `\n⚠️ 本週請優先聯繫：${[...blackList, ...redList].map(m => memberName(m)).join("、")}，了解困難並給予關懷。`
    : "";
  const praise = greenList.length > 0
    ? `\n🎉 本週優秀：${greenList.map(m => memberName(m)).join("、")}，請公開鼓勵！`
    : "";

  return `📊【BNI 長溙 · ${group.name} 本週 KPI 週報】
${weekTitle}

${memberName(leader)} 組長您好！

本週${group.name}成員狀況：

${lightSections}
${praise}${followUp}

📌 組長行動建議：
${actionLines.join("\n")}

感謝您的帶領！Givers Gain！🌟
── 副主席 劉家豪`;
}

// ── 主席週報（9段）────────────────────────────────────────────────
const LEADERSHIP_ROLES = new Set(["主席", "副主席", "秘書/財務", "教育協調員", "活動協調員", "成長協調員", "導師協調員", "來賓接待員", "網站管理員"]);

function memberGroup(m: Member): "leadership" | "committee" | "partner" {
  if (LEADERSHIP_ROLES.has(m.role)) return "leadership";
  if (m.role === "會員委員會") return "committee";
  return "partner";
}

function generateChairReport(
  members: Member[],
  goals: ChapterGoals,
  weekTitle: string,
  accStats: AccumulatedStats[],
): string {
  const total = members.length;
  const palmsCount = { P: 0, L: 0, M: 0, A: 0, S: 0 };
  members.forEach(m => { palmsCount[m.palms] = (palmsCount[m.palms] || 0) + 1; });
  const attended = palmsCount.P + palmsCount.L + palmsCount.S;
  const attendRate = Math.round((attended / total) * 100);

  const lights = { green: 0, yellow: 0, red: 0, black: 0 };
  members.forEach(m => { lights[memberLightAccurate(m, findAcc(m, accStats))]++; });

  const totalRef = members.reduce((s, m) => s + totalReferralsGiven(m), 0);
  const refGoalMet = members.filter(m => totalReferralsGiven(m) >= goals.kpiReferralPerMember).length;
  const totalOto = members.reduce((s, m) => s + m.oneToOne, 0);
  const otoGoalMet = members.filter(m => m.oneToOne >= goals.kpi121PerMember).length;
  const totalVis = members.reduce((s, m) => s + m.visitors, 0);
  const visitorMembers = members.filter(m => m.visitors > 0).map(m => `${memberName(m)}（${m.visitors}位）`);
  const totalTv = members.reduce((s, m) => s + m.transactionValue, 0);
  const totalCeu = members.reduce((s, m) => s + m.ceu, 0);

  // 需要關懷
  const yellowMs = members.filter(m => memberLightAccurate(m, findAcc(m, accStats)) === "yellow");
  const redMs    = members.filter(m => memberLightAccurate(m, findAcc(m, accStats)) === "red");
  const blackMs  = members.filter(m => memberLightAccurate(m, findAcc(m, accStats)) === "black");

  // 續約到期
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const in60 = new Date(today); in60.setDate(today.getDate() + 60);
  const renewalItems = members
    .filter(m => m.renewal !== "未到期" || (m.renewalDate && new Date(m.renewalDate) <= in60))
    .map(m => {
      const daysLeft = m.renewalDate
        ? Math.ceil((new Date(m.renewalDate).getTime() - today.getTime()) / 86400000)
        : null;
      const dateStr = m.renewalDate
        ? `${m.renewalDate.slice(0, 10)}（${daysLeft! > 0 ? `剩 ${daysLeft} 天` : daysLeft === 0 ? "今天到期" : `逾期 ${Math.abs(daysLeft!)} 天`}）`
        : "未填到期日";
      const statusEmoji = m.renewal === "已續約" ? "✅"
        : m.renewal === "待追蹤" ? "⚠️"
        : m.renewal === "需要關懷" ? "🆘"
        : "🕐";
      return `  ${statusEmoji} ${memberName(m)}　${dateStr}　【${m.renewal}】`;
    });
  const renewalSection = renewalItems.length > 0
    ? `━━━━━━━━━━━━━━━━━━━━
⑩ 近期續約到期提醒
━━━━━━━━━━━━━━━━━━━━
${renewalItems.join("\n")}`
    : `━━━━━━━━━━━━━━━━━━━━
⑩ 近期續約到期提醒
━━━━━━━━━━━━━━━━━━━━
✅ 目前 60 天內無待辦續約事項`;

  // 本週缺席 / 遲到
  const absentThisWeek = members.filter(m => m.palms === "A").map(m => memberName(m));
  const lateThisWeek   = members.filter(m => m.palms === "L").map(m => memberName(m));
  // 累積缺席警告（≥2次）
  const absWarnList = members.filter(m => {
    const acc = findAcc(m, accStats);
    return acc ? (acc.absenceRuleCount ?? 0) >= 2 : false;
  }).map(m => {
    const acc = findAcc(m, accStats)!;
    return `${memberName(m)}（累計缺席 ${acc.absenceRuleCount} 次）`;
  });

  // 遲到累積警告（≥2次，因再遲到1次即換算1缺席）
  const lateWarnList = members.filter(m => {
    const acc = findAcc(m, accStats);
    return acc ? (acc.lateCount ?? 0) >= 2 : false;
  }).map(m => {
    const acc = findAcc(m, accStats)!;
    const lc = acc.lateCount ?? 0;
    const conv = Math.floor(lc / 3);
    const rem = lc % 3;
    return conv > 0
      ? `${memberName(m)}（遲到 ${lc} 次，已換算 ${conv} 次缺席）`
      : `${memberName(m)}（遲到 ${lc} 次，再 ${3 - rem} 次=缺席）`;
  });

  const fmtCareBlock = (color: string, emoji: string, ms: Member[]) => {
    if (ms.length === 0) return `${emoji}（無）`;
    const lines = ms.map(m => {
      const sc = memberScoreAccurate(m, findAcc(m, accStats));
      const roleTag = m.role !== "夥伴會員" ? `【${m.role}】` : "";
      return `  • ${memberName(m)}${roleTag}（${sc}分）`;
    }).join("\n");
    return `${emoji}（${ms.length} 位）\n${lines}`;
  };

  return `👑【BNI 長溙 · 主席週報】
${weekTitle}

主席 黃芯慧 您好！
以下是本週例會完整數據，請過目。

━━━━━━━━━━━━━━━━━━━━
① 本週出席概況
━━━━━━━━━━━━━━━━━━━━
👥 應出席：${total} 位會員
✅ 出席（P）：${palmsCount.P} 位
⏰ 遲到（L）：${palmsCount.L} 位
🏥 病假（M）：${palmsCount.M} 位
🔄 代理人（S）：${palmsCount.S} 位
❌ 缺席（A）：${palmsCount.A} 位
📈 出席率：${attendRate}%

━━━━━━━━━━━━━━━━━━━━
② 燈號積分分布
━━━━━━━━━━━━━━━━━━━━
整體：🟢${lights.green} 🟡${lights.yellow} 🔴${lights.red} ⚫${lights.black}（共 ${total} 位）
📊 綠燈率：${Math.round(lights.green / total * 100)}%（目標 60%）

━━━━━━━━━━━━━━━━━━━━
③ 業務引薦
━━━━━━━━━━━━━━━━━━━━
📨 本週總引薦：${totalRef} 張
🏆 達標人數：${refGoalMet}/${total} 位（週目標 ${goals.kpiReferralPerMember} 張）
📉 未達標：${total - refGoalMet} 位

━━━━━━━━━━━━━━━━━━━━
④ 來賓情況
━━━━━━━━━━━━━━━━━━━━
🙋 本週來賓：${totalVis} 位
${visitorMembers.length > 0
  ? "感謝以下夥伴帶來賓：\n  " + visitorMembers.join("、")
  : "  本週無人帶來賓，請各小組積極邀約！"}
🎯 目標：每週至少 ${goals.visitorTarget} 位

━━━━━━━━━━━━━━━━━━━━
⑤ 一對一會面
━━━━━━━━━━━━━━━━━━━━
🤝 本週總 121：${totalOto} 次
🏆 達標人數：${otoGoalMet}/${total} 位（週目標 ${goals.kpi121PerMember} 次）
📌 提醒：深化夥伴關係從 121 開始！

━━━━━━━━━━━━━━━━━━━━
⑥ 教育培訓（CEU）
━━━━━━━━━━━━━━━━━━━━
📚 本週 CEU 總計：${totalCeu} 次
💡 培訓是投資自己最高報酬的方式，請持續累積！

━━━━━━━━━━━━━━━━━━━━
⑦ 交易金額
━━━━━━━━━━━━━━━━━━━━
💰 本週回報交易：NT$${totalTv.toLocaleString()}
📈 每位平均：NT$${Math.round(totalTv / total).toLocaleString()}

━━━━━━━━━━━━━━━━━━━━
⑧ 需要關懷的夥伴
━━━━━━━━━━━━━━━━━━━━
${fmtCareBlock("red", "🟡 黃燈", yellowMs)}

${fmtCareBlock("red", "🔴 紅燈", redMs)}

${fmtCareBlock("black", "⚫ 黑燈", blackMs)}

${absentThisWeek.length > 0 ? `❌ 本週缺席（A）：${absentThisWeek.join("、")}` : "✅ 本週無缺席"}
${lateThisWeek.length > 0
  ? `⏰ 本週遲到（L）：${lateThisWeek.join("、")}\n  ⚡ 3次遲到＝1次缺席，請傳送個人遲到警示訊息！`
  : "✅ 本週無遲到"}${absWarnList.length > 0 ? `\n\n🚨 累積缺席警告（≥2次，6月上限3次）：\n  ${absWarnList.join("、")}` : ""}${lateWarnList.length > 0 ? `\n\n⏰ 遲到累積警告（3次換算1缺席）：\n  ${lateWarnList.join("\n  ")}` : ""}

━━━━━━━━━━━━━━━━━━━━
⑨ 副主席本週行動建議
━━━━━━━━━━━━━━━━━━━━
${lateThisWeek.length > 0 ? `⏰ 今日必辦：傳送遲到警示訊息給 ${lateThisWeek.join("、")}（出席積分歸零 + 3次遲到=1缺席）` : ""}
${lateWarnList.length > 0 ? `⚡ 遲到換算追蹤：${lateWarnList.join("、")}，請副主席私下關懷確認時間安排` : ""}
${blackMs.length > 0 ? `🆘 本週最優先：私訊 ${blackMs.map(m => memberName(m)).join("、")} 了解困難，安排 1-on-1` : ""}
${redMs.length > 0 ? `🔴 紅燈關懷：${redMs.map(m => memberName(m)).join("、")} 請各組長本週主動聯繫` : ""}
${lights.green < total * 0.6 ? `📊 綠燈率偏低（${Math.round(lights.green / total * 100)}%），建議下週例會後進行全體 KPI 提醒` : `🎉 綠燈率 ${Math.round(lights.green / total * 100)}%，分會表現亮眼！繼續保持！`}
${totalVis < goals.visitorTarget ? `🙋 來賓不足，建議主席會後鼓勵各組長本週邀約至少 1 位來賓` : ""}
📌 持續推動 121 深化夥伴關係，引薦自然倍增！

${renewalSection}

感謝主席的帶領！Givers Gain！🌟
── 副主席 劉家豪 敬上`;
}

// ── 訊息產生器：會期累積月報 ──────────────────────────────────────
function generateMonthlyReport(
  members: Member[],
  goals: ChapterGoals,
  weekTitle: string,
  accStats: AccumulatedStats[],
): string {
  const total = members.length;

  const totalAccRef = accStats.reduce((s, a) => s + Math.round(a.avgRefPerWeek * a.weeksRecorded), 0);
  const totalAcc121 = accStats.reduce((s, a) => s + Math.round(a.avg121PerWeek * a.weeksRecorded), 0);
  const totalAccTV = accStats.reduce((s, a) => s + a.totalTransactionValue, 0);
  const totalAccCeu = accStats.reduce((s, a) => s + a.totalCeu, 0);
  const totalAccVis = accStats.reduce((s, a) => s + Math.round(a.avgVisitorsPerMonth / 4 * a.weeksRecorded), 0);
  const avgWeeks = accStats.length > 0 ? Math.round(accStats.reduce((s, a) => s + a.weeksRecorded, 0) / accStats.length) : 0;

  const lights = { green: 0, yellow: 0, red: 0, black: 0 };
  members.forEach(m => { lights[memberLightAccurate(m, findAcc(m, accStats))]++; });

  const topRef = [...accStats].sort((a, b) => b.avgRefPerWeek - a.avgRefPerWeek).slice(0, 5);
  const topTV = [...accStats].sort((a, b) => b.totalTransactionValue - a.totalTransactionValue).slice(0, 5);

  const absWarn = accStats.filter(a => (a.absenceRuleCount ?? 0) >= 2)
    .map(a => `${a.memberName}（${a.absenceRuleCount}次）`);

  return `📊【BNI 長溙 · 第13屆會期累積總結】
${weekTitle} 止

主席 黃芯慧 您好！
以下為本屆會期截至目前的累積數據。

━━━━━━━━━━━━━━━━━━━━
① 燈號積分現況
━━━━━━━━━━━━━━━━━━━━
🟢 綠燈：${lights.green} 位（${Math.round(lights.green / total * 100)}%）
🟡 黃燈：${lights.yellow} 位
🔴 紅燈：${lights.red} 位
⚫ 黑燈：${lights.black} 位
📌 分會健康度目標：綠燈率 ≥60%

━━━━━━━━━━━━━━━━━━━━
② 累積業績指標
━━━━━━━━━━━━━━━━━━━━
📨 累積引薦：${totalAccRef} 張（週均 ${Math.round(totalAccRef / Math.max(avgWeeks, 1))} 張）
🤝 累積 121：${totalAcc121} 次（週均 ${Math.round(totalAcc121 / Math.max(avgWeeks, 1))} 次）
🙋 累積來賓：${totalAccVis} 位
📚 累積 CEU：${totalAccCeu} 次
💰 累積交易：NT$${Math.round(totalAccTV / 10000)}萬

━━━━━━━━━━━━━━━━━━━━
③ 引薦週均 Top 5
━━━━━━━━━━━━━━━━━━━━
${topRef.map((a, i) => `  ${i + 1}. ${a.memberName}（週均 ${a.avgRefPerWeek.toFixed(1)} 張）`).join("\n")}

━━━━━━━━━━━━━━━━━━━━
④ 累積交易 Top 5
━━━━━━━━━━━━━━━━━━━━
${topTV.map((a, i) => `  ${i + 1}. ${a.memberName}（NT$${Math.round(a.totalTransactionValue / 10000)}萬）`).join("\n")}

━━━━━━━━━━━━━━━━━━━━
⑤ 缺席警告
━━━━━━━━━━━━━━━━━━━━
${absWarn.length > 0
  ? `⚠️ 累積缺席 ≥2次（6個月規定上限3次）：\n  ${absWarn.join("、")}`
  : "✅ 目前無累積缺席警告會員"}

感謝主席的帶領！Givers Gain！🌟
── 副主席 劉家豪 敬上`;
}

// ── 共用複製卡片 ──────────────────────────────────────────────────
function MessageCard({
  title, subtitle, lightColor, message, defaultExpanded = false,
}: {
  title: string; subtitle: string; lightColor: string; message: string; defaultExpanded?: boolean; key?: React.Key;
}) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(defaultExpanded);

  const copy = () => {
    navigator.clipboard.writeText(message).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className={`bg-white rounded-xl border border-slate-200 border-l-4 ${lightColor} shadow-sm overflow-hidden`}>
      <div className="flex items-center gap-3 p-3">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-800 text-sm">{title}</p>
          <p className="text-xs text-slate-400 truncate">{subtitle}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={copy}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              copied ? "bg-green-100 text-green-700" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}>
            {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "已複製" : "複製"}
          </button>
          <button onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-100">
          <pre className="whitespace-pre-wrap text-xs text-slate-600 bg-slate-50 p-3 rounded-lg font-sans leading-relaxed">
            {message}
          </pre>
        </div>
      )}
    </div>
  );
}

// ── 主元件 ────────────────────────────────────────────────────────
type SubTab = "kpi" | "pre" | "group" | "promo" | "chair" | "monthly";
type LightFilter = "all" | "green" | "yellow" | "red";

export default function LineMessagePanel({ members, goals, weekTitle, accStats }: LineMessagePanelProps) {
  const [subTab, setSubTab] = useState<SubTab>("kpi");
  const [filter, setFilter] = useState<LightFilter>("all");
  const [copiedAll, setCopiedAll] = useState(false);
  const [promoType, setPromoType] = useState<"meeting" | "event" | "notice">("meeting");
  const [promoCustom, setPromoCustom] = useState("");
  const [promoCopied, setPromoCopied] = useState(false);
  const [chairCopied, setChairCopied] = useState(false);
  const [monthlyCopied, setMonthlyCopied] = useState(false);
  const [showDoneGap, setShowDoneGap] = useState(true);   // 顯示已完成/欠缺
  const [showMonthly, setShowMonthly] = useState(true);    // 顯示月度分析
  const [kpiIdx, setKpiIdx] = useState(0);

  React.useEffect(() => { setKpiIdx(0); }, [filter, subTab]);

  const counts = {
    green: members.filter(m => memberLightAccurate(m, findAcc(m, accStats)) === "green").length,
    yellow: members.filter(m => memberLightAccurate(m, findAcc(m, accStats)) === "yellow").length,
    red: members.filter(m => memberLightAccurate(m, findAcc(m, accStats)) === "red").length,
  };

  const filtered = members.filter(m =>
    filter === "all" ? true : memberLightAccurate(m, findAcc(m, accStats)) === filter
  );

  const copyAll = (msgs: string[]) => {
    navigator.clipboard.writeText(msgs.join("\n\n─────────────────\n\n")).then(() => {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
    });
  };

  // 組長週報資料
  const groupCards = GROUPS.map(group => {
    const leader = members.find(m => memberName(m) === group.leaderFullName);
    const groupMembers = group.memberFullNames
      .map(n => members.find(m => memberName(m) === n))
      .filter(Boolean) as Member[];
    return leader ? { group, leader, groupMembers } : null;
  }).filter(Boolean) as { group: Group; leader: Member; groupMembers: Member[] }[];

  const lightBorder = (m: Member) => {
    const l = memberLightAccurate(m, findAcc(m, accStats));
    return l === "green" ? "border-l-green-500" : l === "yellow" ? "border-l-amber-500" : l === "red" ? "border-l-red-500" : "border-l-gray-700";
  };

  const scoreBar = (score: number) => {
    const pct = Math.min(score, 100);
    const color = score >= 80 ? "bg-green-500" : score >= 75 ? "bg-emerald-400" : score >= 70 ? "bg-amber-400" : "bg-red-400";
    return (
      <div className="flex items-center gap-2 px-3 pb-2">
        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
        </div>
        <span className={`text-[10px] font-bold ${score >= 75 ? "text-green-700" : score >= 70 ? "text-amber-600" : "text-red-600"}`}>
          {score}分
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="bg-gradient-to-r from-green-700 via-green-800 to-slate-900 rounded-xl p-5 text-white">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-green-300" />
          </div>
          <div>
            <h3 className="text-lg font-black">LINE KPI 訊息中心</h3>
            <p className="text-green-200 text-xs">個人KPI · 例會前提醒 · 小組週報 · 積分差距分析</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="bg-white/10 px-3 py-1 rounded-full">🟢 {counts.green} 位</span>
          <span className="bg-white/10 px-3 py-1 rounded-full">🟡 {counts.yellow} 位</span>
          <span className="bg-white/10 px-3 py-1 rounded-full">🔴 {counts.red} 位</span>
          <span className="bg-white/10 px-3 py-1 rounded-full">👥 6 個小組</span>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2">
        {([
          { key: "kpi", label: "個人KPI週報", icon: MessageCircle },
          { key: "pre", label: "例會前提醒", icon: Bell },
          { key: "group", label: "組長週報", icon: Users },
          { key: "promo", label: "LINE 宣傳", icon: Megaphone },
          { key: "chair", label: "主席週報", icon: Crown },
          { key: "monthly", label: "會期總覽", icon: BarChart2 },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setSubTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              subTab === key ? "bg-slate-800 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}>
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* KPI訊息選項 */}
      {subTab === "kpi" && (
        <div className="flex gap-3 flex-wrap items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs">
          <span className="font-bold text-slate-600">訊息內容：</span>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={showDoneGap} onChange={e => setShowDoneGap(e.target.checked)} className="accent-indigo-600" />
            <span>✅ 已完成 / ⚠️ 欠缺明細</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={showMonthly} onChange={e => setShowMonthly(e.target.checked)} className="accent-indigo-600" />
            <span>📅 月度衝刺建議</span>
          </label>
        </div>
      )}

      {/* ── 個人KPI週報 / 例會前提醒 ── */}
      {(subTab === "kpi" || subTab === "pre") && (
        <>
          {/* 遲到緊急提示橫幅 */}
          {subTab === "kpi" && members.filter(m => m.palms === "L").length > 0 && (() => {
            const lateMembers = members.filter(m => m.palms === "L");
            return (
              <div className="bg-orange-500 text-white rounded-xl px-4 py-3 flex items-center gap-3 shadow-md">
                <span className="text-xl">⏰</span>
                <div className="flex-1">
                  <p className="font-black text-sm">本週遲到警示 — {lateMembers.map(m => memberName(m)).join("、")}</p>
                  <p className="text-orange-100 text-xs mt-0.5">以下會員遲到（L），出席積分歸零。請展開其 KPI 卡後找到橘色警示訊息，複製並傳送！</p>
                </div>
                <span className="text-lg font-black">{lateMembers.length}位</span>
              </div>
            );
          })()}

          {/* Filter + Batch Copy */}
          <div className="flex flex-wrap gap-2 items-center">
            {([
              { key: "all", label: `全部 (${members.length})` },
              { key: "green", label: `🟢 (${counts.green})` },
              { key: "yellow", label: `🟡 (${counts.yellow})` },
              { key: "red", label: `🔴 (${counts.red})` },
            ] as const).map(({ key, label }) => (
              <button key={key} onClick={() => setFilter(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  filter === key ? "bg-slate-800 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}>
                {label}
              </button>
            ))}
            <div className="flex-1" />
            <button
              onClick={() => copyAll(filtered.map(m =>
                subTab === "kpi"
                  ? generateKpiMessage(m, findAcc(m, accStats), goals, weekTitle, showDoneGap, showMonthly)
                  : generatePreMeetingMessage(m, findAcc(m, accStats), goals, weekTitle)
              ))}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                copiedAll ? "bg-green-100 text-green-700 border border-green-300" : "bg-green-700 hover:bg-green-800 text-white"
              }`}>
              {copiedAll ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedAll ? "已複製！" : `一次複製全部 ${filtered.length} 則`}
            </button>
          </div>

          {/* 快速發送模式 */}
          {filtered.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center gap-3 text-xs">
              <span className="font-bold text-amber-800">快速發送模式：</span>
              <span className="text-amber-700">{kpiIdx + 1} / {filtered.length}</span>
              <div className="flex-1 h-1.5 bg-amber-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${Math.round((kpiIdx / filtered.length) * 100)}%` }} />
              </div>
              <button onClick={() => setKpiIdx(0)} className="px-2 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-lg font-bold cursor-pointer">重置</button>
            </div>
          )}

          {/* Score legend */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 flex flex-wrap gap-3">
            <span className="font-bold text-slate-700">積分說明：</span>
            {[
              { label: "出席 P", pts: 25 }, { label: "引薦達標", pts: 25 },
              { label: "121達標", pts: 20 }, { label: "教育培訓", pts: 15 },
              { label: "帶來賓", pts: 15 },
            ].map(({ label, pts }) => (
              <span key={label}>{label} <strong>+{pts}</strong></span>
            ))}
            <span className="ml-auto font-bold">≥70=🟢綠燈 · 50-69=🟡黃燈 · 30-49=🔴紅燈 · ≤29=⚫黑燈</span>
          </div>

          {/* Cards */}
          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              {members.length === 0 ? "請先在「數據輸入」頁面匯入會員資料" : "此燈號無會員"}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((m, i) => {
                const acc = findAcc(m, accStats);
                const sc = memberScoreAccurate(m, acc);
                return (
                  <div key={m.id}>
                    <MessageCard
                      title={memberName(m)}
                      subtitle={`${m.category} ／ ${sc}分 ${scoreLabel(sc)} ／ 121:${m.oneToOne} 引薦:${totalReferralsGiven(m)} 來賓:${m.visitors}`}
                      lightColor={lightBorder(m)}
                      message={subTab === "kpi"
                        ? generateKpiMessage(m, acc, goals, weekTitle, showDoneGap, showMonthly)
                        : generatePreMeetingMessage(m, acc, goals, weekTitle)
                      }
                      defaultExpanded={i === kpiIdx}
                    />
                    {i === kpiIdx && (
                      <div className="flex justify-end -mt-1 mb-1">
                        <button
                          onClick={() => {
                            const msg = subTab === "kpi"
                              ? generateKpiMessage(m, findAcc(m, accStats), goals, weekTitle, showDoneGap, showMonthly)
                              : generatePreMeetingMessage(m, findAcc(m, accStats), goals, weekTitle);
                            navigator.clipboard.writeText(msg).then(() => {
                              setKpiIdx(prev => Math.min(prev + 1, filtered.length - 1));
                            });
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-green-600 hover:bg-green-700 text-white cursor-pointer shadow-sm"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          複製並下一位 →
                        </button>
                      </div>
                    )}
                    {scoreBar(sc)}
                    {/* 遲到緊急警示卡 */}
                    {m.palms === "L" && (
                      <div className="mt-1 mb-2 rounded-xl border border-orange-300 bg-orange-50 overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2 bg-orange-100 border-b border-orange-200">
                          <span className="text-sm">⏰</span>
                          <span className="text-xs font-black text-orange-800">遲到緊急警示訊息</span>
                          <span className="text-[10px] text-orange-600 ml-1">— 建議同步傳給本人</span>
                        </div>
                        <div className="p-2">
                          <MessageCard
                            title={`⏰ ${memberName(m)} — 遲到警示`}
                            subtitle={`出席積分歸零 · 建議今日傳送`}
                            lightColor="border-l-orange-500"
                            message={generateLateAlertMessage(m, acc, weekTitle)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── 組長週報 ── */}
      {subTab === "group" && (
        <>
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-xs text-indigo-800">
            💡 <strong>使用方式：</strong>每週例會後，複製各組週報傳給組長，由組長負責關懷與鼓勵本組組員。
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => copyAll(groupCards.map(({ group, leader, groupMembers }) =>
                generateGroupLeaderMessage(group, leader, groupMembers, accStats, goals, weekTitle)
              ))}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                copiedAll ? "bg-green-100 text-green-700 border border-green-300" : "bg-indigo-700 hover:bg-indigo-800 text-white"
              }`}>
              {copiedAll ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedAll ? "已複製！" : "一次複製全部 6 組週報"}
            </button>
          </div>

          {groupCards.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              請先匯入會員資料
            </div>
          ) : (
            <div className="space-y-3">
              {groupCards.map(({ group, leader, groupMembers }) => {
                const allInGroup = [leader, ...groupMembers];
                const g = allInGroup.filter(m => memberLightAccurate(m, findAcc(m, accStats)) === "green").length;
                const y = allInGroup.filter(m => memberLightAccurate(m, findAcc(m, accStats)) === "yellow").length;
                const r = allInGroup.filter(m => memberLightAccurate(m, findAcc(m, accStats)) === "red").length;
                const borderColor = r > 0 ? "border-l-red-500" : y > 0 ? "border-l-amber-500" : "border-l-green-500";
                return (
                  <MessageCard
                    key={group.name}
                    title={`${group.name} — 組長：${memberName(leader)}`}
                    subtitle={`共 ${allInGroup.length} 人｜🟢${g} 🟡${y} 🔴${r}`}
                    lightColor={borderColor}
                    message={generateGroupLeaderMessage(group, leader, groupMembers, accStats, goals, weekTitle)}
                  />
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── LINE 宣傳 ── */}
      {subTab === "promo" && (() => {
        const promoTemplates = {
          meeting: `【BNI 長溙分會｜例會通知】📅

第 ${weekTitle} 週例會即將到來！

🕖 時間：早上 6:30 準時開始
📍 地點：台南大億麗緻酒店

本週請準備：
✅ 個人 60 秒商業簡報
✅ 帶名片（至少 30 張）
✅ 為組員準備具體引薦

期待大家把握每次例會機會，一起創造更多商機！

── BNI 長溙分會 副主席 劉家豪`,
          event: `【BNI 長溙分會｜活動公告】🎉

各位親愛的會員，

${promoCustom || "（請在下方輸入活動詳情）"}

如有任何問題，歡迎私訊副主席。
期待大家踴躍參與！

── BNI 長溙分會 副主席 劉家豪`,
          notice: `【BNI 長溙分會｜重要公告】📢

${promoCustom || "（請在下方輸入公告內容）"}

感謝大家的配合與支持！

── BNI 長溙分會 副主席 劉家豪`,
        };
        const msg = promoType === "meeting"
          ? promoTemplates.meeting + (promoCustom ? `\n\n📌 補充：${promoCustom}` : "")
          : promoTemplates[promoType];

        return (
          <div className="space-y-4">
            {/* 類型選擇 */}
            <div className="flex gap-2 flex-wrap">
              {([
                { key: "meeting", label: "📅 例會通知" },
                { key: "event", label: "🎉 活動宣傳" },
                { key: "notice", label: "📢 特別公告" },
              ] as const).map(({ key, label }) => (
                <button key={key} onClick={() => setPromoType(key)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    promoType === key ? "bg-green-700 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}>
                  {label}
                </button>
              ))}
            </div>

            {/* 自訂文字 */}
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">
                {promoType === "meeting" ? "補充說明（選填）" : "內容（必填）"}
              </label>
              <textarea
                className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-green-400"
                rows={3}
                placeholder={promoType === "meeting" ? "例：本週有新會員介紹，請大家多多認識！" : "請輸入內容…"}
                value={promoCustom}
                onChange={e => setPromoCustom(e.target.value)}
              />
            </div>

            {/* 預覽 + 複製 */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-600">訊息預覽</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(msg).then(() => {
                      setPromoCopied(true);
                      setTimeout(() => setPromoCopied(false), 2500);
                    });
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    promoCopied ? "bg-green-100 text-green-700" : "bg-green-700 text-white hover:bg-green-800"
                  }`}>
                  {promoCopied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {promoCopied ? "已複製！" : "複製訊息"}
                </button>
              </div>
              <pre className="p-4 text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">{msg}</pre>
            </div>
          </div>
        );
      })()}

      {/* ── 主席週報 ── */}
      {subTab === "chair" && (() => {
        const msg = generateChairReport(members, goals, weekTitle, accStats);
        return (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-amber-700 to-amber-900 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 mb-1">
                <Crown className="w-4 h-4 text-amber-300" />
                <span className="font-black text-sm">主席週報（9段完整版）</span>
              </div>
              <p className="text-amber-200 text-xs">含出席、燈號、引薦、來賓、121、CEU、交易金額、關懷名單、行動建議</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-600">訊息預覽（可直接複製貼到 LINE）</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(msg).then(() => {
                      setChairCopied(true);
                      setTimeout(() => setChairCopied(false), 2500);
                    });
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    chairCopied ? "bg-green-100 text-green-700" : "bg-amber-700 text-white hover:bg-amber-800"
                  }`}>
                  {chairCopied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {chairCopied ? "已複製！" : "複製週報"}
                </button>
              </div>
              <pre className="p-4 text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed max-h-[600px] overflow-y-auto">{msg}</pre>
            </div>
          </div>
        );
      })()}

      {/* ── 會期月報 ── */}
      {subTab === "monthly" && (() => {
        const msg = generateMonthlyReport(members, goals, weekTitle, accStats);
        return (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-indigo-700 to-indigo-900 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 mb-1">
                <BarChart2 className="w-4 h-4 text-indigo-300" />
                <span className="font-black text-sm">會期累積總覽（截至本週）</span>
              </div>
              <p className="text-indigo-200 text-xs">含燈號分布、累積業績、引薦排行、交易排行、缺席警告</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-600">月報預覽（可複製給主席）</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(msg).then(() => {
                      setMonthlyCopied(true);
                      setTimeout(() => setMonthlyCopied(false), 2500);
                    });
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    monthlyCopied ? "bg-green-100 text-green-700" : "bg-indigo-700 text-white hover:bg-indigo-800"
                  }`}>
                  {monthlyCopied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {monthlyCopied ? "已複製！" : "複製月報"}
                </button>
              </div>
              <pre className="p-4 text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed max-h-[600px] overflow-y-auto">{msg}</pre>
            </div>
          </div>
        );
      })()}

      {/* Usage tip */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">
        💡 <strong>發送順序建議：</strong>
        🔴 紅燈先私下關懷 →
        🟡 黃燈鼓勵衝刺（例會前 2 天再傳一次「例會前提醒」）→
        🟢 綠燈公開表揚 →
        組長週報每週傳給各組長做內部追蹤。
      </div>

      {/* 手機版快速複製 bar（sm 以下顯示） */}
      {(subTab === "kpi" || subTab === "pre") && filtered.length > 0 && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 p-3 flex gap-2 shadow-lg">
          <button
            onClick={() => copyAll(filtered.map(m =>
              subTab === "kpi"
                ? generateKpiMessage(m, findAcc(m, accStats), goals, weekTitle, showDoneGap, showMonthly)
                : generatePreMeetingMessage(m, findAcc(m, accStats), goals, weekTitle)
            ))}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition cursor-pointer ${
              copiedAll ? "bg-green-100 text-green-700" : "bg-green-600 text-white"
            }`}
          >
            {copiedAll ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            {copiedAll ? "已複製全部！" : `一鍵複製全部 ${filtered.length} 則訊息`}
          </button>
        </div>
      )}
      {/* 手機版底部留白避免被 bar 擋住 */}
      <div className="sm:hidden h-20" />
    </div>
  );
}
