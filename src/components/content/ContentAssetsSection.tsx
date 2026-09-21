import { ExternalLink, File, FileImage, FileText, FileVideo, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { assetService } from "@/services";
import { fromNow } from "@/lib/dates";
import { toast } from "@/stores/toast-store";
import type { ContentAsset } from "@/types";

interface ContentAssetsSectionProps {
  contentItemId: string;
  workspaceId: string;
  userId: string;
  canEdit: boolean;
}

function assetIcon(asset: ContentAsset) {
  if (asset.asset_type === "image") return <FileImage className="h-5 w-5" />;
  if (asset.asset_type === "video") return <FileVideo className="h-5 w-5" />;
  if (asset.asset_type === "pdf") return <FileText className="h-5 w-5" />;
  return <File className="h-5 w-5" />;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ContentAssetsSection({ contentItemId, workspaceId, userId, canEdit }: ContentAssetsSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [assets, setAssets] = useState<ContentAsset[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const load = useCallback(async () => {
    const list = await assetService.listForItem(contentItemId);
    setAssets(list);
    const pairs = await Promise.all(list.map(async (asset) => [asset.id, await assetService.getUrl(asset)] as const));
    setUrls(Object.fromEntries(pairs));
  }, [contentItemId]);

  useEffect(() => {
    void load();
  }, [load]);

  const uploadFiles = async (files: FileList | File[]) => {
    const selected = Array.from(files);
    if (!selected.length || !canEdit) return;

    setUploading(true);
    try {
      for (const file of selected) {
        await assetService.upload(file, {
          workspace_id: workspaceId,
          content_item_id: contentItemId,
          uploaded_by: userId,
        });
      }
      toast(
        `${selected.length} creative file${selected.length === 1 ? "" : "s"} added`,
        { variant: "success" }
      );
      await load();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Upload failed.", { variant: "destructive" });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeAsset = async (asset: ContentAsset) => {
    try {
      await assetService.remove(asset.id);
      toast(`Removed ${asset.original_filename}`, { variant: "destructive" });
      await load();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not remove file.", { variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle className="text-sm font-medium">Creative files & revisions</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Keep the working files attached to this content item so reviewers always see the current creative.
          </p>
        </div>
        {canEdit && (
          <Button size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
            <Upload className="mr-1.5 h-4 w-4" />
            {uploading ? "Uploading…" : "Add files"}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {canEdit && (
          <button
            type="button"
            className={`flex w-full flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center transition-colors ${
              dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/20"
            }`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              void uploadFiles(event.dataTransfer.files);
            }}
          >
            <Upload className="mb-2 h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium">Drop creative files here</span>
            <span className="mt-1 text-xs text-muted-foreground">
              PNG, JPG, WEBP, MP4, PDF, PSD, AI and other working files
            </span>
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(event) => {
            if (event.target.files) void uploadFiles(event.target.files);
          }}
        />

        {assets.length === 0 ? (
          <div className="rounded-lg border border-dashed px-4 py-8 text-center">
            <p className="text-sm font-medium">No creative files attached yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Upload the first design, video, brief or source file for this content item.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {assets.map((asset, index) => {
              const url = urls[asset.id];
              const isImage = asset.mime_type.startsWith("image/");
              const isVideo = asset.mime_type.startsWith("video/");

              return (
                <div key={asset.id} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center">
                  <div className="flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground">
                    {isImage && url ? (
                      <img src={url} alt={asset.original_filename} className="h-full w-full object-cover" />
                    ) : isVideo && url ? (
                      <video src={url} className="h-full w-full object-cover" muted />
                    ) : (
                      assetIcon(asset)
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium">{asset.original_filename}</p>
                      {index === 0 && <Badge variant="secondary">Latest</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatSize(asset.size_bytes)} · Added {fromNow(asset.created_at)}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    {url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={url} target="_blank" rel="noreferrer">
                          <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                          Open
                        </a>
                      </Button>
                    )}
                    {canEdit && (
                      <ConfirmDialog
                        trigger={
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" aria-label={`Remove ${asset.original_filename}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        }
                        title="Remove creative file?"
                        description={`Remove "${asset.original_filename}" from this content item?`}
                        confirmLabel="Remove"
                        destructive
                        onConfirm={() => removeAsset(asset)}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
