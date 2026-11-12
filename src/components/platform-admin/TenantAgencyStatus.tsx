import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Wrench } from "lucide-react";
import { platformApi } from "@/lib/platformApi";
import { opsBadgeViolet, opsBtnGhost, opsBtnPrimary, opsCard, opsLink, opsMuted } from "@/components/platform-admin/opsStyles";

/** Tenant page: an agency is a normal tenant with agency status. Promote it here, then connect the restaurants
 * that send it their issues; or take the status back once no restaurant is connected. */
export default function TenantAgencyStatus({ tenantId, restaurantType }: { tenantId: string; restaurantType?: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isAgency = restaurantType === "agency";
  const promote = useMutation({
    mutationFn: () => platformApi.promoteToAgency(tenantId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-agencies"] });
      navigate(`/admin/agencies/${tenantId}`);
    },
  });
  const demote = useMutation({
    mutationFn: () => platformApi.demoteAgency(tenantId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["platform-tenant", tenantId] }),
  });
  return (
    <section className={`${opsCard} space-y-3 p-5`}>
      <div className="flex items-center gap-2">
        <Wrench className="h-4 w-4" />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Agency</h3>
        {isAgency ? <span className={opsBadgeViolet}>Agency</span> : null}
      </div>
      {isAgency ? (
        <>
          <p className={opsMuted}>
            This tenant is an agency: the restaurants connected to it send it their breakdowns, cleaning, security and
            shared-area issues.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link to={`/admin/agencies/${tenantId}`} className={opsLink}>
              Connected restaurants and targets →
            </Link>
            <button type="button" className={opsBtnGhost} disabled={demote.isPending} onClick={() => demote.mutate()}>
              Remove agency status
            </button>
          </div>
          {demote.error ? <p className="text-sm text-rose-600">{(demote.error as Error).message}</p> : null}
        </>
      ) : (
        <>
          <p className={opsMuted}>
            Make this tenant an agency to connect the restaurants it looks after. It keeps everything it has today and
            gets a Jobs board for the issues they report.
          </p>
          <button type="button" className={opsBtnPrimary} disabled={promote.isPending} onClick={() => promote.mutate()}>
            {promote.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Promote to agency
          </button>
          {promote.error ? <p className="text-sm text-rose-600">{(promote.error as Error).message}</p> : null}
        </>
      )}
    </section>
  );
}
