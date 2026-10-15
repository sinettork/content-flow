export interface AutomationNotificationRow {
  workspace_id: string;
  user_id: string;
  type: "automation";
  title: string;
  body: string;
  is_read: false;
  entity_type: "automation_run";
  entity_id: string;
  automation_run_id: string;
}

export interface BuildAutomationNotificationsInput {
  workspaceId: string;
  runId: string;
  ruleName: string;
  message?: string | null;
  memberIds: string[];
}

/** Build one idempotency-keyed in-app notification per unique workspace member. */
export function buildAutomationNotifications(
  input: BuildAutomationNotificationsInput,
): AutomationNotificationRow[] {
  const memberIds = [...new Set(input.memberIds
    .filter((id) => typeof id === "string" && id.trim().length > 0)
    .map((id) => id.trim()))];

  if (memberIds.length === 0) {
    throw new Error("No workspace members are available to notify.");
  }

  const ruleName = input.ruleName.trim() || "Unnamed automation";
  const message = input.message?.trim() || `Automation "${ruleName}" was triggered.`;
  const title = `Automation: ${ruleName}`.slice(0, 160);
  const body = message.slice(0, 1000);

  return memberIds.map((userId) => ({
    workspace_id: input.workspaceId,
    user_id: userId,
    type: "automation",
    title,
    body,
    is_read: false,
    entity_type: "automation_run",
    entity_id: input.runId,
    automation_run_id: input.runId,
  }));
}
