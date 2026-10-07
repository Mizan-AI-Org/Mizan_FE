import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ChecklistAssignee } from "@/lib/assignedChecklists";

const VISIBLE = 4;

type Props = {
  assignees: ChecklistAssignee[];
  openLabel: string;
  sectionLabel: string;
  moreLabel: (count: number) => string;
  className?: string;
};

export function ChecklistAssigneePreview({
  assignees,
  openLabel,
  sectionLabel,
  moreLabel,
  className,
}: Props) {
  const visible = assignees.slice(0, VISIBLE);
  const hidden = assignees.slice(VISIBLE);

  return (
    <div className={cn("rounded-lg border border-border/50 bg-muted/30 px-2.5 py-2", className)}>
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <Users className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>{sectionLabel}</span>
      </div>
      {assignees.length === 0 ? (
        <p className="text-sm text-muted-foreground leading-snug">{openLabel}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {visible.map((person) => (
            <Badge
              key={person.id}
              variant="secondary"
              className="max-w-[140px] truncate px-2 py-0.5 text-xs font-normal bg-background/80"
              title={person.name}
            >
              {person.name}
            </Badge>
          ))}
          {hidden.length > 0 ? (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="cursor-default px-2 py-0.5 text-xs font-medium tabular-nums"
                  >
                    {moreLabel(hidden.length)}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <ul className="space-y-0.5 text-xs">
                    {hidden.map((person) => (
                      <li key={person.id}>{person.name}</li>
                    ))}
                  </ul>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
        </div>
      )}
    </div>
  );
}
