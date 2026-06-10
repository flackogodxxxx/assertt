import type { Role, User, UserStatus } from "../contexts/AuthContext";
import type { Demand, DemandStatus, DemandType } from "../contexts/DemandContext";
import type {
  Json,
  NotificationRow,
  ProductionTaskInsert,
  ProductionTaskRow,
  ProfileRow
} from "./supabase-types";

type TaskChecklist = {
  comments?: Demand["comments"];
  caption?: string;
  description?: string;
  dropboxLink?: string;
  planningLink?: string;
};

const statusByDemand: Record<DemandStatus, string> = {
  "A Fazer": "todo",
  "Concluído": "delivered",
  "Em Andamento": "production",
  "Em Revisão": "review"
};

const demandStatusByTask: Record<string, DemandStatus> = {
  adjustments: "Em Revisão",
  approval: "Em Revisão",
  approved: "Concluído",
  blocked: "Em Andamento",
  delivered: "Concluído",
  production: "Em Andamento",
  review: "Em Revisão",
  todo: "A Fazer"
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
    assigneeIds: [row.assignee_id],
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
    status: taskStatusToDemandStatus(row.status),
    statusUpdatedAt: row.updated_at,
    title: row.title,
    type: taskTypeToDemandType(row.type)
  };
}

export function mapDemandToTaskInserts(
  demand: Omit<Demand, "id" | "createdAt" | "status" | "comments" | "statusUpdatedAt">,
  clientId: string
): ProductionTaskInsert[] {
  const dueDate = normalizeDueDate(demand.deadline);
  const taskType = crmTypeToTaskType(demand.type);
  const baseId = `dem-${Date.now()}`;

  return demand.assigneeIds.map((assigneeId, index) => ({
    assignee_id: assigneeId,
    channel: "Instagram",
    checklist: {
      description: demand.description,
      dropboxLink: demand.dropboxLink,
      planningLink: demand.planningLink,
      caption: (demand as Demand).caption
    },
    client_id: clientId,
    deliverable: demand.deliveryLink || "",
    due_date: dueDate,
    estimated_hours: 0,
    id: demand.assigneeIds.length === 1 ? baseId : `${baseId}-${index + 1}`,
    priority: "medium",
    reviewer_id: demand.authorId,
    spent_hours: 0,
    stage_note: demand.description,
    status: "todo",
    title: demand.title,
    type: taskType
  }));
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
