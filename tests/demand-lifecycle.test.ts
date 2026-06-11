import { describe, expect, it } from "vitest";
import type { User } from "../src/contexts/AuthContext";
import type { Demand } from "../src/contexts/DemandContext";
import {
  canPermanentlyDeleteDemand,
  getArchivedDemands,
  getOperationalDemands
} from "../src/lib/demand-lifecycle";

const demand = (id: string, status: Demand["status"]) =>
  ({ id, status } as Demand);

describe("demand lifecycle", () => {
  it("keeps concluded demands outside operational surfaces", () => {
    expect(
      getOperationalDemands([
        demand("active", "Em Revisão"),
        demand("done", "Concluído")
      ]).map((item) => item.id)
    ).toEqual(["active"]);
  });

  it("keeps concluded demands in the archive", () => {
    expect(
      getArchivedDemands([
        demand("active", "A Fazer"),
        demand("done", "Concluído")
      ]).map((item) => item.id)
    ).toEqual(["done"]);
  });

  it("archives only the canonical delivered state when workflow metadata exists", () => {
    const approved = {
      ...demand("approved", "Em Revisão"),
      workflowStatus: "approved"
    } as Demand;
    const delivered = {
      ...demand("delivered", "Concluído"),
      workflowStatus: "delivered"
    } as Demand;

    expect(getOperationalDemands([approved, delivered]).map((item) => item.id)).toEqual([
      "approved"
    ]);
    expect(getArchivedDemands([approved, delivered]).map((item) => item.id)).toEqual([
      "delivered"
    ]);
  });

  it("allows permanent deletion only for admins and archived demands", () => {
    const admin = { role: "Admin" } as User;
    const organizer = { role: "Organizador" } as User;

    expect(canPermanentlyDeleteDemand(admin, demand("done", "Concluído"))).toBe(true);
    expect(canPermanentlyDeleteDemand(organizer, demand("done", "Concluído"))).toBe(false);
    expect(canPermanentlyDeleteDemand(admin, demand("active", "A Fazer"))).toBe(false);
  });
});
