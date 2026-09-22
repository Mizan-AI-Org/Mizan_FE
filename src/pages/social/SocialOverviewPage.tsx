import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Loader2, Plus, Link2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { socialApi } from "@/lib/social-api";
import { SocialPageShell } from "@/pages/social/SocialPageShell";
import { useAgentPanel } from "@/context/AgentPanelContext";
import { cn } from "@/lib/utils";
import { SocialPostComposerDialog } from "@/components/social/social-post-composer-dialog";
import { useLanguage } from "@/hooks/use-language";

type Translate = (key: string, options?: Record<string, string | number>) => string;

function opportunityCopy(
  t: Translate,
  opp: {
    title: string;
    detail?: string;
    type?: string;
    related_product_name?: string;
    description?: string;
    evidence?: Array<Record<string, unknown>>;
  },
) {
  const evidence = opp.evidence || [];
  const sales = evidence.find((row) => row.kind === "sales_delta");
  const drafts = evidence.find((row) => row.kind === "draft_count");
  const params = {
    name: String(opp.related_product_name || sales?.product || ""),
    delta: String(sales?.delta_percent ?? ""),
    count: Number(drafts?.count ?? 0),
  };
  const fallbackDetail = opp.detail || opp.description || "";
  const type = String(opp.type || "");
  if (!type) return { title: opp.title, detail: fallbackDetail };
  return {
    title: t(`social.opp.${type}.title`, { ...params, defaultValue: opp.title }),
    detail: t(`social.opp.${type}.detail`, { ...params, defaultValue: fallbackDetail }),
  };
}

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  google_business: "Google Business Profile",
};

type Props = { embedded?: boolean };

