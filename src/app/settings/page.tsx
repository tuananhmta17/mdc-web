"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Save, UserRound } from "lucide-react";
import { apiRequest, useAppState } from "@/lib/state-context";
export default function SettingsPage() {
  const { data, updateMember } = useAppState();
  const user = data.session?.user;
  const router = useRouter();
  const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [cohort, setCohort] = useState("");
  const [currentPassword, setCurrentPassword] = useState(""); const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  useEffect(() => { if (user) { setName(user.full_name); setPhone(user.phone || ""); setCohort(user.cohort_class || ""); } }, [user?.id]);
  async function save(e: React.FormEvent) {
    e.preventDefault(); if (!user) return; setBusy(true); setMessage(""); setError("");
    const result = await updateMember(user.id, { full_name: name, phone, cohort_class: cohort });
    if (result.success) setMessage("Đã lưu thông tin cá nhân."); else setError(result.error || "Không lưu được thông tin.");
    setBusy(false);
  }
  async function changePassword(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage(""); setError("");
    try { await apiRequest("/api/auth/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword, newPassword }) }); router.replace("/login"); }
    catch (err) { setError(err instanceof Error ? err.message : "Không đổi được mật khẩu."); }
    finally { setBusy(false); }
  }
  return <div className="max-w-4xl space-y-7"><div><p className="eyebrow text-mdc-red mb-2">KHÔNG GIAN CỦA BẠN</p><h1 className="text-3xl font-bold">Cài đặt tài khoản</h1><p className="mt-2 text-sm text-slate-400">Cập nhật thông tin và bảo vệ tài khoản của bạn.</p></div>
    {message && <p role="status" className="rounded-xl bg-emerald-500/10 text-emerald-300 p-4 text-sm">{message}</p>}{error && <p role="alert" className="rounded-xl bg-red-500/10 text-red-300 p-4 text-sm">{error}</p>}
    <section className="panel"><h2 className="text-lg font-semibold flex gap-3 items-center"><UserRound size={20} className="text-mdc-red" />Thông tin cá nhân</h2><form onSubmit={save} className="mt-6 grid sm:grid-cols-2 gap-5"><div><label className="field-label" htmlFor="name">Họ và tên</label><input id="name" className="field-input" value={name} onChange={e => setName(e.target.value)} required /></div><div><label className="field-label" htmlFor="account-email">Email tài khoản</label><input id="account-email" className="field-input opacity-60" value={user?.email || ""} readOnly /></div><div><label className="field-label" htmlFor="phone">Số điện thoại</label><input id="phone" type="tel" className="field-input" value={phone} onChange={e => setPhone(e.target.value)} /></div><div><label className="field-label" htmlFor="cohort">Khóa / Lớp</label><input id="cohort" className="field-input" value={cohort} onChange={e => setCohort(e.target.value)} /></div><div className="sm:col-span-2 pt-2"><button disabled={busy} className="primary-button"><Save size={16} />{busy ? "Đang lưu…" : "Lưu thông tin"}</button></div></form></section>
    <section className="panel"><h2 className="text-lg font-semibold flex gap-3 items-center"><LockKeyhole size={20} className="text-mdc-red" />Đổi mật khẩu</h2><p className="text-sm text-slate-400 mt-3">Dùng mật khẩu riêng từ 12 đến 128 ký tự. Bạn sẽ đăng nhập lại sau khi đổi.</p><form onSubmit={changePassword} className="mt-6 grid sm:grid-cols-2 gap-5"><div><label htmlFor="current-password" className="field-label">Mật khẩu hiện tại</label><input id="current-password" type="password" autoComplete="current-password" className="field-input" required maxLength={128} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} /></div><div><label htmlFor="new-password" className="field-label">Mật khẩu mới</label><input id="new-password" type="password" autoComplete="new-password" className="field-input" required minLength={12} maxLength={128} value={newPassword} onChange={e => setNewPassword(e.target.value)} /></div><div className="sm:col-span-2"><button disabled={busy} className="secondary-button">Cập nhật mật khẩu</button></div></form></section>
  </div>;
}
