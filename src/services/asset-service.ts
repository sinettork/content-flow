import { isSupabaseBackend } from "@/lib/backend";
import { findBy, findById, genId, insert, remove } from "@/lib/mock/db";
import { requireSupabase } from "@/lib/supabase/client";
import { deleteOne, deleteWhere, insertOne, selectMany, selectOne } from "@/lib/supabase/repository";
import type { ContentAsset } from "@/types";

// The mock backend uses temporary blob URLs; Supabase mode uses a private bucket.
export const assetService = {
  async listForItem(contentItemId: string): Promise<ContentAsset[]> {
    if (isSupabaseBackend) {
      return selectMany<ContentAsset>("content_assets", (q) =>
        q.eq("content_item_id", contentItemId).order("created_at", { ascending: false })
      );
    }
    return findBy("content_assets", (a) => a.content_item_id === contentItemId) as ContentAsset[];
  },

  async listForWorkspace(workspaceId: string): Promise<ContentAsset[]> {
    if (isSupabaseBackend) {
      return selectMany<ContentAsset>("content_assets", (q) =>
        q.eq("workspace_id", workspaceId).order("created_at", { ascending: false })
      );
    }
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
    const fallbackCategory: ContentAsset["category"] = file.type.startsWith("video/")
      ? "video"
      : file.type.startsWith("image/")
        ? "design"
        : file.type.includes("pdf")
          ? "document"
          : "uncategorized";
    const common = {
      workspace_id,
      content_item_id: content_item_id || null,
      category: category ?? fallbackCategory,
      asset_type: asset_type ?? (file.type.startsWith("video/") ? "video" : file.type.includes("pdf") ? "pdf" : "image"),
      storage_bucket: "content-assets",
      original_filename: file.name,
      mime_type: file.type || "application/octet-stream",
      size_bytes: file.size,
      width: null,
      height: null,
      duration_seconds: null,
      uploaded_by,
    };

    if (isSupabaseBackend) {
      const client = requireSupabase();
      const extension = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") : "bin";
      const storagePath = `${workspace_id}/${crypto.randomUUID()}.${extension || "bin"}`;
      const { error: uploadError } = await client.storage.from("content-assets").upload(storagePath, file, {
        contentType: common.mime_type,
        upsert: false,
      });
      if (uploadError) throw new Error(uploadError.message);
      try {
        return await insertOne<ContentAsset>("content_assets", { ...common, storage_path: storagePath });
      } catch (error) {
        await client.storage.from("content-assets").remove([storagePath]);
        throw error;
      }
    }

    const row: ContentAsset = {
      id: genId("as"),
      ...common,
      content_item_id: content_item_id ?? "",
      storage_path: URL.createObjectURL(file),
      created_at: new Date().toISOString(),
    };
    return insert("content_assets", row) as ContentAsset;
  },

  async removeForItem(contentItemId: string): Promise<number> {
    if (isSupabaseBackend) {
      const assets = await this.listForItem(contentItemId);
      if (assets.length) {
        const { error } = await requireSupabase().storage.from("content-assets").remove(assets.map((asset) => asset.storage_path));
        if (error) throw new Error(error.message);
      }
      return deleteWhere("content_assets", "content_item_id", contentItemId);
    }
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
    if (isSupabaseBackend) {
      const asset = await selectOne<ContentAsset>("content_assets", id);
      if (!asset) return false;
      const { error } = await requireSupabase().storage.from(asset.storage_bucket).remove([asset.storage_path]);
      if (error) throw new Error(error.message);
      return deleteOne("content_assets", id);
    }
    const asset = findById("content_assets", id) as ContentAsset | undefined;
    if (!asset) return false;
    if (asset.storage_path.startsWith("blob:")) {
      URL.revokeObjectURL(asset.storage_path);
    }
    return remove("content_assets", id);
  },

  async getUrl(asset: ContentAsset): Promise<string> {
    if (!isSupabaseBackend) return asset.storage_path;
    const { data, error } = await requireSupabase().storage.from(asset.storage_bucket).createSignedUrl(asset.storage_path, 3600);
    if (error) throw new Error(error.message);
    return data.signedUrl;
  },
};
