import type { Role, User, UserStatus } from "../contexts/AuthContext";
import type { Demand, DemandStatus, DemandType } from "../contexts/DemandContext";
import type {
  Json,
  NotificationRow,
  ProductionTaskInsert,
  ProductionTaskRow,
  ProfileRow
} from "./supabase-types";
import type { WorkflowStatus } from "../features/demands/workflow";

type TaskChecklist = {
  comments?: Demand["comments"];
  caption?: string;
  description?: string;
  dropboxLink?: string;
  pieceCount?: number;
  pieceInstructions?: string[];
  planningLink?: string;
  videoUrl?: string;
  deliveries?: import("../contexts/DemandContext").DeliveryItem[];
  approvedPieces?: number[];
  assigneeIds?: string[];
};

const statusByDemand: Record<DemandStatus, string> = {
  "A Fazer": "planned",
  "Concluído": "delivered",
  "Em Andamento": "production",
  "Em Revisão": "review"
};

const demandStatusByTask: Record<string, DemandStatus> = {
  adjustments: "Em Revisão",
  approval: "Em Revisão",
  approved: "Em Revisão",
  blocked: "Em Andamento",
  delivered: "Concluído",
  production: "Em Andamento",
  review: "Em Revisão",
  planned: "A Fazer",
  draft: "A Fazer",
  todo: "A Fazer"
};

const workflowStatusByTask: Record<string, WorkflowStatus> = {
  adjustments: "adjustments",
  approval: "review",
  approved: "approved",
  blocked: "blocked",
  delivered: "delivered",
  draft: "draft",
  planned: "planned",
  production: "production",
  review: "review",
  todo: "planned"
};

const typeByDemand: Record<DemandType, string> = {
  Ambos: "carousel",
  Arte: "carousel",
  Vídeo: "video"
};

const demandTypeByTask: Record<string, DemandType> = {
  carousel: "Arte",
  post: "Arte",
  video: "Vídeo"
};

export function statusToTaskStatus(status: DemandStatus) {
  return statusByDemand[status];
}

export function taskStatusToDemandStatus(status: string): DemandStatus {
  return demandStatusByTask[status] || "A Fazer";
}

export function taskStatusToWorkflowStatus(status: string): WorkflowStatus {
  return workflowStatusByTask[status] || "planned";
}

export function crmTypeToTaskType(type: DemandType) {
  return typeByDemand[type];
}

export function taskTypeToDemandType(type: string): DemandType {
  return demandTypeByTask[type] || "Arte";
}

export function normalizeDueDate(value?: string) {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }

  return value.slice(0, 10);
}

export function toDemandDeadline(value?: string) {
  if (!value) {
    return undefined;
  }

  return new Date(`${value.slice(0, 10)}T12:00:00`).toISOString();
}

function isChecklist(value: any): value is TaskChecklist {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readChecklist(value: Json): TaskChecklist {
  return isChecklist(value) ? value : {};
}

export function mapTaskRowToDemand(row: ProductionTaskRow, clientName: string): Demand {
  const checklist = readChecklist(row.checklist);

  return {
    assigneeIds: checklist.assigneeIds?.length ? checklist.assigneeIds : [row.assignee_id],
    authorId: row.reviewer_id || "",
    client: clientName,
    comments: checklist.comments || [],
    caption: checklist.caption,
    createdAt: new Date(row.created_at).toISOString(),
    deadline: toDemandDeadline(row.due_date),
    deliveryLink: row.deliverable || undefined,
    description: checklist.description || row.stage_note || "",
    dropboxLink: checklist.dropboxLink,
    id: row.id,
    planningLink: checklist.planningLink,
    pieceCount: checklist.pieceCount || 1,
    pieceInstructions: checklist.pieceInstructions || [],
    status: taskStatusToDemandStatus(row.status),
    statusUpdatedAt: row.updated_at,
    title: row.title,
    type: taskTypeToDemandType(row.type),
    deliveries: checklist.deliveries,
    approvedPieces: checklist.approvedPieces,
    archivedAt: row.archived_at || undefined,
    blockedCategory: row.blocked_category || undefined,
    blockedFromStatus: row.blocked_from_status
      ? taskStatusToWorkflowStatus(row.blocked_from_status)
      : undefined,
    blockedReason: row.blocked_reason || undefined,
    reviewerId: row.reviewer_id || undefined,
    stageEnteredAt: row.stage_entered_at,
    stageSlaDueAt: row.stage_sla_due_at || undefined,
    workflowStatus: taskStatusToWorkflowStatus(row.status)
  };
}

export function mapDemandToTaskInserts(
  demand: Omit<Demand, "id" | "createdAt" | "status" | "comments" | "statusUpdatedAt">,
  clientId: string,
  taskId = `dem-${Date.now()}`
): ProductionTaskInsert[] {
  const dueDate = normalizeDueDate(demand.deadline);
  const taskType = crmTypeToTaskType(demand.type);
  const primaryAssigneeId = demand.assigneeIds[0] || demand.authorId;

  return [{
    assignee_id: primaryAssigneeId,
    channel: "Instagram",
    checklist: {
      description: demand.description,
      dropboxLink: demand.dropboxLink,
      pieceCount: demand.pieceCount || 1,
      pieceInstructions: demand.pieceInstructions || [],
      planningLink: demand.planningLink,
      caption: (demand as Demand).caption,
      assigneeIds: demand.assigneeIds
    },
    client_id: clientId,
    deliverable: demand.deliveryLink || "",
    due_date: dueDate,
    estimated_hours: 0,
    id: taskId,
    priority: "medium",
    reviewer_id: demand.authorId,
    spent_hours: 0,
    stage_note: demand.description,
    status: "planned",
    title: demand.title,
    type: taskType
  }];
}

export function mapProfileToUser(profile: ProfileRow): User {
  return {
    avatar: profile.avatar_url || undefined,
    email: profile.email,
    id: profile.id,
    name: profile.name,
    role: profile.role as Role,
    status: (profile.status || "ONLINE") as UserStatus
  };
}

export function notificationRowToEvent(row: NotificationRow, targetUserIds: string[]) {
  return {
    createdAt: row.created_at,
    deliveredTo: [],
    demandId: row.task_id || undefined,
    id: row.id,
    message: row.body,
    seenBy: row.read_at ? targetUserIds : [],
    targetUserIds,
    title: row.title,
    type: row.type === "urgent" ? "warning" : row.type === "success" ? "success" : "info"
  };
}
