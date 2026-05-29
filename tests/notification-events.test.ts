import { afterEach, describe, expect, it } from "vitest";
import { appendNotificationEvent, getStoredNotificationEvents, type NotificationEvent } from "../src/contexts/NotificationContext";

const event: NotificationEvent = {
  createdAt: "2026-05-29T12:00:00.000Z",
  deliveredTo: [],
  demandId: "dem-1",
  id: "ntf-1",
  message: "Nova demanda com Dropbox e planejamento.",
  seenBy: [],
  targetUserIds: ["vid-1"],
  title: "Nova demanda atribuída",
  type: "info"
};

afterEach(() => {
  localStorage.clear();
});

describe("eventos de notificação", () => {
  it("persiste evento direcionado ao responsavel", () => {
    appendNotificationEvent(event);

    expect(getStoredNotificationEvents()).toEqual([event]);
  });

  it("mantem o destino da notificacao sem marcar como lida automaticamente", () => {
    appendNotificationEvent(event);

    const [storedEvent] = getStoredNotificationEvents();

    expect(storedEvent.targetUserIds).toEqual(["vid-1"]);
    expect(storedEvent.seenBy).toEqual([]);
  });
});
