import { CurrentUserSession, Dance, DancePollRound, MediaTask } from "./types";

export class RBAC {
  // Acceptance criterion 1: Unapproved user cannot access internal club data
  static canAccessInternalData(session: CurrentUserSession): boolean {
    return session.user.status === "ACTIVE";
  }

  // Acceptance criterion 2: Voting permission
  static canVotePoll(session: CurrentUserSession, round: DancePollRound): boolean {
    if (!this.canAccessInternalData(session)) return false;
    if (session.isBoardAdmin) return true;

    if (round.scope === "ALL_CLUB") {
      return true;
    }

    // DANCE_ONLY scope
    const isDanceAffiliated =
      session.isDanceHead ||
      session.roles.includes("DANCE_LEADER") ||
      session.roles.includes("DANCE_MEMBER") ||
      session.primaryDepartment?.code === "DANCE";

    return isDanceAffiliated;
  }

  // Acceptance criterion 2: Registering for a dance
  static canRegisterDance(session: CurrentUserSession, dance: Dance): boolean {
    if (!this.canAccessInternalData(session)) return false;
    if (session.isBoardAdmin) return true;

    if (dance.visibility === "ALL_CLUB") {
      return true;
    }

    // DANCE_ONLY visibility
    return (
      session.isDanceHead ||
      session.roles.includes("DANCE_LEADER") ||
      session.roles.includes("DANCE_MEMBER") ||
      session.primaryDepartment?.code === "DANCE"
    );
  }

  // Acceptance criterion 4: Poll management (create, close, pick winner)
  static canManagePoll(session: CurrentUserSession): boolean {
    if (!this.canAccessInternalData(session)) return false;
    return session.isBoardAdmin || session.isDanceHead;
  }

  // Acceptance criterion 5 & 6: Manage practice session for a specific dance
  static canManagePractice(session: CurrentUserSession, dance: Dance): boolean {
    if (!this.canAccessInternalData(session)) return false;
    if (session.isBoardAdmin || session.isDanceHead) return true;
    // Designated Leader
    return dance.leader_id === session.user.id;
  }

  // Acceptance criterion 7: View individual member availability for a dance
  static canViewDanceAvailability(
    session: CurrentUserSession,
    dance: Dance,
    isRegisteredForDance: boolean
  ): boolean {
    if (!this.canAccessInternalData(session)) return false;
    if (session.isBoardAdmin || session.isDanceHead) return true;
    if (dance.leader_id === session.user.id) return true;
    return isRegisteredForDance;
  }

  // Acceptance criterion 8: Media task assignment and updating
  static canAssignMediaTask(session: CurrentUserSession): boolean {
    if (!this.canAccessInternalData(session)) return false;
    return session.isBoardAdmin || session.isMediaHead;
  }

  static canSubmitMediaTask(session: CurrentUserSession, task: MediaTask): boolean {
    if (!this.canAccessInternalData(session)) return false;
    if (session.isBoardAdmin || session.isMediaHead) return true;
    return task.assignee_id === session.user.id;
  }

  static canReviewMediaSubmission(session: CurrentUserSession): boolean {
    if (!this.canAccessInternalData(session)) return false;
    return session.isBoardAdmin || session.isMediaHead;
  }

  // Board Admin executive controls
  static canManageMembers(session: CurrentUserSession): boolean {
    if (!this.canAccessInternalData(session)) return false;
    return session.isBoardAdmin;
  }

  static canPublishAnnouncements(session: CurrentUserSession): boolean {
    if (!this.canAccessInternalData(session)) return false;
    return session.isBoardAdmin;
  }

  static canViewAuditLogs(session: CurrentUserSession): boolean {
    if (!this.canAccessInternalData(session)) return false;
    return session.isBoardAdmin;
  }
}
