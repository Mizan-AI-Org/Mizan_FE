import { useState, type ReactNode } from "react";
import { Separator } from "@/components/ui/separator";
import { ChevronDown } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { SHOW_UI_DESCRIPTIONS, UI_FIELD_HINT_CLASS } from "@/lib/ui-descriptions";
import { MIZAN_ELEVATED_CARD, MIZAN_ELEVATED_INSET } from "@/lib/mizan-ui";

/** Shared field chrome for Settings forms. */
export const settingsFieldClassName =
  "h-11 rounded-xl border-slate-200/90 bg-white shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-background dark:shadow-none dark:text-slate-100 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/30 transition-colors";

export const settingsSelectClassName =
  "h-11 w-full rounded-xl border border-slate-200/90 bg-white shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] px-3 text-sm font-medium text-slate-800 dark:border-slate-700 dark:bg-background dark:shadow-none dark:text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-colors";

/** Helper text under settings fields — hidden when UI descriptions are off. */
export const settingsFieldHintClassName = `text-[11px] text-slate-500 dark:text-slate-400 ${UI_FIELD_HINT_CLASS}`;

/** Nested heading inside a settings card (contact, staff roles, etc.). */
export function SettingsSubsection({
  title,
  description,
  children,
  className,
  dense = false,
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Tighter subsection heading and body gap (dense settings cards). */
  dense?: boolean;
}) {
  return (
    <section className={cn(dense ? "space-y-2" : "space-y-4", className)}>
      <div className={dense ? "space-y-0" : "space-y-1"}>
        <h3
          className={cn(
            "font-semibold tracking-tight text-slate-900 dark:text-slate-50",
            dense ? "text-xs text-slate-700 dark:text-slate-300" : "text-sm",
          )}
        >
          {title}
        </h3>
        {SHOW_UI_DESCRIPTIONS && description ? (
          <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function SettingsSubsectionDivider() {
  return <Separator className="bg-slate-200/80 dark:bg-slate-800" />;
}

/** Shared inset panel for paired settings blocks (custom titles, job mappings). */
export const settingsInsetPanelClassName = cn("space-y-3 p-4", MIZAN_ELEVATED_INSET);

type SettingsSectionProps = {
  icon: ReactNode;
  iconClassName?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  /** Anchor for deep links (e.g. #pos-integration). */
  id?: string;
  /** Let people fold the card away once they are done with it. */
  collapsible?: boolean;
  defaultOpen?: boolean;
  /** Tighter header and body padding for dense forms (e.g. business identity). */
  compact?: boolean;
};

/** Consistent settings card: icon + title + optional description, then body. */
export function SettingsSection({
  icon,
  iconClassName,
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
  id,
  collapsible = false,
  defaultOpen = true,
  compact = false,
}: SettingsSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const expanded = !collapsible || open;

  const identity = (
    <>
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
          compact ? "h-8 w-8" : "h-9 w-9",
          iconClassName,
        )}
      >
        {compact ? (
          <span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span>
        ) : (
          icon
        )}
      </div>
      <div className="min-w-0">
        <CardTitle
          className={cn(
            "font-semibold tracking-tight text-slate-900 dark:text-slate-50",
            compact ? "text-sm" : "text-[15px]",
          )}
        >
          {title}
        </CardTitle>
        {SHOW_UI_DESCRIPTIONS && description ? (
          <CardDescription className="mt-0.5 text-xs leading-relaxed">{description}</CardDescription>
        ) : null}
      </div>
    </>
  );

  return (
    <Card
      id={id}
      className={cn("scroll-mt-24", MIZAN_ELEVATED_CARD, className)}
    >
      <CardHeader
        className={cn(
          compact ? "px-4 pt-3 sm:px-5" : "px-5 pt-5 sm:px-6",
          expanded ? (compact ? "pb-1" : "pb-3") : compact ? "pb-3" : "pb-5",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          {collapsible ? (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className={cn(
                "group flex min-w-0 flex-1 items-center rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40",
                compact ? "gap-2.5" : "gap-3",
              )}
            >
              {identity}
              <ChevronDown
                className={cn(
                  "ml-auto h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200",
                  "group-hover:text-slate-600 dark:group-hover:text-slate-300",
                  open && "rotate-180",
                )}
                aria-hidden
              />
            </button>
          ) : (
            <div className={cn("flex min-w-0 items-center", compact ? "gap-2.5" : "gap-3")}>{identity}</div>
          )}
          {actions ? <div className="shrink-0 self-center">{actions}</div> : null}
        </div>
      </CardHeader>
      {expanded ? (
        <CardContent
          className={cn(
            "pt-0",
            compact ? "space-y-3 px-4 pb-3 sm:px-5 sm:pb-4" : "space-y-5 px-5 pb-5 sm:px-6 sm:pb-6",
            contentClassName,
          )}
        >
          {children}
        </CardContent>
      ) : null}
    </Card>
  );
}

type SettingsStickyActionsProps = {
  children: ReactNode;
  className?: string;
  hint?: ReactNode;
};

/** Static footer for form actions at the end of a settings tab (non-floating). */
export function SettingsFormActions({ children, className, hint }: SettingsStickyActionsProps) {
  return (
    <div
      className={cn(MIZAN_ELEVATED_INSET, "mt-8 px-4 py-4 sm:px-5", className)}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        {SHOW_UI_DESCRIPTIONS && hint ? (
          <p className="order-2 min-w-0 text-xs text-slate-600 dark:text-slate-400 sm:order-1">{hint}</p>
        ) : (
          <span className="hidden sm:block sm:order-1" />
        )}
        <div className="order-1 flex flex-wrap items-center justify-end gap-2 sm:order-2 shrink-0">
          {children}
        </div>
      </div>
    </div>
  );
}

/** Sticky bottom action bar so Save stays reachable on long forms.
 *  Stays within the content column - no page-bleed negative margins. */
export function SettingsStickyActions({ children, className, hint }: SettingsStickyActionsProps) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-20 mt-6 border-t border-slate-200/90 dark:border-slate-800",
        "bg-gradient-to-t from-background via-background/95 to-background/70",
        "backdrop-blur-md pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        className,
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        {SHOW_UI_DESCRIPTIONS && hint ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 order-2 sm:order-1 min-w-0">{hint}</p>
        ) : (
          <span className="hidden sm:block order-1" />
        )}
        <div className="flex flex-wrap items-center justify-end gap-2 order-1 sm:order-2 shrink-0">
          {children}
        </div>
      </div>
    </div>
  );
}
