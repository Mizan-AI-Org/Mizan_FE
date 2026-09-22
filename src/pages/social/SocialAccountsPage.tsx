import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { socialApi } from "@/lib/social-api";
import { SocialPageShell } from "@/pages/social/SocialPageShell";
import { toast } from "sonner";

const LABELS: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  google_business: "Google Business Profile",
};

export default function SocialAccountsPage() {
  const qc = useQueryClient();
  const returnTo = `${window.location.origin}/dashboard/social-media?tab=home`;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["social-accounts"],
    queryFn: () => socialApi.accounts(),
  });

  const connect = useMutation({
    mutationFn: (platform: string) => socialApi.oauthStart(platform, returnTo),
    onSuccess: (res, platform) => {
      if (res.authorization_url) {
        window.location.href = res.authorization_url;
        return;
      }
      toast.error(
        res.missing_env?.length
          ? `Server missing: ${res.missing_env.join(", ")}. See docs/social-media-setup.md`
          : `OAuth not configured for ${platform}`,
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const disconnect = useMutation({
    mutationFn: (platform: string) => socialApi.disconnect(platform),
    onSuccess: () => {
      toast.success("Disconnected");
      qc.invalidateQueries({ queryKey: ["social-accounts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <SocialPageShell title="Accounts" description="Connect official OAuth channels per restaurant.">
        <p className="text-muted-foreground">
          Could not load accounts.{" "}
          <button type="button" className="underline" onClick={() => refetch()}>
            Retry
          </button>
        </p>
      </SocialPageShell>
    );
  }

  const setupByPlatform = Object.fromEntries((data.platform_setup || []).map((s) => [s.platform, s]));

  return (
    <SocialPageShell
      title="Accounts"
      description="OAuth connections are tenant-scoped. Tokens stay on the server — never exposed to the browser."
    >
      <div className="grid gap-4 md:grid-cols-2">
        {data.accounts.map((acc) => {
          const platform = String(acc.platform);
          const connected = acc.status === "connected";
          const setup = setupByPlatform[platform];
          return (
            <Card key={platform}>
              <CardHeader>
                <CardTitle className="text-base">{LABELS[platform] || platform}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-muted-foreground">
                  {connected
                    ? `@${String(acc.username || acc.account_name || "connected")}`
                    : setup?.configured
                      ? "Ready to connect via OAuth"
                      : `Configure server env: ${(setup?.missing_env || []).join(", ") || "see docs"}`}
                </p>
                {setup?.docs_url ? (
                  <a href={setup.docs_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary">
                    Provider docs <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
                <div className="flex gap-2">
                  <Button size="sm" disabled={connect.isPending} onClick={() => connect.mutate(platform)}>
                    {connected ? "Reconnect" : "Connect"}
                  </Button>
                  {connected ? (
                    <Button size="sm" variant="outline" onClick={() => disconnect.mutate(platform)}>
                      Disconnect
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </SocialPageShell>
  );
}
