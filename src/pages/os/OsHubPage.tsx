import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, type LucideIcon } from "lucide-react";
import { PAGE_SHELL_PADDED } from "@/lib/page-shell";
import { AiNativeWorkspace, type WorkspaceModule } from "@/components/miya/AiNativeWorkspace";
import { SectionHeader } from "@/components/os";
import { askMiya } from "@/lib/miyaPageContext";
import { cn } from "@/lib/utils";

export type HubLink = {
  label: string;
  description: string;
  /** Destination route. Omit when the row opens Miya instead of navigating. */
  href?: string;
  askPrompt?: string;
  icon?: LucideIcon;
  /** Row asks Miya with `askPrompt` rather than routing somewhere. */
  opensMiya?: boolean;
};

type Props = {
  eyebrow: string;
  title: string;
  description: string;
  askPrompt: string;
  workspaceModule?: WorkspaceModule;
  links: HubLink[];
};

/** Shared OS hub for Work / People / Business / Automation / Knowledge */
export function OsHubPage({
  eyebrow,
  title,
  description,
  askPrompt: _askPrompt,
  workspaceModule = "operations",
  links,
}: Props) {
  const navigate = useNavigate();
  return (
    <div className={PAGE_SHELL_PADDED}>
      <AiNativeWorkspace module={workspaceModule} defaultCollapsed compact />
      <div className="mt-6 space-y-section">
        <SectionHeader
          as="h1"
          eyebrow={eyebrow}
          title={title}
          description={description}
          titleClassName="text-page-title"
        />
        <ul className="grid gap-3 sm:grid-cols-2">
          {links.map((link) => {
            const Icon = link.icon;
            const asksMiya = link.opensMiya || !link.href;
            return (
              <li key={(link.href || "miya") + link.label}>
                <button
                  type="button"
                  onClick={() => {
                    if (asksMiya) {
                      askMiya({
                        prompt: link.askPrompt || link.label,
                        pageContext: { tab: workspaceModule, route: link.href },
                      });
                      return;
                    }
                    navigate(link.href!);
                  }}
                  className={cn(
                    "group flex h-full w-full items-start gap-3 rounded-panel border p-4 text-left",
                    "shadow-xs transition-all duration-os hover:-translate-y-0.5 hover:shadow-soft",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    asksMiya
                      ? "border-ai-border bg-gradient-to-br from-ai to-card hover:border-primary/30"
                      : "border-border/70 bg-card hover:border-primary/25",
                  )}
                >
                  {Icon ? (
                    <span
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-md transition-colors duration-os",
                        asksMiya
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary",
                      )}
                    >
                      <Icon className="h-[18px] w-[18px]" aria-hidden />
                    </span>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-card-title text-foreground">
                      {link.label}
                      {asksMiya ? (
                        <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
                      ) : (
                        <ArrowRight
                          className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-os group-hover:translate-x-0.5 group-hover:text-primary"
                          aria-hidden
                        />
                      )}
                    </p>
                    <p className="mt-1 text-body text-muted-foreground">{link.description}</p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export default OsHubPage;
