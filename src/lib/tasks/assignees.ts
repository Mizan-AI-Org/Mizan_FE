export type AssignedShape =
  | string
  | { id?: string; name?: string }
  | Array<{ id?: string; name?: string }>
  | null
  | undefined;

/**
 * Format assignees to a list of display names using an optional staff map.
 * Accepts ids, objects, or arrays; returns a de-duplicated array of names.
 */
export function formatAssignees(
  assigned: AssignedShape,
  staffNameById: Record<string, string> = {}
): string[] {
  const names: string[] = [];
  if (!assigned) return names;

  const pushName = (idOrName?: string, nameHint?: string) => {
    const id = (idOrName || "").trim();
    const mapped = id && staffNameById[id] ? staffNameById[id] : undefined;
    const finalName = (mapped || nameHint || id || "").trim();
    if (finalName) names.push(finalName);
  };

  if (typeof assigned === "string") {
    // Could be a single id or comma-separated ids
    const parts = assigned.split(/[,\s]+/).map((p) => p.trim()).filter(Boolean);
    parts.forEach((p) => pushName(p));
  } else if (Array.isArray(assigned)) {
    for (const a of assigned) pushName(a?.id, a?.name);
  } else {
    pushName(assigned?.id, assigned?.name);
  }

  // De-duplicate while preserving order
  return Array.from(new Set(names));
}

/**
 * Return execution IDs not present in the seen set.
 */
export function detectNewAssignments(
  seen: Set<string>,
  currentExecutionIds: string[]
): string[] {
  const unseen: string[] = [];
  for (const id of currentExecutionIds) {
    if (!seen.has(id)) unseen.push(id);
  }
  return unseen;
}