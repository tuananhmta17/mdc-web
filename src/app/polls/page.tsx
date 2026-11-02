"use client";

import React, { useState } from "react";
import Link from "next/link";
import { apiRequest, useAppState } from "@/lib/state-context";
import { formatVNDateTime } from "@/lib/utils";
import {
  Vote,
  Plus,
  Lock,
  Globe2,
  Clock,
  CheckCircle2,
  Download,
  AlertCircle,
  Music2,
  Sparkles,
} from "lucide-react";

export default function PollsPage() {
  const { data, refresh } = useAppState();
  const session = data.session;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scope, setScope] = useState<"DANCE_ONLY" | "ALL_CLUB">("DANCE_ONLY");
  const [selectedDanceIds, setSelectedDanceIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [busyRound, setBusyRound] = useState("");
  const [endAt, setEndAt] = useState("");
  const [hideResults, setHideResults] = useState(false);

  const canManage = session?.isBoardAdmin || session?.isDanceHead;

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError("");
    if (selectedDanceIds.length < 2) {
      setActionError("Cần chọn ít nhất 2 bài nhảy để mở đợt bình chọn");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiRequest("/api/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          scope,
          dance_ids: selectedDanceIds,
          end_at: endAt ? new Date(`${endAt}:00+07:00`).toISOString() : undefined,
          result_visibility: hideResults ? "HIDDEN_UNTIL_CLOSED" : "PUBLIC",
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Lỗi tạo đợt bình chọn");
      }

      setShowCreateModal(false);
      setTitle("");
      setDescription("");
      setSelectedDanceIds([]);
      await refresh();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVote = async (roundId: string, optionId: string) => {
    if (busyRound) return;
    setBusyRound(roundId);
    setActionError("");
    try {
      const res = await apiRequest(`/api/polls/${roundId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ option_id: optionId }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Không thể bỏ phiếu");
      }

      await refresh();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setBusyRound("");
    }
  };

  const closeRound = async (id: string, winner?: string) => {
    if (busyRound) return;
    setBusyRound(id); setActionError("");
    try { await apiRequest(`/api/polls/${id}/close`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ winning_dance_id: winner }) }); await refresh(); }
    catch (err) { setActionError(err instanceof Error ? err.message : "Không thể đóng bình chọn."); }
    finally { setBusyRound(""); }
  };

  const toggleSelectDance = (danceId: string) => {
    if (selectedDanceIds.includes(danceId)) {
      setSelectedDanceIds(selectedDanceIds.filter((id) => id !== danceId));
    } else {
      setSelectedDanceIds([...selectedDanceIds, danceId]);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <Vote className="w-7 h-7 text-mdc-amber" />
            <span>Bình Chọn Bài Nhảy & Tiết Mục Biểu Diễn</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Mở bình chọn dân chủ cho Ban Chuyên môn hoặc toàn thể CLB trước khi chốt biên đạo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {data.pollRounds.length > 0 && (
            <a
              href={`/api/export?type=poll&pollId=${data.pollRounds[0].id}`}
              download
              className="px-4 py-2 rounded-xl bg-mdc-card hover:bg-mdc-cardHover border border-mdc-border text-xs font-semibold text-slate-200 transition-all flex items-center gap-2"
            >
              <Download className="w-4 h-4 text-mdc-amber" />
              <span>Xuất Kết Quả CSV</span>
            </a>
          )}

          {canManage && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-xl bg-mdc-red hover:bg-mdc-redDark text-xs font-semibold text-white transition-all flex items-center gap-2 shadow-glowRed active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Mở Đợt Vote Mới</span>
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Rounds List */}
      <div className="space-y-6">
        {data.pollRounds.length === 0 ? (
          <div className="p-12 text-center bg-mdc-surface border border-mdc-border rounded-2xl text-slate-400 text-sm">
            Hiện chưa có đợt bình chọn nào được mở.
          </div>
        ) : (
          data.pollRounds.map((round) => {
            const options = data.pollOptions.filter((o) => o.round_id === round.id);
            const votes = data.votes.filter((v) => v.round_id === round.id);
            const totalVotes = votes.length;
            const showResults = canManage || round.result_visibility === "PUBLIC" || round.status !== "OPEN";
            const withinWindow = Date.now() >= Date.parse(round.start_at) && Date.now() < Date.parse(round.end_at);
            const myVote = votes.find((v) => v.user_id === session?.user.id);

            const isDanceAffiliated =
              session?.isBoardAdmin ||
              session?.isDanceHead ||
              session?.roles.includes("DANCE_LEADER") ||
              session?.roles.includes("DANCE_MEMBER") ||
              session?.primaryDepartment?.code === "DANCE";
            const canUserVote = round.scope === "ALL_CLUB" || isDanceAffiliated;

            return (
              <div
                key={round.id}
                className="bg-mdc-surface border border-mdc-border rounded-2xl p-6 shadow-card space-y-5"
              >
                {/* Round Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-mdc-border">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                        round.scope === "ALL_CLUB"
                          ? "bg-mdc-cyan/20 text-mdc-cyan"
                          : "bg-mdc-red/20 text-mdc-red"
                      }`}>
                        {round.scope === "ALL_CLUB" ? (
                          <>
                            <Globe2 className="w-3 h-3" /> Mở toàn CLB
                          </>
                        ) : (
                          <>
                            <Lock className="w-3 h-3" /> Nội bộ Ban Chuyên Môn
                          </>
                        )}
                      </span>
                      <span className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded ${
                        round.status === "OPEN"
                          ? "bg-mdc-emerald/20 text-mdc-emerald"
                          : "bg-white/10 text-slate-400"
                      }`}>
                        {round.status}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-white">{round.title}</h2>
                    <p className="text-xs text-slate-400">{round.description}</p>
                  </div>

                  <div className="text-left sm:text-right shrink-0 text-xs text-slate-400 space-y-0.5">
                    <div>{showResults ? <>Tổng số phiếu: <strong className="text-white font-mono text-sm">{totalVotes}</strong></> : "Kết quả công bố sau khi đóng bình chọn"}</div>
                    <div className="text-[11px]">Hạn vote: {formatVNDateTime(round.end_at)}</div>
                    {canManage && round.status === "OPEN" && <button disabled={busyRound === round.id} onClick={() => void closeRound(round.id)} className="text-mdc-red pt-2 font-semibold">Đóng bình chọn</button>}
                  </div>
                </div>

                {/* Candidate Options Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {options.map((option) => {
                    const dance = data.dances.find((d) => d.id === option.dance_id);
                    const optionVotes = votes.filter((v) => v.option_id === option.id).length;
                    const percent = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;
                    const isVotedByMe = myVote?.option_id === option.id;

                    return (
                      <div
                        key={option.id}
                        className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3 ${
                          isVotedByMe
                            ? "bg-mdc-red/10 border-mdc-red shadow-glowRed"
                            : "bg-mdc-card border-mdc-border hover:border-white/20"
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-mono text-[10px] text-slate-400">{dance?.code}</span>
                            {isVotedByMe && (
                              <span className="text-mdc-red font-bold text-[11px] flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Lựa chọn của bạn
                              </span>
                            )}
                          </div>

                          <h3 className="font-extrabold text-sm text-white">{dance?.title}</h3>
                          <div className="text-xs text-slate-300 flex items-center gap-1.5">
                            <Music2 className="w-3.5 h-3.5 text-mdc-red" />
                            <span>{dance?.song_title}</span>
                          </div>
                        </div>

                        {/* Progress Bar & Voting Button */}
                        <div className="space-y-2 pt-2 border-t border-mdc-border">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400 font-mono">{showResults ? `${optionVotes} phiếu` : "Chưa công bố"}</span>
                            <span className="font-bold text-white font-mono">{showResults ? `${percent}%` : "—"}</span>
                          </div>

                          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-mdc-crimson to-mdc-red transition-all duration-500"
                              style={{ width: showResults ? `${percent}%` : "0%" }}
                            />
                          </div>

                          {round.status === "OPEN" && withinWindow && (
                            <button
                              onClick={() => handleVote(round.id, option.id)}
                              disabled={!canUserVote || busyRound === round.id}
                              className={`w-full py-2 rounded-xl text-xs font-bold transition-all active:scale-[0.98] ${
                                isVotedByMe
                                  ? "bg-mdc-red text-white shadow-glowRed"
                                  : canUserVote
                                  ? "bg-white/10 hover:bg-mdc-red hover:text-white text-slate-200"
                                  : "bg-white/5 text-slate-500 cursor-not-allowed"
                              }`}
                            >
                              {!canUserVote
                                ? "Không thuộc đối tượng bình chọn (Ban Media)"
                                : isVotedByMe
                                ? "Đã bình chọn bài này"
                                : myVote
                                ? "Đổi sang bài này"
                                : "Bình Chọn Bài Này"}
                            </button>
                          )}
                          {canManage && round.status === "CLOSED" && <button disabled={busyRound === round.id} onClick={() => void closeRound(round.id, option.dance_id)} className="secondary-button w-full justify-center">Chốt bài này</button>}
                          {round.winning_dance_id === option.dance_id && <p className="text-xs font-semibold text-mdc-emerald">Tiết mục được chọn</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Poll Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-mdc-surface border border-mdc-border rounded-2xl p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-mdc-border">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Vote className="w-5 h-5 text-mdc-amber" />
                <span>Mở Đợt Bình Chọn Mới</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreatePoll} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Tiêu Đề Đợt Vote *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Bình chọn tiết mục Showcase tháng 12"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-mdc-card border border-mdc-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-mdc-red"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Mô Tả</label>
                <textarea
                  rows={2}
                  placeholder="Mô tả mục đích, tiêu chí lựa chọn..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-mdc-card border border-mdc-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-mdc-red"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Phạm Vi Tham Gia Bỏ Phiếu</label>
                <select
                  value={scope}
                  onChange={(e) => { setScope(e.target.value as any); setSelectedDanceIds([]); }}
                  className="w-full bg-mdc-card border border-mdc-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-mdc-red"
                >
                  <option value="DANCE_ONLY">Chỉ Ban Chuyên Môn (DANCE_ONLY)</option>
                  <option value="ALL_CLUB">Toàn Thể CLB (ALL_CLUB)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Chọn Các Bài Ứng Viên (Tối thiểu 2 bài) *</label>
                <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-mdc-card rounded-xl border border-mdc-border">
                  {data.dances.filter(d => scope !== "ALL_CLUB" || d.visibility === "ALL_CLUB").map((dance) => {
                    const isSelected = selectedDanceIds.includes(dance.id);
                    return (
                      <div
                        key={dance.id}
                        onClick={() => toggleSelectDance(dance.id)}
                        className={`p-2 rounded-lg cursor-pointer flex items-center justify-between text-xs transition-colors ${
                          isSelected ? "bg-mdc-red/20 text-white border border-mdc-red/40" : "hover:bg-white/5 text-slate-300"
                        }`}
                      >
                        <div>
                          <div className="font-semibold">{dance.title}</div>
                          <div className="text-[11px] text-slate-400">{dance.song_title}</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          readOnly
                          className="rounded text-mdc-red"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div><label htmlFor="poll-end" className="field-label">Hạn bình chọn (giờ Việt Nam)</label><input id="poll-end" type="datetime-local" value={endAt} onChange={e => setEndAt(e.target.value)} className="field-input" /></div>
              <label className="flex items-center gap-2 text-slate-300"><input type="checkbox" checked={hideResults} onChange={e => setHideResults(e.target.checked)} />Ẩn kết quả đến khi đóng bình chọn</label>
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-mdc-border">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-mdc-card text-slate-400 hover:text-white font-semibold transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-mdc-red hover:bg-mdc-redDark text-white font-semibold shadow-glowRed transition-all active:scale-[0.98]"
                >
                  {isSubmitting ? "Đang mở vote..." : "Phát Động Bình Chọn"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
