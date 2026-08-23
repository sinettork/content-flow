import { ArrowLeft, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";

import { CampaignColorDot } from "@/components/campaigns/CampaignColorDot";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { ContentStatusBadge } from "@/components/content/ContentStatusBadge";
import { PlatformBadge } from "@/components/content/PlatformBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/dates";
import { campaignService, contentService, platformService } from "@/services";
import type { Campaign, ContentItem, ContentPlatform } from "@/types";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800",
  completed: "bg-violet-100 text-violet-800",
  paused: "bg-amber-100 text-amber-800",
  archived: "bg-zinc-100 text-zinc-700",
};

export function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [platformMap, setPlatformMap] = useState<Record<string, ContentPlatform[]>>({});

  useEffect(() => {
    (async () => {
      if (!id) return;
      const camp = await campaignService.get(id);
      setCampaign(camp ?? null);
      const all = await contentService.list({ campaign_id: id });
      setItems(all);
      const pm: Record<string, ContentPlatform[]> = {};
      for (const it of all) {
        pm[it.id] = await platformService.listForItem(it.id);
      }
      setPlatformMap(pm);
    })();
  }, [id]);

  if (!campaign) return <EmptyState title="Campaign not found" description="The campaign may have been deleted." />;

  return (
    <>
      <Breadcrumbs items={[
        { label: "Campaigns", to: "/app/campaigns" },
        { label: campaign.name },
      ]} />
      <PageHeader
        title={campaign.name}
        description={`${items.length} content item${items.length !== 1 ? "s" : ""}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/app/campaigns")}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            <Button asChild size="sm">
              <Link to="/app/content/new">
                <Plus className="mr-1 h-4 w-4" /> Add content
              </Link>
            </Button>
          </div>
        }
      />

      {/* Campaign info bar */}
      <Card className="mb-6">
        <CardContent className="flex flex-wrap items-center gap-4 py-3 text-sm">
          <div className="flex items-center gap-2">
            <CampaignColorDot color={campaign.color} />
            <Badge className={STATUS_COLORS[campaign.status] ?? "bg-muted"}>{campaign.status}</Badge>
          </div>
          {campaign.start_date && (
            <span className="text-muted-foreground">Start: {formatDate(campaign.start_date, "MMM d, yyyy")}</span>
          )}
          {campaign.end_date && (
            <span className="text-muted-foreground">End: {formatDate(campaign.end_date, "MMM d, yyyy")}</span>
          )}
        </CardContent>
      </Card>

      {/* Content table */}
      {items.length === 0 ? (
        <EmptyState
          title="No content in this campaign"
          description="Add content items to this campaign."
          action={
            <Button asChild>
              <Link to="/app/content/new"><Plus className="mr-1 h-4 w-4" /> Add content</Link>
            </Button>
          }
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Platforms</TableHead>
                <TableHead>Scheduled</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {items.map((item) => {
                  const plats = platformMap[item.id] ?? [];
                  return (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/app/content/${item.id}`)}
                    >
                      <TableCell className="font-medium">{item.title}</TableCell>
                      <TableCell className="capitalize">{item.content_type}</TableCell>
                      <TableCell><ContentStatusBadge status={item.master_status} /></TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {plats.map((p) => <PlatformBadge key={p.id} platform={p.platform_name} />)}
                          {plats.length === 0 && <span className="text-muted-foreground">—</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(item.scheduled_at)}</TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}
