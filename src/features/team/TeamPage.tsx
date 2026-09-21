import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { isSupabaseBackend } from "@/lib/backend";
import { ROLES, type Role } from "@/lib/constants";
import { fromNow } from "@/lib/dates";
import { invitationService, profileService } from "@/services";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";
import type { Profile } from "@/types";

const ROLE_COLORS: Record<Role, string> = {
  admin: "bg-red-100 text-red-800",
  manager: "bg-violet-100 text-violet-800",
  editor: "bg-blue-100 text-blue-800",
  viewer: "bg-slate-100 text-slate-700",
};

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export function TeamPage() {
  const workspaceId = useAuthStore((s) => s.profile?.workspace_id) ?? "";
  const currentRole = useAuthStore((s) => s.profile?.role);

  const [members, setMembers] = useState<Profile[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("viewer");
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    const list = await profileService.listForWorkspace(workspaceId);
    setMembers(list);
  }, [workspaceId]);

  useEffect(() => { load(); }, [load]);

  const handleRoleChange = async (profileId: string, role: Role) => {
    try {
      const updated = await profileService.setRole(profileId, role, currentRole);
      if (!updated) {
        toast("Unable to update team role.", { variant: "destructive" });
        return;
      }
      toast("Team role updated", { variant: "success" });
      await load();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Unable to update team role.", { variant: "destructive" });
    }
  };

  const canManage = currentRole === "admin" || currentRole === "manager";
  const allowedRoles = currentRole === "admin" ? ROLES : ROLES.filter((role) => role === "editor" || role === "viewer");

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await invitationService.invite(inviteEmail, inviteRole);
      setInviteEmail("");
      toast("Invitation sent", { variant: "success" });
      await load();
    } catch (error) {
      toast("Could not send invitation", { description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
    } finally {
      setInviting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Team"
        description={`${members.length} member${members.length !== 1 ? "s" : ""}`}
        actions={<Button asChild variant="outline"><Link to="/app/team/workload">View workload</Link></Button>}
      />

      {isSupabaseBackend && canManage && (
        <Card className="mb-6 flex flex-wrap items-center gap-3 p-4">
          <Input type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="teammate@example.com" className="min-w-60 flex-1" />
          <Select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as Role)} className="w-32">
            {allowedRoles.map((role) => <option key={role} value={role}>{role}</option>)}
          </Select>
          <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>{inviting ? "Sending…" : "Invite member"}</Button>
        </Card>
      )}

      {members.length === 0 ? (
        <EmptyState title="No team members" description="Invite people to your workspace." />
      ) : (
        <Card>
          <div className="overflow-x-auto"><Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Job title</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {members.map((m) => {
                  const canEditRow =
                    currentRole === "admin" ||
                    (currentRole === "manager" && m.role !== "admin" && m.role !== "manager");

                  return (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-[10px]">{initials(m.full_name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{m.full_name}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{m.job_title || "—"}</TableCell>
                    <TableCell>
                      {canManage && canEditRow ? (
                        <Select
                          value={m.role}
                          onChange={(e) => handleRoleChange(m.id, e.target.value as Role)}
                          className="h-8 w-28 text-xs"
                        >
                          {allowedRoles.map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </Select>
                      ) : (
                        <Badge className={ROLE_COLORS[m.role as Role] ?? "bg-muted"}>{m.role}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fromNow(m.created_at)}</TableCell>
                  </TableRow>
                  );
                })}
            </TableBody>
          </Table></div>
        </Card>
      )}
    </>
  );
}
