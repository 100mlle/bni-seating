export type PALMS = "P" | "A" | "L" | "M" | "S";

export const PALMS_LABEL: Record<PALMS, string> = {
  P: "出席",
  A: "缺席",
  L: "遲到",
  M: "病假",
  S: "代理人",
};

export interface Member {
  id: number;
  firstName: string;
  lastName: string;
  category: string;
  role: string;
  palms: PALMS;
  referralsGivenInternal: number;
  referralsGivenExternal: number;
  referralsReceivedInternal: number;
  referralsReceivedExternal: number;
  visitors: number;
  oneToOne: number;
  transactionValue: number;
  ceu: number;
  renewal: "已續約" | "未到期" | "待追蹤" | "需要關懷";
  renewalDate?: string; // ISO 日期，例如 "2026-09-30"，表示本會期到期日
}

export interface ChapterGoals {
  memberTarget: number;
  visitorTarget: number;
  applicationTarget: number;
  oneToOneTarget: number;
  referralTarget: number;
  absenceWarningRate: number;
  kpi121PerMember: number;
  kpiReferralPerMember: number;
  kpiCeuPerMember: number;
}

export interface CoachingNote {
  memberName: string;
  category: string;
  issue: string;
  actionPlan: string;
}

export interface AIDiagnoseResponse {
  success: boolean;
  api_key_missing?: boolean;
  message?: string;
  data?: {
    chapterHealthScore: number;
    executiveSummary: string;
    coachingAdvice: CoachingNote[];
    powerTeamTraction: string;
    slideSpeakingNotes: string[];
    actionItems: string[];
  };
  error?: string;
}

export interface SlideContent {
  id: number;
  title: string;
  subtitle: string;
  bgType: "burgundy" | "slate" | "charcoal" | "white";
  category: string;
}

// Weekly history stored in localStorage
export interface WeeklyRecord {
  id: string;
  weekTitle: string;
  date: string; // ISO date string
  members: Member[];
  goals: ChapterGoals;
  committeeText: string;
}

// Helper: full name（姓 + 名）
export function memberName(m: Member): string {
  return `${m.lastName}${m.firstName}`;
}

// Helper: total referrals given
export function totalReferralsGiven(m: Member): number {
  return m.referralsGivenInternal + m.referralsGivenExternal;
}

// Helper: PALMS is an absence for 6-month rule (A or S count)
export function isAbsenceForRule(p: PALMS): boolean {
  return p === "A" || p === "S";
}

// ─── 官方台灣 BNI 個人紅綠燈積分制（週次近似版）───────────────────
// 滿分 100 分：出席20 + 培訓15 + 來賓15 + 一對一15 + 業務引薦20 + 引薦金額15
//
// 燈號：≥70=綠 │ 50-69=黃 │ 30-49=紅 │ ≤29=黑
//
// ⚠️ 出席、培訓、引薦金額為6個月累計；此處以週資料近似估算
export function memberScore(m: Member): number {
  // 出席 (0-20): 週 PALMS 近似6個月缺席次數
  const att = m.palms === "P" ? 20
    : m.palms === "L" ? 15          // 遲到 ≈ 0-1 次缺席
    : (m.palms === "M" || m.palms === "S") ? 10  // 病假/代理 ≈ 1-2 次缺席
    : 0;                             // A 缺席 ≈ 3 次以上

  // 培訓 CEU (0-15): 次數換算
  const ceu = m.ceu <= 0 ? 0 : m.ceu < 2 ? 5 : m.ceu < 4 ? 10 : 15;

  // 邀請來賓 (0-15): 每4週 0/1/2+ 位
  const vis = m.visitors === 0 ? 0 : m.visitors === 1 ? 10 : 15;

  // 一對一 (0-15): 週平均
  const oto = m.oneToOne === 0 ? 0 : m.oneToOne === 1 ? 10 : 15;

  // 業務引薦 (0-20): 週引薦數（內+外）
  const ref = totalReferralsGiven(m);
  const refPts = ref === 0 ? 0 : ref < 1.2 ? 10 : ref < 1.5 ? 15 : 20;

  // 引薦金額 (0-15): 6個月累計（以週資料×26週估算）
  const tv6m = m.transactionValue * 26;
  const tvPts = tv6m < 400_000 ? 0 : tv6m < 800_000 ? 5 : tv6m < 2_000_000 ? 10 : 15;

  return att + ceu + vis + oto + refPts + tvPts;
}

