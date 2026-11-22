import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AssigneeTrailStep, TrailPerson } from "@/lib/types";

type Props = {
  /** Who made the request or task (main: task.created_by). */
  createdBy?: TrailPerson | null;
  /** Every hand-over, oldest first (main: task.assignee_trail). */
  trail?: AssigneeTrailStep[] | null;
  /** Fallback text for the source when there is no person (e.g. "WhatsApp"). */
  sourceLabel?: string;
  onPersonClick?: (person: TrailPerson) => void;
  className?: string;
};

function Person({ person, onClick, current }: { person: TrailPerson; onClick?: (p: TrailPerson) => void; current?: boolean }) {
  const label = person.name || "?";
  const cls = current ? "font-semibold text-foreground" : "text-muted-foreground";
  if (!onClick || !person.id) return <span className={cls}>{label}</span>;
  return (
    <button type="button" className={`${cls} underline-offset-2 hover:underline`} onClick={() => onClick(person)}>
      {label}
    </button>
  );
}

/**
 * Compact trail for task rows and sheets: "Requested by Salma" then "Hamza › Kenza". Renders main's data
 * (created_by + assignee_trail); the full history card with timestamps stays in dashboard/AssigneeTrail.
 */
export function AssignmentTrail({ createdBy, trail, sourceLabel, onPersonClick, className }: Props) {
  const { t } = useTranslation();
  const hops = (trail || []).filter((step) => step?.to?.name);
  const source = createdBy?.name || sourceLabel || "";
  if (!source && hops.length < 2) return null;
  return (
    <div className={`space-y-1 text-xs ${className || ""}`} data-testid="assignment-trail">
      {source ? (
        <div className="text-muted-foreground">
          {t("cursorUi.resp.requested_by")}{" "}
          {createdBy?.name ? (
            <Person person={createdBy} onClick={onPersonClick} current />
          ) : (
            <span className="font-semibold text-foreground">{source}</span>
          )}
        </div>
      ) : null}
      {hops.length > 1 ? (
        <div className="flex flex-wrap items-center gap-1" aria-label={t("dashboard.task_detail.trail")}>
          {hops.map((hop, index) => (
            <span key={`${hop.to?.id || hop.to?.name}-${hop.at}-${index}`} className="inline-flex items-center gap-1">
              {index > 0 ? <ChevronRight className="h-3 w-3 text-muted-foreground/60" aria-hidden /> : null}
              <Person person={hop.to as TrailPerson} onClick={onPersonClick} current={index === hops.length - 1} />
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
