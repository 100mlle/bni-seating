import { Member, ChapterGoals } from "./types";

// ── 本會期設定（第13屆）────────────────────────────────────────────
export const CHAPTER_PERIOD = {
  start: "2026-04-10",
  end:   "2026-09-30",
  totalMeetings: 23,           // 第一次例會 4/10，共 23 次
  holidayDates: [
    "2026-05-01", // 勞動節
    "2026-06-19", // 端午節（農曆 5/5）
    "2026-09-25", // 中秋節（農曆 8/15）
  ],
} as const;

// 計算指定日期是第幾次例會（從會期開始的週五，扣除假日）
export function meetingNumberForDate(dateStr: string): number {
  const target = new Date(dateStr + "T23:59:59");
  const start = new Date(CHAPTER_PERIOD.start);
  const holidays = new Set<string>(CHAPTER_PERIOD.holidayDates);
  let count = 0;
  const d = new Date(start);
  const dayOfWeek = d.getDay();
  const daysToFri = dayOfWeek <= 5 ? 5 - dayOfWeek : 6;
  d.setDate(d.getDate() + daysToFri);
  while (d <= target) {
    const iso = d.toISOString().split("T")[0];
    if (!holidays.has(iso)) count++;
    d.setDate(d.getDate() + 7);
  }
  return Math.min(count, CHAPTER_PERIOD.totalMeetings);
}

// 計算今天是第幾次例會
export function currentMeetingNumber(): number {
  const today = new Date().toISOString().split("T")[0];
  return meetingNumberForDate(today);
}

