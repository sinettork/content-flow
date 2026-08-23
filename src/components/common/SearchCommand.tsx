import { FileText, Search, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { ContentStatusBadge } from "@/components/content/ContentStatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";
import { contentService } from "@/services";
import type { ContentItem } from "@/types";

interface SearchCommandProps {
  open: boolean;
  onClose: () => void;
}

export function SearchCommand({ open, onClose }: SearchCommandProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ContentItem[]>([]);
  const [selected, setSelected] = useState(0);
  const debouncedQuery = useDebounce(query, 250);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }
    (async () => {
      const items = await contentService.list({ search: debouncedQuery });
      setResults(items.slice(0, 8));
      setSelected(0);
    })();
  }, [debouncedQuery]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((s) => Math.min(s + 1, results.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((s) => Math.max(s - 1, 0));
      }
      if (e.key === "Enter" && results[selected]) {
        navigate(`/app/content/${results[selected].id}`);
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, results, selected]);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="top-[16vh] max-w-2xl translate-y-0 gap-0 overflow-hidden rounded-lg border-border/80 p-0 shadow-[0_24px_70px_rgba(15,23,42,0.20)]">
        <DialogTitle className="sr-only">Search content</DialogTitle>
        <div className="border-b bg-[linear-gradient(135deg,hsl(var(--palette-cyan)/0.12),hsl(var(--palette-violet)/0.08),hsl(var(--palette-rose)/0.08))] px-4 py-3">
          <div className="mb-2.5 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-palette-violet" />
            Quick search content
          </div>
          <div className="relative flex items-center">
          <Search className="absolute left-3 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or slug..."
            className="border-border/80 bg-background pl-8 pr-9 shadow-none focus-visible:ring-ring/15"
          />
          {query && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          </div>
        </div>
        {results.length > 0 && (
          <div className="max-h-[380px] overflow-y-auto p-2">
            {results.map((item, i) => (
              <Button
                type="button"
                variant="ghost"
                key={item.id}
                className={cn(
                  "h-auto w-full justify-between rounded-md px-3 py-2.5 text-sm font-normal transition-all duration-150",
                  i === selected ? "bg-palette-cyan/10 text-accent-foreground shadow-[inset_0_0_0_1px_hsl(var(--palette-cyan)/0.22)]" : "hover:bg-muted/50"
                )}
                onClick={() => {
                  navigate(`/app/content/${item.id}`);
                  onClose();
                }}
                onMouseEnter={() => setSelected(i)}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-palette-cyan/10 text-palette-cyan">
                    <FileText className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{item.title}</span>
                    <span className="block truncate text-xs capitalize text-muted-foreground">
                      {item.content_type} · {item.slug}
                    </span>
                  </span>
                </div>
                <ContentStatusBadge status={item.master_status} />
              </Button>
            ))}
          </div>
        )}
        {query.trim() && results.length === 0 && (
          <div className="px-6 py-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <Search className="h-5 w-5" />
            </div>
            <p className="font-medium">No content found</p>
            <p className="mt-1 text-sm text-muted-foreground">Try another title, slug, or keyword.</p>
          </div>
        )}
        {!query.trim() && (
          <div className="px-6 py-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-md bg-palette-violet/10 text-palette-violet">
              <Search className="h-5 w-5" />
            </div>
            <p className="font-medium">Start typing to search</p>
            <p className="mt-1 text-sm text-muted-foreground">Open content directly without leaving your current page.</p>
          </div>
        )}
        <div className="flex items-center gap-3 border-t bg-muted/20 px-5 py-3 text-[11px] text-muted-foreground">
          <span><kbd className="rounded border bg-muted px-1 py-0.5">↑↓</kbd> navigate</span>
          <span><kbd className="rounded border bg-muted px-1 py-0.5">↵</kbd> open</span>
          <span><kbd className="rounded border bg-muted px-1 py-0.5">esc</kbd> close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
