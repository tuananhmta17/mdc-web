"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  Announcement,
  AuditLog,
  CurrentUserSession,
  Dance,
  DancePollOption,
  DancePollRound,
  DanceRegistration,
  DanceVote,
  Department,
  DepartmentMembership,
  EmailOutboxItem,
  InAppNotification,
  MediaTask,
  MediaTaskSubmission,
  PracticeAttendance,
  PracticeRSVP,
  PracticeSession,
  Profile,
  RoleAssignment,
} from "./types";

interface StateData {
  session: CurrentUserSession | null;
  isPendingApproval: boolean;
  departments: Department[];
  departmentMemberships: DepartmentMembership[];
  roleAssignments: RoleAssignment[];
  profiles: Profile[];
  dances: Dance[];
  pollRounds: DancePollRound[];
  pollOptions: DancePollOption[];
  votes: DanceVote[];
  registrations: DanceRegistration[];
  practiceSessions: PracticeSession[];
  practiceRsvps: PracticeRSVP[];
  practiceAttendance: PracticeAttendance[];
  mediaTasks: MediaTask[];
  mediaSubmissions: MediaTaskSubmission[];
  announcements: Announcement[];
  notifications: InAppNotification[];
  outbox: EmailOutboxItem[];
  auditLogs: AuditLog[];
}

interface StateContextType {
  data: StateData;
  loading: boolean;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginQuick: (userId: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  switchUser: (userId: string) => Promise<void>;
  createMember: (memberData: any) => Promise<{ success: boolean; error?: string }>;
  updateMember: (id: string, updates: any) => Promise<{ success: boolean; error?: string }>;
  deleteMember: (id: string) => Promise<{ success: boolean; error?: string }>;
  simulateExternalLogin: (email: string, name: string) => Promise<void>;
  markNotificationRead: (id?: string, all?: boolean) => Promise<void>;
  runEmailWorker: () => Promise<void>;
  resetToSampleData: () => Promise<void>;
}

const defaultData: StateData = {
  session: null,
  isPendingApproval: false,
  departments: [],
  departmentMemberships: [],
  roleAssignments: [],
  profiles: [],
  dances: [],
  pollRounds: [],
  pollOptions: [],
  votes: [],
  registrations: [],
  practiceSessions: [],
  practiceRsvps: [],
  practiceAttendance: [],
  mediaTasks: [],
  mediaSubmissions: [],
  announcements: [],
  notifications: [],
  outbox: [],
  auditLogs: [],
};

const StateContext = createContext<StateContextType>({
  data: defaultData,
  loading: true,
  refresh: async () => {},
  login: async () => ({ success: false }),
  loginQuick: async () => ({ success: false }),
  logout: async () => {},
  switchUser: async () => {},
  createMember: async () => ({ success: false }),
  updateMember: async () => ({ success: false }),
  deleteMember: async () => ({ success: false }),
  simulateExternalLogin: async () => {},
  markNotificationRead: async () => {},
  runEmailWorker: async () => {},
  resetToSampleData: async () => {},
});

export function StateProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<StateData>(defaultData);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const storedUid = typeof window !== "undefined" ? localStorage.getItem("mdc_uid") : null;
      const headers: Record<string, string> = {};
      if (storedUid) {
        headers["x-mdc-uid"] = storedUid;
      }

