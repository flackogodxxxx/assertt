import { describe, expect, it } from "vitest";
import { canUserSeeDemand, type Demand } from "../src/contexts/DemandContext";
import type { User } from "../src/contexts/AuthContext";

const demand: Demand = {
  assigneeIds: ["designer-1"],
  authorId: "organizer-1",
  client: "Cliente Assert",
  createdAt: "2026-05-29T12:00:00.000Z",
  description: "Briefing interno",
  id: "dem-test",
  status: "A Fazer",
  title: "Arte de campanha",
  type: "Arte"
};

const admin: User = {
  email: "admin@assert.test",
  id: "admin-1",
  name: "Admin",
  role: "Admin"
};

const assignee: User = {
  email: "designer@assert.test",
  id: "designer-1",
  name: "Designer",
  role: "Designer"
};

const organizer: User = {
  email: "organizer@assert.test",
  id: "organizer-1",
  name: "Organizer",
  role: "Organizador"
};

describe("visibilidade de demandas", () => {
  it("permite que o admin veja qualquer demanda", () => {
    expect(canUserSeeDemand(demand, admin)).toBe(true);
  });

  it("permite que apenas o responsavel atribuido veja a demanda", () => {
    expect(canUserSeeDemand(demand, assignee)).toBe(true);
  });

  it("nao mostra a demanda para o organizador que nao foi atribuido", () => {
    expect(canUserSeeDemand(demand, organizer)).toBe(false);
  });
});
