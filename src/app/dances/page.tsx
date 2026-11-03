"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { apiRequest, useAppState } from "@/lib/state-context";
import { formatVNDate } from "@/lib/utils";
import {
  Flame,
  Plus,
  Music2,
  Video,
  Users,
  Calendar,
  Lock,
  Globe2,
  Sparkles,
  Search,
} from "lucide-react";

export default function DancesPage() {
  const { data, refresh } = useAppState();
  const session = data.session;

  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterScope, setFilterScope] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New dance form state
  const [title, setTitle] = useState("");
  const [songTitle, setSongTitle] = useState("");
  const [description, setDescription] = useState("");
  const [musicUrl, setMusicUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [leaderId, setLeaderId] = useState("");
  const [capacity, setCapacity] = useState(12);
  const [visibility, setVisibility] = useState("DANCE_ONLY");
  const [targetDate, setTargetDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canCreate = session?.isBoardAdmin || session?.isDanceHead;

  const handleCreateDance = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await apiRequest("/api/dances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          song_title: songTitle,
          description,
          music_url: musicUrl,
          video_url: videoUrl,
          cover_url: coverUrl,
          leader_id: leaderId || undefined,
          capacity,
          visibility,
          target_performance_date: targetDate || undefined,
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setTitle("");
        setSongTitle("");
        setDescription("");
        setMusicUrl("");
        setVideoUrl("");
        await refresh();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredDances = data.dances.filter((d) => {
    if (filterStatus !== "ALL" && d.status !== filterStatus) return false;
    if (filterScope !== "ALL" && d.visibility !== filterScope) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        d.title.toLowerCase().includes(q) ||
        d.song_title.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <Flame className="w-7 h-7 text-mdc-red" />
            <span>Kho Tiết Mục & Bài Nhảy MDC</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Quản lý vòng đời bài nhảy: Bản nháp &rarr; Bình chọn &rarr; Đã chọn &rarr; Tuyển thành viên &rarr; Luyện tập &rarr; Biểu diễn.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 rounded-xl bg-mdc-red hover:bg-mdc-redDark text-xs font-semibold text-white transition-all flex items-center gap-2 shadow-glowRed active:scale-[0.98] self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Bài Nhảy Mới</span>
          </button>
        )}
      </div>

      {/* Filter Tabs & Search */}
      <div className="p-4 bg-mdc-surface border border-mdc-border rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên bài, bài hát, mã..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-mdc-card border border-mdc-border rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-mdc-red"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-mdc-card border border-mdc-border rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-mdc-red"
          >
            <option value="ALL">Tất cả giai đoạn</option>
            <option value="PRACTICING">Đang tập (PRACTICING)</option>
            <option value="RECRUITING">Đang tuyển (RECRUITING)</option>
            <option value="VOTING">Bình chọn (VOTING)</option>
            <option value="SELECTED">Đã chọn (SELECTED)</option>
            <option value="DRAFT">Bản nháp (DRAFT)</option>
            <option value="COMPLETED">Hoàn thành (COMPLETED)</option>
          </select>

          <select
            value={filterScope}
            onChange={(e) => setFilterScope(e.target.value)}
            className="bg-mdc-card border border-mdc-border rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-mdc-red"
          >
            <option value="ALL">Tất cả phạm vi</option>
            <option value="DANCE_ONLY">Chỉ Ban Chuyên môn</option>
            <option value="ALL_CLUB">Toàn thể CLB</option>
          </select>
        </div>
      </div>

      {/* Dances Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredDances.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-mdc-surface border border-mdc-border rounded-2xl text-slate-400 text-sm">
            Không tìm thấy bài nhảy nào phù hợp với bộ lọc tìm kiếm.
          </div>
        ) : (
          filteredDances.map((dance) => {
            const leader = data.profiles.find((p) => p.id === dance.leader_id);
            const registrations = data.registrations.filter((r) => r.dance_id === dance.id);
            const approvedCount = registrations.filter((r) => r.status === "APPROVED").length;
            const isUserRegistered = registrations.some((r) => r.user_id === session?.user.id);

            return (
              <div
                key={dance.id}
                className="group bg-mdc-surface border border-mdc-border hover:border-mdc-red/40 rounded-2xl overflow-hidden shadow-card flex flex-col justify-between transition-all"
              >
                <div>
                  {/* Cover Image & Badges */}
                  <div className="relative h-44 w-full bg-mdc-card overflow-hidden">
                    <img
                      src={dance.cover_url || "https://images.unsplash.com/photo-1547153760-18fc86324498?w=800&q=80"}
                      alt={dance.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-mdc-surface via-transparent to-black/60" />

                    {/* Top badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded backdrop-blur-md flex items-center gap-1 ${
                        dance.visibility === "ALL_CLUB"
                          ? "bg-mdc-cyan/80 text-white"
                          : "bg-mdc-crimson/90 text-white border border-white/20"
                      }`}>
                        {dance.visibility === "ALL_CLUB" ? (
                          <>
                            <Globe2 className="w-3 h-3" /> Toàn CLB
                          </>
                        ) : (
                          <>
                            <Lock className="w-3 h-3" /> Ban Chuyên Môn
                          </>
                        )}
                      </span>

                      <span className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded backdrop-blur-md ${
                        dance.status === "PRACTICING"
                          ? "bg-mdc-emerald text-white"
                          : dance.status === "RECRUITING"
                          ? "bg-mdc-red text-white"
                          : dance.status === "VOTING"
                          ? "bg-mdc-amber text-black"
                          : "bg-white/20 text-white"
                      }`}>
                        {dance.status}
                      </span>
                    </div>

                    {/* Song Title Bar */}
                    <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-xs text-white">
                      <span className="font-bold flex items-center gap-1.5 truncate drop-shadow">
                        <Music2 className="w-3.5 h-3.5 text-mdc-red shrink-0" />
                        <span className="truncate">{dance.song_title}</span>
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-2.5">
                    <div className="text-[10px] font-mono text-slate-500">{dance.code}</div>
                    <h3 className="font-extrabold text-base text-white group-hover:text-mdc-red transition-colors line-clamp-1">
                      {dance.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {dance.description}
                    </p>
                  </div>
                </div>

                {/* Footer Info & Action */}
                <div className="p-4 pt-2 bg-mdc-card/40 border-t border-mdc-border space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <div>
                      Leader: <strong className="text-slate-200">{leader?.full_name || "Chưa gán"}</strong>
                    </div>
                    <div className="font-mono text-slate-300">
                      {approvedCount}/{dance.capacity} người
                    </div>
                  </div>

                  {/* Roster Capacity Progress Bar */}
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-mdc-crimson to-mdc-red"
                      style={{ width: `${Math.min(100, (approvedCount / dance.capacity) * 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      {dance.music_url && (
                        <a
                          href={dance.music_url}
                          target="_blank"
                          rel="noreferrer"
                          title="Nghe nhạc"
                          className="p-1.5 rounded-lg bg-mdc-card hover:bg-white/10 text-slate-300 hover:text-white"
                        >
                          <Music2 className="w-3.5 h-3.5 text-mdc-red" />
                        </a>
                      )}
                      {dance.video_url && (
                        <a
                          href={dance.video_url}
                          target="_blank"
                          rel="noreferrer"
                          title="Xem video demo"
                          className="p-1.5 rounded-lg bg-mdc-card hover:bg-white/10 text-slate-300 hover:text-white"
                        >
                          <Video className="w-3.5 h-3.5 text-mdc-cyan" />
                        </a>
                      )}
                    </div>

                    <Link
                      href={`/dances/${dance.id}`}
                      className="px-3.5 py-1.5 rounded-xl bg-mdc-red hover:bg-mdc-redDark text-xs font-semibold text-white transition-all shadow-glowRed active:scale-[0.98]"
                    >
                      {isUserRegistered ? "Đã Đăng Ký &bull; Chi Tiết" : "Chi Tiết & Đăng Ký"}
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Dance Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-mdc-surface border border-mdc-border rounded-2xl p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-mdc-border">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-mdc-red" />
                <span>Tạo Bài Nhảy Mới</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateDance} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Tên Tiết Mục / Routine *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Showcase K-Pop Đêm Hội Tân Sinh Viên"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-mdc-card border border-mdc-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-mdc-red"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Tên Bài Hát & Nghệ Sĩ *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Drama - aespa"
                  value={songTitle}
                  onChange={(e) => setSongTitle(e.target.value)}
                  className="w-full bg-mdc-card border border-mdc-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-mdc-red"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Mô Tả & Phong Cách</label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú thể loại vũ đạo, định hướng line đội hình..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-mdc-card border border-mdc-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-mdc-red"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Phạm Vi Tham Gia</label>
                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value)}
                    className="w-full bg-mdc-card border border-mdc-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-mdc-red"
                  >
                    <option value="DANCE_ONLY">Chỉ Ban Chuyên Môn</option>
                    <option value="ALL_CLUB">Toàn CLB (Cả Media/Board)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Số Lượng Tuyển (Sĩ số)</label>
                  <input
                    type="number"
                    min={2}
                    max={50}
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="w-full bg-mdc-card border border-mdc-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-mdc-red"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Leader Phụ Trách</label>
                  <select
                    value={leaderId}
                    onChange={(e) => setLeaderId(e.target.value)}
                    className="w-full bg-mdc-card border border-mdc-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-mdc-red"
                  >
                    <option value="">-- Chưa gán Leader --</option>
                    {data.profiles
                      .filter((p) => p.status === "ACTIVE")
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.full_name} ({p.cohort_class || p.email})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Ngày Diễn Dự Kiến</label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full bg-mdc-card border border-mdc-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-mdc-red"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Link Nhạc (SoundCloud/Spotify)</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={musicUrl}
                    onChange={(e) => setMusicUrl(e.target.value)}
                    className="w-full bg-mdc-card border border-mdc-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-mdc-red"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Link Demo (YouTube/Drive)</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    className="w-full bg-mdc-card border border-mdc-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-mdc-red"
                  />
                </div>
              </div>

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
                  {isSubmitting ? "Đang tạo..." : "Lưu Bài Nhảy"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
