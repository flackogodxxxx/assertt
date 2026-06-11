import { describe, expect, it } from "vitest";
import {
  buildPieceInstructions,
  formatDemandScope,
  normalizePieceCount
} from "../src/lib/demand-scope";

describe("demand scope", () => {
  it("clamps piece count between 1 and 50", () => {
    expect(normalizePieceCount(0)).toBe(1);
    expect(normalizePieceCount(7)).toBe(7);
    expect(normalizePieceCount(80)).toBe(50);
    expect(normalizePieceCount(Number.NaN)).toBe(1);
  });

  it("normalizes one non-empty instruction per requested piece", () => {
    expect(buildPieceInstructions("Abertura\n\nCTA\nExtra", 3)).toEqual([
      "Abertura",
      "CTA",
      "Extra"
    ]);
    expect(buildPieceInstructions("Primeiro\nSegundo\nTerceiro", 2)).toEqual([
      "Primeiro",
      "Segundo"
    ]);
  });

  it("formats scope labels using the demand type", () => {
    expect(formatDemandScope(1, "Vídeo")).toBe("1 vídeo");
    expect(formatDemandScope(7, "Vídeo")).toBe("7 vídeos");
    expect(formatDemandScope(3, "Arte")).toBe("3 artes");
    expect(formatDemandScope(2, "Ambos")).toBe("2 peças");
  });
});
