/** Public monday.com mapping types. Tokens and client credentials never belong here. */
export const MONDAY_API_VERSION = "2026-07";

export type MondayColumnKind =
  | "text"
  | "long_text"
  | "status"
  | "date"
  | "timeline"
  | "people"
  | "numbers"
  | "link"
  | "unsupported";

export interface MondayBoardMapping {
  boardId: string;
  workspaceId: string;
  name: string;
  enabled: boolean;
  columns: MondayColumnMapping[];
}

export interface MondayColumnMapping {
  mondayColumnId: string;
  mondayColumnType: MondayColumnKind;
  contentField:
    | "title"
    | "brief"
    | "master_status"
    | "due_at"
    | "scheduled_at"
    | "assigned_to"
    | "priority"
    | "campaign"
    | "ignore";
  direction: "import" | "export" | "bidirectional";
}

export interface MondayConnection {
  id: string;
  workspaceId: string;
  boardId: string | null;
  accountId: string;
  accountName: string;
  apiVersion: string;
  status: "active" | "paused" | "error" | "disconnected";
}
