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
  assignee_id: string;
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
  stage_note: string;
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