// 燈號（依官方標準）
export type LightColor = "green" | "yellow" | "red" | "black";
export function memberLight(m: Member): LightColor {
  const s = memberScore(m);
  if (s >= 70) return "green";
  if (s >= 50) return "yellow";
  if (s >= 30) return "red";
  return "black";
}

// 各分項的最高分與目前得分，用於差距分析
export interface ScoreAction { label: string; pts: number; max: number; done: boolean; }
export function scoreActions(m: Member): ScoreAction[] {
  const ref = totalReferralsGiven(m);
  const tv6m = m.transactionValue * 26;
  return [
    { label: "完整出席（P）", pts: m.palms === "P" ? 20 : m.palms === "L" ? 15 : (m.palms === "M" || m.palms === "S") ? 10 : 0, max: 20, done: m.palms === "P" },
    { label: "業務引薦 ≥1.5筆", pts: ref === 0 ? 0 : ref < 1.2 ? 10 : ref < 1.5 ? 15 : 20, max: 20, done: ref >= 1.5 },
    { label: "一對一 ≥2次", pts: m.oneToOne === 0 ? 0 : m.oneToOne === 1 ? 10 : 15, max: 15, done: m.oneToOne >= 2 },
    { label: "邀來賓 ≥2位（每月）", pts: m.visitors === 0 ? 0 : m.visitors === 1 ? 10 : 15, max: 15, done: m.visitors >= 2 },
    { label: "培訓 ≥6次（每6個月）", pts: m.ceu <= 0 ? 0 : m.ceu < 2 ? 5 : m.ceu < 4 ? 10 : 15, max: 15, done: m.ceu >= 6 },
    { label: "引薦金額 ≥200萬（每6個月）", pts: tv6m < 400_000 ? 0 : tv6m < 800_000 ? 5 : tv6m < 2_000_000 ? 10 : 15, max: 15, done: tv6m >= 2_000_000 },
  ];
}

// ─── 6個月累積統計（從 SQLite 歷史計算）─────────────────────────
export interface AccumulatedStats {
  memberName: string;
  weeksRecorded: number;
  absenceCount: number;         // A + M（計入出席扣分）
  absenceRuleCount: number;     // A 缺席（計入6個月規定）
  substituteRuleCount: number;  // S 代理人（計入6個月規定）
  lateCount: number;            // L 遲到（每3次等同1次缺席）
  totalCeu: number;
  totalTransactionValue: number;
  avgVisitorsPerMonth: number;
  avg121PerWeek: number;
  avgRefPerWeek: number;
}

// 遲到換算後的有效缺席次數（3次遲到 = 1次缺席）
export function effectiveAbsenceCount(acc: AccumulatedStats): number {
  return (acc.absenceCount || 0) + Math.floor((acc.lateCount || 0) / 3);
}

// 遲到換算後的有效出席規定缺席次數（計入6個月上限）
export function effectiveAbsenceRuleCount(acc: AccumulatedStats): number {
  return (acc.absenceRuleCount || 0) + Math.floor((acc.lateCount || 0) / 3);
}

// 使用6個月累積資料精確計算（無累積資料時退回單週估算）
export function memberScoreAccurate(m: Member, acc?: AccumulatedStats): number {
  if (!acc || acc.weeksRecorded === 0) return memberScore(m);

  // 出席 (0-20): 6個月缺席次數（A + M）+ 遲到換算（每3次=1次缺席）
  const effAbs = effectiveAbsenceCount(acc);
  const att = effAbs === 0 ? 20
    : effAbs === 1 ? 15
    : effAbs === 2 ? 10
    : 0;

  // 比例係數：本會期 25 次例會（4/1~9/30 扣勞動節）
  const scale = Math.min(1, acc.weeksRecorded / 25);

  // 培訓 CEU (0-15): 按會期等比縮放門檻
  const ceuT = [2, 4, 6].map(t => Math.max(1, Math.round(t * scale)));
  const ceu = acc.totalCeu < ceuT[0] ? 0 : acc.totalCeu < ceuT[1] ? 5 : acc.totalCeu < ceuT[2] ? 10 : 15;

  // 邀請來賓 (0-15): 每月平均
  const vis = acc.avgVisitorsPerMonth < 1 ? 0 : acc.avgVisitorsPerMonth < 2 ? 10 : 15;

  // 一對一 (0-15): 週平均（<0.5=0, 0.5~0.99=5, 1~1.99=10, ≥2=15）
  const oto = acc.avg121PerWeek < 0.5 ? 0
    : acc.avg121PerWeek < 1 ? 5
    : acc.avg121PerWeek < 2 ? 10
    : 15;

  // 業務引薦 (0-20): 週平均
  const ref = acc.avgRefPerWeek;
  const refPts = ref < 0.75 ? 0 : ref < 1 ? 5 : ref < 1.2 ? 10 : ref < 1.5 ? 15 : 20;

  // 引薦金額 (0-15): 按會期等比縮放門檻
  const tv = acc.totalTransactionValue;
  const tvT = [400_000, 800_000, 2_000_000].map(t => Math.round(t * scale));
  const tvPts = tv < tvT[0] ? 0 : tv < tvT[1] ? 5 : tv < tvT[2] ? 10 : 15;

  return att + ceu + vis + oto + refPts + tvPts;
}

