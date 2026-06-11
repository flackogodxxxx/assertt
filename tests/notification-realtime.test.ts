import { describe, expect, it } from "vitest";
import { shouldAlertForNotification } from "../src/lib/notification-realtime";
import { getReconnectDelay } from "../src/features/notifications/realtime";

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

  it("uses bounded exponential reconnect delays", () => {
    expect(getReconnectDelay(0)).toBe(1000);
    expect(getReconnectDelay(1)).toBe(2000);
    expect(getReconnectDelay(5)).toBe(30000);
    expect(getReconnectDelay(20)).toBe(30000);
  });
});
