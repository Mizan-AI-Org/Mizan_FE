import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, HelpCircle, MessageCircle, Sparkles } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useAgentPanelOptional } from "@/context/AgentPanelContext";
import { API_BASE, authFetch } from "@/lib/api";
import { safeUrl } from "@/lib/safeUrl";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type SupportLinks = { whatsapp_url?: string; docs_url?: string };

/** Help entry in the app header: ask Miya, talk to support on WhatsApp, read the guides.
 * Both links come from the server (SUPPORT_WHATSAPP_URL / SUPPORT_DOCS_URL), so they can change without a release. */
export default function HelpPanel() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const agent = useAgentPanelOptional();
  const support = useQuery<SupportLinks>({
    queryKey: ["help-support-links"],
    enabled: open,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const res = await authFetch(`${API_BASE}/settings/unified/`);
      if (!res.ok) return {};
      const data = (await res.json()) as { support?: SupportLinks };
      return data.support ?? {};
    },
  });
  const whatsapp = safeUrl(support.data?.whatsapp_url);
  const docs = safeUrl(support.data?.docs_url);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="text-foreground hover:bg-muted hover:text-foreground"
        aria-label={t("help.title")}
        onClick={() => setOpen(true)}
      >
        <HelpCircle className="h-5 w-5" aria-hidden />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{t("help.title")}</SheetTitle>
            <SheetDescription>{t("help.subtitle")}</SheetDescription>
          </SheetHeader>
          <div className="mt-6 grid gap-3">
            {agent ? (
              <Button
                variant="outline"
                className="h-auto justify-start gap-3 whitespace-normal p-4 text-start"
                onClick={() => {
                  setOpen(false);
                  agent.askAgent(t("help.ask_miya_prompt"));
                }}
              >
                <Sparkles className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
                <span>
                  <span className="block font-semibold">{t("help.ask_miya")}</span>
                  <span className="block text-xs font-normal text-muted-foreground">{t("help.ask_miya_desc")}</span>
                </span>
              </Button>
            ) : null}
            {whatsapp ? (
              <Button asChild variant="outline" className="h-auto justify-start gap-3 whitespace-normal p-4 text-start">
                <a href={whatsapp} target="_blank" rel="noreferrer">
                  <MessageCircle className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
                  <span>
                    <span className="block font-semibold">{t("help.whatsapp")}</span>
                    <span className="block text-xs font-normal text-muted-foreground">{t("help.whatsapp_desc")}</span>
                  </span>
                </a>
              </Button>
            ) : null}
            {docs ? (
              <Button asChild variant="outline" className="h-auto justify-start gap-3 whitespace-normal p-4 text-start">
                <a href={docs} target="_blank" rel="noreferrer">
                  <BookOpen className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
                  <span>
                    <span className="block font-semibold">{t("help.docs")}</span>
                    <span className="block text-xs font-normal text-muted-foreground">{t("help.docs_desc")}</span>
                  </span>
                </a>
              </Button>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