      const res = await fetch("/api/state", { headers });
      if (res.ok) {
        const json = await res.json();
        setData({
          session: json.session,
          isPendingApproval: json.isPendingApproval,
          departments: json.departments || [],
          departmentMemberships: json.departmentMemberships || [],
          roleAssignments: json.roleAssignments || [],
          profiles: json.profiles || [],
          dances: json.dances || [],
          pollRounds: json.pollRounds || [],
          pollOptions: json.pollOptions || [],
          votes: json.votes || [],
          registrations: json.registrations || [],
          practiceSessions: json.practiceSessions || [],
          practiceRsvps: json.practiceRsvps || [],
          practiceAttendance: json.practiceAttendance || [],
          mediaTasks: json.mediaTasks || [],
          mediaSubmissions: json.mediaSubmissions || [],
          announcements: json.announcements || [],
          notifications: json.notifications || [],
          outbox: json.outbox || [],
          auditLogs: json.auditLogs || [],
        });
      }
    } catch (err) {
      console.error("Failed to fetch state:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) {
        return { success: false, error: json.error || "Đăng nhập thất bại" };
      }
      if (typeof window !== "undefined" && json.user?.id) {
        localStorage.setItem("mdc_uid", json.user.id);
      }
      await refresh();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Lỗi kết nối máy chủ" };
    }
  };

  const loginQuick = async (userId: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const json = await res.json();
      if (!res.ok) {
        return { success: false, error: json.error || "Đăng nhập thất bại" };
      }
      if (typeof window !== "undefined" && userId) {
        localStorage.setItem("mdc_uid", userId);
      }
      await refresh();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Lỗi kết nối máy chủ" };
    }
  };

  const logout = async () => {
    setLoading(true);
    if (typeof window !== "undefined") {
      localStorage.removeItem("mdc_uid");
    }
    await fetch("/api/auth/logout", { method: "POST" });
    await refresh();
    setLoading(false);
  };

  const switchUser = async (userId: string) => {
    setLoading(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("mdc_uid", userId);
    }
    await fetch("/api/auth/switch-role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    await refresh();
  };

  const createMember = async (memberData: any) => {
    try {
      const storedUid = typeof window !== "undefined" ? localStorage.getItem("mdc_uid") : null;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (storedUid) headers["x-mdc-uid"] = storedUid;

      const res = await fetch("/api/members", {
        method: "POST",
        headers,
        body: JSON.stringify(memberData),
      });
      const json = await res.json();
      if (!res.ok) {
        return { success: false, error: json.error || "Không thể tạo tài khoản" };
      }
      await refresh();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Lỗi kết nối" };
    }
  };

  const updateMember = async (id: string, updates: any) => {
    try {
      const storedUid = typeof window !== "undefined" ? localStorage.getItem("mdc_uid") : null;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (storedUid) headers["x-mdc-uid"] = storedUid;

      const res = await fetch(`/api/members/${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(updates),
      });
      const json = await res.json();
      if (!res.ok) {
        return { success: false, error: json.error || "Không thể cập nhật tài khoản" };
      }
      await refresh();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Lỗi kết nối" };
    }
  };

  const deleteMember = async (id: string) => {
    try {
      const storedUid = typeof window !== "undefined" ? localStorage.getItem("mdc_uid") : null;
      const headers: Record<string, string> = {};
      if (storedUid) headers["x-mdc-uid"] = storedUid;

      const res = await fetch(`/api/members/${id}`, {
        method: "DELETE",
        headers,
      });
      const json = await res.json();
      if (!res.ok) {
        return { success: false, error: json.error || "Không thể xóa tài khoản" };
      }
      await refresh();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Lỗi kết nối" };
    }
  };

  const simulateExternalLogin = async (email: string, name: string) => {
    setLoading(true);
    await fetch("/api/auth/switch-role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ googleLoginEmail: email, fullName: name }),
    });
    await refresh();
  };

  const markNotificationRead = async (id?: string, all?: boolean) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId: id, markAll: all }),
    });
    await refresh();
  };

  const runEmailWorker = async () => {
    await fetch("/api/cron/process-outbox", { method: "POST" });
    await refresh();
  };

  const resetToSampleData = async () => {
    setLoading(true);
    await fetch("/api/system/reset", { method: "POST" });
    await refresh();
  };

  return (
    <StateContext.Provider
      value={{
        data,
        loading,
        refresh,
        login,
        loginQuick,
        logout,
        switchUser,
        createMember,
        updateMember,
        deleteMember,
        simulateExternalLogin,
        markNotificationRead,
        runEmailWorker,
        resetToSampleData,
      }}
    >
      {children}
    </StateContext.Provider>
  );
}

export const useAppState = () => useContext(StateContext);
