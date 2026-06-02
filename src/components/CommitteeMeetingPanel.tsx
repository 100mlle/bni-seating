import React, { useState } from "react";
import { Member, memberName } from "../types";
import { Users, Copy, CheckCircle, ChevronDown, ChevronUp, CalendarDays } from "lucide-react";

interface CommitteeMeetingPanelProps {
  members: Member[];
}

interface CommitteeTask {
  memberId: number;
  agendaNo: string;
  agendaTitle: string;
  duties: string[];
  targets: string[];
}

const TASK_ASSIGNMENTS: CommitteeTask[] = [
  {
    memberId: 1, // 許文婉
    agendaNo: "一",
    agendaTitle: "會員出席狀況報告",
    duties: [
      "統計本月出席率（目標：95%以上）",
      "統計本月遲到率（目標：低於 5%）",
      "統計本月代理人比率（目標：低於 5%）",
      "列出 A/S 次數高的會員名單",
      "提出意見與改善行動方案（1-3 項）",
    ],
    targets: ["出席率 ≥ 95%", "遲到率 < 5%", "代理人率 < 5%"],
  },
  {
    memberId: 2, // 崔永疇
    agendaNo: "二",
    agendaTitle: "參與度報告",
    duties: [
      "計算本月每週平均內部引薦單數（目標：1 單/人/週）",
      "計算本月每週平均外部引薦單數（目標：1 單/人/週）",
      "計算付出者百分率（目標：70%以上）",
      "計算一對一比率（目標：70%以上）",
      "計算培訓比率 MSP 或工作坊（目標：50%以上）",
      "提出意見與行動方案（1-3 項）",
    ],
    targets: ["引薦 ≥ 2 單/人/週", "付出者率 ≥ 70%", "1-on-1 率 ≥ 70%"],
  },
  {
    memberId: 3, // 劉兆矩
    agendaNo: "三",
    agendaTitle: "商務引薦狀況",
    duties: [
      "統計本年累計引薦金額（依分會會期目標）",
      "計算引薦轉換率（目標：70%以上）",
      "整理已成交的商業案例（可於大會分享）",
      "提出意見與行動方案（1-3 項）",
    ],
    targets: ["引薦轉換率 ≥ 70%"],
  },
  {
    memberId: 16, // 劉洛安
    agendaNo: "四",
    agendaTitle: "分會成長及留員狀況",
    duties: [
      "確認分會目前人數（目標：55 人）",
      "統計近 6 個月流失數、申請數、成長數",
      "記錄病假審查、觀察期、行業開放數",
      "統計續約審查：通過 / 有條件 / 未通過",
      "計算來賓數與轉換率（來賓目標：每週12人）",
      "提出意見與行動方案（1-3 項）",
    ],
    targets: ["分會規模 55 人", "保留率 ≥ 70%", "來賓轉換率 ≥ 20%"],
  },
  {
    memberId: 7, // 陳宜寧（秘書）
    agendaNo: "五",
    agendaTitle: "通知信、觀察期及開放行業別",
    duties: [
      "整理第一封通知信名單（列出姓名）",
      "整理第二封通知信名單（列出姓名）",
      "整理第三封通知信名單（列出姓名）",
      "確認觀察期通知書狀態",
      "整理本月行業別開放通知",
      "確認病假通過審查狀況",
    ],
    targets: ["所有通知信準時發出", "觀察期名單即時更新"],
  },
  {
    memberId: 18, // 程韋銘
    agendaNo: "六",
    agendaTitle: "續約及需要輔導的會員",
    duties: [
      "整理本月續約名單（通過 / 有條件 / 未通過）",
      "列出連續 2 週以上紅燈會員名單",
      "為紅燈夥伴準備私下 1-on-1 關懷計畫",
      "提出輔導建議或轉介資源（如需要）",
    ],
    targets: ["紅燈夥伴均需聯繫", "提出具體輔導行動"],
  },
];

function generateCommitteeMessage(member: Member, task: CommitteeTask, meetingMonth: string): string {
  const name = memberName(member);
  const dutyList = task.duties.map((d, i) => `  ${i + 1}. ${d}`).join("\n");
  const targetList = task.targets.map(t => `  ✅ ${t}`).join("\n");

  return `📋【BNI 長溙分會 · 會員委員月會任務通知】
${meetingMonth} 月會

您好，${name} 夥伴！

感謝您擔任會員委員會的重要職責。本次月會您負責報告的項目為：

【第${task.agendaNo}項】${task.agendaTitle}

📌 準備事項：
${dutyList}

🎯 本項目標：
${targetList}

📅 月會時間：請確認分會行事曆
⏰ 請於月會前 2 天完成數據整理，若有疑問歡迎私訊副主席劉家豪。

感謝您的付出與貢獻！
Givers Gain！🌟
── 副主席 劉家豪`;
}

interface TaskCardProps {
  member: Member;
  task: CommitteeTask;
  meetingMonth: string;
  key?: React.Key;
}

