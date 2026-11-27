import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { MIZAN_ELEVATED_CARD } from "@/lib/mizan-ui";

/** Shared card shell for the sub-views of the Operations page (Compliance, Accountability, Progress). */
export function OperationsSubviewShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        MIZAN_ELEVATED_CARD,
        "p-4 sm:p-5 lg:p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
