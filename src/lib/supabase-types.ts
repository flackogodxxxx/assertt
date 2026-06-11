export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ClientRow = {
  active_demands: number;
  approval_time: string;
  id: string;
  monthly_deliveries: number;
  name: string;
  owner_id: string;
  segment: string;
  tier: string;
  updated_at: string;
};

export type DemandAttachmentRow = {
  bucket_id: string;
  created_at: string;
  file_name: string;
  file_size: number;
  id: string;
  mime_type: string;
  storage_path: string;
  task_id: string;
  uploaded_by: string | null;
};

export type NotificationRow = {
  body: string;
  created_at: string;
  created_by: string | null;
  id: string;
  read_at: string | null;
  target_user_id: string | null;
  task_id: string | null;
  title: string;
  type: string;
};

export type NotificationInsert = {
  body?: string;
  created_by?: string | null;
  read_at?: string | null;
  target_user_id?: string | null;
  task_id?: string | null;
  title: string;
  type?: string;
};

export type ProductionTaskRow = {
  archived_at?: string | null;
  archived_by?: string | null;
  assignee_id: string;
  blocked_at?: string | null;
  blocked_by?: string | null;
  blocked_category?: string | null;
  blocked_from_status?: string | null;
  blocked_reason?: string | null;
  channel: string;
  checklist: Json;
  client_id: string;
  created_at: string;
  deliverable: string;
  due_date: string;
  estimated_hours: number;
  id: string;
  priority: string;
  reviewer_id: string | null;
  spent_hours: number;
  stage_entered_at?: string;
  stage_note: string;
  stage_sla_due_at?: string | null;
  status: string;
  title: string;
  type: string;
  updated_at: string;
};

export type ProductionTaskInsert = {
  assignee_id: string;
  channel: string;
  checklist?: Json;
  client_id: string;
  deliverable?: string;
  due_date: string;
  estimated_hours?: number;
  id: string;
  priority: string;
  reviewer_id?: string | null;
  spent_hours?: number;
  stage_note?: string;
  status: string;
  title: string;
  type: string;
};

export type DemandItemRow = {
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
  status: string;
  task_id: string;
  title: string;
  updated_at: string;
};

export type SubmissionRow = {
  created_at: string;
  description: string;
  id: string;
  status: string;
  submitted_by: string;
  task_id: string;
  version: number;
};

export type SubmissionItemRow = {
  created_at: string;
  demand_item_id: string;
  id: string;
  media_type: string;
  review_status: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  submission_id: string;
  url: string;
};

export type ReviewCommentRow = {
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
  status: string;
  submission_id: string | null;
  task_id: string;
};

export type ActivityEventRow = {
  actor_id: string | null;
  client_id: string | null;
  created_at: string;
  event_type: string;
  id: string;
  payload: Json;
  task_id: string | null;
};

export type NotificationPreferenceRow = {
  assignment_enabled: boolean;
  deadline_enabled: boolean;
  desktop_enabled: boolean;
  review_enabled: boolean;
  sound_enabled: boolean;
  updated_at: string;
  user_id: string;
};

export type AutomationEventRow = {
  created_at: string;
  error: string | null;
  event_key: string;
  id: string;
  payload: Json;
  processed_at: string | null;
  source: string;
  status: string;
  task_id: string | null;
};

export type ProfileRow = {
  auth_user_id: string | null;
  avatar_url: string | null;
  email: string;
  id: string;
  name: string;
  role: string;
  status: string | null;
  updated_at: string | null;
};

export type ProfileUpdate = {
  avatar_url?: string | null;
  name?: string;
  status?: string | null;
  updated_at?: string | null;
};

export type TeamMemberRow = {
  capacity: number;
  focus: string;
  id: string;
  initials: string;
  mood: string;
  name: string;
  role: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      clients: {
        Row: ClientRow;
        Insert: Omit<ClientRow, "updated_at"> & { updated_at?: string };
        Update: Partial<ClientRow>;
      };
      demand_attachments: {
        Row: DemandAttachmentRow;
        Insert: Omit<DemandAttachmentRow, "created_at" | "id"> & { created_at?: string; id?: string };
        Update: Partial<DemandAttachmentRow>;
      };
      demand_items: {
        Row: DemandItemRow;
        Insert: Omit<DemandItemRow, "approved_at" | "approved_by" | "created_at" | "id" | "updated_at"> &
          Partial<Pick<DemandItemRow, "approved_at" | "approved_by" | "created_at" | "id" | "updated_at">>;
        Update: Partial<DemandItemRow>;
      };
      submissions: {
        Row: SubmissionRow;
        Insert: Omit<SubmissionRow, "created_at" | "id" | "status" | "version"> &
          Partial<Pick<SubmissionRow, "created_at" | "id" | "status" | "version">>;
        Update: Partial<SubmissionRow>;
      };
      submission_items: {
        Row: SubmissionItemRow;
        Insert: Omit<SubmissionItemRow, "created_at" | "id" | "review_status" | "reviewed_at" | "reviewed_by"> &
          Partial<Pick<SubmissionItemRow, "created_at" | "id" | "review_status" | "reviewed_at" | "reviewed_by">>;
        Update: Partial<SubmissionItemRow>;
      };
      review_comments: {
        Row: ReviewCommentRow;
        Insert: Omit<ReviewCommentRow, "created_at" | "id" | "resolved_at" | "resolved_by" | "status"> &
          Partial<Pick<ReviewCommentRow, "created_at" | "id" | "resolved_at" | "resolved_by" | "status">>;
        Update: Partial<ReviewCommentRow>;
      };
      activity_events: {
        Row: ActivityEventRow;
        Insert: Omit<ActivityEventRow, "created_at" | "id"> &
          Partial<Pick<ActivityEventRow, "created_at" | "id">>;
        Update: never;
      };
      notification_preferences: {
        Row: NotificationPreferenceRow;
        Insert: Omit<NotificationPreferenceRow, "updated_at"> & { updated_at?: string };
        Update: Partial<NotificationPreferenceRow>;
      };
      automation_events: {
        Row: AutomationEventRow;
        Insert: Omit<AutomationEventRow, "created_at" | "id"> &
          Partial<Pick<AutomationEventRow, "created_at" | "id">>;
        Update: never;
      };
      notifications: {
        Row: NotificationRow;
        Insert: NotificationInsert;
        Update: Partial<NotificationRow>;
      };
      production_tasks: {
        Row: ProductionTaskRow;
        Insert: ProductionTaskInsert;
        Update: Partial<ProductionTaskRow>;
      };
      profiles: {
        Row: ProfileRow;
        Insert: Omit<ProfileRow, "updated_at"> & { updated_at?: string | null };
        Update: ProfileUpdate;
      };
      team_members: {
        Row: TeamMemberRow;
        Insert: Omit<TeamMemberRow, "updated_at"> & { updated_at?: string };
        Update: Partial<TeamMemberRow>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
