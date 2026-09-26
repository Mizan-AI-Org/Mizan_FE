import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { socialApi } from "@/lib/social-api";
import { SocialPageShell } from "@/pages/social/SocialPageShell";
import { SocialPlatformPreview } from "@/components/social/platform-preview";
import { SocialAIAssistant } from "@/components/social/social-ai-assistant";
import { SocialMediaPicker, type SocialMediaItem } from "@/components/social/social-media-picker";
import { toast } from "sonner";

export default function SocialContentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isNew = id === "new";
  const [name, setName] = useState("");
  const [caption, setCaption] = useState("");
  const [channels, setChannels] = useState("instagram,facebook");
  const [previewPlatform, setPreviewPlatform] = useState("instagram");
  const [assets, setAssets] = useState<SocialMediaItem[]>([]);

  const { data: brand } = useQuery({ queryKey: ["social-brand"], queryFn: () => socialApi.brand() });
  const brandName = String((brand as { brand_name?: string })?.brand_name || "Your brand");

  const { data, isLoading } = useQuery({
    queryKey: ["social-content", id],
    queryFn: () => socialApi.getContent(id!),
    enabled: !!id && !isNew,
  });

  useEffect(() => {
    if (!data || isNew) return;
    const row = data as Record<string, unknown>;
    setName(String(row.internal_name || ""));
    setCaption(String(row.caption || ""));
    const ch = row.channels as string[] | undefined;
    if (ch?.length) setChannels(ch.join(","));
    const rawAssets = Array.isArray(row.assets) ? row.assets : [];
    setAssets(
      rawAssets.map((a) => {
        const item = a as Record<string, unknown>;
        return {
          id: String(item.id || ""),
          url: String(item.url || ""),
          mime_type: typeof item.mime_type === "string" ? item.mime_type : undefined,
        };
      }).filter((a) => a.id),
    );
  }, [data, isNew]);

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        internal_name: name || "Untitled",
        caption,
        channels: channels.split(",").map((c) => c.trim()).filter(Boolean),
        asset_ids: assets.map((a) => a.id),
      };
      return isNew
        ? socialApi.createContent(payload)
        : socialApi.updateContent(id!, payload);
    },
    onSuccess: (row) => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["social-content"] });
      if (isNew && row.id) navigate(`/dashboard/social-media/content/${row.id}`, { replace: true });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const approve = useMutation({
    mutationFn: () => socialApi.approveContent(id!),
    onSuccess: () => {
      toast.success("Approved");
      qc.invalidateQueries({ queryKey: ["social-content", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const publish = useMutation({
    mutationFn: () => socialApi.publishContent(id!),
    onSuccess: () => {
      toast.success("Queued for publishing");
      qc.invalidateQueries({ queryKey: ["social-content", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const schedule = useMutation({
    mutationFn: () => {
      const when = new Date(Date.now() + 86400000).toISOString();
      return socialApi.scheduleContent(id!, when);
    },
    onSuccess: () => toast.success("Scheduled for tomorrow"),
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isNew && isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const row = data as Record<string, unknown> | undefined;
  const liveName = isNew ? name : name || String(row?.internal_name || "");
  const liveCaption = isNew ? caption : caption || String(row?.caption || "");
  const channelList = channels.split(",").map((c) => String(c).trim()).filter(Boolean);
  const primaryMedia = assets[0];

  return (
    <SocialPageShell
      title={isNew ? "New content" : liveName}
      description={`Status: ${isNew ? "draft" : String(row?.status)}`}
      actions={
        <>
          <Button variant="ghost" size="sm" className="gap-1" onClick={() => navigate("/dashboard/social-media?tab=posts")}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          {!isNew ? (
          <>
            <Button variant="secondary" onClick={() => approve.mutate()}>
              Approve
            </Button>
            <Button variant="outline" onClick={() => schedule.mutate()}>
              Schedule tomorrow
            </Button>
            <Button onClick={() => publish.mutate()}>Publish now</Button>
          </>
        ) : null}
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Input
            value={liveName}
            onChange={(e) => setName(e.target.value)}
            placeholder="Internal name"
          />
          <Textarea
            rows={8}
            value={liveCaption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Caption"
          />
          <Input
            value={channels}
            onChange={(e) => setChannels(e.target.value)}
            placeholder="Channels (comma-separated)"
          />
          <SocialMediaPicker assets={assets} onChange={setAssets} />
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save draft
          </Button>
        </div>
        <Tabs defaultValue="preview" className="min-h-[320px]">
          <TabsList variant="compact">
            <TabsTrigger variant="compact" value="preview">Preview</TabsTrigger>
            <TabsTrigger variant="compact" value="ai">AI assistant</TabsTrigger>
          </TabsList>
          <TabsContent value="preview" className="mt-3 space-y-2">
            <div className="flex flex-wrap gap-1">
              {channelList.filter(Boolean).map((p) => (
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
              caption={liveCaption}
              brandName={brandName}
              mediaUrl={primaryMedia?.url}
              mediaMimeType={primaryMedia?.mime_type}
            />
          </TabsContent>
          <TabsContent value="ai" className="mt-3 h-[320px]">
            <SocialAIAssistant
              caption={liveCaption}
              platform={previewPlatform}
              onApply={(text) => setCaption(text)}
            />
          </TabsContent>
        </Tabs>
      </div>
    </SocialPageShell>
  );
}
