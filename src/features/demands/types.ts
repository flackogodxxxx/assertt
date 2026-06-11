import type { Json } from "../../lib/supabase-types";
import type { WorkflowStatus } from "./workflow";

export type DemandItem = {
  approved_at: string | null;
  approved_by: string | null;
  assignee_id: string | null;
  created_at: string;
  estimated_minutes: number;
  id: string;
  instruction: string;
  is_required: boolean;
  item_type: string;
  position: number;
  status: "planned" | "production" | "review" | "adjustments" | "approved" | "delivered";
  task_id: string;
  title: string;
  updated_at: string;
};

export type SubmissionItem = {
  created_at: string;
  demand_item_id: string;
  id: string;
  media_type: string;
  review_status: "pending" | "changes_requested" | "approved";
  reviewed_at: string | null;
  reviewed_by: string | null;
  submission_id: string;
  url: string;
};

export type DemandSubmission = {
  created_at: string;
  description: string;
  id: string;
  items: SubmissionItem[];
  status: "pending_review" | "changes_requested" | "partially_approved" | "approved";
  submitted_by: string;
  task_id: string;
  version: number;
};

export type ReviewComment = {
  author_id: string;
  body: string;
  created_at: string;
  demand_item_id: string | null;
  end_seconds: number | null;
  id: string;
  reference_attachments: Json;
  resolved_at: string | null;
  resolved_by: string | null;
  start_seconds: number | null;
  status: "open" | "resolved";
  submission_id: string | null;
  task_id: string;
};

export type ActivityEvent = {
  actor_id: string | null;
  client_id: string | null;
  created_at: string;
  event_type: string;
  id: string;
  payload: Json;
  task_id: string | null;
};

export type WorkspaceTask = {
  archived_at: string | null;
  archived_by: string | null;
  assignee_id: string;
  blocked_at: string | null;
  blocked_by: string | null;
  blocked_category: string | null;
  blocked_from_status: WorkflowStatus | null;
  blocked_reason: string | null;
  channel: string;
  checklist: Json;
  client_id: string;
  clients?: { name?: string } | null;
  created_at: string;
  deliverable: string;
  due_date: string;
  estimated_hours: number;
  id: string;
  priority: string;
  reviewer_id: string | null;
  spent_hours: number;
  stage_entered_at: string;
  stage_note: string;
  stage_sla_due_at: string | null;
  status: WorkflowStatus;
  title: string;
  type: string;
  updated_at: string;
};

export type DemandWorkspaceData = {
  activities: ActivityEvent[];
  comments: ReviewComment[];
  items: DemandItem[];
  submissions: DemandSubmission[];
  task: WorkspaceTask;
};

export type PartialSubmissionInput = {
  demandItemId: string;
  mediaType?: string;
  url: string;
};
