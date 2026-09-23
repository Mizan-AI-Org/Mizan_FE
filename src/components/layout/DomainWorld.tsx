import { Navigate, Outlet, useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { DOMAIN_SECTIONS, type DomainId } from "@/lib/mizan-domains";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { MizanPageShell } from "@/components/os/MizanPageShell";
import { MIZAN_GRID_GAP, MIZAN_SURFACE_CARD } from "@/lib/mizan-ui";
import { Button } from "@/components/ui/button";
import { OPERATIONAL_COMMAND_ROLES } from "@/lib/operationalCommandRoles";
import { roleAllowed } from "@/lib/operationalCommandRoles";
import { localizedCopy, type DomainCopyParams } from "@/lib/domain-copy";

type I18nParams = DomainCopyParams;

type DomainWorld = {
  id: string;
  title: string;
  title_key?: string;
  subtitle?: string;
  subtitle_key?: string;
  kpis: Array<{ label: string; label_key?: string; value: string | number; tone?: string }>;
  today: Array<{
    title: string;
    title_key?: string;
    title_params?: I18nParams;
    detail?: string;
    detail_key?: string;
    detail_params?: I18nParams;
    href?: string;
  }>;
  today_total?: number;
  observations: Array<{
    text: string;
    message_key?: string;
    message_params?: I18nParams;
    severity?: string;
    href?: string;
  }>;
};

const localized = localizedCopy;

export function DomainLayout({
  domain,
  roles = [...OPERATIONAL_COMMAND_ROLES],
}: {
  domain: DomainId;
  roles?: string[];
}) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return <div className="flex min-h-[40vh] items-center justify-center" />;
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!roleAllowed(user.role, roles)) return <Navigate to="/unauthorized" replace />;
  return (
    <div className="min-w-0">
      <Outlet context={{ domain }} />
    </div>
  );
}

function isDomainOverviewIndex(domain: DomainId, pathname: string): boolean {
  const indexHref = `/dashboard/${domain}`;
  return pathname === indexHref || pathname === `${indexHref}/`;
}

function activeDomainSection(domain: DomainId, pathname: string) {
  const sections = DOMAIN_SECTIONS[domain] || [];
  const sorted = [...sections].sort((a, b) => b.href.length - a.href.length);
  return sorted.find((s) => {
    if (s.exact) return pathname === s.href || pathname === `${s.href}/`;
    return pathname === s.href || pathname.startsWith(`${s.href}/`);
  });
}

/** KPI count → grid columns so stat cards span the full header width (no empty columns). */
function kpiGridColsClass(count: number): string {
  if (count <= 1) return "grid-cols-1";
  if (count === 2) return "grid-cols-2";
  if (count === 3) return "grid-cols-2 lg:grid-cols-3";
  if (count === 4) return "grid-cols-2 lg:grid-cols-4";
  return "grid-cols-2 sm:grid-cols-3 xl:grid-cols-5";
}

