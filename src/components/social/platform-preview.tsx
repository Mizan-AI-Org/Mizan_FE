import React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, ThumbsUp, Share2, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";
import { resolveMediaUrl } from "@/lib/api";

type Props = {
  platform: string;
  caption: string;
  brandName?: string;
  mediaUrl?: string | null;
  mediaMimeType?: string | null;
  className?: string;
};

function isVideo(mime?: string | null, url?: string | null) {
  const m = (mime || "").toLowerCase();
  if (m.startsWith("video/")) return true;
  const u = (url || "").toLowerCase();
  return /\.(mp4|mov|webm|m4v)(\?|$)/.test(u);
}

function MediaFrame({
  src,
  mime,
  aspectClass,
}: {
  src?: string | null;
  mime?: string | null;
  aspectClass: string;
}) {
  const { t } = useLanguage();
  const resolved = src ? resolveMediaUrl(src) : "";
  if (!resolved) {
    return (
      <div className={cn(aspectClass, "flex flex-col items-center justify-center gap-2 bg-muted/60 text-muted-foreground")}>
        <ImageIcon className="h-8 w-8 opacity-40" />
        <span className="text-xs">
          {t("social.preview.add_media", { defaultValue: "Add a photo or video" })}
        </span>
      </div>
    );
  }
  if (isVideo(mime, src)) {
    return (
      <div className={cn(aspectClass, "bg-black")}>
        <video src={resolved} className="h-full w-full object-cover" controls playsInline muted />
      </div>
    );
  }
  return (
    <div className={cn(aspectClass, "bg-muted")}>
      <img src={resolved} alt="" className="h-full w-full object-cover" />
    </div>
  );
}

export function SocialPlatformPreview({
  platform,
  caption,
  brandName,
  mediaUrl,
  mediaMimeType,
  className,
}: Props) {
  const { t } = useLanguage();
  const brand = brandName || t("social.preview.your_brand");
  const p = platform.toLowerCase();
  if (p === "instagram") {
    return (
      <Card className={cn("overflow-hidden border shadow-sm", className)}>
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{brand.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-semibold">{brand}</span>
            </div>
            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
          </div>
          <MediaFrame src={mediaUrl} mime={mediaMimeType} aspectClass="aspect-square" />
          <div className="flex gap-3 px-3 py-2">
            <Heart className="h-5 w-5" />
            <MessageCircle className="h-5 w-5" />
            <Send className="h-5 w-5" />
            <Bookmark className="ml-auto h-5 w-5" />
          </div>
          <p className="whitespace-pre-wrap px-3 pb-3 text-sm">
            <span className="font-semibold">{brand} </span>
            {caption || t("social.preview.caption_placeholder")}
          </p>
        </CardContent>
      </Card>
    );
  }
  if (p === "facebook") {
    return (
      <Card className={cn("overflow-hidden border shadow-sm", className)}>
        <CardContent className="space-y-2 p-3">
          <div className="flex items-center gap-2">
            <Avatar className="h-9 w-9">
              <AvatarFallback>{brand.slice(0, 1)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold">{brand}</p>
              <p className="text-xs text-muted-foreground">{t("social.preview.just_now")}</p>
            </div>
          </div>
          <p className="whitespace-pre-wrap text-sm">{caption || t("social.preview.post_placeholder")}</p>
          <MediaFrame src={mediaUrl} mime={mediaMimeType} aspectClass="aspect-video overflow-hidden rounded-md" />
          <div className="flex justify-around border-t pt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <ThumbsUp className="h-4 w-4" /> {t("social.preview.like")}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="h-4 w-4" /> {t("social.preview.comment")}
            </span>
            <span className="flex items-center gap-1">
              <Share2 className="h-4 w-4" /> {t("social.preview.share")}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }
  if (p === "linkedin") {
    return (
      <Card className={cn("border shadow-sm", className)}>
        <CardContent className="space-y-2 p-4">
          <div className="flex gap-2">
            <Avatar className="h-10 w-10">
              <AvatarFallback>{brand.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold">{brand}</p>
              <p className="text-xs text-muted-foreground">{t("social.preview.restaurant_time")}</p>
            </div>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{caption || t("social.preview.linkedin_placeholder")}</p>
          {mediaUrl ? (
            <MediaFrame src={mediaUrl} mime={mediaMimeType} aspectClass="aspect-video overflow-hidden rounded-md" />
          ) : null}
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className={cn("border shadow-sm", className)}>
      <CardContent className="space-y-2 p-4">
        <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">{platform}</p>
        <p className="whitespace-pre-wrap text-sm">{caption || t("social.preview.generic_placeholder")}</p>
        {mediaUrl ? (
          <MediaFrame src={mediaUrl} mime={mediaMimeType} aspectClass="aspect-video overflow-hidden rounded-md" />
        ) : null}
      </CardContent>
    </Card>
  );
}
