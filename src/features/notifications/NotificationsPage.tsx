import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fromNow } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { notificationService } from "@/services";
import { useAuthStore } from "@/stores/auth-store";
import type { Notification } from "@/types";

export function NotificationsPage() {
  const userId = useAuthStore((s) => s.user?.id);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const load = useCallback(async () => {
    if (!userId) return;
    const list = await notificationService.listForUser(userId);
    setNotifications(list);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleMarkAllRead = async () => {
    if (!userId) return;
    await notificationService.markAllRead(userId);
    await load();
  };

  const handleOpen = async (notification: Notification) => {
    await notificationService.markRead(notification.id);
    if (notification.entity_type === "content" && notification.entity_id) {
      navigate(`/app/content/${notification.entity_id}`);
      return;
    }
    await load();
  };

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Start with the unread items that need your attention, then open the related work."
        actions={
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            Mark all read
          </Button>
        }
      />
      <div className="space-y-2">
        {notifications.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No notifications yet.
            </CardContent>
          </Card>
        )}
        {notifications.map((n) => (
          <Card
            key={n.id}
            className={cn("cursor-pointer transition-colors", !n.is_read && "border-primary/40 bg-primary/5")}
            onClick={() => void handleOpen(n)}
          >
            <CardContent className="flex items-start gap-3 py-3">
              <div className="flex-1">
                <div className="text-sm font-medium">{n.title}</div>
                <div className="text-xs text-muted-foreground">{n.body}</div>
                <div className="mt-1 text-xs text-muted-foreground">{fromNow(n.created_at)}</div>
              </div>
              {!n.is_read && <Badge className="bg-primary text-primary-foreground text-[10px]">new</Badge>}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
