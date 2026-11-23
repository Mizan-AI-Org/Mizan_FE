import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

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
        "rounded-xl border border-border/70 bg-card/90 shadow-sm",
        "p-4 sm:p-5 lg:p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
