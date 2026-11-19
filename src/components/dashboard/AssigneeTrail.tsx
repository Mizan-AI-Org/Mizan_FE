import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";

import type { AssigneeTrailStep, TrailPerson } from "@/lib/types";

const REASON_KEYS: Record<string, string> = {
  claim: "dashboard.task_detail.trail_claim",
  reassign: "dashboard.task_detail.trail_reassign",
  escalate: "dashboard.task_detail.trail_escalate",
  create: "dashboard.task_detail.trail_create",
};

interface AssigneeTrailProps {
  createdBy?: TrailPerson | null;
  trail?: AssigneeTrailStep[];
}

/** "Requested by Salman › Omar › Wissal (now)": the source, then every person it was handed to. */
export function AssigneeTrail({ createdBy, trail }: AssigneeTrailProps) {
  const { t } = useTranslation();
  const steps = (trail ?? []).filter((step) => step.to?.name);
  if (!createdBy?.name && steps.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {t("dashboard.task_detail.trail", { defaultValue: "Assignment history" })}
      </div>
      <ol className="mt-1.5 flex flex-wrap items-center gap-1 text-sm" aria-label={t("dashboard.task_detail.trail")}>
        {createdBy?.name ? (
          <li className="text-muted-foreground">
            {t("dashboard.task_detail.requested_by", { name: createdBy.name, defaultValue: "Requested by {{name}}" })}
          </li>
        ) : null}
        {steps.map((step, index) => {
          const current = index === steps.length - 1;
          const reasonKey = REASON_KEYS[step.reason];
          const when = new Date(step.at);
          return (
            <Fragment key={`${step.to?.id}-${step.at}`}>
              {createdBy?.name || index > 0 ? (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              ) : null}
              <li
                className={current ? "font-semibold text-foreground" : "text-muted-foreground"}
                title={[
                  reasonKey ? t(reasonKey) : null,
                  step.by?.name && step.by.id !== step.to?.id ? step.by.name : null,
                  Number.isNaN(when.getTime()) ? null : when.toLocaleString(),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              >
                {step.to?.name}
                {current ? (
                  <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                    ({t("dashboard.task_detail.trail_current", { defaultValue: "now" })})
                  </span>
                ) : null}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </div>
  );
}
