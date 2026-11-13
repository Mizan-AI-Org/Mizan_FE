import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Wrench } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { API_BASE, authFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import type { AgencyJob } from "@/pages/AgencyJobsPage";
import { safeMediaUrl } from "@/lib/safeUrl";

/** On a restaurant's incident: where the avenue's agency is on it (Mizan_BE apps/agencies). Nothing when the
 * incident is the team's own (the endpoint answers 404). */
export default function IncidentAgencyStatus({ incidentId }: { incidentId?: string | null }) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const key = ["incident-agency", incidentId];
  const query = useQuery({
    queryKey: key,
    enabled: !!incidentId,
    retry: false,
    queryFn: async () => {
      const res = await authFetch(`${API_BASE}/incidents/${incidentId}/agency/`);
      if (res.status === 404) return null;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Request failed");
      return (data.data ?? data) as { agency: { id: string; name: string }; job: AgencyJob };
    },
  });
  const cancel = useMutation({
    mutationFn: async () => {
      const res = await authFetch(`${API_BASE}/incidents/${incidentId}/agency/cancel/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Request failed");
    },
    onSuccess: () => {
      toast.success(t("agency.badge.cancelled"));
      queryClient.invalidateQueries({ queryKey: key });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const data = query.data;
  if (!data) return null;
  const job = data.job;
  const open = !["DONE", "CANCELLED"].includes(job.status);
  const proofHref = job.proof.length ? safeMediaUrl(job.proof[job.proof.length - 1]) : undefined;
  return (
    <div className="space-y-1 rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs dark:border-sky-900 dark:bg-sky-950/40">
      <div className="flex items-center gap-1 font-semibold">
        <Wrench className="h-3.5 w-3.5" /> {t("agency.badge.with", { agency: data.agency.name })}
        <span className="ml-1 font-normal">
          · {t(`agency.status.${job.status}`)} · {t(`agency.urgency.${job.urgency}`)}
        </span>
      </div>
      {job.assignedTo ? <div>{job.assignedTo.name}</div> : null}
      {job.fixBy && open ? <div>{t("agency.fix")} {new Date(job.fixBy).toLocaleString()}</div> : null}
      {proofHref ? (
        <a href={proofHref} target="_blank" rel="noreferrer" className="underline">
          📷 {t("agency.status.DONE")}
        </a>
      ) : null}
      {open ? (
        <Button size="sm" variant="outline" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
          {t("agency.badge.cancel")}
        </Button>
      ) : null}
    </div>
  );
}
