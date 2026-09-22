import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { socialApi } from "@/lib/social-api";
import { SocialPageShell } from "@/pages/social/SocialPageShell";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/use-language";

const MODES = ["assist", "draft", "approval", "autopilot"] as const;

type Props = { embedded?: boolean };

export default function SocialAutopilotPage({ embedded }: Props = {}) {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["social-autopilot"], queryFn: () => socialApi.autopilot() });

  const save = useMutation({
    mutationFn: (payload: Record<string, unknown>) => socialApi.updateAutopilot(payload),
    onSuccess: () => {
      toast.success(t("social.autopilot.updated"));
      qc.invalidateQueries({ queryKey: ["social-autopilot"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cfg = (data || {}) as Record<string, unknown>;

  const inner = isLoading ? (
    <Loader2 className="h-8 w-8 animate-spin" />
  ) : (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(cfg.enabled)}
            onChange={(e) => save.mutate({ ...cfg, enabled: e.target.checked })}
          />
          {t("social.autopilot.enable")}
        </label>
        <div>
          <p className="mb-2 text-sm font-medium">{t("social.autopilot.mode")}</p>
          <div className="flex flex-wrap gap-2">
            {MODES.map((mode) => (
              <Button
                key={mode}
                size="sm"
                variant={cfg.mode === mode ? "default" : "outline"}
                onClick={() => save.mutate({ ...cfg, mode })}
              >
                {t(`social.autopilot.${mode}`)}
              </Button>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("social.autopilot.hint")}
        </p>
      </CardContent>
    </Card>
  );

  if (embedded) return inner;

  return (
    <SocialPageShell
      title={t("social.autopilot.title")}
      description={t("social.autopilot.desc")}
    >
      {inner}
    </SocialPageShell>
  );
}
