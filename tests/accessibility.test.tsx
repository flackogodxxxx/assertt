import { cleanup, render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { App } from "../src/app";
import { ExitIntentModal } from "../src/components/exit-intent-modal";
import { DemandReviewWorkspace } from "../src/components/DemandReviewWorkspace";
import type { Demand } from "../src/contexts/DemandContext";
import type { User } from "../src/contexts/AuthContext";

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
    const { container } = render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );
    const results = await axe(container, ariaAxeOptions);

    expect(results.violations).toEqual([]);
  }, 15000);

  it("nao apresenta violacoes axe no modal de exit-intent aberto", async () => {
    const { baseElement } = render(<ExitIntentModal disableExitIntent initialOpen />);
    const results = await axe(baseElement, ariaAxeOptions);

    expect(results.violations).toEqual([]);
  }, 15000);

  it("expoe as decisoes principais da revisao QC", async () => {
    const admin = {
      email: "admin@agencia.com",
      id: "admin-1",
      name: "Admin",
      role: "Admin"
    } as User;
    const demand = {
      assigneeIds: ["vid-1"],
      authorId: "org-1",
      client: "Cliente Assert",
      comments: [{ authorId: "admin-1", createdAt: new Date().toISOString(), id: "c1", text: "Ajustar corte" }],
      createdAt: new Date().toISOString(),
      description: "Briefing",
      id: "dem-review",
      pieceCount: 7,
      pieceInstructions: ["Abertura", "Demonstracao"],
      status: "Em Revisão",
      title: "Reels institucional",
      type: "Vídeo"
    } as Demand;

    const { container } = render(
      <DemandReviewWorkspace
        currentUser={admin}
        demand={demand}
        onAddComment={() => undefined}
        onApprove={() => undefined}
        onClose={() => undefined}
        onRequestChanges={() => undefined}
        videoUrl="https://example.com/video.mp4"
      />
    );

    expect(screen.getByRole("heading", { name: /revisão da entrega/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /solicitar ajustes/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /aprovar e arquivar/i })).toBeTruthy();
    expect(screen.getByRole("slider", { name: /posição do vídeo/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /voltar 5 segundos/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /avançar um quadro/i })).toBeTruthy();
    expect(screen.getByLabelText(/vincular imagens/i)).toBeTruthy();

    const results = await axe(container, ariaAxeOptions);
    expect(results.violations).toEqual([]);
  }, 15000);
});
