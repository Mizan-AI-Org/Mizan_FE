import React from "react";
import SocialAnalyticsPage from "@/pages/social/SocialAnalyticsPage";
import SocialCampaignsPage from "@/pages/social/SocialCampaignsPage";
import SocialAutopilotPage from "@/pages/social/SocialAutopilotPage";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useLanguage } from "@/hooks/use-language";

/** Analytics, campaigns, and autopilot in one scroll — no extra nav tabs. */
export default function SocialInsightsPanel() {
  const { t } = useLanguage();
  return (
    <Accordion type="multiple" defaultValue={["analytics"]} className="space-y-2">
      <AccordionItem value="analytics" className="rounded-lg border px-4">
        <AccordionTrigger className="text-sm font-medium">{t("social.insights.analytics")}</AccordionTrigger>
        <AccordionContent className="pb-4 pt-2">
          <SocialAnalyticsPage embedded />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="campaigns" className="rounded-lg border px-4">
        <AccordionTrigger className="text-sm font-medium">{t("social.insights.campaigns")}</AccordionTrigger>
        <AccordionContent className="pb-4 pt-2">
          <SocialCampaignsPage embedded />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="autopilot" className="rounded-lg border px-4">
        <AccordionTrigger className="text-sm font-medium">{t("social.insights.autopilot")}</AccordionTrigger>
        <AccordionContent className="pb-4 pt-2">
          <SocialAutopilotPage embedded />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
