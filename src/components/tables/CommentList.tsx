import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { fromNow } from "@/lib/dates";
import type { Comment, Profile } from "@/types";

interface CommentListProps {
  comments: Comment[];
  profileMap: Record<string, Profile>;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function CommentList({ comments, profileMap }: CommentListProps) {
  if (comments.length === 0) {
    return <p className="text-sm text-muted-foreground">No comments yet.</p>;
  }

  return (
    <div className="space-y-4">
      {comments.map((c) => {
        const user = profileMap[c.user_id];
        return (
          <div key={c.id} className="flex gap-3">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="text-[10px]">{user ? initials(user.full_name) : "?"}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">{user?.full_name ?? "Unknown"}</span>
                <span className="text-xs text-muted-foreground">{fromNow(c.created_at)}</span>
              </div>
              <p className="mt-0.5 text-sm whitespace-pre-wrap">{c.body}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
