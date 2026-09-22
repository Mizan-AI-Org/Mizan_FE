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
  }, [data, isNew]);

  const save = useMutation({
    mutationFn: () =>
      isNew
        ? socialApi.createContent({
            internal_name: name || "Untitled",
            caption,
            channels: channels.split(",").map((c) => c.trim()).filter(Boolean),
          })
        : socialApi.updateContent(id!, {
            internal_name: name,
            caption,
            channels: channels.split(",").map((c) => c.trim()),
          }),
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
  const displayName = isNew ? name : String(row?.internal_name || "");
  const displayCaption = isNew ? caption : String(row?.caption || "");
  const channelList = (isNew ? channels.split(",") : (row?.channels as string[]) || channels.split(",")).map((c) =>
    String(c).trim(),
  );

  return (
    <SocialPageShell
      title={isNew ? "New content" : displayName}
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
            value={isNew ? name : displayName}
            onChange={(e) => setName(e.target.value)}
            placeholder="Internal name"
          />
          <Textarea
            rows={8}
            value={isNew ? caption : displayCaption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Caption"
          />
          <Input
            value={channels}
            onChange={(e) => setChannels(e.target.value)}
            placeholder="Channels (comma-separated)"
          />
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
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
              caption={isNew ? caption : displayCaption}
              brandName={brandName}
            />
          </TabsContent>
          <TabsContent value="ai" className="mt-3 h-[320px]">
            <SocialAIAssistant
              caption={isNew ? caption : displayCaption}
              platform={previewPlatform}
              onApply={(text) => setCaption(text)}
            />
          </TabsContent>
        </Tabs>
      </div>
    </SocialPageShell>
  );
}
