import { AlertTriangle, Gauge, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { coordinationService, type CampaignRisk, type MemberWorkload } from "@/services";
import { useAuthStore } from "@/stores/auth-store";

const capacityClass = { light: "bg-emerald-100 text-emerald-800", balanced: "bg-amber-100 text-amber-800", heavy: "bg-red-100 text-red-800" };
const riskClass = { low: "bg-emerald-100 text-emerald-800", medium: "bg-amber-100 text-amber-800", high: "bg-red-100 text-red-800" };

export function TeamWorkloadPage() {
  const workspaceId = useAuthStore((state) => state.profile?.workspace_id) ?? "";
  const [members, setMembers] = useState<MemberWorkload[]>([]);
  const [risks, setRisks] = useState<CampaignRisk[]>([]);

  useEffect(() => {
    void Promise.all([coordinationService.workload(workspaceId), coordinationService.campaignRisks(workspaceId)])
      .then(([workload, campaignRisks]) => { setMembers(workload); setRisks(campaignRisks); });
  }, [workspaceId]);

  return (
    <>
      <PageHeader title="Team workload" description="A lightweight accountability view for balancing assignments and spotting campaign delivery risk." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Gauge className="h-4 w-4" /> Capacity by member</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {members.map((member) => (
              <div key={member.profile.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{member.profile.full_name}</span>
                  <Badge className={capacityClass[member.capacity]}>{member.capacity}</Badge>
                </div>
                <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                  <span>{member.active} active</span><span>{member.dueSoon} due this week</span>
                  {member.overdue > 0 && <span className="text-destructive">{member.overdue} overdue</span>}
                </div>
              </div>
            ))}
            {members.length === 0 && <p className="text-sm text-muted-foreground">No team members found.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldAlert className="h-4 w-4" /> Campaign risk</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {risks.map((risk) => (
              <div key={risk.campaign.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3"><span className="font-medium">{risk.campaign.name}</span><Badge className={riskClass[risk.risk]}>{risk.risk}</Badge></div>
                <p className="mt-2 text-xs text-muted-foreground">{risk.incomplete} incomplete of {risk.total} items{risk.overdue > 0 ? ` · ${risk.overdue} overdue` : ""}</p>
              </div>
            ))}
            {risks.length === 0 && <p className="text-sm text-muted-foreground">No campaigns found.</p>}
          </CardContent>
        </Card>
      </div>
      <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><AlertTriangle className="h-3.5 w-3.5" />Risk is based on incomplete content, due dates, and campaign end dates; use it as a planning signal.</p>
    </>
  );
}
