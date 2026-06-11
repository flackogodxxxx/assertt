import { describe, expect, it } from "vitest";
import {
  isLocalAuthFallbackAllowed,
  parseStoredLocalAuthUser,
} from "../src/contexts/AuthContext";

describe("local auth fallback", () => {
  it("is disabled for production builds", () => {
    expect(isLocalAuthFallbackAllowed({ DEV: false, PROD: true })).toBe(false);
  });

  it("is enabled for local development", () => {
    expect(isLocalAuthFallbackAllowed({ DEV: true, PROD: false })).toBe(true);
  });

  it("does not restore a simulated user in production", () => {
    const storedUser = JSON.stringify({
      id: "admin-1",
      name: "Bianca",
      email: "bianca@agencia.com",
      role: "Admin",
    });

    expect(parseStoredLocalAuthUser(storedUser, { DEV: false, PROD: true })).toBeNull();
  });

  it("restores a valid simulated user only during development", () => {
    const storedUser = JSON.stringify({
      id: "admin-1",
      name: "Bianca",
      email: "bianca@agencia.com",
      role: "Admin",
    });

    expect(parseStoredLocalAuthUser(storedUser, { DEV: true, PROD: false })).toMatchObject({
      id: "admin-1",
      role: "Admin",
    });
  });
});
