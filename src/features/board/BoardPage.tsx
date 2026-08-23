import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Bot, Eye, Filter, Plus, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { BoardCard } from "@/components/board/BoardCard";
import { BoardColumn } from "@/components/board/BoardColumn";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRole } from "@/hooks/usePermission";
import { MASTER_STATUSES, type MasterStatus } from "@/lib/constants";
import { contentService, platformService, profileService, activityService } from "@/services";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";
import type { ContentItem, ContentPlatform, Profile } from "@/types";

const BOARD_COLUMNS: MasterStatus[] = MASTER_STATUSES.filter((s) => s !== "archived");
const LABELS: Record<MasterStatus, string> = {
  draft: "Draft",
  in_review: "In Review",
  changes_requested: "Changes Requested",
  approved: "Approved",
  scheduled: "Scheduled",
  posted: "Posted",
  archived: "Archived",
};

function SortableCard({
  item,
  platforms,
  assignee,
  onClick,
}: {
  item: ContentItem;
  platforms?: ContentPlatform[];
  assignee?: Profile | null;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { item },
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <BoardCard item={item} platforms={platforms} assignee={assignee} onClick={onClick} />
    </div>
  );
}

export function BoardPage() {
  const navigate = useNavigate();
  const { role } = useRole();
  const workspaceId = useAuthStore((s) => s.profile?.workspace_id) ?? "";
  const userId = useAuthStore((s) => s.user?.id) ?? "";

  const [items, setItems] = useState<ContentItem[]>([]);
  const [platformMap, setPlatformMap] = useState<Record<string, ContentPlatform[]>>({});
  const [profileMap, setProfileMap] = useState<Record<string, Profile>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragStartStatus, setDragStartStatus] = useState<MasterStatus | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    (async () => {
      const [list, profs] = await Promise.all([
        contentService.list({}),
        profileService.listForWorkspace(workspaceId),
      ]);
      setItems(list);
      setProfileMap(Object.fromEntries(profs.map((p) => [p.id, p])));

      setPlatformMap(await platformService.listForItems(list.map((item) => item.id)));
    })();
  }, []);

  const grouped: Record<string, ContentItem[]> = {};
  for (const col of BOARD_COLUMNS) grouped[col] = [];
  for (const it of items) {
    if (grouped[it.master_status]) grouped[it.master_status].push(it);
  }

  const findColumn = (id: string): MasterStatus | null => {
    for (const col of BOARD_COLUMNS) {
      if (col === id) return col;
      if (grouped[col].some((it) => it.id === id)) return col;
    }
    return null;
  };

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(e.active.id as string);
    const currentItem = items.find((item) => item.id === e.active.id);
    setDragStartStatus(currentItem?.master_status ?? null);
  };

  const handleDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;

    const activeCol = findColumn(active.id as string);
    let overCol = findColumn(over.id as string);

    // If dropped over a column directly
    if (BOARD_COLUMNS.includes(over.id as MasterStatus)) {
      overCol = over.id as MasterStatus;
    }

    if (!activeCol || !overCol || activeCol === overCol) return;

    const target = overCol;
    setItems((prev) =>
      prev.map((it) =>
        it.id === active.id ? { ...it, master_status: target } : it
      )
    );
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    if (!over) {
      if (dragStartStatus) {
        setItems((prev) => prev.map((item) => item.id === active.id ? { ...item, master_status: dragStartStatus } : item));
      }
      setDragStartStatus(null);
      return;
    }

    const item = items.find((it) => it.id === active.id);
    if (!item) return;

    let targetCol: MasterStatus | null = null;
    if (BOARD_COLUMNS.includes(over.id as MasterStatus)) {
      targetCol = over.id as MasterStatus;
    } else {
      targetCol = findColumn(over.id as string);
    }

    if (!targetCol || !dragStartStatus) return;
    if (dragStartStatus === targetCol) {
      setDragStartStatus(null);
      return;
    }

    try {
      await contentService.setStatus(item.id, targetCol, { role, userId });
      await activityService.log({
        workspace_id: workspaceId,
        content_item_id: item.id,
        user_id: userId,
        action_type: "status.changed",
        old_value: { status: dragStartStatus },
        new_value: { status: targetCol },
      });
      toast(`Moved to ${LABELS[targetCol]}`, { variant: "success" });
    } catch (error) {
      setItems((prev) => prev.map((entry) => entry.id === item.id ? { ...entry, master_status: dragStartStatus } : entry));
      toast(error instanceof Error ? error.message : "Unable to move this item.", { variant: "destructive" });
    } finally {
      setDragStartStatus(null);
    }
  };

  const activeItem = items.find((it) => it.id === activeId);

  return (
    <>
      <PageHeader
        title="Board"
        description="A monday-style workflow board for moving content through production."
        actions={
          <Button onClick={() => navigate("/app/content/new")}>
            <Plus className="h-4 w-4" />
            New item
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-3 py-2.5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1.5 rounded-md px-2.5 py-1">
            <Sparkles className="h-3.5 w-3.5" />
            Main board
          </Badge>
          <Button variant="ghost" size="sm" className="h-8 gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            Kanban
          </Button>
          <Button variant="ghost" size="sm" className="h-8 gap-1.5">
            <Filter className="h-3.5 w-3.5" />
            Filter
          </Button>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Bot className="h-3.5 w-3.5" />
          Drag a card to update its status
        </div>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto rounded-xl pb-4">
          {BOARD_COLUMNS.map((col) => (
            <SortableContext
              key={col}
              id={col}
              items={grouped[col].map((it) => it.id)}
              strategy={verticalListSortingStrategy}
            >
              <BoardColumn status={col} label={LABELS[col]} count={grouped[col].length}>
                {grouped[col].length === 0 && (
                  <div className="rounded-lg border border-dashed bg-background/70 px-3 py-6 text-center text-xs text-muted-foreground">
                    Drop items here
                  </div>
                )}
                {grouped[col].map((item) => (
                  <SortableCard
                    key={item.id}
                    item={item}
                    platforms={platformMap[item.id]}
                    assignee={item.assigned_to ? profileMap[item.assigned_to] : null}
                    onClick={() => navigate(`/app/content/${item.id}`)}
                  />
                ))}
              </BoardColumn>
            </SortableContext>
          ))}
        </div>

        <DragOverlay>
          {activeItem && (
            <div className="w-72 rotate-2 opacity-90">
              <BoardCard
                item={activeItem}
                platforms={platformMap[activeItem.id]}
                assignee={activeItem.assigned_to ? profileMap[activeItem.assigned_to] : null}
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </>
  );
}
