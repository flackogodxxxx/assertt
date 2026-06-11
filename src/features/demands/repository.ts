import { supabase } from "../../lib/supabase";
import type {
  ActivityEvent,
  DemandItem,
  DemandSubmission,
  DemandWorkspaceData,
  PartialSubmissionInput,
  ReviewComment,
  SubmissionItem,
  WorkspaceTask
} from "./types";
import type { WorkflowStatus } from "./workflow";

const db = supabase as any;

type WorkspaceRows = {
  activities: Array<Partial<ActivityEvent> & { created_at: string; id: string }>;
  comments: Array<Partial<ReviewComment> & { created_at: string; id: string; status: string }>;
  items: Array<Partial<DemandItem> & { id: string; position: number }>;
  submissionItems: Array<Partial<SubmissionItem> & { id: string; submission_id: string }>;
  submissions: Array<
    Partial<DemandSubmission> & { created_at: string; id: string; version: number }
  >;
  task: Partial<WorkspaceTask> & { id: string; status: string };
};

export function mapWorkspaceRows(rows: WorkspaceRows): DemandWorkspaceData {
  const submissionItems = rows.submissionItems as SubmissionItem[];
  return {
    activities: [...rows.activities].sort(
      (left, right) =>
        new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
    ) as ActivityEvent[],
    comments: [...rows.comments].sort(
      (left, right) =>
        new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
    ) as ReviewComment[],
    items: [...rows.items].sort((left, right) => left.position - right.position) as DemandItem[],
    submissions: [...rows.submissions]
      .sort((left, right) => right.version - left.version)
      .map((submission) => ({
        ...submission,
        items: submissionItems.filter((item) => item.submission_id === submission.id)
      })) as DemandSubmission[],
    task: rows.task as WorkspaceTask
  };
}

async function requireData<T>(promise: PromiseLike<{ data: T | null; error: Error | null }>) {
  const { data, error } = await promise;
  if (error) throw error;
  if (data === null) throw new Error("Dados não encontrados.");
  return data;
}

export async function fetchDemandWorkspace(taskId: string) {
  const [task, items, submissions, submissionItems, comments, activities] = (await Promise.all([
    requireData(
      db.from("production_tasks").select("*, clients(name)").eq("id", taskId).single()
    ),
    requireData(db.from("demand_items").select("*").eq("task_id", taskId)),
    requireData(db.from("submissions").select("*").eq("task_id", taskId)),
    requireData(
      db
        .from("submission_items")
        .select("*, submissions!inner(task_id)")
        .eq("submissions.task_id", taskId)
    ),
    requireData(db.from("review_comments").select("*").eq("task_id", taskId)),
    requireData(db.from("activity_events").select("*").eq("task_id", taskId))
  ])) as [
    WorkspaceTask,
    DemandItem[],
    DemandSubmission[],
    SubmissionItem[],
    ReviewComment[],
    ActivityEvent[]
  ];

  return mapWorkspaceRows({
    activities,
    comments,
    items,
    submissionItems,
    submissions,
    task
  });
}

export async function transitionDemand(
  taskId: string,
  toStatus: WorkflowStatus,
  reason?: string,
  blockCategory?: string
) {
  return requireData(
    db.rpc("transition_demand", {
      p_block_category: blockCategory || null,
      p_reason: reason || null,
      p_task_id: taskId,
      p_to_status: toStatus
    })
  );
}

export async function reassignDemand(taskId: string, assigneeId: string, reason: string) {
  return requireData(
    db.rpc("reassign_demand", {
      p_assignee_id: assigneeId,
      p_reason: reason,
      p_task_id: taskId
    })
  );
}

export async function createPartialSubmission(
  taskId: string,
  description: string,
  items: PartialSubmissionInput[]
) {
  return requireData(
    db.rpc("create_partial_submission", {
      p_description: description,
      p_items: items.map((item) => ({
        demand_item_id: item.demandItemId,
        media_type: item.mediaType || "link",
        url: item.url
      })),
      p_task_id: taskId
    })
  );
}

export async function reviewSubmissionItem(
  submissionItemId: string,
  decision: "approved" | "changes_requested"
) {
  return requireData(
    db.rpc("review_submission_item", {
      p_decision: decision,
      p_submission_item_id: submissionItemId
    })
  );
}

export async function addReviewComment(input: {
  body: string;
  demandItemId?: string;
  endSeconds?: number;
  referenceAttachments?: unknown[];
  startSeconds?: number;
  submissionId?: string;
  taskId: string;
  authorId: string;
}) {
  return requireData(
    db
      .from("review_comments")
      .insert({
        author_id: input.authorId,
        body: input.body,
        demand_item_id: input.demandItemId || null,
        end_seconds: input.endSeconds ?? null,
        reference_attachments: input.referenceAttachments || [],
        start_seconds: input.startSeconds ?? null,
        submission_id: input.submissionId || null,
        task_id: input.taskId
      })
      .select("*")
      .single()
  );
}

export async function resolveReviewComment(commentId: string) {
  return requireData(db.rpc("resolve_review_comment", { p_comment_id: commentId }));
}

export async function updateDemandItem(
  itemId: string,
  updates: Partial<Pick<DemandItem, "assignee_id" | "estimated_minutes" | "instruction" | "status" | "title">>
) {
  return requireData(
    db.from("demand_items").update(updates).eq("id", itemId).select("*").single()
  );
}
