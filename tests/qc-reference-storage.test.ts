import { describe, expect, it } from "vitest";
import {
  buildReferencePath,
  validateReferenceImage
} from "../src/lib/qc-reference-storage";

describe("QC reference storage", () => {
  it("builds a safe path scoped to demand and comment", () => {
    expect(buildReferencePath("dem 1", "comment/2", "Minha Referência FINAL.png")).toBe(
      "dem-1/comment-2/minha-referencia-final.png"
    );
  });

  it("accepts supported images up to 8 MB", () => {
    expect(validateReferenceImage({ name: "ref.webp", size: 8 * 1024 * 1024, type: "image/webp" })).toBeNull();
  });

  it("rejects unsupported or oversized files", () => {
    expect(validateReferenceImage({ name: "ref.gif", size: 100, type: "image/gif" })).toContain("PNG");
    expect(validateReferenceImage({ name: "ref.png", size: 8 * 1024 * 1024 + 1, type: "image/png" })).toContain("8 MB");
  });
});
