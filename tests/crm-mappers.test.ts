import { describe, expect, it } from "vitest";
import {
  crmTypeToTaskType,
  mapDemandToTaskInserts,
  mapProfileToUser,
  mapTaskRowToDemand,
  statusToTaskStatus,
  taskStatusToDemandStatus,
  taskTypeToDemandType
} from "../src/lib/crm-mappers";
import type { ProfileRow, ProductionTaskRow } from "../src/lib/supabase-types";

const task: ProductionTaskRow = {
  assignee_id: "des-1",
  channel: "Instagram",
  checklist: {
    comments: [{
      authorId: "admin-1",
      createdAt: "2026-06-10T12:00:00.000Z",
      endTimestamp: "00:08.000",
      id: "comment-1",
      referenceImages: [{
        id: "ref-1",
        mimeType: "image/png",
        name: "referencia.png",
        path: "dem-1/comment-1/referencia.png"
      }],
      text: "Trocar a imagem",
      timestamp: "00:04.000"
    }],
    description: "Briefing detalhado",
    dropboxLink: "https://dropbox.example/brief",
    pieceCount: 7,
    pieceInstructions: ["Video 1", "Video 2"],
    planningLink: "https://canva.example/planning"
  },
  client_id: "cli-facta",
  created_at: "2026-06-10",
  deliverable: "https://canva.example/final",
  due_date: "2026-06-20",
  estimated_hours: 0,
  id: "dem-1",
  priority: "medium",
  reviewer_id: "admin-1",
  spent_hours: 0,
  stage_note: "Em edicao",
  status: "review",
  title: "Reels institucional",
  type: "video",
  updated_at: "2026-06-10T12:00:00.000Z"
};

const profile: ProfileRow = {
  auth_user_id: "2c671516-719d-4ccd-8ebe-5acfb5083250",
  avatar_url: "https://example.com/avatar.png",
  email: "bianca@agencia.com",
  id: "admin-1",
  name: "Bianca",
  role: "Admin",
  status: "ONLINE",
  updated_at: "2026-06-10T12:00:00.000Z"
};

describe("crm mappers", () => {
  it("converte status e tipo entre CRM e Supabase", () => {
    expect(statusToTaskStatus("A Fazer")).toBe("todo");
    expect(statusToTaskStatus("Em Andamento")).toBe("production");
    expect(statusToTaskStatus("Em Revisão")).toBe("review");
    expect(statusToTaskStatus("Concluído")).toBe("delivered");

    expect(taskStatusToDemandStatus("adjustments")).toBe("Em Revisão");
    expect(taskStatusToDemandStatus("approved")).toBe("Concluído");
    expect(taskTypeToDemandType("carousel")).toBe("Arte");
    expect(crmTypeToTaskType("Ambos")).toBe("carousel");
  });

  it("converte uma production_task em Demand preservando dados de briefing", () => {
    const demand = mapTaskRowToDemand(task, "Facta Promotora");

    expect(demand).toMatchObject({
      assigneeIds: ["des-1"],
      authorId: "admin-1",
      client: "Facta Promotora",
      deadline: "2026-06-20T15:00:00.000Z",
      deliveryLink: "https://canva.example/final",
      description: "Briefing detalhado",
      dropboxLink: "https://dropbox.example/brief",
      id: "dem-1",
      pieceCount: 7,
      pieceInstructions: ["Video 1", "Video 2"],
      planningLink: "https://canva.example/planning",
      status: "Em Revisão",
      title: "Reels institucional",
      type: "Vídeo"
    });
    expect(demand.comments?.[0]).toMatchObject({
      endTimestamp: "00:08.000",
      referenceImages: [{ name: "referencia.png" }],
      timestamp: "00:04.000"
    });
  });

  it("converte nova demanda em inserts de tasks para cada responsavel", () => {
    const inserts = mapDemandToTaskInserts(
      {
        assigneeIds: ["des-1", "vid-1"],
        authorId: "org-1",
        client: "Facta Promotora",
        deadline: "2026-06-20T12:00:00.000Z",
        description: "Briefing detalhado",
        dropboxLink: "https://dropbox.example/brief",
        pieceCount: 7,
        pieceInstructions: ["Abertura", "Demonstracao"],
        planningLink: "https://canva.example/planning",
        title: "Campanha multiformato",
        type: "Ambos"
      },
      "cli-facta"
    );

    expect(inserts).toHaveLength(2);
    expect(inserts[0]).toMatchObject({
      assignee_id: "des-1",
      channel: "Instagram",
      client_id: "cli-facta",
      due_date: "2026-06-20",
      priority: "medium",
      reviewer_id: "org-1",
      status: "todo",
      title: "Campanha multiformato",
      type: "carousel"
    });
    expect(inserts[0].checklist).toMatchObject({
      description: "Briefing detalhado",
      dropboxLink: "https://dropbox.example/brief",
      pieceCount: 7,
      pieceInstructions: ["Abertura", "Demonstracao"],
      planningLink: "https://canva.example/planning"
    });
  });

  it("converte profile em User do CRM", () => {
    expect(mapProfileToUser(profile)).toEqual({
      avatar: "https://example.com/avatar.png",
      email: "bianca@agencia.com",
      id: "admin-1",
      name: "Bianca",
      role: "Admin",
      status: "ONLINE"
    });
  });
});
