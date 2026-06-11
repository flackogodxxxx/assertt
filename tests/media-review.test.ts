import { describe, expect, it } from "vitest";
import {
  clampMediaTime,
  createCorrectionRange,
  formatMediaTime,
  parseMediaTime
} from "../src/lib/media-review";

describe("media review timing", () => {
  it("formats and parses precise timestamps", () => {
    expect(formatMediaTime(65.4)).toBe("01:05.400");
    expect(parseMediaTime("01:05.400")).toBeCloseTo(65.4);
    expect(parseMediaTime("00:03")).toBe(3);
  });

  it("clamps seeking to the available duration", () => {
    expect(clampMediaTime(-2, 20)).toBe(0);
    expect(clampMediaTime(12.5, 20)).toBe(12.5);
    expect(clampMediaTime(25, 20)).toBe(20);
  });

  it("creates ordered point and interval corrections", () => {
    expect(createCorrectionRange(4.2)).toEqual({
      endTimestamp: undefined,
      timestamp: "00:04.200"
    });
    expect(createCorrectionRange(9, 4)).toEqual({
      endTimestamp: "00:09.000",
      timestamp: "00:04.000"
    });
  });
});
