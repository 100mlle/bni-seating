/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Member {
  id: number;
  name: string;
  category: string; // Industry classification (e.g. 水電工程, 室內設計)
  role: string; // Title / Chapter role (e.g. 會員委員會, 夥伴會員, 副主席, etc.)
  attendance: "出席" | "缺席" | "請假";
  oneToOne: number;
  referrals: number;
  visitors: number;
  renewal: "已續約" | "未到期" | "待追蹤" | "需要關懷";
}

export interface ChapterGoals {
  memberTarget: number;
  visitorTarget: number;
  applicationTarget: number;
  oneToOneTarget: number;
  referralTarget: number;
  absenceWarningRate: number; // e.g. 10%
  kpi121PerMember: number; // e.g. 1
  kpiReferralPerMember: number; // e.g. 1
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
    slideSpeakingNotes: string[]; // exactly 12 elements
    actionItems: string[]; // exactly 3 elements
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
