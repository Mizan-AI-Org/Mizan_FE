import React, { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, Film, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { socialApi } from "@/lib/social-api";
import { resolveMediaUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/use-language";

export type SocialMediaItem = {
  id: string;
  url: string;
  mime_type?: string;
};

type Props = {
  assets: SocialMediaItem[];
  onChange: (next: SocialMediaItem[]) => void;
  maxItems?: number;
  className?: string;
};

function isVideo(mime?: string, url?: string) {
  const m = (mime || "").toLowerCase();
  if (m.startsWith("video/")) return true;
  const u = (url || "").toLowerCase();
  return /\.(mp4|mov|webm|m4v)(\?|$)/.test(u);
}

export function SocialMediaPicker({ assets, onChange, maxItems = 10, className }: Props) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const uploadFiles = async (files: FileList | File[]) => {
    const list = Array.from(files || []);
    if (!list.length) return;
    const room = Math.max(0, maxItems - assets.length);
    if (room <= 0) {
      toast.error(t("social.media.max_reached", { defaultValue: "Maximum media items reached" }));
      return;
    }
    const batch = list.slice(0, room);
    setUploading(true);
    try {
      const uploaded: SocialMediaItem[] = [];
      for (const file of batch) {
        if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
          toast.error(
            t("social.media.invalid_type", {
              defaultValue: "Only photos and videos are supported",
            }),
          );
          continue;
        }
        const row = await socialApi.uploadMedia(file);
        uploaded.push({
          id: row.id,
          url: row.url,
          mime_type: row.mime_type || file.type,
        });
      }
      if (uploaded.length) onChange([...assets, ...uploaded]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("social.media.upload_failed", { defaultValue: "Upload failed" }));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeAt = (id: string) => onChange(assets.filter((a) => a.id !== id));

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">
            {t("social.media.title", { defaultValue: "Photos & videos" })}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("social.media.hint", {
              defaultValue: "Add images or short videos for Instagram and Facebook.",
            })}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5"
          disabled={uploading || assets.length >= maxItems}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {t("social.media.add", { defaultValue: "Add media" })}
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="sr-only"
        onChange={(e) => {
          if (e.target.files) void uploadFiles(e.target.files);
        }}
      />

      {assets.length === 0 ? (
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files?.length) void uploadFiles(e.dataTransfer.files);
          }}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-10 text-center transition-colors",
            dragOver
              ? "border-primary bg-primary/5"
              : "border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50",
            uploading && "opacity-60",
          )}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background shadow-sm">
            <ImagePlus className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">
              {t("social.media.drop_title", { defaultValue: "Drop photos or videos here" })}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t("social.media.drop_hint", {
                defaultValue: "or click to browse — JPG, PNG, MP4, MOV",
              })}
            </p>
          </div>
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {assets.map((asset) => {
            const src = resolveMediaUrl(asset.url);
            const video = isVideo(asset.mime_type, asset.url);
            return (
              <div
                key={asset.id}
                className="group relative aspect-square overflow-hidden rounded-xl border bg-muted"
              >
                {video ? (
                  <>
                    <video src={src} className="h-full w-full object-cover" muted playsInline />
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-medium text-white">
                      <Film className="h-3 w-3" />
                      {t("social.media.video", { defaultValue: "Video" })}
                    </span>
                  </>
                ) : (
                  <img src={src} alt="" className="h-full w-full object-cover" />
                )}
                <button
                  type="button"
                  className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => removeAt(asset.id)}
                  aria-label={t("social.media.remove", { defaultValue: "Remove" })}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
          {assets.length < maxItems ? (
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-muted/20 text-muted-foreground hover:border-primary/40 hover:text-foreground"
            >
              {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
              <span className="text-[11px] font-medium">
                {t("social.media.add_more", { defaultValue: "Add more" })}
              </span>
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