// 使用累積資料更新燈號
export function memberLightAccurate(m: Member, acc?: AccumulatedStats): LightColor {
  const s = memberScoreAccurate(m, acc);
  if (s >= 70) return "green";
  if (s >= 50) return "yellow";
  if (s >= 30) return "red";
  return "black";
}

// 六個月出席警告等級 — 缺席(A)、代理人(S)、遲到換算各別計算，取最嚴等級
export type ASWarning = "safe" | "caution" | "warning" | "critical";
const WARN_ORDER: ASWarning[] = ["safe", "caution", "warning", "critical"];
function singleWarn(n: number): ASWarning {
  if (n <= 1) return "safe";
  if (n === 2) return "caution";
  if (n === 3) return "warning";
  return "critical";
}
// 遲到警告：2次=caution（再一次就換算1缺席）；3次=warning（已換算1缺席）
function lateWarn(n: number): ASWarning {
  if (n <= 1) return "safe";
  if (n === 2) return "caution";   // 再1次遲到就等同1次缺席
  if (n < 6)  return "warning";   // 已累計換算缺席
  return "critical";
}
export function asWarningLevel(acc?: AccumulatedStats): ASWarning {
  if (!acc) return "safe";
  const wa = singleWarn(acc.absenceRuleCount ?? 0);
  const ws = singleWarn(acc.substituteRuleCount ?? 0);
  const wl = lateWarn(acc.lateCount ?? 0);
  // 有效缺席（含遲到換算）再用 singleWarn 評估
  const wEff = singleWarn(effectiveAbsenceRuleCount(acc));
  return WARN_ORDER[Math.max(
    WARN_ORDER.indexOf(wa),
    WARN_ORDER.indexOf(ws),
    WARN_ORDER.indexOf(wl),
    WARN_ORDER.indexOf(wEff),
  )];
}

// 查找某位會員的累積統計
export function findAcc(m: Member, accStats: AccumulatedStats[]): AccumulatedStats | undefined {
  return accStats.find(s => s.memberName === memberName(m));
}

// ─── 上綠燈行動指南 ──────────────────────────────────────────────────────────

export interface GreenGapItem {
  key: string;
  label: string;
  currentScore: number;
  maxScore: number;
  gap: number;           // 距下一級所差分數
  gainable: number;      // 本項最多還能增加幾分
  fixed: boolean;        // 無法靠未來行動改變（如出席）
  action: string;        // 具體行動描述
  nextTierLabel: string; // 下一級門檻說明
}

export interface PathToGreen {
  currentScore: number;
  isGreen: boolean;
  needed: number;        // 距 70 分差幾分
  maxReachable: number;  // 本會期最多可達到幾分
  canReach: boolean;
  items: GreenGapItem[];
  weeksRemaining: number;
}