export default function SocialOverviewPage({ embedded }: Props = {}) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { askAgent } = useAgentPanel();
  const [composerOpen, setComposerOpen] = useState(false);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["social-overview"],
    queryFn: () => socialApi.overview(),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !data) {
    const err = (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {t("social.overview.load_error")}{" "}
          <button type="button" className="text-primary underline" onClick={() => refetch()}>
            {t("common.retry")}
          </button>
        </CardContent>
      </Card>
    );
    if (embedded) return err;
    return (
      <SocialPageShell title={t("nav.social_media")} description={t("social.overview.shell_desc")}>
        {err}
      </SocialPageShell>
    );
  }

  const stats = data.stats as Record<string, number | string | null>;

  const body = (
    <div className={cn(embedded && "space-y-6")}>
      <div className="grid gap-6 lg:grid-cols-3">
        {!embedded ? (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t("social.overview.connected_channels")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {data.accounts.map((acc) => {
              const platform = String(acc.platform || "");
              const connected = acc.status === "connected";
              return (
                <div
                  key={platform}
                  className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2 text-sm"
                >
                  <span>{PLATFORM_LABELS[platform] || platform}</span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      connected ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {connected ? t("social.overview.connected") : t("social.overview.not_connected")}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
        ) : null}

        <Card className={cn("shadow-sm", embedded && "lg:col-span-3")}>
          <CardHeader>
            <CardTitle className="text-base">{t("social.overview.this_week")}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            {[
              ["scheduled", stats.scheduled],
              ["published", stats.published],
              ["drafts", stats.drafts],
              ["failed", stats.failed],
              ["content_this_week", stats.content_this_week],
            ].map(([key, value]) => (
              <div key={key}>
                <p className="text-muted-foreground">{t(`social.overview.${key}`)}</p>
                <p className="text-xl font-semibold">{value ?? "—"}</p>
              </div>
            ))}
            <div className="col-span-2 text-xs text-muted-foreground">{t("social.overview.engagement_note")}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{t("social.overview.ai_opportunities")}</CardTitle>
          <Sparkles className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent className="space-y-3">
          {data.opportunities.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("social.overview.no_opportunities")}</p>
          ) : (
            data.opportunities.map((opp) => {
              const evidence = (opp as { evidence?: Array<Record<string, unknown>> }).evidence;
              const detail = opp.detail || (opp as { description?: string }).description || "";
              const actions = opp.actions || [];
              const copy = opportunityCopy(t, {
                title: opp.title,
                detail,
                type: (opp as { type?: string }).type,
                related_product_name: (opp as { related_product_name?: string }).related_product_name,
                description: (opp as { description?: string }).description,
                evidence,
              });
              return (
              <div key={opp.id} className="rounded-lg border border-border/70 p-3">
                <p className="font-medium">{copy.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{copy.detail}</p>
                {evidence && evidence.length > 0 ? (
                  <ul className="mt-2 list-inside list-disc text-xs text-muted-foreground">
                    {evidence.slice(0, 4).map((ev, i) => {
                      const kind = String(ev.kind || "fact");
                      if (kind === "sales_delta") {
                        return (
                          <li key={`${opp.id}-ev-${i}`}>
                            {t("social.overview.sales_delta", {
                              product: String(ev.product),
                              delta: String(ev.delta_percent),
                            })}
                          </li>
                        );
                      }
                      if (kind === "scheduled_count") {
                        return (
                          <li key={`${opp.id}-ev-${i}`}>
                            {t("social.overview.scheduled_count", {
                              count: String(ev.count),
                              hours: String(ev.window_hours),
                            })}
                          </li>
                        );
                      }
                      if (kind === "draft_count") {
                        return (
                        <li key={`${opp.id}-ev-${i}`}>
                          {t("social.overview.drafts_waiting", { count: String(ev.count) })}
                        </li>
                      );
                      }
                      return <li key={`${opp.id}-ev-${i}`}>{kind.replace(/_/g, " ")}</li>;
                    })}
                  </ul>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-2">
                  {actions.includes("create_content") ? (
                    <Button size="sm" onClick={() => navigate("/dashboard/social-media?tab=posts&create=1")}>
                      {t("social.overview.create_content")}
                    </Button>
                  ) : null}
                  {actions.includes("review_drafts") ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="border border-sky-500/30 bg-sky-500/10 text-sky-800 hover:bg-sky-500/20 dark:text-sky-200"
                      onClick={() => navigate("/dashboard/social-media?tab=posts&status=draft")}
                    >
                      {t("social.overview.review_drafts")}
                    </Button>
                  ) : null}
                  {actions.includes("ask_agent") ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-violet-500/40 text-violet-700 hover:bg-violet-500/10 dark:text-violet-300"
                      onClick={() =>
                        askAgent(t("social.overview.ask_prompt", { title: copy.title, detail: copy.detail }))
                      }
                    >
                      {t("social.overview.ask_miya")}
                    </Button>
                  ) : null}
                </div>
              </div>
            );
            })
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">{t("social.overview.upcoming")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.upcoming.length === 0 ? (
              <p className="text-muted-foreground">{t("social.overview.nothing_scheduled")}</p>
            ) : (
              data.upcoming.map((row) => (
                <button
                  type="button"
                  key={String(row.id)}
                  className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left hover:bg-muted/50"
                  onClick={() => navigate(`/dashboard/social-media/content/${row.id}`)}
                >
                  <span>{String(row.internal_name)}</span>
                  <span className="text-muted-foreground">{String(row.scheduled_at || row.status)}</span>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">{t("social.overview.recent")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.recent_activity.length === 0 ? (
              <p className="text-muted-foreground">{t("social.overview.no_activity")}</p>
            ) : (
              data.recent_activity.map((row) => (
                <div key={String(row.id)} className="flex justify-between gap-2 border-b border-border/50 pb-2 last:border-0">
                  <span>
                    {String(row.content_name)} · {String(row.platform)}
                  </span>
                  <span className={row.status === "failed" ? "text-destructive" : "text-muted-foreground"}>
                    {t(`social.status.${String(row.status)}`, { defaultValue: String(row.status) })}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
      {!embedded ? <SocialPostComposerDialog open={composerOpen} onOpenChange={setComposerOpen} /> : null}
    </div>
  );

  if (embedded) return body;

  return (
    <SocialPageShell
      title={t("nav.social_media")}
      description={t("social.overview.shell_desc")}
      actions={
        <>
          <Button className="gap-2" onClick={() => setComposerOpen(true)}>
            <Plus className="h-4 w-4" /> {t("social.overview.add_post")}
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => navigate("/dashboard/social-media?tab=home")}>
            <Link2 className="h-4 w-4" /> {t("social.overview.connect_account")}
          </Button>
        </>
      }
    >
      {body}
    </SocialPageShell>
  );
}
