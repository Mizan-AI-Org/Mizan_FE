type LogContext = {
  feature: string; // e.g., "my-checklists"
  action: string; // e.g., "fetch"
};

export function logError(context: LogContext, error: unknown, extra?: Record<string, unknown>) {
  const base = {
    context,
    extra,
  };
  if (error instanceof Error) {
    console.error("[Error]", { ...base, name: error.name, message: error.message, stack: error.stack });
  } else {
    console.error("[Error]", { ...base, message: String(error) });
  }
}

export function logInfo(context: LogContext, message: string, data?: Record<string, unknown>) {
  console.info("[Info]", { context, message, data });
}