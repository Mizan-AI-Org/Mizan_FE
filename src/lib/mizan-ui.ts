/** Shared Mizan hub UI class names (Social / Intelligence / domains). */

/** Logged-in main column background — applied once on #mizan-main. */
export const MIZAN_APP_CANVAS = "min-h-full bg-slate-100/95 dark:bg-background";

export const MIZAN_PAGE_STACK = "space-y-6";

export const MIZAN_GRID_GAP = "gap-6";

export const HUB_TABS_LIST =
  "grid h-auto w-full grid-cols-2 gap-2 rounded-2xl border border-slate-200/55 bg-white/95 p-1.5 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.1),0_2px_6px_-2px_rgba(15,23,42,0.06)] sm:grid-cols-3 lg:grid-cols-5 dark:border-border/60 dark:bg-muted/40 dark:shadow-none";

export const HUB_TABS_LIST_INLINE =
  "flex h-auto w-full flex-wrap gap-3 bg-transparent p-0";

export const HUB_TABS_TRIGGER =
  "!rounded-xl border border-slate-200/70 bg-white px-3 py-2.5 text-sm font-semibold text-muted-foreground shadow-[0_2px_8px_-2px_rgba(15,23,42,0.08)] transition-all hover:border-primary/35 hover:shadow-[0_4px_12px_-2px_rgba(15,23,42,0.1)] data-[state=active]:!rounded-xl data-[state=active]:border-primary data-[state=active]:!bg-primary data-[state=active]:!text-primary-foreground data-[state=active]:shadow-[0_6px_16px_-4px_rgba(16,185,129,0.35)] dark:border-border/70 dark:bg-card/80 dark:shadow-sm";

/** Use on triggers inside grid tab lists (Social hub, status filters). */
export const HUB_TABS_TRIGGER_GRID = `${HUB_TABS_TRIGGER} w-full`;

export const MIZAN_ELEVATED_CARD =
  "rounded-2xl border border-slate-200/55 bg-white shadow-[0_12px_32px_-8px_rgba(15,23,42,0.12),0_8px_16px_-6px_rgba(15,23,42,0.08)] dark:border-border/80 dark:bg-card dark:shadow-lg dark:shadow-black/25";

export const MIZAN_SURFACE_CARD = `${MIZAN_ELEVATED_CARD} p-5`;

/** Nested / inset panels — lighter lift than primary cards. */
export const MIZAN_ELEVATED_INSET =
  "rounded-xl border border-slate-200/70 bg-white/90 shadow-[0_4px_14px_-2px_rgba(15,23,42,0.07),0_2px_6px_-2px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-900/50 dark:shadow-md dark:shadow-black/15";

export const MIZAN_TOOLBAR = `${MIZAN_ELEVATED_INSET} p-4 space-y-4`;

/** Compact pill tabs (dialogs, nested editors). */
export const COMPACT_TABS_LIST =
  "inline-flex flex-wrap gap-1 items-center justify-start rounded-full bg-muted/60 p-1 text-muted-foreground min-h-[40px]";

export const COMPACT_TABS_TRIGGER =
  "inline-flex items-center justify-center whitespace-nowrap rounded-full px-3 md:px-4 py-1.5 md:py-2 text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 touch-manipulation bg-transparent hover:bg-muted/60 text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm";

export const MIZAN_HERO = `${MIZAN_ELEVATED_CARD} mb-5 overflow-hidden p-4`;

/** Soft canvas behind stacked cards (settings hubs, list pages). */
export const MIZAN_CANVAS =
  "rounded-2xl bg-slate-100/90 p-4 sm:p-5 dark:bg-transparent dark:p-0";

/** Settings hub: vertical rhythm for tab panels (canvas is the page shell). */
export const MIZAN_SETTINGS_HUB = "space-y-5";

export const MIZAN_SETTINGS_TABS_LIST =
  "grid h-auto w-full gap-2 rounded-2xl border border-slate-200/55 bg-white/95 p-1.5 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.1),0_2px_6px_-2px_rgba(15,23,42,0.06)] dark:border-border/60 dark:bg-muted/40 dark:shadow-none";

export const MIZAN_SETTINGS_TAB_CONTENT = "mt-0 space-y-5 focus-visible:outline-none";

/** Standalone settings page block (modules, billing sections without SettingsSection). */
export const MIZAN_SETTINGS_BLOCK = `${MIZAN_ELEVATED_CARD} space-y-4 p-5 sm:p-6`;
