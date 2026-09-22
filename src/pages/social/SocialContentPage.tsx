import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { socialApi } from "@/lib/social-api";
import { SocialPageShell } from "@/pages/social/SocialPageShell";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/use-language";

const STATUSES = ["", "draft", "scheduled", "published", "failed", "archived"];

type Props = { embedded?: boolean };

export default function SocialContentPage({ embedded }: Props = {}) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [q, setQ] = useState("");
  const [brief, setBrief] = useState("");
  const [showAi, setShowAi] = useState(searchParams.get("create") === "1");
  const qc = useQueryClient();

  useEffect(() => {
    const s = searchParams.get("status");
    if (s != null) setStatus(s);
    if (searchParams.get("create") === "1") setShowAi(true);
  }, [searchParams]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["social-content", status, q],
    queryFn: () => socialApi.listContent({ ...(status ? { status } : {}), ...(q ? { q } : {}) }),
  });

  const generate = useMutation({
    mutationFn: () =>
      socialApi.generate({
        brief,
        channels: ["instagram", "facebook", "tiktok"],
        languages: ["en", "fr", "ar"],
      }),
    onSuccess: (res) => {
      toast.success(t("social.posts.draft_created"));
      qc.invalidateQueries({ queryKey: ["social-content"] });
      const payload = res as {
        content_id?: string;
        content?: { id?: string };
        draft?: { id?: string };
      };
      const id = payload.content_id || payload.content?.id || payload.draft?.id;
      if (id) navigate(`/dashboard/social-media/content/${id}`);
      setShowAi(false);
      setBrief("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = useMemo(() => data || [], [data]);

  const inner = (
    <>
      <div className="flex flex-wrap gap-2">
        <Input placeholder={t("social.posts.search")} value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {STATUSES.map((s) => (
            <option key={s || "all"} value={s}>
              {s ? t(`social.status.${s}`, { defaultValue: s }) : t("social.posts.all_statuses")}
            </option>
          ))}
        </select>
      </div>

      {showAi ? (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <p className="text-sm font-medium">{t("social.posts.describe")}</p>
            <Textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder={t("social.posts.brief_placeholder")}
              rows={4}
            />
            <div className="flex gap-2">
              <Button disabled={!brief.trim() || generate.isPending} onClick={() => generate.mutate()}>
                {generate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("social.posts.generate")}
              </Button>
              <Button variant="ghost" onClick={() => setShowAi(false)}>
                {t("common.cancel")}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : isError ? (
        <p className="text-muted-foreground">
          {t("social.posts.load_error")}{" "}
          <button type="button" className="underline" onClick={() => refetch()}>
            {t("common.retry")}
          </button>
        </p>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {t("social.posts.empty")}
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {rows.map((row) => (
            <li key={String(row.id)}>
              <button
                type="button"
                className="w-full rounded-panel border border-border/70 bg-card p-4 text-left hover:border-primary/30"
                onClick={() => navigate(`/dashboard/social-media/content/${row.id}`)}
              >
                <p className="font-medium">{String(row.internal_name)}</p>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{String(row.caption || "")}</p>
                <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
                  {t(`social.status.${String(row.status)}`, { defaultValue: String(row.status) })}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );

  if (embedded) return inner;

  return (
    <SocialPageShell
      title={t("social.posts.title")}
      description={t("social.posts.desc")}
    >
      {inner}
    </SocialPageShell>
  );
}