export function computeScoreBreakdown(acc: AccumulatedStats, scale = 1): {
  att: number; ceu: number; vis: number; oto: number; refPts: number; tvPts: number;
} {
  const effAbs = effectiveAbsenceCount(acc);
  const att = effAbs === 0 ? 20 : effAbs === 1 ? 15 : effAbs === 2 ? 10 : 0;
  const ceuT = [2, 4, 6].map(t => Math.max(1, Math.round(t * scale)));
  const ceu = acc.totalCeu < ceuT[0] ? 0 : acc.totalCeu < ceuT[1] ? 5 : acc.totalCeu < ceuT[2] ? 10 : 15;
  const vis = acc.avgVisitorsPerMonth < 1 ? 0 : acc.avgVisitorsPerMonth < 2 ? 10 : 15;
  const oto = acc.avg121PerWeek < 0.5 ? 0 : acc.avg121PerWeek < 1 ? 5 : acc.avg121PerWeek < 2 ? 10 : 15;
  const ref = acc.avgRefPerWeek;
  const refPts = ref < 0.75 ? 0 : ref < 1 ? 5 : ref < 1.2 ? 10 : ref < 1.5 ? 15 : 20;
  const tv = acc.totalTransactionValue;
  const tvT = [400_000, 800_000, 2_000_000].map(t => Math.round(t * scale));
  const tvPts = tv < tvT[0] ? 0 : tv < tvT[1] ? 5 : tv < tvT[2] ? 10 : 15;
  return { att, ceu, vis, oto, refPts, tvPts };
}

