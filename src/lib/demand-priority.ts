import type { Demand, DemandStatus, DemandType } from "../contexts/DemandContext";

export type PriorityLevel = "critical" | "high" | "normal" | "waiting";

export type PriorityDemand = Demand & {
  daysUntilDeadline: number | null;
  priorityLevel: PriorityLevel;
  priorityReason: string;
  priorityScore: number;
};

const statusWeight: Record<DemandStatus, number> = {
  "A Fazer": 24,
  "Em Andamento": 34,
  "Em Revisão": 18,
  "Concluído": -100
};

const typeWeight: Record<DemandType, number> = {
  Ambos: 8,
  Arte: 2,
  Vídeo: 6
};

export function getDaysUntilDeadline(deadline?: string, now = new Date()) {
  if (!deadline) {
    return null;
  }

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const target = new Date(deadline);
  target.setHours(0, 0, 0, 0);

  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

function getDeadlineWeight(daysUntilDeadline: number | null) {
  if (daysUntilDeadline === null) return 0;
  if (daysUntilDeadline < 0) return 80;
  if (daysUntilDeadline === 0) return 64;
  if (daysUntilDeadline <= 2) return 46;
  if (daysUntilDeadline <= 5) return 24;
  return 8;
}

export function getPriorityReason(demand: Demand, daysUntilDeadline: number | null) {
  if (demand.status === "Em Revisão") {
    return "Aguardando revisão";
  }

  if (daysUntilDeadline === null) {
    return "Sem prazo definido";
  }

  if (daysUntilDeadline < 0) {
    return `${Math.abs(daysUntilDeadline)} dia${Math.abs(daysUntilDeadline) === 1 ? "" : "s"} em atraso`;
  }

  if (daysUntilDeadline === 0) {
    return "Entrega hoje";
  }

  if (daysUntilDeadline === 1) {
    return "Entrega amanhã";
  }

  return `Entrega em ${daysUntilDeadline} dias`;
}

export function getPriorityLevel(demand: Demand, daysUntilDeadline: number | null): PriorityLevel {
  if (demand.status === "Em Revisão") {
    return "waiting";
  }

  if (daysUntilDeadline !== null && daysUntilDeadline <= 0) {
    return "critical";
  }

  if (daysUntilDeadline !== null && daysUntilDeadline <= 2) {
    return "high";
  }

  return "normal";
}

export function rankDemandsByPriority(demands: Demand[], now = new Date()): PriorityDemand[] {
  return demands
    .filter((demand) => demand.status !== "Concluído")
    .map((demand) => {
      const daysUntilDeadline = getDaysUntilDeadline(demand.deadline, now);
      const priorityScore =
        statusWeight[demand.status] +
        typeWeight[demand.type] +
        getDeadlineWeight(daysUntilDeadline) +
        Math.min(10, demand.pieceCount || 1);

      return {
        ...demand,
        daysUntilDeadline,
        priorityLevel: getPriorityLevel(demand, daysUntilDeadline),
        priorityReason: getPriorityReason(demand, daysUntilDeadline),
        priorityScore
      };
    })
    .sort((a, b) => {
      if (b.priorityScore !== a.priorityScore) {
        return b.priorityScore - a.priorityScore;
      }

      const aDeadline = a.deadline ? new Date(a.deadline).getTime() : Number.POSITIVE_INFINITY;
      const bDeadline = b.deadline ? new Date(b.deadline).getTime() : Number.POSITIVE_INFINITY;
      return aDeadline - bDeadline;
    });
}
