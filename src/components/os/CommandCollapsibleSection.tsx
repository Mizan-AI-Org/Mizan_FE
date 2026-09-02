import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

type Props = {
  id?: string;
  title: string;
  description?: string;
  count?: number;
  defaultOpen?: boolean;
  preview?: string;
  variant?: "default" | "agent";
  className?: string;
  children: React.ReactNode;
};

/** Collapsible command-board section. */
export function CommandCollapsibleSection({
  id,
  title,
  description,
  count,
  defaultOpen = false,
  preview,
  variant = "default",
  className,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const isAgent = variant === "agent";

  return (
    <section id={id} aria-label={title} className={cn("scroll-mt-24 os-section", className)}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <div
          className={cn(
            "overflow-hidden rounded-panel border shadow-xs",
            isAgent
              ? "border-ai-border bg-gradient-to-br from-ai/90 to-card"
              : "border-border/70 bg-card",
          )}
        >
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex w-full items-start justify-between gap-3 px-4 py-3.5 text-left transition-colors",
                "hover:bg-muted/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
              )}
              aria-expanded={open}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-section-title">{title}</span>
                  {count != null && count > 0 ? (
                    <span
                      className={cn(
                        "inline-flex min-w-[1.5rem] items-center justify-center rounded-full px-2 py-0.5 text-caption font-semibold tabular-nums",
                        isAgent ? "bg-primary/15 text-primary" : "bg-primary/12 text-primary",
                      )}
                    >
                      {count}
                    </span>
                  ) : null}
                </div>
                {description ? (
                  <p className="mt-0.5 text-body text-muted-foreground">{description}</p>
                ) : null}
                {!open && preview ? (
                  <p className="mt-2 truncate text-caption text-muted-foreground/90">{preview}</p>
                ) : null}
              </div>
              <ChevronDown
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                  open && "rotate-180",
                )}
                aria-hidden
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-t border-border/60 px-4 py-3">{children}</div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </section>
  );
}

export default CommandCollapsibleSection;
