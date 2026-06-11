import { describe, expect, it } from "vitest";
import { shouldAlertForNotification } from "../src/lib/notification-realtime";

describe("realtime notification alerts", () => {
  const event = {
    id: "n1",
    readAt: null,
    targetUserId: "des-1"
  };

  it("alerts once for a new unread event targeted to the user", () => {
    expect(shouldAlertForNotification(event, "des-1", new Set())).toBe(true);
  });

  it("does not alert for another user, a read event, or a duplicate", () => {
    expect(shouldAlertForNotification(event, "des-2", new Set())).toBe(false);
    expect(
      shouldAlertForNotification({ ...event, readAt: "2026-06-11" }, "des-1", new Set())
    ).toBe(false);
    expect(shouldAlertForNotification(event, "des-1", new Set(["n1"]))).toBe(false);
  });
});
