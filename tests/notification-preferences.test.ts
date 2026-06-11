import { describe, expect, it } from "vitest";
import {
  defaultNotificationPreferences,
  isNotificationTypeEnabled,
  normalizeNotificationPreferences
} from "../src/features/notifications/preferences";

describe("notification preferences", () => {
  it("enables operational notifications by default", () => {
    expect(defaultNotificationPreferences).toMatchObject({
      assignmentEnabled: true,
      deadlineEnabled: true,
      desktopEnabled: false,
      reviewEnabled: true,
      soundEnabled: true
    });
  });

  it("normalizes partial database preferences", () => {
    expect(normalizeNotificationPreferences({ sound_enabled: false })).toEqual({
      ...defaultNotificationPreferences,
      soundEnabled: false
    });
  });

  it("filters assignment, review, and deadline events independently", () => {
    const preferences = {
      ...defaultNotificationPreferences,
      reviewEnabled: false
    };

    expect(isNotificationTypeEnabled("assignment", preferences)).toBe(true);
    expect(isNotificationTypeEnabled("review", preferences)).toBe(false);
    expect(isNotificationTypeEnabled("deadline", preferences)).toBe(true);
  });
});
