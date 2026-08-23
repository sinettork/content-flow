import { Send } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface CommentComposerProps {
  onSubmit: (body: string) => void | Promise<void>;
  placeholder?: string;
  disabled?: boolean;
}

export function CommentComposer({ onSubmit, placeholder = "Write a comment…", disabled }: CommentComposerProps) {
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      await onSubmit(trimmed);
      setBody("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        disabled={disabled || loading}
        className="min-h-[60px] flex-1"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
        }}
      />
      <Button size="icon" onClick={handleSubmit} disabled={!body.trim() || loading}>
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}
