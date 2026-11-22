export type ResponsibilityPerson = { id: string; name: string; role?: string };

export type ResponsibilityItem = {
  id: string;
  key: string;
  label: string;
  standard_description: string;
  is_enabled: boolean;
  executor: ResponsibilityPerson | null;
  read_only: ResponsibilityPerson[];
};

export type ResponsibilityArea = {
  id: string;
  key: string;
  label: string;
  standard_description: string;
  venue_description: string;
  is_enabled: boolean;
  items: ResponsibilityItem[];
};

/** One Executor per item. The executor is never also listed as read-only. */
export function singleExecutor(executor: string | null, readOnly: string[]) {
  const id = (executor || "").trim() || null;
  const seen = new Set<string>();
  const readers: string[] = [];
  for (const raw of readOnly) {
    const uid = raw.trim();
    if (!uid || uid === id || seen.has(uid)) continue;
    seen.add(uid);
    readers.push(uid);
  }
  return { executor: id, read_only: readers };
}
