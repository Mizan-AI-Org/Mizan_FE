import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, ScanEye, Wand2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { socialApi } from "@/lib/social-api";
import { SocialPlatformPreview } from "@/components/social/platform-preview";
import { SocialAIAssistant } from "@/components/social/social-ai-assistant";
import { SocialMediaPicker, type SocialMediaItem } from "@/components/social/social-media-picker";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";

const PLATFORMS = ["instagram", "facebook", "tiktok", "linkedin"] as const;
const COMING_SOON_PLATFORMS = new Set(["tiktok"]);

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultScheduledAt?: string;
};

export function SocialPostComposerDialog({ open, onOpenChange, defaultScheduledAt }: Props) {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [caption, setCaption] = useState("");
  const [selected, setSelected] = useState<string[]>(["instagram", "facebook"]);
  const [previewPlatform, setPreviewPlatform] = useState("instagram");
  const [scheduledAt, setScheduledAt] = useState(defaultScheduledAt || "");
  const [assets, setAssets] = useState<SocialMediaItem[]>([]);

  const { data: brand } = useQuery({
    queryKey: ["social-brand"],
    queryFn: () => socialApi.brand(),
    enabled: open,
  });

  const brandName = String((brand as { brand_name?: string })?.brand_name || t("social.preview.your_brand"));

  const create = useMutation({
    mutationFn: async (asDraft: boolean) => {
      const payload = {
        internal_name: name || caption.slice(0, 60) || t("social.composer.untitled"),
        caption,
        channels: selected,
        status: asDraft ? "draft" : "draft",
        asset_ids: assets.map((a) => a.id),
        variants: selected.map((platform) => ({
          platform,
          caption,
          media_asset_ids: assets.map((a) => a.id),
        })),
      };
      const row = await socialApi.createContent(payload);
      if (!asDraft && scheduledAt && row.id) {
        await socialApi.scheduleContent(String(row.id), new Date(scheduledAt).toISOString());
      }
      return row;
    },
    onSuccess: () => {
      toast.success(t("social.composer.saved"));
      qc.invalidateQueries({ queryKey: ["social-content"] });
      qc.invalidateQueries({ queryKey: ["social-calendar"] });
      qc.invalidateQueries({ queryKey: ["social-overview"] });
      onOpenChange(false);
      setName("");
      setCaption("");
      setAssets([]);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const togglePlatform = (p: string) => {
    if (COMING_SOON_PLATFORMS.has(p)) return;
    setSelected((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
    setPreviewPlatform(p);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("social.composer.create_post")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <Input placeholder={t("social.composer.internal_name")} value={name} onChange={(e) => setName(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => {
                const soon = COMING_SOON_PLATFORMS.has(p);
                return (
                  <button
                    key={p}
                    type="button"
                    disabled={soon}
                    onClick={() => togglePlatform(p)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs capitalize",
                      soon && "cursor-not-allowed border-dashed opacity-50 grayscale",
                      !soon && selected.includes(p)
                        ? "border-primary bg-primary/10 text-primary"
                        : !soon && "text-muted-foreground",
                    )}
                    title={soon ? t("social.composer.coming_soon") : undefined}
                  >
                    {p.replace("_", " ")}
                    {soon ? t("social.composer.soon_suffix") : ""}
                  </button>
                );
              })}
            </div>
            <Textarea
              rows={6}
              placeholder={t("social.composer.caption")}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
            <SocialMediaPicker assets={assets} onChange={setAssets} />
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>
          <Tabs defaultValue="preview" className="min-h-[280px]">
            <TabsList variant="compact" className="grid w-full grid-cols-2">
              <TabsTrigger variant="compact" value="preview" className="gap-1">
                <ScanEye className="h-3.5 w-3.5" /> {t("social.composer.preview")}
              </TabsTrigger>
              <TabsTrigger variant="compact" value="ai" className="gap-1">
                <Wand2 className="h-3.5 w-3.5" /> {t("social.composer.ai")}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="preview" className="mt-3 space-y-2">
              <div className="flex gap-1">
                {selected.map((p) => (
                  <Button
                    key={p}
                    type="button"
                    size="sm"
                    variant={previewPlatform === p ? "default" : "outline"}
                    className="capitalize"
                    onClick={() => setPreviewPlatform(p)}
                  >
                    {p}
                  </Button>
                ))}
              </div>
              <SocialPlatformPreview
                platform={previewPlatform}
                caption={caption}
                brandName={brandName}
                mediaUrl={assets[0]?.url}
                mediaMimeType={assets[0]?.mime_type}
              />
            </TabsContent>
            <TabsContent value="ai" className="mt-3 h-[280px]">
              <SocialAIAssistant
                caption={caption}
                platform={previewPlatform}
                channels={selected}
                onApply={(text) => setCaption(text)}
                onApplyName={(title) => setName((prev) => prev || title)}
              />
            </TabsContent>
          </Tabs>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => create.mutate(true)} disabled={create.isPending || !caption.trim()}>
            {t("social.composer.save_draft")}
          </Button>
          <Button onClick={() => create.mutate(false)} disabled={create.isPending || !caption.trim()}>
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
            {scheduledAt ? t("social.composer.save_schedule") : t("social.composer.save_post")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
