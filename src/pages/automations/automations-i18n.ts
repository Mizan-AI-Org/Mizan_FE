type TranslateFn = (key: string, options?: Record<string, string | number>) => string;

function catalogLabel(
  t: TranslateFn,
  prefix: "triggers" | "actions" | "templates",
  id: string,
  fallback?: string,
  field: "name" | "desc" = "name",
): string {
  const key =
    prefix === "templates"
      ? `automations.templates.${id}.${field}`
      : `automations.${prefix}.${id}`;
  const translated = t(key);
  if (translated !== key && translated.trim() !== "") {
    return translated;
  }
  return fallback || id;
}

export function triggerLabel(t: TranslateFn, id: string, fallback?: string): string {
  return catalogLabel(t, "triggers", id, fallback);
}

export function actionLabel(t: TranslateFn, id: string, fallback?: string): string {
  return catalogLabel(t, "actions", id, fallback);
}

export function templateName(t: TranslateFn, id: string, fallback?: string): string {
  return catalogLabel(t, "templates", id, fallback, "name");
}

export function templateDescription(t: TranslateFn, id: string, fallback?: string): string {
  return catalogLabel(t, "templates", id, fallback, "desc");
}

export function categoryLabel(
  t: TranslateFn,
  kind: "template" | "action" | "trigger",
  id: string,
): string {
  const key = `automations.categories.${kind}.${id}`;
  const translated = t(key);
  if (translated !== key && translated.trim() !== "") {
    return translated;
  }
  return id.replace(/_/g, " ");
}

export function difficultyLabel(t: TranslateFn, id: string): string {
  const key = `automations.difficulty.${id}`;
  const translated = t(key);
  return translated !== key ? translated : id;
}
