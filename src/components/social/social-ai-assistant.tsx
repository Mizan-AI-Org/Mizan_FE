import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Minus, Plus, Repeat, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { socialApi } from "@/lib/social-api";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/use-language";

const QUICK = [
  { id: "rephrase", labelKey: "social.ai.rephrase", icon: Repeat },
  { id: "shorten", labelKey: "social.ai.shorten", icon: Minus },
  { id: "expand", labelKey: "social.ai.expand", icon: Plus },
] as const;

export type SocialGenerateResult = {
  caption?: string;
  reasoning?: string;
  variants?: Array<{ platform?: string; caption?: string }>;
  campaign_name?: string;
};

function captionForPlatform(res: SocialGenerateResult, platform: string): string {
  const variants = res.variants || [];
  const match = variants.find((v) => String(v.platform || "").toLowerCase() === platform.toLowerCase());
  return String(match?.caption || res.caption || variants[0]?.caption || "").trim();
}

type Props = {
  caption: string;
  platform?: string;
  channels?: string[];
  onApply: (text: string) => void;
  onApplyName?: (name: string) => void;
};

/** Composer-side AI — Mastra via /social/generate and /social/transform. */
export function SocialAIAssistant({
  caption,
  platform = "instagram",
  channels = ["instagram", "facebook"],
  onApply,
  onApplyName,
}: Props) {
  const { t } = useLanguage();
  const [prompt, setPrompt] = useState("");
  const [lastReasoning, setLastReasoning] = useState<string | null>(null);

  const transform = useMutation({
    mutationFn: (action: string) =>
      socialApi.transform({
        action,
        content: caption,
        platform,
        ...(action === "generate" ? { prompt } : {}),
      }),
    onSuccess: (res) => {
      const text = String(res.content || "").trim();
      if (text) {
        onApply(text);
        toast.success(t("social.ai.caption_updated"));
      }
      setLastReasoning(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const generate = useMutation({
    mutationFn: () =>
      socialApi.generate({
        brief: prompt,
        prompt,
        channels: channels.length ? channels : [platform],
        intent: "general",
        save_draft: false,
      }) as Promise<SocialGenerateResult>,
    onSuccess: (res) => {
      const text = captionForPlatform(res, platform);
      if (!text) {
        toast.error(t("social.ai.no_caption"));
        return;
      }
      onApply(text);
      if (res.campaign_name && onApplyName) {
        onApplyName(String(res.campaign_name));
      }
      setLastReasoning(res.reasoning ? String(res.reasoning) : null);
      setPrompt("");
      toast.success(t("social.ai.generated"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const busy = transform.isPending || generate.isPending;

  return (
    <div className="flex h-full flex-col rounded-lg border bg-muted/20 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <Wand2 className="h-4 w-4 text-primary" />
        {t("social.ai.title")}
        <span className="text-xs font-normal text-muted-foreground">{t("social.ai.brand_aware")}</span>
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        {QUICK.map(({ id, labelKey, icon: Icon }) => (
          <Button
            key={id}
            type="button"
            size="sm"
            variant="secondary"
            disabled={!caption.trim() || busy}
            onClick={() => transform.mutate(id)}
          >
            <Icon className="mr-1 h-3.5 w-3.5" />
            {t(labelKey)}
          </Button>
        ))}
      </div>
      <Textarea
        rows={3}
        placeholder={t("social.ai.prompt")}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="mb-2"
        disabled={busy}
      />
      {lastReasoning ? (
        <p className="mb-2 line-clamp-3 text-[11px] text-muted-foreground" title={lastReasoning}>
          {lastReasoning}
        </p>
      ) : null}
      <Button
        type="button"
        disabled={!prompt.trim() || busy}
        onClick={() => generate.mutate()}
        className="mt-auto"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("social.ai.generate")}
      </Button>
    </div>
  );
}
