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
  switchUser: (userId: string) => Promise<void>;
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
  switchUser: async () => {},
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
        switchUser,
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
