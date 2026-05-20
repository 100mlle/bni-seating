import React, { useState, useEffect } from "react";
import { Member, ChapterGoals } from "../types";
import { defaultMembers, defaultCommitteeText } from "../data";
import { 
  Users, 
  Settings, 
  Plus, 
  Trash2, 
  RefreshCw, 
  FileText, 
  Award, 
  Target, 
  ShieldCheck,
  Briefcase
} from "lucide-react";

interface MemberEditorProps {
  members: Member[];
  onChangeMembers: (members: Member[]) => void;
  committeeText: string;
  onChangeCommitteeText: (text: string) => void;
  goals: ChapterGoals;
  onChangeGoals: (goals: ChapterGoals) => void;
  stage: string;
  onChangeStage: (stage: string) => void;
  weekTitle: string;
  onChangeWeekTitle: (title: string) => void;
}

export default function MemberEditor({
  members,
  onChangeMembers,
  committeeText,
  onChangeCommitteeText,
  goals,
  onChangeGoals,
  stage,
  onChangeStage,
  weekTitle,
  onChangeWeekTitle
}: MemberEditorProps) {
  const [csvText, setCsvText] = useState("");
  const [showCsvHelp, setShowCsvHelp] = useState(false);

  // Sync CSV textarea with state initially
  useEffect(() => {
    const csvLines = members.map(m => 
      `${m.name},${m.category},${m.role},${m.attendance},${m.oneToOne},${m.referrals},${m.visitors},${m.renewal}`
    );
    setCsvText(csvLines.join("\n"));
  }, [members]);

  const handleGoalChange = (field: keyof ChapterGoals, value: number) => {
    onChangeGoals({
      ...goals,
      [field]: value
    });
  };

  const handleAddMember = () => {
    const newId = members.length > 0 ? Math.max(...members.map(m => m.id)) + 1 : 1;
    const newMember: Member = {
      id: newId,
      name: `新會員 ${newId}`,
      category: "未命名產業",
      role: "夥伴會員",
      attendance: "出席",
      oneToOne: 0,
      referrals: 0,
      visitors: 0,
      renewal: "未到期"
    };
    onChangeMembers([...members, newMember]);
  };

  const handleRemoveMember = (id: number) => {
    onChangeMembers(members.filter(m => m.id !== id));
  };

  const handleUpdateMemberField = (id: number, field: keyof Member, value: any) => {
    onChangeMembers(members.map(m => {
      if (m.id === id) {
        return { ...m, [field]: value };
      }
      return m;
    }));
  };

  const handleParseCsv = () => {
    try {
      const parsed: Member[] = csvText
        .split("\n")
        .map(line => line.trim())
        .filter(Boolean)
        .map((line, index) => {
          const parts = line.split(",").map(part => part.trim());
          if (parts.length < 2) return null;
          const [name, category, role, attendance, oneToOne, referrals, visitors, renewal] = parts;
          return {
            id: index + 1,
            name: name || `會員 ${index + 1}`,
            category: category || "未命名產業",
            role: role || "夥伴會員",
            attendance: (attendance === "出席" || attendance === "缺席" || attendance === "請假") ? attendance : "出席",
            oneToOne: Number(oneToOne) || 0,
            referrals: Number(referrals) || 0,
            visitors: Number(visitors) || 0,
            renewal: (renewal === "已續約" || renewal === "未到期" || renewal === "待追蹤" || renewal === "需要關懷") ? renewal : "未到期"
          } as Member;
        })
        .filter((m): m is Member => m !== null);

      if (parsed.length > 0) {
        onChangeMembers(parsed);
      } else {
        alert("無法解析任何會員資料，請檢查 CSV 格式是否正確！");
      }
    } catch (err) {
      alert("解析 CSV 格式錯誤，請確認逗號分隔完整！");
    }
  };

  const loadDefaultData = () => {
    if (confirm("確認要重設為預設的 BNI 分會範例資料嗎？這將覆蓋您目前所做的修改。")) {
      onChangeMembers(defaultMembers);
      onChangeGoals({
        memberTarget: 35,
        visitorTarget: 10,
        applicationTarget: 3,
        oneToOneTarget: 60,
        referralTarget: 90,
        absenceWarningRate: 10,
        kpi121PerMember: 1,
        kpiReferralPerMember: 1
      });
      onChangeCommitteeText(defaultCommitteeText);
      onChangeWeekTitle("第 1 週｜副主席會後會數據追蹤");
    }
  };

  return (
    <div className="space-y-6" id="member-editor-container">
      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Card: Basic presentation information & Chapter Stage */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Settings className="w-5 h-5 text-rose-700" />
            <h3 className="font-bold text-slate-800 text-lg">簡報設定與管理階段</h3>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">會後會簡報標題</label>
              <input
                type="text"
                value={weekTitle}
                onChange={(e) => onChangeWeekTitle(e.target.value)}
                placeholder="例如：第 1 週｜副主席會後會數據追蹤"
                className="mt-1 block w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:border-rose-700 focus:ring-1 focus:ring-rose-700 outline-none transition"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">會員委員會管理階段</label>
              <select
                value={stage}
                onChange={(e) => onChangeStage(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:border-rose-700 focus:outline-none focus:ring-1 focus:ring-rose-700"
              >
                <option value="stage1">第一階段：只公佈整體數據 (不公布姓名)</option>
                <option value="stage2">第二階段：表揚公佈達標者 (不提未達標)</option>
                <option value="stage3">第三階段：連續未達標者私下關懷與暖心輔導</option>
              </select>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                {stage === "stage1" && "💡 適用於會期剛開始或重整體質時。公開場合只看團隊總目標，避免給個別夥伴帶來負面壓力，旨在培養健康的數據習慣。"}
                {stage === "stage2" && "💡 表揚與激勵策略。公开表彰達標的綠燈會員，建立渴望成功的氛圍，利用榮譽感驅動內循環121及引薦。"}
                {stage === "stage3" && "💡 回應與托底策略。連續兩週以上為達標燈號者，不作公開責備，由會委會以一對一形式提供商業資源與教練式協助。"}
              </p>
            </div>
          </div>
        </div>

        {/* Middle Card: Chapter Targets */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-slate-800 text-lg font-sans">本會期 & 本週營運目標</h3>
            </div>
            <button
              onClick={loadDefaultData}
              className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold rounded-xl border border-amber-200/50 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              重設範例數據
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">會員人數目標</label>
              <input
                type="number"
                min="1"
                value={goals.memberTarget}
                onChange={(e) => handleGoalChange("memberTarget", Number(e.target.value))}
                className="mt-1 block w-full px-3 py-1.5 border border-slate-200 rounded-xl text-sm focus:border-rose-700 focus:ring-1 focus:ring-rose-700 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">本週來賓目標</label>
              <input
                type="number"
                min="0"
                value={goals.visitorTarget}
                onChange={(e) => handleGoalChange("visitorTarget", Number(e.target.value))}
                className="mt-1 block w-full px-3 py-1.5 border border-slate-200 rounded-xl text-sm focus:border-rose-700 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">本週申請書目標</label>
              <input
                type="number"
                min="0"
                value={goals.applicationTarget}
                onChange={(e) => handleGoalChange("applicationTarget", Number(e.target.value))}
                className="mt-1 block w-full px-3 py-1.5 border border-slate-200 rounded-xl text-sm focus:border-rose-700 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">缺席警戒率 (%)</label>
              <input
                type="number"
                min="1"
                max="100"
                value={goals.absenceWarningRate}
                onChange={(e) => handleGoalChange("absenceWarningRate", Number(e.target.value))}
                className="mt-1 block w-full px-3 py-1.5 border border-slate-200 rounded-xl text-sm focus:border-rose-700 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">本週 121 總目標</label>
              <input
                type="number"
                min="0"
                value={goals.oneToOneTarget}
                onChange={(e) => handleGoalChange("oneToOneTarget", Number(e.target.value))}
                className="mt-1 block w-full px-3 py-1.5 border border-slate-200 rounded-xl text-sm focus:border-rose-700 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">本週引薦總目標</label>
              <input
                type="number"
                min="0"
                value={goals.referralTarget}
                onChange={(e) => handleGoalChange("referralTarget", Number(e.target.value))}
                className="mt-1 block w-full px-3 py-1.5 border border-slate-200 rounded-xl text-sm focus:border-rose-700 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 block font-sans">
                🟢 個人 121 標準 (週)
              </label>
              <input
                type="number"
                min="0"
                value={goals.kpi121PerMember}
                onChange={(e) => handleGoalChange("kpi121PerMember", Number(e.target.value))}
                className="mt-1 block w-full px-3 py-1.5 border border-slate-200 rounded-xl text-sm bg-green-50/40 text-green-800 font-bold focus:border-green-600 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 block font-sans">
                🟢 個人引薦標準 (週)
              </label>
              <input
                type="number"
                min="0"
                value={goals.kpiReferralPerMember}
                onChange={(e) => handleGoalChange("kpiReferralPerMember", Number(e.target.value))}
                className="mt-1 block w-full px-3 py-1.5 border border-slate-200 rounded-xl text-sm bg-green-50/40 text-green-800 font-bold focus:border-green-600 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* CSV importer & Committee Assignment side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* CSV importer (3/5 width) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-800 text-lg">快速批次導入 CSV 格式</h3>
            </div>
            <button
              onClick={() => setShowCsvHelp(!showCsvHelp)}
              className="text-indigo-600 text-xs font-semibold hover:underline"
            >
              {showCsvHelp ? "隱藏說明" : "顯示欄位格式說明"}
            </button>
          </div>

          {showCsvHelp && (
            <div className="bg-indigo-50/50 rounded-xl p-3 text-xs text-indigo-950/80 leading-relaxed border border-indigo-100">
              <span className="font-bold">正確欄位格式 (無表頭)</span>：<br />
              <code className="bg-white px-1.5 py-0.5 rounded border border-indigo-200/60 block my-1 font-mono">
                姓名, 產業類別, 會會角色, 出席狀態(出席/請假/缺席), 121次數, 引薦數, 帶來賓數, 續約狀態(已續約/未到期/待追蹤/需要關懷)
              </code>
              <span className="text-slate-500">例如：</span>陳小華, 室內設計, 夥伴會員, 出席, 2, 3, 1, 已續約
            </div>
          )}

          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            className="w-full h-40 p-3 border border-slate-200 rounded-xl text-sm font-mono focus:border-indigo-600 outline-none bg-slate-50/40 focus:bg-white transition"
            placeholder="王小明,水電工程,會員委員會,出席,2,3,1,已續約"
          />

          <div className="flex justify-end">
            <button
              onClick={handleParseCsv}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-sm hover:shadow transition cursor-pointer"
            >
              解析並匯入上方會員
            </button>
          </div>
        </div>

        {/* Committee roles list (2/5 width) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-800 text-lg">會員委員會幹部名單</h3>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">
              逐行輸入專員分工 (每行一個職位)：
            </label>
            <textarea
              value={committeeText}
              onChange={(e) => onChangeCommitteeText(e.target.value)}
              className="w-full h-40 p-3 border border-slate-200 rounded-xl text-sm bg-slate-50/40 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition"
              placeholder="副主席：劉家豪&#10;出席專員：王小明&#10;來賓專員：陳小華..."
            />
          </div>
          <p className="text-xs text-slate-400 leading-normal">
            💡 幹部包含出席、來賓、續約、121 引薦專員等，數據在簡報中將分配給個別專員進行戰術關懷報告。
          </p>
        </div>
      </div>

      {/* Main spreadsheet grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-rose-800" />
            <h3 className="font-bold text-slate-800 text-lg">
              會員數據明細編輯架構 ({members.length} 位)
            </h3>
          </div>
          <button
            onClick={handleAddMember}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-800 hover:bg-rose-900 text-white text-sm font-bold rounded-xl shadow-sm hover:shadow transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            新增學長/姊
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-slate-100/50 text-slate-500 border-b border-slate-100 font-semibold">
                <th className="px-4 py-3 text-center w-12">KPI 燈號</th>
                <th className="px-4 py-3">姓名</th>
                <th className="px-4 py-3">產業別</th>
                <th className="px-4 py-3 w-36">分會角色/頭銜</th>
                <th className="px-4 py-3 w-32">出席狀態</th>
                <th className="px-4 py-3 text-center w-28">121 次數</th>
                <th className="px-4 py-3 text-center w-28">給引薦數</th>
                <th className="px-4 py-3 text-center w-28">帶來賓數</th>
                <th className="px-4 py-3 w-36">續約狀態</th>
                <th className="px-4 py-3 text-center w-16">刪除</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-slate-400">
                    目前無會員資料，您可以點擊右上方「新增學長/姊」或點擊「重設範例數據」來開始！
                  </td>
                </tr>
              ) : (
                members.map((m) => {
                  // Calculate traffic light
                  const isGreen = m.oneToOne >= goals.kpi121PerMember && m.referrals >= goals.kpiReferralPerMember;
                  const isYellow = m.oneToOne > 0 || m.referrals > 0;
                  const lamp = isGreen ? "🟢 優秀" : isYellow ? "🟡 補強" : "🔴 警示";
                  const lampColor = isGreen ? "text-green-600 bg-green-50" : isYellow ? "text-amber-600 bg-amber-50" : "text-rose-600 bg-rose-50";

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Traffic Light */}
                      <td className="px-4 py-2.5 text-center">
                        <span className={`inline-flex px-1.5 py-0.5 rounded-full text-xs font-bold leading-none ${lampColor}`}>
                          {lamp}
                        </span>
                      </td>

                      {/* Name */}
                      <td className="px-4 py-2.5">
                        <input
                          type="text"
                          value={m.name}
                          onChange={(e) => handleUpdateMemberField(m.id, "name", e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200/65 rounded-lg text-sm font-semibold focus:border-rose-700 outline-none"
                        />
                      </td>

                      {/* Category */}
                      <td className="px-4 py-2.5">
                        <input
                          type="text"
                          value={m.category}
                          onChange={(e) => handleUpdateMemberField(m.id, "category", e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200/65 rounded-lg text-sm focus:border-rose-700 outline-none"
                          placeholder="例如：智慧家居"
                        />
                      </td>

                      {/* Role/Role Title */}
                      <td className="px-4 py-2.5">
                        <input
                          type="text"
                          value={m.role}
                          onChange={(e) => handleUpdateMemberField(m.id, "role", e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200/65 rounded-lg text-sm focus:border-rose-700 outline-none text-slate-600"
                          placeholder="例如：夥伴會員"
                        />
                      </td>

                      {/* Attendance */}
                      <td className="px-4 py-2.5">
                        <select
                          value={m.attendance}
                          onChange={(e) => handleUpdateMemberField(m.id, "attendance", e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded-lg text-sm bg-white focus:border-rose-700 outline-none"
                        >
                          <option value="出席">出席</option>
                          <option value="請假">請假</option>
                          <option value="缺席">缺席</option>
                        </select>
                      </td>

                      {/* 1 to 1s */}
                      <td className="px-4 py-2.5 text-center">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleUpdateMemberField(m.id, "oneToOne", Math.max(0, m.oneToOne - 1))}
                            className="p-1 hover:bg-slate-100 rounded text-slate-500 font-bold"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={m.oneToOne}
                            onChange={(e) => handleUpdateMemberField(m.id, "oneToOne", Math.max(0, Number(e.target.value)))}
                            className="w-10 text-center font-semibold text-slate-800 bg-transparent"
                          />
                          <button
                            onClick={() => handleUpdateMemberField(m.id, "oneToOne", m.oneToOne + 1)}
                            className="p-1 hover:bg-slate-100 rounded text-slate-500 font-bold"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* Referrals */}
                      <td className="px-4 py-2.5 text-center">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleUpdateMemberField(m.id, "referrals", Math.max(0, m.referrals - 1))}
                            className="p-1 hover:bg-slate-100 rounded text-slate-500 font-bold"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={m.referrals}
                            onChange={(e) => handleUpdateMemberField(m.id, "referrals", Math.max(0, Number(e.target.value)))}
                            className="w-10 text-center font-semibold text-slate-800 bg-transparent"
                          />
                          <button
                            onClick={() => handleUpdateMemberField(m.id, "referrals", m.referrals + 1)}
                            className="p-1 hover:bg-slate-100 rounded text-slate-500 font-bold"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* Visitors */}
                      <td className="px-4 py-2.5 text-center">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleUpdateMemberField(m.id, "visitors", Math.max(0, m.visitors - 1))}
                            className="p-1 hover:bg-slate-100 rounded text-slate-500 font-bold"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={m.visitors}
                            onChange={(e) => handleUpdateMemberField(m.id, "visitors", Math.max(0, Number(e.target.value)))}
                            className="w-10 text-center font-semibold text-slate-800 bg-transparent"
                          />
                          <button
                            onClick={() => handleUpdateMemberField(m.id, "visitors", m.visitors + 1)}
                            className="p-1 hover:bg-slate-100 rounded text-slate-500 font-bold"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* Renew status */}
                      <td className="px-4 py-2.5">
                        <select
                          value={m.renewal}
                          onChange={(e) => handleUpdateMemberField(m.id, "renewal", e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded-lg text-sm bg-white focus:border-rose-700 outline-none"
                        >
                          <option value="已續約">已續約</option>
                          <option value="未到期">未到期</option>
                          <option value="待追蹤">待追蹤</option>
                          <option value="需要關懷">需要關懷</option>
                        </select>
                      </td>

                      {/* Trash action */}
                      <td className="px-4 py-2.5 text-center">
                        <button
                          onClick={() => handleRemoveMember(m.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition cursor-pointer"
                          title="刪除此會員"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
