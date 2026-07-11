import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export type SettingsNavItem = {
  id: string;
  label: string;
  description?: string;
  icon: LucideIcon;
};

type SettingsNavProps = {
  items: SettingsNavItem[];
  activeId: string;
  onSelect: (id: string) => void;
  permissionsHref?: string;
  permissionsLabel?: string;
  permissionsDescription?: string;
  PermissionsIcon?: LucideIcon;
  className?: string;
};

/**
 * Settings navigation: horizontal chips on small screens, vertical sidebar on lg+.
 */
export function SettingsNav({
  items,
  activeId,
  onSelect,
  permissionsHref,
  permissionsLabel,
  permissionsDescription,
  PermissionsIcon,
  className,
}: SettingsNavProps) {
  const linkClass = (active: boolean) =>
    cn(
      "group flex shrink-0 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors lg:w-full",
      active
        ? "border-emerald-200 bg-emerald-50 text-emerald-900 shadow-sm dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-100"
        : "border-transparent bg-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-800/60 dark:hover:text-slate-200",
    );

  const iconWrap = (active: boolean) =>
    cn(
      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
      active
        ? "bg-emerald-600 text-white dark:bg-emerald-500"
        : "bg-slate-100 text-slate-500 group-hover:bg-slate-200/80 dark:bg-slate-800 dark:text-slate-400",
    );

  return (
    <nav
      className={cn("flex flex-col gap-1", className)}
      aria-label="Settings sections"
    >
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 lg:mx-0 lg:px-0 lg:flex-col lg:overflow-visible lg:pb-0 lg:gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = activeId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              aria-current={active ? "page" : undefined}
              className={linkClass(active)}
            >
              <span className={iconWrap(active)}>
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold leading-tight whitespace-nowrap lg:whitespace-normal">
                  {item.label}
                </span>
                {item.description ? (
                  <span className="mt-0.5 hidden text-[11px] leading-snug text-slate-500 dark:text-slate-400 lg:block">
                    {item.description}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      {permissionsHref && permissionsLabel && PermissionsIcon ? (
        <>
          <div
            className="hidden lg:block my-2 mx-1 border-t border-slate-200 dark:border-slate-800"
            role="separator"
          />
          <Link to={permissionsHref} className={cn(linkClass(false), "mt-1 lg:mt-0")}>
            <span className={iconWrap(false)}>
              <PermissionsIcon className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                {permissionsLabel}
              </span>
              {permissionsDescription ? (
                <span className="mt-0.5 hidden text-[11px] leading-snug text-slate-500 dark:text-slate-400 lg:block">
                  {permissionsDescription}
                </span>
              ) : null}
            </span>
          </Link>
        </>
      ) : null}
    </nav>
  );
}
