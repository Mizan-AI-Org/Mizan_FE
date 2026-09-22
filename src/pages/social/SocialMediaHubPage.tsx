import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HUB_TABS_LIST } from "@/lib/mizan-ui";
import { Button } from "@/components/ui/button";
import { SocialPageShell } from "@/pages/social/SocialPageShell";
import { SocialConnectBar } from "@/components/social/social-connect-bar";
import { SocialPostComposerDialog } from "@/components/social/social-post-composer-dialog";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/use-language";
import SocialOverviewPage from "@/pages/social/SocialOverviewPage";
import SocialIdeasPage from "@/pages/social/SocialIdeasPage";
import SocialCalendarPage from "@/pages/social/SocialCalendarPage";
import SocialContentPage from "@/pages/social/SocialContentPage";
const Insights = React.lazy(() => import("@/pages/social/SocialInsightsPanel"));

const TAB_KEYS = ["home", "plan", "schedule", "posts", "insights"] as const;
type TabKey = (typeof TAB_KEYS)[number];

function parseTab(raw: string | null): TabKey {
  if (raw && TAB_KEYS.includes(raw as TabKey)) return raw as TabKey;
  return "home";
}

/** Single Social Media hub — no sidebar sub-tabs. */
export default function SocialMediaHubPage() {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = parseTab(searchParams.get("tab"));
  const [composerOpen, setComposerOpen] = useState(searchParams.get("create") === "1");

  useEffect(() => {
    if (searchParams.get("create") === "1") setComposerOpen(true);
    const status = searchParams.get("status");
    if (status && tab !== "posts") {
      const p = new URLSearchParams(searchParams);
      p.set("tab", "posts");
      setSearchParams(p, { replace: true });
    }
  }, [searchParams, setSearchParams, tab]);

  useEffect(() => {
    const social = searchParams.get("social");
    if (!social) return;
    const platform = searchParams.get("platform") || "channel";
    const detail = searchParams.get("detail");
    const needsTarget = searchParams.get("needs_target") === "1";
    if (social === "connected") {
      if (needsTarget) {
        toast.message(t("social.hub.finish_setup", { platform: platform.replace(/_/g, " ") }), {
          description: t("social.hub.finish_setup_desc"),
        });
      } else {
        toast.success(t("social.hub.connected", { platform: platform.replace(/_/g, " ") }));
      }
    } else if (social === "error") {
      toast.error(detail ? t("social.hub.connection_failed_detail", { detail }) : t("social.hub.connection_failed"));
    }
    const p = new URLSearchParams(searchParams);
    p.delete("social");
    p.delete("platform");
    p.delete("detail");
    p.delete("needs_target");
    setSearchParams(p, { replace: true });
  }, [searchParams, setSearchParams]);

  const setTab = (next: string) => {
    const p = new URLSearchParams(searchParams);
    p.set("tab", next);
    p.delete("create");
    setSearchParams(p, { replace: true });
  };

  return (
    <SocialPageShell
      title={t("nav.social_media")}
      actions={
        <Button className="gap-2" onClick={() => setComposerOpen(true)}>
          <Plus className="h-4 w-4" /> {t("social.hub.new_post")}
        </Button>
      }
    >
      <SocialConnectBar className="mb-8" />

      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList className={HUB_TABS_LIST}>
          {(
            [
              ["home", "social.hub.home"],
              ["plan", "social.hub.plan"],
              ["schedule", "social.hub.schedule"],
              ["posts", "social.hub.posts"],
              ["insights", "social.hub.insights"],
            ] as const
          ).map(([value, labelKey]) => (
            <TabsTrigger
              key={value}
              value={value}
              className="w-full lg:col-span-1 sm:[&:nth-child(5)]:col-span-1 [&:nth-child(5)]:col-span-2"
            >
              {t(labelKey)}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="home" className="mt-0 focus-visible:outline-none">
          <SocialOverviewPage embedded />
        </TabsContent>
        <TabsContent value="plan" className="mt-0 focus-visible:outline-none">
          <SocialIdeasPage embedded />
        </TabsContent>
        <TabsContent value="schedule" className="mt-0 focus-visible:outline-none">
          <SocialCalendarPage embedded />
        </TabsContent>
        <TabsContent value="posts" className="mt-0 focus-visible:outline-none">
          <SocialContentPage embedded />
        </TabsContent>
        <TabsContent value="insights" className="mt-0 focus-visible:outline-none">
          <Suspense
            fallback={
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            }
          >
            <Insights />
          </Suspense>
        </TabsContent>
      </Tabs>

      <SocialPostComposerDialog open={composerOpen} onOpenChange={setComposerOpen} />
    </SocialPageShell>
  );
}
