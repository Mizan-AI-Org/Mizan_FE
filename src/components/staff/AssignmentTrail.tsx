import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

export type TrailPerson = { id?: string | null; name?: string | null; role?: string | null };

export type AssignmentTrailEntry = {
  user?: TrailPerson | null;
  by?: TrailPerson | null;
  reason?: string;
  at?: string;
};

type Props = {
  /** Who made the request or task (its source). */
  createdBy?: TrailPerson | null;
  /** Everyone it was assigned to, oldest first. */
  trail?: AssignmentTrailEntry[] | null;
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

/** "Requested by Salma" + "Hamza › Kenza": the source of the work and everyone who held it. */
export function AssignmentTrail({ createdBy, trail, sourceLabel, onPersonClick, className }: Props) {
  const { t } = useTranslation();
  const hops = (trail || []).filter((e) => e?.user?.name);
  const source = createdBy?.name || sourceLabel || "";
  if (!source && hops.length < 2) return null;
  return (
    <div className={`space-y-1 text-xs ${className || ""}`}>
      {source ? (
        <div className="text-muted-foreground">
          {t("staff.requests.requested_by")}{" "}
          {createdBy?.name ? <Person person={createdBy} onClick={onPersonClick} current /> : <span className="font-semibold text-foreground">{source}</span>}
        </div>
      ) : null}
      {hops.length > 1 ? (
        <div className="flex flex-wrap items-center gap-1" aria-label={t("staff.requests.assignment_trail")}>
          {hops.map((hop, index) => (
            <span key={`${hop.user?.id || hop.user?.name}-${index}`} className="inline-flex items-center gap-1">
              {index > 0 ? <ChevronRight className="h-3 w-3 text-muted-foreground/60" aria-hidden /> : null}
              <Person person={hop.user as TrailPerson} onClick={onPersonClick} current={index === hops.length - 1} />
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
