import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";

function hrefBase(href: string): string {
  return href.split("#")[0].split("?")[0];
}

type NavAttentionPayload = {
  counts?: Record<string, number>;
  generated_at?: string | null;
};

/**
 * Sidebar +N badges — counts come from GET /dashboard/nav-attention/ (live DB, one count per route).
 */
export function useNavAttentionBadges(_navHrefs: string[]) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["nav-attention", "counts"],
    queryFn: async () => {
      const payload = (await api.getNavAttention()) as NavAttentionPayload;
      return payload?.counts ?? {};
    },
    enabled: Boolean(accessToken),
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const countsByHref = useMemo(() => data ?? {}, [data]);

  const badgeForHref = (href: string, isActive = false): number => {
    if (isActive) return 0;
    if (countsByHref[href]) return countsByHref[href];
    return countsByHref[hrefBase(href)] || 0;
  };

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["nav-attention", "counts"] });
  };

  return { badgeForHref, countsByHref, invalidate };
}

/** Call after actions that change open incidents, approvals, invites, etc. */
export function invalidateNavAttentionBadges(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ["nav-attention", "counts"] });
}
