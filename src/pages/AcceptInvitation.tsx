import React from "react";
import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";

/** Old /invite/{token} and /accept-invitation links. Invitation links are no longer used: a manager adds people
 * with their WhatsApp number and Mizan messages them there (Join button). Kept so old links explain that. */
export const InviteLinkRetired: React.FC = () => {
  const { t } = useLanguage();
  return (
    <div className="dark flex min-h-screen items-center justify-center bg-[#0A0D10] p-4 text-white">
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6">
        <MessageCircle className="h-8 w-8 text-[#00E676]" />
        <h1 className="text-xl font-bold">{t("auth.invite_retired.title")}</h1>
        <p className="text-sm leading-relaxed text-[#B0BEC5]">{t("auth.invite_retired.body")}</p>
        <Button asChild variant="outline" className="w-full border-[#00E676]/40 bg-transparent text-[#00E676]">
          <Link to="/auth">{t("auth.invite_retired.sign_in")}</Link>
        </Button>
      </div>
    </div>
  );
};

export default InviteLinkRetired;