function TaskCard({ member, task, meetingMonth }: TaskCardProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const msg = generateCommitteeMessage(member, task, meetingMonth);

  const copy = () => {
    navigator.clipboard.writeText(msg).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const agendaColors: Record<string, string> = {
    "一": "bg-blue-100 text-blue-800 border-blue-200",
    "二": "bg-purple-100 text-purple-800 border-purple-200",
    "三": "bg-amber-100 text-amber-800 border-amber-200",
    "四": "bg-green-100 text-green-800 border-green-200",
    "五": "bg-rose-100 text-rose-800 border-rose-200",
    "六": "bg-orange-100 text-orange-800 border-orange-200",
  };
  const colorClass = agendaColors[task.agendaNo] || "bg-slate-100 text-slate-800 border-slate-200";

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        <div className={`w-10 h-10 rounded-full flex flex-col items-center justify-center font-black text-xs shrink-0 border ${colorClass}`}>
          <span className="text-[10px] leading-none">第</span>
          <span className="text-base leading-none">{task.agendaNo}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-800 text-sm">{memberName(member)}</p>
          <p className="text-xs text-slate-500 truncate">{member.category} ／ {task.agendaTitle}</p>
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

      {/* Task preview */}
      <div className="px-3 pb-2 flex flex-wrap gap-1">
        {task.duties.slice(0, 3).map((d, i) => (
          <span key={i} className="text-[10px] bg-slate-50 border border-slate-100 text-slate-500 px-2 py-0.5 rounded-full truncate max-w-[220px]">
            {d}
          </span>
        ))}
        {task.duties.length > 3 && (
          <span className="text-[10px] text-slate-400 px-1">+{task.duties.length - 3} 項</span>
        )}
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-100">
          <pre className="whitespace-pre-wrap text-xs text-slate-600 bg-slate-50 p-3 rounded-lg font-sans leading-relaxed">
            {msg}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function CommitteeMeetingPanel({ members }: CommitteeMeetingPanelProps) {
  const today = new Date();
  const [meetingMonth, setMeetingMonth] = useState(
    `${today.getFullYear()} 年 ${today.getMonth() + 1} 月`
  );
  const [copiedAll, setCopiedAll] = useState(false);

  const assignedCards = TASK_ASSIGNMENTS.map(task => {
    const member = members.find(m => m.id === task.memberId);
    return member ? { member, task } : null;
  }).filter(Boolean) as { member: Member; task: CommitteeTask }[];

  const copyAll = () => {
    const allMsgs = assignedCards
      .map(({ member, task }) => generateCommitteeMessage(member, task, meetingMonth))
      .join("\n\n─────────────────\n\n");
    navigator.clipboard.writeText(allMsgs).then(() => {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
    });
  };

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-800 via-indigo-900 to-slate-900 rounded-xl p-5 text-white">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-indigo-300" />
          </div>
          <div>
            <h3 className="text-lg font-black">會員委員月會任務分配</h3>
            <p className="text-indigo-200 text-xs">依議程自動指派委員職責，一鍵產生 LINE 通知訊息</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="bg-white/10 px-3 py-1 rounded-full">📋 議程共 6 大項</span>
          <span className="bg-white/10 px-3 py-1 rounded-full">👥 委員 {assignedCards.length} 位</span>
        </div>
      </div>

      {/* Meeting Month + Copy All */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
          <CalendarDays className="w-4 h-4 text-indigo-600 shrink-0" />
          <span className="text-xs text-slate-500 font-bold whitespace-nowrap">月會月份：</span>
          <input
            type="text"
            value={meetingMonth}
            onChange={e => setMeetingMonth(e.target.value)}
            className="text-xs font-bold text-slate-800 bg-transparent outline-none w-40"
            placeholder="例：2026 年 5 月"
          />
        </div>
        <div className="flex-1" />
        <button onClick={copyAll}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            copiedAll ? "bg-green-100 text-green-700 border border-green-300" : "bg-indigo-700 hover:bg-indigo-800 text-white"
          }`}>
          {copiedAll ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copiedAll ? "已複製全部！" : `一次複製全部 ${assignedCards.length} 則任務通知`}
        </button>
      </div>

      {/* Instructions */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-xs text-indigo-800">
        💡 <strong>使用方式：</strong>月會前 3-5 天，點「複製」逐一傳給各委員。各委員依通知整理數據後，於月會上報告。可修改月份後再複製。
      </div>

      {/* Agenda Overview */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <h4 className="text-sm font-black text-slate-800 mb-3">月會議程總覽（士北花東模板）</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { no: "一", title: "會員出席狀況報告", person: "許文婉" },
            { no: "二", title: "參與度報告", person: "崔永疇" },
            { no: "三", title: "商務引薦狀況", person: "劉兆矩" },
            { no: "四", title: "分會成長及留員狀況", person: "劉洛安" },
            { no: "五", title: "通知信、觀察期及開放行業別", person: "陳宜寧（秘書）" },
            { no: "六", title: "續約及需要輔導的會員", person: "程韋銘" },
            { no: "七~十三", title: "事件 / 新行業 / 教育建議 / 主席建議 / 董顧 / 臨時動議", person: "主席 & 副主席 統籌" },
          ].map(({ no, title, person }) => (
            <div key={no} className="flex items-start gap-2 text-xs">
              <span className="font-black text-indigo-600 shrink-0 w-12">第{no}項</span>
              <div>
                <p className="font-bold text-slate-800">{title}</p>
                <p className="text-slate-500">負責：{person}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Task Cards */}
      {assignedCards.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
          請先在「數據輸入」頁面匯入會員資料
        </div>
      ) : (
        <div className="space-y-3">
          {assignedCards.map(({ member, task }) => (
            <TaskCard key={task.memberId} member={member} task={task} meetingMonth={meetingMonth} />
          ))}
        </div>
      )}

      {/* Footer note */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-500">
        📌 <strong>第七至十三項議程</strong>（會員/分會事件、新行業需求、教育建議、主席建議、董顧協助、臨時動議）由副主席劉家豪與主席黃芯慧在月會現場共同主持。
      </div>
    </div>
  );
}
