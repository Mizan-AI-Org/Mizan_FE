import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Shared field chrome for Settings forms. */
export const settingsFieldClassName =
  "h-11 rounded-xl border-slate-200 dark:border-slate-700 bg-background dark:text-slate-100 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/30 transition-colors";

export const settingsSelectClassName =
  "h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-background px-3 text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-colors";

type SettingsSectionProps = {
  icon: ReactNode;
  iconClassName?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  /** Let people fold the card away once they are done with it. */
  collapsible?: boolean;
  defaultOpen?: boolean;
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
  collapsible = false,
  defaultOpen = true,
}: SettingsSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const expanded = !collapsible || open;

  const identity = (
    <>
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
          iconClassName,
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <CardTitle className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          {title}
        </CardTitle>
        {description ? (
          <CardDescription className="mt-0.5 text-xs leading-relaxed">
            {description}
          </CardDescription>
        ) : null}
      </div>
    </>
  );

  return (
    <Card
      className={cn(
        "border border-slate-200/90 bg-card shadow-sm dark:border-slate-800",
        className,
      )}
    >
      <CardHeader className={cn("px-5 sm:px-6 pt-5", expanded ? "pb-3" : "pb-5")}>
        <div className="flex items-start justify-between gap-3">
          {collapsible ? (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="group flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
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
            <div className="flex min-w-0 items-center gap-3">{identity}</div>
          )}
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      </CardHeader>
      {expanded ? (
        <CardContent className={cn("space-y-5 px-5 sm:px-6 pb-5 sm:pb-6 pt-0", contentClassName)}>
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
        {hint ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 order-2 sm:order-1 min-w-0">
            {hint}
          </p>
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
