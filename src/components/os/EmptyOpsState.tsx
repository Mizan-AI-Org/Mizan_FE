import React from "react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

/** Operational empty state - never a dead “No data”. */
export function EmptyOpsState({
  title,
  description,
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
      {action ? (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {action}
        </div>
      ) : null}
    </div>
  );
}

export default EmptyOpsState;
