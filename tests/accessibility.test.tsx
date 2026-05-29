import { cleanup, render } from "@testing-library/react";
import { axe } from "jest-axe";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../src/app";
import { ExitIntentModal } from "../src/components/exit-intent-modal";

const ariaAxeOptions = {
  runOnly: {
    type: "tag",
    values: ["cat.aria", "cat.forms"]
  }
};

afterEach(() => {
  cleanup();
});

describe("acessibilidade ARIA", () => {
  it("nao apresenta violacoes axe na landing page", async () => {
    const { container } = render(<App />);
    const results = await axe(container, ariaAxeOptions);

    expect(results.violations).toEqual([]);
  }, 15000);

  it("nao apresenta violacoes axe no modal de exit-intent aberto", async () => {
    const { baseElement } = render(<ExitIntentModal disableExitIntent initialOpen />);
    const results = await axe(baseElement, ariaAxeOptions);

    expect(results.violations).toEqual([]);
  }, 15000);
});
