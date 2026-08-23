import { useEffect, useState } from "react";

import { CommentComposer } from "@/components/forms/CommentComposer";
import { CommentList } from "@/components/tables/CommentList";
import { commentService, profileService } from "@/services";
import { useAuthStore } from "@/stores/auth-store";
import type { Comment, Profile } from "@/types";

interface CommentsSectionProps {
  contentItemId: string;
  workspaceId: string;
}

export function CommentsSection({ contentItemId, workspaceId }: CommentsSectionProps) {
  const user = useAuthStore((s) => s.user);
  const [comments, setComments] = useState<Comment[]>([]);
  const [profileMap, setProfileMap] = useState<Record<string, Profile>>({});

  const load = async () => {
    const list = await commentService.listForItem(contentItemId);
    setComments(list);
    const ids = [...new Set(list.map((c) => c.user_id))];
    const map = await profileService.byIds(ids);
    setProfileMap(map);
  };

  useEffect(() => {
    load();
  }, [contentItemId]);

  const handleAdd = async (body: string) => {
    if (!user) return;
    await commentService.create({
      workspace_id: workspaceId,
      content_item_id: contentItemId,
      user_id: user.id,
      body,
    });
    await load();
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Comments</h3>
      <CommentList comments={comments} profileMap={profileMap} />
      {user && <CommentComposer onSubmit={handleAdd} />}
    </div>
  );
}
