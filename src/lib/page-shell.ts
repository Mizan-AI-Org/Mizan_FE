/** Shared page content width - matches DashboardLayout Back button shell. */
export const PAGE_SHELL =
  "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8";

/** Settings uses a wider canvas so forms and integration panels breathe on large screens. */
export const SETTINGS_PAGE_SHELL =
  "mx-auto w-full max-w-[min(100%,90rem)] px-4 sm:px-6 lg:px-8";

export const PAGE_SHELL_PADDED = `${PAGE_SHELL} py-6 pb-28`;

/** Directly below DashboardLayout back row — avoids double top spacing. */
export const PAGE_SHELL_BELOW_BACK = `${PAGE_SHELL} pb-28 pt-0`;

/** Wider shell for automation builder canvas. */
export const AUTOMATION_BUILDER_SHELL =
  "mx-auto w-full max-w-[min(100%,1600px)] px-4 sm:px-6 lg:px-8 pb-32 pt-4";
