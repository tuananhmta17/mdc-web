"use client";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Announcement, AuditLog, CurrentUserSession, Dance, DancePollOption, DancePollRound, DanceRegistration, DanceVote, Department, DepartmentMembership, EmailOutboxItem, InAppNotification, MediaTask, MediaTaskSubmission, PracticeAttendance, PracticeRSVP, PracticeSession, Profile, RoleAssignment } from "./types";

interface StateData {
  session: CurrentUserSession | null; isPendingApproval: boolean;
  departments: Department[]; departmentMemberships: DepartmentMembership[]; roleAssignments: RoleAssignment[];
  profiles: Profile[]; dances: Dance[]; pollRounds: DancePollRound[]; pollOptions: DancePollOption[];
  votes: DanceVote[]; registrations: DanceRegistration[]; practiceSessions: PracticeSession[];
  practiceRsvps: PracticeRSVP[]; practiceAttendance: PracticeAttendance[]; mediaTasks: MediaTask[];
  mediaSubmissions: MediaTaskSubmission[]; announcements: Announcement[]; notifications: InAppNotification[];
  outbox: EmailOutboxItem[]; auditLogs: AuditLog[];
}
const defaultData: StateData = { session: null, isPendingApproval: false, departments: [], departmentMemberships: [], roleAssignments: [], profiles: [], dances: [], pollRounds: [], pollOptions: [], votes: [], registrations: [], practiceSessions: [], practiceRsvps: [], practiceAttendance: [], mediaTasks: [], mediaSubmissions: [], announcements: [], notifications: [], outbox: [], auditLogs: [] };
type Result = { success: boolean; error?: string };
interface StateContextType {
  data: StateData; loading: boolean; error: string; refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<Result>; logout: () => Promise<void>;
  createMember: (body: Record<string, unknown>) => Promise<Result>;
  updateMember: (id: string, body: Record<string, unknown>) => Promise<Result>;
  deleteMember: (id: string) => Promise<Result>;
  markNotificationRead: (id?: string, all?: boolean) => Promise<void>; runEmailWorker: () => Promise<void>;
}
const StateContext = createContext<StateContextType | null>(null);
export async function apiRequest(url: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(url, { ...options, cache: "no-store" });
  if (!res.ok) {
    const body = await res.clone().json().catch(() => ({}));
    const message = body.error || "Không thể hoàn tất yêu cầu.";
    window.dispatchEvent(new CustomEvent("mdc-error", { detail: message }));
    throw new Error(message);
  }
  return res;
}
export function StateProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState(defaultData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++sequence.current;
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      if (current !== sequence.current) return;
      if (res.status === 401 || res.status === 403) { setData(defaultData); setError(""); return; }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Không tải được dữ liệu.");
      if (current === sequence.current) { setData({ ...defaultData, ...json }); setError(""); }
    } catch (err) { if (current === sequence.current) setError(err instanceof Error ? err.message : "Lỗi kết nối."); }
    finally { if (current === sequence.current) setLoading(false); }
  }, []);
  useEffect(() => { localStorage.removeItem("mdc_uid"); void refresh(); }, [refresh]);
  async function mutation(url: string, method: string, body?: unknown): Promise<Result> {
    try {
      await apiRequest(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
      await refresh(); return { success: true };
    } catch (err) { return { success: false, error: err instanceof Error ? err.message : "Lỗi kết nối." }; }
  }
  const login = (email: string, password: string) => mutation("/api/auth/login", "POST", { email, password });
  const logout = async () => {
    await apiRequest("/api/auth/logout", { method: "POST" });
    sequence.current++; setData(defaultData); setError("");
  };
  const markNotificationRead = async (id?: string, all?: boolean) => {
    const result = await mutation("/api/notifications", "PATCH", { notificationId: id, markAll: all });
    if (!result.success) throw new Error(result.error);
  };
  const runEmailWorker = async () => {
    const result = await mutation("/api/cron/process-outbox", "POST");
    if (!result.success) throw new Error(result.error);
  };
  return <StateContext.Provider value={{ data, loading, error, refresh, login, logout,
    createMember: body => mutation("/api/members", "POST", body),
    updateMember: (id, body) => mutation(`/api/members/${id}`, "PATCH", body),
    deleteMember: id => mutation(`/api/members/${id}`, "DELETE"), markNotificationRead, runEmailWorker }}>{children}</StateContext.Provider>;
}
export function useAppState() { const context = useContext(StateContext); if (!context) throw new Error("Missing StateProvider"); return context; }