export function DomainOverviewPage({ domain: domainProp }: { domain?: DomainId }) {
  const ctx = useOutletContext<{ domain?: DomainId } | undefined>();
  const domain = domainProp || ctx?.domain || "operations";
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const onOverviewIndex = isDomainOverviewIndex(domain, pathname);
  const section = activeDomainSection(domain, pathname);

  const { data } = useQuery<DomainWorld>({
    queryKey: ["domain-world", domain],
    queryFn: () => api.getDomainWorld(domain),
    staleTime: 30_000,
    enabled: onOverviewIndex,
  });

  const domainTitle = t(`nav.${domain}`);
  const sectionTitle = section && !section.exact ? t(section.labelKey) : domainTitle;
  const eyebrow = onOverviewIndex ? t("nav.overview") : domainTitle;
  const title = onOverviewIndex ? domainTitle : sectionTitle;

  const subtitle = onOverviewIndex
    ? data?.subtitle_key
      ? localized(t, data.subtitle_key, data.subtitle || "")
      : domain === "employees"
        ? t("domain.team.subtitle")
        : data?.subtitle
    : undefined;

  const sectionDescription =
    !onOverviewIndex && section
      ? t("domain.section_placeholder", {
          section: sectionTitle,
          domain: domainTitle,
          defaultValue: `${sectionTitle} — open a linked workspace below or use the sidebar.`,
        })
      : undefined;

  const siblingLinks = (DOMAIN_SECTIONS[domain] || []).filter((s) => !s.exact && s.href !== section?.href);
  const workspaceLinks = (DOMAIN_SECTIONS[domain] || []).filter((s) => !s.exact);

  return (
    <MizanPageShell
      eyebrow={eyebrow}
      title={title}
      description={subtitle || sectionDescription}
      showAskAgent
      askAgentPrompt={t("domain.ask_prompt", { domain: domainTitle })}
      hero
    >
      {onOverviewIndex ? (
        <>
          <section
            className={cn(
              "grid w-full auto-rows-fr",
              kpiGridColsClass((data?.kpis || []).length),
              MIZAN_GRID_GAP,
            )}
          >
            {(data?.kpis || []).map((kpi) => (
              <div key={kpi.label_key || kpi.label} className={cn(MIZAN_SURFACE_CARD, "min-w-0 flex flex-col justify-center")}>
                <p className="text-caption text-muted-foreground">{localized(t, kpi.label_key, kpi.label)}</p>
                <p
                  className={cn(
                    "mt-2 text-4xl font-bold tabular-nums tracking-tight leading-none sm:text-5xl",
                    kpi.tone === "critical" && "text-critical",
                    kpi.tone === "warning" && "text-amber-600 dark:text-amber-400",
                  )}
                >
                  {kpi.value}
                </p>
              </div>
            ))}
          </section>

          <div className={cn("grid lg:grid-cols-2", MIZAN_GRID_GAP)}>
            <section className={MIZAN_SURFACE_CARD}>
              <h2 className="mb-3 text-section-title">{t("domain.today")}</h2>
              <ul className="max-h-80 space-y-1 overflow-y-auto pr-1">
                {(data?.today || []).map((row) => {
                  const title = localized(t, row.title_key, row.title, row.title_params);
                  const detail = localized(t, row.detail_key, row.detail || "", row.detail_params);
                  return (
                  <li key={row.href || `${row.title_key || row.title}-${detail}`}>
                    <button
                      type="button"
                      className="w-full rounded-lg px-2 py-2 text-start transition-colors hover:bg-muted/60"
                      onClick={() => row.href && navigate(row.href)}
                    >
                      <p className="font-medium">{title}</p>
                      {detail ? <p className="text-caption text-muted-foreground">{detail}</p> : null}
                    </button>
                  </li>
                  );
                })}
                {!data?.today?.length ? (
                  <p className="text-body text-muted-foreground">{t("domain.empty_today")}</p>
                ) : null}
              </ul>
              {(data?.today_total || 0) > (data?.today?.length || 0) ? (
                <p className="mt-2 text-caption text-muted-foreground">
                  {t("domain.today.showing", {
                    shown: data?.today?.length || 0,
                    total: data?.today_total || 0,
                    defaultValue: "Showing {{shown}} of {{total}}",
                  })}
                </p>
              ) : null}
            </section>
            <section className={cn(MIZAN_SURFACE_CARD, "border-ai-border bg-gradient-to-br from-ai/50 to-card")}>
              <h2 className="mb-3 text-section-title">{t("domain.observations")}</h2>
              <ul className="space-y-3">
                {(data?.observations || []).map((row) => {
                  const text = localized(t, row.message_key, row.text, row.message_params);
                  return (
                  <li key={row.message_key || row.text} className="text-body">
                    {row.href ? (
                      <button type="button" className="text-start hover:underline" onClick={() => navigate(row.href!)}>
                        {text}
                      </button>
                    ) : (
                      text
                    )}
                  </li>
                  );
                })}
              </ul>
            </section>
          </div>

          {(DOMAIN_SECTIONS[domain] || []).filter((s) => !s.exact).length > 0 ? (
            <section>
              <h2 className="mb-3 text-section-title">
                {t("domain.workspaces", { defaultValue: "Workspaces" })}
              </h2>
              <ul className={cn("grid sm:grid-cols-2 lg:grid-cols-3", MIZAN_GRID_GAP)}>
                {(DOMAIN_SECTIONS[domain] || [])
                  .filter((s) => !s.exact)
                  .map((link) => (
                    <li key={link.href}>
                      <button
                        type="button"
                        onClick={() => navigate(link.href)}
                        className="group flex h-full w-full items-center justify-between rounded-xl border border-border/80 bg-card px-4 py-4 text-left shadow-sm transition-all hover:border-primary/35 hover:shadow-md"
                      >
                        <span className="font-medium">{t(link.labelKey)}</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                      </button>
                    </li>
                  ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : (
        <section className={MIZAN_SURFACE_CARD}>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {(data?.observations?.[0]
              ? localized(
                  t,
                  data.observations[0].message_key,
                  data.observations[0].text,
                  data.observations[0].message_params,
                )
              : "") ||
              t("domain.stub_body", {
                defaultValue: "This workspace is wired in the sidebar. Use the links below to jump to live data.",
              })}
          </p>
          {siblingLinks.length > 0 ? (
            <ul className={cn("mt-6 grid sm:grid-cols-2", MIZAN_GRID_GAP)}>
              {siblingLinks.slice(0, 6).map((link) => (
                <li key={link.href}>
                  <button
                    type="button"
                    onClick={() => navigate(link.href)}
                    className="group flex w-full items-center justify-between rounded-xl border border-border/80 bg-card px-4 py-3 text-left shadow-sm transition-colors hover:border-primary/35"
                  >
                    <span className="font-medium">{t(link.labelKey)}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {section?.href ? (
            <Button className="mt-6" variant="secondary" onClick={() => navigate(section.href)}>
              {t("domain.open_section", { section: sectionTitle, defaultValue: `Open ${sectionTitle}` })}
            </Button>
          ) : null}
        </section>
      )}
    </MizanPageShell>
  );
}
