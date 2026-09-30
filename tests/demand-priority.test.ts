import { describe, expect, it } from "vitest";
import type { Demand } from "../src/contexts/DemandContext";
import { getDaysUntilDeadline, rankDemandsByPriority } from "../src/lib/demand-priority";

function demand(overrides: Partial<Demand>): Demand {
  return {
    assigneeIds: ["des-1"],
    authorId: "admin-1",
    client: "Cliente",
    comments: [],
    createdAt: "2026-09-20T12:00:00.000Z",
    description: "Briefing",
    id: "dem-1",
    pieceCount: 1,
    status: "A Fazer",
    statusUpdatedAt: "2026-09-20T12:00:00.000Z",
    title: "Demanda",
    type: "Arte",
    ...overrides
  };
}

describe("demand priority", () => {
  const now = new Date("2026-09-30T15:00:00.000Z");

  it("calcula dias ate o prazo ignorando o horario", () => {
    expect(getDaysUntilDeadline("2026-09-30T23:00:00.000Z", now)).toBe(0);
    expect(getDaysUntilDeadline("2026-10-01T08:00:00.000Z", now)).toBe(1);
    expect(getDaysUntilDeadline("2026-09-28T08:00:00.000Z", now)).toBe(-2);
  });

  it("prioriza demandas atrasadas e remove concluidas", () => {
    const ranked = rankDemandsByPriority(
      [
        demand({ id: "future-video", deadline: "2026-10-03T12:00:00.000Z", type: "Vídeo" }),
        demand({ id: "late-art", deadline: "2026-09-29T12:00:00.000Z", type: "Arte" }),
        demand({ id: "done", deadline: "2026-09-28T12:00:00.000Z", status: "Concluído" })
      ],
      now
    );

    expect(ranked.map((item) => item.id)).toEqual(["late-art", "future-video"]);
    expect(ranked[0].priorityLevel).toBe("critical");
    expect(ranked[0].priorityReason).toBe("1 dia em atraso");
  });
});
