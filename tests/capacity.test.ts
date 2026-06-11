import { describe, expect, it } from "vitest";
import { calculateCapacity } from "../src/features/capacity/capacity";

describe("team capacity", () => {
  it("uses estimated effort, deadline pressure, and adjustment cycles", () => {
    const result = calculateCapacity({
      weeklyCapacityMinutes: 2400,
      now: new Date("2026-06-11T12:00:00Z"),
      work: [
        {
          activePieces: 3,
          adjustmentCycles: 1,
          dueAt: "2026-06-12T12:00:00Z",
          estimatedMinutes: 900
        }
      ]
    });

    expect(result.usedMinutes).toBe(1170);
    expect(result.loadPercent).toBe(49);
    expect(result.label).toBe("balanced");
  });

  it("marks workload above capacity as overloaded", () => {
    const result = calculateCapacity({
      weeklyCapacityMinutes: 1200,
      now: new Date("2026-06-11T12:00:00Z"),
      work: [
        {
          activePieces: 5,
          adjustmentCycles: 2,
          dueAt: "2026-06-11T18:00:00Z",
          estimatedMinutes: 1200
        }
      ]
    });

    expect(result.loadPercent).toBeGreaterThan(100);
    expect(result.label).toBe("overloaded");
  });
});