// 長溙分會 第十三屆 2026.04.01 ~ 2026.09.30
export const defaultMembers: Member[] = [
  { id: 1,  firstName: "許", lastName: "文婉", category: "零售批發",      role: "會員委員會",   palms: "P", referralsGivenInternal: 2, referralsGivenExternal: 0, referralsReceivedInternal: 11, referralsReceivedExternal: 4, visitors: 0, oneToOne: 4,  transactionValue: 2878,  ceu: 2, renewal: "已續約" },
  { id: 2,  firstName: "崔", lastName: "永疇", category: "平面設計",      role: "會員委員會",   palms: "P", referralsGivenInternal: 1, referralsGivenExternal: 2, referralsReceivedInternal: 0,  referralsReceivedExternal: 0, visitors: 0, oneToOne: 2,  transactionValue: 0,     ceu: 0, renewal: "未到期" },
  { id: 3,  firstName: "劉", lastName: "兆矩", category: "御用推拿師",    role: "會員委員會",   palms: "P", referralsGivenInternal: 2, referralsGivenExternal: 0, referralsReceivedInternal: 1,  referralsReceivedExternal: 1, visitors: 0, oneToOne: 4,  transactionValue: 610,   ceu: 2, renewal: "已續約" },
  { id: 4,  firstName: "譚", lastName: "宇芩", category: "眼鏡銷售業",    role: "夥伴會員",     palms: "A", referralsGivenInternal: 0, referralsGivenExternal: 0, referralsReceivedInternal: 0,  referralsReceivedExternal: 0, visitors: 0, oneToOne: 1,  transactionValue: 0,     ceu: 0, renewal: "待追蹤" },
  { id: 5,  firstName: "簡", lastName: "廷桓", category: "人力仲介",      role: "夥伴會員",     palms: "P", referralsGivenInternal: 1, referralsGivenExternal: 2, referralsReceivedInternal: 0,  referralsReceivedExternal: 0, visitors: 0, oneToOne: 4,  transactionValue: 11100, ceu: 0, renewal: "未到期" },
  { id: 6,  firstName: "李", lastName: "孟涵", category: "統包工程",      role: "夥伴會員",     palms: "P", referralsGivenInternal: 1, referralsGivenExternal: 1, referralsReceivedInternal: 0,  referralsReceivedExternal: 0, visitors: 0, oneToOne: 9,  transactionValue: 3612,  ceu: 4, renewal: "未到期" },
  { id: 7,  firstName: "陳", lastName: "宜寧", category: "臼井靈氣",      role: "秘書/財務",    palms: "P", referralsGivenInternal: 4, referralsGivenExternal: 0, referralsReceivedInternal: 0,  referralsReceivedExternal: 0, visitors: 0, oneToOne: 10, transactionValue: 6280,  ceu: 2, renewal: "未到期" },
  { id: 8,  firstName: "楊", lastName: "尚恩", category: "醫療行銷",      role: "夥伴會員",     palms: "P", referralsGivenInternal: 0, referralsGivenExternal: 2, referralsReceivedInternal: 0,  referralsReceivedExternal: 0, visitors: 0, oneToOne: 1,  transactionValue: 75600, ceu: 0, renewal: "未到期" },
  { id: 9,  firstName: "周", lastName: "昆胤", category: "窗簾業",        role: "夥伴會員",     palms: "P", referralsGivenInternal: 2, referralsGivenExternal: 0, referralsReceivedInternal: 0,  referralsReceivedExternal: 0, visitors: 0, oneToOne: 2,  transactionValue: 129,   ceu: 1, renewal: "未到期" },
  { id: 10, firstName: "黃", lastName: "芯慧", category: "整體造型",      role: "主席",         palms: "P", referralsGivenInternal: 4, referralsGivenExternal: 0, referralsReceivedInternal: 1,  referralsReceivedExternal: 0, visitors: 0, oneToOne: 7,  transactionValue: 200,   ceu: 4, renewal: "已續約" },
  { id: 11, firstName: "黃", lastName: "信樺", category: "保健食品",      role: "成長協調員",   palms: "P", referralsGivenInternal: 1, referralsGivenExternal: 1, referralsReceivedInternal: 0,  referralsReceivedExternal: 0, visitors: 0, oneToOne: 4,  transactionValue: 4799,  ceu: 0, renewal: "未到期" },
  { id: 12, firstName: "李", lastName: "冠樺", category: "家排塔羅",      role: "夥伴會員",     palms: "P", referralsGivenInternal: 2, referralsGivenExternal: 1, referralsReceivedInternal: 1,  referralsReceivedExternal: 1, visitors: 0, oneToOne: 6,  transactionValue: 3200,  ceu: 2, renewal: "未到期" },
  { id: 13, firstName: "周", lastName: "宥達", category: "拆除工程",      role: "夥伴會員",     palms: "P", referralsGivenInternal: 2, referralsGivenExternal: 3, referralsReceivedInternal: 0,  referralsReceivedExternal: 0, visitors: 0, oneToOne: 3,  transactionValue: 3000,  ceu: 4, renewal: "未到期" },
  { id: 14, firstName: "林", lastName: "彥合", category: "有機清潔用品",  role: "導師協調員",   palms: "P", referralsGivenInternal: 2, referralsGivenExternal: 0, referralsReceivedInternal: 0,  referralsReceivedExternal: 0, visitors: 0, oneToOne: 7,  transactionValue: 0,     ceu: 2, renewal: "未到期" },
  { id: 15, firstName: "陳", lastName: "政華", category: "花藝場佈設計",  role: "教育協調員",   palms: "P", referralsGivenInternal: 3, referralsGivenExternal: 0, referralsReceivedInternal: 0,  referralsReceivedExternal: 0, visitors: 0, oneToOne: 2,  transactionValue: 5350,  ceu: 2, renewal: "未到期" },
  { id: 16, firstName: "劉", lastName: "洛安", category: "親子手作教學",  role: "會員委員會",   palms: "P", referralsGivenInternal: 2, referralsGivenExternal: 0, referralsReceivedInternal: 0,  referralsReceivedExternal: 0, visitors: 0, oneToOne: 2,  transactionValue: 0,     ceu: 2, renewal: "未到期" },
  { id: 17, firstName: "曾", lastName: "郁婷", category: "企業團建",      role: "夥伴會員",     palms: "P", referralsGivenInternal: 2, referralsGivenExternal: 0, referralsReceivedInternal: 0,  referralsReceivedExternal: 0, visitors: 0, oneToOne: 2,  transactionValue: 520,   ceu: 2, renewal: "未到期" },
  { id: 18, firstName: "程", lastName: "韋銘", category: "設備儲能",      role: "來賓接待員",   palms: "P", referralsGivenInternal: 2, referralsGivenExternal: 0, referralsReceivedInternal: 0,  referralsReceivedExternal: 1, visitors: 0, oneToOne: 3,  transactionValue: 0,     ceu: 0, renewal: "未到期" },
  { id: 19, firstName: "劉", lastName: "家豪", category: "冷凍空調",      role: "副主席",       palms: "P", referralsGivenInternal: 2, referralsGivenExternal: 0, referralsReceivedInternal: 1,  referralsReceivedExternal: 1, visitors: 0, oneToOne: 4,  transactionValue: 4120,  ceu: 0, renewal: "已續約" },
  { id: 20, firstName: "劉", lastName: "峻嘉", category: "水電工程",      role: "夥伴會員",     palms: "P", referralsGivenInternal: 2, referralsGivenExternal: 0, referralsReceivedInternal: 1,  referralsReceivedExternal: 3, visitors: 0, oneToOne: 3,  transactionValue: 2100,  ceu: 0, renewal: "未到期" },
  { id: 21, firstName: "許", lastName: "祥泰", category: "商業攝影",      role: "會員委員會",   palms: "P", referralsGivenInternal: 0, referralsGivenExternal: 2, referralsReceivedInternal: 2,  referralsReceivedExternal: 0, visitors: 0, oneToOne: 5,  transactionValue: 14700, ceu: 2, renewal: "未到期" },
  { id: 22, firstName: "廖", lastName: "翊如", category: "壽險業",        role: "夥伴會員",     palms: "P", referralsGivenInternal: 2, referralsGivenExternal: 1, referralsReceivedInternal: 3,  referralsReceivedExternal: 0, visitors: 0, oneToOne: 2,  transactionValue: 4531,  ceu: 4, renewal: "已續約" },
  { id: 23, firstName: "李", lastName: "惠暄", category: "律師",          role: "夥伴會員",     palms: "P", referralsGivenInternal: 0, referralsGivenExternal: 0, referralsReceivedInternal: 0,  referralsReceivedExternal: 0, visitors: 1, oneToOne: 0,  transactionValue: 715,   ceu: 2, renewal: "未到期" },
  { id: 24, firstName: "王", lastName: "湘慈", category: "產物保險",      role: "活動協調員",   palms: "P", referralsGivenInternal: 1, referralsGivenExternal: 1, referralsReceivedInternal: 1,  referralsReceivedExternal: 0, visitors: 0, oneToOne: 3,  transactionValue: 0,     ceu: 2, renewal: "未到期" },
  { id: 25, firstName: "洪", lastName: "瑋君", category: "早午餐",        role: "夥伴會員",     palms: "P", referralsGivenInternal: 1, referralsGivenExternal: 1, referralsReceivedInternal: 16, referralsReceivedExternal: 1, visitors: 0, oneToOne: 0,  transactionValue: 0,     ceu: 0, renewal: "未到期" },
  { id: 26, firstName: "陳", lastName: "裔潔", category: "投資金融",      role: "網站管理員",   palms: "P", referralsGivenInternal: 2, referralsGivenExternal: 0, referralsReceivedInternal: 0,  referralsReceivedExternal: 1, visitors: 0, oneToOne: 3,  transactionValue: 0,     ceu: 0, renewal: "未到期" },
];

