import { Search, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { ContentStatusBadge } from "@/components/content/ContentStatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/useDebounce";
import { usePermission } from "@/hooks/usePermission";
import { buildGlobalSearchResults, type GlobalSearchGroup, type GlobalSearchResult } from "@/lib/global-search";
import { assetService, campaignService, contentService, profileService } from "@/services";
import { useAuthStore } from "@/stores/auth-store";

interface SearchCommandProps {
  open: boolean;
  onClose: () => void;
}

const groupStyles: Record<GlobalSearchGroup, string> = {
  Commands: "bg-palette-violet/10 text-palette-violet",
  Content: "bg-palette-cyan/10 text-palette-cyan",
  Campaigns: "bg-amber-500/10 text-amber-700",
  People: "bg-emerald-500/10 text-emerald-700",
  Assets: "bg-blue-500/10 text-blue-700",
};

export function SearchCommand({ open, onClose }: SearchCommandProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const workspaceId = useAuthStore((state) => state.profile?.workspace_id ?? "");
  const canCreateContent = usePermission("createContent");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const [partialFailure, setPartialFailure] = useState(false);
  const debouncedQuery = useDebounce(query, 250);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setResults([]);
    setSelected(0);
    setPartialFailure(false);
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(focusTimer);
  }, [open]);

  useEffect(() => {
    if (!open || !debouncedQuery.trim()) {
      setResults([]);
      setLoading(false);
      setPartialFailure(false);
      return;
    }

    let active = true;
    setLoading(true);
    setResults([]);
    setPartialFailure(false);

    const runSearch = async () => {
      if (!workspaceId) {
        if (active) {
          setResults(buildGlobalSearchResults({
            query: debouncedQuery,
            workspaceId: "",
            content: [],
            campaigns: [],
            people: [],
            assets: [],
            canCreateContent,
          }));
          setLoading(false);
        }
        return;
      }

      try {
        const settled = await Promise.allSettled([
          contentService.list({ search: debouncedQuery }),
          campaignService.list(),
          profileService.listForWorkspace(workspaceId),
          assetService.listForWorkspace(workspaceId),
        ]);
        if (!active) return;

        const [contentResult, campaignsResult, peopleResult, assetsResult] = settled;
        const content = contentResult.status === "fulfilled" ? contentResult.value : [];
        const campaigns = campaignsResult.status === "fulfilled" ? campaignsResult.value : [];
        const people = peopleResult.status === "fulfilled" ? peopleResult.value : [];
        const assets = assetsResult.status === "fulfilled" ? assetsResult.value : [];

        setResults(buildGlobalSearchResults({
          query: debouncedQuery,
          workspaceId,
          content,
          campaigns,
          people,
          assets,
          canCreateContent,
        }));
        setSelected(0);
        setPartialFailure(settled.some((result) => result.status === "rejected"));
      } catch {
        if (active) setPartialFailure(true);
      } finally {
        if (active) setLoading(false);
      }
    };

    void runSearch();
    return () => { active = false; };
  }, [canCreateContent, debouncedQuery, open, workspaceId]);

  const openResult = useCallback((result: GlobalSearchResult) => {
    navigate(result.href);
    onClose();
  }, [navigate, onClose]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!open || !results.length) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelected((current) => Math.min(current + 1, results.length - 1));
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelected((current) => Math.max(current - 1, 0));
      }
      if (event.key === "Enter" && results[selected]) {
        event.preventDefault();
        openResult(results[selected]);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, openResult, results, selected]);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="top-[16vh] max-w-2xl translate-y-0 gap-0 overflow-hidden rounded-lg border-border/80 p-0 shadow-[0_24px_70px_rgba(15,23,42,0.20)]">
        <DialogTitle className="sr-only">Search ContentFlow</DialogTitle>
        <div className="border-b bg-[linear-gradient(135deg,hsl(var(--palette-cyan)/0.12),hsl(var(--palette-violet)/0.08),hsl(var(--palette-rose)/0.08))] px-4 py-3">
          <div className="mb-2.5 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-palette-violet" />
            Search your workspace
          </div>
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search content, campaigns, people, assets, or commands..."
              aria-label="Search workspace"
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

        {partialFailure && (
          <p role="status" className="border-b px-4 py-2 text-xs text-amber-700">
            Some workspace records could not be searched. Available results are still shown.
          </p>
        )}
        {results.length > 0 && (
          <div className="max-h-[420px] overflow-y-auto p-2">
            {results.map((result, index) => {
              const Icon = result.Icon;
              return (
                <Button
                  type="button"
                  variant="ghost"
                  key={result.id}
                  className={`h-auto w-full justify-between rounded-md px-3 py-2.5 text-sm font-normal transition-all duration-150 ${
                    index === selected ? "bg-palette-cyan/10 text-accent-foreground shadow-[inset_0_0_0_1px_hsl(var(--palette-cyan)/0.22)]" : "hover:bg-muted/50"
                  }`}
                  onClick={() => openResult(result)}
                  onMouseEnter={() => setSelected(index)}
                >
                  <span className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${groupStyles[result.group]}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{result.title}</span>
                      <span className="block truncate text-xs capitalize text-muted-foreground">{result.description}</span>
                    </span>
                  </span>
                  <span className="ml-3 flex shrink-0 items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">{result.group}</span>
                    {result.status && <ContentStatusBadge status={result.status} />}
                  </span>
                </Button>
              );
            })}
          </div>
        )}
        {query.trim() && loading && results.length === 0 && (
          <div role="status" className="px-6 py-10 text-center text-sm text-muted-foreground">Searching your workspace…</div>
        )}
        {query.trim() && !loading && results.length === 0 && (
          <div className="px-6 py-10 text-center">
            <p className="font-medium">No matching results</p>
            <p className="mt-1 text-sm text-muted-foreground">Try another title, teammate, file name, or command.</p>
          </div>
        )}
        {!query.trim() && (
          <div className="px-6 py-10 text-center">
            <p className="font-medium">Search across ContentFlow</p>
            <p className="mt-1 text-sm text-muted-foreground">Find content, campaigns, people, assets, and navigation commands.</p>
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
