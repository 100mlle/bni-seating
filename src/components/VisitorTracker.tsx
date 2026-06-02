import React, { useState, useEffect } from "react";
import { UserCheck, Trash2 } from "lucide-react";

interface VisitorRecord {
  id: string;
  date: string;
  visitorName: string;
  broughtBy: string;
  status: "pending" | "applied" | "declined" | "followup";
  notes: string;
}

const STATUS_LABELS: Record<VisitorRecord["status"], string> = {
  pending: "待追蹤",
  applied: "✅ 已申請入會",
  declined: "❌ 不感興趣",
  followup: "🔄 持續聯繫中",
};

const STATUS_COLORS: Record<VisitorRecord["status"], string> = {
  pending: "bg-slate-100 text-slate-600",
  applied: "bg-green-100 text-green-700",
  declined: "bg-red-50 text-red-600",
  followup: "bg-amber-50 text-amber-700",
};

const STORAGE_KEY = "bni_visitor_tracker";

function load(): VisitorRecord[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function save(data: VisitorRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

interface VisitorTrackerProps {
  memberNames: string[];
}

export default function VisitorTracker({ memberNames }: VisitorTrackerProps) {
  const [records, setRecords] = useState<VisitorRecord[]>(load);
  const [form, setForm] = useState({ visitorName: "", broughtBy: "", notes: "", date: new Date().toISOString().split("T")[0] });
  const [adding, setAdding] = useState(false);

  useEffect(() => { save(records); }, [records]);

  const add = () => {
    if (!form.visitorName.trim() || !form.broughtBy.trim()) return;
    setRecords(prev => [{
      id: Date.now().toString(),
      date: form.date,
      visitorName: form.visitorName.trim(),
      broughtBy: form.broughtBy.trim(),
      status: "pending",
      notes: form.notes.trim(),
    }, ...prev]);
    setForm({ visitorName: "", broughtBy: "", notes: "", date: new Date().toISOString().split("T")[0] });
    setAdding(false);
  };

  const updateStatus = (id: string, status: VisitorRecord["status"]) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  const remove = (id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id));
  };

  const counts = {
    pending: records.filter(r => r.status === "pending").length,
    applied: records.filter(r => r.status === "applied").length,
    followup: records.filter(r => r.status === "followup").length,
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-700 to-teal-900 rounded-xl p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <UserCheck className="w-4 h-4 text-teal-300" />
              <span className="font-black text-sm">來賓轉換追蹤</span>
            </div>
            <p className="text-teal-200 text-xs">追蹤來賓後續狀態，提高入會轉換率</p>
          </div>
          <div className="flex gap-3 text-center">
            <div><p className="text-lg font-black text-teal-200">{counts.pending}</p><p className="text-[10px] text-teal-300">待追蹤</p></div>
            <div><p className="text-lg font-black text-green-300">{counts.applied}</p><p className="text-[10px] text-teal-300">已申請</p></div>
            <div><p className="text-lg font-black text-amber-300">{counts.followup}</p><p className="text-[10px] text-teal-300">聯繫中</p></div>
          </div>
        </div>
      </div>

      {/* Add button */}
      {!adding ? (
        <button onClick={() => setAdding(true)}
          className="w-full py-2.5 border-2 border-dashed border-slate-300 rounded-xl text-sm text-slate-500 hover:border-teal-400 hover:text-teal-600 transition cursor-pointer font-semibold">
          + 新增來賓記錄
        </button>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
          <p className="font-bold text-slate-800 text-sm">新增來賓記錄</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 font-semibold">來賓姓名</label>
              <input value={form.visitorName} onChange={e => setForm(f => ({ ...f, visitorName: e.target.value }))}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:border-teal-500 outline-none" placeholder="來賓姓名" />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-semibold">由誰帶來</label>
              <select value={form.broughtBy} onChange={e => setForm(f => ({ ...f, broughtBy: e.target.value }))}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:border-teal-500 outline-none">
                <option value="">選擇會員</option>
                {memberNames.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 font-semibold">來訪日期</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:border-teal-500 outline-none" />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-semibold">備注</label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:border-teal-500 outline-none" placeholder="產業、興趣等…" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={add} className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl cursor-pointer transition">新增</button>
            <button onClick={() => setAdding(false)} className="px-4 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl cursor-pointer">取消</button>
          </div>
        </div>
      )}

      {/* Records */}
      {records.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm">尚無來賓記錄，點上方按鈕新增</div>
      ) : (
        <div className="space-y-2">
          {records.map(r => (
            <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-800 text-sm">{r.visitorName}</span>
                  <span className="text-xs text-slate-400">由 {r.broughtBy} 帶來</span>
                  <span className="text-xs text-slate-300">{r.date}</span>
                </div>
                {r.notes && <p className="text-xs text-slate-500 mt-0.5">{r.notes}</p>}
              </div>
              <select value={r.status} onChange={e => updateStatus(r.id, e.target.value as VisitorRecord["status"])}
                className={`text-xs font-bold px-2 py-1 rounded-lg border-0 cursor-pointer ${STATUS_COLORS[r.status]}`}>
                {(Object.keys(STATUS_LABELS) as VisitorRecord["status"][]).map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
              <button onClick={() => remove(r.id)} className="text-slate-300 hover:text-red-400 cursor-pointer transition">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
