export const workflowStatuses = [
  "draft",
  "planned",
  "production",
  "review",
  "adjustments",
  "approved",
  "delivered",
  "blocked"
] as const;

export type WorkflowStatus = (typeof workflowStatuses)[number];
export type PieceReviewStatus = "pending" | "changes_requested" | "approved";

export const workflowLabels: Record<WorkflowStatus, string> = {
  adjustments: "Ajustes",
  approved: "Aprovada",
  blocked: "Bloqueada",
  delivered: "Entregue",
  draft: "Rascunho",
  planned: "Planejada",
  production: "Em produção",
  review: "Em revisão"
};

const transitions: Record<WorkflowStatus, WorkflowStatus[]> = {
  adjustments: ["review", "blocked"],
  approved: ["delivered"],
  blocked: [],
  delivered: [],
  draft: ["planned"],
  planned: ["production", "blocked"],
  production: ["review", "blocked"],
  review: ["adjustments", "approved", "blocked"]
};

export function canTransition(from: WorkflowStatus, to: WorkflowStatus) {
  return transitions[from].includes(to);
}

export function validateTransition(
  from: WorkflowStatus,
  to: WorkflowStatus,
  reason?: string
): { valid: boolean; reason?: string } {
  if (to === "blocked" && !reason?.trim()) {
    return { valid: false, reason: "Informe o motivo do bloqueio." };
  }

  if (!canTransition(from, to)) {
    return { valid: false, reason: "Transição de etapa não permitida." };
  }

  return { valid: true };
}

export function getUnblockedStatus(blockedFrom: WorkflowStatus | null | undefined) {
  if (!blockedFrom || blockedFrom === "blocked" || blockedFrom === "delivered") {
    return "planned" satisfies WorkflowStatus;
  }

  return blockedFrom;
}

export function deriveDemandStatusFromPieces(
  pieces: Array<{ isRequired: boolean; reviewStatus: PieceReviewStatus }>
): WorkflowStatus {
  const requiredPieces = pieces.filter((piece) => piece.isRequired);
  return requiredPieces.length > 0 &&
    requiredPieces.every((piece) => piece.reviewStatus === "approved")
    ? "approved"
    : "review";
}

export function isArchivedWorkflowStatus(status: WorkflowStatus) {
  return status === "delivered";
}
