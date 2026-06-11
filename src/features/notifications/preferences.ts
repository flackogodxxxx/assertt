export type OperationalNotificationType = "assignment" | "review" | "deadline" | "general";

export type NotificationPreferences = {
  assignmentEnabled: boolean;
  deadlineEnabled: boolean;
  desktopEnabled: boolean;
  reviewEnabled: boolean;
  soundEnabled: boolean;
};

export const defaultNotificationPreferences: NotificationPreferences = {
  assignmentEnabled: true,
  deadlineEnabled: true,
  desktopEnabled: false,
  reviewEnabled: true,
  soundEnabled: true
};

type NotificationPreferenceRow = {
  assignment_enabled?: boolean | null;
  deadline_enabled?: boolean | null;
  desktop_enabled?: boolean | null;
  review_enabled?: boolean | null;
  sound_enabled?: boolean | null;
};

export function normalizeNotificationPreferences(
  row?: NotificationPreferenceRow | null
): NotificationPreferences {
  return {
    assignmentEnabled: row?.assignment_enabled ?? defaultNotificationPreferences.assignmentEnabled,
    deadlineEnabled: row?.deadline_enabled ?? defaultNotificationPreferences.deadlineEnabled,
    desktopEnabled: row?.desktop_enabled ?? defaultNotificationPreferences.desktopEnabled,
    reviewEnabled: row?.review_enabled ?? defaultNotificationPreferences.reviewEnabled,
    soundEnabled: row?.sound_enabled ?? defaultNotificationPreferences.soundEnabled
  };
}

export function isNotificationTypeEnabled(
  type: OperationalNotificationType,
  preferences: NotificationPreferences
) {
  if (type === "assignment") return preferences.assignmentEnabled;
  if (type === "review") return preferences.reviewEnabled;
  if (type === "deadline") return preferences.deadlineEnabled;
  return true;
}
