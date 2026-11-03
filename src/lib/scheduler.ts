import { AvailabilitySlot, Dance, DatabaseSchema } from "./types";
import { getDayNameVN } from "./utils";

export interface ScheduleCandidate {
  dayOfWeek: number;
  dayName: string;
  startTime: string;
  endTime: string;
  availableUsers: string[];
  maybeUsers: string[];
  unavailableUsers: string[];
  score: number;
  isLeaderAvailable: boolean;
  hasConflictWithOtherPractice: boolean;
  recommendationRank: number;
}

export function calculateBestPracticeSlots(
  db: DatabaseSchema,
  danceId: string
): ScheduleCandidate[] {
  const dance = db.dances.find((d) => d.id === danceId);
  if (!dance) return [];

  // Active registered dancers for this dance
  const registeredUserIds = db.dance_registrations
    .filter((r) => r.dance_id === danceId && (r.status === "APPROVED" || r.status === "REGISTERED"))
    .map((r) => r.user_id);

  // If leader is assigned, ensure leader is included
  if (dance.leader_id && !registeredUserIds.includes(dance.leader_id)) {
    registeredUserIds.push(dance.leader_id);
  }

  const slots = db.availability_slots.filter((s) => s.dance_id === danceId);
  const slotsByUserDay = new Map<string, AvailabilitySlot[]>();
  for (const s of slots) {
    const key = `${s.user_id}:${s.day_of_week}`;
    slotsByUserDay.set(key, [...(slotsByUserDay.get(key) || []), s]);
  }

  // Standard prospective rehearsal windows
  const windows = [
    { start: "18:00", end: "20:00" },
    { start: "20:00", end: "22:00" },
    { start: "14:00", end: "16:30" }, // Afternoon weekend
    { start: "08:30", end: "11:00" }, // Morning weekend
  ];

  const candidates: ScheduleCandidate[] = [];

  for (let day = 0; day <= 6; day++) {
    // Weekday: only test evening windows; Weekend: test all windows
    const isWeekend = day === 0 || day === 6;
    const testWindows = isWeekend ? windows : windows.slice(0, 2);

    for (const win of testWindows) {
      const availableUsers: string[] = [];
      const maybeUsers: string[] = [];
      const unavailableUsers: string[] = [];

      for (const uid of registeredUserIds) {
        // Find user's declared slot matching this day and time
        const slot = (slotsByUserDay.get(`${uid}:${day}`) || []).find(
          (s) =>
            s.user_id === uid &&
            s.day_of_week === day &&
            s.start_time <= win.start &&
            s.end_time >= win.end
        );

        if (!slot) {
          // If no slot declared, treat as maybe by default
          maybeUsers.push(uid);
        } else if (slot.level === "AVAILABLE") {
          availableUsers.push(uid);
        } else if (slot.level === "MAYBE") {
          maybeUsers.push(uid);
        } else {
          unavailableUsers.push(uid);
        }
      }

      // Check conflict with other scheduled practice sessions of ANY dance
      // (For MVP heuristic: check day of week matches)
      const hasConflict = db.practice_sessions.some((ps) => {
        if (!["SCHEDULED", "RESCHEDULED"].includes(ps.status) || ps.dance_id === danceId || Date.parse(ps.end_at) < Date.now()) return false;
        const sharedParticipants = db.dance_registrations.some(r => r.dance_id === ps.dance_id && registeredUserIds.includes(r.user_id) && ["REGISTERED", "APPROVED"].includes(r.status));
        const otherDance = db.dances.find(d => d.id === ps.dance_id);
        if (!sharedParticipants && !registeredUserIds.includes(otherDance?.leader_id || "")) return false;
        const local = new Date(Date.parse(ps.start_at) + 7 * 3600000);
        const end = new Date(Date.parse(ps.end_at) + 7 * 3600000);
        const clock = (d: Date) => `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
        return local.getUTCDay() === day && clock(local) < win.end && clock(end) > win.start;
      });

      const isLeaderAvailable = dance.leader_id
        ? availableUsers.includes(dance.leader_id)
        : true;

      // Score formula from Section 3.3:
      // score = 1.0 * AVAILABLE + 0.5 * MAYBE - penalty(xung đột) - penalty(leader vắng)
      let score = availableUsers.length * 1.0 + maybeUsers.length * 0.5;
      if (hasConflict) score -= 1.5;
      if (!isLeaderAvailable) score -= 4.0; // Heavy penalty if leader can't make it

      candidates.push({
        dayOfWeek: day,
        dayName: getDayNameVN(day),
        startTime: win.start,
        endTime: win.end,
        availableUsers,
        maybeUsers,
        unavailableUsers,
        score: Math.max(0, Math.round(score * 10) / 10),
        isLeaderAvailable,
        hasConflictWithOtherPractice: hasConflict,
        recommendationRank: 0,
      });
    }
  }

  // Sort descending by score
  candidates.sort((a, b) => b.score - a.score);

  // Assign ranks
  candidates.forEach((c, idx) => {
    c.recommendationRank = idx + 1;
  });

  return candidates;
}
