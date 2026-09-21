import { CalendarDays, Paintbrush, Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { CampaignColorDot } from "@/components/campaigns/CampaignColorDot";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { ContentWorkspaceNav } from "@/components/content/ContentWorkspaceNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ColorPicker } from "@/components/ui/color-picker";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { usePermission } from "@/hooks/usePermission";
import { CAMPAIGN_STATUSES } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import { campaignService, contentService } from "@/services";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";
import type { Campaign } from "@/types";

interface FormState {
  name: string;
  status: string;
  color: string;
  start_date: string;
  end_date: string;
}

const emptyForm: FormState = { name: "", status: "active", color: "#6366f1", start_date: "", end_date: "" };

export function CampaignsPage() {
  const navigate = useNavigate();
  const workspaceId = useAuthStore((s) => s.profile?.workspace_id) ?? "";
  const ownerId = useAuthStore((s) => s.profile?.id) ?? "";
  const canManage = usePermission("manageCampaigns");

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const load = async () => {
    const list = await campaignService.list();
    setCampaigns(list);
    const items = await contentService.list({});
    const counts: Record<string, number> = {};
    for (const it of items) {
      if (it.campaign_id) counts[it.campaign_id] = (counts[it.campaign_id] ?? 0) + 1;
    }
    setItemCounts(counts);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (c: Campaign) => {
    setEditing(c);
    setForm({
      name: c.name,
      status: c.status,
      color: c.color,
      start_date: c.start_date?.slice(0, 10) ?? "",
      end_date: c.end_date?.slice(0, 10) ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      name: form.name,
      status: form.status as Campaign["status"],
      color: form.color,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    };
    if (editing) {
      await campaignService.update(editing.id, payload);
    } else {
      await campaignService.create({
        ...payload,
        workspace_id: workspaceId,
        owner_id: ownerId,
        description: "",
      });
    }
    setDialogOpen(false);
    toast(editing ? "Campaign updated" : "Campaign created", { variant: "success" });
    await load();
  };

  const handleDelete = async (id: string) => {
    await campaignService.remove(id);
    toast("Campaign deleted", { variant: "destructive" });
    await load();
  };

  const STATUS_COLORS: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-800",
    completed: "bg-violet-100 text-violet-800",
    paused: "bg-amber-100 text-amber-800",
    archived: "bg-zinc-100 text-zinc-700",
  };

  return (
    <>
      <ContentWorkspaceNav />
      <PageHeader
        title="Campaigns"
        description={`${campaigns.length} campaign${campaigns.length !== 1 ? "s" : ""}`}
        actions={
          canManage ? (
            <Button onClick={openCreate}>
              <Plus className="mr-1 h-4 w-4" /> New campaign
            </Button>
          ) : undefined
        }
      />

      {campaigns.length === 0 ? (
        <EmptyState
          title="No campaigns yet"
          description="Create a campaign to group and track related content."
          action={
            canManage ? (
              <Button onClick={openCreate}>
                <Plus className="mr-1 h-4 w-4" /> New campaign
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => (
            <Card
              key={c.id}
              className="cursor-pointer transition-colors hover:border-primary/30 hover:bg-muted/10"
              onClick={() => navigate(`/app/campaigns/${c.id}`)}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                  <CampaignColorDot color={c.color} />
                  <CardTitle className="text-sm font-medium">{c.name}</CardTitle>
                </div>
                <Badge className={STATUS_COLORS[c.status] ?? "bg-muted"}>{c.status}</Badge>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <div className="flex justify-between">
                  <span>{itemCounts[c.id] ?? 0} content items</span>
                  <span>
                    {c.start_date && formatDate(c.start_date, "MMM d")}
                    {c.start_date && c.end_date && " – "}
                    {c.end_date && formatDate(c.end_date, "MMM d")}
                  </span>
                </div>
                {canManage && (
                  <div className="flex gap-1 pt-1">
                    <Button variant="ghost" size="sm" className="h-7 px-2" onClick={(event) => { event.stopPropagation(); openEdit(c); }}>
                      <Pencil className="mr-1 h-3 w-3" /> Edit
                    </Button>
                    <ConfirmDialog
                      trigger={
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive hover:text-destructive" onClick={(event) => event.stopPropagation()}>
                          <Trash2 className="mr-1 h-3 w-3" /> Delete
                        </Button>
                      }
                      title="Delete campaign"
                      description={`Remove "${c.name}"? Content items won't be deleted.`}
                      confirmLabel="Delete"
                      destructive
                      onConfirm={() => handleDelete(c.id)}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tags className="h-4 w-4 text-muted-foreground" />
              {editing ? "Edit campaign" : "New campaign"}
            </DialogTitle>
            <DialogDescription>
              {editing ? "Update campaign details." : "Create a new campaign to organize content."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Tags className="h-3.5 w-3.5 text-muted-foreground" />
                  Status
                </Label>
                <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {CAMPAIGN_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Paintbrush className="h-3.5 w-3.5 text-muted-foreground" />
                  Color
                </Label>
                <ColorPicker value={form.color} onValueChange={(color) => setForm({ ...form, color })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                  Start date
                </Label>
                <DatePicker value={form.start_date} onValueChange={(start_date) => setForm({ ...form, start_date })} />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                  End date
                </Label>
                <DatePicker value={form.end_date} onValueChange={(end_date) => setForm({ ...form, end_date })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button disabled={!form.name.trim()} onClick={handleSave}>{editing ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
