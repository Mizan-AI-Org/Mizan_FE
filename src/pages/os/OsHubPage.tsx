import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { MizanPageShell } from "@/components/os/MizanPageShell";
import { MIZAN_GRID_GAP } from "@/lib/mizan-ui";
import { cn } from "@/lib/utils";

export type HubLink = {
  label: string;
  description: string;
  href: string;
  icon?: LucideIcon;
};

type Props = {
  eyebrow?: string;
  title: string;
  description: string;
  links: HubLink[];
};

/** Shared OS hub for Work / People / Business / Automation */
export function OsHubPage({ eyebrow, title, description, links }: Props) {
  const navigate = useNavigate();
  return (
    <MizanPageShell eyebrow={eyebrow} title={title} description={description} hero>
      <ul className={cn("grid sm:grid-cols-2", MIZAN_GRID_GAP)}>
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <li key={link.href + link.label}>
              <button
                type="button"
                onClick={() => navigate(link.href)}
                className={cn(
                  "group flex h-full w-full items-start gap-3 rounded-xl border border-border/80 bg-card p-5 text-left shadow-sm",
                  "transition-all duration-os hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                {Icon ? (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors duration-os group-hover:bg-primary/10 group-hover:text-primary">
                    <Icon className="h-[18px] w-[18px]" aria-hidden />
                  </span>
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-card-title text-foreground">
                    {link.label}
                    <ArrowRight
                      className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-os group-hover:translate-x-0.5 group-hover:text-primary"
                      aria-hidden
                    />
                  </p>
                  <p className="mt-1 text-body text-muted-foreground">{link.description}</p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </MizanPageShell>
  );
}

export default OsHubPage;
