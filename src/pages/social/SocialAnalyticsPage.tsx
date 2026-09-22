import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, CalendarClock, FileEdit, Loader2, TrendingUp, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { socialApi } from "@/lib/social-api";
import { SocialPageShell } from "@/pages/social/SocialPageShell";
import { SocialPlatformIcon } from "@/components/social/social-platform-icon";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/use-language";

type Props = { embedded?: boolean };

const ANALYTICS_COPY: Record<string, string> = {
  "Connect social accounts and publish content to unlock performance insights.": "social.analytics.ai_empty",
  "You maintained steady publishing during this period — compare channel metrics once synced.":
    "social.analytics.ai_steady",
  "Publishing activity is light — consider scheduling more content for consistent reach.": "social.analytics.ai_light",
};

function analyticsInterpretation(
  t: (key: string, options?: Record<string, string | number>) => string,
  raw: string,
) {
  const key = ANALYTICS_COPY[raw];
  if (key) return t(key);
  return raw || t("social.analytics.ai_empty");
}

function StatTile({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <Icon className="h-5 w-5 shrink-0 text-primary/70" aria-hidden />
      </div>
    </div>
  );
}

export default function SocialAnalyticsPage({ embedded }: Props = {}) {
  const { t } = useLanguage();
  const [days, setDays] = useState(30);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["social-analytics", days],
    queryFn: () => socialApi.analytics(days),
  });

  const sync = useMutation({
    mutationFn: () => socialApi.syncAnalytics(7),
    onSuccess: () => {
      toast.success(t("social.analytics.sync_ok"));
      qc.invalidateQueries({ queryKey: ["social-analytics"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const summary = data as Record<string, unknown> | undefined;
  const calculated = (summary?.calculated || {}) as Record<string, number>;
  const periodDays = Number(summary?.period_days || days);
  const platforms = (summary?.platforms || {}) as Record<string, { metrics?: Record<string, unknown>; source?: string }>;
  const platformKeys = Object.keys(platforms);

  const controls = (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <select
        className="h-10 rounded-md border bg-background px-2 text-sm"
        value={days}
        onChange={(e) => setDays(Number(e.target.value))}
      >
        {[7, 30, 90].map((d) => (
          <option key={d} value={d}>
            {t("analytics.last_days", { count: d })}
          </option>
        ))}
      </select>
      <Button variant="outline" disabled={sync.isPending} onClick={() => sync.mutate()}>
        {t("social.analytics.sync")}
      </Button>
    </div>
  );

  const inner = (
    <>
      {controls}
      {isLoading ? (
        <Loader2 className="mx-auto h-8 w-8 animate-spin" />
      ) : (
        <div className="space-y-4">
          <div>
            <h3 className="mb-3 text-sm font-medium text-muted-foreground">{t("social.analytics.activity")}</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile
                label={t("social.analytics.published")}
                value={calculated.posts_published ?? calculated.publishing_frequency ?? 0}
                hint={t("social.analytics.period_hint", { count: periodDays })}
                icon={TrendingUp}
              />
              <StatTile
                label={t("social.analytics.scheduled")}
                value={calculated.posts_scheduled ?? 0}
                hint={t("social.analytics.in_period")}
                icon={CalendarClock}
              />
              <StatTile
                label={t("social.analytics.drafts")}
                value={calculated.drafts_open ?? 0}
                hint={t("social.analytics.open_drafts")}
                icon={FileEdit}
              />
              <StatTile
                label={t("social.analytics.avg_week")}
                value={calculated.avg_posts_per_week ?? 0}
                hint={t("social.analytics.pace")}
                icon={BarChart3}
              />
            </div>
            {(calculated.failed_posts ?? 0) > 0 ? (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-destructive">
                <XCircle className="h-4 w-4" />
                {t("social.analytics.failed", { count: calculated.failed_posts })}
              </p>
            ) : null}
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("social.analytics.ai")}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-muted-foreground">
              {analyticsInterpretation(t, String(summary?.ai_interpretation || ""))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("social.analytics.platforms")}</CardTitle>
            </CardHeader>
            <CardContent>
              {platformKeys.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("social.analytics.no_metrics")}
                </p>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {platformKeys.map((platform) => {
                    const row = platforms[platform];
                    const metrics = row?.metrics || {};
                    const entries = Object.entries(metrics).slice(0, 4);
                    return (
                      <li key={platform} className="rounded-lg border p-3">
                        <div className="mb-2 flex items-center gap-2">
                          <SocialPlatformIcon platform={platform} size={22} />
                          <span className="text-sm font-medium capitalize">{platform.replace(/_/g, " ")}</span>
                        </div>
                        {entries.length === 0 ? (
                          <p className="text-xs text-muted-foreground">{t("social.analytics.synced_empty")}</p>
                        ) : (
                          <dl className="space-y-1 text-xs">
                            {entries.map(([k, v]) => (
                              <div key={k} className="flex justify-between gap-2">
                                <dt className="text-muted-foreground">{k.replace(/_/g, " ")}</dt>
                                <dd className="font-medium tabular-nums">{String(v)}</dd>
                              </div>
                            ))}
                          </dl>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );

  if (embedded) return inner;

  return (
    <SocialPageShell
      title={t("social.analytics.title")}
      description={t("social.analytics.desc")}
    >
      {inner}
    </SocialPageShell>
  );
}