export function computePathToGreen(acc: AccumulatedStats, totalTermWeeks: number): PathToGreen {
  const scale = Math.min(1, acc.weeksRecorded / totalTermWeeks);
  const { att, ceu, vis, oto, refPts, tvPts } = computeScoreBreakdown(acc, scale);
  const currentScore = att + ceu + vis + oto + refPts + tvPts;
  const weeksRemaining = Math.max(0, totalTermWeeks - acc.weeksRecorded);
  const wTotal = acc.weeksRecorded + weeksRemaining;

  // 各項最大可達分數
  const attMax = att; // 出席已固定
  const ceuMax = 15;  // 理論上都能補足培訓
  const visMax = 15;
  const otoMax = 15;
  const refMax = 20;
  const tvMax = 15;
  const maxReachable = attMax + ceuMax + visMax + otoMax + refMax + tvMax;

  const items: GreenGapItem[] = [];

  // 出席（固定）
  const attActions = att === 20 ? "✓ 完整出席，滿分" :
    att === 15 ? "已 1 次缺席，本學期保持出席可維持 15 分" :
    att === 10 ? "已 2 次缺席，本學期得 10 分" : "已超出規定，出席得 0 分";
  items.push({ key:"att", label:"出席", currentScore:att, maxScore:20, gap:20-att, gainable:0, fixed:true, action:attActions, nextTierLabel:"" });

  // 業務引薦
  const totalRefs = acc.avgRefPerWeek * acc.weeksRecorded;
  const nextRefThr = refPts < 5 ? 0.75 : refPts < 10 ? 1.0 : refPts < 15 ? 1.2 : refPts < 20 ? 1.5 : null;
  const nextRefPts = refPts < 5 ? 5 : refPts < 10 ? 10 : refPts < 15 ? 15 : refPts < 20 ? 20 : 20;
  let refAction = "✓ 已達最高分";
  let refGainable = 0;
  if (nextRefThr !== null && weeksRemaining > 0) {
    const weeklyNeeded = (nextRefThr * wTotal - totalRefs) / weeksRemaining;
    refAction = weeklyNeeded > 0
      ? `每週給 ${weeklyNeeded.toFixed(1)} 張以上引薦可升到 ${nextRefPts} 分（剩 ${weeksRemaining} 週）`
      : `維持目前速度可升到 ${nextRefPts} 分`;
    refGainable = nextRefPts - refPts;
  }
  items.push({ key:"ref", label:"業務引薦", currentScore:refPts, maxScore:20, gap:20-refPts, gainable:refGainable, fixed:false, action:refAction, nextTierLabel: nextRefThr ? `每週 ${nextRefThr} 張` : "已滿分" });

  // 一對一
  const total121 = acc.avg121PerWeek * acc.weeksRecorded;
  const nextOtoThr = oto < 5 ? 0.5 : oto < 10 ? 1.0 : oto < 15 ? 2.0 : null;
  const nextOtoPts = oto < 5 ? 5 : oto < 10 ? 10 : oto < 15 ? 15 : 15;
  let otoAction = "✓ 已達最高分";
  let otoGainable = 0;
  if (nextOtoThr !== null && weeksRemaining > 0) {
    const weeklyNeeded = (nextOtoThr * wTotal - total121) / weeksRemaining;
    otoAction = weeklyNeeded > 0
      ? `每週做 ${Math.ceil(weeklyNeeded)} 次以上一對一可升到 ${nextOtoPts} 分（剩 ${weeksRemaining} 週）`
      : `維持目前速度可升到 ${nextOtoPts} 分`;
    otoGainable = nextOtoPts - oto;
  }
  items.push({ key:"oto", label:"一對一", currentScore:oto, maxScore:15, gap:15-oto, gainable:otoGainable, fixed:false, action:otoAction, nextTierLabel: nextOtoThr ? `每週 ${nextOtoThr} 次` : "已滿分" });

  // 來賓
  const nextVisThr = vis < 10 ? 1 : vis < 15 ? 2 : null;
  const nextVisPts = vis < 10 ? 10 : vis < 15 ? 15 : 15;
  const visGainable = nextVisThr !== null ? nextVisPts - vis : 0;
  const visAction = nextVisThr !== null
    ? `每月平均 ${nextVisThr} 位以上來賓可得 ${nextVisPts} 分`
    : "✓ 已達最高分";
  items.push({ key:"vis", label:"邀請來賓", currentScore:vis, maxScore:15, gap:15-vis, gainable:visGainable, fixed:false, action:visAction, nextTierLabel: nextVisThr ? `每月 ${nextVisThr} 位` : "已滿分" });

  // 培訓 CEU（按比例縮放門檻）
  const ceuThr = [2,4,6].map(t => Math.max(1, Math.round(t * scale)));
  const nextCeuThr = ceu < 5 ? ceuThr[0] : ceu < 10 ? ceuThr[1] : ceu < 15 ? ceuThr[2] : null;
  const nextCeuPts = ceu < 5 ? 5 : ceu < 10 ? 10 : ceu < 15 ? 15 : 15;
  const ceuNeed = nextCeuThr !== null ? Math.max(0, nextCeuThr - acc.totalCeu) : 0;
  const ceuAction = ceuNeed > 0
    ? `再參加 ${ceuNeed} 次培訓可升到 ${nextCeuPts} 分`
    : ceu === 15 ? "✓ 已達最高分" : "維持即可";
  const ceuGainable = nextCeuThr !== null ? nextCeuPts - ceu : 0;
  items.push({ key:"ceu", label:"培訓 CEU", currentScore:ceu, maxScore:15, gap:15-ceu, gainable:ceuGainable, fixed:false, action:ceuAction, nextTierLabel: nextCeuThr ? `${nextCeuThr} 次` : "已滿分" });

  // 交易金額
  const tvThr = [400_000, 800_000, 2_000_000].map(t => Math.round(t * scale));
  const nextTvThr = tvPts < 5 ? tvThr[0] : tvPts < 10 ? tvThr[1] : tvPts < 15 ? tvThr[2] : null;
  const nextTvPts = tvPts < 5 ? 5 : tvPts < 10 ? 10 : tvPts < 15 ? 15 : 15;
  const tvNeed = nextTvThr !== null ? Math.max(0, nextTvThr - acc.totalTransactionValue) : 0;
  const tvAction = tvNeed > 0
    ? `再帶進 NT$${tvNeed.toLocaleString()} 成交可升到 ${nextTvPts} 分`
    : tvPts === 15 ? "✓ 已達最高分" : "維持即可";
  const tvGainable = nextTvThr !== null ? nextTvPts - tvPts : 0;
  items.push({ key:"tv", label:"引薦成交金額", currentScore:tvPts, maxScore:15, gap:15-tvPts, gainable:tvGainable, fixed:false, action:tvAction, nextTierLabel: nextTvThr ? `NT$${(nextTvThr/10000).toFixed(0)}萬` : "已滿分" });

  // 按「最容易獲得分數」排序（gainable 高且 fixed=false 優先）
  items.sort((a, b) => {
    if (a.fixed && !b.fixed) return 1;
    if (!a.fixed && b.fixed) return -1;
    return b.gainable - a.gainable;
  });

  return {
    currentScore,
    isGreen: currentScore >= 70,
    needed: Math.max(0, 70 - currentScore),
    maxReachable,
    canReach: maxReachable >= 70,
    items,
    weeksRemaining,
  };
}