// 第十三屆領導團隊
export const defaultCommitteeText = `主席：黃芯慧
副主席：劉家豪
秘書/財務：陳宜寧
教育協調員：陳政華
活動協調員：王湘慈
成長協調員：黃信樺
導師協調員：林彥合
來賓接待員：程韋銘
網站管理員：陳裔潔
會員委員會：劉兆矩、陳宜寧、許文婉、劉洛安、崔永疇、程韋銘`;

// 第十三屆目標 2026.04.01 ~ 2026.10.31
export const defaultGoals: ChapterGoals = {
  memberTarget: 55,
  visitorTarget: 12,       // 每週12人（每月48人）
  applicationTarget: 2,
  oneToOneTarget: 50,      // 每週估算（26人 × 約2次）
  referralTarget: 100,     // 每週100張
  absenceWarningRate: 2,   // 缺席率目標 1.5%，警戒設 2%
  kpi121PerMember: 1,      // Power of One：每週至少1次
  kpiReferralPerMember: 1, // 每週至少1張（每月3張目標）
  kpiCeuPerMember: 1,
};

export const defaultSlideScripts: string[] = [
  "各位長溙分會第十三屆領導團隊的夥伴，大家午安！歡迎來到本週的會後會。今天我們以客觀中立的 PALMS 數字為核心，洞察分會運作現況。數據的意義不是責備，而是協助我們看見哪位夥伴需要支援。讓我們以樂施者得的精神展開今天的數據檢視。",
  "首先呈現本週的數據總覽。本週共有 26 位會員參與評等，來賓、121 與引薦數字請見看板。整體交易價值持續累積，感謝各位夥伴的奉獻。",
  "在目標達成率部分，本屆目標為每週引薦 100 張、每週來賓 12 人、全員達到 75 分綠燈。目前達成率請見看板，我們採第一階段原則，只看整體數字，不公開點名。",
  "進行第二階段：公開表揚優秀達標夥伴。特別恭喜本週 121 與引薦雙達標的夥伴！我們下週大會安排一分鐘公開表揚，邀請分享引薦心法，創造渴望成功的氛圍。",
  "接下來看紅黃綠燈分布。綠燈夥伴請繼續保持，黃燈夥伴下週全力衝刺，紅燈夥伴請放心，執事幹部將私下約 121 了解困難。我們的原則是公開數據、私下輔導，溫度決定結果。",
  "本週 PALMS 出席追蹤。第十三屆目標出席率 95%、缺席率控制在 1.5% 以內。提醒：A（缺席）與 S（代理人）六個月內合計不得超過 3 次。出席是分會誠信的基礎，請出席專員溫心關懷所有夥伴。",
  "來賓到申請書轉換漏斗。本屆每月目標 48 位來賓，每週 12 位。來賓是分會生命力的源頭，請來賓接待員程韋銘學長在例會後 48 小時內完成溫馨回訪，提升轉換率。",
  "續約與關懷名單。會員委員會請提前 90 天與待續約夥伴進行 BNI ROI 評估，用真實商業成果促成自然續約。本屆月保留率目標 85%、轉換率 15%。",
  "第十三屆執事幹部分工。主席黃芯慧、副主席劉家豪帶領全體協調員，各司其職落實系統運作。教育協調員陳政華、活動協調員王湘慈、成長協調員黃信樺、導師協調員林彥合，每位幹部都是分會成長的重要引擎。",
  "副主席建言：本屆目標 55 人團隊、全員 80 分綠燈。達到這個目標不靠個人英雄主義，靠的是每一位夥伴每週穩定貢獻。管理不是限制，而是協助看見彼此的商業需求與潛力。",
  "下週三大核心行動方針。第一、各小組完成內循環 121，每組至少產生 2 次以上配對；第二、來賓接待員落實 48 小時回訪，推進申請書填寫；第三、成長協調員啟動新會員關懷計畫，加速達到 55 人目標。",
  "結尾共識：數字只是結果，溫度才是決定因素。長溙分會第十三屆，讓我們手握商業引擎，用數據、熱情與系統性輔導，共同達成每月 550 單引薦、48 位來賓、全員 80 分綠燈的宏偉目標！Givers Gain，謝謝大家！"
];

// 長溙分會 第十三屆 六個小組（第一排為組長）
export interface Group {
  name: string;
  leaderFullName: string;
  memberFullNames: string[];
}

export const GROUPS: Group[] = [
  { name: "第一組", leaderFullName: "簡廷桓", memberFullNames: ["劉家豪", "陳宜寧", "譚宇芩", "許文婉"] },
  { name: "第二組", leaderFullName: "李冠樺", memberFullNames: ["林彥合", "劉兆矩", "洪瑋君", "劉洛安"] },
  { name: "第三組", leaderFullName: "廖翊如", memberFullNames: ["王湘慈", "李惠暄", "崔永疇"] },
  { name: "第四組", leaderFullName: "許祥泰", memberFullNames: ["黃信樺", "李孟涵", "周宥達"] },
  { name: "第五組", leaderFullName: "劉峻嘉", memberFullNames: ["黃芯慧", "陳裔潔", "曾郁婷"] },
  { name: "第六組", leaderFullName: "周昆胤", memberFullNames: ["陳政華", "程韋銘", "楊尚恩"] },
];
