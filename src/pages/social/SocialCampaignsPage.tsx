import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { socialApi } from "@/lib/social-api";
import { SocialPageShell } from "@/pages/social/SocialPageShell";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/use-language";

type Props = { embedded?: boolean };

export default function SocialCampaignsPage({ embedded }: Props = {}) {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["social-campaigns"], queryFn: () => socialApi.campaigns() });

  const create = useMutation({
    mutationFn: () => socialApi.createCampaign({ name, objective: "awareness", channels: ["instagram", "facebook"] }),
    onSuccess: () => {
      toast.success(t("social.campaigns.created"));
      setName("");
      qc.invalidateQueries({ queryKey: ["social-campaigns"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const inner = (
    <>
      <div className="flex max-w-md gap-2">
        <Input placeholder={t("social.campaigns.name")} value={name} onChange={(e) => setName(e.target.value)} />
        <Button disabled={!name.trim() || create.isPending} onClick={() => create.mutate()}>
          {t("social.campaigns.create")}
        </Button>
      </div>
      {isLoading ? (
        <Loader2 className="mx-auto mt-8 h-8 w-8 animate-spin" />
      ) : (
        <ul className="mt-4 space-y-2">
          {(data || []).map((c) => (
            <Card key={String(c.id)}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">{String(c.name)}</p>
                  <p className="text-sm text-muted-foreground">
                    {t(`social.status.${String(c.status)}`, { defaultValue: String(c.status) })} ·{" "}
                    {t("social.campaigns.posts", { count: Number(c.content_count || 0) })}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </ul>
      )}
    </>
  );

  if (embedded) return inner;

  return (
    <SocialPageShell title={t("social.campaigns.title")} description={t("social.campaigns.desc")}>
      {inner}
    </SocialPageShell>
  );
}
