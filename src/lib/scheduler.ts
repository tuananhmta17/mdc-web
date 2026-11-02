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

  // Standard prospective rehearsal windows
  const windows = [
    { start: "18:00", end: "20:30" }, // Evening primary
    { start: "19:00", end: "21:30" }, // Evening late
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
        const slot = slots.find(
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
        if (ps.status === "CANCELLED") return false;
        const d = new Date(ps.start_at);
        return d.getUTCDay() === day; // conflict warning
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
