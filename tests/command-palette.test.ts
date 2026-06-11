import { describe, expect, it } from "vitest";
import { buildCommandResults } from "../src/features/command-palette/search";

describe("command palette search", () => {
  const clients = [{ name: "Assert Tech" }, { name: "Cliente Oculto" }];
  const demands = [
    { archived: false, client: "Assert Tech", id: "dem-1", title: "Campanha Junho" },
    { archived: true, client: "Assert Tech", id: "dem-2", title: "Campanha Maio" }
  ];

  it("returns active and archived demands already authorized for the user", () => {
    const results = buildCommandResults({
      clients,
      demands,
      query: "campanha"
    });

    expect(results.map((result) => result.id)).toEqual(["dem-1", "dem-2"]);
    expect(results[1].kind).toBe("archived-demand");
  });

  it("does not invent or query records outside the supplied authorized projection", () => {
    const results = buildCommandResults({
      clients: clients.slice(0, 1),
      demands: demands.slice(0, 1),
      query: "oculto"
    });

    expect(results).toEqual([]);
  });
});
