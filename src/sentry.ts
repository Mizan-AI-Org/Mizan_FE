import * as Sentry from "@sentry/react";

/** Browser DSN is public by design (Sentry project: javascript). Override via VITE_SENTRY_DSN. */
const PROD_DSN =
  "https://90a5aa1f43c2b8c2b6dbce190e5c9e78@o4512139639193600.ingest.de.sentry.io/4512139648237648";

export function initSentry(): void {
  const dsn = (import.meta.env.VITE_SENTRY_DSN as string | undefined)?.trim() ||
    (import.meta.env.PROD ? PROD_DSN : "");
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE || "development",
    sendDefaultPii: false,
    tracesSampleRate: import.meta.env.PROD ? 0.15 : 0,
    // Ignore noisy extension / portal DOM races (same as ErrorBoundary).
    ignoreErrors: [
      "NotFoundError",
      /Failed to execute 'removeChild' on 'Node'/i,
      /Failed to execute 'insertBefore' on 'Node'/i,
      /The node to be removed is not a child of this node/i,
      /^TypeError: Failed to fetch/i,
    ],
  });
}

export { Sentry };
