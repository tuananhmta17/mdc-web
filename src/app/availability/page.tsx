"use client";

import React, { useState, useEffect } from "react";
import { useAppState } from "@/lib/state-context";
import { getDayNameVN } from "@/lib/utils";
import {
  CalendarDays,
  Save,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  Flame,
} from "lucide-react";
import { AvailabilityLevel } from "@/lib/types";

interface SlotState {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  level: AvailabilityLevel;
}

const standardSlots = [
  { start: "08:30", end: "11:00", label: "Sáng (08:30 - 11:00)" },
  { start: "14:00", end: "16:30", label: "Chiều (14:00 - 16:30)" },
  { start: "18:00", end: "20:30", label: "Tối chính (18:00 - 20:30)" },
  { start: "19:00", end: "21:30", label: "Tối muộn (19:00 - 21:30)" },
];

export default function AvailabilityPage() {
  const { data, refresh } = useAppState();
  const session = data.session;

  const myRegisteredDances = data.dances.filter((d) =>
    data.registrations.some((r) => r.dance_id === d.id && r.user_id === session?.user.id)
  );

  const [selectedDanceId, setSelectedDanceId] = useState<string>(
    myRegisteredDances[0]?.id || data.dances[0]?.id || ""
  );

  const [slotsState, setSlotsState] = useState<SlotState[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");

  // Load existing availability for selected dance
  useEffect(() => {
    if (!selectedDanceId) return;

    fetch(`/api/dances/${selectedDanceId}/availability`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!json) return;
        setRecommendations(json.recommendations || []);

        const existingUserSlots = (json.slots || []).filter(
          (s: any) => s.user_id === session?.user.id
        );

        // Build default grid for all days and standard slots
        const initial: SlotState[] = [];
        for (let day = 1; day <= 7; day++) {
          const dayIndex = day === 7 ? 0 : day; // Sunday is 0
          for (const win of standardSlots) {
            const match = existingUserSlots.find(
              (s: any) =>
                s.day_of_week === dayIndex &&
                s.start_time === win.start &&
                s.end_time === win.end
            );
            initial.push({
              dayOfWeek: dayIndex,
              startTime: win.start,
              endTime: win.end,
              level: match ? match.level : "MAYBE",
            });
          }
        }
        setSlotsState(initial);
      })
      .catch((err) => console.error(err));
  }, [selectedDanceId, session?.user.id]);

  const cycleSlotLevel = (dayOfWeek: number, startTime: string, endTime: string) => {
    setSlotsState((prev) =>
      prev.map((s) => {
        if (s.dayOfWeek === dayOfWeek && s.startTime === startTime && s.endTime === endTime) {
          const nextLevel: AvailabilityLevel =
            s.level === "AVAILABLE"
              ? "MAYBE"
              : s.level === "MAYBE"
              ? "UNAVAILABLE"
              : "AVAILABLE";
          return { ...s, level: nextLevel };
        }
        return s;
      })
    );
  };

  const handleSave = async () => {
    if (!selectedDanceId) return;
    setIsSaving(true);
    setFeedbackMsg("");

    try {
      const payloadSlots = slotsState.map((s) => ({
        day_of_week: s.dayOfWeek,
        start_time: s.startTime,
        end_time: s.endTime,
        level: s.level,
      }));

      const res = await fetch(`/api/dances/${selectedDanceId}/availability`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots: payloadSlots }),
      });

      if (!res.ok) throw new Error("Lỗi khi lưu lịch rảnh");

      setFeedbackMsg("Đã lưu lịch rảnh thành công!");
      // Reload recommendations
      const recRes = await fetch(`/api/dances/${selectedDanceId}/availability`);
      if (recRes.ok) {
        const json = await recRes.json();
        setRecommendations(json.recommendations || []);
      }
      await refresh();
    } catch (err: any) {
      setFeedbackMsg(err.message);
    } finally {
      setIsSaving(false);
      setTimeout(() => setFeedbackMsg(""), 4000);
    }
  };

  // Days order: Mon -> Sun (1, 2, 3, 4, 5, 6, 0)
  const displayDays = [1, 2, 3, 4, 5, 6, 0];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <CalendarDays className="w-7 h-7 text-mdc-red" />
            <span>Khai Báo Lịch Rảnh & Bộ Gợi Ý Xếp Lịch</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Chạm vào từng ô để chuyển đổi: <strong>Rảnh (Xanh)</strong> &rarr; <strong>Có thể (Vàng)</strong> &rarr; <strong>Bận (Đỏ)</strong>. Hệ thống sẽ tự động xếp hạng giờ tập tối ưu nhất cho Leader.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-mdc-red hover:bg-mdc-redDark text-xs font-bold text-white transition-all shadow-glowRed active:scale-[0.98] flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? "Đang lưu..." : "Lưu Lịch Rảnh"}</span>
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Routine Selector */}
      <div className="p-4 bg-mdc-surface border border-mdc-border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <Flame className="w-4 h-4 text-mdc-red shrink-0" />
          <span>Bài nhảy bạn đang khai báo lịch:</span>
        </div>

        <select
          value={selectedDanceId}
          onChange={(e) => setSelectedDanceId(e.target.value)}
          className="bg-mdc-card border border-mdc-border rounded-xl px-4 py-2 text-xs text-white font-semibold focus:outline-none focus:border-mdc-red"
        >
          {data.dances.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title} ({d.song_title})
            </option>
          ))}
        </select>
      </div>

      {/* Weekly Interactive Heatmap Grid */}
      <div className="bg-mdc-surface border border-mdc-border rounded-2xl p-5 shadow-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="font-bold text-white uppercase tracking-wider text-[11px]">
            Thời Khóa Biểu Tuần (Bấm Để Đổi Trạng Thái)
          </span>

          {/* Legend */}
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5 text-mdc-emerald font-semibold">
              <span className="w-3 h-3 rounded bg-mdc-emerald" /> Rảnh (Available)
            </span>
            <span className="flex items-center gap-1.5 text-mdc-amber font-semibold">
              <span className="w-3 h-3 rounded bg-mdc-amber" /> Có thể (Maybe)
            </span>
            <span className="flex items-center gap-1.5 text-red-400 font-semibold">
              <span className="w-3 h-3 rounded bg-red-500/40" /> Bận (Unavailable)
            </span>
          </div>
        </div>

        {/* Responsive Table / Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs border-collapse">
            <thead>
              <tr className="border-b border-mdc-border">
                <th className="py-3 px-3 text-left font-mono text-[11px] text-slate-400 uppercase w-36">
                  Khung Giờ
                </th>
                {displayDays.map((day) => (
                  <th key={day} className="py-3 px-2 font-bold text-white text-xs">
                    {getDayNameVN(day)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-mdc-border">
              {standardSlots.map((win) => (
                <tr key={win.start} className="hover:bg-white/5 transition-colors">
                  <td className="py-3 px-3 text-left font-mono text-[11px] text-slate-300 font-semibold">
                    {win.label}
                  </td>
                  {displayDays.map((day) => {
                    const slot = slotsState.find(
                      (s) =>
                        s.dayOfWeek === day &&
                        s.startTime === win.start &&
                        s.endTime === win.end
                    );
                    const level = slot ? slot.level : "MAYBE";

                    return (
                      <td key={day} className="p-1.5">
                        <button
                          type="button"
                          onClick={() => cycleSlotLevel(day, win.start, win.end)}
                          className={`w-full py-2.5 px-2 rounded-xl text-[11px] font-bold transition-all active:scale-[0.96] shadow-sm ${
                            level === "AVAILABLE"
                              ? "bg-mdc-emerald/25 text-mdc-emerald border border-mdc-emerald/50 hover:bg-mdc-emerald/35"
                              : level === "MAYBE"
                              ? "bg-mdc-amber/20 text-mdc-amber border border-mdc-amber/40 hover:bg-mdc-amber/30"
                              : "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
                          }`}
                        >
                          {level === "AVAILABLE" ? "RẢNH" : level === "MAYBE" ? "CÓ THỂ" : "BẬN"}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Smart Scheduler Recommender Widget */}
      <div className="bg-mdc-surface border border-mdc-border rounded-2xl p-6 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-mdc-red" />
              <span>Gợi Ý Khung Giờ Tập Tối Ưu Cho Bài Nhảy Này</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Tính toán dựa trên lịch rảnh của tất cả vũ công đã đăng ký, ưu tiên sự có mặt của Leader và tránh xung đột với buổi tập khác.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {recommendations.slice(0, 3).map((rec, i) => (
            <div
              key={`${rec.dayOfWeek}-${rec.startTime}`}
              className={`p-4 rounded-xl border flex flex-col justify-between space-y-2 ${
                i === 0
                  ? "bg-mdc-red/15 border-mdc-red shadow-glowRed"
                  : "bg-mdc-card border-mdc-border"
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded ${
                    i === 0 ? "bg-mdc-red text-white" : "bg-white/10 text-slate-300"
                  }`}>
                    GỢI Ý #{rec.recommendationRank}
                  </span>
                  <span className="font-extrabold text-white font-mono">{rec.score} pts</span>
                </div>
                <div className="font-bold text-white text-sm">{rec.dayName}</div>
                <div className="text-xs text-slate-300 font-mono mt-0.5">
                  {rec.startTime} - {rec.endTime}
                </div>
              </div>

              <div className="text-[11px] text-slate-400 space-y-1 pt-2 border-t border-mdc-border">
                <div>&bull; <span className="text-mdc-emerald font-semibold">{rec.availableUsers.length} người Rảnh</span></div>
                <div>&bull; <span className="text-mdc-amber font-semibold">{rec.maybeUsers.length} người Có thể</span></div>
                <div>&bull; {rec.isLeaderAvailable ? <span className="text-mdc-emerald">&check; Leader có mặt</span> : <span className="text-red-400">&cross; Leader bận</span>}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
