import type {
  ApprovalDecision,
  CampaignStatus,
  ContentType,
  MasterStatus,
  Platform,
  PlatformStatus,
  Priority,
  Role,
} from "@/lib/constants";

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  logo_path: string | null;
  created_by: string;
  created_at: string;
}

export interface Profile {
  id: string;
  workspace_id: string;
  full_name: string;
  email: string;
  avatar_path: string | null;
  role: Role;
  job_title: string | null;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  workspace_id: string;
  name: string;
  description: string;
  color: string;
  start_date: string | null;
  end_date: string | null;
  owner_id: string;
  status: CampaignStatus;
  created_at: string;
  updated_at: string;
}

export interface ContentItem {
  id: string;
  workspace_id: string;
  campaign_id: string | null;
  title: string;
  slug: string;
  content_type: ContentType;
  master_status: MasterStatus;
  priority: Priority;
  brief: string | null;
  thumbnail_asset_id: string | null;
  created_by: string;
  assigned_to: string | null;
  approved_by: string | null;
  approved_at: string | null;
  due_at: string | null;
  scheduled_at: string | null;
  posted_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContentPlatform {
  id: string;
  workspace_id: string;
  content_item_id: string;
  platform_name: Platform;
  platform_status: PlatformStatus;
  caption: string;
  hashtags: string;
  scheduled_at: string | null;
  posted_at: string | null;
  post_url: string | null;
  posted_by: string | null;
  checklist_completed: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContentAsset {
  id: string;
  workspace_id: string;
  content_item_id: string;
  category: "design" | "video" | "document" | "source" | "posted" | "uncategorized";
  asset_type: "image" | "video" | "thumbnail" | "pdf" | "source";
  storage_bucket: string;
  storage_path: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  uploaded_by: string;
  created_at: string;
}

export interface Comment {
  id: string;
  workspace_id: string;
  content_item_id: string;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  workspace_id: string;
  content_item_id: string;
  user_id: string;
  action_type: string;
  old_value: Json | null;
  new_value: Json | null;
  metadata: Json | null;
  created_at: string;
}

export interface Tag {
  id: string;
  workspace_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface ContentItemTag {
  content_item_id: string;
  tag_id: string;
}

export interface Notification {
  id: string;
  workspace_id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
}

export interface ApprovalRequest {
  id: string;
  workspace_id: string;
  content_item_id: string;
  requested_by: string;
  reviewed_by: string | null;
  decision: ApprovalDecision | null;
  decision_note: string | null;
  created_at: string;
  decided_at: string | null;
}
