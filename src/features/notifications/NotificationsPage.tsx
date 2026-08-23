import { useCallback, useEffect, useState } from "react";

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

  const handleMarkRead = async (id: string) => {
    await notificationService.markRead(id);
    await load();
  };

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Stay updated on content activity."
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
            onClick={() => handleMarkRead(n.id)}
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
