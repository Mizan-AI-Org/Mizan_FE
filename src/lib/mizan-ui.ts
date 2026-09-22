/** Shared Mizan hub UI class names (Social / Intelligence / domains). */

export const MIZAN_PAGE_STACK = "space-y-6";

export const MIZAN_GRID_GAP = "gap-6";

export const HUB_TABS_LIST =
  "grid h-auto w-full grid-cols-2 gap-3 bg-transparent p-0 sm:grid-cols-3 lg:grid-cols-5";

export const HUB_TABS_LIST_INLINE =
  "flex h-auto w-full flex-wrap gap-3 bg-transparent p-0";

export const HUB_TABS_TRIGGER =
  "!rounded-xl border border-border/70 bg-card/80 px-3 py-2.5 text-sm font-semibold text-muted-foreground shadow-sm transition-all hover:border-primary/35 hover:bg-muted/40 data-[state=active]:!rounded-xl data-[state=active]:border-primary data-[state=active]:!bg-primary data-[state=active]:!text-primary-foreground data-[state=active]:shadow-md";

/** Use on triggers inside grid tab lists (Social hub, status filters). */
export const HUB_TABS_TRIGGER_GRID = `${HUB_TABS_TRIGGER} w-full`;

export const MIZAN_TOOLBAR =
  "rounded-xl border border-border/80 bg-card/60 p-4 shadow-sm space-y-4";

/** Compact pill tabs (dialogs, nested editors). */
export const COMPACT_TABS_LIST =
  "inline-flex flex-wrap gap-1 items-center justify-start rounded-full bg-muted/60 p-1 text-muted-foreground min-h-[40px]";

export const COMPACT_TABS_TRIGGER =
  "inline-flex items-center justify-center whitespace-nowrap rounded-full px-3 md:px-4 py-1.5 md:py-2 text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 touch-manipulation bg-transparent hover:bg-muted/60 text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm";

export const MIZAN_HERO =
  "mb-8 overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card p-6 shadow-sm";

export const MIZAN_SURFACE_CARD =
  "rounded-xl border border-border/80 bg-card p-5 shadow-sm";
