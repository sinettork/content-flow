import { Upload, Trash2, Image, FileVideo, FileText, File, Folder, FolderOpen, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { fromNow } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { assetService } from "@/services";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";
import type { ContentAsset } from "@/types";

const ASSET_CATEGORIES: Array<{
  value: ContentAsset["category"];
  label: string;
  description: string;
  accent: string;
}> = [
  { value: "design", label: "Design", description: "Posters, carousels, thumbnails", accent: "bg-blue-500" },
  { value: "video", label: "Video", description: "Reels, shorts, edited videos", accent: "bg-fuchsia-500" },
  { value: "document", label: "Documents", description: "Briefs, PDFs, copy files", accent: "bg-amber-500" },
  { value: "source", label: "Source files", description: "PSD, AI, project files", accent: "bg-emerald-500" },
  { value: "posted", label: "Posted", description: "Published creative archive", accent: "bg-slate-500" },
  { value: "uncategorized", label: "Uncategorized", description: "Needs sorting", accent: "bg-zinc-400" },
];

function mimeIcon(mime: string) {
  if (mime.startsWith("image/")) return <Image className="h-8 w-8 text-blue-500" />;
  if (mime.startsWith("video/")) return <FileVideo className="h-8 w-8 text-purple-500" />;
  if (mime.startsWith("text/") || mime.includes("pdf")) return <FileText className="h-8 w-8 text-orange-500" />;
  return <File className="h-8 w-8 text-muted-foreground" />;
}

function getAssetCategory(asset: ContentAsset): ContentAsset["category"] {
  return asset.category ?? "uncategorized";
}

function getCategoryMeta(category: ContentAsset["category"]) {
  return ASSET_CATEGORIES.find((item) => item.value === category) ?? ASSET_CATEGORIES[ASSET_CATEGORIES.length - 1];
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

export function AssetsPage() {
  const workspaceId = useAuthStore((s) => s.profile?.workspace_id) ?? "";
  const userId = useAuthStore((s) => s.user?.id) ?? "";
  const inputRef = useRef<HTMLInputElement>(null);

  const [assets, setAssets] = useState<ContentAsset[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<"all" | ContentAsset["category"]>("all");
  const [uploadCategory, setUploadCategory] = useState<ContentAsset["category"]>("design");

  const load = async () => {
    const list = await assetService.listForWorkspace(workspaceId);
    setAssets(list);
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      await assetService.upload(file, { workspace_id: workspaceId, uploaded_by: userId, category: uploadCategory });
    }
    if (inputRef.current) inputRef.current.value = "";
    toast(`${files.length} file${files.length !== 1 ? "s" : ""} uploaded`, { variant: "success" });
    await load();
  };

  const handleDelete = async (id: string) => {
    await assetService.remove(id);
    toast("Asset deleted", { variant: "destructive" });
    await load();
  };

  const visibleAssets = selectedCategory === "all"
    ? assets
    : assets.filter((asset) => getAssetCategory(asset) === selectedCategory);

  const categoryCounts = ASSET_CATEGORIES.reduce<Record<ContentAsset["category"], number>>((acc, category) => {
    acc[category.value] = assets.filter((asset) => getAssetCategory(asset) === category.value).length;
    return acc;
  }, {
    design: 0,
    video: 0,
    document: 0,
    source: 0,
    posted: 0,
    uncategorized: 0,
  });

  return (
    <>
      <PageHeader
        title="Assets"
        description={`${assets.length} file${assets.length !== 1 ? "s" : ""} organized by creative category`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={uploadCategory}
              onChange={(event) => setUploadCategory(event.target.value as ContentAsset["category"])}
              aria-label="Upload category"
              className="w-44"
            >
              {ASSET_CATEGORIES.map((category) => (
                <option key={category.value} value={category.value}>{category.label}</option>
              ))}
            </Select>
            <Button onClick={() => inputRef.current?.click()}>
              <Upload className="mr-1 h-4 w-4" /> Upload
            </Button>
          </div>
        }
      />
      <input ref={inputRef} type="file" multiple className="hidden" onChange={handleUpload} />

      {assets.length === 0 ? (
        <EmptyState
          title="No assets"
          description="Upload images, videos, and documents."
          icon={<Upload className="h-6 w-6" />}
          action={
            <Button onClick={() => inputRef.current?.click()}>
              <Upload className="mr-1 h-4 w-4" /> Upload
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={cn(
                "rounded-xl border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md",
                selectedCategory === "all" && "border-primary/40 bg-primary/5 ring-2 ring-primary/10"
              )}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FolderOpen className="h-5 w-5" />
                </div>
                <Badge variant="secondary">{assets.length}</Badge>
              </div>
              <div className="font-semibold">All assets</div>
              <div className="mt-1 text-[13px] text-muted-foreground">Everything uploaded</div>
            </button>
            {ASSET_CATEGORIES.map((category) => (
              <button
                key={category.value}
                type="button"
                onClick={() => setSelectedCategory(category.value)}
                className={cn(
                  "rounded-xl border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md",
                  selectedCategory === category.value && "border-primary/40 bg-primary/5 ring-2 ring-primary/10"
                )}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <span className={cn("h-3 w-3 rounded-full", category.accent)} />
                  </div>
                  <Badge variant="secondary">{categoryCounts[category.value]}</Badge>
                </div>
                <div className="font-semibold">{category.label}</div>
                <div className="mt-1 line-clamp-1 text-[13px] text-muted-foreground">{category.description}</div>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              Showing <span className="font-semibold text-foreground">{visibleAssets.length}</span> asset{visibleAssets.length !== 1 ? "s" : ""}
            </div>
            <Button variant="outline" size="sm" onClick={() => setSelectedCategory("all")}>
              Reset filter
            </Button>
          </div>

          {visibleAssets.length === 0 ? (
            <EmptyState
              title="No assets in this category"
              description="Upload files into this category or switch back to all assets."
              icon={<Folder className="h-6 w-6" />}
              action={
                <Button onClick={() => inputRef.current?.click()}>
                  <Upload className="mr-1 h-4 w-4" /> Upload here
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {visibleAssets.map((a) => {
                const isImage = a.mime_type.startsWith("image/");
                const url = assetService.getUrl(a);
                const category = getCategoryMeta(getAssetCategory(a));
                return (
                  <Card key={a.id} className="group relative overflow-hidden">
                    <CardContent className="flex flex-col items-center p-4">
                      {isImage && url ? (
                        <img src={url} alt={a.original_filename} className="mb-3 h-28 w-full rounded-lg object-cover" />
                      ) : (
                        <div className="mb-3 flex h-28 w-full items-center justify-center rounded-lg bg-muted">
                          {mimeIcon(a.mime_type)}
                        </div>
                      )}
                      <div className="mb-2 flex w-full justify-start">
                        <Badge variant="secondary" className="gap-1">
                          <span className={cn("h-2 w-2 rounded-full", category.accent)} />
                          {category.label}
                        </Badge>
                      </div>
                      <p className="w-full truncate text-sm font-medium">{a.original_filename}</p>
                      <p className="mt-1 flex w-full items-center gap-1 text-xs text-muted-foreground">
                        <File className="h-3.5 w-3.5" />
                        {formatSize(a.size_bytes)} · {fromNow(a.created_at)}
                      </p>
                      <div className="absolute right-2 top-2 hidden group-hover:block">
                        <ConfirmDialog
                          trigger={
                            <Button variant="destructive" size="icon" className="h-8 w-8">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          }
                          title="Delete asset?"
                          description={`Remove "${a.original_filename}"?`}
                          confirmLabel="Delete"
                          destructive
                          onConfirm={() => handleDelete(a.id)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );
}
