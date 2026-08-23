import { findBy, findById, genId, insert, remove } from "@/lib/mock/db";
import type { ContentAsset } from "@/types";

// Mock asset "upload" stores a blob URL instead of uploading to storage.
// Replace with real Supabase / SQLite backend impl later.
export const assetService = {
  async listForItem(contentItemId: string): Promise<ContentAsset[]> {
    return findBy("content_assets", (a) => a.content_item_id === contentItemId) as ContentAsset[];
  },

  async listForWorkspace(workspaceId: string): Promise<ContentAsset[]> {
    return (findBy("content_assets", (a) => a.workspace_id === workspaceId) as ContentAsset[])
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async upload(file: File, opts: {
    workspace_id: string;
    content_item_id?: string;
    uploaded_by: string;
    asset_type?: ContentAsset["asset_type"];
    category?: ContentAsset["category"];
  }): Promise<ContentAsset> {
    const { workspace_id, content_item_id, uploaded_by, asset_type, category } = { content_item_id: "", ...opts };
    const blobUrl = URL.createObjectURL(file);
    const fallbackCategory: ContentAsset["category"] = file.type.startsWith("video/")
      ? "video"
      : file.type.startsWith("image/")
        ? "design"
        : file.type.includes("pdf")
          ? "document"
          : "uncategorized";
    const row: ContentAsset = {
      id: genId("as"),
      workspace_id,
      content_item_id: content_item_id ?? "",
      category: category ?? fallbackCategory,
      asset_type: asset_type ?? (file.type.startsWith("video/") ? "video" : "image"),
      storage_bucket: "content-assets",
      storage_path: blobUrl, // mock: blob URL; real impl stores path
      original_filename: file.name,
      mime_type: file.type || "application/octet-stream",
      size_bytes: file.size,
      width: null,
      height: null,
      duration_seconds: null,
      uploaded_by,
      created_at: new Date().toISOString(),
    };
    return insert("content_assets", row) as ContentAsset;
  },

  async removeForItem(contentItemId: string): Promise<number> {
    const assets = await this.listForItem(contentItemId);
    let removedCount = 0;
    for (const asset of assets) {
      if (await this.remove(asset.id)) {
        removedCount += 1;
      }
    }
    return removedCount;
  },

  async remove(id: string): Promise<boolean> {
    const asset = findById("content_assets", id) as ContentAsset | undefined;
    if (!asset) return false;
    if (asset.storage_path.startsWith("blob:")) {
      URL.revokeObjectURL(asset.storage_path);
    }
    return remove("content_assets", id);
  },

  // In mock mode the "url" is already the blob URL.
  getUrl(asset: ContentAsset): string {
    return asset.storage_path;
  },
};
