import { describe, expect, it } from "vitest";
import { isLocalAuthFallbackAllowed } from "../src/contexts/AuthContext";

describe("local auth fallback", () => {
  it("is disabled for production builds", () => {
    expect(isLocalAuthFallbackAllowed({ DEV: false, PROD: true })).toBe(false);
  });

  it("is enabled for local development", () => {
    expect(isLocalAuthFallbackAllowed({ DEV: true, PROD: false })).toBe(true);
  });
});
