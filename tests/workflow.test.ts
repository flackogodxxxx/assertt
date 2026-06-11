import { describe, expect, it } from "vitest";
import {
  canTransition,
  deriveDemandStatusFromPieces,
  getUnblockedStatus,
  isArchivedWorkflowStatus,
  validateTransition
} from "../src/features/demands/workflow";

describe("WORKOS workflow", () => {
  it("allows only the canonical forward and correction transitions", () => {
    expect(canTransition("draft", "planned")).toBe(true);
    expect(canTransition("planned", "production")).toBe(true);
    expect(canTransition("production", "review")).toBe(true);
    expect(canTransition("review", "adjustments")).toBe(true);
    expect(canTransition("adjustments", "review")).toBe(true);
    expect(canTransition("review", "approved")).toBe(true);
    expect(canTransition("approved", "delivered")).toBe(true);
    expect(canTransition("draft", "approved")).toBe(false);
  });

  it("requires a reason to block and remembers the previous state", () => {
    expect(validateTransition("production", "blocked", "")).toEqual({
      valid: false,
      reason: "Informe o motivo do bloqueio."
    });
    expect(validateTransition("production", "blocked", "Aguardando material").valid).toBe(true);
    expect(getUnblockedStatus("production")).toBe("production");
  });

  it("approves a demand only when every required piece is approved", () => {
    expect(
      deriveDemandStatusFromPieces([
        { isRequired: true, reviewStatus: "approved" },
        { isRequired: true, reviewStatus: "pending" },
        { isRequired: false, reviewStatus: "pending" }
      ])
    ).toBe("review");

    expect(
      deriveDemandStatusFromPieces([
        { isRequired: true, reviewStatus: "approved" },
        { isRequired: true, reviewStatus: "approved" },
        { isRequired: false, reviewStatus: "pending" }
      ])
    ).toBe("approved");
  });

  it("archives only delivered demands", () => {
    expect(isArchivedWorkflowStatus("approved")).toBe(false);
    expect(isArchivedWorkflowStatus("delivered")).toBe(true);
  });
});
