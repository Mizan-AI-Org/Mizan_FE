import React from "react";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { askMiya } from "@/lib/miyaPageContext";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description?: string;
  miyaLine?: string;
  askPrompt?: string;
  action?: React.ReactNode;
  className?: string;
};

/** Operational empty state - never a dead “No data”. */
export function EmptyOpsState({
  title,
  description,
  miyaLine,
  askPrompt,
  action,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "os-panel border-dashed px-4 py-8 text-center sm:px-6",
        className,
      )}
      role="status"
    >
      <p className="text-card-title text-foreground">{title}</p>
      {description ? <p className="mt-1 type-secondary">{description}</p> : null}
      {miyaLine ? (
        <p className="mt-3 type-secondary">
          <span className="font-medium text-primary">Miya: </span>
          {miyaLine}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {action}
        {askPrompt ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => askMiya({ prompt: askPrompt })}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Ask Miya
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export default EmptyOpsState;
